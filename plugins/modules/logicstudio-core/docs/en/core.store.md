# Store (set · get)

`core.store` · Values · [Core blocks](logicstudio-core) · version 1

Keeps a value aside and sends it when you ask. It is the "variable" of a schema (the alternative is [Constant · Variable](core.value), which becomes a variable too when **set** is linked): you write it with **set**, read it with **read**, empty it with **clear**.

## Inputs

| Port | Type | Description |
|---|---|---|
| **set** (`set`) | any | The value to keep. It replaces the previous one. |
| **read** (`get`) | pulse | Any value that arrives here makes the block send the kept value. |
| **clear** (`clear`) | pulse | Any value that arrives here deletes the kept value. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | any | The kept value, when **read** arrives (or at once, with **Send when set**). |
| **Exception** (`error`) | object | In practice this block never sends anything here. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Send when set** (`echo`) | yes / no | no | If checked, every value that arrives on **set** is also sent at once on **value**. |

## How it works

The block reacts in a different way depending on the input that starts it:

| Arrives on | What it does | What it sends on **value** |
|---|---|---|
| **set** | Keeps the value that arrived (any type, even `null`). | Nothing; with **Send when set**, the value just kept. |
| **read** | Nothing. | The kept value; if it is empty (never set or cleared), `null`. |
| **clear** | Deletes the kept value. | Nothing. |

Things to know:

- **Send when set** sends the value **every time** it arrives on **set**, even if it is the same as before.
- On **read** and **clear** all that matters is that something arrives: the value that arrives is ignored.
- The memory **starts empty at every start** of the program and is not saved: when the program stops, the value is lost. For a value that stays, write it to a file with the [lilOS](logicstudio-lilos) blocks.
- An initial value on **set** (in the **Properties**) fills the memory at the start.
- Do not remove "starts it" from **set**: the block keeps a value only when **set** is the one that starts it. Without "starts it", the values that arrive there are not kept.
- Objects and lists are kept as they arrive.

See also [How a block works](ide/blocks).

## Examples

### 1. Remember the last text written and show it on request

```
[Text field: name] text    ──▶ set [Store (set · get)] value ──▶ value [Print (console.log)]
[Button: Show]     pressed ──▶ read
```

The user writes `Ada` in the [Text field](ui.text): the Store (set · get) block keeps it, without sending it. When they press **Show**, the console writes `Ada`. If they press **Show** before writing anything, the block sends `null` and the console writes an empty line.

### 2. The last value, every 10 seconds

A value changes many times a second, but you want to write it only every 10 seconds:

```
[Slider: level] value ──▶ set [Store (set · get)] value ──▶ value [Print (console.log)]
[Interval (setInterval): 10 s]  pulse ──▶ read
```

The [Slider](ui.slider) updates the Store (set · get) block at every movement; [Interval (setInterval)](core.every) makes it read every 10 seconds. If in those 10 seconds the user moves the slider to 20, then 35, then 42, the console writes only `42`.

With **Send when set** checked, instead, the console would also write `20`, `35` and `42` at every movement.

### 3. A value that resets

```
[Button: Reset] pressed ──▶ clear [Store (set · get)]
```

After **Reset**, a **read** sends `null` until a new **set** arrives.

## Errors

This block has no errors of its own.

## See also

- [Constant · Variable](core.value) for a fixed value
- [Counter (++ −−)](core.counter) for a number that goes up and down
- [On change (edge)](core.edge) to know when a yes/no changes
- [How a block works](ide/blocks)
