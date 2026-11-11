import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { argsOf, int, num, oops, short } from './common.js';
import { IS_LINUX, IS_MAC, IS_WIN, cleanTemp, powershell, run, tempDir, which } from './tools.js';

/**
 * Sounds of the computer that runs lilOS, with the system's tools (always the default output):
 *
 *   play     Windows: SoundPlayer (.wav) or MediaPlayer of WPF (.mp3, .wma, .m4a); Linux: paplay or
 *            aplay (.wav, .flac, .ogg), ffplay for the others; macOS: afplay
 *   tone     a WAV made here (sine, fades of 5 ms), played as above
 *   speak    Windows: System.Speech; Linux: espeak-ng (or espeak, spd-say); macOS: say. The text
 *            goes in an environment variable or on stdin, never on a command line
 *   volume   Windows: Core Audio (IAudioEndpointVolume, through Add-Type); Linux: pactl or amixer;
 *            macOS: osascript with numbers only
 *
 * The file a block plays is read from the user's home AS THE USER into a private temporary file.
 * At most MAX_BUSY sounds at a time for each user (a block in a loop must not fill the computer
 * with players).
 */

const PLAY_EXT = ['wav', 'mp3', 'ogg', 'flac', 'm4a', 'aiff', 'wma'];
const MAX_PLAY_FILE = 50 << 20;
const MAX_SECONDS = 600;
const MAX_TEXT = 2000;
const MAX_BUSY = 2;

/** A WAV (PCM 16 bit mono): a sine of `hz` for `seconds`, volume 0…1, 5 ms fade in and out. */
export function toneWav(hz, seconds, volume = 0.5, rate = 44100) {
  const n = Math.max(1, Math.round(seconds * rate));
  const data = Buffer.alloc(n * 2);
  const fade = Math.min(Math.round(rate * 0.005), Math.floor(n / 2));
  const amp = Math.max(0, Math.min(1, volume)) * 32767;
  for (let i = 0; i < n; i++) {
    const env = fade ? Math.min(1, i / fade, (n - 1 - i) / fade) : 1;
    data.writeInt16LE(Math.round(Math.sin((2 * Math.PI * hz * i) / rate) * amp * env), i * 2);
  }
  const head = Buffer.alloc(44);
  head.write('RIFF', 0, 'ascii'); head.writeUInt32LE(36 + data.length, 4); head.write('WAVE', 8, 'ascii');
  head.write('fmt ', 12, 'ascii'); head.writeUInt32LE(16, 16); head.writeUInt16LE(1, 20); head.writeUInt16LE(1, 22);
  head.writeUInt32LE(rate, 24); head.writeUInt32LE(rate * 2, 28); head.writeUInt16LE(2, 32); head.writeUInt16LE(16, 34);
  head.write('data', 36, 'ascii'); head.writeUInt32LE(data.length, 40);
  return Buffer.concat([head, data]);
}

