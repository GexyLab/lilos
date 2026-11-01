import { Writable, PassThrough } from "node:stream";
import { TcpTransport } from "./transport/socket.js";
import { Connection } from "./connection/connection.js";
import { Session } from "./session/session.js";
import { Tree } from "./tree/tree.js";
import { Open } from "./open/open.js";
import { readAll } from "./open/read.js";
import { writeAll } from "./open/write.js";
import { metaToStat } from "./open/query.js";
import { readdirAll } from "./open/readdir.js";
import { createReadStream as openCreateReadStream } from "./open/readStream.js";
import { createWriteStream as openCreateWriteStream } from "./open/writeStream.js";
import { watchOpen } from "./open/changeNotify.js";
import { CreateDisposition, CreateOptions, FileAccess, FileAttribute, ShareAccess, } from "./wire/structs/create.js";
import { splitSharePath, toSmbPath } from "./paths.js";
import { smbTimeToDate } from "./paths.js";
import { encodeSetInfoRequest, encodeFileRenameInformation } from "./wire/structs/setInfo.js";
import { InfoType, FileInformationClass } from "./wire/structs/queryInfo.js";
import { SmbCommand, Cipher, Capability, SecurityMode, isSuccess, statusName } from "./wire/commands.js";
import { SmbError } from "./errors.js";
import { encodeWriteRequest, decodeWriteResponse } from "./wire/structs/write.js";
import { encodeReadRequest, decodeReadResponse } from "./wire/structs/read.js";
import { encodeBindRequest, encodeRequest as rpcRequest, parseResponse as rpcResponse, encodeNetrShareEnumRequest, parseNetrShareEnumResponse, SRVSVC_UUID, SRVSVC_MAJOR, SRVSVC_MINOR, } from "./rpc/srvsvc.js";
export class Client {
    opts;
    conn = null;
    session = null;
    trees = new Map();
    state = "idle";
    constructor(opts) {
        this.opts = opts;
    }
    async connect() {
        if (this.state !== "idle")
            throw new Error(`Client.connect: state=${this.state}`);
        const transport = await TcpTransport.connect(this.opts.host, this.opts.port ?? 445, {
            timeoutMs: this.opts.connectTimeout ?? 10_000,
        });
        this.conn = new Connection(transport);
        const encryption = this.opts.encryption ?? "if-offered";
        const signing = this.opts.signing ?? "if-offered";
        const ciphers = encryption === "disabled"
            ? []
            : [Cipher.AES_128_GCM, Cipher.AES_128_CCM, Cipher.AES_256_GCM, Cipher.AES_256_CCM];
        // Capability.ENCRYPTION signals encryption support to SMB 3.0 / 3.0.2 servers,
        // which don't use the EncryptionCapabilities negotiate context.
        const capabilities = ciphers.length > 0 ? Capability.LARGE_MTU | Capability.ENCRYPTION : Capability.LARGE_MTU;
        const securityMode = signing === "required"
            ? SecurityMode.SIGNING_ENABLED | SecurityMode.SIGNING_REQUIRED
            : SecurityMode.SIGNING_ENABLED;
        await this.conn.open({ ciphers, capabilities, securityMode });
        this.session = new Session(this.conn, {
            username: this.opts.username,
            password: this.opts.password,
            domain: this.opts.domain ?? "",
        }, { encryption, ciphers, signing });
        await this.session.setup();
        this.state = "connected";
    }
    async treeFor(share) {
        if (!this.conn || !this.session)
            throw new Error("not connected");
        let t = this.trees.get(share);
        if (t)
            return t;
        const sharePath = `\\\\${this.opts.host}\\${share}`;
        t = await Tree.connect(this.conn, this.session, sharePath);
        this.trees.set(share, t);
        return t;
    }
    async readFile(path, encoding) {
        const { share, rest } = splitSharePath(path);
        const tree = await this.treeFor(share);
        return Open.withOpen(tree, {
            filename: toSmbPath(rest),
            desiredAccess: FileAccess.FILE_READ_DATA | FileAccess.FILE_READ_ATTRIBUTES,
            shareAccess: ShareAccess.READ | ShareAccess.WRITE | ShareAccess.DELETE,
            createDisposition: CreateDisposition.OPEN,
            createOptions: CreateOptions.NON_DIRECTORY_FILE,
            fileAttributes: 0,
        }, async (open) => {
            const buf = await readAll(open, open.meta.endOfFile);
            return encoding ? buf.toString(encoding) : buf;
        });
    }
    async writeFile(path, data, encoding = "utf8") {
        const buf = typeof data === "string" ? Buffer.from(data, encoding) : data;
        const { share, rest } = splitSharePath(path);
        const tree = await this.treeFor(share);
        await Open.withOpen(tree, {
            filename: toSmbPath(rest),
            desiredAccess: FileAccess.GENERIC_WRITE | FileAccess.FILE_READ_ATTRIBUTES,
            shareAccess: ShareAccess.READ | ShareAccess.WRITE | ShareAccess.DELETE,
            createDisposition: CreateDisposition.OVERWRITE_IF,
            createOptions: CreateOptions.NON_DIRECTORY_FILE,
            fileAttributes: 0,
        }, async (open) => writeAll(open, 0n, buf));
    }
    async readdir(path, opts) {
        const { share, rest } = splitSharePath(path);
        const tree = await this.treeFor(share);
        return Open.withOpen(tree, {
            filename: toSmbPath(rest),
            desiredAccess: FileAccess.FILE_READ_DATA | FileAccess.FILE_READ_ATTRIBUTES,
            shareAccess: ShareAccess.READ | ShareAccess.WRITE | ShareAccess.DELETE,
            createDisposition: CreateDisposition.OPEN,
            createOptions: 1, // DIRECTORY_FILE
            fileAttributes: 0,
        }, async (open) => {
            const entries = await readdirAll(open);
            if (!opts?.withFileTypes)
                return entries.map((e) => e.fileName);
            return entries.map((e) => {
                const isDir = (e.fileAttributes & FileAttribute.DIRECTORY) !== 0;
                return {
                    name: e.fileName,
                    isFile: () => !isDir,
                    isDirectory: () => isDir,
                    size: isDir ? 0 : Number(e.endOfFile),
                    mtime: smbTimeToDate(e.lastWriteTime),
                };
            });
        });
    }
    async stat(path) {
        const { share, rest } = splitSharePath(path);
        const tree = await this.treeFor(share);
        return Open.withOpen(tree, {
            filename: toSmbPath(rest),
            desiredAccess: FileAccess.FILE_READ_ATTRIBUTES,
            shareAccess: ShareAccess.READ | ShareAccess.WRITE | ShareAccess.DELETE,
            createDisposition: CreateDisposition.OPEN,
            createOptions: 0,
            fileAttributes: 0,
        }, async (open) => metaToStat(open.meta));
    }
    async mkdir(path) {
        const { share, rest } = splitSharePath(path);
        const tree = await this.treeFor(share);
        await Open.withOpen(tree, {
            filename: toSmbPath(rest),
            desiredAccess: FileAccess.FILE_READ_ATTRIBUTES | FileAccess.FILE_WRITE_ATTRIBUTES,
            shareAccess: ShareAccess.READ | ShareAccess.WRITE | ShareAccess.DELETE,
            createDisposition: CreateDisposition.CREATE,
            createOptions: 1, // DIRECTORY_FILE
            fileAttributes: 0,
        }, async () => undefined);
    }
    async rm(path) {
        const { share, rest } = splitSharePath(path);
        const tree = await this.treeFor(share);
        await Open.withOpen(tree, {
            filename: toSmbPath(rest),
            desiredAccess: FileAccess.DELETE,
            shareAccess: ShareAccess.READ | ShareAccess.WRITE | ShareAccess.DELETE,
            createDisposition: CreateDisposition.OPEN,
            createOptions: CreateOptions.NON_DIRECTORY_FILE | CreateOptions.DELETE_ON_CLOSE,
            fileAttributes: 0,
        }, async () => undefined);
    }
    async rmdir(path) {
        const { share, rest } = splitSharePath(path);
        const tree = await this.treeFor(share);
        await Open.withOpen(tree, {
            filename: toSmbPath(rest),
            desiredAccess: FileAccess.DELETE,
            shareAccess: ShareAccess.READ | ShareAccess.WRITE | ShareAccess.DELETE,
            createDisposition: CreateDisposition.OPEN,
            createOptions: CreateOptions.DIRECTORY_FILE | CreateOptions.DELETE_ON_CLOSE,
            fileAttributes: 0,
        }, async () => undefined);
    }
    async rename(from, to) {
        const f = splitSharePath(from);
        const t = splitSharePath(to);
        if (f.share !== t.share) {
            throw new SmbError({ status: 0, message: "rename across shares is not supported" });
        }
        const tree = await this.treeFor(f.share);
        await Open.withOpen(tree, {
            filename: toSmbPath(f.rest),
            desiredAccess: FileAccess.DELETE | FileAccess.FILE_READ_ATTRIBUTES,
            shareAccess: ShareAccess.READ | ShareAccess.WRITE | ShareAccess.DELETE,
            createDisposition: CreateDisposition.OPEN,
            createOptions: 0,
            fileAttributes: 0,
        }, async (open) => {
            const inner = encodeFileRenameInformation({
                replaceIfExists: false,
                fileName: toSmbPath(t.rest),
            });
            const body = encodeSetInfoRequest({
                infoType: InfoType.FILE,
                fileInformationClass: FileInformationClass.FileRenameInformation,
                fileId: open.fileId,
                buffer: inner,
            });
            const signing = tree.session.makeSigning();
            const resp = await tree.conn.send(SmbCommand.SET_INFO, body, {
                sessionId: tree.session.sessionId,
                treeId: tree.treeId,
                ...(signing !== undefined ? { signing } : {}),
                encrypt: tree.encryptRequired,
                creditCharge: 1,
            });
            if (!isSuccess(resp.header.status)) {
                throw new SmbError({
                    status: resp.header.status,
                    message: `SET_INFO rename failed: ${statusName(resp.header.status)}`,
                });
            }
        });
    }
    async *watch(path, opts = {}) {
        const { share, rest } = splitSharePath(path);
        const tree = await this.treeFor(share);
        const open = await Open.create(tree, {
            filename: toSmbPath(rest),
            desiredAccess: FileAccess.FILE_READ_DATA | FileAccess.FILE_READ_ATTRIBUTES, // FILE_LIST_DIRECTORY = FILE_READ_DATA
            shareAccess: ShareAccess.READ | ShareAccess.WRITE | ShareAccess.DELETE,
            createDisposition: CreateDisposition.OPEN,
            createOptions: 1, // DIRECTORY_FILE
            fileAttributes: 0,
        });
        try {
            for await (const ev of watchOpen(open, opts)) {
                const fullPath = `${share}/${toSmbPath(rest).replace(/\\/g, "/")}/${ev.fileName.replace(/\\/g, "/")}`
                    .replace(/\/+/g, "/");
                yield { action: ev.action, path: fullPath };
            }
        }
        finally {
            try {
                await open.close();
            }
            catch { /* ignore */ }
        }
    }
    createReadStream(path, opts = {}) {
        const out = new PassThrough();
        const start = checkStart(opts.start);
        void this._beginReadStream(path, start, {
            onReady: (inner) => {
                inner.pipe(out);
                inner.on("error", (e) => out.destroy(e));
                out.on("close", () => inner.destroy());
            },
            onError: (err) => { out.destroy(err); },
        });
        return out;
    }
    async _beginReadStream(path, start, cbs) {
        try {
            const { share, rest } = splitSharePath(path);
            const tree = await this.treeFor(share);
            const open = await Open.create(tree, {
                filename: toSmbPath(rest),
                desiredAccess: FileAccess.FILE_READ_DATA | FileAccess.FILE_READ_ATTRIBUTES,
                shareAccess: ShareAccess.READ | ShareAccess.WRITE | ShareAccess.DELETE,
                createDisposition: CreateDisposition.OPEN,
                createOptions: CreateOptions.NON_DIRECTORY_FILE,
                fileAttributes: 0,
            });
            const inner = openCreateReadStream(open, { start });
            inner.on("end", async () => { try {
                await open.close();
            }
            catch { /* ignore */ } });
            inner.on("error", () => { open.close().catch(() => undefined); });
            cbs.onReady(inner);
        }
        catch (err) {
            cbs.onError(err);
        }
    }
    createWriteStream(path, opts = {}) {
        const start = checkStart(opts.start);
        let inner = null;
        let connectError = null;
        const pending = [];
        let pendingFinal = null;
        const proxy = new Writable({
            write(chunk, _enc, cb) {
                if (connectError) {
                    cb(connectError);
                    return;
                }
                const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
                if (inner) {
                    inner.write(buf, (err) => cb(err ?? undefined));
                }
                else {
                    pending.push({ chunk: buf, cb });
                }
            },
            final(cb) {
                if (connectError) {
                    cb(connectError);
                    return;
                }
                if (inner)
                    inner.end(() => cb());
                else
                    pendingFinal = cb;
            },
            destroy(err, cb) {
                if (inner)
                    inner.destroy(err ?? undefined);
                cb(err);
            },
        });
        void this._beginWriteStream(path, start, {
            onReady: (i) => {
                inner = i;
                // Drain pending writes in order, then handle pendingFinal
                let chain = Promise.resolve();
                for (const { chunk, cb } of pending) {
                    chain = chain.then(() => new Promise((resolve) => {
                        i.write(chunk, (err) => { cb(err ?? undefined); resolve(); });
                    }));
                }
                pending.length = 0;
                chain.then(() => {
                    if (pendingFinal) {
                        const cb = pendingFinal;
                        pendingFinal = null;
                        i.end(() => cb());
                    }
                }).catch((err) => proxy.destroy(err));
                i.on("error", (e) => proxy.destroy(e));
            },
            onError: (err) => {
                connectError = err;
                for (const p of pending)
                    p.cb(err);
                pending.length = 0;
                if (pendingFinal)
                    pendingFinal(err);
                pendingFinal = null;
                proxy.destroy(err);
            },
        });
        return proxy;
    }
    async _beginWriteStream(path, start, cbs) {
        try {
            const { share, rest } = splitSharePath(path);
            const tree = await this.treeFor(share);
            const open = await Open.create(tree, {
                filename: toSmbPath(rest),
                desiredAccess: FileAccess.GENERIC_WRITE | FileAccess.FILE_READ_ATTRIBUTES,
                shareAccess: ShareAccess.READ | ShareAccess.WRITE | ShareAccess.DELETE,
                // From an offset: keep what is there (resuming); from 0: a new or truncated file
                createDisposition: start > 0n ? CreateDisposition.OPEN_IF : CreateDisposition.OVERWRITE_IF,
                createOptions: CreateOptions.NON_DIRECTORY_FILE,
                fileAttributes: 0,
            });
            cbs.onReady(openCreateWriteStream(open, { start }));
        }
        catch (err) {
            cbs.onError(err);
        }
    }
    async listShares() {
        if (!this.conn || !this.session)
            throw new Error("not connected");
        const ipcPath = `\\\\${this.opts.host}\\IPC$`;
        const ipc = await Tree.connect(this.conn, this.session, ipcPath);
        try {
            return await Open.withOpen(ipc, {
                filename: "srvsvc",
                desiredAccess: FileAccess.GENERIC_READ | FileAccess.GENERIC_WRITE | FileAccess.FILE_READ_ATTRIBUTES,
                shareAccess: ShareAccess.READ | ShareAccess.WRITE | ShareAccess.DELETE,
                createDisposition: CreateDisposition.OPEN,
                createOptions: 0,
                fileAttributes: 0,
            }, async (open) => {
                // Bind
                const bind = encodeBindRequest({ callId: 1, abstractUuid: SRVSVC_UUID, abstractMajor: SRVSVC_MAJOR, abstractMinor: SRVSVC_MINOR });
                await this._pipeTransceive(open, bind);
                // Request: NetrShareEnum (opnum 15)
                const stub = encodeNetrShareEnumRequest({
                    serverName: `\\\\${this.opts.host}`,
                    infoLevel: 1,
                    preferredMaximumLength: 0xffffffff,
                });
                const req = rpcRequest({ callId: 2, opnum: 15, contextId: 0, stub });
                const respFrame = await this._pipeTransceive(open, req);
                const respStub = rpcResponse(respFrame);
                if (!respStub)
                    return [];
                const parsed = parseNetrShareEnumResponse(respStub);
                return parsed.entries.map((e) => ({
                    name: e.name,
                    type: ((e.type & 0xff) === 0 ? "disk" : (e.type & 0xff) === 1 ? "print" : (e.type & 0xff) === 3 ? "ipc" : "special"),
                    comment: e.comment,
                }));
            });
        }
        finally {
            await ipc.disconnect().catch(() => undefined);
        }
    }
    async _pipeTransceive(open, payload) {
        // Named-pipe RPC over SMB2: write the request then read the response.
        // FSCTL_PIPE_TRANSCEIVE requires the client-side pipe to be in message-read
        // mode, which Windows does not expose via SMB2 CREATE flags; it returns
        // STATUS_INVALID_PARAMETER when the pipe is in the default byte-stream read
        // mode. Using SMB2 WRITE + SMB2 READ is the correct approach and matches
        // what production DCE/RPC clients (impacket, Samba) use over SMB2.
        const writeBody = encodeWriteRequest({ fileId: open.fileId, offset: 0n, data: payload });
        const signW = open.tree.session.makeSigning();
        const writeResp = await open.tree.conn.send(SmbCommand.WRITE, writeBody, {
            sessionId: open.tree.session.sessionId,
            treeId: open.tree.treeId,
            ...(signW !== undefined ? { signing: signW } : {}),
            encrypt: open.tree.encryptRequired,
            creditCharge: 1,
        });
        if (!isSuccess(writeResp.header.status)) {
            throw new SmbError({
                status: writeResp.header.status,
                message: `pipe WRITE failed: ${statusName(writeResp.header.status)}`,
            });
        }
        decodeWriteResponse(writeResp.body);
        const readBody = encodeReadRequest({ fileId: open.fileId, offset: 0n, length: 65536 });
        const signR = open.tree.session.makeSigning();
        const readResp = await open.tree.conn.send(SmbCommand.READ, readBody, {
            sessionId: open.tree.session.sessionId,
            treeId: open.tree.treeId,
            ...(signR !== undefined ? { signing: signR } : {}),
            encrypt: open.tree.encryptRequired,
            creditCharge: 1,
        });
        if (!isSuccess(readResp.header.status)) {
            throw new SmbError({
                status: readResp.header.status,
                message: `pipe READ failed: ${statusName(readResp.header.status)}`,
            });
        }
        return decodeReadResponse(readResp.body);
    }
    async close() {
        if (this.state === "closed")
            return;
        this.state = "closed";
        for (const t of this.trees.values()) {
            try {
                await t.disconnect();
            }
            catch { /* ignore */ }
        }
        this.trees.clear();
        if (this.session) {
            try {
                await this.session.close();
            }
            catch { /* ignore */ }
        }
        this.conn?.close();
    }
}
function checkStart(start) {
    if (start === undefined)
        return 0n;
    if (!Number.isSafeInteger(start) || start < 0)
        throw new RangeError(`invalid start offset: ${start}`);
    return BigInt(start);
}
