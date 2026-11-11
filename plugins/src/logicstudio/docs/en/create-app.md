# Making an app

**Make app…** turns the project into a **lilOS app**: a package with the windows of the project, which opens with a double click and runs with the engine of this lilOS. You need a project (not a schema alone) and lilOS 1.37.0 or later.

> For now the app **is not installed**: it runs from its folder, **only for you**, and only **while its windows are open**. It does not appear in the apps menu or in the AppStore.

## Step by step

1. Open the project and press **Make app…** in the toolbar («Make a lilOS app from the project, and run it»).
2. If there are unsaved changes, the IDE **saves everything** without asking.
3. **Make an app from «Name»** opens: «The app has the windows of the project and uses the engine of this lilOS. For now it is not installed: it runs from its folder, only for you, while its windows are open.» At the top you see the icon as it will be, and «The package goes into `~/Apps made/<id>`: open its .lsapp file to run it again.»
4. Fill in the fields:

| Field | Rules | Suggested |
|---|---|---|
| **Name of the app** | Required, at most 60 characters. | The name of the project. |
| **Id** | Lower-case letters, digits and `-`, starting with a letter, from 2 to 41 characters («Lower-case letters, digits and -, starting with a letter»). | The id used last time, or one made from the name: `Orto di casa` → `orto-di-casa`, `Città` → `citta`, `3D` → `app-3d`. |
| **Version** | Three numbers: `1.0.0`. | The version of the project. |
| **Description** | At most 200 characters. | The description of the project. |
| **Icon** | blocks, window, chart, bolt, bell, calculator, clock, gauge, lamp, home, globe, terminal. | The one used last time, or blocks. |
| **Color** | **green**, **blue**, **violet**, **teal**, **orange**, **red**. | The one used last time, or green. |

5. Press:
   - **Make**: prepares the app. At the end: **«Name» is ready** — «The package is in /home/…/Apps made/orto-di-casa. Open its .lsapp file to run it.»
   - **Make and run**: prepares the app and starts it at once.
   - **Cancel**: does nothing.

The id, the icon and the colour stay in the project for next time; version and description update those of the project (Options → General). The project is saved.

If something goes wrong: **The app could not be made** with the reason. With a lilOS older than 1.37.0, **Make and run** says «Running apps made from projects needs lilOS 1.37.0 or later».

## What is in the package

```
~/Apps made/
  orto-di-casa/
    lilos.json          the manifest of the app
    index.js            the code of the app (asks lilOS to run the project)
    locales.json        the name, the description and the translations of the texts of the windows
    project/            a copy of the project
      Orto di casa.lsproj
      schemi/ …
      ui/ …
      risorse/ …
    orto-di-casa.lsapp  the file that starts the app
```

- The **Apps made** folder is created in your home if it is not there.
- When you **make the app again** with the same id, the old folder goes to the **Trash** and a new one is written: do not put files of your own in it.
- The manifest `lilos.json` lists as dependencies the engine and the **packages** of the blocks and components the project uses (with the version installed now as the minimum), the windows with an entry point and the file types they open. See [File formats](ide/formats).

## Starting the app

- **Double click** on the `.lsapp` file (in the File Manager or on the desk): lilOS starts it. If you open the `.lsapp` with Logic Studio IDE, the IDE does not open and the app starts all the same.
- Or **Make and run** from the IDE.

The app starts as a program of kind **App (not installed)**: you find it in the Home of the IDE, in **My programs**, and it counts among your active programs. Its **main window** opens. When you close the app's **last** window, the program stops, its consoles close and after a minute it disappears from the list.

### Consent

The app runs **with your permissions**. If its schemas use blocks that touch your data or the world outside, before starting lilOS opens a window that asks whether to run it, says that the app was made with Logic Studio and runs as you, and lists what it will be able to do:

| If it uses | lilOS says it will be able to |
|---|---|
| **readFile**, **writeFile**, **appendFile**, **readdir**, **exists** | read and change your files |
| a **Network** block | make requests on the internet |
| **Notify** | send you notifications |
| **Emit** | send events to your lilOS |

Below is the path of the `.lsapp` file, with the advice to run it only if you trust whoever made it, and the buttons to cancel or run. The texts of this window belong to lilOS: their original form is in English («Run «Name»?», «This app was made with Logic Studio and runs as you. It can:», **Cancel**, **Run**) and you see them translated if lilOS has the pack of your language.

- **Run** applies to **that package as it is**: lilOS does not ask again until the package changes (another path, a different schema or window). If you make the app again with **Make app…** and something has changed, it asks again. lilOS remembers at most 200 consents.
- An app that does not use these blocks starts without asking.
- If the app does not start: a notification «Name did not start: …»; if the `.lsapp` is not from Logic Studio or its files are missing: «This is not an app made by Logic Studio, or its files are missing».

## The windows and consoles of the app

- The windows behave like those of active programs: a window that is already open is not opened twice; the buttons with **Open a window** and **Close this window** work.
- The consoles open according to **Project options → Consoles → Outside the IDE** (see [Consoles](ide/consoles)).
- The **The app and its windows** options hold here too.
- The images of the components come from the `risorse/` folder of the copy of the project.

## What is not there yet

- The app is not **installed**: no item in the apps menu, no updates from the AppStore, no use by other users.
- The **entry points** of the windows (opening a type of file, item in the menu of files, call from other apps, when the user signs in) are written in the manifest but, until the app is installed, **do nothing**.
- The app uses the engine and the packages of **this** lilOS: on another lilOS it works only if the same packages are installed there.

## Examples

### 1. An app for the counter

1. Open the project **Counter** (see the [overview](ide/index)) and add to the window **Principale** a **Value** and a **Button** with their objects.
2. **Make app…** → **Name of the app** `Counter`, **Id** `contatore`, **Icon** `calculator`, **Color** **blue** → **Make and run**.
3. The window **Counter** opens. When you close it, the program stops.
4. Next time: double click on `~/Apps made/contatore/contatore.lsapp`.

### 2. An app that writes a file

The project has a **writeFile** on `~/note.txt`. At the first start of the app **Run «Note»?** appears with «read and change your files». Press **Run**: the next time it does not ask again. If you change the project and make the app again, it asks again.

### 3. Updating the app

1. Change the project in the IDE and test it.
2. **Make app…**: the fields are already filled in with the id from before; raise the **Version** (for example `1.1.0`) and press **Make**.
3. The old folder goes to the Trash and the new `.lsapp` is in the same place.

## See also

- [Windows](ide/windows)
- [Test and active programs](ide/run)
- [File formats](ide/formats)
- [Permissions](logicstudio-engine/permissions)
