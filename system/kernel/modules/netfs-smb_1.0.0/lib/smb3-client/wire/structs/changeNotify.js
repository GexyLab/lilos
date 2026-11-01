import { Reader, Writer } from "../buffer.js";
export const CompletionFilter = {
    FILE_NAME: 0x00000001,
    DIR_NAME: 0x00000002,
    ATTRIBUTES: 0x00000004,
    SIZE: 0x00000008,
    LAST_WRITE: 0x00000010,
    LAST_ACCESS: 0x00000020,
    CREATION: 0x00000040,
    EA: 0x00000080,
    SECURITY: 0x00000100,
    STREAM_NAME: 0x00000200,
    STREAM_SIZE: 0x00000400,
    STREAM_WRITE: 0x00000800,
};
export const ChangeAction = {
    ADDED: 1,
    REMOVED: 2,
    MODIFIED: 3,
    RENAMED_OLD_NAME: 4,
    RENAMED_NEW_NAME: 5,
};
export function encodeChangeNotifyRequest(req) {
    if (req.fileId.length !== 16)
        throw new Error("CHANGE_NOTIFY: FileId must be 16 bytes");
    const w = new Writer();
    w.u16(32);
    w.u16(req.flags);
    w.u32(req.outputBufferLength);
    w.bytes(req.fileId);
    w.u32(req.completionFilter);
    w.u32(0); // Reserved
    return w.buffer();
}
export function parseFileNotifyInformation(buf) {
    const out = [];
    let off = 0;
    while (off < buf.length) {
        const r = new Reader(buf);
        r.offset = off;
        const next = r.u32();
        const action = r.u32();
        const fnLen = r.u32();
        const fileName = r.utf16(fnLen);
        out.push({ action, fileName });
        if (next === 0)
            break;
        off += next;
    }
    return out;
}
export function decodeChangeNotifyResponse(body, bodyAt = 64) {
    const r = new Reader(body);
    const ss = r.u16();
    if (ss !== 9)
        throw new Error(`CHANGE_NOTIFY resp StructureSize ${ss} != 9`);
    const offset = r.u16();
    const length = r.u32();
    const start = offset - bodyAt;
    return Buffer.from(body.subarray(start, start + length));
}
