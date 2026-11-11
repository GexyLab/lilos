# Derivative of data

`num.dataDerivative` · Numerical analysis · [Numerical analysis](logicstudio-numeric) · version 1

Computes the **derivative of measured data**: the slope `dy/dx` at each point, also with x at different distances.

## Inputs

| Port | Type | Description |
|---|---|---|
| **x list** (`x`) | list | The list of the x, in increasing order. If missing, the x are 0, 1, 2… multiplied by the **Spacing**. |
| **y list** (`y`) | list | The list of the y, or a list of points `{x, y}` or `[x, y]`. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **dy/dx** (`derivative`) | list | The slope at each point, with the same length as the data. |
| **x list** (`x`) | list | The x used (useful if they were taken from the points or from the spacing). |
| **Exception** (`error`) | object | The error of the block, with one of the messages of the **Errors** section. Hidden by default: show it with the eye in Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Method** (`method`) | Central / Forward / Backward | Central | **Central** uses the two neighbours (exact formula also with x at different distances); **Forward** the next point; **Backward** the previous point. |
| **Spacing (if there is no x list)** (`dx`) | number | `1` | The distance between two consecutive data when there is no x list. |

## How it works

The block waits until all the linked inputs have a value and computes at every new value; it does not start by itself when the schema starts.

- At the two ends, where a side is missing, the only side there is is used.
- Noisy measures give very noisy derivatives: it is better to smooth them first (see [Smoothing](sig.smooth) in the signals package).
- For the data of a smooth function written as a formula the symbolic derivative is better ([Derivative](fn.derivative)).
- The x must grow: two equal x or x in reverse order are an error.

## Examples

### 1. Speed from a position

Positions measured every second: `[0, 1, 4, 9]`:

```
[Constant · Variable (JSON): [0, 1, 4, 9]] value ──▶ y [Derivative of data] derivative ──▶ value [Print (console.log)]
```

Writes `[1,2,4,5]`.

### 2. With irregular x

The parabola `y = x²` measured at 0, 0.5 and 2:

```
[Constant · Variable (JSON): [0, 0.5, 2]] value ──▶ x [Derivative of data]
[Constant · Variable (JSON): [0, 0.25, 4]] value ──▶ y
```

The derivative at the middle is exact (1).

### 3. From a function

```
[Sample f: x^2, 0 → 3, 4 points] x ──▶ x [Derivative of data]
[Sample f]                      y ──▶ y
```

It gives `[1,2,4,5]`: the derivative of `x²` at 0, 1, 2 and 3 (exact only in the middle, at the two ends it is the slope of the first segment).

## Errors

| Message | When |
|---|---|
| Servono dei dati: una lista di numeri o di punti ("Data are needed: a list of numbers or of points") | The input is not a list. |
| Le liste x e y hanno lunghezze diverse (… e …) ("The lists x and y have different lengths (… and …)") | The two lists do not have the same number of items. |
| Serve una lista di numeri per le x ("A list of numbers is needed for the x") | The **x** input is not a list. |
| Troppi dati (più di 1000000) ("Too much data (more than 1000000)") | The list has more than a million items. |
| Servono almeno 2 punti ("At least 2 points are needed") | The data have fewer than 2 points. |
| Le x devono essere in ordine crescente, senza ripetizioni ("The x must be in increasing order, with no repeats") | The list of the x is not increasing or has two equal values in a row. |
| Distanza: serve un numero ("Spacing: a number is needed") | The **Spacing** setting is not a number. |
| Distanza: deve essere diversa da zero ("Spacing: it must not be zero") | The **Spacing** setting is 0. |

## See also

- [Rate of change of a signal (d/dt)](fn.signalDerivative) for the derivative of a signal while it arrives
- [Integral of sampled data](int.data) the opposite: the integral of the data
- [Derivative at a point f'(x)](fn.derivativeAt) for the derivative of a function written as a formula
- [Sample f](num.sample) to get the data from a function
- [Numerical analysis](logicstudio-numeric), all the blocks of the package
- [Functions and derivatives](logicstudio-functions), the syntax of functions
- [How a block works](ide/blocks)
