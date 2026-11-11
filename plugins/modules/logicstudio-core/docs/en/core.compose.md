# Build object

`core.compose` · Objects · [Core blocks](logicstudio-core) · version 1

Puts several values together in an object: each input you add is a field, with the name you give it.

## Inputs

The block starts **with no inputs**: add one input for each field of the object (see **Added ports**).

## Outputs

| Port | Type | Description |
|---|---|---|
| **object** (`object`) | object | The object with a field for each input that has already received a value. |
| **Exception** (`error`) | object | In practice it does not happen: the block has no errors of its own. |

## Added ports

In the **Properties**, **Ports** section, with **Add input** you add up to 32 fields (or fewer, if an administrator has lowered the **Added ports per block, at most** limit). Each added input is of type any and starts with the name **field 1**, **field 2**… (in an Italian IDE **campo 1**…): **rename it** with the name of the field you want in the object (up to 60 characters; spaces at the sides are removed; an empty name is not accepted and the previous one stays). The ↑ ↓ arrows change the order of the fields. See [How a block works](ide/blocks).

## How it works

Every time a value arrives on one of the fields, the block sends on **object** a new object with **the last value of each field**.

- Fields that have not received anything yet are **not in** the object. With the fields `name` and `age`, if only `name` = `"Ada"` has arrived, `{"name": "Ada"}` comes out.
- A field that receives `null` is there, and is `null`.
- Values stay: after sending, the fields keep their value and the next time the object still contains them. To start again from scratch you must stop the program.
- The name is used **as it is** as the name of the field: a name with a dot, like `a.b`, makes a field that is really called `a.b` (not an object inside another). For objects inside objects use two Build object blocks, one linked to a field of the other.
- If two fields have the **same name**, the one lower in the list of ports wins in the object.
- The order of the fields in the object is the order of the ports.
- The block runs **at every value**: with three fields that arrive one after the other, three objects come out, more and more complete. If you want a single object, remove **starts it** from all the fields except the one that arrives last, or use [Wait for all](core.join).

For the general rules (inputs, "starts it", initial value, Exception) see [How a block works](ide/blocks).

## Examples

### 1. An object from three values

Add three inputs and name them `name`, `age` and `city`:

```
[Value: text "Ada"]  value ──▶ name  [Build object] object ──▶ value [Write to console]
[Value: number 36]   value ──▶ age
[Value: text "Rome"] value ──▶ city
```

At start the console writes three lines, one for each value that arrives:

```
{"name":"Ada"}
{"name":"Ada","age":36}
{"name":"Ada","age":36,"city":"Rome"}
```

Remove **starts it** from `name` and `age`: only the last line is left.

### 2. A fixed field with the initial value

Name the fields `sensor` and `degrees`. On `sensor` remove **starts it** and write the initial value `"kitchen"`; link the readings to `degrees`:

```
[readings] ──▶ degrees [Build object] object ──▶ … 
```

Every reading, for example 21.5, makes `{"sensor": "kitchen", "degrees": 21.5}` come out.

### 3. An object inside an object

```
[Build object: street, city] object ──▶ address [Build object: name, address] object ──▶ …
```

With street `"1 Main Street"`, city `"Rome"` and name `"Ada"`, `{"name": "Ada", "address": {"street": "1 Main Street", "city": "Rome"}}` comes out.

## See also

- [Split object](core.decompose) and [Get field](core.get) to read the fields
- [Build list](core.list) to put values together in a list
- [Wait for all](core.join) to wait until all have arrived
- [How a block works](ide/blocks)
