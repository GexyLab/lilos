import { encodeTreeConnectRequest, decodeTreeConnectResponse } from "../wire/structs/treeConnect.js";
import { encodeTreeDisconnectRequest } from "../wire/structs/treeDisconnect.js";
import { SmbCommand, ShareFlag, isSuccess, statusName } from "../wire/commands.js";
import { SmbError } from "../errors.js";
export class Tree {
    conn;
    session;
    path;
    treeId;
    shareType;
    shareFlags;
    maximalAccess;
    encryptData;
    constructor(conn, session, path, treeId, shareType, shareFlags, maximalAccess, encryptData) {
        this.conn = conn;
        this.session = session;
        this.path = path;
        this.treeId = treeId;
        this.shareType = shareType;
        this.shareFlags = shareFlags;
        this.maximalAccess = maximalAccess;
        this.encryptData = encryptData;
    }
    /** True if any request on this tree must be encrypted (per-share flag or session-wide). */
    get encryptRequired() {
        return this.encryptData || this.session.globalEncrypt;
    }
    static async connect(conn, session, sharePath) {
        const body = encodeTreeConnectRequest({ path: sharePath });
        const signing = session.makeSigning();
        // TREE_CONNECT itself is only encrypted under session-global encryption; the per-share
        // EncryptData flag is not known until the response arrives.
        const resp = await conn.send(SmbCommand.TREE_CONNECT, body, {
            sessionId: session.sessionId,
            ...(signing !== undefined ? { signing } : {}),
            encrypt: session.globalEncrypt,
            creditCharge: 1,
        });
        if (!isSuccess(resp.header.status)) {
            throw new SmbError({ status: resp.header.status, message: `TREE_CONNECT failed: ${statusName(resp.header.status)}` });
        }
        const tcr = decodeTreeConnectResponse(resp.body);
        if (resp.header.treeId === undefined)
            throw new Error("TREE_CONNECT: server did not return TreeId");
        const encryptData = (tcr.shareFlags & ShareFlag.ENCRYPT_DATA) !== 0;
        if (encryptData && session.encryptionKeys === null) {
            throw new SmbError({
                status: 0,
                message: `server requires encryption on share ${sharePath} but the session has no encryption keys`,
            });
        }
        return new Tree(conn, session, sharePath, resp.header.treeId, tcr.shareType, tcr.shareFlags, tcr.maximalAccess, encryptData);
    }
    async disconnect() {
        const body = encodeTreeDisconnectRequest();
        const signing = this.session.makeSigning();
        await this.conn.send(SmbCommand.TREE_DISCONNECT, body, {
            sessionId: this.session.sessionId,
            treeId: this.treeId,
            ...(signing !== undefined ? { signing } : {}),
            encrypt: this.encryptRequired,
            creditCharge: 1,
        });
    }
}
