import { Readable } from "node:stream";
import { readAt } from "./read.js";
export function createReadStream(open, opts = {}) {
    const start = opts.start ?? 0n;
    const totalEnd = opts.end ?? open.meta.endOfFile - 1n;
    if (totalEnd < start) {
        return Readable.from([], { objectMode: false });
    }
    // One READ per chunk: readAt() splits anything bigger than 64 KiB into sequential
    // reads, so bigger chunks only delay the first bytes and make progress jumpy.
    // Throughput comes from several reads in flight instead.
    const max = open.tree.conn.state?.maxReadSize ?? 65536;
    const chunkSize = Math.min(max, opts.highWaterMark ?? max, 65536);
    const concurrency = Math.max(1, Math.min(opts.concurrency ?? 8, 16));
    let nextOffset = start;
    let outOffset = start; // next offset we may push
    const buffers = new Map(); // offset string → buffer
    let inFlight = 0;
    let pushing = false;
    let closed = false;
    const stream = new Readable({
        highWaterMark: chunkSize,
        read() {
            pushing = true;
            drain();
        },
    });
    function drain() {
        while (pushing && buffers.has(outOffset.toString())) {
            const k = outOffset.toString();
            const buf = buffers.get(k);
            buffers.delete(k);
            pushing = stream.push(buf);
            outOffset += BigInt(buf.length);
        }
        if (outOffset > totalEnd && inFlight === 0 && buffers.size === 0 && !closed) {
            closed = true;
            stream.push(null);
            return;
        }
        while (inFlight < concurrency && nextOffset <= totalEnd) {
            const remaining = totalEnd - nextOffset + 1n;
            const want = remaining > BigInt(chunkSize) ? BigInt(chunkSize) : remaining;
            const offset = nextOffset;
            const length = Number(want);
            nextOffset += want;
            inFlight++;
            readAt(open, offset, length).then((buf) => {
                inFlight--;
                buffers.set(offset.toString(), buf);
                drain();
            }, (err) => {
                stream.destroy(err);
            });
        }
    }
    return stream;
}
