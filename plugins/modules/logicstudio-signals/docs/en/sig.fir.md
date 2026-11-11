# FIR filter (firwin)

`sig.fir` · Signals · [Signals](logicstudio-signals) · version 1

Filters a signal with an **FIR** (finite impulse response) filter: low-pass, high-pass, band-pass or band-stop built with the **window** method (like `firwin`), a **moving average**, or **your own coefficients**. A symmetric FIR has **linear phase**: all frequencies are delayed by the same time, so the shape of the signal is not distorted. The block also tells you the delay and sends its coefficients to [Frequency response (freqz, Bode)](sig.response).

## Inputs

| Port | Type | Description |
|---|---|---|
| **signal** (`signal`) | any | The signal to filter: an object `{ fs, t0, samples }` or a list of numbers (taken as a signal at the **fs of plain lists**). The imaginary part `im`, if there is one, is ignored. |
| **coefficients** (`coefficients`) | any | Ready-made coefficients: a list of numbers `b`, or an object `{ b }` (or `{ b, a }` with `a = [1]`). If there is a value, it **wins over all the design settings**. Hidden by default: show it with the eye in Properties. |
| **reset** (`reset`) | pulse | Takes the filter back to zero (no memory of past frames). Hidden by default: show it with the eye in Properties. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **signal** (`signal`) | object | The filtered signal, with the same `fs` and `t0`. If a list came in, a list goes out. |
| **coefficients** (`coefficients`) | object | `{ fs, b, a }`: the `b` coefficients of the filter, `a = [1]` and the `fs` it is worked out for. Hidden by default: show it with the eye in Properties. |
| **delay (s)** (`delay`) | number | The delay of the filter in seconds: `(N − 1) / 2 / fs`, with N the number of coefficients. It goes out with every frame. Hidden by default: show it with the eye in Properties. |
| **Exception** (`error`) | object | Invalid frequencies or coefficients, an invalid signal or one that is too long. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Kind** (`band`) | low-pass, high-pass, band-pass, band-stop, moving average, coefficients of the list | low-pass | Which filter to make. |
| **Coefficients (taps)** (`taps`) | from 1 to 4095 | 101 | How many coefficients. The more, the steeper the cut and the longer the delay. An even number becomes odd (+1), except for the moving average. It does not show with **coefficients of the list**. |
| **Cutoff frequency (Hz)** (`f1`) | more than 0 and less than fs/2 | 100 | The cutoff; in band filters, the **lower** frequency of the band. It shows only with the four pass/stop kinds. |
| **Upper frequency (Hz)** (`f2`) | more than **f1** and less than fs/2 | 200 | The **upper** frequency of the band. It shows only with **band-pass** or **band-stop**. |
| **Window** (`window`) | Rectangular, Hann, Hamming, Blackman, Blackman-Harris, Flat-top, Bartlett, Kaiser, Tukey | Hamming | The window that smooths the coefficients: it decides ripple and steepness. It shows only with the four pass/stop kinds. |
| **Kaiser β** (`beta`) | from 0 to 50 | 8.6 | The parameter of the Kaiser window. It shows only with the **Kaiser** window. |
| **Coefficients b** (`list`) | JSON list | `[0.25, 0.5, 0.25]` | The coefficients to use. It shows only with **coefficients of the list**. |
| **Zero phase (forward and backward, filtfilt)** (`zeroPhase`) | yes / no | no | Filters forward and backward: no delay, but no state between frames. |
| **fs of plain lists (Hz)** (`listFs`) | number more than 0 | 1000 | The sampling rate given to a list of numbers coming in on **signal**. It is also used for the coefficients sent at the start. |

## How it works

- The coefficients are worked out with the `fs` of the signal that comes in; if the `fs` or a setting changes, they are worked out again and the state goes back to zero. The same happens if the value on **coefficients** changes.
- **The state stays between frames**: consecutive frames of the same signal join without jumps. **reset** takes it back to zero.
- The signal comes out **late** by `(N − 1) / 2` samples (it comes out on **delay (s)**): the start is taken by the transient. With **Zero phase**, instead, each frame is filtered **forward and backward**, with the edges extended: no delay, but the filter acts twice and **keeps no state**. (**delay (s)** still goes out, even with Zero phase: in that case it does not apply.)
- **At the start** the block sends the coefficients worked out at the **fs of plain lists**, so [Frequency response (freqz, Bode)](sig.response) can draw them before the signal. Then it sends them with the first signal (at its `fs`) and after every change or **reset**.
- **Low-pass, high-pass, band-pass, band-stop** use a **window** (not rectangular by default: Hamming). **Moving average** has N coefficients all equal to `1/N`. **Coefficients of the list** uses the list written in **Coefficients b** (see also the **coefficients** input).
- If a list of numbers comes in, a list goes out; if a signal comes in, a signal goes out.
- If the parameters are not right, the error comes with the first signal.

## A bit of theory

An FIR filter computes the output from the inputs only: `y[n] = Σ b[k]·x[n−k]`. It has no poles (except at the origin), so it is **always stable**. The coefficients `b` are the filter's **impulse response**: the output is the [convolution](sig.convolve) of the input with `b`.

**Window method**: the ideal response of a low-pass is an infinite `sinc`. You take N samples of it, centred, and multiply them by a window:

`h[n] = (2·fc/fs) · sinc(2·fc/fs · (n − M)) · w[n]`, with `M = (N − 1)/2`

