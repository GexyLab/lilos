# Convolution (np.convolve)

`sig.convolve` · Signals · [Signals](logicstudio-signals) · version 1

Convolves two signals: the signal **a** with the impulse response **h** (port **b**). It is what a linear filter does: the output is the input "spread" over the impulse response. It is used to apply any impulse response to a signal (an FIR filter, an echo, a reverb, a smoothing), even a long one. It works on two whole frames and remembers nothing from one call to the next.

## Inputs

| Port | Type | Description |
|---|---|---|
| **signal** (`a`) | any | The signal: an object `{ fs, t0, samples }` or a list of numbers (taken as a signal at the **fs of plain lists**). |
| **impulse response h** (`b`) | any | The impulse response, in the same format. If both are signals (objects), they must have the same `fs`. |

The block computes when **both** inputs have a value, and again at every new value on either.

## Outputs

| Port | Type | Description |
|---|---|---|
| **signal** (`signal`) | object | The result, a signal `{ fs, t0, samples }` with the `fs` of **a**. It always comes out as a signal, even if lists came in. |
| **Exception** (`error`) | object | Invalid or empty signals, or with different `fs`; a result that is too long. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Mode** (`mode`) | full (N + M − 1), same length as a, valid (full overlap only), circular (length of a) | full | Which part of the result to keep (see below). |
| **fs of plain lists (Hz)** (`listFs`) | number more than 0 | 1000 | The sampling rate given to a list of numbers. |

## How it works

With N samples in **a** and M in **b**:

| Mode | Length | What it keeps |
|---|---|---|
| **full** | N + M − 1 | The whole result, including the tails at the start and the end. |
| **same length as a** | N | The central part, aligned with **a**: the impulse response is "centred". |
| **valid** | \|N − M\| + 1 | Only where the two signals overlap completely, without the edges. The time `t0` moves on accordingly. |
| **circular** | N | The "wrap-around" (cyclic) convolution, computed with the FFT: **b** is cut, or padded with zeros, to N samples. It is the one of filters done with the FFT. |

- The time `t0` of the result is that of **a** (in valid mode, it moves on by `(min(N, M) − 1)/fs`).
- If **a** and **b** are both objects with different `fs`, the block gives an error: first bring one of them to the same `fs` with [Resample](sig.resample). A list of numbers is always taken at the **fs of plain lists**, with no check.
- For long signals the calculation goes through the FFT, and is fast; in circular mode the results may have a tiny rounding noise (of the order of 1e-15).
- In the modes other than circular, the length `N + M − 1` cannot exceed the engine's limit.

## A bit of theory

The **convolution** of `x` with `h` is

`y[n] = Σ x[k] · h[n − k]`   (sum over all the k for which both indices exist)

Each sample of `x` puts a copy of `h` on the output, shifted in time and multiplied by that sample; the output is the sum of all the copies. If `h` has M samples, the full convolution has `N + M − 1`.

- It is **commutative** (`x * h = h * x`), associative and distributive over addition.
- The output of a linear time-invariant (LTI) system is the convolution of the input with its **impulse response**. This is why an FIR filter with coefficients `b` is the convolution with `b`.
- **Convolution theorem**: convolution in time is a product in frequency, `Y(f) = X(f) · H(f)`. The **circular** convolution is exactly the product of the FFTs, while the full one needs padding with zeros to `N + M − 1` samples.
- Convolving with an impulse `[1]` changes nothing; with an impulse delayed by k samples it delays the signal by k samples.

## Examples

### 1. The modes on three numbers

**a** = `[1, 2, 3]`, **h** = `[0, 1, 0.5]`:

- full → `[0, 1, 2.5, 4, 1.5]`;
- same length as a → `[1, 2.5, 4]`;
- valid → `[2.5]` (a single point: the full overlap);
- circular → `[4, 2.5, 2.5]`.

With the lists `[1, 2, 3]` and `[1, 1]` (sum of two neighbours) the full one gives `[1, 3, 5, 3]`.

### 2. An echo

A signal with an impulse response `[1, 0, 0, 0, 0.5]`: the output is the signal plus a copy, delayed by 4 samples and at half amplitude.

```
[Signal from list] signal ──▶ signal (a) [Convolution (np.convolve)] signal ──▶ signal or spectrum [To chart] chart data ──▶ data (list or object) [Lines]
[Signal from list: echo] signal ──▶ impulse response h (b)
```

### 3. A moving average with the impulse response

A [Constant · Variable](core.value) of JSON kind with `[0.2, 0.2, 0.2, 0.2, 0.2]` as the impulse response **h**: the output is the 5-sample moving average of the signal (like an [FIR filter (firwin)](sig.fir) of the moving average kind, but on a whole frame and with no state between one frame and the next).

```
[Oscillator (waveform generator)] signal ──▶ signal (a) [Convolution (np.convolve)] signal ──▶ signal or spectrum [To chart]
[Constant · Variable: [0.2, 0.2, 0.2, 0.2, 0.2]] value ──▶ impulse response h (b)
```

With the mode **same length as a** the output has the length and the time of the signal.

## Errors

| Message | When |
|---|---|
| Il segnale a manca / Il segnale b manca ("Signal a / b is missing") | An empty value (`null`) on **a** or on **b**. |
| Il segnale a deve essere una lista di numeri o un oggetto { fs, samples } ("Signal a must be a list of numbers or an object { fs, samples }") | Another kind of value came in on **a**. |
| Il segnale b deve essere una lista di numeri o un oggetto { fs, samples } ("Signal b must be a list of numbers or an object { fs, samples }") | Another kind of value came in on **b**. |
| Il segnale a ha una frequenza di campionamento (fs) non valida ("Signal a has an invalid sampling rate") | In **a** (or **b**: "Il segnale b …"), `fs` is not more than 0. |
| Il segnale a ha samples e im di lunghezze diverse ("samples and im have different lengths") | `im` and `samples` are not the same length. |
| Il segnale a: il valore N non è un numero ("value N is not a number") | Sample number N of **a** (or of **b**: "Il segnale b: …") is not a number. |
| I segnali hanno fs diverse (… e … Hz): usa prima Ricampiona ("The signals have different fs: use Resample first") | **a** and **b** are objects with different `fs`. |
| I segnali non possono essere vuoti ("The signals cannot be empty") | One of the two lists has no samples. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) ("Signal too long: … samples, at most …") | **a** or **b**, or the full convolution `N + M − 1`, is over the engine's limit (see [Limits](logicstudio-engine/limits)). |

## See also

- [Correlation (np.correlate)](sig.correlate) to measure how much two signals look alike and their delay
- [FIR filter (firwin)](sig.fir) to filter with an FIR whose state continues between frames
- [Resample](sig.resample) to bring two signals to the same `fs`
- [FFT (np.fft.fft)](sig.fft) and [IFFT (np.fft.ifft)](sig.ifft) to do the same calculation in frequency
- [Signals](logicstudio-signals)
- [Engine limits](logicstudio-engine/limits)
- [How a block works](ide/blocks)
