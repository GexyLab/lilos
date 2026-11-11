# The documentation

The Logic Studio documentation is read inside the IDE, in the **Logic Studio documentation** window. It has three parts:

- the **IDE guide** (this one), which starts from the [overview](ide/index);
- a page for each **package**, with the list of its blocks or components (for example [Base blocks](logicstudio-core)), and the pages of the [engine](logicstudio-engine);
- a page for each **block** and each **component**, with ports, settings, how it works and examples (for example [Add](core.add) or [Button](ui.button)).

## How to open it

| From where | How | What it shows |
|---|---|---|
| A block on the schema | Right click on the block → **Documentation** | The page of the block. For the object of a component, the page of the component. |
| A link on the schema | Right click on the link → **Documentation** | [Links and port types](ide/links). |
| The sheet of the schema | Right click on an empty point → **Documentation of the schema editor** | [Schemas](ide/schemas). |
| A component in the window editor | Right click on the component → **Documentation** | The page of the component. |
| The window in the window editor | Right click on an empty point → **Documentation of the window editor** | [Windows](ide/windows). |
| The palette (Blocks or Components) | Right click on the entry → **Documentation**, or **F1** on the entry | The page of that block or component. |
| The **Project** list | Right click on a group, a folder or an element → **Documentation** | Schemas, Windows or [Projects](ide/projects). |
| The **Properties** | The **?** button next to the name of the block or component | The page of what is selected. |
| Anywhere in the IDE | **F1**, or the **?** button on the right of the toolbar | The page of what is selected; with no selection, the page of the open editor (Schemas, Windows; the Map leads to Projects, the Home to this guide). |

There is only one window: if it is already open, it comes to the front and shows the new page.

## How to use it

- On the left is the **contents**: the IDE guide, then a group for each installed package, with the **Overview** of the package and its blocks or components divided by category, as in the palette. The open page is highlighted.
- The **links** in the text lead to other pages: a block, a package, a page of this guide. Those that go outside lilOS open in a new browser tab.
- **Back** and **Forward** (the arrows at the top left, or **Alt+←** and **Alt+→**) go back over the pages seen; the little house returns to the **Start page** (the overview of the guide).
- The **search** (the box above the contents, or **Ctrl+F**) filters the contents by title and by type: type the name of a block (`add`) or its type (`core.add`). **Enter** opens the first page found.
- The pages are in the language of lilOS; if a page does not exist in your language it shows in English, and if it does not exist in English either, in Italian.
- There are pages for the **installed packages**: a package you do not have has no pages. The pages come with the package and are updated with it. A block with no page shows «Page not found», with its name, its description and a link to the page of the package.
- The documentation cannot be edited from the IDE. To write the documentation of a package of your own see [Writing a package](logicstudio-engine/packages).

## See also

- [Logic Studio IDE](ide/index)
- [How a block works](ide/blocks)
- [Keyboard shortcuts](ide/shortcuts)
