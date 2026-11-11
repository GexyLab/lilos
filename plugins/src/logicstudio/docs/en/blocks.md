# How a block works

This is the reference page on **how a block runs**. It holds for all the blocks of all the packages: the pages of the single blocks only say what each one does.

In short: values arrive on the **inputs**; when a value arrives on an input that **starts it**, the block works with **the last value of every input** and sends the results from the **outputs** along the links.

## Inputs keep the last value

Every input remembers **the last value** that arrived at it. The value stays there until another one arrives, even if the block has worked in the meantime.

- An input that **has never received anything** has no value. Many blocks ignore it: an **Add** with only **a** = 5 gives 5.
- The value `null` is a value like the others (on the sheets you see `∅`).

## «starts it»

In the **Properties**, under each input, there is the **starts it** checkbox:

- **ticked** (default): when a value arrives on that input, the block works at once;
- **unticked**: the value is only **kept**, and will be used the next time the block works because something arrived on another input.

On the block, the name of an input that does not start it is **underlined with dots**.

Some blocks have inputs that **by their design** do not start them: for example **question** of [Input (readline)](core.consoleRead), **title** and **text** of [Notify](lilos.notify), **path** of [readFile](lilos.fileRead). The page of the block says so.

> In this version, for these inputs the Properties still show **starts it** ticked and the name is not underlined, but the block does not start. Careful: if you give one of these inputs a **start value**, the engine treats it as an input that starts. To be sure it does not start the block, untick **starts it** on that input yourself.

The **pulses** (inputs of type pulse, like **send**, **read**, **up**) exist precisely to start: the moment they arrive matters. A pulse is a `true` that lasts an instant: the input is `true` for the work it starts, then goes back to `false` without making the block start again. A pulse input does not start with `false`.

### An example

```
[Slider: price]    value ──▶ a  [Multiply (×)] result ──▶ value [Value component: total]
[Slider: quantity] value ──▶ b
```

- With **starts it** on **a** and **b**: moving either slider, the total updates.
- Unticking **starts it** on **a**: moving the price does nothing; the new price will be used when you change the quantity.

## The start value

Every input (except those of type pulse) can have a **start value**, in the **at start** field of the Properties. When the program starts, the value arrives at the input **as if it had arrived from a link**:

- if the input **starts it**, the block works at once at start;
- if it does not start it, the value just stays there, ready.

The field reads the text as JSON (`5` is a number, `"5"` a text, `true` a yes, `[1,2]` a list, `{"a":1}` an object); what is not JSON is a text (`ciao`). Empty means no start value. You cannot give `null` as a start value.

The start value is handy for parameters: the threshold of the **Compare** block, the divisor of the **Divide** block, the fixed text of the **Print** block.

## The start of the program

When a program starts (test, active program or app), the engine:

1. calls the start of every block that has one, in the order of the blocks in the file: for example **Constant · Variable** with nothing linked to **send** sends its value, **On start** sends a pulse, **Interval** with **Starts on its own** turns its clock on, **Counter** sets itself to the **Start from** value;
2. gives every input its **start value**;
3. starts the blocks that run continuously (if a package has any).

The values sent in this phase travel like all the others: a block that receives two values at start works twice.

The blocks that are in a **group** do none of this when the program starts: they do it when the **Run** port of the group receives a pulse, and again at every pulse. See [Groups](ide/groups).

## One thing at a time

Every block has a **queue** of incoming values and handles them **one at a time, in the order they arrived**:

1. it takes the first value of the queue and puts it on its input;
2. if that input starts it, it works with the last value of every input and waits until it has finished;
3. it sends the results from the outputs;
4. it moves on to the next value.

Consequences:

- a slow block (an **HTTP request** block, a question in the console) **does not stop the others**: the other blocks go on, only the values for it wait in line;
- a block never works twice at the same time;
- when a block sends values from several outputs, the blocks that receive them begin after it has finished sending them all.

A block knows **which input** started it and can behave differently: the **Counter** goes up with **up**, goes down with **down** and returns to the start with **reset**; **Print** writes with **value** and clears with **clear**.

## The outputs

When a block has finished, it sends its results from the outputs, along **all** the links of each output.

- A block that **gives nothing** on an output sends nothing on that output: **Compare** sends a pulse on **if true** or on **if false**, never on both.
- An output that is not linked does nothing (except **Exception**, see below).
- Some blocks send values **later**, by themselves: **Delay** after the chosen seconds, **Interval** at every tick, **Debounce** when the input stops.
- The values are those that can be written in JSON: numbers, texts, yes/no, lists, objects and `null`. Between the engine and the windows (or the IDE) they travel as copies; a value that comes from a window can be at most 256 KB.

