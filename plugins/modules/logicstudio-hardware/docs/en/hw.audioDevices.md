# enumerateDevices (audio devices)

`hw.audioDevices` · Hardware · [Hardware](logicstudio-hardware) · version 1

Lists the microphones, the speakers and the voices of the speech synthesis of the computer where lilOS runs: the names to write in the other audio blocks.

## Inputs

| Port | Type | Description |
|---|---|---|
| **list** (`list`) | pulse | Reads the lists now and sends them. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **microphones** (`inputs`) | list | `{ id, name }` for each microphone. |
| **speakers** (`outputs`) | list | `{ name }` for each audio output. |
| **voices** (`voices`) | list | `{ name, lang }` for each voice, for example `{ "name": "Microsoft Elsa Desktop", "lang": "it-IT" }`. |
| **Exception** (`error`) | object | Missing permission; a list that cannot be read (for example the microphones without ffmpeg: the other lists arrive anyway). |

## How it works

| | Windows | Linux | macOS |
|---|---|---|---|
| Microphones | ffmpeg (DirectShow) | ffmpeg (PulseAudio, otherwise ALSA) | ffmpeg (AVFoundation) |
| Speakers | the audio cards of the system | PulseAudio (`pactl`) or ALSA (`aplay -l`) | `system_profiler` |
| Voices | the Windows voices (Settings → Time & language → Speech) | espeak-ng | `say` |

The speakers are only informative: sounds always go to the **default output** of the system. The microphones on Linux have an `id` like `pulse:alsa_input.pci-0000_00_1f.3.analog-stereo`; in the other blocks you can write the `id` or the name.

Without ffmpeg the list of microphones stays empty and the message with how to install it arrives on **Exception**; speakers and voices arrive anyway.

## Examples

### 1. The voices in a selection

```
[On start (main)] pulse ──▶ list [enumerateDevices (audio devices)] voices ──▶ value [Print (console.log)]
```

The console writes the installed voices, with the language: choose one for [speechSynthesis.speak (text to speech)](hw.speak).

### 2. A table of the microphones

```
[Button: Refresh] pressed ──▶ list [enumerateDevices (audio devices)] microphones ──▶ rows [Table: table1]
```

## Errors

The messages are in Italian, as users see them; the English meaning is in parentheses.

| Message | When |
|---|---|
| Non hai il permesso di usare l'audio (microfono, altoparlanti, voce): chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) ("You do not have permission to use audio (microphone, speakers, voice): ask an administrator (Control Panel → Logic Studio → Hardware)") | You do not have the permission for audio. |
| Manca ffmpeg: installalo sul computer dove gira lilOS (…), poi riavvia lilOS ("ffmpeg is missing: install it on the computer where lilOS runs (…), then restart lilOS") | Only the microphones are not listed. |

## See also

- [MediaRecorder audio (record audio)](hw.audioRecord), [Microphone level (dB)](hw.micLevel), [speechSynthesis.speak (text to speech)](hw.speak)
- [Hardware](logicstudio-hardware)
