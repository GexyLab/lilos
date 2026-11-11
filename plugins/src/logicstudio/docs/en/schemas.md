# Schemas

A **schema** (`.lsch` file) is a sheet of linked blocks. It opens with a click on its name in the **Project** list and you draw it in its editor. This page explains the editor; links are in [Links and port types](ide/links), how a block runs in [How a block works](ide/blocks).

## What a block looks like on the sheet

```
┌▌ Σ  Add ──────────────────┐
│  2 · 5                     │   ← the first settings (if there are any)
│● a                    ○    │
│● b          result ●       │
│○ c                         │   ← added port: name in italics
│            Exception ○     │   ← faded until it is linked
└────────────────────────────┘
```

- The **head** has the icon and the name: the **label** you gave it, otherwise the name of the block. The coloured strip on the left is the **category** (Values, Math constants, Physical constants, Astronomical constants, Logic, Math, Text, Objects, Lists, Matrices, Unit conversions, Geometry, Trigonometry, Functions, Integrals, Numerical analysis, Signals, Time, Console, Schema ports, UI components, lilOS, Network, Hardware, Databases, Exceptions, Drawing).
- Under the head, in small type, the first two settings that have a value (at most 34 characters).
- On the left the **inputs**, on the right the **outputs**. The dot has the colour of the **type** of the port and is filled when the port is linked (see [Links and port types](ide/links)).
- The name of an input **underlined with dots** means that input **does not start** the block.
- The **added ports** have the name in *italics*.
- The last output is always **Exception**, red, faded until you link it.

Two blocks are special:

- **Parameter** and **Return** show as title the **name of the port** and, on the right, the kind of block.
- The **object of a component** shows the name of the component (or its label) and under it «window › component». See [The object of a component](ide/components).

### Texts and shapes (Drawing)

The blocks of the **Drawing** category, [Text · Comment](core.drawText) and [Shape](core.drawShape), are not boxes with ports: on the sheet you see the text or the shape, below the links and the blocks. The program does not run them; they explain the schema, like comments in code.

- They move, are selected, duplicated, aligned and deleted like the other blocks, and can be in a [group](ide/groups).
- When selected, a drawing has a **small square in the bottom right corner**: drag it to change the size (for a text, the width). It moves in steps of 10 px; with **Alt** held it is free.
- **Double click** on a drawing (or right click → **Write the text**) to write its text right there on the sheet: **Ctrl Enter** or a click elsewhere keeps it, **Esc** leaves it as it was.
- A shape **without a fill** is picked only by its line: inside it, clicks and the selection rectangle reach the blocks. So you can enclose some blocks in a box and keep working on them.
- In the **Properties** a drawing has only the settings (no Label, no ports). Colours are chosen with the small square or typed (`#2f81f7`, `#2f81f733` with transparency, `rgb(…)`, `hsl(…)`, a name like `orange`); empty means the colour of the theme.

## Putting blocks

The **Blocks** tab on the left lists the blocks of the installed packages, divided by category, in alphabetical order. With the mouse over a block you see its type and the package (for example `core.add · logicstudio-core 1.0.0`).

- **Search…** at the top filters by name or by type (`add`, `core.add`). If it finds nothing: **Nothing found**.
- **A click on the name of a category** collapses it (▸) or expands it again (▾); next to it is how many blocks it has. Collapsed categories stay so the next time too. **Right click** on the name: **Collapse** / **Expand**, **Collapse all**, **Expand all**. While searching, the categories with results are all open: those you collapse there open again when you change the search.
- Categories with **many blocks** are split into **subcategories**, with a smaller title: for example **Signals** into Generation, Frequency, Filters…, **Databases** into SQL databases, MongoDB, Redis, InfluxDB and Elasticsearch, **Geometry** into plane, solids and space. A subcategory too collapses and expands with a click on its title, and stays so the next time; **right click** on the title: **Collapse** / **Expand**, **Collapse the groups of this category**, **Expand the groups of this category**. The blocks of a package that does not give a subcategory go under **Others**, at the end. While searching only the subcategories with results are shown.
- **One click** on a block puts it in the middle of the view and selects it. Repeated clicks put the blocks a little lower and to the right of each other, never one on top of the other.
- **Dragging** the block onto the sheet puts it where you drop it.
- The blocks of the palette are off when the open tab is not a schema (Home, Map).
- The object of a component is not in the palette: it is made from the window (see [The object of a component](ide/components)).
- **Obsolete** blocks are not in the palette: a package keeps them so that saved schemas that use them keep working, but it has replaced them with other blocks. If a schema has one, its **Properties** show the notice **Obsolete block** and say what to use instead (for example [Type cast](core.convert) is replaced by the five Cast blocks, one per conversion).

