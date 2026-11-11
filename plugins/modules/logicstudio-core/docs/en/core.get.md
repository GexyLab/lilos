# Get property

`core.get` · Objects · [Core blocks](logicstudio-core) · version 1

Takes a field from an object (or an item from a list) and sends it. The field is given with a path like `address.city` or `grades.0`.

## Inputs

| Port | Type | Description |
|---|---|---|
| **object** (`object`) | object | The object (or list) to take the field from. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | any | The value of the field, as it is: number, text, yes/no, object, list or `null`. |
| **Exception** (`error`) | object | When the field is not there. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Field (a.b.0)** (`path`) | a text (up to 2000 characters) | empty | The path of the field: the names separated by a dot; for an item of a list, its position counting from 0. |

## How it works

Every time a value arrives on **object**, the block follows the path written in **Field** one piece at a time and sends what it finds on **value**.

How the path is read:

- The pieces are separated by a **dot**: `customer.address.city` means "the field `city` of the field `address` of the field `customer`".
- In a **list**, a piece made only of digits is a **position**, counting from **0**: `grades.0` is the first grade, `grades.2` the third.
- `length` of a list: the piece `length` gives how many items it has. With `grades` = `[7, 9, 10]`, the field `grades.length` is 3.
- Extra dots do not count: `a..b` and `.a.b.` are the same as `a.b`.
- **Spaces count** and so does upper case: ` name` (with a space in front) and `Name` do not find the field `name`.
- A field name that contains a dot cannot be reached: the dot is always read as a separator.
- Negative positions (`grades.-1`) do not exist: they give the error.
- The field can also have a name made of digits in an object: in `{"0": "zero"}` the field `0` is `"zero"`.

Special cases:

- **Empty field**: the block sends the whole object, unchanged (whatever arrived, even a text or a number).
- A field that exists and is **`null`** is sent: `null` comes out on **value**, and it is not an error.
- If the field **is not there**, the block sends nothing on **value** and sends on **Exception** the message «Il campo «*path*» non esiste» ("The field «*path*» does not exist").
- If halfway along the path it meets something that is not an object or a list (a text, a number, `null`), the field is not there: for example `name.length` with `name` = `"Ada"` gives the error. For the length of a text use the [String functions](core.text) block.
- A **JSON text** (for example one read from a file) is not an object: `{"a":1}` written as text gives the error. First transform it with [Cast from JSON text (JSON.parse)](core.parseJson).

The path is fixed, in the settings: there is no input to change it while the program runs. To take an item at a position that changes, use the [Get list[i]](coll.get) block of the Lists package. For the general rules (inputs, "starts it", Exception) see [How a block works](ide/blocks).

## Examples

In the examples the object that arrives is:

```
{"name": "Ada", "address": {"city": "Rome"}, "grades": [7, 9, 10], "notes": null}
```

### 1. A field and a field inside a field

| Field | What comes out |
|---|---|
| `name` | `"Ada"` on **value** |
| `address.city` | `"Rome"` on **value** |
| `address` | the object `{"city": "Rome"}` on **value** |
| `notes` | `null` on **value** |
| *(empty)* | the whole object on **value** |
| `phone` | nothing on **value**; on **Exception** «Il campo «phone» non esiste» |

### 2. An item of a list and its length

| Field | What comes out |
|---|---|
| `grades.0` | 7 |
| `grades.2` | 10 |
| `grades.3` | error: «Il campo «grades.3» non esiste» |
| `grades.length` | 3 |

If the object that arrives is a list of objects, for example `[{"a": 5}, {"a": 8}]`, the field `1.a` is 8.

### 3. A JSON answer read from a file

```
[readFile] content ──▶ value [Type cast: from JSON text] result ──▶ object [Get property: settings.language] value ──▶ value [Print (console.log)]
```

The [readFile](lilos.fileRead) block has the **Format** text. If the file contains `{"settings": {"language": "it"}}`, the console writes `it`. Without the [Cast from JSON text (JSON.parse)](core.parseJson) block the block would receive a text and give the error (alternatively, choose the **Format** JSON in readFile and remove the cast block).

### 4. Handle a field that is sometimes missing

```
[Get property: discount] value     ──▶ value [Print (console.log)]
                      Exception ──▶ send  [Constant · Variable: 0] value ──▶ value [Print (console.log)]
```

When the discount is there, the console writes it; when it is missing, `0` comes out instead of the error in the main console: the [Constant · Variable](core.value) block has its **send** input linked, so it sends its `0` only when the error arrives.

## Errors

| Message | When |
|---|---|
| Il campo «*path*» non esiste ("The field «*path*» does not exist") | The path leads nowhere: a name that is not there, a position past the end of the list, a piece that goes through a text or a number, or a text arrived instead of an object. |

## See also

- [Destructure object](core.decompose) to take several fields at once
- [Object literal { }](core.compose) to do the opposite
- [Get list[i]](coll.get) and [Map field](coll.pluck) for lists
- [Cast from JSON text (JSON.parse)](core.parseJson) to turn a JSON text into an object
- [How a block works](ide/blocks)
