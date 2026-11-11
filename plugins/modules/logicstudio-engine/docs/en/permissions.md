# Permissions

`logicstudio-engine` · [Logic Studio Engine](logicstudio-engine)

Who can run a program, who sees it, what a program can do and what an app can do. In short: **a program is yours and works as you**. It cannot do anything you cannot do, and no other user sees it, except an administrator.

## Who uses the engine

The engine answers only a **user who has signed in** to lilOS. Without a user it answers «Serve un utente» ("A user is needed").

Every user can:

- start tests and active programs (within their [quotas](logicstudio-engine/limits));
- see, stop and remove **their own** programs;
- watch one of their programs live: values, consoles, windows;
- answer the questions of the consoles of their programs;
- read their log;
- see the catalog of the installed blocks and components, the documentation, the limits for everybody and their own use.

## Who sees what

A program belongs to the user who started it.

| What | You | Another user | An administrator |
|---|---|---|---|
| The list of your programs | Yes | No | Yes (**Running** tab) |
| Stopping or removing a program of yours | Yes | No | Yes |
| The values on the links, the consoles, the windows | Yes | No | Yes |
| Sending values to the program, answering questions | Yes | No | Yes |
| Your log | Yes | No | No |
| Your use (programs, network, log) | Yes | No | Yes |
| The quotas and the limits | You see them | — | They change them |

A user who tries to open a program of another receives «Programma sconosciuto» ("Unknown program"), as if the program were not there: they cannot know that it exists.

## The administrators

A user with the **administrator** role also has:

- in the **Control Panel → Logic Studio**, the **Limits**, **Quotas** and **Running** tabs;
- the list of the programs of all users, with **Stop** and **Remove**. A program stopped by an administrator reports «Fermato da un amministratore» ("Stopped by an administrator");
- for the engine, the possibility of watching and using a program of another user as if it were their own: its consoles (including the questions waiting), its windows, the values. Today lilOS has no button for this (the Control Panel only has **Stop** and **Remove**), but the engine allows it to an app or a script that talks to it on behalf of the administrator.

An administrator **cannot**:

- read the log of another user;
- start a program on behalf of another user: what they start is theirs and works as them.

Requests reserved for administrators, made by another user, answer «Solo un amministratore» ("Only an administrator").

> The consoles of a program can contain personal data. Remember that an administrator can read them. Hidden answers (the passwords asked with **Hide what is typed**) appear as dots for them too.

## What a program does: as you

Blocks do not touch anything by themselves. They run in your worker, which does not see files and does not go on the network. When a block has to do something outside (read a file, send a notification, make a web request), it asks the kernel for an **action**, and the kernel does it **as you**:

- with your permissions on files: what you cannot open, the program does not open;
- within your quotas: the space of your home, the sizes of files, the network requests per minute;
- with the rules of the package that provides that block.

For example:

| Blocks | What they can do, and what not |
|---|---|
| [lilOS blocks](logicstudio-lilos) | Only the files of **your home** (`~/…`). Never the `.config` folder, never the files whose content is protected by an app (like FileCrypt). At most 5 MB read or written at a time |
| [HTTP request (fetch)](net.request) | Only public internet addresses. This computer and the local network only if an administrator allows it in the settings of the `logicstudio-net` module. Each request counts in your network quota |
| [Notify](lilos.notify) | Only to you, on behalf of the program |
| [Emit (event to lilOS)](lilos.event) | Only to your lilOS pages |

An active program works as you **even when you have not signed in**: with lilOS closed, after you signed out, after a restart. The engine remembers who you were when you activated it. If you no longer want it to work in your name, stop it.

> The code of the blocks is not locked in a cage: packages are installed by an administrator, and a badly written package could do more than it says. Install only packages you trust. See [Writing a package](logicstudio-engine/packages).

## The apps

### Installed apps

