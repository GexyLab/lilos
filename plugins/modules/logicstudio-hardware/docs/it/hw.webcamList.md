# enumerateDevices (webcam)

`hw.webcamList` · Hardware · [Hardware](logicstudio-hardware) · versione 1

Elenca le webcam del computer dove gira lilOS, con il nome da scrivere negli altri blocchi della webcam.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **elenca** (`list`) | impulso | Legge l'elenco adesso e lo manda. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **webcam** (`cameras`) | lista | Una webcam per elemento: `{ id, name }`. |
| **nomi** (`names`) | lista | Solo i nomi, per una [Selezione](ui.select). |
| **quante** (`count`) | numero | Quante webcam ci sono. |
| **Exception** (`error`) | oggetto | Permesso mancante, ffmpeg che manca. |

## Come funziona

| Sistema | Da dove viene l'elenco | `id` |
|---|---|---|
| Windows | ffmpeg (DirectShow) | il nome, per esempio `Integrated Camera` |
| Linux | `/sys/class/video4linux` (non serve ffmpeg per l'elenco) | il dispositivo, per esempio `/dev/video0` |
| macOS | ffmpeg (AVFoundation) | il numero, per esempio `0` |

Negli altri blocchi puoi scrivere il nome o l'`id`. Gli schermi (su macOS «Capture screen») non sono webcam e non compaiono. Su Linux compare un solo dispositivo per webcam (quello che fa le immagini).

Le «webcam virtuali» dei programmi (OBS, per esempio) compaiono se il sistema le mostra come webcam.

## Esempi

### 1. Scegliere la webcam

```
[All'avvio (main)] impulso ──▶ elenca [enumerateDevices (webcam)] nomi ──▶ opzioni [Selezione: select1]
```

### 2. C'è una webcam?

```
[Pulsante: Controlla] premuto ──▶ elenca [enumerateDevices (webcam)] quante ──▶ valore [Valore: value1]
```

## Errori

| Messaggio | Quando |
|---|---|
| Non hai il permesso di usare la webcam: chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) | Non hai il permesso per la webcam. |
| Manca ffmpeg: installalo sul computer dove gira lilOS (Windows: winget install ffmpeg; Debian, Ubuntu, Raspberry Pi: sudo apt install ffmpeg; macOS: brew install ffmpeg), poi riavvia lilOS | Windows e macOS senza ffmpeg. |
| ffmpeg non ha finito in tempo (15 s) | ffmpeg non ha risposto. |

## Vedi anche

- [takePhoto (scatta foto)](hw.photo), [Fotogrammi webcam (stream)](hw.webcamStream), [MediaRecorder video (registra video)](hw.videoRecord)
- [Hardware](logicstudio-hardware)
