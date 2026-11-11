# Projects

A Logic Studio **project** is a **folder** with a file `Name.lsproj` inside and three subfolders:

| Folder | What it contains |
|---|---|
| `schemi/` | The schemas (`.lsch`), also in your own subfolders. |
| `ui/` | The windows (`.lsui`), also in your own subfolders. |
| `risorse/` | The other files of the project: images and whatever you want to use in the windows. |

The `.lsproj` file says what the schemas and the windows are called, which is the **main window**, the links between schemas, the consoles and the options. Its content is described in [File formats](ide/formats).

You can also open **a schema alone** (a `.lsch` without a project): it is tested and activated like a project, but it has no windows, map, options or consoles other than the main one.

## The Home

The **Home** tab is always the first and cannot be closed. It contains:

- **New project** and **Open…**;
- **Recent**: the last 10 projects or schemas you opened, with the folder where they are. A click opens them again. Those that no longer exist disappear from the list. If there are none: **No project opened yet**;
- **My programs** and **What I use**: see [Test and active programs](ide/run).

When no project is open, the toolbar at the top has only **New project** and **Open…**, and the **Project** tab says **Open or create a project from Home.**

## Creating a project

1. In the Home (or in the toolbar) press **New project**.
2. The **New project** window opens: «The project is a folder in «Logic Studio», with the folders schemi, ui and risorse.» Type the **Name** (at most 80 characters; **My project** is suggested) and press **Create**.
3. The IDE creates, in your home:

```
~/Logic Studio/
  My project/
    My project.lsproj
    schemi/
      main.lsch
    ui/
      Principale.lsui
    risorse/
```

- The **Logic Studio** folder is created if it is not there.
- If a folder with that name already exists, the name is changed to a free one, and that becomes the name of the project too.
- The characters that cannot be in a file name are removed. If nothing is left (for example you typed only `///`), the project is not created and no message appears: try again with another name.
- The schema is called **main** and is empty. The window is called **Principale**, it is the **main window** and its title is the name of the project.

4. The project opens on the **Map**.

## Opening

- **Open…** (Home or toolbar) opens the file picker with the types `.lsproj` and `.lsch`.
- A **double click** on a `.lsproj` or a `.lsch` in the File Manager or on the desk opens the IDE with that file. If the IDE is already open, the file opens there.
- When you open a **window** (`.lsui`), the IDE looks for the `.lsproj` in its folder and in those above, opens that project and then the window. If it does not find it: **This window is not in a project** — «A window (.lsui) opens with its project: no .lsproj was found in its folder or above.»
- An `.lsapp` file is not opened in the IDE: lilOS starts it as an app (see [Making an app](ide/create-app)).
- A project opens on the **Map**; a schema alone opens directly in its editor.

An IDE keeps **one project at a time**. Opening another closes the open one (it asks first to save, if needed) and stops the test in progress. If you want two projects together, open two IDE windows.

When lilOS reopens the windows of the previous session, the IDE reopens the project you had open.

### When opening fails

The message is **It could not be opened**, with the reason:

| Reason | When |
|---|---|
| The file is not there any more | The file was deleted or moved. |
| It is not a project (.lsproj) or a schema (.lsch) of Logic Studio | The file has another extension. |
| «This is not a Logic Studio project (.lsproj)» or «This is not a Logic Studio schema (.lsch)» (the text comes from the lilOS SDK: you see it translated if the language pack is there) | The file is JSON but its `format` field is not the right one. |
| A JSON error | The file is not valid JSON (for example it was cut off or edited by hand). |
| The file … is missing | An element of the project cannot be found when you open it. |

### Old or damaged files

The IDE reads files with tolerance, and what is not valid it **leaves out** instead of refusing everything:

- in a schema: blocks without a valid id (letters, digits, `_` and `-`, at most 40) or with a repeated id disappear, and with them the links that touch them; a label longer than 80 characters is cut; invalid settings and ports become empty; an invalid view goes back to zoom 100%;
- in a window: a component without a valid id gets a new one; containers nested beyond 32 levels disappear; a width below 160 or a height below 120 pixels is raised;
- in the project: elements without a name or without a path disappear; missing options take the default value.

