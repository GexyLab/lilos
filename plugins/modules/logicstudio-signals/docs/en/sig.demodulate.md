# Demodulate (AM, FM, PM)

`sig.demodulate` · Signals · [Signals](logicstudio-signals) · version 1

Gets the **message** back from a signal modulated in amplitude (**AM**, **DSB-SC**), in frequency (**FM**) or in phase (**PM**). It is the opposite of [Modulate (AM, FM, PM)](sig.modulate): with **the same settings** (kind, carrier, amplitude, index or deviation) the two blocks make a working pair.

## Inputs

| Port | Type | Description |
|---|---|---|
| **modulated signal** (`signal`) | any | The modulated signal: an object `{ fs, t0, samples }` or a list of numbers (taken as a signal at the **fs of plain lists**). At least 4 samples are needed. The imaginary part `im`, if there is one, is ignored. |
| **reset** (`reset`) | pulse | Has no effect here: Demodulate remembers nothing from one frame to the next. It is there to have the same ports as Modulate. Hidden by default: show it with the eye in Properties. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **message** (`signal`) | object | The recovered message `{ fs, t0, samples }`, with the `fs` and `t0` of the signal. It always comes out as a signal, even if a list came in. |
| **Exception** (`error`) | object | Invalid carrier or amplitude, invalid index, a signal that is too short, invalid or too long. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Modulation** (`kind`) | AM (with carrier), DSB-SC (suppressed carrier), FM, PM | AM | The kind of modulation to undo. |
| **Carrier frequency (Hz)** (`carrier`) | 0 or more, below fs/2 | 100 | The frequency of the carrier used in the modulation. |
| **Carrier amplitude** (`amplitude`) | more than 0 | 1 | The amplitude A of the carrier. |
| **Modulation index m** (`index`) | more than 0 | 0.5 | The index used in the modulation. It shows only with **AM**. |
| **Deviation (Hz per unit of the message)** (`deviation`) | more than 0 | 100 | The deviation used in the modulation. It shows only with **FM**. |
| **Phase deviation (rad per unit)** (`phaseDev`) | more than 0 | 1.5708 | The phase deviation used in the modulation. It shows only with **PM**. |
| **Low-pass after DSB-SC (Hz, 0 = carrier/2)** (`cutoff`) | 0 or more | 0 | The cutoff frequency of the low-pass that removes the component at twice the carrier. 0 = carrier/2. It shows only with **DSB-SC**. |
| **fs of plain lists (Hz)** (`listFs`) | number more than 0 | 1000 | The sampling rate given to a list of numbers. |

## How it works

The block works on **one frame at a time**, with no memory. The time used for the carrier is the real one, `t = t0 + n/fs`, as in Modulate.

| Modulation | How it is recovered |
|---|---|
| **AM** | Take the **envelope** `|z|` of the analytic signal `z` (with the Hilbert transform, computed with the FFT) and take away the carrier: `x = (|z| / A − 1) / m`. |
| **DSB-SC** | **Coherent** demodulation: multiply by `2·cos(2π·fc·t) / A` and pass through a **4th-order zero-phase Butterworth low-pass** (by default at half the carrier, or at **Low-pass after DSB-SC**). |
| **FM** | Take the phase of the analytic signal relative to the carrier, "unwrap" it and **differentiate**: `x = (dφ/dt) / (2π·kf)`. |
| **PM** | Take the phase relative to the carrier, "unwrap" it, remove the whole 2π turn nearest to the mean and divide by `kp`. |

- **At least 4 samples** are needed, but for a good result many cycles of the carrier in each frame.
- The carrier must be **below fs/2** (error otherwise).
- The FFT (Hilbert) calculation is less precise **at the edges** of the frame, especially if the frame does not hold a whole number of cycles. Use long frames and throw away the first and last samples if you need precise values.
- The message is right if it had the **same carrier, amplitude, index or deviation**: with different settings the message comes out scaled or wrong.
- In **AM** the message must have been modulated without overmodulation (`m·|x| ≤ 1`); in **FM** the carrier must be much higher than the frequencies of the message; in **PM** the total phase `kp·x` should stay within ±π.
- **DSB-SC** assumes the local carrier is in phase with that of the modulator (as Modulate does it, `cos(2π·fc·t)` with real t).

## A bit of theory

