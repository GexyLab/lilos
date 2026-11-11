# Interval (setInterval)

`core.every` · Time · [Core blocks](logicstudio-core) · version 1

Sends a pulse at regular intervals, for example every 30 seconds. It is turned on and off with the input **on**.

## Inputs

| Port | Type | Description |
|---|---|---|
| **on** (`on`) | yes/no | **yes** turns the pulses on, **no** stops them. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **pulse** (`tick`) | pulse | A pulse (the value yes) at every interval. |
| **Exception** (`error`) | object | In practice it does not happen. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Every (seconds)** (`seconds`) | from 0.05 to 86400 (24 hours), also with decimals | 30 | How much time passes between one pulse and the next. |
| **Starts on its own** (`atStart`) | yes / no | yes | If checked, the pulses begin as soon as the program starts. If removed, the block waits for a **yes** on **on**. |

## How it works

### When it starts and when it stops

- With **Starts on its own** checked, the pulses begin when the program starts. The **first pulse arrives after a whole interval**, not at once: with 30 seconds, the first comes out 30 seconds after the start. If you need a pulse at once too, link an [On start (main)](core.onStart) block to the same block as well.
- A **yes** on **on** turns the pulses on. If they were already on, **nothing changes**: the rhythm does not start again from scratch.
- A **no** on **on** stops them. A later **yes** turns them on again, and the first pulse arrives again after a whole interval.
- When the program stops, the pulses stop.

What counts as **no** on **on**: `false`, the number 0, `null` and the texts empty, `0`, `false`, `no`, `off` (ignoring case and spaces at the sides). **Everything else counts as yes**, even a pulse and even the text `falso`. This is why you can link to **on** the output of a [Button](ui.button) (pressed = yes) to turn on, and a [Switch](ui.toggle) to turn on and off.

If you remove **starts it** from the input **on**, what arrives there no longer has any effect.

The **initial value** of **on** arrives right after the start: with **Starts on its own** checked and initial value `false`, the pulses start and stop at once, that is, they do not start.

### The rhythm

- The interval is counted **from when the pulses started**, not from the clock: with 60 seconds the pulses do not arrive "on the dot of the minute", but 60 seconds from each other starting from the moment they were turned on.
- The shortest interval is **50 milliseconds** (0.05 seconds): a smaller value is brought to 0.05. Watch out: if the **Every (seconds)** field is left **empty**, it is 0 and therefore 0.05 seconds, that is 20 pulses a second.
- The rhythm is not very precise: if the computer is very busy a pulse can arrive a little late.
- Every pulse makes the linked blocks work. A program that makes more than 10000 block runs in 10 seconds (by default) is stopped: with very short intervals and many linked blocks you get there quickly. See [Limits](logicstudio-engine/limits).

For the general rules see [How a block works](ide/blocks).

## Examples

### 1. A clock in the console

```
[Interval (setInterval): 1 s] pulse ──▶ read [Now (date and time)] ISO ──▶ value [Print (console.log)]
```

From second 1 on, the console writes a line a second, for example `2026-11-11T14:05:01.003Z`.

### 2. A check that is turned on and off from a window

```
[Switch: check] value ──▶ on [Interval (setInterval): 10 s] pulse ──▶ check [exists: ~/Documents/order.txt] …
```

**Starts on its own** removed. As long as the [Switch](ui.toggle) of the window is on, every 10 seconds the program checks whether the file is there; turning it off, the checks stop.

### 3. A countdown

```
[Interval (setInterval): 1 s] pulse ──▶ down [Counter (++ −−): Start from 10] count ──▶ a [Compare (== != < >): a ≤ b, b = 0] if true ──▶ send [Constant · Variable: yes/no "no"] value ──▶ on [Interval (setInterval): 1 s]
                                                      count ──▶ value [Print (console.log)]
```

On the [Compare (== != < >)](core.compare) block the input **b** has the initial value 0 and **starts it removed**: otherwise at start Compare would run with **a** still empty (which is 0), find 0 ≤ 0 and turn everything off before the first pulse.

The link goes back to the first block: it is a loop, but it is fine because it goes through an [Interval (setInterval)](core.every) block that slows it down. The console writes 9, 8, … 0, then the pulses stop.

The [Constant · Variable](core.value) block has its **send** input linked (you show it with the eye next to the port, in the **Properties**): that is why it sends its "no" only when the pulse arrives, and not at start.

### 4. A pulse at once and then every minute

```
[On start (main)]   pulse ──▶ read [Now (date and time)] …
[Interval (setInterval): 60 s] pulse ──▶ read
```

## See also

- [On start (main)](core.onStart)
- [Delay (setTimeout)](core.delay), [Debounce](core.debounce), [Throttle](core.throttle)
- [Now (date and time)](core.now)
- [Counter (++ −−)](core.counter)
- [How a block works](ide/blocks)
