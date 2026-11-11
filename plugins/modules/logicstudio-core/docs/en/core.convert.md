# Type cast

`core.convert` · Values · [Core blocks](logicstudio-core) · version 1

**Obsolete block** since Core blocks 1.6.0. In schemas already saved it still works as before, but it no longer appears in the list of blocks. It has been replaced by one block for each conversion, one for each value of the **To** setting:

| Value of **To** | Block that replaces it |
|---|---|
| number | [Cast to number (Number())](core.toNumber) |
| text | [Cast to text (String())](core.toText) |
| yes/no | [Cast to yes/no (Boolean())](core.toBool) |
| JSON text | [Cast to JSON text (JSON.stringify)](core.toJson) |
| from JSON text | [Cast from JSON text (JSON.parse)](core.parseJson) |

For the conversion rules, the examples and the errors see the pages of the new blocks.

## Inputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | any | The value to convert. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **result** (`result`) | any | The converted value. |
| **Exception** (`error`) | object | When the conversion is not possible (to **number** or **from JSON text**). |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **To** (`to`) | number, text, yes/no, JSON text, from JSON text | number | What to convert to. |

## See also

- [How a block works](ide/blocks)
