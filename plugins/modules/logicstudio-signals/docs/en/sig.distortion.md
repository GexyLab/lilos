# Distortion (THD, SNR, SINAD)

`sig.distortion` · Signals · [Signals](logicstudio-signals) · version 1

Measures the **quality of a tone**: how pure it is. From a signal that contains a tone (a sine coming out of an amplifier, a converter, a loudspeaker) it computes the **total harmonic distortion** (THD), the **signal-to-noise ratio** (SNR), the **SINAD** and the effective number of bits (**ENOB**).

## Inputs

| Port | Type | Description |
|---|---|---|
| **signal** (`signal`) | any | A signal `{ fs, t0, samples }` or a plain list of numbers (taken as a signal at **fs of plain lists**). At least 64 samples are needed, better many more and with several periods of the tone. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **THD (%)** (`thd`) | number | The total harmonic distortion as a percentage: the square root of the power of the harmonics divided by the power of the tone, times 100. |
| **SNR (dB)** (`snr`) | number | The ratio between the power of the tone and that of the noise (without the harmonics), in dB. |
| **SINAD (dB)** (`sinad`) | number | The ratio between the tone and everything else, noise and harmonics together, in dB. Hidden by default: show it with the eye in Properties. |
| **ENOB (bits)** (`enob`) | number | The effective number of bits, `(SINAD − 1.76) / 6.02`. Hidden by default: show it with the eye in Properties. |
| **THD (dB)** (`thdDb`) | number | The THD in dB: `10·log10(harmonics power / tone power)`, for example −40 dB for 1%. Hidden by default: show it with the eye in Properties. |
| **fundamental (Hz)** (`frequency`) | number | The frequency of the tone found (interpolated). Hidden by default: show it with the eye in Properties. |
| **fundamental amplitude** (`amplitude`) | number | The amplitude of the tone, in the units of the signal. Hidden by default: show it with the eye in Properties. |
| **Exception** (`error`) | object | Invalid signal, too long, with fewer than 64 samples, or invalid fundamental. |

The values in dB are limited to ±300.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Fundamental (Hz, 0 = the highest peak)** (`fundamental`) | 0 or more | 0 | The frequency of the tone. With 0 the block looks for the highest peak of the spectrum. Write it if there is something stronger than the tone in the signal (a hum, a higher harmonic). It must be below fs/2. |
| **Harmonics counted (from the 2nd)** (`harmonics`) | 1 to 50 | 5 | How many harmonics go into the THD, starting from the second: with 5 the 2nd, 3rd, 4th, 5th and 6th are counted. |
| **fs of plain lists (Hz)** (`listFs`) | number above 0 | 1000 | The sampling rate given to a plain list of numbers. |

## How it works

1. It removes the mean and applies a **Blackman-Harris** window (very low tails: the leakage of the tone is not mistaken for noise), then does the FFT.
2. It finds the tone: the given frequency or the highest peak (excluding a small stretch near 0 Hz). Its power is the sum of the points in its "lobe" (5 points per side) and the frequency is refined with a parabola.
3. For each harmonic from 2 to **Harmonics + 1** it picks the point `h · fundamental` and adds the power in its lobe. If the harmonic is above fs/2, it is **folded back** into the spectrum (aliasing), as happens in reality.
4. Everything else, except the stretch near 0 Hz, is **noise**.
5. It computes the results:
   - **THD** = `√(P_harmonics / P_tone) · 100` %
   - **SNR** = `10·log10(P_tone / P_noise)`
   - **SINAD** = `10·log10(P_tone / (P_noise + P_harmonics))`
   - **ENOB** = `(SINAD − 1.76) / 6.02`

With fewer than 64 samples, or if the tone is too close to 0 Hz for the length (less than about 6 FFT points), the calculation does not hold and the block gives an error.

## A bit of theory

A non-linear component (a saturated amplifier, a converter) turns a pure sine of frequency `f` into a signal that also has the **harmonics** `2f, 3f, …`. The **THD** measures how large they are compared with the tone: `THD = √(V₂² + V₃² + …) / V₁`. A THD of 1% corresponds to −40 dB; 0.1% to −60 dB.

