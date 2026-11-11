# Plane geometry

`logicstudio-plane` · requires the Logic Studio engine ([logicstudio-engine](logicstudio-engine))

The blocks for **plane geometry**: 2D points, distances, lines and their intersections, circles, polygons, conics, transformations of the plane with 3×3 matrices and SVG drawing.

## What is here and what is not

This package works **in the plane only** (x, y). The rest of geometry is in other packages:

- [Solid geometry](logicstudio-solid): solids (cube, prisms, pyramids, cylinder, cone, sphere…), points, vectors and planes in 3D space, cylindrical and spherical coordinates and the moving, scaling and rotating of 3D points ([2D point [x, y]](plane.point) ↔ [3D point](solid.point)).
- [Trigonometry](logicstudio-trig): sine, cosine and the other functions, angle conversion and normalisation, triangles (right-angled and general, with the laws of sines and cosines) and polar coordinates ([Cartesian → polar](trig.toPolar), [Polar → cartesian](trig.fromPolar)).

## How to install

The package does not come with the IDE. An administrator installs it from the **AppStore**, **Kernel** tab: it is called `logicstudio-plane` («Logic Studio: i blocchi di geometria piana…»). If the engine is missing, the AppStore installs it too. After the installation the blocks appear in the **Blocks** tab of the IDE, in the **Geometry** category.

A project that uses these blocks on a lilOS where the package is not installed shows the blocks with **Package missing**, and a running program waits until the package is back.

## The values

A **point** is a **list** `[x, y]`, as in [Solid geometry](logicstudio-solid), and the port is of type *list*: so it works with the blocks of [Lists and matrices](logicstudio-collections). The blocks also accept an object `{x, y}` and a list `[x, y, z]` (the z is ignored), but what comes out is always the list `[x, y]`. It is built and split with [2D point [x, y]](plane.point) and [Coordinates of a 2D point](plane.split).

A **shape** is an **object** with a `kind` field: `circle`, `ellipse`, `polygon`, `rect`, `line`, `parabola` or `hyperbola`; the points inside a shape are lists `[x, y]`. Shapes come out of the blocks that build them ([Circle](plane.circle), [Polygon (area · perimeter)](plane.polygon), [Conic (ellipse · parabola · hyperbola)](plane.conic)…) and are given to other blocks ([Transform](plane.transform), [Point inside shape](plane.inside), [Shape → SVG](plane.svg)…).

A **transformation matrix** is a list of three rows (3×3, homogeneous coordinates), like those of the matrix blocks of [Lists and matrices](logicstudio-collections).

**Angles** are in degrees by default; the blocks that use them have the setting **Angle unit** (degrees, radians or gradians). Conversions between units of measure (metres, feet…) and constants like π are in [Quantities and units](logicstudio-units) and [Constants](logicstudio-constants), not here.

## The blocks

### Points

| Block | What it does |
|---|---|
| [2D point [x, y]](plane.point) | Builds a 2D point [x, y] from x and y. |
| [Coordinates of a 2D point](plane.split) | Splits a 2D point into x and y. |
| [Distance (Math.hypot)](plane.distance) | Distance of a point from a point, a line or a segment, with the closest point. |
| [Midpoint · Lerp (t)](plane.midpoint) | The midpoint or any point between two points (lerp). |

### Lines

| Block | What it does |
|---|---|
| [Line through two points](plane.line) | The line through two points: a, b, c, slope, intercept and equation. |
| [Parallel · Perpendicular](plane.parallel) | The parallel or perpendicular to a line through a point. |
| [Bisector (axis of a segment · of an angle)](plane.bisector) | The perpendicular bisector of a segment or the bisector of an angle. |
| [Intersection](plane.intersect) | Where two lines, two segments, a line and a circle, two circles meet. |

### Shapes

| Block | What it does |
|---|---|
| [Circle](plane.circle) | A circle from centre and radius or from three points: area and circumference. |
| [Polygon (area · perimeter)](plane.polygon) | Area, perimeter, centroid, convexity and direction of a polygon. |
| [Regular polygon](plane.regular) | A regular polygon: vertices, area, apothem and side. |
| [Conic (ellipse · parabola · hyperbola)](plane.conic) | Ellipse, parabola or hyperbola: foci, vertices, eccentricity and equation. |
| [Point inside shape](plane.inside) | Tells whether a point is inside, on the edge of or outside a shape. |
| [Bounding box](plane.bounds) | The bounding box of points or shapes. |
| [Convex hull](plane.hull) | The convex hull of a cloud of points. |

### Transformations

| Block | What it does |
|---|---|
| [Transform (translate · rotate · scale · reflect · shear)](plane.transform) | Translates, rotates, scales, reflects or shears a point, a list of points or a shape. |
| [Transformation matrix (3×3)](plane.matrix) | The 3×3 transformation matrix, also combining several. |
| [Apply matrix](plane.apply) | Applies a matrix to points or shapes. |

### Drawing

| Block | What it does |
|---|---|
| [Shape → SVG](plane.svg) | Turns shapes and points into SVG text. |

## Precision

The numbers that come out are rounded to **12 significant digits** and those below 1e-12 become 0, so the small errors of computer decimal numbers do not show: the cosine of 90 degrees is `0`, not `6.1e-17`, and the sum of `0.1` and `0.2` is `0.3`. Comparisons (parallel lines, aligned points, point on the edge…) use a small **tolerance** (ε, `1e-9`), which can be changed in the Properties where it matters.

## Errors

Errors (a value that is not a point, two equal points for a line, three aligned points where a circle is needed…) come out of the block's **Exception** port, or go to the main console if it is not linked. Each page lists the exact messages.

## See also

- [Math functions](core.math) for roots, powers and rounding
- [Solid geometry](logicstudio-solid) for solids and geometry in space
- [Trigonometry](logicstudio-trig) for trigonometric functions, angles and triangles
- [Quantities and units](logicstudio-units) to change units of measure
- [Lists and matrices](logicstudio-collections) for lists of points and matrices
- [How a block works](ide/blocks)
