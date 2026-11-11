# Date and time

`ui.datetime` · Commands · [Standard UI components](logicstudio-ui) · version 1

A field to choose a date, a time, or both, with the browser's calendar. The value travels as text in the ISO format (`2026-11-11`, `14:30`, `2026-11-11T14:30`).

Do not confuse it with the [Now (date and time)](core.now) block of the Basic blocks, which reads the current time.

## Properties

| Property | Values | Default | Description |
|---|---|---|---|
| **Label** | text (translatable) | empty | Text above the field. |
| **Kind** | date, time, date and time | date and time | What is chosen. |

The field always opens empty: for an initial date use the **value (ISO)** input with an at start value.

## Ports of its object in the schema

### Inputs

| Port | Type | Description |
|---|---|---|
| **value (ISO)** (`value`) | text | Puts a date or a time in the field, without the field sending anything. |
| **enabled** (`enabled`) | yes/no | `false` makes it lighter and it can no longer be changed. See [Standard UI components](logicstudio-ui). |
| **visible** (`visible`) | yes/no | `false` hides it. |

### Outputs

| Port | Type | Description |
|---|---|---|
| **value (ISO)** (`value`) | text | The date or time chosen, when the user changes it. |
| **Exception** (`error`) | object | Like every block; for this component nothing goes through it today. |

## How it works

**The format** depends on the **Kind**:

| Kind | Output | Example |
|---|---|---|
| date | `YYYY-MM-DD` | `2026-11-11` |
| time | `HH:MM` (24 hours) | `14:30` |
| date and time | `YYYY-MM-DDTHH:MM` | `2026-11-11T14:30` |

The field is shown in the language and format of the browser (for example «11/11/2026, 14:30»), but the schema always receives the ISO format above. **It is local time**, without a time zone.

**When it sends.** When the date changes and is complete: by choosing it from the calendar, or finishing typing it, or leaving the field. If the user clears the field, it sends `""`. A date typed halfway sends nothing.

**From the schema**, the **value (ISO)** input accepts an ISO text. The field takes only the beginning of it: the first 10 characters for a date, the first 5 for a time, the first 16 for date and time. So:

| Arrives | Kind date | Kind time | Kind date and time |
|---|---|---|---|
| `"2026-11-11"` | 11/11/2026 | empty | empty (the time is missing) |
| `"14:30"` | empty | 14:30 | empty |
| `"2026-11-11T14:30:00"` | 11/11/2026 | empty | 11/11/2026 14:30 |
| a number (milliseconds) | empty | empty | empty |

> **Beware of the time zone.** The **ISO** output of the [Now (date and time)](core.now) block is in **UTC** (it ends with `Z`, for example `2026-11-11T13:30:00.000Z`). The field does not convert: it shows it as if it were local time. In Italy, in winter, you would see 13:30 instead of 14:30. For local time, build the text with the **parts** of the Now block (see example 2).

For the **time** kind you need a text that starts with the time: a text with the date in front (`2026-11-11T14:30`) leaves the field empty.

## Examples

### 1. A deadline

```
Window «Reminder»
└ Column (root)
  ├ Date and time  datetime1  Label «Deadline»  Kind date
  └ Value          value1     Label «Due on:»
```

```
[Date and time: Deadline] value (ISO) ──▶ value [Value: Due on:]
```

Choosing 11 November 2026 in the calendar, the Value shows «Due on: 2026-11-11».

### 2. Today, when opened

To make the field start with today's date (the **parts** of the Now block are in the time of the computer where lilOS runs):

```
[On start (main)] pulse ──▶ read [Now (date and time)] parts ──▶ object [Destructure object] year  ──▶ a [Template string: «{a}-{m}-{d}»] text ──▶ value (ISO) [Date and time: Deadline]
                                                                                  month ──▶ m
                                                                                  day   ──▶ d
```

In the [Destructure object](core.decompose) add the outputs **year**, **month** and **day**; in the [Template string](core.format) the inputs **a**, **m**, **d**, and remove «starts it» from **a** and **m** (so the text starts only once, with **d**).

> Month and day must have two digits (`2026-03-05`, not `2026-3-5`), otherwise the field stays empty. For months and days below 10, add the zero in the schema (for example with an [If · Else](core.if) and a [Compare (== != < >)](core.compare) `< 10`).

## Accessibility and keyboard

- It is the date/time field of the browser: you reach it with **Tab**; the **up/down arrows** change the selected part (day, month, year, hour…), the **right/left arrows** move from one part to another, and an icon opens the calendar. The exact behavior depends on the browser.
- The **Label** above is not linked to the field.

## See also

- [Now (date and time)](core.now) (the block), [Destructure object](core.decompose)
- [Text field](ui.text)
- [Standard UI components](logicstudio-ui)
