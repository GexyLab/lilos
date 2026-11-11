# Divide (÷ %)

`core.divide` · Math · [Core blocks](logicstudio-core) · version 1

Divides **a** by **b** and sends the quotient and the remainder.

## Inputs

| Port | Type | Description |
|---|---|---|
| **a** | number | The dividend. |
| **b** | number | The divisor. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | number | a ÷ b, with decimals. |
| **remainder** (`rest`) | number | The remainder of dividing a by b. |
| **Exception** (`error`) | object | When **b** is 0. |

This block has only two inputs: you cannot add more.

## How it works

Every time a value arrives on **a** or on **b**, the block divides the last **a** by the last **b** and sends **result** and **remainder** together.

- Values are converted to numbers with the same rules as [Add (+)](core.add): `"2,5"` is 2.5; `true` is 1 and `false` is 0; an empty text and `null` are 0.
- An input that has not received anything yet is **0**.
- **If b is 0** (also because it has not arrived yet, or it is `""`, `null`, `false`, `"0,0"`), the block sends nothing and sends «Divisione per zero» ("Division by zero") on **Exception**.
- **result** is the division with decimals: 7 ÷ 2 = 3.5 (not 3).
- **remainder** is what is left after taking **b** away from **a** as many times as possible: 7 and 2 → 1; 17 and 5 → 2; 7.5 and 2 → 1.5. The remainder has the **sign of a**: −7 and 3 → −1; 7 and −3 → 1.
- A value that is not a number (`"ciao"`, an object) gives no error: **result** and **remainder** are `NaN` ("not a number").
- The whole-number quotient is not an output: to get it, use [Math functions](core.math) with **round down** on the **result** (for positive numbers).

### Watch the order of arrival

Since a missing **b** is 0, if **a** arrives before **b** the block immediately gives «Divisione per zero». To avoid it:

- give **b** an initial value other than 0, or
- remove "starts it" from **a**, if **a** always arrives before **b**.

If you do not link the **Exception**, the message ends up in the main console.

See [How a block works](ide/blocks).

## Examples

### 1. Split a bill

```
[Number field: total]  value ──▶ a  [Divide (÷ %)] result ──▶ value [Math functions: round, 2 decimals] result ──▶ value [Value: each]
[Number field: people] value ──▶ b
```

With **b** initially `1`: total 100 and 3 people → result 33.333333333333336 → rounded 33.33. If the user writes 0 people, the Exception receives «Divisione per zero».

### 2. Even or odd

Give **b** the initial value `2` and remove "starts it" from **b**. Link **remainder** to a [Compare (== != < >)](core.compare) with `a = b` and **b** = 0:

- 10 → remainder 0 → **yes** (even);
- 7 → remainder 1 → **no** (odd).

### 3. Minutes and seconds

**a** = 135 seconds, **b** = 60 → result 2.25, remainder 15: that is 2 minutes (the result rounded down) and 15 seconds.

## Errors

| Message | When |
|---|---|
| Divisione per zero ("Division by zero") | **b** is 0, also because it has not arrived yet or it is empty. |

## See also

- [Add (+)](core.add), [Subtract (−)](core.subtract), [Multiply (×)](core.multiply)
- [Math functions](core.math) to round the result
- [How a block works](ide/blocks)