## The «Exception» output

Every block has, as its last output, **Exception** (internal name `error`). When something goes wrong while the block works (a number that is not a number, a division by zero, a file that is not there, a network that does not answer), the block **sends nothing on its normal outputs** and sends an object on **Exception**:

```json
{
  "message": "Divisione per zero",
  "block": "divide1",
  "schema": "main",
  "at": 1762790400000
}
```

| Field | What it contains |
|---|---|
| `message` | The error message (written in Italian by the blocks: here «Divisione per zero», "Division by zero"). |
| `block` | The id of the block in the schema (for example `divide1`). |
| `type` | The type of the block (for example `core.divide`; from engine 1.3.0). |
| `schema` | The name of the schema. |
| `at` | When it happened, in milliseconds since 1 January 1970. |

- If **Exception is linked**, the object goes along its links like any value. You can write it to a console, send a notification, count the errors…
- If it is **not linked**, the object goes to the [Global catch (onerror)](core.onError) block of the schema (or of the whole program), if there is one. Otherwise a line of level error appears in the **main console** with the name of the block and the message, for example `Divisione (÷ %): Divisione per zero`. The name is that of the kind of block (in Italian), not the label you gave it.
- To **handle** exceptions there are the blocks of the **Exceptions** category: [Catch](core.catch) chooses which ones to handle, [Exception data (e.message…)](core.errorInfo) reads their fields, [Throw](core.throw) throws one of yours or rethrows the one that arrives.

On the schema the **Exception** port is **red** (its link too), so it stands out from the others.

During the test a block that has gone into error has a **red border**, until it works again without errors; the label on the link of an Exception is red with `⚠`.

### A block that is too slow

A block that takes more than **30 seconds** (default: «Time a block may take», in the limits of the engine) is considered failed: on **Exception** arrives «Divisione (÷ %) ha impiegato più di 30 s» ("Dividi took more than 30 s", with the name of the block) and what the block gives later is thrown away.

> This holds for **Input** too: in this version a question that nobody answers within 30 seconds sends «Input (readline) ha impiegato più di 30 s» ("Leggi da console took more than 30 s") on the Exception, and the answer given afterwards is lost. See [Consoles](ide/consoles).

## Added ports

Some blocks allow you to **add ports**: the **Add** block more addends, **AND** and **OR** more conditions, **Template string** more placeholders, **Switch · Case** more cases, **Print** more values to write on the same line. The page of each block says how many and of what type.

- They are added **only** in the **Properties**, **Ports** section, with **Add input** or **Add output**. Next to it is the count: **Added: 2 of 16**. At most the number the block says, and in any case no more than **32** per block (limit of the engine).
- On the block the added ports have the name in ***italics***.
- The **name** depends on the block:

| The block gives | Names | Example |
|---|---|---|
| letters | the first free letter | **Add**: **c**, **d**, **e**… |
| numbers | the number that follows the base ports | **Pick by index**: **2**, **3**… |
| a name of yours | a proposed name, which you can change | **Template string**: «placeholder 1», then you rename it to `nome` |

- With **Move up** and **Move down** (↑ and ↓) you change the order of the added ports (for example the order of the steps of a **Sequence**).
- With **Remove** you remove an added port: if it has links, the IDE asks for confirmation and removes them; **Ctrl+Z** puts everything back.
- The **base ports** (the ones the block always has) have the padlock: they cannot be removed. (The hint says **Base port: it cannot be removed**.)
- Renaming a port does not touch its links: inside, every added port has a fixed id (`x1`, `x2`…).

For many blocks the added ports **only keep their value**: they do not start the block, which starts with a base input. For example in the **Print** block it writes only when **value** arrives, and the added inputs are added to the line as `name=value`. The page of the block says so.

## Loops

You can make a **loop**: the output of a block comes back, through other blocks, to one of its inputs. It is useful, but a loop without pauses runs forever.

The engine counts the **runs** of the blocks of each program: beyond **10000 in 10 seconds** (default) the program stops with «Troppe esecuzioni: più di 10000 in 10 secondi (un ciclo di collegamenti?)» ("Too many runs: more than 10000 in 10 seconds (a loop of links?)"). In a test you see it in the **Problems**; for an active program you get a notification.

For a loop that must last, put a **Delay** in the circuit:

```
[On start (main)] pulse ──▶ up [Counter (++ −−)] count ──▶ value [Delay (setTimeout): 1 s] value ──▶ up [Counter (++ −−)]
                         count ──▶ value [Print (console.log)]
```

