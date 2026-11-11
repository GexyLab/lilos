# SQL · SQLite (open)

`db.sqlite` · Database · [Database blocks (SQL)](logicstudio-db) · version 1

Opens a **SQLite** database: a file in your home (made when missing), or a database in memory. It sends the reference, to be linked to the **connection** input of the other database blocks. SQLite has no server, no user and no password: it is the simplest choice to keep a program's data.

## Inputs

| Port | Type | Description |
|---|---|---|
| **connect** (`connect`) | pulse | Any value arriving here opens the database (if this block already has one open, it closes it first, saving it). |
| **close** (`close`) | pulse | Hidden. Saves and closes the database. |
| **password** (`password`) | text | Hidden. Not needed for SQLite: there is no password. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **connection** (`connection`) | object | The reference to the open database. It only works for this program. |
| **connected** (`connected`) | yes/no | `true` when the database is open, `false` when it is closed with **close**. |
| **server** (`info`) | object | Hidden. For example `{ "kind": "sqlite", "label": "SQLite", "name": "~/Documenti/dati.sqlite", "server": "SQLite 3.49.1", "file": "~/Documenti/dati.sqlite" }`; in memory `name` and `file` are `:memory:`. |
| **Exception** (`error`) | object | When the database does not open: a file that does not exist in read-only mode, an invalid path, a protected file, already open in another program, too big... |

The hidden ports are shown with the **eye** in the **Properties**.

## Added ports

This block has no added ports.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **File (~/…)** (`file`) | text | `~/Documenti/dati.sqlite` | The database file, in your home: `~/…` or `/home/<user>/…`. If it does not exist, it is made (the folder must exist). It does not count with **In memory**. |
| **In memory (no file)** (`memory`) | yes / no | no | If ticked, the database lives only in memory while the program runs: no file, no saving. |
| **Read only** (`readOnly`) | yes / no | no | The database can only be read: the file must exist, statements that write give an error, and the file is not touched (nor locked for the other programs). |
| **Connect at start** (`atStart`) | yes / no | yes | If ticked, the database opens as soon as the program starts. If not, only with **connect**. |

## How it works

- **When the program starts**, if **Connect at start** is ticked, the block opens the database and sends **connection**, then **connected**, then **server**. Otherwise it opens only with **connect**.
- With **connect** the block closes the database it already had (saving it; its old reference stops working) and opens a new one.
- With **close** the block saves and closes, and sends `connected = false`.
- When the program stops, the database is saved and closed.
- No network: SQLite does not go through the address checks. It does count in the module's **open connections** and **operations per minute**. See [Database blocks (SQL)](logicstudio-db).

### The file

- The file is read and written **as you**, through lilOS's file system: your rules and your space quota apply.
- The path starts with `~/` (your home) or with `/home/<user>/`. Not allowed: `.` and `..`, the backslash `\`, names longer than 255 characters, more than 32 folder levels. Never the `.config` folder of lilOS, and never a file whose content is protected by an app.
- A file that does not exist is made (empty) when you connect; the folder you put it in must exist. With **Read only** the file must already exist.
- The file is read **whole into memory** when you connect, and it cannot exceed the **Size of a SQLite file, at most (MB)** of the module settings (1024 at most).
- Saving happens **one second after the last change**, at each **commit** of a transaction and at the close. If the automatic save fails (no space left, file too big), the database stays "to be saved" and it tries again at the next change; at a commit the error reaches the block.
- A file open **for writing** belongs to **one program at a time**: another program that tries to open it gets an error, and can open it only with **Read only**. The block lets it go when the program stops or with **close**.

### SQLite in particular

- **One connection only**: a program's statements go one after the other. A [SQL · Transaction (BEGIN · COMMIT · ROLLBACK)](db.transaction) keeps the database busy until it is committed or rolled back, and a [SQL · Read rows one by one (cursor)](db.cursor) until the rows end: the other blocks wait their turn.
- **A thread of its own**: SQLite runs (compiled to WebAssembly with `sql.js`) in a thread of its own. If a query goes over the time limit of an operation, the thread is stopped **without blocking lilOS**, and the changes not yet saved are lost.
- **Values**: SQLite has few types. Numbers and texts come out as they are; binary data (`BLOB`) as `{ "$bytes": "base64" }`; dates are texts (SQLite has no date type). Yes/no become 1 and 0; objects and lists become JSON text.
- **Parameters**: `:name` becomes `?`; strings, quoted names (`"…"`, backticks, square brackets) and comments are not touched.
- **More statements**: without parameters a query may have more statements (`CREATE TABLE …; INSERT …`); the last result comes out.
- **Writing**: [SQL · Insert (INSERT)](db.insert) uses `RETURNING *`: the inserted rows come out and **last id** is the first field of the last row (usually the `INTEGER PRIMARY KEY` column).
- **Tables**: [SQL · Tables and columns (schema)](db.tables) lists the tables and views (without the `sqlite_…` ones), with the schema `main`.
- **Isolation**: *Serializable* and *Repeatable read* open the transaction with `BEGIN IMMEDIATE`; the other levels with `BEGIN DEFERRED`.
- Notifications (LISTEN and NOTIFY) are not available.

## Examples

### 1. A log of measures

**File** `~/Documenti/misure.sqlite`. Once, with [SQL · Query (query)](db.query), make the table: `CREATE TABLE IF NOT EXISTS misure (id INTEGER PRIMARY KEY, quando TEXT, valore REAL)`.

```
[SQL · SQLite (open)] connection ──▶ connection [SQL · Insert (INSERT): misure] rows inserted ──▶ value [Print (console.log)]
[Now (date and time)] ISO ──▶ quando (added input)
[Number field: temperatura] value ──▶ valore (added input)
[Interval (setInterval): 60 s] pulse ──▶ run
```

Every minute a row with the time and the value goes into the file. The file is saved a second later; if you close lilOS and reopen the program, the data is there.

### 2. Reading in read-only mode

**File** `~/Documenti/archivio.sqlite`, **Read only** ticked.

```
[SQL · SQLite (open)] connection ──▶ connection [SQL · Read table (SELECT): misure] rows ──▶ rows [Table]
[Button: Read] pressed ──▶ run
```

The file is neither modified nor locked: another program can read it too.

### 3. A test database in memory

Tick **In memory**: the program makes the tables, fills them and queries them, and in the end nothing is left. Useful to try a query or for temporary calculations.

```
[SQL · SQLite (open)] connection ──▶ connection [SQL · Query (query): CREATE TABLE t (n INTEGER); INSERT INTO t VALUES (1), (2); SELECT SUM(n) AS somma FROM t] value ──▶ value [Print (console.log)]
                connected ──────────────────────────▶ run
