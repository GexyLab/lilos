# Envelope (scipy.signal.hilbert)

`sig.envelope` · Signals · [Signals](logicstudio-signals) · version 1

Computes the **envelope** of a signal, the curve that follows its peaks, and with the same calculation also the **instantaneous phase** and **frequency**. It uses the **analytic signal** (Hilbert transform). It is used to demodulate an AM signal, to see the shape of a sound or a vibration, to follow a changing frequency.

## Inputs

| Port | Type | Description |
|---|---|---|
| **signal** (`signal`) | any | A signal `{ fs, t0, samples }` or a plain list of numbers (taken as a signal at **fs of plain lists**). An imaginary part (`im`) is ignored: the block uses only the real part. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **envelope** (`envelope`) | object | A signal `{ fs, t0, samples }` with the envelope, equal to `√(x² + H²)`, where H is the Hilbert transform. Never negative. |
| **instantaneous phase (rad)** (`phase`) | object | A signal with the phase in radians, **unwrapped** (continuous, with no 2π jumps). Hidden by default: show it with the eye in Properties. |
| **instantaneous frequency (Hz)** (`frequency`) | object | A signal with the frequency in Hz of each sample. Hidden by default: show it with the eye in Properties. |
| **analytic signal** (`analytic`) | object | The analytic signal `x + i·H`, as a complex signal with `samples` (real) and `im` (imaginary). Hidden by default: show it with the eye in Properties. |
| **Exception** (`error`) | object | Invalid signal, too long, or with fewer than 2 samples. |

The four outputs have the same `fs`, the same `t0` and the same length as the input signal.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **fs of plain lists (Hz)** (`listFs`) | number above 0 | 1000 | The sampling rate given to a plain list of numbers. |

## How it works

The block computes the FFT of the signal, zeroes the negative frequencies and doubles the positive ones, then goes back to time with the IFFT. The result is a **complex** signal `z[n] = x[n] + i·H[n]`, the analytic signal, from which it gets:

- the **envelope** `|z|`, the distance from the origin;
- the **phase** `arg(z)`, the angle, unwrapped;
- the **instantaneous frequency** `Δphase · fs / 2π`, that is the speed at which the phase grows. The first sample uses the difference with the second.

The calculation works well when the signal is **narrow band**, that is a fast carrier with a slow envelope. There are errors at the two ends of the signal (the calculation assumes the signal repeats), so do not trust the first and last samples.

## A bit of theory

A real signal `x(t)` has a symmetric spectrum: negative frequencies add no information. The **analytic signal** keeps only the positive ones: `z(t) = x(t) + i·H{x}(t)`, where the **Hilbert transform** H shifts every component by −90°. For a cosine `cos(ωt)` it gives `cos(ωt) + i·sin(ωt) = e^(iωt)`: a rotating vector.

If `x(t) = a(t)·cos(φ(t))` with `a(t)` varying slowly compared to the carrier, then:

- `|z(t)| = a(t)` is the **envelope** (instantaneous amplitude);
- `arg z(t) = φ(t)` is the **instantaneous phase**;
- `f(t) = (1/2π)·dφ/dt` is the **instantaneous frequency**.

For an AM signal `(1 + m·cos(Ωt))·cos(ωt)` the envelope is `1 + m·cos(Ωt)`: it is the signal that modulated the carrier, obtained without rectifying and filtering. For a chirp the instantaneous frequency is a rising straight line.

## Examples

### 1. Demodulating an AM signal

A 100 Hz carrier multiplied by `1 + 0.5·sin(2π·5·t)` (a 5 Hz wave), at fs 1000 Hz, 1000 samples:

```
[Oscillator (waveform generator): 5 Hz] signal ──▶ signal [Gain · Offset: ×0.5 +1] signal ──▶ a [Add · Multiply signals: Multiply] signal ──▶ signal [Envelope (scipy.signal.hilbert)] envelope ──▶ data [To chart] chart data ──▶ data [Lines]
[Oscillator (waveform generator): 100 Hz] signal ──▶ b [Add · Multiply signals: Multiply]
```

The envelope oscillates between 0.5 and 1.5, at 5 Hz, and at sample 250 it is 1.5.

### 2. The instantaneous frequency

On the same signal, the **instantaneous frequency** output (to be shown in Properties) is about 100 Hz along the signal.

```
[Oscillator (waveform generator)] signal ──▶ signal [Envelope (scipy.signal.hilbert)] instantaneous frequency (Hz) ──▶ data [To chart] chart data ──▶ data [Lines]
```

## Errors

| Message | When |
|---|---|
| Il segnale manca ("The signal is missing") | An empty value arrives. |
| Il segnale deve essere una lista di numeri o un oggetto { fs, samples } ("The signal must be a list of numbers or an object { fs, samples }") | The input is a single number, a text that is not JSON, or an object without `samples`. |
| Il segnale ha una frequenza di campionamento (fs) non valida ("The signal has an invalid sampling rate") | `fs` is missing or not above 0. |
| Il segnale: il valore N non è un numero ("value N is not a number") | Sample N (from 1) of the list is not a number. |
| Il segnale ha samples e im di lunghezze diverse ("samples and im have different lengths") | The imaginary part has a different number of samples. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) ("Signal too long") | The signal exceeds the `signalSamples` limit (65536 by default). See [the limits](logicstudio-engine/limits). |
| Servono almeno 2 campioni ("At least 2 samples are needed") | The signal has fewer than 2 samples. |

## See also

- [FFT (np.fft.fft)](sig.fft) for the spectrum of the signal
- [Measures (RMS, peak, mean)](sig.measure) for the RMS and the peak
- [Nonlinearity (clip, rectify)](sig.nonlinear) and [Sample filter (moving average, EMA)](sig.smooth) for an "old-fashioned" envelope (rectify and filter)
- [To chart](sig.toChart) to draw the outputs
- [Signals](logicstudio-signals), all the blocks of the package
- [How a block works](ide/blocks)
