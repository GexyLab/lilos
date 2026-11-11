# appendFile

`lilos.fileAppend` · lilOS · [lilOS blocks](logicstudio-lilos) · version 1

Adds a value at the end of a file in your home, without touching what is already there. It is the right block for a **log**: one line for each measure, each event, each error. If the file is not there, it is created.

## Inputs

| Port | Type | Description |
|---|---|---|
| **content** (`content`) | any | The value to add. Every value that arrives here is added to the file. |
| **path** (`path`) | text | The path of the file. If it has a value, it takes the place of the **Path** in the settings. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **written** (`written`) | pulse | Sends `true` when the value has been added. |
| **size (bytes)** (`size`) | number | The new size of the file, in bytes. |
| **Exception** (`error`) | object | When nothing can be added: invalid path, a folder that is not there, file too big, quota used up... |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Path (~/… or /home/…)** (`path`) | text | `~/registro.txt` | The file to append to, when the **path** input has no value. |
| **Format** (`mode`) | Text, JSON, one per line | Text | **Text**: the value as text. **JSON, one per line**: the value as JSON on a single line, followed by a new line (the "JSON Lines" format). |
| **New line after each one** (`newline`) | yes / no | yes | Only with the Text format: adds a new line after each value, so every value is on its own line. |

## How it works

When a value arrives on **content**, the block prepares the bytes to add, puts them at the end of the file and sends **written** and **size (bytes)**.

### What is added

| Value on **content** | Text, with new line | Text, without new line | JSON, one per line |
|---|---|---|---|
| `22,5` (text) | `22,5` + new line | `22,5` | `"22,5"` + new line |
| `22.5` (number) | `22.5` + new line | `22.5` | `22.5` + new line |
| `{ "t": 22.5, "h": 60 }` | `{"t":22.5,"h":60}` + new line | `{"t":22.5,"h":60}` | `{"t":22.5,"h":60}` + new line |
| `null` | only a new line | nothing | `null` + new line |

- An object or a list always becomes JSON on one line.
- With the **JSON, one per line** format the **New line after each one** setting does not matter: the new line is always there.
- The new line is `\n` (the Linux one, which lilOS uses everywhere).
- The text is written in UTF-8.

### Rules and limits

- The path follows the same rules as [readFile](lilos.fileRead): `~/…` or `/home/<user>/…`, only inside your home, never in `~/.config`.
- If the file is not there, it is created, but **its folder must be there**.
- At most **5 MB** are added at a time.
- The file can grow with this block up to **64 MB**: beyond it, the block gives an error and adds nothing. When a log gets close to the limit, change file (for example one per day) or empty it with [writeFile](lilos.fileWrite).
- Up to 5 MB the file is read and written again whole; beyond 5 MB it is written again in pieces, without keeping it all in memory. If the file system cannot write again in pieces, beyond 5 MB the block gives an error.
- The space counts in the quota of your home.
- Files protected by an app (FileCrypt) are not changed.
- A value that arrives only on **path** adds nothing.
- If a new file is created but then the append does not succeed, an empty file is left.
- Every value is added one at a time, in the order it arrives: two close values do not get mixed.

See also [How a block works](ide/blocks).

## Examples

### 1. A temperature log

```
[Interval (setInterval): 60 s] pulse ──▶ read [Now (date and time)] ISO ──▶ time [Template string: "{time};{temp}"] text ──▶ content [appendFile: ~/greenhouse/temperatures.csv]
[readFile: ~/sensors/last.txt]      content ──▶ temp
```

[Template string](core.format) has two added inputs, **time** and **temp**; remove "starts it" from **temp**, so the line is written only when the time arrives (otherwise every new temperature would write one more line). The temperature comes from a file that another program updates, read when you want. Every minute the file receives a line like:

```
2026-11-11T10:00:00.000Z;22,5
2026-11-11T10:01:00.000Z;22,7
```

### 2. A JSON log

Set **Format** to "JSON, one per line" and link an object:

