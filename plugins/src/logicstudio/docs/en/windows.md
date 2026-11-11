# Windows

A **window** (`.lsui` file, in the `ui/` folder of the project) is the interface of the program: labels, values, buttons, fields, charts, put inside containers. The windows of projects are opened by **lilOS**, not by the IDE: when an active program has windows, they appear in the **Projects** tab of the apps menu. In the IDE you design and test them.

Every project has a **main window**: the one that opens from the apps menu. A schema alone has no windows.

## The editor

A click on a window in the **Project** list opens it in a tab. In the middle you see the window drawn **at its real size**, with the title bar. On the left is the **Components** tab (in place of **Blocks**). The toolbar at the top has two more buttons:

| Button | What it does |
|---|---|
| **Design** | The mode for building: the components do not react, the containers show where things go, a click selects. |
| **Preview** | The window works like the real one: you can press, type, choose. With a test in progress it is **live** (see below). |

The status bar says «8 components / 200 · 480 × 360» (the components that have ports, the limit, the size).

## The components

The **Components** tab lists the components of the installed packages, divided into **Text and values**, **Commands**, **Containers** and **Charts**, with a search (**Search…**). The base components are in [UI components](logicstudio-ui), the charts in [Charts](logicstudio-charts).

### Adding

- **One click** on a component adds it:
  - inside the **selected container**, at the end;
  - if a component that is not a container is selected, **right after** it, in its container;
  - if nothing is selected, at the end of the window.
- **Dragging it** onto the window, a **blue line** shows where it will go (in a **Row** the line is vertical, in the other containers horizontal); the container that receives it is highlighted. In a **Free area** there is no line: the component goes where you drop it.
- If you were in **Preview**, the editor goes back to **Design**.

The new component has the default properties and an id made of its type and a number (`button1`, `label2`). The component you added stays selected.

### Selecting, moving, removing

In **Design**:

- **click** on a component: selects it (outline) and shows its Properties; click on the background of the window: nothing selected;
- **drag** a component (at least 5 pixels): you move it where the blue line shows, even into another container, but never inside itself; in a Free area you put it where you drop it;
- **Delete** or **Backspace**: removes the selected component (and what it contains); **Esc**: clears the selection;
- **double click**: opens the schema with the **object** of the component and selects it, if the object exists.

When you remove a component that has an object in a schema, the IDE asks **Remove the component?** — «Its object in the schema «main» stays there and shows an error until you remove it too.»

Every change can be undone with **Ctrl+Z**.

## The containers

The window is a **Column** (the one at the bottom, which cannot be selected or removed). Inside you put components and other containers, up to 32 levels.

| Container | How it lays out what it contains |
|---|---|
| **Column** | One below the other. |
| **Row** | One next to the other; with **Wraps when it needs to** it goes on to the row below. |
| **Grid** | In columns (**Columns**, 0 = automatic). |
| **Box** | One below the other, inside a frame with a **Title**. |
| **Tabs** | Each contained item is a **tab**: the first is the first tab, the second the second… The names are in **Names of the tabs (comma separated)**. In **Design** you see all the tabs one below the other. Put a **Column** for each tab. |
| **Free area** | Each one in the position where you drop it (in pixels from the top left corner), with height **Height (px)**. |
| **Separator** | It contains nothing: it is a line or a space between two components (it sits among the containers in the palette). |

## The Properties

### Nothing selected: the window

| Field | Rules |
|---|---|
| **Title** | The title of the window, at most 120 characters. Empty: the name of the window. |
| **Width (px)** | From 160 to 4000. |
| **Height (px)** | From 120 to 4000. |
| **The user can resize it** | If unticked, the window has a fixed size. |

Then **Opens from**: **Apps menu (main window)**, **Opens only from other windows of the app** or the entry point chosen in **Project options → Windows** (see [Projects](ide/projects)). And the hint: «Add components from the palette on the left: a click puts it into the container selected, dragging puts it where the blue line shows.»

### A component

- At the top: the name of the component and, on the right, its **id** (the one the schemas use).
- **Settings**: the properties of the component. The kinds of control:

| Control | How to use it |
|---|---|
| Text | At most 2000 characters (in the real window at most 4000). |
| Number | Within the limits of the property; empty means the default value. A number outside the limits is brought to the limit. |
| Checkbox | Yes or no. |
| Choice | A list (for example **Size**: small, normal, title; **Alignment**: start, center, end, stretch; **Look**: primary, normal, danger). |
| Icon | An icon from a list (— means none). |
| Console | A console of the project. |
| Resource | A file of the `risorse/` folder (— means none), for example for **Image**. |
| Action on click | See below. |

