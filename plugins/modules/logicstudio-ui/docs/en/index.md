# Standard UI components

`logicstudio-ui` · requires `logicstudio-engine` and `logicstudio-core`

The **standard UI components** are the pieces you use to draw the **windows** of a Logic Studio project (the `.lsui` files in the **ui** folder): labels, values, indicators, buttons, switches, fields, lists, tables and the containers that arrange them. Charts are not here: they are in the `logicstudio-charts` package.

A component on its own can be seen but does nothing. To make it talk to the program, you give it its **object** in a schema: a block that has the component's ports. The other blocks link to that object, never directly to the window.

## How to install it

An administrator installs it from the **AppStore**, **Kernel** tab, together with the engine (`logicstudio-engine`) and the basic blocks (`logicstudio-core`), which the AppStore adds by itself if they are missing. When it is installed, the components show up in the **Components** tab of the IDE while you draw a window, and lilOS uses them to show the windows of active programs and of the apps made with **Make app**.

If a window uses a component from a package that is not there, you see a dashed red box with the type in place of it (for example `ui.gauge`), and the project does not start: «La componente gauge1 (ui.gauge) non c'è: manca il suo pacchetto» ("The component gauge1 (ui.gauge) is not there: its package is missing").

## The components

### Text and values

| Component | Type | What it is for |
|---|---|---|
| [Label](ui.label) | `ui.label` | A fixed text, or one sent by a schema, also as a title. |
| [Value](ui.value) | `ui.value` | Shows a value (number, text, object) with a label and a unit. |
| [Gauge](ui.gauge) | `ui.gauge` | A number on an arc, between a minimum and a maximum. |
| [Lamp](ui.lamp) | `ui.lamp` | A dot that turns on and off, in four colors. |
| [Progress bar](ui.progress) | `ui.progress` | A bar from 0 to 100, with the percentage. |
| [Image](ui.image) | `ui.image` | An image taken from the project folder. |
| [Table](ui.table) | `ui.table` | A list of objects in rows and columns; you can choose a row. |
| [Console](ui.console) | `ui.console` | A console of the program inside the window. |

### Commands

| Component | Type | What it is for |
|---|---|---|
| [Button](ui.button) | `ui.button` | Sends a pulse when you press it; it can also open or close a window. |
| [Switch](ui.toggle) | `ui.toggle` | On or off: sends yes/no. |
| [Checkbox](ui.checkbox) | `ui.checkbox` | Checked or not: sends yes/no. |
| [Option buttons](ui.radios) | `ui.radios` | One choice among a few options, all visible. |
| [Selection](ui.select) | `ui.select` | One choice from a drop-down menu. |
| [Slider](ui.slider) | `ui.slider` | A number chosen by dragging, between a minimum and a maximum. |
| [Text field](ui.text) | `ui.text` | A text typed by the user, with **enter**. |
| [Number field](ui.number) | `ui.number` | A number typed by the user. |
| [Date and time](ui.datetime) | `ui.datetime` | A date, a time or both. |
| [List](ui.list) | `ui.list` | One item chosen from a list that is always open. |
| [Choose file](ui.file) | `ui.file` | The path of a lilOS file or folder. |
| [Color](ui.color) | `ui.color` | A color chosen among seven. |

### Containers

| Component | Type | What it is for |
|---|---|---|
| [Column](ui.column) | `ui.column` | Puts the components one under the other. |
| [Row](ui.row) | `ui.row` | Puts the components side by side. |
| [Grid](ui.grid) | `ui.grid` | Puts the components in cells, over several columns. |
| [Box](ui.group) | `ui.group` | A column with a border and a title. |
| [Tabs](ui.tabs) | `ui.tabs` | Several pages, one visible at a time. |
| [Free area](ui.free) | `ui.free` | The components stay where you leave them, at the exact position. |
| [Separator](ui.separator) | `ui.separator` | A line or an empty space between two components. |

## Drawing a window

Open a window of the project in the IDE and choose **Design** in the top bar. In the **Components** tab on the left you find the pieces, divided into **Text and values**, **Commands** and **Containers** (plus **Charts**, if their package is installed).

- **A click** on a piece puts it **in the selected container**. If you selected a component that is not a container, the piece goes right after it, in the same container. If nothing is selected, it goes to the end of the window.
- **Dragging** a piece puts it where the **blue line** shows. The container that receives it turns blue.
- To **move** a component that is already there, drag it (the move starts after 5 pixels of movement). You cannot put it inside itself.
- **A click** on a component selects it; a click on the background of the window clears the selection and shows the properties of the window.
- **A double click** on a component opens its object in the schema, if there is one.
- With the window in the foreground: **Del** (or **Backspace**) removes the selected component, **Esc** clears the selection. **Remove the component**, at the bottom of its Properties, does the same. If the component has an object in a schema, the IDE asks for confirmation first. Removing a container also removes everything it contains.

