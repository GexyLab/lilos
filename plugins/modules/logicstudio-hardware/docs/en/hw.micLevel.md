# Microphone level (dB)

`hw.micLevel` · Hardware · [Hardware](logicstudio-hardware) · version 1

Measures how loud the sound that reaches the microphone of the computer where lilOS runs is, a few times a second, in decibels; it warns when a threshold is passed. It records nothing.

## Inputs

| Port | Type | Description |
|---|---|---|
| **on** (`on`) | yes/no | `true` starts measuring, `false` stops. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **level (dB)** (`db`) | number | The average level (RMS) of each measure, from -120 (silence) to 0 (the maximum). |
| **peak (dB)** (`peak`) | number | The peak of each measure. Hidden. |
| **over the threshold** (`over`) | yes/no | Changes when the level goes over or under the **Threshold**. |
| **got loud** (`loud`) | pulse | The level has just gone over the threshold. |
| **Exception** (`error`) | object | The microphone is not there, ffmpeg is missing, the measuring stopped… |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Microphone (name; empty: the default one)** (`mic`) | text | empty | The microphone. |
| **Measures a second** (`hz`) | from 0.5 to 20 | 5 | How many times a second the level arrives. |
| **Threshold (dB)** (`threshold`) | from -120 to 0 | -30 | |
| **Starts on its own** (`atStart`) | yes/no | no | Starts measuring when the program (or its group) starts. |

## How it works

The kernel listens to the microphone with **ffmpeg** and calculates its level (astats filter): the sound is neither saved nor sent to the program, only the numbers. The decibels are "dBFS": 0 is the loudest sound the microphone records, -120 is silence. A quiet room is usually between -60 and -45, a close voice between -30 and -15; the right threshold depends on the microphone: try first by looking at **level (dB)**.

If the program is not in time, the last 50 measures are kept.

## Examples

### 1. A noise indicator

```
[Microphone level (dB): Starts on its own, 5 a second] level (dB) ──▶ value [Gauge: gauge1]
```

With the [Gauge](ui.gauge) from -90 to 0.

### 2. Warning when the baby cries

```
[Microphone level (dB): Starts on its own, threshold -25] got loud ──▶ value [Debounce: 10 s] value ──▶ send [Notify: "Noise in the nursery"]
```

The [Debounce](core.debounce) sends only one notification even if the noise goes on.

## Errors

The messages are in Italian, as users see them; the English meaning is in parentheses.

| Message | When |
|---|---|
| Non hai il permesso di usare l'audio (microfono, altoparlanti, voce): chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) ("You do not have permission to use audio (microphone, speakers, voice): ask an administrator (Control Panel → Logic Studio → Hardware)") | You do not have the permission for audio. |
| Manca ffmpeg: installalo sul computer dove gira lilOS (…), poi riavvia lilOS ("ffmpeg is missing: install it on the computer where lilOS runs (…), then restart lilOS") | ffmpeg is not there. |
| Non c'è nessun microfono ("There is no microphone") | No microphone. |
| Il microfono «USB Mic» non c'è (microfoni presenti: …) ("The microphone «USB Mic» is not there (microphones present: …)") | The name is not in the list. |
| Il microfono «Microfono (Realtek(R) Audio)» si è fermato: … ("The microphone «Microfono (Realtek(R) Audio)» stopped: …") | ffmpeg stopped (microphone unplugged…). |
| Misure al secondo non valido: … (da 0.5 a 20) ("Measures a second not valid: … (from 0.5 to 20)") | Out of the limits. |

## See also

- [MediaRecorder audio (record audio)](hw.audioRecord), [enumerateDevices (audio devices)](hw.audioDevices)
- [Hardware](logicstudio-hardware)
