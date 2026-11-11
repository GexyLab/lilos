# Programs

`logicstudio-engine` · [Logic Studio Engine](logicstudio-engine)

A **program** is a project (or a schema alone) that the engine is running. This page tells its life: how it starts, what state it is in, what it writes, how it answers questions, how it stops and what happens when the kernel restarts.

## The three kinds

| Kind | In the Control Panel | Where it starts | Is it saved? |
|---|---|---|---|
| Test | **Test** | **Test** or **F5** in the IDE | No |
| Active program | **Active** | **Activate** in the IDE | Yes: it starts again with the kernel |
| App | **App (not installed)** | The `.lsapp` file of an app made with **Make app** | No |

## How it starts

When you press **Test** or **Activate**, the IDE sends the engine the documents of the project: the `.lsproj` file, the `.lsch` schemas and the `.lsui` windows. For a test they are the ones you have in the editors (even unsaved); for an active program they are the saved ones.

The engine takes these steps, in order. If one fails, the program does not start and the IDE shows the message in the **Problems** tab.

1. **Your quotas.** It checks that you have room for another test or another active program, and that lilOS does not already have too many active programs in all. See [Limits and quotas](logicstudio-engine/limits).
2. **The documents.** It checks the whole project again: that every block comes from an installed package, that every link goes from an output that exists to an input that exists, that every component object points to a component of its window, that the limits (blocks, links, schemas, windows…) are respected. The message says where the problem is, for example «Il blocco b3 (esempio.media) non c'è: manca il suo pacchetto» ("The block b3 (esempio.media) is not there: its package is missing") (in place of b3 there is the label you gave the block, or its id).
3. **Saving.** An active program is saved in the engine, with a copy of the project. At most 2 MB of project: beyond that, «Progetto troppo grande per un programma attivo (al massimo 2 MB)» ("Project too big for an active program (at most 2 MB)").
4. **The worker.** If you do not have a worker yet (the thread where your programs run), the engine opens it. Here the memory of everybody counts: if it is not enough, the program stops at once with the message «Logic Studio usa già … MB: al massimo … MB per tutti» ("Logic Studio already uses … MB: at most … MB for everybody").
5. **Starting the blocks.** In the worker the program starts like this:
   - every block that has something to do at start does it (for example the [Constant · Variable](core.value) block, if nothing is linked to **send**, sends its value);
   - then every input that has a **start value** receives it;
   - then the blocks that run by themselves in a loop start.

From here on the program goes on by itself: every value that arrives at an input makes the block work, and its outputs go along the links. See [How a block works](ide/blocks).

## The states

| State | What it means |
|---|---|
| **Starting** | The engine is starting it |
| **Running** | It runs |
| **Stopped** | It has stopped: you (or an administrator) stopped it, or the time of a test ran out |
| **Stopped by an error** | It stopped by itself because of a problem; the message is under the name |
| **Waiting for a package** | An active program that cannot start again because a package is missing: it starts again by itself when the package comes back |

You see your programs in two places:

- in the **Home** of Logic Studio, **My programs** section, with **Open its window**, **Open the project**, **Stop** and **Remove**;
- in the **Control Panel → Logic Studio → My use**, with **Stop** and **Remove**.

## Why a program stops by itself

| Message | What happened |
|---|---|
| Fine della prova: è durata il tempo massimo (End of the test: it lasted the maximum time) | A test reached the maximum length (5 minutes, default). The state is **Stopped**, not an error |
| Troppe esecuzioni: più di 10000 in 10 secondi (un ciclo di collegamenti?) (Too many runs: more than 10000 in 10 seconds (a loop of links?)) | The blocks worked too many times: usually a link that comes back and makes the blocks run endlessly |
| Memoria finita: i programmi hanno usato più della tua quota di memoria (Memory is out: the programs used more than your memory quota) | Your worker ran out of memory. **All** your programs stop, not only the one that used it up |
| Il motore si è fermato: … (The engine stopped: …) | Your worker closed for another reason. Here too all your programs stop |
| Il motore non risponde (The engine does not answer) | The worker did not answer in time while loading the blocks |
| Logic Studio usa già … MB: al massimo … MB per tutti (Logic Studio already uses … MB: at most … MB for everybody) | There was no memory to open your worker |
| Blocco sconosciuto: … (Unknown block: …) | The worker does not know a block of the project (a package that arrived half way) |

When an **active program** stops because of an error, you receive a lilOS notification with the name of the program and the message (if at that moment you have a lilOS page open).

