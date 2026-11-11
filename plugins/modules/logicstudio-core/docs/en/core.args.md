# Arguments (argv)

`core.args` · Program · [Core blocks](logicstudio-core) · version 1

The **command-line arguments** the program was started with: those written after the file in `lilos logic run FILE ARGUMENTS…`, or in the **Arguments** button of the IDE for the tests. It is like `process.argv` or `sys.argv`: all of them, as they arrived, plus a first reading of the options with `-` and `--`.

To read **one** option precisely (with its short and long name, whether it wants a value, the type, whether it is required) use [Option (-x · --name)](core.option).

## Inputs

| Port | Type | Description |
|---|---|---|
| **send** (`send`) | pulse | Hidden by default (show it with the eye in the Properties). If it is not linked, the block sends everything **once, at start**; if it is linked, it sends at every pulse. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **all** (`all`) | list | The arguments as they arrived, all texts: `["report.csv", "--verbose", "--port=8080"]`. |
| **options** (`options`) | object | The options read (see below): `{"verbose": true, "port": 8080}`. |
| **positional** (`positional`) | list | The arguments that are neither options nor values of options: `["report.csv"]`. |
| **count** (`count`) | number | How many arguments there are. Hidden by default. |
| **Exception** (`error`) | object | As in every block; nothing passes here. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Options without a value** (`flags`) | names separated by commas, without dashes | empty | The options that are only switches: the argument after them is **not** their value. For example `v, verbose`. |
| **Numbers as numbers** (`numbers`) | yes/no | yes | A value that is a number (`8080`, `-3`, `2.5`, `1e3`) comes out as a number; switched off, everything stays text. It applies to the options and to the positional arguments, never to **all**. |

## How it reads the options

| Written like this | Becomes |
|---|---|
| `--port=8080` | `port: 8080` |
| `--port 8080` | `port: 8080` (the argument after it is its value, if it does not start with `-`) |
| `--verbose` followed by another option or by nothing | `verbose: true` |
| `--verbose report.csv`, with `verbose` among the **Options without a value** | `verbose: true` and `report.csv` among the positional ones |
| `--no-color` | `color: false` |
| `-v` | `v: true` (or the value after it, as with `--`) |
| `-abc` | `a: true, b: true` and `c` as `-c` (true, or the value after it) |
| `-n5`, `-n=5` | `n: 5` |
| `--tag a --tag b` | `tag: ["a", "b"]` (an option given more than once becomes a list) |
| `-3` | a positional (a negative number is not an option) |
| `--` | everything that follows is positional, even if it starts with `-` |

Without the **Options without a value**, `--verbose report.csv` reads `report.csv` as the value of `verbose`: it is how almost all programs that do not know which options exist do it. List them, or use [Option](core.option), which knows.

The names `__proto__`, `constructor` and `prototype` never become options.

## How it works

- The arguments do not change while the program runs: the block always sends the same values.
- Without arguments (the program started from the IDE without **Arguments**, from an app or as an active program without arguments) an empty list, an empty object and 0 come out.
- They only reach programs started with arguments: `lilos logic run` from the command line, `lilos logic run --active` for an active program that keeps them also after a restart, and the tests of the IDE. Apps made with [Create app](ide/create-app) and programs activated from the IDE start without them.

## Examples

### 1. A file to process and an option

```
lilos logic run Documenti/report.lsch vendite.csv --separatore=";"

[Arguments (argv)] positional ──▶ object [Get property: 0] value ──▶ value [Print (console.log)]
[Arguments (argv)] options    ──▶ object [Get property: separatore] value ──▶ value [Print (console.log)]
```

The console writes `vendite.csv` and `;`.

### 2. Everything that arrived

```
[Arguments (argv)] all ──▶ value [Print (console.log)]
```

With `lilos logic run prova.lsch -v "a text with spaces"` the console writes `["-v","a text with spaces"]`: the shell removes the quotes, the spaces stay inside the argument.

## Errors

None: the block always reads something. For required options and values that must be numbers use [Option](core.option), which gives an Exception.

## See also

- [Option (-x · --name)](core.option)
- [Exit (close the program · return)](core.exit)
- [Test and active programs](ide/run), for the **Arguments** button
- [Programs](logicstudio-engine/programs), for `lilos logic run`
