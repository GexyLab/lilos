# Subtract

`core.subtract` · Math · [Core blocks](logicstudio-core) · version 1

Takes **b** away from **a** and sends the difference: a − b.

## Inputs

| Port | Type | Description |
|---|---|---|
| **a** | number | The number to take from. |
| **b** | number | The number to take away. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | number | a − b. |
| **Exception** (`error`) | object | In practice this block never sends anything here (see below for values that are not numbers). |

This block has only two inputs: you cannot add more.

## How it works

Every time a value arrives on **a** or on **b**, the block calculates a − b with the last value of each and sends it on **result**.

- An input that has not received anything yet is **0**: with only **a** = 10 the result is 10; with only **b** = 4 the result is −4.
- Values are converted to numbers with the same rules as [Add](core.add): `"2,5"` is 2.5; `true` is 1 and `false` is 0; an empty text and `null` are 0.
- **Unlike Add**, a value that cannot be converted (`"ciao"`, an object) does **not** give an error: the result is `NaN` ("not a number"), and it is sent all the same. The blocks after it (for example a [Compare](core.compare)) treat it as a wrong number. If you want an error, put a [Convert](core.convert) to number first.
- The decimal numbers of the computer can give small gaps: 0.3 − 0.1 = 0.19999999999999998. Round with [Calculate](core.math) before showing them.

## Examples

### 1. How much is missing

```
[Value: 100]            value ──▶ a  [Subtract] result ──▶ value [Value: missing]
[Number field: gathered] value ──▶ b
```

Goal 100, gathered 35: 65 missing. Gathered 120: −20.

### 2. The difference between two measures

**a** = 22.5 (temperature inside), **b** = `"8,5"` (temperature outside, arrived as text) → 14.

### 3. A value that is not a number

**a** = 10, **b** = `"dieci"` → the result is `NaN`, with no Exception. With a [Convert](core.convert) to number in front of **b**, instead, the Exception of the Convert receives «Non è un numero» ("It is not a number") and the Subtract receives nothing.

## Errors

This block has no errors of its own.

## See also

- [Add](core.add), [Multiply](core.multiply), [Divide](core.divide)
- [Calculate](core.math) with **change sign** to make a number negative
- [How a block works](ide/blocks)
