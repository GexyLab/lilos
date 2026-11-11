# Logic Studio IDE

`logicstudio` · lilOS app · needs lilOS 1.40.0 or later

Logic Studio lets you build small programs **without writing code**. You put **blocks** on a sheet (the **schema**) and **link** them together: values travel along the links and each block does something with them. One block adds two numbers, one waits a second, one writes a line to a console, one sends you a notification. With **windows** (buttons, fields, gauges, charts) the program also gets an interface, and it can become an app.

The IDE is the place where you draw and test. What runs the programs is the **engine** ([Logic Studio Engine](logicstudio-engine)), a kernel module: that is why an active program keeps going when you close the IDE, and even when you close lilOS in the browser.

## The words

| Word | What it means |
|---|---|
| Block | A piece that does one thing: a calculation, a comparison, a pause, a write to a console. |
| Port | A point of the block where a value comes in (on the left, **input**) or goes out (on the right, **output**). |
| Link | Carries the value from the output of one block to the input of another. |
| Schema | A sheet of linked blocks. It is a `.lsch` file. |
| Window | An interface made of UI components. It is a `.lsui` file. |
| Object of a component | The block that stands for a component of the window inside a schema. |
| Project | Schemas, windows and resources in a folder, with an `.lsproj` file. |
| Console | A place where the program writes lines and asks questions. |
| Test | The project running for a few minutes, as it is in the editors. |
| Active program | The saved project that runs until you stop it, even with lilOS closed. |
| Package | A kernel module that brings blocks or components. |

## What the IDE window looks like

```
┌ Home │ Map │ main │ Principale ─────────────────────────────────────────────┐  tabs of the editors
├ Save │ ↶ ↷ │ ▶ Test  ⏻ Activate │ − 100% + Fit      Map  Make app…  ⚙ ┤  toolbar
├──────────────┬────────────────────────────────────┬──────────────────┤
│ Project      │                                    │ Properties       │
│ Blocks       │        the open sheet              │                  │
│ (Components) │                                    │                  │
│              ├────────────────────────────────────┤                  │
│              │ ★ Main │ + │ Problems              │                  │  consoles and Problems
├──────────────┴────────────────────────────────────┴──────────────────┤
│ Logic Studio Engine · 7 packages   Blocks 4 / 200 …   Project Garden  │  status bar
└──────────────────────────────────────────────────────────────────────┘
```

- **At the top** are the tabs of the open editors: the **Home** (it cannot be closed), the **Map** of the project, the schemas and the windows. You reorder the tabs by dragging them; a dot marks the ones with unsaved changes.
- **The toolbar** changes with the tab: see [Projects](ide/projects) for the common buttons, [Schemas](ide/schemas) and [Windows](ide/windows) for those of each editor.
- **On the left** there are two tabs: **Project** (the list of schemas, windows and resources) and **Blocks**, which becomes **Components** when the open tab is a window.
- **On the right** are the **Properties** of what you selected.
- **At the bottom** there is a tab for each console of the project and the **Problems** tab.
- **At the very bottom** is the status bar: whether the engine answers and how many packages it has, the numbers of the open editor (blocks and links, components, zoom), the time of the test in progress, the name of the project.

The two side panels get wider and narrower when you drag the bar between them and the sheet (from 170 to 480 pixels; a double click on the bar puts them back as they were at the start). The width is kept for the next times.

## The guide

| Page | What it is about |
|---|---|
| [Projects](ide/projects) | Creating, opening, saving, closing a project; the **Project** list; the **Project options**. |
| [Schemas](ide/schemas) | The schema editor: putting blocks, selecting, moving, the menus, the Properties of a block, the **Map**. |
| [Links and port types](ide/links) | How links are made and removed, the port types, when a link is marked, links between schemas. |
| [Groups](ide/groups) | Grouping blocks, the **Run** port, exposed ports, collapsing a group into a block, the thread of its own. |
| [How a block works](ide/blocks) | Inputs, «starts it», start value, one thing at a time, the **Exception** output, added ports, loops. |
| [Windows](ide/windows) | The window editor: Design and Preview, containers, properties, button actions. |
| [The object of a component](ide/components) | How a schema talks with a component of a window. |
| [Consoles](ide/consoles) | Writing and asking; the panel at the bottom; what the consoles do outside the IDE. |
| [Test and active programs](ide/run) | Testing, seeing the live values, the Problems, activating, stopping, the limits. |
| [Making an app](ide/create-app) | **Make app…**: a lilOS app made from the project. |
| [File formats](ide/formats) | `.lsproj`, `.lsch`, `.lsui`, `.lsapp` in JSON, with complete examples. |
| [Keyboard shortcuts](ide/shortcuts) | All the keys of the IDE on one page. |
| [The documentation](ide/docs) | How to open and use this documentation. |

