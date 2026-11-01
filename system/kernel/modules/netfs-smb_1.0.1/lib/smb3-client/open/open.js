import { encodeCreateRequest, decodeCreateResponse, } from "../wire/structs/create.js";
import { encodeCloseRequest, decodeCloseResponse } from "../wire/structs/close.js";
import { SmbCommand, isSuccess, statusName } from "../wire/commands.js";
import { SmbError } from "../errors.js";
export class Open {
    tree;
    fileId;
    meta;
    closed = false;
    constructor(tree, fileId, meta) {
        this.tree = tree;
        this.fileId = fileId;
        this.meta = meta;
    }
    static async create(tree, req) {
        const body = encodeCreateRequest(req);
        const signing = tree.session.makeSigning();
        const resp = await tree.conn.send(SmbCommand.CREATE, body, {
            sessionId: tree.session.sessionId,
            treeId: tree.treeId,
            ...(signing !== undefined ? { signing } : {}),
            encrypt: tree.encryptRequired,
            creditCharge: 1,
        });
        if (!isSuccess(resp.header.status)) {
            throw new SmbError({ status: resp.header.status, message: `CREATE failed: ${statusName(resp.header.status)}` });
        }
        const meta = decodeCreateResponse(resp.body);
        return new Open(tree, meta.fileId, meta);
    }
    async close() {
        if (this.closed)
            return;
        this.closed = true;
        const body = encodeCloseRequest(this.fileId);
        const signing = this.tree.session.makeSigning();
        const resp = await this.tree.conn.send(SmbCommand.CLOSE, body, {
            sessionId: this.tree.session.sessionId,
            treeId: this.tree.treeId,
            ...(signing !== undefined ? { signing } : {}),
            encrypt: this.tree.encryptRequired,
            creditCharge: 1,
        });
        if (!isSuccess(resp.header.status)) {
            throw new SmbError({ status: resp.header.status, message: `CLOSE failed: ${statusName(resp.header.status)}` });
        }
        decodeCloseResponse(resp.body);
    }
    static async withOpen(tree, req, fn) {
        const open = await Open.create(tree, req);
        try {
            return await fn(open);
        }
        finally {
            try {
                await open.close();
            }
            catch { /* swallow secondary close error */ }
        }
    }
}
