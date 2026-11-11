# Compare (== != < >)

`core.compare` · Logic · [Core blocks](logicstudio-core) · version 1

Compares two values (equal, different, greater, less…) and says whether the comparison is true: with a yes/no and with a pulse on **if true** or on **if false**.

## Inputs

| Port | Type | Description |
|---|---|---|
| **a** | any | The first value. |
| **b** | any | The second value. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | yes/no | **yes** if the comparison is true, **no** if it is false. |
| **if true** (`true`) | pulse | A pulse when the comparison is true. |
| **if false** (`false`) | pulse | A pulse when the comparison is false. |
| **Exception** (`error`) | object | In practice this block never sends anything here. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Operation** (`op`) | `a = b`, `a ≠ b`, `a > b`, `a ≥ b`, `a < b`, `a ≤ b` | `a > b` | The comparison to make. |

Note: the default operation is **a > b**, not "equal".

## How it works

Every time a value arrives on **a** or on **b**, the block compares the last value of **a** with the last of **b** and sends, in this order:

1. the result on **result** (yes or no);
2. a pulse on **if true** or on **if false** (never on both).

It sends them at every comparison, even if the result has not changed.

### Comparing numbers or texts

How the comparison is made depends on what arrives:

- **If at least one of the two is a number** (a real number, not a text with digits), both are read as numbers and compared as numbers. The reading rules are those of [Add (+)](core.add): `"2,5"` is 2.5, `true` is 1, `null` and `""` are 0.
- **Otherwise** both are read as texts and compared as texts.

Comparing as texts means **letter by letter**, like in the dictionary but with computer rules:

- `"10"` is **less** than `"9"` (`1` is compared with `9` first). If your numbers arrive as text (for example from a [Text field](ui.text)), go through [Cast to number (Number())](core.toNumber) first.
- Upper case counts and comes before lower case: `"Z"` < `"a"`; `"Roma"` ≠ `"roma"`.
- Accented letters come after all the letters without accent: `"è"` > `"z"`.
- Spaces count: `"ciao "` ≠ `"ciao"`.
- `null` is the empty text `""`; yes/no are `"true"`/`"false"`; objects and lists are written as JSON (so two objects are equal if they have the same fields **in the same order**).

### Edge cases

| a | b | How they are compared | a = b |
|---|---|---|---|
| 10 | `"9"` | numbers: 10 and 9 | no |
| `"10"` | `"9"` | texts | no (and `a < b` is **yes**) |
| 5 | `"abc"` | numbers: `"abc"` is not a number | no (with a value that is not a number, every comparison is **no**, except `a ≠ b` which is **yes**) |
| `null` | 0 | numbers: `null` is 0 | yes |
| `true` | 1 | numbers: `true` is 1 | yes |
| `true` | `"true"` | texts | yes |
| `{"x":1}` | `{"x":1}` | JSON texts | yes |
| 3 | (never arrived) | numbers: the missing value is 0 | no (and `a > b` is **yes**) |
| `"ciao"` | (never arrived) | texts: the missing value is `""` | no |

An input that has not received anything yet **counts**: it is 0 if the other is a number, an empty text otherwise. To avoid half comparisons, give **b** an initial value, or remove "starts it" from the input that must not start the comparison. See [How a block works](ide/blocks).

## Examples

### 1. A fixed threshold

Operation `a > b`; on **b** the initial value `30` and "starts it" removed:

```
[Slider: temperature] value ──▶ a [Compare (== != < >): a > b] result ──▶ on [Lamp: hot]
```

With the slider at 25 the [Lamp](ui.lamp) is off (**no**); at 31 it turns on (**yes**). At every movement a pulse also goes out on **if true** or **if false**.

### 2. Do a different thing in the two cases

```
[Number field: age] value ──▶ a [Compare (== != < >): a ≥ b] if true  ──▶ send [Constant · Variable: "Welcome"]
                                                  if false ──▶ send [Constant · Variable: "Access denied"]
```

With **b** initially `18`: if the user writes 20, **if true** goes off and the first [Constant · Variable](core.value) sends `Welcome`; if they write 15, **if false** goes off.

### 3. An equal word

Operation `a = b`, **b** initially `"stop"` (written `stop` in the **initial** field):

- `"stop"` arrives → **yes**;
- `"Stop"` arrives → **no** (upper case counts). To ignore case, go through [String functions](core.text) with **lower case** first.

### 4. The trick of numbers as text

**a** = `"100"` and **b** = `"20"` both arrive as text from two text fields. With `a > b` the result is **no** (`"1"` comes before `"2"`). Putting a [Cast to number (Number())](core.toNumber) on each, the result becomes **yes**.

## Errors

This block has no errors of its own.

## See also

- [If · Else](core.if) to send a value one way or the other
- [Switch · Case](core.switch) to compare a value with many cases
- [Clamp](core.clamp) to keep a number between a minimum and a maximum
- [AND](core.and), [OR](core.or), [NOT](core.not)
- [How a block works](ide/blocks)
