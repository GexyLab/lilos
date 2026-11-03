import { execFile, spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { existsSync, readdirSync, realpathSync, statfsSync, watch } from 'node:fs';
import { userInfo } from 'node:os';
import { join } from 'node:path';

/**
 * Removable drives of the computer (USB sticks and disks, memory cards): [{ id, name, path,
 * size, free }], event 'change' with the new list. Watched only while someone listens.
 *   Windows  a PowerShell that waits for volume changes (Win32_VolumeChangeEvent) and lists the
 *            drives of type removable or on a USB disk
 *   macOS    /Volumes (the start-up disk excluded)
 *   Linux    /media/<user> and /run/media/<user> (where the desktop mounts them)
 */
class Drives extends EventEmitter {
  #list = [];
  #stop = null;

  get list() { return this.#list; }

  #set(list) {
    const key = l => JSON.stringify(l.map(d => [d.id, d.name, d.size]));
    if (key(list) === key(this.#list)) return;
    this.#list = list;
    this.emit('change', list);
  }

  start() {
    if (this.#stop) return;
    if (process.platform === 'win32') this.#stop = this.#windows();
    else this.#stop = this.#unix(process.platform === 'darwin' ? ['/Volumes'] : [join('/media', userInfo().username), join('/run/media', userInfo().username)]);
  }

  stop() {
    this.#stop?.();
    this.#stop = null;
  }

  #windows() {
    const script = `
      $ErrorActionPreference = 'SilentlyContinue'
      function Emit {
        $usb = @(Get-Disk | Where-Object BusType -eq 'USB' | Get-Partition | Where-Object DriveLetter | ForEach-Object { "$($_.DriveLetter):" })
        $l = @(Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DriveType -eq 2 -or $usb -contains $_.DeviceID } | ForEach-Object {
          [pscustomobject]@{ id = $_.DeviceID; name = $_.VolumeName; path = $_.DeviceID + '\\'; size = [int64]$_.Size; free = [int64]$_.FreeSpace } })
        [Console]::Out.WriteLine('DRIVES ' + (ConvertTo-Json -Compress -Depth 2 -InputObject $l))
      }
      Emit
      Register-CimIndicationEvent -ClassName Win32_VolumeChangeEvent -SourceIdentifier vol | Out-Null
      while ($true) { Wait-Event -SourceIdentifier vol | Out-Null; Remove-Event -SourceIdentifier vol; Start-Sleep -Milliseconds 800; Emit }
    `;
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', '-'], { windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] });
    child.stdin.end(script);
    let buf = '';
    child.stdout.on('data', chunk => {
      buf += chunk;
      let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line.startsWith('DRIVES ')) continue;
        try {
          const list = JSON.parse(line.slice(7)) ?? [];
          this.#set(list.map(d => ({ id: d.id, name: d.name ? `${d.name} (${d.id})` : d.id, path: d.path, size: d.size, free: d.free })));
        } catch { /* half a line */ }
      }
    });
    child.on('error', () => {});
    return () => child.kill();
  }

  #unix(roots) {
    const scan = () => {
      const list = [];
      for (const root of roots) {
        if (!existsSync(root)) continue;
        for (const name of readdirSync(root)) {
          const path = join(root, name);
          try {
            if (realpathSync(path) === '/') continue;   // macOS: the start-up disk
            const fs = statfsSync(path);
            list.push({ id: path, name, path, size: fs.blocks * fs.bsize, free: fs.bavail * fs.bsize });
          } catch { /* not readable, or going */ }
        }
      }
      this.#set(list);
    };
    scan();
    let timer = null;
    const later = () => { clearTimeout(timer); timer = setTimeout(scan, 700); };
    const watchers = roots.filter(existsSync).map(r => { try { return watch(r, later); } catch { return null; } }).filter(Boolean);
    // A folder that appears later (the first stick ever on Linux): look again now and then
    const poll = setInterval(scan, 15_000);
    return () => { watchers.forEach(w => w.close()); clearInterval(poll); clearTimeout(timer); };
  }

  /** Ejects a drive of the list (it can then be pulled out). */
  eject(id) {
    const drive = this.#list.find(d => d.id === id);
    if (!drive) return Promise.reject(new Error('Unità non trovata'));
    const [cmd, args] = process.platform === 'win32'
      ? ['powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `(New-Object -ComObject Shell.Application).Namespace(17).ParseName('${drive.id.replace(/'/g, '')}').InvokeVerb('Eject')`]]
      : process.platform === 'darwin' ? ['diskutil', ['eject', drive.path]] : ['gio', ['mount', '-u', drive.path]];
    return new Promise((resolve, reject) => execFile(cmd, args, { windowsHide: true, timeout: 30_000 }, err => (err ? reject(new Error(`Espulsione non riuscita: ${err.message}`)) : resolve())));
  }
}

export const drives = new Drives();
