# IFFT (np.fft.ifft)

`sig.ifft` · Signals · [Signals](logicstudio-signals) · version 1

Does the reverse of the [FFT](sig.fft): from a **spectrum** it rebuilds the **signal in time**. It is used to filter "by hand" (zero some frequencies of the spectrum and go back) or to check that a transform lost nothing.

## Inputs

| Port | Type | Description |
|---|---|---|
| **spectrum** (`spectrum`) | object | A spectrum made by [FFT](sig.fft): it needs at least `f`, `re`, `im`, `n` and `fs` (and `sided`, `t0` if present). The block uses **re** and **im**, the raw values, not `mag`: the scale chosen in the FFT does not change the result. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **signal** (`signal`) | object | The rebuilt signal `{ fs, t0, samples }` with the same `fs` and `t0` as the spectrum and `n` samples. With **Real signal** off it also has `im`. |
| **Exception** (`error`) | object | The input is not a spectrum, invalid `n` or `fs`, signal too long. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Real signal (drop the imaginary part)** (`real`) | yes / no | yes | Yes: sends only the real part. No: it also sends the imaginary part `im`, for complex signals. |

## How it works

- If the spectrum is **one-sided** (0 to fs/2), the block rebuilds the missing half by itself: for each frequency above fs/2 it puts the **complex conjugate** of the symmetric one (same real part, imaginary part with the sign changed). So the signal that comes out is real.
- If it is **two-sided**, the points are put back in their place (negative frequencies at the end) and that is all.
- If you used a **window** in the FFT, the spectrum is that of the already weighted signal: the IFFT returns the signal **with the window applied**, not the original. With the Rectangular window you get the starting signal back (up to tiny rounding errors).
- With **Points** larger than N (zero-padding) the signal comes back as long as the points, with zeros at the end.
- If you changed `re` and `im` in the spectrum (for example with a block that zeroes some frequencies), the result follows your changes. Changing only `mag` or `db` has no effect.

## A bit of theory

The inverse transform is `x[n] = (1/N) · Σ X[k]·e^(+i2πkn/N)`. With N complex input values it gives exactly the N samples you started from: the DFT loses no information, it is only a change of point of view.

For a **real** signal the **Hermitian symmetry** holds: `X[N−k] = conj(X[k])`. That is why knowing half of the spectrum is enough; if the symmetry is not respected (for example by changing only one half), the output signal has a non-zero imaginary part, and keeping **Real signal** on means throwing it away.

Filtering in frequency (zeroing the frequencies you do not want) is a multiplication by a "window" in the spectrum, which in time becomes a convolution with a sinc: it gives ripples near the edges. That is why real filters are designed carefully (see the filters of the package).

## Examples

### 1. Round trip

```
[Oscillator (waveform generator)] signal ──▶ signal [FFT (np.fft.fft)] spectrum ──▶ spectrum [IFFT (np.fft.ifft)] signal ──▶ data [To chart] chart data ──▶ data [Lines]
```

With a 50 Hz sine of amplitude 2, at 1000 Hz and 1000 samples, sample 5 comes back as `2` (the original is `2·sin(2π·50·5/1000)`, that is 2).

### 2. With the window

If you choose **Hann** in the FFT, the signal that comes back rises and falls gently at the ends: it is the original multiplied by the window. To get the original use **Rectangular**.

## Errors

| Message | When |
|---|---|
| Serve uno spettro di FFT (con re e im) ("An FFT spectrum is needed (with re and im)") | The input is not an object with `f`, `re` and `im` (for example a list or a PSD). |
| Lo spettro non ha n e fs validi ("The spectrum has no valid n and fs") | `n` is not at least 1 or `fs` is not above 0. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) ("Signal too long") | `n` exceeds the `signalSamples` limit (65536 by default). See [the limits](logicstudio-engine/limits). |

## See also

- [FFT (np.fft.fft)](sig.fft) to get the spectrum
- [Power spectral density (scipy.signal.welch)](sig.psd) (a PSD cannot be inverted: it has no phase)
- [To chart](sig.toChart) to draw the signal
- [Signals](logicstudio-signals), all the blocks of the package
- [How a block works](ide/blocks)
