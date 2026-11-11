# Tabs

`ui.tabs` · Containers · [Standard UI components](logicstudio-ui) · version 1

Several pages in the same space, one visible at a time: at the top a row of tabs with the names, and a click on a tab shows its page.

## Properties

| Property | Values | Default | Description |
|---|---|---|---|
| **Names of the tabs (comma separated)** | text (translatable) | «One, Two» | The names of the tabs, in order: `General, Advanced, About`. |

## The pages

**Every component put directly inside the Tabs is a page.** The first component is the page of the first tab, the second of the second, and so on. To have several components in one page, put a [Column](ui.column) (or another container) in the Tabs and the pieces inside it.

- There are as many tabs as pages, not as names: a name with no page does not appear; a page with no name has its number as its name («3»).
- Without pages there is no tab.
- In **Design** **all** the pages are shown, one under the other, so you can put pieces in them; the tabs are there, but a click does not change page. In **Preview** and in lilOS one page at a time is shown.

## Ports of its object in the schema

| Port | Direction | Type | Description |
|---|---|---|---|
| **open tab** (`value`) | input | number | Opens the page with that number (1 is the first), without the Tabs sending anything. |
| **open tab** (`value`) | output | number | When the user clicks a tab: its number (1 is the first). |
| **enabled** (`enabled`) | input | yes/no | `false` disables the Tabs with all the pages. |
| **visible** (`visible`) | input | yes/no | `false` hides them. |

> **Today these ports cannot be used from the IDE.** The Tabs are a container, and for containers the Properties do not show the **Object in a schema** section: there is no way to make their object. The tabs work all the same (the user changes page with a click), but a schema cannot know which page is open nor open one. See [Standard UI components](logicstudio-ui).

## How it works

- When opened, the **first** page is shown.
- A click on a tab shows its page. A click on the tab that is already open changes nothing (but, with the object, it would send the number again).
- A number on the input outside the range opens the first or the last page; `"2"` counts as 2. A value that is not a number (for example `"hello"`) hides all the pages until a number arrives or the user clicks a tab.
- **Hidden pages keep working**: their fields keep what the user has typed, and their components receive the values from the schemas even while they are not shown.

## Examples

### 1. Settings in three pages

```
Window «Settings»
└ Column (root)
  └ Tabs  Names of the tabs «General, Alerts, About»
    ├ Column                                       ← General
    │ ├ Text field  text1     Label «Device name»
    │ └ Selection   select1   Label «Unit»  Options «°C, °F»
    ├ Column                                       ← Alerts
    │ ├ Checkbox    checkbox1 Label «Warn me by email»
    │ └ Slider      slider1   Label «Threshold»
    └ Label  label1  Text «Version 1.0»            ← About
```

The first two pages are Columns with several pieces; the third is a single label, which is a page by itself.

### 2. A monitor with details

```
Window «Monitor»
└ Column (root)
  ├ Lamp  lamp1  Label «Alarm»  Color red
  └ Tabs  Names of the tabs «Load, Log»
    ├ Gauge    gauge1    Label «Load»  Unit «%»
    └ Console  console1  Height 200
```

The lamp always stays visible above the tabs; below, the user goes from the gauge to the console. The schema sends the values to the gauge even while the user looks at the console: going back to the first page they see the last value.

## Accessibility and keyboard

- The tabs are buttons with the tab role, and the open one is marked as selected: a screen reader announces them as «tab».
- You go from one tab to the next with **Tab** (not with the arrow keys, as in other tabs of lilOS) and open one with **Enter** or **Space**.
- The pages are not linked to their tabs for screen readers.

## See also

- [Box](ui.group), [Column](ui.column)
- [Standard UI components](logicstudio-ui)
