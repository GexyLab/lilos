# takePhoto (snapshot)

`hw.photo` · Hardware · [Hardware](logicstudio-hardware) · version 1

Takes a photo with a webcam of the computer where lilOS runs. The photo (JPEG) can go to a file of your home, to an output as an image to show in a window with an [Image](ui.image), or both.

## Inputs

| Port | Type | Description |
|---|---|---|
| **take** (`take`) | pulse | Takes the photo. |
| **path** (`path`) | text | The file where to save it: it takes the place of **File** and makes it save even without **Save it to a file**. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **image (data URL)** (`image`) | text | The photo as `data:image/jpeg;base64,…`, for the **source** input of an [Image](ui.image). |
| **file saved** (`path`) | text | Where it was saved, for example `~/foto-2026-11-11_14-30-05.jpg`. |
| **taken** (`taken`) | pulse | The photo is ready. |
| **Exception** (`error`) | object | The webcam is not there, is used by another program, the file cannot be written… |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Webcam (name; empty: the first one)** (`camera`) | text | empty | The webcam, as given by [enumerateDevices (webcams)](hw.webcamList). |
| **Save it to a file** (`save`) | yes/no | no | Saves the photo in **File**. |
| **File (.jpg; {now} = date and time)** (`path`) | text | `~/foto-{now}.jpg` | The file, in your home; it must end in `.jpg` or `.jpeg`. |
| **Send the image to «image»** (`sendImage`) | yes/no | yes | Turn it off if the photo goes only to the file. |
| **Width at most (px)** (`width`) | from 16 to 1280 | 640 | The photo is shrunk to fit, keeping its proportions. |
| **Height at most (px)** (`height`) | from 16 to 720 | 480 | |
| **JPEG quality (1-100)** (`quality`) | from 1 to 100 | 85 | Higher: a nicer and heavier photo. |
| **Warm-up (seconds)** (`warmup`) | from 0 to 5 | 1 | The time the webcam has to adjust light and colors before the shot: with 0 the photo is often dark. |

## How it works

The kernel takes the shot with **ffmpeg** (which must be installed: see [Hardware](logicstudio-hardware)), keeps the last image after the **Warm-up** and saves it **as you** in your home, with the file rules of the [lilOS blocks](logicstudio-lilos): the folder must be there, the file is replaced if it is already there, the space counts in your quota. `{now}` in the name becomes the date and time, so each photo has its own file.

A photo takes about the warm-up plus one or two seconds. While another program uses the webcam (for example with [Webcam frames (stream)](hw.webcamStream)), the photo cannot be taken.

The image sent on **image (data URL)** is at most 1 MB: with the default settings it is usually between 30 and 100 KB. An [Image](ui.image) shows images up to 2 MB.

## Examples

### 1. A photo with a button

```
[Button: Take] pressed ──▶ take [takePhoto (snapshot)] image (data URL) ──▶ source [Image: image1]
```

The window shows the photo just taken.

### 2. A photo every hour, saved

```
[Interval (setInterval): 3600 s] pulse ──▶ take [takePhoto (snapshot): Save it to a file, ~/serra/foto-{now}.jpg, no image] file saved ──▶ value [Print (console.log)]
```

Every hour a photo in the folder `~/serra` (which must exist), with the date and time in the name.

## Errors

The messages are in Italian, as users see them; the English meaning is in parentheses.

| Message | When |
|---|---|
| Non hai il permesso di usare la webcam: chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) ("You do not have permission to use the webcam: ask an administrator (Control Panel → Logic Studio → Hardware)") | You do not have the permission for the webcam. |
| Manca ffmpeg: installalo sul computer dove gira lilOS (…), poi riavvia lilOS ("ffmpeg is missing: install it on the computer where lilOS runs (…), then restart lilOS") | ffmpeg is not there. |
| Non c'è nessuna webcam ("There is no webcam") | **Webcam** is empty and there is none. |
| La webcam «Logitech» non c'è (webcam presenti: Integrated Camera) ("The webcam «Logitech» is not there (webcams present: Integrated Camera)") | The name is not in the list. |
| «Integrated Camera» è già in uso nel programma «Ingresso»: chiudilo prima di aprirlo di nuovo ("«Integrated Camera» is already in use in the program «Ingresso»: close it before opening it again") | The webcam is used by another program of yours (or by another block). |
| «Integrated Camera» è già in uso da un altro programma ("«Integrated Camera» is already in use by another program") | The program of another user uses it. |
| La webcam «Integrated Camera» non ha scattato: … ("The webcam «Integrated Camera» did not take the shot: …") | ffmpeg did not succeed (the webcam is used by another application of the computer, gives no images…). |
| La foto si salva in un file .jpg: «~/foto.png» no ("The photo is saved in a .jpg file: «~/foto.png» is not") | The **File** does not end in `.jpg` or `.jpeg`. |
| La cartella «~/serra» non esiste ("The folder «~/serra» does not exist") | The folder of the file is not there. |
| La foto è troppo grande da mandare al programma (… KB, al massimo 1024 KB): abbassa qualità o dimensioni ("The photo is too big to send to the program (… KB, at most 1024 KB): lower quality or size") | The image is over 1 MB. |
| Puoi usare solo i file della tua home (~/… oppure /home/anna/…): … ("You can only use the files of your home (~/… or /home/anna/…): …") | The path errors are those of [writeFile](lilos.fileWrite). |
| Spazio finito: la tua home ha raggiunto la sua quota ("Out of space: your home has reached its quota") | The quota of your home is full. |

## See also

- [enumerateDevices (webcams)](hw.webcamList), [Webcam frames (stream)](hw.webcamStream), [MediaRecorder video (record video)](hw.videoRecord)
- [Image](ui.image)
- [Hardware](logicstudio-hardware)
