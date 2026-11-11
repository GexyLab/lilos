# Sample filter (moving average, EMA)

`sig.smooth` · Signals · [Signals](logicstudio-signals) · version 1

Smooths a measurement: the exponential average (EMA), the moving average or the moving median. It works both with **single values** arriving one at a time (a sensor reading) and with **frames of samples** (a signal). It remembers past values from one call to the next. It is the simplest filter to use when you do not need cutoff frequencies: for those there is the [IIR filter](sig.iir).

## Inputs

| Port | Type | Description |
|---|---|---|
| **value or signal** (`value`) | any | A number (also a text with a number, `"2.5"`), a list of numbers (taken as a signal at the **fs of plain lists**) or an object `{ fs, t0, samples }`. |
| **reset** (`reset`) | pulse | Forgets past values: the next value starts over. Hidden by default: show it with the eye in Properties. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **filtered** (`value`) | any | The smoothed value: a number if a number came in; a list if a list came in; a signal with the same `fs` and `t0` if a signal came in. |
| **Exception** (`error`) | object | A value that is neither a number nor a valid signal, or a signal that is too long. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Kind** (`kind`) | exponential (time constant τ), exponential (factor α), moving average of N, moving median of N | exponential (time constant τ) | How to smooth. |
| **Time constant τ (s)** (`tau`) | 0 or more | 1 | How slow the smoothing is: in τ seconds the output goes 63% of the way to a new value. 0 = no smoothing. It shows only with **exponential (τ)**. |
| **Factor α (0…1, new value weight)** (`alpha`) | from 0 to 1 | 0.2 | How much the new value weighs at each step. 1 = no smoothing, near 0 = very slow. It shows only with **exponential (α)**. |
| **N values** (`length`) | from 1 to 10000 | 10 | How many values go into the average or median. It shows only with **moving average** and **moving median**. |
| **fs of plain lists (Hz)** (`listFs`) | number more than 0 | 1000 | The sampling rate given to a list of numbers coming in on **value or signal**. |

## How it works

- The first value passes as it is (the EMA starts from there). With the moving average and median, until there are N values the ones available are used.
- **Single numbers**: each new number is a step. In the EMA with τ the time between two numbers is the **real** one, measured by the clock between one arrival and the next: if the values arrive more slowly, each step weighs more. In the other kinds time does not matter.
- **Signals and lists**: each sample is a step, and the time between two samples is `1/fs`. The memory of past samples stays **from one frame to the next**, so consecutive frames join without jumps. If a list comes in, a list goes out.
- **reset** makes it forget everything. Changing **Kind** also starts over; changing τ, α or N does not.
- It is not a block with coefficients: it does not send coefficients to Frequency response. For that, an EMA corresponds to a first-order IIR filter (see the theory) and a moving average to an [FIR filter](sig.fir) of the moving average kind.
- The imaginary part `im` of a complex signal is ignored.

## A bit of theory

**Exponential average (EMA)**: at each step the output moves towards the new value by a fraction α:

`y[n] = y[n−1] + α · (x[n] − y[n−1])`

It is a first-order IIR filter (`H(z) = α / (1 − (1−α)·z⁻¹)`), a low-pass. With the time constant τ, the factor depends on the time between samples Δt:

`α = 1 − e^(−Δt/τ)`

For Δt much smaller than τ it is about `Δt/τ`. In a step response the output reaches 63% after τ and 95% after 3τ. The EMA costs little memory (a single value) and gives more weight to recent values.

**Moving average of N**: the average of the last N values. It reduces white noise by `√N` but delays by `(N − 1)/2` samples and moves "in jumps" when a value leaves the window.

**Moving median of N**: the middle value of the last N, sorted. It is not a linear filter: it removes **isolated wrong values** (spikes) without blurring true jumps, which the average and the EMA cannot do. With even N it is the average of the two middle values.

## Examples

### 1. Smoothing a sensor reading

Values arrive one at a time (for example from a sensor, or typed by hand in a [Number field](ui.number)); τ = 2 s:

```
[Number field] value ──▶ value or signal [Sample filter (moving average, EMA)] filtered ──▶ value [Label]
```

The label shows a calmer reading, that follows the true changes with a delay of about 2 s.

### 2. The same data with the different kinds

On a list `[0, 10, 10, 10]` (`fs` = 1000 Hz):

- **exponential (α)** with α = 0.5 → `[0, 5, 7.5, 8.75]`;
- **exponential (τ)** with τ = 0.01 s → `[0, 0.9516, 1.8127, 2.5918]` (α = 1 − e^(−0.1) = 0.0952 per sample, so it climbs slowly towards 10).

On `[1, 2, 3, 4, 5]` the **moving average** of 3 gives `[1, 1.5, 2, 3, 4]`. On `[1, 100, 2, 3]` the **moving median** of 3 gives `[1, 50.5, 2, 3]`: the `100` spike is gone as soon as the window has 3 values.

### 3. Removing spikes from a signal

```
[Noise (np.random)] signal ──▶ value or signal [Sample filter (moving average, EMA)] filtered ──▶ signal or spectrum [To chart]
```

with **moving median** of 5: isolated values that are too high or too low disappear.

## Errors

| Message | When |
|---|---|
| Il valore manca ("The value is missing") | An empty value (`null`) came in on **value or signal**. |
| Il valore deve essere una lista di numeri o un oggetto { fs, samples } ("The value must be a list of numbers or an object { fs, samples }") | A text that is neither a number nor a list came in, or another kind of value. |
| Il valore ha una frequenza di campionamento (fs) non valida ("The value has an invalid sampling rate") | In a signal, `fs` is not more than 0. |
| Il valore ha samples e im di lunghezze diverse ("samples and im have different lengths") | `im` and `samples` are not the same length. |
| Il valore: il valore N non è un numero ("value N is not a number") | Sample number N is not a number. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) ("Signal too long: … samples, at most …") | The signal is over the engine's limit (see [Limits](logicstudio-engine/limits)). |

## See also

- [IIR filter (butter, cheby1, cheby2)](sig.iir) to filter with a cutoff frequency
- [FIR filter (firwin)](sig.fir) for the moving average with coefficients and delay
- [Difference equation (lfilter)](sig.difference) for an EMA or other filters written by hand
- [Measures (RMS, peak, mean)](sig.measure) for the average of a whole frame
- [Signals](logicstudio-signals)
- [Engine limits](logicstudio-engine/limits)
- [How a block works](ide/blocks)
