# Random item

`coll.random` · Lists · [Lists and matrices](logicstudio-collections) · version 1

Picks a random item of the list and sends the item and its position.

## Inputs

| Port | Type | Description |
|---|---|---|
| **list** (`list`) | list | The list to choose from. |
| **pick** (`pick`) | pulse | Makes a new draw from the latest list that arrived. Any value that arrives here counts as a pulse. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **item** (`item`) | any | The drawn item. |
| **index** (`index`) | number | Its position (from 0). |
| **Exception** (`error`) | object | Invalid or empty list. |

## How it works

The block makes a draw **every time it runs**: both when a pulse arrives on **pick** and when a new list arrives on **list** (both inputs "start it").

- Every item has the same chance of coming out. The draws are independent: the same item can come out several times in a row. To draw without repeats, remove the drawn item with [Remove at](coll.removeAt) using the **index**.
- A pulse on **pick** before a list has arrived **does nothing** (no error).
- An empty list gives the error «Lista vuota» ("Empty list").
- A `null` item can be drawn: `null` comes out.
- Chance here is not suited to security uses (passwords, secret codes): it is fine for games, tests and any ordinary choice.

If you want to draw **only** with the pulse, remove "starts it" from **list**: that way a new list is only remembered.

## Examples

### 1. Who buys the coffee

```
[Value (JSON): ["Anna","Bruno","Carla"]] value ──▶ list [Random item (list does not start it)] item ──▶ value [Value]
[Button: Pick]                            pressed ──▶ pick
```

At every click the [Value](ui.value) shows one of the three names, for example «Carla», and **index** is 2.

### 2. A die

```
[Value: 6] value ──▶ to [Range (from = 1)] result ──▶ list [Random item] item ──▶ value [Write to console]
[Every…: 2 seconds] pulse ──▶ pick
```

[Range](coll.range) makes `[1, 2, 3, 4, 5, 6]`; every 2 seconds the console writes a number from 1 to 6 (and once right away, when the list arrives, because **list** "starts it").

### 3. Empty list

With the list `[]` every draw gives, in the main console, «Elemento a caso: Lista vuota» ("Random item: Empty list").

## Errors

| Message | When |
|---|---|
| Serve una lista (A list is needed) | The value on **list** is not a list. |
| Lista vuota (Empty list) | The list has no items. |

## See also

- [Get item](coll.get), [Remove at](coll.removeAt), [Range](coll.range)
- [Calculate](core.math)
- [How a block works](ide/blocks)
