# Multiply

`core.multiply` · Math · [Core blocks](logicstudio-core) · version 1

Multiplies two or more numbers and sends the product.

## Inputs

| Port | Type | Description |
|---|---|---|
| **a** | number | The first factor. |
| **b** | number | The second factor. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | number | The product of the inputs that have a value. |
| **Exception** (`error`) | object | When an input is not a number. |

## Added ports

In the **Properties**, **Ports** section, you can add up to 16 more inputs (fewer, if an administrator has lowered the limit of added ports), of type number, named with the following letters: **c**, **d**, **e**… up to **r**. They show in italics on the block. See [How a block works](ide/blocks).

## How it works

Every time a value arrives on an input, the block multiplies the last value of each input and sends the product on **result**.

- Inputs that have not received anything yet do not count: with only **a** = 4 the result is 4 (not 0).
- Values are converted to numbers with the same rules as [Add](core.add): `"2,5"` is 2.5; `true` is 1 and `false` is 0; an empty text and `null` are **0** (so they zero the product).
- If a value cannot be converted (for example `"ciao"` or an object), the block sends nothing on **result** and sends «Serve un numero» ("A number is needed") on **Exception**.
- The decimal numbers of the computer can give small gaps: 1.1 × 3 = 3.3000000000000003. Round with [Calculate](core.math) before showing them.

## Examples

### 1. Price times quantity

```
[Number field: price]    value ──▶ a  [Multiply] result ──▶ value [Value: total]
[Number field: quantity] value ──▶ b
```

Price 4.50 and quantity 3: total 13.5. Until the user writes the quantity, the total shown is the price itself (4.50): if you do not want this, give **b** the initial value `0`.

### 2. A fixed factor

Give **b** the initial value `1.22` and remove "starts it" from **b**. Every price that arrives on **a** comes out increased by 22%: 100 → 122; `"50"` → 61.

### 3. Three factors

Add the input **c**: length 2, width 3, height `"1,5"` → volume 9.

## Errors

| Message | When |
|---|---|
| Serve un numero ("A number is needed") | An input has a value that cannot be converted to a number. |

## See also

- [Add](core.add), [Subtract](core.subtract), [Divide](core.divide)
- [Calculate](core.math) to round and other operations on a number
- [Scale](coll.matScale) to multiply a matrix by a number
- [How a block works](ide/blocks)
