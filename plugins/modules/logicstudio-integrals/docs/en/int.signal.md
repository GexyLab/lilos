# Signal integrator (∫ dt)

`int.signal` · Integrals · [Integrals](logicstudio-integrals) · version 1

Adds up over time a value that arrives live, for example from a sensor: from a flow it gets the volume that went by, from a power the energy, from a speed the distance. It can be reset, and kept between a minimum and a maximum.

## Inputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | number | The value of the signal. Every value that arrives makes one step of integration. |
| **reset** (`reset`) | pulse | Brings the integral back to the **Start value** and makes the block forget the last value. |
| **t (seconds; else the clock)** (`t`) | number | The time of the value, in seconds. Hidden by default: show it with the eye in Properties. It does not start the block: the value of **t** must arrive before the one of **value**. If it is not linked, the block uses the engine clock. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **integral** (`total`) | number | The integral up to now. |
| **Exception** (`error`) | object | An error (see below). Hidden by default: show it with the eye in Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Time unit** (`per`) | second / minute / hour | second | The time unit of the signal: a value in L/min wants **minute**. |
| **Method** (`method`) | Trapezoids (mean of the last two values) / Rectangles (the last value holds until the next) | Trapezoids | How to add up between a value and the next. |
| **Start value** (`start`) | number | 0 | Where the integral starts, and the value it goes back to with **reset**. |
| **Keep between a minimum and a maximum (anti-windup)** (`limit`) | yes / no | no | Keeps the integral inside an interval. |
| **Minimum** (`min`) | number | 0 | The lowest value of the integral. It shows only with **anti-windup**. |
| **Maximum** (`max`) | number | 100 | The highest value of the integral. It shows only with **anti-windup**. |

## How it works

At every **value** that arrives, the block looks at how much time has passed since the previous value (**dt**, in the chosen unit) and adds to the integral:

- with **Trapezoids**: dt × (previous value + new value) / 2;
- with **Rectangles**: dt × previous value (the value stays the previous one until the new one).

At the start the block sends the **Start value** at once. The first value after the start or after a **reset** adds nothing: it only sends the starting integral, and becomes the "previous" value. If time does not move forward (dt is not positive) the integral does not change.

The time is the engine clock, unless **t** is linked: then it is the time you give, in seconds (useful for recorded data, which does not arrive in real time). Until something has arrived on **t**, the values wait.

With **anti-windup** the integral never leaves [Minimum, Maximum]: when it reaches the limit it stays there, instead of growing without end. The limit is applied at every step, not only on the output.

The integral is not saved when the program stops.

## Examples

### 1. A sensor over time

A value arrives every second: 0, 10, 10, 0, 0.

```
Time (s)      0    1    2    3    4
Sensor        0   10   10    0    0

[Sensor] value ──▶ value [Signal integrator: trapezoids] integral ──▶ value [Print (console.log)]
```

With **Trapezoids** the block writes `0`, `5`, `15`, `20`, `20`.

With **Rectangles** it writes `0`, `0`, `10`, `20`, `20`: each value counts for the second that follows.

### 2. Flow in litres per minute

**Time unit** = minute. A flow of 2 L/min arrives at seconds 0, 30 and 60: the integral is `0`, `1`, `2` litres.

### 3. Reset and limits

Value 5 at seconds 0 and 2: the integral is `0`, then `10`. A pulse on **reset** at second 3 sends `0`. The value 5 at second 4 sends `0` (it starts again from here) and the one at second 6 sends `10`.

With **anti-windup**, minimum 0 and maximum 15, and a constant value 10 every second, the integral is `0`, `10`, `15`, `15`.

## Errors

| Message | When |
|---|---|
| valore: serve un numero ("value: a number is needed") | The value that arrives is not a number. |
| t: serve un numero ("t: a number is needed") | Something that is not a number arrived on **t**. |

## See also

- [Integral of sampled data](int.data) to integrate a list that is already complete
- [Rate of change of a signal (d/dt)](fn.signalDerivative) for the opposite operation
- [Integrals](logicstudio-integrals), all the blocks
- [How a block works](ide/blocks)
