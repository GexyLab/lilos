# Logic Studio Engine

`logicstudio-engine` · service `logicstudio` · kernel module · needs lilOS 1.37.0 or later

The Logic Studio **engine**. It is what runs your schemas and your projects: the IDE draws them, the engine executes them. It runs inside the lilOS kernel, that is on the computer where lilOS is installed, not in the browser page.

The engine brings no blocks: blocks and UI components come from **packages**, other kernel modules that introduce themselves to the engine when they start.

## What it does

- Starts, keeps alive and stops the **programs**: the tests of the IDE, active programs and the apps made with **Make app**.
- Keeps the **consoles** of the programs: the lines written by the blocks and the questions of the [Input (readline)](core.consoleRead) blocks.
- Keeps the last values sent to the **windows** of the projects, so a window opened again is not empty.
- Checks the **quotas** of each user and the **limits** for everybody.
- Does in the kernel, **as you**, the things the blocks ask for that touch your data or the world outside: reading a file, sending a notification, making a web request.
- Serves the IDE the catalog of the installed blocks and components and the documentation of the packages (these pages).

## One thread for each user

When you start your first program, the engine opens a **worker** for you: a thread of your own, with its own memory. All your programs (tests, active programs, apps) run in there. When your last program stops, the worker closes.

What it means for you:

- A program of yours that makes a mistake, or that uses too much memory, does not touch the programs of other users.
- It does touch **your other programs**, though: if your worker runs out of memory, all your programs stop, with the message «Memoria finita: i programmi hanno usato più della tua quota di memoria» ("Memory is out: the programs used more than your memory quota").
- The worker does not see your files and does not talk to the network by itself: when a block needs one of them, it asks the kernel, which does it with your permissions and counts what you do in your quotas. See [Permissions](logicstudio-engine/permissions).

## Test and active program

There are three kinds of program:

| Kind | How it starts | What it runs | How long it lasts |
|---|---|---|---|
| **Test** | **Test** (or **F5**) in the IDE | The project as it is now in the editors, even if you have not saved it | At most 5 minutes (default), or until you press **Stop** or close the IDE |
| **Active program** | **Activate** in the IDE | The **saved** project | Until you stop it: even with the IDE closed and with lilOS closed in the browser |
| **App (not installed)** | Opening the `.lsapp` file of an app made with **Make app** | The copy of the project that is in the folder of the app | As long as its windows are open |

A test is for seeing what happens: on the schemas you see the values that go along the links and the blocks that are working. It leaves nothing switched on. See [Test and activate](ide/run).

An active program really does what it says, even when you are not looking: if it writes a file, it writes it. Test it first with **Test**.

## Programs that run with lilOS closed

The engine is in the kernel, so an active program does not need a lilOS page to be open. You can close the browser, sign out of lilOS or switch off your laptop: the program goes on as long as the computer where lilOS runs is on.

What happens while nobody is looking:

- The lines of the consoles stay in the engine (the last ones of each console). You see them when you open a window or a console of the project again.
- If a block asks a question in the console, the question **waits** for the answer, or for the time limit you gave the block. The other blocks go on. Careful: today the engine does not let a block work for more than 30 seconds (default), and this holds for a block that waits for an answer too; see [Limits and quotas](logicstudio-engine/limits). If at that moment you have a lilOS page open, you receive a notification that opens the console; if lilOS is closed, the notification does not arrive later: you find the question by opening the windows or the consoles of the project.
- If the program stops because of an error, you receive a notification.

See [Programs](logicstudio-engine/programs).

## When the kernel restarts

When the lilOS computer restarts, or an administrator restarts the kernel:

1. All programs stop suddenly. Tests and apps do not start again.
2. A few seconds after the kernel starts, the engine starts again **the active programs that were running**, with the same name and the same project.
3. The active programs you had stopped (or that had stopped because of an error) do **not** start again: they stay in the list as stopped, until you activate them again or remove them.

