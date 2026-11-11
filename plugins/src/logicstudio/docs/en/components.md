# The object of a component

Schemas **do not touch** the components of a window directly. Every component has its **object** in a schema: a **UI component** block (`core.component`, category UI components) that has **the same ports as the component**. The other blocks link to the object, and the object talks to the component.

```
schema «main»                                         window «Principale»
[Interval (setInterval)] pulse ──▶ up [Counter (++ −−)] count ──▶ value [Value: contatore]  ═══  ┌──────────────┐
                                                                         │ contatore 12 │
[Button: Azzera] pressed ──▶ reset [Counter (++ −−)]                       ═══  │ [ Azzera ]   │
                                                                         └──────────────┘
```

Here **[Value: contatore]** and **[Button: Azzera]** are the objects of the two components of the window.

## The ports and their direction

An object has:

- **inputs** (← in the Properties of the component): **what a schema sets**. A value that arrives there goes to the component. For example **text** of a **Label**, **value** of a **Gauge**, **rows** of a **Table**, **options** of a **Selection**;
- **outputs** (→): **what the user does**. They come out when someone uses the component in an open window: **pressed** of a **Button**, **value** of a **Switch** or of a **Slider**, **text** and **enter** of a **Text field**, **chosen row** of a **Table**;
- the **Exception** output, like every block.

Every component (except the containers) also has two more inputs:

| Input | Type | What it does |
|---|---|---|
| **enabled** (`enabled`) | yes/no | `false`: the component looks switched off and cannot be used; `true`: usable again. |
| **visible** (`visible`) | yes/no | `false`: the component disappears from the window; `true`: it comes back. |

Some components have the same name on an input and on an output (for example **value** of a **Switch**): the input sets it from the schema, the output says when the user changed it.

The ports of each component are in its page, for example [Button](ui.button), [Label](ui.label), [Gauge](ui.gauge), [Lines](charts.line).

## Creating the object

From the window:

1. Open the window and, in **Design**, select the component.
2. In the **Properties**, **Object in a schema** section, read «No schema has its object yet: without it the component shows and does nothing.»
3. In **In the schema** choose the schema (by default the first of the project).
4. Press **Make its object**.

The IDE puts the object in the schema, more or less at the top left of the visible part, gives it as label the text or the label of the component (for example «Saluta» for a button), opens the schema and selects it. The schema shows as modified: remember to save.

A component has **one object in the whole project**. You can put it in the schema you prefer; if you move it to another schema, remove the old one.

The containers (Column, Row, Grid, Box, Tabs, Free area) **have no object** in the IDE: you cannot switch them off, hide them or change the open tab of **Tabs** from a schema. To hide a group of components, send **visible** to each one.

## Finding the object

- In the window, **double click** on the component (in Design), or Properties → **Open it in the schema**: the IDE opens the schema, selects the object and brings it into view. The Properties also show where it is: «main › button1».
- In the schema, **double click** on the object, or right click → **Open its window**: it opens the window.
- In the **Map**, each window says in which schemas the objects of its components are.

## The object in the schema

On the sheet the object has as title its label (or the name of the component) and under it «Principale › button1» (window › id of the component). In the **Properties**, **UI component** section:

| Field | What it does |
|---|---|
| **Window** | A window of the project. If you change it, the component goes back to empty (—). |
| **Component** | A component of that window, shown as «text or label · type» (for example «Saluta · Button»). |

Then the **Ports** table: the additional ports of the component are marked **of the component**. For the object there are no **starts it**, no start values and no buttons to add ports.

In a schema alone: «A schema alone has no windows.»

## How it works

- A value that arrives at an **input** of the object goes at once to the component in **every open window** of that program, and the engine remembers it.
- When the user uses the component, the value **comes out of the output** of the object and goes along the links.
- Components send something **only when someone uses them** in an open window. Opening a window does not «press» anything again: a switch that is on at opening does not send its value.
- The engine remembers the **last value** sent to each component: with the option **A window opened again shows the last values at once** (default), whoever opens or reopens the window sees the last values at once. See [Projects](ide/projects), Options → The app and its windows.
- With **Copies of the same window stay in step** (default), the same window open in two places shows the same values.

A **Button** with **Action on click** (Open a window, Close this window) does its action and also sends **pressed** to the object. See [Windows](ide/windows).

## When something does not add up

| Problem | What you see | What to do |
|---|---|---|
| The component has no object | It shows but does nothing. | **Make its object**. |
| You removed the component | The object stays in the schema; when you test: «The block component1 stands for the component «button1», which is not there». | Remove the object, or choose another **Component**. |
| You removed or renamed the window | When you test: «The block component1 stands for a component of the window «Old name», which is not there». | Choose **Window** and **Component** again. |
| Two objects for the same component (for example after **Duplicate**) | The engine rejects it: «La componente Principale › button1 ha già il suo oggetto in main/component1» ("The component Principale › button1 already has its object in main/component1"). | Remove one of the two. |
| The object has no component (—) | When you test: «The block component2 stands for the component «», which is not there». | Choose the **Component**. |
| The package of the component is not installed | The engine: «La componente button1 (ui.button) non c'è: manca il suo pacchetto» ("The component button1 (ui.button) is not there: its package is missing"). | Install the package from the AppStore → Kernel. |

## Components with additional ports

Some charts (**Real time**, one series per port; **Steps**, one state per port) provide additional ports. In this version the IDE has no button to add them to a component: the added ports written in the `.lsui` file show on the object in italics, but they cannot be added or removed from the IDE.

## Examples

### 1. A button that counts

In the window: a **Button** (**Text** = `+1`) and a **Value** (**Label** = `Pressioni`). Make the two objects in the schema **main**, then:

```
[Button: +1] pressed ──▶ up [Counter (++ −−)] count ──▶ value [Value: Pressioni]
```

**Test** → **Preview**: every click on **+1** makes the number go up.

### 2. Enabling a button only when a name is typed

```
[Text field: nome] text ──▶ text [String functions: length] result ──▶ a [Compare (== != < >): a > b, b = 0] result ──▶ enabled [Button: Invia]
```

On **Compare**, **b** has start value `0` and **starts it** unticked. As soon as you type something the button turns on; if you delete everything, it turns off. When the window opens the button is on until you type something: if you want it to start off, also link a **Constant · Variable** block (**Kind** = **yes/no**, **Value** = `no`, nothing linked to **send**) to **enabled**.

### 3. A table from a file

```
[On start (main)] pulse ──▶ read [readFile: ~/spesa.json, JSON] content ──▶ rows [Table]
[Table] chosen row ──▶ value [Print (console.log): readable JSON]
```

`~/spesa.json` contains `[{"cosa": "pane", "quanto": 2}, {"cosa": "latte", "quanto": 1}]`. The table shows the two rows; a click on a row writes it to the console. **readFile** is in the [lilOS blocks](logicstudio-lilos) package.

## See also

- [Windows](ide/windows)
- [UI components](logicstudio-ui)
- [UI component](core.component)
- [Links and port types](ide/links)
