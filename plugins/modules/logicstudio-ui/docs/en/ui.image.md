# Image

`ui.image` · Text and values · [Standard UI components](logicstudio-ui) · version 1

Shows an image taken from the project folder (a logo, the diagram of a plant, a photo that changes according to the state of the program) or an image made by the program, such as the webcam photos and frames of the [Hardware](logicstudio-hardware) blocks.

## Properties

| Property | Values | Default | Description |
|---|---|---|---|
| **Image** | a file in the **risorse** (resources) folder of the project, or «—» | — (none) | The image shown when opened. The list shows all the files under **risorse**, also in subfolders. |
| **Fit** | whole image, fill the space | whole image | How the image fits into a space of different proportions: **whole image** shows it entire (with empty bands), **fill the space** crops it. See below: today it is rarely noticeable. |
| **Description** | text (translatable) | empty | The alternative text, read by screen readers in place of the image. |

## Ports of its object in the schema

### Inputs

| Port | Type | Description |
|---|---|---|
| **source** (`source`) | text | The path of another image of the project, for example `risorse/rosso.png`, or an image as a data URL (`data:image/jpeg;base64,…`, see below). An empty text removes the image. |
| **enabled** (`enabled`) | yes/no | `false` makes it lighter. See [Standard UI components](logicstudio-ui). |
| **visible** (`visible`) | yes/no | `false` hides it. |

### Outputs

| Port | Type | Description |
|---|---|---|
| **Exception** (`error`) | object | Like every block; for this component nothing goes through it today. |

## How it works

The Image shows **only files of the project** or **images sent by the program**, never internet addresses or files outside the project folder.

- The path is **relative to the project folder** (the one with the `.lsproj` file): `risorse/logo.png`, `risorse/icone/ok.svg`. Slashes `/` at the beginning do not count. A path such as `~/Immagini/foto.jpg` or `https://…` shows nothing.
- With the **source** input you can also point to a file outside **risorse**, as long as it is inside the project folder.
- If the file is not there, is a folder or cannot be read, the image disappears (without errors).
- A file that is not an image (for example a `.txt`) is not shown.
- The formats the browser can show are fine: PNG, JPEG, GIF (also animated), SVG, WebP.

### Images sent by the program

The **source** input can also receive a whole image, written as a *data URL*: a text that starts with `data:image/jpeg;base64,` followed by the data of the image. It is what [takePhoto (snapshot)](hw.photo) and [Webcam frames (stream)](hw.webcamStream) send on their **image** output.

- Only PNG, JPEG, WebP and GIF are accepted (`data:image/png;base64,…`, `data:image/jpeg;base64,…`, `data:image/webp;base64,…`, `data:image/gif;base64,…`). Not SVG, and no other kind of `data:`.
- At most **2 MB** of text (about 1.5 MB of image): a bigger image is not shown.
- An invalid data URL (data with wrong characters, a type not accepted, too big) removes the image, without errors.
- A new image takes the place of the one before at once: with the webcam frames the Image becomes a video of a few frames a second. Images sent this way do not stay in the window's memory.

**Size.** The image is shown at its natural size, but never wider than the component: if it is bigger, it shrinks keeping its proportions. In a [Column](ui.column) with **stretch** alignment it can therefore take the whole width of the window; choose an image of the size you need.

**Fit** has an effect only when the image has a fixed width and height different from its proportions, and the IDE today does not let you give them (not even in a [Free area](ui.free)): in most windows the two choices look the same.

If the same program changes image often, every image shown stays in memory in the window until the window is closed.

## Examples

### 1. The logo at the top

```
Window «Orders»
└ Column (root)
  ├ Row  Alignment center
  │ ├ Image  image1  Image «risorse/logo.png»  Description «Logo of the Rossi company»
  │ └ Label  label1  Text «Orders of the day»  Size title
  └ Table    table1
```

The object is not needed: the image is always the same. Copy `logo.png` (small, for example 48 × 48 pixels) into the **risorse** folder of the project.

### 2. A traffic light

In the **risorse** folder put `verde.png`, `giallo.png` and `rosso.png` (green, yellow and red).

```
Window «Queue»
└ Column (root)
  ├ Image         image1   Image «risorse/verde.png»  Description «State of the queue»
  └ Number field  number1  Label «People in the queue»
```

```
[Number field: People in the queue] value ──▶ a [Compare (== != < >): a > b] if true  ──▶ send [Constant · Variable: risorse/rosso.png] value ──▶ source [Image: image1]
[Constant · Variable: 10] value ──▶ b                    if false ──▶ send [Constant · Variable: risorse/verde.png] value ──▶ source
```

With more than 10 people the image becomes red, otherwise green. The two [Constant · Variable](core.value) blocks are of type text and have the **send** input linked, so they send the path only after the comparison.

### 3. The webcam in a window

```
Window «Entrance»
└ Column (root)
  ├ Image   image1   Description «Webcam of the entrance»
  └ Switch  toggle1  Label «Webcam on»
```

```
[Switch: toggle1] value ──▶ on [Webcam frames (stream): 2 a second, 320 × 240] image ──▶ source [Image: image1]
```

When you turn the [Switch](ui.toggle) on, the window shows the webcam of the computer that runs lilOS, two frames a second; turning it off, the image stays on the last one. You need the permission for the webcam: see [Hardware](logicstudio-hardware).

## Accessibility

The **Description** is the alternative text of the image. Leave it empty for a purely decorative image (screen readers skip it); write it when the image says something. Beware: when the schema changes the image, the description stays the one in the properties. In the traffic light example, put next to the image a text that states the state in words.

## See also

- [Label](ui.label), [Lamp](ui.lamp)
- [takePhoto (snapshot)](hw.photo), [Webcam frames (stream)](hw.webcamStream), for the webcam images
- [Projects](ide/projects), for the **risorse** folder
- [Standard UI components](logicstudio-ui)