There is no `logic` permission. An installed app that wants to use the engine (start programs, read the consoles, the catalog…) asks in its manifest for the permission **`kernel:logicstudio-engine`**, which the administrator grants when installing it. The app then talks to the engine **as the user who uses it**: it sees only their programs, and can do only what they can do (if the user is an administrator, also what an administrator can do).

In the `lilos.json` of the app (only the fields that matter here):

```json
{
  "id": "serra-pannello",
  "name": "Pannello della serra",
  "permissions": ["kernel:logicstudio-engine"]
}
```

```js
// My active programs that are running
const programmi = await lilos.kernel.request('logicstudio-engine', 'GET', '/programs');
const accesi = programmi.filter(p => p.kind === 'active' && p.status === 'running');

// Stop the program «Serra»
const serra = accesi.find(p => p.name === 'Serra');
if (serra) await lilos.kernel.request('logicstudio-engine', 'DELETE', `/programs/${serra.id}`);
```

Without the permission, the request fails with «Permesso negato: kernel:logicstudio-engine» ("Permission denied: kernel:logicstudio-engine").

> This permission is powerful: an app that has it can also **activate** programs, which then work as the user even with lilOS closed. Grant it only to apps you trust.

Logic Studio IDE and the Control Panel are part of lilOS and use the engine without this permission.

### Apps made with Make app

An app made with **Make app** is not installed: it starts when you open its `.lsapp` file, runs **as the user who opens it**, and stops when you close its last window. See [Make app](ide/create-app).

Before starting it, lilOS looks at the blocks of the project. If there are blocks that use:

| Blocks | lilOS tells you the app will be able to |
|---|---|
| files and folders ([readFile](lilos.fileRead), [writeFile](lilos.fileWrite), [appendFile](lilos.fileAppend), [readdir (list folder)](lilos.folderList), [exists](lilos.exists)) | read and change your files |
| the network ([HTTP request (fetch)](net.request)) | make requests on the internet |
| notifications ([Notify](lilos.notify)) | send you notifications |
| events ([Emit (event to lilOS)](lilos.event)) | send events to lilOS |

…it opens a window with the list, the folder the app comes from and the buttons **Run** and **Cancel**. Run the app only if you trust whoever made it.

- If you press **Run**, lilOS remembers it for **that app as it is**: the same folder and the same project. If the app changes (even just one block), it asks you again.
- lilOS remembers at most 200 consents per user; the oldest go away.
- If the app uses none of these blocks, it starts without asking.
- The tests and active programs that you start yourself from the IDE ask nothing: the project is yours.

An app made with Make app also counts in your quota of active programs while it is open.

## Examples

### 1. Two users, two programs

Luca and Sara each have an active program «Backup». Luca sees only his own in the Home; Sara only hers. The administrator, in the **Control Panel → Logic Studio → Running**, sees both, with the name of the user next to them. Luca's «Backup» writes to `~/Documenti/backup.txt`, that is in Luca's home: it cannot write in Sara's home, not even with the path `/home/sara/…` («Puoi usare solo i file della tua home…», "You can use only the files of your home…").

### 2. An app received from a colleague

A colleague gives you the folder of an app made with Make app, «Report vendite». You open its `.lsapp`: lilOS tells you the app will be able to read and change your files and make requests on the internet. If you press **Run**, the app works on **your** files, with your permissions. If the colleague sends you a new version and you put it in place of the old one, lilOS asks you again.

### 3. An administrator and a pending question

Marta's active program «Serra» asks in the console «Accendo l'irrigazione?» ("Shall I turn on the irrigation?") and Marta is on holiday. The administrator opens **Control Panel → Logic Studio → Running**, sees Marta's «Serra» running and can stop it with **Stop**. The program stays stopped until Marta activates it again. If instead the administrator answers the question (with an app that has the `kernel:logicstudio-engine` permission), what the program does afterwards it always does as Marta, not as the administrator.

## See also

- [Limits and quotas](logicstudio-engine/limits)
- [Programs](logicstudio-engine/programs)
- [Make app](ide/create-app)
- [lilOS blocks](logicstudio-lilos) and [Network blocks](logicstudio-net)
