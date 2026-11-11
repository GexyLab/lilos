# Emit (event to lilOS)

`lilos.event` · lilOS · [lilOS blocks](logicstudio-lilos) · version 1

Sends an event, with a name and some data, to your open lilOS pages. It is meant to let a program talk to lilOS and to the apps: **for now no part of lilOS uses it**, so sending it changes nothing on the screen. It is for those who write apps that listen to lilOS events.

## Inputs

| Port | Type | Description |
|---|---|---|
| **data** (`data`) | any | The data of the event. Every value that arrives here sends an event. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **sent** (`sent`) | pulse | Sends `true` when the event has gone out. |
| **Exception** (`error`) | object | When the event does not go out: invalid name, data too big, too many events. |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Event name** (`name`) | text | `evento` | The name the event carries with it, to tell it from others. From 1 to 64 characters: letters, digits, `.`, `-` and `_`. |

## How it works

When a value arrives on **data**, the block asks the kernel to send to **all your open lilOS pages** (in every browser and tab where you are signed in) the event `logicstudio.event`, with this data:

```
{
  "program": { "id": "…", "name": "Greenhouse" },
  "name": "greenhouse.alarm",
  "data": { "temp": 31.5 }
}
```

- `program` says which program sent it (its id and its name).
- `name` is the **Event name** in the settings (spaces at the start and end are removed).
- `data` is the value that arrived on **data**, as it is.

Things to know:

- The event arrives only to **you**, the user who owns the program, and only to the pages open at that moment: if no page is open, the event is lost. It is not saved.
- The data, written as JSON, can be at most **64 KB** long (about 65 000 characters).
- Each program can send at most **20 events per second**: beyond it, the block gives an error.
- The name cannot be changed with an input: for different events use more blocks, each with its own name.
- To alert you, a person, use a [Notify](lilos.notify) block: the Emit block is for software.

See also [How a block works](ide/blocks).

## Examples

### 1. An event with a measure

```
[Interval (setInterval): 5 s] pulse ──▶ read [readFile: ~/sensors/last.txt] content ──▶ temp [Object literal { }] object ──▶ data [Emit (event to lilOS): greenhouse.measure]
```

Every 5 seconds your lilOS pages receive `logicstudio.event` with `name` = `greenhouse.measure` and `data` = `{ "temp": "22,5" }` ([Object literal { }](core.compose) has the added input **temp**). An app that listens to that event can show the measure.

### 2. An event when you press a button

```
[Button: Alarm] pressed ──▶ data [Emit (event to lilOS): greenhouse.alarm] sent ──▶ value [Print (console.log)]
```

**data** is `true` (the value of a pulse). The console writes `true` when the event has gone out.

### 3. Watch the pace

```
[Interval (setInterval): 0.05 s] pulse ──▶ data [Emit (event to lilOS): measure.a]
                pulse ──▶ data [Emit (event to lilOS): measure.b]
```

The limit of 20 events per second applies to **the whole program**, not to each block. Here the two blocks together send 40 per second: about half end up on **Exception** with "Troppi eventi: al massimo 20 al secondo" ("Too many events: at most 20 per second"). Slow down the pace, or gather more values in a list with [Accumulate (bounded push)](coll.accumulate) and send the list now and then.

## Errors

The messages are in Italian, as users see them; the English meaning is in parentheses.

| Message | When |
|---|---|
| Nome dell'evento non valido (lettere, numeri, «.», «-» e «_», al massimo 64) ("Invalid event name (letters, numbers, «.», «-» and «_», at most 64)") | The name is empty, too long or has characters that are not allowed (for example a space). |
| Dati dell'evento troppo grandi (al massimo 64 KB) ("Event data too big (at most 64 KB)") | The data, written as JSON, is over 64 KB. |
| Troppi eventi: al massimo 20 al secondo ("Too many events: at most 20 per second") | The program has already sent 20 events in the last second. |
| Emit (evento a lilOS) ha impiegato più di 30 s ("Emit (event to lilOS) took more than 30 s") | The kernel did not answer within the maximum time of a block. |
| Il programma non è in esecuzione ("The program is not running") | The program was stopping. |

## Permissions

The block works as the user who owns the program and sends events only to their pages. An app made with **Make app** that contains this block, before starting, asks you for permission to "send events to your lilOS". See [Permissions](logicstudio-engine/permissions).

## See also

- [Notify](lilos.notify)
- [Object literal { }](core.compose), to prepare the data
- [How a block works](ide/blocks)