A program that starts again begins **from scratch**: the blocks start from the beginning, the start values are sent again, the consoles are empty, the windows no longer have the last values. What a block remembered (for example the count of the [Counter (++ −−)](core.counter) block) is lost.

If an active program is missing a package (for example it was uninstalled), the program stays **Waiting for a package** and starts again by itself as soon as the package comes back.

## Installed packages

The blocks and components you see in the IDE are those of the packages installed in this lilOS. The list is in **Control Panel → Logic Studio → Packages**, with how many blocks and components each one brings.

| Package | What it brings |
|---|---|
| [Base blocks](logicstudio-core) | Values, logic, math, text, objects, time, console, schema ports, the object of the UI components |
| [Lists and matrices](logicstudio-collections) | Blocks for lists and matrices |
| [Constants](logicstudio-constants) | Mathematical, physical (CODATA 2022), astronomical and Earth constants |
| [Quantities and units](logicstudio-units) | Conversions between units of measure, SI prefixes, reading and writing measures |
| [Solid geometry](logicstudio-solid) | Volumes and areas of solids, regular polyhedra, mass from the material, points, vectors and planes in space |
| [Trigonometry](logicstudio-trig) | Trigonometric, inverse and hyperbolic functions, angles, triangles, polar coordinates, waves |
| [Functions and derivatives](logicstudio-functions) | Expressions like `3x^2 + sin(x)`, equations, polynomials, exponentials and logarithms, derivatives, limits, study of a function |
| [Integrals](logicstudio-integrals) | Definite integrals and antiderivatives, areas, volumes of revolution, data and signals, differential equations |
| [Signals](logicstudio-signals) | Signal theory: generators, FFT, spectra, IIR and FIR filters, correlation, measures, modulation |
| [lilOS blocks](logicstudio-lilos) | Notifications, files of your home, events to lilOS |
| [Network blocks](logicstudio-net) | The HTTP request (fetch) block |
| [Standard UI components](logicstudio-ui) | Labels, buttons, fields, containers… for the windows |
| [Charts](logicstudio-charts) | The charts as UI components |

An administrator installs packages from the **AppStore**, **Kernel** tab. The engine and the base blocks arrive by themselves when Logic Studio IDE is installed. Anyone can write a new package: see [Writing a package](logicstudio-engine/packages).

## Where it keeps data

In the data folder of the module, which stays when the engine is updated:

- the active programs, with a copy of the project they were running (even the stopped ones);
- the quotas that an administrator gave to single users;
- the **log** of each user: the console lines that projects copy there (by default, only warnings and errors).

That is why an active program does not change if you edit the project after activating it: to use the new project press **Activate** again and choose **Replace**.

## Examples

### 1. A reminder that runs even with lilOS closed

```
[Interval (setInterval): 3600 s] pulse ──▶ send [Notify: text «Alzati e cammina»]
```

The text of the [Notify](lilos.notify) block is in its Properties. To try it, put 10 seconds in the [Interval (setInterval)](core.every) block and press **Test**: a notification arrives every 10 seconds, until the test ends. Then put 3600 seconds back, save and press **Activate**: the program sends a notification every hour, even with the browser closed. The notifications that arrived while lilOS was closed are there when you open it again.

### 2. What happens at a restart

You have two active programs: «Promemoria» (running) and «Backup» (which you had stopped). The lilOS computer restarts:

- «Promemoria» starts again by itself, from scratch;
- «Backup» stays **Stopped**: to start it again open it in the IDE and press **Activate**.

## Linked pages

- [Programs](logicstudio-engine/programs): start, states, consoles, questions, log, stopping.
- [Limits and quotas](logicstudio-engine/limits): all the values, the messages, how to change them.
- [Permissions](logicstudio-engine/permissions): who sees what, the administrators, the apps.
- [Writing a package](logicstudio-engine/packages): new blocks and components.
- [Test and activate](ide/run) and [The consoles](ide/consoles) in the IDE guide.
