# Debounce

`core.debounce` · Time · [Core blocks](logicstudio-core) · version 1

Waits for the values to stop arriving and then sends only the last one. It is useful when a value changes many times in a row (a field while typing, a slider being dragged) and you only care where it stops.

## Inputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | any | The values that arrive, even many in a row. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | any | The last value that arrived, when another has not arrived for **Quiet for** seconds. |
| **Exception** (`error`) | object | In practice it does not happen. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Quiet for (seconds)** (`seconds`) | from 0 to 3600 (one hour), also with decimals | 0.5 | How much time must pass without new values before the last one is sent. |

## How it works

Every value that arrives makes the **wait start again from scratch**:

- If **while it is waiting** a new value arrives, the one that was waiting is **dropped** (it will never come out) and the new one starts waiting a whole **Quiet for** seconds.
- When nothing arrives for **Quiet for** seconds, the last value that arrived comes out, the same as it was.
- After it comes out the block starts from zero again: the next value waits again.

Consequences to know:

- If the values arrive **more often** than **Quiet for** (for example one every 0.2 seconds with **Quiet for** = 0.5), **nothing ever comes out** until they stop.
- With **Quiet for** = 0 the last of the values that arrived **at the same moment** comes out (for example those sent together by a block), and the others are dropped. Values that arrive at different moments all come out.
- A negative number is 0. If the field is left **empty**, it is 0 (not 0.5).
- When the program stops, the value that was waiting is lost.

The block does not stop the program: while it waits, the other blocks go on working.

Comparison with the other time blocks:

| Block | Values that arrive while it waits |
|---|---|
| [Delay (setTimeout)](core.delay) | They all come out, each after its own wait. |
| **Debounce** | Only the last one comes out, after a bit of calm. |
| [Throttle](core.throttle) | The first comes out at once; those too close are dropped. |

For the general rules see [How a block works](ide/blocks).

## Examples

### 1. Three values in a row and one alone

**Quiet for** = 0.3 seconds.

| Arrives | What happens |
|---|---|
| 1 at 0 s | waits |
| 2 at 0.1 s | 1 dropped, 2 waits |
| 3 at 0.2 s | 2 dropped, 3 waits |
| (nothing until 0.5 s) | **3 comes out at 0.5 s** |
| 4 at 1 s | waits |
| (nothing) | **4 comes out at 1.3 s** |

### 2. Search while typing

```
[Text field: search] text ──▶ value [Debounce: 0.5 s] value ──▶ … [HTTP request (fetch)]
```

While the user types, the [Text field](ui.text) sends a value at every key. The search starts only when the user stops for half a second, with the complete text, instead of starting at every letter.

### 3. Save a slider only when it stops

```
[Slider: volume] value ──▶ value [Debounce: 1 s] value ──▶ content [writeFile: ~/volume.txt]
```

Dragging the [Slider](ui.slider) from 10 to 80 dozens of values come out; the file is written just once, with 80, a second after the slider has stopped.

## See also

- [Delay (setTimeout)](core.delay) and [Throttle](core.throttle)
- [On change (edge)](core.edge) to react only when a yes/no changes
- [How a block works](ide/blocks)
