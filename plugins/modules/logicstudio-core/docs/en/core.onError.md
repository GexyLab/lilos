# Global catch (onerror)

`core.onError` · Exceptions · [Core blocks](logicstudio-core) · version 1

Receives the exceptions that **nobody has linked**, like `window.onerror` or `process.on('uncaughtException')`: those of the blocks whose **Exception** output goes nowhere. Without this block they end up as red lines in the main console.

## Inputs

None: the engine delivers the exceptions to it.

## Outputs

| Port | Type | Description |
|---|---|---|
| **exception** (`exception`) | object | The unhandled exception: `{ message, block, type, schema, at }`. |
| **message** (`message`) | text | Its message. |

The block has no **Exception** output: an error of its own always goes to the main console, so it cannot loop.

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Catches the exceptions of** (`scope`) | schema, program | schema | **schema**: only those of the blocks of its schema. **program**: those of all the schemas of the project. |
| **Write them in the main console too** (`console`) | yes / no | no | If ticked, the exception reaches the block **and** also writes its red line in the main console. |

## How it works

- An exception goes here only if the **Exception** output of the block that threw it is not linked. If it is linked (for example to a [Catch](core.catch)), the Global catch does not see it.
- With several Global catch blocks that concern it (for example one of **schema** and one of **program**), the exception reaches **all** of them.
- The main console receives the red line only if no Global catch concerns that exception, or if at least one has **Write them in the main console too** ticked.
- Exceptions rethrown by an unlinked [Throw](core.throw) arrive here like the others.

## Examples

### 1. An error lamp for the whole program

```
[Global catch (onerror): program] message ──▶ text [Label: last error]
                                  exception ──▶ on [Lamp: error]
```

Any unhandled error turns on the [Lamp](ui.lamp) and shows its message, in whichever schema it happens.

### 2. A notification for the errors of a running program

```
[Global catch (onerror): program, also in console] message ──▶ text [Notify: «Error in the program»]
```

While the program runs with lilOS closed, every unhandled error reaches you as a notification and also stays in the console (and in the project log).

## See also

- [Catch](core.catch), for the exceptions of specific blocks
- [Exception data (e.message…)](core.errorInfo)
- [Throw](core.throw)
- [How a block works](ide/blocks)
