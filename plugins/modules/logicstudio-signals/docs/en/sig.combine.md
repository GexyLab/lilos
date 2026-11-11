# Add · Multiply signals

`sig.combine` · Signals · [Signals](logicstudio-signals) · version 1

Puts two or more signals together sample by sample: sum, difference, product, ratio, mean, minimum or maximum. One or more inputs can be plain numbers, which count for every sample.

## Inputs

| Port | Type | Description |
|---|---|---|
| **a** (`a`) | any | The first operand: a signal, a list of numbers or a number. |
| **b** (`b`) | any | The second operand, like **a**. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **signal** (`signal`) | object | The resulting signal, always a real signal `{ fs, t0, samples }` (even when lists come in). |
| **Exception** (`error`) | object | An operand that is neither a signal nor a number, different fs, division by zero, signal too long. |

## Added ports

In **Properties**, **Ports** section, you can add up to 16 more inputs, of type any, named with the letters that follow: **c**, **d**, **e**… They show in italics on the block. See [How a block works](ide/blocks).

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Operation** (`op`) | add, subtract, multiply, divide, mean, minimum, maximum | add | The operation between the operands, in the order **a**, **b**, **c**… (see the table below). |
| **fs of plain lists (Hz)** (`listFs`) | number more than 0 | 1000 | The sampling rate given to a plain list of numbers coming in. A real signal already carries its fs. |

| Operation | Result of each sample |
|---|---|
| **Add** a + b + … | the sum of the operands |
| **Subtract** a − b − … | **a** minus all the others |
| **Multiply** a · b · … | the product |
| **Divide** a / b / … | **a** divided, one after the other, by the others |
| **Mean** | the sum divided by the **number of operands** (plain numbers count) |
| **Minimum** / **Maximum** | the smallest / the largest of the operands |

## How it works

At every new value on an input the block recalculates the result with the last value of each input. Inputs that have not received anything yet do not count.

- **Numbers and signals together.** A number (also a text like `"2.5"`) counts for every sample: adding `5` to a signal lifts it by 5. At least one operand must be a signal or a list; if they are all numbers the block gives an exception.
- **Length.** The result is as long as the **shortest** signal: the extra samples of the others are dropped. With `[1, 2, 3, 4]` and `[10, 20]` you get 2 samples.
- **fs and time.** All signals must have the **same fs**, otherwise there is an exception (use [Resample](sig.resample) first). The result takes the fs and the start time `t0` of the **first** signal (in the order **a**, **b**, **c**…).
- **Plain lists.** A list takes the fs of **fs of plain lists**: if you mix it with a signal that has another fs (for example 100 Hz with the list at 1000 Hz) you get the fs exception. The imaginary part of a complex signal is not used.
- **Divide.** If a divisor is 0 the block stops with an exception that says the sample.

## A bit of theory

- **Sum.** The system is linear: the spectrum of the sum is the sum of the spectra. Adding two sines of different frequency gives a spectrum with two lines.
- **Product.** Multiplying in time "mixes" the frequencies: `cos(2πf₁t) · cos(2πf₂t) = ½·cos(2π(f₁−f₂)t) + ½·cos(2π(f₁+f₂)t)`. It is the base of amplitude modulation (carrier · message) and of mixers. Multiplying by a window or a constant only changes the amplitude.
- **Mean of several recordings.** If the signals have the same content and independent noise, the mean of N signals lowers the noise amplitude by `√N` and the power by N: the signal-to-noise ratio rises by `10·log₁₀(N)` dB (4 recordings: about +6 dB).
- **Same fs.** Adding sample by sample makes sense only if the samples sit on the same grid of times: that is why the fs must match.

## Examples

### 1. A signal and a constant value

```
[Oscillator (waveform generator)] signal ──▶ a [Add · Multiply signals] signal ──▶ signal [To chart]
[Constant · Variable: 2]          value  ──▶ b
```

With **Add**, a sine from −1 to +1 becomes a sine from 1 to 3. The number 2 counts for every sample.

### 2. A signal plus noise, to try a filter

```
[Oscillator (waveform generator)] signal ──▶ a [Add · Multiply signals] signal ──▶ signal [IIR filter (butter, cheby1, cheby2)]
[Noise (np.random)]               signal ──▶ b
```

The two generators must have the same **sampling rate fs**; the result is as long as the shorter of the two.

### 3. Amplitude modulation

With **Multiply**, **a** = carrier at 1000 Hz and **b** = message at 50 Hz: in the spectrum ([FFT (np.fft.fft)](sig.fft)) the lines at 950, 1000 and 1050 Hz appear, if the message is added to 1 (with a second **Add** block) before the product.

### 4. Numbers

`a` = signal `[1, 2, 3, 4]` at 100 Hz, `b` = `5`: **Add** → `[6, 7, 8, 9]`; **Multiply** with `b` = signal `[1, 0, 1, 0, 9]` → `[1, 0, 3, 0]` (4 samples, the shortest).

## Errors

| Message | When |
|---|---|
| Serve almeno un segnale (gli altri possono essere numeri) ("At least one signal is needed, the others can be numbers") | All the operands are plain numbers. |
| I segnali hanno fs diverse (… e … Hz): usa prima Ricampiona ("The signals have different fs: use Resample first") | Two signals (or a signal and a list at **fs of plain lists**) with different fs. |
| Divisione per zero (campione …) ("Division by zero (sample …)") | With **Divide**, a divisor is 0 in that sample (counted from 1). |
| Il segnale deve essere una lista di numeri o un oggetto { fs, samples } ("The signal must be a list of numbers or an object { fs, samples }") | An operand is neither a number, nor a list, nor a signal. |
| Il segnale: il valore … non è un numero ("The signal: value … is not a number") | A list or a signal holds something that is not a number. |
| Il segnale ha una frequenza di campionamento (fs) non valida ("The signal has an invalid sampling rate (fs)") | A signal with fs 0, negative or not a number. |
| Il segnale ha samples e im di lunghezze diverse ("The signal has samples and im of different lengths") | A complex signal with real and imaginary parts of different length. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) ("Signal too long: … samples, at most …") | A signal longer than the limit (see [Engine limits](logicstudio-engine/limits)). |

## See also

- [Gain · Offset](sig.gain) to multiply or add a constant to a single signal
- [Resample](sig.resample) to bring two signals to the same fs
- [Delay · Trim · Zero-padding](sig.edit) to align or shorten signals
- [Signals](logicstudio-signals), all the blocks of the package
- [How a block works](ide/blocks)
