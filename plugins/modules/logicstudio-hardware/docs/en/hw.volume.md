# System volume (get · set · mute)

`hw.volume` · Hardware · [Hardware](logicstudio-hardware) · version 1

Reads and changes the volume of the default audio output of the computer where lilOS runs, and mutes it.

## Inputs

| Port | Type | Description |
|---|---|---|
| **read** (`read`) | pulse | Reads the volume. |
| **set (0-100)** (`set`) | number | Sets the volume, from 0 to 100. |
| **mute** (`mute`) | yes/no | `true` mutes, `false` unmutes. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **volume (0-100)** (`volume`) | number | The volume after the operation. |
| **muted** (`muted`) | yes/no | Whether the output is muted. |
| **Exception** (`error`) | object | Volume not valid, no audio output, a program is missing… |

## How it works

Each input does its operation and sends the two outputs with the volume of the moment.

| System | With what |
|---|---|
| Windows | Windows Core Audio (from PowerShell) |
| Linux | PulseAudio (`pactl`), otherwise ALSA (`amixer`, Master control) |
| macOS | `osascript` |

On Windows every operation takes about a second (PowerShell prepares the code for the volume). The volume is that of the computer: it changes for everybody, not only for the program.

## Examples

### 1. A slider for the volume

```
[On start (main)] pulse ──▶ read [System volume (get · set · mute)] volume (0-100) ──▶ value [Slider: slider1] value ──▶ set
```

The [Slider](ui.slider) starts from the current volume and changes it when you move it. (To avoid a loop, the link from the slider goes to **set**, and the one to the slider starts from **read** only at start.)

### 2. Muted at night

```
[Interval (setInterval): 60 s] pulse ──▶ read [Now (date and time)] parts ──▶ object [Get property: hour] value ──▶ a [Compare (== != < >): a >= b] result ──▶ value [On change (edge)] value ──▶ mute [System volume (get · set · mute)]
                                                                                    [Constant · Variable: 22] value ──▶ b
```

At 22 the computer goes mute (and at 0 the mute is removed).

## Errors

The messages are in Italian, as users see them; the English meaning is in parentheses.

| Message | When |
|---|---|
| Non hai il permesso di usare l'audio (microfono, altoparlanti, voce): chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) ("You do not have permission to use audio (microphone, speakers, voice): ask an administrator (Control Panel → Logic Studio → Hardware)") | You do not have the permission for audio. |
| Il volume è un numero da 0 a 100 ("The volume is a number from 0 to 100") | Something that is not a number arrived on **set**. |
| Volume (da 0 a 100) non valido: 150 (da 0 a 100) ("Volume (from 0 to 100) not valid: 150 (from 0 to 100)") | The number is out of the limits. |
| Il volume non si legge: … ("The volume cannot be read: …") | No audio output, or the system does not answer. |
| Manca un programma per il volume: installa pulseaudio-utils (pactl) o alsa-utils (amixer) ("A program for the volume is missing: install pulseaudio-utils (pactl) or alsa-utils (amixer)") | Linux without pactl or amixer. |

## See also

- [play() (play a sound)](hw.play), [Tone · Beep](hw.tone)
- [Hardware](logicstudio-hardware)
