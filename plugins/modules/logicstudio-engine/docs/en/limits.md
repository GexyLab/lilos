# Limits and quotas

`logicstudio-engine` · [Logic Studio Engine](logicstudio-engine)

The engine runs the programs of all users on the same computer. So that nobody can stop or slow down the others, there are two kinds of rules:

- the **quotas**: how much **each user** can use (active programs, tests, CPU, memory, network, log);
- the **limits**: they hold **for everybody** and for each project (blocks per schema, length of a test, memory in all…).

See your numbers in **Control Panel → Logic Studio → My use** and in the Home of the IDE, **What I use** section. An administrator changes them in the **Limits** and **Quotas** tabs of the same panel.

## The quotas of each user

| Quota | Default | Allowed range | What it counts |
|---|---|---|---|
| Active programs | 10 | 0–1000 | Your active programs and your running apps (even those waiting for a package) |
| Tests running together | 2 | 0–100 | Your tests running at the same moment |
| CPU | 25 % | 1–100 | The part of each second that the blocks of a program may spend working. It holds for each program, not for all your programs together, and it also counts the time a block spends waiting (for a file, the network) |
| Memory | 128 MB | 16–8192 | The memory of your worker, that is of all your programs together |
| Network requests per minute | 120 | 0–100000 | The requests of the network blocks (each redirect counts as a request) |
| Log | 20 MB | 1–10240 | Your log, for all your programs |

There is also a rule that cannot be changed: you may keep at most **3 times** the quota of active programs among the saved ones, counting the stopped ones too (30, by default).

### What happens when you go over a quota

| Quota | When | What happens | Message |
|---|---|---|---|
| Active programs | You press **Activate** or open an app | The program does not start | Hai già 10 programmi attivi: al massimo 10 (You already have 10 active programs: at most 10) |
| Saved active programs | You press **Activate** | The program does not start | Troppi programmi attivi, anche fermi: togline qualcuno (Too many active programs, even stopped: remove some) |
| Tests | You press **Test** | The test does not start | Hai già 2 prove in corso: al massimo 2 (You already have 2 tests running: at most 2) |
| CPU | While it runs | The program slows down: every 200 block runs the engine looks at how much they worked in the current second and, if it is more than the quota, the block that is working waits for the end of that second | None |
| Memory | While it runs | The worker closes and **all** your programs stop | Memoria finita: i programmi hanno usato più della tua quota di memoria (Memory is out: the programs used more than your memory quota) |
| Network requests | A network block works | The request does not go out and the block sends the message on **Exception** | Troppe richieste di rete: hai finito la quota di questo minuto (Too many network requests: you have used up the quota of this minute) |
| Log | The engine writes to the log | The older half of the log is thrown away | None |

With the quota of active programs at 0, a user cannot activate programs or open apps made with Make app; with tests at 0, they cannot test.

## The limits for everybody

### The computer

| Limit | Default | Allowed range | What it means |
|---|---|---|---|
| Active programs of all users | 200 | 1–10000 | The active programs and running apps, of everybody, together |
| Memory for all users | 1024 MB | 64–65536 | The sum of the memory of the open workers (each worker uses the memory quota of its user) |
| Block runs per program in 10 seconds | 10000 | 100–1000000 | Beyond it, the program stops: usually it is a loop of links |
| Time a block may take | 30 s | 1–600 | Beyond it, the engine stops waiting for the block and sends an error on its Exception |
| Length of a test | 5 minutes | 1–240 | Then the test stops by itself |
| Groups in a thread of their own per user | 4 | 0–64 | How many [groups](ide/groups) with **Run in a thread of its own** can run together for each user (all their programs). Beyond that, the group runs in the thread of the program, with a warning in the main console. Every thread has half of the memory quota of the user (at least 16 MB), besides that of its worker |

### The schemas

| Limit | Default | Allowed range |
|---|---|---|
| Blocks per schema | 200 | 10–5000 |
| Links per schema | 600 | 10–20000 |
| Added ports per block | 32 | 1–64 |

### The projects

