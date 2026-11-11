import { createReadStream } from 'node:fs';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { argsOf, int, num, oops, short } from './common.js';
import { IS_LINUX, IS_MAC, IS_WIN, cleanTemp, powershell, run, start, stopChild, tempDir, which } from './tools.js';

/**
 * Webcam and microphone with the system's ffmpeg (not bundled: /status says whether it is
 * there): dshow on Windows, v4l2 and PulseAudio/ALSA on Linux, avfoundation on macOS. The devices
 * are listed from ffmpeg's own output (Linux cameras from /sys) and a program may use only one of
 * the list. Screens are never a device («Capture screen» of macOS is left out).
 *
 * - photo: one JPEG (after a warm-up, so the camera has set its exposure), to a file of the user's
 *   home (AS THE USER) and/or to the program as a data:image/jpeg;base64 URL;
 * - frames: a stream at most MAX_FPS a second, each frame at most MAX_FRAME bytes (bigger ones are
 *   dropped), the queue keeps the newest few;
 * - recordings (video, audio): to a private temporary file, then copied into the home; at most
 *   MAX_RECORD_SECONDS and MAX_RECORD_BYTES;
 * - microphone level: RMS and peak in dB, n times a second (astats).
 */

export const LIMITS = Object.freeze({
  fps: 10, width: 1280, height: 720, frameBytes: 384 << 10, photoBytes: 1 << 20, framesQueued: 3,
  recordSeconds: 1800, recordBytes: 500 << 20, levelHz: 20,
});

export const NO_FFMPEG = 'Manca ffmpeg: installalo sul computer dove gira lilOS (Windows: winget install ffmpeg; Debian, Ubuntu, Raspberry Pi: sudo apt install ffmpeg; macOS: brew install ffmpeg), poi riavvia lilOS';

export async function ffmpeg() {
  const path = await which('ffmpeg');
  if (!path) throw oops(NO_FFMPEG);
  return path;
}

// ---------------------------------------------------------------- parsers of ffmpeg's output

/** «ffmpeg -list_devices true -f dshow -i dummy» (Windows): { video: [{ name, alt }], audio: [...] }. */
export function parseDshow(text) {
  const out = { video: [], audio: [] };
  let section = null, last = null;
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.replace(/^\[[^\]]*\]\s?/, '');
    if (/DirectShow video devices/i.test(line)) { section = 'video'; continue; }
    if (/DirectShow audio devices/i.test(line)) { section = 'audio'; continue; }
    const alt = /^\s*Alternative name\s+"(.+)"\s*$/.exec(line);
    if (alt) { if (last) last.alt = alt[1]; continue; }
    // New ffmpeg: «"Name" (video)», «"Name" (audio)», «"Name" (audio, video)»; old: «"Name"» in a section
    const m = /^\s*"(.+)"\s*(?:\(([^)]*)\))?\s*$/.exec(line);
    if (!m) continue;
    const kinds = m[2] ? m[2].split(/\s*,\s*/) : section ? [section] : [];
    if (kinds.includes('none')) { last = null; continue; }
    last = { name: m[1], alt: '' };
    for (const k of kinds) if (k === 'video' || k === 'audio') out[k].push(last);
  }
  return out;
}

/** «ffmpeg -f avfoundation -list_devices true -i ""» (macOS): { video: [{ index, name }], audio: [...] }, screens left out. */
export function parseAvfoundation(text) {
  const out = { video: [], audio: [] };
  let section = null;
  for (const raw of String(text).split(/\r?\n/)) {
    const line = raw.replace(/^\[[^\]]*\]\s?/, '');
    if (/AVFoundation video devices/i.test(line)) { section = 'video'; continue; }
    if (/AVFoundation audio devices/i.test(line)) { section = 'audio'; continue; }
    const m = /^\s*\[(\d+)\]\s+(.+?)\s*$/.exec(line);
    if (!m || !section) continue;
    if (section === 'video' && /capture screen/i.test(m[2])) continue;
    out[section].push({ index: Number(m[1]), name: m[2] });
  }
  return out;
}