A new block has the default settings of its package and an id made of its type and a number (`add1`, `value2`, `consolewrite1`).

When the schema already has the maximum number of blocks (200 by default) **At most 200 blocks per schema** appears and the block is not put.

### Adding from the sheet

- **Right click on the sheet** → **Add a block here**: a menu with all the blocks divided by category; the block goes where you clicked.
- **Release a link on the empty sheet**: you drag from an output and release the button on the sheet, away from an input. The same menu opens, but with **only the blocks that have an input matching** the type of that output; the chosen block is put there and the link goes to its first matching input.

These menus do not contain the **Parameter** block and the object of components: take the Parameter block from the palette.

## Moving around the sheet

| What | How |
|---|---|
| Zoom in and out | Mouse **wheel** (with or without **Ctrl**), around the pointer; in the toolbar **−** and **+** (by 1.2 times) around the centre. From 20% to 250%. |
| Back to 100% | Click on the percentage in the toolbar (**Actual size**). |
| See everything | **Fit** in the toolbar or in the menu of the sheet: shows all the blocks, at most at 120%. |
| Move the view | Hold down **Space** and drag; or drag with the **middle button**; **Shift+wheel** moves horizontally. |
| Reach a block out of view | When a link leads to a block you cannot see, on the edge of the view, where the link leaves it, a label shows an arrow and the **name of that block**. When more links of the same port leave close to each other, the label has the names of all their blocks (up to three, then «+2»…). A click on a name brings that block to the middle of the view, at the same zoom, and selects it. |

The zoom and the position of the view are saved in the schema. A schema opened for the first time, or an empty one, is fitted by itself.

The status bar at the bottom says, for the open schema: **Blocks 12 / 200 · links 30 / 600 · 100%**.

## Selecting

- **Click** on a block: selects it (highlighted border) and shows its Properties.
- **Shift+click** on a block: adds it to or removes it from the selection.
- **Drag on the background**: selects the blocks touched by the rectangle; with **Shift** it adds them to those already chosen. A click on the background without dragging clears the selection.
- **Click on a link**: selects it (thicker, lit); **Shift+click** adds others.
- **Ctrl+A** selects all the blocks; **Esc** clears the selection.
- **Click on the header of a group** (or on a collapsed group): selects the group. See [Groups](ide/groups).

## Moving, duplicating, removing

- **Drag** a block: all the selected blocks move. They snap to a 10-pixel grid; holding **Alt** they go where you drop them, without the grid.
- **Arrows**: move the selection by 1 pixel; with **Shift** by 20.
- **Ctrl+D**: duplicates the selected blocks 24 pixels lower and to the right, with their settings, labels, added ports and the links **between them**; selects the copies.
- **Delete** (or **Backspace**): removes the selected blocks and their links; if no blocks are selected, it removes the selected links.

Every move, duplication or removal can be undone with **Ctrl+Z**.

## Mirroring blocks

A **mirrored** block has its **inputs on the right** and its **outputs on the left**: it helps when a block receives from the right and sends to the left, for example in a loop that goes back, so that the links do not go around the block. Only the drawing changes: the block works as before.

- Select one or more blocks and press **Mirror** in the toolbar at the top; or right click on a block → **Mirror**.
- Each selected block turns over: a normal one becomes mirrored, a mirrored one goes back to normal. Pressing again puts it back as it was.
- The links leave and arrive on the new side; the title and the texts stay readable.
- It is one Undo step (**Ctrl+Z**) and it is saved in the schema; a copy (**Ctrl+D**) stays mirrored.
- **Drawings** (texts and shapes) and groups are not mirrored: **Mirror** is off when only drawings are selected.

> **Ctrl+D** does not check the maximum number of blocks: beyond the limit you notice it when you test. If you duplicate an **object of a component** you get two objects of the same component in the same schema, and the test rejects it («La componente … ha già il suo oggetto in questo schema: …», "The component … already has its object in this schema: …"): change the component of the copy or remove it.

