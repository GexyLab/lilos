# Goertzel (tones, DTMF)

`sig.goertzel` · Signals · [Signals](logicstudio-signals) · version 1

Measures the **amplitude of a few chosen frequencies** in a signal, without computing the whole spectrum. It is simpler and lighter than an [FFT](sig.fft) when you look for a few known frequencies, and it has a ready mode to recognise **DTMF tones**, the ones of the phone keys.

## Inputs

| Port | Type | Description |
|---|---|---|
| **signal** (`signal`) | any | A signal `{ fs, t0, samples }` or a plain list of numbers (taken as a signal at **fs of plain lists**). |

## Outputs

| Port | Type | Description |
|---|---|---|
| **amplitudes** (`amplitudes`) | list | One amplitude per frequency, in the same order. A sine of amplitude A at the wanted frequency gives about A. In DTMF mode there are 8 values: the 4 row frequencies (697, 770, 852, 941 Hz) and then the 4 column ones (1209, 1336, 1477, 1633 Hz). |
| **DTMF key** (`key`) | text | The recognised key (`0`–`9`, `*`, `#`, `A`–`D`) in DTMF mode; empty text if there is no clear one, and always empty in the Frequencies of the list mode. |
| **frequency → amplitude** (`table`) | object | An object with one key per frequency (as text, for example `"50"`) and the amplitude as value. Hidden by default: show it with the eye in Properties. |
| **Exception** (`error`) | object | Missing, invalid or empty signal, badly written frequencies or above fs/2. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Tones** (`mode`) | Frequencies of the list, DTMF (phone keys) | Frequencies of the list | Which frequencies to measure: the ones you write or the 8 DTMF tones. |
| **Frequencies (Hz)** (`frequencies`) | JSON list of numbers | `[50, 100, 150]` | The frequencies to measure, for example `[50, 100]`. A text with numbers separated by spaces, commas or semicolons is accepted too. Only visible with **Tones** = Frequencies of the list. |
| **Least amplitude of a key tone** (`minLevel`) | 0 or more | 0.05 | The strongest tone of the rows and of the columns must have at least this amplitude for the key to be recognised. Only visible with **Tones** = DTMF. |
| **fs of plain lists (Hz)** (`listFs`) | number above 0 | 1000 | The sampling rate given to a plain list of numbers. |

## How it works

For each frequency `f` the block runs through the samples once with the **Goertzel recurrence** and gets the amplitude. No window is applied.

- Every frequency must be between **0 and fs/2**. The frequency 0 gives the mean value of the signal.
- **DTMF**: the row is the strongest of the first 4 frequencies, the column the strongest of the last 4; the key is where they meet: rows 697/770/852/941 Hz, columns 1209/1336/1477/1633 Hz, in the order `1 2 3 A / 4 5 6 B / 7 8 9 C / * 0 # D`. The key is recognised only if **both** the row and the column are at least **Least amplitude** and the second tone of each group is less than half of the first (that is, the row and the column are clear, not two equal tones). DTMF tones need `fs` of at least 3266 Hz (1633 Hz is fs/2); telephony uses 8000 Hz.
- The result is more precise with windows that hold a **whole number of periods** of the tone: otherwise the amplitude comes out a little lower than the true one.

## A bit of theory

For a single frequency `f`, computing the whole DFT costs N·log N. Goertzel does much less with a second-order **recurrence**: with `c = 2·cos(2πf/fs)`

`s[n] = x[n] + c·s[n−1] − s[n−2]`

starting from `s = 0`. After the N samples, the power of the component at frequency f is `P = s[N−1]² + s[N−2]² − c·s[N−1]·s[N−2]`, equal to `|X(f)|²` of the DFT computed at that frequency. The amplitude of a tone is `2·√P / N`. It needs one multiplication per sample and no memory for the spectrum: that is why it is used in phones, microcontrollers and tone detectors.

The **DTMF tones** (dual-tone multi-frequency) are the sum of two sines, one of a "row" frequency and one of a "column": the pair identifies the key. The frequencies are chosen so that the harmonics and intermodulation products of one do not coincide with the others.

## Examples

### 1. How much of 50 and 100 Hz

**Frequencies (Hz)** = `[50, 100]`, a 50 Hz sine of amplitude 2, at fs 1000 Hz, 1000 samples:

```
[Oscillator (waveform generator)] signal ──▶ signal [Goertzel (tones, DTMF)] amplitudes ──▶ value [Print (console.log)]
```

It prints `[2, 0]` (about: 2 and 3·10⁻¹⁶). **frequency → amplitude** would give `{"50": 2, "100": 0}`.

### 2. A phone key

**DTMF** mode, a signal at fs 8000 Hz with 770 Hz and 1336 Hz sines, each of amplitude 0.5, 800 samples long (0.1 s): the amplitudes of the two frequencies are about 0.5 and the key is `5` (row 770, column 1336).

```
[Add · Multiply signals] signal ──▶ signal [Goertzel (tones, DTMF)] DTMF key ──▶ text [Label]
[Oscillator (waveform generator): 770 Hz] signal ──▶ a [Add · Multiply signals]
[Oscillator (waveform generator): 1336 Hz] signal ──▶ b [Add · Multiply signals]
```

## Errors

| Message | When |
|---|---|
| Il segnale manca ("The signal is missing") | An empty value arrives. |
| Il segnale deve essere una lista di numeri o un oggetto { fs, samples } ("The signal must be a list of numbers or an object { fs, samples }") | The input is a single number, a text that is not JSON, or an object without `samples`. |
| Il segnale ha una frequenza di campionamento (fs) non valida ("The signal has an invalid sampling rate") | `fs` is missing or not above 0. |
| Il segnale: il valore N non è un numero ("value N is not a number") | Sample N (from 1) of the list is not a number. |
| Il segnale ha samples e im di lunghezze diverse ("samples and im have different lengths") | The imaginary part has a different number of samples. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) ("Signal too long") | The signal exceeds the `signalSamples` limit (65536 by default). See [the limits](logicstudio-engine/limits). |
| Il segnale è vuoto ("The signal is empty") | The list has no samples. |
| Scrivi le frequenze come lista, per esempio [50, 100] ("Write the frequencies as a list, for example [50, 100]") | **Frequencies (Hz)** is not a list or is empty. |
| Le frequenze devono stare tra 0 e fs/2 (… Hz) ("The frequencies must be between 0 and fs/2") | A frequency is negative, not a number or above fs/2. In DTMF it happens if fs is below 3266 Hz. |

## See also

- [FFT (np.fft.fft)](sig.fft) for the whole spectrum
- [Peaks (find_peaks)](sig.peaks) to find the frequencies you do not know
- [Buffer (samples → frames)](sig.buffer) to cut a stream of samples into windows to analyse
- [Signals](logicstudio-signals), all the blocks of the package
- [How a block works](ide/blocks)
