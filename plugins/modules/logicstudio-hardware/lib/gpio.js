import { readdir, readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import { argsOf, int, num, oneOf, oops, sleep } from './common.js';
import { IS_LINUX, run, start, stopChild, which } from './tools.js';

/**
 * GPIO and I²C on Linux (a Raspberry Pi…), with the system's tools: libgpiod (gpioget, gpioset,
 * gpiomon; version 1 and 2 have different options) and i2c-tools (i2cget, i2cset, i2ctransfer).
 * Only numbers reach them (chip, line, bus, address, register, values): checked here, each one an
 * argument of its own. PWM through sysfs (/sys/class/pwm), when the board has it.
 *
 * An output line stays set while the program keeps it: gpioset holds it (v1 --mode=signal, v2 by
 * default) until the value changes (a new gpioset) or the line is released (hw.close).
 * Edges: gpiomon, its lines become events in the handle's queue.
 */

const CHIP = /^(?:gpiochip)?(\d{1,3})$/;
const versions = new Map();   // tool path → 1 | 2
const high = v => (v === true || v === 1 || v === '1' || v === 'true' ? 1 : 0);

function linuxOnly() {
  if (!IS_LINUX) throw oops('GPIO e I²C ci sono solo su Linux (per esempio un Raspberry Pi)');
}

async function tool(name, pkg) {
  const path = await which(name);
  if (!path) throw oops(`Manca il comando ${name}: installa ${pkg} (sudo apt install ${pkg})`);
  return path;
}

/** libgpiod's major version (1 or 2), from «gpioget --version». */
export async function gpiodVersion(path) {
  if (versions.has(path)) return versions.get(path);
  let v = 1;
  try {
    const r = await run(path, ['--version'], { timeoutMs: 5000 });
    v = parseGpiodVersion(r.stdout.toString() + r.stderr);
  } catch { /* v1 */ }
  versions.set(path, v);
  return v;
}

export const parseGpiodVersion = text => {
  const m = /v?(\d+)\.(\d+)/.exec(String(text));
  return m && Number(m[1]) >= 2 ? 2 : 1;
};

const chipOf = v => {
  const m = CHIP.exec(String(v ?? '0').trim());
  if (!m) throw oops(`Chip GPIO non valido: ${String(v).slice(0, 20)} (scrivi gpiochip0 oppure 0)`);
  return `gpiochip${Number(m[1])}`;
};

/** Value of «gpioget» (v1: «1»; v2: «"17"=active» or «inactive»). */
export function parseGpioget(text) {
  const s = String(text).trim();
  if (/^[01]$/.test(s)) return Number(s);
  if (/=\s*active\b/i.test(s)) return 1;
  if (/=\s*inactive\b/i.test(s)) return 0;
  const m = /(\d)\s*$/.exec(s);
  if (m) return Number(m[1]);
  throw oops(`Risposta di gpioget non capita: ${s.slice(0, 80)}`);
}

/** An edge line of gpiomon: { edge: 'rising'|'falling', line } or null. */
export function parseGpiomon(lineText) {
  const s = String(lineText).trim();
  if (!s) return null;
  const edge = /rising/i.test(s) ? 'rising' : /falling/i.test(s) ? 'falling' : null;
  // --format output of v1: «1 17» (1 rising, 0 falling); of v2: «rising 17»
  const m = /^(rising|falling|[012])\s+(\d+)$/i.exec(s);
  if (m) {
    const e = /^\d$/.test(m[1]) ? (m[1] === '0' || m[1] === '2' ? 'falling' : 'rising') : m[1].toLowerCase();
    return { edge: e, line: Number(m[2]) };
  }
  if (!edge) return null;
  const off = /offset:\s*(\d+)/i.exec(s) ?? /"(\d+)"/.exec(s);
  return { edge, line: off ? Number(off[1]) : null };
}

/** The bytes of i2ctransfer / i2cget output: «0x01 0x2a» → [1, 42]. */
export function parseI2cBytes(text) {
  const out = String(text).trim().split(/\s+/).filter(Boolean).map(t => {
    if (!/^0x[0-9a-f]{1,4}$/i.test(t)) throw oops(`Risposta di i2c non capita: ${String(text).slice(0, 80)}`);
    return Number.parseInt(t, 16);
  });
  return out;
}

const errorOf = (r, what) => oops(`${what}: ${(r.stderr || r.stdout.toString()).split('\n').find(l => l.trim())?.trim().slice(0, 200) ?? `codice ${r.code}`}`);

export function gpioActions({ handles, need }) {
  async function setLine(chip, line, value, ver, path) {
    const args = ver === 2 ? ['--chip', chip, `${line}=${value}`] : ['--mode=signal', chip, `${line}=${value}`];
    const child = start(path, args);
    let err = '';
    child.stderr.on('data', d => { err += d; });
    // It holds the line while it runs: an early end is an error (line busy, no rights)
    const ended = await Promise.race([new Promise(r => child.once('close', code => r({ code }))), sleep(300).then(() => null)]);
    if (ended) throw oops(`gpioset non ha impostato la linea ${line}: ${err.trim().split('\n')[0]?.slice(0, 200) || `codice ${ended.code}`}`);
    return child;
  }

  return {
    async 'hw.gpioChips'(user) {
      need(user, 'gpio');
      linuxOnly();
      const names = (await readdir('/dev').catch(() => [])).filter(n => /^gpiochip\d+$/.test(n)).sort();
      const chips = [];
      for (const n of names) {
        const label = await readFile(join('/sys/bus/gpio/devices', n, 'label'), 'utf8').catch(() => '');
        chips.push({ chip: n, label: label.trim() });
      }
      return { chips };
    },

    async 'hw.gpioRead'(user, args, tools) {
      need(user, 'gpio');
      linuxOnly();
      const a = argsOf(args);
      const chip = chipOf(a.chip), line = int(a.line, 0, 1023, 'Linea GPIO');
      const path = await tool('gpioget', 'gpiod');
      const ver = await gpiodVersion(path);
      const bias = oneOf(a.bias ?? 'as-is', ['as-is', 'pull-up', 'pull-down', 'disable'], 'Resistenza');
      const args2 = ver === 2
        ? ['--chip', chip, ...(bias !== 'as-is' ? ['--bias', bias] : []), String(line)]
        : [...(bias !== 'as-is' ? [`--bias=${bias}`] : []), chip, String(line)];
      const r = await run(path, args2, { timeoutMs: 5000, signal: tools?.signal });
      if (r.code !== 0) throw errorOf(r, `GPIO ${line} non si legge`);
      return { value: parseGpioget(r.stdout.toString()) };
    },

    /** An output line held by the program: a handle; hw.gpioWrite changes it, hw.close lets it go. */
    async 'hw.gpioOutput'(user, args, tools) {
      need(user, 'gpio');
      linuxOnly();
      const a = argsOf(args);
      const chip = chipOf(a.chip), line = int(a.line, 0, 1023, 'Linea GPIO');
      const path = await tool('gpioset', 'gpiod');
      const ver = await gpiodVersion(path);
      const h = handles.create(user, tools, { cls: 'gpio', kind: 'gpioOut', resource: `gpio:${chip}:${line}`, label: `GPIO ${chip}/${line}` });
      try {
        h.data = { chip, line, ver, path, child: await setLine(chip, line, high(a.value), ver, path), value: high(a.value) };
      } catch (err) { handles.drop(h); throw err; }
      h.closeFn = () => stopChild(h.data.child, { graceMs: 1000 });
      return { handle: h.id, value: h.data.value };
    },

    async 'hw.gpioWrite'(user, args, tools) {
      need(user, 'gpio');
      const a = argsOf(args);
      const h = handles.get(user, tools, a.handle, ['gpioOut']);
      if (h.closed) throw oops(`${h.label} è stata rilasciata`);
      const value = high(a.value);
      if (value === h.data.value && h.data.child?.exitCode === null) return { value };
      await stopChild(h.data.child, { graceMs: 1000 });
      h.data.child = await setLine(h.data.chip, h.data.line, value, h.data.ver, h.data.path);
      h.data.value = value;
      return { value };
    },

    /** Edges of an input line (gpiomon): events { edge, line, at } in the handle's queue. */
    async 'hw.gpioWatch'(user, args, tools) {
      need(user, 'gpio');
      linuxOnly();
      const a = argsOf(args);
      const chip = chipOf(a.chip), line = int(a.line, 0, 1023, 'Linea GPIO');
      const edge = oneOf(a.edge ?? 'both', ['both', 'rising', 'falling'], 'Fronte');
      const bias = oneOf(a.bias ?? 'as-is', ['as-is', 'pull-up', 'pull-down', 'disable'], 'Resistenza');
      const path = await tool('gpiomon', 'gpiod');
      const ver = await gpiodVersion(path);
      const args2 = ver === 2
        ? ['--chip', chip, ...(edge !== 'both' ? ['--edges', edge] : []), ...(bias !== 'as-is' ? ['--bias', bias] : []), '--format=%E %o', String(line)]
        : [...(edge === 'rising' ? ['--rising-edge'] : edge === 'falling' ? ['--falling-edge'] : []), ...(bias !== 'as-is' ? [`--bias=${bias}`] : []), '--format=%e %o', chip, String(line)];
      const h = handles.create(user, tools, { cls: 'gpio', kind: 'gpioWatch', resource: `gpio:${chip}:${line}`, label: `GPIO ${chip}/${line}`, maxItems: 1000 });
      const child = start(path, args2);
      let rest = '', err = '';
      child.stdout.on('data', d => {
        rest += d;
        const lines = rest.split('\n');
        rest = lines.pop().slice(-1000);
        for (const l of lines) { const ev = parseGpiomon(l); if (ev) handles.push(h, { ...ev, line: ev.line ?? line, at: Date.now() }, 64); }
      });
      child.stderr.on('data', d => { err = (err + d).slice(-500); });
      child.on('close', code => handles.close(h.id, h.closed ? null : `gpiomon si è fermato: ${err.trim().split('\n')[0] || `codice ${code}`}`).catch(() => {}));
      h.closeFn = () => stopChild(child, { graceMs: 1000 });
      return { handle: h.id };
    },

    async 'hw.pwm'(user, args) {
      need(user, 'gpio');
      linuxOnly();
      const a = argsOf(args);
      const chip = int(a.pwmChip, 0, 63, 'Chip PWM', 0), channel = int(a.channel, 0, 63, 'Canale PWM', 0);
      const period = int(a.periodNs, 1000, 1_000_000_000, 'Periodo (ns)', 1_000_000);
      const duty = Math.round(period * num(a.duty, 0, 1, 'Duty cycle (da 0 a 1)', 0.5));
      const base = `/sys/class/pwm/pwmchip${chip}`;
      try { await access(base); } catch { throw oops(`Non c'è PWM: ${base} manca (attivalo nella configurazione della scheda, per esempio dtoverlay=pwm)`); }
      const ch = `${base}/pwm${channel}`;
      try {
        try { await access(ch); } catch { await writeFile(`${base}/export`, String(channel)); await sleep(150); }
        if (a.enabled === false) { await writeFile(`${ch}/enable`, '0'); return { enabled: false }; }
        // The duty cycle can never be more than the period: lower it first when the period gets shorter
        await writeFile(`${ch}/duty_cycle`, '0').catch(() => {});
        await writeFile(`${ch}/period`, String(period));
        await writeFile(`${ch}/duty_cycle`, String(duty));
        await writeFile(`${ch}/enable`, '1');
      } catch (err) {
        throw oops(`PWM ${chip}/${channel}: ${err?.code === 'EACCES' ? 'permesso negato (gruppo gpio o regole udev per /sys/class/pwm)' : err?.message ?? err}`);
      }
      return { enabled: true, periodNs: period, dutyNs: duty };
    },

    async 'hw.i2c'(user, args, tools) {
      need(user, 'gpio');
      linuxOnly();
      const a = argsOf(args);
      const op = oneOf(a.op ?? 'readByte', ['readByte', 'writeByte', 'readWord', 'writeWord', 'readBlock', 'writeBlock', 'scan'], 'Operazione I²C');
      const bus = int(a.bus, 0, 255, 'Bus I²C', 1);
      if (op === 'scan') {
        const path = await tool('i2cdetect', 'i2c-tools');
        const r = await run(path, ['-y', String(bus)], { timeoutMs: 15_000, signal: tools?.signal });
        if (r.code !== 0) throw errorOf(r, `Bus I²C ${bus}`);
        return { addresses: parseI2cDetect(r.stdout.toString()) };
      }
      const addr = int(a.address, 0x03, 0x77, 'Indirizzo I²C');
      const reg = int(a.register, 0, 255, 'Registro', 0);
      const A = `0x${addr.toString(16)}`, R = `0x${reg.toString(16)}`;
      if (op === 'readByte' || op === 'readWord') {
        const path = await tool('i2cget', 'i2c-tools');
        const r = await run(path, ['-y', String(bus), A, R, op === 'readWord' ? 'w' : 'b'], { timeoutMs: 5000, signal: tools?.signal });
        if (r.code !== 0) throw errorOf(r, `I²C ${A} non risponde`);
        return { value: parseI2cBytes(r.stdout.toString())[0] };
      }
      if (op === 'writeByte' || op === 'writeWord') {
        const value = int(a.value, 0, op === 'writeWord' ? 0xffff : 0xff, 'Valore');
        const path = await tool('i2cset', 'i2c-tools');
        const r = await run(path, ['-y', String(bus), A, R, `0x${value.toString(16)}`, op === 'writeWord' ? 'w' : 'b'], { timeoutMs: 5000, signal: tools?.signal });
        if (r.code !== 0) throw errorOf(r, `I²C ${A} non accetta la scrittura`);
        return { written: 1 };
      }
      const path = await tool('i2ctransfer', 'i2c-tools');
      if (op === 'readBlock') {
        const n = int(a.length, 1, 32, 'Lunghezza', 1);
        const r = await run(path, ['-y', String(bus), `w1@${A}`, R, `r${n}@${A}`], { timeoutMs: 5000, signal: tools?.signal });
        if (r.code !== 0) throw errorOf(r, `I²C ${A} non risponde`);
        return { data: parseI2cBytes(r.stdout.toString()) };
      }
      const data = Array.isArray(a.data) ? a.data : [];
      if (!data.length || data.length > 32 || data.some(b => !Number.isInteger(b) || b < 0 || b > 255)) throw oops('Dati I²C non validi: da 1 a 32 byte (numeri da 0 a 255)');
      const r = await run(path, ['-y', String(bus), `w${data.length + 1}@${A}`, R, ...data.map(b => `0x${b.toString(16)}`)], { timeoutMs: 5000, signal: tools?.signal });
      if (r.code !== 0) throw errorOf(r, `I²C ${A} non accetta la scrittura`);
      return { written: data.length };
    },
  };
}

/** The addresses that answer in «i2cdetect -y» (a table of «--» and hex numbers; «UU» = used by a driver). */
export function parseI2cDetect(text) {
  const out = [];
  for (const line of String(text).split('\n')) {
    const m = /^([0-7]0):(.*)$/.exec(line.trimEnd());
    if (!m) continue;
    const row = Number.parseInt(m[1], 16);
    for (let i = 0; i < 16; i++) {
      const cell = m[2].slice(i * 3, i * 3 + 3).trim();
      if (/^[0-9a-f]{2}$/i.test(cell)) out.push(Number.parseInt(cell, 16));
      else if (cell === 'UU') out.push(row + i);
    }
  }
  return out;
}
