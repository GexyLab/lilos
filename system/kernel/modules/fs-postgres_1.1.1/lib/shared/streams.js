// Copy of modules/_shared/streams.js (scripts/module-libs.mjs): edit it there, then npm run sync:modules
import { Transform } from 'node:stream';

/**
 * A stream in pieces of exactly `size` bytes (the last one shorter): an async iterator of Buffers,
 * for uploads in parts or blocks. With `atLeastOne`, an empty stream still gives one empty piece
 * (a service that needs one block even for an empty file).
 */
export async function* chunks(stream, size, { atLeastOne = false } = {}) {
  let held = [], length = 0, given = false;
  for await (const chunk of stream) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    held.push(bytes);
    length += bytes.length;
    while (length >= size) {
      const all = Buffer.concat(held);
      yield all.subarray(0, size);
      given = true;
      held = [all.subarray(size)];
      length -= size;
    }
  }
  if (length || (atLeastOne && !given)) yield Buffer.concat(held);
}

/** Drops the first `count` bytes of what passes (a download resumed where the server ignored Range). */
export function skipFirst(count) {
  let skip = count;
  return new Transform({
    transform(chunk, _enc, done) {
      if (skip >= chunk.length) { skip -= chunk.length; return done(); }
      const rest = skip ? chunk.subarray(skip) : chunk;
      skip = 0;
      done(null, rest);
    },
  });
}
