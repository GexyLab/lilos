# Schema input

`core.schemaIn` · Schema ports · [Core blocks](logicstudio-core) · version 1

Gives the schema an **input port**: in the map of the project, the Schema outputs of the other schemas link to this port, and the values they send come out of this block.

## Inputs

None: values arrive from the other schemas, through the links of the map.

## Outputs

| Port | Type | Description |
|---|---|---|
| **value** (`value`) | the one chosen in **Type** | Every value that arrives at the port of the schema, as it is. |

This block does not have the **Exception** output.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Port name** (`port`) | a text | `ingresso` (Italian for "input") | The name of the port of the schema, as shown in the map and in the Properties of the schema. |
| **Type** (`type`) | any, number, yes/no, text, object, list, pulse | any | The type of the port: the color of the dot and the type check on links. |
| **Description** (`description`) | a text | empty | A note for you, about what arrives from this port. |

## How it works

The schemas of a project talk to each other **only** through the schema ports. A schema sends with a [Schema output](core.schemaOut); in the **Map** you link that output to the port of another schema; in the other schema the **Schema input** with the same name sends the value to the linked blocks. See [Schemas](ide/schemas).

- Every value that arrives comes out at once on **value**, **unchanged**: no conversions.
- The **Type** is only for the IDE (the color of the port and the warning on links of different types, in the schema and in the map): the engine **does not check and does not convert** the value. If you declare number and a text arrives, the text comes out.
- A port can receive from **several Schema outputs** (several links in the map): every value that arrives, from anywhere, comes out.
- **Renaming** the port in the Properties also moves the links of the project that use it: they are not lost.
- In the Properties of the block, **Links in the project** lists where the values come from, with **Unlink** to remove a link; **In the map** opens the map.
- In a **schema opened alone** (without a project) the port receives nothing: the IDE reminds you with "In a project, this port can be linked to other schemas in the map."
- On the sheet the title of the block is always the **name of the port** (in the Properties there is no **Label** field).

Things to avoid:

- **A port with no name**: the **Problems** panel reports «Una porta di schema non ha nome» ("A schema port has no name").
- **Two Schema inputs with the same name in the same schema**: in the map they look like a single port, but the values arrive **at only one of the two** (the last one added). Use different names, or a single Input linked to several blocks.
- **Removing** or renaming a Schema input by hand in the file while a link of the map uses it: the program does not start, with the error «Collegamento del progetto: lo schema *name* non ha l'ingresso «*port*»» ("Project link: the schema *name* does not have the input «*port*»").

For the general rules see [How a block works](ide/blocks).

## Examples

### 1. Two schemas: one measures, the other shows

In the schema **measures**:

```
[Every… 2 s] pulse ──▶ up [Counter] count ──▶ value [Schema output: turns, number]
```

In the schema **view**:

```
[Schema input: turns, number] value ──▶ value [Write to console]
```

In the **Map** drag from the output **turns** of **measures** to the input **turns** of **view**. Every 2 seconds the console writes 1, 2, 3…

### 2. One input, several sources

In the map link to **view › messages** both **measures › alarms** and **network › errors**: the same Schema input **messages** sends to [Write to console](core.consoleWrite) the values of both schemas, in the order they arrive.

### 3. A command that arrives from another schema

```
[Schema input: start, pulse] value ──▶ on [Every… 5 s]
```

When another schema sends something on its output linked to **start**, the [Every…](core.every) of this schema turns on (a pulse counts as yes).

## Errors

| Message | When |
|---|---|
| Una porta di schema non ha nome ("A schema port has no name") | In the **Problems** panel, before the Test: the **Port name** is empty. |
| Collegamento del progetto: lo schema *name* non ha l'ingresso «*port*» ("Project link: the schema *name* does not have the input «*port*»") | The program does not start: a link of the map points to a port that is no longer there. |

## See also

- [Schema output](core.schemaOut)
- [Schemas](ide/schemas) and [Links](ide/links)
- [UI component](core.component), the other way a schema talks to the outside
- [How a block works](ide/blocks)
