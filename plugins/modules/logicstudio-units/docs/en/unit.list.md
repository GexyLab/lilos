# Units of a quantity

`unit.list` · Units · [Quantities and units](logicstudio-units) · version 1

Sends the list of the units of a quantity, ready to fill a [Selection](ui.select) or a [List](ui.list) in a window.

## Inputs

Both are hidden by default (show them with the eye in Properties).

| Port | Type | Description |
|---|---|---|
| **send** (`send`) | pulse | Sends the list again. |
| **quantity** (`quantity`) | text | Changes the quantity: the `id` of a quantity (`length`, `temperature`…). Sends the list right away. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **units** (`units`) | list | The units, in the order of the quantity's page. |
| **Exception** (`error`) | object | The quantity does not exist. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Quantity** (`quantity`) | the package's 20 quantities | Length | The quantity whose units to send. |
| **List of** (`labels`) | Symbol and name (for a Selection), Symbols only | Symbol and name | What is in the list. |

## How it works

- **At the start**, if nothing is linked to **send** or to **quantity**, the block sends the list of the **Quantity** in Properties right away.
- A pulse on **send** sends it again; a text on **quantity** sends the list of that quantity (and a later pulse sends that one again).
- With **Symbol and name** each item is an object `{ "value": "km", "label": "km — kilometre" }`: a [Selection](ui.select) shows the label and sends the symbol. The name is in the **language of whoever runs the program** (Italian or English).
- With **Symbols only** the list is of texts: `["°C", "°F", "K", "°R"]`.

The quantities' `id`s are in the table of [Quantities and units](logicstudio-units).

## Examples

### 1. A menu of temperature units

```
[Units of a quantity: temperature] units ──▶ options [Selection]
```

The Selection shows "°C — degree Celsius", "°F — degree Fahrenheit", "K — kelvin", "°R — degree Rankine"; when one is chosen it sends `°C`, `°F`…, ready for **from** or **to** of [Convert (from · to)](unit.convert).

### 2. First the quantity, then the units

A Selection with the quantities (`length, mass, temperature`) changes the units of the other two:

```
[Selection: quantity] value ──▶ quantity [Units of a quantity] units ──▶ options [Selection: from]
                                                               units ──▶ options [Selection: to]
```

Choosing `mass`, the two Selections show kg, t, g, mg, µg, lb, oz, st, ct.

## Errors

| Message | When |
|---|---|
| Grandezza sconosciuta: «…» ("Unknown quantity") | **quantity** gets a text that is not the `id` of a quantity of the package (for example `lunghezza` instead of `length`). |

## See also

- [Convert (from · to)](unit.convert), which gets the units chosen
- [Selection](ui.select)
- [Quantities and units](logicstudio-units)
- [How a block works](ide/blocks)
