# Lists and matrices

`logicstudio-collections` · requires the Logic Studio engine ([logicstudio-engine](logicstudio-engine))

The blocks for working with **lists** (lists of values) and **matrices** (tables of numbers or other values): getting and changing items, sorting, filtering, summing, going through a list one item at a time, collecting values, and matrix calculations (sum, product, transpose, determinant).

## How to install it

The package does not come with the IDE. An administrator installs it from the **AppStore**, **Kernel** tab: it is called `logicstudio-collections` («Logic Studio: i blocchi per liste e matrici…», "Logic Studio: the blocks for lists and matrices…"). If the engine is missing, the AppStore installs it together. After the installation the blocks appear in the **Blocks** tab of the IDE, in the **Lists** and **Matrices** categories.

A project that uses these blocks on a lilOS where the package is not installed shows the blocks with **The package is missing**, and an active program stays waiting until the package is back.

## The blocks

### Lists

| Block | What it does |
|---|---|
| [Length](coll.length) | How many items a list has. |
| [Get item](coll.get) | The item at a position. |
| [Set item](coll.set) | Replaces the item at a position. |
| [Add item](coll.add) | Adds a value at the end or at the start. |
| [Insert at](coll.insert) | Inserts a value at a position, moving the others. |
| [Remove at](coll.removeAt) | Takes out the item at a position and sends it separately. |
| [Slice](coll.slice) | A piece of the list, from one position to another. |
| [Concatenate lists](coll.concat) | Puts two or more lists in a row (inputs you can add). |
| [Contains · Index of](coll.contains) | Whether a value is there, and where. |
| [Reverse](coll.reverse) | The list backwards. |
| [Sort](coll.sort) | In ascending or descending order, also by a field of the objects. |
| [Unique](coll.unique) | Removes duplicates. |
| [Filter](coll.filter) | Keeps the items that meet a condition, and sends the others separately. |
| [Map field](coll.pluck) | From a list of objects, the list of one of their fields. |
| [Sum · Min · Max · Average](coll.stat) | A calculation on the numbers of the list. |
| [Range](coll.range) | A list of numbers from… to…, with a step. |
| [Split text](coll.split) | Cuts a text into a list of pieces. |
| [Join into text](coll.join) | Makes a text with the items of a list. |
| [For each](coll.forEach) | Sends the items one at a time, then **done**. |
| [Accumulate](coll.accumulate) | Collects the values that arrive into a list, keeping the last N. |
| [Random item](coll.random) | Picks a random item. |

### Matrices

| Block | What it does |
|---|---|
| [Create matrix](coll.matNew) | A matrix of rows × columns with all cells equal. |
| [Size](coll.matSize) | How many rows and how many columns. |
| [Get cell](coll.matGet) | The value of a cell. |
| [Set cell](coll.matSet) | Changes the value of a cell. |
| [Get row](coll.matRow) | A row, as a list. |
| [Get column](coll.matCol) | A column, as a list. |
| [Transpose](coll.matTranspose) | Swaps rows and columns. |
| [Add matrices](coll.matAdd) | Sum cell by cell. |
| [Subtract matrices](coll.matSubtract) | Subtraction cell by cell. |
| [Multiply matrices](coll.matMultiply) | Rows-by-columns product. |
| [Scale](coll.matScale) | Multiplies every cell by a number. |
| [Identity](coll.matIdentity) | The n × n identity matrix. |
| [Determinant](coll.matDet) | The determinant, up to 10 × 10. |
| [Matrix from list](coll.matFromList) | Cuts a list into rows. |
| [Flatten](coll.matFlatten) | Puts the cells in a row in a list. |

## Lists

A **list** is an ordered list of values, written in JSON between square brackets: `[10, 20, 30]`, `["Anna", "Bruno"]`. The items can be of different types, also `null`, objects and other lists: `[1, "due", null, {"n": 3}, [4, 5]]`.

You can get a list:

- from a [Value](core.value) of kind **JSON**, writing for example `[3, 1, 2]`;
- as the **starting value** of an input (in the Properties): `[3, 1, 2]` is read as a list;
- from [Build list](core.list), which makes a list with the values of its inputs;
- from the blocks of this package ([Range](coll.range), [Split text](coll.split), [Accumulate](coll.accumulate)…) and from other blocks and components (rows of a [Table](ui.table), files read…).

**A text is not a list**, and neither is an object: a block that wants a list and receives something else sends «Serve una lista» ("A list is needed") on the **Exception**.

**Blocks never change the list they receive**: they always send a new copy. If the same list goes to several blocks, each one sees it as it was. To "keep" a list that changes, send the result back into a [Memory](core.store), or use [Accumulate](coll.accumulate).