const PS_PLAY_WAV = `$p = New-Object System.Media.SoundPlayer $env:LS_FILE; $p.PlaySync()`;
const PS_PLAY_MEDIA = `
Add-Type -AssemblyName PresentationCore
$p = New-Object System.Windows.Media.MediaPlayer
$p.Open([Uri]::new($env:LS_FILE))
$limit = [double]$env:LS_MAX
$t = 0
while (-not $p.NaturalDuration.HasTimeSpan -and $t -lt 50) { Start-Sleep -Milliseconds 100; $t++ }
$p.Play()
$len = if ($p.NaturalDuration.HasTimeSpan) { [Math]::Min($p.NaturalDuration.TimeSpan.TotalSeconds, $limit) } else { $limit }
Start-Sleep -Milliseconds ([int](($len + 0.3) * 1000))
$p.Stop(); $p.Close()`;
const PS_SPEAK = `
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
if ($env:LS_VOICE) { $s.SelectVoice($env:LS_VOICE) }
$s.Rate = [int]$env:LS_RATE
$s.Volume = [int]$env:LS_VOLUME
$s.Speak($env:LS_TEXT)`;
const PS_VOICES = `
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s.GetInstalledVoices() | Where-Object { $_.Enabled } | ForEach-Object { $_.VoiceInfo.Name + '|' + $_.VoiceInfo.Culture.Name }`;
// Core Audio: the default output's volume (0…100) and mute, read and set
const PS_VOLUME = `
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
  int f(); int g(); int h(); int i();
  int SetMasterVolumeLevelScalar(float fLevel, Guid pguidEventContext);
  int j();
  int GetMasterVolumeLevelScalar(out float pfLevel);
  int k(); int l(); int m(); int n();
  int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, Guid pguidEventContext);
  int GetMute(out bool pbMute);
}
[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice { int Activate(ref Guid id, int clsCtx, int activationParams, out IAudioEndpointVolume aev); }
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator { int f(); int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice endpoint); }
[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumeratorComObject { }
public class LilosVolume {
  static IAudioEndpointVolume Vol() {
    var enumerator = new MMDeviceEnumeratorComObject() as IMMDeviceEnumerator;
    IMMDevice dev = null;
    Marshal.ThrowExceptionForHR(enumerator.GetDefaultAudioEndpoint(0, 1, out dev));
    IAudioEndpointVolume epv = null;
    var epvid = typeof(IAudioEndpointVolume).GUID;
    Marshal.ThrowExceptionForHR(dev.Activate(ref epvid, 23, 0, out epv));
    return epv;
  }
  public static float Get() { float v = -1; Marshal.ThrowExceptionForHR(Vol().GetMasterVolumeLevelScalar(out v)); return v; }
  public static void Set(float v) { Marshal.ThrowExceptionForHR(Vol().SetMasterVolumeLevelScalar(v, Guid.Empty)); }
  public static bool Muted() { bool m; Marshal.ThrowExceptionForHR(Vol().GetMute(out m)); return m; }
  public static void Mute(bool m) { Marshal.ThrowExceptionForHR(Vol().SetMute(m, Guid.Empty)); }
}
'@
if ($env:LS_SET -match '^[0-9]{1,3}$') { [LilosVolume]::Set([float]([int]$env:LS_SET) / 100) }
if ($env:LS_MUTE -eq '1') { [LilosVolume]::Mute($true) } elseif ($env:LS_MUTE -eq '0') { [LilosVolume]::Mute($false) }
'' + [Math]::Round([LilosVolume]::Get() * 100) + '|' + [LilosVolume]::Muted()`;

/** «Volume: front-left: 32768 / 50% / …» (pactl) or «[50%] [on]» (amixer) → { volume, muted }. */
export function parseVolume(text) {
  const pct = /(\d{1,3})%/.exec(String(text));
  const muted = /\[off\]|Mute:\s*yes/i.test(String(text));
  return { volume: pct ? Math.min(150, Number(pct[1])) : null, muted };
}

