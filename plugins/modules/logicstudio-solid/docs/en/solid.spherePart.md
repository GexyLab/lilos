# Parts of a sphere (cap, sector, zone, wedge)

`solid.spherePart` · Solid geometry · [Solid geometry](logicstudio-solid) · version 1

The parts of a sphere: cap and segment with one base, spherical sector, zone and segment with two bases, lune and wedge.

## Inputs

| Port | Type | Description |
|---|---|---|
| **radius** (`r`) | number | The radius of the sphere. |
| **height** (`h`) | number | The height of the cap (from 0 to the diameter). Needed with **Cap** and **Sector**. |
| **plane 1 from the centre** (`d1`) | number | The distance from the centre of the first plane (signed, from −r to r). Needed with **Zone**. Hidden by default: show it with the eye in Properties. |
| **plane 2 from the centre** (`d2`) | number | The distance from the centre of the second plane (from −r to r). Needed with **Zone**. Hidden by default: show it with the eye in Properties. |
| **angle** (`angle`) | number | The angle of the lune or wedge, in the chosen unit (one turn at most). Needed with **Lune**. Hidden by default: show it with the eye in Properties. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **volume** (`volume`) | number | The volume of the part (cap/segment, sector, two-base segment or wedge). |
| **total area** (`area`) | number | The total area of the part (curved surface plus the flat parts). |
| **curved surface** (`curved`) | number | The area of the curved surface only (of the sphere). |
| **base radius** (`baseRadius`) | number | The radius of the base (of the first base, in the zone). Not present with **Lune**. Hidden by default: show it with the eye in Properties. |
| **second base radius** (`baseRadius2`) | number | The radius of the second base. Only with **Zone**. Hidden by default: show it with the eye in Properties. |
| **Exception** (`error`) | object | The error, if there is one (see **Errors**). Hidden by default: show it with the eye in Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Part** (`part`) | Cap and segment with one base / Spherical sector / Zone and segment with two bases / Lune and wedge | Cap and segment with one base | Which part to calculate. It changes the inputs that are needed (see below). |
| **Angle unit** (`unit`) | Degrees / Radians / Gradians / Turns | Degrees | The unit of the angle of the lune (the other parts have no angles). |

## How it works

The block waits only for the inputs of the chosen part; those of a different part are ignored. With radius *r* of the sphere:

- **Cap** (*r*, *h*, with *h* ≤ 2r): base radius a = √(h·(2r − h)); volume V = π·h²·(3r − h) / 3; curved surface = 2π·r·h; total area = curved + π·a²
- **Sector** (*r*, *h* of its cap): V = 2π·r²·h / 3; curved surface = 2π·r·h; total area = curved + π·r·a (with *a* as above: the conical part)
- **Zone and two-base segment** (*r*, *d1*, *d2*): the two planes are at distances *d1* and *d2* from the centre, signed (the two values swap by themselves if they are the wrong way round); h = d2 − d1; base radii a₁ = √(r² − d1²), a₂ = √(r² − d2²); V = π·h·(3a₁² + 3a₂² + h²) / 6; curved surface (the zone) = 2π·r·h; total area = curved + π·(a₁² + a₂²)
- **Lune and wedge** (*r*, *angle* θ; in the formulas θ is in radians): volume of the wedge V = 2r³·θ / 3; area of the lune (curved) = 2r²·θ; total area of the wedge = 2r²·θ + π·r². With θ = 2π (one turn) the wedge is the whole sphere

## Examples

### 1. A cap 1 high on a sphere of radius 5

```
[Constant · Variable: 5] value ──▶ radius  [Parts of a sphere: Cap and segment with one base] volume ──▶ value [Print (console.log)]
[Constant · Variable: 1] value ──▶ height                                                     curved surface ──▶ value [Print (console.log)]
                                                                                              base radius ──▶ value [Print (console.log)]
```

Settings: **Part** = Cap and segment with one base (r, h).

Writes these lines, one per output:

```
14.6607657167524
31.4159265358979
3
```

The base radius is hidden by default.

### 2. A slice of a sphere of radius 5 between the planes at −1 and 3 from the centre

```
[Constant · Variable: 5] value ──▶ radius                    [Parts of a sphere: Zone and segment with two bases] volume ──▶ value [Print (console.log)]
[Constant · Variable: -1] value ──▶ plane 1 from the centre                                                       curved surface ──▶ value [Print (console.log)]
[Constant · Variable: 3] value ──▶ plane 2 from the centre                                                        total area ──▶ value [Print (console.log)]
```

Settings: **Part** = Zone and segment with two bases (r, d1, d2).

Writes these lines, one per output:

```
284.837733925475
125.663706143592
251.327412287183
```

The inputs **plane 1** and **plane 2** are hidden by default: show them with the eye in Properties.

### 3. A 90° wedge (a quarter of a sphere) of radius 2

```
[Constant · Variable: 2] value ──▶ radius  [Parts of a sphere: Lune and wedge] volume ──▶ value [Print (console.log)]
[Constant · Variable: 90] value ──▶ angle                                      curved surface ──▶ value [Print (console.log)]
                                                                               total area ──▶ value [Print (console.log)]
```

Settings: **Part** = Lune and wedge (r, angle).

Writes these lines, one per output:

```
8.37758040957278
12.5663706143592
25.1327412287183
```

## Errors

| Message | When |
|---|---|
| raggio: serve un numero maggiore di 0 (arrivato: …) ("raggio: a number greater than 0 is needed (received: …)") | The **radius** (or the height, or the angle) is not a number greater than 0; for the height and the angle the message starts with «altezza:» or «angolo:». |
| L'altezza della calotta non può superare il diametro ("The height of the cap cannot exceed the diameter") | With **Cap** or **Sector**, *h* is bigger than 2r. |
| piano 1: serve un numero ("piano 1: a number is needed") | With **Zone**, a distance is not a number. |
| I piani devono tagliare la sfera: distanze dal centro tra −r e r ("The planes must cut the sphere: distances from the centre between −r and r") | With **Zone**, a distance is outside −r…r. |
| I due piani coincidono ("The two planes coincide") | With **Zone**, the two distances are equal. |
| L'angolo dello spicchio non può superare un giro ("The angle of the wedge cannot exceed one turn") | With **Lune**, the angle is bigger than one turn (360°). |

## See also

- [Sphere](solid.sphere) the whole sphere
- [Cone](solid.cone) the sector has a cone as its base
- [Solid geometry](logicstudio-solid), all the blocks
- [How a block works](ide/blocks)
