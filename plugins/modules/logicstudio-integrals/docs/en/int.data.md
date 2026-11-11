# Integral of sampled data

`int.data` · Integrals · [Integrals](logicstudio-integrals) · version 1

Computes the integral of a list of measures: the area under the curve through the points. It is useful, for example, to know how much energy went by from a list of measured powers.

## Inputs

| Port | Type | Description |
|---|---|---|
| **data (numbers or points {x, y})** (`data`) | list | The data: either a list of **numbers** (measured at equal steps of **dx**), or a list of **points** `{x, y}` or `[x, y]`. Every list that arrives makes the block calculate. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **integral** (`total`) | number | The integral of all the data. |
| **running integral** (`cumulative`) | list | The integral up to each point: one number for each datum, the first is always 0. Hidden by default: show it with the eye in Properties. |
| **Exception** (`error`) | object | An error (see below). Hidden by default: show it with the eye in Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Method** (`method`) | Trapezoids / Simpson (equally spaced points) | Trapezoids | How the integral is calculated. |
| **Step dx (for a list of numbers)** (`dx`) | number greater than 0 | 1 | The distance between a datum and the next, when the data are only numbers. The first datum is at x = 0. |

## How it works

For a list of numbers the datum *i* is at x = *i* · dx. For a list of points the given x values are used, and they must **grow** from one point to the next.

- **Trapezoids**: between two neighbouring points the area is the width times the mean of the two values. It works with any distance between the points.
- **Simpson**: fits a parabola every three points, and is more precise if the curve is smooth. It needs **equally spaced points**. With an **odd number of intervals** (an even number of points) the last interval is calculated with a trapezoid.
- The **running integral** always uses trapezoids, also with Simpson.
- At least **2 data** are needed, at most 10000.
- To get a **mean over time**, divide the integral by the duration (the last x minus the first).

## Examples

### 1. Five measures

```
[Constant · Variable: [0, 1, 4, 9, 16]] value ──▶ data [Integral of sampled data, dx = 1] integral ──▶ value [Print (console.log)]
```

Writes `22`. With **running integral** linked it writes `[0,0.5,3,9.5,22]`.

With the **Simpson** method it writes `21.3333333333333` (the data are x², the true integral between 0 and 4 is 64/3).

### 2. Points with different distances

Data `[{"x":0,"y":0},{"x":1,"y":2},{"x":3,"y":2}]`: writes `5` (1 from the first trapezoid, 4 from the second). The running integral is `[0,1,5]`.

With Simpson the same list gives the error "Simpson vuole punti equidistanti: usa i trapezi".

### 3. An even number of points with Simpson

Data `[0, 1, 4, 9, 16, 25]` (5 intervals): Simpson gives `41.8333333333333`, because the first four intervals use Simpson and the last one a trapezoid. The running integral reaches `42.5` (trapezoids).

## Errors

| Message | When |
|---|---|
| La lista dei dati deve essere una lista ("The list of data must be a list") | Something that is not a list arrives at the input. |
| La lista dei dati ha più di 10000 elementi ("The list of data has more than 10000 elements") | The data are more than 10000. |
| Servono almeno 2 dati ("At least 2 data are needed") | The list has fewer than 2 elements. |
| Il passo dx deve essere maggiore di 0 ("The step dx must be greater than 0") | With a list of numbers, **dx** is 0 or negative. |
| dato 2: serve un numero ("datum 2: a number is needed") | A datum of the list of numbers is not a number (here the second one). |
| x del punto 2: serve un numero ("x of point 2: a number is needed") | A point has no numeric x. |
| y del punto 2: serve un numero ("y of point 2: a number is needed") | A point has no numeric y. |
| Le x devono crescere: il punto 2 non viene dopo il precedente ("The x values must grow: point 2 does not come after the previous one") | The x values of two neighbouring points are equal or decrease. |
| Simpson vuole punti equidistanti: usa i trapezi ("Simpson wants equally spaced points: use trapezoids") | With Simpson the x values are not equally spaced. |

## See also

- [Signal integrator](int.signal) to add up over time a value that arrives live
- [Definite integral](int.definite) for the integral of a formula
- [Mean value on [a, b]](int.mean) for the mean of a formula
- [Integrals](logicstudio-integrals), all the blocks
- [How a block works](ide/blocks)
