# Mass from volume and material

`solid.mass` · Solid geometry · [Solid geometry](logicstudio-solid) · version 1

Calculates the mass and weight of a volume of a material: 28 materials with their typical density, or a density of your own.

## Inputs

| Port | Type | Description |
|---|---|---|
| **volume** (`volume`) | number | The volume, in the unit chosen in **Volume unit**. It can be 0. |
| **density (kg/m³)** (`density`) | number | The density in kg/m³. It is needed (and read) only with the material **Other**; with the other materials it is ignored. Hidden by default: show it with the eye in Properties. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **mass (kg)** (`mass`) | number | The mass in kg. |
| **weight (N)** (`weight`) | number | The weight in newtons (mass × 9.80665). Hidden by default: show it with the eye in Properties. |
| **density (kg/m³)** (`density`) | number | The density used, in kg/m³. Hidden by default: show it with the eye in Properties. |
| **Exception** (`error`) | object | The error, if there is one (see **Errors**). Hidden by default: show it with the eye in Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Material** (`material`) | see the table below | Steel | The material, with its density (table below), or **Other** to use the **density** input. |
| **Volume unit** (`volumeUnit`) | m³ / L / cm³ / mm³ | m³ | The unit the volume comes in: m³, litres (dm³), cm³ (mL) or mm³. |

The options of **Material**:

| Option | Internal name |
|---|---|
| Water (4 °C) · 1000 kg/m³ | `water` |
| Sea water · 1025 kg/m³ | `seawater` |
| Ice · 917 kg/m³ | `ice` |
| Air (20 °C, 1 atm) · 1.204 kg/m³ | `air` |
| Steel · 7850 kg/m³ | `steel` |
| Stainless steel · 8000 kg/m³ | `stainless` |
| Iron · 7874 kg/m³ | `iron` |
| Cast iron · 7200 kg/m³ | `castIron` |
| Aluminium · 2700 kg/m³ | `aluminium` |
| Copper · 8960 kg/m³ | `copper` |
| Brass · 8500 kg/m³ | `brass` |
| Bronze · 8800 kg/m³ | `bronze` |
| Lead · 11340 kg/m³ | `lead` |
| Zinc · 7140 kg/m³ | `zinc` |
| Titanium · 4506 kg/m³ | `titanium` |
| Gold · 19320 kg/m³ | `gold` |
| Silver · 10490 kg/m³ | `silver` |
| Concrete · 2400 kg/m³ | `concrete` |
| Brick · 1800 kg/m³ | `brick` |
| Glass · 2500 kg/m³ | `glass` |
| Marble · 2700 kg/m³ | `marble` |
| Granite · 2750 kg/m³ | `granite` |
| Oak wood · 750 kg/m³ | `oak` |
| Pine wood · 500 kg/m³ | `pine` |
| PLA (3D printing) · 1240 kg/m³ | `pla` |
| ABS · 1050 kg/m³ | `abs` |
| PVC · 1380 kg/m³ | `pvc` |
| Rubber · 1100 kg/m³ | `rubber` |
| Other: the «density» input | `custom` |

## How it works

The block converts the volume to m³ and multiplies it by the density:

- mass (kg) = volume (m³) × density (kg/m³)
- weight (N) = mass × 9.80665
- 1 L = 0.001 m³; 1 cm³ = 0.000001 m³; 1 mm³ = 0.000000001 m³

The densities are typical values (the alloy, the moisture and the temperature make them vary). For a material that is not in the list choose **Other** and link the density. The **density** input is hidden by default: show it with the eye in Properties.

## Examples

### 1. A block of steel of 2 litres

```
[Constant · Variable: 2] value ──▶ volume  [Mass from volume and material: Steel, L] mass (kg) ──▶ value [Print (console.log)]
                                                                                     weight (N) ──▶ value [Print (console.log)]
```

Settings: **Material** = Steel · 7850 kg/m³; **Volume unit** = L (dm³).

Writes these lines, one per output:

```
15.7
153.964405
```

The weight is hidden by default.

### 2. A cube of concrete of 1 m³, with the density chosen in Properties

```
[Constant · Variable: 1] value ──▶ volume  [Mass from volume and material: Concrete, m³] mass (kg) ──▶ value [Print (console.log)]
                                                                                         density (kg/m³) ──▶ value [Print (console.log)]
```

Settings: **Material** = Concrete · 2400 kg/m³; **Volume unit** = m³.

Writes these lines, one per output:

```
2400
2400
```

### 3. A material of your own: 250 cm³ of a resin of 1180 kg/m³

```
[Constant · Variable: 250] value ──▶ volume            [Mass from volume and material: Other: the «density» input, cm³] mass (kg) ──▶ value [Print (console.log)]
[Constant · Variable: 1180] value ──▶ density (kg/m³)
```

Settings: **Material** = Other: the «density» input; **Volume unit** = cm³ (mL).

Writes `0.295`.

## Errors

| Message | When |
|---|---|
| volume: serve un numero maggiore o uguale a 0 ("volume: a number greater than or equal to 0 is needed") | The volume is not a number or is negative. |
| densità: serve un numero maggiore di 0 (arrivato: …) ("densità: a number greater than 0 is needed (received: …)") | With **Other**, the density is not a number greater than 0. |

## See also

- [Cylinder](solid.cylinder) the volume of a cylinder
- [Cuboid (rectangular box)](solid.cuboid) the volume of a box
- [Volume](unit.volume) to convert the volume to another unit first
- [Mass](unit.mass) to convert the mass to pounds, tonnes…
- [Solid geometry](logicstudio-solid), all the blocks
- [How a block works](ide/blocks)
