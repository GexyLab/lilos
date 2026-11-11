# lilOS blocks

`logicstudio-lilos` · needs the engine `logicstudio-engine`, the [Basic blocks](logicstudio-core) and the notification service `notifications-basic`

The blocks that make a Logic Studio program talk to lilOS: they send you notifications, read and write the files of your home, list folders, send events to your lilOS pages. In the block list of the IDE they are in the **lilOS** category.

## How to install

The package does not come with Logic Studio IDE: an administrator installs it from the **AppStore**, **Kernel** tab ("lilOS blocks"). The AppStore also installs what it needs (the engine, the basic blocks and the notification service, if they are missing). After the installation the blocks appear in the **Blocks** tab of the IDE.

A project that uses these blocks, on a lilOS that does not have the package, shows them with **The package is missing**; an active program stays waiting (**Waiting for a package**) until the package is back.

## The blocks

| Block | Type | What it does |
|---|---|---|
| [Notify](lilos.notify) | `lilos.notify` | Sends you a lilOS notification on behalf of the program, with `{name}` placeholders in the text. |
| [readFile](lilos.fileRead) | `lilos.fileRead` | Reads a file in your home, as text or as JSON (at most 5 MB). |
| [writeFile](lilos.fileWrite) | `lilos.fileWrite` | Writes (replaces) a file in your home, as text or as JSON. |
| [appendFile](lilos.fileAppend) | `lilos.fileAppend` | Adds at the end of a file: a log, one line at a time (up to 64 MB). |
| [readdir (list folder)](lilos.folderList) | `lilos.folderList` | The items of a folder: name, type, size, date, path. |
| [exists](lilos.exists) | `lilos.exists` | Tells whether a file or folder is there, what type it is and how big. |
| [Emit (event to lilOS)](lilos.event) | `lilos.event` | Sends the event `logicstudio.event` to your open lilOS pages. |

## To know for all the blocks

### They work in the kernel, as you

The blocks do not touch lilOS by themselves: they ask the kernel (the computer lilOS runs on) to do the operation **as the user who owns the program**. So:

- they see and change only what you can see and change: what you cannot do, the program does not do;
- the space they use counts in the **quota of your home**;
- they also work when lilOS is closed in the browser, if the program is active;
- an active program really does what it says: a **writeFile** block really replaces the file, even when you are not looking. Try it first with **Test**, on test files.

### The paths

| You write | It means |
|---|---|
| `~` | Your home. |
| `~/dati.txt` | The file `dati.txt` in your home. |
| `~/serra/log.txt` | The file `log.txt` in the folder `serra` of the home. |
| `/home/anna/dati.txt` | The same as `~/dati.txt`, if you are the user `anna`. |

- Only your home: no system folders, no homes of other users.
- Never the `~/.config` folder: these are your lilOS settings.
- Never the files whose content is protected by an app (for example encrypted with FileCrypt): they cannot be read or changed.
- No `.` and `..`, no `\`, at most 32 levels and 255 characters per name.
- A linked **path** input takes the place of the path written in the settings. In all blocks, except [exists](lilos.exists), **path** does not start the block: it keeps the value until the next command.

### The limits

| What | Limit |
|---|---|
| A file read by [readFile](lilos.fileRead) | 5 MB |
| Data written or appended at once | 5 MB |
| A file grown by [appendFile](lilos.fileAppend) | 64 MB |
| Items given by [readdir (list folder)](lilos.folderList) | 2000 (the count still says how many there are) |
| Notifications | 10 per minute per user, for all the Logic Studio programs together; text cut at 300 characters |
| Data of an [Emit (event to lilOS)](lilos.event) | 64 KB (as JSON) |
| Events to lilOS | 20 per second per program |
| Time of an operation | The maximum time of an engine block (30 seconds by default) |

The quota of your home, the maximum file size of lilOS and the limits of the Logic Studio engine (active programs, runs, CPU, memory) also apply: see [Limits](logicstudio-engine/limits).

If an operation goes over the maximum time of a block, the block sends on **Exception** "*Name of the block* ha impiegato più di 30 s" ("*Name of the block* took more than 30 s"). The operation in the kernel is not cancelled, though: for example a slow write can still finish shortly after.

### The errors

Every block has the **Exception** output. The messages are in Italian and give the path in the form `~/…`, for example "Il file «~/dati.txt» non esiste" ("The file «~/dati.txt» does not exist"). If you do not link **Exception**, the message goes to the main console. Each page lists the messages of its block.

### Apps made with Make app

An app made with **Make app** runs with the permissions of whoever opens it. If it contains these blocks, before starting lilOS opens a window "Run «name»?" that lists what it will be able to do:

| Blocks in the app | Line of the window |
|---|---|
| readFile, writeFile, appendFile, readdir, exists | read and change your files |
| Notify | send you notifications |
| Emit | send events to your lilOS |

With **Run** the app starts and lilOS remembers it for that app as it is, in that folder: it does not ask again until the app changes (lilOS remembers the last 200 allowed apps). With **Cancel** the app does not start. Tests and active programs of your projects ask nothing: they are yours. See [Permissions](logicstudio-engine/permissions) and [Making an app](ide/create-app).

## Complete examples

### 1. A log with an alarm

Every minute the program reads a temperature from a file, adds it to a log and, if it goes over the threshold, alerts you.

```
[Interval (setInterval): 60 s] pulse ──▶ read [readFile: ~/sensors/temp.txt]
              pulse ──▶ read [Now (date and time)]