## The packages

Blocks and components come from **packages**, kernel modules that you install from the **AppStore → Kernel**. The engine and the base blocks install themselves with the IDE, because the IDE needs them; an administrator adds the others when they are needed. Each package has its own page with the list of its blocks or components.

| Package | What it brings |
|---|---|
| [Base blocks](logicstudio-core) (`logicstudio-core`) | Values, logic, math, text, objects, time, the two consoles, the schema ports, the object of the UI components. Installs with the IDE. |
| [Lists and matrices](logicstudio-collections) (`logicstudio-collections`) | Blocks for lists (sort, filter, for each item…) and matrices (product, transpose, determinant…). |
| [Constants](logicstudio-constants) (`logicstudio-constants`) | The fundamental constants: mathematical (π, e, golden ratio…), CODATA 2022 physical ones (c, h, G, particle masses…) with unit and uncertainty, astronomical and Earth ones. |
| [Quantities and units](logicstudio-units) (`logicstudio-units`) | Conversions between units of measure (length, mass, temperature, pressure, energy, data…), SI prefixes, reading and writing measures like `12.5 km`. |
| [Solid geometry](logicstudio-solid) (`logicstudio-solid`) | Volumes, areas, diagonals and radii of cube, prism, pyramid, cylinder, cone, sphere and its parts, regular polyhedra; mass from volume and material; points, vectors, planes and coordinates in space. |
| [Trigonometry](logicstudio-trig) (`logicstudio-trig`) | Sine, cosine, tangent and their inverses, hyperbolic functions, angles in degrees, radians, gradians and turns, degrees minutes seconds, right and general triangles, polar coordinates, waves. |
| [Functions and derivatives](logicstudio-functions) (`logicstudio-functions`) | Functions written as text (`3x^2 + 2sin(x)`): evaluating them, tables of values, equations, polynomials and roots, exponentials and logarithms, symbolic and numeric derivatives, tangent, limits, Taylor, study of a function. |
| [Integrals](logicstudio-integrals) (`logicstudio-integrals`) | Definite integrals (improper too) and antiderivatives, integral function, mean value, area between curves, solids of revolution, arc length, double and triple integrals, data and signals, differential equations. |
| [Signals](logicstudio-signals) (`logicstudio-signals`) | Signal theory: generators (sine, square, noise, chirp…), FFT and IFFT, power spectral density, spectrogram, IIR, FIR and biquad filters with their frequency response, convolution and correlation, measures (RMS, THD, SNR), AM, FM and PM modulation. |
| [lilOS blocks](logicstudio-lilos) (`logicstudio-lilos`) | Notifications, reading and writing the files of your home, listing folders, events towards lilOS pages. |
| [Network](logicstudio-net) (`logicstudio-net`) | **HTTP request** over HTTP and HTTPS. |
| [UI components](logicstudio-ui) (`logicstudio-ui`) | The components of the windows: labels, values, gauges, buttons, fields, tables, containers. |
| [Charts](logicstudio-charts) (`logicstudio-charts`) | 12 charts for the windows: lines, areas, columns, bars, pie, real time… |
| [Logic Studio Engine](logicstudio-engine) (`logicstudio-engine`) | The engine: it runs tests and active programs, with [limits](logicstudio-engine/limits) and [permissions](logicstudio-engine/permissions). Installs with the IDE. |

If in the status bar you read **The engine does not answer**, the `logicstudio-engine` module is not installed or is stopped: the Home says so with **The engine of Logic Studio (module logicstudio-engine) is not installed or does not answer.** and the **Open the AppStore** button. Without the engine the Blocks tab is empty and says **The engine of Logic Studio does not answer**; with the engine but no packages it says **No package installed**.

## The first program in 5 minutes

You build a counter: every 2 seconds a number grows by 1 and is written to the console; when it reaches 5, the program writes «Fatto!» (the Italian for "Done!").

