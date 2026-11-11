# MIDI in · out

`hw.midi` · Hardware · [Hardware](logicstudio-hardware) · version 1

Connects a program to the MIDI instruments of the computer where lilOS runs: it receives notes, controls (knobs, pedals) and program changes from a keyboard or a controller, and sends messages to a synthesizer or to another port.

## Inputs

| Port | Type | Description |
|---|---|---|
| **open** (`open`) | pulse | Opens the ports chosen in the settings (input, output or both). |
| **close** (`close`) | pulse | Closes the ports. |
| **send** (`send`) | any | Sends a message (or a list of messages) to the output port: see below. |
| **list ports** (`list`) | pulse | Sends the MIDI ports of the computer on **ports**. Hidden. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **message** (`message`) | object | Every message received (see below). |
| **note** (`note`) | object | Only the notes (`noteon`, `noteoff`). |
| **control (CC)** (`cc`) | object | Only the controls. |
| **program change** (`program`) | object | Only the program changes. Hidden. |
| **ports** (`ports`) | object | `{ inputs: [names], outputs: [names] }`. Hidden. |
| **opened** (`opened`) | pulse | The ports have opened. |
| **closed** (`closed`) | pulse | The ports have closed. |
| **Exception** (`error`) | object | A port is not there, is used by another program, a message to send is not right… |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Input port (name; empty: none)** (`input`) | text | empty | The exact name of the port to receive from. |
| **Output port (name; empty: none)** (`output`) | text | empty | The exact name of the port to send to. |
| **Only channel (0 = all)** (`channel`) | from 0 to 16 | 0 | It receives only the messages of that channel; it is also the channel of the messages sent without a channel. |
| **Open at start** (`atStart`) | yes/no | no | Opens the ports when the program (or its group) starts. |

## How it works

The names of the ports are read with **list ports** (for example `Microsoft GS Wavetable Synth`, the Windows synthesizer). An input port opened by a program cannot be opened by another one while it stays open.

The messages are objects, with the channel from 1 to 16:

| Message | Object |
|---|---|
| Note pressed | `{ "type": "noteon", "channel": 1, "note": 60, "velocity": 100 }` |
| Note released | `{ "type": "noteoff", "channel": 1, "note": 60, "velocity": 0 }` (also a `noteon` with velocity 0) |
| Control | `{ "type": "cc", "channel": 1, "controller": 7, "value": 127 }` |
| Program change | `{ "type": "program", "channel": 1, "program": 5 }` |
| Pitch bend | `{ "type": "pitchbend", "channel": 1, "value": 0 }` (from -8192 to 8191) |
| Aftertouch | `{ "type": "aftertouch", "channel": 1, "value": 64 }`, `{ "type": "polyaftertouch", "channel": 1, "note": 60, "value": 64 }` |

On **send** you can send one of these objects (without **velocity** a `noteon` has 100), a list of objects (at most 64), or the bytes of the message (`[144, 60, 100]`). System Exclusive messages, clock and active sensing are neither received nor sent.

Note 60 is the middle C; every number more is a semitone.

## Examples

### 1. A MIDI keyboard that turns on a lamp

```
[MIDI in · out: input «USB Keyboard», Open at start] note ──▶ object [Get property: type] value ──▶ a [Compare (== != < >): a == b] result ──▶ on [Lamp: lamp1]
                                                                                                     [Constant · Variable: "noteon"] value ──▶ b
```

The [Lamp](ui.lamp) stays on as long as you hold down a key.

### 2. Playing a note with a button

```
[Button: C] pressed ──▶ send [Constant · Variable: JSON {"type": "noteon", "note": 60}] value ──▶ send [MIDI in · out: output «Microsoft GS Wavetable Synth», Open at start]
```

To stop the note, then send `{"type": "noteoff", "note": 60}`.

## Errors

The messages are in Italian, as users see them; the English meaning is in parentheses.

| Message | When |
|---|---|
| Non hai il permesso di usare i dispositivi MIDI: chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) ("You do not have permission to use the MIDI devices: ask an administrator (Control Panel → Logic Studio → Hardware)") | You do not have the permission for MIDI. |
| Scegli una porta MIDI di ingresso o di uscita nelle Proprietà ("Choose a MIDI input or output port in the Properties") | No port in the settings. |
| La porta MIDI di ingresso «USB Keyboard» non c'è (porte: …) ("The MIDI input port «USB Keyboard» is not there (ports: …)") | The name is not among the ports (the same for the output). |
| La porta MIDI «USB Keyboard» non si apre: … ("The MIDI port «USB Keyboard» does not open: …") | The system refuses the opening (on Windows an input port is used by another application). |
| «MIDI USB Keyboard» è già in uso da un altro programma ("«MIDI USB Keyboard» is already in use by another program") | The input port is open in another program. |
| La porta MIDI di uscita non è aperta: scrivila nelle Proprietà e manda un impulso ad «apri» ("The MIDI output port is not open: write it in the Properties and send a pulse to «open»") | A message on **send** without an open output port. |
| Messaggio MIDI non valido: serve un oggetto { type, channel, … } o una lista di byte ("MIDI message not valid: an object { type, channel, … } or a list of bytes is needed") | The value on **send** is not a message. |
| Tipo del messaggio MIDI non valido: … ("Type of the MIDI message not valid: …") | Unknown `type`. |
| Nota non valido: 200 (da 0 a 127) ("Note not valid: 200 (from 0 to 127)") | A number out of the limits (the same for the other fields). |
| Messaggio MIDI non valido: il primo byte è lo stato (da 128), niente System Exclusive ("MIDI message not valid: the first byte is the status (from 128), no System Exclusive") | Bytes not valid. |
| Troppi messaggi MIDI in una volta (al massimo 64) ("Too many MIDI messages at once (at most 64)") | A longer list. |
| La libreria @julusian/midi non funziona su questo computer: … ("The @julusian/midi library does not work on this computer: …") | The library does not load. |

## See also

- [Hardware](logicstudio-hardware)
