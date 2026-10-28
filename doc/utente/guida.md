# Guida utente

lilOS è un desktop che si usa dal browser. Al posto di uno schermo fisso c'è una **scrivania infinita**: puoi spostarti in qualsiasi direzione, ingrandire e rimpicciolire, e sistemare cartelle, file e app dove preferisci.

> lilOS è in sviluppo. Per ora le app disponibili sono **File**, **Editor** e **Impostazioni**.

## Lo schermo

- **La scrivania** occupa quasi tutto lo schermo. Lo sfondo a puntini ti aiuta a capire quando ti stai spostando o stai cambiando zoom.
- **Il pannello in basso a destra** mostra una mappa in miniatura della scrivania e i controlli dello zoom.
- **La barra in basso**: a sinistra il pulsante con il logo di lilOS, che apre il menu di avvio, e subito dopo il pulsante del [workspace](#i-workspace) (un pallino colorato e il nome); al centro un pulsante per ogni finestra aperta; a destra il tuo nome, la data e l'ora. Passando sopra la data vedi la data completa.

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

**Shift 1**, oppure il pulsante con le quattro frecce nel pannello, inquadra tutti gli elementi della scrivania. Se la scrivania è vuota, torna al punto di partenza. Se stai lavorando in una [workarea](#le-workarea), inquadra solo quella.

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

Puoi anche **mettere file e cartelle dentro una cartella**: trascinali sopra una cartella, che si evidenzia, e rilasciali. Funziona con una cartella della scrivania, con una cartella aperta in una finestra File o con una cartella nel pannello dell'[Editor](#aprire-una-cartella). In basso compare un messaggio, per esempio "Spostato «note.txt» in Documenti". Le cartelle dentro cui metti un elemento non possono essere l'elemento stesso o una cartella che lo contiene.

- Vicino al puntatore compare il nome di ciò che trascini (o quanti elementi sono).
- **Esc** durante il trascinamento annulla: tutto resta com'era.
- Rilasciando sopra una finestra, il rilascio vale per la finestra: se non c'è una cartella sotto il puntatore, le icone tornano dove erano.
- Si può trascinare anche nell'altro verso: dalla finestra File o dall'Editor sulla scrivania. L'elemento si sposta nella cartella Scrivania e compare dove hai rilasciato.
- **Ctrl Z** rimette tutto dov'era (vedi [Annullare e ripetere](#annullare-e-ripetere)).
- Gli elementi si **spostano**, non si copiano: non c'è ancora un modo per copiare con il trascinamento. Le cartelle non si aprono da sole passandoci sopra, e le cartelle di sistema (Documenti, Immagini, Download) non si possono spostare.

### Aprire

**Doppio clic** oppure **Invio** sugli elementi selezionati. Le cartelle si aprono nell'app [File](#lapp-file), le app si avviano, i file si aprono con l'app associata al loro tipo (i file di testo e di codice nell'[Editor](#leditor)). Se nessuna app è associata compare la finestra [Apri con](#apri-con).

Con il tasto destro su un file, **Apri con…** permette di scegliere l'app anche quando ce n'è già una associata.

### Creare cartelle e file

Fai clic con il **tasto destro** su un punto vuoto e apri **Nuovo**: scegli **Cartella**, **Workarea** (vedi [Le workarea](#le-workarea)), **Documento di testo**, **Documento Markdown** o **Pagina HTML** (che parte già con lo scheletro di una pagina). L'elemento compare dove hai fatto clic e puoi scriverne subito il nome.

Le voci del menu, anche quelle di **Nuovo**, si cambiano in Impostazioni → Usabilità → [Menu contestuale](#menu-contestuale).

Un file di testo nuovo è vuoto: aprilo nell'Editor per scriverci.

### Rinominare

Seleziona un solo elemento e premi **F2**, oppure tasto destro → **Rinomina**. Il nome viene selezionato senza l'estensione, così puoi riscriverlo senza toccare ".txt".

- **Invio** conferma, **Esc** annulla.
- Facendo clic altrove il nome viene confermato.
- Se esiste già un elemento con lo stesso nome (senza distinguere maiuscole e minuscole), lilOS aggiunge un numero: "Progetti 2", "note 2.txt".

Cambiando l'estensione di un file cambia anche la sua icona.

### Eliminare

Premi **Canc**, oppure tasto destro → **Elimina**.

Di solito lilOS chiede prima conferma con un piccolo menu: scegli "Sposta nel cestino…" oppure "Annulla". Le cartelle si spostano con tutto il loro contenuto.

Gli elementi eliminati non spariscono subito: vanno nel **Cestino** (vedi [Il Cestino](#il-cestino)), da dove li puoi ripristinare. Con **Ctrl Z** puoi anche annullare l'eliminazione subito (vedi [Annullare e ripetere](#annullare-e-ripetere)).

Puoi cambiare questo comportamento in **Impostazioni → Usabilità → Cestino**: togliere la conferma, oppure eliminare definitivamente senza passare dal cestino. In quel caso l'elemento si recupera solo con Ctrl Z, finché non ricarichi la pagina.

Le cartelle di sistema non si possono eliminare. Eliminare una workarea è diverso: non passa dal cestino (vedi [Eliminare una workarea](#eliminare-una-workarea)).

### Riordinare

Tasto destro su un punto vuoto → **Riordina icone**. Gli elementi vengono messi in colonna nella parte di scrivania che stai guardando: prima le cartelle, poi i file, poi le app, ciascun gruppo in ordine alfabetico.

## Le workarea

Una **workarea** è un'area rettangolare della scrivania con un titolo. Serve a tenere insieme le cose di un lavoro: le icone e le finestre che ci stanno dentro appartengono alla workarea. Puoi spostarla con tutto il suo contenuto, ridurla a una sola icona e riaprirla quando ti serve, con le finestre di nuovo aperte com'erano.

### Creare una workarea

- Tasto destro su un punto vuoto → **Nuovo → Workarea**. L'area compare attorno al punto in cui hai fatto clic e puoi scriverne subito il titolo.
- Oppure seleziona alcune icone che non sono in nessuna workarea, tasto destro su una di esse → **Crea una workarea con la selezione**. L'area si forma attorno a quelle icone.

Le workarea aperte non possono sovrapporsi: dentro una workarea la voce **Nuova workarea** non è disponibile e, se l'area nuova ne coprirebbe un'altra, lilOS lo dice con un messaggio e non la crea. Puoi averne al massimo 200.

### Cosa c'è dentro

Un'icona o una finestra appartiene alla workarea che contiene il suo **centro**. Per metterla dentro, trascinala nell'area; per toglierla, trascinala fuori. Lo stesso accade se ingrandisci o rimpicciolisci l'area: quello che resta fuori ne esce.

### Spostare, ridimensionare, rinominare

- **Spostare**: trascina la barra del titolo. L'area si muove con le icone e le finestre che contiene. Si ferma prima di toccare un'altra workarea.
- **Ridimensionare**: trascina un bordo o un angolo. La dimensione minima è 280 × 180.
- **Rinominare**: doppio clic sulla barra del titolo, oppure tasto destro → **Rinomina la workarea**. **Invio** conferma, **Esc** annulla.
- **Proprietà**: pulsante con la «i» nella barra del titolo, oppure tasto destro → **Proprietà…**. Nella finestra puoi cambiare il titolo e scrivere una descrizione; vedi anche le date, lo stato, quanto contiene e le dimensioni. Sotto, i **metadati personalizzati** sono coppie nome e valore che aggiungi e togli tu (per esempio "Cliente", "Scadenza"; al massimo 40). Tutto si salva mentre scrivi.

### La workarea in cui stai lavorando

La workarea attuale è quella in cui hai fatto clic per ultima (sullo sfondo, su un'icona o sulla barra del titolo) o la cui finestra è in primo piano. Si riconosce dal bordo continuo invece che tratteggiato. Le richieste fatte lì dentro agiscono solo su di essa:

- **Ctrl A** e **Seleziona tutto** selezionano solo le sue icone.
- **Riordina icone** mette in ordine solo le sue icone, dentro l'area. Fuori da ogni workarea, **Riordina** salta i posti coperti dalle workarea.
- **Shift 1** (Mostra tutto) inquadra solo l'area.
- Il rettangolo e la selezione a mano libera, se iniziano dentro l'area, prendono solo le sue icone.
- Un'app avviata si apre dentro l'area, sotto la barra del titolo. Ogni app ha una sola finestra per ogni workarea: una finestra della stessa app fuori dall'area non conta come già aperta.
- Fuori da ogni workarea le finestre si aprono in un posto libero, non coperto dalle workarea.

Il tasto destro sullo sfondo dentro l'area mostra prima le voci della workarea: il titolo, **Rinomina la workarea**, **Proprietà…**, **Riduci a icona** ed **Elimina la workarea…**, poi le solite. Le stesse voci si trovano con il tasto destro sulla barra del titolo.

### Ridurre a icona e riaprire

Pulsante con il trattino nella barra del titolo, oppure tasto destro → **Riduci a icona**.

- Se una finestra ha modifiche non salvate (per esempio un testo nell'Editor), lilOS chiede cosa fare. Con **Annulla** la workarea resta com'è.
- Le finestre si chiudono, ma lilOS ricorda le app, dove erano e che cosa mostravano (per esempio il file aperto nell'Editor o la cartella aperta in File). Il testo non salvato non viene ricordato: per questo lo chiede prima.
- Le icone dell'area spariscono dalla scrivania. Al loro posto resta **una sola icona**, nell'angolo in alto a sinistra dell'area.

L'icona si usa come le altre: **doppio clic** o **Invio** la riapre. L'area torna al suo posto con le icone, le finestre si riaprono e la vista la inquadra. **F2** la rinomina. Trascinandola, sposti l'area nascosta con tutto il suo contenuto. Se al ritorno l'area coprirebbe un'altra workarea aperta, viene spostata a destra con il suo contenuto.

### Eliminare una workarea

**Canc** sull'icona, oppure tasto destro → **Elimina la workarea…**. lilOS chiede conferma.

Si elimina solo la workarea: le icone e le finestre che contiene restano sulla scrivania. Se era ridotta a icona, prima viene riaperta. Non perdi nessun file, e con **Ctrl Z** puoi riavere la workarea (vedi [Annullare e ripetere](#annullare-e-ripetere)).

### Cosa non è ancora possibile

- Riaprendo una workarea, le finestre di servizio (per esempio la scelta di un file o le proprietà) non tornano: vengono chiuse.
- Le impostazioni si riaprono sulla prima scheda.
- Le finestre ingrandite tornano non ingrandite.
- Le icone nascoste da una workarea ridotta compaiono comunque nell'app File, nella cartella Scrivania.
- Le voci della workarea nel tasto destro si trovano solo sullo sfondo della scrivania.
- Se hai già personalizzato il menu del tasto destro, la voce **Workarea** in **Nuovo** non viene aggiunta da sola: aggiungila da Impostazioni → Usabilità → Menu contestuale.

## I workspace

Un **workspace** è una scrivania a parte. Ognuno ha i suoi elementi sulla scrivania, le sue finestre aperte, le sue workarea, il punto della scrivania che stavi guardando e le sue app. Serve a separare lavori diversi, per esempio "Lavoro" e "Casa": cambiando workspace vedi solo le cose di quel lavoro.

Al primo avvio c'è un solo workspace, **Principale**. Se usavi lilOS prima dei workspace, tutto quello che avevi si trova lì.

### Cambiare workspace

- Fai clic sul **pulsante del workspace** nella barra in basso, accanto al logo. Il menu mostra l'elenco (con una spunta su quello in cui sei), **Successivo**, **Precedente**, **Nuovo workspace** e **Gestisci i workspace…**.
- Oppure premi **Ctrl Alt →** per il successivo e **Ctrl Alt ←** per il precedente. Funzionano anche mentre scrivi, e solo se hai almeno due workspace.

In basso compare per un attimo il nome del workspace in cui sei arrivato.

Il workspace che lasci resta **esattamente com'era**. Le sue finestre non si chiudono: si nascondono (spariscono anche dalla barra) e tornano quando ci ritorni, con il testo non ancora salvato. Quello che fai con Ctrl Z riparte da zero in ogni scrivania.

### Cosa è separato e cosa è di tutti

| Cosa | Com'è |
| --- | --- |
| Scrivania (la cartella **Scrivania**) | Separata. Gli altri workspace non la vedono affatto: non compare né nell'app File, né quando scegli un file o una cartella, né nel pannello dell'Editor |
| Posizione degli elementi, vista, workarea, finestre aperte | Separate |
| App installate | Separate (vedi sotto) |
| **Documenti**, **Immagini**, **Download** | Condivise: tutti i workspace vedono gli stessi file |
| Tema, colore principale, scorciatoie, menu del tasto destro, app dei tipi di file | Uguali in tutti i workspace |

Ogni file e cartella ricorda **il workspace che l'ha creato**. Non cambia se lo sposti o lo rinomini. Nell'app File, in vista elenco, la colonna **Workspace** mostra un pallino con il colore e il nome del workspace; **Condiviso** compare sulle cartelle principali, che non sono di nessuno. In vista a icone, il suggerimento che compare passando sopra un elemento dice «Workspace: …». Fai clic sull'intestazione per ordinare per workspace.

### Le app di ogni workspace

**File** e **Impostazioni** ci sono sempre. Le altre app si possono installare o togliere in ogni workspace, da Impostazioni → Workspace → Questo workspace. Il menu di avvio mostra solo le app installate nel workspace in cui sei.

- Se avvii un'app che qui non è installata (per esempio da un collegamento sulla scrivania), compare un messaggio che ti dice dove aggiungerla.
- Se apri un file e la sua app non è installata, compare **Apri con**, che propone solo le app installate. La scelta dell'app per ogni tipo di file è la stessa in tutti i workspace.
- Se togli un'app, le sue finestre in questo workspace si chiudono (se hanno modifiche non salvate ti viene chiesto).

### Creare, rinominare, eliminare

Apri **Impostazioni → Workspace**. Ci sono due schede.

- **Questo workspace**: il **nome** (al massimo 40 caratteri), il **colore** (è il pallino nella barra e accanto ai suoi file in File), quanti file, cartelle e collegamenti ha creato, e un interruttore per ogni app.
- **Tutti**: l'elenco dei workspace, con quanti elementi hanno creato e quante app hanno. **Passa a questo** ti ci porta, **Elimina…** lo elimina, **Crea** ne fa uno nuovo con la scrivania vuota e tutte le app. Puoi averne **al massimo 20**. L'ultimo workspace non si può eliminare.

Un workspace nuovo si crea anche dal menu del pulsante nella barra (**Nuovo workspace**) e ti ci porta subito.

**Eliminare un workspace** chiede due clic: al primo il pulsante diventa rosso, il secondo (entro pochi secondi) conferma. Nessun file viene cancellato:

- se la sua scrivania non era vuota, diventa la cartella **Documenti → Scrivania di** *nome del workspace*; se era vuota sparisce;
- i file che ha creato in altre cartelle restano dove sono e in File la colonna dice **nome (eliminato)**;
- le sue finestre aperte passano nel workspace in cui sei, al centro della vista, con il testo non salvato. Le finestre di servizio (per esempio la scelta di un file o le proprietà di una workarea) si chiudono;
- **si perdono** la posizione degli elementi, le workarea, il punto della scrivania che guardava e l'elenco delle sue app. Non si possono recuperare.

### Cosa non è ancora possibile

- Al massimo 20 workspace.
- Le preferenze (tema, scorciatoie, menu) sono le stesse per tutti i workspace.
- Le scrivanie degli altri workspace non si vedono: per scambiare un file tra workspace tienilo in Documenti, Immagini o Download.
- Se apri un file condiviso (per esempio in Documenti) con l'Editor in un workspace, vai in un altro workspace e lì lo sposti nella tua scrivania, l'Editor del primo non lo vede più e non può salvarlo.
- Se hai lilOS aperto in più schede del browser, l'ultima che salva vince: i workspace creati in un'altra scheda possono andare persi.
- Le app aggiunte a lilOS in futuro arrivano installate in tutti i workspace; quelle che hai tolto restano tolte.
- Dopo aver ricaricato la pagina le finestre di servizio non tornano, le finestre ingrandite tornano non ingrandite e Impostazioni si riapre sulla prima scheda.

## L'app File

**File** mostra le cartelle e il loro contenuto. Aprila dal menu di avvio o dal collegamento sulla scrivania, oppure fai doppio clic su una cartella della scrivania: si apre direttamente lì. Dal tasto destro su un punto vuoto della scrivania, **Apri la Scrivania in File** mostra gli elementi della scrivania come elenco.

- **A sinistra**, la barra laterale. In cima la sezione **Collegamenti**: Home e le cartelle principali (Scrivania, Documenti, Immagini, Download) e i collegamenti che aggiungi tu (vedi [Collegamenti nella barra laterale](#collegamenti-nella-barra-laterale)), nell'ordine che scegli trascinandoli. Sotto, la voce **Tag** con un elemento per ogni tag che hai creato (vedi [I tag](#i-tag)) e in fondo il **Cestino** (vedi [Il Cestino](#il-cestino)): queste restano sempre al loro posto. Le cartelle principali non si possono rinominare né eliminare. **Scrivania** è quella del workspace in cui sei; Documenti, Immagini e Download sono di tutti.
- **In alto**: Indietro, Avanti, Cartella superiore; il percorso (fai clic su una parte per tornarci); **Nuova cartella**; vista **elenco** o **a icone**; la ricerca nella cartella aperta (Esc la svuota).
- **Al centro**: il contenuto della cartella. In vista elenco ci sono le colonne Nome, Modificato, Dimensione, Tipo e Workspace (il workspace che ha creato l'elemento, vedi [I workspace](#i-workspace)): fai clic su un'intestazione per ordinare, di nuovo per invertire l'ordine. Le cartelle restano sempre in cima.
- **In basso**: quanti elementi ci sono e quanti sono selezionati, il percorso della cartella o un messaggio.

Con gli elementi della cartella fai le stesse cose della scrivania: clic, Ctrl + clic, **Shift + clic** per selezionare un intervallo, doppio clic o Invio per aprire, F2 per rinominare, Canc per eliminare (nel cestino: eliminare definitivamente), Ctrl A per selezionare tutto. Dal tasto destro su un punto vuoto puoi creare cartelle e file di testo. **Ctrl Z** annulla quello che hai fatto in questa finestra (vedi [Annullare e ripetere](#annullare-e-ripetere)).

Tasti per muoversi nell'elenco (non modificabili):

| Tasti | Azione |
| --- | --- |
| Frecce (con Shift per estendere la selezione), Home, Fine | Muoviti tra gli elementi |
| Backspace o Alt ↑ | Cartella superiore |
| Alt ← / Alt → | Indietro / Avanti |

Quello che fai in File vale anche per la scrivania, e viceversa: una cartella creata in Scrivania compare subito sulla scrivania.

### Spostare con il trascinamento

Trascina file e cartelle (uno o più selezionati) e rilasciali su una cartella per spostarceli. Puoi rilasciarli:

- su una **cartella dell'elenco** o della vista a icone;
- sulla **parte vuota dell'elenco**: vanno nella cartella che stai guardando;
- su una **parte del percorso** in alto, per portarli in una cartella più su;
- su una **cartella della sezione Collegamenti** (Home, Scrivania, Documenti… o il collegamento a una cartella): rilascia al **centro** della voce;
- su una cartella della **scrivania** o di un'altra finestra File, o nel pannello dell'[Editor](#aprire-una-cartella), e viceversa.

Cosa succede:

- La cartella o la voce di destinazione si evidenzia. Se non si evidenzia, lì non puoi rilasciare (per esempio una cartella dentro se stessa, o la cartella in cui l'elemento già si trova).
- Un messaggio in basso dice dove è andato.
- **Esc** durante il trascinamento annulla.
- Se un elemento è selezionato insieme ad altri, un clic semplice su di esso lascia selezionato solo lui; il trascinamento invece sposta tutta la selezione.
- Se nella cartella di destinazione c'è già un elemento con lo stesso nome, lilOS aggiunge un numero.
- **Ctrl Z** nella finestra File da cui hai trascinato rimette tutto nelle cartelle d'origine, con i nomi di prima (vedi [Annullare e ripetere](#annullare-e-ripetere)).
- Rilasciando sul **Cestino** (in fondo alla barra a sinistra, al centro o ai bordi) gli elementi vengono eliminati: finiscono nel Cestino e Ctrl Z li rimette. Le cartelle di sistema restano dove sono.
- Non si può rilasciare nel Cestino aperto né nella vista di un tag. Sui **Tag** della barra a sinistra e nello spazio vuoto sotto il Cestino non succede niente (nessuna linea, nessuna azione). Gli elementi nel Cestino non si possono trascinare.
- Si **spostano**, non si copiano: non c'è ancora un modo per copiare con il trascinamento. Le cartelle non si aprono da sole passandoci sopra, e non c'è un modo per spostare con la tastiera.

### Collegamenti nella barra laterale

In cima alla barra a sinistra di File, la sezione **Collegamenti** tiene a portata di clic le cartelle e i file che usi di più. Contiene Home, Scrivania, Documenti, Immagini e Download e i collegamenti che aggiungi tu, nell'ordine che preferisci. Sotto di lei ci sono i **Tag** e il **Cestino**, fuori dall'ordine: non si spostano.

- **Aggiungere**: trascina file o cartelle nella sezione, **tra due voci** (compare una linea che mostra dove andrà), sopra il collegamento a un **file**, oppure nella parte vuota in fondo alla sezione (circa 10 pixel). Oppure tasto destro su un elemento → **Aggiungi alla barra laterale di File** (aggiunge in fondo; la voce compare anche nel pannello dell'[Editor](#aprire-una-cartella) e sulla scrivania, e non per le cartelle di sistema). Compare "Collegamento aggiunto". Un collegamento che esiste già non si duplica. Al massimo 80 voci: quando sono troppe, le più vecchie vengono tolte.
- **Dove rilasci conta**: al **centro** di una cartella (una voce fissa o un collegamento a una cartella) l'elemento si **sposta** davvero in quella cartella, con Ctrl Z per annullare. Vicino al **bordo** di una voce (circa 8 pixel) si crea un collegamento in quel punto. Sul **Cestino** l'elemento finisce sempre nel Cestino: non si crea mai un collegamento. Sui **Tag** non succede niente.
- **Riordinare**: trascina una voce della sezione su un'altra posizione, tra due voci. Vale per i collegamenti e per le voci fisse (Home, Scrivania, Documenti…). I Tag e il Cestino non entrano nell'ordine.
- **Usare**: un clic apre la voce. Una cartella si mostra nella finestra, un file si apre con la sua app, un'app (un collegamento della scrivania) si avvia.
- **Trascinare fuori dalla barra**: trascinando un collegamento fuori dalla barra trascini l'elemento vero. Rilasciandolo su una cartella, per esempio, lo sposti.
- **Eliminare un collegamento**: toglie solo la voce dalla barra, il file o la cartella restano dove sono. Tre modi: il pulsante **×** che compare passando il mouse sulla voce (o quando ha il focus), il tasto **Canc** su un collegamento con il focus (non tocca i file selezionati nell'elenco), oppure tasto destro → **Elimina il collegamento**. Compare "Collegamento a «nome» eliminato" e **Ctrl Z** nella finestra File lo rimette al suo posto. Le voci fisse (Home, Scrivania…) non si eliminano.
- **Tasto destro** su un collegamento: **Apri**, **Mostra nella cartella** (apre la cartella dove si trova l'elemento) e **Elimina il collegamento**.
- Il collegamento segue l'elemento: se lo rinomini o lo sposti, il collegamento resta valido. Se lo metti nel Cestino, o se si trova sulla Scrivania di un altro workspace, il collegamento non si vede (e ricompare, al suo posto, se l'elemento torna visibile).
- L'ordine della barra e i collegamenti sono gli stessi in tutti i [workspace](#i-workspace).

## Il Cestino

Il **Cestino** raccoglie file e cartelle eliminati, con tutto il loro contenuto. Aprilo da **File**, con la voce **Cestino** in fondo alla barra a sinistra, oppure da **Impostazioni → Usabilità → Cestino** con **Apri il cestino**.

L'elenco mostra, dal più recente: **Nome**, **Eliminato** (data e ora), **Dimensione**, **Tipo** e **Posizione originale**. Fai clic su un'intestazione per ordinare. In basso trovi dopo quanto tempo gli elementi vengono eliminati definitivamente.

- **Ripristinare**: tasto destro su un elemento → **Ripristina**. Torna nella cartella da cui era partito; se quella cartella non esiste più, torna in Home. Se nella cartella c'è già un elemento con lo stesso nome, lilOS aggiunge un numero. Compare un messaggio che dice dove è andato, e con **Ctrl Z** lo rimetti nel cestino.
- **Ripristinare tutto**: tasto destro su un punto vuoto → **Ripristina tutto**.
- **Eliminare definitivamente**: tasto destro su un elemento → **Elimina definitivamente…**, oppure **Canc**. lilOS chiede sempre conferma, anche se l'hai tolta nelle impostazioni, perché **questa azione non si può annullare**.
- **Svuotare il cestino**: tasto destro su un punto vuoto → **Svuota il cestino…**, oppure **Impostazioni → Usabilità → Cestino → Svuota…**. Anche questa chiede conferma e non si può annullare.
- Gli elementi nel cestino non si aprono e non si rinominano: ripristinali prima.

Cose da sapere:

- Dopo **30 giorni** (se non cambi il periodo) quello che è nel cestino viene eliminato definitivamente. In **Impostazioni → Usabilità → Cestino → Conserva gli elementi per** scegli da 1 giorno a 1 anno, oppure "Per sempre". La pulizia avviene quando apri lilOS e poi ogni ora.
- Il cestino occupa spazio nel browser come gli altri file. Nelle impostazioni vedi quanti elementi contiene e quanto pesano.
- Quello che elimini dalla **Scrivania** di un workspace compare nel cestino solo di quel workspace. Se elimini il workspace, quegli elementi diventano visibili da tutti.
- Ripristinare la scrivania e i file iniziali (Impostazioni → Archiviazione) svuota anche il cestino.

## L'Editor

L'**Editor** apre e modifica i file di testo e di codice (txt, md, js, css, html, json, py e altri). Si apre facendo doppio clic su un file, dal menu di avvio o con **Ctrl Alt N** per un documento nuovo.

- **A sinistra**, i numeri di riga; la riga su cui si trova il cursore è evidenziata.
- **Colori**: parole chiave, testi, numeri e commenti sono colorati secondo il linguaggio, riconosciuto dall'estensione del file. Puoi cambiarlo dal menu in alto a destra (Testo, Markdown, JavaScript, CSS, HTML, JSON, Python).
- **In alto**: Nuovo documento, Apri un file…, Apri una cartella…, Salva, Mostra nella cartella (apre File dove si trova il file); all'estrema destra il pulsante che mostra o nasconde la cartella aperta.
- **In basso**: riga e colonna del cursore, numero di righe, stato del documento (Salvato, Modificato, Nuovo documento).

### Aprire una cartella

Con **Apri una cartella…** (o **Ctrl Alt O**) scegli una cartella: compare in un pannello **a destra** con tutto il suo contenuto. Quella cartella è la **radice**: dal pannello gestisci quello che c'è dentro senza uscire dall'Editor. Puoi anche fare clic destro su una cartella nell'app File e scegliere **Apri nell'Editor**.

- **Aprire**: un clic su una cartella la apre o la chiude; doppio clic (o Invio) su un file lo apre nell'Editor. Il file aperto è evidenziato.
- **Creare**: i pulsanti in alto nel pannello (Nuovo file, Nuova cartella) creano dentro la cartella selezionata, nella cartella del file selezionato o nella radice; anche dal clic destro. Scrivi subito il nome e premi Invio (Esc annulla). Un file nuovo si apre da solo.
- **Rinominare**: F2, oppure clic destro → Rinomina.
- **Spostare**: trascina un elemento su una cartella (la destinazione si evidenzia); rilascialo su un file per portarlo nella cartella di quel file, o nella parte vuota del pannello per portarlo nella radice. Puoi trascinare anche da e verso la scrivania e l'app File: porta l'elemento fuori dal pannello (per esempio sulla scrivania), oppure trascina qui un elemento da lì. Esc annulla il trascinamento. Oppure clic destro → **Sposta in…** e scegli la cartella: questa scelta resta dentro la radice. Se nella destinazione c'è già un elemento con lo stesso nome, viene aggiunto un numero. Dal pannello si trascina un elemento alla volta, e le cartelle di sistema non si spostano.
- **Barra laterale di File**: clic destro → **Aggiungi alla barra laterale di File** mette l'elemento tra i collegamenti dell'app [File](#collegamenti-nella-barra-laterale).
- **Eliminare**: Canc, oppure clic destro → Elimina. Gli elementi vanno nel Cestino (vedi [Il Cestino](#il-cestino)); di solito viene chiesta prima conferma. Puoi annullare con Ctrl Z finché il pannello ha il focus.
- **Larghezza**: trascina il bordo sinistro del pannello. Con la tastiera: Tab fino al bordo, poi frecce ← → (Shift per passi più lunghi), Home per la larghezza minima; doppio clic sul bordo per tornare a quella iniziale.
- **Nascondere**: Ctrl B o il pulsante all'estrema destra della barra; la ✕ nel pannello chiude la cartella.

Nel pannello: frecce su/giù per muoversi, → apre una cartella, ← la chiude o torna alla cartella sopra, Home / Fine per il primo e l'ultimo elemento.

L'Editor ricorda la cartella aperta, quali cartelle erano aperte e la larghezza del pannello: alla prossima apertura li ritrovi. Un documento nuovo, al primo salvataggio, viene creato nella cartella aperta.

### Suggerimenti

Mentre scrivi, l'Editor propone come completare la parola, in base al linguaggio (quello del file o quello scelto nel menu in alto a destra):

| Linguaggio | Cosa propone |
| --- | --- |
| JavaScript, Python | Parole chiave, funzioni e oggetti comuni; dopo il punto, metodi e proprietà |
| CSS | Proprietà (inserite con `: ;`, poi i valori adatti a quella proprietà), regole `@`, nomi dei tag e delle classi fuori dalle regole |
| HTML | Tag dopo `<` (inseriti già chiusi), attributi del tag dopo uno spazio, il tag da chiudere dopo `</`, caratteri speciali dopo `&` |
| JSON | Chiavi già usate nel file, `true`, `false`, `null` |
| Markdown | Il linguaggio dopo ```` ``` ```` che apre un blocco di codice; parole del testo |
| Testo | Parole già presenti nel testo (dalla terza lettera) |

In tutti i linguaggi compaiono anche le parole già scritte nel documento. Dentro testi tra virgolette e commenti i suggerimenti non compaiono da soli.

| Tasti | Azione |
| --- | --- |
| Frecce su/giù, Pag ↑/↓ | Scegli il suggerimento |
| Invio o Tab | Inserisci il suggerimento |
| Esc | Chiudi i suggerimenti (resti nel testo) |
| Ctrl Spazio | Mostra i suggerimenti anche quando non compaiono da soli (anche dentro le virgolette) |

Puoi anche fare clic su un suggerimento.

### Tasti

Mentre scrivi:

| Tasti | Azione |
| --- | --- |
| Ctrl S | Salva |
| Ctrl Alt N | Nuovo documento |
| Ctrl O | Apri un file |
| Ctrl Alt O | Apri una cartella |
| Ctrl B | Mostra o nascondi la cartella aperta |
| Tab / Shift Tab | Aggiunge / toglie un rientro di due spazi |
| Invio | Va a capo mantenendo il rientro della riga |
| Ctrl Z | Annulla l'ultima modifica al testo |
| Ctrl Y, Ctrl Shift Z | Ripete quello che hai annullato |
| Esc | Esce dal testo (poi Tab sposta il focus sui pulsanti) |

Ctrl S, Ctrl Alt N, Ctrl O, Ctrl Alt O, Ctrl B e Ctrl Spazio si cambiano in Impostazioni → Usabilità → Scorciatoie, sezione Editor.

Un documento nuovo, al primo salvataggio, viene creato nella cartella aperta a destra o, se non ce n'è una, in **Documenti**, con il nome "Senza titolo.txt"; poi puoi rinominarlo dall'app File o dalla scrivania.

Il titolo della finestra mostra un pallino (•) quando ci sono modifiche non salvate. Se chiudi la finestra, apri un altro file o crei un documento nuovo con modifiche non salvate, l'Editor chiede: **Salva**, **Non salvare** o **Annulla**. Anche chiudendo o ricaricando la pagina del browser compare un avviso.

L'Editor apre un documento alla volta. Se il file aperto viene rinominato o spostato altrove, titolo e percorso si aggiornano; se viene eliminato, il testo resta nell'Editor finché non lo salvi (viene ricreato in Documenti).

### Linguaggi, errori e schemi

L'Editor colora il testo con uno di tre **motori**, scelto per ogni linguaggio:

- **Tree-sitter**: analizza davvero la struttura del codice; il più preciso. Per JavaScript, Python, JSON, CSS, HTML e Shell.
- **TextMate**: le grammatiche usate da VS Code e Sublime Text. Per tutti i linguaggi elencati, compresi Markdown, TypeScript, XML e YAML, e per quelli che aggiungi tu.
- **Semplice**: il più leggero.

Il motore in uso è scritto in basso, al centro. Si cambia in **Impostazioni dell'Editor** (l'ingranaggio in alto a destra, o un clic su quella scritta).

Per **JSON**, **CSS** e **HTML** un *language server* (un programma che conosce il linguaggio) gira nel browser e:

- propone suggerimenti più completi;
- segnala gli **errori**: la parola è sottolineata in rosso (in arancione gli avvisi), il numero di riga diventa rosso, in basso compare il conteggio. Portando il cursore sull'errore, il messaggio appare in basso a destra; passando il mouse sul numero di riga, tutti i messaggi di quella riga.

I messaggi dei server sono in inglese.

**Schemi JSON.** Uno schema descrive quali chiavi e valori sono ammessi in un file JSON. Con un file JSON salvato aperto, il pulsante **Schema** in alto permette di scegliere:

- **un file di lilOS** (per esempio `/Documenti/persona.schema.json`);
- **un indirizzo web** (per esempio `https://www.schemastore.org/package.json`). Il sito deve permettere di essere letto da altre pagine: molti schemi pubblici lo permettono, ma un indirizzo che reindirizza altrove può non funzionare;
- **nessuno schema**.

Vale anche la chiave `"$schema"` scritta nel file. Con uno schema, i suggerimenti propongono le chiavi previste e gli errori segnalano quelle mancanti o sbagliate.

**Impostazioni dell'Editor** (ingranaggio in alto a destra):

| Sezione | Cosa puoi fare |
| --- | --- |
| Evidenziazione | Scegliere il motore per ogni linguaggio; aggiungere una **grammatica TextMate** (un file `.tmLanguage.json` di lilOS): i file con le estensioni indicate dalla grammatica verranno colorati con essa |
| Language server | Accendere o spegnere i server nel browser (JSON, CSS, HTML); collegare un **server esterno** via WebSocket (`ws://…`) per un linguaggio, per esempio TypeScript avviato sul tuo computer con un ponte WebSocket |
| Schemi JSON | Vedere e togliere gli schemi associati ai file |

## Annullare e ripetere

**Ctrl Z** annulla l'ultima azione, **Ctrl Y** (o **Ctrl Shift Z**) la ripete. Agiscono **dove stai lavorando**: ogni posto ha il suo elenco di azioni, e lilOS sceglie quello dove hai fatto clic per ultimo. In basso compare un breve messaggio, per esempio "Annullato: Elimina «Appunti»" o "Ripetuto: Rinomina…".

| Dove | Cosa si può annullare |
| --- | --- |
| Scrivania (nessuna finestra in primo piano) | Creare, rinominare ed eliminare cartelle e file (anche cartelle con il loro contenuto); spostare le icone, anche con il trascinamento; spostare file e cartelle dentro una cartella trascinandoli da qui; Riordina icone. Per le workarea: creare, rinominare, spostare, ridimensionare ed eliminare |
| Finestra File | Creare, rinominare, eliminare e ripristinare dal cestino; spostare file e cartelle trascinandoli da questa finestra |
| Editor, nel testo | Scrittura, suggerimenti accettati, rientri: come in un normale editor di testo |
| Editor, nel pannello della cartella | Creare, rinominare, spostare ed eliminare |

Creare un elemento e dargli il nome è una sola azione: Ctrl Z lo toglie. Un elemento eliminato torna con lo stesso contenuto e, sulla scrivania, nello stesso punto. Se l'elemento è andato nel cestino, dopo aver ricaricato la pagina lo ripristini comunque dal Cestino. **Eliminare definitivamente dal cestino non si annulla.**

Cose da sapere:

- **Dopo aver ricaricato la pagina l'elenco è vuoto**: si può annullare solo quello che hai fatto da quando hai aperto lilOS.
- Se una finestra File viene chiusa, le sue azioni non si possono più annullare.
- Le finestre senza elenco, come le Impostazioni, non fanno nulla con Ctrl Z, e non toccano la scrivania dietro di loro.
- Nei campi di testo (per esempio la ricerca, o il nome mentre lo scrivi) Ctrl Z annulla la scrittura, come in ogni programma.
- Se un'azione non si può più annullare (per esempio la cartella dove si trovava un elemento eliminato non esiste più), compare "Non si può più fare: …" e quell'azione viene tolta dall'elenco.
- Non si annullano: ridurre a icona o riaprire una workarea, e le modifiche fatte nella finestra delle proprietà di una workarea.
- **Il trascinamento si annulla dove è partito.** Se trascini da una finestra File alla scrivania, Ctrl Z funziona nella finestra File (non sulla scrivania), e viceversa. Lo spostamento di più elementi si annulla in un colpo solo, e ognuno torna nella sua cartella con il nome di prima.
- Annullando lo spostamento di un solo elemento con **Sposta in…** nel pannello dell'Editor, se per evitare un doppione gli era stato aggiunto un numero, il numero resta. Con il trascinamento invece il nome di prima torna.
- Eliminare un collegamento della barra di File si annulla con Ctrl Z nella finestra File. Aggiungere un collegamento o riordinare le voci non si annulla (lo spostamento di un elemento in una cartella con il trascinamento sì).
- Una volta fatta una nuova azione, quelle annullate non si possono più ripetere. Ogni elenco ricorda le ultime 100 azioni.

## I tag

I **tag** sono etichette colorate che dai a file e cartelle per ritrovarli tutti insieme, ovunque siano. Un elemento può avere più tag. I tag sono gli stessi in tutti i [workspace](#i-workspace).

### Creare un tag

- Tasto destro su un file o una cartella → **Tag → Nuovo tag…**. Si apre **Impostazioni → Tag**: scrivi il nome e premi **Crea** (o Invio). Il nuovo tag viene messo subito sugli elementi che avevi selezionato.
- Oppure apri direttamente **Impostazioni → Tag**: scrivi il nome in **Nuovo tag** e premi **Crea**. Poi lo assegni come descritto sotto.

Il nome può avere al massimo 30 caratteri e non può essere uguale a quello di un altro tag (le maiuscole non contano). Puoi avere al massimo 100 tag. Se il nome è vuoto o già usato, lilOS lo dice con un messaggio in basso e non crea nulla. Il nuovo tag prende il primo colore che non stai già usando.

### Assegnare e togliere un tag

Tasto destro su uno o più file o cartelle (sulla scrivania o in File) → **Tag**. Il sottomenu elenca i tag, ognuno con il suo colore.

- Scegli un tag per metterlo. Se lo scegli di nuovo, lo togli.
- Con più elementi selezionati, un segno di spunta indica un tag che hanno **tutti**. Sceglierlo lo toglie a tutti; se non ce l'hanno tutti, lo mette a tutti.
- I tag compaiono come pallini colorati: in basso a destra dell'icona, sulla scrivania e in File; dopo il nome, nell'elenco di File. Se sono più di 4 si vede "+" e il numero; passando il mouse sopra si leggono i nomi.
- Le cartelle principali (Documenti, Immagini, Download…) non si possono etichettare.
- Mettere o togliere un tag **non si annulla** con Ctrl Z: se sbagli, ripeti la scelta.

### Colori

In **Impostazioni → Tag** ogni tag ha il suo riquadro. In **Colore** scegli tra otto colori: rosso, arancione, giallo, verde, verde acqua, blu, viola e grigio. In **Nome** lo rinomini. Le modifiche si vedono subito dappertutto.

### Cercare per tag

In **File**, nella barra a sinistra sotto **Tag**, fai clic su un tag: vedi **tutti gli elementi che lo hanno**, ovunque siano (la tua scrivania e le cartelle condivise). Un file di un altro workspace che non sta nelle cartelle condivise non si vede.

- Nell'elenco vedi Nome, **Posizione** (la cartella in cui sta l'elemento), Tipo e Workspace.
- Puoi cercare per nome, ordinare, aprire, rinominare ed eliminare gli elementi, come in una cartella. Non puoi creare cartelle lì.
- Tasto destro su un elemento → **Mostra nella cartella** apre la cartella dove sta; **Togli il tag «nome»** lo toglie.
- Dalla scheda del tag in Impostazioni, **Mostra in File** apre la stessa vista.

### Rendere un tag invisibile

In **Impostazioni → Tag**, spegni **Visibile** per un tag. Da quel momento **gli elementi che hanno quel tag spariscono ovunque**: dalla scrivania, da File, dai selettori di file e dal pannello dell'Editor. Non sono eliminati: li ritrovi cliccando il tag in File (nella barra laterale i tag invisibili hanno un occhio barrato; in basso compare «Tag invisibile: questi elementi sono nascosti altrove»). Accendi di nuovo **Visibile** e gli elementi tornano dove erano, anche sulla scrivania.

- Un elemento che prende un tag invisibile sparisce subito. Se gli togli il tag, ricompare.
- Nel menu **Tag**, accanto ai tag invisibili c'è scritto «(nasconde)»: scegliere un tag così fa sparire l'elemento.
- Se nascondi una cartella, quello che contiene non si vede finché la cartella è nascosta (ma non è nascosto di suo). Lo raggiungi dalla vista del tag della cartella e con **Mostra nella cartella**.
- I file nascosti restano al loro posto: se un file è aperto in una finestra, la finestra continua a funzionare.

### Eliminare un tag

In **Impostazioni → Tag**, nella scheda del tag, **Elimina…** (due clic, il pulsante diventa rosso al primo). Il tag viene tolto da tutti gli elementi; quelli che erano nascosti ricompaiono. I file e le cartelle non vengono eliminati. **Non si può annullare.**

### Cosa non è ancora possibile

- Annullare con Ctrl Z un tag messo o tolto.
- Una scorciatoia da tastiera per i tag.
- Cercare per tag dal menu di avvio: si cerca solo in File.
- Avere tag diversi in ogni workspace: sono uguali in tutti.

## Menu contestuale

In **Impostazioni → Usabilità → Menu contestuale** decidi cosa compare con il tasto destro su un punto vuoto della scrivania.

- L'elenco mostra le voci nell'ordine del menu; quelle dentro **Nuovo** sono rientrate (↳).
- Le frecce **su** e **giù** spostano una voce; la **×** la toglie.
- **Voce**: aggiunge un'azione (Riordina icone, Mostra tutto, Seleziona tutto, Annulla, Ripeti…) o l'apertura di un'app, nel menu principale o dentro Nuovo.
- **Separatore**: aggiunge una linea, nel menu principale o dentro Nuovo.
- **Nuovo elemento in «Nuovo»**: aggiunge una voce che crea un file o una cartella. Scrivi l'etichetta (per esempio "Foglio di stile") e il nome (per esempio `stile.css`). Con **Modello…** scegli un file di lilOS: il nuovo file partirà con il suo contenuto.
- **Ripristina** torna al menu iniziale.

Le voci **Annulla** e **Ripeti** del menu agiscono sempre sulla scrivania. Le modifiche valgono subito. Nel menu, **Nuovo** si apre passandoci sopra con il mouse, oppure con la freccia → (← per tornare indietro).

## Apri con

Quando apri un file e nessuna app è associata al suo tipo (o hai scelto "Chiedi ogni volta", o l'app associata non è installata nel workspace in cui sei), compare la finestra **Apri con**:

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
| Aspetto | Colori | Il tema, **Chiaro** o **Scuro** (scrivania, barra, menu e finestre), e il colore principale di lilOS: selezioni, pulsanti, schede attive, logo |
| Aspetto | Movimento | Animazioni attive o spente. Se nel sistema operativo hai chiesto di ridurre il movimento, le animazioni restano ridotte comunque. |
| Scrivania | Elementi | Allineamento alla griglia degli elementi trascinati |
| Scrivania | Panoramica | Mappa in miniatura visibile o nascosta |
| Workspace | Questo workspace | Nome, colore e app installate del workspace in cui sei (vedi [I workspace](#i-workspace)) |
| Workspace | Tutti | Passare a un workspace, eliminarlo o crearne uno nuovo |
| Tag | — | Creare, rinominare ed eliminare i tag; il colore, se sono visibili o invisibili, quanti elementi hanno; aprirne gli elementi in File (vedi [I tag](#i-tag)) |
| Usabilità | Menu contestuale | Le voci del menu del tasto destro sulla scrivania (vedi [Menu contestuale](#menu-contestuale)) |
| Usabilità | Tipi di file | Per ogni estensione (.txt, .md, .png…, e "Senza estensione"), l'app che apre i file di quel tipo, oppure "Chiedi ogni volta". "Ripristina tutti" torna alle app predefinite |
| Usabilità | Cestino | Se chiedere conferma prima di eliminare, se eliminare definitivamente senza passare dal cestino, per quanto tempo il cestino conserva gli elementi; aprire e svuotare il cestino (vedi [Il Cestino](#il-cestino)) |
| Usabilità | Scorciatoie | Le combinazioni di tasti di ogni comando (vedi [Cambiare le scorciatoie](#cambiare-le-scorciatoie)) e, nella sezione Mouse, la combinazione per la selezione a mano libera (Alt, Ctrl + Alt o Alt + Shift) |
| Archiviazione | — | Quanto spazio usa lilOS nel browser, compreso il contenuto dei file; ripristino di impostazioni, scorciatoie e app dei tipi di file; ripristino della scrivania e dei file iniziali (con i workspace) |
| Informazioni | — | Versione di lilOS, browser, lingua |

I due pulsanti di ripristino chiedono conferma: al primo clic il pulsante diventa rosso, e solo un secondo clic entro pochi secondi esegue l'operazione. **Ripristinare la scrivania e i file iniziali** elimina tutte le cartelle e i file che hai creato, ovunque si trovino, **tutti i workspace** (si riparte da uno solo, Principale), **tutti i tag**, le workarea, le posizioni e la vista salvate, poi ricarica lilOS. Non si può annullare.

## Il menu di avvio

Aprilo con il **pulsante del logo** in basso a sinistra oppure con **Ctrl K**.

- Scrivi per cercare un'app per nome. Compaiono le app installate nel workspace in cui sei.
- Usa le **frecce** per scegliere e **Invio** per avviare, oppure fai clic sull'app.
- **Esc** o di nuovo **Ctrl K** chiudono il menu. Si chiude anche facendo clic fuori.

In fondo al menu trovi il tuo nome e due pulsanti:

- **Impostazioni** (ingranaggio): apre la finestra delle impostazioni.
- **Riavvia sessione** (simbolo di accensione): ricarica lilOS. Non perdi nulla, perché tutto è già salvato.

App del menu: File, Browser, Editor, Terminale, Calendario, Immagini, Musica, Posta, Impostazioni. File e Impostazioni ci sono in ogni workspace; le altre solo dove sono installate.

## I tuoi dati

lilOS salva da solo, mentre lavori, le cartelle e i file con i loro nomi e il loro contenuto (quando salvi nell'Editor), i tag e quelli che hai messo su file e cartelle, l'ordine e i collegamenti della barra di File (gli stessi in tutti i workspace), la posizione degli elementi sulla scrivania, il punto della scrivania che stavi guardando e le impostazioni. Tutto questo è salvato per ogni [workspace](#i-workspace). Anche le workarea sono salvate. Dopo aver ricaricato la pagina le finestre di ogni workspace si riaprono dove erano, dentro e fuori dalle workarea (quelle di un workspace in cui non sei si riaprono la prima volta che ci vai). Il testo non ancora salvato in una finestra però non si salva da solo: ricaricando la pagina si perde, quindi salva con Ctrl S. Il resto lo ritrovi com'era.

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
| Ctrl Alt → / Ctrl Alt ← | Passa al workspace successivo / precedente (anche mentre scrivi) |
| Ctrl + (o Ctrl =) / Ctrl − | Ingrandisci / riduci |
| Ctrl 0 | Zoom al 100% |
| Shift 1 | Mostra tutto (nella workarea attuale, solo quella) |
| Invio | Apri gli elementi selezionati |
| F2 | Rinomina l'elemento selezionato |
| Canc | Elimina gli elementi selezionati, mandandoli nel cestino (nel Cestino: eliminazione definitiva; su un'icona di workarea, la workarea) |
| Ctrl A | Seleziona tutto (nella workarea attuale, solo i suoi elementi) |
| Ctrl Z | Annulla l'ultima azione dove stai lavorando |
| Ctrl Y, Ctrl Shift Z | Ripeti l'azione annullata |
| Esc | Togli la selezione |
| Alt W | Chiudi la finestra in primo piano |
| Alt N | Passa alla finestra successiva (riapre anche quelle ridotte a icona) |
| Ctrl S | Salva (nell'Editor) |
| Ctrl Alt N | Nuovo documento nell'Editor |
| Ctrl O | Apri un file nell'Editor |
| Ctrl Alt O | Apri una cartella nell'Editor |
| Ctrl B | Mostra o nascondi la cartella nell'Editor |
| Ctrl Spazio | Suggerimenti nell'Editor |

Questi tasti invece non si possono cambiare:

| Tasti | Azione |
| --- | --- |
| Spazio + trascina, o tasto centrale | Spostati sulla scrivania |
| Trascina su un punto vuoto | Rettangolo di selezione |
| Alt + trascina (modificabile) | Selezione a mano libera |
| Frecce, Invio, Esc | Muoviti nei menu, nelle liste e nelle sezioni; chiudi i menu |
| Invio, Esc durante la rinomina | Conferma, annulla |
| Esc durante il trascinamento di file e cartelle | Annulla lo spostamento |
| Doppio clic sulla barra del titolo di una workarea | Rinomina la workarea |

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

**Perché non posso creare una workarea qui?**
Le workarea aperte non possono sovrapporsi: scegli un punto fuori da ogni area, oppure rimpicciolisci o sposta quella vicina.

**Ho eliminato un elemento per sbaglio. Posso recuperarlo?**
Sì. Di solito è nel **Cestino**: aprilo da File (barra a sinistra), tasto destro sull'elemento → **Ripristina**. Se l'hai appena eliminato, **Ctrl Z** lo rimette a posto. Se hai scelto di eliminare definitivamente (nelle impostazioni), lo recuperi solo con Ctrl Z e solo finché non ricarichi la pagina. Se l'hai eliminato anche dal cestino, o il cestino l'ha svuotato dopo il periodo impostato, non si può più recuperare.

**Come metto un file in una cartella?**
Trascinalo sulla cartella e rilascia: funziona sulla scrivania, in File e nell'Editor, anche da una all'altra. Vedi [Spostare](#spostare) e [Spostare con il trascinamento](#spostare-con-il-trascinamento). Con Ctrl Z torna dov'era.

**Trascino un file su una cartella ma non succede niente.**
La cartella non si evidenzia se lì non si può rilasciare: è la cartella in cui il file già si trova, o il file è una cartella e la destinazione è lei stessa o una cartella al suo interno; le cartelle di sistema non si spostano. Sopra una finestra conta solo quello che c'è sotto il puntatore, non la scrivania dietro. Nella vista di un tag e nel Cestino aperto non si rilascia. Con Esc il trascinamento si annulla.

**Posso copiare un file trascinandolo?**
Non ancora: il trascinamento sposta soltanto.

**Un collegamento nella barra di File è sparito.**
Non si vede se l'elemento è nel Cestino o sulla Scrivania di un altro workspace; ricompare, al suo posto, quando l'elemento torna visibile. Se hai più di 80 voci, le più vecchie vengono tolte. Per rimetterlo: trascina l'elemento tra due voci della barra. Il ripristino "Scrivania e file iniziali" (Impostazioni → Archiviazione) azzera anche la barra.

**Non trovo più i miei elementi o una finestra.**
Controlla di essere nel workspace giusto: il nome è nel pulsante accanto al logo. Poi premi Shift 1 per inquadrare tutto, oppure guarda la mappa in miniatura. Per una finestra, usa il suo pulsante nella barra in basso.

**Dove sono finiti i miei file?**
Se mancano dalla scrivania o da File, forse hanno un **tag invisibile**: un tag invisibile nasconde ovunque gli elementi che lo hanno. Apri File, fai clic sul tag nella barra a sinistra (quelli invisibili hanno un occhio barrato) e li trovi lì. Per farli tornare, accendi **Visibile** in Impostazioni → Tag, oppure togli il tag agli elementi. Se non è questo, prova anche il [Cestino](#il-cestino) e controlla di essere nel workspace giusto.

**Un file di un altro workspace non si vede.**
La cartella Scrivania di ogni workspace è visibile solo da lì. Per condividere un file con gli altri workspace tienilo in Documenti, Immagini o Download. Se hai eliminato il workspace, i suoi file sono in Documenti → Scrivania di *nome*.

**Un'app non parte e compare un messaggio.**
L'app non è installata nel workspace in cui sei. Attivala in Impostazioni → Workspace → Questo workspace.

**Lo zoom del browser cambia invece della scrivania.**
Non dovrebbe succedere: lilOS intercetta Ctrl + rotella. Se succede, fai clic sulla scrivania e riprova.