## Matrices

A **matrix** is a list of **rows**, where every row is a list and **all rows have the same length**:

```
[[1, 2, 3],
 [4, 5, 6]]
```

is a matrix of 2 rows and 3 columns (2 × 3). The cell in row 1, column 2 is worth 6.

Rules:

- at least **one row** and at least **one column**: `[]` and `[[]]` are not matrices;
- every item is a list: `[1, 2]` is not a matrix (it is a list of numbers), but `[[1, 2]]` is (1 × 2);
- the rows must have the **same length**: `[[1, 2], [3]]` gives «Le righe della matrice devono avere tutte la stessa lunghezza» ("The rows of the matrix must all have the same length"). There is no "tolerant" mode: non-rectangular matrices do not work in any matrix block;
- to read and write cells, rows and columns, transpose, flatten, the cells can contain **any value** (texts, `null`…);
- for **calculations** ([Add matrices](coll.matAdd), [Subtract matrices](coll.matSubtract), [Multiply matrices](coll.matMultiply), [Scale](coll.matScale), [Determinant](coll.matDet)) the cells must be **real numbers**: a text like `"2"` gives «La matrice deve contenere solo numeri» ("The matrix must contain only numbers"). In this, matrices are stricter than lists (see below).

**Matrices and lists together.** A matrix is also a list (of rows): the list blocks work on it row by row. [Length](coll.length) gives the number of rows, [Get item](coll.get) a row, [Concatenate lists](coll.concat) puts the rows of one matrix under those of another. Matrix ports and list ports are different: the IDE flags a link from matrix to list (or the other way round), but the value passes anyway. See [Links](ide/links).

## Indexes

**Positions start at 0**: in `["a", "b", "c"]` item 0 is `"a"`, 1 is `"b"`, 2 is `"c"`. The same goes for the rows and columns of matrices, and for the **index** output of [For each](coll.forEach), [Contains · Index of](coll.contains) and [Random item](coll.random).

**A negative index counts from the end**: -1 is the last, -2 the second to last… down to -length, which is the first.

What happens **out of bounds** depends on the block:

| Blocks | Valid indexes (list of length N) | Outside |
|---|---|---|
| [Get item](coll.get), [Set item](coll.set), [Remove at](coll.removeAt), [Get cell](coll.matGet), [Set cell](coll.matSet), [Get row](coll.matRow), [Get column](coll.matCol) | from 0 to N-1, from -1 to -N | error «Indice fuori dalla lista» ("Index outside the list") (also for rows and columns) |
| [Insert at](coll.insert) | from 0 to **N** (N = at the end), from -1 to -N (-1 = before the last) | error «Indice fuori dalla lista» |
| [Slice](coll.slice) | any integer | **no error**: the position is brought to the start or to the end |

**How an index is read.** It must be an **integer**. These are accepted too:

- texts with a number: `"2"`, and with the decimal comma `"1,0"` (which is worth 1);
- `true` (1) and `false` (0);
- `""` and `null`, which are worth **0** (the first item): they are not an error.

A number with a decimal part (`1.5`) or a text that is not a number (`"due"`) give «Indice: serve un numero intero» ("Index: an integer is needed") (or «Da: …», «A: …», «Righe: …», «Colonne: …», «Dimensione: …», depending on the input).

## Object fields

[Sort](coll.sort), [Unique](coll.unique), [Filter](coll.filter), [Map field](coll.pluck) and [Sum · Min · Max · Average](coll.stat) have the **Field** setting, to work on lists of objects:

- `prezzo` takes the field `prezzo` of every item;
- `indirizzo.città` goes down one level for every dot;
- a number takes an item of a list: `0` is the first value of each row;
- an item that does not have the field (or is not an object) has the value "nothing": each block says on its page how it treats it;
- a field that has a dot in its name cannot be indicated.

## Numbers and comparisons

The list blocks read the numbers of the items like this:

| Value | Is it a number? |
|---|---|
| `4`, `-2.5` | yes |
| `"7"`, `" 3 "`, `"2,5"`, `"1e3"` | yes (7, 3, 2.5, 1000): texts with a number are worth that number, the first comma counts as a dot |
| `"1,000"` | yes, but it is worth **1**, not a thousand |
| `true`, `false`, `null`, `""`, `"abc"`, objects, lists | no |

Number-type inputs (indexes, **from**, **to**, **step**, **factor**…) are a bit wider: `true` is worth 1, `false` 0, `""` and `null` are worth 0.

