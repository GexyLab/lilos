# Option (-x · --name)

`core.option` · Program · [Core blocks](logicstudio-core) · version 1

Reads **one option** of the command-line arguments, with its short name (`-o`) and long name (`--output`): if it is there, its value, converted to the type you want. It is like a line of `argparse` or `getopt`: one block for each option of the program.

## Inputs

| Port | Type | Description |
|---|---|---|
| **send** (`send`) | pulse | Hidden by default. If it is not linked the block sends **once, at start**; if it is linked, at every pulse. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | any | The value of the option (see **Value**); if it is not there, **When it is not given**. |
| **given** (`present`) | yes/no | Whether the option is on the command line. |
| **Exception** (`error`) | object | A required option that is missing, a value that is not a number, an option without its value. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Short name** (`short`) | one letter (or empty) | empty | `o` stands for `-o`. Dashes written in front are removed. |
| **Long name** (`long`) | a name (or empty) | `output` | `output` stands for `--output`. At least one of the two names is needed. |
| **Kind** (`kind`) | Flag, With a value, Repeatable | With a value | **Flag, yes/no**: it is there or it is not (`-v`, `--verbose`), yes/no comes out. **With a value**: `-o FILE`, `-oFILE`, `--output FILE`, `--output=FILE`; the last one given comes out. **Repeatable, a list**: like With a value, but all of them come out in a list (`-I a -I b` → `["a","b"]`). |
| **Value** (`type`) | Text, Number, Yes/no | Text | Only for With a value and Repeatable: how to convert the value. A **Number** accepts the comma (`2,5`); a **Yes/no** is no for `0`, `false`, `no`, `off` and empty. |
| **When it is not given** (`default`) | text | empty | The value if the option is missing, converted like the others. Empty: `null` comes out (a Flag: no; a Repeatable: an empty list). For a Repeatable you write several values separated by commas. |
| **Required** (`required`) | yes/no | no | If it is missing, an Exception comes out instead of the values. |

## How it reads the line

- `--output=FILE` and `--output FILE`: the argument after it is always the value, even if it starts with `-`.
- `-o FILE`, `-oFILE` and `-o=FILE` for the short name. In a group like `-vo FILE` the letters before `o` are other switches.
- For a **Flag**: `--verbose` is yes, `--no-verbose` is no, `--verbose=false` is no; `-v` (also inside `-xv`) is yes.
- Everything that comes after `--` is not read: those are positional arguments.
- The block does not know the other options: in `-ofile` it also sees the letters `f`, `i`, `l`, `e`. If the program has short switches and options with a value, write the values apart (`-o file`) or with the long name.

## How it works

- The arguments come from `lilos logic run FILE ARGUMENTS…` or, in the tests, from the **Arguments** button of the IDE (see [Arguments (argv)](core.args)).
- **value** and **given** come out together, once at start (or at every pulse on **send**).

## Examples

### 1. A name with a default value

Settings: Short name `n`, Long name `name`, Kind With a value, When it is not given `mondo`.

```
[Option: --name] value ──▶ nome [Template string: "Ciao {nome}"] text ──▶ value [Print (console.log)]
```

| Command line | The console writes |
|---|---|
| `lilos logic run ciao.lsch` | `Ciao mondo` |
| `lilos logic run ciao.lsch --name Eugenio` | `Ciao Eugenio` |
| `lilos logic run ciao.lsch -n=Anna` | `Ciao Anna` |

### 2. A required port and a flag

Two blocks: **Option** `--port` (With a value, Number, Required) and **Option** `-v` / `--verbose` (Flag).

```
[Option: --port]    value     ──▶ …
[Option: --port]    Exception ──▶ exception [Exception data (e.message…)] message ──▶ value [Print (console.log): error] written ──▶ close [Exit (close the program · return): 2]
[Option: --verbose] value     ──▶ condition [If · Else] …
```

On [Exit](core.exit) show **close** with the eye and set **Value when none arrives** to 2. Without `--port` the program writes «Manca l'opzione obbligatoria --port» (the required option --port is missing), on the error output with `lilos logic run`, and closes with code 2, like programs that complain about wrong usage; with `--port abc` it writes «--port: «abc» non è un numero» (--port: «abc» is not a number) and does the same.

## Errors

| Message | When |
|---|---|
| Manca l'opzione obbligatoria *--name* (the required option --name is missing) | **Required** on and the option is not there. |
| *--name*: «*text*» non è un numero («text» is not a number) | **Number** value and the value given is not one. |
| L'opzione *--name* vuole un valore (the option --name wants a value) | The option is the last argument, or is followed by `--`, and has no value. |
| Dai all'opzione un nome corto o un nome lungo (give the option a short name or a long name) | Both names are empty. |
| Il nome corto è una lettera sola, come -o (the short name is a single letter, like -o) | **Short name** has more than one letter. |

## See also

- [Arguments (argv)](core.args), for all the arguments and the positional ones
- [Exit (close the program · return)](core.exit)
- [Programs](logicstudio-engine/programs), for `lilos logic run`
