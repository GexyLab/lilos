# Read file

`lilos.fileRead` · lilOS · [lilOS blocks](logicstudio-lilos) · version 1

Reads a file in your home, whole, as text or as JSON, and sends its content.

## Inputs

| Port | Type | Description |
|---|---|---|
| **read** (`read`) | pulse | Any value that arrives here makes the file be read. |
| **path** (`path`) | text | The path of the file. If it has a value, it takes the place of the **Path** in the settings. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **content** (`content`) | any | The content of the file: a text, or (JSON format) the value read from the JSON. |
| **size (bytes)** (`size`) | number | How many bytes the file has. |
| **Exception** (`error`) | object | When the file cannot be read: it is not there, it is not a file, it is too big, the JSON is not valid... |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Path (~/… or /home/…)** (`path`) | text | `~/dati.txt` | The file to read, when the **path** input has no value. |
| **Format** (`mode`) | Text, JSON | Text | **Text**: the content comes out as it is, as text. **JSON**: the content is read as JSON and the value comes out (object, list, number...). |

## How it works

When a value arrives on **read**, the block takes the path (the one of the **path** input, if it has a non-empty value, otherwise the one in the settings), checks it and asks the kernel to read the file **as you**. Then it sends **content** first and **size (bytes)** after.

### The path

- `~` is your home; `~/dati.txt` is the file `dati.txt` in the home; `~/serra/log.txt` is inside the folder `serra`.
- You can also write the full path, `/home/<user>/…` (for example `/home/anna/dati.txt` if you are the user `anna`). The `/home/<user>` part is not case sensitive.
- The path must start with `~/` (or be `~`) or with `/`. A relative path like `dati.txt` is not good.
- Not allowed: `.` and `..`, the backslash `\`, names longer than 255 characters, more than 32 folder levels, paths longer than 4096 characters.
- Only **your** home: a path outside it, like `/home/marco/…` or `/Sistema/…`, is refused.
- The `~/.config` folder belongs to lilOS (your settings): programs never use it.
- Spaces at the start and end of the path are removed. An object or a list on the **path** input becomes JSON text (and so an invalid path).

### The content

- At most **5 MB** are read. A bigger file gives an error and is not read.
- The file is read as UTF-8 text. In the **Text** format it comes out as it is, new lines included (also the final new line, if there is one).
- In the **JSON** format the text is interpreted: `{"a": 1}` comes out as an object, `[1, 2]` as a list, `42` as a number, `"hello"` as a text. An empty file (or one with only spaces) gives `null`. An invalid JSON gives an error.
- **size (bytes)** is the size of the file in bytes, not the number of characters: an accented letter is worth 2 bytes.
- A JSON file that starts with the BOM mark (some Windows programs add it) is not recognised as valid JSON: save it in UTF-8 without BOM, or read it as Text.
- Files whose content is protected by an app (for example encrypted with FileCrypt) cannot be read.
- You see and read only what you can see: a file shared with you by others is not in your home, so it cannot be reached.
- For some files (for example in some network folders) lilOS does not know the size before reading them: the block reads them in pieces and stops with an error as soon as it goes over 5 MB.

See also [How a block works](ide/blocks).

## Examples

### 1. Reading a text at start

```
[At start] pulse ──▶ read [Read file: ~/note.txt] content ──▶ value [Write to console]
```

If `~/note.txt` contains `Buy milk`, the main console shows "Buy milk".

### 2. Reading a setting in JSON

The file `~/serra/impostazioni.json` contains:

```
{ "threshold": 30, "name": "North greenhouse" }
```

Set **Format** to JSON and take a field with [Get field](core.get):

```
[At start] pulse ──▶ read [Read file: ~/serra/impostazioni.json] content ──▶ object [Get field: threshold] value ──▶ b [Compare]
```

**content** is the object `{ "threshold": 30, "name": "North greenhouse" }`; Get field sends `30`.

### 3. A file chosen by the user

```
[Text field: file name] text ──▶ a [Format text: "~/Documents/{a}"] text ──▶ path [Read file] content ──▶ value [Value: text read]
[Button: Open]       pressed ──────────────────────────────────────────▶ read
```

The user writes `list.txt` in the [Text field](ui.text) and presses the [Button](ui.button): the block reads `~/Documents/list.txt` and the [Value](ui.value) component of the window shows it. [Format text](core.format) has an added input called **a**. If the file is not there, **Exception** sends "Il file «~/Documents/list.txt» non esiste" ("The file «~/Documents/list.txt» does not exist").

### 4. Reading every minute a file updated by others

```
[Every… 60 s] pulse ──▶ read [Read file: ~/sensors/last.txt] content ──▶ value [Write to console]
                                              size (bytes) ──▶ a [Compare: a = b] if true ──▶ send [Notification: "The file is empty"]
                                                       [Value: 0] value ──▶ b