### 1. Create the project

1. Open **Logic Studio IDE** from the apps menu.
2. In the Home press **New project**, type `Counter` in the **Name** field and press **Create**.
3. The IDE creates the folder `~/Logic Studio/Counter/` with the schema **main** and the window **Principale**, and opens the **Map**. In the **Project** tab on the left, under **Schemas**, click **main**: the schema opens in a new tab.

### 2. Put the blocks

1. On the left switch to the **Blocks** tab. In the search type `every` and click **Interval**: the block appears in the middle of the sheet, already selected.
2. On the right, in the **Properties**, **Settings** section, set **Every (seconds)** to `2`. Leave **Starts on its own** ticked.
3. In the same way add **Counter**, **Compare**, **NOT**, **Constant · Variable** and, twice, **Print**. Each click puts the block a little lower than the previous one: drag them where you like, for example as in the drawing below.
4. Select **Compare**. In the Settings choose **Operation** = **a ≥ b**. In the **Ports** section, on the row of the input **b**, type `5` in the **at start** field and untick **starts it** (the 5 stays there as a threshold, without making the block run on its own).
5. Select **Constant · Variable**. In the Settings choose **Kind** = **text** and type `Fatto!` in **Value**. Then, in the **Properties**, turn on the **eye** next to the **send** port: it is hidden by default, and you need it to link it in step 6.

### 3. Link

To link, drag from the dot of an output (on the right of the block) to the dot of an input (on the left). Make these six links:

1. **Interval** · **pulse** → **Counter** · **up**
2. **Counter** · **count** → first **Print** · **value**
3. **Counter** · **count** → **Compare** · **a**
4. **Compare** · **result** → **NOT** · **value**
5. **NOT** · **result** → **Interval** · **on**
6. **Compare** · **if true** → **Constant · Variable** · **send**, and then **Constant · Variable** · **value** → second **Print** · **value**

The finished schema:

```
[Interval (setInterval): 2 s] pulse ──▶ up [Counter (++ −−)] count ──▶ value [Print (console.log)]
                                      count ──▶ a [Compare (== != < >): a ≥ b, b = 5]

[Compare (== != < >)] result ──▶ value [NOT] result ──▶ on [Interval (setInterval)]
[Compare (== != < >)] if true ──▶ send [Constant · Variable: Fatto!] value ──▶ value [Print (console.log)]
```

What happens: every 2 seconds **Interval** sends a pulse, the **Counter** goes up by 1 and sends the new number both to the console and to **Compare**. While the number is below 5, **Compare** sends `false` on **result**, **NOT** turns it into `true` and **Interval** stays on. When it reaches 5, **result** is `true`, **NOT** sends `false` and **Interval** turns off; meanwhile **if true** starts **Constant · Variable** (which, with **send** linked, sends its value only at each pulse), which sends `Fatto!` to the second console.

### 4. Test

1. Press **Test** in the toolbar (or **F5**). The button becomes **Testing 00:00** and **Stop** appears.
2. On the sheet you see the values that go by: a coloured label halfway along each link, the last value next to each input, the light blue border on the block that is working.
3. At the bottom, in the **Main** console, `1`, `2`, `3`, `4`, `5` appear (one every 2 seconds) and right after the 5 the line `Fatto!`. Then nothing else happens: **Interval** is off.
4. Press **Stop** (or **F5** again). A test stops by itself after 5 minutes anyway.

### 5. Save and activate

1. Press **Save** (or **Ctrl+S**).
2. If you want it to run on its own, even with lilOS closed, press **Activate**: it becomes an **active program** and you find it in the Home under **My programs**, where you can stop it with **Stop**.

To understand why the counter starts from 1 and what happens when two values arrive together, read [How a block works](ide/blocks).

## Good to know

- The test uses what is **in the editors now**, even unsaved; **Activate** uses the **saved** project (and asks you to save). See [Test and active programs](ide/run).
- An active program really does what it says even when you are not looking: a **writeFile** overwrites, a **HTTP request** really calls the site. Test it first.
- The texts of the IDE and of the blocks are in Italian and English.
- The design choices of Logic Studio are collected in decision D88 of the internal lilOS documentation.

## See also

- [How a block works](ide/blocks)
- [Base blocks](logicstudio-core)
- [Logic Studio Engine](logicstudio-engine)
