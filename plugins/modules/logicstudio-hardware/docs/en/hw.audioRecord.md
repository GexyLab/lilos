# MediaRecorder audio (record audio)

`hw.audioRecord` · Hardware · [Hardware](logicstudio-hardware) · version 1

Records from the microphone of the computer where lilOS runs into a file of your home.

## Inputs

| Port | Type | Description |
|---|---|---|
| **start** (`start`) | pulse | Starts recording. |
| **stop** (`stop`) | pulse | Stops and saves the file. |
| **path** (`path`) | text | The file: it takes the place of **File**. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **file saved** (`saved`) | text | Where the recording was saved. |
| **size (bytes)** (`size`) | number | How big the file is. |
| **seconds** (`seconds`) | number | How long it lasted. |
| **recording** (`recording`) | yes/no | `true` when it starts, `false` when it ends. |
| **Exception** (`error`) | object | The microphone is not there, the format is not right, the file cannot be written… |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Microphone (name; empty: the default one)** (`mic`) | text | empty | The microphone, as given by [enumerateDevices (audio devices)](hw.audioDevices). |
| **File (.wav, .flac, .m4a, .mp3, .ogg; {now} = date and time)** (`path`) | text | `~/audio-{now}.wav` | The file, in your home. |
| **Length at most (seconds)** (`maxSeconds`) | from 1 to 1800 | 60 | The recording stops by itself after this time. |

## How it works

Like [MediaRecorder video (record video)](hw.videoRecord): the kernel records with **ffmpeg** in a temporary file of its own and, at the end (with **stop**, at the maximum length, when the block or the program stop), copies it **as you** into your home.

| File | Format |
|---|---|
| `.wav` | 16-bit PCM, uncompressed (big but it goes everywhere) |
| `.flac` | lossless, smaller |
| `.m4a` | AAC |
| `.mp3` | MP3, if ffmpeg can write it |
| `.ogg` | Opus or Vorbis, if ffmpeg can write them |

At most **30 minutes** and **500 MB**. The folder of the file must be there; a file that is already there is replaced. The microphone can be used together by several blocks (for example [Microphone level (dB)](hw.micLevel)) if the system allows it.

## Examples

### 1. A recorder

```
[Switch: toggle1] value ──▶ condition [If · Else] then ──▶ start [MediaRecorder audio (record audio): ~/note/{now}.m4a] file saved ──▶ text [Label: label1]
                                                  else ──▶ stop
```

### 2. Recording when there is noise

```
[Microphone level (dB): threshold -25] got loud ──▶ start [MediaRecorder audio (record audio): length at most 30 s, ~/rumori/{now}.wav]
```

When the level goes over the threshold a 30-second recording starts.

## Errors

The messages are in Italian, as users see them; the English meaning is in parentheses.

| Message | When |
|---|---|
| Non hai il permesso di usare l'audio (microfono, altoparlanti, voce): chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) ("You do not have permission to use audio (microphone, speakers, voice): ask an administrator (Control Panel → Logic Studio → Hardware)") | You do not have the permission for audio. |
| Manca ffmpeg: installalo sul computer dove gira lilOS (…), poi riavvia lilOS ("ffmpeg is missing: install it on the computer where lilOS runs (…), then restart lilOS") | ffmpeg is not there. |
| Sta già registrando: prima fermalo ("It is already recording: stop it first") | **start** during a recording. |
| Il file della registrazione deve finire in .wav, .flac, .m4a, .mp3, .ogg: «~/a.aac» no ("The recording file must end in .wav, .flac, .m4a, .mp3, .ogg: «~/a.aac» does not") | Extension not allowed. |
| Questo ffmpeg non sa scrivere MP3: registra in .wav, .flac o .m4a ("This ffmpeg cannot write MP3: record in .wav, .flac or .m4a") | ffmpeg without the MP3 encoder (the same for OGG). |
| Non c'è nessun microfono ("There is no microphone") | **Microphone** is empty and there is none. |
| Il microfono «USB Mic» non c'è (microfoni presenti: …) ("The microphone «USB Mic» is not there (microphones present: …)") | The name is not in the list. |
| La registrazione non è riuscita: … ("The recording did not succeed: …") | ffmpeg wrote nothing (microphone unplugged or used by another application…). |
| La cartella «~/note» non esiste ("The folder «~/note» does not exist") | The folder of the file is not there. |
| Spazio finito: la tua home ha raggiunto la sua quota ("Out of space: your home has reached its quota") | The quota of your home is full. |

## See also

- [Microphone level (dB)](hw.micLevel), [MediaRecorder video (record video)](hw.videoRecord), [play() (play a sound)](hw.play)
- [Hardware](logicstudio-hardware)
