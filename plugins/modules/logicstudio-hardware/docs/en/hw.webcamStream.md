# Webcam frames (stream)

`hw.webcamStream` · Hardware · [Hardware](logicstudio-hardware) · version 1

Sends the images of a webcam of the computer where lilOS runs, a few a second, as images to show in an [Image](ui.image) of a window: a simple surveillance camera, the check of a 3D printer, who rings at the door.

## Inputs

| Port | Type | Description |
|---|---|---|
| **on** (`on`) | yes/no | `true` turns the webcam on, `false` turns it off. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **image (data URL)** (`image`) | text | Every frame as `data:image/jpeg;base64,…`. |
| **running** (`running`) | yes/no | `true` when the webcam turns on, `false` when it turns off (also by itself). |
| **Exception** (`error`) | object | The webcam is not there, is used by another program, stopped… |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Webcam (name; empty: the first one)** (`camera`) | text | empty | The webcam. |
| **Frames a second (at most 10)** (`fps`) | from 0.1 to 10 | 2 | How many images a second. 0.1 = one every 10 seconds. |
| **Width at most (px)** (`width`) | from 16 to 1280 | 320 | |
| **Height at most (px)** (`height`) | from 16 to 720 | 240 | |
| **JPEG quality (1-100)** (`quality`) | from 1 to 100 | 70 | |
| **Starts on its own** (`atStart`) | yes/no | no | Turns the webcam on when the program (or its group) starts. |

## How it works

The kernel keeps the webcam on with **ffmpeg** and sends the program the frames as JPEG images. It is not a video: it is a sequence of photos, good to see what is happening, not for a film. Every image goes from the kernel to the program and from the program to the window: keep them small.

- At most **10 frames a second** and **1280 × 720**.
- A frame bigger than 384 KB is skipped: lower quality or size.
- If the program or the window are not in time, only the last 3 frames are kept: you always see the most recent image.
- While it is on, the webcam cannot be used by other programs (nor by [takePhoto (snapshot)](hw.photo) or [MediaRecorder video (record video)](hw.videoRecord)).

The webcam turns off with `false` on **on**, when the block stops, or by itself if it is unplugged (with **running** `false` and a message on **Exception**).

## Examples

### 1. The webcam in a window

```
[Switch: toggle1] value ──▶ on [Webcam frames (stream): 2 a second, 320 × 240] image (data URL) ──▶ source [Image: image1]
                                                                                running ──▶ on [Lamp: lamp1]
```

### 2. Always on, one image every 5 seconds

```
[Webcam frames (stream): Starts on its own, 0.2 a second, 640 × 480] image (data URL) ──▶ source [Image: image1]
```

With 0.2 frames a second the window updates every 5 seconds and the computer works little.

## Errors

The messages are in Italian, as users see them; the English meaning is in parentheses.

| Message | When |
|---|---|
| Non hai il permesso di usare la webcam: chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) ("You do not have permission to use the webcam: ask an administrator (Control Panel → Logic Studio → Hardware)") | You do not have the permission for the webcam. |
| Manca ffmpeg: installalo sul computer dove gira lilOS (…), poi riavvia lilOS ("ffmpeg is missing: install it on the computer where lilOS runs (…), then restart lilOS") | ffmpeg is not there. |
| La webcam «Logitech» non c'è (webcam presenti: Integrated Camera) ("The webcam «Logitech» is not there (webcams present: Integrated Camera)") | The name is not in the list. |
| «Integrated Camera» è già in uso nel programma «Ingresso»: chiudilo prima di aprirlo di nuovo ("«Integrated Camera» is already in use in the program «Ingresso»: close it before opening it again") | Another program of yours uses it. |
| «Integrated Camera» è già in uso da un altro programma ("«Integrated Camera» is already in use by another program") | The program of another user uses it. |
| La webcam «Integrated Camera» si è fermata: … ("The webcam «Integrated Camera» stopped: …") | ffmpeg stopped (the webcam was unplugged, is used by another application…). |
| Fotogrammi al secondo non valido: … (da 0.1 a 10) ("Frames a second not valid: … (from 0.1 to 10)") | The same for size and quality. |

## See also

- [Image](ui.image)
- [takePhoto (snapshot)](hw.photo), [MediaRecorder video (record video)](hw.videoRecord)
- [Hardware](logicstudio-hardware)
