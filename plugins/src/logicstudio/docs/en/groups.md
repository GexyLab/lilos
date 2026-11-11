# Groups

A **group** collects some blocks of a schema. It is for three things:

- **deciding when they start**: the blocks of a group start only when its **Run** port receives a pulse;
- **keeping order**: the group can be **collapsed** into one block, which shows only the ports that are needed outside;
- **running them apart**: the group can run in a **thread of its own**, so a slow block does not slow down the rest of the program.

## Making a group

1. Select the blocks (selection rectangle, or **Shift+click**).
2. Press **Ctrl+G**, or right click → **Group**, or **Group** in the Properties.

A **frame** with the name of the group («Group 1», «Group 2»…) appears around the blocks. The frame follows the blocks: it grows and moves with them.

- A block is in **one group only**. Blocks that are already in a group are left out of the new one.
- There are no groups inside other groups.
- A group left without blocks disappears.

To put more blocks in an open group:

- **drag** a free block and drop it **inside the frame**;
- put a block from the palette (dragging it) or with **Add a block here** **inside the frame**;
- or right click on the blocks → **Add to group** › the group.

To take them out: right click → **Take out of the group**. Dragging a block out of the frame does not take it out: the frame grows.

## What it looks like

```
┌─────────────────────────────────────────────────┐
●Run ●  ▣ Group 1                             −  │   ← header
│                                                 │
│   ┌▌ Constant ──┐        ┌▌ Add ─────────┐      │
│   │      value  ●──────▶◎ a     result  ◎─────┼──▶ …
●───┼─────────────┼───────▶◎ b              │      │
│   └─────────────┘        └────────────────┘      │
└─────────────────────────────────────────────────┘
```

- In the **header**: the **Run** port with **two dots**. The one on the **left edge** is linked **from outside** (what makes the group start); the one **after the word Run** is linked **to the blocks inside** (who gets the starting pulse). Then the name, the icon of the **thread** if the group runs apart, and **−** to collapse it.
- The **exposed** ports (reachable from outside) have an **orange ring** around the dot.
- If nothing is linked to Run, the frame is **dashed**: the group will not start.
- During a test, the frame lights up when the group has started.

## The Run port

Run is a port of type **pulse**. The rules:

| Situation | What happens |
|---|---|
| **Nothing is linked** to Run | The blocks of the group **never start**. |
| Run is linked, but no pulse has arrived yet | The blocks wait. The values that arrive at their inputs stay there, without starting them. |
| A **pulse** arrives on Run | The group **starts**: the blocks that start by themselves (see below) start, the inputs receive their start values, and Run sends a pulse to the blocks inside it is linked to. |
| **Another pulse** arrives | The group **starts again from scratch**: its blocks are stopped (clocks and waits cancelled), their memory is reset, and they start as the first time. The values already arrived at the inputs stay. |
| `false` arrives on Run | Nothing: a pulse counts only when it is `true`. |

The **blocks that start by themselves** are those that at start do something without receiving anything: **Constant · Variable** with nothing linked to **send** sends its value, **On start** sends a pulse, **Interval** with **Starts on its own** turns its clock on, **Counter** sets itself to the **Start from** value. See [How a block works](ide/blocks).

Inside the group, link the inner dot of Run to the inputs that must start first: usually pulse inputs such as **send**, **up**, **read**, **ask**. The inner Run goes **only** to blocks of the group; the outer Run is linked **only** from blocks outside the group.

To make a group start together with the program, link **On start** → Run.

## Pulses

A pulse port (pink) is a **yes/no that lasts an instant**: it sends `true` and goes back to `false` at once.

- The input that receives a pulse is `true` for the work it starts, then goes back to `false` **without** making the block start again.
- A pulse input **does not start** with `false` (nor with an empty value): linking a yes/no output to a pulse input, the block starts only when `true` arrives.
- A pulse output can be linked to a **yes/no** input with no marks on the link.
- On the sheet, during a test, the pulse output shows `false` again right after.

## Exposed ports

A link that **crosses the edge** of the group (from a block outside to one inside, or the other way round) can only touch an **exposed** port of the group.

- **Linking** from outside a port of a block of the group **exposes** it by itself.
- **Group** exposes by itself the ports of the links that already cross the new edge.
- In the **Properties of a block** of the group, next to the eye of each port there is the button **Expose outside the group** / **Do not expose**.
- In the **Properties of the group**, under **Exposed ports**: the name the port has on the collapsed group (empty = its own name), the order (↑ ↓) and **Remove**.
- Not exposing a port any more removes the links that reach it **from outside** (the IDE asks first; **Ctrl+Z** puts them back).

## Collapsing a group

