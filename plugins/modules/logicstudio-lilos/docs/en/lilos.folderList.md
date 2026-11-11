# readdir (list folder)

`lilos.folderList` · lilOS · [lilOS blocks](logicstudio-lilos) · version 1

Lists the items of a folder in your home: files, folders, or both. For each one it gives name, type, size, date of the last change and path.

## Inputs

| Port | Type | Description |
|---|---|---|
| **read** (`read`) | pulse | Any value that arrives here makes the folder be read. |
| **path** (`path`) | text | The path of the folder. If it has a value, it takes the place of the **Path** in the settings. It does not start the block. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **items** (`items`) | list | One object per item (see below). |
| **names** (`names`) | list | Only the names, in the same order. |
| **count** (`count`) | number | How many items there are, after the filters. |
| **Exception** (`error`) | object | When the folder cannot be read: it is not there, it is not a folder, invalid path... |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Path (~/… or /home/…)** (`path`) | text | `~` | The folder to list, when the **path** input has no value. `~` is your home. |
| **Show** (`show`) | Files and folders, Files only, Folders only | Files and folders | Which items to list. |
| **Hidden ones too (.name)** (`hidden`) | yes / no | no | If it is ticked, it also lists the items whose name starts with a dot. |

## How it works

When a value arrives on **read**, the block reads the folder **as you** and sends, in this order, **items**, **names** and **count**.

Each item of **items** is an object like this:

```
{
  "name": "dati.txt",
  "type": "file",
  "size": 1534,
  "modified": 1762855200000,
  "path": "~/serra/dati.txt"
}
```

| Field | What it holds |
|---|---|
| `name` | The name of the item. |
| `type` | `folder` for folders, `file` for files; other lilOS items have their own type (for example `app`). |
| `size` | The size in bytes (0 for folders and when it is not known). |
| `modified` | The date of the last change, in milliseconds since 1 January 1970 (`null` if it is not known). |
| `path` | The path of the item, always in the form `~/…`: you can send it straight to the **path** input of the other lilOS blocks. |

Things to know:

- The order is: **folders first, then the rest**, each group in alphabetical order.
- **Files only** lists everything that is not a folder (also items of other types).
- Items that start with a dot (for example `.draft.txt`) are hidden, unless you tick **Hidden ones too (.name)**. The `.config` folder of the home **never** appears, not even with the hidden ones.
- **items** and **names** hold at most **2000** items; **count** says how many there are in all, even beyond 2000.
- The block lists only the first level: it does not go into the subfolders.
- If the path is empty, the block lists the home.
- The path follows the same rules as [readFile](lilos.fileRead): only inside your home, never in `~/.config`.
- You see only the items you can see.

See also [How a block works](ide/blocks).

## Examples

### 1. The names of the files in a folder

Set **Path** to `~/Documents` and **Show** to "Files only":

```
[On start (main)] pulse ──▶ read [readdir (list folder): ~/Documents] names ──▶ value [Print (console.log)]
                                                     count ──▶ value [Print (console.log)]
```

If `~/Documents` contains the folder `Old` and the files `list.txt` and `accounts.csv`, the console writes `["accounts.csv","list.txt"]` and `2`.

### 2. A list of files in a window

```
[Button: Refresh] pressed ──▶ read [readdir (list folder): ~/Photos] items ──▶ rows [Table]
```

The [Table](ui.table) component, with **Columns** `name, size`, shows the name and size of each item. When the user chooses a row, the Table sends the object of the row: with [Get property](core.get) (`path`) you get the path, to send to [readFile](lilos.fileRead) or [exists](lilos.exists).

### 3. Checking how many files there are

```
[Interval (setInterval): 300 s] pulse ──▶ read [readdir (list folder): ~/Incoming] count ──▶ a [Compare (== != < >): a > b] if true ──▶ send [Notify: "There are new files"]
                                                  [Constant · Variable: 0] value ──▶ b
```

Every 5 minutes the program counts the items of `~/Incoming` and sends you a [Notify](lilos.notify) if there is at least one. Remember the limit of 10 notifications per minute.

## Errors

The messages are in Italian, as users see them; the English meaning is in parentheses.

| Message | When |
|---|---|
| Percorso non valido: … ("Invalid path: …") | The path does not follow the rules (see [readFile](lilos.fileRead) for all the cases). |
| Puoi usare solo i file della tua home (~/… oppure /home/anna/…): … ("You can only use the files of your home (~/… or /home/anna/…): …") | The path is outside your home. |
| La cartella .config è di lilOS: i programmi non la usano ("The .config folder belongs to lilOS: programs do not use it") | The path is `~/.config` or inside it. |
| La cartella «~/Documenti» non esiste ("The folder «~/Documenti» does not exist") | The folder is not there. |
| «~/dati.txt» non è una cartella ("«~/dati.txt» is not a folder") | The path is a file. |
| «~/Documenti» non esiste (o non puoi vederlo) ("«~/Documenti» does not exist (or you cannot see it)") | The file system says it is not there. |
| Non hai il permesso di usare «~/Documenti» ("You do not have permission to use «~/Documenti»") | The file system denies you access. |
| Il file system di lilOS non risponde: riprova più tardi ("The lilOS file system is not answering: try again later") | The file system is not answering. |
| readdir (elenca cartella) ha impiegato più di 30 s ("readdir (list folder) took more than 30 s") | The reading went over the maximum time of a block (30 seconds by default). |
| Il programma non è in esecuzione ("The program is not running") | The program was stopping. |

## Permissions

The block works as the user who owns the program. An app made with **Make app** that contains this block, before starting, asks you for permission to "read and change your files". See [Permissions](logicstudio-engine/permissions).

## See also

- [exists](lilos.exists), for a single file or folder
- [readFile](lilos.fileRead), [writeFile](lilos.fileWrite), [appendFile](lilos.fileAppend)
- [Length](coll.length) and [Filter](coll.filter), to work on the list
- [How a block works](ide/blocks)
