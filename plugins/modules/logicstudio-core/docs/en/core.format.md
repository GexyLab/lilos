# Template string

`core.format` · Text · [Core blocks](logicstudio-core) · version 1

Builds a text from a template with placeholders in braces, like `Hello {name}, you are {age} years old`: each placeholder is replaced with the value of the input that has the same name.

## Inputs

| Port | Type | Description |
|---|---|---|
| (the added inputs) | any | The values of the placeholders: each input fills the placeholder with its name. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **text** (`text`) | text | The template with the placeholders replaced. |
| **Exception** (`error`) | object | In practice this block never sends anything here. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Template** (`template`) | a text (up to 2000 characters) | `{a}` | The text to produce, with the placeholders in braces: `{name}`. |

## Added ports

The block starts **with no inputs**: add one input for each placeholder in the **Properties**, **Ports** section, with **Add input**. You can have up to 16 (fewer, if an administrator has lowered the limit of added ports), of type any. At first they are named **placeholder 1**, **placeholder 2**… (in an Italian IDE **segnaposto 1**…): **rename them** in the Properties with the name you use in the template, for example `name` and `age`. The name can be up to 60 characters long; spaces at the start and at the end are removed. They show in italics on the block. See [How a block works](ide/blocks).

Note: the default template is `{a}`, but the first added input is named **placeholder 1**. Rename the input to `a`, or change the template to `{placeholder 1}`; otherwise the text `{a}` comes out as it is.

## How it works

Every time a value arrives on an input, the block starts again from the **Template** and replaces every placeholder:

- A **placeholder** is a text between `{` and `}` that contains no other braces: `{name}`, `{placeholder 1}`, `{price €}`.
- If there is an input with **exactly** that name (upper case and spaces included: `{ name }` is not `{name}`), the placeholder is replaced with its last value, written as text.
- If there is no input with that name, the placeholder **stays as it is**, braces included: `{x}` stays `{x}`. `{}` also stays as it is.
- The same placeholder can appear several times: it is replaced every time.
- An input that has not received anything yet is an **empty text**: with `Hello {name}, you are {age} years old` and only **name** = Ada, `Hello Ada, you are  years old` comes out (with two spaces).

How values are written:

| Value | Written as |
|---|---|
| a text | as it is |
| a number | with the dot and all the decimals: 36.5 → `36.5`; 0.1 + 0.2 → `0.30000000000000004` |
| yes / no | `true` / `false` |
| `null` | empty text |
| an object or a list | compact JSON: `{"a":[1]}`, `[1,2]` |

Other things to know:

- Without added inputs the block **never starts**, so it sends nothing (not even a template without placeholders). For a fixed text use the [Constant · Variable](core.value) block with kind text.
- There is no way to write a "real" brace in place of a placeholder that has an input with that name.
- The template is written in a one-line field: you cannot start a new line.
- To write a number with a comma or with a certain number of decimals, prepare it first: round it with the [Math functions](core.math) block and, if you need the comma, pass it through the [String functions](core.text) block with **replace** `.` with `,`.

## Examples

### 1. A greeting

Template `Hello {name}, you are {age} years old`; two inputs renamed `name` and `age`:

```
[Text field: name]    text  ──▶ name [Template string] text ──▶ text [Label: greeting]
[Number field: age]   value ──▶ age
```

With name `Ada` and age 36 the [Label](ui.label) shows `Hello Ada, you are 36 years old`. Every change to one of the two fields updates the text.

### 2. A log line

Template `[{time}] {level}: {message}`; three inputs. Give **level** the initial value `INFO` and remove "starts it" from **time** and **level**: the block starts only when a **message** arrives.

With time `10:30`, level `INFO` and message `started`, `[10:30] INFO: started` comes out.

### 3. Odd values

Template `Total: {t} {unit} {note}`, inputs **t** and **unit** (no input **note**):

- **t** = 12.5, **unit** = `€` → `Total: 12.5 € {note}`;
- **t** = `null` → `Total:  € {note}`;
- **t** = a list `[1,2]` → `Total: [1,2] € {note}`.

## Errors

This block has no errors of its own.

## See also

- [Concat text](core.concat) to join texts one after the other, with a separator
- [String functions](core.text) for upper case, spaces, replacements
- [Cast to text (String())](core.toText) to turn a value into text, and [Cast to JSON text (JSON.stringify)](core.toJson) to write it as JSON text
- [Join](coll.join) for the items of a list
- [How a block works](ide/blocks)
