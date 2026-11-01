import { Reader, Writer } from "../buffer.js";
export function encodeTreeConnectRequest(req) {
    const path = Buffer.from(req.path, "utf16le");
    const w = new Writer();
    w.u16(9); // StructureSize
    w.u16(req.flags ?? 0);
    w.u16(64 + 8); // PathOffset (StructureSize+Flags+PathOffset+PathLength = 8; from header start 64+8)
    w.u16(path.length);
    w.bytes(path);
    return w.buffer();
}
export function decodeTreeConnectResponse(body) {
    const r = new Reader(body);
    const ss = r.u16();
    if (ss !== 16)
        throw new Error(`TREE_CONNECT resp StructureSize ${ss} != 16`);
    const t = r.u8();
    r.u8(); // reserved
    const shareFlags = r.u32();
    const capabilities = r.u32();
    const maximalAccess = r.u32();
    let shareType;
    switch (t) {
        case 1:
            shareType = "disk";
            break;
        case 2:
            shareType = "ipc";
            break;
        case 3:
            shareType = "print";
            break;
        default: shareType = "special";
    }
    return { shareType, shareFlags, capabilities, maximalAccess };
}
