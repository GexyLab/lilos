# Keyboard shortcuts

All the keys of Logic Studio IDE. On a Mac, **Ctrl** is also **Cmd**.

## In the whole IDE window

| Keys | What they do | Notes |
|---|---|---|
| **Ctrl+S** | Saves everything. | Works also while you type in a field. |
| **F5** | **Test**; if a test is in progress, it stops it. | Works also while you type in a field. |
| **Ctrl+Z** | Undo, in the editor of the open tab. | Not while you type in a field (there it undoes the text). With the **Map** open it undoes the changes to the project. |
| **Ctrl+Y** or **Ctrl+Shift+Z** | Redo. | As above. |
| **F1** | Opens the documentation of what is selected (a block, a component); with no selection, that of the open editor. On the entry of the palette, that of the block or component. | Works also while you type in a field. See [The documentation](ide/docs). |

## The editor tabs

| Keys | What they do |
|---|---|
| **←** **→** | Move to the next tab. |
| **Home** / **End** | First / last tab. |
| **Enter** or **Space** | Show the tab that has the focus. |
| **Delete** | Closes the tab (the Home cannot be closed). |
| click with the **middle button** | Closes the tab. |
| drag | Changes the order of the tabs. |

## The sheet of a schema (and the Map)

They work when the sheet is in front: click on the sheet first.

| Keys | What they do |
|---|---|
| **Delete** or **Backspace** | Removes the selected blocks (with their links) and the selected groups with their blocks; if no blocks or groups are selected, the selected links. |
| **Ctrl+A** | Selects all the blocks (and the collapsed groups). |
| **Ctrl+D** | Duplicates the selected blocks (and the links between them); a selected group is duplicated with its blocks. |
| **Ctrl+G** | Makes a group of the selected blocks (see [Groups](ide/groups)). |
| **Ctrl+Shift+G** | Ungroups the selected groups: the blocks stay. |
| **Arrows** | Move the selection by 1 pixel. |
| **Shift+arrows** | Move the selection by 20 pixels. |
| **Esc** | Clears the selection. |
| **Space** held down + drag | Moves the view. |

With the mouse:

| Gesture | What it does |
|---|---|
| **wheel** (also with **Ctrl**) | Zooms in or out around the pointer (from 20% to 250%). |
| **Shift+wheel** | Moves the view horizontally. |
| drag with the **middle button** | Moves the view. |
| drag on the background | Selects with a rectangle; with **Shift** it adds to the selection. |
| **Shift+click** on a block | Adds it to or removes it from the selection. |
| **Shift+click** on a link | Adds it to the selection. |
| drag a block | Moves the selected blocks, on the 10-pixel grid. |
| **Alt** while dragging a block | No grid. |
| drag from an output | Makes a link; dropped on the empty sheet, it opens the menu of the matching blocks. |
| drag from a linked input | Detaches its last link, to move it or remove it. |
| **Ctrl+click** on a port, then on other ports, then release **Ctrl** | Links the first port to each of the others (see [Links](ide/links)); **Esc** gives up. |
| **double click** on the object of a component | Opens its window. |
| drag the header of a group (or a collapsed group) | Moves the group with all its blocks. |
| drop a free block inside the frame of a group | Puts it in the group. |
| **double click** on a collapsed group / on the header of a group | Opens it / collapses it. |
| **double click** on a box of the Map | Opens the schema or the window. |
| **right button** | The menu of the block, of the group, of the link or of the sheet. |

## The editor of a window

In **Design**, with the window in front:

| Keys or gesture | What they do |
|---|---|
| **Delete** or **Backspace** | Removes the selected component and its objects in the schemas (asks for confirmation if at least one is linked to other blocks). |
| **Esc** | Clears the selection. |
| **double click** on a component | Opens its object in the schema (the first schema that has one). |
| drag a component | Moves it where the blue line shows. |

## The «Project» list

| Keys | What they do |
|---|---|
| **↑** **↓** | Previous / next row. |
| **Enter** | Opens the item; on a folder it opens or closes it. |
| **F2** | Rename. |
| **Delete** | Remove (asks for confirmation). |
| **menu key** or **Shift+F10** | Opens the menu of the row. |

## The consoles

In the answer field:

| Keys | What they do |
|---|---|
| **Enter** | Sends the answer. |
| **Esc** | Cancels the question (the block sends **cancelled**). |
| any key | With **Kind of answer** = **a key**: answers at once with that key. |

In the **Problems** tab: **Enter** on a row takes you to the problem.

## The panel bars

The bar between a side panel and the sheet, with the focus:

| Keys or gesture | What they do |
|---|---|
| **←** **→** | Make the panel wider or narrower. |
| **Shift+←** **→** | More, three times as much. |
| **Home** / **End** | The narrowest panel (170 pixels) / the widest (480). |
| **double click** | The starting width (220 on the left, 280 on the right). |

## The documentation window

| Keys | What it does |
|---|---|
| **Alt+←** | Back: the page seen before. |
| **Alt+→** | Forward. |
| **Ctrl+F** | Goes to the search box. |
| **Enter** in the search | Opens the first page found. |

## See also

- [Schemas](ide/schemas)
- [Windows](ide/windows)
- [Projects](ide/projects)