**Preview** makes the window work like the real one: you can press, type, choose. If a **Test** is running, the preview is connected to the program: what you do reaches the objects in the schemas, and the values of the schemas reach the components. Without a test, the components react but nothing reaches anybody.

> In Design the components do not react and the containers are marked with a dashed border, so you can see where to put the pieces. A component with **visible** off is still shown, in a lighter tone; in **Tabs** all the pages are shown, one under the other.

### The window

With nothing selected, the **Properties** bar shows the window:

| Property | Values | Default |
|---|---|---|
| **Title** | text, up to 120 characters | «Window» |
| **Width (px)** | from 160 to 4000 | 480 |
| **Height (px)** | from 120 to 4000 | 360 |
| **The user can resize it** | yes/no | yes |

Below, **Opens from** says where this window opens from (the main window opens from the apps menu; the others from a button with **Open a window**, or from the entry point chosen in the Project options).

### Containers and root

Every window has a **root**: a [Column](ui.column) with 10 px of space between the pieces and 14 px of margin. The root cannot be selected or changed: if you need another layout, put another container inside it.

Containers can be nested (a Row inside a Column inside a Box…), up to 32 levels. How they arrange the pieces:

- **Column** and **Box**: one under the other. With the **stretch** alignment every piece takes the whole width of the column.
- **Row**: one next to the other, and they wrap if there is no room (this can be turned off).
- **Grid**: in cells of equal width, filled from left to right and then down.
- **Tabs**: **every piece inside the Tabs is a page**. To have several pieces in one page, put a Column in the tab and the pieces inside it.
- **Free area**: every piece stays at the exact point where you leave it, measured in pixels from the top left corner of the area.

### The Free area

In the [Free area](ui.free) the position of a piece is saved as coordinates (x, y) in pixels. When you drag a piece into the area, the top left corner of the piece goes about 10 pixels above and to the left of the pointer. To move it, drag it again inside the area.

- A piece added with **a click** (instead of dragged) has no position: it ends up in the top left corner, on top of the others. Drag it where you want.
- The IDE has no controls for the width and height of a piece: each one has its natural size.
- The area has a fixed height (**Height** property): what falls outside the area is not cut and can end up on top of the components that follow.

## The object in the schema

Schemas never touch the window: every component has an **object** in a schema, a **UI component** block (`core.component`, category **UI components**, from the [Basic blocks](logicstudio-core) package) with the ports of the component. See also [The object of a component](ide/components).

**Making it.** Select the component in **Design**. In the **Properties** bar, **Object in a schema** section, choose the schema in **In the schema** and press **Make its object**. The object appears in the middle of the view of that schema, which opens; its label is the **Label** or the **Text** of the component (at most 80 characters). If the object is already there, the section says in which schema and block it is, with **Open it in the schema**.

**The ports.** The **Ports** section of the Properties lists them with an arrow:

- **←** are the **inputs** of the object: what a schema **sets** in the component (the text to show, the value, the options…). A value that arrives on an input goes to the window and stays as the last value of that port.
- **→** are the **outputs**: what the **user does** (pressed, chose, typed). The output sends the value only when the user acts.
- Some components have a port with the same name in both directions (for example **value** in the Switch). A value that arrives on the input changes the component but does **not** come out of the output: only what the user does comes out. This way you can link the output to a schema that then sends a value back to the input, without creating an endless loop.

Every object also has the common inputs **enabled** and **visible** (see below) and, like every block, the **Exception** output: for a component object nothing goes through it today.

**Rules.**

