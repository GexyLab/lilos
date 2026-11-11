# Tone · Beep

`hw.tone` · Hardware · [Hardware](logicstudio-hardware) · version 1

Makes a beep from the speakers of the computer where lilOS runs: a pure tone of a frequency, a length and a volume.

## Inputs

| Port | Type | Description |
|---|---|---|
| **play** (`play`) | pulse | Plays the tone. |
| **frequency (Hz)** (`hz`) | number | It takes the place of **Frequency (Hz)**. It does not start the block. Hidden. |
| **seconds** (`seconds`) | number | It takes the place of **Length (seconds)**. It does not start the block. Hidden. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **ended** (`ended`) | pulse | The tone has ended. |
| **Exception** (`error`) | object | Values out of the limits, no audio output… |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Frequency (Hz)** (`hz`) | from 20 to 20000 | 880 | 440 is the A; the higher, the sharper. |
| **Length (seconds)** (`seconds`) | from 0.01 to 10 | 0.2 | |
| **Volume (0-1)** (`volume`) | from 0 to 1 | 0.5 | Compared with the volume of the system. |

## How it works

The kernel prepares a WAV file with the tone (with an attack and a release of 5 milliseconds, to avoid a "click") and plays it like [play() (play a sound)](hw.play), on the default audio output. The block does not wait: **ended** arrives when the tone has ended. At most 2 sounds at a time per user.

## Examples

### 1. A beep when a message arrives

```
[SerialPort (COM port)] data ──▶ play [Tone · Beep: 1000 Hz, 0.1 s]
```

### 2. A two-tone alarm

```
[Button: Alarm] pressed ──▶ play [Tone · Beep: 880 Hz, 0.3 s] ended ──▶ play [Tone · Beep: 660 Hz, 0.3 s]
```

The second tone starts when the first one has ended: «dee-doh».

## Errors

The messages are in Italian, as users see them; the English meaning is in parentheses.

| Message | When |
|---|---|
| Non hai il permesso di usare l'audio (microfono, altoparlanti, voce): chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) ("You do not have permission to use audio (microphone, speakers, voice): ask an administrator (Control Panel → Logic Studio → Hardware)") | You do not have the permission for audio. |
| Frequenza (Hz) non valido: 5 (da 20 a 20000) ("Frequency (Hz) not valid: 5 (from 20 to 20000)") | The same for **Length (seconds)** (from 0.01 to 10) and **Volume** (from 0 to 1). |
| Troppi suoni insieme: al massimo 2 alla volta ("Too many sounds together: at most 2 at a time") | 2 sounds or voices of your programs are already playing. |
| Il suono non si sente: … ("The sound cannot be heard: …") | The program of the system gave an error (no audio output…). |

## See also

- [play() (play a sound)](hw.play), [speechSynthesis.speak (text to speech)](hw.speak)
- [Hardware](logicstudio-hardware)
