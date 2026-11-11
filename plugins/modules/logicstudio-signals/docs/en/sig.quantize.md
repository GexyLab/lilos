# Quantize (ADC)

`sig.quantize` · Signals · [Signals](logicstudio-signals) · version 1

Simulates an analog-to-digital converter: rounds every sample to one of the levels possible with a given number of bits, and measures the error that results (quantization noise) and the signal-to-noise ratio (SQNR).

## Inputs

| Port | Type | Description |
|---|---|---|
| **signal** (`signal`) | any | The signal: a real signal `{ fs, t0, samples }` or a list of numbers. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **signal** (`signal`) | object | The quantized signal, with the same fs and the same `t0`. If a plain list came in, a plain list goes out. |
| **codes** (`codes`) | list | The integer code of every sample (from 0 up), as the converter would give it. Hidden by default: show it with the eye in Properties. |
| **quantization error** (`quantError`) | object | A signal with the error of every sample, calculated as *quantized − original*. Hidden by default: show it with the eye in Properties. |
| **SQNR (dB)** (`sqnr`) | number | The quantization signal-to-noise ratio, in dB. Hidden by default: show it with the eye in Properties. |
| **Exception** (`error`) | object | Invalid bits or range, a signal that is too long, or an input that is not a signal. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Bits** (`bits`) | from 1 to 32 | 8 | How many bits the converter has. |
| **Range from** (`min`) | number | −1 | The lowest value the converter can read. |
| **Range to** (`max`) | number | 1 | The highest value. It must be greater than **Range from**. |
| **Levels** (`mode`) | mid-rise (no zero level) / mid-tread (with zero) | mid-rise | How the levels are laid out (see below). |
| **fs of plain lists (Hz)** (`listFs`) | number more than 0 | 1000 | The sampling rate given to a plain list of numbers coming in. A real signal already carries its fs. |

## How it works

The quantization step is `q = (max − min) / 2^bits`.

- **Mid-rise.** The range is divided into `2^bits` equal bands `q` wide; every sample becomes the **centre** of its band: `min + (code + 0.5)·q`, with the code from 0 to `2^bits − 1`. There is no level exactly at zero (with a symmetric range, 0 sits between two levels).
- **Mid-tread.** The levels are the multiples of `q`: `…, −q, 0, q, 2q, …` (there is a zero level). The code counts from 0 starting at the lowest level inside the range. With a symmetric range the levels are `2^bits + 1`: for example 8 bits between −1 and 1 give 257 levels, from −1 to 1 in steps of 1/128.
- **Out of range (clipping).** Values below **Range from** or above **Range to** do not stop there: they are brought to the lowest or highest level, with code 0 or the maximum.
- **Error and SQNR.** The error of every sample is *quantized − original*. The SQNR is `10·log₁₀(signal power / error power)`, calculated on this signal (the DC included). If the error is exactly zero the SQNR is 300 dB (and it never goes above 300).
- **Length and time.** As for the input. The imaginary parts of a complex signal are not kept.

For example, with 2 bits between −1 and 1 (`q` = 0.5) and the signal `[−1, −0.3, 0, 0.3, 0.9, 1.5]`: **mid-rise** → `[−0.75, −0.25, 0.25, 0.25, 0.75, 0.75]` (codes 0, 1, 2, 2, 3, 3); **mid-tread** → `[−1, −0.5, 0, 0.5, 1, 1]` (codes 0, 1, 2, 3, 4, 4).

## A bit of theory

- **The step and the error.** Quantizing throws away everything smaller than `q`: the error per sample lies between `−q/2` and `+q/2`. If the signal is rich enough, the error behaves like uniform noise, with power `q² / 12`.
- **SQNR.** For a sine that uses the whole range (full scale): `SQNR ≈ 6.02·b + 1.76 dB`, with `b` the bits. Each extra bit is worth about 6 dB; with 8 bits you get about 50 dB, with 12 bits about 74 dB, with 16 bits about 98 dB. A signal smaller than full scale loses dB: halving the amplitude costs 6 dB, that is one bit.
- **The noise spreads over the whole band** (0 to `fs / 2`). Sampling faster (oversampling) and filtering afterwards gives more dB in the band you care about.
- **Mid-rise and mid-tread.** Mid-tread has a true zero: a signal at zero stays zero, as in many audio converters. Mid-rise is the typical case of a converter with levels symmetric around zero, without a zero.
- **Saturation distortion.** A signal bigger than the range is cut (clipping): it is no longer uniform noise but harmonic distortion. See [Nonlinearity](sig.nonlinear).
- **Dither.** Adding a pinch of noise before quantizing makes the error independent of the signal (less distortion, more noise): you can try it by adding [Noise](sig.noise) with [Add · Multiply signals](sig.combine).

## Examples

### 1. An 8-bit converter

```
[Oscillator (waveform generator)] signal ──▶ signal [Quantize (ADC)] signal ──▶ signal [To chart]
                                                    SQNR (dB) ──▶ value [Label]
```

With a sine of amplitude 0.999 between −1 and 1, the SQNR of **8 bits** comes to about 49.96 dB, that of **12 bits** about 73.96 dB, as the formula says (50.0 and 74.0 dB).

### 2. How many bits are needed

Link the signal to two **Quantize (ADC)** blocks with different bits and compare the **SQNR (dB)** outputs, or look at the spectrum of the noise with:

```
[Quantize (ADC)] quantization error ──▶ signal [FFT (np.fft.fft)] spectrum ──▶ data [To chart]
```

### 3. A 0–8 V converter at 3 bits

With **Range from** 0, **Range to** 8 and 3 bits, `q` = 1: `[0, 1.2, 7.9]` → `[0.5, 1.5, 7.5]` (mid-rise), codes 0, 1, 7.

## Errors

| Message | When |
|---|---|
| I bit vanno da 1 a 32 ("Bits go from 1 to 32") | **Bits** is outside 1…32 (it is rounded to a whole number). |
| «Intervallo a» deve essere più grande di «Intervallo da» ("\"Range to\" must be larger than \"Range from\"") | **Range to** is less than or equal to **Range from**. |
| Il segnale manca ("The signal is missing") | The block runs without a signal on the input. |
| Il segnale deve essere una lista di numeri o un oggetto { fs, samples } ("The signal must be a list of numbers or an object { fs, samples }") | The input is a number, a text or an object that is not a signal. |
| Il segnale: il valore … non è un numero ("The signal: value … is not a number") | A list or a signal holds something that is not a number. |
| Il segnale ha una frequenza di campionamento (fs) non valida ("The signal has an invalid sampling rate (fs)") | A signal with fs 0, negative or not a number. |
| Il segnale ha samples e im di lunghezze diverse ("The signal has samples and im of different lengths") | A complex signal with real and imaginary parts of different length. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) ("Signal too long: … samples, at most …") | More samples than the limit (see [Engine limits](logicstudio-engine/limits)). |

## See also

- [Nonlinearity (clip, rectify)](sig.nonlinear) for saturation without rounding
- [Resample](sig.resample) to change the fs of a converter
- [Distortion (THD, SNR, SINAD)](sig.distortion) to measure the noise and distortion of a signal
- [Noise (np.random)](sig.noise) for a dither
- [Signals](logicstudio-signals), all the blocks of the package
- [How a block works](ide/blocks)