What you lost this way really disappears at the first **Save**. The engine, when you test, checks everything again and if it still finds something wrong it writes it in the **Problems** (see [Test and active programs](ide/run)).

### The project and its folders line up

Every time you open a project, the IDE compares the `.lsproj` with the folders `schemi/` and `ui/`:

- a `.lsch` or `.lsui` file that is in the folders but not in the project **is added**, with the file name (without the extension); if the name is already taken, it becomes «Name 2», «Name 3»…;
- an element of the project whose file is no longer there **is removed**;
- if the main window is no longer there, the first window that is left becomes the main one.

This way you can copy a schema into `schemi/` with the File Manager and find it in the project. If the alignment changed something, the project shows as modified: save to write it in the `.lsproj`.

Careful: an element that in the `.lsproj` points to a file **outside** `schemi/` or `ui/` is removed, because the IDE looks only there.

## The «Project» list

The **Project** tab on the left shows the name of the project (with the **Map** button) and three groups: **Schemas**, **Windows** and **Resources**, each with the number of elements it contains and the **+** button. Under each group are its subfolders and its files, folders first and then files, in alphabetical order.

Next to the elements:

| Sign | Means |
|---|---|
| dot | **Not saved**: the element has unsaved changes. |
| ★ | **Main window: opens from the apps menu**. |
| link icon | The window has an entry point (see the Options, Windows tab). The hint says which one. |

The name shown for schemas and windows is their **name in the project**; for resources it is the file name. With the mouse over it you see the path in the project (for example `schemi/irrigazione/nord.lsch`).

### What a click does

- On a schema or a window: opens it in a tab (or brings its tab to the front, if it is already open).
- On a resource: opens it with the lilOS app associated with its type.
- On a folder: opens or closes it.

### The menu (right click)

On the title of a group:

| Item | What it does |
|---|---|
| **New schema** / **New window** | Asks for a name and creates the element in the folder of the group (it is not there for Resources). |
| **New folder** | Creates a subfolder. |

On a folder: **New schema** or **New window** (according to the group), **New folder**, **Rename** (F2), **Remove** (Delete).

On an element: **Open**, **Make it the main window** (only for the windows that are not already), **Rename** (F2), **Remove** (Delete).

With a schema alone there is no menu.

### New schema, new window

