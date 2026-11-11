# Links and port types

A **link** carries values from the **output** of one block to the **input** of another. It always goes from right (output) to left (input). Every value that leaves the output reaches, in the same order, all the linked inputs.

## Making a link

1. Move the mouse over the dot of an output, on the right of the block: the pointer becomes a cross.
2. Hold down and drag: a dashed line follows.
3. When you pass over an input of another block, its dot lights up.
4. Release the button over the input: the link is made.

If you release the button on the empty sheet, the menu of the **matching blocks** opens: choose one and it is put there, already linked to its first matching input (see [Schemas](ide/schemas)). If you release the button on an output or on the same block, nothing happens.

Rules:

- a block is not linked with itself (a loop needs at least two blocks);
- the same link (same output, same input) is not made twice;
- **an output** can go to **as many inputs as you want**;
- **an input** can receive from **several outputs**: every value that arrives takes the place of the previous one (the last one to arrive counts);
- the **Exception** output is linked like the others.

## Removing or moving a link

- Click on the link to select it, then **Delete**; or right click → **Remove the link**; or, in the Properties, **Remove the link**.
- **Drag from the dot of the input**: you detach the last link that arrived at that input. Drop it on another input to move it there (it is a single Undo step), or on the empty sheet to remove it.
- Removing a block removes its links; removing an added port removes the links of that port (**Ctrl+Z** puts them back).

## Port types

Every port has a **type**, which you see from the colour of the dot and of the link and, in the Properties, next to the name:

| Type | Colour | What values it carries |
|---|---|---|
| number | blue | `3`, `-2.5`, `1e6` |
| yes/no | yellow | `true` or `false` (in consoles and on the sheets: yes, no) |
| text | green | `"ciao"` |
| object | purple | `{ "nome": "Ada", "anni": 36 }` |
| list | turquoise | `[1, 2, 3]` |
| matrix | teal | a list of rows: `[[1, 2], [3, 4]]` |
| any | grey | any value |
| pulse | pink | a «now» signal: the value matters little (usually `true`) |
| (Exception) | red | the error object `{ message, block, schema, at }` |

The type is an **agreement**, not an obligation: the engine does not block a value because it is of the «wrong» type. It is the block that receives it that decides what to do with it. Almost all blocks convert: an **Add** accepts `"2,5"` as 2.5 and `true` as 1; if it really cannot, it sends an error on the **Exception** output (for example «Serve un numero», "A number is needed").

## When a link is marked

You can link ports of different types. If the two types do not agree, the link is drawn **with close dots**: it is a warning, not an error. The rule:

| From the output | To the input | OK? |
|---|---|---|
| any | whatever | yes |
| whatever | any | yes |
| a type | the same type | yes |
| whatever | pulse | yes: any value that arrives starts a pulse input |
| whatever except pulse | text | yes: the value is shown as text |
| pulse | text | marked |
| all the other cases | | marked |

Examples:

| Link | Drawing |
|---|---|
| number → number | normal |
| number → text | normal |
| number → pulse | normal |
| text → number | **marked** (it works, if the text is a number: `"42"`) |
| number → yes/no | **marked** (0 becomes no, the others yes, for the blocks that convert) |
| yes/no → number | **marked** |
| list → matrix | **marked** |
| pulse → yes/no | **marked** |
| pulse → text | **marked** |

The other signs on links:

| Drawing | Means |
|---|---|
| solid line in the colour of the type | normal |
| thicker, lit line | selected |
| red dashes | starts from an **Exception** output |
| flowing dashes, with a label halfway | during the test: a value has gone through; the label is the last value |

## Live values

During a **Test** (see [Test and active programs](ide/run)) every link that something has gone through shows the **last value** halfway, shortened:

| Value | Label |
|---|---|
| a number | in the format of your language: `2.5`, `1,234` |
| yes/no | `yes`, `no` |
| a text | the text, cut at 18 characters |
| a list | `[3]` (how many items) |
| an object | `{nome, anni…}` (the first two fields) |
| an error | `⚠ Serve un numero`, on a red background |
| `null` | `∅` |

Next to each input its last value appears (cut at 12 characters). The values update about 10 times a second.

## Links between schemas

Inside a schema you link blocks. **Between different schemas** of a project only the **schema ports** are linked, and only in the **Map** (see [Schemas](ide/schemas)):

```
schema «sensori»                         schema «allarmi»
… ──▶ value [Schema output: temp]  ═══▶  [Schema input: temp] value ──▶ …
```

- You go from a **Schema output** of one schema to a **Schema input** of another.
- An output can go to several inputs, and an input can receive from several outputs.
- These links are in the project file (`.lsproj`), written as `"sensori:temp"` → `"allarmi:temp"`.
- When you rename the schema or the port, the links follow.
- At most **200** links between schemas per project (default).

The engine checks that the two ports exist: if not, the test does not start and the Problems say for example «Collegamento del progetto: lo schema sensori non ha l'uscita «temp»» ("Project link: the schema sensori does not have the output «temp»"). The types of the schema ports are not checked.

## Components of windows

A component of a window **is not linked directly**: you link its **object** in a schema, which has the ports of the component. See [The object of a component](ide/components).

## Limits

- At most **600** links per schema (default). The IDE counts them in the status bar («links 30 / 600») but does not stop you: beyond the limit the test says «Troppi collegamenti nello schema main: al massimo 600» ("Too many links in the schema main: at most 600").
- A link to a port that the block no longer has (for example after updating a package) stops the test with «Lo schema main: il blocco add1 non ha l'ingresso c» ("The schema main: the block add1 does not have the input c").

## Examples

### 1. One value to several blocks

```
[Number field: gradi] value ──▶ value [Write to console]
                      value ──▶ a [Compare: a > b, b = 30] if true ──▶ send [Notification]
```

Every number typed in the field goes both to the console and to **Compare**. When it is above 30, a notification is sent (a block of the [lilOS blocks](logicstudio-lilos) package).

### 2. Several values on one input

```
[Button: On] pressed ──▶ send [Value: yes] value ──▶ on [Every…]
[Button: Off] pressed ──▶ send [Value: no] value ──▶ on
```

Two Values (**Kind** = **yes/no**, **Send at start** unticked) arrive at the same **on** input: the last one pressed counts.

### 3. A marked link that works all the same

```
[Text field] text ──▶ a [Add] result ──▶ value [Write to console]
```

The text → number link is dotted. If the user types `12`, Add converts it and writes 12; if they type `ciao`, Add sends «Serve un numero» on the **Exception** and, if it is not linked, the line goes to the main console. For an explicit check put a **Convert** in between (**To** = **number**) and link its **Exception** to a **Write to console** with level **warning**.

## See also

- [How a block works](ide/blocks)
- [Schemas](ide/schemas)
- [The object of a component](ide/components)
- [Convert](core.convert)
