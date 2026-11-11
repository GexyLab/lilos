# Read from console

`core.consoleRead` · Console · [Core blocks](logicstudio-core) · version 1

Asks a question in a console of the project, waits for the answer of whoever uses the program and sends it, already converted to the type you choose: text, number, yes/no or a key.

## Inputs

| Port | Type | Description |
|---|---|---|
| **ask** (`ask`) | pulse | Any value that arrives here makes it ask the question. Every arrival is a question. |
| **question** (`question`) | text | The text of the question, if you want to change it while the program runs. It **does not start the block**: it keeps the text for the next question. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | any | The valid answer, in the chosen **Kind of answer**: text, number or yes/no (a key is a text of one character). |
| **cancelled** (`cancelled`) | pulse | A pulse when the question ends without a valid answer: **Esc**, time out, invalid answer without **Ask again**, hidden consoles without a default value. |
| **Exception** (`error`) | object | When the block waits longer than the time a block may take (see **Watch out** below). |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Console** (`console`) | the consoles of the project (the main one has the star ★) | the main one | Where to ask the question. |
| **Question** (`question`) | a text | empty | The text of the question, when the input **question** has no value. |
| **Kind of answer** (`kind`) | text, number, yes/no, a key | text | What answer is needed, and what type it comes out as on **value**. |
| **Default value** (`fallback`) | a text | empty | The answer to use when **nobody can answer** (hidden consoles); in the console it shows in grey in the answer field. See below. |
| **Time limit (seconds, 0 = none)** (`timeout`) | from 0 to 86400 | 0 | After how many seconds the question cancels itself. 0 means never. |
| **Ask again if the answer is not valid** (`retry`) | yes / no | yes | With an invalid answer: if checked the question is repeated; if removed the question ends with **cancelled**. |
| **Hide what is typed** (`secret`) | yes / no | no | For passwords: while you type you see dots and in the console a line of dots stays. |

## How it works

### The question

When something arrives on **ask**, the block shows the question in the chosen console and waits.

- The text is that of the input **question**, if it has received a value (even an empty text), otherwise that of the setting **Question**. It is cut to 500 characters.
- In the console a line with the question appears (highlighted) and, at the bottom, the field to answer in, with the kind of data requested and the hint "Enter sends · Esc cancels". If the question is empty, only the field appears.
- You answer from **any copy** of the console: the panel at the bottom in the IDE, the console window of an active program, the console inside a window of the project. The first answer that arrives counts.
- While the block waits, **the rest of the program goes on**.

Outside the IDE, if the program asks a question and no window of the project is open, you receive a **notification** that opens the console (at most one every 30 seconds per console; it is turned off in the Project options). See [Consoles](ide/consoles).

### The answer

When you press **Enter**, a line stays in the console with what you wrote (or dots, at most 12, with **Hide what is typed**). Then the answer is checked according to the **Kind of answer**:

| Kind of answer | Valid answers | What comes out on **value** | Message if it is not right |
|---|---|---|---|
| **text** | anything, even nothing | the text **as it is**, spaces included (at most 4000 characters) | — (it is always valid) |
| **number** | digits with a `+` or `-` sign in front if you like, the comma **or** the dot for decimals, the exponent: `12`, `-3`, `2,5`, `2.5`, `,5`, `12,`, `1e3`, `1,5E-2`. Spaces at the sides allowed | the number | Serve un numero. Riprova. ("A number is needed. Try again.") |
| **yes/no** | for yes: `sì`, `si`, `s`, `yes`, `y`, `true`, `1`, `vero`, `on`; for no: `no`, `n`, `false`, `0`, `falso`, `off`. Upper case and spaces at the sides do not count | yes or no | Serve sì o no. Riprova. ("A yes or no is needed. Try again.") |
| **a key** | any key that writes a character | the character (a text) | Serve un tasto. Riprova. ("A key is needed. Try again.") |

Notes on the kinds:

- **number**: thousands separators (`1.000,50`, `1 000`), letters (`12 euro`) and hexadecimal numbers are not accepted.
- **a key**: you just **press the key**, without Enter: the answer goes at once. If instead you write several characters (for example by pasting them) and press Enter, the first counts. Enter with an empty field is not right. Arrows, Tab and the other keys that do not write a character do not answer.
- With **Hide what is typed** the answer is hidden only on the screen: on **value** it comes out in clear. Do not write it to a console and do not save it in a file.

If the answer **is not right**:

- with **Ask again if the answer is not valid** checked (the default), the console writes the warning (for example «Serve un numero. Riprova.») and repeats the question, with no limit of attempts;
- if it is removed, the question ends and the block sends **cancelled**.

### When the question ends without an answer

The block sends **cancelled** when:

- whoever answers presses **Esc**;
- the seconds of the **Time limit** pass (if it is not 0). The time is counted **from when the block asked the question**, even if the question was still waiting in line behind another (see below): a question in line can expire before being seen;
- the answer is not right and **Ask again** is removed;
- the consoles are hidden and the default value is missing or is not right (see below).

When the program stops, open questions disappear and the block sends nothing.

### The default value

The **Default value** is used **only when nobody can answer**: in an active program or in an app whose project has, in **Project options → Consoles**, the choice **Do not show them**. Then the question is not shown and the block answers at once by itself:

