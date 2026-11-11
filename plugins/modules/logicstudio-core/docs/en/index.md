# Core blocks

`logicstudio-core` · needs the [Logic Studio Engine](logicstudio-engine) and lilOS 1.37.0 or later

The blocks you need in almost every Logic Studio schema: fixed values and memories, logic and comparisons, calculations, text, objects, time (intervals and waits), the consoles that write lines and ask questions, the ports that link the schemas of a project, and the object that links a schema to a component of a window.

## How to install it

The package installs **by itself** together with the **Logic Studio IDE** app: the AppStore brings it along with the engine, because the IDE needs it. If it is missing (for example because it was removed), an administrator installs it from the **AppStore**, **Kernel** tab, by searching for "logicstudio-core". The package asks for no permissions: its blocks do not touch files, the network or notifications.

The other blocks come with other packages: [Lists and matrices](logicstudio-collections), [lilOS blocks](logicstudio-lilos) (notifications, files, events), [Network blocks](logicstudio-net), the [Standard UI components](logicstudio-ui) and the [Charts](logicstudio-charts).

## The blocks

### Values

| Block | What it does |
|---|---|
| [Value](core.value) | Sends a fixed value (number, text, yes/no or JSON) at start and at every pulse on **send**. |
| [Memory](core.store) | Keeps a value aside: you write it with **set**, read it with **read**, empty it with **clear**. |
| [Convert](core.convert) | Changes the type of a value: to number, text, yes/no, JSON text, or from JSON text to object or list. |

### Logic

| Block | What it does |
|---|---|
| [AND](core.and) | Yes only if all the inputs that have a value are yes. |
| [OR](core.or) | Yes if at least one input is yes. |
| [XOR](core.xor) | Yes if the inputs that are yes are an odd number. |
| [NOT](core.not) | Flips a yes/no. |
| [Compare](core.compare) | Compares two values (=, ≠, >, ≥, <, ≤): sends a yes/no and a pulse on **if true** or **if false**. |
| [If](core.if) | Sends a value on **then** or on **else**, depending on a condition. |
| [Cases](core.switch) | Sends a pulse on the output of the case equal to the value, or on **otherwise**. |
| [Choose](core.select) | Lets only one of its inputs through, the one given by **which**. |
| [Route](core.route) | Sends the value on one of its outputs, the one given by **which**. |
| [First to arrive](core.merge) | Joins several inputs into one output: every value that arrives goes through. |
| [Wait for all](core.join) | A pulse on **ready** when something has arrived on all the added inputs. |
| [Sequence](core.sequence) | At every pulse on **start**, a pulse on each output, from top to bottom. |
| [Edge](core.edge) | A pulse when a yes/no changes: **becomes true** or **becomes false**. |

### Math

| Block | What it does |
|---|---|
| [Add](core.add) | Adds two or more numbers. |
| [Subtract](core.subtract) | a − b. |
| [Multiply](core.multiply) | Multiplies two or more numbers. |
| [Divide](core.divide) | a ÷ b, with the remainder. |
| [Min · Max · Average](core.stat) | The smallest, the largest or the average of two or more numbers. |
| [Calculate](core.math) | Round, absolute value, square root, change sign, sine, cosine, logarithm, exponential. |
| [Limit](core.clamp) | Keeps a number between a minimum and a maximum. |
| [Counter](core.counter) | A number that goes up, goes down and resets with pulses. |

### Text

| Block | What it does |
|---|---|
| [Format text](core.format) | A text built from a template with placeholders in braces, like `Hello {name}`. |
| [Join text](core.concat) | Joins two or more texts, with a separator. |
| [Text operation](core.text) | Upper case, lower case, trim spaces, length, contains, replace. |

### Objects

| Block | What it does |
|---|---|
| [Get field](core.get) | Takes a field from an object or an item from a list, with a path like `a.b.0`. |
| [Build object](core.compose) | Puts several values together in an object, one field per input. |
| [Split object](core.decompose) | Splits an object into its fields, one output per field. |
| [Build list](core.list) | Puts several values together in a list, in the order of the inputs. |

### Time

| Block | What it does |
|---|---|
| [At start](core.onStart) | A pulse when the program starts. |
| [Every…](core.every) | A pulse at regular intervals; it is turned on and off with **on**. |
| [Wait](core.delay) | Sends every value out after a number of seconds; no value is lost. |
| [Settle](core.debounce) | Sends only the last value, when they stop arriving for a while. |
| [At most every](core.throttle) | Lets at most one value through every so many seconds; drops the others. |
| [Date and time](core.now) | The date and time right now: ISO, milliseconds and parts (year, month, day…). |

