import { connect } from "node:net";
import { EventEmitter } from "node:events";
import { FrameReader } from "./framer.js";
export class TcpTransport extends EventEmitter {
    socket;
    reader = new FrameReader();
    closed = false;
    constructor(socket) {
        super();
        this.socket = socket;
        // A server that vanished (no FIN) is found by TCP keep-alive; a timeout on the socket
        // would also cut long CHANGE_NOTIFY waits, which are idle by design
        socket.setKeepAlive(true, 30_000);
        socket.setNoDelay(true);
        socket.on("data", (chunk) => {
            this.reader.feed(chunk);
            let m;
            while ((m = this.reader.next()) !== null)
                this.emit("message", m);
        });
        socket.on("error", (err) => this.emit("error", err));
        socket.on("close", () => {
            if (!this.closed) {
                this.closed = true;
                this.emit("close");
            }
        });
    }
    static connect(host, port = 445, opts = {}) {
        return new Promise((resolve, reject) => {
            const sock = connect({ host, port });
            const onError = (err) => {
                cleanup();
                reject(err);
            };
            const onConnect = () => {
                cleanup();
                resolve(new TcpTransport(sock));
            };
            let timer = null;
            const cleanup = () => {
                if (timer)
                    clearTimeout(timer);
                sock.off("error", onError);
                sock.off("connect", onConnect);
            };
            sock.once("error", onError);
            sock.once("connect", onConnect);
            if (opts.timeoutMs && opts.timeoutMs > 0) {
                timer = setTimeout(() => {
                    sock.destroy(new Error(`connect timeout after ${opts.timeoutMs}ms`));
                }, opts.timeoutMs);
            }
        });
    }
    send(frame) {
        if (this.closed)
            throw new Error("TcpTransport: closed");
        this.socket.write(frame);
    }
    close() {
        if (this.closed)
            return;
        this.closed = true;
        this.socket.end();
    }
}
