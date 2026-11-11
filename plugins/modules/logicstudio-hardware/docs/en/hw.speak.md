# speechSynthesis.speak (text to speech)

`hw.speak` · Hardware · [Hardware](logicstudio-hardware) · version 1

Reads a text aloud through the speakers of the computer where lilOS runs, with one of the voices of the system.

## Inputs

| Port | Type | Description |
|---|---|---|
| **text** (`text`) | text | The text to read: every value reads it. |
| **speak** (`speak`) | pulse | Reads the last **text** again (or the **Text** of the settings). Hidden. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **ended** (`ended`) | pulse | The reading has ended. |
| **Exception** (`error`) | object | Empty or too long text, a voice that is not there, a program for the voice is missing… |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Text (when «text» has none)** (`text`) | text | empty | The text to read with **speak**. |
| **Voice (name or language; empty: the default one)** (`voice`) | text | empty | The name of a voice, as given by [enumerateDevices (audio devices)](hw.audioDevices), or a language (`it-IT`). |
| **Speed (-10 … 10)** (`rate`) | from -10 to 10 | 0 | 0 is normal; negative slower, positive faster. |

## How it works

| System | Voices | With what |
|---|---|---|
| Windows | those installed in Windows (Settings → Time & language → Speech) | System.Speech, from PowerShell |
| Linux | those of espeak-ng (`sudo apt install espeak-ng`); otherwise Speech Dispatcher (`spd-say`) | espeak-ng |
| macOS | those of the system | `say` |

The text reaches the voice program as data (never as a command): any character is fine. At most **2000 characters**. The block does not wait: **ended** arrives when the reading has ended. At most 2 sounds or voices at a time per user.

## Examples

### 1. Saying the temperature

```
[SerialPort (COM port)] data ──▶ temp [Template string: "The temperature is {temp} degrees"] text ──▶ text [speechSynthesis.speak (text to speech): Microsoft Elsa Desktop]
```

### 2. A reminder

```
[Interval (setInterval): 3600 s] pulse ──▶ speak [speechSynthesis.speak (text to speech): Text «Time for a break»]
```

With the **speak** input shown in the Properties, every hour the computer reminds you of the break.

## Errors

The messages are in Italian, as users see them; the English meaning is in parentheses.

| Message | When |
|---|---|
| Non hai il permesso di usare l'audio (microfono, altoparlanti, voce): chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) ("You do not have permission to use audio (microphone, speakers, voice): ask an administrator (Control Panel → Logic Studio → Hardware)") | You do not have the permission for audio. |
| Non c'è testo da leggere ("There is no text to read") | The text is empty. |
| Testo troppo lungo da leggere: al massimo 2000 caratteri ("Text too long to read: at most 2000 characters") | Over 2000 characters. |
| La voce «Alice» non c'è (voci: Microsoft Elsa Desktop, Microsoft Zira Desktop) ("The voice «Alice» is not there (voices: Microsoft Elsa Desktop, Microsoft Zira Desktop)") | Neither the name nor the language is among the voices. |
| Velocità (da -10 a 10) non valido: … ("Speed (from -10 to 10) not valid: …") | Speed out of the limits. |
| Manca un programma per la voce: installa espeak-ng (sudo apt install espeak-ng) ("A program for the voice is missing: install espeak-ng (sudo apt install espeak-ng)") | Linux without espeak-ng or spd-say. |
| Troppi suoni insieme: al massimo 2 alla volta ("Too many sounds together: at most 2 at a time") | 2 sounds or voices of your programs are already playing. |
| La voce non parte: … ("The voice does not start: …") | The voice program gave an error. |

## See also

- [enumerateDevices (audio devices)](hw.audioDevices), for the voices
- [play() (play a sound)](hw.play), [Tone · Beep](hw.tone)
- [Hardware](logicstudio-hardware)
