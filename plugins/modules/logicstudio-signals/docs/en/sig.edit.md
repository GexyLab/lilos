# Delay · Trim · Zero-padding

`sig.edit` · Signals · [Signals](logicstudio-signals) · version 1

Changes a signal in time without changing its values: delays it, slides it in a circle, cuts a piece out, lengthens it with zeros, reverses it in time or repeats it.

## Inputs

| Port | Type | Description |
|---|---|---|
| **signal** (`signal`) | any | The signal: a real signal `{ fs, t0, samples }` or a list of numbers. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **signal** (`signal`) | object | The changed signal. If a plain list came in, a plain list goes out. |
| **Exception** (`error`) | object | **To** before **From** in **Trim**, a signal that is too long, or an input that is not a signal. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Operation** (`op`) | delay, circular shift, trim, zero-padding, reverse, repeat | delay | What to do to the signal (see the table below). |
| **Seconds (negative = ahead)** (`seconds`) | number | 0.1 | How much to delay or slide. It shows only with **delay** and **circular shift**. |
| **From (s from the start)** (`from`) | from 0 up | 0 | The start of the piece to keep. It shows only with **trim**. |
| **To (s, 0 = the end)** (`to`) | from 0 up | 0 | The end of the piece to keep; 0 means up to the last sample. It shows only with **trim**. |
| **Length (0 = next power of 2)** (`length`) | from 0 up | 0 | The final length, in samples. It shows only with **zero-padding**. |
| **Times** (`times`) | from 1 up | 2 | How many times to repeat the signal. It shows only with **repeat**. |
| **fs of plain lists (Hz)** (`listFs`) | number more than 0 | 1000 | The sampling rate given to a plain list of numbers coming in. A real signal already carries its fs. |

| Operation | What it does |
|---|---|
| **Delay** (`delay`) | Puts zeros in front and throws away what falls off the end: the **same length**. With negative seconds it brings ahead (the zeros go at the end). |
| **Circular shift** (`shift`) | Like delaying, but the samples that leave on one side come back on the other. |
| **Trim** (`trim`) | Keeps the samples from **From** to **To** (in seconds from the start). The start time `t0` of the result is moved accordingly. |
| **Zero-padding** (`pad`) | Brings the signal to **Length** samples adding zeros at the end (if it is shorter) or cutting it (if it is longer). With 0 it picks the next power of 2. |
| **Reverse** (`reverse`) | The first sample becomes the last: `x(−t)`. |
| **Repeat** (`repeat`) | Puts the signal one after the other **Times** times. |

## How it works

Seconds become samples by multiplying by the fs of the signal and **rounding**: at fs 1000 Hz, 0.003 s is 3 samples.

- **Delay.** With `[1…8]` at 1000 Hz and 0.003 s → `[0, 0, 0, 1, 2, 3, 4, 5]`. With −0.002 s → `[3, 4, 5, 6, 7, 8, 0, 0]`. The `t0` does not change.
- **Circular shift.** With 0.003 s → `[6, 7, 8, 1, 2, 3, 4, 5]`.
- **Trim.** With **From** 0.002 s and **To** 0.005 s → `[3, 4, 5]` and `t0` = 0.002 s. If **To** is past the end, it goes to the end.
- **Zero-padding.** With **Length** 10 → `[1…8, 0, 0]`; with 5 → `[1, 2, 3, 4, 5]`; with 0 and 100 samples → 128.
- **Repeat.** With 2 times → the samples twice in a row; the duration doubles.
- With plain lists the outputs are plain lists.
- The imaginary parts of a complex signal are not kept.

## A bit of theory

- **A delay** of `τ` seconds changes only the phase: `x(t − τ) ⇄ X(f)·e^(−j2πfτ)`. The amplitude spectrum stays the same, the phase falls linearly with the frequency (constant group delay, equal to τ). The circular shift, which is the "DFT" delay, does the same.
- **Bringing ahead** (negative seconds) is the same delay with the opposite sign: the first samples leave the signal and are lost, zeros come in at the end.
- **Zero-padding.** Adding zeros before an FFT gives no new information: it *interpolates* the spectrum, because the distance between the bins becomes `df = fs / N` with a larger `N`, and makes the peak easier to read. The true resolution (how close two lines can be and still be told apart) depends only on the duration of the recorded signal, about `1 / T`. A power of 2 makes the FFT faster.
- **Trim** is for isolating a steady stretch; fewer samples mean a coarser frequency resolution.
- **Reverse** conjugates the spectrum: for a real signal the phase changes sign and the magnitude stays the same.
- **Repeat** builds a periodic signal: if the repeated piece is one whole period, the spectrum does not change shape, but there are more bins between one line and the next (the duration is longer).

## Examples

### 1. Delay a signal and compare it with the original

```
[Oscillator (waveform generator)] signal ──▶ signal [Delay · Trim · Zero-padding: delay 0.01 s] signal ──▶ signal [To chart]
```

At fs 1000 Hz that is 10 samples of zeros in front; the length stays the same.

### 2. Preparing a fast FFT

```
[Signal from list] signal ──▶ signal [Delay · Trim · Zero-padding: zero-padding, length 0] signal ──▶ signal [FFT (np.fft.fft)]
```

With 1000 samples it reaches 1024.

### 3. Isolating a stretch

With a signal 1 s long, **Trim** from 0.2 to 0.7 keeps half a second and `t0` becomes 0.2 s: a chart after the block starts from 0.2 s.

## Errors

| Message | When |
|---|---|
| «A» deve venire dopo «Da» ("\"To\" must come after \"From\"") | In **Trim**, **To** (other than 0) is before or equal to **From**, or **From** is past the end of the signal. |
| Operazione sconosciuta: … ("Unknown operation") | The operation saved in the project does not exist (it does not happen when choosing it from the menu). |
| Il segnale manca ("The signal is missing") | The block runs without a signal on the input. |
| Il segnale deve essere una lista di numeri o un oggetto { fs, samples } ("The signal must be a list of numbers or an object { fs, samples }") | The input is a number, a text or an object that is not a signal. |
| Il segnale: il valore … non è un numero ("The signal: value … is not a number") | A list or a signal holds something that is not a number. |
| Il segnale ha una frequenza di campionamento (fs) non valida ("The signal has an invalid sampling rate (fs)") | A signal with fs 0, negative or not a number. |
| Il segnale ha samples e im di lunghezze diverse ("The signal has samples and im of different lengths") | A complex signal with real and imaginary parts of different length. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) ("Signal too long: … samples, at most …") | The input signal, or the result of **Zero-padding** or **Repeat**, goes over the limit (see [Engine limits](logicstudio-engine/limits)). |

## See also

- [FFT (np.fft.fft)](sig.fft), which also has its own length and a power of 2 option
- [Resample](sig.resample) to change the fs
- [Buffer (samples → frames)](sig.buffer) to cut a stream into frames
- [Add · Multiply signals](sig.combine) to put signals together
- [Signals](logicstudio-signals), all the blocks of the package
- [How a block works](ide/blocks)
