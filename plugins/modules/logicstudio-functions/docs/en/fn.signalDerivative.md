# Rate of change of a signal (d/dt)

`fn.signalDerivative` · Functions · [Functions and derivatives](logicstudio-functions) · version 1

The rate of change of a signal over time: the derivative of a measure that arrives at every instant (how much it changes per second, per minute or per hour).

## Inputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | number | The value of the signal. At every value the block computes the rate of change. |
| **reset** (`reset`) | pulse | A pulse (any value) that makes the block forget the previous value and the smoothing. Hidden by default: show it with the eye in the Properties. |
| **t (seconds; else the clock)** (`t`) | number | The time of the value, in seconds. When it is not linked the system clock is used. Hidden by default: show it with the eye in the Properties. It does not start the block: it keeps its value until something arrives on the other inputs. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **rate** (`rate`) | number | The rate of change: how much the value changed per unit of time, in the unit chosen in **Per**. |
| **Exception** (`error`) | object | The error of the block, with one of the messages in the **Errors** section. Hidden by default: show it with the eye in the Properties. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Per** (`per`) | `s` second; `min` minute; `h` hour | `s` | The unit of time of the rate. |
| **Smoothing (0 = none, 0.9 = strong)** (`smoothing`) | number (from 0 to 0.99) | 0 | How much to smooth the result (0 none, 0.9 a lot). |

## How it works

At every new **value** the block compares the value with the previous one: rate = (value − previous value) / (elapsed time), with the time in the chosen unit. The time is the one on the input **t** (in seconds) if it is linked, otherwise the clock at the moment the value arrives.

- The **first value** produces nothing (there is no previous one). Also after **reset** the first value only restarts.
- If the elapsed time is 0 or negative (two values with the same time) the block sends nothing.
- **Smoothing** α: the rate sent is α · (previous rate sent) + (1 − α) · (new rate). With 0 it is the raw rate; the higher it is, the smoother the signal and the slower the response. The first smoothed value is the raw one.
- Only the values that arrive on **value** make a result come out: **t** keeps its last value and does not start the block, and **reset** only clears.
- The rate of change is the **numeric** derivative of a series of measures: with noisy signals you need smoothing. For the derivative of a function written as a formula use [Derivative (symbolic)](fn.derivative).

## Examples

### 1. Metres per second

The value arrives every second: 0, 10, 30, 30 (with **Per** second):

```
[Constant · Variable: 0] value ──▶ value [Rate of change of a signal (d/dt)] rate ──▶ value [Print (console.log)]
```

The first value writes nothing; then it writes `10`, `20`, `0`.

### 2. Per minute

Values 0, 1, 3 one second apart, with **Per** minute: `60` and `120`.

### 3. Smoothed

Values 0, 10, 30 one second apart, **Smoothing** 0.5: `10` and then `15` (0.5 · 10 + 0.5 · 20).

### 4. With the time from outside

Link **t** to a time in seconds (0, then 2): values 0 and 10 give `5`. Another value with the same time (2) sends nothing.

### 5. Reset

Values 0, 10 (rate `10`), a pulse on **reset**, then 50 (nothing), 60 (`10`, computed from 50 and not from 10).

## Errors

| Message | When |
|---|---|
| valore: serve un numero ("value: a number is needed") | The **value** is not a number. |
| t: serve un numero ("t: a number is needed") | The time **t** is not a number. |

## See also

- [Derivative at a point f'(x)](fn.derivativeAt) for the derivative of a function at a point
- [Derivative (symbolic)](fn.derivative) for the derivative of a function written as a formula
- [Lines](charts.line) to see the signal and its rate
- [Functions and derivatives](logicstudio-functions), the syntax of the expressions and all the blocks
- [How a block works](ide/blocks)
