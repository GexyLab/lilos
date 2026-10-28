# Guida utente

lilOS è un desktop che si usa dal browser. Al posto di uno schermo fisso c'è una **scrivania infinita**: puoi spostarti in qualsiasi direzione, ingrandire e rimpicciolire, e sistemare cartelle, file e app dove preferisci.

> lilOS è in sviluppo. Per ora le app disponibili sono **File**, **Editor** e **Impostazioni**.

## Lo schermo

- **La scrivania** occupa quasi tutto lo schermo. Lo sfondo a puntini ti aiuta a capire quando ti stai spostando o stai cambiando zoom.
- **Il pannello in basso a destra** mostra una mappa in miniatura della scrivania e i controlli dello zoom.
- **La barra in basso**: a sinistra il pulsante con il logo di lilOS, che apre il menu di avvio; al centro un pulsante per ogni finestra aperta; a destra il tuo nome, la data e l'ora. Passando sopra la data vedi la data completa.

## Muoversi sulla scrivania

### Spostarsi

- Tieni premuto **Spazio** e trascina: il puntatore diventa una mano e puoi spostarti partendo da qualsiasi punto, anche da sopra un'icona.
- Oppure trascina tenendo premuto il **tasto centrale** (la rotella).
- Su uno schermo touch, trascina un punto vuoto con un dito.

