# Play samples

`sig.play` · Signals · [Signals](logicstudio-signals) · version 1

Takes a signal and "plays" it **one sample at a time**, at a pace you choose, sending each value to an output. Use it to bring a recorded signal to a chart that draws in real time, to an indicator or to an output of a machine, as if the signal were arriving live.

## Inputs

| Port | Type | Description |
|---|---|---|
| **signal** (`signal`) | any | The signal to play: an object `{ fs, t0, samples }`, a list of numbers (taken at the "fs of plain lists") or a JSON text of either. A new signal stops the one that is playing and starts over. |
| **stop** (`stop`) | pulse | Stops the playback, without sending "done". Hidden by default: show it with the eye in Properties. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | number | The current sample. The first one comes out at once, the others at the chosen pace. |
| **time (s)** (`time`) | number | The time of the sample in the signal: `t₀ + i/fs`. It is not the clock: it is the time written in the signal. Hidden by default: show it with the eye in Properties. |
| **done** (`done`) | pulse | A pulse after the last sample (if **Start again at the end** is off), or at once if the signal is empty. |
| **Exception** (`error`) | object | Invalid signal, pace too high. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Samples per second (0 = fs of the signal)** (`rate`) | from 0 to 100 | 10 | How many samples come out each second. With 0 the pace is the fs of the signal (useful only if it is 100 or less). |
| **Start again at the end** (`loop`) | yes / no | no | With yes, after the last sample it starts again from the first, endlessly, until **stop** or another signal arrives. |
| **fs of plain lists (Hz)** (`listFs`) | more than 0 | 1000 | If a plain list of numbers arrives, it takes it as a signal with this sampling rate. |

## How it works

- When a signal arrives, the block stops any playback in progress, sends the first sample **at once** on **value** (and its time on **time**) and then one sample every `1/rate` seconds.
- After the last sample, it sends a pulse on **done** and stops. With **Start again at the end** it does not send **done**: it starts again from the first sample.
- A pulse on **stop** stops the playback and sends nothing; to start again a signal is needed on **signal**.
- The top pace is **100 samples per second**: every sample makes the linked blocks work, and the engine stops a program that makes too many runs (see [Limits](logicstudio-engine/limits)).
- If **Samples per second** is 0, the pace is the fs of the signal: with the default settings a plain list is 1000 Hz and the block gives an error. Set a pace, or put in the "fs of plain lists" a value up to 100.
- The pace is that of a timer: if the computer is busy some samples may arrive late.

## A bit of theory

A signal sampled at `fs` represents a phenomenon that lasts `N/fs` seconds. Playing it at a pace different from `fs` changes its **time scale** (to the ear, a recording at double speed sounds an octave higher): the values stay the same, what changes is the real time between two samples, `1/rate` instead of `1/fs`. That is why the **time** output gives the time of the signal (`t₀ + i/fs`), not the real one.

Playing at a pace lower than `fs` is a way to "slow down" a fast signal to look at it (a 1000 Hz signal at 10 samples per second is slowed down 100 times). The pace of 100 samples per second is the practical limit of an interface that refreshes: beyond that, it is better to draw the whole frame at once with [To chart](sig.toChart).

## Examples

### 1. A signal on a live chart

```
[Oscillator (waveform generator)] signal ──▶ signal [Play samples] value ──▶ added series [Real time]
```

With the oscillator at 1 Hz, `fs` 100 and 100 samples (one period), and **Samples per second** 20, the period of the sine is drawn in 5 seconds. The series of the chart is an added port of the [Real time](charts.live) component.

### 2. Three samples

With **Samples per second** 10 and the list `[5, 6, 7]`: at once **value** 5 and **time** 0; after 0.1 s **value** 6, **time** 0.001 (at 1000 Hz); after 0.2 s **value** 7 and a pulse on **done**.

### 3. Repeat forever

With **Start again at the end** the signal loops: useful to simulate a sensor. A pulse on **stop** interrupts it.

## Errors

| Message | When |
|---|---|
| Troppo veloce: … campioni al secondo, al massimo 100 (imposta «Campioni al secondo») ("Too fast: … samples per second, at most 100 (set «Samples per second»)") | **Samples per second** is 0 and the fs of the signal is more than 100. |
| Il segnale deve essere una lista di numeri o un oggetto { fs, samples } ("The signal must be a list of numbers or an object { fs, samples }") | **signal** holds neither a list nor a signal. |
| Il segnale ha una frequenza di campionamento (fs) non valida ("The signal has an invalid sampling rate (fs)") | In the object, `fs` is 0, negative or not a number. |
| Il segnale: il valore N non è un numero ("The signal: value N is not a number") | A sample (number N) is not a number. |
| Il segnale ha samples e im di lunghezze diverse ("The signal has samples and im of different lengths") | In the object, `samples` and `im` do not have the same length. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) ("Signal too long: … samples, at most …") | The signal has more samples than the limit of the engine (65536 by default). See [Limits](logicstudio-engine/limits). |

## See also

- [Buffer (samples → frames)](sig.buffer) for the opposite operation
- [Signal parts](sig.info) to get all the samples at once, as a list
- [To chart](sig.toChart) to draw a whole signal
- [Signals](logicstudio-signals), all the blocks of the package
- [How a block works](ide/blocks)
