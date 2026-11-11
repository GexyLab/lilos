# Modulate (AM, FM, PM)

`sig.modulate` · Signals · [Signals](logicstudio-signals) · version 1

Puts a **message** (a slow signal: voice, a measurement) onto a **carrier** (a fast sine wave): amplitude modulation **AM**, **DSB-SC** (suppressed carrier), frequency modulation **FM** or phase modulation **PM**. It is the way a message is sent over a radio channel or a cable. [Demodulate (AM, FM, PM)](sig.demodulate), with the same settings, gets it back.

## Inputs

| Port | Type | Description |
|---|---|---|
| **message** (`signal`) | any | The message: an object `{ fs, t0, samples }` or a list of numbers (taken as a signal at the **fs of plain lists**). It usually runs between −1 and 1. The imaginary part `im`, if there is one, is ignored. |
| **reset** (`reset`) | pulse | Starts over (needed only for FM, which remembers the integral of the message). Hidden by default: show it with the eye in Properties. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **modulated signal** (`signal`) | object | The modulated signal `{ fs, t0, samples }`, with the `fs` and `t0` of the message. It always comes out as a signal, even if a list came in. |
| **Exception** (`error`) | object | Invalid carrier, invalid amplitude, an invalid message or one that is too long. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Modulation** (`kind`) | AM (with carrier), DSB-SC (suppressed carrier), FM, PM | AM | The kind of modulation. |
| **Carrier frequency (Hz)** (`carrier`) | 0 or more, below fs/2 | 100 | The frequency of the fast sine wave. |
| **Carrier amplitude** (`amplitude`) | more than 0 | 1 | The amplitude A of the carrier. |
| **Modulation index m** (`index`) | 0 or more | 0.5 | How much the message varies the amplitude. It shows only with **AM**. |
| **Deviation (Hz per unit of the message)** (`deviation`) | more than 0 | 100 | By how many Hz the frequency moves for each unit of the message. It shows only with **FM**. |
| **Phase deviation (rad per unit)** (`phaseDev`) | more than 0 | 1.5708 | By how many radians the phase moves for each unit of the message (1.5708 = π/2). It shows only with **PM**. |
| **fs of plain lists (Hz)** (`listFs`) | number more than 0 | 1000 | The sampling rate given to a list of numbers. |

**Modulate** and **Demodulate** have the **same settings** (Demodulate has one more for DSB-SC): with the same values they make a working pair. The low-pass of the DSB-SC demodulation appears only in Demodulate.

## How it works

With `x[n]` the message, `t = t0 + n/fs` the time, `A` the amplitude and `fc` the carrier:

| Modulation | Modulated signal |
|---|---|
| **AM** | `A · (1 + m · x) · cos(2π·fc·t)` |
| **DSB-SC** | `A · x · cos(2π·fc·t)` |
| **FM** | `A · cos(2π·fc·t + 2π·kf · ∫x dt)`, with `kf` the deviation in Hz per unit |
| **PM** | `A · cos(2π·fc·t + kp · x)`, with `kp` the phase deviation in rad per unit |

- The carrier depends on the **real time** `t = t0 + n/fs`, so consecutive frames (with a continuing `t0`) join without jumps in the phase of the carrier.
- **FM** remembers the **integral** of the message from one frame to the next (the sum of `x/fs`): consecutive frames join without jumps. If the `t0` of a frame does **not continue** the previous one (more than 1.5 samples off), the integral starts again from 0. **reset** takes it back to 0.
- AM, DSB-SC and PM remember nothing: each sample depends only on the message at that point.
- The carrier must be **below fs/2**: otherwise there is aliasing and the block gives an error. But more is needed: the sidebands must fit too (fs must be more than twice `fc + message bandwidth`; for FM, more than twice `fc + deviation + bandwidth`).

## A bit of theory

A message `x(t)` is slow; to send it you change a characteristic of a carrier `A·cos(2π·fc·t + φ)`:

