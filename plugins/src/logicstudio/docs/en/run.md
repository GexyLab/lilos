# Test and active programs

A project (or a schema alone) runs in the Logic Studio **engine** as a **program**. There are four kinds of program:

| Kind | How it starts | What it runs | How long it lasts |
|---|---|---|---|
| **Test** | **Test** in the IDE (or **F5**) | The project **as it is in the editors**, even unsaved | Until you press **Stop**, close the IDE or open another project, and at most **5 minutes** (default) |
| **Active** | **Activate** in the IDE | The **saved** project | Until you stop it: even with the IDE closed, even with lilOS closed in the browser; it starts again when the computer lilOS runs on starts again |
| **App (not installed)** | Opening the `.lsapp` file of an app made with **Make app…** | The copy of the project inside the app | As long as its windows are open |
| **Command line** | `lilos logic run FILE ARGUMENTS…` in a terminal of the computer | The **saved** project, with the arguments | As long as the command waits for it; see [Programs](logicstudio-engine/programs) |

## Test

1. Press **Test** (▶) in the toolbar, or **F5** (also while you type in a field).
2. Before calling the engine, the IDE checks the project. If it finds a serious problem, the test **does not start** and the **Problems** tab opens with the list.
3. If all is well, the button becomes **Testing 00:12** (the time passing, also in the status bar) and **Stop** appears.
4. To stop it: **Stop**, or **F5** again.

The test uses **all** the schemas and windows of the project: those open in tabs as they are now, the others as they are saved. A schema alone runs only itself.

### The arguments of the test

Next to **Test** there is **Arguments**: it opens a box where you write the command line of the test, as if the program started with `lilos logic run FILE` followed by that line (for example `report.csv --verbose --port=8080 -o "My file.txt"`: spaces separate the arguments, one with spaces goes between quotes). The [Arguments (argv)](core.args) and [Option (-x · --name)](core.option) blocks read it. Press **Keep**: the button becomes **Arguments ●** and, when you hover over it with the mouse, it shows the line. The arguments stay for that project (or schema alone) on this lilOS, even after closing the IDE; to remove them empty the field. They only apply to tests: **Activate** starts the program without arguments (for an active program with arguments use `lilos logic run --active`, see [Programs](logicstudio-engine/programs)).

An IDE does **one test at a time**. By default you can have **2 tests** together in all (for example with two IDEs open); beyond that: «Hai già 2 prove in corso: al massimo 2» ("You already have 2 tests running: at most 2").

### What you see during the test

- **On the open schemas**: the last value that went through each link (a label halfway, the links with values flow), the last value next to each input, the **light blue border** on the block that is working, the **red border** on a block that went into error. See [Links and port types](ide/links).
- **In the consoles** at the bottom: the lines and the questions. See [Consoles](ide/consoles).
- **In the windows**: open the tab of a window: with the test in progress it is in **Preview** by itself (even if it was in **Design**, where it goes back at the end) and it is tied to the test, and buttons and fields really send their values. The test **does not open** the windows by itself. You can also open the real main window from the Home, **My programs** → **Open its window**.

A schema opened while the test is already running shows the values that go through from that moment on.

### When the test ends

- By pressing **Stop** or **F5**.
- After **5 minutes** (default: «Length of a test», in the limits of the engine): it stops by itself, with no messages in the IDE.
- By closing the IDE, opening another project or creating a new one.
- Because of a program error (too many runs, memory out…): the message goes to the **Problems**.
- When an [Exit](core.exit) block closes the program: the status bar says «Closed by the program with the value …» until the next test.

When it ends, the values disappear from the schemas and the borders go back to normal; the consoles stay readable until the next test.

## Problems

The **Problems** tab in the panel at the bottom lists what stopped the test from starting, or stopped it. Each row has an icon (error or warning), the message and the schema or window where it is. **One click** (or **Enter**) on a row opens the schema, selects the block and brings it into view, or opens the window. If there are no problems: **No problems**.

### The problems the IDE finds

| Message | Severity | When |
|---|---|---|
| The block add1 (net.request) comes from a package that is not installed | error | A block of a missing package. |
| The block component1 stands for a component of the window «Vecchia», which is not there | error | The object points to a window that is not there. |
| The block component1 stands for the component «button3», which is not there | error | The object points to a component that is not there. |
| A schema port has no name | error | A Schema input or output with an empty **Port name**. |
| The project has windows but no main window | warning | The test starts all the same. |
| The file schemi/x.lsch is missing | error | An element of the project cannot be found. |

### The problems the engine finds

