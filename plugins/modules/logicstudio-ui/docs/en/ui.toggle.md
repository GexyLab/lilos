# Switch

`ui.toggle` · Commands · [Standard UI components](logicstudio-ui) · version 1

A toggle switch, on or off. When the user moves it, it sends the new state to the schema; the schema can also move it.

## Properties

| Property | Values | Default | Description |
|---|---|---|---|
| **Label** | text (translatable) | «Switch» | The name of the switch for screen readers. **Today it is not shown** in the window (see below). |
| **On at the start** | yes/no | no | How the switch looks when the window opens. |

## Ports of its object in the schema

### Inputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | yes/no | Turns the switch on or off, without it sending anything. |
| **enabled** (`enabled`) | yes/no | `false` makes it lighter and it can no longer be moved. See [Standard UI components](logicstudio-ui). |
| **visible** (`visible`) | yes/no | `false` hides it. |

### Outputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | yes/no | When the user moves it: `true` if it is now on, `false` if it is off. |
| **Exception** (`error`) | object | Like every block; for this component nothing goes through it today. |

## How it works

**The user** moves it with a click, or with **Space** / **Enter** when it has the focus. At every move the switch immediately sends `true` or `false` on the **value** output.

**The schema** moves it with the **value** input, and in that case the switch sends **nothing** on the output. The input turns it on only with these values:

| Arrives | The switch |
|---|---|
| `true`, the text `"true"`, the number `1` | on |
| anything else: `false`, `0`, `"1"`, `"sì"`, `"on"`, `null` | off |

> Beware: the **text** `"1"` and the text `"sì"` turn it **off**. If the value comes from a file or from a text, first pass it through [Cast to yes/no (Boolean())](core.toBool).

**When opened** the state of **On at the start** is shown, but the program does not receive it: the output sends something only when the user moves it. If a schema needs to know the initial state, give it the same value with a [Constant · Variable](core.value) block. With the option «A window opened again shows the last values at once», when you reopen the window the switch shows the last state (of the user or of the schema).

**The label is not shown.** The switch draws only the toggle: the text of the **Label** is only for screen readers. For a visible text, put the switch in a [Row](ui.row) with a [Label](ui.label) next to it, or use a [Checkbox](ui.checkbox), which shows its text.

## Examples

### 1. Turning on a lamp

```
Window «Living room»
└ Column (root)
  └ Row  Alignment center
    ├ Switch  toggle1  Label «Light»
    └ Label   label1   Text «Light»
```

```
[Switch: Light] value ──▶ data [Emit (event to lilOS): light.livingroom]
```

Every time the user moves the switch, lilOS receives the event `light.livingroom` with `true` or `false`.

### 2. A program that stops and restarts

```
Window «Collection»
└ Column (root)
  ├ Switch  toggle1  Label «Collection active»  On at the start yes
  └ Value   value1   Label «Readings:»
```

```
[Switch: Collection active] value ──▶ on [Interval (setInterval): 5 s] pulse ──▶ up [Counter (++ −−)] count ──▶ value [Value: Readings:]
```

The [Interval (setInterval)](core.every) block starts by itself (like the switch, which is on at the start). Turning the switch off, the readings stop; turning it on again, they restart.

### 3. Two switches that exclude each other

```
[Switch: Summer] value ──▶ value [NOT] result ──▶ value [Switch: Winter]
[Switch: Winter] value ──▶ value [NOT] result ──▶ value [Switch: Summer]
```

Turning on **Summer**, **Winter** turns off, and vice versa. There is no endless loop: a value that arrives on the input of a switch does not come out of its output.

## Accessibility and keyboard

- It is a button with the switch role: you reach it with **Tab**, move it with **Space** or **Enter**, and the screen reader says its name (the **Label**) and whether it is on.
- When the schema moves it, the switch is redrawn and, if it had the keyboard focus, it loses it.

## See also

- [Checkbox](ui.checkbox), with the text visible
- [Lamp](ui.lamp), to show a state without letting it change
- [NOT](core.not), [Cast to yes/no (Boolean())](core.toBool)
- [Standard UI components](logicstudio-ui)
