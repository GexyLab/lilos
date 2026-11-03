export class CreditWindow {
    credits;
    waiters = [];
    constructor(credits) {
        this.credits = credits;
    }
    available() {
        return this.credits;
    }
    take(n) {
        if (n <= 0)
            return Promise.resolve();
        if (this.credits >= n) {
            this.credits -= n;
            return Promise.resolve();
        }
        return new Promise((resolve) => {
            this.waiters.push({ n, resolve });
        });
    }
    release(n) {
        if (n <= 0)
            return;
        this.credits += n;
        while (this.waiters.length > 0 && this.credits >= this.waiters[0].n) {
            const w = this.waiters.shift();
            this.credits -= w.n;
            w.resolve();
        }
    }
}
