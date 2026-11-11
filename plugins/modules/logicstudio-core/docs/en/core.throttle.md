# Throttle

`core.throttle` · Time · [Core blocks](logicstudio-core) · version 1

Lets at most one value through every so many seconds: the first goes through at once, those that arrive too soon after it are dropped.

## Inputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | any | The values that arrive. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | any | The values let through, at once and unchanged. |
| **Exception** (`error`) | object | In practice it does not happen. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Seconds** (`seconds`) | from 0 to 3600 (one hour), also with decimals | 1 | The minimum time between two values that go through. |

## How it works

- The **first value** that arrives goes through **at once**.
- Every value that arrives **less than Seconds after the last value that went through** is **dropped**: it comes out neither now nor later. The block keeps nothing aside.
- The first value that arrives when at least **Seconds** have passed since the last one that went through, goes through at once, and the count starts again from it.
- The time is counted from the **last value that went through**, not from the last that arrived: dropped values do not lengthen the wait.
- With **Seconds** = 0 they all go through. If the field is left **empty**, it is 0.

Watch out: since values that are too close are dropped, **the last value of a burst can be lost**. If you need the last one too, add a [Debounce](core.debounce) in parallel (see example 3).

Comparison with the other time blocks:

| Block | Values that arrive while it waits |
|---|---|
| [Delay (setTimeout)](core.delay) | They all come out, each after its own wait. |
| [Debounce](core.debounce) | Only the last one comes out, after a bit of calm. |
| **Throttle** | The first comes out at once; those too close are dropped. |

For a number that must stay between a minimum and a maximum there is [Clamp](core.clamp) instead (Math category). For the general rules see [How a block works](ide/blocks).

## Examples

### 1. A value every 0.1 seconds

**Seconds** = 0.3. The values from 1 to 8 arrive, one every 0.1 seconds:

| Arrives | Goes through? |
|---|---|
| 1 at 0 s | yes (the first) |
| 2 at 0.1 s, 3 at 0.2 s | no |
| 4 at 0.3 s | yes (0.3 s have passed since 1) |
| 5 at 0.4 s, 6 at 0.5 s | no |
| 7 at 0.6 s | yes |
| 8 at 0.7 s | no, and it is lost |

### 2. No more than one notification a minute

```
[Compare (== != < >): temperature > 30] if true ──▶ value [Throttle: 60 s] value ──▶ send [Notify: "It is hot!"]
```

Even if the temperature stays above 30 and a reading arrives every 5 seconds, you receive a [Notify](lilos.notify) at most once a minute.

### 3. Update often, but without losing the last value

```
[Slider] value ──▶ value [Throttle: 0.2 s] value ──▶ value [Gauge]
         value ──▶ value [Debounce: 0.3 s]        value ──▶ value [Gauge]
```

While the [Slider](ui.slider) moves, the [Gauge](ui.gauge) updates 5 times a second; when it stops, the Debounce block sends the last position, which might otherwise have been dropped.

## See also

- [Delay (setTimeout)](core.delay) and [Debounce](core.debounce)
- [Clamp](core.clamp) to keep a number between two values
- [How a block works](ide/blocks)
