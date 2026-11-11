# Constant · Variable

`core.value` · Values · [Core blocks](logicstudio-core) · version 2

Gives a value written in its settings: a number, a text, a yes/no or a JSON value (object, list…). By default it is a **constant**: the value goes out at the start of the schema and does not change. If you link something to its **set** input it becomes a **variable**: the value that arrives replaces the current one.

Up to version 1 the block was called **Value** and had the setting **Send at start**: now the link on **send** decides it (see below). Schemas saved before are updated on their own.

## Inputs

Both inputs are **hidden by default**: to link them, first show them with the **eye** next to the port in **Properties**.

| Port | Type | Description |
|---|---|---|
| **send** (`send`) | pulse | If linked, the value goes out **only** at each pulse that arrives here (no longer at the start). What arrives does not matter: even `false` or `0` start the sending. If not linked, the value goes out once at the start of the schema. |
| **set** (`set`) | any | If linked, the block is a variable: the value that arrives, converted to the chosen **Kind**, becomes the new value. It goes out at once if **send** is not linked, otherwise at the next pulse on **send**. If not linked, the block is a constant. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | any | The current value: the one in the settings, or the last one that arrived on **set**. |
| **Exception** (`error`) | object | When the kind is **JSON** and the text is not valid JSON, or when a value that is not a number arrives on **set** with the kind **number**. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Kind** (`kind`) | number, text, yes/no, JSON | number | How to read the text of **Value** and how to convert what arrives on **set** (see below). |
| **Value** (`value`) | a text (up to 2000 characters) | `0` | The value to send, written as text. For a variable it is the starting value. |

## How it works

### When it sends the value

| send | set | What it does |
|---|---|---|
| not linked | not linked | **Constant**: sends the value once, at the start of the schema. |
| linked | not linked | **Constant on demand**: sends the value at each pulse on **send**, never at the start. |
| not linked | linked | **Variable**: sends the starting value at the start, then each new value as soon as it arrives on **set**. |
| linked | linked | **Variable on demand**: **set** changes the value without sending it; it goes out only at each pulse on **send** (the value of that moment). |

The send at the start happens before the inputs of the blocks receive their initial values. An **initial value** given to **set** in Properties counts as a value arriving at the start, but does not make the block a variable: for that, **set** must be linked.

### How it reads the text

The text you write in **Value** is read according to the **Kind**:

| Kind | How it is read | Examples |
|---|---|---|
| **number** | Spaces at the sides do not count and the first comma counts as a decimal point. | `42` → 42; `3,5` → 3.5; `1e3` → 1000; `0x10` → 16; empty → 0 |
| **text** | As it is, spaces included. | `42` → the text «42», not the number |
| **yes/no** | It is **no** if, without the spaces and regardless of case, it is empty, `0`, `false`, `no` or `off`. Any other text is **yes**. | `no` → no; `OFF` → no; `yes` → yes; `falso` → **yes** |
| **JSON** | The text is read as JSON. Empty is `null`. | `{"name":"Ada"}` → an object; `[1,2,3]` → a list; `"hello"` → the text hello; `null` → null |

What arrives on **set** is converted the same way: with the kind **number** the text `"7"` becomes 7 and a text that is not a number goes to **Exception** (the value stays the previous one); with **text** an object becomes its JSON text; with **yes/no** the rules of the table apply; with **JSON** the value passes as it is.

Watch out for edge cases:

- With the kind **number**, a text **in the settings** that is not a number (for example `abc`, or `1.234,5` with two separators) does **not** give an error: the block sends the special value `NaN` («not a number»), which the calculation blocks after it treat as a wrong number.
- With the kind **yes/no**, the Italian word `falso` is **yes**: for no write `no`, `0`, `false` or `off`.
- With the kind **JSON** you can send `null`: it reaches the linked blocks as an empty value.

If the JSON text is not valid, the block sends nothing on **value** and sends the message of the JSON reader on **Exception** (see **Errors**).

For a variable to read at a different moment from when you write it you can also use [Store (set · get)](core.store), which also has **clear**. For the general rules (inputs, «starts it», hidden ports, Exception) see [How a block works](ide/blocks).

## Examples

### 1. Two constants to add

```
[Constant · Variable: 2] value ──▶ a  [Add (+)] result ──▶ value [Print (console.log)]
[Constant · Variable: 3] value ──▶ b
```

Kind **number**, nothing linked to the hidden inputs. At the start the console shows `2` and then `5` (the [Add (+)](core.add) runs at every value that arrives).

### 2. A text sent when you press a button

```
[Button: Greet] pressed ──▶ send [Constant · Variable] value ──▶ value [Print (console.log)]
```

Kind **text**, Value `Hello everyone!`. Show **send** with its eye and link the [Button](ui.button) to it: at every click the console writes `Hello everyone!`; at the start it writes nothing, because **send** is linked.

### 3. A variable: the threshold chosen by the user

```
[Slider: Threshold] value ──▶ set [Constant · Variable: 30] value ──▶ b [Compare (== != < >): a > b]
[Interval (setInterval): 5 s] pulse ──▶ … temperature ──▶ a
```

Kind **number**, Value `30`. At the start the comparison receives 30; every time the user moves the [Slider](ui.slider) the threshold changes and the new value reaches the comparison at once.

### 4. A variable read on demand

```
[Text field: Name] text    ──▶ set [Constant · Variable] value ──▶ value [Print (console.log)]
[Button: Print]    pressed ──▶ send
```

Kind **text**, empty Value, **send** and **set** shown and linked. Typing in the field only changes the value; the console writes the name only when you press **Print**.

### 5. An object of settings

Kind **JSON**, Value:

```
{"threshold": 30, "unit": "°C", "alarm": true}
```

At the start the block sends the object. With a [Get property](core.get) block with Field `threshold` you get the number 30.

If by mistake you write `{threshold: 30}` (without quotes around the name), the value does not go out and the Exception receives a message like `Expected property name or '}' in JSON at position 1 (line 1 column 2)`.

## Errors

| Message | When |
|---|---|
| The message of the JSON reader: for example `Unexpected token 'a', "abc" is not valid JSON` | Kind **JSON** and a settings text that is not valid JSON. |
| Non è un numero (not a number) | Kind **number** and a value that is not a number arrives on **set**. The value stays the previous one. |

## See also

- [Store (set · get)](core.store) for a value to write and read at different moments, which can also be cleared
- [Type cast](core.convert) to change the type of an arriving value
- [On start (main)](core.onStart) for a simple pulse at the start
- [How a block works](ide/blocks)
