# Consoles

A **console** is the place where the program **writes lines** and **asks questions** of whoever uses it. Every project has the **main** console (with the star ★), which is always there and also receives the errors that no block handles, and it can have others, each with its own name and colour.

Consoles live in the **engine**, not in the IDE: an active program goes on writing and asking questions even with the IDE closed, and lilOS opens the consoles for it when needed.

## The console blocks

They are in the [Base blocks](logicstudio-core) package, category **Console**.

### Print (console.log)

[Print (console.log)](core.consoleWrite) writes a line when a value arrives on **value**, and clears the console when a pulse arrives on **clear**. After writing it sends a pulse on **written**.

| Setting | Choices |
|---|---|
| **Console** | A console of the project (the main one has ★). |
| **Level** | **normal**, **information**, **warning**, **error**: the colour of the line. |
| **Format** | **text**: an object or a list is written as JSON on one line; **readable JSON**: as indented JSON, on several lines. |

The added inputs are written on the same line as `name=value` (but they do not start the writing).

### Input (readline)

[Input (readline)](core.consoleRead) asks a question when a pulse arrives on **ask**, waits for the answer and sends it on **value**; if the question is cancelled, it sends a pulse on **cancelled**. The **question** input (a text) takes the place of the question written in the settings.

| Setting | What it does |
|---|---|
| **Console** | Where the question is asked. |
| **Question** | The text of the question. |
| **Kind of answer** | **text**, **number**, **yes/no** or **a key**. |
| **Default value** | Shown in the answer field as a hint; it is also the answer given when the consoles are hidden. |
| **Time limit (seconds, 0 = none)** | After this time with no answer, the question is cancelled. |
| **Ask again if the answer is not valid** | If the answer is not of the right type, the question is repeated; if it is unticked, the question is cancelled. |
| **Hide what is typed** | For passwords: dots are shown in the field, and in the console the answer becomes `••••`. |

The valid answers by type:

| Type | Valid | Become |
|---|---|---|
| text | anything, even empty | the text as it is |
| number | `12`, `-3`, `2.5`, `2,5`, `1e3` | a number |
| yes/no | `sì`, `si`, `s`, `yes`, `y`, `true`, `1`, `vero`, `on` · `no`, `n`, `false`, `0`, `falso`, `off` (upper or lower case) | `true` · `false` |
| a key | the first character pressed | that character |

An invalid answer writes a warning such as «Serve un numero. Riprova.» ("A number is needed. Try again.") («Serve sì o no.», "Yes or no is needed."; «Serve un tasto.», "A key is needed.") and asks the question again.

Rules:

- in a console **one question at a time** is asked: the others wait in line and appear when the first one has its answer;
- an **ask** that arrives while the same block is already waiting for an answer is ignored;
- while a block waits, **the other blocks go on**;
- when the program stops, the questions waiting are cancelled.

