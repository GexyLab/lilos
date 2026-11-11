# On change (edge)

`core.edge` · Logic · [Core blocks](logicstudio-core) · version 1

Watches a yes/no that arrives several times and sends a pulse only when it **changes**: on **becomes true** when it goes from no to yes, on **becomes false** when it goes from yes to no.

## Inputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | yes/no | The yes/no to watch. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **becomes true** (`rise`) | pulse | A pulse when the value goes from no to yes. |
| **becomes false** (`fall`) | pulse | A pulse when the value goes from yes to no. |
| **Exception** (`error`) | object | In practice this block never sends anything here. |

## How it works

The block remembers the last value received (read as yes/no). At every new value:

- if it is the same as the previous one, it sends nothing;
- if it went from no to yes, it sends a pulse on **becomes true**;
- if it went from yes to no, it sends a pulse on **becomes false**.

Things to know:

- The **first** value that arrives sends nothing: the block does not know yet how it was before. If you want a first yes to count as a change, give the input the initial value `false` in the **Properties**.
- Values are read as yes/no: a text is **no** if, once spaces are removed and ignoring case, it is empty, `0`, `false`, `no` or `off` (any other text is **yes**, even `"falso"`); a number is **no** if it is 0; `null` is **no**; objects and lists are **yes**. So `true`, `1` and `"sì"` are the same value: going from `true` to `"sì"` is not a change.
- The memory of the last value starts from zero at every start of the program.

## Examples

### 1. A notification when the temperature goes over the threshold

```
[Compare (== != < >): temperature > 30] result ──▶ value [On change (edge)] becomes true  ──▶ send [Notify: Too hot]
                                                     becomes false ──▶ send [Notify: All fine]
```

The [Compare (== != < >)](core.compare) block sends yes or no at every measure, maybe every second. Without the On change block you would get a notification at every measure above 30 degrees; with the On change block, just one when the temperature goes over 30 and one when it goes back under.

### 2. A sequence of values

They arrive, in order: `false`, `false`, `true`, `"sì"`, `"no"`, `0`, `1`.

| Arrives | Read as | Before | Sends |
|---|---|---|---|
| `false` | no | (nothing) | nothing: it is the first |
| `false` | no | no | nothing |
| `true` | yes | no | **becomes true** |
| `"sì"` | yes | yes | nothing |
| `"no"` | no | yes | **becomes false** |
| `0` | no | no | nothing |
| `1` | yes | no | **becomes true** |

### 3. Count how many times it turns on

```
[Switch: pump] value ──▶ value [On change (edge)] becomes true ──▶ up [Counter (++ −−)] count ──▶ value [Value: turn-ons]
```

The [Counter (++ −−)](core.counter) block goes up by 1 every time the pump turns on, not every time the switch sends its state.

## Errors

This block has no errors of its own.

## See also

- [Compare (== != < >)](core.compare) to get the yes/no to watch
- [Counter (++ −−)](core.counter) to count the changes
- [Debounce](core.debounce) to ignore changes that are too fast
- [How a block works](ide/blocks)