The keys work when the sheet is in front (after a click on the sheet).

## The menus (right click)

On a **block** (if it was not selected, it becomes the selection):

| Item | What it does |
|---|---|
| **Duplicate** (Ctrl+D) | Duplicates the selected blocks. |
| **Mirror** | Mirrors the selected blocks: inputs and outputs change side (see «Mirroring blocks» above). Not on drawings. |
| **Label…** | Asks «A name for this block, shown on it instead of its kind.» (at most 80 characters; empty removes it). |
| **Group** (Ctrl+G) | Makes a group of the selected blocks that are not in a group. |
| **Add to group** › | Puts the selected blocks in a group that already exists. |
| **Take out of the group** | Takes the selected blocks out of their group. |
| **Open its window** | Only for the object of a component: opens the window of the component. |
| **Remove the block** / **Remove 3 blocks** (Delete) | Removes the selection. |

On a **group**: see [The menu of a group](ide/groups).

On a **link**: **Remove the link** (Delete).

On the **sheet**: **Add a block here**, **Select all** (Ctrl+A), **Fit**.

A **double click** on the object of a component opens its window.

## The Properties

The panel on the right shows what you selected.

### Nothing selected: the schema

- **Schema**: **Name** (the name of the schema in the project) and **Blocks** (how many there are).
- **Schema ports**: the schema **Inputs** and **Outputs** of this schema, with name and type. If there are none: «No ports: add an Ingresso or Uscita di schema block to link this schema to the others of the project.»
- At the bottom: «Schemas of a project are linked only through their schema ports, in the map.»

### Several blocks or links

**3 blocks selected** with the buttons **Group** (if some are not in a group) and **Remove 3 blocks**; or **2 links selected** with **Remove the link**. The Properties of a group are in [Groups](ide/groups).

### A block

From the top:

1. **The head**: icon and name of the block, and its description if the package has one.
2. **Label**: a name of yours, at most 80 characters; empty means the name of the block. It is not there for the schema ports (their title is the name of the port) nor for the object of a component (you can still use **Label…** from the menu).
3. **UI component**: only for the object of a component (**Window** and **Component**). See [The object of a component](ide/components).
4. **Settings**: those of the block. Some appear only with certain choices (for example **Decimals (round)** of **Math functions** only with **round**). The kinds of control:

| Control | How to use it |
|---|---|
| Checkbox | Yes or no. |
| Choice | A list: the operations have readable names (**a ≥ b**, **round**, **UPPER CASE**…). |
| Number | A number, within the limits of the block; empty means the default value. |
| Console | The consoles of the project; the main one has ★. |
| JSON | A JSON value (`{"a": 1}`, `[1, 2]`); if it is not valid JSON it is kept as text. |
| Text | At most 2000 characters. |

5. For **Parameter** and **Return**, after the settings: **Links in the project** with the schemas linked to this port, each with **Unlink**, and the **In the map** button. If it is not linked: «Not linked yet: link it in the map.» In a schema alone: «In a project, this port can be linked to other schemas in the map.»
6. **Ports**: the table of **Inputs** and **Outputs**, with the type of each:
   - a base port has the padlock, «Base port: it cannot be removed»;
   - an added port has **↑** (Move up), **↓** (Move down) and **Remove**, and a field for the name if the block lets you choose it;
   - under each input: **starts it** and the **at start** field (it is not there for inputs of type pulse). See [How a block works](ide/blocks);
   - **Add input** / **Add output** and **Added: 2 of 16**, only for the blocks that allow it.
7. **Block**: type, version and package, for example `core.add v1 · logicstudio-core 1.0.0`.

Ports are added and removed **only here**, never on the block. Removing a linked port asks **Remove the port «c»?** — «It has 2 links, which are removed too. Ctrl+Z puts them back.»

The **at start** field reads what you type as JSON, and if it is not JSON it keeps it as text:

| You type | Start value |
|---|---|
| `5` | the number 5 |
| `2.5` | the number 2.5 (with the dot) |
| `"5"` | the text «5» |
| `ciao` | the text «ciao» |
| `true` | yes |
| `[1, 2, 3]` | a list |
| `{"nome": "Ada"}` | an object |
| (empty) | no start value |

## Blocks of packages that are not there

