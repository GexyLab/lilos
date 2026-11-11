# Write file

`lilos.fileWrite` · lilOS · [lilOS blocks](logicstudio-lilos) · version 1

Writes a value into a file in your home, as text or as JSON. **The file is replaced**: what was there before is lost. If the file is not there, it is created.

## Inputs

| Port | Type | Description |
|---|---|---|
| **content** (`content`) | any | The value to write. Every value that arrives here writes the file. |
| **path** (`path`) | text | The path of the file. If it has a value, it takes the place of the **Path** in the settings. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **written** (`written`) | pulse | Sends `true` when the file has been written. |
| **size (bytes)** (`size`) | number | How many bytes were written (the new size of the file). |
| **Exception** (`error`) | object | When the file cannot be written: invalid path, a folder that is not there, data too big, quota used up... |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Path (~/… or /home/…)** (`path`) | text | `~/dati.txt` | The file to write, when the **path** input has no value. |
| **Format** (`mode`) | Text, JSON | Text | How the value becomes the content of the file (see below). |

## How it works

When a value arrives on **content**, the block takes the path (the one of the **path** input, if it has a non-empty value, otherwise the one in the settings), prepares the bytes to write and asks the kernel to write the file **as you**. Then it sends **written** and **size (bytes)**.

### What ends up in the file

| Value on **content** | Text format | JSON format |
|---|---|---|
| `hello` (text) | `hello` | `"hello"` |
| `42` (number) | `42` | `42` |
| `true` | `true` | `true` |
| `{ "a": 1, "b": [1, 2] }` | `{"a":1,"b":[1,2]}` (on one line) | the JSON on several lines, indented by 2 spaces |
| `null` | empty file | `null` |

- In the **Text** format no new line is added at the end.
- The **JSON** format writes a readable JSON, with one field per line and 2 spaces of indentation: it is what you need to read it again with [Read file](lilos.fileRead) in JSON format.
- The text is written in UTF-8, without BOM.

### Rules

- The path follows the same rules as [Read file](lilos.fileRead): `~/…` or `/home/<user>/…`, only inside your home, never in `~/.config`, no `.` and `..`.
- The path must be that of a **file**: `~` alone (the home) is refused.
- If the file is not there, it is created. **Its folder, though, must be there**: the block does not create folders.
- If the file is there, it is replaced entirely.
- At most **5 MB** are written at a time.
- Files whose content is protected by an app (FileCrypt) are not changed.
- The space used counts in the **quota of your home**: if it is used up, the block gives an error. The file size limit of lilOS also applies.
- A value that arrives only on **path** writes nothing, even if you gave that input "starts it".
- If a new file is created but then the writing does not succeed (for example because of the quota), an **empty file** with that name is left in the folder.

> An active program really writes, even when you are not looking. Try it first with **Test** on a test file.

See also [How a block works](ide/blocks).

## Examples

### 1. Saving a number

```
[Number field: threshold] value ──▶ content [Write file: ~/serra/threshold.txt] written ──▶ value [Write to console]
```

Every time the user changes the [Number field](ui.number), for example to 28, the file `~/serra/threshold.txt` contains `28` and the console writes `true`. The folder `~/serra` must exist.

### 2. Saving the settings in JSON

```
[Number field: threshold] value ──▶ threshold [Build object] object ──▶ content [Write file: ~/serra/settings.json]
[Text field: name]        text  ──▶ name
```

With **Format** JSON, [Build object](core.compose) (with the added inputs **threshold** and **name**) produces `{ "threshold": 28, "name": "North greenhouse" }` and the file becomes:

```
{
  "threshold": 28,
  "name": "North greenhouse"
}
```

At start you can read it again with [Read file](lilos.fileRead) in JSON format.

### 3. Saving a note with a button

```
[Text field: name] text ──▶ a [Format text: "~/Notes/{a}.txt"] text ──▶ path [Write file]
[Text field: note] text ──▶ set [Memory] value ─────────────────────▶ content
[Button: Save]   pressed ──▶ read
```

The user writes `shopping` in the first field, `milk, bread` in the second and presses **Save**: the file `~/Notes/shopping.txt` contains `milk, bread`. The path comes from [Format text](core.format) (with the added input **a**) and, since **path** does not start the block, changing the name writes nothing. The note waits in [Memory](core.store) and goes to **content** only when you press the [Button](ui.button). The folder `~/Notes` must exist.

> If **content** arrives before **path** has a value, the block uses the **Path** in the settings (`~/dati.txt` by default).

## Errors

The messages are in Italian, as users see them; the English meaning is in parentheses.

| Message | When |
|---|---|
| Manca il percorso del file ("The path of the file is missing") | The path is empty. |
| Percorso non valido: … ("Invalid path: …") | The path does not follow the rules (see [Read file](lilos.fileRead) for all the cases). |
| Puoi usare solo i file della tua home (~/… oppure /home/anna/…): … ("You can only use the files of your home (~/… or /home/anna/…): …") | The path is outside your home. |
| La cartella .config è di lilOS: i programmi non la usano ("The .config folder belongs to lilOS: programs do not use it") | The path is inside `~/.config`. |
| Serve il nome di un file, non la home ("A file name is needed, not the home") | The path is `~` (or the home written in full). |
| La cartella «~/serra» non esiste ("The folder «~/serra» does not exist") | The file is not there and neither is its folder. |
| «~/serra» non è una cartella ("«~/serra» is not a folder") | A part of the path is a file. |
| «~/dati.txt» non è un file ("«~/dati.txt» is not a file") | The path is a folder. |
| Il contenuto di «~/dati.txt» è protetto da un'app: i programmi non lo cambiano ("The content of «~/dati.txt» is protected by an app: programs do not change it") | The file is protected (FileCrypt). |
| Troppi dati da scrivere in una volta: 6144 KB (al massimo 5 MB) ("Too much data to write at once: 6144 KB (at most 5 MB)") | The content is over 5 MB. |
| Spazio finito: la tua home ha raggiunto la sua quota ("Out of space: your home has reached its quota") | The quota of your home is full. |
| «~/dati.txt» è troppo grande per i limiti di lilOS ("«~/dati.txt» is too big for the lilOS limits") | The file would go over the maximum file size of lilOS. |
| Non hai il permesso di usare «~/dati.txt» ("You do not have permission to use «~/dati.txt»") | The file system denies you access. |
| «~/dati.txt» non esiste (o non puoi vederlo) ("«~/dati.txt» does not exist (or you cannot see it)") | The file system does not find the file while writing it. |
| «~/dati.txt»: … | The file system refuses the operation, with its own explanation. |
| Il file system di lilOS non risponde: riprova più tardi ("The lilOS file system is not answering: try again later") | The file system is not answering. |
| Scrivi file ha impiegato più di 30 s ("Write file took more than 30 s") | The writing went over the maximum time of a block (30 seconds by default). |
| Il programma non è in esecuzione ("The program is not running") | The program was stopping. |

## Permissions

The block works as the user who owns the program. An app made with **Make app** that contains this block, before starting, asks you for permission to "read and change your files". See [Permissions](logicstudio-engine/permissions).

## See also

- [Append to file](lilos.fileAppend), to make a file longer instead of replacing it
- [Read file](lilos.fileRead), [Exists](lilos.exists), [List folder](lilos.folderList)
- [Build object](core.compose), to prepare a JSON
- [How a block works](ide/blocks)
