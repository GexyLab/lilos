# Solid geometry

`logicstudio-solid` · needs the Logic Studio engine ([logicstudio-engine](logicstudio-engine))

The blocks for **solid geometry**: the solids (cube, prisms, pyramids, cylinder, cone, sphere and its parts, ellipsoid, torus, regular polyhedra) with volume, areas, diagonals and radii; the blocks that find a dimension from a measure (a volume, an area); the **mass** of a volume of a material; and **analytic geometry in space** (points, vectors, planes, coordinates, transforms).

## How to install it

The package does not come with the IDE. An administrator installs it from the **AppStore**, **Kernel** tab: it is called `logicstudio-solid` («Logic Studio: i blocchi di geometria solida…», "Logic Studio: the blocks for solid geometry…"). If the engine is missing, the AppStore installs it too. After the installation the blocks appear in the IDE's **Blocks** tab, in the **Solid geometry** category.

A project that uses these blocks on a lilOS without the package shows the blocks with **The package is missing**, and an active program waits until the package is back.

## The blocks

### Solids

| Block | What it does |
|---|---|
| [Cube](solid.cube) | A cube: from the side it calculates volume, areas, diagonals and the radii of the inscribed and circumscribed spheres. |
| [Cuboid (rectangular box)](solid.cuboid) | A cuboid (a box): from length, width and height it calculates volume, areas and diagonal. |
| [Regular right prism](solid.prism) | A right prism whose base is a regular polygon: from the number of sides, the side and the height it calculates volume, areas and base apothem. |
| [Right prism (any base)](solid.prismGeneric) | A right prism with any base: from the base area, the base perimeter and the height it calculates volume and areas. |
| [Regular right pyramid](solid.pyramid) | A right pyramid whose base is a regular polygon: from the number of sides, the side and the height it calculates volume, areas, slant height and lateral edge. |
| [Frustum of a regular pyramid](solid.frustumPyramid) | The frustum of a regular pyramid (cut parallel to the base): from the sides of the two bases and the height it calculates volume, areas, slant height and edge. |
| [Cylinder](solid.cylinder) | A right cylinder: from radius and height it calculates volume and areas. |
| [Cone](solid.cone) | A right cone: from radius and height it calculates volume, areas, slant height and opening angle. |
| [Frustum of a cone](solid.frustum) | The frustum of a cone (cut parallel to the base): from radii and height it calculates volume, areas and slant height. |
| [Sphere](solid.sphere) | A sphere: from the radius it calculates volume, surface, diameter and great circle. |
| [Parts of a sphere (cap, sector, zone, wedge)](solid.spherePart) | The parts of a sphere: cap and segment with one base, spherical sector, zone and segment with two bases, lune and wedge. |
| [Ellipsoid](solid.ellipsoid) | An ellipsoid (a squashed sphere): from the three semi-axes it calculates volume and (approximate) surface. |
| [Torus](solid.torus) | A torus (a doughnut): from the major radius and the tube radius it calculates volume and surface. |
| [Regular polyhedra](solid.polyhedron) | One of the five regular polyhedra (tetrahedron, cube, octahedron, dodecahedron, icosahedron): from the edge it calculates volume, area, sphere radii, dihedral angle and the number of faces, edges and vertices. |

### From a measure

| Block | What it does |
|---|---|
| [From a measure to a dimension](solid.fromMeasure) | The opposite of the other blocks: from a volume or an area it finds the dimension (the side of a cube, the radius of a sphere, the radius or height of a cylinder or cone). |

### Mass

| Block | What it does |
|---|---|
| [Mass from volume and material](solid.mass) | Calculates the mass and weight of a volume of a material: 28 materials with their typical density, or a density of your own. |

### Analytic geometry in space

| Block | What it does |
|---|---|
| [3D point [x, y, z]](solid.point) | Puts three numbers together into a 3D point (or vector), a list `[x, y, z]`. |
| [Coordinates of a point](solid.pointXYZ) | Splits a 3D point or vector into its three coordinates. |
| [Distance and midpoint](solid.distance) | The distance between two points, their midpoint and the vector from one to the other. |
| [3D vectors (dot, cross…)](solid.vector) | An operation on 3D vectors: sum, difference, by a number, dot product, cross product, length, unit vector, angle, triple product, projection. |
| [Plane through 3 points](solid.plane) | The plane through three points: coefficients, normal, equation and area of the triangle. |
| [Point–plane distance](solid.planeDistance) | The distance of a point from a plane, with sign, and the projection of the point on the plane. |
| [Line–plane intersection](solid.linePlane) | Where a line meets a plane: the intersection point, the parameter t and whether the line is parallel to the plane. |
| [Cartesian, cylindrical, spherical coordinates](solid.coords) | Changes the coordinates of a point: Cartesian, cylindrical or spherical. |
| [Transform points (move, scale, rotate)](solid.transform) | Moves, scales or rotates a point or a list of points. |

## How to use them

- **No units.** Lengths are in the unit you use (metres, centimetres…), areas in its square, volumes in its cube. To change unit use the package [Quantities and units](logicstudio-units). The exception is **mass** (density in kg/m³): see [Mass from volume and material](solid.mass).
- **Points and vectors are lists** `[x, y, z]`, so they work with the blocks of [Lists and matrices](logicstudio-collections). An object `{ x, y, z }` is fine too; with two values `[x, y]` z counts as 0.
- **Angles** are in degrees by default. Where a block has an angle (in or out) there is the **Angle unit** setting: degrees, radians, gradians or turns. For other conversions see [Convert and normalize an angle](trig.convert) and the package [Trigonometry](logicstudio-trig).
- **The results** have 15 significant digits, so the small errors of the computer's floating-point numbers do not show.
- **A block waits** until all its dimensions have arrived; then, at every new value, it calculates all the outputs again.
- **Hidden outputs** (diagonals, radii, slant heights…) are shown with the eye next to the port in Properties.

## Errors

Errors (a negative or 0 dimension, three collinear points…) go out of the block's **Exception** port, or go to the main console if it is not linked. Each page lists the exact messages. For the limits of programs see [Limits](logicstudio-engine/limits).

## See also

- [Lists and matrices](logicstudio-collections) to work with lists of points
- [Quantities and units](logicstudio-units) to convert lengths, areas, volumes and masses
- [How a block works](ide/blocks)