> In this version a question with no answer for more than **30 seconds** (the engine's «Time a block may take») makes the block send the error «Input (readline) ha impiegato più di 30 s» ("Leggi da console took more than 30 s") on the **Exception**, and the answer given afterwards is lost. If you need more time, ask the administrator to raise that limit in the Control Panel → Logic Studio → Limits.

## The panel at the bottom

Under the editors there is a tab for each console of the project, the main one first:

```
● ★ Main │ ● Allarmi ⌨ │ + │ Problems 2            Detach  ▾
```

| Element | What it does |
|---|---|
| ● | The colour of the console. |
| ★ | The main console: «The main console: it is always there and gets the exceptions no block handles». |
| ⌨ | The console is **waiting for an answer**. |
| **+** | **New console**: asks for the name and adds it to the project. It is not there for a schema alone. |
| **Problems** | The problems found by the test (see [Test and active programs](ide/run)), with their number. |
| **Detach** | During a test, opens the console shown in a window of its own, **Console Name**: useful with two screens. |
| ▾ / ▴ | **Hide the panel** / **Show the panel**. A click on a tab opens it again. |

Without a test the panel says «Test the project to see its consoles here.» During a test:

- each line has the time (`14:05:32`) and the colour of its level; questions and answers have a style of their own;
- the panel shows the last 1000 lines of each console and scrolls by itself, if you were at the bottom;
- when a block asks a question, the panel opens on that console and puts the cursor in the answer field: on the left the question and `›`, on the right «Enter sends · Esc cancels · number» (the kind of answer);
- **Enter** sends the answer, **Esc** cancels the question; with **a key** you just press the key.

When the test is over, the consoles stay readable until the next test.

## The consoles of the project

They are managed in **Project options → Consoles** (see [Projects](ide/projects)):

| Column | What it does |
|---|---|
| **Name** | The name of the console (at most 60 characters; an empty name is not accepted). |
| **Color** | One of 8 colours: grey (default), teal, orange, blue, violet, red, green, yellow. |
| **Lines kept** | How many lines the engine remembers, from 100 to 2000 (default 1000). The oldest go away. |
| **Remove** | Removes the console (asks for confirmation). |

- The main one is «fixed: renamed, never removed». In this version its name in the table cannot be edited: it is called **Principale** (shown as **Main** in the tab).
- **New console** adds one called «Console 1», «Console 2»…; it turns off when the project has 10 (the default limit). The **+** of the panel at the bottom, instead, does not check the limit: beyond it, the test says «Troppe console: al massimo 10» ("Too many consoles: at most 10").
- «Removing a console, its blocks write to the main one.»: the blocks that write to a console that is no longer there write to the main one.
- Besides the lines, every console keeps at most 400000 characters; a line is at most 1000 characters long and a question 500.
- A console writes at most **50 lines per second** (default): the others are counted and every so often «… 12 righe non mostrate (troppe al secondo)» ("… 12 lines not shown (too many per second)") appears.
- «Lines kept in memory count in your memory quota; lines copied to the log count in your log quota.»

A schema alone has only the main console (unless its file lists others: see [File formats](ide/formats)).

## Outside the IDE

When the project runs as an **active program** or as an **app**, no IDE shows the consoles: lilOS opens them, in windows of their own, according to the **Outside the IDE** choice:

| Choice | What happens |
|---|---|
| **Show them all** | Each console opens in a window when the first window of the project opens; a question opens (or brings to the front) its console. |
| **Only when they ask for something** (default) | A console opens when a **Input** block waits; after the answer it closes, if **Close the console after the answer** is ticked. |
| **Do not show them** | Nothing on screen. The lines go to the log as **Copy to the log** says; questions get the **Default value** at once (converted to the kind of answer) or, if they have none or it is not valid, are cancelled. |
| **All in the main console** | One window, **Console**, with the lines of all the consoles; every line that is not from the main one has a label with the name of its console. It opens according to **With «All in the main console», the main one opens**: **when the project starts** (with the first window of the project) or **when it asks for something**. |

In a **test** these choices do not count: the consoles are in the panel of the IDE and questions are always asked there.

### Notifications

With **A notification when a console asks for something and the project has no windows open** ticked (default), when an active program asks a question and nobody is looking at it (neither the IDE nor one of its windows is open), you receive a lilOS **notification**. Its button opens the console (with **All in the main console**, the window of all of them). For the same console at most one notification arrives every 30 seconds. With **Do not show them** no notifications arrive.

The question meanwhile **waits**: the block that asked it stays still, the others go on (but see the warning about the 30 seconds above).

### The log

**Copy to the log of the project** chooses which lines of active programs and apps are copied to your **log**:

| Choice | What it copies |
|---|---|
| **nothing** | No lines. |
| **warnings and errors** (default) | Only the lines of level warning and error (including unhandled exceptions). |
| **every line** | Everything. |

The lines of tests never go to the log. There is one log per user, with all your programs; when it goes over your quota (20 MB by default) the older half goes away. The Home, in **What I use**, says how big it is. For now no lilOS page shows the content of the log.

## A console in a window

The **Console** component ([UI components](logicstudio-ui) package) shows a console of the project inside a window, with the **Console** and **Height (px)** properties. The questions of that console can be answered there.

## Examples

### 1. Asking for a number and doubling it

```
[On start (main)] pulse ──▶ ask [Input (readline): «Quanti anni hai?», number] value ──▶ a [Multiply (×)] result ──▶ value [Print (console.log)]
                                                                      cancelled ──▶ send [Constant · Variable: «Va bene, niente.»] value ──▶ value [Print (console.log)]
```

On **Multiply**, **b** has start value `2` and **starts it** unticked. **Test**: the panel opens on the main console with «Quanti anni hai? ›» ("How old are you?"). Type `ventidue`: «Serve un numero. Riprova.». Type `22` and **Enter**: the console writes `44`. Pressing **Esc** instead, it writes «Va bene, niente.» ("Okay, never mind.").

### 2. A console for alarms

1. In **Project options → Consoles** press **New console**, rename it `Allarmi` and choose red.
2. Put a **Print** with **Console** = **Allarmi** and **Level** = **error**, and link it to whatever it has to signal.
3. In **Outside the IDE** choose **Show them all**: when you open the window of the active program, the **Allarmi** console opens too.

### 3. A password that is not shown

```
[Button: Entra] pressed ──▶ ask [Input (readline): «Password», text, hidden] value ──▶ a [Compare (== != < >): a = b, b = "segreta"] if true ──▶ …
```

With **Hide what is typed**, dots are shown in the field and the console shows `•••••••` in place of the answer. On **Compare**, **b** has start value `"segreta"` and **starts it** unticked.

### 4. A silent active program

An active program that writes the temperature every minute and now and then a warning: in **Outside the IDE** choose **Do not show them** and in **Copy to the log of the project** **warnings and errors**. The normal lines stay only in memory (the last 1000), the warnings go to the log, and a **Input** with **Default value** `20` receives `20` at once without asking anything.

## See also

- [Print (console.log)](core.consoleWrite)
- [Input (readline)](core.consoleRead)
- [Test and active programs](ide/run)
- [Projects](ide/projects)