An error inside a block does **not** stop the program: it comes out of the **Exception** output of that block and, if it is not linked, goes to the main console as a red line. For example «Somma (+): Serve un numero» ("Add (+): A number is needed").

## Stopping and removing

- **Stop** stops the program. The engine stops the timers, cancels the questions in the console, gives every block 2 seconds to close what it was doing (for example a web request in progress is interrupted) and waits at most 3 seconds.
- A stopped active program **stays in the list** as **Stopped** and **does not start again** when the kernel restarts. To start it again open it in the IDE and press **Activate**.
- **Remove** removes it from the list (and an active program also from the saved programs). In the Home and in the Control Panel **Remove** appears only for programs that are not running.
- Stopped tests and apps disappear from the list by themselves after a minute.

An administrator can stop everybody's programs from the **Control Panel → Logic Studio → Running**. The reason that stays is «Fermato da un amministratore» ("Stopped by an administrator").

### Replacing an active program

If you press **Activate** on a project that already has an active program (even stopped), the IDE asks «… is already active». **Replace** removes the old program and starts the new one, with the project as it is now. The new program starts from scratch.

> If the new program cannot start (for example because of a problem in the project), the old one has already been removed: fix the problem and press **Activate** again.

## When the kernel restarts

The engine saves the active programs. A few seconds after the kernel has restarted (and every time a new package arrives):

- the active programs that were **running** start again, with the same name;
- those that are **stopped** (even those stopped by an error) stay stopped;
- those that are missing a package go to **Waiting for a package**, with the message of the problem, and try again every time a package introduces itself.

Quotas are not checked again when a program starts again; limits (blocks, links…) are: if an administrator lowered them and the project no longer fits, the program stays waiting with the message of the limit.

A program that starts again begins from scratch: what the blocks remembered, the lines of the consoles and the last values of the windows are lost.

Tests and apps are not saved: they end with the kernel.

## The consoles

Every program has its own consoles: the **main** one (always there) and those you added in **Project options → Consoles**. The consoles live in the engine, not in the IDE: that is why an active program can write and ask even when the IDE is closed. See [The consoles](ide/consoles).

### The lines

- Blocks write lines with a level: normal, information, warning, error. The question of a block and the answer you give are lines too.
- A line is cut at 1000 characters.
- Each console keeps the last lines (from 100 to 2000, 1000 by default, chosen in the options) and at most 400000 characters: the oldest lines go away.
- A console accepts at most 50 lines per second (default). The others are not seen; at the first line written in a later second a warning appears first: «… 37 righe non mostrate (troppe al secondo)» ("… 37 lines not shown (too many per second)").
- A line written to a console that no longer exists in the project goes to the main one.

### The questions

The [Input (readline)](core.consoleRead) block asks a question and waits for the answer.

- In each console there is **one question at a time**: if two blocks ask together in the same console, the second waits in line until the first has its answer.
- The answer is typed in the console of the IDE, or in the window of the console that lilOS opens. If the same console is open in two places, the first answer to arrive counts.
- The answer must be of the type the block asks for:

| Type | What is OK | If it is not OK |
|---|---|---|
| text | Any text (at most 4000 characters) | — |
| number | `12`, `-3`, `2,5`, `2.5`, `1e3` | «Serve un numero. Riprova.» ("A number is needed. Try again.") |
| yes/no | sì, si, s, yes, y, true, 1, vero, on · no, n, false, 0, falso, off (upper or lower case) | «Serve sì o no. Riprova.» ("Yes or no is needed. Try again.") |
| key | The first character of what you type | «Serve un tasto. Riprova.» ("A key is needed. Try again.") |

- If the answer is not OK, the question is repeated. If in the block you unticked **Ask again if the answer is not valid**, the block sends **cancelled** instead.
- **Esc** cancels the question: the block sends **cancelled**.
- If the block has a **Time limit** and nobody answers in time, it sends **cancelled**.
- When the program stops, the questions waiting are cancelled.
- A hidden answer (for passwords) appears in the console as dots.

> **The time a block may take holds for questions too.** Today the engine interrupts a block that works for more than 30 seconds (default, see [Limits and quotas](logicstudio-engine/limits)), and a block that waits for an answer counts as a block that is working. After 30 seconds with no answer, **Read from console** sends «Input (readline) ha impiegato più di 30 s» ("Input (readline) took more than 30 s") on **Exception**. The question stays in the console, but the answer you give afterwards no longer reaches the block, and until you answer the block ignores new **ask** requests. If you need more time, an administrator can raise the limit.