| Limit | Default | Allowed range |
|---|---|---|
| Schemas per project | 20 | 1–200 |
| Windows per project | 10 | 1–100 |
| UI components per window | 200 | 10–2000 |
| Links between schemas per project | 200 | 10–5000 |
| Consoles per project | 10 | 1–50 |
| Console lines per second | 50 | 1–10000 |
| Points kept per chart series | 1000 | 10–100000 |

### What happens when you go over a limit

The limits on projects are checked **when the program starts**: if the project does not fit, it does not start, and the IDE shows the message in the **Problems** tab. The others are checked while the program runs.

| Limit | Message | What happens |
|---|---|---|
| Active programs of everybody | lilOS ha già 200 programmi attivi: al massimo 200 (lilOS already has 200 active programs: at most 200) | The program does not start |
| Memory for everybody | Logic Studio usa già 960 MB: al massimo 1024 MB per tutti (Logic Studio already uses 960 MB: at most 1024 MB for everybody) | The program starts and stops at once, **Stopped by an error**. It happens only when your worker has to open (you have no other programs running) |
| Runs in 10 seconds | Troppe esecuzioni: più di 10000 in 10 secondi (un ciclo di collegamenti?) (Too many runs: more than 10000 in 10 seconds (a loop of links?)) | The program stops, **Stopped by an error** |
| Time a block may take | readFile ha impiegato più di 30 s (readFile took more than 30 s) | The message comes out of the **Exception** output of the block (the name is that of the block); the program goes on |
| Length of a test | Fine della prova: è durata il tempo massimo (End of the test: it lasted the maximum time) | The test stops (**Stopped**) |
| Blocks per schema | Troppi blocchi nello schema principale: al massimo 200 (Too many blocks in the schema principale: at most 200) | The program does not start |
| Links per schema | Troppi collegamenti nello schema principale: al massimo 600 (Too many links in the schema principale: at most 600) | The program does not start |
| Added ports | principale/b7: troppe porte aggiunte (al massimo 16) (principale/b7: too many added ports (at most 16)) | The program does not start. The maximum is the smaller of this limit and that of the block (for example 16 for the Add (+) block) |
| Schemas | Troppi schemi: al massimo 20 per progetto (Too many schemas: at most 20 per project) | The program does not start |
| Windows | Troppe finestre: al massimo 10 per progetto (Too many windows: at most 10 per project) | The program does not start |
| Components | Troppe componenti nella finestra main: al massimo 200 (Too many components in the window main: at most 200) | The program does not start. All components count, containers too |
| Links between schemas | Troppi collegamenti tra gli schemi: al massimo 200 (Too many links between the schemas: at most 200) | The program does not start |
| Consoles | Troppe console: al massimo 10 (Too many consoles: at most 10) | The program does not start. The main one counts |
| Lines per second | … 37 righe non mostrate (troppe al secondo) (… 37 lines not shown (too many per second)) | The extra lines are not seen; at the first line written in a later second, a warning says how many there were |
| Chart points | None | A chart keeps at most these points per series (or fewer, if the property of the chart asks for fewer): the oldest go away |

In the messages, in place of «principale», «b7» and «main» there are the name of your schema, the id of your block and the name of your window.

### The time a block may take, up close

- It counts the time from the beginning to the end of the block's work, **waits included**: a slow [HTTP request (fetch)](net.request), a big file, a question in the console.
- That is why it holds for [Input (readline)](core.consoleRead) too: today, if nobody answers within 30 seconds (default), the block sends «Input (readline) ha impiegato più di 30 s» ("Input (readline) took more than 30 s") on **Exception** and the answer given afterwards no longer reaches it.
- It also holds for what a block does when the program starts.
- It does not hold for the wait of the time blocks like [Delay (setTimeout)](core.delay) or [Interval (setInterval)](core.every): those do not work while they wait.

## Other fixed limits

These cannot be changed from the Control Panel.

