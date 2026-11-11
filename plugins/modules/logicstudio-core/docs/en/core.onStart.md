# At start

`core.onStart` · Time · [Core blocks](logicstudio-core) · version 1

Sends a pulse, just once, when the program starts.

## Inputs

None.

## Outputs

| Port | Type | Description |
|---|---|---|
| **pulse** (`pulse`) | pulse | A pulse (the value yes) as soon as the program starts. |
| **Exception** (`error`) | object | In practice it does not happen. |

## How it works

The block sends **a single pulse** for each start of the program, and then does nothing more. The program "starts" when:

- you press **Test** (or **F5**) in the IDE;
- you press **Activate**, or **Replace** an active program;
- an active program starts again by itself because the computer where lilOS runs has started again;
- an app made with **Make app** is opened.

So in an active program the pulse can arrive **several times in the life of the program**: once at every restart. If the block is there to do something just once forever (for example create a file), first check whether it has already been done, for example with [Exists](lilos.exists).

### Before the initial values

The pulse goes off **before** the inputs of the blocks receive their **initial values**. A block linked straight to At start can therefore run a first time without its initial values, and then another time when the initial value arrives (if that input **starts it**).

For example, with [Join text](core.concat) that has the initial value `"X"` on **a** and At start linked to **b**, the console first writes `true` and then `Xtrue`.

To make it run just once with all the initial values:

1. put a [Wait](core.delay) block with **Seconds** = 0 between At start and the block: the pulse arrives right after the initial values;
2. remove **starts it** from the inputs that have the initial value.

With these two things the example above writes only `Xtrue`.

### Several At start blocks

You can put several At start blocks, even in different schemas: each sends its own pulse. The order among them is not guaranteed: if several things must happen in a precise order, use a single At start and a [Sequence](core.sequence).

For the general rules see [How a block works](ide/blocks).

## Examples

### 1. A message at start

```
[At start] pulse ──▶ send [Value: text "Program started"] value ──▶ value [Write to console: information]
```

At every start the console writes `Program started`. You get the same with the [Value](core.value) alone and **Send at start** checked; At start is useful when the same block must also start for other reasons (with **Send at start** removed and other links on **send**).

### 2. A question to the user as soon as it starts

```
[At start] pulse ──▶ ask [Read from console: "What is your name?"] value ──▶ … 
```

As soon as the program starts, the console asks the question.

### 3. Three things in order

```
[At start] pulse ──▶ start [Sequence] 1 ──▶ clear [Write to console]
                                      2 ──▶ read  [Date and time] ISO ──▶ value [Write to console]
                                      3 ──▶ on    [Every… 10 s]
```

The [Sequence](core.sequence) has three added outputs, **1**, **2** and **3**. At start the console is cleared, then it writes the date and time, then an [Every…](core.every) starts that had **Starts on its own** removed (the pulse counts as yes, so it turns it on).

## See also

- [Every…](core.every) for pulses that repeat
- [Value](core.value) with **Send at start**
- [Sequence](core.sequence)
- [Testing and active programs](ide/run)
- [How a block works](ide/blocks)