[Now (date and time)] ISO     ──▶ time  [Template string: "{time};{temp}"] text ──▶ content [appendFile: ~/sensors/log.csv]
[readFile] content ──▶ temp

[readFile] content ──▶ a [Compare (== != < >): a > b] result ──▶ value [On change (edge)] becomes true ──▶ send [Notify]
[Constant · Variable: 30]    value ──▶ b
[readFile] content ──▶ temp [Notify]
```

- There is only one readFile block: three links start from its **content** output.
- [Template string](core.format) has the added inputs **time** and **temp**; remove "starts it" from **temp**, so it writes only one line per minute.
- The [Notify](lilos.notify) block has **Title** `Greenhouse`, **Text** `Temperature: {temp} °C`, **Kind** Warning, and an added input **temp**.
- [On change (edge)](core.edge) makes the notification go out only when the temperature **goes over** 30, not every minute.

### 2. Settings that stay

The values of a program are lost when it stops. To keep them, save them in a JSON file and read them again at start:

```
[On start (main)] pulse ──▶ check [exists: ~/serra/impostazioni.json] if it exists ──▶ read [readFile: JSON] content ──▶ object [Get property: threshold] value ──▶ value [Number field: threshold]
                                                                if not       ──▶ send [Constant · Variable: JSON {"threshold": 30}] value ──▶ content [writeFile: JSON]

[Number field: threshold] value ──▶ threshold [Object literal { }] object ──▶ content [writeFile: JSON]
```

At start the program reads the settings (or creates them the first time) and puts the threshold in the [Number field](ui.number) of the window; every time the user changes it, [Object literal { }](core.compose) prepares `{ "threshold": 28 }` and [writeFile](lilos.fileWrite) saves it. All the file blocks use the same path `~/serra/impostazioni.json` and the JSON format.

### 3. A watched folder

```
[Interval (setInterval): 30 s] pulse ──▶ read [readdir (list folder): ~/Incoming, Files only] count ──▶ a [Compare (== != < >): a > b] result ──▶ value [On change (edge)] becomes true ──▶ send [Notify: "There are new files in Incoming"]
                                                          [Constant · Variable: 0] value ──▶ b
                                       [readdir (list folder)] names ──▶ content [appendFile: ~/Incoming.log, JSON one per line]
```

Every 30 seconds the program counts the files in `~/Incoming`: when they go from none to at least one you receive a notification, and every turn writes the list of names as a JSON line in the log.

## Known limits

- The blocks work only on your home: for files shared with you, ask whoever owns them to put them in your home.
- There is no block to create folders, rename, move or delete files.
- Files are read whole (at most 5 MB): a piece of a big file cannot be read.
- The [Emit (event to lilOS)](lilos.event) is not listened to anywhere in lilOS for now.
- Notifications are limited to 10 per minute for all your Logic Studio programs together.

## See also

- [Basic blocks](logicstudio-core)
- [Network blocks](logicstudio-net)
- [The engine](logicstudio-engine), [Limits](logicstudio-engine/limits), [Permissions](logicstudio-engine/permissions)
- [How a block works](ide/blocks)
