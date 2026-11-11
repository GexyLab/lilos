# Distinct

`coll.unique` · Lists · [Lists and matrices](logicstudio-collections) · version 1

Removes duplicates: of each value it keeps only the first.

## Inputs

| Port | Type | Description |
|---|---|---|
| **list** (`list`) | list | The list to remove duplicates from. It is not changed. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | list | The list without duplicates, in the starting order. |
| **Exception** (`error`) | object | When the value on **list** is not a list. |

## Settings

| Setting | Values | Default | Description |
|---|---|---|---|
| **Field (optional, e.g. a.b)** (`field`) | a text | empty | If the list has objects, two items are duplicates when they have **this field** equal. Empty: they must be equal as a whole. |

## How it works

At every list that arrives, the block goes through it from the start: an item stays if its value had not appeared before, otherwise it is removed. The order does not change and of each value **the first** stays.

When two values are equal:

- they must have the **same type**: `1` and `"1"` are different, and both stay; `null` and `"null"` are different;
- lists and objects are equal if they have the same content (written as JSON): `{"a":1}` and `{"a":1}` are duplicates, but `{"a":1,"b":2}` and `{"b":2,"a":1}` are not, because the fields are in a different order;
- uppercase and lowercase count: `"Roma"` and `"roma"` both stay.

With a **Field**:

- only the value of the field counts; the item that stays is the first whole one with that value: `[{"n":"x","c":1},{"n":"y","c":1},{"n":"z","c":2}]` with field `c` gives `[{"n":"x","c":1},{"n":"z","c":2}]`;
- **items without that field are all duplicates of each other**: only the first stays. With field `a`, `[{"a":1},{"b":1},{"c":1}]` gives `[{"a":1},{"b":1}]` (`{"c":1}` disappears because, like `{"b":1}`, it does not have `a`).

An empty list gives `[]`.

## Examples

### 1. Numbers and texts

```
[Constant · Variable (JSON): [1,"1",1,2,2]] value ──▶ list [Distinct] result ──▶ value [Print (console.log)]
```

It writes `[1,"1",2]`.

### 2. The customers' cities

```
[Constant · Variable (JSON): [{"nome":"Anna","città":"Roma"},{"nome":"Bruno","città":"Milano"},{"nome":"Carla","città":"Roma"}]] value ──▶ list [Map field: città] result ──▶ list [Distinct] result ──▶ value [Print (console.log)]
```

It writes `["Roma","Milano"]`. Without [Map field](coll.pluck), with **Field** `città` on Distinct, you would get the customers instead (Anna and Bruno), one per city.

### 3. New values from a continuous reading

```
[Accumulate (bounded push): max 1000] list ──▶ list [Distinct] result ──▶ list [Length] length ──▶ value [Value: different values]
```

It shows how many different values have arrived so far (among the last 1000).

## Errors

| Message | When |
|---|---|
| Serve una lista (A list is needed) | The value on **list** is not a list. |

## See also

- [Includes · IndexOf](coll.contains), [Filter](coll.filter), [Sort](coll.sort), [Map field](coll.pluck)
- [How a block works](ide/blocks)