and then divide by the sum, so that the gain at 0 Hz is 1. The high-pass is `δ[n − M] − low-pass`; the band-pass is "low-pass at f2 minus low-pass at f1"; the band-stop is `δ[n − M]` minus the band-pass. The gain at the cutoff is about −6 dB.

**Linear phase**: if `b` is symmetric, the phase is linear and the group delay is constant: `(N − 1)/2` samples, that is `(N − 1)/(2·fs)` seconds. This is why N is odd (the delay is a whole number of samples). The price is the delay.

**Windows**: the rectangular window has the steepest cut but strong ripple and little attenuation out of band; Hamming, Hann, Blackman attenuate more at the price of a wider transition. The width of the transition is about `3.3·fs/N` with Hamming: more coefficients, narrower transition. Kaiser has the parameter β that sets the compromise (default 8.6, about 85 dB of out-of-band attenuation).

**Moving average**: N coefficients equal to `1/N`. It is a crude low-pass, with zeros at every multiple of `fs/N`, that reduces white noise by `√N`.

## Examples

### 1. A linear-phase low-pass

`fs` = 1000 Hz, **Kind** low-pass, **Cutoff frequency** 100, 101 coefficients, Hamming:

```
[Noise (np.random)] signal ──▶ signal [FIR filter (firwin)] signal ──▶ signal or spectrum [To chart] chart data ──▶ data (list or object) [Lines]
                                       delay (s) ──▶ value [Print (console.log)]
```

**delay (s)** sends `0.05` (50 samples = 0.05 s). The response is about 0 dB up to 50 Hz, −6 dB at 100 Hz, −60 dB at 150 Hz.

### 2. A moving average of 5 values

**Kind** moving average, 5 coefficients (`0.2` each), `fs` = 1000 Hz: delay 2 samples = `0.002` s. On `[5, 5, 5, 5, 5, 5, 5]` it gives `[1, 2, 3, 4, 5, 5, 5]`: the output rises while the window fills up.

### 3. My own coefficients

**Kind** coefficients of the list, **Coefficients b** `[0.25, 0.5, 0.25]` (a smoothing). On `[1, 0, 0, 0]` it gives `[0.25, 0.5, 0.25, 0]`: exactly the list, because the input is an impulse. The same coefficients can be given to the **coefficients** input, for example from [Constant · Variable](core.value) or from another block.

### 4. Seeing the response

```
[FIR filter (firwin)] coefficients ──▶ coefficients [Frequency response (freqz, Bode)] response ──▶ signal or spectrum [To chart]
```

## Errors

| Message | When |
|---|---|
| I coefficienti vanno da 1 a 4095 ("The coefficients go from 1 to 4095") | **Coefficients (taps)** outside the range. |
| La frequenza di taglio (… Hz) deve stare tra 0 e fs/2 (… Hz) ("The cutoff frequency must be between 0 and fs/2") | **Cutoff frequency** (or **Upper frequency**) is not more than 0 and less than fs/2. |
| La seconda frequenza deve essere più alta della prima ("The second frequency must be higher than the first") | In band filters, **Upper frequency** is not more than **Cutoff frequency**. |
| Il filtro FIR vuole solo coefficienti b (una lista) ("The FIR filter wants only b coefficients, a list") | A filter with `sos` or with an `a` longer than `[1]` came in on **coefficients**. |
| I coefficienti non sono JSON valido ("The coefficients are not valid JSON") | A text that is not JSON came in on **coefficients**. |
| I coefficienti devono essere una lista (FIR), { b, a } o { sos } ("The coefficients must be a list (FIR), { b, a } or { sos }") | On **coefficients** (or in **Coefficients b**) there is neither a list nor an object with `b`. |
| I coefficienti: il valore N non è un numero ("value N is not a number") | Coefficient number N is not a number. |
| I coefficienti b: il valore N non è un numero ("value N is not a number") | The same, in an object `{ b, a }`. |
| Serve almeno un coefficiente b ("At least one b coefficient is needed") | An object `{ b, a }` has an empty `b` list. |
| Il primo coefficiente a (a0) non può essere 0 ("The first a coefficient (a0) cannot be 0") | An object `{ b, a }` with `a[0]` = 0. |
| Il segnale manca ("The signal is missing") | An empty value (`null`) came in on **signal**. |
| Il segnale deve essere una lista di numeri o un oggetto { fs, samples } ("The signal must be a list of numbers or an object { fs, samples }") | Another kind of value came in. |
| Il segnale ha una frequenza di campionamento (fs) non valida ("The signal has an invalid sampling rate") | `fs` is not more than 0. |
| Il segnale ha samples e im di lunghezze diverse ("samples and im have different lengths") | `im` and `samples` are not the same length. |
| Il segnale: il valore N non è un numero ("value N is not a number") | Sample number N is not a number. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) ("Signal too long: … samples, at most …") | The signal is over the engine's limit (see [Limits](logicstudio-engine/limits)). |

## See also

- [Frequency response (freqz, Bode)](sig.response) to draw magnitude, phase and group delay
- [IIR filter (butter, cheby1, cheby2)](sig.iir) for steeper cuts with fewer coefficients (but non-linear phase)
- [Convolution (np.convolve)](sig.convolve) to apply an impulse response to a whole signal
- [Sample filter (moving average, EMA)](sig.smooth) to smooth single values
- [Window (scipy.signal.get_window)](sig.window) for the windows
- [Signals](logicstudio-signals)
- [Engine limits](logicstudio-engine/limits)
- [How a block works](ide/blocks)
