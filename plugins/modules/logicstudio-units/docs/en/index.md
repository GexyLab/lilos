# Quantities and units

`logicstudio-units` · needs the Logic Studio engine ([logicstudio-engine](logicstudio-engine))

The blocks to **convert between units of measure**: one block per quantity (length, mass, temperature, pressure, energy, data…), a block that converts with units chosen while the program runs, the **SI prefixes** (k, M, m, µ…), and the blocks to **read** a measure from a text (`"12.5 km"`) and to **write** it (`12.5 km`).

## How to install it

The package does not come with the IDE. An administrator installs it from the **AppStore**, **Kernel** tab: it is called `logicstudio-units` («Logic Studio: i blocchi per grandezze e unità di misura…», "Logic Studio: the blocks for quantities and units of measure…"). If the engine is missing, the AppStore installs it too. After the installation the blocks appear in the IDE's **Blocks** tab, in the **Unit conversions** category.

A project that uses these blocks on a lilOS without the package shows the blocks with **The package is missing**, and an active program waits until the package is back.

## The blocks

### One block per quantity

Each has a **value** input, a **result** output and, in Properties, the starting unit (**From**), the target unit (**To**) and an optional rounding.

| Block | Quantity (`id`) | Units |
|---|---|---|
| [Length](unit.length) | `length` | m, km, cm, mm, µm, nm, in, ft, yd, mi, nmi |
| [Area](unit.area) | `area` | m², km², cm², mm², ha, a, in², ft², yd², ac, mi² |
| [Volume](unit.volume) | `volume` | m³, L, dL, cL, mL, cm³, in³, ft³, US and imperial gallons, quarts, pints and fluid ounces |
| [Mass](unit.mass) | `mass` | kg, t, g, mg, µg, lb, oz, st, ct |
| [Temperature](unit.temperature) | `temperature` | °C, °F, K, °R |
| [Time](unit.time) | `time` | s, ms, µs, ns, min, h, d, wk, yr |
| [Speed](unit.speed) | `speed` | m/s, km/h, mph, kn, ft/s |
| [Acceleration](unit.acceleration) | `acceleration` | m/s², gn, ft/s², Gal |
| [Force](unit.force) | `force` | N, kN, dyn, kgf, lbf |
| [Pressure](unit.pressure) | `pressure` | Pa, hPa, kPa, MPa, bar, mbar, atm, psi, mmHg, Torr, inHg, mH₂O |
| [Energy](unit.energy) | `energy` | J, kJ, MJ, Wh, kWh, cal, kcal, BTU, eV |
| [Power](unit.power) | `power` | W, kW, MW, CV, hp, BTU/h, kcal/h |
| [Angle](unit.angle) | `angle` | rad, °, ′, ″, gon, rev |
| [Frequency](unit.frequency) | `frequency` | Hz, kHz, MHz, GHz, rpm, rad/s |
| [Data](unit.data) | `data` | bit, B, kB, MB, GB, TB, KiB, MiB, GiB, TiB, kbit, Mbit, Gbit |
| [Data rate](unit.dataRate) | `dataRate` | bit/s, kbit/s, Mbit/s, Gbit/s, B/s, kB/s, MB/s, GB/s, MiB/s |
| [Flow rate](unit.flow) | `flow` | m³/s, m³/h, L/s, L/min, L/h, gal/min |
| [Density](unit.density) | `density` | kg/m³, g/cm³, kg/L, g/L, lb/ft³ |
| [Torque](unit.torque) | `torque` | N·m, kgf·m, lbf·ft, lbf·in |
| [Fuel consumption](unit.fuel) | `fuel` | L/100km, km/L, mpg US, mpg UK |

### General blocks

| Block | What it does |
|---|---|
| [Convert (from · to)](unit.convert) | Converts with units that arrive as text (`"km/h"` → `"m/s"`) and finds the quantity by itself. |
| [SI prefixes (k, M, m, µ…)](unit.prefix) | Goes from one prefix to another for any unit, also those not in the package (V, A, Ω, F…). |
| [Parse measure](unit.parse) | From `"12.5 km"` gets the number, the unit and the quantity; if you want, it converts right away. |
| [Format measure](unit.format) | From a number and a unit makes a text like `12.5 km`, also choosing the prefix (1500 m → 1.5 km). |
| [Units of a quantity](unit.list) | The list of the units of a quantity, ready for a [Selection](ui.select). |

## Units as text

[Convert (from · to)](unit.convert) and [Parse measure](unit.parse) get units as text. The exact **symbol** in each quantity's table works, **upper and lower case included** (`kN` is the kilonewton, `kn` the knot; `Gal` is an acceleration, `gal` does not exist: write `gal US` or `gal UK`). Each unit also has other ways to write it, listed in the **Also written** column (for example `m2` for `m²`, `C` for `°C`, `um` for `µm`). Spaces before and after do not count.

Each symbol belongs to **one quantity only**: that is why the symbol alone tells which quantity it is.

## Precision

The factors are the exact ones of the definitions (1 in = 2.54 cm, 1 lb = 0.45359237 kg, 1 US gal = 3.785411784 L…). Results are rounded to **12 significant digits**, so the small errors of the computer's floating-point numbers do not show: 30 cm in metres gives `0.3`, not `0.30000000000000004`.

## Errors

Errors (a value that is not a number, an unknown unit, two units of different quantities, a temperature below absolute zero…) go out of the block's **Exception** port, or to the main console if nothing is linked to it. Each page lists the exact messages. Messages are in Italian, like all the engine's messages; the pages give an English gloss.

## See also

- [Math functions](core.math) to round and for sine and cosine (in radians: see [Angle](unit.angle))
- [Standard UI components](logicstudio-ui) to show measures in a window
- [How a block works](ide/blocks)
