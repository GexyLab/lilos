# Torus

`solid.torus` · Solid geometry · [Solid geometry](logicstudio-solid) · version 1

A torus (a doughnut): from the major radius and the tube radius it calculates volume and surface.

## Inputs

| Port | Type | Description |
|---|---|---|
| **major radius (centre to tube)** (`R`) | number | The distance from the centre of the torus to the centre of the tube. |
| **tube radius** (`r`) | number | The radius of the tube (not bigger than R). |

## Outputs

| Port | Type | Description |
|---|---|---|
| **volume** (`volume`) | number | The volume. |
| **surface** (`area`) | number | The surface. |
| **Exception** (`error`) | object | The error, if there is one (see **Errors**). Hidden by default: show it with the eye in Properties. |

## How it works

The block **waits** until all the dimensions have arrived; then, at every new value, it calculates all the outputs again. Every dimension must be a number greater than 0 (a text with a number, such as `"2.5"`, is fine too). The measures have no units: lengths are in the unit you use, areas in its square, volumes in its cube. The results have 15 significant digits.

With major radius *R* and tube radius *r*:

- volume V = 2π²·R·r²
- surface A = 4π²·R·r

## Examples

### 1. A doughnut: R = 3, r = 1

```
[Constant · Variable: 3] value ──▶ major radius (centre to tube)  [Torus] volume ──▶ value [Print (console.log)]
[Constant · Variable: 1] value ──▶ tube radius                            surface ──▶ value [Print (console.log)]
```

Writes these lines, one per output:

```
59.2176264065361
118.435252813072
```

### 2. A rubber ring: R = 10, r = 0.5

```
[Constant · Variable: 10] value ──▶ major radius (centre to tube)  [Torus] volume ──▶ value [Print (console.log)]
[Constant · Variable: 0.5] value ──▶ tube radius                           surface ──▶ value [Print (console.log)]
```

Writes these lines, one per output:

```
49.3480220054468
197.392088021787
```

## Errors

| Message | When |
|---|---|
| raggio maggiore (centro–tubo): serve un numero maggiore di 0 (arrivato: …) ("raggio maggiore (centro–tubo): a number greater than 0 is needed (received: …)") | This dimension is not a number greater than 0 (or is a text that is not a number). |
| raggio del tubo: serve un numero maggiore di 0 (arrivato: …) ("raggio del tubo: a number greater than 0 is needed (received: …)") | This dimension is not a number greater than 0 (or is a text that is not a number). |
| Il raggio del tubo non può superare il raggio maggiore ("The tube radius cannot exceed the major radius") | The tube radius **r** is bigger than **R**. |

## See also

- [Cylinder](solid.cylinder) a straight tube
- [Solid geometry](logicstudio-solid), all the blocks
- [How a block works](ide/blocks)
