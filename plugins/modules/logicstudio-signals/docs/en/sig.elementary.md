# Impulse · Step · Ramp

`sig.elementary` · Signals · [Signals](logicstudio-signals) · version 1

Generates the elementary signals of system theory: impulse, step, ramp, decaying exponential, rectangle, sinc and Gaussian. They are the signals you use to "question" a filter or a system to see how it answers.

## Inputs

| Port | Type | Description |
|---|---|---|
| **generate** (`generate`) | pulse | A pulse generates a new frame. If it is **not linked**, the block sends one frame when the program starts. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **signal** (`signal`) | object | The frame: `{ fs, t0, samples }`. |
| **Exception** (`error`) | object | Invalid sampling rate, number of samples or width, signal too long. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Kind** (`kind`) | Impulse δ / Step u(t) / Ramp / Decaying exponential / Rectangle / Sinc / Gaussian | Impulse δ | Which signal to generate. |
| **At time (s)** (`at`) | number | 0 | The instant of the impulse, of the start of the step, ramp and exponential, and the **centre** of rectangle, sinc and Gaussian. |
| **Amplitude** (`amplitude`) | number | 1 | The height (for the ramp: the slope, that is how much it rises each second). |
| **Width or time constant τ (s)** (`width`) | more than 0 | 0.1 | The width or the time constant. It shows only with Exponential, Rectangle, Sinc and Gaussian. |
| **Sampling rate fs (Hz)** (`fs`) | more than 0 | 1000 | How many samples per second. |
| **Samples N** (`samples`) | from 1 | 1000 | How many samples each frame has. |
| **Time goes on (each frame after the last)** (`continue`) | yes / no | yes | With yes, each frame starts where the previous one ended (`t0` grows); with no, every frame starts at `t0 = 0`. |

## How it works

Sample `i` is computed at time `t = t0 + i / fs`, and `ta` is the value of **At time**. With `A` the amplitude and `w` the width:

| Kind | Value of the sample |
|---|---|
| Impulse δ | `A` in the sample closest to `ta`, 0 in the others |
| Step u(t) | 0 before `ta`, `A` from `ta` on |
| Ramp | 0 before `ta`, `A·(t − ta)` from `ta` on |
| Decaying exponential | 0 before `ta`, `A·e^(−(t−ta)/w)` from `ta` on |
| Rectangle | `A` when `abs(t − ta) ≤ w/2`, 0 elsewhere |
| Sinc | `A·sinc((t−ta)/w)`, with `sinc(x) = sin(πx)/(πx)` and `sinc(0) = 1` |
| Gaussian | `A·e^(−½·((t−ta)/w)²)` (`w` is the standard deviation) |

- The impulse is **a single sample** of height `A` (not an impulse of area 1): it appears only in the frame that contains time `ta`. With **Time goes on**, the following frames are all zero.
- The step (and the ramp, and the exponential) start from the sample closest to `ta`; in the frames after the one where they start they stay on.
- If `ta` is before the start of the frame, the step is already on from the first sample.
- With Exponential, Rectangle, Sinc and Gaussian `w` must be more than 0; with the other kinds the **Width** field does not count.

## A bit of theory

- The **unit impulse** `δ[n]` is 1 for `n = 0` and 0 elsewhere. In a linear time-invariant (LTI) system the **impulse response** `h[n]` describes the whole system: the output for any input is the **convolution** `y = x * h` (see [Convolution](sig.convolve)). That is why sending an impulse to a filter and looking at what comes out is the most direct way to know it.
- The **step** `u[n]` is the running sum of the impulse: the **step response** shows how the system settles (overshoot, rise time). The **ramp** is the running sum of the step.
- The **decaying exponential** `e^(−t/τ)` (τ is the **Width** field) is the impulse response of a first-order low-pass filter (an RC circuit). After `τ` the value has dropped to about 37 %; the cutoff frequency is `1/(2π·τ)`.
- Rectangle and **sinc** are a Fourier transform pair: a rectangle of width `w` in time has as spectrum a sinc with zeros every `1/w` Hz, and the other way round. The narrower a signal is in time, the wider its spectrum (the **uncertainty principle**).
- The **Gaussian** is the only shape whose spectrum is again a Gaussian, and it is the most compact possible in time and frequency together.

## Examples

### 1. The impulse response of a filter

```
[Impulse · Step · Ramp] signal ──▶ signal [IIR filter (butter, cheby1, cheby2)] signal ──▶ signal [To chart] chart data ──▶ data [Lines]
```

With **Kind** impulse, **At time** 0 and **fs** 1000, the first sample is `A` and the others 0; the filter answers with its impulse response, which the chart shows.

### 2. What comes out with fs = 10 and 6 samples

- Impulse at 0.2 s: `0, 0, 1, 0, 0, 0` (sample 2 is at 0.2 s).
- Ramp at 0.2 s with amplitude 1: `0, 0, 0, 0.1, 0.2, 0.3`.
- Exponential with τ = 0.1 s: `1, 0.3679, 0.1353, 0.0498, 0.0183, 0.0067`.
- Rectangle 0.2 s wide centred at 0.2 s: `0, 1, 1, 1, 0, 0`.

### 3. An impulse and its spectrum

The impulse has a flat spectrum (all frequencies with the same amplitude):

```
[Impulse · Step · Ramp] signal ──▶ signal [FFT (np.fft.fft)] spectrum ──▶ data [To chart] chart data ──▶ data [Lines]
```

## Errors

| Message | When |
|---|---|
| La frequenza di campionamento deve essere più di 0 ("The sampling rate must be more than 0") | **fs** is 0 or negative. |
| Serve almeno un campione ("At least one sample is needed") | **Samples N** is less than 1. |
| La larghezza deve essere più di 0 ("The width must be more than 0") | With Exponential, Rectangle, Sinc or Gaussian, **Width** is 0 or negative. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) ("Signal too long: … samples, at most …") | **Samples N** is over the limit of the engine (65536 by default). See [Limits](logicstudio-engine/limits). |

## See also

- [Convolution (np.convolve)](sig.convolve) to use the impulse response
- [Frequency response (freqz, Bode)](sig.response) for the response of a filter without simulating
- [Oscillator (waveform generator)](sig.oscillator), [Chirp (scipy.signal.chirp)](sig.chirp)
- [Signals](logicstudio-signals), all the blocks of the package
- [How a block works](ide/blocks)