**Equality.** [Contains · Index of](coll.contains), [Unique](coll.unique) and "contains" of [Filter](coll.filter) on a list compare the values **without conversions**: `2` and `"2"` are different, `"Roma"` and `"roma"` are different. Lists and objects are equal if they have the same content **with the fields in the same order**: `{"a":1,"b":2}` and `{"b":2,"a":1}` turn out different. [Filter](coll.filter) with =, ≠, >, <… instead converts: `5 = "5"` is true.

## When a block works

The rules of all blocks apply ([How a block works](ide/blocks)): every value that arrives stays as the value of that input, and if the input "starts it" the block runs with the latest value of each input.

- The blocks of this package **wait silently** until they have all the required inputs: no output and no error. The exceptions are [For each](coll.forEach), which gives «Manca la lista» ("The list is missing") if it receives **start** without a list, and the optional inputs (**from** and **to** of [Slice](coll.slice), **from** and **step** of [Range](coll.range), **value** of [Filter](coll.filter), **fill** of [Create matrix](coll.matNew), all the inputs of [Concatenate lists](coll.concat)).
- With two inputs that "start it", the block runs at every arrival: when two values arrive at start, the first result is made with one input only (or there is none, if the other is required). Remove "starts it" from the input that must not make the block run again.
- What goes wrong comes out on the block's **Exception** as `{ message, block, schema, at }`; if the Exception is not linked, a line like «Elemento: Indice fuori dalla lista» appears in the main console (the block name, then the message).

## Limits

- **100000 items.** The blocks that make a list longer ([Add item](coll.add), [Insert at](coll.insert), [Concatenate lists](coll.concat), [Range](coll.range), [Split text](coll.split), [Accumulate](coll.accumulate)) do not make lists of more than 100000 items: «Lista troppo grande (massimo 100000 elementi)» ("List too big (maximum 100000 items)"). A longer list that comes from outside (for example from a file) is still handled by the other blocks.
- **100000 cells.** [Create matrix](coll.matNew), [Identity](coll.matIdentity) (up to 316 × 316), [Multiply matrices](coll.matMultiply) and [Matrix from list](coll.matFromList) do not make matrices of more than 100000 cells: «Matrice troppo grande (massimo 100000 celle)» ("Matrix too big (maximum 100000 cells)").
- **Determinant up to 10 × 10.**
- **Runs.** The engine stops a program that does more than 10000 block runs in 10 seconds (by default; an administrator can change it). [For each](coll.forEach) on a long list runs the linked blocks once per item: with a few thousand items you reach the limit. See [Limits](logicstudio-engine/limits).
- **Time.** A block that works for more than 30 seconds (by default) is stopped with an error.

## Complete examples

### 1. The average of the grades typed in a field

A window with a [Text field](ui.text) and a [Value](ui.value); in the schema:

```
[Text field: grades] text ──▶ text [Split text: ;] result ──▶ list [Filter: a ≠ b, empty Value] result ──▶ list [Sum · Min · Max · Average: average] result ──▶ value [Value: average]
```

- **Split text** with separator `;` (not the comma, which is used for decimals) and **Trim spaces** on;
- **Filter** with "a ≠ b" and an empty **Value** removes the empty pieces (for example after a final `;`);
- **Sum · Min · Max · Average** with **Operation** average.

Typing `7,5; 8; 6;` the pieces are `["7,5", "8", "6", ""]`, the filter removes `""` and the Value shows 7.1666… Typing `7; otto` the error «Serve un numero in ogni elemento» ("A number is needed in every item") appears and the average stays the previous one.

### 2. Products under a price, most expensive first

```
[Value (JSON): catalog]               value ──▶ list [Filter: prezzo ≤ b] result ──▶ list [Sort: prezzo, descending] result ──▶ list [Map field: nome] result ──▶ list [Join into text] text ──▶ value [Write to console]
[Number field: maximum price]         value ──▶ value (optional) [Filter]
```

The catalog is `[{"nome":"Penna","prezzo":2.5},{"nome":"Zaino","prezzo":35},{"nome":"Quaderno","prezzo":4},{"nome":"Astuccio","prezzo":12}]`.

- **Filter**: **Keep items that are** "a ≤ b", **Field** `prezzo`, **Value** `20` (the limit until the user types);
- **Sort**: **Field** `prezzo`, **Order** descending;
- **Map field**: **Field** `nome`;
- **Join into text** with the default separator.

At start the console writes `Astuccio, Quaderno, Penna`. If the user types 10 in the number field: `Quaderno, Penna`. If they type 1: an empty line (no product, and [Join into text](coll.join) of an empty list gives an empty text).

