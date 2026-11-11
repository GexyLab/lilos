# On start (main)

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

So in an active program the pulse can arrive **several times in the life of the program**: once at every restart. If the block is there to do something just once forever (for example create a file), first check whether it has already been done, for example with [exists](lilos.exists).

### Before the initial values

The pulse goes off **before** the inputs of the blocks receive their **initial values**. A block linked straight to the On start (main) block can therefore run a first time without its initial values, and then another time when the initial value arrives (if that input **starts it**).

For example, with [Concat text](core.concat) that has the initial value `"X"` on **a** and the On start (main) block linked to **b**, the console first writes `true` and then `Xtrue`.

To make it run just once with all the initial values:

1. put a [Delay (setTimeout)](core.delay) block with **Seconds** = 0 between the On start (main) block and the block: the pulse arrives right after the initial values;
2. remove **starts it** from the inputs that have the initial value.

With these two things the example above writes only `Xtrue`.

### Several On start (main) blocks

You can put several On start (main) blocks, even in different schemas: each sends its own pulse. The order among them is not guaranteed: if several things must happen in a precise order, use a single On start (main) block and a [Sequence (then)](core.sequence) block.

For the general rules see [How a block works](ide/blocks).

## Examples

### 1. A message at start

```
[On start (main)] pulse ──▶ send [Constant · Variable: text "Program started"] value ──▶ value [Print (console.log): information]
```

At every start the console writes `Program started`. You get the same with the [Constant · Variable](core.value) block alone, with nothing linked to **send** (so it sends the value once when the schema starts); On start (main) is useful when the same block must also start for other reasons: with a link on **send**, the block sends only at every pulse, and the pulse of On start (main) gives it its start too.

### 2. A question to the user as soon as it starts

```
[On start (main)] pulse ──▶ ask [Input (readline): "What is your name?"] value ──▶ … 
```

As soon as the program starts, the console asks the question.

### 3. Three things in order

```
[On start (main)] pulse ──▶ start [Sequence (then)] 1 ──▶ clear [Print (console.log)]
                                      2 ──▶ read  [Now (date and time)] ISO ──▶ value [Print (console.log)]
                                      3 ──▶ on    [Interval (setInterval): 10 s]
```

The [Sequence (then)](core.sequence) block has three added outputs, **1**, **2** and **3**. At start the console is cleared, then it writes the date and time, then an [Interval (setInterval)](core.every) starts that had **Starts on its own** removed (the pulse counts as yes, so it turns it on).

## See also

- [Interval (setInterval)](core.every) for pulses that repeat
- [Constant · Variable](core.value), which sends by itself at start if **send** is not linked
- [Sequence (then)](core.sequence)
- [Testing and active programs](ide/run)
- [How a block works](ide/blocks)
