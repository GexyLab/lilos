# Stampanti · Stampa (lp)

`hw.printers` · Hardware · [Hardware](logicstudio-hardware) · versione 1

Elenca le stampanti del computer dove gira lilOS e stampa un file della tua home: un testo, un PDF, una foto.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **elenca** (`list`) | impulso | Manda l'elenco delle stampanti. |
| **stampa** (`print`) | impulso | Stampa il file. |
| **percorso** (`path`) | testo | Il file: prende il posto di **File**. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **stampanti** (`printers`) | lista | Una stampante per elemento: `{ name, status, default, local, shared }`. |
| **mandato in stampa** (`printed`) | impulso | Il file è stato mandato alla stampante. |
| **Exception** (`error`) | oggetto | La stampante non c'è, il file non c'è o non si stampa… |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Stampante (nome; vuoto: quella predefinita)** (`printer`) | testo | vuoto | Il nome esatto, come nell'elenco. |
| **File (.txt, .pdf, .png, .jpg…)** (`path`) | testo | `~/stampa.txt` | Il file, nella tua home. |

## Come funziona

Il kernel legge il file **come te** dalla tua home (al massimo 20 MB), lo copia in un file temporaneo suo e lo manda alla stampante:

| Sistema | File | Come |
|---|---|---|
| Linux, macOS | `.txt`, `.csv`, `.log`, `.md`, `.json`, `.pdf`, `.png`, `.jpg`, `.jpeg`, `.gif`, `.bmp` | CUPS (comando `lp`) |
| Windows | testi (`.txt`, `.csv`, `.log`, `.md`, `.json`) e immagini (`.png`, `.jpg`, `.jpeg`, `.gif`, `.bmp`); **non i PDF** | i testi con Out-Printer, le immagini adattate alla pagina |

Si stampano solo questi tipi di file: mai un file che un'applicazione aprirebbe o eseguirebbe. **mandato in stampa** vuol dire che la stampante (o la sua coda) ha preso il file, non che il foglio è uscito.

Anche le «stampanti» che salvano in PDF (Microsoft Print to PDF, PDFCreator) compaiono, ma possono aprire una finestra sul computer per chiedere dove salvare: per un programma attivo scegli una stampante vera.

## Esempi

### 1. Stampare un rapporto

```
[Pulsante: Stampa] premuto ──▶ stampa [Stampanti · Stampa (lp): ~/rapporti/oggi.txt] mandato in stampa ──▶ invia [Notify: "Rapporto in stampa"]
```

### 2. Scegliere la stampante

```
[All'avvio (main)] impulso ──▶ elenca [Stampanti · Stampa (lp)] stampanti ──▶ righe [Tabella: table1]
```

Il nome si legge nella colonna `name`; scrivilo in **Stampante**.

## Errori

| Messaggio | Quando |
|---|---|
| Non hai il permesso di usare le informazioni di sistema e le stampanti: chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) | Non hai il permesso per le stampanti. |
| Si stampano solo file txt, csv, log, md, json, pdf, png, jpg, jpeg, gif, bmp: «~/x.docx» no | Il tipo di file non si stampa. |
| Su Windows i PDF non si stampano da Logic Studio: stampa un'immagine o un testo | Un PDF su Windows. |
| La stampante «Ufficio» non c'è | Il nome non è nell'elenco. |
| Non c'è una stampante predefinita: scegline una | **Stampante** è vuota e il sistema non ha una predefinita. |
| Il file «~/stampa.txt» non esiste | Il file non c'è. Gli altri errori dei percorsi sono quelli di [readFile](lilos.fileRead). |
| Il file «~/x.pdf» è troppo grande: 25 MB (si leggono al massimo 20 MB) | Oltre 20 MB. |
| Manca il comando lp (CUPS): installa cups-client | Linux senza CUPS. |
| La stampa non è partita: … | La stampante o il sistema hanno rifiutato il file. |

## Vedi anche

- [writeFile](lilos.fileWrite), per preparare il testo da stampare
- [Hardware](logicstudio-hardware)
