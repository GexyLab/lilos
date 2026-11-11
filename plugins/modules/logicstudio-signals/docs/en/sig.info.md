# Signal parts

`sig.info` · Signals · [Signals](logicstudio-signals) · version 1

Opens a signal into its parts: the list of samples, the sampling rate, how many there are, the duration, the time of each sample. Use it to read a signal with the other Logic Studio blocks (for example to write the samples to a file, or to show the duration).

## Inputs

| Port | Type | Description |
|---|---|---|
| **signal** (`signal`) | any | A signal `{ fs, t0, samples }`, a list of numbers (taken at the "fs of plain lists") or a JSON text of either. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **samples** (`samples`) | list | The values of the signal (the real part). |
| **fs (Hz)** (`fs`) | number | The sampling rate. |
| **N** (`n`) | number | How many samples the signal has. |
| **duration (s)** (`duration`) | number | `N / fs`, in seconds. Hidden by default: show it with the eye in Properties. |
| **t₀ (s)** (`t0`) | number | The time of the first sample. Hidden by default: show it with the eye in Properties. |
| **times (s)** (`times`) | list | The time of each sample, `t₀ + i/fs`. Hidden by default: show it with the eye in Properties. |
| **imaginary part** (`im`) | list | The imaginary part; an empty list if the signal is real. Hidden by default: show it with the eye in Properties. |
| **Exception** (`error`) | object | Missing or invalid signal, too long. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **fs of plain lists (Hz)** (`listFs`) | more than 0 | 1000 | If a plain list of numbers reaches the block, it takes it as a signal with this sampling rate. |

## How it works

At every signal that arrives, the block sends all the outputs together.

- The **duration** is `N / fs`, not `(N − 1) / fs`: it is the length of a frame of N samples, each of which "occupies" a period `1/fs`. The time of the last sample is therefore `t₀ + duration − 1/fs`.
- With a plain list, **fs** is the "fs of plain lists" and **t₀** is 0.
- Times are rounded to 12 significant digits, so that you do not see the leftovers of floating-point arithmetic.

## A bit of theory

A sampled signal is made of three things: the values `x[n]`, the sampling rate `fs` and the start time `t₀`. The rest follows: the step `Ts = 1/fs`, the times `t[n] = t₀ + n·Ts`, the duration `T = N·Ts`. In frequency, the same frame has a **resolution** `Δf = fs/N = 1/T`: to tell two frequencies 1 Hz apart you need to look at no less than 1 second of signal. That is why `fs` and `N` together matter more than `N` alone.

## Examples

### 1. How long a frame lasts

```
[Oscillator (waveform generator)] signal ──▶ signal [Signal parts] duration (s) ──▶ value [Print (console.log)]
```

With the default settings of the oscillator (1000 samples at 1000 Hz) it writes `1`.

### 2. A plain list

The list `[1, 2, 3, 4]` with "fs of plain lists" 1000 gives: **samples** `[1, 2, 3, 4]`, **fs** `1000`, **N** `4`, **duration** `0.004`, **t₀** `0`, **times** `[0, 0.001, 0.002, 0.003]`, **imaginary part** `[]`.

### 3. A signal with a start time

`{ "fs": 4, "t0": 1, "samples": [1, 2, 3, 4] }` gives **N** `4`, **duration** `1`, **t₀** `1`, **times** `[1, 1.25, 1.5, 1.75]`.

## Errors

| Message | When |
|---|---|
| Il segnale manca ("The signal is missing") | An empty value arrived on **signal**. |
| Il segnale deve essere una lista di numeri o un oggetto { fs, samples } ("The signal must be a list of numbers or an object { fs, samples }") | It is neither a list nor a signal, or it is a text that is not valid JSON. |
| Il segnale ha una frequenza di campionamento (fs) non valida ("The signal has an invalid sampling rate (fs)") | In the object, `fs` is 0, negative or not a number. |
| Il segnale: il valore N non è un numero ("The signal: value N is not a number") | A sample (number N) is not a number. |
| Il segnale ha samples e im di lunghezze diverse ("The signal has samples and im of different lengths") | In the object, `samples` and `im` do not have the same length. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) ("Signal too long: … samples, at most …") | The signal has more samples than the limit of the engine (65536 by default). See [Limits](logicstudio-engine/limits). |

## See also

- [Signal from list](sig.fromList) for the opposite operation
- [Measures (RMS, peak, mean)](sig.measure) for the measures of the signal
- [Play samples](sig.play) to send it out one sample at a time
- [Signals](logicstudio-signals), all the blocks of the package
- [How a block works](ide/blocks)
