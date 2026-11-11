# Steps

`charts.step` · Charts · [Charts](logicstudio-charts) · version 1

**States over time**: one lane for each thing to follow (a pump, a door, a machine), and along the lane when it was on or off, open or closed, or in which state in words ("filling", "paused", "fault"). The state changes in steps: it stays the same until the next value.

## Properties

| Property | Values | Default | Description |
|---|---|---|---|
| **Title** | text (translatable) | empty | Written above the chart; it also names the PNG and CSV files. |
| **Height (px)** | 20 to 2000 | 200 | The height of the drawing. Every lane is at most 34 pixels high. |
| **Legend** | yes/no | yes | Shows the legend (from two lanes up); a click hides a lane. |
| **Points kept per series** | 10 to 100000 | 1000 | How many state changes each lane keeps (the administrator's limit also applies). |
| **Colours** | `standard`, `blue` | `standard` | The colours of the yes/no lanes. |
| **Table view, PNG and CSV buttons** | yes/no | yes | The three buttons at the top right. |
| **Time shown (seconds, 0: all)** | 0 to 604800 | 300 | How far back the chart shows (300 = 5 minutes, 604800 = one week). 0: from the first state received to now. |

## Ports of its object in the schema

### Inputs

| Port | Type | Description |
|---|---|---|
| **clear** (`clear`) | pulse | Removes all the states of all the lanes. |
| **enabled** (`enabled`) | yes/no | `false` makes it lighter and turns it off. |
| **visible** (`visible`) | yes/no | `false` hides it. |
| *added states* | any | One per lane: every value that arrives is the new state of that lane, from now. |

### Outputs

| Port | Type | Description |
|---|---|---|
| **picked point** (`picked`) | object | The states of all the lanes at the instant chosen with a click or **Enter**. |
| **Exception** (`error`) | object | Like every block; nothing goes through it today. |

## Added ports

One port for each lane, up to **8**, of type any. They are called "state 1", "state 2"... and **the name of the port is the name of the lane**, written on the left. They are shown in italics on the object in the schema.

> Without added ports the chart stays empty ("No data"). Mind: in this version the window editor does not have a command to add ports to a component yet, and neither do the Properties of its object in the schema. Until there is one, the Steps chart stays without lanes.

## How it works

- **A value on a port = a state change now**, at the instant it arrives in the window. The state lasts until the next value (or until now, if it is the last).
- **Yes/no lanes**: if only values that mean yes or no arrive in a lane, the lane is **yes/no**: where it is "yes" there is a full bar of the colour of the lane, where it is "no" a thin line. These count as yes: `true`, `1`, `"true"`, `"on"`, `"1"`, `"yes"`, `"sì"`, `"si"`, `"acceso"`, `"aperto"`; as no: `false`, `0`, `"false"`, `"off"`, `"0"`, `"no"`, `"spento"`, `"chiuso"` (capitals and spaces do not matter; "sì", "acceso" and "aperto" are Italian for yes, on and open, "spento" and "chiuso" for off and closed). In the box you read "on" and "off".
- **Lanes in words**: if even a single different value arrives in the lane (for example `"paused"` or `2`), **the whole lane** becomes a lane in words: every state is a coloured stretch with its name written inside, if there is room. Every different state has its own colour, given in the order the states appear in the chart (the same state has the same colour in all lanes). These colours are always the `standard` ones.
- **Objects and lists** become their JSON text (`{"phase": 2}` is the state `{"phase":2}`). **`null`** means "no state": from there the lane is empty until the next value.
- **The scrolling**: with a **Time shown** greater than 0 the chart redraws by itself and the right edge is always now; the states that left the left edge go away (the last one before the edge stays, entering from the left). With 0 the chart shows everything, from the first state, and redraws only when a new value arrives.
- **A closed window records nothing**: when you open it, the program sends it the last value of each port (if the option **A window opened again shows the last values at once** is on), and every lane starts again from that state, now.

**Picked point** sends the states at the instant of the click (or, with the arrows, at the instant of a change):

| Field | Content |
|---|---|
| `time` | the instant as an ISO date |
| `x` | the same instant in milliseconds |
| `values` | the state of each visible lane at that instant: `true`/`false` for the yes/no lanes, the value for the others, for example `{"pump": true, "phase": "filling"}` |

## Examples

### 1. A pump and its phase

Add two ports and call them **pump** and **phase**.

```
Window "Plant"
└ Column (root)
  └ Steps  step1  Title "Plant"  Time shown 600
```

```
[Switch: Pump]      value ──▶ pump [Steps: Plant]
[Selection: Phase]  value ──▶ phase
```

Every time someone turns the [Switch](ui.toggle) on or off, the "pump" lane changes: full bar when it is on, thin line when it is off. The "phase" lane shows in words the phase chosen in the [Selection](ui.select) ("filling", "emptying"), each with its own colour. You see the last 10 minutes.

### 2. A door read from a file

```
[Every…: 5 s] pulse ──▶ read [Read file: ~/door.txt] content ──▶ door [Steps: Entrance]
```

The file contains `aperto` or `chiuso` (open or closed): the lane is yes/no. Every 5 seconds the state arrives even if it has not changed: the drawing does not change (the state continues), but every reading counts among the **Points kept per series** (with 1000 points and a reading every 5 seconds, the lane keeps about 83 minutes: more than the default **Time shown**, so it is fine). With very frequent readings and a long **Time shown**, it is better to send only the changes: for example [Edge](core.edge) sends a pulse only when a yes/no changes.

### 3. What was happening at 10:15?

```
[Steps: Plant] picked point ──▶ value [Write to console]
```

A click on the chart at the height of 10:15 writes `{"time": "2026-11-11T09:15:00.000Z", "x": 1794388500000, "values": {"pump": true, "phase": "filling"}}` (the ISO time is in UTC: 10:15 in Italy in winter is 09:15 UTC).

## Accessibility and keyboard

**Tab** to reach it; the arrows go from one state change to the next (of any lane), **Enter** sends the states of that instant to **picked point**, **Esc** clears the choice. The box lists every lane with its state. **Show as a table**: one row for each change (Time) and one column per lane, with "on"/"off" for the yes/no lanes; a lane with no change at that instant has an empty cell.

## See also

- [Real time](charts.live) for numbers that change
- [Lamp](ui.lamp) to show only the state right now
- [Switch](ui.toggle), [Selection](ui.select), [Edge](core.edge)
- [Charts](logicstudio-charts): the data shapes, the limits, the keyboard
