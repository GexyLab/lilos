# MediaRecorder audio (registra audio)

`hw.audioRecord` · Hardware · [Hardware](logicstudio-hardware) · versione 1

Registra dal microfono del computer dove gira lilOS in un file della tua home.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **avvia** (`start`) | impulso | Comincia a registrare. |
| **ferma** (`stop`) | impulso | Smette e salva il file. |
| **percorso** (`path`) | testo | Il file: prende il posto di **File**. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **file salvato** (`saved`) | testo | Dove è stata salvata la registrazione. |
| **dimensione (byte)** (`size`) | numero | Quanto è grande il file. |
| **secondi** (`seconds`) | numero | Quanto è durata. |
| **registra** (`recording`) | sì/no | `true` quando comincia, `false` quando finisce. |
| **Exception** (`error`) | oggetto | Il microfono non c'è, il formato non va, il file non si scrive… |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Microfono (nome; vuoto: quello predefinito)** (`mic`) | testo | vuoto | Il microfono, come lo dà [enumerateDevices (dispositivi audio)](hw.audioDevices). |
| **File (.wav, .flac, .m4a, .mp3, .ogg; {now} = data e ora)** (`path`) | testo | `~/audio-{now}.wav` | Il file, nella tua home. |
| **Durata massima (secondi)** (`maxSeconds`) | da 1 a 1800 | 60 | La registrazione si ferma da sola dopo questo tempo. |

## Come funziona

Come [MediaRecorder video (registra video)](hw.videoRecord): il kernel registra con **ffmpeg** in un file temporaneo suo e, alla fine (con **ferma**, alla durata massima, quando il blocco o il programma si fermano), lo copia **come te** nella tua home.

| File | Formato |
|---|---|
| `.wav` | PCM 16 bit, senza compressione (grande ma va ovunque) |
| `.flac` | senza perdita, più piccolo |
| `.m4a` | AAC |
| `.mp3` | MP3, se ffmpeg lo sa scrivere |
| `.ogg` | Opus o Vorbis, se ffmpeg li sa scrivere |

Al massimo **30 minuti** e **500 MB**. La cartella del file deve esserci; un file che c'è già viene sostituito. Il microfono si può usare insieme da più blocchi (per esempio [Livello microfono (dB)](hw.micLevel)) se il sistema lo permette.

## Esempi

### 1. Un registratore

```
[Interruttore: toggle1] valore ──▶ condizione [If · Else] allora     ──▶ avvia [MediaRecorder audio (registra audio): ~/note/{now}.m4a] file salvato ──▶ testo [Etichetta: label1]
                                                    altrimenti ──▶ ferma
```

### 2. Registrare quando c'è rumore

```
[Livello microfono (dB): soglia -25] diventato forte ──▶ avvia [MediaRecorder audio (registra audio): durata massima 30 s, ~/rumori/{now}.wav]
```

Quando il livello passa sopra la soglia parte una registrazione di 30 secondi.

## Errori

| Messaggio | Quando |
|---|---|
| Non hai il permesso di usare l'audio (microfono, altoparlanti, voce): chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) | Non hai il permesso per l'audio. |
| Manca ffmpeg: installalo sul computer dove gira lilOS (…), poi riavvia lilOS | ffmpeg non c'è. |
| Sta già registrando: prima fermalo | **avvia** durante una registrazione. |
| Il file della registrazione deve finire in .wav, .flac, .m4a, .mp3, .ogg: «~/a.aac» no | Estensione non ammessa. |
| Questo ffmpeg non sa scrivere MP3: registra in .wav, .flac o .m4a | ffmpeg senza l'encoder MP3 (lo stesso per OGG). |
| Non c'è nessun microfono | **Microfono** è vuoto e non ce n'è nessuno. |
| Il microfono «USB Mic» non c'è (microfoni presenti: …) | Il nome non è nell'elenco. |
| La registrazione non è riuscita: … | ffmpeg non ha scritto niente (microfono scollegato o usato da un'altra applicazione…). |
| La cartella «~/note» non esiste | La cartella del file non c'è. |
| Spazio finito: la tua home ha raggiunto la sua quota | La quota della tua home è piena. |

## Vedi anche

- [Livello microfono (dB)](hw.micLevel), [MediaRecorder video (registra video)](hw.videoRecord), [play() (riproduci suono)](hw.play)
- [Hardware](logicstudio-hardware)