1. Press **+** next to **Schemas** or **Windows** (or use the menu).
2. Type the **Name**: at most 60 characters, without `/ \ : * ? " < > |` (otherwise: **A name without / \ : * ? " < > |**), and not already used by another element of the same kind (otherwise: **The project already has an element called «Name»**).
3. Press **Create**. The file is called like the element (`Name.lsch` or `Name.lsui`); if there is already a file with that name in the folder, the file gets a free name, but the element stays «Name».
4. The element opens in a tab. The project is saved at once, so as not to lose it.

A new window has a title equal to the name, 480 × 360 pixels, resizable, state **Normal**, not a dialog and not on top, with an empty **Column**. If the project had no windows, it becomes the main one.

> The **+** of the **Resources** group opens an **Add a resource** window that in this version cannot create anything. To add a resource copy the file into the `risorse/` folder of the project with the File Manager: it appears in the list at once.

### Renaming

**Rename** (or **F2**) asks for the new name with the same rules.

- A schema or a window changes both the name in the project and the file name. When you rename a schema, the links between schemas of the project follow it; when you rename the main window it stays main; an entry point follows its window.
- A folder changes name and the paths of what it contains follow.
- A resource changes only the file name (here you also type the extension).

After renaming a schema or a window **open in a tab**, close and reopen the tab: the tab keeps showing the old name, and until you reopen it the live values of the test do not appear on that schema.

> When you rename a **window**, the **objects of its components** in the schemas keep looking for the window with the old name and, when you test, the **Problems** say «The block … stands for a component of the window «Old name», which is not there». In the Properties of each object choose the **Window** and the **Component** again. The buttons of other windows with **Open a window** also have to be set again.

### Moving

Drag an element or a folder onto another folder **of the same group** (or onto the title of the group): you move it there. You cannot bring a schema among the windows, or a folder inside itself. The project follows the new paths and is saved.

### Removing

**Remove** (or **Delete**) asks for confirmation:

- for an element: **Remove «Name»?** — «It goes to the trash. Its links in the project are removed.»;
- for a folder: **Remove the folder «Name»?** — «It goes to the trash with everything inside.»

The element goes to the lilOS **Trash** (you can recover it from there, then reopen the project). Its tabs close **without asking** if they had unsaved changes. The project forgets it and is saved.

Things to know when you remove:

- a **schema**: the links between schemas that touch it can stay in the `.lsproj`; when you test, the Problems say for example «Collegamento del progetto: lo schema X non ha l'uscita «p»» ("Project link: schema X does not have the output «p»"). Remove them from the Map (Properties → **Unlink**);
- a **window**: the objects of its components in the schemas stay and show a problem until you remove them;
- the **main window**: the first window that is left becomes the main one.

### From the keyboard

In the list: **↑** and **↓** move from one row to the other, **Enter** opens (or opens and closes a folder), **F2** renames, **Delete** removes, the **menu key** or **Shift+F10** opens the menu.

## Saving

- **Save** in the toolbar (or **Ctrl+S**) saves **everything** that changed: every open schema and window and the `.lsproj`. The button is off when there is nothing to save.
- Some actions save the `.lsproj` by themselves: creating, renaming, moving and removing elements, **Make it the main window** from the menu.
- The changes made in the **Project options**, in the **Map** and in the consoles go into the `.lsproj` at once, but on disk only with **Save**.
- If saving fails (for example the file was deleted in the meantime): **Saving failed** with the reason, for example **The file is not there any more**.

### Undo and Redo

Every schema, every window and the project have their own **history** (up to 200 steps): **Undo** (↶, **Ctrl+Z**) and **Redo** (↷, **Ctrl+Y** or **Ctrl+Shift+Z**) act on the editor of the open tab. The changes to the `.lsproj` (links in the map, options, consoles, names of schema ports) are undone with the **Map** tab in front. Undoing back to the saved point removes the «not saved» dot.

## Closing

- When you close the tab of a schema or a window with changes: **«Name» has changes not saved** — «If you do not save them, they are lost.» with **Cancel**, **Do not save** and **Save**.
- When you close the IDE, open another project or create a new one with pending changes: **The project «Name» has changes not saved**, with **Cancel**, **Do not save** and **Save all**.
- Closing the IDE stops the test in progress. Active programs go on.

> In this version **Do not save** on the tab of a schema closes the tab but **does not remove** the changes: they stay in memory, the test uses them, **Save** writes them and when you reopen the tab you find them. To really throw them away use **Undo** (Ctrl+Z) before closing, or close the project with **Do not save**.

## Project options

The **Project options** button (the gear, in the toolbar) opens a separate window with the name of the project. On the left are four tabs: **General**, **Windows**, **Consoles**, **The app and its windows**. Every change goes into the project at once (with Undo from the Map tab) and on disk with **Save** in the IDE. The window opens only once: pressing the gear again brings it to the front.

The Options are not there for a schema alone.

### General

| Field | Rules |
|---|---|
| **Name** | At most 80 characters. An empty name is not accepted. It changes the name of the project, not the name of the folder or of the `.lsproj` file. |
| **Version** | Three numbers separated by dots, like `1.0.0` («Three numbers: 1.0.0»). A value written differently is **not accepted** (the previous version stays). |
| **Description** | At most 300 characters. |

The version and the description are used by **Make app…**.

### Windows

«lilOS opens the windows of the project. The main window is required: it opens from the apps menu.»

- **Main window**: which window is the main one. «It can be changed, never removed.»
- A table with each **Window** and the **Opens from** column:
  - for the main one: **Apps menu (main window)**;
  - for the others, a choice among:

| Choice | What it means |
|---|---|
| **Opens only from other windows of the app** | No entry point: a button with **Open a window** opens it. |
| **Opens a type of file** | The field **Extensions: csv, txt** appears: type the extensions separated by commas or spaces (the leading dot is removed; only letters and digits, at most 16 characters each and 12 in all). |
| **Item in the menu of files** | An item in the menu of files. |
| **Called by other apps** | Other apps can open it. |
| **When the user signs in** | It opens when the user signs in to lilOS. |

  For every choice other than the first there is also **Label** (at most 60 characters; empty means the name of the window).
- Below: «A window with no entry point opens only from another window of the app (a button with «Open a window»).»

If the project has no windows: **The project has no windows yet.**

> The entry points are written into the app made with **Make app…**, but apps made from projects are not installed for now: so, for the moment, the entry points do not do anything yet. See [Making an app](ide/create-app).

### Consoles

The list of the consoles of the project and what they do outside the IDE. Everything is explained in [Consoles](ide/consoles); in short:

- table **Name**, **Color** (8 colors), **Lines kept** (from 100 to 2000, default 1000) and **Remove**; the main one is «fixed: renamed, never removed»;
- **New console** (at most 10 consoles, unless the limits are different); «Removing a console, its blocks write to the main one.»;
- **Outside the IDE**: **Show them all**, **Only when they ask for something**, **Do not show them**, **All in the main console**;
- **Details**: **Close the console after the answer**, **A notification when a console asks for something and the project has no windows open**, **Copy to the log of the project**, **With «All in the main console», the main one opens**.

### The app and its windows

«What the windows of the project share while it runs: also in the app made from it.»

| Option | Default | What it does |
|---|---|---|
| **A window opened again shows the last values at once** | yes | The engine keeps the last value sent to each component: whoever opens a window again does not see it empty. |
| **Copies of the same window stay in step** | yes | The same window open on two devices shows the same values; a change on one shows on the other. |

And a note: «Buttons, switches and sliders send something only when someone uses them in an open window: nothing is pressed again when a window opens.»

## Limits

The engine checks projects when you test or activate them. The default values (an administrator changes them in the Control Panel → Logic Studio → Limits; see [Limits](logicstudio-engine/limits)):

| What | At most |
|---|---|
| Schemas per project | 20 |
| Windows per project | 10 |
| Links between schemas per project | 200 |
| Consoles per project | 10 |
| Blocks per schema | 200 |
| Links per schema | 600 |
| Components per window | 200 |
| Added ports per block | 32 |
| Project for an active program | 2 MB of JSON |

The IDE does not stop you when you create the twenty-first schema or the eleventh window: it is the test that says, in the Problems, **Troppi schemi: al massimo 20 per progetto** ("Too many schemas: at most 20 per project") or **Troppe finestre: al massimo 10 per progetto** ("Too many windows: at most 10 per project").

## Examples

### 1. A project with schemas in order

A project for watering a vegetable garden, with one schema per zone:

1. **New project** → `Orto` → **Create**.
2. In the **Project** list, right click on **Schemas** → **New folder** → `zone` → **Create**.
3. Right click on the folder **zone** → **New schema** → `nord`; then again → `sud`.
4. Rename **main** to `comandi` (right click → **Rename**).

The result on disk:

```
Orto/
  Orto.lsproj
  schemi/
    comandi.lsch
    zone/
      nord.lsch
      sud.lsch
  ui/
    Principale.lsui
  risorse/
```

In the `.lsproj`: `"schemas": { "comandi": "schemi/comandi.lsch", "nord": "schemi/zone/nord.lsch", "sud": "schemi/zone/sud.lsch" }`.

### 2. Taking a schema from another project

1. In the File Manager copy `vecchio/schemi/allarme.lsch` into `Orto/schemi/`.
2. Open the project **Orto** again (Home → **Recent**).
3. In the list **allarme** appears with the dot of the modified project: press **Save**.

If the schema uses blocks of a package that is not installed here, you see them dashed with **The package is missing** (see [Schemas](ide/schemas)).

### 3. A second window that opens from a button

1. **+** next to **Windows** → `Impostazioni` → **Create**.
2. Open the window **Principale**, add a **Button** and, in its Properties, **Action on click** = **Open a window**, then choose **Impostazioni**.
3. In **Project options → Windows** leave **Impostazioni** on **Opens only from other windows of the app**.

See [Windows](ide/windows).

## See also

- [Schemas](ide/schemas)
- [Windows](ide/windows)
- [Consoles](ide/consoles)
- [File formats](ide/formats)
- [Test and active programs](ide/run)
