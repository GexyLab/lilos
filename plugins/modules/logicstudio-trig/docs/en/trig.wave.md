# Wave (sine, square, triangle, sawtooth)

`trig.wave` · Trigonometry · [Trigonometry](logicstudio-trig) · version 1

Gives the value of a wave (sine, cosine, square, triangle or sawtooth): at a time you give it, or at the time that has passed since the program started.

## Inputs

| Port | Type | Description |
|---|---|---|
| **t (seconds)** (`t`) | number | The time in seconds to compute the wave at. A text with a number is fine. |
| **now** (`tick`) | pulse | Computes the wave at the time passed since the program started (in seconds). What arrives does not matter, even `false` or `0`. |

Both ports start the block: link **t** for a time of your own, **now** (usually to an [Interval (setInterval)](core.every)) to follow the clock.

## Outputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | number | The value of the wave. |
| **Exception** (`error`) | object | Hidden by default: show it with the eye in Properties. A value is not a number. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Shape** (`shape`) | Sine, Cosine, Square, Triangle, Sawtooth | Sine | The shape of the wave. |
| **Amplitude** (`amplitude`) | a number | 1 | How far the wave goes up and down from the center. |
| **Frequency (Hz)** (`frequency`) | a number, 0 or more | 1 | How many times the wave repeats in one second. |
| **Phase** (`phase`) | a number | 0 | How far the wave is shifted in time, in the unit chosen below. A positive number brings it forward. |
| **Unit of the phase** (`unit`) | Degrees (°), Radians (rad), Gradians (gon), Turns | Degrees (°) | The unit of the **Phase**. |
| **Offset** (`offset`) | a number | 0 | A number added to the result: it moves the center of the wave. |

## How it works

At every time t the block computes the angle `θ = 360° × frequency × t + phase` (that is one turn per period) and the value

`value = amplitude × shape(θ) + offset`

where `shape(θ)` always goes from −1 to 1, depending on the **Shape**:

| Shape | What it looks like |
|---|---|
| **Sine** | `sin θ`: starts at 0, rises to 1 after a quarter of a period, falls to −1 after three quarters. |
| **Cosine** | `cos θ`: starts at 1, falls to −1 at half a period. |
| **Square** | 1 in the first half of the period and −1 in the second. |
| **Triangle** | Rises and falls in a straight line: starts at 0, reaches 1 after a quarter of a period, −1 after three quarters. |
| **Sawtooth** | Rises in a straight line from −1 to 1 and then goes back to −1 at once: starts at 0, reaches 1 at half a period and jumps to −1. |

- The **period** is `1 ÷ frequency` seconds: at 2 Hz the wave repeats every half second.
- The **Phase** shifts the wave: a sine with phase 90° is a cosine.
- With **now**, time is counted from the start of the program: the first time a pulse arrives the time is the time passed since then. With [Interval (setInterval)](core.every) at 0.1 seconds the block works every tenth of a second.
- With **t** the time is the one you give, even negative; no clock.
- The result is rounded to **15 significant digits**.

## Examples

### 1. A sine at a given time

```
[Constant · Variable: 0.25] value ──▶ t (seconds) [Wave: sine, 1 Hz] value ──▶ value [Print (console.log)]
```

Writes `1` (a quarter of a period). With t = 0.125 it writes `0.707106781186547`.

### 2. A square wave at 2 Hz

**Shape** square, **Amplitude** 5, **Frequency** 2: with t = 0.1 it writes `5`, with t = 0.3 it writes `-5`.

### 3. A shifted triangle

**Shape** triangle, **Amplitude** 10, **Offset** 5, t = 0.125 (an eighth of a period, halfway up): writes `10`.

### 4. The sawtooth and the phase

**Shape** sawtooth: with t = 0.25 it writes `0.5`, with t = 0.75 it writes `-0.5`. A sine with **Phase** 90 and t = 0 writes `1`; with **Phase** 30 it writes `0.5`.

### 5. A wave that follows the clock

```
[Interval (setInterval): 0.1 seconds] pulse ──▶ now [Wave: sine, 1 Hz] value ──▶ value [Print (console.log)]
```

At every pulse the block computes the wave at the time passed since the start. If the times were exact it would write, at 0.1, 0.2 and 0.3 seconds, `0.587785252292473`, `0.951056516295154`, `0.951056516295154`. In practice the pulses arrive with a small delay, so the last digits change.

### 6. A 50 Hz sine

**Frequency** 50, t = 0.001: writes `0.309016994374947`; with t = 0.005 it writes `1`.

## Errors

| Message | When |
|---|---|
| t: serve un numero ("t: a number is needed") | **t** is not a number (for example a text like `"abc"`). |
| Ampiezza e frequenza devono essere numeri ("Amplitude and frequency must be numbers") | **Amplitude** or **Frequency** in Properties are not numbers. |

## See also

- [Interval (setInterval)](core.every) to make pulses arrive at **now**
- [Trigonometric functions (Math.sin, Math.cos…)](trig.fn) for sine and cosine of an angle
- [Convert and normalize an angle](trig.convert)
- [Trigonometry](logicstudio-trig), all the blocks
- [How a block works](ide/blocks)
