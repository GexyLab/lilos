# Return (schema output)

`core.schemaOut` · Schema ports · [Core blocks](logicstudio-core) · version 1

Gives the schema an **output port**: the values that arrive at this block go, through the links of the map of the project, to the Parameter (schema input) blocks of the other schemas.

## Inputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | the one chosen in **Type** | The value to send out of the schema. |

## Outputs

None on the block: values leave from the port of the schema, in the map. This block does not have the **Exception** output.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Port name** (`port`) | a text | `uscita` (Italian for "output") | The name of the port of the schema, as shown in the map and in the Properties of the schema. |
| **Type** (`type`) | any, number, yes/no, text, object, list, pulse | any | The type of the port: the color of the dot and the type check on links. |
| **Description** (`description`) | a text | empty | A note for you, about what comes out of this port. |

## How it works

Every time a value arrives on **value**, the block sends it, **unchanged**, to all the [Parameter (schema input)](core.schemaIn) blocks linked to this port in the **Map** of the project. See [Schemas](ide/schemas).

- A port can go to **several inputs**, even of different schemas: each receives the same value.
- If the port **is not linked** in the map, the values go nowhere (and it is not an error). In the IDE, in a Test, you still see the value arrive on the block.
- In a **schema opened alone** (without a project) the values go nowhere.
- The **Type** is only for the IDE: the engine does not check and does not convert the value.
- The usual rules of inputs apply: if you remove **starts it** from **value**, the block never sends anything; an **initial value** is sent when the program starts.
- Two Return blocks with **the same name** in the same schema are the same port: the values of both come out from there.
- **Renaming** the port in the Properties also moves the links of the project that use it.
- In the Properties, **Links in the project** lists where the values go, with **Unlink**; **In the map** opens the map.
- On the sheet the title of the block is always the **name of the port** (in the Properties there is no **Label** field).

For the general rules see [How a block works](ide/blocks).

## Examples

### 1. A total for another schema

In the schema **calculations**:

```
[Add (+)] result ──▶ value [Return (schema output): total, number]
```

In the map link **calculations › total** to **interface › total**. In the schema **interface** a [Parameter (schema input)](core.schemaIn) **total** sends it to a [Value](ui.value) of the window.

### 2. A single output, two destinations

Link **sensors › alarm** both to **notifications › alarm** and to **log › event**. Every value sent to the output **alarm** reaches both schemas: one sends a [Notify](lilos.notify), the other writes a line with [appendFile](lilos.fileAppend).

### 3. The exceptions of a schema collected by another

```
[HTTP request (fetch)] Exception ──▶ value [Return (schema output): errors, object]
[readFile]   Exception ──▶ value
```

Two links arrive at the same input **value**. In the map you link **errors** to a schema that writes them all to a console **Errors** with [Print (console.log)](core.consoleWrite).

## Errors

| Message | When |
|---|---|
| Una porta di schema non ha nome ("A schema port has no name") | In the **Problems** panel, before the Test: the **Port name** is empty. |
| Collegamento del progetto: lo schema *name* non ha l'uscita «*port*» ("Project link: the schema *name* does not have the output «*port*»") | The program does not start: a link of the map starts from a port that is no longer there. |

## See also

- [Parameter (schema input)](core.schemaIn)
- [Schemas](ide/schemas) and [Links](ide/links)
- [How a block works](ide/blocks)
