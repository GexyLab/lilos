# getBattery (battery)

`hw.battery` · Hardware · [Hardware](logicstudio-hardware) · version 1

The battery of the computer where lilOS runs (a laptop, a Raspberry Pi with a UPS that the system sees): how charged it is, whether it is charging, whether the computer is plugged in; it warns when it runs low.

## Inputs

| Port | Type | Description |
|---|---|---|
| **read** (`read`) | pulse | Reads now. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **battery** (`battery`) | object | Everything (see below). |
| **charge (%)** (`percent`) | number | From 0 to 100, or `null` without a battery. |
| **charging** (`charging`) | yes/no | Whether it is charging. |
| **plugged in** (`plugged`) | yes/no | Whether the computer is connected to the power. |
| **got low** (`low`) | pulse | The charge has just gone under **Low under (%)**, without charging. |
| **Exception** (`error`) | object | Missing permission, library that does not load. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Read by itself every (seconds, 0 = never)** (`seconds`) | from 0 to 86400 | 60 | How often the block reads by itself. |
| **Low under (%)** (`threshold`) | from 1 to 99 | 20 | |

## How it works

The **battery** object: `{ present, percent, charging, plugged, minutesLeft, cycles, health, voltage, model }`. `present` is `false` on a computer without a battery (the other outputs are then `null` or `false`); `minutesLeft` is the minutes left when the system knows; `health` is the present capacity compared with the one when new, in percent.

**got low** sends a pulse only once when the charge goes under the threshold; again only after it has gone back over (or the computer is charging).

## Examples

### 1. A notification when the battery is low

```
[getBattery (battery): every 60 s, low under 15] got low ──▶ send [Notify: "Battery at 15%: plug in the charger"]
```

### 2. The charge in a window

```
[getBattery (battery): every 30 s] charge (%) ──▶ value [Progress bar: progress1]
                                   charging   ──▶ on [Lamp: lamp1]
```

## Errors

The messages are in Italian, as users see them; the English meaning is in parentheses.

| Message | When |
|---|---|
| Non hai il permesso di usare le informazioni di sistema e le stampanti: chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) ("You do not have permission to use the system information and the printers: ask an administrator (Control Panel → Logic Studio → Hardware)") | You do not have the permission for the system information. |
| La libreria systeminformation non funziona su questo computer: … ("The systeminformation library does not work on this computer: …") | The library does not load. |

## See also

- [os (system info)](hw.systemInfo)
- [Hardware](logicstudio-hardware)
