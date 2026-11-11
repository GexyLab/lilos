# Choose file

`ui.file` · Commands · [Standard UI components](logicstudio-ui) · version 1

A button that opens the lilOS window for choosing a file (or a folder), and next to it the chosen path. The path goes to the schema, ready for the blocks that read and write files.

## Properties

| Property | Values | Default | Description |
|---|---|---|---|
| **Label** | text (translatable) | empty | Text above the field. |
| **Extensions (comma separated, empty: all)** | text | empty | Which files can be chosen: `csv, txt` (the dot in front can be written or not: `.csv` is fine). Empty: all. It does not matter when choosing a folder. |
| **Choose** | a file, a folder | a file | What is chosen. It also changes the icon of the button. |

## Ports of its object in the schema

### Inputs

| Port | Type | Description |
|---|---|---|
| **path** (`value`) | text | Shows that path next to the button, without the component sending anything. |
| **enabled** (`enabled`) | yes/no | `false` makes it lighter and the button can no longer be pressed. See [Standard UI components](logicstudio-ui). |
| **visible** (`visible`) | yes/no | `false` hides it. |

### Outputs

| Port | Type | Description |
|---|---|---|
| **path** (`value`) | text | The chosen path, when the user chooses a file or a folder. |
| **Exception** (`error`) | object | Like every block; for this component nothing goes through it today. |

## How it works

When opened you see «—» and a «…» button with the icon of a file or a folder.

1. The user presses the button: the lilOS choice window opens, with the files and folders the user has access to.
2. If they choose a file (or a folder), the path appears next to the button and goes out on **path**, for example `/home/anna/Documenti/conti.csv`.
3. If they close the window without choosing, nothing happens: the previous path stays.

- Choosing the same file again sends it again.
- The path is the lilOS one, which starts with your home (`/home/anna/…`). The lilOS blocks accept it as it is. The program runs with the permissions of whoever started it: choosing a file gives the program no extra permissions.
- The file blocks work only in the home: if the user chooses a file outside their home, the [Read file](lilos.fileRead) goes to **Exception** with «Puoi usare solo i file della tua home (~/… oppure /home/anna/…): …» ("You can use only the files of your home (~/… or /home/anna/…): …"). The `.config` folder is also excluded.
- A long path is shortened with «…» at the end; to see it all, widen the window.
- From the schema, **path** only changes the text: it does not check that the file exists, and it does not open anything. `null` brings back «—».
- It also works in the IDE **Preview**.

## Examples

### 1. Opening a text file

```
Window «Reader»
└ Column (root)
  ├ Choose file  file1     Label «File to read»  Extensions «txt, md»
  └ Console      console1
```

```
[Choose file: File to read] path ──▶ path [Read file] content ──▶ value [Write to console]
```

In the [Read file](lilos.fileRead) turn on «starts it» on the **path** input (it is off by default): the file is read as soon as the user chooses it, and its content appears in the console of the window.

### 2. Choosing the destination folder

```
Window «Export»
└ Column (root)
  ├ Choose file  file1    Label «Save in»  Choose a folder
  └ Button       button1  Text «Export»
```

```
[Choose file: Save in] path ──▶ folder [Format text: «{folder}/report.txt»] text ──▶ path [Write file]
[Button: Export] pressed ──▶ send [Value: «Report of the day»] value ──▶ content [Write file]
```

The user chooses the folder and then presses **Export**: the [Write file](lilos.fileWrite) writes `report.txt` in that folder. If they press **Export** before choosing, the file goes to the path in the settings of the block.

## Accessibility and keyboard

- The button is reached with **Tab** and pressed with **Enter** or **Space**; the choice window is used with the keyboard as in the rest of lilOS.
- The button's text is only «…»: a screen reader does not say what it is for, and the **Label** above is not linked. The chosen path is normal text, read after the button.

## See also

- [Read file](lilos.fileRead), [Write file](lilos.fileWrite), [List folder](lilos.folderList)
- [Standard UI components](logicstudio-ui)
