# Fotogrammi webcam (stream)

`hw.webcamStream` · Hardware · [Hardware](logicstudio-hardware) · versione 1

Manda le immagini di una webcam del computer dove gira lilOS, poche al secondo, come immagini da mostrare in un'[Immagine](ui.image) di una finestra: una telecamera di sorveglianza semplice, il controllo di una stampante 3D, chi suona alla porta.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **acceso** (`on`) | sì/no | `true` accende la webcam, `false` la spegne. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **immagine (data URL)** (`image`) | testo | Ogni fotogramma come `data:image/jpeg;base64,…`. |
| **in corso** (`running`) | sì/no | `true` quando la webcam si accende, `false` quando si spegne (anche da sola). |
| **Exception** (`error`) | oggetto | La webcam non c'è, è usata da un altro programma, si è fermata… |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Webcam (nome; vuoto: la prima)** (`camera`) | testo | vuoto | La webcam. |
| **Fotogrammi al secondo (al massimo 10)** (`fps`) | da 0,1 a 10 | 2 | Quante immagini al secondo. 0,1 = una ogni 10 secondi. |
| **Larghezza massima (px)** (`width`) | da 16 a 1280 | 320 | |
| **Altezza massima (px)** (`height`) | da 16 a 720 | 240 | |
| **Qualità JPEG (1-100)** (`quality`) | da 1 a 100 | 70 | |
| **Parte da solo** (`atStart`) | sì/no | no | Accende la webcam quando parte il programma (o il suo gruppo). |

## Come funziona

Il kernel tiene accesa la webcam con **ffmpeg** e manda al programma i fotogrammi come immagini JPEG. Non è un video: è una sequenza di foto, adatta a guardare cosa succede, non a un film. Ogni immagine passa dal kernel al programma e dal programma alla finestra: tienile piccole.

- Al massimo **10 fotogrammi al secondo** e **1280 × 720**.
- Un fotogramma più grande di 384 KB viene saltato: abbassa qualità o dimensioni.
- Se il programma o la finestra non fanno in tempo, si tengono solo gli ultimi 3 fotogrammi: si vede sempre l'immagine più recente.
- Mentre è accesa, la webcam non si usa da altri programmi (né da [takePhoto (scatta foto)](hw.photo) o [MediaRecorder video (registra video)](hw.videoRecord)).

La webcam si spegne con `false` su **acceso**, quando il blocco si ferma, o da sola se si scollega (con **in corso** `false` e un messaggio su **Exception**).

## Esempi

### 1. La webcam in una finestra

```
[Interruttore: toggle1] valore ──▶ acceso [Fotogrammi webcam (stream): 2 al secondo, 320 × 240] immagine ──▶ sorgente [Immagine: image1]
                                                                                         in corso ──▶ accesa [Spia: lamp1]
```

### 2. Sempre accesa, una immagine ogni 5 secondi

```
[Fotogrammi webcam (stream): Parte da solo, 0,2 al secondo, 640 × 480] immagine ──▶ sorgente [Immagine: image1]
```

Con 0,2 fotogrammi al secondo la finestra si aggiorna ogni 5 secondi e il computer lavora poco.

## Errori

| Messaggio | Quando |
|---|---|
| Non hai il permesso di usare la webcam: chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) | Non hai il permesso per la webcam. |
| Manca ffmpeg: installalo sul computer dove gira lilOS (…), poi riavvia lilOS | ffmpeg non c'è. |
| La webcam «Logitech» non c'è (webcam presenti: Integrated Camera) | Il nome non è nell'elenco. |
| «Integrated Camera» è già in uso nel programma «Ingresso»: chiudilo prima di aprirlo di nuovo | La usa un altro tuo programma. |
| «Integrated Camera» è già in uso da un altro programma | La usa il programma di un altro utente. |
| La webcam «Integrated Camera» si è fermata: … | ffmpeg si è fermato (la webcam è stata scollegata, è usata da un'altra applicazione…). |
| Fotogrammi al secondo non valido: … (da 0.1 a 10) | Lo stesso per dimensioni e qualità. |

## Vedi anche

- [Immagine](ui.image)
- [takePhoto (scatta foto)](hw.photo), [MediaRecorder video (registra video)](hw.videoRecord)
- [Hardware](logicstudio-hardware)