### Consoles outside the IDE

When the program runs without the IDE (an active program with its windows open, or an app), the consoles behave as the **Outside the IDE** option of the project says:

| Choice | What happens |
|---|---|
| Show them all | Each console opens in a window when the first window of the project opens |
| Only when they ask for something (default) | A console opens when a block asks a question and closes after the answer (if you did not untick it) |
| Do not show them | The consoles are not seen. A question gets the default value of the block at once, or is cancelled if it has none |
| All in the main console | One window only with the lines of all the consoles |

In a **test** the consoles are always at the bottom of the IDE, whatever the choice: even with **Do not show them** the questions wait for your answer.

### A question when you are not looking

If a program that is not a test asks a question and nobody is looking at it (no window of the project, no IDE connected), the engine tells your open lilOS pages: you receive a notification, and a click opens the console. At most one notification every 30 seconds per console. No notification if the choice is **Do not show them** or if you turned off notifications in the project options.

## The log

For active programs and apps, the engine can copy the lines of the consoles to your **log**, as the project option says:

| Choice | What goes to the log |
|---|---|
| Nothing | No lines |
| Only warnings and errors (default) | The lines of level warning and error, including unlinked exceptions |
| All | All lines |

Tests never write to the log. The log is one per user, for all your programs; when it goes over your quota (20 MB by default) the engine throws away the older half. How much you use is in **My use** and in the Home of the IDE (**What I use**).

## The values of the components

A program with windows talks to its components through their **objects** in the schemas. See [The components in the schema](ide/components).

- When a schema sends a value to an input of the object of a component (for example the text of a [Label](ui.label)), the engine sends it to all the open windows of that project.
- When someone uses a component (presses a [Button](ui.button), moves a slider), the window sends it to the engine, which makes it come out of the object of the component in the schema. The engine accepts only the ports that the component really sends (its outputs), and at most 100 messages per second per program.
- A value that comes from a window is at most 256 KB.
- With the option **A window opened again shows the last values at once** (on by default), the engine remembers the last value of each port (up to 2000 ports per program) and gives it to the window when it opens.
- When a window opens, no button is «pressed again»: the program receives only what whoever uses the window does.
- If the program stops, its windows close.

Active programs with windows appear in the apps menu, **Projects** tab: a click opens the main window, without opening the IDE.

## Examples

### 1. A test that stops by itself

```
[Interval (setInterval): 1 s] pulse ──▶ up [Counter (++ −−)] count ──▶ value [Print (console.log)]
```

Press **Test**: in the main console 1, 2, 3… appear, one line per second. After 5 minutes (default) the test stops with «Fine della prova: è durata il tempo massimo». If you press **Activate** instead, the count goes on until you press **Stop** in the Home.

### 2. A loop of links

```
[Constant · Variable: 1] value ──▶ a [Add (+)] result ──▶ b [the same Add (+)]
```

The **result** of the [Add (+)](core.add) block comes back to its input **b**: every result makes it work again, and the block never stops (1, 2, 3, 4…). After 10000 runs in 10 seconds the engine stops the program with «Troppe esecuzioni: più di 10000 in 10 secondi (un ciclo di collegamenti?)». To really count use the [Counter (++ −−)](core.counter), or untick **starts it** on the input that closes the circuit.

### 3. A question to an active program

```
[On start (main)] pulse ──▶ ask [Input (readline): «Quanti litri?», number] value ──▶ value [Print (console.log)]
```

You activate the project and close the IDE. The [On start (main)](core.onStart) block starts the question at once: if you have lilOS open, you receive a notification that says the console of the project is asking for something. A click opens the console; type `12,5` and press Enter: in the console 12.5 appears (as a number). If you type `tanti`, the console answers «Serve un numero. Riprova.» and the question stays.

### 4. An active program after a restart

You activated «Serra» (running) and the lilOS computer restarts. After a few seconds «Serra» is **Running** again, but its [Counter (++ −−)](core.counter) starts again from the start value and the console is empty. If you want a value to survive restarts, write it to a file with [writeFile](lilos.fileWrite) and read it again at start with [readFile](lilos.fileRead).

## See also

- [Test and activate](ide/run) and [The consoles](ide/consoles) in the IDE guide
- [Limits and quotas](logicstudio-engine/limits)
- [Permissions](logicstudio-engine/permissions)
