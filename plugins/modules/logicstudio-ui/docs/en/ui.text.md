# Text field

`ui.text` · Commands · [Standard UI components](logicstudio-ui) · version 1

A field where the user types a line of text. It sends the text when the user has finished typing, and an **enter** pulse when they press Enter.

## Properties

| Property | Values | Default | Description |
|---|---|---|---|
| **Label** | text (translatable) | empty | Text above the field. |
| **Placeholder** | text (translatable) | empty | Gray text inside the empty field, which disappears as soon as the user types (for example «first and last name»). |
| **Hide what is typed** | yes/no | no | Shows dots in place of the letters, for passwords. |

The field always opens empty: there is no property for an initial text (use the **text** input with an at start value).

## Ports of its object in the schema

### Inputs

| Port | Type | Description |
|---|---|---|
| **text** (`value`) | text | Replaces the text in the field, without the field sending anything. |
| **enabled** (`enabled`) | yes/no | `false` makes it lighter and it can no longer be typed in. See [Standard UI components](logicstudio-ui). |
| **visible** (`visible`) | yes/no | `false` hides it. |

### Outputs

| Port | Type | Description |
|---|---|---|
| **text** (`value`) | text | The text of the field, when the user **confirms** a change: presses Enter or leaves the field. |
| **enter** (`enter`) | pulse | Every time the user presses **Enter** in the field. The value is `true`. |
| **Exception** (`error`) | object | Like every block; for this component nothing goes through it today. |

## How it works

**The field does not send at every letter.** While the user types, nothing starts. The text goes out on **text** when the change is confirmed:

- the user presses **Enter**;
- or leaves the field (with **Tab**, or by clicking elsewhere, for example on a button).

If the text has not changed since the last confirmation, **text** sends nothing.

**Enter** does two things, in this order:

1. if the text has changed, it sends it on **text**;
2. it sends `true` on **enter**, **always**, even if the text has not changed or is empty.

After Enter the field loses the keyboard focus (the user must click again to type more).

This way you can use **enter** as a «Send» without a button: when it arrives, the last text has already arrived before.

**The text can be empty**: if the user deletes everything and leaves the field, it sends `""`.

**From the schema**, a value on **text** replaces what is in the field (a number or an object is shown as text, `null` empties the field). Beware: the field is redrawn, and **if the user is typing, it loses what they have not confirmed and the keyboard focus**. Do not send values to the field while the user is using it (for example do not link its **text** output to its **text** input).

## Examples

### 1. A minimal chat

```
Window «Messages»
└ Column (root)
  ├ Console     console1  Height 200
  └ Text field  text1     Placeholder «Type and press Enter»
```

```
[Text field: text1] text  ──▶ value [If] then ──▶ value [Write to console]
[Text field: text1] enter ──▶ condition [If]
```

In the [If](core.if) remove «starts it» from **value**: the If starts with **enter** (always `true`) and sends to the console the last confirmed text. So the user types, presses Enter and the line appears in the console. To empty the field after sending, also link **then** to an empty-text [Value](core.value) (with **Send at start** off) and that one to the **text** input of the field:

```
[If] then ──▶ send [Value: «»] value ──▶ text [Text field: text1]
```

### 2. A password to unlock

```
Window «Login»
└ Column (root)
  ├ Text field  text1    Label «Password»  Hide what is typed yes
  ├ Button      button1  Text «Enter»
  └ Label       label1   Text «»
```

```
[Text field: Password] text ──▶ a [Compare: a = b] result ──▶ condition [If] then ──▶ send [Value: «Welcome!»]       value ──▶ text [Label: label1]
[Value: «secret»] value ──▶ b                                                else ──▶ send [Value: «Wrong password.»] value ──▶ text [Label: label1]
[Button: Enter]            pressed ──▶ value [If]
[Text field: Password]     enter   ──▶ value [If]
```

In the [If](core.if) remove «starts it» from **condition**: the If starts when the user presses **Enter** (the button) or Enter in the field, with the last result of the comparison. Clicking the **Enter** button makes the field lose the focus and confirm the password **before** the click, so the comparison is already up to date. The two Values of the messages have **Send at start** off.

> This is only an example: a password written in a [Value](core.value) block can be read by opening the project.

## Accessibility and keyboard

- It is a real text field: you reach it with **Tab**; **Enter** confirms and sends **enter**.
- The **Label** above is not linked to the field: the screen reader reads the placeholder (if there is one) but not the name of the field. For this reason it is useful to also write a **Placeholder**.
- The spell checker of the browser is off in the field.

## See also

- [Number field](ui.number), for numbers
- [Read from console](core.consoleRead), to ask a question and wait for the answer
- [Format text](core.format), [Text operation](core.text)
- [Standard UI components](logicstudio-ui)
