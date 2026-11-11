# Buffer (samples → frames)

`sig.buffer` · Signals · [Signals](logicstudio-signals) · version 1

Collects the samples that arrive one at a time (or in groups) and sends them **in frames** of fixed length, even overlapping. It is the bridge between a continuous reading (a sensor, a number field) and the signal blocks, which work on frames.

## Inputs

| Port | Type | Description |
|---|---|---|
| **sample(s)** (`value`) | any | A number (a text with a number, like `"2.5"`, is fine too), a list of numbers or a signal `{ fs, samples }`. It is added at the end of what the block already has. |
| **reset** (`reset`) | pulse | Empties the buffer and takes the time back to 0. Hidden by default: show it with the eye in Properties. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **signal** (`signal`) | object | A complete frame: `{ fs, t0, samples }`. |
| **samples waiting** (`waiting`) | number | How many samples are in the buffer waiting to complete a frame. Sent at every value received. Hidden by default: show it with the eye in Properties. |
| **Exception** (`error`) | object | Invalid value, frame without samples, frame too long. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Frame size N** (`size`) | from 1 | 256 | How many samples each frame sent has. |
| **Hop (0 = N, no overlap)** (`hop`) | from 0 | 0 | By how many samples the frame advances after each output. 0 or more than N counts as N (frames one after the other); less than N overlaps the frames. |
| **fs of single values (Hz)** (`fs`) | more than 0 | 10 | The sampling rate of the numbers and lists that arrive. A signal that arrives brings its own. |

## How it works

- Every value that arrives is added to the buffer. As soon as there are at least **N** samples, the block sends the frame of the first **N** and then **throws away the first `hop` samples**; if N are still left, it sends another one, and so on. A value with many samples (a long list) can therefore make several frames come out in a row.
- **Hop** equal to N (or 0): frames are one after the other, with no overlap. **Hop** N/2: 50 % overlap, every sample appears in two frames. A hop bigger than N counts as N.
- The `t0` of a frame is the time of its first sample since the last reset: `samples thrown away / fs`. So the following frames make a continuous time.
- If the `fs` changes (a signal arrives with an fs different from that of the samples already in the buffer), the buffer is **emptied** and time starts again from 0.
- A signal that arrives is added as its real samples only (the imaginary part is lost).
- With a pulse on **reset**, the buffer is emptied and time starts again from 0: **samples waiting** sends 0.

## A bit of theory

Frequency processing (FFT, spectral density, spectrogram) works on blocks of samples, not on the continuous stream. **Buffering** cuts the stream into frames of `N` samples. The longer the frame, the finer the **frequency resolution**, `Δf = fs/N`; the shorter, the faster you see changes in time. This is the time-frequency trade-off.

With overlapping frames you reduce the loss of information that windows like Hann cause at the edges: a sample that falls at the edge of a frame (where the window attenuates it) is at the centre of the next one. The **hop** is `N·(1 − overlap)`; an overlap of 50 % (with Hann) or 75 % is a classic choice. The time between a frame and the next is `hop / fs`.

## Examples

### 1. From one value at a time to an FFT

A reading at 10 Hz (one value every 0.1 s) goes into the buffer; every 256 values a frame comes out for the FFT:

```
[Number field] value ──▶ sample(s) [Buffer (samples → frames)] signal ──▶ signal [FFT (np.fft.fft)] spectrum ──▶ data [To chart] chart data ──▶ data [Lines]
```

With **fs of single values** 10 and **N** 256, the spectrum goes from 0 to 5 Hz.

### 2. Overlap

With **N** 4, **Hop** 2 and **fs** 10, given the values `1, 2, 3, 4, 5, 6` the block sends two frames: `{ fs: 10, t0: 0, samples: [1, 2, 3, 4] }` and `{ fs: 10, t0: 0.2, samples: [3, 4, 5, 6] }`. **Samples waiting** sends 2 (5 and 6 are left).

### 3. A whole list at once

With **N** 4 and hop 0, a list of 6 values sends `[1, 2, 3, 4]` and leaves 2 samples waiting.

## Errors

| Message | When |
|---|---|
| La finestra deve avere almeno un campione ("The frame must have at least one sample") | **Frame size N** is less than 1. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) ("Signal too long: … samples, at most …") | **N** (or a signal arriving) is over the limit of the engine (65536 by default). See [Limits](logicstudio-engine/limits). |
| Il valore deve essere un numero, una lista di numeri o un segnale ("The value must be a number, a list of numbers or a signal") | Something else arrived (a text that is not a number, a yes/no, an object that is not a signal). |
| I campioni: il valore N non è un numero ("Samples: value N is not a number") | In the list, element N is not a number. |
| Il segnale ha una frequenza di campionamento (fs) non valida / Il segnale: il valore N non è un numero / Il segnale ha samples e im di lunghezze diverse ("The signal has an invalid sampling rate (fs)" / "The signal: value N is not a number" / "The signal has samples and im of different lengths") | The incoming signal is wrong (as for the other signal blocks). |

## See also

- [Signal from list](sig.fromList) for an already complete list
- [Play samples](sig.play) for the opposite operation (from frame to values)
- [FFT (np.fft.fft)](sig.fft), [Power spectral density (Welch)](sig.psd), [Spectrogram (STFT)](sig.spectrogram)
- [Signals](logicstudio-signals), all the blocks of the package
- [How a block works](ide/blocks)
