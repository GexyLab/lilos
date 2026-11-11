# Switch · Case

`core.switch` · Logic · [Core blocks](logicstudio-core) · version 1

Compares a value with a list of cases, each with its own output, and sends a pulse on the output of the equal case; if no case is equal, on **otherwise**.

## Inputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | any | The value to recognize. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **otherwise** (`else`) | pulse | A pulse when the value is not equal to any case. |
| (the added outputs) | pulse | A pulse when the value is equal to the name of the output. |
| **Exception** (`error`) | object | In practice this block never sends anything here. |

## Added ports

In the **Properties**, **Ports** section, with **Add output** you add the cases: up to 32 outputs (fewer, if an administrator has lowered the limit of added ports), of type pulse. At first they are named **case 1**, **case 2**… (in an Italian IDE **caso 1**, **caso 2**…): **rename them** in the Properties with the value to recognize, for example `rosso`, `giallo`, `verde`. The name can be up to 60 characters long; spaces at the start and at the end are removed. You can move the cases up and down and remove them with **Remove**. They show in italics on the block. See [How a block works](ide/blocks).

## How it works

At every value that arrives, the block writes it as text and looks, among the added outputs and **in the order they are in**, for the first one that has **exactly** that name. If it finds it, it sends a pulse there; if not, it sends a pulse on **otherwise**. Only one pulse is ever sent.

The comparison is between texts, letter by letter:

- upper case counts: `Rosso` is not the case `rosso`;
- spaces count: `"rosso "` is not the case `rosso`;
- numbers are written with the dot and without useless zeros: 3 finds the case `3`, but not `3.0` nor `03`; 2.5 finds the case `2.5` (not `2,5`);
- yes/no are written `true` and `false`: to recognize them, name the cases `true` and `false`;
- `null` is the empty text: it finds no case (a case cannot have an empty name) and goes to **otherwise**;
- objects and lists are written as JSON (for example `[1,2]`).

The block sends **a pulse**, not the value. If you need the value too, link it also to the input of the block that starts with the pulse (with "starts it" removed), or use [Route by index (DEMUX)](core.route).

If two cases have the same name, the first from the top wins.

## Examples

### 1. A traffic light

Add three outputs and name them `rosso`, `giallo`, `verde`:

```
[Selection: color] value ──▶ value [Switch · Case] rosso     ──▶ send [Notify: Stop]
                                           giallo    ──▶ send [Notify: Slow down]
                                           verde     ──▶ send [Notify: Go]
                                           otherwise ──▶ send [Constant · Variable: "unknown color"] value ──▶ value [Print (console.log)]
```

If the [Selection](ui.select) sends `giallo`, the notification **Slow down** goes off. If it sends `blu`, **otherwise** goes off and the console writes `unknown color`.

### 2. Commands typed in the console

```
[Input (readline)] value ──▶ text [String functions: lower case] result ──▶ value [Switch · Case]
```

With the cases `avvia`, `ferma`, `stato`: if the user writes `AVVIA`, the text becomes `avvia` and the output **avvia** goes off. Going through [String functions](core.text) is there to ignore upper case; with **trim spaces** you can also ignore spaces.

### 3. Numbers

Cases `1`, `2`, `3`. The number 2 arrives → output **2**. The text `"2"` arrives → output **2** (it is the same text). 2.0 arrives → output **2** (the number 2.0 is written `2`). `"2.0"` (text) arrives → **otherwise**.

## Errors

This block has no errors of its own.

## See also

- [If · Else](core.if) for only two paths
- [Route by index (DEMUX)](core.route) to send the value itself to one of many outputs, chosen with a number
- [Pick by index (MUX)](core.select) for the opposite: choosing one of many inputs
- [String functions](core.text) to prepare the value (lower case, spaces)
- [How a block works](ide/blocks)
