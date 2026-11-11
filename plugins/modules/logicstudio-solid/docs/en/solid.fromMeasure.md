# From a measure to a dimension

`solid.fromMeasure` · Solid geometry · [Solid geometry](logicstudio-solid) · version 1

The opposite of the other blocks: from a volume or an area it finds the dimension (the side of a cube, the radius of a sphere, the radius or height of a cylinder or cone).

## Inputs

| Port | Type | Description |
|---|---|---|
| **volume or area** (`measure`) | number | The starting volume or area, according to what you look for. |
| **height or radius (cylinder, cone)** (`known`) | number | The height or radius you already know. It is needed only for cylinder and cone (see below); in the other cases it is ignored. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **dimension** (`result`) | number | The dimension you look for (side, radius or height). |
| **Exception** (`error`) | object | The error, if there is one (see **Errors**). Hidden by default: show it with the eye in Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Find** (`what`) | see the table below | Sphere: radius from the volume | What to find (see the table below). |

The options of **Find**:

| Option | Internal name |
|---|---|
| Cube: side from the volume | `cubeV` |
| Cube: side from the total area | `cubeA` |
| Sphere: radius from the volume | `sphereV` |
| Sphere: radius from the area | `sphereA` |
| Cylinder: radius from the volume and the height | `cylinderR` |
| Cylinder: height from the volume and the radius | `cylinderH` |
| Cone: radius from the volume and the height | `coneR` |
| Cone: height from the volume and the radius | `coneH` |

## How it works

The block waits for **volume or area** (and **height or radius** for cylinder and cone), then calculates:

- **Cube: side from the volume**: s = ∛V
- **Cube: side from the total area**: s = √(A / 6)
- **Sphere: radius from the volume**: r = ∛(3V / (4π))
- **Sphere: radius from the area**: r = √(A / (4π))
- **Cylinder: radius from the volume and the height**: r = √(V / (π·h)), with the height *h* on **height or radius**
- **Cylinder: height from the volume and the radius**: h = V / (π·r²), with the radius *r* on **height or radius**
- **Cone: radius from the volume and the height**: r = √(3V / (π·h))
- **Cone: height from the volume and the radius**: h = 3V / (π·r²)

The volume and the area must be greater than 0.

## Examples

### 1. The side of a 1000-litre cube

```
[Constant · Variable: 1] value ──▶ volume or area  [From a measure to a dimension: Cube: side from the volume] dimension ──▶ value [Print (console.log)]
```

Settings: **Find** = Cube: side from the volume.

Writes `1`.

A cubic metre (1000 litres) has a side of 1 m.

### 2. The radius of a 100 cm³ sphere

```
[Constant · Variable: 100] value ──▶ volume or area  [From a measure to a dimension: Sphere: radius from the volume] dimension ──▶ value [Print (console.log)]
```

Settings: **Find** = Sphere: radius from the volume.

Writes `2.87941191148486`.

### 3. The radius of a 500 cm³ cylinder 10 cm tall

```
[Constant · Variable: 500] value ──▶ volume or area                    [From a measure to a dimension: Cylinder: radius from the volume and the height] dimension ──▶ value [Print (console.log)]
[Constant · Variable: 10] value ──▶ height or radius (cylinder, cone)
```

Settings: **Find** = Cylinder: radius from the volume and the height.

Writes `3.98942280401433`.

## Errors

| Message | When |
|---|---|
| misura: serve un numero maggiore di 0 (arrivato: …) ("misura: a number greater than 0 is needed (received: …)") | The volume or the area is not a number greater than 0. |
| altezza o raggio: serve un numero maggiore di 0 (arrivato: …) ("altezza o raggio: a number greater than 0 is needed (received: …)") | With cylinder or cone, the height or the radius is not a number greater than 0. |

## See also

- [Cube](solid.cube) for all the measures of the cube
- [Sphere](solid.sphere) for all the measures of the sphere
- [Cylinder](solid.cylinder) for all the measures of the cylinder
- [Cone](solid.cone) for all the measures of the cone
- [Solid geometry](logicstudio-solid), all the blocks
- [How a block works](ide/blocks)
