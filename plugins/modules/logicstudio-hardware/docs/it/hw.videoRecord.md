# MediaRecorder video (registra video)

`hw.videoRecord` · Hardware · [Hardware](logicstudio-hardware) · versione 1

Registra un video con una webcam del computer dove gira lilOS, anche con l'audio di un microfono, in un file della tua home.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **avvia** (`start`) | impulso | Comincia a registrare. |
| **ferma** (`stop`) | impulso | Smette e salva il file. |
| **percorso** (`path`) | testo | Il file: prende il posto di **File**. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **file salvato** (`saved`) | testo | Dove è stato salvato il video, per esempio `~/video-2026-11-11_14-30-05.mp4`. |
| **dimensione (byte)** (`size`) | numero | Quanto è grande il file. |
| **secondi** (`seconds`) | numero | Quanto è durata la registrazione. |
| **registra** (`recording`) | sì/no | `true` quando comincia, `false` quando finisce. |
| **Exception** (`error`) | oggetto | La webcam non c'è, è usata, il file non si scrive, la registrazione non riesce… |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Webcam (nome; vuoto: la prima)** (`camera`) | testo | vuoto | La webcam. |
| **Audio da (nome del microfono; vuoto: senza audio)** (`mic`) | testo | vuoto | Il microfono, come lo dà [enumerateDevices (dispositivi audio)](hw.audioDevices). Serve anche il permesso per l'audio. |
| **File (.mp4, .mkv, .avi; {now} = data e ora)** (`path`) | testo | `~/video-{now}.mp4` | Il file, nella tua home. |
| **Durata massima (secondi)** (`maxSeconds`) | da 1 a 1800 | 60 | La registrazione si ferma da sola dopo questo tempo. |
| **Larghezza massima (px)** (`width`) | da 16 a 1280 | 1280 | |
| **Altezza massima (px)** (`height`) | da 16 a 720 | 720 | |

## Come funziona

Il kernel registra con **ffmpeg** in un file temporaneo suo; quando la registrazione finisce (con **ferma**, alla **Durata massima**, quando il blocco o il programma si fermano) lo copia **come te** nella tua home e manda **file salvato**, **dimensione (byte)**, **secondi** e **registra** `false`. Se si ferma il programma, il video viene salvato lo stesso.

| File | Video | Audio |
|---|---|---|
| `.mp4`, `.mkv` | H.264 (se ffmpeg lo ha, altrimenti MPEG-4) | AAC |
| `.avi` | MJPEG | PCM |

- Al massimo **30 minuti** e **500 MB**: oltre, la registrazione si ferma da sola.
- La cartella del file deve esserci; un file che c'è già viene sostituito; lo spazio conta nella tua quota.
- Mentre registra, la webcam non si usa da altri blocchi o programmi.
- Il salvataggio di un video lungo può durare qualche secondo dopo **ferma**.

## Esempi

### 1. Registrare con due pulsanti

```
[Pulsante: Registra] premuto ──▶ avvia [MediaRecorder video (registra video): ~/video/{now}.mp4] file salvato ──▶ testo [Etichetta: label1]
[Pulsante: Ferma]    premuto ──▶ ferma                                                          registra     ──▶ accesa [Spia: lamp1]
```

### 2. Dieci secondi quando scatta un sensore

```
[GPIO (gpioget · gpioset): fronti di salita, linea 17] fronte di salita ──▶ avvia [MediaRecorder video (registra video): durata massima 10 s, ~/allarmi/{now}.mp4]
```

Ogni volta che il sensore scatta, un video di 10 secondi nella cartella `~/allarmi`. Se scatta mentre sta già registrando, il blocco manda su **Exception** «Sta già registrando: prima fermalo» e il video in corso continua.

## Errori

| Messaggio | Quando |
|---|---|
| Non hai il permesso di usare la webcam: chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) | Non hai il permesso per la webcam (con l'audio serve anche quello per l'audio). |
| Manca ffmpeg: installalo sul computer dove gira lilOS (…), poi riavvia lilOS | ffmpeg non c'è. |
| Sta già registrando: prima fermalo | **avvia** durante una registrazione. |
| Il file della registrazione deve finire in .mp4, .mkv, .avi: «~/video.mov» no | Estensione non ammessa. |
| La webcam «Logitech» non c'è (webcam presenti: Integrated Camera) | Il nome non è nell'elenco. |
| Il microfono «USB Mic» non c'è (microfoni presenti: …) | Il microfono non è nell'elenco. |
| «Integrated Camera» è già in uso da un altro programma | La webcam è usata da un altro programma. |
| La registrazione non è riuscita: … | ffmpeg non ha scritto niente (la webcam non dà immagini, è usata da un'altra applicazione…). |
| La cartella «~/video» non esiste | La cartella del file non c'è. |
| Spazio finito: la tua home ha raggiunto la sua quota | La quota della tua home è piena. |
| Durata massima (secondi) non valido: … (da 1 a 1800) | Il numero è fuori dai limiti. |

## Vedi anche

- [MediaRecorder audio (registra audio)](hw.audioRecord), [takePhoto (scatta foto)](hw.photo), [Fotogrammi webcam (stream)](hw.webcamStream)
- [Hardware](logicstudio-hardware)
