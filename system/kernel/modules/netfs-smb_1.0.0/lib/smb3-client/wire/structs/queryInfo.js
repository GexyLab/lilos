import { Writer, Reader } from "../buffer.js";
export const InfoType = {
    FILE: 0x01,
    FILESYSTEM: 0x02,
    SECURITY: 0x03,
    QUOTA: 0x04,
};
export const FileInformationClass = {
    FileBasicInformation: 4,
    FileStandardInformation: 5,
    FileInternalInformation: 6,
    FileEaInformation: 7,
    FileAccessInformation: 8,
    FileAllInformation: 18,
    FileAlignmentInformation: 17,
    FilePositionInformation: 14,
    FileModeInformation: 16,
    FileNameInformation: 9,
    FileEndOfFileInformation: 20,
    FileRenameInformation: 10,
    FileDispositionInformation: 13,
    FileIdBothDirectoryInformation: 37,
    FileIdFullDirectoryInformation: 38,
};
export function encodeQueryInfoRequest(req) {
    const input = req.inputBuffer ?? Buffer.alloc(0);
    const w = new Writer();
    w.u16(41);
    w.u8(req.infoType);
    w.u8(req.fileInformationClass);
    w.u32(req.outputBufferLength);
    if (input.length > 0) {
        w.u16(64 + 40); // InputBufferOffset
        w.u16(0); // Reserved
        w.u32(input.length);
    }
    else {
        w.u16(0);
        w.u16(0);
        w.u32(0);
    }
    w.u32(req.additionalInformation ?? 0);
    w.u32(req.flags ?? 0);
    w.bytes(req.fileId);
    if (input.length > 0)
        w.bytes(input);
    else
        w.u8(0); // Buffer min 1 byte
    return w.buffer();
}
export function decodeQueryInfoResponse(body, bodyAt = 64) {
    const r = new Reader(body);
    const ss = r.u16();
    if (ss !== 9)
        throw new Error(`QUERY_INFO resp StructureSize ${ss} != 9`);
    const offset = r.u16();
    const length = r.u32();
    const start = offset - bodyAt;
    return Buffer.from(body.subarray(start, start + length));
}
export function decodeFileAllInformation(buf) {
    const r = new Reader(buf);
    // BasicInformation
    const creationTime = r.u64();
    const lastAccessTime = r.u64();
    const lastWriteTime = r.u64();
    const changeTime = r.u64();
    const fileAttributes = r.u32();
    r.u32(); // Reserved
    // StandardInformation
    const allocationSize = r.u64();
    const endOfFile = r.u64();
    const numberOfLinks = r.u32();
    r.u8(); // DeletePending
    const isDirectory = r.u8() !== 0;
    r.u16(); // Reserved
    // InternalInformation
    r.u64(); // IndexNumber
    // EaInformation
    r.u32();
    // AccessInformation
    r.u32();
    // PositionInformation
    r.u64();
    // ModeInformation
    r.u32();
    // AlignmentInformation
    r.u32();
    // NameInformation
    const fileNameLength = r.u32();
    const fileName = fileNameLength > 0 ? r.utf16(fileNameLength) : "";
    return {
        creationTime,
        lastAccessTime,
        lastWriteTime,
        changeTime,
        fileAttributes,
        allocationSize,
        endOfFile,
        numberOfLinks,
        isDirectory,
        fileName,
    };
}
