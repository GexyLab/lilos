# Correlation (np.correlate)

`sig.correlate` · Signals · [Signals](logicstudio-signals) · version 1

Measures how much two signals look alike when one is shifted in time: the **cross-correlation** of **a** and **b**. Its peak tells you by how much **a lags** **b**. Without **b** it does the **autocorrelation** of **a**, which shows the repetitions of a signal (the period of a sound, an echo). It is used to estimate delays (time of flight, echo, synchronization), to find a known signal inside another and to see whether a signal is periodic or noise.

## Inputs

| Port | Type | Description |
|---|---|---|
| **a** (`a`) | any | The first signal: an object `{ fs, t0, samples }` or a list of numbers (taken as a signal at the **fs of plain lists**). |
| **b** (`b`) | any | The second signal, in the same format. **Without b** (not linked, or still without a value) the block computes the autocorrelation of **a**. If both are objects, they must have the same `fs`. |

The block computes when **a** has a value, and again at every new value on **a** or on **b**. A value on **b** alone is not enough.

## Outputs

| Port | Type | Description |
|---|---|---|
| **correlation (t = lag)** (`correlation`) | object | The correlation as a signal `{ fs, t0, samples }`: the sample at position `i` is the correlation at lag `t0 + i/fs`, that is **the time `t` is the lag** (negative on the left, 0 in the middle, positive on the right). For [To chart](sig.toChart). |
| **delay of a on b (s)** (`delay`) | number | The delay, in seconds, at which the correlation is highest: **positive** if **a** lags **b**. |
| **delay (samples)** (`lag`) | number | The same delay, in samples. Hidden by default: show it with the eye in Properties. |
| **value at the delay** (`max`) | number | The value of the correlation at its peak (with the coefficient, 1 means identical). Hidden by default: show it with the eye in Properties. |
| **Exception** (`error`) | object | Invalid or empty signals, or with different `fs`; too long. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Normalization** (`normalize`) | coefficient (−1 … 1), none (sums), biased (÷ N), unbiased (÷ N − \|k\|) | coefficient | How the correlation is scaled (see below). |
| **Largest delay (s, 0 = all)** (`maxLag`) | 0 or more | 0 | Searches and shows only the delays between −maxLag and +maxLag. 0 = all possible delays. |
| **fs of plain lists (Hz)** (`listFs`) | number more than 0 | 1000 | The sampling rate given to a list of numbers. |

## How it works

- The result has one value for each lag `k` from `−(M − 1)` to `N − 1` samples (N samples in **a**, M in **b**), or only for the lags within **Largest delay**. The time of the first point (`t0`) is the most negative lag.
- **Normalization**:
  - **coefficient**: everything divided by `√(Ea · Eb)`, with `Ea` and `Eb` the energies (sum of squares) of the two signals. The result is between −1 and 1; for the autocorrelation it is 1 at lag 0;
  - **none**: the sums as they are;
  - **biased**: everything divided by the longer of N and M;
  - **unbiased**: each lag divided by the number of pairs that were needed to compute it (`N − |k|` if the signals are equally long): it removes the edge effect, but large lags are noisier.
- The **delay** is that of the **maximum** (the highest value, not the largest in absolute value); if there are several equal maxima the first counts, that is the most negative one. An inverted version (−1) does not show as a maximum. The precision is one sample (`1/fs`); there is no interpolation.
- With **b** not linked, **delay** is 0 (the autocorrelation is highest with no shift, unless the signal is all zeros): only the **correlation** signal counts.
- The result always comes out as a signal, even if lists came in. The imaginary part `im` is ignored.
- The length `N + M − 1` cannot exceed the engine's limit.

## A bit of theory

The **cross-correlation** of `a` and `b` at lag `k` is

`r[k] = Σ a[n + k] · b[n]`

You shift `a` by `k` samples against `b` and add up the products. Where the two signals look alike the product is always large and positive: `r[k]` has a **maximum**. If `a` is a copy of `b` delayed by `D` samples, `a[n + D] = b[n]` and the maximum is at `k = D`: the delay is positive when **a lags** **b**. The delay time is `D/fs`.

