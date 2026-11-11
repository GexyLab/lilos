# play() (riproduci suono)

`hw.play` · Hardware · [Hardware](logicstudio-hardware) · versione 1

Suona un file audio della tua home dagli altoparlanti del computer dove gira lilOS: un campanello, un allarme, un messaggio registrato.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **suona** (`play`) | impulso | Suona il file. |
| **percorso** (`path`) | testo | Il file: prende il posto di **File**. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **finito** (`ended`) | impulso | Il suono è finito. |
| **Exception** (`error`) | oggetto | Il file non c'è, il formato non va, manca un programma per suonare… |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **File (.wav, .mp3…)** (`path`) | testo | `~/suono.wav` | Il file, nella tua home. |
| **Suona al massimo (secondi)** (`maxSeconds`) | da 1 a 600 | 120 | Un file più lungo si interrompe dopo questo tempo. |

## Come funziona

Il kernel legge il file **come te** dalla tua home (al massimo 50 MB), lo copia in un file temporaneo suo e lo suona con i programmi del sistema, sull'**uscita audio predefinita**. Il blocco non aspetta la fine per andare avanti: **finito** arriva quando il suono è finito.

| Sistema | Formati | Con che cosa |
|---|---|---|
| Windows | `.wav`; `.mp3`, `.wma`, `.m4a` | il lettore di Windows (PowerShell) |
| Linux | `.wav`, `.flac`, `.ogg`, `.aiff`; `.mp3`, `.m4a` con ffmpeg | `paplay` (PulseAudio) o `aplay` (ALSA); `ffplay` per gli altri |
| macOS | tutti | `afplay` |

Al massimo **2 suoni alla volta** per utente (insieme a [Tono · Beep](hw.tone) e [speechSynthesis.speak (sintesi vocale)](hw.speak)): un terzo dà errore. Un suono non si ferma a metà: dura al massimo **Suona al massimo**.

## Esempi

### 1. Un campanello

```
[Pulsante: Suona] premuto ──▶ suona [play() (riproduci suono): ~/suoni/campanello.wav] finito ──▶ valore [Print (console.log)]
```

### 2. Un allarme che si ripete

```
[Confronto (== ≠ < >): temperatura > 30] risultato ──▶ valore [Al cambio (fronte ↑↓)] diventa vero ──▶ suona [play() (riproduci suono): ~/suoni/allarme.mp3] finito ──▶ valore [Ritardo (setTimeout): 5 s] valore ──▶ suona
```

L'allarme suona, e dopo ogni volta aspetta 5 secondi e ricomincia (per fermarlo, metti un [If · Else](core.if) prima del ritardo).

## Errori

| Messaggio | Quando |
|---|---|
| Non hai il permesso di usare l'audio (microfono, altoparlanti, voce): chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) | Non hai il permesso per l'audio. |
| Si suonano solo file .wav, .mp3, .ogg, .flac, .m4a, .aiff, .wma: «~/x.txt» no | Il file non è un suono ammesso. |
| Su Windows i file .ogg non si suonano: usa .wav, .mp3 o .m4a | Lo stesso per `.flac` e `.aiff`. |
| Il file «~/suono.wav» non esiste | Il file non c'è. Gli altri errori dei percorsi sono quelli di [readFile](lilos.fileRead). |
| Il file «~/x.wav» è troppo grande: 60 MB (si leggono al massimo 50 MB) | Oltre 50 MB. |
| Troppi suoni insieme: al massimo 2 alla volta | Suonano già 2 suoni o voci dei tuoi programmi. |
| Manca un programma per suonare: installa pulseaudio-utils (paplay) o alsa-utils (aplay); per .mp3 e .m4a ffmpeg (ffplay) | Linux senza programmi per suonare. |
| Il suono non si sente: … | Il programma del sistema ha dato errore (nessuna uscita audio, file rovinato…). |

## Vedi anche

- [Tono · Beep](hw.tone), [speechSynthesis.speak (sintesi vocale)](hw.speak), [Volume di sistema (get · set · mute)](hw.volume)
- [Hardware](logicstudio-hardware)
