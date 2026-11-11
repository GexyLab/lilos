# Exit (close the program · return)

`core.exit` · Program · [Core blocks](logicstudio-core) · version 1

**Closes the whole program** and returns a value, like `process.exit(code)` or the `return` of `main()`. Launched with `lilos logic run`, a whole number from 0 to 255 becomes the **exit code** of the command; any other value is written on the output.

## Inputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | any | The value to return. If **close** is not linked, a value that arrives here closes the program at once. |
| **close** (`close`) | pulse | Hidden by default (show it with the eye in the Properties). If it is linked, **value** waits and the program closes at the pulse, with the last value that arrived on **value** (or **Value when none arrives**). |

## Outputs

| Port | Type | Description |
|---|---|---|
| **Exception** (`error`) | object | As in every block; it comes out only if the engine is older than 1.6.0 and cannot close a program. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Kind** (`kind`) | number, text, yes/no, JSON | number | The type of **Value when none arrives**. |
| **Value when none arrives** (`value`) | text | `0` | The value returned when the program closes with **close** and nothing has arrived on **value** (or **value** is not linked). |

## How it works

- The program closes **entirely**, with all its schemas: the blocks stop, the questions waiting are cancelled, the windows opened by the program close as when you stop it. The program is shown as **stopped** (not in error).
- Only **the first** Exit counts: if two Exit blocks receive something together, the second changes nothing.
- An Exit inside a [group](ide/groups), even in a separate thread, closes the whole program.
- A value longer than 64 KB (in JSON) is cut and returned as text.
- With no link the block does nothing.

### The returned value

| The program is | The value goes |
|---|---|
| launched with `lilos logic run` | A whole number from 0 to 255 becomes the exit code and is not written. `true` and `null` give 0, `false` gives 1. A text is written as it is, any other value (numbers with decimals, objects, lists) in JSON; the code is 0. With `-q` nothing is written. |
| a test of the IDE | The status bar says «Closed by the program with the value …» until the next test. |
| an active program or an app | It stops; the value can be read in the program (field `result`), for those who use the engine API. An active program closed by Exit **does not restart** when lilOS restarts. |

## Examples

### 1. An exit code for a script

```
[Compare (== != < >): a > b] if true  ──▶ send [Constant · Variable: 1] value ──▶ value [Exit]
[Compare (== != < >): a > b] if false ──▶ send [Constant · Variable: 0] value ──▶ value [Exit]
```

From a terminal of the computer, `lilos logic run controllo.lsch && echo all good` writes «all good» only if the comparison is false (code 0).

### 2. Closing after the last line

```
[Print (console.log)] written ──▶ close [Exit: 0]
```

Show **close** with the eye and link it to the **written** output of [Print](core.consoleWrite): the program closes only after writing its last line, with 0.

### 3. Returning a result

```
[Input (readline): "How old are you?", number] value ──▶ value [Exit]
```

`lilos logic run domanda.lsch` asks the age in the terminal and exits with that number as the code (42 → `echo $?` writes 42). With an object, for example from [Object literal { }](core.compose), the command writes its JSON.

## Errors

| Message | When |
|---|---|
| Questo motore non sa chiudere un programma con un valore (this engine cannot close a program with a value) | The [Logic Studio Engine](logicstudio-engine) is older than 1.6.0. |

## See also

- [Arguments (argv)](core.args) and [Option (-x · --name)](core.option)
- [Programs](logicstudio-engine/programs): `lilos logic run`, the exit codes
- [Test and active programs](ide/run)
