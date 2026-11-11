# If · Else

`core.if` · Logic · [Core blocks](logicstudio-core) · version 1

Sends a value on **then** if the condition is yes, on **else** if it is no. It is the fork of a schema.

## Inputs

| Port | Type | Description |
|---|---|---|
| **condition** (`condition`) | yes/no | Which path to take. |
| **value** (`value`) | any | The value to send along the chosen path. Optional. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **then** (`then`) | any | The value, when the condition is yes. |
| **else** (`else`) | any | The value, when the condition is no. |
| **Exception** (`error`) | object | In practice this block never sends anything here. |

## How it works

Every time something arrives on **condition** or on **value**, the block looks at the last condition and sends the last value on **only one** of the two outputs:

- condition **yes** → **then**;
- condition **no** → **else**.

What it sends:

- the last value that arrived on **value**;
- if nothing ever arrived on **value**, or the last value is `null`, it sends a **pulse** (that is, `true`). This way you can use the If · Else block even without a value, just to start one thing or the other.

The condition is read as yes/no: a text is **no** if, once spaces are removed and ignoring case, it is empty, `0`, `false`, `no` or `off` (any other text is **yes**, even `"falso"`); a number is **no** if it is 0; `null` is **no**; objects and lists are **yes**. If the condition has not arrived yet, it is **no**.

### What starts the block

By default both inputs start it, so:

- when a new **value** arrives, it sends it according to the last condition;
- when a new **condition** arrives, it **sends the last value again** according to the new condition.

If you want the condition to serve only to choose the path (and not send the value again), remove "starts it" from **condition** in the **Properties**. If instead you want it to start only when the condition changes, remove it from **value**. See [How a block works](ide/blocks).

## Examples

### 1. Two different messages

```
[Compare (== != < >): a ≥ b] result ──▶ condition [If · Else] then ──▶ send [Constant · Variable: "adult"] value ──▶ value [Print (console.log)]
                                           else ──▶ send [Constant · Variable: "minor"] value ──▶ value [Print (console.log)]
```

Here the If · Else block has no **value**: at every comparison it sends a pulse on **then** or on **else**, and the pulse starts the right [Constant · Variable](core.value) block: it has its **send** input linked (you show it with the eye next to the port), so it sends its value only at every pulse. With age 20 the console writes `adult`, with 15 `minor`. (You get the same with the **if true** and **if false** outputs of the [Compare (== != < >)](core.compare) block.)

> If you link the pulse straight to [Print (console.log)](core.consoleWrite), the console writes `true`: a pulse is the value yes.

### 2. A filter: let only valid values through

Remove "starts it" from **condition**:

```
[Switch: record] value ──▶ condition [If · Else] then ──▶ value [Print (console.log)]
[Slider: level]  value ──▶ value
```

Every movement of the slider arrives on **value**. If the [Switch](ui.toggle) is on, the value goes to the console; if it is off, it goes to **else**, which is not linked, and is lost. Turning the switch on or off does not send anything again.

Without removing "starts it", turning the switch on would immediately send the last value of the slider to the console.

### 3. A value that arrives before the condition

The first value arrives (for example 42) and the condition has not arrived yet: it is **no**, and 42 goes to **else**. If you want the path to be **then** at the beginning, give **condition** the initial value `true`.

### 4. The case of the null value

If `null` arrives on **value** (for example from an empty [Store (set · get)](core.store) block), the If · Else block does not send `null` but a pulse, that is `true`. Whoever receives sees **yes** instead of an empty value: keep this in mind if the values that pass can be empty.

## Errors

This block has no errors of its own.

## See also

- [Compare (== != < >)](core.compare) to get the condition
- [Switch · Case](core.switch) for more than two paths, depending on the value
- [Route by index (DEMUX)](core.route) to send a value to one of many outputs
- [NOT](core.not), [AND](core.and), [OR](core.or)
- [How a block works](ide/blocks)
