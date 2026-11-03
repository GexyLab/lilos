import { createHash } from "node:crypto";
/**
 * SMB 3.1.1 pre-auth integrity rolling hash.
 * Initial value: 64 zero bytes. Each update: hash = SHA-512(prev || data).
 */
export class PreauthHash {
    value = Buffer.alloc(64);
    update(data) {
        this.value = createHash("sha512").update(Buffer.concat([this.value, data])).digest();
    }
    digest() {
        return Buffer.from(this.value);
    }
}
