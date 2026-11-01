import { randomBytes } from "node:crypto";
import { EventEmitter } from "node:events";
import { frame as makeFrame } from "../transport/framer.js";
import { encodeHeader, decodeHeader, SMB2_HEADER_SIZE } from "../wire/smb2-header.js";
import { SmbCommand, Dialect, HeaderFlag, NTStatus, SecurityMode, Capability, isSuccess, isPending, statusName, } from "../wire/commands.js";
import { encodeNegotiateRequest, decodeNegotiateResponse } from "../wire/structs/negotiate.js";
import { encodeCancelRequest } from "../wire/structs/cancel.js";
import { CreditWindow } from "./credits.js";
import { PreauthHash } from "./preauth.js";
import { isTransformHeader } from "./encryption.js";
import { SmbProtocolError } from "../errors.js";
export class Connection extends EventEmitter {
    transport;
    nextMessageId = 0n;
    pendingByMessageId = new Map();
    pendingByAsyncId = new Map();
    /** Tracks the asyncId assigned by the server for pending async requests, keyed by messageId string. */
    asyncIdByMessageId = new Map();
    credits = new CreditWindow(1);
    preauth = new PreauthHash();
    negotiated = null;
    closed = false;
    verifier = null;
    signCancel = null;
    encryptor = null;
    encryptionRequired = false;
    signingRequired = false;
    constructor(transport) {
        super();
        this.transport = transport;
        transport.on("message", (msg) => this.onMessage(msg));
        transport.on("close", () => this.onClose());
        transport.on("error", (err) => this.onError(err));
    }
    get state() {
        return this.negotiated;
    }
    async open(opts = {}) {
        const dialects = opts.dialects ?? [
            Dialect.SMB_2_1_0,
            Dialect.SMB_3_0_0,
            Dialect.SMB_3_0_2,
            Dialect.SMB_3_1_1,
        ];
        const clientGuid = opts.clientGuid ?? randomBytes(16);
        const preauthSalt = randomBytes(32);
        const reqBody = encodeNegotiateRequest({
            dialects,
            clientGuid,
            capabilities: opts.capabilities ?? Capability.LARGE_MTU,
            securityMode: opts.securityMode ?? SecurityMode.SIGNING_ENABLED,
            preauthSalt,
            ...(opts.ciphers !== undefined ? { ciphers: opts.ciphers } : {}),
        });
        // NEGOTIATE goes out with CreditCharge 0, but its message id still uses the one
        // credit every connection starts with (MS-SMB2 §3.2.4.1.2): count it, or the window
        // runs one ahead of the server's and a strict server (Samba) drops the connection
        // with "client used more credits than granted" once requests overlap.
        await this.credits.take(1);
        const result = await this.send(SmbCommand.NEGOTIATE, reqBody, { creditCharge: 0 });
        if (!isSuccess(result.header.status)) {
            throw new SmbProtocolError({
                status: result.header.status,
                message: `NEGOTIATE failed: ${statusName(result.header.status)}`,
            });
        }
        const resp = decodeNegotiateResponse(result.body, SMB2_HEADER_SIZE);
        const negotiated = {
            dialect: resp.dialect,
            serverGuid: resp.serverGuid,
            capabilities: resp.capabilities,
            securityMode: resp.securityMode,
            maxReadSize: resp.maxReadSize,
            maxWriteSize: resp.maxWriteSize,
            maxTransactSize: resp.maxTransactSize,
            securityBuffer: resp.securityBuffer,
            ...(resp.preauthHashAlg !== undefined ? { preauthHashAlg: resp.preauthHashAlg } : {}),
            ...(resp.preauthSalt !== undefined ? { preauthSalt: resp.preauthSalt } : {}),
            ...(resp.cipherIds !== undefined ? { cipherIds: resp.cipherIds } : {}),
        };
        this.negotiated = negotiated;
        return this.negotiated;
    }
    async send(command, body, opts = {}) {
        if (this.closed)
            throw new SmbProtocolError({ status: 0, message: "connection closed" });
        const charge = opts.creditCharge ?? 1;
        if (charge > 0)
            await this.credits.take(charge);
        const messageId = this.nextMessageId++;
        const flags = opts.flags ?? 0;
        const wantEncrypt = opts.encrypt === true && this.encryptor !== null;
        let header = encodeHeader({
            command,
            creditCharge: charge,
            creditRequestResponse: 1,
            flags,
            messageId,
            sessionId: opts.sessionId ?? 0n,
            treeId: opts.treeId ?? 0,
            status: 0,
        });
        let frameBuf = Buffer.concat([header, body]);
        // Encryption supersedes signing for the same PDU (MS-SMB2 §3.1.4.3): the inner
        // SMB2 header is left unsigned and the TRANSFORM_HEADER's auth tag covers integrity.
        if (opts.signing && !wantEncrypt) {
            const signedFlags = flags | HeaderFlag.SIGNED;
            header = encodeHeader({
                command,
                creditCharge: charge,
                creditRequestResponse: 1,
                flags: signedFlags,
                messageId,
                sessionId: opts.sessionId ?? 0n,
                treeId: opts.treeId ?? 0,
                status: 0,
            });
            frameBuf = Buffer.concat([header, body]);
            const sig = opts.signing.sign(frameBuf);
            sig.copy(frameBuf, 48); // signature offset within header is 48
        }
        // Pre-auth hash always feeds on the plaintext PDU. NEGOTIATE and the first
        // SESSION_SETUP can't be encrypted (no keys yet), so this branch only ever
        // sees plaintext for those commands in practice.
        if (command === SmbCommand.NEGOTIATE || command === SmbCommand.SESSION_SETUP) {
            this.preauth.update(frameBuf);
        }
        const promise = new Promise((resolve, reject) => {
            this.pendingByMessageId.set(messageId.toString(), {
                resolve,
                reject,
                expectsAsync: command === SmbCommand.CHANGE_NOTIFY,
                encrypted: wantEncrypt,
            });
        });
        const wire = wantEncrypt ? this.encryptor.encrypt(frameBuf) : frameBuf;
        this.transport.send(makeFrame(wire));
        return promise;
    }
    preauthDigest() {
        return this.preauth.digest();
    }
    setVerifier(fn) {
        this.verifier = fn;
    }
    setCancelSigner(fn) {
        this.signCancel = fn;
    }
    setEncryptor(e) {
        this.encryptor = e;
    }
    /** When true, plaintext responses (other than SESSION_SETUP) cause a fatal protocol error. */
    setEncryptionRequired(v) {
        this.encryptionRequired = v;
    }
    /** When true, post-handshake plaintext-unsigned responses cause a fatal protocol error. */
    setSigningRequired(v) {
        this.signingRequired = v;
    }
    onMessage(raw) {
        let msg = raw;
        let wasEncrypted = false;
        if (isTransformHeader(raw)) {
            if (this.encryptor === null) {
                this.fail(new SmbProtocolError({ status: 0, message: "received encrypted frame but no encryptor installed" }));
                return;
            }
            try {
                msg = this.encryptor.decrypt(raw);
                wasEncrypted = true;
            }
            catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                this.fail(new SmbProtocolError({ status: 0, message: `decrypt failed: ${message}` }));
                return;
            }
        }
        let parsed;
        try {
            parsed = decodeHeader(msg);
        }
        catch (err) {
            this.fail(new SmbProtocolError({ status: 0, message: `bad SMB2 header: ${err.message}` }));
            return;
        }
        const { header } = parsed;
        const body = Buffer.from(msg.subarray(SMB2_HEADER_SIZE));
        // MS-SMB2 §3.2.5.1.1: once Session.EncryptData is TRUE, plaintext responses
        // (other than SESSION_SETUP) must be rejected and the connection dropped.
        // This blocks an attacker — or a misbehaving server — from silently stripping
        // encryption after we agreed to use it.
        if (!wasEncrypted && this.encryptionRequired && header.command !== SmbCommand.SESSION_SETUP) {
            this.fail(new SmbProtocolError({
                status: 0,
                message: "plaintext response received but session requires encryption",
            }));
            return;
        }
        // MS-SMB2: when signing=required, every post-handshake frame must be either
        // signed (HeaderFlag.SIGNED set, signature verified above) or encrypted.
        // Pre-auth frames (NEGOTIATE, the first SESSION_SETUP) are exempt — they
        // can't be signed yet (no key) and can't be encrypted (no cipher negotiated).
        if (!wasEncrypted &&
            this.signingRequired &&
            header.command !== SmbCommand.NEGOTIATE &&
            header.command !== SmbCommand.SESSION_SETUP &&
            (header.flags & HeaderFlag.SIGNED) === 0) {
            this.fail(new SmbProtocolError({
                status: 0,
                message: "unsigned response received but signing is required",
            }));
            return;
        }
        // Signature verification only applies to plaintext frames. Encrypted responses carry
        // their integrity guarantee in the TRANSFORM_HEADER's auth tag (already verified).
        if (!wasEncrypted && (header.flags & HeaderFlag.SIGNED) !== 0 && this.verifier !== null) {
            const working = Buffer.from(msg);
            working.fill(0, 48, 64); // zero the Signature field before computing
            const sig = header.signature ?? Buffer.alloc(16);
            if (!this.verifier(working, sig)) {
                this.fail(new SmbProtocolError({ status: 0, message: "signature verify failed" }));
                return;
            }
        }
        // Replenish credits.
        this.credits.release(header.creditRequestResponse);
        // Pre-auth hash update for NEGOTIATE/SESSION_SETUP responses.
        // Per MS-SMB2 §3.2.5.3.1 / §3.2.5.5, the preauth hash must include the
        // NEGOTIATE response and any SESSION_SETUP CHALLENGE (STATUS_MORE_PROCESSING_REQUIRED),
        // but NOT the final SESSION_SETUP SUCCESS response — the success response is signed
        // with the key that the hash is being used to derive.
        if (header.command === SmbCommand.NEGOTIATE) {
            this.preauth.update(msg);
        }
        else if (header.command === SmbCommand.SESSION_SETUP &&
            header.status === NTStatus.STATUS_MORE_PROCESSING_REQUIRED) {
            this.preauth.update(msg);
        }
        const messageKey = header.messageId.toString();
        const pending = this.pendingByMessageId.get(messageKey);
        if (!pending) {
            // Could be a pure ASYNC final response keyed by AsyncId.
            if (header.asyncId !== undefined) {
                const asyncKey = header.asyncId.toString();
                const a = this.pendingByAsyncId.get(asyncKey);
                if (a) {
                    this.pendingByAsyncId.delete(asyncKey);
                    // Clean up the reverse mapping.
                    this.asyncIdByMessageId.delete(messageKey);
                    a.resolve({ header, body });
                    return;
                }
            }
            // Unsolicited; ignore.
            return;
        }
        if (isPending(header.status) && header.asyncId !== undefined) {
            // Interim response: keep the pending entry alive but key by AsyncId for the final.
            // Also record the messageId→asyncId mapping so cancel() can send the correct CANCEL frame.
            this.pendingByAsyncId.set(header.asyncId.toString(), pending);
            this.asyncIdByMessageId.set(messageKey, header.asyncId);
            this.pendingByMessageId.delete(messageKey);
            return;
        }
        this.pendingByMessageId.delete(messageKey);
        pending.resolve({ header, body });
    }
    onClose() {
        this.closed = true;
        this.fail(new SmbProtocolError({ status: 0, message: "connection closed" }));
        this.emit("close");
    }
    onError(err) {
        this.fail(new SmbProtocolError({ status: 0, message: err.message, cause: err }));
    }
    fail(err) {
        for (const p of this.pendingByMessageId.values())
            p.reject(err);
        for (const p of this.pendingByAsyncId.values())
            p.reject(err);
        this.pendingByMessageId.clear();
        this.pendingByAsyncId.clear();
        this.asyncIdByMessageId.clear();
    }
    cancel(opts) {
        if (this.closed)
            return;
        // If the request has been promoted to async (STATUS_PENDING received), the server
        // requires the CANCEL to carry the ASYNC_COMMAND flag and the assigned AsyncId.
        // Look up the asyncId from our tracking map if the caller did not provide one.
        const asyncId = opts.asyncId ?? this.asyncIdByMessageId.get(opts.messageId.toString());
        // Per MS-SMB2 §3.2.4.24, CANCEL inherits the integrity protection of the original
        // request: encrypted if the original was encrypted, otherwise signed.
        const pending = this.pendingByMessageId.get(opts.messageId.toString()) ??
            (asyncId !== undefined ? this.pendingByAsyncId.get(asyncId.toString()) : undefined);
        const encryptCancel = pending?.encrypted === true && this.encryptor !== null;
        let flags = asyncId !== undefined ? HeaderFlag.ASYNC_COMMAND : 0;
        if (!encryptCancel && this.signCancel !== null) {
            flags = flags | HeaderFlag.SIGNED;
        }
        const header = encodeHeader({
            command: SmbCommand.CANCEL,
            creditCharge: 1,
            creditRequestResponse: 0,
            flags,
            messageId: opts.messageId,
            sessionId: opts.sessionId ?? 0n,
            ...(asyncId !== undefined
                ? { asyncId }
                : { treeId: opts.treeId ?? 0 }),
            status: 0,
        });
        const body = encodeCancelRequest();
        const frameBuf = Buffer.concat([header, body]);
        if (!encryptCancel && this.signCancel !== null) {
            // Signature field (bytes 48..64) is already zeroed by encodeHeader (no signature was passed).
            // Sign over the full frame with zeroed signature, then write the result into the frame.
            const sig = this.signCancel(frameBuf);
            sig.copy(frameBuf, 48);
        }
        const wire = encryptCancel ? this.encryptor.encrypt(frameBuf) : frameBuf;
        this.transport.send(makeFrame(wire));
    }
    close() {
        if (this.closed)
            return;
        this.closed = true;
        this.transport.close();
    }
}
