# Sequence

`core.sequence` · Logic · [Core blocks](logicstudio-core) · version 1

At every pulse on **start**, it sends a pulse on each of its outputs, one after the other, from top to bottom.

## Inputs

| Port | Type | Description |
|---|---|---|
| **start** (`start`) | pulse | Any value that arrives here starts the sequence. |

## Outputs

| Port | Type | Description |
|---|---|---|
| (the added outputs) | pulse | One pulse each, in order. |
| **Exception** (`error`) | object | In practice this block never sends anything here. |

## Added ports

The block starts with no outputs: add them in the **Properties**, **Ports** section, with **Add output**. You can have up to 16 (fewer, if an administrator has lowered the limit of added ports), of type pulse, named **1**, **2**, **3**… They show in italics on the block. You can move them up and down: the order of the pulses is the one from the top, not the one of the names. See [How a block works](ide/blocks).

## How it works

When something arrives on **start** (any value, even `false`), the block sends a pulse on the first added output, then on the second, and so on up to the last.

What "one after the other" means:

- The pulses **start** in order, right one after the other: the block linked to **1** receives its pulse before the one linked to **2**.
- The Sequence **does not wait** for what you linked to **1** to finish: if **1** starts a long job (a web request, a wait, a question in the console), **2** goes off all the same right after. The blocks work independently.
- If you need step 2 to start only **after** step 1 has finished, link the end output of step 1 (for example **written** of [Write to console](core.consoleWrite)) to the start of step 2, instead of using the Sequence.

Without added outputs, the block does nothing.

## Examples

### 1. Prepare a window at start

```
[At start] pulse ──▶ start [Sequence] 1 ──▶ send [Value: 0]       value ──▶ value [Gauge: level]
                                      2 ──▶ send [Value: "Ready"] value ──▶ text [Label: status]
                                      3 ──▶ send [Value: true]    value ──▶ enabled [Button: Start]
```

At start the three [Value](core.value) blocks (with **Send at start** removed) go off in this order: first the [Gauge](ui.gauge) goes back to 0, then the [Label](ui.label) shows `Ready`, then the [Button](ui.button) can be pressed.

### 2. Clear the console and then write

```
[Button: New round] pressed ──▶ start [Sequence] 1 ──▶ clear [Write to console]
                                                  2 ──▶ send [Value: "--- new round ---"] value ──▶ value [Write to console]
```

At every click the pulse **1** clears the main console and the pulse **2** writes the starting line there. Clearing is a quick operation, so the line arrives after the clearing; with a slow step 1 (a web request, a wait) the order of the results would not be guaranteed.

### 3. Change the order

With the outputs **1**, **2**, **3**, move **3** to the top in the Properties: the order of the pulses becomes **3**, **1**, **2**.

## Errors

This block has no errors of its own.

## See also

- [Wait for all](core.join) to start when several things are finished
- [At start](core.onStart) and [Every…](core.every) to start a sequence
- [Wait](core.delay) to put a pause between two steps
- [How a block works](ide/blocks)
