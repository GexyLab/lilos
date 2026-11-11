# Selection

`ui.select` · Commands · [Standard UI components](logicstudio-ui) · version 1

A drop-down menu: the choice made is shown, and a click opens the list of options. It suits many choices in little space.

## Properties

| Property | Values | Default | Description |
|---|---|---|---|
| **Label** | text (translatable) | empty | Text above the menu. |
| **Options (comma separated)** | text (translatable) | «One, Two» | The options, in order: `Milan, Rome, Naples`. Spaces around the commas are removed; empty items are skipped. |
| **Chosen at the start** | text | empty | The option shown when the window opens, written as in the Options. Empty: the **first** option. |

## Ports of its object in the schema

### Inputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | text | Shows the option with that value, without the Selection sending anything. |
| **options** (`options`) | list | Replaces the options. |
| **enabled** (`enabled`) | yes/no | `false` makes it lighter and it can no longer be opened. See [Standard UI components](logicstudio-ui). |
| **visible** (`visible`) | yes/no | `false` hides it. |

### Outputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | text | When the user chooses an option **different** from the one shown: its value. |
| **Exception** (`error`) | object | Like every block; for this component nothing goes through it today. |

## How it works

**The options** are written and sent as in the [Option buttons](ui.radios): a list of texts, a list of objects `{ "value": …, "label": … }` (`label` is shown, `value` goes to the schema), or a text with commas. Numbers become text. **The value that comes out is always a text.**

**The Selection always shows an option.** Without **Chosen at the start** it shows the first one. This has an important consequence:

> **Choosing the option already shown sends nothing.** If «Milan» is shown when opened and the user wants it, there is no way to send it: the Selection sends something only when the choice **changes**. If the schema must know the choice even when the user does not change it, either give it the same initial value with a [Constant · Variable](core.value) block, or put as the first option an invitation such as `— choose —` and check in the schema that it is not that one.

**From the schema.** A value on **value** shows the option with that value (compared as text). If no option has that value, the menu shows the first option, even if the schema had asked for another. When new **options** arrive, the one with the same value as before stays shown, if it is still there, otherwise the first.

**When opened** the program receives nothing.

## Examples

### 1. Choosing a city

```
Window «Weather»
└ Column (root)
  ├ Selection  select1  Label «City»  Options «— choose —, Milan, Rome, Naples»
  └ Label      label1   Text «»
```

```
[Selection: City] value ──▶ a [Compare (== != < >): a ≠ b] result ──▶ condition [If · Else] then ──▶ name [Template string: «You chose {name}»] text ──▶ text [Label: label1]
[Constant · Variable: «— choose —»] value ──▶ b [Compare (== != < >)]
[Selection: City] value ──▶ value [If · Else]
```

In the [If · Else](core.if) block remove «starts it» from **value**: the block starts when the condition arrives, with the last city chosen. When opened you see «— choose —». Choosing «Rome» the label says «You chose Rome»; if the user goes back to «— choose —», the [Compare (== != < >)](core.compare) gives `false` and the label does not change.

### 2. Options from a folder

```
Window «Open»
└ Column (root)
  ├ Selection  select1  Label «Report»  Options «»
  └ Button     button1  Text «Open»
```

```
[On start (main)] pulse ──▶ read [readdir (list folder): ~/Reports  show files only] names ──▶ options [Selection: Report]
[Selection: Report] value ──▶ name [Template string: «~/Reports/{name}»] text ──▶ path [readFile]
[Button: Open] pressed ──▶ read [readFile]
```

At the start the Selection fills with the names of the files of the folder. In the [readFile](lilos.fileRead) the **path** input does not start the block (this is the default): the file is read when the user presses **Open**.

> Beware: if the user presses **Open** without changing the Selection, the path has not arrived yet (see above). To avoid this, put an invitation at the head of the options, or use a [List](ui.list), which shows no choice until the user makes one.

## Accessibility and keyboard

- It is a real drop-down menu: you reach it with **Tab**; the **arrow keys** change the choice (and every change sends the value), **Alt+down arrow** or **Space** opens the list, letters jump to the option that starts that way. The exact behavior depends on the browser.
- The **Label** above is not linked to the menu: the screen reader reads the choice but not the name of the field.
- When the schema sends a value or new options, the menu is redrawn and, if it had the keyboard focus, it loses it.

## See also

- [Option buttons](ui.radios), [List](ui.list)
- [Switch · Case](core.switch)
- [Standard UI components](logicstudio-ui)
