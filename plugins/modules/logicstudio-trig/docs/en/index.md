# Trigonometry

`logicstudio-trig` · needs the Logic Studio engine ([logicstudio-engine](logicstudio-engine))

The blocks for **trigonometry**: sine, cosine, tangent and the other functions with their inverses, the hyperbolic functions, angle conversion (degrees, radians, gradians, turns; also degrees, minutes and seconds), triangles (right triangles and any triangle, with the laws of sines and cosines), polar coordinates and waves (sine, square, triangle, sawtooth).

## How to install it

The package does not come with the IDE. An administrator installs it from the **AppStore**, **Kernel** tab: it is called `logicstudio-trig` («Logic Studio: i blocchi di trigonometria…», "Logic Studio: the trigonometry blocks…"). If the engine is missing, the AppStore installs it too. After the installation the blocks appear in the IDE's **Blocks** tab, in the **Trigonometry** category.

A project that uses these blocks on a lilOS without the package shows the blocks with **The package is missing**, and an active program waits until the package is back.

## The blocks

### Functions

| Block | What it does |
|---|---|
| [Trigonometric functions (Math.sin, Math.cos…)](trig.fn) | Sine, cosine, tangent, cotangent, secant and cosecant of an angle. |
| [Inverse functions (Math.asin, Math.acos…)](trig.inverse) | Arcsine, arccosine, arctangent, arccotangent, arcsecant and arccosecant: from a value to the angle. |
| [Angle of a point (Math.atan2)](trig.atan2) | The angle of a point (x, y), in the right quadrant. |
| [Hyperbolic functions (Math.sinh, Math.cosh…)](trig.hyperbolic) | The 6 hyperbolic functions and their 6 inverses. |

### Angles

| Block | What it does |
|---|---|
| [Convert and normalize an angle](trig.convert) | Goes from one unit to another and brings the angle back between 0° and 360° or between −180° and 180°. |
| [Degrees → degrees, minutes, seconds](trig.toDms) | From 45.5042° to `45° 30′ 15″`. |
| [Degrees, minutes, seconds → degrees](trig.fromDms) | The opposite, also from a text like `45° 30′ 15″ N`. |

### Triangles

| Block | What it does |
|---|---|
| [Right triangle](trig.rightTriangle) | Given any two values, finds all the rest. |
| [Solve a triangle (laws of sines and cosines)](trig.triangle) | Given 3 values (with at least one side), finds the triangle, also in the ambiguous case with two solutions. |

### Polar coordinates

| Block | What it does |
|---|---|
| [Cartesian → polar](trig.toPolar) | From (x, y) to distance and angle. |
| [Polar → cartesian](trig.fromPolar) | From distance and angle to (x, y). |

### Waves

| Block | What it does |
|---|---|
| [Wave (sine, square, triangle, sawtooth)](trig.wave) | The value of a wave over time or at a given time. |

## The conventions

- **The Unit setting.** Every block that reads or gives an angle has the **Unit** setting: **degrees** (default), **radians**, **gradians** (gon, 100 for a right angle) or **turns**. You choose it in Properties. To change unit while the program runs use [Convert and normalize an angle](trig.convert).
- **Right angles are exact.** For an angle that is a multiple of a right angle the result is exact: sin 180° gives `0` (not `1.22e-16`), cos 90° gives `0`, and tan 90° is an **error**, not a huge number. It works in degrees, gradians and turns; in radians only for 0, because π cannot be written exactly.
- **15 significant digits.** Results are rounded to 15 digits, so the small errors of the computer's floating-point numbers do not show.
- **Numbers as text.** A text with a number (`"30.5"`, `"30,5"`) is fine in place of the number.
- **Errors** (a value out of domain, a triangle that does not exist…) go out of the block's **Exception** port, hidden by default, or go to the main console if it is not linked. Each page lists the exact messages.

## Math functions want radians

The [Math functions](core.math) block of the core package computes sine and cosine of an angle **in radians**. The blocks of this package instead work in the unit you choose (degrees by default), with the other functions and exact right angles. [Angle](unit.angle), of the [Quantities and units](logicstudio-units) package, also converts angles (and arcminutes and arcseconds too).

## See also

- [Math functions](core.math) to round and for sine and cosine in radians
- [Angle](unit.angle) to convert angles (package [Quantities and units](logicstudio-units))
- [Solid geometry](logicstudio-solid) for shapes in space and spherical and cylindrical coordinates ([Coordinates](solid.coords))
- [How a block works](ide/blocks)