Every second the counter goes up by 1 and writes it, forever (or until the end of the test).

The other limits that hold while the program runs:

| Limit | Default | What happens |
|---|---|---|
| Runs in 10 seconds | 10000 | The program stops. |
| Time of a block | 30 s | Error on the **Exception** of the block. |
| CPU | 25% per user | The blocks slow down: after using their share of a second, they wait for the next second. |
| Memory | 128 MB per user | **All** your programs stop: «Memoria finita: i programmi hanno usato più della tua quota di memoria» ("Memory is out: the programs used more than your memory quota"). |
| Console lines | 50 per second per console | The extra lines are not written: «… 12 righe non mostrate (troppe al secondo)» ("… 12 lines not shown (too many per second)"). |

See [Limits](logicstudio-engine/limits).

## Passwords and long texts

Some settings in **Properties** are special fields:

- **Password** (for example a database block's): what you type is never shown nor given back. The engine **encrypts** it for you on this lilOS and the schema keeps only the encrypted text; under the field you read «Saved, encrypted: type to change it» or «Not set», and **Clear** removes it. A schema copied from another user, or opened on another lilOS, cannot use it: the block sends «Password non leggibile: va inserita di nuovo nelle Proprietà del blocco» (the password cannot be read: type it again in the block's Properties) to its Exception output, and typing it again is enough.
- **Texts on several lines** (for example an SQL query): a box in a fixed-width font that grows by dragging its corner. The text counts when you leave the field.

## Special blocks

- **Parameter**: it does not work; it sends from its **value** output what arrives at its port from the other schemas.
- **Return**: when a value arrives on **value**, it sends it to the **Parameter** blocks linked in the Map.
- **Object of a component**: the values that arrive at its inputs go to the component in the window (the text of a label, the value of a gauge); what the user does in the window comes out of its outputs (**pressed**, **value**). It does not work like a normal block and has neither **starts it** nor start values. See [The object of a component](ide/components).

## Examples

### 1. Recalculating at every value

```
[Constant · Variable: 2] value ──▶ a  [Add (+)] result ──▶ value [Print (console.log)]
[Constant · Variable: 3] value ──▶ b
```

At start the two Constant · Variable blocks send 2 and 3. The Add block works twice: the console writes `2` (only **a** has a value) and then `5`.

### 2. Only the final result, with «starts it»

Same schema, but in the Properties of the Add block untick **starts it** on **a**. At start 2 arrives on **a** (kept), then 3 on **b** (starts): the console writes only `5`.

### 3. A threshold with the start value

```
[Number field] value ──▶ a [Compare (== != < >): a > b, b = 30] if true ──▶ send [Constant · Variable: Troppo caldo] value ──▶ value [Print (console.log)]
```

1. On **Compare**: **Operation** = **a > b**; on **b** start value `30` and **starts it** unticked.
2. On **Constant · Variable**: **Kind** = **text**, **Value** = `Troppo caldo`. Then, in the Properties, turn on the **eye** next to the **send** port, which is hidden by default.
3. Link **if true** to **send** of the Constant · Variable block (with **send** linked, it sends the value only at each pulse and not at start; not directly to **Print**: the pulse would carry `true`, and the console would write `true`).

Every number above 30 typed in the field makes «Troppo caldo» ("Too hot") be written.

### 4. Handling an error

```
[Number field: divisore] value ──▶ b [Divide (÷ %)] result ──▶ value [Value component: risultato]
                                          Exception ──▶ object [Get property: message] value ──▶ value [Print (console.log): warning]
```

On **Divide**, **a** has start value `100` and **starts it** unticked. Typing `4` in the window shows 25. Typing `0`, **Divide** sends the error object on **Exception**; **Get property** (setting **Field (a.b.0)** = `message`) takes the message from it and the console writes `Divisione per zero` as a warning, instead of the error line `Divisione (÷ %): Divisione per zero` in the main console.

### 5. An added port that keeps a value

```
[Text field: nome]      text ──▶ nome   [Print (console.log)]
[Text field: messaggio] text ──▶ value
```

On **Print** press **Add input** and rename the port to `nome`. Typing in the field **nome** writes nothing (the port only keeps the value); typing `ciao` in the field **messaggio** writes the line `ciao  nome=Ada`.

## See also

- [Links and port types](ide/links)
- [Schemas](ide/schemas)
- [Consoles](ide/consoles)
- [Programs](logicstudio-engine/programs)
- [Limits](logicstudio-engine/limits)
