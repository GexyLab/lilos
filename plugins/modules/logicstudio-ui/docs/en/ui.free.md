# Free area

`ui.free` · Containers · [Standard UI components](logicstudio-ui) · version 1

An area of fixed height where every component stays at the exact point where you leave it, measured in pixels. It is for panels where position matters: the diagram of a plant with lamps on top of it, a drawn dashboard.

## Properties

| Property | Values | Default | Description |
|---|---|---|---|
| **Height (px)** | from 40 to 2000 | 240 | The height of the area. The width is that of the container it is in (usually the whole window). |

## Ports of its object in the schema

The Free area, like all containers, today **has no object** that can be made from the IDE: its **enabled** and **visible** inputs cannot be used. See [Standard UI components](logicstudio-ui).

## How it works

**Putting a piece.** In **Design**, drag a piece from the palette into the area: the area turns blue and the piece goes where you leave it. The top left corner of the piece goes about 10 pixels above and to the left of the pointer. The position is saved as two numbers, **x** (from the left edge) and **y** (from the top edge).

**Moving it.** Drag the piece to another point of the area: only x and y change.

**Things to know.**

- A piece added with **a click** on the palette (with the area selected) has no position: it ends up in the **top left corner**, on top of the other pieces added in the same way. Drag it where you want.
- Each piece has its **natural size**: the IDE does not let you change its width and height.
- Pieces can overlap: the one that comes later in the order stays on top.
- The area **does not cut** what falls outside: a piece lower than the height of the area ends up on top of the components that follow the area. Keep the pieces inside, or increase the **Height**.
- The area does not adapt to the window: positions are in pixels. If the window narrows, the pieces on the right can go off the edge. For a window the user can resize, prefer [Column](ui.column), [Row](ui.row) and [Grid](ui.grid).
- If you **move** a piece from a Free area to another container, it keeps its coordinates and appears **shifted** by those pixels in the new place too. To fix it, remove it and add it again in the right container.
- Coordinates go from 0 to 10000 pixels.

## Examples

### 1. The lamps on a plant diagram

```
Window «Plant»  600 × 340
└ Column (root)
  └ Free area  Height 300
    ├ Image  image1  Image «risorse/impianto.png»        x 0    y 0
    ├ Lamp   lamp1   Label «Pump 1»                      x 80   y 190
    ├ Lamp   lamp2   Label «Pump 2»                      x 300  y 190
    └ Value  value1  Label «Level:»  Unit «%»            x 420  y 40
```

First drag the image (the drawing of the plant, about 570 pixels wide and 300 tall) into the corner, then the lamps and the value on top of the drawing, in the right places. The schemas turn the lamps on and update the level as usual, with the objects of the components.

### 2. A dashboard with fixed positions

```
Window «Car»  480 × 260
└ Column (root)
  └ Free area  Height 220
    ├ Gauge  gauge1  Label «Speed»    Unit «km/h»   Maximum 200  x 20   y 20
    ├ Gauge  gauge2  Label «Revs»     Unit «×1000»  Maximum 8    x 260  y 20
    └ Lamp   lamp1   Label «Fuel»     Color yellow               x 190  y 170
```

The two gauges stand side by side at the top, the lamp below, in the center. In a window of fixed width (turn off **The user can resize it** in the properties of the window) the dashboard always stays the same.

## Accessibility

For the keyboard and screen readers the order of the pieces is the one in which you added them, not the one in which they are seen. If a panel has many controls, add them in the order the user should use them.

## See also

- [Column](ui.column), [Row](ui.row), [Grid](ui.grid)
- [Image](ui.image)
- [Standard UI components](logicstudio-ui)