```
[Object literal { }] object ──▶ content [appendFile: ~/greenhouse/events.jsonl]
```

With [Object literal { }](core.compose) producing `{ "event": "door open", "at": "10:42" }`, the file receives the line:

```
{"event":"door open","at":"10:42"}
```

Every line is a JSON on its own: it is a format that is easy to read again with other programs.

### 3. Keeping the errors of the program

```
[HTTP request (fetch)] Exception ──▶ object [Get property: message] value ──▶ content [appendFile: ~/errors.txt]
```

Every time the [HTTP request (fetch)](net.request) block fails, the error message (for example "Indirizzo non trovato: esempio.invalid", meaning "Address not found") ends up in a line of `~/errors.txt`. You can also link **Exception** directly to **content**: then the whole object `{ message, block, type, schema, at }` is written on one line.

## Errors

The messages are in Italian, as users see them; the English meaning is in parentheses.

| Message | When |
|---|---|
| Manca il percorso del file ("The path of the file is missing") | The path is empty. |
| Percorso non valido: … ("Invalid path: …") | The path does not follow the rules (see [readFile](lilos.fileRead) for all the cases). |
| Puoi usare solo i file della tua home (~/… oppure /home/anna/…): … ("You can only use the files of your home (~/… or /home/anna/…): …") | The path is outside your home. |
| La cartella .config è di lilOS: i programmi non la usano ("The .config folder belongs to lilOS: programs do not use it") | The path is inside `~/.config`. |
| Serve il nome di un file, non la home ("A file name is needed, not the home") | The path is `~`. |
| La cartella «~/serra» non esiste ("The folder «~/serra» does not exist") | The file is not there and neither is its folder. |
| «~/serra» non è una cartella ("«~/serra» is not a folder") | A part of the path is a file. |
| «~/registro.txt» non è un file ("«~/registro.txt» is not a file") | The path is a folder. |
| Il contenuto di «~/registro.txt» è protetto da un'app: i programmi non lo cambiano ("The content of «~/registro.txt» is protected by an app: programs do not change it") | The file is protected (FileCrypt). |
| Troppi dati da scrivere in una volta: 6144 KB (al massimo 5 MB) ("Too much data to write at once: 6144 KB (at most 5 MB)") | The value to add is over 5 MB. |
| Il file «~/registro.txt» diventerebbe troppo grande (si aggiunge fino a 64 MB) ("The file «~/registro.txt» would become too big (you can append up to 64 MB)") | With the append the file would go over 64 MB. |
| Il file «~/registro.txt» è troppo grande per aggiungere (al massimo 5 MB) ("The file «~/registro.txt» is too big to append to (at most 5 MB)") | The file is over 5 MB and the file system cannot write it again in pieces. |
| Spazio finito: la tua home ha raggiunto la sua quota ("Out of space: your home has reached its quota") | The quota of your home is full. |
| «~/registro.txt» è troppo grande per i limiti di lilOS ("«~/registro.txt» is too big for the lilOS limits") | The file would go over the maximum file size of lilOS. |
| Non hai il permesso di usare «~/registro.txt» ("You do not have permission to use «~/registro.txt»") | The file system denies you access. |
| Il file system di lilOS non risponde: riprova più tardi ("The lilOS file system is not answering: try again later") | The file system is not answering. |
| appendFile ha impiegato più di 30 s ("appendFile took more than 30 s") | The operation went over the maximum time of a block (30 seconds by default). |
| Il programma non è in esecuzione ("The program is not running") | The program was stopping. |

## Permissions

The block works as the user who owns the program. An app made with **Make app** that contains this block, before starting, asks you for permission to "read and change your files". See [Permissions](logicstudio-engine/permissions).

## See also

- [writeFile](lilos.fileWrite), to replace the whole file
- [readFile](lilos.fileRead), [exists](lilos.exists), [readdir (list folder)](lilos.folderList)
- [Template string](core.format), to prepare a line
- [How a block works](ide/blocks)