- with the Default value, read according to the **Kind of answer** (for example `42` with the kind number comes out as the number 42);
- with **cancelled**, if the Default value is empty or is not valid for the kind (for example `abc` with the kind number).

In a **Test** the consoles are always visible, so the default value is never used by itself.

With the console visible the default value **shows only as a hint** in grey in the answer field: **Enter with the field empty does not use it**. With the kind text an empty text comes out; with the other kinds the empty answer is not valid. When the **Time limit** runs out, **cancelled** comes out, not the default value.

### Several questions together

- **A console asks one question at a time.** If several blocks ask in the same console, the questions wait in line and appear one after the other, in the order they were asked. In different consoles the questions are independent.
- **The same block** asks one question at a time: another **ask** that arrives while it waits for the answer stays waiting, and the question is asked again right after the answer (or the cancel) of the first. With three **ask** in a row, the question is asked three times.
- A text that arrives on **question** while the block waits applies to the **next** question, it does not change the one shown.

### Watch out: the time a block may take

The engine does not let a block work longer than a certain time: **30 seconds** by default (**Time a block may take (seconds)**, in Control Panel → Logic Studio → Limits; see [Limits](logicstudio-engine/limits)). Read from console counts as at work **while it waits for the answer**. So today, if nobody answers within that time:

- the block sends on **Exception** the message «Leggi da console ha impiegato più di 30 s» ("Read from console took more than 30 s", with the number of seconds of the limit);
- the question **stays in the console**, but the answer given afterwards **no longer comes out** on **value** (it is lost);
- until that question receives an answer or is cancelled (Esc), the other **ask** that arrive at that block **are ignored**.

To avoid it, set a **Time limit** shorter than the time a block may take (for example 25 seconds): the question ends with **cancelled** before the error goes off. If you need longer waits, ask an administrator to raise **Time a block may take (seconds)** (up to 600 seconds).

### The question input and the initial value

By default the input **question** **does not start** the block. But if you give it an **initial value** in the Properties, the engine treats it as an input that **starts it**: when the program starts the block asks the question at once. In the Properties the **starts it** box of **question** appears checked even when the input does not start the block. If you only want a fixed text, write it in the setting **Question** instead of the initial value; if you really need the initial value, **uncheck** **starts it** of **question**: this way the block asks nothing at start.

For the general rules see [How a block works](ide/blocks).

## Examples

### 1. Ask the age and answer

```
[At start] pulse ──▶ ask [Read from console: "How old are you?", number] value     ──▶ a [Compare: a ≥ b]
                                                                          cancelled ──▶ send [Value: "No answer"] value ──▶ value [Write to console]

[Compare] if true  ──▶ send [Value: "You can come in"]           value ──▶ value [Write to console]
[Compare] if false ──▶ send [Value: "Come back in a few years"]  value ──▶ value [Write to console]
```

On [Compare](core.compare) **b** has the initial value 18 and **starts it** removed. The three [Value](core.value) blocks are of kind text and have **Send at start** removed, so they speak only when they receive a pulse. What happens with some answers:

| Written in the console | Result |
|---|---|
| `20` | 20 comes out → "You can come in" |
| `17,5` | 17.5 comes out → "Come back in a few years" |
| `venti` | «Serve un numero. Riprova.» and the question repeats |
| Esc | **cancelled** → "No answer" |

If nobody answers for more than 30 seconds the error described in **Watch out** goes off: this is why it is a good idea to give the block a **Time limit** of 25 seconds, so after 25 seconds **cancelled** comes out → "No answer".

### 2. A confirmation with a key and a time limit

**Kind of answer** a key, **Question** `Delete the file? (y/n)`, **Time limit** 20.

```
[Read from console] value     ──▶ a [Compare: a = b] if true ──▶ … [Write file]
                    cancelled ──▶ …
```

On Compare **b** has the initial value `y` and **starts it** removed.

Pressing `y` the file is written; pressing `n` (or any other key) it is not. After 20 seconds without an answer **cancelled** comes out. Watch out: capital `Y` is another character; to accept both use the kind **yes/no**, which accepts `s`, `S`, `sì`, `yes`…

### 3. A password

**Kind of answer** text, **Question** `Server password:`, **Hide what is typed** checked. Writing `segreto1` the console shows `••••••••` and on **value** `"segreto1"` comes out, to link where needed (for example to a [Web request](net.request)), without ever writing it to the console.

### 4. A program with no visible consoles

A project with **Project options → Consoles → Do not show them**, activated. A Read from console with kind number and **Default value** `5` sends 5 on **value** at once, showing nothing. With **Default value** empty it sends **cancelled** at once.

## Errors

| Message | When |
|---|---|
| Leggi da console ha impiegato più di *N* s ("Read from console took more than *N* s") | No answer within the **Time a block may take** of the engine (30 seconds by default). See **Watch out** above. |

The warnings «Serve un numero. Riprova.», «Serve sì o no. Riprova.» and «Serve un tasto. Riprova.» appear in the console, not on the Exception.

## See also

- [Write to console](core.consoleWrite)
- [Consoles](ide/consoles)
- [Compare](core.compare) and [Cases](core.switch) to decide what to do with the answer
- [Limits](logicstudio-engine/limits)
- [How a block works](ide/blocks)
