# play() (play a sound)

`hw.play` · Hardware · [Hardware](logicstudio-hardware) · version 1

Plays an audio file of your home through the speakers of the computer where lilOS runs: a bell, an alarm, a recorded message.

## Inputs

| Port | Type | Description |
|---|---|---|
| **play** (`play`) | pulse | Plays the file. |
| **path** (`path`) | text | The file: it takes the place of **File**. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **ended** (`ended`) | pulse | The sound has ended. |
| **Exception** (`error`) | object | The file is not there, the format is not right, a program to play is missing… |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **File (.wav, .mp3…)** (`path`) | text | `~/suono.wav` | The file, in your home. |
| **Play at most (seconds)** (`maxSeconds`) | from 1 to 600 | 120 | A longer file is interrupted after this time. |

## How it works

The kernel reads the file **as you** from your home (at most 50 MB), copies it into a temporary file of its own and plays it with the programs of the system, on the **default audio output**. The block does not wait for the end to go on: **ended** arrives when the sound has ended.

| System | Formats | With what |
|---|---|---|
| Windows | `.wav`; `.mp3`, `.wma`, `.m4a` | the Windows player (PowerShell) |
| Linux | `.wav`, `.flac`, `.ogg`, `.aiff`; `.mp3`, `.m4a` with ffmpeg | `paplay` (PulseAudio) or `aplay` (ALSA); `ffplay` for the others |
| macOS | all | `afplay` |

At most **2 sounds at a time** per user (together with [Tone · Beep](hw.tone) and [speechSynthesis.speak (text to speech)](hw.speak)): a third one gives an error. A sound is not stopped halfway: it lasts at most **Play at most**.

## Examples

### 1. A bell

```
[Button: Ring] pressed ──▶ play [play() (play a sound): ~/suoni/campanello.wav] ended ──▶ value [Print (console.log)]
```

### 2. An alarm that repeats

```
[Compare (== != < >): temperature > 30] result ──▶ value [On change (edge)] becomes true ──▶ play [play() (play a sound): ~/suoni/allarme.mp3] ended ──▶ value [Delay (setTimeout): 5 s] value ──▶ play
```

The alarm sounds, and each time afterwards it waits 5 seconds and starts again (to stop it, put an [If · Else](core.if) before the delay).

## Errors

The messages are in Italian, as users see them; the English meaning is in parentheses.

| Message | When |
|---|---|
| Non hai il permesso di usare l'audio (microfono, altoparlanti, voce): chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) ("You do not have permission to use audio (microphone, speakers, voice): ask an administrator (Control Panel → Logic Studio → Hardware)") | You do not have the permission for audio. |
| Si suonano solo file .wav, .mp3, .ogg, .flac, .m4a, .aiff, .wma: «~/x.txt» no ("Only .wav, .mp3, .ogg, .flac, .m4a, .aiff, .wma files are played: «~/x.txt» is not") | The file is not an allowed sound. |
| Su Windows i file .ogg non si suonano: usa .wav, .mp3 o .m4a ("On Windows .ogg files are not played: use .wav, .mp3 or .m4a") | The same for `.flac` and `.aiff`. |
| Il file «~/suono.wav» non esiste ("The file «~/suono.wav» does not exist") | The file is not there. The other path errors are those of [readFile](lilos.fileRead). |
| Il file «~/x.wav» è troppo grande: 60 MB (si leggono al massimo 50 MB) ("The file «~/x.wav» is too big: 60 MB (at most 50 MB are read)") | Over 50 MB. |
| Troppi suoni insieme: al massimo 2 alla volta ("Too many sounds together: at most 2 at a time") | 2 sounds or voices of your programs are already playing. |
| Manca un programma per suonare: installa pulseaudio-utils (paplay) o alsa-utils (aplay); per .mp3 e .m4a ffmpeg (ffplay) ("A program to play is missing: install pulseaudio-utils (paplay) or alsa-utils (aplay); for .mp3 and .m4a ffmpeg (ffplay)") | Linux without programs to play. |
| Il suono non si sente: … ("The sound cannot be heard: …") | The program of the system gave an error (no audio output, damaged file…). |

## See also

- [Tone · Beep](hw.tone), [speechSynthesis.speak (text to speech)](hw.speak), [System volume (get · set · mute)](hw.volume)
- [Hardware](logicstudio-hardware)
