# Volume di sistema (get · set · mute)

`hw.volume` · Hardware · [Hardware](logicstudio-hardware) · versione 1

Legge e cambia il volume dell'uscita audio predefinita del computer dove gira lilOS, e la mette muta.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **leggi** (`read`) | impulso | Legge il volume. |
| **imposta (0-100)** (`set`) | numero | Imposta il volume, da 0 a 100. |
| **muto** (`mute`) | sì/no | `true` mette muto, `false` toglie il muto. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **volume (0-100)** (`volume`) | numero | Il volume dopo l'operazione. |
| **muto** (`muted`) | sì/no | Se l'uscita è muta. |
| **Exception** (`error`) | oggetto | Volume non valido, nessuna uscita audio, manca un programma… |

## Come funziona

Ogni ingresso fa l'operazione e manda le due uscite con il volume di adesso.

| Sistema | Con che cosa |
|---|---|
| Windows | Core Audio di Windows (da PowerShell) |
| Linux | PulseAudio (`pactl`), altrimenti ALSA (`amixer`, controllo Master) |
| macOS | `osascript` |

Su Windows ogni operazione dura circa un secondo (PowerShell prepara il codice per il volume). Il volume è quello del computer: cambia per tutti, non solo per il programma.

## Esempi

### 1. Un cursore per il volume

```
[All'avvio (main)] impulso ──▶ leggi [Volume di sistema (get · set · mute)] volume (0-100) ──▶ valore [Cursore: slider1] valore ──▶ imposta
```

Il [Cursore](ui.slider) parte dal volume attuale e lo cambia quando lo muovi. (Per non creare un ciclo, il collegamento dal cursore va su **imposta**, quello verso il cursore parte da **leggi** soltanto all'avvio.)

### 2. Muto di notte

```
[Intervallo (setInterval): 60 s] impulso ──▶ leggi [Now (data e ora)] parti ──▶ oggetto [Get proprietà (obj.campo): hour] valore ──▶ a [Confronto (== ≠ < >): a >= b] risultato ──▶ valore [Al cambio (fronte ↑↓)] valore ──▶ muto [Volume di sistema (get · set · mute)]
                                                                                       [Costante · Variabile: 22] valore ──▶ b
```

Alle 22 il computer va muto (e alle 0 il muto si toglie).

## Errori

| Messaggio | Quando |
|---|---|
| Non hai il permesso di usare l'audio (microfono, altoparlanti, voce): chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) | Non hai il permesso per l'audio. |
| Il volume è un numero da 0 a 100 | Su **imposta** è arrivato qualcosa che non è un numero. |
| Volume (da 0 a 100) non valido: 150 (da 0 a 100) | Il numero è fuori dai limiti. |
| Il volume non si legge: … | Nessuna uscita audio, o il sistema non risponde. |
| Manca un programma per il volume: installa pulseaudio-utils (pactl) o alsa-utils (amixer) | Linux senza pactl né amixer. |

## Vedi anche

- [play() (riproduci suono)](hw.play), [Tono · Beep](hw.tone)
- [Hardware](logicstudio-hardware)
