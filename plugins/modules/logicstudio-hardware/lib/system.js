import { writeFile } from 'node:fs/promises';
import { uptime as osUptime } from 'node:os';
import { join } from 'node:path';
import { argsOf, oops, short } from './common.js';
import { lib } from './native.js';
import { IS_WIN, cleanTemp, powershell, run, tempDir, which } from './tools.js';

/**
 * The computer that runs lilOS (systeminformation, only its functions without arguments): CPU,
 * load, memory, uptime, temperatures, battery, disks, network interfaces, printers. Answers are
 * kept a few seconds (on Windows each question starts PowerShell). Printing: a file of the user's
 * home (read AS THE USER) copied to a private temporary file, then CUPS lp (Linux, macOS) or,
 * on Windows, Out-Printer for text and the image printer of .NET for pictures. Only some kinds of
 * files: never something a printer driver or an app would run.
 */

const CACHE_MS = 3000;
const PRINT_TYPES = { txt: 'text', csv: 'text', log: 'text', md: 'text', json: 'text', pdf: 'pdf', png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', bmp: 'image' };
const MAX_PRINT = 20 << 20;
const round = (v, d = 1) => (Number.isFinite(v) ? Math.round(v * 10 ** d) / 10 ** d : null);

const PS_PRINT_TEXT = `Get-Content -LiteralPath $env:LS_FILE -Encoding UTF8 | Out-Printer -Name $env:LS_PRINTER`;
const PS_PRINT_IMAGE = `
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile($env:LS_FILE)
try {
  $doc = New-Object System.Drawing.Printing.PrintDocument
  $doc.PrinterSettings.PrinterName = $env:LS_PRINTER
  if (-not $doc.PrinterSettings.IsValid) { throw 'stampante non valida' }
  $doc.DocumentName = $env:LS_NAME
  $doc.add_PrintPage({ param($s, $e)
    $b = $e.MarginBounds
    $r = [Math]::Min($b.Width / $img.Width, $b.Height / $img.Height)
    $w = [int]($img.Width * $r); $h = [int]($img.Height * $r)
    $e.Graphics.DrawImage($img, $b.X + [int](($b.Width - $w) / 2), $b.Y + [int](($b.Height - $h) / 2), $w, $h)
    $e.HasMorePages = $false
  })
  $doc.Print()
} finally { $img.Dispose() }`;

export function systemActions({ need, files }) {
  const cache = new Map();   // key → { at, value: Promise }
  const cached = (key, fn) => {
    const c = cache.get(key);
    if (c && Date.now() - c.at < CACHE_MS) return c.value;
    const value = fn();
    cache.set(key, { at: Date.now(), value });
    value.catch(() => cache.delete(key));
    return value;
  };
  const si = () => lib('si');

  async function printers() {
    const list = await (await si()).printer();
    return list.map(p => ({ name: String(p.name ?? ''), status: String(p.status ?? ''), default: p.default === true, local: p.local !== false, shared: p.shared === true })).filter(p => p.name);
  }

  return {
    async 'hw.systemInfo'(user) {
      need(user, 'system');
      return cached('info', async () => {
        const s = await si();
        const [cpu, load, mem, temp, os] = await Promise.all([
          s.cpu(), s.currentLoad(), s.mem(), s.cpuTemperature().catch(() => ({})), s.osInfo(),
        ]);
        return {
          cpu: { brand: `${cpu.manufacturer ?? ''} ${cpu.brand ?? ''}`.trim(), cores: cpu.cores ?? null, physicalCores: cpu.physicalCores ?? null, speedGHz: cpu.speed ?? null },
          load: round(load.currentLoad), loadPerCore: (load.cpus ?? []).map(c => round(c.load)),
          memory: { total: mem.total, used: mem.active ?? mem.used, free: mem.available ?? mem.free, percent: round(((mem.active ?? mem.used) / mem.total) * 100) },
          uptime: Math.round(osUptime()),
          temperature: { main: round(temp.main), max: round(temp.max), cores: (temp.cores ?? []).map(t => round(t)).filter(t => t !== null) },
          os: { platform: os.platform, distro: os.distro, release: os.release, arch: os.arch, hostname: os.hostname },
        };
      });
    },

    async 'hw.battery'(user) {
      need(user, 'system');
      return cached('battery', async () => {
        const b = await (await si()).battery();
        return {
          present: b.hasBattery === true, percent: b.hasBattery ? round(b.percent, 0) : null, charging: b.isCharging === true,
          plugged: b.acConnected === true, minutesLeft: Number.isFinite(b.timeRemaining) && b.timeRemaining >= 0 ? b.timeRemaining : null,
          cycles: b.cycleCount ?? null, health: b.designedCapacity > 0 && b.maxCapacity > 0 ? round((b.maxCapacity / b.designedCapacity) * 100, 0) : null,
          voltage: b.voltage ?? null, model: b.model ?? '',
        };
      });
    },

    async 'hw.disks'(user) {
      need(user, 'system');
      return cached('disks', async () => {
        const list = await (await si()).fsSize();
        return { disks: list.map(d => ({ mount: d.mount, fs: d.fs, type: d.type, size: d.size, used: d.used, free: d.available, percent: round(d.use) })) };
      });
    },

    async 'hw.network'(user) {
      need(user, 'system');
      return cached('network', async () => {
        const s = await si();
        const [list, def] = await Promise.all([s.networkInterfaces(), s.networkInterfaceDefault().catch(() => '')]);
        const all = Array.isArray(list) ? list : [list];
        return {
          interfaces: all.map(n => ({
            name: n.iface, label: n.ifaceName ?? n.iface, ip4: n.ip4 ?? '', ip6: n.ip6 ?? '', mac: n.mac ?? '', internal: n.internal === true,
            up: n.operstate === 'up', type: n.type ?? '', speed: n.speed ?? null, default: n.iface === def,
          })),
          default: def || '',
        };
      });
    },

    async 'hw.printers'(user) {
      need(user, 'system');
      return { printers: await cached('printers', printers) };
    },

    async 'hw.print'(user, args, tools) {
      need(user, 'system');
      const a = argsOf(args);
      const at = await files.where(user, a.path);
      const ext = at.rest.at(-1)?.split('.').pop()?.toLowerCase() ?? '';
      const kind = PRINT_TYPES[ext];
      if (!kind || !at.rest.length) throw oops(`Si stampano solo file ${Object.keys(PRINT_TYPES).join(', ')}: «${at.shown}» no`);
      if (IS_WIN && kind === 'pdf') throw oops('Su Windows i PDF non si stampano da Logic Studio: stampa un\'immagine o un testo');
      const list = await printers();
      const wanted = short(a.printer, 200);
      const printer = wanted ? list.find(p => p.name === wanted) : list.find(p => p.default) ?? null;
      if (!printer) throw oops(wanted ? `La stampante «${wanted}» non c'è` : 'Non c\'è una stampante predefinita: scegline una');
      const bytes = await files.read(user, at, MAX_PRINT);
      const dir = await tempDir();
      try {
        const file = join(dir, `stampa.${ext}`);
        await writeFile(file, bytes, { mode: 0o600 });
        if (IS_WIN) {
          const r = await powershell(kind === 'text' ? PS_PRINT_TEXT : PS_PRINT_IMAGE, { LS_FILE: file, LS_PRINTER: printer.name, LS_NAME: at.rest.at(-1) }, { timeoutMs: 60_000, signal: tools?.signal });
          if (r.code !== 0) throw oops(`La stampa non è partita: ${r.stderr.split('\n').find(l => l.trim())?.trim().slice(0, 200) ?? `codice ${r.code}`}`);
        } else {
          const lp = await which('lp');
          if (!lp) throw oops('Manca il comando lp (CUPS): installa cups-client');
          const r = await run(lp, ['-d', printer.name, '-t', at.rest.at(-1).slice(0, 100), '--', file], { timeoutMs: 30_000, signal: tools?.signal });
          if (r.code !== 0) throw oops(`La stampa non è partita: ${r.stderr.trim().slice(0, 200) || `codice ${r.code}`}`);
        }
      } finally {
        await cleanTemp(dir);
      }
      return { printer: printer.name, path: at.shown };
    },
  };
}