- **Analytic signal**: `z(t) = s(t) + j·H{s}(t)`, where `H` is the Hilbert transform (it shifts every frequency by 90°). The magnitude `|z|` is the envelope, the argument the instantaneous phase. For an AM signal `A(1 + m·x)·cos(2π·fc·t)` with the carrier well above the bandwidth of the message, `|z| = A·(1 + m·x)`: the message comes from there.
- **Envelope detector** (AM): gets `A(1 + m·x)`, works without knowing the phase of the carrier, but needs the carrier in the signal (AM with carrier).
- **Coherent demodulation** (DSB-SC): multiplying `A·x·cos(ωt)` by `2·cos(ωt)/A` gives `x·(1 + cos 2ωt)`. The low-pass removes the term at `2·fc` and `x` is left. If the local carrier has a wrong phase `θ`, the signal drops by `cos θ`.
- **FM**: the instantaneous frequency is the derivative of the phase, `f(t) = fc + kf·x(t)`; it is recovered with `(f − fc)/kf`. The derivative discriminator is the digital way of doing what an analog discriminator did. Strong noise on the signal gives "clicks" (2π phase jumps).
- **PM**: the phase relative to the carrier is already `kp·x`. It has a 2π ambiguity, solved here with the "unwrapped" phase and by removing the whole turn nearest to the mean.

## Examples

### 1. AM: modulate and demodulate

`fs` = 10000 Hz, 50 Hz sine message, **Modulation** AM, carrier 1000 Hz, `m` = 0.5, in both blocks:

```
[Oscillator (waveform generator): 50 Hz] signal ──▶ message [Modulate (AM, FM, PM)] modulated signal ──▶ modulated signal [Demodulate (AM, FM, PM)] message ──▶ signal or spectrum [To chart] chart data ──▶ data (list or object) [Lines]
```

In a frame of 1000 samples the recovered message is equal to the original (error under 0.0001 in the samples far from the edges). The same happens with DSB-SC and with PM; with FM (deviation 200) the largest error is about 0.03.

### 2. A transmission received from outside

An AM signal that came from another program (a radio, a file), with a known carrier of 1000 Hz and `fs` = 10000 Hz: **Carrier frequency** 1000 and **Carrier amplitude** that of the transmitter. You can clean up the result with a low-pass [IIR filter](sig.iir).

### 3. An FM

**Modulation** FM, carrier 1000 Hz, **Deviation** 200: if the input has an instantaneous frequency of 1100 Hz, the output is `(1100 − 1000)/200 = 0.5`.

## Errors

| Message | When |
|---|---|
| La portante (… Hz) deve stare sotto fs/2 (… Hz), altrimenti c'è aliasing ("The carrier must be below fs/2, otherwise there is aliasing") | **Carrier frequency** is not less than fs/2. |
| L'ampiezza della portante deve essere più di 0 ("The carrier amplitude must be more than 0") | **Carrier amplitude** is 0 or less. |
| Servono almeno 4 campioni ("At least 4 samples are needed") | The signal has fewer than 4 samples. |
| L'indice di modulazione deve essere più di 0 ("The modulation index must be more than 0") | In **AM**, **Modulation index** is 0 or less. |
| Il segnale modulato manca ("The modulated signal is missing") | An empty value (`null`) came in on **modulated signal**. |
| Il segnale modulato deve essere una lista di numeri o un oggetto { fs, samples } ("The modulated signal must be a list of numbers or an object { fs, samples }") | Another kind of value came in. |
| Il segnale modulato ha una frequenza di campionamento (fs) non valida ("The modulated signal has an invalid sampling rate") | `fs` is not more than 0. |
| Il segnale modulato ha samples e im di lunghezze diverse ("samples and im have different lengths") | `im` and `samples` are not the same length. |
| Il segnale modulato: il valore N non è un numero ("value N is not a number") | Sample number N is not a number. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) ("Signal too long: … samples, at most …") | The signal is over the engine's limit (see [Limits](logicstudio-engine/limits)). |

## See also

- [Modulate (AM, FM, PM)](sig.modulate) to modulate, with the same settings
- [Envelope (scipy.signal.hilbert)](sig.envelope) for the envelope of a signal
- [IIR filter (butter, cheby1, cheby2)](sig.iir) to clean up the message
- [FFT (np.fft.fft)](sig.fft) to see the spectrum
- [Frequency · Period](sig.frequency) to measure the frequency
- [Signals](logicstudio-signals)
- [Engine limits](logicstudio-engine/limits)
- [How a block works](ide/blocks)
