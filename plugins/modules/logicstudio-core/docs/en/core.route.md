# Route

`core.route` · Logic · [Core blocks](logicstudio-core) · version 1

Sends the value it receives on one of its outputs, the one given by a number on **which**: 1 for the first, 2 for the second…

## Inputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | any | The value to route. It is the only input that starts the block. |
| **which** (`which`) | number | The position of the output, among the added ones: 1 is the first. |

## Outputs

| Port | Type | Description |
|---|---|---|
| (the added outputs) | any | The value, on the chosen output. |
| **Exception** (`error`) | object | When **which** does not point to an output that exists. |

## Added ports

The block starts with no outputs: add them in the **Properties**, **Ports** section, with **Add output**. You can have up to 16 (fewer, if an administrator has lowered the limit of added ports), of type any, named **1**, **2**, **3**… They show in italics on the block; they can be moved up and down and removed.

**which** counts the **position** from the top among the added outputs, not the name. As long as you only add, position and name are the same. If you remove or move an output, the names stay as they were: for example, with the outputs **1**, **2**, **3**, if you remove **2**, **1** and **3** are left, and **3** is chosen with **which** = 2. If you then add another output, the IDE names it **3** again: two outputs with the same name (the second is chosen with **which** = 3). These names cannot be changed: remember that only the order from the top counts. See [How a block works](ide/blocks).

## How it works

Only a value on **value** starts the block. A value on **which** is just remembered: it decides where the values will go **afterwards**, but it sends nothing again (even if "starts it" is on).

When a value arrives, the block:

1. reads the last **which** as a number (with the rules of [Add](core.add): `"2"` is 2, `"2,0"` is 2, `true` is 1) and drops the decimal part: 2.9 is 2;
2. sends the value, as it is (even `null`), on the added output in that position.

If **which** is 0, negative, too large, not a number or not arrived yet, the value goes nowhere and on **Exception** arrives «Non c'è l'uscita …» ("There is no output …") with the value of **which**: for example `Non c'è l'uscita 5`, or `Non c'è l'uscita undefined` if **which** never arrived. To avoid it, give **which** an initial value.

## Examples

### 1. Three consoles for three levels

Add three outputs (**1**, **2**, **3**):

```
[Text field: message]  text  ──▶ value [Route] 1 ──▶ value [Write to console: info]
[Number field: level]  value ──▶ which         2 ──▶ value [Write to console: warnings]
                                               3 ──▶ value [Write to console: errors]
```

With **which** = 2, every message goes to the warnings console. Changing **which** to 3 does not send the last message again: it applies to the messages that arrive afterwards.

### 2. A number from 1 to N

**which** = `"1"` (text) → output **1**. **which** = 3.7 → output **3**. **which** = 0 → `Non c'è l'uscita 0` on the Exception.

### 3. Two paths with a yes/no

A yes/no read as a number is 1 (yes) or 0 (no): **no** therefore gives the error `Non c'è l'uscita false`. To choose between two paths with a yes/no use [If](core.if).

## Errors

| Message | When |
|---|---|
| Non c'è l'uscita … ("There is no output …", with the value of **which**) | **which** does not point to an added output: 0, negative, too large, not a number, or not arrived yet (`undefined`). It also happens if the block has no added outputs. |

## See also

- [Choose](core.select) for the opposite: one of many inputs towards one output
- [Cases](core.switch) to choose the output with a value (a name) instead of a number
- [If](core.if) for only two paths
- [How a block works](ide/blocks)
