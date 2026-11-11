# Split object

`core.decompose` · Objects · [Core blocks](logicstudio-core) · version 1

Splits an object into its fields: each output you add sends the field with its name.

## Inputs

| Port | Type | Description |
|---|---|---|
| **object** (`object`) | object | The object (or list) to split. |

## Outputs

The block starts **with no outputs** (apart from the Exception): add one output for each field you need (see **Added ports**).

| Port | Type | Description |
|---|---|---|
| **Exception** (`error`) | object | In practice it does not happen: a missing field is not an error. |

## Added ports

In the **Properties**, **Ports** section, with **Add output** you add up to 32 outputs (or fewer, if an administrator has lowered the **Added ports per block, at most** limit). Each output is of type any and starts with the name **field 1**, **field 2**… (in an Italian IDE **campo 1**…): **rename it** with the name of the field to take (up to 60 characters). The ↑ ↓ arrows change the order. See [How a block works](ide/blocks).

The name of an output is a **path**, like the Field of [Get field](core.get): `address.city` takes a field inside a field, `grades.0` the first item of the list `grades`, `grades.length` how many items it has.

## How it works

Every time an object arrives, the block looks for the field of each output and sends it on that output.

- The outputs send **one after the other, from top to bottom**, in the order of the ports. A block linked to several outputs receives the values in that order.
- A field that **is not there** sends nothing on its output, and is **not** an error: the other outputs send all the same.
- A field that is `null` is sent (`null`).
- If something arrives that is neither an object nor a list (a text, a number), nothing comes out. A JSON text must first be transformed with [Convert](core.convert), setting **To** = "from JSON text".
- The rules of the path are those of [Get field](core.get): dots as separators, positions from 0, spaces and upper case that count. A name left as it is (**field 1**) looks for a field that is really called `field 1`.

For the general rules see [How a block works](ide/blocks).

## Examples

In the examples the object that arrives is:

```
{"name": "Ada", "address": {"city": "Rome"}, "grades": [7, 9, 10]}
```

### 1. Four outputs, one that finds nothing

Outputs named `name`, `address.city`, `phone`, `grades.0`:

```
                  name         ──▶ [Write to console]
[Split object]    address.city ──▶ [Write to console]
                  phone        ──▶ [Write to console]
                  grades.0     ──▶ [Write to console]
```

`"Ada"`, `"Rome"` and `7` come out, in this order. Nothing comes out of `phone`, and there is no error.

### 2. Hour and minutes from Date and time

```
[Every… 60 s] pulse ──▶ read [Date and time] parts ──▶ object [Split object] hour   ──▶ hours   [Format text: "{hours}:{minutes}"] text ──▶ value [Write to console]
                                                                              minute ──▶ minutes
```

The outputs are named `hour` and `minute`, like the fields of the **parts** object of [Date and time](core.now). On [Format text](core.format) add two inputs, rename them **hours** and **minutes**, and remove **starts it** from **hours**: `hour` comes out first and stays as a value, `minute` comes out after and makes the line be written, for example `14:5` (the minutes have no zero in front).

### 3. A web answer

```
[Web request] response ──▶ object [Split object] main.temp ──▶ …
                                                  name      ──▶ …
```

If the [Web request](net.request) receives a JSON answer like `{"name": "Rome", "main": {"temp": 18.4}}`, 18.4 and `"Rome"` come out. If the answer arrives as text, put [Convert](core.convert) before it with **To** = "from JSON text".

## See also

- [Get field](core.get) for a single field, with the error if it is missing
- [Build object](core.compose) to do the opposite
- [Map field](coll.pluck) for the same field from every item of a list
- [How a block works](ide/blocks)