### 3. Product of a matrix by its transpose, and determinant

```
[Value (JSON): [1,2,3,4]] value ──▶ list [Matrix from list (columns 2)] matrix ──▶ a [Multiply matrices] result ──▶ matrix [Determinant] determinant ──▶ value [Write to console]
                                                                         matrix ──▶ matrix [Transpose] matrix ──▶ b [Multiply matrices]
```

- **Matrix from list** with **columns** 2 makes `M = [[1,2],[3,4]]`;
- **Transpose** makes `[[1,3],[2,4]]`;
- **Multiply matrices** makes `M × Mᵀ = [[5,11],[11,25]]`;
- **Determinant** writes `4`, that is (-2)², the square of the determinant of M.

Linking a [Size](coll.matSize) to the result of the product you get 2 rows and 2 columns.

### 4. Moving average and maximum of the last 10 readings

```
[Every…: 1 second] pulse ──▶ read [Memory] value ──▶ add [Accumulate: max 10] list ──▶ list [Sum · Min · Max · Average: average]   result ──▶ value [Value: average]
                                                                                       list ──▶ list [Sum · Min · Max · Average: maximum] result ──▶ value [Value: peak]
                                                                                       list ──▶ data [Lines]
[Number field: reading] value ──▶ set [Memory]
```

Every second the latest reading enters [Accumulate](coll.accumulate), which keeps the last 10; average, maximum and the [Lines](charts.line) chart update together. Give the **set** input of the Memory the starting value 0: otherwise, while the field is empty, the Memory sends `null` and the two calculations give «Serve un numero in ogni elemento».

## Errors of this package

| Message | Blocks |
|---|---|
| Serve una lista (A list is needed) | all those with a list input |
| Lista troppo grande (massimo 100000 elementi) (List too big, maximum 100000 items) | Add item, Insert at, Concatenate lists, Range, Split text |
| Indice: serve un numero intero (Index: an integer is needed) | Get item, Set item, Insert at, Remove at, Get cell, Set cell, Get row, Get column |
| Da: serve un numero intero · A: serve un numero intero (From: an integer is needed · To: an integer is needed) | Slice |
| Indice fuori dalla lista (Index outside the list) | Get item, Set item, Insert at, Remove at, Get cell, Set cell, Get row, Get column |
| Serve un numero in ogni elemento (A number is needed in every item) | Sort, Sum · Min · Max · Average |
| Lista vuota (Empty list) | Sum · Min · Max · Average (minimum, maximum, average), Random item |
| Indica il campo da estrarre (Say which field to extract) | Map field |
| Serve un numero (A number is needed) | Range, Scale |
| Il passo non può essere zero (The step cannot be zero) | Range |
| Manca la lista (The list is missing) | For each |
| Serve una matrice (A matrix is needed) | all matrix blocks with a matrix input |
| Le righe della matrice devono avere tutte la stessa lunghezza (The rows of the matrix must all have the same length) | all matrix blocks with a matrix input |
| La matrice deve contenere solo numeri (The matrix must contain only numbers) | Add matrices, Subtract matrices, Multiply matrices, Scale, Determinant |
| Le matrici devono avere le stesse dimensioni (R×C e R×C) (The matrices must have the same size (R×C and R×C)) | Add matrices, Subtract matrices |
| Prodotto impossibile: le colonne di A (K) devono essere quante le righe di B (N) (Product impossible: the columns of A (K) must be as many as the rows of B (N)) | Multiply matrices |
| Righe: serve un numero intero · Colonne: serve un numero intero (Rows: an integer is needed · Columns: an integer is needed) | Create matrix, Matrix from list (Columns only) |
| Dimensione: serve un numero intero (Size: an integer is needed) | Identity |
| Righe e colonne devono essere interi maggiori di zero (Rows and columns must be integers greater than zero) | Create matrix, Identity, Matrix from list |
| Matrice troppo grande (massimo 100000 celle) (Matrix too big, maximum 100000 cells) | Create matrix, Identity, Multiply matrices, Matrix from list |
| La matrice deve essere quadrata (The matrix must be square) | Determinant |
| Determinante: al massimo 10×10 (Determinant: 10×10 at most) | Determinant |
| La lista (N elementi) non si divide in righe di C (The list (N items) cannot be divided into rows of C) | Matrix from list |

## See also

- [Basic blocks](logicstudio-core): [Build list](core.list), [Get field](core.get), [Value](core.value), [Memory](core.store)
- [How a block works](ide/blocks), [Links](ide/links)
- [The engine](logicstudio-engine), [Limits](logicstudio-engine/limits)
