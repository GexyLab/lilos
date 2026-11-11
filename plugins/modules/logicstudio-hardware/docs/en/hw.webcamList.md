# enumerateDevices (webcams)

`hw.webcamList` · Hardware · [Hardware](logicstudio-hardware) · version 1

Lists the webcams of the computer where lilOS runs, with the name to write in the other webcam blocks.

## Inputs

| Port | Type | Description |
|---|---|---|
| **list** (`list`) | pulse | Reads the list now and sends it. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **webcams** (`cameras`) | list | One webcam per item: `{ id, name }`. |
| **names** (`names`) | list | Only the names, for a [Selection](ui.select). |
| **count** (`count`) | number | How many webcams there are. |
| **Exception** (`error`) | object | Missing permission, missing ffmpeg. |

## How it works

| System | Where the list comes from | `id` |
|---|---|---|
| Windows | ffmpeg (DirectShow) | the name, for example `Integrated Camera` |
| Linux | `/sys/class/video4linux` (ffmpeg is not needed for the list) | the device, for example `/dev/video0` |
| macOS | ffmpeg (AVFoundation) | the number, for example `0` |

In the other blocks you can write the name or the `id`. Screens (on macOS «Capture screen») are not webcams and do not appear. On Linux only one device per webcam appears (the one that makes the images).

The "virtual webcams" of programs (OBS, for example) appear if the system shows them as webcams.

## Examples

### 1. Choosing the webcam

```
[On start (main)] pulse ──▶ list [enumerateDevices (webcams)] names ──▶ options [Selection: select1]
```

### 2. Is there a webcam?

```
[Button: Check] pressed ──▶ list [enumerateDevices (webcams)] count ──▶ value [Value: value1]
```

## Errors

The messages are in Italian, as users see them; the English meaning is in parentheses.

| Message | When |
|---|---|
| Non hai il permesso di usare la webcam: chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) ("You do not have permission to use the webcam: ask an administrator (Control Panel → Logic Studio → Hardware)") | You do not have the permission for the webcam. |
| Manca ffmpeg: installalo sul computer dove gira lilOS (Windows: winget install ffmpeg; Debian, Ubuntu, Raspberry Pi: sudo apt install ffmpeg; macOS: brew install ffmpeg), poi riavvia lilOS ("ffmpeg is missing: install it on the computer where lilOS runs (Windows: winget install ffmpeg; Debian, Ubuntu, Raspberry Pi: sudo apt install ffmpeg; macOS: brew install ffmpeg), then restart lilOS") | Windows and macOS without ffmpeg. |
| ffmpeg non ha finito in tempo (15 s) ("ffmpeg did not finish in time (15 s)") | ffmpeg did not answer. |

## See also

- [takePhoto (snapshot)](hw.photo), [Webcam frames (stream)](hw.webcamStream), [MediaRecorder video (record video)](hw.videoRecord)
- [Hardware](logicstudio-hardware)