- **Correlation coefficient**: `r[k] / √(Ea · Eb)`, between −1 and 1. It is 1 for two signals that are equal up to an amplitude.
- **Autocorrelation** (`b = a`): it is even (`r[−k] = r[k]`) and has its maximum at `k = 0`, where it equals the energy of the signal. A **periodic** signal has peaks at every multiple of the period (a 50 Hz sine with `fs` = 1000 Hz has peaks every 20 samples, 0.02 s); **white noise** has a single peak at 0.
- The link with convolution: the correlation of `a` and `b` is the convolution of `a` with `b` reversed in time. This is what the **matched filter** does to find a known signal inside noise.
- In frequency, the correlation is the inverse transform of `A(f) · conj(B(f))` (the Wiener–Khinchin theorem for the autocorrelation, which is the transform of the power spectral density).

## Examples

### 1. The delay between two signals

`b` = `[1, 2, 1, 0, 0]` and `a` = `[0, 0, 1, 2, 1]` (that is `b` shifted by 2 samples), `fs` = 1000 Hz:

```
[Signal from list: a] signal ──▶ a [Correlation (np.correlate)] delay of a on b (s) ──▶ value [Print (console.log)]
[Signal from list: b] signal ──▶ b
```

**delay of a on b (s)** sends `0.002`, **delay (samples)** `2`, and with the coefficient **value at the delay** is `1`. Swapping **a** and **b** makes the delay `−0.002`. With **Normalization** "none" the correlation at lags −4 to 4 is `[0, 0, 0, 0, 1, 4, 6, 4, 1]` (the maximum, 6, is at lag 2) and `t0` is `-0.004`.

### 2. The autocorrelation

Only **a** linked: the correlation has its maximum at 0 (value 1 with the coefficient) and its shape tells the repetitions of the signal:

```
[Oscillator (waveform generator)] signal ──▶ a [Correlation (np.correlate)] correlation (t = lag) ──▶ signal or spectrum [To chart] chart data ──▶ data (list or object) [Lines]
```

### 3. Only small delays

With **Largest delay** 0.005 s and `fs` = 1000 Hz the correlation keeps only the lags from −5 to +5 samples (11 values, `t0` = −0.005): useful for long signals when you know the delay is small.

## Errors

| Message | When |
|---|---|
| Il segnale a manca / Il segnale b manca ("Signal a / b is missing") | An empty value (`null`) on **a** (on **b** a `null` counts as "no b": autocorrelation). |
| Il segnale a deve essere una lista di numeri o un oggetto { fs, samples } ("Signal a must be a list of numbers or an object { fs, samples }") | Another kind of value came in on **a**. |
| Il segnale b deve essere una lista di numeri o un oggetto { fs, samples } ("Signal b must be a list of numbers or an object { fs, samples }") | Another kind of value came in on **b**. |
| Il segnale a ha una frequenza di campionamento (fs) non valida ("Signal a has an invalid sampling rate") | In **a** (or **b**: "Il segnale b …"), `fs` is not more than 0. |
| Il segnale a ha samples e im di lunghezze diverse ("samples and im have different lengths") | `im` and `samples` are not the same length. |
| Il segnale a: il valore N non è un numero ("value N is not a number") | Sample number N of **a** (or of **b**: "Il segnale b: …") is not a number. |
| I segnali hanno fs diverse (… e … Hz): usa prima Ricampiona ("The signals have different fs: use Resample first") | **a** and **b** are objects with different `fs`. |
| I segnali non possono essere vuoti ("The signals cannot be empty") | One of the two lists has no samples. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) ("Signal too long: … samples, at most …") | **a** or **b**, or the length `N + M − 1`, is over the engine's limit (see [Limits](logicstudio-engine/limits)). |

## See also

- [Convolution (np.convolve)](sig.convolve) for the related calculation (correlation is convolution with a reversed signal)
- [Resample](sig.resample) to bring two signals to the same `fs`
- [Frequency · Period](sig.frequency) to measure the frequency of a signal
- [Power spectral density (scipy.signal.welch)](sig.psd) for the distribution of power over frequency
- [To chart](sig.toChart) to draw the correlation
- [Signals](logicstudio-signals)
- [Engine limits](logicstudio-engine/limits)
- [How a block works](ide/blocks)
