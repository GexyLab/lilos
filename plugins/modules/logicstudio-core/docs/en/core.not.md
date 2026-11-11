# NOT

`core.not` · Logic · [Core blocks](logicstudio-core) · version 1

Flips a yes/no: it sends **no** when it receives yes, and **yes** when it receives no.

## Inputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | yes/no | The value to flip. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | yes/no | The opposite of the value. |
| **Exception** (`error`) | object | In practice this block never sends anything here. |

## How it works

At every value that arrives, the block reads it as yes/no and sends the opposite.

| Value that arrives | Read as | result |
|---|---|---|
| `true` (yes), a pulse | yes | no |
| `false` (no) | no | yes |
| `0` | no | yes |
| `5`, `-1` | yes | no |
| `""`, `"0"`, `"false"`, `"no"`, `"off"`, `" OFF "` | no | yes |
| `"sì"`, `"on"`, `"ciao"`, `"0.0"`, `"falso"` | yes | no |
| `null` | no | yes |
| `[]`, `{}` (even empty) | yes | no |

For texts: with spaces at the sides removed and ignoring case, only empty, `0`, `false`, `no` and `off` are **no**. The Italian word `falso` is **yes**.

## Examples

### 1. A button enabled only when the program is stopped

```
[Switch: running] value ──▶ value [NOT] result ──▶ enabled [Button: Configure]
```

When the [Switch](ui.toggle) is on, the **Configure** [Button](ui.button) is disabled; when it is off, it can be pressed.

### 2. "If not…"

```
[Compare: level > 10] result ──▶ value [NOT] result ──▶ condition [If]
```

The [If](core.if) takes the **then** path when the level is **not** above 10. (You get the same result by choosing `a ≤ b` in [Compare](core.compare).)

### 3. A text

`"no"` arrives → it sends **yes**. `"No grazie"` arrives → it sends **no** (it is a text different from `no`, so it counts as yes).

## Errors

This block has no errors of its own.

## See also

- [AND](core.and), [OR](core.or), [XOR](core.xor)
- [Convert](core.convert) to turn a value into yes/no without flipping it
- [How a block works](ide/blocks)
