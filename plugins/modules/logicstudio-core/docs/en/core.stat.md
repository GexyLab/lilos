# Min · Max · Avg

`core.stat` · Math · [Core blocks](logicstudio-core) · version 1

Among two or more numbers, sends the smallest, the largest or the average.

## Inputs

| Port | Type | Description |
|---|---|---|
| **a** | number | The first number. |
| **b** | number | The second number. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | number | The minimum, the maximum or the average of the valid numbers. |
| **Exception** (`error`) | object | In practice this block never sends anything here. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Operation** (`op`) | minimum, maximum, average | average | **minimum**: the smallest number; **maximum**: the largest; **average**: the sum divided by how many there are. |

## Added ports

In the **Properties**, **Ports** section, you can add up to 16 more inputs (fewer, if an administrator has lowered the limit of added ports), of type number, named with the following letters: **c**, **d**, **e**… up to **r**. They show in italics on the block. See [How a block works](ide/blocks).

## How it works

Every time a value arrives on an input, the block takes the last value of each input, keeps only those that are numbers and sends the result on **result**.

- Inputs that have not received anything yet do not count.
- Values are converted to numbers with the same rules as [Add (+)](core.add): `"2,5"` is 2.5; `true` is 1 and `false` is 0; **an empty text and `null` are 0** (and so they count, for example they lower the average).
- **Unlike the Add (+) block**, values that cannot be converted (`"ciao"`, an object) are **skipped** without an error: the average of 4, `"abc"` and 10 is 7 (that is (4 + 10) ÷ 2).
- If no valid number is left, the block sends nothing.
- The average can have many decimals (the average of 1, 2 and 2 is 1.6666666666666667): round it with [Math functions](core.math).

## Examples

### 1. The average of three measures

Operation **average**, input **c** added:

```
[Sensor 1] value ──▶ a  [Min · Max · Avg] result ──▶ value [Value: average temperature]
[Sensor 2] value ──▶ b
[Sensor 3] value ──▶ c
```

With 20, 22 and 24 the average is 22. If sensor 3 has not sent anything yet, the average is 21 (of 20 and 22).

### 2. The higher of two offers

Operation **maximum**: **a** = 150, **b** = `"175,50"` → 175.5.

### 3. A wrong value

Operation **minimum**: **a** = 8, **b** = `"n.d."` → 8 (the text is skipped). With **b** = `""` instead the minimum is 0, because the empty text counts as 0.

## Errors

This block has no errors of its own.

## See also

- [Add (+)](core.add) for the total
- [Clamp](core.clamp) to keep a number between a fixed minimum and maximum
- [Sum · Min · Max · Avg](coll.stat) to do the same on the items of a list
- [How a block works](ide/blocks)
