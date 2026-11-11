# Merge

`core.merge` · Logic · [Core blocks](logicstudio-core) · version 1

Joins several inputs into a single output: every value that arrives on any of the inputs goes straight out on **value**.

## Inputs

| Port | Type | Description |
|---|---|---|
| (the added inputs) | any | The values to join. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | any | Every value that arrived, as it is. |
| **Exception** (`error`) | object | In practice this block never sends anything here. |

## Added ports

The block starts with no inputs: add them in the **Properties**, **Ports** section, with **Add input**. You can have up to 16 (fewer, if an administrator has lowered the limit of added ports), of type any, named **a**, **b**, **c**… They show in italics on the block. See [How a block works](ide/blocks).

## How it works

The block does not let only the first value through: it **lets every value through, in the order it arrives**, whichever input it comes from. It is the point where two or more paths of a schema become one again.

- The value passes as it is, even `null`, `false` or `0`.
- It does not wait for the other inputs and does not remember them: a value that arrived on **a** is not sent again when something arrives on **b**.
- An input from which you remove "starts it" lets nothing through: the values that arrive there are only remembered, and the block never uses them.
- Two values that arrive "together" go through one after the other, in the order the block receives them.

## Examples

### 1. Two buttons for the same action

```
[Button: Save]          pressed ──▶ a  [Merge] value ──▶ send [Notify: Saved]
[Button: Save and close] pressed ──▶ b
```

Whichever of the two buttons is pressed, the pulse reaches the [Notify](lilos.notify) block, which alerts you.

### 2. The two paths of an If · Else come back together

```
[If · Else] then ──▶ a [Multiply (×): × 1.22] result ──▶ a [Merge] value ──▶ value [Value: price]
     else ────────────────────────────────────────────────────────▶ b
```

The [Multiply (×)](core.multiply) block has the initial value 1.22 on **b**. If the price must be taxed, it goes through the multiplication; otherwise it goes as it is. In either case it reaches the [Value](ui.value) component from the same block. With 100 and the condition yes, 122 arrives; with the condition no, 100 arrives.

### 3. Values from several sensors in a single console

With the inputs **a**, **b**, **c**: if 21 arrives on **a**, then 19 on **c**, then 22 on **a**, the block sends 21, 19, 22, in this order.

## Errors

This block has no errors of its own.

## See also

- [Await all (join)](core.join) to start only when all have arrived
- [Pick by index (MUX)](core.select) to let only one input through, chosen with a number
- [How a block works](ide/blocks)
