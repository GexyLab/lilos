# To chart

`sig.toChart` · Signals · [Signals](logicstudio-signals) · version 1

Turns a signal, a spectrum or a frequency response into the **data of a chart** (one or more series of `x, y` points), to be linked to the Charts components. It picks the axis (time or frequency) by itself, chooses what to show and, if there are too many points, reduces them without losing the peaks.

## Inputs

| Port | Type | Description |
|---|---|---|
| **signal or spectrum** (`data`) | any | A signal `{ fs, t0, samples }`, a list of numbers (taken at the "fs of plain lists"), or an object with frequencies (`f`): the spectrum of the [FFT](sig.fft), the spectral density, the frequency response. It becomes the first series. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **chart data** (`chart`) | list | A list of series `[{ "name": …, "data": [{ "x": …, "y": … }, …] }, …]`, in the form the Charts (for example [Lines](charts.line)) accept on **data**. |
| **Exception** (`error`) | object | An invalid signal, a spectrum without the values to show, signal too long. |

## Added ports

In **Properties**, **Ports** section, you can add up to **7** more inputs, of type any, called "series 1", "series 2"… Each one is another series in the same chart (to compare, for example, a signal before and after a filter). **The name of the port is the name of the series** (you can change it). They are shown in italics on the block. See [How a block works](ide/blocks).

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Show** (`show`) | Automatic / Value (real part) / Absolute value / Imaginary part / Decibel / Phase | Automatic | What to put on the vertical axis (see below). |
| **Horizontal axis** (`xAxis`) | Time or frequency / Sample number | Time or frequency | The x axis: the time of the sample (or the frequency, for a spectrum), or 0, 1, 2… |
| **Points per series, at most** (`maxPoints`) | from 10 to 100000 | 2000 | Above this number the points are reduced (see below). |
| **Name of the first series** (`name`) | text | empty | The name of the series that comes from **signal or spectrum**. Empty: "signal" (in the language of the program). |
| **fs of plain lists (Hz)** (`listFs`) | more than 0 | 1000 | A plain list of numbers is a signal with this sampling rate. |

## How it works

The block recomputes **all the series** at every value that arrives on any of its ports, with the last value of each. Ports that have nothing yet make no series; if none has a value, nothing comes out.

**What the y axis shows**, for **Automatic**:

- a **signal**: the real part (a complex signal shows only the real part; for the other parts choose the entry in **Show**);
- a **spectrum** (FFT): the magnitude (`mag`);
- a **spectral density** (Welch): the density (`psd`);
- a **frequency response**: the gain in decibels (`db`).

With the other entries of **Show**: *Absolute value* is the magnitude (`√(re² + im²)`), *Imaginary part*, *Decibel* is `20·log10(magnitude)` (it does not go below −300 dB) and *Phase* is the angle, in radians for signals and spectra. For a spectrum, Value and Absolute value give the magnitude. *Imaginary part* and *Phase* work only with objects that have them: the FFT spectrum does; the spectral density does not (error).

**The x axis**: for a signal it is the time `t₀ + i/fs`, for a spectrum the frequency; with **Sample number** it is the integers 0, 1, 2…

**Reducing the points**: if a series has more points than **Points per series**, the block divides it into `Points/2` groups of neighbouring samples and from each group keeps **the lowest and the highest point**. So the chart has at most **Points per series** points, and peaks and valleys stay visible (they are not lost as with one sample every now and then). If the points are fewer, all of them go through.

A value that is not finite (infinite or not a number) becomes an empty point, which breaks the line.

## A bit of theory

A chart can show only as many points as the pixels of the screen (a few thousand). A signal of 65000 samples on a screen 1000 pixels wide must be **decimated**. Taking one sample every now and then (simple decimation) risks losing short peaks and giving **visual aliasing**, that is shapes that do not exist. Keeping the minimum and maximum of each group (**min-max decimation**, the one oscilloscopes use) always shows the real envelope of the signal.

The scales chosen by **Automatic** follow practice: a spectrum is looked at in magnitude (linear, or in dB for large dynamic ranges: `dB = 20·log10(A/A₀)`, +6 dB = double amplitude, +20 dB = amplitude 10 times), the **frequency response** is looked at in dB (Bode plot), and the phase in radians (the phase of frequency responses is already in degrees).

## Examples

### 1. A signal

```
[Oscillator (waveform generator)] signal ──▶ signal or spectrum [To chart] chart data ──▶ data [Lines]
```

With a list `[1, 2, 3]` instead of the oscillator and "fs of plain lists" 1000, the block sends `[{ "name": "signal", "data": [{ "x": 0, "y": 1 }, { "x": 0.001, "y": 2 }, { "x": 0.002, "y": 3 }] }]`.

### 2. Before and after a filter

With an added port called "filtered", the two series are in the same chart:

```
[Oscillator (waveform generator)] signal ──▶ signal or spectrum [To chart] chart data ──▶ data [Lines]
                                  signal ──▶ [IIR filter (butter, cheby1, cheby2)] signal ──▶ filtered [To chart: added port]
```

The series are called "signal" and "filtered".

### 3. The spectrum

```
[Oscillator (waveform generator)] signal ──▶ signal [FFT (np.fft.fft)] spectrum ──▶ signal or spectrum [To chart] chart data ──▶ data [Lines]
```

With **Automatic** you see the magnitude, with the frequencies in Hz on the x axis; with **Decibel** you see it in dB.

### 4. Many points

With 100 samples and **Points per series** 10, 10 points come out: each group is 20 samples and the minimum and the maximum of it stay (5 groups).

## Errors

| Message | When |
|---|---|
| «…» deve essere una lista di numeri o un oggetto { fs, samples } ("«…» must be a list of numbers or an object { fs, samples }") | A port (shown with its name, for example «signal» or «segnale» in an Italian program) holds a value that is not a signal, a list or a spectrum. |
| «…» ha una frequenza di campionamento (fs) non valida ("«…» has an invalid sampling rate (fs)") | In the object, `fs` is 0, negative or not a number. |
| «…»: il valore N non è un numero ("«…»: value N is not a number") | A sample (number N) is not a number. |
| «…» ha samples e im di lunghezze diverse ("«…» has samples and im of different lengths") | In the object, `samples` and `im` do not have the same length. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) ("Signal too long: … samples, at most …") | A signal has more samples than the limit of the engine (65536 by default). See [Limits](logicstudio-engine/limits). |
| Lo spettro non ha i valori da mostrare (…) ("The spectrum does not have the values to show") | With a spectrum, the entry chosen in **Show** does not exist in that object (for example *Imaginary part* with a spectral density). In brackets, the name of the missing value. |

## See also

- [Lines](charts.line) and the other charts that receive the data
- [FFT (np.fft.fft)](sig.fft), [Power spectral density (Welch)](sig.psd), [Frequency response (freqz, Bode)](sig.response)
- [Play samples](sig.play) for a chart that draws in real time
- [Signals](logicstudio-signals), all the blocks of the package
- [How a block works](ide/blocks)