export function audioActions({ need, files }) {
  const busy = new Map();   // user id → sounds playing

  async function guard(user, fn) {
    const n = busy.get(user.id) ?? 0;
    if (n >= MAX_BUSY) throw oops(`Troppi suoni insieme: al massimo ${MAX_BUSY} alla volta`);
    busy.set(user.id, n + 1);
    try { return await fn(); } finally {
      const left = (busy.get(user.id) ?? 1) - 1;
      if (left > 0) busy.set(user.id, left); else busy.delete(user.id);
    }
  }

  /** Plays a sound file of the kernel (a temporary one) and waits for its end. */
  async function playFile(file, ext, maxSeconds, signal) {
    const timeoutMs = (maxSeconds + 10) * 1000;
    if (IS_WIN) {
      const r = ext === 'wav'
        ? await powershell(PS_PLAY_WAV, { LS_FILE: file }, { timeoutMs, signal })
        : await powershell(PS_PLAY_MEDIA, { LS_FILE: file, LS_MAX: String(maxSeconds) }, { timeoutMs, signal });
      if (r.code !== 0) throw oops(`Il suono non si sente: ${r.stderr.split('\n').find(l => l.trim())?.trim().slice(0, 200) ?? `codice ${r.code}`}`);
      return;
    }
    let tool = null, args = [];
    if (IS_MAC) { tool = await which('afplay'); args = ['-t', String(maxSeconds), file]; }
    else if (['wav', 'flac', 'ogg', 'aiff'].includes(ext) && (tool = await which('paplay'))) args = [file];
    else if (ext === 'wav' && (tool = await which('aplay'))) args = ['-q', file];
    else if ((tool = await which('ffplay'))) args = ['-nodisp', '-autoexit', '-loglevel', 'error', '-t', String(maxSeconds), file];
    if (!tool) throw oops(IS_LINUX ? 'Manca un programma per suonare: installa pulseaudio-utils (paplay) o alsa-utils (aplay); per .mp3 e .m4a ffmpeg (ffplay)' : 'Manca afplay');
    const r = await run(tool, args, { timeoutMs, signal });
    if (r.code !== 0) throw oops(`Il suono non si sente: ${r.stderr.trim().split('\n')[0]?.slice(0, 200) || `codice ${r.code}`}`);
  }

  async function voices() {
    if (IS_WIN) {
      const r = await powershell(PS_VOICES, {}, { timeoutMs: 20_000 });
      return r.stdout.toString().split(/\r?\n/).map(l => l.trim()).filter(Boolean).map(l => { const [name, lang] = l.split('|'); return { name, lang: lang ?? '' }; });
    }
    if (IS_MAC) {
      const say = await which('say');
      if (!say) return [];
      const r = await run(say, ['-v', '?'], { timeoutMs: 10_000 });
      return r.stdout.toString().split('\n').map(l => /^(.+?)\s{2,}([a-z]{2}[_-][A-Z]{2})/.exec(l)).filter(Boolean).map(m => ({ name: m[1].trim(), lang: m[2] }));
    }
    const es = (await which('espeak-ng')) ?? (await which('espeak'));
    if (!es) return [];
    const r = await run(es, ['--voices'], { timeoutMs: 10_000 });
    return r.stdout.toString().split('\n').slice(1).map(l => l.trim().split(/\s+/)).filter(p => p.length >= 4).map(p => ({ name: p[3], lang: p[1] }));
  }

  return {
    async 'hw.play'(user, args, tools) {
      need(user, 'audio');
      const a = argsOf(args);
      const at = await files.where(user, a.path);
      const ext = (at.rest.at(-1) ?? '').split('.').pop().toLowerCase();
      if (!PLAY_EXT.includes(ext) || !at.rest.length) throw oops(`Si suonano solo file ${PLAY_EXT.map(e => `.${e}`).join(', ')}: «${at.shown}» no`);
      if (IS_WIN && ['ogg', 'flac', 'aiff'].includes(ext)) throw oops(`Su Windows i file .${ext} non si suonano: usa .wav, .mp3 o .m4a`);
      const maxSeconds = num(a.maxSeconds, 1, MAX_SECONDS, 'Durata massima (secondi)', 120);
      const bytes = await files.read(user, at, MAX_PLAY_FILE);
      return guard(user, async () => {
        const dir = await tempDir();
        try {
          const file = join(dir, `suono.${ext}`);
          await writeFile(file, bytes, { mode: 0o600 });
          await playFile(file, ext, maxSeconds, tools?.signal);
        } finally { await cleanTemp(dir); }
        return { played: at.shown };
      });
    },

    async 'hw.tone'(user, args, tools) {
      need(user, 'audio');
      const a = argsOf(args);
      const hz = num(a.hz, 20, 20000, 'Frequenza (Hz)', 880);
      const seconds = num(a.seconds, 0.01, 10, 'Durata (secondi)', 0.2);
      const volume = num(a.volume, 0, 1, 'Volume (da 0 a 1)', 0.5);
      return guard(user, async () => {
        const dir = await tempDir();
        try {
          const file = join(dir, 'tono.wav');
          await writeFile(file, toneWav(hz, seconds, volume), { mode: 0o600 });
          await playFile(file, 'wav', Math.ceil(seconds) + 1, tools?.signal);
        } finally { await cleanTemp(dir); }
        return { hz, seconds };
      });
    },

    async 'hw.voices'(user) {
      need(user, 'audio');
      return { voices: await voices() };
    },

    async 'hw.speak'(user, args, tools) {
      need(user, 'audio');
      const a = argsOf(args);
      const text = String(a.text ?? '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ').trim();
      if (!text) throw oops('Non c\'è testo da leggere');
      if (text.length > MAX_TEXT) throw oops(`Testo troppo lungo da leggere: al massimo ${MAX_TEXT} caratteri`);
      const rate = int(a.rate, -10, 10, 'Velocità (da -10 a 10)', 0);
      const voiceName = short(a.voice, 100);
      let voice = '';
      if (voiceName) {
        const list = await voices();
        const v = list.find(x => x.name === voiceName) ?? list.find(x => x.lang.toLowerCase().replace('_', '-') === voiceName.toLowerCase().replace('_', '-'));
        if (!v) throw oops(`La voce «${voiceName}» non c'è (voci: ${list.map(x => x.name).slice(0, 20).join(', ') || 'nessuna'})`);
        voice = v.name;
      }
      const timeoutMs = 30_000 + text.length * 150;
      return guard(user, async () => {
        let r;
        if (IS_WIN) {
          r = await powershell(PS_SPEAK, { LS_TEXT: text, LS_VOICE: voice, LS_RATE: String(rate), LS_VOLUME: String(int(a.volume, 0, 100, 'Volume', 100)) }, { timeoutMs, signal: tools?.signal });
        } else if (IS_MAC) {
          const say = await which('say');
          if (!say) throw oops('Manca il comando say');
          r = await run(say, [...(voice ? ['-v', voice] : []), '-r', String(Math.round(175 * 1.08 ** rate))], { input: text, timeoutMs, signal: tools?.signal });
        } else {
          const es = (await which('espeak-ng')) ?? (await which('espeak'));
          if (es) r = await run(es, [...(voice ? ['-v', voice] : []), '-s', String(Math.round(175 * 1.08 ** rate))], { input: text, timeoutMs, signal: tools?.signal });
          else {
            const spd = await which('spd-say');
            if (!spd) throw oops('Manca un programma per la voce: installa espeak-ng (sudo apt install espeak-ng)');
            r = await run(spd, ['-w', '-r', String(rate * 10), ...(voice ? ['-l', voice] : []), '--', text], { timeoutMs, signal: tools?.signal });
          }
        }
        if (r.code !== 0) throw oops(`La voce non parte: ${r.stderr.split('\n').find(l => l.trim())?.trim().slice(0, 200) ?? `codice ${r.code}`}`);
        return { spoken: text.length };
      });
    },

    async 'hw.volume'(user, args, tools) {
      need(user, 'audio');
      const a = argsOf(args);
      const set = a.volume === undefined || a.volume === null || a.volume === '' ? null : int(a.volume, 0, 100, 'Volume (da 0 a 100)');
      const mute = a.mute === true ? true : a.mute === false ? false : null;
      const opts = { timeoutMs: 30_000, signal: tools?.signal };
      if (IS_WIN) {
        const r = await powershell(PS_VOLUME, { LS_SET: set === null ? 'none' : String(set), LS_MUTE: mute === null ? 'none' : mute ? '1' : '0' }, opts);
        const m = /(\d+)\|(True|False)/i.exec(r.stdout.toString());
        if (r.code !== 0 || !m) throw oops(`Il volume non si legge: ${r.stderr.split('\n').find(l => l.trim())?.trim().slice(0, 200) ?? 'nessun dispositivo di uscita?'}`);
        return { volume: Number(m[1]), muted: /true/i.test(m[2]) };
      }
      if (IS_MAC) {
        const osa = await which('osascript');
        if (!osa) throw oops('Manca osascript');
        if (set !== null) await run(osa, ['-e', `set volume output volume ${set}`], opts);
        if (mute !== null) await run(osa, ['-e', `set volume output muted ${mute ? 'true' : 'false'}`], opts);
        const r = await run(osa, ['-e', 'set s to get volume settings', '-e', '(output volume of s as text) & "|" & (output muted of s as text)'], opts);
        const m = /(\d+)\|(true|false)/i.exec(r.stdout.toString());
        if (!m) throw oops('Il volume non si legge');
        return { volume: Number(m[1]), muted: m[2] === 'true' };
      }
      const pactl = await which('pactl');
      if (pactl) {
        if (set !== null) await run(pactl, ['set-sink-volume', '@DEFAULT_SINK@', `${set}%`], opts);
        if (mute !== null) await run(pactl, ['set-sink-mute', '@DEFAULT_SINK@', mute ? '1' : '0'], opts);
        const v = await run(pactl, ['get-sink-volume', '@DEFAULT_SINK@'], opts);
        const mu = await run(pactl, ['get-sink-mute', '@DEFAULT_SINK@'], opts);
        if (v.code === 0) return { volume: parseVolume(v.stdout.toString()).volume, muted: parseVolume(mu.stdout.toString()).muted };
      }
      const amixer = await which('amixer');
      if (!amixer) throw oops('Manca un programma per il volume: installa pulseaudio-utils (pactl) o alsa-utils (amixer)');
      if (set !== null) await run(amixer, ['-M', 'set', 'Master', `${set}%`], opts);
      if (mute !== null) await run(amixer, ['set', 'Master', mute ? 'mute' : 'unmute'], opts);
      const r = await run(amixer, ['-M', 'get', 'Master'], opts);
      if (r.code !== 0) throw oops(`Il volume non si legge: ${r.stderr.trim().slice(0, 200)}`);
      return parseVolume(r.stdout.toString());
    },
  };
}