Noise and harmonics add in power, not in amplitude. So:

- **SNR** = tone / noise (without harmonics);
- **SINAD** (signal to noise and distortion) = tone / (noise + harmonics): the real quality of a converter or an amplifier;
- **ENOB**: an ideal N-bit converter, with a full-scale sine, has a SINAD of `6.02·N + 1.76` dB. Inverting the formula, `ENOB = (SINAD − 1.76) / 6.02` says to how many ideal bits the measured quality corresponds. The formula is exact with a tone at the converter's full scale; with a lower tone the value looks worse than the real one.

The **Blackman-Harris** window has almost negligible tails (below −92 dB), so the leakage of a strong tone does not hide the last harmonic or the noise. Its main lobe is wide: that is why each tone takes 5 points per side. For the harmonics not to be mixed up, the tones must be more than 5 points apart (`5 · fs/N`), that is the window must hold more periods.

## Examples

### 1. A sine with a little distortion

A 1 kHz tone with 1% of second harmonic (2 kHz) and 0.1% of third (3 kHz), at fs 48000 Hz, 4096 samples:

```
[Add · Multiply signals] signal ──▶ signal [Distortion (THD, SNR, SINAD)] THD (%) ──▶ value [Print (console.log)]
[Oscillator (waveform generator): 1000 Hz] signal ──▶ a [Add · Multiply signals]
[Oscillator (waveform generator): 2000 Hz, amplitude 0.01] signal ──▶ b [Add · Multiply signals]
[Oscillator (waveform generator): 3000 Hz, amplitude 0.001] signal ──▶ c [Add · Multiply signals]
```

It gives: THD about **1.005 %** (`√(0.01² + 0.001²) = 0.01005`), THD in dB about −39.96, SINAD about 39.96 dB, ENOB about 6.34 bits, fundamental about 1000 Hz, amplitude 1.000.

### 2. An 8-bit converter

A full-scale sine, quantized to 8 bits with [Quantize (ADC)](sig.quantize): SINAD comes out about 50 dB and **ENOB** about 8.0. If **ENOB** comes out well below the number of bits of the converter, there is more than quantization noise: distortion, circuit noise.

## Errors

| Message | When |
|---|---|
| Il segnale manca ("The signal is missing") | An empty value arrives. |
| Il segnale deve essere una lista di numeri o un oggetto { fs, samples } ("The signal must be a list of numbers or an object { fs, samples }") | The input is a single number, a text that is not JSON, or an object without `samples`. |
| Il segnale ha una frequenza di campionamento (fs) non valida ("The signal has an invalid sampling rate") | `fs` is missing or not above 0. |
| Il segnale: il valore N non è un numero ("value N is not a number") | Sample N (from 1) of the list is not a number. |
| Il segnale ha samples e im di lunghezze diverse ("samples and im have different lengths") | The imaginary part has a different number of samples. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) ("Signal too long") | The signal exceeds the `signalSamples` limit (65536 by default). See [the limits](logicstudio-engine/limits). |
| Servono almeno 64 campioni ("At least 64 samples are needed") | The signal has fewer than 64 samples. |
| La fondamentale deve stare sotto fs/2 (… Hz) ("The fundamental must be below fs/2") | **Fundamental** is equal to or above fs/2. |
| La fondamentale è troppo vicina a 0 Hz per questa lunghezza: servono più campioni ("The fundamental is too close to 0 Hz for this length: more samples are needed") | The tone is within about 5 FFT points of 0 Hz (the case of a signal with no clear tone, or of a very low tone). |

## See also

- [FFT (np.fft.fft)](sig.fft) to see the spectrum and the harmonics
- [Quantize (ADC)](sig.quantize) to try the block with a converter
- [Measures (RMS, peak, mean)](sig.measure) for RMS, peak and crest factor
- [Peaks (find_peaks)](sig.peaks) to find the harmonics
- [Signals](logicstudio-signals), all the blocks of the package
- [How a block works](ide/blocks)
