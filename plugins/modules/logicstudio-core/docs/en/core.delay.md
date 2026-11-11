# Wait

`core.delay` · Time · [Core blocks](logicstudio-core) · version 1

Sends every value that arrives out after a number of seconds, without changing it.

## Inputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | any | The value to make wait. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | any | The same value, after the wait. |
| **Exception** (`error`) | object | In practice it does not happen. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Seconds** (`seconds`) | from 0 to 86400 (24 hours), also with decimals | 1 | How long each value waits before coming out. |

## How it works

Every value that arrives **waits on its own** and then comes out, the same as it arrived.

- **If other values arrive while one is waiting**, none is lost and no wait starts again: each value comes out **Seconds** after *its* arrival. Since the wait is the same for all, they come out **in the same order** they arrived and with the same distances between them.
- The block **does not stop the program**: while the values wait, the other blocks (and the Wait itself, for new values) go on working.
- With **Seconds** = 0 the value comes out right after the blocks have finished the work they were doing at that moment. It is useful to make a value arrive "after" the others: for example after the initial values (see [At start](core.onStart)).
- A negative number is 0. If the **Seconds** field is left **empty**, it is 0 (not 1).
- When the program stops, the values that were waiting are **lost**. This also applies to an active program that starts again with the computer: a long wait does not survive the restart.
- There is no limit to how many values can wait together: many values arriving with a long wait all stay in memory until they come out.

If you want a new value to **replace** the one that is waiting, use [Settle](core.debounce); if you want to **drop** values that are too close, use [At most every](core.throttle).

For the general rules see [How a block works](ide/blocks).

## Examples

### 1. Three values close together

**Seconds** = 0.3. The values 1 at time 0, 2 after 0.1 seconds and 3 after 0.2 seconds arrive:

| Arrives | Comes out |
|---|---|
| 1 at 0 s | 1 at 0.3 s |
| 2 at 0.1 s | 2 at 0.4 s |
| 3 at 0.2 s | 3 at 0.5 s |

### 2. A lamp that turns off by itself

Two links start from the same Button:

```
[Button: Call] pressed ──▶ on [Lamp]
               pressed ──▶ value [Wait: 5 s] value ──▶ send [Value: yes/no "no"] value ──▶ on [Lamp]
```

At the click the [Lamp](ui.lamp) turns on (pressed is yes) and 5 seconds later it turns off. With two clicks 2 seconds apart, the lamp turns off 5 seconds after the **first** click (at second 5) and then receives another "no" at second 7. If you want it to stay on for 5 seconds after the **last** click, use [Settle](core.debounce) instead of Wait.

### 3. Try again after an error

```
[Web request] Exception ──▶ value [Wait: 10 s] value ──▶ send [Web request]
```

If the [Web request](net.request) fails, it tries again by itself 10 seconds later. Watch out: if it never succeeds, it tries again forever every 10 seconds.

## See also

- [Settle](core.debounce) and [At most every](core.throttle)
- [Every…](core.every)
- [How a block works](ide/blocks)
