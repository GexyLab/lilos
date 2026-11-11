# dB ↔ linear

`sig.db` · Signals · [Signals](logicstudio-signals) · version 1

Converts between linear values and decibels: amplitude and power to dB and back, and the absolute scales dBm, dBV and dBu. It works on a number, on a list or on a whole signal.

## Inputs

| Port | Type | Description |
|---|---|---|
| **value, list or signal** (`value`) | any | A number (also a text like `"2.5"`), a list of numbers or a signal `{ fs, samples }`. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | any | The converted value. A number goes out as a number, a list as a list, a signal as a signal (same fs and `t0`). |
| **Exception** (`error`) | object | An input that is not a number, a list or a signal; a signal that is too long. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Conversion** (`op`) | see the table below | Amplitude → dB | Which conversion to do. |
| **Reference (0 dB)** (`ref`) | number more than 0 | 1 | The value that corresponds to 0 dB. It shows only with the first four conversions (amplitude and power). |
| **fs of plain lists (Hz)** (`listFs`) | number more than 0 | 1000 | The sampling rate given to a plain list of numbers coming in. A real signal already carries its fs. |

| Conversion | Formula | Example |
|---|---|---|
| **Amplitude → dB** (`ampToDb`) | `20·log₁₀(x / ref)` | 0.5 → −6.02; 1 → 0; 0.1 → −20 |
| **Power → dB** (`powerToDb`) | `10·log₁₀(x / ref)` | 0.5 → −3.01; 100 → 20 |
| **dB → amplitude** (`dbToAmp`) | `ref · 10^(x/20)` | 20 → 10; −6.02 → 0.5 |
| **dB → power** (`dbToPower`) | `ref · 10^(x/10)` | 20 → 100; 3.01 → 2 |
| **W → dBm** (`wToDbm`) | `10·log₁₀(x / 0.001 W)` | 0.001 → 0; 1 → 30 |
| **dBm → W** (`dbmToW`) | `0.001 · 10^(x/10)` | 0 → 0.001; 20 → 0.1 |
| **V → dBV** (`vToDbv`) | `20·log₁₀(x / 1 V)` | 1 → 0; 0.1 → −20 |
| **dBV → V** (`dbvToV`) | `10^(x/20)` | 0 → 1; 20 → 10 |
| **V → dBu (0.775 V)** (`vToDbu`) | `20·log₁₀(x / 0.7746 V)` | 0.7746 → 0; 1 → 2.218 |
| **dBu → V** (`dbuToV`) | `0.7746 · 10^(x/20)` | 0 → 0.7746; 20 → 7.746 |

## How it works

The block applies the chosen formula to every value that arrives.

- **A number** (or a text that is a number) gives a number. **A list** gives a list (taken at **fs of plain lists**), **a signal** gives a signal with the same `t0` and fs: the formula is applied to each sample.
- **The −300 dB floor.** The logarithm of 0 does not exist: for amplitude 0 (or power 0) the result is **−300 dB**, and no conversion to dB ever goes below −300. A negative value is treated by its absolute value (amplitude `−0.5` → −6.02 dB).
- **Reference.** Only **Amplitude ↔ dB** and **Power ↔ dB** use **Reference**; the dBm, dBV and dBu scales have a fixed reference. With a reference other than 1 you get, for example, dB relative to 20 µPa (`2e-5`, dB SPL) or to a full scale (dBFS: ref = full scale).
- The imaginary part of a complex signal is not kept.

## A bit of theory

- **Why dB.** They measure a *ratio* on a logarithmic scale: multiplying becomes adding, and a huge range of values (from 0.00001 to 100000) fits in a few tens of numbers. The ear and many instruments work logarithmically.
- **20 or 10?** Power is proportional to the square of the amplitude: `P ∝ A²`, so `10·log₁₀(P₂/P₁) = 20·log₁₀(A₂/A₁)`. For amplitudes (voltage, current, pressure, samples) use 20; for powers (W, energy, spectral density) use 10.
- **Values to remember.** ±3 dB = ×1.414 / ×0.707 in amplitude = ×2 / ×0.5 in power (3.01 dB to be exact); ±6 dB = ×2 / ×0.5 in amplitude; ±20 dB = ×10 / ×0.1 in amplitude; ±10 dB = ×10 / ×0.1 in power. The RMS of a sine is −3.01 dB relative to its peak.
- **dBm.** Power relative to 1 mW: 0 dBm = 1 mW, 30 dBm = 1 W.
- **dBV.** Voltage relative to 1 V: 0 dBV = 1 V (RMS).
- **dBu.** Voltage relative to 0.7746 V (`√(0.001 W · 600 Ω)`, the voltage that dissipates 1 mW over 600 Ω): 0 dBu = 0.7746 V RMS, +4 dBu is the "professional" audio signal level.
- **The floor.** A signal at zero has −∞ dB; the block uses −300 dB so as not to send −∞ to charts.

## Examples

### 1. The spectrum in dB, by hand

```
[FFT (np.fft.fft)] magnitude ──▶ value [dB ↔ linear: Amplitude → dB] result ──▶ data [To chart]
```

(If that is enough for you, the spectrum already has its dB in the object coming out of the FFT, and [To chart](sig.toChart) can show them.)

### 2. A power in dBm

```
[Constant · Variable: 0.001] value ──▶ value [dB ↔ linear: W → dBm] result ──▶ value [Print (console.log)]
```

Writes `0` (1 mW is 0 dBm); with 1 W it writes `30`.

### 3. A gain in dB turned linear again

A list `[1, 0.5, 0.1]` with **Amplitude → dB** gives `[0, −6.02, −20]`; the value `0` gives `−300`; the value 20 with **dB → amplitude** gives `10`.

## Errors

| Message | When |
|---|---|
| Il valore manca ("The value is missing") | The block runs without a value on the input. |
| Il valore deve essere una lista di numeri o un oggetto { fs, samples } ("The value must be a list of numbers or an object { fs, samples }") | The input is not a number, a list or a signal (for example a text that is not a number). |
| Il valore: il valore … non è un numero ("The value: value … is not a number") | A list or a signal holds something that is not a number. |
| Il valore ha una frequenza di campionamento (fs) non valida ("The value has an invalid sampling rate (fs)") | A signal with fs 0, negative or not a number. |
| Il valore ha samples e im di lunghezze diverse ("The value has samples and im of different lengths") | A complex signal with real and imaginary parts of different length. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) ("Signal too long: … samples, at most …") | More samples than the limit (see [Engine limits](logicstudio-engine/limits)). |
| Conversione sconosciuta: … ("Unknown conversion") | The conversion saved in the project does not exist (it does not happen when choosing it from the menu). |

## See also

- [Gain · Offset](sig.gain), which also accepts the gain in dB
- [Measures (RMS, peak, mean)](sig.measure), with the RMS also in dB
- [FFT (np.fft.fft)](sig.fft) and [Power spectral density (scipy.signal.welch)](sig.psd), which already give dB
- [Signals](logicstudio-signals), all the blocks of the package
- [How a block works](ide/blocks)