A block whose package is not installed stays in the schema but is **dashed**, without ports, with its type as title and **The package is missing** under it. Its links stay in the file but are not seen. The Properties say: «This block (net.request) comes from a package that is not installed. Install it from the AppStore, or remove the block.» with **Remove the block**. As long as it is there, the test does not start: in the Problems appears «The block … (net.request) comes from a package that is not installed».

When the package is installed, reopen the IDE: the block goes back to normal with its settings.

## Schema ports

A project can have several schemas. They talk to each other **only** through the schema ports:

- **Return** (category Schema ports): has the **value** input. Every value that arrives leaves the schema with the name of the port.
- **Parameter**: has the **value** output. It sends into the schema the values that arrive at the port with that name from the other schemas.

In the Settings: **Port name** (default `uscita` and `ingresso`), **Type** (any, number, yes/no, text, object, list, pulse) and **Description**. The type is that of the port of the block and of the boxes of the Map.

When you change the name of a port, the links of the map that use it follow. A port with no name stops the test with «A schema port has no name». Give different names to the ports of the same schema: two Inputs with the same name receive the values in only one of the two.

## The Map

The **Map** button (in the toolbar or next to the name of the project) opens the **«Project» · Map** tab, always second after the Home:

- each **schema** is a box with its name, its **Schema inputs** on the left and the **Schema outputs** on the right;
- each **window** is a box with the name (★ if it is the main one) and a line that says how many components it has and in which schemas their objects are: «6 components · objects in comandi, nord» or «6 components · no object in the schemas»;
- the lines between the boxes are the **links between schemas**.

What you can do:

1. **Link two schemas**: drag from an output of one schema to an input of another. A schema is not linked with itself; the same link is not made twice.
2. **Remove a link**: select it and press **Delete**, or in the Properties press **Unlink**.
3. **Move the boxes**: drag them. Their position is saved in the project.
4. **Open** a schema or a window: double click on the box, or select it and press **Open** in the Properties (which also show its path).

With nothing selected, the Properties of the map show **Project** (**Name**, **Main window**) and **Links between schemas**, each with **Unlink**, or **No links yet**. At the bottom: «Drag from an output of a schema to an input of another to link them. Windows are reached through the objects of their components in the schemas.»

The toolbar has **Fit**; the status bar says «4 schemas · 2 windows · 3 links between schemas». In the map you do not create or remove elements: you do it from the **Project** list. Undo and Redo, with the map in front, act on the project.

## Examples

### 1. Average of three numbers

```
[Constant · Variable: 4] value ──▶ a  [Min · Max · Avg] result ──▶ value [Print (console.log)]
[Constant · Variable: 8] value ──▶ b
[Constant · Variable: 9] value ──▶ c
```

1. Put three **Constant · Variable** blocks (setting **Value** = `4`, `8`, `9`) and a **Min · Max · Avg** with **Operation** = **average**.
2. Select **Min · Max · Avg** and in the Properties press **Add input**: **c** appears in italics.
3. Link the three Constant · Variable blocks to **a**, **b**, **c** and **result** to **Print**.
4. **Test**: the console writes `4`, then `6`, then `7` (the block recalculates at every value that arrives). If you want only `7`, untick **starts it** on **a** and **b**.

### 2. Two schemas that talk to each other

In the schema **sensori**:

```
[Interval (setInterval): 5 s] pulse ──▶ read [Now (date and time)] parts ──▶ object [Get property: second] value ──▶ value [Return (schema output): secondi]
```

In the schema **display**:

```
[Parameter (schema input): secondi] value ──▶ value [Print (console.log)]
```

1. Create the two schemas and the blocks; in the Settings of the ports type `secondi` as **Port name** and **number** as **Type**.
2. Open the **Map**: the box **sensori** has the output **secondi**, the box **display** the input **secondi**. Drag from one to the other.
3. **Test**: every 5 seconds the console writes the seconds of the current time.

### 3. Tidying up a sheet

1. **Ctrl+A** to select everything, then drag any block: everything moves together.
2. Select a group of blocks with a rectangle and press **Ctrl+D** to copy them; drag the copies where they are needed.
3. **Fit** to see the whole schema again.

## See also

- [Links and port types](ide/links)
- [How a block works](ide/blocks)
- [Base blocks](logicstudio-core)
- [Keyboard shortcuts](ide/shortcuts)