/** «ffmpeg -sources pulse|alsa» (Linux): [{ id, name, default }]; the monitors of the outputs left out. */
export function parseSources(text) {
  const out = [];
  for (const line of String(text).split(/\r?\n/)) {
    const m = /^\s*(\*)?\s*(\S+)\s+\[(.*)\]\s*$/.exec(line);
    if (!m || /\.monitor$/.test(m[2])) continue;
    out.push({ id: m[2], name: m[3] || m[2], default: !!m[1] });
  }
  return out;
}

/**
 * The levels of «astats … ametadata=mode=print:file=-», chunk after chunk: { rms, peak } in dB
 * (silence: -120) each time an Overall.RMS_level comes (Overall.Peak_level comes before it).
 */
export class LevelParser {
  #rest = '';
  #peak = null;
  feed(text) {
    const lines = (this.#rest + text).split(/\r?\n/);
    this.#rest = lines.pop().slice(-2000);
    const out = [];
    for (const line of lines) {
      if (/^frame:\s*\d+/.test(line.trim())) { this.#peak = null; continue; }
      const m = /lavfi\.astats\.Overall\.(RMS_level|Peak_level)=(\S+)/.exec(line);
      if (!m) continue;
      const v = /inf/i.test(m[2]) ? -120 : Math.max(-120, Math.round(Number(m[2]) * 10) / 10);
      if (!Number.isFinite(v)) continue;
      if (m[1] === 'Peak_level') this.#peak = v;
      else out.push({ rms: v, peak: this.#peak });
    }
    return out;
  }
}

/** JPEG frames out of an MJPEG stream (image2pipe): from SOI (FF D8) to EOI (FF D9). */
export class JpegSplitter {
  #buf = Buffer.alloc(0);
  #max;
  constructor(max = LIMITS.frameBytes * 4) { this.#max = max; }
  push(chunk) {
    this.#buf = this.#buf.length ? Buffer.concat([this.#buf, chunk]) : Buffer.from(chunk);
    const frames = [];
    for (;;) {
      const soi = this.#buf.indexOf(SOI);
      if (soi === -1) { this.#buf = Buffer.alloc(0); break; }
      const eoi = this.#buf.indexOf(EOI, soi + 2);
      if (eoi === -1) { this.#buf = this.#buf.subarray(soi); break; }
      frames.push(Buffer.from(this.#buf.subarray(soi, eoi + 2)));
      this.#buf = this.#buf.subarray(eoi + 2);
    }
    // A frame that never ends (a broken stream): what is there goes
    if (this.#buf.length > this.#max) this.#buf = Buffer.alloc(0);
    return frames;
  }
}
const SOI = Buffer.from([0xff, 0xd8]);
const EOI = Buffer.from([0xff, 0xd9]);

export const dataUrl = jpeg => `data:image/jpeg;base64,${jpeg.toString('base64')}`;

// ---------------------------------------------------------------- the devices

/** The cameras: [{ id, name }] (id: what the blocks send back). */
export async function listCameras() {
  if (IS_LINUX) {
    const names = (await readdir('/sys/class/video4linux').catch(() => [])).filter(n => /^video\d+$/.test(n));
    const out = [];
    for (const n of names.sort((a, b) => Number(a.slice(5)) - Number(b.slice(5)))) {
      // index 0: the capture node (the others of a camera carry metadata)
      const index = (await readFile(`/sys/class/video4linux/${n}/index`, 'utf8').catch(() => '0')).trim();
      if (index !== '0') continue;
      const name = (await readFile(`/sys/class/video4linux/${n}/name`, 'utf8').catch(() => n)).trim();
      out.push({ id: `/dev/${n}`, name });
    }
    return out;
  }
  const ff = await ffmpeg();
  if (IS_WIN) {
    const r = await run(ff, ['-hide_banner', '-list_devices', 'true', '-f', 'dshow', '-i', 'dummy'], { timeoutMs: 15_000 });
    return parseDshow(r.stderr).video.map(d => ({ id: d.name, name: d.name }));
  }
  if (IS_MAC) {
    const r = await run(ff, ['-hide_banner', '-f', 'avfoundation', '-list_devices', 'true', '-i', ''], { timeoutMs: 15_000 });
    return parseAvfoundation(r.stderr).video.map(d => ({ id: String(d.index), name: d.name }));
  }
  throw oops('Webcam non disponibili su questo sistema');
}

/** The microphones: [{ id, name }]. */
export async function listMics() {
  const ff = await ffmpeg();
  if (IS_WIN) {
    const r = await run(ff, ['-hide_banner', '-list_devices', 'true', '-f', 'dshow', '-i', 'dummy'], { timeoutMs: 15_000 });
    return parseDshow(r.stderr).audio.map(d => ({ id: d.name, name: d.name }));
  }
  if (IS_MAC) {
    const r = await run(ff, ['-hide_banner', '-f', 'avfoundation', '-list_devices', 'true', '-i', ''], { timeoutMs: 15_000 });
    return parseAvfoundation(r.stderr).audio.map(d => ({ id: String(d.index), name: d.name }));
  }
  for (const backend of ['pulse', 'alsa']) {
    const r = await run(ff, ['-hide_banner', '-sources', backend], { timeoutMs: 10_000 }).catch(() => null);
    const list = r ? parseSources(r.stdout.toString() + r.stderr) : [];
    if (list.length) return list.map(s => ({ id: `${backend}:${s.id}`, name: s.name, default: s.default }));
  }
  return [];
}

/** The outputs (informative: sounds go to the default one): [{ name }]. */
export async function listSpeakers() {
  if (IS_WIN) {
    const r = await powershell('Get-CimInstance Win32_SoundDevice | ForEach-Object { $_.Name }', {}, { timeoutMs: 20_000 });
    return r.stdout.toString().split(/\r?\n/).map(s => s.trim()).filter(Boolean).map(name => ({ name }));
  }
  if (IS_MAC) {
    const sp = await which('system_profiler');
    if (!sp) return [];
    const r = await run(sp, ['SPAudioDataType', '-json'], { timeoutMs: 20_000 });
    try {
      const items = JSON.parse(r.stdout.toString()).SPAudioDataType?.flatMap(x => x._items ?? []) ?? [];
      return items.filter(i => i.coreaudio_device_output).map(i => ({ name: String(i._name) }));
    } catch { return []; }
  }
  const pactl = await which('pactl');
  if (pactl) {
    const r = await run(pactl, ['list', 'short', 'sinks'], { timeoutMs: 10_000 }).catch(() => null);
    const list = (r?.stdout.toString() ?? '').split('\n').map(l => l.split('\t')[1]).filter(Boolean);
    if (list.length) return list.map(name => ({ name }));
  }
  const aplay = await which('aplay');
  if (!aplay) return [];
  const r = await run(aplay, ['-l'], { timeoutMs: 10_000 }).catch(() => null);
  return (r?.stdout.toString() ?? '').split('\n').map(l => /^card \d+: [^[]*\[([^\]]+)\], device \d+: [^[]*\[([^\]]+)\]/.exec(l)).filter(Boolean).map(m => ({ name: `${m[1]} · ${m[2]}` }));
}

const pickCamera = async raw => {
  const id = short(raw, 300);
  const list = await listCameras();
  const cam = id ? list.find(c => c.id === id || c.name === id) : list[0];
  if (!cam) throw oops(id ? `La webcam «${id}» non c'è (webcam presenti: ${list.map(c => c.name).join(', ') || 'nessuna'})` : 'Non c\'è nessuna webcam');
  return cam;
};

const pickMic = async raw => {
  const id = short(raw, 300);
  const list = await listMics();
  const mic = id ? list.find(m => m.id === id || m.name === id) : list.find(m => m.default) ?? list[0];
  if (!mic) throw oops(id ? `Il microfono «${id}» non c'è (microfoni presenti: ${list.map(m => m.name).join(', ') || 'nessuno'})` : 'Non c\'è nessun microfono');
  return mic;
};

/** ffmpeg's input options for a camera (and a microphone with it, for a video with sound). */
export function inputArgs({ camera = null, mic = null }) {
  if (IS_WIN) {
    const spec = [camera && `video=${camera.id}`, mic && `audio=${mic.id}`].filter(Boolean).join(':');
    return ['-f', 'dshow', '-i', spec];
  }
  if (IS_MAC) return [...(camera ? ['-framerate', '30'] : []), '-f', 'avfoundation', '-i', `${camera ? camera.id : 'none'}:${mic ? mic.id : 'none'}`];
  const out = [];
  if (camera) out.push('-f', 'v4l2', '-i', camera.id);
  if (mic) {
    const [backend, ...rest] = mic.id.split(':');
    out.push('-f', backend === 'alsa' ? 'alsa' : 'pulse', '-i', rest.join(':'));
  }
  return out;
}

const scaleOf = (w, h) => `scale=w=${w}:h=${h}:force_original_aspect_ratio=decrease:force_divisible_by=2`;
const qOf = quality => Math.round(31 - (quality / 100) * 29);
const failure = (r, what) => oops(`${what}: ${r.stderr.split(/\r?\n/).map(l => l.trim()).filter(l => l && !/^(ffmpeg version|built with|configuration:|lib\w+\s+\d)/.test(l)).slice(-1)[0]?.slice(0, 200) ?? `codice ${r.code}`}`);

const VIDEO_EXT = ['mp4', 'mkv', 'avi'];
const AUDIO_EXT = ['wav', 'flac', 'm4a', 'mp3', 'ogg'];

let encodersCache = null;
async function encoders(ff) {
  encodersCache ??= run(ff, ['-hide_banner', '-encoders'], { timeoutMs: 15_000 }).then(r => r.stdout.toString(), () => '');
  const text = await encodersCache;
  return name => new RegExp(`^\\s*[VAS][\\w.]{5}\\s+${name}\\s`, 'm').test(text);
}

async function codecArgs(ff, ext, withAudio) {
  const has = await encoders(ff);
  switch (ext) {
    case 'avi': return ['-c:v', 'mjpeg', '-q:v', '5', ...(withAudio ? ['-c:a', 'pcm_s16le'] : [])];
    case 'mp4': case 'mkv': return [...(has('libx264') ? ['-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p'] : ['-c:v', 'mpeg4', '-q:v', '5']), ...(withAudio ? ['-c:a', 'aac'] : [])];
    case 'wav': return ['-c:a', 'pcm_s16le'];
    case 'flac': return ['-c:a', 'flac'];
    case 'm4a': return ['-c:a', 'aac'];
    case 'mp3': if (!has('libmp3lame')) throw oops('Questo ffmpeg non sa scrivere MP3: registra in .wav, .flac o .m4a'); return ['-c:a', 'libmp3lame', '-q:a', '4'];
    case 'ogg': return has('libopus') ? ['-c:a', 'libopus'] : has('libvorbis') ? ['-c:a', 'libvorbis'] : (() => { throw oops('Questo ffmpeg non sa scrivere OGG: registra in .wav, .flac o .m4a'); })();
    default: throw oops(`Formato non valido: .${ext}`);
  }
}

// ---------------------------------------------------------------- the actions

export function mediaActions({ handles, need, files }) {
  /** A recording or a stream: ffmpeg started, its stderr kept (the last lines, for errors). */
  function ffmpegChild(ff, args) {
    const child = start(ff, args, { stdin: 'pipe' });
    child.errText = '';
    child.stderr.on('data', d => { child.errText = (child.errText + d).slice(-4000); });
    return child;
  }
  const lastError = child => child.errText.split(/\r?\n/).map(l => l.trim()).filter(Boolean).slice(-1)[0]?.slice(0, 200) ?? '';
  const quit = c => { try { c.stdin.write('q'); c.stdin.end(); } catch { c.kill(); } };

  return {
    async 'hw.webcamList'(user) {
      need(user, 'camera');
      return { cameras: await listCameras() };
    },

    async 'hw.audioDevices'(user) {
      need(user, 'audio');
      let inputs = [], warning = null;
      try { inputs = (await listMics()).map(({ id, name }) => ({ id, name })); } catch (err) { warning = err.message; }
      const outputs = await listSpeakers().catch(() => []);
      return { inputs, outputs, warning };
    },

    async 'hw.photo'(user, args, tools) {
      need(user, 'camera');
      const a = argsOf(args);
      const width = int(a.width, 16, LIMITS.width, 'Larghezza', 640), height = int(a.height, 16, LIMITS.height, 'Altezza', 480);
      const quality = int(a.quality, 1, 100, 'Qualità', 85), warmup = num(a.warmup, 0, 5, 'Riscaldamento (secondi)', 1);
      const toFile = typeof a.path === 'string' && a.path.trim() !== '';
      const at = toFile ? await files.where(user, a.path) : null;
      if (at && !/\.jpe?g$/i.test(at.rest.at(-1) ?? '')) throw oops(`La foto si salva in un file .jpg: «${at.shown}» no`);
      if (at) await files.canWrite(user, at);
      const ff = await ffmpeg();
      const cam = await pickCamera(a.camera);
      handles.checkFree(user, `camera:${cam.id}`, cam.name);
      const r = await run(ff, ['-hide_banner', '-loglevel', 'error', ...inputArgs({ camera: cam }), '-ss', String(warmup), '-frames:v', '1', '-vf', scaleOf(width, height), '-q:v', String(qOf(quality)), '-f', 'image2pipe', '-c:v', 'mjpeg', 'pipe:1'],
        { timeoutMs: 20_000 + warmup * 1000, maxOutput: 8 << 20, signal: tools?.signal });
      if (r.code !== 0 || r.stdout.length < 100) throw failure(r, `La webcam «${cam.name}» non ha scattato`);
      const jpeg = r.stdout;
      const out = { size: jpeg.length, camera: cam.name };
      if (at) { await files.write(user, at, jpeg); out.path = at.shown; }
      if (a.image !== false) {
        if (jpeg.length > LIMITS.photoBytes) throw oops(`La foto è troppo grande da mandare al programma (${Math.round(jpeg.length / 1024)} KB, al massimo ${LIMITS.photoBytes >> 10} KB): abbassa qualità o dimensioni`);
        out.image = dataUrl(jpeg);
      }
      return out;
    },

    async 'hw.webcamStart'(user, args, tools) {
      need(user, 'camera');
      const a = argsOf(args);
      const fps = num(a.fps, 0.1, LIMITS.fps, 'Fotogrammi al secondo', 2);
      const width = int(a.width, 16, LIMITS.width, 'Larghezza', 320), height = int(a.height, 16, LIMITS.height, 'Altezza', 240);
      const quality = int(a.quality, 1, 100, 'Qualità', 70);
      const ff = await ffmpeg();
      const cam = await pickCamera(a.camera);
      const h = handles.create(user, tools, { cls: 'camera', kind: 'frames', resource: `camera:${cam.id}`, label: cam.name, maxItems: LIMITS.framesQueued, maxBytes: LIMITS.framesQueued * LIMITS.frameBytes * 2 });
      const child = ffmpegChild(ff, ['-hide_banner', '-loglevel', 'error', ...inputArgs({ camera: cam }), '-vf', `fps=${fps},${scaleOf(width, height)}`, '-q:v', String(qOf(quality)), '-f', 'image2pipe', '-c:v', 'mjpeg', 'pipe:1']);
      const split = new JpegSplitter();
      child.stdout.on('data', chunk => {
        for (const f of split.push(chunk)) {
          if (f.length > LIMITS.frameBytes) { h.dropped++; continue; }
          const url = dataUrl(f);
          handles.push(h, { image: url, size: f.length }, url.length);
        }
      });
      child.on('close', code => handles.close(h.id, h.closed ? null : `La webcam «${cam.name}» si è fermata${lastError(child) ? `: ${lastError(child)}` : ` (codice ${code})`}`).catch(() => {}));
      child.on('error', err => handles.close(h.id, `ffmpeg non parte: ${err.message}`).catch(() => {}));
      h.closeFn = () => stopChild(child, { gently: quit, graceMs: 2000 });
      return { handle: h.id, camera: cam.name };
    },

    async 'hw.recordStart'(user, args, tools) {
      const a = argsOf(args);
      const kind = a.kind === 'video' ? 'video' : 'audio';
      need(user, kind === 'video' ? 'camera' : 'audio');
      if (kind === 'video' && a.mic) need(user, 'audio');
      const seconds = num(a.maxSeconds, 1, LIMITS.recordSeconds, 'Durata massima (secondi)', 60);
      const at = await files.where(user, a.path);
      const ext = (at.rest.at(-1) ?? '').split('.').pop().toLowerCase();
      const allowed = kind === 'video' ? VIDEO_EXT : AUDIO_EXT;
      if (!allowed.includes(ext)) throw oops(`Il file della registrazione deve finire in ${allowed.map(e => `.${e}`).join(', ')}: «${at.shown}» no`);
      await files.canWrite(user, at);
      const ff = await ffmpeg();
      const cam = kind === 'video' ? await pickCamera(a.camera) : null;
      const mic = kind === 'audio' || a.mic ? await pickMic(kind === 'audio' ? a.mic ?? a.device : a.mic) : null;
      const codec = await codecArgs(ff, ext, !!mic);
      const h = handles.create(user, tools, { cls: kind === 'video' ? 'camera' : 'audio', kind: 'record', resource: cam ? `camera:${cam.id}` : null, label: cam ? cam.name : mic.name, maxItems: 10 });
      const dir = await tempDir();
      const file = join(dir, `registrazione.${ext}`);
      const extra = cam ? ['-vf', scaleOf(int(a.width, 16, LIMITS.width, 'Larghezza', 1280), int(a.height, 16, LIMITS.height, 'Altezza', 720))] : [];
      const child = ffmpegChild(ff, ['-hide_banner', '-loglevel', 'error', '-y', ...inputArgs({ camera: cam, mic }), '-t', String(seconds), ...extra, ...codec, '-fs', String(LIMITS.recordBytes), file]);
      const started = Date.now();
      let finishing = null;
      const finish = () => (finishing ??= (async () => {
        await stopChild(child, { gently: quit, graceMs: 6000 });
        try {
          const size = (await stat(file).catch(() => null))?.size ?? 0;
          if (!size) throw oops(`La registrazione non è riuscita${lastError(child) ? `: ${lastError(child)}` : ''}`);
          await files.writeFrom(user, at, createReadStream(file), size);
          const result = { saved: at.shown, size, seconds: Math.round((Date.now() - started) / 100) / 10 };
          handles.push(h, result, 128);
          return result;
        } catch (err) {
          handles.push(h, { error: err.message });
          throw err;
        } finally {
          await cleanTemp(dir);
          handles.close(h.id, null).catch(() => {});
        }
      })());
      child.on('close', () => { finish().catch(() => {}); });
      child.on('error', () => { finish().catch(() => {}); });
      h.data.finish = finish;
      // Stopped by the program's end or hw.close: the file is still saved
      h.closeFn = () => finish().catch(() => {});
      return { handle: h.id, path: at.shown, maxSeconds: seconds };
    },

    async 'hw.recordStop'(user, args, tools) {
      const a = argsOf(args);
      const h = handles.get(user, tools, a.handle, ['record']);
      need(user, h.cls);
      return await h.data.finish();
    },

    async 'hw.micStart'(user, args, tools) {
      need(user, 'audio');
      const a = argsOf(args);
      const hz = num(a.hz, 0.5, LIMITS.levelHz, 'Misure al secondo', 5);
      const ff = await ffmpeg();
      const mic = await pickMic(a.mic);
      const h = handles.create(user, tools, { cls: 'audio', kind: 'level', label: mic.name, maxItems: 50 });
      const n = Math.max(160, Math.round(16000 / hz));
      const child = ffmpegChild(ff, ['-hide_banner', '-loglevel', 'error', '-nostats', ...inputArgs({ mic }),
        '-af', `aresample=16000,asetnsamples=n=${n}:p=0,astats=metadata=1:reset=1,ametadata=mode=print:file=-`, '-f', 'null', '-']);
      const levels = new LevelParser();
      child.stdout.on('data', d => {
        for (const l of levels.feed(String(d))) handles.push(h, { db: l.rms, peak: l.peak, at: Date.now() }, 48);
      });
      child.on('close', code => handles.close(h.id, h.closed ? null : `Il microfono «${mic.name}» si è fermato${lastError(child) ? `: ${lastError(child)}` : ` (codice ${code})`}`).catch(() => {}));
      h.closeFn = () => stopChild(child, { gently: quit, graceMs: 2000 });
      return { handle: h.id, mic: mic.name };
    },
  };
}