- **One object per component**, in the whole project. If you have two (for example by duplicating the object with Ctrl D), the project does not start: «La componente Principale › button1 ha già il suo oggetto in Calcolo/b3» ("The component Principale › button1 already has its object in Calcolo/b3").
- The **starts it** settings do not count for the object: every value that arrives always goes to the component.
- An **at start** value on an input of the object sets the component when the program starts (for example the starting text of a label).
- If you remove a component, the IDE warns you that its object stays in the schema and marks an error («Il blocco b3 rappresenta la componente «button1», che non c'è», "The block b3 stands for the component «button1», which is not there") until you remove that too. The project does not start: «Il blocco b3 rappresenta una componente che non c'è (Principale › button1)» ("The block b3 stands for a component that is not there (Principale › button1)").
- In the Properties of an object (in the schema) you can change the **Window** and the **Component** it corresponds to. Right click on the object → **Open its window**.
- **Containers have no object** that can be made from the IDE: the **Object in a schema** section is not there for Column, Row, Grid, Box, Tabs and Free area. Because of this, today the **title** input of the Box, the **open tab** input of the Tabs and the **enabled** and **visible** inputs of the containers cannot be used from the IDE.

### In the names of the examples

In the schemas of these pages, `[Button: Count]` is the object in the schema of the Button with the text «Count»; `[Number field: price]` is the object of the Number field with the label «price». The windows are drawn like this:

```
Window «Counter» 320 × 200
└ Column (root)
  ├ Value        value1   Label «Clicks:»
  └ Button       button1  Text «Count»
```

`value1`, `button1` are the ids the IDE gives to the components (the type plus a number); you see them at the top right in the Properties.

## The common properties

### Label

Many components have the **Label** property: a small, lighter text **above** the control (above the field, the selection, the slider, the table…). When it is empty, it is not shown. In the [Checkbox](ui.checkbox) the label is instead the text next to the box; in the [Switch](ui.toggle) today it is not shown (it is only for screen readers); in the [Value](ui.value) and the [Lamp](ui.lamp) it is beside, on the same line; in the [Gauge](ui.gauge) it is below.

The label is written in the editor and does not change while the program runs: there is no port to change it.

### enabled and visible

All components have these two inputs, besides their own:

| Port | Type | What it does |
|---|---|---|
| **enabled** (`enabled`) | yes/no | `false`: the component becomes lighter and no longer answers to the mouse or the keyboard (Tab skips it). Any other value enables it again. |
| **visible** (`visible`) | yes/no | `false`: the component disappears and no longer takes up space. Any other value makes it appear again. |

- **Only the value `false`** (yes/no false) counts. The text `"false"`, the number 0 or an empty text do **not** disable and do **not** hide anything. If the value comes from a calculation, first pass it through a [Convert](core.convert) block **To** yes/no.
- A disabled or hidden component keeps receiving values from the schemas: when it comes back, it shows the last one.
- At the beginning every component is enabled and visible. To start with a hidden component, give the **visible** input of its object the **at start** value `false`.

### Translated texts

Text properties marked as translatable (Label, Text, Placeholder, Options, Items, Names of the tabs, Description of an image, Title of a box) are looked up in the translations of the project for the language of whoever opens the window: if there is a translation for that exact text, that one is shown. For now the IDE has no place to write the translations. Values that arrive from the schemas are never translated.

## Values when the window is closed and reopened

The program also runs when no window is open: the schemas keep sending values to the objects of the components. What whoever opens the window sees depends on two choices in **Project options → The app and its windows**:

| Choice | On (default) | Off |
|---|---|---|
| **A window opened again shows the last values at once** | The engine keeps the last value sent to each port of each component (up to 2000 ports per program). Whoever opens the window sees those values at once. | The window opens as you drew it (with the values of the properties) and shows only the values that arrive from that moment. |
| **Copies of the same window stay in step** | The engine also keeps the **choices of the user** (the switch turned on, the item chosen, the text typed…): when you reopen the window you find them again, even from another device. | The engine keeps only the values sent by the schemas. |

Things to know:

- When a window opens, **no component sends anything** to the program: a button is not «pressed again», a switch does not send its state again. Outputs send only when the user acts.
- In the same way, the «at start» value of a component (for example **On at the start** of a Switch) is only what is shown: the program does not receive it. If a schema needs to know it, give it the same value with a [Value](core.value) block.
- The engine remembers the values **per port**: if 10 numbers arrive at a Value while the window is closed, when you reopen it you see only the last one.
- In lilOS a window of a program opens **only once**: opening it again brings it to the front. Two copies of the same window exist only on two devices or two browsers.
- If the program stops, its windows close. If you close the last window of an app made with **Make app**, its program stops.
- In the IDE, **Preview** during a Test shows the values that arrive while you look at it. Every time the window is redrawn (you change a property, you switch from Design to Preview) the components start again from the values of the properties.
- The program accepts at most 100 messages per second from the windows and the IDE; beyond that, the message is refused («Troppi messaggi al programma», "Too many messages to the program"). A value sent by a component can be at most 256 KB.

## Accessibility and keyboard

- **Tab** moves from one control to the next in the order they have in the window; disabled components are skipped.
- Buttons, switches and boxes are operated with **Space** or **Enter**; option buttons and colors are chosen with the **arrow keys**; in the List the **up** and **down** arrows change the chosen item; the rows of a Table are chosen with **Enter** or **Space**.
- Every page says what the keyboard does for that component and what a screen reader announces.

## Complete examples

### 1. A counter with a button

```
Window «Counter» 320 × 200
└ Column (root)
  ├ Value        value1   Label «Clicks:»   When empty «0»
  ├ Row
  │ ├ Button     button1  Text «Count»      Look primary
  │ └ Button     button2  Text «Reset»      Look normal
```

Make the objects of `value1`, `button1` and `button2` in the schema, then:

```
[Button: Count] pressed ──▶ up    [Counter] count ──▶ value [Value: Clicks:]
[Button: Reset] pressed ──▶ reset
```

Every click on **Count** raises the count by 1 and the Value shows it; **Reset** takes it back to 0. When opened, the Value shows «0» (the **When empty** text) until the first count arrives. If you close and reopen the window, you see the last count.

### 2. A form with confirmation

```
Window «New contact» 380 × 300
└ Column (root)
  ├ Text field  text1     Label «Name»
  ├ Text field  text2     Label «Email»
  ├ Checkbox    checkbox1 Label «Subscribe me to the newsletter»
  ├ Button      button1   Text «Save»
  └ Label       label1    Text «»   Size small
```

The button must save the values of the moment, not one at every change. Use a [Build object](core.compose) with three added fields (**name**, **email**, **newsletter**) from which you **remove «starts it»**, and a fourth field **save** that starts it:

```
[Text field: Name]       text   ──▶ name        [Build object] object ──▶ content [Append to file]
[Text field: Email]      text   ──▶ email
[Checkbox: Subscribe me…] value ──▶ newsletter
[Button: Save]           pressed ──▶ save
[Append to file] written ──▶ send [Value «Saved.»] value ──▶ text [Label: label1]
```

In the [Append to file](lilos.fileAppend) choose the **Format** «JSON, one per line».

The Text field sends **text** when the user confirms (Enter or leaving the field): when they press **Save**, the fields have already reached the Build object, which starts with **save** and writes a line in the file, for example `{"name":"Anna","email":"anna@example.com","newsletter":true,"save":true}`. Then the small label shows «Saved.».

- **save** also ends up in the object, because it is one of its fields.
- If the user never touches the box, **newsletter** is missing from the line: the box sends its value only when you change it.

> The [Value](core.value) block here has **Send at start** off, so «Saved.» appears only after the first save.

### 3. A probe with an alarm and two tabs

```
Window «Greenhouse» 420 × 320
└ Column (root)
  └ Tabs   Names of the tabs «Now, Settings»
    ├ Column                            ← page «Now»
    │ ├ Gauge  gauge1  Label «Temperature»  Unit «°C»  Minimum 0  Maximum 50
    │ └ Lamp   lamp1   Label «Too hot»  Color red
    └ Column                            ← page «Settings»
      └ Slider slider1 Label «Threshold»  Minimum 20  Maximum 45  At the start 30  Unit « °C»
```

In the schema, a [Read file](lilos.fileRead) block reads every 10 seconds the temperature from a file written by another program:

```
[Every…: 10 s] pulse ──▶ read [Read file: ~/greenhouse.txt] content ──▶ value [Convert: number] result ──▶ value [Gauge: Temperature]
                                                                    result ──▶ a [Compare: a > b] result ──▶ on [Lamp: Too hot]
[Value: 30] value ──▶ b [Compare]
[Slider: Threshold] value ──▶ b [Compare]
```

The gauge follows the temperature; the lamp turns on when it goes over the threshold. The [Value](core.value) 30 gives the comparison the same threshold the slider shows at the start (the slider does not send it until the user moves it). The value of the «Settings» page reaches the comparison even if the user is looking at the «Now» page.

## Known limits

- At most 200 components per window (containers and root included), by default; an administrator can change it in Control Panel → Logic Studio → Limits. Beyond that: «Troppe componenti nella finestra Principale: al massimo 200» ("Too many components in the window Principale: at most 200").
- Containers have no object that can be made from the IDE (see above).
- In the Free area you cannot give width and height to the pieces.
- A piece moved from a Free area to another container keeps its coordinates and appears shifted by those pixels in the new place too: put it back in a Free area and drag it to the corner, or remove it and add it again.
- The labels above the controls are not linked to the controls for screen readers (see the single pages).
- The texts of the windows cannot yet be translated from the IDE.

## See also

- [The object of a component](ide/components)
- [Windows](ide/windows)
- [Test and active programs](ide/run)
- [How a block works](ide/blocks)
- [Basic blocks](logicstudio-core)