The engine checks everything again and stops at the **first** problem. These messages are written in Italian by the engine, so you see them in Italian; the English meaning is in parentheses. Some of them:

| Message | When |
|---|---|
| Non c'è nessuno schema da far girare (There is no schema to run) | The project has no schemas. |
| Troppi schemi: al massimo 20 per progetto (Too many schemas: at most 20 per project) | More schemas than the limit. |
| Troppe finestre: al massimo 10 per progetto (Too many windows: at most 10 per project) | More windows than the limit. |
| Troppi blocchi nello schema main: al massimo 200 (Too many blocks in the schema main: at most 200) | More blocks than the limit. |
| Troppi collegamenti nello schema main: al massimo 600 (Too many links in the schema main: at most 600) | More links than the limit. |
| Troppe componenti nella finestra Principale: al massimo 200 (Too many components in the window Principale: at most 200) | More components than the limit (containers included). |
| Troppi collegamenti tra gli schemi: al massimo 200 (Too many links between the schemas: at most 200) | More links in the map than the limit. |
| Troppe console: al massimo 10 (Too many consoles: at most 10) | More consoles than the limit. |
| Il blocco … (…) non c'è: manca il suo pacchetto (The block … (…) is not there: its package is missing) | A block of a missing package. |
| Due blocchi con lo stesso id (add1) nello schema main (Two blocks with the same id (add1) in the schema main) | A file edited by hand. |
| Lo schema main: il blocco add1 non ha l'ingresso c (The schema main: the block add1 does not have the input c) | A link to a port that is no longer there. |
| Lo schema main ha un collegamento verso un blocco che non c'è (The schema main has a link to a block that is not there) | A file edited by hand. |
| La componente Principale › button1 ha già il suo oggetto in questo schema: main/component1 (The component Principale › button1 already has its object in this schema: main/component1) | Two objects of the same component in the same schema. |
| Il blocco component1 rappresenta una componente che non c'è (Principale › button9) (The block component1 stands for a component that is not there (Principale › button9)) | The object points to a component that is not there. |
| Collegamento del progetto: lo schema sensori non ha l'uscita «temp» (Project link: the schema sensori does not have the output «temp») | A link of the map to a port that is no longer there. |
| Collegamento del progetto: lo schema allarmi non ha l'ingresso «temp» (Project link: the schema allarmi does not have the input «temp») | As above, on the input side. |
| main/add1: troppe porte aggiunte (al massimo 16) (main/add1: too many added ports (at most 16)) | A file edited by hand. |
| Le impostazioni del blocco value1 sono troppo grandi (The settings of the block value1 are too big) | Settings over 64 KB. |
| Il gruppo Calcolo gira in un thread a parte: non può contenere Ingressi o Uscite di schema né oggetti della UI (…) (The group Calcolo runs in a thread of its own: it cannot contain schema Inputs or Outputs nor UI objects (…)) | A group with **Run in a thread of its own** that contains a schema port or the object of a component. See [Groups](ide/groups). |
| Lo schema main: la porta Run del gruppo grp1 va solo ai blocchi dentro il gruppo (The schema main: the Run port of the group grp1 goes only to the blocks inside the group) | A file edited by hand. |
| Nome di schema non valido: … (Invalid schema name: …) | A name with `/`, `\`, `:` or control characters, or longer than 80. |

While the program runs:

| Message | What happens |
|---|---|
| Troppe esecuzioni: più di 10000 in 10 secondi (un ciclo di collegamenti?) (Too many runs: more than 10000 in 10 seconds (a loop of links?)) | The program stops. See [How a block works](ide/blocks). |
| Memoria finita: i programmi hanno usato più della tua quota di memoria (Memory is out: the programs used more than your memory quota) | All your programs stop. |
| Il motore si è fermato: … (The engine stopped: …) | All your programs stop. |
| Il motore non risponde (The engine does not answer) | The engine did not answer in time. |
| Gruppo 1: nessun thread libero, il gruppo gira nel thread del programma (Group 1: no free thread, the group runs in the thread of the program) | (warning in the console) You already have all the threads of their own that you can have: the group runs anyway, together with the rest. |
| Gruppo 1: memoria finita nel thread del gruppo (Group 1: memory is out in the thread of the group) | The thread of the group used more than its memory (half of your quota): the program stops. |

The engine's messages are in Italian whatever the language of lilOS.

## Activate

**Activate** runs the project as an **active program**: it goes on with the IDE closed and with lilOS closed in the browser, because it runs on the lilOS computer. It is the way for a program that must always work (turn something on every morning, check a site every hour, count the events of the day).

1. Press **Activate** («Run the saved project as an active program: it goes on with lilOS closed»).
2. If there are unsaved changes: **Save before activating?** — «An active program runs the saved project.» with **Cancel** and **Save all**.
3. If the same project (the same file) is already active: **«Name» is already active** — «The active program stops and starts again with the project as it is now.» with **Cancel** and **Replace**. **Replace** stops and removes the old one.
4. If all is well: **«Name» is active** — «It runs in lilOS also with this window and lilOS closed, until you stop it from Home.»
5. If the engine refuses, the reason goes to the **Problems**.

The active program uses **a copy** of the project taken at the moment of activation: if you then change the project, the active program does not change until you activate it again (**Replace**).

**Activate** does not do the checks of the IDE that the test does: test it first. An active program really does what it says (writes files, sends notifications, calls sites) even when you are not looking.

Limits for activation (default):

| Limit | Value | Message |
|---|---|---|
| Active programs per user (apps count) | 10 | Hai già 10 programmi attivi: al massimo 10 (You already have 10 active programs: at most 10) |
| Active programs of all users | 200 | lilOS ha già 200 programmi attivi: al massimo 200 (lilOS already has 200 active programs: at most 200) |
| Active programs kept, even stopped | 3 times your maximum | Troppi programmi attivi, anche fermi: togline qualcuno (Too many active programs, even stopped: remove some) |
| Size of the project | 2 MB | Progetto troppo grande per un programma attivo (al massimo 2 MB) (Project too big for an active program (at most 2 MB)) |

### Active programs in the apps menu

**Running** active programs that have windows appear in the **Projects** tab of the apps menu. A click opens their **main window**, without opening the IDE. The consoles open as **Outside the IDE** says (see [Consoles](ide/consoles)). If the program stops, its windows close.

## The Home: my programs

The **My programs** section of the Home lists your tests, active programs and running apps. It updates when you go back to the Home. If there is nothing: «Nothing running: test a project, or activate it».

| Column | What it says |
|---|---|
| **Program** | The name, under it the file it comes from and, if it stopped because of an error, the error. |
| **Kind** | **Test**, **Active** or **App (not installed)**. |
| **State** | **Starting**, **Running**, **Stopped**, **Stopped by an error**, **Waiting for a package**. |
| **Since** | Date and time of start. |

And the buttons:

| Button | When it is there | What it does |
|---|---|---|
| **Open its window** | Running, with windows | Opens the main window of the program. |
| **Open the project** | The project file exists | Opens the project in the IDE. |
| **Stop** | Running or starting | Stops the program. For an active program it asks **Stop «Name»?** — «It does not start again with lilOS until you activate it again.» |
| **Remove** | Stopped, stopped by an error or waiting for a package | Removes it from the list (an active program that is removed is forgotten and no longer starts). |

A stopped active program stays in the list as **Stopped**, even after a restart, until you remove it. Finished tests and apps disappear by themselves after a minute.

**Waiting for a package** means that the program uses a block of a package that is not (any more) installed: it starts again by itself when the package comes back.

If an active program stops because of an error, you receive a **notification** with the reason.

## The Home: what I use

**What I use** shows, with a bar, how much of your quotas you use:

| Row | Default quota |
|---|---|
| **Active programs** | 10 |
| **Tests** | 2 |
| **Network requests this minute** | 120 |
| **Log** | 20 MB |

And below: «At most 25% of the CPU and 128 MB of memory for all my programs.» The quotas can be changed by an administrator, even for a single user (Control Panel → Logic Studio → Quotas). See [Limits](logicstudio-engine/limits).

## Examples

### 1. Testing one part at a time

1. Write the schema and press **F5**.
2. If the test does not start, the **Problems** tab opens by itself: click on a row and the IDE opens the schema and selects the block that has the problem.
3. Fix it and press **F5** again: you do not need to save.

### 2. From the test to the active program

1. Test the project until it does what you want.
2. **Save**, then **Activate**.
3. Close the IDE. The program goes on: you see it in the apps menu, **Projects** tab, if it has windows.
4. To change it: open the project, edit, test, save and press **Activate** → **Replace**.

### 3. Stopping an active program

1. Open the IDE: in the Home, in **My programs**, find the program (Kind **Active**).
2. **Stop** → confirm. The state becomes **Stopped** and it does not start with lilOS.
3. To remove it from the list: **Remove**.

## See also

- [How a block works](ide/blocks)
- [Consoles](ide/consoles)
- [Programs](logicstudio-engine/programs)
- [Limits](logicstudio-engine/limits)
- [Making an app](ide/create-app)