```

The block opens at start and **connected** starts the query. The query has more statements and no parameters: the last result comes out (the sum, 3).

## Errors

The messages are in Italian, as the block sends them; SQLite's own messages are in English.

| Message | When |
|---|---|
| Manca il file del database SQLite (per esempio ~/Documenti/dati.sqlite) | **File** is empty (and **In memory** is not ticked): the SQLite database file is missing. |
| Percorso non valido: … | The path has a character that is not allowed (the backslash `\`, a null character), a `.` or a `..`, or `~` followed by something other than `/` (invalid path). |
| Percorso non valido: … (scrivi ~/… oppure /home/…) | The path starts with neither `~/` nor `/` (write ~/… or /home/…). |
| Puoi usare solo i file della tua home (~/… oppure /home/…/…): … | The path is not inside your home (you can only use the files of your home). |
| Serve il nome di un file, non la home | The path is the home itself (a file name is needed, not the home). |
| La cartella .config è di lilOS: i programmi non la usano | The path is in `.config` (it belongs to lilOS: programs do not use it). |
| Il contenuto di «…» è protetto da un'app: i programmi non lo usano | The file is protected by an app (programs do not use it). |
| «…» non è un file | The path is a folder. |
| La cartella «…» non esiste | The folder of the new file does not exist. |
| Il file «…» non esiste | **Read only** and the file does not exist. |
| Il file «…» è già aperto da un altro programma: chiudilo lì, oppure aprilo in sola lettura | Another program keeps the file open for writing (close it there, or open it read-only). |
| Il file «…» è troppo grande: … MB (al massimo … MB) | The file is over the maximum size of the module settings. |
| Il database «…» è diventato troppo grande per salvarlo (al massimo … MB) | The database grew beyond the maximum size (too big to save). |
| Spazio finito: la tua home ha raggiunto la sua quota | No more space to save (your home reached its quota). |
| Il database è aperto in sola lettura | A statement that writes on a database opened with **Read only**. |
| SQLite non ha finito in 30 s: la query è stata fermata (le modifiche non ancora salvate sono perse) | A query went over the time limit of an operation (SQLite did not finish in 30 s: the query was stopped; unsaved changes are lost). |
| L'amministratore non permette i database SQLite (impostazioni del modulo logicstudio-db) | SQLite is switched off in the module settings (the administrator does not allow it). |
| no such table: … | The table does not exist (SQLite's message). |

The common quota errors (connections, operations per minute, result too big...) are on the [Database blocks (SQL)](logicstudio-db) page.

## See also

- [SQL · Query (query)](db.query), [SQL · Read table (SELECT)](db.select), [SQL · Insert (INSERT)](db.insert), [SQL · Transaction (BEGIN · COMMIT · ROLLBACK)](db.transaction)
- [readFile](lilos.fileRead), [writeFile](lilos.fileWrite), for the files of the home
- [Database blocks (SQL)](logicstudio-db), for the limits, the quotas and the module settings
- [Limits](logicstudio-engine/limits), [How a block works](ide/blocks)
