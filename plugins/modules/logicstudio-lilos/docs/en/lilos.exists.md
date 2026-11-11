# Exists

`lilos.exists` · lilOS · [lilOS blocks](logicstudio-lilos) · version 1

Tells you whether a file or a folder in your home is there, what type it is and how big it is. It has two pulse outputs to choose what to do: **if it exists** and **if not**.

## Inputs

| Port | Type | Description |
|---|---|---|
| **check** (`check`) | pulse | Any value that arrives here makes the path be checked. |
| **path** (`path`) | text | The path to check. If it has a value, it takes the place of the **Path** in the settings. **Unlike the other lilOS blocks, this input starts the block**: a new path is checked at once. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **exists** (`exists`) | yes/no | `true` if the path is there, `false` if it is not. |
| **if it exists** (`yes`) | pulse | Sends `true` only if the path is there. |
| **if not** (`no`) | pulse | Sends `true` only if the path is not there. |
| **kind (file, folder)** (`kind`) | text | `file` or `folder` (or another lilOS type, like `app`); empty text if it does not exist. |
| **size (bytes)** (`size`) | number | The size in bytes; `0` for folders and when it does not exist. |
| **Exception** (`error`) | object | When the path is not valid or the file system does not answer. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Path (~/… or /home/…)** (`path`) | text | `~/dati.txt` | The path to check, when the **path** input has no value. |

## How it works

When a value arrives on **check** (or on **path**), the block looks for the path **as you** and sends, in this order:

- if it is there: **exists** = `true`, **if it exists**, **kind** and **size (bytes)**;
- if it is not there: **exists** = `false`, **if not**, **kind** = empty text, **size (bytes)** = `0`.

Things to know:

- A file you cannot see (of another user, for example) **does not exist** for the block.
- `~` (your home) always exists: type `folder`, size 0.
- The path follows the same rules as [Read file](lilos.fileRead). An **invalid** path does not give `false`: it goes to **Exception**. The same for `~/.config`, which programs cannot use: there too the block gives an error instead of answering.
- A file protected by an app (FileCrypt) appears as existing, with its type and size, but [Read file](lilos.fileRead) and [Write file](lilos.fileWrite) will not use it.
- The check and the later use are not a single operation: between the check and a reading the file can disappear. Link the **Exception** of the block that uses it anyway.
- Upper and lower case letters in the `/home/<user>` part do not matter; for the rest of the path it depends on the file system (with the default lilOS one they do not matter).

See also [How a block works](ide/blocks).

## Examples

### 1. Reading the settings, or creating them the first time

```
[At start] pulse ──▶ check [Exists: ~/serra/impostazioni.json] if it exists ──▶ read [Read file: ~/serra/impostazioni.json]
                                                                 if not       ──▶ send [Value: {"threshold": 30}] value ──▶ content [Write file: ~/serra/impostazioni.json]
```

At start: if the file is there, it is read; if it is not, the program creates it with the starting values. The [Value](core.value) is of type JSON and has **Send at start** removed, so it sends its value only when **if not** arrives. Read file and Write file use the JSON format.

### 2. Checking a name written by the user

```
[Text field: path] text ──▶ path [Exists] exists ──▶ on [Lamp]
                                                       kind (file, folder) ──▶ value [Value: kind]
```

Every time the user changes the path in the [Text field](ui.text), the block checks it at once (here **path** starts the block). The [Lamp](ui.lamp) lights up if the path is there; the [Value](ui.value) component shows `file` or `folder`. If the user writes an invalid path, like `dati.txt` without `~/`, the message goes to **Exception**.

### 3. Waiting for a file

```
[Every… 10 s] pulse ──▶ check [Exists: ~/Incoming/order.json] if it exists ──▶ read [Read file: ~/Incoming/order.json]
```

Every 10 seconds the program looks whether the file has arrived; as soon as it is there, it reads it. To avoid reading it at every turn, after using it move it or empty it with [Write file](lilos.fileWrite).

## Errors

The messages are in Italian, as users see them; the English meaning is in parentheses.

| Message | When |
|---|---|
| Manca il percorso del file ("The path of the file is missing") | The path is empty. |
| Percorso non valido: … ("Invalid path: …") | The path does not follow the rules (see [Read file](lilos.fileRead) for all the cases). |
| Puoi usare solo i file della tua home (~/… oppure /home/anna/…): … ("You can only use the files of your home (~/… or /home/anna/…): …") | The path is outside your home. |
| La cartella .config è di lilOS: i programmi non la usano ("The .config folder belongs to lilOS: programs do not use it") | The path is `~/.config` or inside it. |
| Non hai il permesso di usare «~/dati.txt» ("You do not have permission to use «~/dati.txt»") | The file system denies you access. |
| Il file system di lilOS non risponde: riprova più tardi ("The lilOS file system is not answering: try again later") | The file system is not answering. |
| Esiste ha impiegato più di 30 s ("Exists took more than 30 s") | The check went over the maximum time of a block (30 seconds by default). |
| Il programma non è in esecuzione ("The program is not running") | The program was stopping. |

## Permissions

The block works as the user who owns the program. An app made with **Make app** that contains this block, before starting, asks you for permission to "read and change your files" (even if this block only reads). See [Permissions](logicstudio-engine/permissions).

## See also

- [Read file](lilos.fileRead), [Write file](lilos.fileWrite), [List folder](lilos.folderList)
- [If](core.if), to choose with the value of **exists**
- [How a block works](ide/blocks)