### Console

| Block | What it does |
|---|---|
| [Write to console](core.consoleWrite) | Writes a line to a console, with a level (normal, information, warning, error); it can clear it. |
| [Read from console](core.consoleRead) | Asks a question and sends the answer as text, number, yes/no or a key. |

### Schema ports

| Block | What it does |
|---|---|
| [Schema input](core.schemaIn) | An input port of the schema: it receives values from the other schemas of the project. |
| [Schema output](core.schemaOut) | An output port of the schema: it sends values to the other schemas of the project. |

### UI components

| Block | What it does |
|---|---|
| [UI component](core.component) | The object of a window component, in a schema: it has the ports of the component. You create it from the window, not from the Blocks tab. |

## Good to know for all blocks

### How a block runs

A value that arrives on an input stays as the value of that input; if the input **starts the block**, the block works with the last value of each input. A block handles values one at a time, in the order they arrive, and the blocks go on independently of each other: one that waits (a question, a wait) does not stop the others. All of this is explained in [How a block works](ide/blocks).

### How values are read

Many blocks convert what they receive. The rules are the same across the whole package:

| It needs | How it is read |
|---|---|
| **a number** | A number stays as it is; yes is 1 and no is 0. A text is read after changing the **first** comma into a dot: `"2,5"` → 2.5, `" 42 "` → 42, `"1e3"` → 1000, `""` → 0. `"1.234,5"` and `"ciao"` are not numbers. A missing value is 0. |
| **a yes/no** | A text is **no** if, once spaces are removed and ignoring case, it is empty, `0`, `false`, `no` or `off`; any other text is **yes** (even the Italian word `falso`). Other values: 0, `null` and a missing value are no; every object and every list, even empty, is yes. |
| **a text** | A text stays as it is; a number or a yes/no becomes its text (`21.5`, `true`); `null` becomes an empty text; an object or a list becomes JSON on one line (`{"a":1}`). |

### The Exception

Every block (except the schema ports) has the **Exception** output. When a block cannot do its job, an object comes out there:

```
{"message": "Il campo «sconto» non esiste", "block": "get1", "schema": "main", "at": 1794405901003}
```

`message` is the message, `block` is the id of the block, `schema` is the schema, `at` is the moment in milliseconds. The messages of the engine and of the blocks are written in Italian, so you see them in Italian: this one means "The field «sconto» does not exist". If the Exception is not linked, the main console writes a red line with the name of the block and the message, for example `Get field: Il campo «sconto» non esiste`.

### Added ports

Some blocks let you add ports in the **Properties** (never on the block). The names of the new ports depend on the block:

| Names | Blocks | Can you rename them? |
|---|---|---|
| letters: **c**, **d**, **e**… (or **a**, **b**… if the block has none) | AND, OR, XOR, Add, Multiply, Min · Max · Average, Join text, First to arrive, Wait for all | no |
| numbers: **1**, **2**, **3**… (in Choose they start from **2**: see its page) | Build list, Route, Sequence, Choose | no |
| a name of your own (it starts as **field 1**, **placeholder 1**, **case 1**, **input 1**…) | Build object, Split object, Format text, Cases, Write to console | yes, up to 60 characters |

A block can have at most the number of added ports its page says, and in any case no more than the **Added ports per block, at most** limit of the engine (32 by default).

### Time and starting

- The At start, Value (with **Send at start**) and Every… (with **Starts on its own**) blocks start when the program starts. At start and Value send **before** the **initial values** of the inputs arrive: see [At start](core.onStart).
- The times of Every…, Wait, Settle and At most every are counted by the computer where lilOS runs. When the program stops, the values that were waiting are lost.
- All blocks have a **time limit** to do their job (30 seconds by default): it matters for [Read from console](core.consoleRead), which waits for a person. The waits of Wait and Settle do not count: the block has already finished, it is the value that waits.
- A program that makes more than 10000 block runs in 10 seconds (by default) is stopped, because it looks like an endless loop. See [Limits](logicstudio-engine/limits).

## Examples

### 1. Guess the number

A single schema that plays in the console.

```
[At start] pulse ──▶ ask [Read from console: "Guess a number from 1 to 10", number] value     ──▶ a [Compare: a = b]
                                                                                     cancelled ──▶ send [Value: "See you next time!"] value ──▶ value [Write to console]

[Compare] if true  ──▶ send [Value: "Well done, it was 7!"] value ──▶ value [Write to console: information]
[Compare] if false ──▶ send [Value: "No, try again"]        value ──▶ value [Write to console: warning]
[Compare] if false ──▶ ask [Read from console]
```

