# Checkbox

`ui.checkbox` · Commands · [Standard UI components](logicstudio-ui) · version 1

A box with its text next to it, checked or not. When the user changes it, it sends the new state to the schema; the schema can also check it or uncheck it.

## Properties

| Property | Values | Default | Description |
|---|---|---|---|
| **Label** | text (translatable) | «Box» | The text next to the box. A click on the text also changes the check. |
| **Checked at the start** | yes/no | no | How the box looks when the window opens. |

## Ports of its object in the schema

### Inputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | yes/no | Checks or unchecks the box, without the box sending anything. |
| **enabled** (`enabled`) | yes/no | `false` makes it lighter and it can no longer be changed. See [Standard UI components](logicstudio-ui). |
| **visible** (`visible`) | yes/no | `false` hides it. |

### Outputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | yes/no | When the user changes it: `true` if it is now checked, `false` if it is not. |
| **Exception** (`error`) | object | Like every block; for this component nothing goes through it today. |

## How it works

**The user** changes it with a click on the box or on its text, or with **Space** when it has the focus. At every change the box immediately sends `true` or `false`.

**The schema** changes it with the **value** input, and in that case the box sends **nothing**. As for the [Switch](ui.toggle), the check is there only with `true`, the text `"true"` or the number `1`; any other value (even the text `"1"` or `"sì"`) removes it.

**When opened** the state of **Checked at the start** is shown, but the program does not receive it until the user changes the box. If a schema needs to know it, give it the same value with a [Value](core.value) block.

The only difference from the Switch is in the look: the Checkbox shows its text, the Switch does not. Usually the checkbox is used for a choice to be confirmed later (in a form), the switch for something that has an effect at once.

## Examples

### 1. I accept the terms

```
Window «Sign-up»
└ Column (root)
  ├ Checkbox  checkbox1  Label «I have read and accept the terms»
  └ Button    button1    Text «Send»
```

The button must work only with the box checked. Give the **enabled** input of the object of the button the **at start** value `false`, then:

```
[Checkbox: I have read…] value ──▶ enabled [Button: Send]
```

At the start the button is off; checking the box turns it on, unchecking it turns it off again.

### 2. Several options in one object

```
Window «Export»
└ Column (root)
  ├ Checkbox  checkbox1  Label «Include the notes»
  ├ Checkbox  checkbox2  Label «Include the images»
  └ Button    button1    Text «Export»
```

```
[Value: no] value ──▶ notes     [Build object] object ──▶ value [Write to console]
[Value: no] value ──▶ images
[Checkbox: Include the notes]  value ──▶ notes
[Checkbox: Include the images] value ──▶ images
[Button: Export] pressed ──▶ export
```

In the [Build object](core.compose) add the fields **notes**, **images** (without «starts it») and **export**. The two yes/no [Values](core.value) give the initial state (`false`), so the field is there even if the user does not touch the box. Pressing **Export**, the console shows for example `{"notes":true,"images":false,"export":true}`.

## Accessibility and keyboard

- It is a real checkbox, with its text linked: you reach it with **Tab**, change it with **Space**, and the screen reader reads the text and the state.
- When the schema changes it, the box is redrawn and, if it had the keyboard focus, it loses it.

## See also

- [Switch](ui.toggle)
- [Option buttons](ui.radios), for a choice among several possibilities
- [Build object](core.compose)
- [Standard UI components](logicstudio-ui)