Click **−** in the header, double click on the header, right click → **Collapse**, or **Collapsed into one block** in the Properties. The group becomes **one block**:

```
┌▌ ▣ Group 1 ───────┐
│ 3 blocks          │
│● Run              │
│● a                │
│         result ●  │
└───────────────────┘
```

- At the top **Run**, then the **exposed inputs**, then the **exposed outputs**, in the order of the Properties. Two ports with the same name also show the block («Add · a»).
- The links **inside** the group are not drawn; those from outside reach the ports of the collapsed block, and can be made and removed as on any block.
- The collapsed block sits where the top left corner of the blocks was; dragging it moves all its blocks.
- **Double click** on the collapsed group opens it again (or right click → **Expand**).

Collapsing or opening a group does not change how the program runs: it is only the drawing.

## A thread of its own

Right click → **Run in a thread of its own**, or the box in the Properties. The engine runs the blocks of the group in a **thread of their own**, apart from the rest of the program: a slow block or a long calculation of the group does not slow down the other blocks. The values that cross the edge of the group pass between the two threads; consoles, windows, package actions and live values work as always.

Rules and limits:

- The thread starts only if something is linked to **Run**.
- Every user has at most **4** groups in a thread of their own (default; the administrator changes it in **Control Panel → Logic Studio → Limits**). Beyond that, the group runs in the thread of the program and the main console writes «Gruppo 1: nessun thread libero, il gruppo gira nel thread del programma» ("Group 1: no free thread, the group runs in the thread of the program").
- Every thread has **half** of the memory of your quota (at least 16 MB).
- An unlinked **Exception** of a block of the group goes to the [global Catch](core.onError) blocks like those of the other blocks: to the ones inside the group, if there are any, else to those of the program.
- A group in a thread of its own **cannot contain** schema Inputs or Outputs nor objects of UI components: the test does not start and the Problems say so. The Properties of the group warn you before.

## The menu of a group

Right click on the header or on the collapsed group:

| Item | What it does |
|---|---|
| **Collapse** / **Expand** | Draws the group as a block, or as a frame again. |
| **Rename group** | Changes the name. |
| **Run in a thread of its own** | Turns the thread of its own on or off (✓ when on). |
| **Duplicate** (Ctrl+D) | Copies the group with its blocks, the links between them and those of the inner Run. The links from outside are not copied. |
| **Ungroup** (Ctrl+Shift+G) | Removes the group: the blocks stay where they are, the links of Run go away. |
| **Documentation** (F1) | This page. |
| **Remove the group and its blocks** (Delete) | Removes the group, its blocks and their links. |

## The Properties of a group

When you select a group (click on the header or on the collapsed group):

- **Name**, **Collapsed into one block**, **Run in a thread of its own**;
- **Run**: whether it is linked («Run is linked ({n}): at every pulse the group starts again, from its blocks that go by themselves (such as Value)») or not («Nothing is linked to Run: the blocks of the group do not start»), and to how many ports it goes inside («Inside the group, Run sends its pulse to {n} ports»);
- **Exposed ports**: see above;
- **Blocks**: how many, and the buttons **Ungroup** and **Remove the group and its blocks**.

The Properties of a block that is in a group say **In the group «Group 1»**, with **Show the group**.

## Examples

### 1. A calculation that starts on command

```
[Button: Calculate] pressed ──▶ ● Run   ┌ Group «Calculation» ──────────────────────┐
                                        │ [Constant: 21] value ──▶ a [Multiply (×)] result ◎──▶ value [Print]
                                        │ [Constant: 2]  value ──▶ b                       │
                                        └───────────────────────────────────────────┘
```

The two Constants do not start with the program: they start at every press of the button, and every time the console writes `42`.

### 2. A counter that starts again from zero

```
[Interval: 5 s] pulse ──▶ ● Run   ┌ Group ───────────────────────────────────────┐
                                  │ Run ● ──▶ up [Counter] count ◎──▶ value [Print]
                                  └──────────────────────────────────────────────┘
```

Every 5 seconds the group starts again: the Counter goes back to **Start from**, the inner Run sends it a pulse on **up**, and the console always writes `1`. For a counter that keeps going up, leave it outside the group.

### 3. A long job in a thread of its own

Put in a group the blocks of a heavy calculation (for example a long processing of lists), turn on **Run in a thread of its own** and link **On start** to Run. The rest of the program (windows, console, other blocks) keeps answering while the group works.

## See also

- [Schemas](ide/schemas)
- [Links and port types](ide/links)
- [How a block works](ide/blocks)
- [Test and active programs](ide/run)
- [File formats](ide/formats)
- [Keyboard shortcuts](ide/shortcuts)
