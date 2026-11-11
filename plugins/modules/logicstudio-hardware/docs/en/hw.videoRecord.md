# MediaRecorder video (record video)

`hw.videoRecord` · Hardware · [Hardware](logicstudio-hardware) · version 1

Records a video with a webcam of the computer where lilOS runs, also with the audio of a microphone, in a file of your home.

## Inputs

| Port | Type | Description |
|---|---|---|
| **start** (`start`) | pulse | Starts recording. |
| **stop** (`stop`) | pulse | Stops and saves the file. |
| **path** (`path`) | text | The file: it takes the place of **File**. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **file saved** (`saved`) | text | Where the video was saved, for example `~/video-2026-11-11_14-30-05.mp4`. |
| **size (bytes)** (`size`) | number | How big the file is. |
| **seconds** (`seconds`) | number | How long the recording lasted. |
| **recording** (`recording`) | yes/no | `true` when it starts, `false` when it ends. |
| **Exception** (`error`) | object | The webcam is not there, is in use, the file cannot be written, the recording does not succeed… |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Webcam (name; empty: the first one)** (`camera`) | text | empty | The webcam. |
| **Sound from (microphone name; empty: no sound)** (`mic`) | text | empty | The microphone, as given by [enumerateDevices (audio devices)](hw.audioDevices). The permission for audio is needed too. |
| **File (.mp4, .mkv, .avi; {now} = date and time)** (`path`) | text | `~/video-{now}.mp4` | The file, in your home. |
| **Length at most (seconds)** (`maxSeconds`) | from 1 to 1800 | 60 | The recording stops by itself after this time. |
| **Width at most (px)** (`width`) | from 16 to 1280 | 1280 | |
| **Height at most (px)** (`height`) | from 16 to 720 | 720 | |

## How it works

The kernel records with **ffmpeg** in a temporary file of its own; when the recording ends (with **stop**, at the **Length at most**, when the block or the program stop) it copies it **as you** into your home and sends **file saved**, **size (bytes)**, **seconds** and **recording** `false`. If the program stops, the video is saved anyway.

| File | Video | Audio |
|---|---|---|
| `.mp4`, `.mkv` | H.264 (if ffmpeg has it, otherwise MPEG-4) | AAC |
| `.avi` | MJPEG | PCM |

- At most **30 minutes** and **500 MB**: beyond that, the recording stops by itself.
- The folder of the file must be there; a file that is already there is replaced; the space counts in your quota.
- While it records, the webcam cannot be used by other blocks or programs.
- Saving a long video can take a few seconds after **stop**.

## Examples

### 1. Recording with two buttons

```
[Button: Record] pressed ──▶ start [MediaRecorder video (record video): ~/video/{now}.mp4] file saved ──▶ text [Label: label1]
[Button: Stop]   pressed ──▶ stop                                                          recording  ──▶ on [Lamp: lamp1]
```

### 2. Ten seconds when a sensor triggers

```
[GPIO (gpioget · gpioset): rising edges, line 17] rising edge ──▶ start [MediaRecorder video (record video): length at most 10 s, ~/allarmi/{now}.mp4]
```

Every time the sensor triggers, a 10-second video in the folder `~/allarmi`. If it triggers while it is already recording, the block sends on **Exception** «Sta già registrando: prima fermalo» ("It is already recording: stop it first") and the recording in progress continues.

## Errors

The messages are in Italian, as users see them; the English meaning is in parentheses.

| Message | When |
|---|---|
| Non hai il permesso di usare la webcam: chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) ("You do not have permission to use the webcam: ask an administrator (Control Panel → Logic Studio → Hardware)") | You do not have the permission for the webcam (with audio the one for audio is needed too). |
| Manca ffmpeg: installalo sul computer dove gira lilOS (…), poi riavvia lilOS ("ffmpeg is missing: install it on the computer where lilOS runs (…), then restart lilOS") | ffmpeg is not there. |
| Sta già registrando: prima fermalo ("It is already recording: stop it first") | **start** during a recording. |
| Il file della registrazione deve finire in .mp4, .mkv, .avi: «~/video.mov» no ("The recording file must end in .mp4, .mkv, .avi: «~/video.mov» does not") | Extension not allowed. |
| La webcam «Logitech» non c'è (webcam presenti: Integrated Camera) ("The webcam «Logitech» is not there (webcams present: Integrated Camera)") | The name is not in the list. |
| Il microfono «USB Mic» non c'è (microfoni presenti: …) ("The microphone «USB Mic» is not there (microphones present: …)") | The microphone is not in the list. |
| «Integrated Camera» è già in uso da un altro programma ("«Integrated Camera» is already in use by another program") | The webcam is used by another program. |
| La registrazione non è riuscita: … ("The recording did not succeed: …") | ffmpeg wrote nothing (the webcam gives no images, is used by another application…). |
| La cartella «~/video» non esiste ("The folder «~/video» does not exist") | The folder of the file is not there. |
| Spazio finito: la tua home ha raggiunto la sua quota ("Out of space: your home has reached its quota") | The quota of your home is full. |
| Durata massima (secondi) non valido: … (da 1 a 1800) ("Length at most (seconds) not valid: … (from 1 to 1800)") | The number is out of the limits. |

## See also

- [MediaRecorder audio (record audio)](hw.audioRecord), [takePhoto (snapshot)](hw.photo), [Webcam frames (stream)](hw.webcamStream)
- [Hardware](logicstudio-hardware)
