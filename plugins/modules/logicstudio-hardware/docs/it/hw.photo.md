# takePhoto (scatta foto)

`hw.photo` · Hardware · [Hardware](logicstudio-hardware) · versione 1

Scatta una foto con una webcam del computer dove gira lilOS. La foto (JPEG) può andare in un file della tua home, su un'uscita come immagine da mostrare in una finestra con un'[Immagine](ui.image), o tutte e due.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **scatta** (`take`) | impulso | Scatta la foto. |
| **percorso** (`path`) | testo | Il file dove salvarla: prende il posto di **File** e la fa salvare anche senza **Salvala in un file**. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **immagine (data URL)** (`image`) | testo | La foto come `data:image/jpeg;base64,…`, per l'ingresso **sorgente** di un'[Immagine](ui.image). |
| **file salvato** (`path`) | testo | Dove è stata salvata, per esempio `~/foto-2026-11-11_14-30-05.jpg`. |
| **scattata** (`taken`) | impulso | La foto è pronta. |
| **Exception** (`error`) | oggetto | La webcam non c'è, è usata da un altro programma, il file non si scrive… |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Webcam (nome; vuoto: la prima)** (`camera`) | testo | vuoto | La webcam, come la dà [enumerateDevices (webcam)](hw.webcamList). |
| **Salvala in un file** (`save`) | sì/no | no | Salva la foto in **File**. |
| **File (.jpg; {now} = data e ora)** (`path`) | testo | `~/foto-{now}.jpg` | Il file, nella tua home; deve finire in `.jpg` o `.jpeg`. |
| **Manda l'immagine su «immagine»** (`sendImage`) | sì/no | sì | Toglilo se la foto va solo nel file. |
| **Larghezza massima (px)** (`width`) | da 16 a 1280 | 640 | La foto si rimpicciolisce per starci, con le sue proporzioni. |
| **Altezza massima (px)** (`height`) | da 16 a 720 | 480 | |
| **Qualità JPEG (1-100)** (`quality`) | da 1 a 100 | 85 | Più alta: foto più bella e più pesante. |
| **Riscaldamento (secondi)** (`warmup`) | da 0 a 5 | 1 | Il tempo che la webcam ha per regolare luce e colori prima dello scatto: con 0 la foto viene spesso scura. |

## Come funziona

Il kernel scatta con **ffmpeg** (che deve essere installato: vedi [Hardware](logicstudio-hardware)), tiene l'ultima immagine dopo il **Riscaldamento** e la salva **come te** nella tua home, con le regole dei file dei [Blocchi di lilOS](logicstudio-lilos): la cartella deve esserci, il file viene sostituito se c'è già, lo spazio conta nella tua quota. `{now}` nel nome diventa la data e l'ora, così ogni foto ha il suo file.

Una foto dura circa il riscaldamento più uno o due secondi. Mentre un altro programma usa la webcam (per esempio con [Fotogrammi webcam (stream)](hw.webcamStream)), la foto non si fa.

L'immagine mandata su **immagine (data URL)** è al massimo 1 MB: con le impostazioni di serie è di solito tra 30 e 100 KB. Un'[Immagine](ui.image) mostra immagini fino a 2 MB.

## Esempi

### 1. Una foto con un pulsante

```
[Pulsante: Scatta] premuto ──▶ scatta [takePhoto (scatta foto)] immagine ──▶ sorgente [Immagine: image1]
```

La finestra mostra la foto appena scattata.

### 2. Una foto ogni ora, salvata

```
[Intervallo (setInterval): 3600 s] impulso ──▶ scatta [takePhoto (scatta foto): Salvala in un file, ~/serra/foto-{now}.jpg, senza immagine] file salvato ──▶ valore [Print (console.log)]
```

Ogni ora una foto nella cartella `~/serra` (che deve esistere), con la data e l'ora nel nome.

## Errori

| Messaggio | Quando |
|---|---|
| Non hai il permesso di usare la webcam: chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) | Non hai il permesso per la webcam. |
| Manca ffmpeg: installalo sul computer dove gira lilOS (…), poi riavvia lilOS | ffmpeg non c'è. |
| Non c'è nessuna webcam | **Webcam** è vuota e non ce n'è nessuna. |
| La webcam «Logitech» non c'è (webcam presenti: Integrated Camera) | Il nome non è nell'elenco. |
| «Integrated Camera» è già in uso nel programma «Ingresso»: chiudilo prima di aprirlo di nuovo | La webcam è usata da un altro tuo programma (o da un altro blocco). |
| «Integrated Camera» è già in uso da un altro programma | La usa il programma di un altro utente. |
| La webcam «Integrated Camera» non ha scattato: … | ffmpeg non è riuscito (la webcam è usata da un'altra applicazione del computer, non dà immagini…). |
| La foto si salva in un file .jpg: «~/foto.png» no | Il **File** non finisce in `.jpg` o `.jpeg`. |
| La cartella «~/serra» non esiste | La cartella del file non c'è. |
| La foto è troppo grande da mandare al programma (… KB, al massimo 1024 KB): abbassa qualità o dimensioni | L'immagine supera 1 MB. |
| Puoi usare solo i file della tua home (~/… oppure /home/anna/…): … | Gli errori dei percorsi sono quelli di [writeFile](lilos.fileWrite). |
| Spazio finito: la tua home ha raggiunto la sua quota | La quota della tua home è piena. |

## Vedi anche

- [enumerateDevices (webcam)](hw.webcamList), [Fotogrammi webcam (stream)](hw.webcamStream), [MediaRecorder video (registra video)](hw.videoRecord)
- [Immagine](ui.image)
- [Hardware](logicstudio-hardware)