- **Ports**: the ports of the component, which you will use through its object: **←** is what a schema sets (for example **text**, **enabled**, **visible**), **→** is what the user does (for example **pressed**, **value**). «← what a schema sets, → what the user does. The schemas reach the component through its object.»
- **Object in a schema**: where its object is, with **Open it in the schema**; or «No schema has its object yet: without it the component shows and does nothing.» with **In the schema** and **Make its object**. See [The object of a component](ide/components).
- **Remove the component**.

The containers do not have the Ports and Object in a schema sections.

## The action on click of a button

The **Button** has the **Action on click** property:

| Choice | What it does |
|---|---|
| **Nothing** | Only **pressed** to its object. |
| **Open a window** | Opens another window of the project (choose which in the second list). If it is already open, it brings it to the front. |
| **Close this window** | Closes the window of the button. |

«It also sends «pressed» to its object in the schema.»: the action is added, it does not replace.

## Preview and live test

- In **Preview**, without a test: the window reacts (a switch turns on, a field is typed in), but there is no program that answers.
- In **Preview** with a **test in progress**: the window is **tied to the test**. The values that the schemas send to the components are shown, and what you do (press, type, move a slider) reaches the objects in the schemas. This is the way to test windows in the IDE: the test **does not open** the windows of the project by itself.
- A button with **Open a window** opens the other window in a lilOS window with the subtitle **Preview**, also tied to the test. **Close this window** does nothing in preview.
- During a test you can also open the real windows from the Home: **My programs** → **Open its window**.

## Translations

The texts you write in the properties (labels, button texts, tab names) are shown as you wrote them. The project can have a table of translations (`texts` in the `.lsproj`, see [File formats](ide/formats)): if there is a translation of a text for the language of whoever opens the window, that one is shown. For now the IDE has no place to write them: you add them by hand in the file.

## Limits

| What | At most (default) |
|---|---|
| Components per window | 200 (counting the containers and the column at the bottom too) |
| Windows per project | 10 |
| Containers one inside the other | 32 levels |
| Width and height | 4000 pixels |

When the window is full, **At most 200 components per window** appears. The number in the status bar counts only the components with ports, not the containers: the window can be full even if the bar says less than 200.

A component of a package that is not installed shows as a box with its type and a warning sign; when you select it the Properties say «This component (charts.line) comes from a package that is not installed.»

## Examples

### 1. A window with a greeting

1. Open the window **Principale**. In the Properties (nothing selected) set **Title** = `Greetings`, **Width (px)** = `360`, **Height (px)** = `200`.
2. From the **Components** tab click **Text field** (property **Label** = `Your name`), then **Button** (**Text** = `Greet`), then **Label** (**Text** empty).
3. For each of the three, in the Properties, leave **In the schema** = **main** and press **Make its object**: the IDE opens the schema with the new object.
4. In the schema **main** add a **Template string**. In its Properties press **Add input** twice and rename the ports to `nome` and `via`; untick **starts it** on `nome`; type the **Template** `Ciao, {nome}!`.
5. Link:

```
[Text field] text ──▶ nome [Template string: «Ciao, {nome}!»] text ──▶ text [Label]
[Button: Greet] pressed ──▶ via
```

6. Press **Test**, go back to the tab of the window and choose **Preview**. Type `Ada` and press **Greet**: the label shows «Ciao, Ada!».

The text field sends the name at every change, but **nome** does not start the block: the greeting changes only when the pulse of the button arrives on **via**.

### 2. Two tabs

1. Add a **Tabs** container, with **Names of the tabs** = `Stato, Comandi`.
2. With **Tabs** selected click **Column**: it is the first tab (and now it is the one selected). Select **Tabs** again and click **Column** again: it is the second. If you do not select **Tabs** again, the second Column ends up inside the first.
3. Select the first Column and add a **Gauge** and a **Lamp**; select the second and add two **Buttons**.
4. In **Preview** try changing tab.

### 3. A second window

1. Create the window **Dettagli** from the **Project** list (**+** next to **Windows**).
2. In the window **Principale** add a **Button** with **Text** = `Details…` and **Action on click** = **Open a window** → **Dettagli**.
3. In the window **Dettagli** add a **Button** with **Text** = `Close` and **Action on click** = **Close this window**.

Without any schema, the two buttons already open and close the window when the project runs.

## See also

- [The object of a component](ide/components)
- [UI components](logicstudio-ui)
- [Charts](logicstudio-charts)
- [Project options](ide/projects)