- **AM**: changes the **amplitude**. The index `m` says how much: with `|m·x| ≤ 1` the envelope never goes negative and is got back with a simple envelope detector. With `m·|x|` above 1 there is **overmodulation** and the message is distorted. It takes a band of `2·B` (B = bandwidth of the message): two sidebands around the carrier, which stays in the spectrum.
- **DSB-SC** (double side band, suppressed carrier): `A·x·cos(2π·fc·t)`, without the carrier. It saves power, but to get it back you need the reference carrier (**coherent** demodulation).
- **FM**: changes the **instantaneous frequency**: `f(t) = fc + kf·x(t)`. The phase is the integral of the frequency, which is why there is an integral. The amplitude is constant. The index is `β = Δf/B`, with `Δf = kf·max|x|`, and the bandwidth is about `2·(Δf + B)` (Carson's rule). It is less sensitive to noise than AM.
- **PM**: changes the **phase** directly: `φ(t) = kp·x(t)`. The instantaneous frequency is `fc + (kp/2π)·dx/dt`, so PM is like an FM with the message differentiated.

## Examples

### 1. An AM

`fs` = 10000 Hz, sine message 50 Hz of amplitude 1, **Modulation** AM, carrier 1000 Hz, `m` = 0.5:

```
[Oscillator (waveform generator): 50 Hz] signal ──▶ message [Modulate (AM, FM, PM)] modulated signal ──▶ signal or spectrum [To chart] chart data ──▶ data (list or object) [Lines]
```

The signal oscillates at 1000 Hz with an envelope that goes from 0.5 to 1.5: `A·(1 ± 0.5)`. On the message `[1, 1, 1, -1, -1]` the modulated signal is `[1.5, 1.2135, 0.4635, −0.1545, −0.4045]`.

### 2. An FM

The same message, **Modulation** FM, **Deviation** 200 Hz per unit: the instantaneous frequency swings between 800 and 1200 Hz, the amplitude stays 1. With a 50 Hz message the index is `β = 200/50 = 4`, the bandwidth about `2·(200 + 50)` = 500 Hz.

### 3. A Modulate and Demodulate pair

```
[Oscillator (waveform generator): 50 Hz] signal ──▶ message [Modulate (AM, FM, PM)] modulated signal ──▶ modulated signal [Demodulate (AM, FM, PM)] message ──▶ signal or spectrum [To chart]
```

With the same settings in both blocks, the message comes back the same as at the start (in AM and PM practically with no error; in FM with a small calculation error), except at the edges of the frame.

## Errors

| Message | When |
|---|---|
| La portante (… Hz) deve stare sotto fs/2 (… Hz), altrimenti c'è aliasing ("The carrier must be below fs/2, otherwise there is aliasing") | **Carrier frequency** is not less than fs/2. |
| L'ampiezza della portante deve essere più di 0 ("The carrier amplitude must be more than 0") | **Carrier amplitude** is 0 or less. |
| Il messaggio manca ("The message is missing") | An empty value (`null`) came in on **message**. |
| Il messaggio deve essere una lista di numeri o un oggetto { fs, samples } ("The message must be a list of numbers or an object { fs, samples }") | Another kind of value came in. |
| Il messaggio ha una frequenza di campionamento (fs) non valida ("The message has an invalid sampling rate") | `fs` is not more than 0. |
| Il messaggio ha samples e im di lunghezze diverse ("samples and im have different lengths") | `im` and `samples` are not the same length. |
| Il messaggio: il valore N non è un numero ("value N is not a number") | Sample number N is not a number. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) ("Signal too long: … samples, at most …") | The message is over the engine's limit (see [Limits](logicstudio-engine/limits)). |

## See also

- [Demodulate (AM, FM, PM)](sig.demodulate) to get the message back
- [Oscillator (waveform generator)](sig.oscillator) for message and carrier
- [FFT (np.fft.fft)](sig.fft) to see the sidebands
- [Envelope (scipy.signal.hilbert)](sig.envelope) for the envelope of a signal
- [IIR filter (butter, cheby1, cheby2)](sig.iir) to limit the bandwidth
- [Signals](logicstudio-signals)
- [Engine limits](logicstudio-engine/limits)
- [How a block works](ide/blocks)