Settings:

- [Compare](core.compare): operation **a = b**; on **b** the initial value 7 and **starts it** removed.
- The three [Value](core.value) blocks: kind text, **Send at start** removed.
- [Read from console](core.consoleRead): **Time limit** 25 seconds.

A game:

| In the console | What happens |
|---|---|
| question "Guess a number from 1 to 10" | |
| you type `3` | "No, try again" (warning) and the question comes back |
| you type `sette` | «Serve un numero. Riprova.» ("A number is needed. Try again.") and the question comes back |
| you type `7` | "Well done, it was 7!" and the game ends |
| or you type nothing for 25 seconds | "See you next time!" |

The link from **if false** to **ask** goes back: it is a loop, but every turn waits for the answer of a person, so it does not race. The Time limit of 25 seconds avoids the time limit error of a block (30 seconds).

### 2. A log of the turns, with a window

A project with a **main** window that has a [Button](ui.button) **Reset**; the object of the button is in the schema.

```
[Every… 10 s] pulse ──▶ up [Counter] count ──▶ turns  [Build object] object ──▶ value [Write to console]
                                         count ──▶ read [Date and time] ISO ──▶ when
[Button: Reset] pressed ──▶ reset [Counter]
```

Settings:

- [Build object](core.compose): two added inputs, renamed **when** and **turns**; on **turns** remove **starts it**. The count arrives on **turns** and stays there; a moment later the time arrives on **when**, which makes the complete object come out.
- [Write to console](core.consoleWrite): **Format** text.

Every 10 seconds the console writes a line like:

```
{"when":"2026-11-11T14:05:10.004Z","turns":1}
{"when":"2026-11-11T14:05:20.006Z","turns":2}
```

A click on **Reset** brings the [Counter](core.counter) back to 0 and sends 0 on **count**: a line with `"turns":0` comes out at once, and the next turn starts again from 1.

### 3. Two schemas that talk to each other

A project with two schemas, **interface** and **texts**, and a window with a [Text field](ui.text) **search** and a [Value](ui.value) **preview**. The objects of the two components are in the schema **interface**.

Schema **interface**:

```
[Text field: search] text ──▶ value [Settle: 0.5 s] value ──▶ value [Schema output: question, text]
[Schema input: answer, text] value ──▶ value [Value: preview]
```

Schema **texts**:

```
[Schema input: question, text] value ──▶ text [Text operation: UPPER CASE] result ──▶ value [Schema output: answer, text]
```

In the **Map**, link **interface › question** to **texts › question** and **texts › answer** to **interface › answer**.

While the user types "hello world", the field sends a value at every key; [Settle](core.debounce) waits for it to stop for half a second and sends only `hello world`; the schema **texts** transforms it and the window shows `HELLO WORLD`.

### 4. Errors collected in one console

Add a console **Errors** to the project. In each schema, link the **Exceptions** of the blocks that can go wrong to a single block:

```
[Get field: price] Exception ──▶ object [Get field: message] value ──▶ value [Write to console: Errors, error]
[Divide]           Exception ──▶ object
```

When an object without price arrives at [Get field](core.get), the console **Errors** writes in red `Il campo «prezzo» non esiste` ("The field «prezzo» does not exist"); with a divisor of 0, `Divisione per zero` ("Division by zero"). In active programs the lines of level error also end up in the log of the project (by default).

## Known limits

- [Read from console](core.consoleRead) that waits for an answer longer than the **time limit of a block** (30 seconds by default) gives an exception and the answer given afterwards is lost: set a shorter **Time limit**.
- The **Default value** of Read from console works only with hidden consoles; it does not fill an empty answer and does not replace the cancel on time out.
- [At start](core.onStart) and [Value](core.value) send before the initial values of the inputs.
- [Date and time](core.now) uses the time of the computer where lilOS runs, not the one of your browser.
- Two [Schema inputs](core.schemaIn) with the same name in the same schema: only one of the two receives.
- The **Type** of the schema ports is not checked while the program runs.
- The **enabled** and **visible** inputs of the components react only to a real no value, not to the text `"no"`.
- [Get field](core.get) and [Split object](core.decompose) cannot read a field name that contains a dot.

## See also

- [IDE overview](ide/index)
- [How a block works](ide/blocks), [Links](ide/links), [Consoles](ide/consoles)
- [The engine](logicstudio-engine) and its [Limits](logicstudio-engine/limits)
