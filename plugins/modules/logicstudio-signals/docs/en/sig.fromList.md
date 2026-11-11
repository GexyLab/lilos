# Signal from list

`sig.fromList` · Signals · [Signals](logicstudio-signals) · version 1

Turns a list of numbers into a **signal**, giving it the sampling rate and the time of the first sample. Use it to bring into the signal blocks data that comes from outside: a file, a table, the reading of a machine.

## Inputs

| Port | Type | Description |
|---|---|---|
| **samples** (`samples`) | list | The values, in time order. Every element must be a number (a text with a number, like `"2.5"`, is fine too). |
| **imaginary part** (`im`) | list | The imaginary part, for a complex signal: it must have as many values as the samples. Hidden by default: show it with the eye in Properties. |
| **fs** (`fs`) | number | The sampling rate in Hz; if it is more than 0 it replaces the one in Properties. Hidden by default: show it with the eye in Properties. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **signal** (`signal`) | object | The signal: `{ fs, t0, samples }`, with `im` if the imaginary part was given. |
| **Exception** (`error`) | object | Samples that are not a list of numbers, wrong imaginary part, invalid fs, signal too long. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Sampling rate fs (Hz)** (`fs`) | more than 0 | 1000 | The sampling rate, when it does not come from the **fs** port. |
| **Time of the first sample t₀ (s)** (`t0`) | number | 0 | The time of the first sample: samples are at `t₀ + i/fs`. |

## How it works

The block does nothing until the **samples** arrive. Then, at each new value on **samples**, **imaginary part** or **fs**, it sends the signal with the last values received.

- **fs** comes from the port if it holds a number more than 0, otherwise from Properties.
- The samples must be a **list**: a text or a single number will not do (for one value at a time there is the [Buffer](sig.buffer)).
- The other blocks of this package also accept a plain list as a signal, with their own "fs of plain lists". This block is for when the fs must be different from that (or the list needs a `t0`, or an imaginary part).
- To go back from a signal to a list of numbers there is [Signal parts](sig.info).

## A bit of theory

A digital signal is a **sequence of numbers** `x[n]` that make sense only together with a **sampling rate** `fs`: samples are taken every `Ts = 1/fs` seconds, so sample `n` corresponds to time `t = t₀ + n/fs`. The same list of 1000 numbers is one second of signal at 1000 Hz or ten seconds at 100 Hz: everything changes, starting with the frequencies you read in a spectrum (which go up to `fs/2`).

A **complex** signal has a real and an imaginary part: `z[n] = x[n] + j·y[n]`. It is used for the I/Q signals of radios and for spectra; with a complex signal the spectrum is not symmetric, and must be seen from `−fs/2` to `fs/2`.

## Examples

### 1. A list from a table

A list of 8 readings taken every 0.5 seconds (fs = 2 Hz) becomes a signal:

```
[Constant · Variable: [1, 2, 3, 4, 5, 6, 7, 8]] value ──▶ samples [Signal from list] signal ──▶ signal [Measures (RMS, peak, mean)]
```

With **fs** 2 and **t₀** 0 the samples are at times `0, 0.5, 1, 1.5…`. The list `[1, 2, 3]` with fs 2 gives `{ "fs": 2, "t0": 0, "samples": [1, 2, 3] }`.

### 2. A complex signal

Two lists, real part and imaginary part, of the same length:

```
[Constant · Variable: real]      value ──▶ samples        [Signal from list] signal ──▶ signal [FFT (np.fft.fft)]
[Constant · Variable: imaginary] value ──▶ imaginary part
```

With `[1, 2, 3]` and `[0, 1, 0]` it sends `{ "samples": [1, 2, 3], "im": [0, 1, 0], … }`.

## Errors

| Message | When |
|---|---|
| La frequenza di campionamento deve essere più di 0 ("The sampling rate must be more than 0") | The **fs** in Properties is 0 or negative and no number above 0 arrives on the **fs** port. |
| I campioni devono essere una lista di numeri ("The samples must be a list of numbers") | **samples** is not a list (a text, a number, an object). |
| I campioni: il valore N non è un numero ("Samples: value N is not a number") | Element N of the list is not a number. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) ("Signal too long: … samples, at most …") | The list has more elements than the limit of the engine (65536 by default). See [Limits](logicstudio-engine/limits). |
| La parte immaginaria deve essere una lista di numeri ("The imaginary part must be a list of numbers") | **imaginary part** is not a list. |
| La parte immaginaria: il valore N non è un numero ("Imaginary part: value N is not a number") | Element N of the imaginary part is not a number. |
| La parte immaginaria deve avere tanti valori quanti i campioni ("The imaginary part must have as many values as the samples") | The two lists have different lengths. |

## See also

- [Signal parts](sig.info) for the opposite operation
- [Buffer (samples → frames)](sig.buffer) to build a signal from values that arrive one at a time
- [To chart](sig.toChart) to draw it
- [Signals](logicstudio-signals), all the blocks of the package
- [How a block works](ide/blocks)
