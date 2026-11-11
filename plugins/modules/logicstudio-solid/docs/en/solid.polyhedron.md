# Regular polyhedra

`solid.polyhedron` · Solid geometry · [Solid geometry](logicstudio-solid) · version 1

One of the five regular polyhedra (tetrahedron, cube, octahedron, dodecahedron, icosahedron): from the edge it calculates volume, area, sphere radii, dihedral angle and the number of faces, edges and vertices.

## Inputs

| Port | Type | Description |
|---|---|---|
| **edge** (`edge`) | number | The length of the edge. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **volume** (`volume`) | number | The volume. |
| **total area** (`area`) | number | The total area (all the faces). |
| **inscribed sphere radius** (`inradius`) | number | The radius of the inscribed sphere (it touches the faces). |
| **midsphere radius** (`midradius`) | number | The radius of the sphere that touches the edges at their midpoint. Hidden by default: show it with the eye in Properties. |
| **circumscribed sphere radius** (`circumradius`) | number | The radius of the circumscribed sphere (it goes through the vertices). |
| **dihedral angle** (`dihedral`) | number | The dihedral angle, between two faces that meet at an edge, in the chosen unit. Hidden by default: show it with the eye in Properties. |
| **faces** (`faces`) | number | The number of faces. Hidden by default: show it with the eye in Properties. |
| **edges** (`edges`) | number | The number of edges. Hidden by default: show it with the eye in Properties. |
| **vertices** (`vertices`) | number | The number of vertices. Hidden by default: show it with the eye in Properties. |
| **Exception** (`error`) | object | The error, if there is one (see **Errors**). Hidden by default: show it with the eye in Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Polyhedron** (`kind`) | see the table below | Tetrahedron | Which polyhedron. |
| **Angle unit** (`unit`) | Degrees / Radians / Gradians / Turns | Degrees | The unit of the dihedral angle. |

The options of **Polyhedron**:

| Option | Internal name |
|---|---|
| Tetrahedron (4 faces) | `tetrahedron` |
| Cube (6 faces) | `cube` |
| Octahedron (8 faces) | `octahedron` |
| Dodecahedron (12 faces) | `dodecahedron` |
| Icosahedron (20 faces) | `icosahedron` |

## How it works

The block **waits** until all the dimensions have arrived; then, at every new value, it calculates all the outputs again. Every dimension must be a number greater than 0 (a text with a number, such as `"2.5"`, is fine too). The measures have no units: lengths are in the unit you use, areas in its square, volumes in its cube. The results have 15 significant digits.

Every measure is a factor times the edge *a* (squared for the area, cubed for the volume). With edge *a*:

- **Tetrahedron**: V = a³·√2/12; A = √3·a²; r = a·√6/12; midsphere = a·√2/4; R = a·√6/4; dihedral = arccos(1/3) ≈ 70.5288°; 4 faces, 6 edges, 4 vertices
- **Cube**: V = a³; A = 6a²; r = a/2; midsphere = a·√2/2; R = a·√3/2; dihedral 90°; 6 faces, 12 edges, 8 vertices
- **Octahedron**: V = a³·√2/3; A = 2√3·a²; r = a·√6/6; midsphere = a/2; R = a·√2/2; dihedral = arccos(−1/3) ≈ 109.4712°; 8 faces, 12 edges, 6 vertices
- **Dodecahedron**: V = a³·(15 + 7√5)/4; A = 3·√(25 + 10√5)·a²; r = a·√((25 + 11√5)/10)/2; midsphere = a·(3 + √5)/4; R = a·√3·(1 + √5)/4; dihedral = arccos(−1/√5) ≈ 116.5651°; 12 faces, 30 edges, 20 vertices
- **Icosahedron**: V = a³·5(3 + √5)/12; A = 5√3·a²; r = a·√3·(3 + √5)/12; midsphere = a·(1 + √5)/4; R = a·√(10 + 2√5)/4; dihedral = arccos(−√5/3) ≈ 138.1897°; 20 faces, 30 edges, 12 vertices

The numbers of faces, edges and vertices follow Euler's formula: vertices − edges + faces = 2.

## Examples

### 1. A dodecahedron with edge 1

```
[Constant · Variable: 1] value ──▶ edge  [Regular polyhedra: Dodecahedron] volume ──▶ value [Print (console.log)]
                                                                           total area ──▶ value [Print (console.log)]
                                                                           circumscribed sphere radius ──▶ value [Print (console.log)]
```

Settings: **Polyhedron** = Dodecahedron (12 faces).

Writes these lines, one per output:

```
7.66311896062463
20.6457288070676
1.40125853844407
```

### 2. A tetrahedron with edge 3: angles and counts

```
[Constant · Variable: 3] value ──▶ edge  [Regular polyhedra: Tetrahedron] dihedral angle ──▶ value [Print (console.log)]
                                                                          faces ──▶ value [Print (console.log)]
                                                                          edges ──▶ value [Print (console.log)]
                                                                          vertices ──▶ value [Print (console.log)]
```

Settings: **Polyhedron** = Tetrahedron (4 faces).

Writes these lines, one per output:

```
70.5287793655093
4
6
4
```

These outputs are hidden by default.

## Errors

| Message | When |
|---|---|
| spigolo: serve un numero maggiore di 0 (arrivato: …) ("spigolo: a number greater than 0 is needed (received: …)") | The edge is not a number greater than 0. |

## See also

- [Cube](solid.cube) the cube with all its measures
- [Sphere](solid.sphere) the inscribed and circumscribed spheres
- [Solid geometry](logicstudio-solid), all the blocks
- [How a block works](ide/blocks)
