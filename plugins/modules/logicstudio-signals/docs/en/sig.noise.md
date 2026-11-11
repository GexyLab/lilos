# Noise (np.random)

`sig.noise` · Signals · [Signals](logicstudio-signals) · version 1

Generates random noise: white (Gaussian or uniform), pink or brown. Use it to try filters and measures on a "dirty" signal, or to add it to a sine with [Add · Multiply signals](sig.combine).

## Inputs

| Port | Type | Description |
|---|---|---|
| **generate** (`generate`) | pulse | A pulse generates a new frame. If it is **not linked**, the block sends one frame when the program starts. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **signal** (`signal`) | object | The frame: `{ fs, t0, samples }`. |
| **Exception** (`error`) | object | Invalid sampling rate or number of samples, signal too long. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Kind** (`color`) | White, Gaussian / White, uniform / Pink (1/f) / Brown (1/f²) | White, Gaussian | The "colour" of the noise, that is how the power is spread among the frequencies. |
| **Standard deviation (RMS)** (`amplitude`) | 0 or more | 1 | How "strong" the noise is: the effective value around the mean. |
| **Mean (DC)** (`mean`) | number | 0 | Value added to all the samples. |
| **Seed (0 = different every time)** (`seed`) | 0 or more, whole | 0 | With a number above 0 the noise is the same at every start; with 0 it is different at every start. |
| **Sampling rate fs (Hz)** (`fs`) | more than 0 | 1000 | How many samples per second. |
| **Samples N** (`samples`) | from 1 | 1000 | How many samples each frame has. |
| **Time goes on (each frame after the last)** (`continue`) | yes / no | yes | With yes, the `t0` of each frame restarts where the previous one ended; with no, every frame has `t0 = 0`. |

## How it works

- At the start time begins at 0 and, if **generate** is not linked, one frame comes out. With **generate** linked, one frame comes out at each pulse.
- The random generator is set up **once per start** (with the **Seed**, or at random if it is 0) and **goes on** from one frame to the next: two frames in a row do not repeat. With the same seed, every start gives the same sequence.
- The four kinds:
  - **White, Gaussian**: numbers with a normal (bell) distribution, mean 0 and standard deviation 1, then multiplied by **Standard deviation** and added to the **Mean**.
  - **White, uniform**: uniformly distributed numbers, scaled so that here too the standard deviation is 1 (they go from −√3 to +√3, before the scaling).
  - **Pink (1/f)**: Gaussian filtered (Paul Kellet's filter) so that the power falls by about 3 dB per octave; scaled to have a standard deviation of about 1.
  - **Brown (1/f²)**: Gaussian "integrated" with a leak (coefficient 0.998), that is a random walk that comes back toward zero; scaled to have a standard deviation of about 1.
- The noise does not depend on time: **Time goes on** only changes the `t0` of the frame.
- The RMS measured on a short frame is a little off from the one you set (with 1000 samples, a few percent); with more samples it gets closer.

## A bit of theory

Noise is a random signal: you describe its **statistics**, not the single values. What counts is the **mean** (the DC component), the **standard deviation** `σ` (the effective value, that is RMS, around the mean; the **power** is `σ²`) and the **power spectral density**, that is how the power is spread over frequency.

- **White** noise has a flat spectrum: every frequency has the same power (as white light has all the colours). Samples are independent of each other. If white noise has standard deviation `σ` and sampling rate `fs`, its power density (one-sided: from 0 to `fs/2`) is `2σ²/fs` per Hz. Gaussian or uniform only changes the shape of the distribution of the values, not the spectrum.
- **Pink** noise has density proportional to `1/f`: −3 dB per octave, the same power in every octave. It is typical of many natural and electronic phenomena (flicker noise).
- **Brown** (or red, Brownian) noise has density proportional to `1/f²`: −6 dB per octave. It is the integral of white noise.

Adding a sine and white noise of standard deviation `σ` gives a signal-to-noise ratio `SNR = A²/2 / σ²` (in dB: `10·log10`). To see the spectrum of noise use [Power spectral density (Welch)](sig.psd): a single FFT of noise is very ragged, because every value is random, while averaging several segments makes it readable.

## Examples

### 1. A sine with noise

```
[Oscillator (waveform generator)] signal ──▶ a [Add · Multiply signals] signal ──▶ signal [To chart] chart data ──▶ data [Lines]
[Noise (np.random)]               signal ──▶ b
```

With the same **fs** and **Samples N** in both blocks (Add accepts only signals with the same fs) and noise with standard deviation 0.2 you see the sine "trembling".

### 2. Repeatable noise

With **Seed** 1, **Kind** Gaussian, **N** 1000 and **Mean** 0, every start gives the same sequence, with mean close to 0 and RMS close to 1 (about 1.03 with this seed). With **Seed** 0 every start is different.

### 3. The colour of noise

Two [Noise](sig.noise) blocks, one white and one pink, with **N** 4096, each to a [Power spectral density (Welch)](sig.psd) and then to a [To chart](sig.toChart) with **Show** set to Decibel: the pink line goes down, the white one is flat.

## Errors

| Message | When |
|---|---|
| La frequenza di campionamento deve essere più di 0 ("The sampling rate must be more than 0") | **fs** is 0 or negative. |
| Serve almeno un campione ("At least one sample is needed") | **Samples N** is less than 1. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) ("Signal too long: … samples, at most …") | **Samples N** is over the limit of the engine (65536 by default). See [Limits](logicstudio-engine/limits). |

## See also

- [Oscillator (waveform generator)](sig.oscillator) for a clean signal to add
- [Add · Multiply signals](sig.combine) to add them
- [Power spectral density (Welch)](sig.psd) to see the spectrum of noise
- [Signals](logicstudio-signals), all the blocks of the package
- [How a block works](ide/blocks)