| What | Limit | Message |
|---|---|---|
| A project sent to the engine | 8 MB | — |
| A project for an active program | 2 MB | Progetto troppo grande per un programma attivo (al massimo 2 MB) (Project too big for an active program (at most 2 MB)) |
| The settings of a block | 64 KB | Le impostazioni del blocco b7 sono troppo grandi (The settings of the block b7 are too big) |
| Containers one inside the other in a window | 32 levels | La finestra main ha contenitori troppo annidati (The window main has containers nested too deeply) |
| A value sent by a window or by the IDE | 256 KB | Valore troppo grande (al massimo 256 KB) (Value too big (at most 256 KB)) |
| Messages from windows and IDE to a program | 100 per second | Troppi messaggi al programma (Too many messages to the program) |
| An answer in a console | 4000 characters | (the rest is cut) |
| A question in a console | 500 characters | (the rest is cut) |
| A console line | 1000 characters | (the rest is cut) |
| Lines kept by a console | from 100 to 2000 (1000 by default), at most 400000 characters | (the oldest go away) |
| Last values kept for the windows | 2000 ports per program | (new ports beyond 2000 are not remembered) |
| A question with nobody looking | At most one notification every 30 seconds per console | — |
| The log read by the API | The last 500 lines | — |

## How an administrator changes them

Only an administrator sees the **Limits** and **Quotas** tabs in **Control Panel → Logic Studio**.

### The limits for everybody

**Limits** tab, in three groups: **For all users**, **Schemas**, **Projects**. Type the number and the panel saves it at once. A number outside the range is brought to the minimum or the maximum; a number with a decimal part is rounded.

### The quotas

**Quotas** tab:

- **Quotas of every user**: the default quotas, for all the users who have none of their own.
- **A user's own quotas**: a table with a row per user and a column per quota (**Active**, **Tests**, **CPU %**, **Memory MB**, **Requests/min**, **Log MB**). An empty box means «the quota of everybody» (you see it in grey); a number is the quota of that user. **Default** removes all the quotas of that user.

### When they count

| What you change | From when it counts |
|---|---|
| Active programs, tests, active programs of everybody | From the next program that starts (those already running do not stop) |
| Blocks, links, schemas, windows, components, added ports, consoles | From the next program that starts, **and** from the next restart of active programs: an active program that no longer fits stays **Waiting for a package** with the message of the limit |
| Runs in 10 seconds, time of a block, length of the test, lines per second, CPU | From the next program that starts |
| Memory of a user | From the next time their worker opens (that is, after all their programs have stopped) |
| Memory for everybody | From the next worker that opens |
| Network requests per minute, log | At once, even for running programs |
| Chart points | From the windows opened after the lilOS page has been reloaded |

## Examples

### 1. A user who needs more active programs

Marta keeps six home-automation projects always on and wants ten more. The administrator opens **Control Panel → Logic Studio → Quotas**, in Marta's row types `20` in the **Active** column and leaves the others empty. From then on Marta can have 20 active programs (and keep 60 saved); the other users stay at 10.

### 2. A block that calls a slow service

A project makes a [HTTP request (fetch)](net.request) to a service that sometimes takes 45 seconds. There are two time limits, and the shorter one holds:

- the one of the request, in the settings of the `logicstudio-net` module (**Time limit of a request (seconds)**, 20 seconds by default): after 20 seconds the block sends on **Exception** «Nessuna risposta da … in 20 secondi» ("No answer from … in 20 seconds");
- the one of each block, here (**Time a block may take (seconds)**, 30 seconds by default): «HTTP (fetch) ha impiegato più di 30 s» ("HTTP request (fetch) took more than 30 s").

To wait 45 seconds, the administrator raises the first to 60 seconds (in the settings of the module) and the second to 60 seconds (**Limits** tab); then you activate the project again, because the time of a block holds for programs that start afterwards. Or you link **Exception** to a block that tries again later.

### 3. A console that talks too much

```
[Range: from 1 to 200] result ──▶ list  [For each] item ──▶ value [Print (console.log)]
[Interval (setInterval): 5 s]          pulse  ──▶ start
```

Give **from** and **to** of the [Range](coll.range) block the start values 1 and 200. Every 5 seconds [For each](coll.forEach) sends 200 values in a row, but the console shows only the first 50 of that second. At the line written 5 seconds later the warning «… 150 righe non mostrate (troppe al secondo)» ("… 150 lines not shown (too many per second)") appears first. The program does not stop. If you need all the values, write them to a file with [appendFile](lilos.fileAppend), or show just one every now and then with [Throttle](core.throttle).

## See also

- [Programs](logicstudio-engine/programs)
- [Permissions](logicstudio-engine/permissions)
- [Test and activate](ide/run)
