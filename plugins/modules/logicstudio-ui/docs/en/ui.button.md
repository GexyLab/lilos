# Button

`ui.button` · Commands · [Standard UI components](logicstudio-ui) · version 1

A button: when the user presses it, it sends a pulse to the schema. By itself it can also open another window of the project or close the one it is in.

## Properties

| Property | Values | Default | Description |
|---|---|---|---|
| **Text** | text (translatable) | «Button» | The text on the button. |
| **Icon** | —, drop, play, stop, power, gear, bell, check, x, plus, minus, refresh, save, trash, warning, info, home, window, link | — (none) | An icon before the text. |
| **Look** | primary, normal, danger | primary | **primary**: colored, for the most important action. **normal**: neutral. **danger**: red, for actions that delete or stop. |
| **Action on click** | None, Open a window, Close this window | None | What the button does by itself, besides sending **pressed**. With **Open a window** you choose which one, among the other windows of the project. |

## Ports of its object in the schema

### Inputs

| Port | Type | Description |
|---|---|---|
| **text** (`text`) | text | Changes the text on the button. |
| **enabled** (`enabled`) | yes/no | `false` makes it lighter and it can no longer be pressed. See [Standard UI components](logicstudio-ui). |
| **visible** (`visible`) | yes/no | `false` hides it. |

### Outputs

| Port | Type | Description |
|---|---|---|
| **pressed** (`pressed`) | pulse | Every time the user presses the button. The value is `true`. |
| **Exception** (`error`) | object | Like every block; for this component nothing goes through it today. |

## How it works

**pressed.** At every click (or **Enter** / **Space** with the button in the foreground) the button sends `true` on **pressed**. Two quick clicks are two pulses. When the window opens, the button sends nothing.

**text.** A value on **text** replaces the text: a number or a yes/no is shown as text (`3`, `true`), an object as JSON, `null` leaves the button without text. The icon stays. The text that arrives from the schema is not translated.

**Action on click.** The window performs the action, even if the button has no object in any schema:

| Action | In lilOS | In the IDE (Preview) |
|---|---|---|
| **Open a window** | Opens the chosen window of the project. If it is already open, it brings it to the front instead of opening a second one. | Opens a preview of that window in a separate window. |
| **Close this window** | Closes the window of the button. If it was the last window of an app made with **Make app**, the program of the app stops. An active program, instead, keeps running. | Does nothing. |

- The button first sends **pressed**, then does the action: even with **Close this window** the schema receives the pulse.
- If the chosen window was removed or renamed, **Open a window** does nothing: choose one again in the Properties.
- In **Design** the button does not react.

## Examples

### 1. Start and stop

```
Window «Pump»
└ Column (root)
  ├ Row
  │ ├ Button  button1  Text «Start»  Icon play  Look primary
  │ └ Button  button2  Text «Stop»   Icon stop  Look danger
  └ Lamp      lamp1    Label «Running»
```

```
[Button: Start] pressed ──▶ send [Constant · Variable: yes]  value ──▶ on [Lamp: Running]
[Button: Stop]  pressed ──▶ send [Constant · Variable: no]   value ──▶ on [Lamp: Running]
```

The two [Constant · Variable](core.value) blocks are of type yes/no and have the **send** input linked (show it with the eye next to the port, in the Properties): they send the value only when you press, not at the start. **Start** turns the lamp on, **Stop** turns it off.

To avoid pressing **Start** twice, link the state to the buttons too:

```
[Button: Start] pressed ──▶ value [NOT] result ──▶ enabled [Button: Start]
[Button: Stop]  pressed ──▶ send [Constant · Variable: yes] value ──▶ enabled [Button: Start]
```

After **Start** the button turns off (the [NOT](core.not) of `true` is `false`); **Stop** enables it again.

### 2. A button that opens the settings

```
Window «Main»
└ Column (root)
  ├ Value    value1   Label «Temperature:»
  └ Button   button1  Text «Settings…»  Icon gear  Look normal  Action on click «Open a window: Settings»

Window «Settings»
└ Column (root)
  ├ Slider   slider1  Label «Threshold»
  └ Button   button1  Text «Close»  Look normal  Action on click «Close this window»
```

No objects are needed: the first button opens the **Settings** window, the second one closes it. Both windows have a `button1` button: ids are valid inside their own window.

### 3. A button that counts the clicks on its own text

```
[Button: Press] pressed ──▶ up [Counter (++ −−)] count ──▶ n [Template string: «Pressed {n} times»] text ──▶ text [Button: Press]
```

In the [Template string](core.format) add the input **n**. At every click the button changes its text: «Pressed 1 times», «Pressed 2 times»…

## Accessibility and keyboard

- It is a real button: you reach it with **Tab** and press it with **Enter** or **Space**; the screen reader reads its text.
- A button with only the icon and no text has no name for screen readers: always write a **Text**.
- When the schema changes the **text**, the button is redrawn and, if it had the keyboard focus, it loses it.

## See also

- [Switch](ui.toggle), for an on/off state
- [Counter (++ −−)](core.counter), [Constant · Variable](core.value)
- [Windows](ide/windows)
- [Standard UI components](logicstudio-ui)