Trascinare un punto vuoto con il tasto sinistro non sposta la scrivania: disegna un rettangolo di selezione (vedi [Selezionare](#selezionare)).

### Zoom

- **Rotella del mouse**: ingrandisce o rimpicciolisce attorno al punto in cui si trova il puntatore.
- **Pizzico sul trackpad** o **Ctrl + rotella**: zoom più rapido.
- **Ctrl +** e **Ctrl −**: ingrandisci e riduci al centro dello schermo.
- **Ctrl 0**, oppure un clic sulla percentuale nel pannello: torna al 100%.

Lo zoom va dal 10% al 300%.

### La mappa in miniatura

La mappa mostra tutti gli elementi della scrivania. Il rettangolo blu è la parte che stai guardando. Fai clic o trascina sulla mappa per spostarti lì.

### Mostra tutto

**Shift 1**, oppure il pulsante con le quattro frecce nel pannello, inquadra tutti gli elementi della scrivania. Se la scrivania è vuota, torna al punto di partenza.

Il pulsante **?** nel pannello ricorda i comandi principali.

## Cartelle, file e app

Sulla scrivania ci sono tre tipi di elementi:

- **Cartelle**, con l'icona a forma di cartella.
- **File**, con un foglio bianco e una fascia colorata che riporta l'estensione (TXT, PDF, …). Il colore dipende dal tipo di file, vedi [Tipi di file](#tipi-di-file).
- **App**, con un riquadro colorato e il simbolo dell'app: sono collegamenti per avviarla.

Al primo avvio trovi alcuni elementi di esempio: la cartella Progetti, il file benvenuto.txt e i collegamenti a File, Terminale e Impostazioni.

Gli elementi della scrivania sono il contenuto della cartella **Scrivania**: li ritrovi anche nell'app [File](#lapp-file).

### Selezionare

- **Clic** su un elemento per selezionarlo.
- **Ctrl + clic** (o **Shift + clic**) per aggiungere o togliere un elemento dalla selezione.
- **Rettangolo di selezione**: tieni premuto il tasto sinistro su un punto vuoto e trascina. Si selezionano gli elementi che il rettangolo tocca.
- **Selezione a mano libera**: tieni premuto **Alt** e trascina su un punto vuoto. Disegni un percorso chiuso che segue il mouse; si selezionano gli elementi che hanno il centro dentro il percorso. La combinazione si cambia in Impostazioni → Usabilità → Scorciatoie, sezione Mouse.
- Tenendo premuto **Ctrl** (o **Shift**) mentre disegni il rettangolo o il percorso, gli elementi si aggiungono a quelli già selezionati.
- **Ctrl A** seleziona tutto.
- Un clic su un punto vuoto, oppure **Esc**, toglie la selezione.

Quando un elemento è selezionato, il nome viene mostrato per intero (fino a quattro righe).

### Spostare

Trascina un elemento dove vuoi. Se più elementi sono selezionati, si spostano tutti insieme. Al rilascio si allineano a una griglia invisibile, così restano in ordine.

### Aprire

**Doppio clic** oppure **Invio** sugli elementi selezionati. Le cartelle si aprono nell'app [File](#lapp-file), le app si avviano, i file si aprono con l'app associata al loro tipo (i file di testo e di codice nell'[Editor](#leditor)). Se nessuna app è associata compare la finestra [Apri con](#apri-con).

Con il tasto destro su un file, **Apri con…** permette di scegliere l'app anche quando ce n'è già una associata.

### Creare cartelle e file

Fai clic con il **tasto destro** su un punto vuoto e scegli **Nuova cartella** o **Nuovo file di testo**. L'elemento compare dove hai fatto clic e puoi scriverne subito il nome.

Un file di testo nuovo è vuoto: aprilo nell'Editor per scriverci.

### Rinominare

Seleziona un solo elemento e premi **F2**, oppure tasto destro → **Rinomina**. Il nome viene selezionato senza l'estensione, così puoi riscriverlo senza toccare ".txt".

- **Invio** conferma, **Esc** annulla.
- Facendo clic altrove il nome viene confermato.
- Se esiste già un elemento con lo stesso nome (senza distinguere maiuscole e minuscole), lilOS aggiunge un numero: "Progetti 2", "note 2.txt".

Cambiando l'estensione di un file cambia anche la sua icona.

### Eliminare

Premi **Canc**, oppure tasto destro → **Elimina**.

> Attenzione: l'eliminazione è definitiva, non c'è un cestino. Se elimini una cartella che contiene qualcosa, lilOS chiede prima conferma, perché viene eliminato anche tutto il suo contenuto; negli altri casi l'eliminazione è immediata.

### Riordinare

Tasto destro su un punto vuoto → **Riordina icone**. Gli elementi vengono messi in colonna nella parte di scrivania che stai guardando: prima le cartelle, poi i file, poi le app, ciascun gruppo in ordine alfabetico.

## L'app File

**File** mostra le cartelle e il loro contenuto. Aprila dal menu di avvio o dal collegamento sulla scrivania, oppure fai doppio clic su una cartella della scrivania: si apre direttamente lì. Dal tasto destro su un punto vuoto della scrivania, **Apri la Scrivania in File** mostra gli elementi della scrivania come elenco.

- **A sinistra**, in **Risorse**: Home e le cartelle principali, cioè Scrivania, Documenti, Immagini e Download. Queste cartelle non si possono rinominare né eliminare.
- **In alto**: Indietro, Avanti, Cartella superiore; il percorso (fai clic su una parte per tornarci); **Nuova cartella**; vista **elenco** o **a icone**; la ricerca nella cartella aperta (Esc la svuota).
- **Al centro**: il contenuto della cartella. In vista elenco ci sono le colonne Nome, Modificato, Dimensione e Tipo: fai clic su un'intestazione per ordinare, di nuovo per invertire l'ordine. Le cartelle restano sempre in cima.
- **In basso**: quanti elementi ci sono e quanti sono selezionati, il percorso della cartella o un messaggio.

Con gli elementi della cartella fai le stesse cose della scrivania: clic, Ctrl + clic, **Shift + clic** per selezionare un intervallo, doppio clic o Invio per aprire, F2 per rinominare, Canc per eliminare, Ctrl A per selezionare tutto. Dal tasto destro su un punto vuoto puoi creare cartelle e file di testo.

Tasti per muoversi nell'elenco (non modificabili):

| Tasti | Azione |
| --- | --- |
| Frecce (con Shift per estendere la selezione), Home, Fine | Muoviti tra gli elementi |
| Backspace o Alt ↑ | Cartella superiore |
| Alt ← / Alt → | Indietro / Avanti |

Quello che fai in File vale anche per la scrivania, e viceversa: una cartella creata in Scrivania compare subito sulla scrivania.

## L'Editor

L'**Editor** apre e modifica i file di testo e di codice (txt, md, js, css, html, json, py e altri). Si apre facendo doppio clic su un file, dal menu di avvio o con **Ctrl Alt N** per un documento nuovo.

- **A sinistra**, i numeri di riga; la riga su cui si trova il cursore è evidenziata.
- **Colori**: parole chiave, testi, numeri e commenti sono colorati secondo il linguaggio, riconosciuto dall'estensione del file. Puoi cambiarlo dal menu in alto a destra (Testo, Markdown, JavaScript, CSS, HTML, JSON, Python).
- **In alto**: Nuovo documento, Salva, Mostra nella cartella (apre File dove si trova il file).
- **In basso**: riga e colonna del cursore, numero di righe, stato del documento (Salvato, Modificato, Nuovo documento).

Mentre scrivi:

| Tasti | Azione |
| --- | --- |
| Ctrl S | Salva |
| Ctrl Alt N | Nuovo documento |
| Tab / Shift Tab | Aggiunge / toglie un rientro di due spazi |
| Invio | Va a capo mantenendo il rientro della riga |
| Ctrl Z | Annulla |
| Esc | Esce dal testo (poi Tab sposta il focus sui pulsanti) |

Ctrl S e Ctrl Alt N si cambiano in Impostazioni → Usabilità → Scorciatoie, sezione Editor.

Un documento nuovo, al primo salvataggio, viene creato nella cartella **Documenti** con il nome "Senza titolo.txt"; poi puoi rinominarlo dall'app File o dalla scrivania.

Il titolo della finestra mostra un pallino (•) quando ci sono modifiche non salvate. Se chiudi la finestra, apri un altro file o crei un documento nuovo con modifiche non salvate, l'Editor chiede: **Salva**, **Non salvare** o **Annulla**. Anche chiudendo o ricaricando la pagina del browser compare un avviso.

L'Editor apre un documento alla volta. Se il file aperto viene rinominato altrove, il titolo si aggiorna; se viene eliminato, il testo resta nell'Editor finché non lo salvi (viene ricreato in Documenti).

## Apri con

Quando apri un file e nessuna app è associata al suo tipo (o hai scelto "Chiedi ogni volta"), compare la finestra **Apri con**:

- scegli l'app nell'elenco (frecce su e giù, o clic);
- spunta **Usa sempre quest'app per i file .xxx** per non doverlo più scegliere;
- **Apri** (o Invio, o doppio clic sull'app) apre il file; **Annulla** o Esc chiude.

Se nessuna app installata può aprire il file, la finestra lo dice.

## Le finestre

Le app si aprono in finestre appoggiate sulla scrivania, come gli altri elementi: si spostano e si ingrandiscono insieme alla scrivania.

- **Spostare**: trascina la barra del titolo.
- **Ridimensionare**: trascina un bordo o un angolo qualsiasi. Il puntatore cambia forma quando sei sopra; puoi afferrare il bordo anche puntando appena fuori dalla finestra. Ogni finestra ha una dimensione minima, e alcune app possono avere una dimensione fissa o ridimensionarsi solo in alcune direzioni.
- **Ingrandire**: pulsante con il quadrato, oppure doppio clic sulla barra del titolo. La finestra diventa grande come lo schermo e la vista torna al 100%. Ripeti per tornare com'era.
- **Ridurre a icona**: pulsante con il trattino. La finestra sparisce dalla scrivania ma il suo pulsante resta nella barra in basso.
- **Chiudere**: pulsante con la ×.

Alcune app possono non avere tutti e tre i pulsanti: per esempio una finestra piccola senza il pulsante per ingrandirla. In quel caso anche il doppio clic sul titolo, il pulsante nella barra o Alt W non fanno quella cosa.

Nella barra in basso, il pulsante di una finestra la porta in primo piano e la mostra, anche se era ridotta a icona o fuori dalla vista. Se la finestra è già in primo piano, lo stesso pulsante la riduce a icona.

Fai clic su una finestra per portarla davanti alle altre. Mentre una finestra è in primo piano, i tasti come Canc o Ctrl A agiscono sulla finestra e non sugli elementi della scrivania. Fai clic su un punto della scrivania per tornare a usarli sugli elementi.

Ogni app ha una sola finestra: avviandola di nuovo torna in primo piano quella già aperta.

La rotella sopra il contenuto di una finestra lo fa scorrere; Ctrl + rotella fa sempre zoom.

## Impostazioni

Apri **Impostazioni** dal menu di avvio, dal pulsante con l'ingranaggio in fondo al menu, o dal collegamento sulla scrivania.

A sinistra ci sono le sezioni; alcune sono divise in schede, elencate in orizzontale sopra il contenuto. Con il campo **Cerca impostazioni** trovi una voce scrivendone il nome (Esc svuota la ricerca). Puoi anche usare le frecce per passare da una sezione all'altra.

Le modifiche valgono subito e restano salvate.

| Sezione | Scheda | Cosa puoi cambiare |
| --- | --- | --- |
| Aspetto | Colori | Il colore principale di lilOS: selezioni, pulsanti, schede attive, logo |
| Aspetto | Movimento | Animazioni attive o spente. Se nel sistema operativo hai chiesto di ridurre il movimento, le animazioni restano ridotte comunque. |
| Scrivania | Elementi | Allineamento alla griglia degli elementi trascinati |
| Scrivania | Panoramica | Mappa in miniatura visibile o nascosta |
| Usabilità | Tipi di file | Per ogni estensione (.txt, .md, .png…, e "Senza estensione"), l'app che apre i file di quel tipo, oppure "Chiedi ogni volta". "Ripristina tutti" torna alle app predefinite |
| Usabilità | Scorciatoie | Le combinazioni di tasti di ogni comando (vedi [Cambiare le scorciatoie](#cambiare-le-scorciatoie)) e, nella sezione Mouse, la combinazione per la selezione a mano libera (Alt, Ctrl + Alt o Alt + Shift) |
| Archiviazione | — | Quanto spazio usa lilOS nel browser, compreso il contenuto dei file; ripristino di impostazioni, scorciatoie e app dei tipi di file; ripristino della scrivania e dei file iniziali |
| Informazioni | — | Versione di lilOS, browser, lingua |

I due pulsanti di ripristino chiedono conferma: al primo clic il pulsante diventa rosso, e solo un secondo clic entro pochi secondi esegue l'operazione. **Ripristinare la scrivania e i file iniziali** elimina tutte le cartelle e i file che hai creato, ovunque si trovino, le posizioni e la vista salvate, poi ricarica lilOS.

## Il menu di avvio

Aprilo con il **pulsante del logo** in basso a sinistra oppure con **Ctrl K**.

- Scrivi per cercare un'app per nome.
- Usa le **frecce** per scegliere e **Invio** per avviare, oppure fai clic sull'app.
- **Esc** o di nuovo **Ctrl K** chiudono il menu. Si chiude anche facendo clic fuori.

In fondo al menu trovi il tuo nome e due pulsanti:

- **Impostazioni** (ingranaggio): apre la finestra delle impostazioni.
- **Riavvia sessione** (simbolo di accensione): ricarica lilOS. Non perdi nulla, perché tutto è già salvato.

App disponibili nel menu: File, Browser, Editor, Terminale, Calendario, Immagini, Musica, Posta, Impostazioni.

## I tuoi dati

lilOS salva da solo, mentre lavori, le cartelle e i file con i loro nomi e il loro contenuto (quando salvi nell'Editor), la posizione degli elementi sulla scrivania, il punto della scrivania che stavi guardando e le impostazioni. Le finestre aperte invece non vengono ricordate: alla riapertura sono chiuse. Alla riapertura ritrovi tutto com'era.

Il salvataggio avviene **nel browser che stai usando**:

- con un altro browser o un altro computer trovi una scrivania diversa;
- cancellando i dati di navigazione del sito torni alla scrivania iniziale;
- in una finestra di navigazione privata le modifiche possono andare perse alla chiusura.

## Tipi di file

| Colore della fascia | Tipo | Estensioni |
| --- | --- | --- |
| Blu | Testo | txt, md, rtf |
| Rosso | PDF | pdf |
| Blu scuro | Documento | doc, docx, odt |
| Verde | Foglio di calcolo | csv, xls, xlsx, ods |
| Arancione | Presentazione | ppt, pptx, odp |
| Ocra | Immagine | jpg, jpeg, png, gif, webp, svg |
| Viola | Audio | mp3, wav, ogg, flac |
| Rosa | Video | mp4, mov, webm, mkv |
| Grigio verde | Codice | html, css, js, ts, json, py |
| Grigio | Archivio e altri | zip, rar, 7z, tar, gz e ogni estensione non elencata |

## Scorciatoie da tastiera

Queste sono le combinazioni iniziali. Puoi cambiarle tutte in **Impostazioni → Usabilità → Scorciatoie** (vedi sotto).

| Tasti | Azione |
| --- | --- |
| Ctrl K | Apri o chiudi il menu di avvio |
| Ctrl + (o Ctrl =) / Ctrl − | Ingrandisci / riduci |
| Ctrl 0 | Zoom al 100% |
| Shift 1 | Mostra tutto |
| Invio | Apri gli elementi selezionati |
| F2 | Rinomina l'elemento selezionato |
| Canc | Elimina gli elementi selezionati |
| Ctrl A | Seleziona tutto |
| Esc | Togli la selezione |
| Alt W | Chiudi la finestra in primo piano |
| Alt N | Passa alla finestra successiva (riapre anche quelle ridotte a icona) |
| Ctrl S | Salva (nell'Editor) |
| Ctrl Alt N | Nuovo documento nell'Editor |

Questi tasti invece non si possono cambiare:

| Tasti | Azione |
| --- | --- |
| Spazio + trascina, o tasto centrale | Spostati sulla scrivania |
| Trascina su un punto vuoto | Rettangolo di selezione |
| Alt + trascina (modificabile) | Selezione a mano libera |
| Frecce, Invio, Esc | Muoviti nei menu, nelle liste e nelle sezioni; chiudi i menu |
| Invio, Esc durante la rinomina | Conferma, annulla |

Su Mac puoi usare Cmd al posto di Ctrl.

Se un pulsante è selezionato (ha il bordo blu), Invio, Esc e gli altri tasti senza Ctrl o Alt agiscono su quel pulsante. Fai clic su un punto vuoto della scrivania per tornare a usarli sugli elementi.

### Cambiare le scorciatoie

Apri **Impostazioni → Usabilità → Scorciatoie**. Ogni comando mostra le sue combinazioni.

- **Aggiungere**: premi **+** accanto al comando, poi la combinazione (per esempio tieni premuti Ctrl e Shift e premi A). **Esc**, o un clic altrove, annulla.
- **Togliere**: premi **×** sulla combinazione. Un comando può anche restare senza combinazioni.
- **Ripristinare**: **Ripristina** accanto a un comando lo riporta alla combinazione iniziale; **Ripristina tutte** in cima fa lo stesso per tutti.

Se la combinazione è già usata da un altro comando, lilOS te lo dice: con **Sostituisci** la togli all'altro comando e la dai a questo.

Alcune combinazioni non si possono usare e lilOS ti spiega perché:

- quelle che il browser tiene per sé, come Ctrl W (chiude la scheda) o Ctrl T;
- un tasto che scrive da solo, come una lettera (va usato con Ctrl, Alt o Shift);
- Tab o Spazio da soli;
- per i comandi che funzionano anche mentre scrivi in un campo (zoom, menu di avvio, finestre), combinazioni senza Ctrl o Alt.

Le modifiche valgono subito e restano salvate.

## Domande frequenti

**Ho fatto doppio clic su un'app e non succede niente.**
È normale in questa fase: a parte File, Editor e Impostazioni, le app non sono ancora state realizzate.

**Un file si apre con l'app sbagliata, o mi chiede ogni volta.**
Cambia l'app in Impostazioni → Usabilità → Tipi di file, oppure spunta "Usa sempre quest'app" nella finestra Apri con.

**Trascinando lo sfondo la scrivania non si sposta più.**
Il trascinamento con il tasto sinistro ora serve a selezionare. Per spostarti tieni premuto Spazio e trascina, oppure usa il tasto centrale del mouse.

**Ho eliminato un elemento per sbaglio. Posso recuperarlo?**
No, non c'è ancora un cestino.

**Non trovo più i miei elementi o una finestra.**
Premi Shift 1 per inquadrare tutto, oppure guarda la mappa in miniatura. Per una finestra, usa il suo pulsante nella barra in basso.

**Lo zoom del browser cambia invece della scrivania.**
Non dovrebbe succedere: lilOS intercetta Ctrl + rotella. Se succede, fai clic sulla scrivania e riprova.