```

Useful when another program (or an app) updates the file. With **size (bytes)** you notice an empty file (0 bytes) and receive a [Notification](lilos.notify).

## Errors

The messages are in Italian, as users see them; the English meaning is in parentheses.

| Message | When |
|---|---|
| Manca il percorso del file ("The path of the file is missing") | The path is empty. |
| Percorso non valido: … (scrivi ~/… oppure /home/…) ("Invalid path: … (write ~/… or /home/…)") | The path does not start with `~` or `/`. |
| Percorso non valido: … ("Invalid path: …") | The path starts with `~` but not with `~/` (for example `~dati`), contains `\`, or is longer than 4096 characters. |
| Percorso non valido: «.» e «..» non sono ammessi (…) ("Invalid path: «.» and «..» are not allowed (…)") | The path contains `.` or `..`. |
| Un nome del percorso è troppo lungo (al massimo 255 caratteri) ("A name in the path is too long (at most 255 characters)") | A name is over 255 characters. |
| Percorso troppo profondo (al massimo 32 livelli) ("Path too deep (at most 32 levels)") | More than 32 parts in the path. |
| Puoi usare solo i file della tua home (~/… oppure /home/anna/…): … ("You can only use the files of your home (~/… or /home/anna/…): …") | The path is outside your home. |
| La cartella .config è di lilOS: i programmi non la usano ("The .config folder belongs to lilOS: programs do not use it") | The path is inside `~/.config`. |
| Il file «~/dati.txt» non esiste ("The file «~/dati.txt» does not exist") | The file is not there (or you cannot see it). |
| «~/dati.txt» non è un file ("«~/dati.txt» is not a file") | The path is a folder (or another type). |
| Il contenuto di «~/dati.txt» è protetto da un'app: i programmi non lo usano ("The content of «~/dati.txt» is protected by an app: programs do not use it") | The file is protected (FileCrypt). |
| Il file «~/dati.txt» è troppo grande: 8 MB (si leggono al massimo 5 MB) ("The file «~/dati.txt» is too big: 8 MB (at most 5 MB are read)") | The file is over 5 MB. |
| Il file «~/dati.txt» è troppo grande (si leggono al massimo 5 MB) ("The file «~/dati.txt» is too big (at most 5 MB are read)") | The file goes over 5 MB while being read (size not known before). |
| Il file «~/dati.txt» non è JSON valido: … ("The file «~/dati.txt» is not valid JSON: …") | JSON format and the content is not JSON; the technical explanation follows. |
| «~/dati.txt» non esiste (o non puoi vederlo) ("«~/dati.txt» does not exist (or you cannot see it)") | The file system says it is not there. |
| Non hai il permesso di usare «~/dati.txt» ("You do not have permission to use «~/dati.txt»") | The file system denies you access. |
| Il file system di lilOS non risponde: riprova più tardi ("The lilOS file system is not answering: try again later") | The file system (for example a network folder) is not answering. |
| Il file system di lilOS non c'è ("The lilOS file system is not there") | The file system module is missing. |
| Leggi file ha impiegato più di 30 s ("Read file took more than 30 s") | The reading went over the maximum time of a block (30 seconds by default). |
| Il programma non è in esecuzione ("The program is not running") | The program was stopping. |

## Permissions

The block works as the user who owns the program. An app made with **Make app** that contains this block, before starting, asks you for permission to "read and change your files". See [Permissions](logicstudio-engine/permissions).

## See also

- [Write file](lilos.fileWrite), [Append to file](lilos.fileAppend)
- [Exists](lilos.exists), to check first that the file is there
- [List folder](lilos.folderList)
- [Get field](core.get), to take a field from the JSON read
- [How a block works](ide/blocks)
