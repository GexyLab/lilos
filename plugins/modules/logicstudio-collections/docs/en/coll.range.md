# Range

`coll.range` · Lists · [Lists and matrices](logicstudio-collections) · version 1

Makes a list of numbers from one value to another, with a step: for example 0, 1, 2, 3, 4, 5.

## Inputs

| Port | Type | Description |
|---|---|---|
| **from** (`from`) | number | The first number. Optional: if nothing arrives it is 0. |
| **to** (`to`) | number | Where to stop. Required. |
| **step** (`step`) | number | How much to add each time. Optional: if nothing arrives it is 1. It can be negative or have a decimal part, but not zero. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | list | The numbers from **from** toward **to**, **step** apart. |
| **Exception** (`error`) | object | An input is not a number, step zero, list too long. |

## Settings

| Setting | Values | Default | Description |
|---|---|---|---|
| **Include the last value** (`inclusive`) | on, off | on | On: if **to** is reached exactly, it is in the list. Off: **to** stays out. |

## How it works

The block waits until it has **to**; **from** and **step** are optional. At every new value on any of the three inputs it makes the list again.

The list starts at **from** and adds **step** until it goes past **to**:

- if you land **exactly** on **to**, **to** is there only with **Include the last value** on: `from 1, to 10, step 3` gives `[1, 4, 7, 10]` (on) or `[1, 4, 7]` (off);
- if you do not land on it exactly, the last number is the one before going past **to**, with the setting on or off: `from 0, to 1, step 0.3` gives `[0, 0.3, 0.6, 0.9]`;
- if **to** is on the wrong side with respect to the step, the list is **empty** (without error): `from 5, to 1` with step 1 gives `[]`. To count backwards use a negative step: `from 5, to 1, step -1` gives `[5, 4, 3, 2, 1]`. Also `to -2` with the default from and step gives `[]`;
- with **from** equal to **to** the list is `[from]` (setting on) or `[]` (off).

Other details:

- Numbers with a decimal part are cleaned of calculation errors: `from 0, to 1, step 0.1` gives `[0, 0.1, 0.2, …, 0.9, 1]` and not `0.30000000000000004`. To do this every number is rounded to 12 significant digits: with very large numbers (more than 12 digits, for example 1234567890123) the values come out rounded and wrong.
- The values are converted to numbers: `"1,5"` is worth 1.5, `true` is worth 1, `""` and `null` are worth 0. A text like `"dieci"` gives «Serve un numero» ("A number is needed").
- The list can have at most 100000 numbers: `to 100000` (from 0, step 1, setting on) would make 100001 numbers and gives «Lista troppo grande (massimo 100000 elementi)» ("List too big (maximum 100000 items)"); `to 99999`, or `to 100000` with the setting off, is fine.

## Examples

### 1. From 0 to 5

```
[Constant · Variable: 5] value ──▶ to [Range] result ──▶ value [Print (console.log)]
```

It writes `[0,1,2,3,4,5]`. With **Include the last value** off: `[0,1,2,3,4]`.

### 2. Repeating something N times

```
[Number field: how many times] value ──▶ to [Range (from = 1)] result ──▶ list [For each] item ──▶ value [Print (console.log)]
[Button: Go]                   pressed ──▶ start [For each]
```

Give **from** the starting value 1. With 3 in the [Number field](ui.number) and a click on the [Button](ui.button), [For each](coll.forEach) sends 1, 2, 3 and the console writes them one per line.

### 3. An axis of values for a chart

`from 0, to 2, step 0.25` gives `[0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]`: nine points to draw a function.

## Errors

| Message | When |
|---|---|
| Serve un numero (A number is needed) | **from**, **to** or **step** cannot be converted to a number. |
| Il passo non può essere zero (The step cannot be zero) | **step** is 0. |
| Lista troppo grande (massimo 100000 elementi) (List too big, maximum 100000 items) | The list would have more than 100000 numbers. |

## See also

- [For each](coll.forEach), [Sum · Min · Max · Avg](coll.stat)
- [Counter (++ −−)](core.counter) to count one number at a time
- [How a block works](ide/blocks)
