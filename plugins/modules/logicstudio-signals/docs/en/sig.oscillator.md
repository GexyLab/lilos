# Oscillator (waveform generator)

`sig.oscillator` · Signals · [Signals](logicstudio-signals) · version 1

Generates a periodic signal: sine, square wave, triangle, sawtooth or pulse train. The signal comes out **in frames** of samples (an object with sampling rate, start time and samples), ready to be filtered, measured or drawn.

## Inputs

| Port | Type | Description |
|---|---|---|
| **generate** (`generate`) | pulse | A pulse generates a new frame. If it is **not linked**, the block sends one frame at the start and a new one at every value that arrives on the other ports. |
| **frequency** (`frequency`) | number | Frequency in Hz; replaces the one in Properties. Hidden by default: show it with the eye in Properties. |
| **amplitude** (`amplitude`) | number | Amplitude; replaces the one in Properties. Hidden by default: show it with the eye in Properties. |

A text with a number (`"2.5"`) is fine for **frequency** and **amplitude**.

## Outputs

| Port | Type | Description |
|---|---|---|
| **signal** (`signal`) | object | The frame: `{ fs, t0, samples }`. |
| **Exception** (`error`) | object | Invalid sampling rate or number of samples, signal too long. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Waveform** (`wave`) | Sine / Square / Triangle / Sawtooth / Pulse train (0/1) | Sine | The shape of one period. |
| **Frequency (Hz)** (`frequency`) | 0 or more | 50 | How many periods per second. |
| **Amplitude** (`amplitude`) | number | 1 | The peak of the shape (the offset is added afterwards). |
| **Phase (degrees)** (`phase`) | number | 0 | How far ahead the shape is: 90 degrees = a quarter of a period. |
| **Offset (DC)** (`offset`) | number | 0 | Value added to all the samples. |
| **Duty cycle (%)** (`duty`) | from 0 to 100 | 50 | The part of the period where the wave is "high". It shows only with **Square** and **Pulse train**. |
| **Sampling rate fs (Hz)** (`fs`) | more than 0 | 1000 | How many samples per second. |
| **Samples N** (`samples`) | from 1 | 1000 | How many samples each frame has. |
| **Time goes on (each frame after the last)** (`continue`) | yes / no | yes | With yes, each frame starts where the previous one ended (`t0` grows and the phase does not jump). With no, every frame starts at `t0 = 0`. |

## How it works

- When the program starts, time starts at 0. If **generate** is not linked, the block sends a frame right away; each new value on **frequency** or **amplitude** sends another one. If **generate** is linked, the block sends a frame **only** at each pulse on **generate**, and the values on **frequency** and **amplitude** count from the next frame.
- Each frame lasts `N / fs` seconds. Sample number `i` (from 0) is computed at time `t = t0 + i / fs`, with the phase `u = fraction(frequency · t + phase/360)` that goes from 0 to 1 in one period, and is `offset + amplitude · shape(u)`:
  - **Sine**: `sin(2π·u)`; starts at 0 and goes up.
  - **Square**: `+1` while `u` is less than the duty cycle, `−1` after.
  - **Triangle**: goes up from 0 to 1 in a quarter period, down to −1 at three quarters, back up to 0.
  - **Sawtooth**: goes up from 0 to 1 at half period, then jumps to −1 and goes back up to 0.
  - **Pulse train**: `1` while `u` is less than the duty cycle, `0` after.
- With **Time goes on** ticked and a pulse on **generate** for every frame, the samples of consecutive frames join without jumps (for example with a [Buffer](sig.buffer) or a [To chart](sig.toChart) after it). Time goes back to 0 at every start of the program.
- The block does not check that the frequency is below `fs/2`: above that limit the signal comes out, but with a wrong frequency (see the theory).

## A bit of theory

A continuous-time signal `x(t)` is **sampled** by taking its value every `Ts = 1/fs` seconds: `x[n] = x(n·Ts)`. The sine this block generates is

`x(t) = A·sin(2π·f·t + φ) + offset`

with `A` the amplitude, `f` the frequency in Hz and `φ` the phase (in radians: degrees · π/180). The **period** is `T = 1/f`, and a frame of `N` samples holds `f·N/fs` periods.

**Sampling theorem (Nyquist–Shannon)**: a signal can be rebuilt from its samples only if it contains frequencies **below `fs/2`** (the Nyquist frequency). A sine of frequency `f` above `fs/2` produces the same samples as one of a lower frequency, and looks like that one: this is **aliasing**. For example, with `fs = 1000` Hz a 950 Hz sine gives the same samples (apart from the sign) as a 50 Hz one.

Square, triangle and sawtooth waves are not sinusoids: they contain the base frequency `f` and its **harmonics** (`2f`, `3f`…). The square wave has only odd harmonics, with amplitudes `4A/(π·k)` (k = 1, 3, 5…); since harmonics go on forever, those above `fs/2` alias and fold back into the spectrum: for "clean" shapes keep `fs` much higher than the frequency. If the frame does not hold a whole number of periods, the spectrum gets "dirty" (leakage): see [FFT](sig.fft) and [Window](sig.window).

## Examples

### 1. A sine to draw

With the default settings (50 Hz, `fs` 1000, 1000 samples) the block sends 1 second of signal, that is 50 periods:

```
[Oscillator (waveform generator)] signal ──▶ data [To chart] chart data ──▶ data [Lines]
```

### 2. Eight samples per period

With **Frequency** 1, **fs** 8 and **Samples** 8, the frame is exactly one period. With **Sine** the samples are `0, 0.7071, 1, 0.7071, 0, −0.7071, −1, −0.7071`. With **Triangle**: `0, 0.5, 1, 0.5, 0, −0.5, −1, −0.5`. With **Sawtooth**: `0, 0.25, 0.5, 0.75, −1, −0.75, −0.5, −0.25`. With **Square** and duty cycle 25: `1, 1, −1, −1, −1, −1, −1, −1`.

### 3. A continuous flow in frames

An [Interval (setInterval)](core.every) sends a pulse every second to **generate**; each pulse makes a new frame come out, continuing the previous one:

```
[Interval (setInterval)] pulse ──▶ generate [Oscillator (waveform generator)] signal ──▶ signal [FFT (np.fft.fft)] ──▶ …
```

## Errors

| Message | When |
|---|---|
| La frequenza di campionamento deve essere più di 0 ("The sampling rate must be more than 0") | **fs** is 0 or negative. |
| Serve almeno un campione ("At least one sample is needed") | **Samples N** is less than 1. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) ("Signal too long: … samples, at most …") | **Samples N** is over the limit of the engine (65536 by default). See [Limits](logicstudio-engine/limits). |

## See also

- [Noise (np.random)](sig.noise), [Impulse · Step · Ramp](sig.elementary), [Chirp (scipy.signal.chirp)](sig.chirp) for other test signals
- [FFT (np.fft.fft)](sig.fft) to see the frequencies of the signal
- [To chart](sig.toChart) to draw it
- [Signals](logicstudio-signals), all the blocks of the package
- [How a block works](ide/blocks)
