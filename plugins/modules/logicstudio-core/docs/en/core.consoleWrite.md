# Print (console.log)

`core.consoleWrite` · Console · [Core blocks](logicstudio-core) · version 1

Writes a line to a console of the project every time a value arrives. It can also clear the console.

## Inputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | any | The value to write. Every value that arrives here writes a line. |
| **clear** (`clear`) | pulse | Any value that arrives here empties the console. What arrives does not matter. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **written** (`written`) | pulse | A pulse after every line written. |
| **Exception** (`error`) | object | In practice it does not happen. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Console** (`console`) | the consoles of the project (the main one has the star ★) | the main one | Where to write. |
| **Level** (`level`) | normal, information, warning, error | normal | The kind of line: it changes the color and decides whether the line ends up in the log (see below). |
| **Format** (`format`) | text, readable JSON | text | How to write objects and lists. |

## Added ports

In the **Properties**, **Ports** section, with **Add input** you add up to 16 inputs of type any. They start with the name **input 1**, **input 2**… and you can rename them (up to 60 characters): the name appears in the line. The ↑ ↓ arrows change the order. See [How a block works](ide/blocks).

The added inputs **never write a line by themselves**, even if they have **starts it**: they keep their last value, which is added to the end of the line when something arrives on **value**.

## How it works

### The line

When a value arrives on **value**, the block writes a line made like this:

- first the value of **value**;
- then, for each added input that has already received something, **two spaces** and `name=value`, in the order of the ports. Added inputs with no value do not appear.

For example, with **value** = `"Reading"` and the added inputs **temp** = 21.5 and **ok** = yes, the line is `Reading  temp=21.5  ok=true`.

How values are written:

| Value | **text** format | **readable JSON** format |
|---|---|---|
| text `ciao` | `ciao` | `ciao` |
| number 21.5 | `21.5` (with the dot) | `21.5` |
| yes / no | `true` / `false` | `true` / `false` |
| `null` | nothing (the part stays empty) | nothing |
| object | on one line: `{"a":1,"b":[1,2]}` | on several lines, indented by two spaces |
| list | on one line: `[1,2]` | on several lines, indented by two spaces |

Numbers are written the way the computer calculates them: `0.1 + 0.2` gives `0.30000000000000004`. For a number with few decimals, first use [Math functions](core.math) with **round**.

### Level and log

| Level | How it looks | In the log of the project |
|---|---|---|
| **normal** | plain line | no (by default) |
| **information** | line in the highlight color | no (by default) |
| **warning** | line in the color of warnings (yellow) | **yes** (by default) |
| **error** | line in the color of errors (red) | **yes** (by default) |

Lines go to the **log** only for active programs and apps, never in a Test; what to copy is chosen in **Project options → Consoles** (nothing, only warnings and errors, all). See [Consoles](ide/consoles).

### The console

- The **Console** is one of those of the project. If the chosen console is removed from the project, the block writes to the **main** one.
- In a schema opened alone (without a project) there is only the main one.
- **clear** empties the whole console, for everyone who is looking at it. It writes nothing and does not send **written**.

### Limits

- A long line is **cut at 1000 characters**.
- A console accepts at most **50 lines a second** (by default: the administrator changes it with **Console lines per second, at most**). The extra lines are not written; at the first line written in a later second the warning «… *N* righe non mostrate (troppe al secondo)» ("… *N* lines not shown (too many per second)") appears. The block sends **written** also for lines that are not shown.
- A console keeps the last lines (1000 by default, from 100 to 2000 in **Project options → Consoles**) and at most about 400,000 characters: the oldest go away.

For the general rules see [How a block works](ide/blocks).

## Examples

### 1. A line with values next to it

Add two inputs and name them **temp** and **ok**. **Level** warning.

```
[…] ──▶ value [Print (console.log): warning]
[…] ──▶ temp
[…] ──▶ ok
```

They arrive, in this order: **value** = `"Reading"`, **temp** = 21.5, **value** = the object `{"a":1,"b":[1,2]}`, **ok** = yes, **value** = `null`. The console writes three warning lines:

```
Reading
{"a":1,"b":[1,2]}  temp=21.5
  temp=21.5  ok=true
```

(The third starts with two spaces because `null` writes nothing.) What arrives on **temp** and **ok** writes no lines.

### 2. Readable JSON

**Format** readable JSON. The object `{"a":1,"b":[1,2]}` arrives. The console writes:

```
{
  "a": 1,
  "b": [
    1,
    2
  ]
}
```

### 3. Clear and write at every round

```
[Interval (setInterval): 5 s] pulse ──▶ clear [Print (console.log)]
             pulse ──▶ read [Now (date and time)] ISO ──▶ value [Print (console.log)]
```

The two links go to the **same** Print (console.log) block: every 5 seconds the console is emptied and then shows only the time of the last reading.

### 4. Errors in a separate console

Add a console **Errors** to the project. Link the **Exceptions** of the blocks you care about to a Print (console.log) block with **Console** = Errors and **Level** error: errors no longer end up in the main one, and in active programs they stay in the log.

```
[HTTP request (fetch)] Exception ──▶ value [Print (console.log): Errors, error]
```

The line is the object of the error, for example `{"message":"…","block":"request1","schema":"main","at":1794405901003}`. To write only the message, put [Get property](core.get) with Field `message` before it.

## See also

- [Input (readline)](core.consoleRead)
- [Consoles](ide/consoles)
- [Template string](core.format) to build more complex lines
- [How a block works](ide/blocks)
