# Console

`ui.console` · Text and values · [Standard UI components](logicstudio-ui) · version 1

Puts a console of the program inside the window: the lines written by [Write to console](core.consoleWrite) and the questions of [Read from console](core.consoleRead), which the user answers without opening another window.

## Properties

| Property | Values | Default | Description |
|---|---|---|---|
| **Console** | one of the consoles of the project | Main (`main`) | Which console to show. The list is the one in **Project options → Consoles**. |
| **Height (px)** | from 60 to 1200 | 160 | The height of the console in the window. Extra lines scroll. |

## Ports of its object in the schema

### Inputs

| Port | Type | Description |
|---|---|---|
| **enabled** (`enabled`) | yes/no | `false` makes it lighter and questions can no longer be answered. See [Standard UI components](logicstudio-ui). |
| **visible** (`visible`) | yes/no | `false` hides it. |

### Outputs

| Port | Type | Description |
|---|---|---|
| **Exception** (`error`) | object | Like every block; for this component nothing goes through it today. |

The Console has no ports of its own: the lines reach it from the console blocks, not from its object. The object is only used to hide it or disable it.

## How it works

- The console shows the lines of that console of the program, each with its time and its level (normal, information, warning, error), including those written before the window opened (how many the program keeps is decided in **Project options → Consoles**). It shows at most the last 1000. If you are at the bottom, it follows the new lines; if you scrolled up to read, it stays where you are.
- When a [Read from console](core.consoleRead) block asks a question on that console, the question appears at the bottom with a field: **Enter** sends the answer, **Esc** cancels the question.
- In **Design** you only see a box with the terminal icon and the id of the console (for example `main`).
- In the IDE, in **Preview** during a Test, the console shows the lines of the Test.
- Outside the IDE, the consoles also follow the **Outside the IDE** choice in the Project options: with «Only when they ask for something» (the default), when a question arrives the console window opens **too**, besides this component. You can answer in either one. If you want only this component, choose «Do not show them»… but be careful: with that choice the questions immediately get their default value. It is usually better to leave the default choice.
- If the chosen console no longer exists in the project, the component stays empty.

## Examples

### 1. A log under the commands

```
Window «Backup»
└ Column (root)
  ├ Button   button1   Text «Start the backup»
  └ Console  console1  Console Main  Height 200
```

```
[Button: Start the backup] pressed ──▶ read [Read file: ~/data.txt] content ──▶ content [Write file: ~/backup/data.txt] written ──▶ send [Value: «Backup done.»] value ──▶ value [Write to console: level information]
[Read file] Exception ──▶ value [Write to console: level error]
```

Every backup writes a line in the console of the window: «Backup done.» or the error.

### 2. A question inside the window

```
Window «Quiz»
└ Column (root)
  ├ Button   button1   Text «New question»
  └ Console  console1  Height 120
```

```
[Button: New question] pressed ──▶ ask [Read from console: «What is 7 × 8?» kind number] value ──▶ a [Compare: a = b] if true ──▶ send [Value: «Right!»] value ──▶ value [Write to console]
[Value: 56] value ──▶ b [Compare]                                                                   if false ──▶ send [Value: «No, it is 56.»] value ──▶ value [Write to console]
```

The question appears at the bottom of the console of the window; the user types 56 and presses Enter.

## Accessibility and keyboard

You reach the answer field with **Tab**; **Enter** answers, **Esc** cancels. Next to the question, a hint says what is needed (text, number, yes/no, a key); if the question has a default value, you see it in gray in the field. For secret questions the field hides what you type.

## See also

- [Write to console](core.consoleWrite), [Read from console](core.consoleRead)
- [Console](ide/consoles), in the IDE guide
- [Standard UI components](logicstudio-ui)
