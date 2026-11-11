# UI component

`core.component` · UI components · [Core blocks](logicstudio-core) · version 1

It is the **object** of a window component (a button, a field, a chart…) inside a schema. Schemas never touch windows directly: they talk to a component only through its object, which has the same ports as the component.

## Inputs and outputs

The ports are not fixed: they are **those of the component** that the object stands for (plus those the component has added). For example:

| Component | Inputs (← what the schema sets) | Outputs (→ what the user does) |
|---|---|---|
| [Button](ui.button) | **text**, **enabled**, **visible** | **pressed** |
| [Switch](ui.toggle) | **value**, **enabled**, **visible** | **value** |
| [Text field](ui.text) | **text**, **enabled**, **visible** | **text**, **enter** |
| [Label](ui.label) | **text**, **enabled**, **visible** | none |

Every component has the inputs **enabled** and **visible**. The ports of each component are described on its page: with the object selected, **F1** (or **?** in the Properties) opens the page of the component.

The object also has the **Exception** output, which however never sends anything: the object does no calculations of its own.

## Settings

They show in the Properties of the object, **UI component** section:

| Setting | Values | What it does |
|---|---|---|
| **Window** (`window`) | the windows of the project | The window of the component. If you change it, **Component** is emptied and must be chosen again. |
| **Component** (`component`) | the components of that window (with their label and kind) | Which component it stands for. |

In a schema opened alone (without a project) the Properties say "A schema alone has no windows."

## How to create it

The object is **not** in the **Blocks** tab: it is created from the window.

1. Open the window and, in **Design**, select the component.
2. In the Properties, **Object in a schema** section, choose the schema in **In the schema** and press **Make its object**.
3. The IDE puts the object in the middle of the schema, gives it as title the label or the text of the component, and opens it selected.

From then on, in the Properties of the component, **Object in a schema** says where the object is (schema › block) and **Open it in the schema** shows it. A **double click** on the component, in Design, also opens its object. From the right click on the object, **Open its window** does the opposite. Until a component has its object, the Properties warn: "No schema has its object yet: without it the component shows and does nothing."

On the sheet the object shows as title its label (or the name of the kind of component) and below it `window › component`. In the Properties there is no **Label** field: to change it use the right click, **Label…**.

**Columns**, **Rows** and the other containers do not have the **Object in a schema** section: from the IDE you cannot create an object for them.

## How it works

### From the schema to the window (inputs)

- A value that arrives on an input of the object **goes straight to the component**, in every open copy of the window. Nothing comes out of the object and there is no calculation: the object passes the value on and that is all.
- The inputs of the object **do not have** the **starts it** and **initial value** options: the starting values of the component are set in its properties, in the window editor.
- If the window **is not open**, the last value of each input is kept and the window shows it when it opens (with the project option **A window opened again shows the last values at once**, on by default). The program keeps at most 2000 values of this kind.
- Setting a value from a schema does **not** make the component send anything: for example, sending yes to the **value** input of a Switch turns it on, but its **value** output sends nothing. Only the gestures of the user come out.
- **enabled** and **visible** react only to a real **no** value (`false`): `false` disables or hides the component, any other value enables or shows it again. The text `"no"` or the number 0 do **not** hide it: for a text first use [Convert](core.convert) to yes/no, or a [Value](core.value) of kind yes/no.

### From the window to the schema (outputs)

- When the user uses the component (click, typing, moving the slider…), the value comes out of the outputs of the object and goes to the linked blocks.
- When a window **opens**, nothing comes out: no button is "pressed again".
- If the same window is open in several copies (two screens, two browsers), the gesture made in one comes out of the object only once and, with the option **Copies of the same window stay in step**, is seen in the others too.

### One object per component

Each component has **a single object**, in only one of the schemas of the project. If there are two (for example after duplicating the object with **Ctrl D**), the program does not start: «La componente *window* › *component* ha già il suo oggetto in *schema*/*block*» ("The component *window* › *component* already has its object in *schema*/*block*"). If you need the value of a component in more schemas, carry it with the [schema ports](core.schemaOut).

If you remove the component from the window, its object stays in the schema and shows an error until you remove it too (the IDE reminds you when you remove the component).

For the general rules see [How a block works](ide/blocks) and [The object of a component](ide/components).

## Examples

### 1. A button that counts

A window with a [Button](ui.button) **Count** and a [Value](ui.value) **total**. Create the object of both in the same schema:

```
[Button: Count] pressed ──▶ up [Counter] count ──▶ value [Value: total]
```

At every click the value shown in the window grows by 1: 1, 2, 3… Closing and reopening the window, you see the last number at once.

### 2. A field that is enabled by a switch

```
[Switch: edit] value ──▶ enabled [Text field: name]
```

When the user turns off the [Switch](ui.toggle), no comes out and the [Text field](ui.text) is disabled; turning it on again, yes comes out and the field is usable again. When the window opens nothing comes out: set the starting state of the field in its properties.

### 3. Hide a label

```
[Checkbox: advanced] value ──▶ value [Convert: yes/no] result ──▶ visible [Label: hint]
```

The [Checkbox](ui.checkbox) already sends yes/no, so [Convert](core.convert) would not be needed here; it becomes needed if the value arrives as text, for example `"false"` read from a file: without the conversion the text `"false"` would **not** hide the label.

### 4. The text of a button from the schema

```
[Every… 1 s] pulse ──▶ up [Counter] count ──▶ s [Format text: "Wait… {s}"] text ──▶ text [Button: Start]
```

On [Format text](core.format) add an input and rename it **s**. The text of the button changes every second (`Wait… 1`, `Wait… 2`…); the button stays clickable and its **pressed** keeps coming out.

## Errors

These are errors of the project, not of the Exception: the program does not start, or the **Problems** panel reports them.

| Message | When |
|---|---|
| Il blocco *id* rappresenta una componente della finestra «*window*», che non c'è ("The block *id* stands for a component of the window «*window*», which is not there") | (Problems) The chosen window is no longer in the project. |
| Il blocco *id* rappresenta la componente «*component*», che non c'è ("The block *id* stands for the component «*component*», which is not there") | (Problems) The component was removed from the window, or **Component** is empty. |
| Il blocco *id* rappresenta una componente che non c'è (*window* › *component*) ("The block *id* stands for a component that is not there") | The program does not start, for the same reason. |
| La componente *window* › *component* ha già il suo oggetto in *schema*/*block* ("The component already has its object in …") | Two objects for the same component. |
| La componente *component* (*kind*) non c'è: manca il suo pacchetto ("The component *component* (*kind*) is not there: its package is missing") | The package of the component (for example [Standard UI components](logicstudio-ui)) is not installed. |

## See also

- [The object of a component](ide/components) and [Windows](ide/windows)
- The components: [Button](ui.button), [Text field](ui.text), [Switch](ui.toggle), [Value](ui.value) and the others in [Standard UI components](logicstudio-ui)
- [Schema input](core.schemaIn) and [Schema output](core.schemaOut)
- [How a block works](ide/blocks)
