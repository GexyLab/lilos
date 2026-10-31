# Guida utente

lilOS è un desktop che si usa dal browser. Al posto di uno schermo fisso c'è una **scrivania infinita**: puoi spostarti in qualsiasi direzione, ingrandire e rimpicciolire, e sistemare cartelle, file e app dove preferisci.

> lilOS è in sviluppo. Le app che ci sono sempre sono **File Manager**, **Sistema** e **AppStore**; c'è anche l'**Editor**, che si può togliere. Altre app le può installare un amministratore dall'AppStore (vedi [L'AppStore](#lappstore)).

## Lo schermo

- **La scrivania** occupa quasi tutto lo schermo. Lo sfondo a puntini ti aiuta a capire quando ti stai spostando o stai cambiando zoom.
- **Il pannello in basso a destra** mostra una mappa in miniatura della scrivania e i controlli dello zoom.
- **La barra in basso**: a sinistra il pulsante con il logo di lilOS, che apre il menu di avvio, e subito dopo il pulsante del [workspace](#i-workspace) (un pallino colorato e il nome); al centro un pulsante per ogni finestra aperta; a destra il tuo nome, la data e l'ora. Passando sopra la data vedi la data completa.

## Accedere e uscire

Se lilOS ha più utenti, all'apertura compare **Accedi a lilOS**: scrivi il **nome utente** e la **password** e premi **Accedi**. Gli account li crea chi gestisce lilOS: da qui non si può crearne uno. Se lilOS ha un solo utente non c'è nulla da scrivere e si entra direttamente.

- Se sbagli la password compare un messaggio. Dopo alcuni tentativi sbagliati (5 con lo stesso nome utente) lilOS ti fa aspettare, e l'attesa si allunga a ogni errore: riprova tra poco.
- Se compare **Il kernel di lilOS non risponde**, il programma che conserva i tuoi dati non è acceso. Chi gestisce lilOS deve avviarlo; poi premi **Riprova**.
- Il tuo spazio è tuo: ogni utente ha le sue cartelle, i suoi file e le sue impostazioni, e gli altri non li vedono.

**Uscire.** Apri il menu di avvio e premi il pulsante di accensione in fondo, **Esci**. lilOS salva quello che stava ancora salvando, cancella dal browser la copia dei tuoi file e torna alla schermata di accesso. Il testo che non hai ancora salvato in una finestra (con Ctrl S) **si perde**: salvalo prima. Su un computer che non è solo tuo, esci sempre. Se lilOS ha un solo utente il pulsante si chiama **Riavvia sessione** e si limita a ricaricare la pagina.

**La sessione scade.** Per sicurezza, dopo molti giorni (o dopo alcuni giorni senza usare lilOS) devi accedere di nuovo. Se succede mentre lavori compare **Sessione scaduta**: accedi con lo stesso utente e le modifiche che aspettavano vengono salvate. Se provi con un altro utente lilOS non lo accetta.

**Salvare.** lilOS salva da solo, un attimo dopo ogni modifica. Se non riesce (per esempio il computer ha perso la connessione) compare **Modifiche non salvate** e lilOS riprova da solo; quando ci riesce compare **Modifiche salvate**. Finché è così non chiudere la pagina: il browser ti avvisa se ci sono modifiche che non sono ancora arrivate.

### I dati che il browser aveva prima

Se usavi lilOS prima degli account, il tuo browser può ancora avere cartelle, file e impostazioni di allora. Al primo accesso, se il tuo spazio è ancora vuoto, compare **Dati in questo browser**:

- **Porta nel mio account** li trasferisce nel tuo spazio, una volta sola, e poi li **cancella da questo browser**;
- **Non ora** li lascia dove sono. La domanda torna ad ogni apertura finché il tuo spazio resta vuoto; se inizi a lavorare, non compare più e quei dati restano nel browser, inutilizzati.

Se lo spazio non è vuoto (per esempio hai già lavorato da un altro browser) la domanda non compare.

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

Sulla scrivania ci sono tre tipi di elementi, più alcuni [elementi fissi](#gli-elementi-fissi):

- **Cartelle**, con l'icona a forma di cartella.
- **File**, con un foglio bianco e una fascia colorata che riporta l'estensione (TXT, PDF, …). Il colore dipende dal tipo di file, vedi [Tipi di file](#tipi-di-file).
- **App**, con un riquadro colorato e il simbolo dell'app: sono collegamenti per avviarla.

Al primo avvio trovi alcuni elementi di esempio: la cartella Progetti, il file benvenuto.txt e i collegamenti a Editor e Sistema (il File Manager è tra gli [elementi fissi](#gli-elementi-fissi)). Se usavi lilOS prima che le app si chiamassero File Manager e Sistema, sulla scrivania puoi trovare ancora le icone con i vecchi nomi «File» e «Impostazioni»: sono gli stessi collegamenti, puoi rinominarli.

Gli elementi della scrivania sono il contenuto della cartella **Scrivania**: li ritrovi anche nel [File Manager](#il-file-manager).

### Gli elementi fissi

Su ogni scrivania, in ogni workspace, ci sono sempre sei elementi: **Home**, **Documenti**, **Immagini**, **File Manager**, **Download** e **Cestino**. Non sono file della cartella Scrivania, quindi non li trovi nel File Manager.

- **Si aprono** con doppio clic o **Invio**: Home, Documenti, Immagini e Download si aprono nel [File Manager](#il-file-manager), il File Manager si avvia, il Cestino mostra il [Cestino](#il-cestino).
- **Si spostano** come gli altri elementi, e la posizione resta salvata. Su una scrivania che non li aveva ancora, compaiono nei primi posti liberi.
- **Non si rinominano e non si eliminano.** Con **Canc** o **Elimina** non succede niente, a parte un messaggio che lo spiega. Se hai selezionato anche altri elementi, vengono eliminati solo quelli. Il tasto destro offre **Apri** e **Elementi fissi della scrivania…**, che porta a Sistema.
- **Accettano elementi trascinati.** Su Home, Documenti, Immagini e Download i file e le cartelle si **spostano** lì, come su una cartella qualsiasi. Sul Cestino finiscono nel cestino, con **Ctrl Z** li riprendi. L'icona del Cestino mostra della carta quando dentro c'è qualcosa.

L'elenco è in Sistema → Scrivania → Elementi, sezione «Elementi fissi»: si può solo leggere, non si possono togliere.

Se usavi lilOS prima di questa novità, il collegamento al File Manager che avevi già sulla scrivania resta: ora c'è anche l'elemento fisso, e il vecchio collegamento lo puoi eliminare.

### Selezionare

- **Clic** su un elemento per selezionarlo.
- **Ctrl + clic** (o **Shift + clic**) per aggiungere o togliere un elemento dalla selezione.
- **Rettangolo di selezione**: tieni premuto il tasto sinistro su un punto vuoto e trascina. Si selezionano gli elementi che il rettangolo tocca.
- **Selezione a mano libera**: tieni premuto **Alt** e trascina su un punto vuoto. Disegni un percorso chiuso che segue il mouse; si selezionano gli elementi che hanno il centro dentro il percorso. La combinazione si cambia in Sistema → Usabilità → Scorciatoie, sezione Mouse.
- Tenendo premuto **Ctrl** (o **Shift**) mentre disegni il rettangolo o il percorso, gli elementi si aggiungono a quelli già selezionati.
- **Ctrl A** seleziona tutto.
- Un clic su un punto vuoto, oppure **Esc**, toglie la selezione.

Quando un elemento è selezionato, il nome viene mostrato per intero (fino a quattro righe).

### Spostare

Trascina un elemento dove vuoi. Se più elementi sono selezionati, si spostano tutti insieme. Al rilascio si allineano a una griglia invisibile, così restano in ordine.

Puoi anche **mettere file e cartelle dentro una cartella**: trascinali sopra una cartella, che si evidenzia, e rilasciali. Funziona con una cartella della scrivania, con una cartella aperta in una finestra del File Manager o con una cartella nel pannello dell'[Editor](#aprire-una-cartella). In basso compare un messaggio, per esempio "Spostato «note.txt» in Documenti". Le cartelle dentro cui metti un elemento non possono essere l'elemento stesso o una cartella che lo contiene.

- Vicino al puntatore compare il nome di ciò che trascini (o quanti elementi sono).
- **Esc** durante il trascinamento annulla: tutto resta com'era.
- Rilasciando sopra una finestra, il rilascio vale per la finestra: se non c'è una cartella sotto il puntatore, le icone tornano dove erano.
- Si può trascinare anche nell'altro verso: dalla finestra del File Manager o dall'Editor sulla scrivania. L'elemento si sposta nella cartella Scrivania e compare dove hai rilasciato.
- **Ctrl Z** rimette tutto dov'era (vedi [Annullare e ripetere](#annullare-e-ripetere)).
- Gli elementi si **spostano**, non si copiano: non c'è ancora un modo per copiare con il trascinamento. Le cartelle non si aprono da sole passandoci sopra, e le cartelle di sistema (Documenti, Immagini, Download) non si possono spostare.

### Aprire

**Doppio clic** oppure **Invio** sugli elementi selezionati. Le cartelle si aprono nel [File Manager](#il-file-manager), le app si avviano, i file si aprono con l'app associata al loro tipo (i file di testo e di codice nell'[Editor](#leditor)). Se nessuna app è associata compare la finestra [Apri con](#apri-con).

Con il tasto destro su un file, **Apri con…** permette di scegliere l'app anche quando ce n'è già una associata.

### Proprietà

Tasto destro su **un** elemento → **Proprietà…**. Se ne hai selezionati più di uno la voce non compare. Nel File Manager c'è la stessa voce.

- **Per una cartella o un file** si apre una piccola finestra, solo da leggere: il tipo, dove si trova, quanto pesa (per una cartella, quanti file e cartelle contiene e la loro dimensione), quando è stato creato e modificato, il workspace, i tag e, per un file, l'app con cui si apre. Se l'elemento cambia mentre la finestra è aperta, si aggiorna; se sparisce, la finestra si chiude. Per ogni elemento c'è una sola finestra.
- **Per un'app** (un collegamento sulla scrivania) si aprono le proprietà dell'app, che trovi anche con il tasto destro su un'app nel menu di avvio. Vedi [Proprietà di un'app](#proprietà-di-unapp).

Una **workarea** ha le sue proprietà, con il titolo e la descrizione (vedi [Le workarea](#le-workarea)).

### Creare cartelle e file

Fai clic con il **tasto destro** su un punto vuoto e apri **Nuovo**: scegli **Cartella**, **Workarea** (vedi [Le workarea](#le-workarea)), **Documento di testo**, **Documento Markdown** o **Pagina HTML** (che parte già con lo scheletro di una pagina). L'elemento compare dove hai fatto clic e puoi scriverne subito il nome.

Le voci del menu, anche quelle di **Nuovo**, si cambiano in Sistema → Usabilità → [Menu contestuale](#menu-contestuale).

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

Puoi cambiare questo comportamento in **Sistema → Usabilità → Cestino**: togliere la conferma, oppure eliminare definitivamente senza passare dal cestino. In quel caso l'elemento si recupera solo con Ctrl Z, finché non ricarichi la pagina.

Le cartelle di sistema non si possono eliminare. Eliminare una workarea è diverso: non passa dal cestino (vedi [Eliminare una workarea](#eliminare-una-workarea)).

### Riordinare

Tasto destro su un punto vuoto → **Riordina icone**. Gli elementi vengono messi in colonna nella parte di scrivania che stai guardando: prima gli elementi fissi, nel loro ordine (Home, Documenti, Immagini, File Manager, Download, Cestino), poi le cartelle, i file e le app, ciascun gruppo in ordine alfabetico.

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
- Le finestre si chiudono, ma lilOS ricorda le app, dove erano e che cosa mostravano (per esempio il file aperto nell'Editor o la cartella aperta nel File Manager). Il testo non salvato non viene ricordato: per questo lo chiede prima.
- Le icone dell'area spariscono dalla scrivania. Al loro posto resta **una sola icona**, nell'angolo in alto a sinistra dell'area.

L'icona si usa come le altre: **doppio clic** o **Invio** la riapre. L'area torna al suo posto con le icone, le finestre si riaprono e la vista la inquadra. **F2** la rinomina. Trascinandola, sposti l'area nascosta con tutto il suo contenuto. Se al ritorno l'area coprirebbe un'altra workarea aperta, viene spostata a destra con il suo contenuto.

### Eliminare una workarea

**Canc** sull'icona, oppure tasto destro → **Elimina la workarea…**. lilOS chiede conferma.

Si elimina solo la workarea: le icone e le finestre che contiene restano sulla scrivania. Se era ridotta a icona, prima viene riaperta. Non perdi nessun file, e con **Ctrl Z** puoi riavere la workarea (vedi [Annullare e ripetere](#annullare-e-ripetere)).

### Cosa non è ancora possibile

- Riaprendo una workarea, le finestre di servizio (per esempio la scelta di un file o le proprietà) non tornano: vengono chiuse.
- Le impostazioni si riaprono sulla prima scheda.
- Le finestre ingrandite tornano non ingrandite.
- Le icone nascoste da una workarea ridotta compaiono comunque nel File Manager, nella cartella Scrivania.
- Le voci della workarea nel tasto destro si trovano solo sullo sfondo della scrivania.
- Se hai già personalizzato il menu del tasto destro, la voce **Workarea** in **Nuovo** non viene aggiunta da sola: aggiungila da Sistema → Usabilità → Menu contestuale.

## I workspace

Un **workspace** è una scrivania a parte. Ognuno ha i suoi elementi sulla scrivania, le sue finestre aperte, le sue workarea, il punto della scrivania che stavi guardando e le app che mostra. Serve a separare lavori diversi, per esempio "Lavoro" e "Casa": cambiando workspace vedi solo le cose di quel lavoro.

Al primo avvio c'è un solo workspace, **Principale**. Se usavi lilOS prima dei workspace, tutto quello che avevi si trova lì.

### Cambiare workspace

- Fai clic sul **pulsante del workspace** nella barra in basso, accanto al logo. Il menu mostra l'elenco (con una spunta su quello in cui sei), **Successivo**, **Precedente**, **Nuovo workspace** e **Gestisci i workspace…**.
- Oppure premi **Ctrl Alt →** per il successivo e **Ctrl Alt ←** per il precedente. Funzionano anche mentre scrivi, e solo se hai almeno due workspace.

In basso compare per un attimo il nome del workspace in cui sei arrivato.

Il workspace che lasci resta **esattamente com'era**. Le sue finestre non si chiudono: si nascondono (spariscono anche dalla barra) e tornano quando ci ritorni, con il testo non ancora salvato. Quello che fai con Ctrl Z riparte da zero in ogni scrivania.

### Cosa è separato e cosa è di tutti

| Cosa | Com'è |
| --- | --- |
| Scrivania (la cartella **Scrivania**) | Separata. Gli altri workspace non la vedono affatto: non compare né nel File Manager, né quando scegli un file o una cartella, né nel pannello dell'Editor |
| Posizione degli elementi, vista, workarea, finestre aperte | Separate |
| App visibili | Separate (vedi sotto): le app si installano per tutti, ogni workspace sceglie quali mostrare |
| **Documenti**, **Immagini**, **Download** | Condivise: tutti i workspace vedono gli stessi file |
| Tema, colore principale, scorciatoie, menu del tasto destro, app dei tipi di file | Uguali in tutti i workspace |

Ogni file e cartella ricorda **il workspace che l'ha creato**. Non cambia se lo sposti o lo rinomini. Nel File Manager, in vista elenco, la colonna **Workspace** mostra un pallino con il colore e il nome del workspace; **Condiviso** compare sulle cartelle principali, che non sono di nessuno. In vista a icone, il suggerimento che compare passando sopra un elemento dice «Workspace: …». Fai clic sull'intestazione per ordinare per workspace.

### Le app di ogni workspace

**File Manager**, **Sistema** e **AppStore** ci sono sempre. Le altre app (anche l'Editor e quelle [installate](#app-installate)) valgono per tutti i workspace, ma ognuno può **nasconderne** alcune, da Sistema → Workspace → Questo workspace. Il menu di avvio mostra solo le app visibili nel workspace in cui sei.

- Se avvii un'app che qui è nascosta (per esempio da un collegamento sulla scrivania), compare un messaggio che ti dice dove mostrarla.
- Se apri un file e la sua app è nascosta, compare **Apri con**, che propone solo le app visibili. La scelta dell'app per ogni tipo di file è la stessa in tutti i workspace.
- Se nascondi un'app, le sue finestre in questo workspace si chiudono (se hanno modifiche non salvate ti viene chiesto).

### Creare, rinominare, eliminare

Apri **Sistema → Workspace**. Ci sono due schede.

- **Questo workspace**: il **nome** (al massimo 40 caratteri), il **colore** (è il pallino nella barra e accanto ai suoi file nel File Manager), quanti file, cartelle e collegamenti ha creato, e un interruttore per ogni app (acceso: l'app è visibile).
- **Tutti**: l'elenco dei workspace, con quanti elementi hanno creato e quante app mostrano. **Passa a questo** ti ci porta, **Elimina…** lo elimina, **Crea** ne fa uno nuovo con la scrivania vuota e tutte le app visibili. Puoi averne **al massimo 20**. L'ultimo workspace non si può eliminare.

Un workspace nuovo si crea anche dal menu del pulsante nella barra (**Nuovo workspace**) e ti ci porta subito.

**Eliminare un workspace** chiede due clic: al primo il pulsante diventa rosso, il secondo (entro pochi secondi) conferma. Nessun file viene cancellato:

- se la sua scrivania non era vuota, diventa la cartella **Documenti → Scrivania di** *nome del workspace*; se era vuota sparisce;
- i file che ha creato in altre cartelle restano dove sono e nel File Manager la colonna dice **nome (eliminato)**;
- le sue finestre aperte passano nel workspace in cui sei, al centro della vista, con il testo non salvato. Le finestre di servizio (per esempio la scelta di un file o le proprietà di una workarea) si chiudono;
- **si perdono** la posizione degli elementi, le workarea, il punto della scrivania che guardava e l'elenco delle app che nascondeva. Non si possono recuperare.

### Cosa non è ancora possibile

- Al massimo 20 workspace.
- Le preferenze (tema, scorciatoie, menu) sono le stesse per tutti i workspace.
- Le scrivanie degli altri workspace non si vedono: per scambiare un file tra workspace tienilo in Documenti, Immagini o Download.
- Se apri un file condiviso (per esempio in Documenti) con l'Editor in un workspace, vai in un altro workspace e lì lo sposti nella tua scrivania, l'Editor del primo non lo vede più e non può salvarlo.
- Se hai lilOS aperto in più schede del browser, ogni scheda salva per conto suo e per ogni elemento vince l'ultima che salva: i workspace creati in un'altra scheda possono andare persi. Usa una scheda sola.
- Le app aggiunte a lilOS in futuro arrivano visibili in tutti i workspace; quelle che hai nascosto restano nascoste.
- Dopo aver ricaricato la pagina le finestre di servizio non tornano, le finestre ingrandite tornano non ingrandite e Sistema si riapre sulla prima scheda.

## Il File Manager

**File Manager** mostra le cartelle e il loro contenuto. Aprilo dal menu di avvio o dall'elemento **File Manager** della scrivania, oppure fai doppio clic su una cartella della scrivania: si apre direttamente lì. Dal tasto destro su un punto vuoto della scrivania, **Apri la Scrivania nel File Manager** mostra gli elementi della scrivania come elenco.

- **A sinistra**, la barra laterale. In cima la sezione **Collegamenti**: Home e le cartelle principali (Scrivania, Documenti, Immagini, Download) e i collegamenti che aggiungi tu (vedi [Collegamenti nella barra laterale](#collegamenti-nella-barra-laterale)), nell'ordine che scegli trascinandoli. Sotto, la voce **Tag** con un elemento per ogni tag che hai creato (vedi [I tag](#i-tag)) e in fondo il **Cestino** (vedi [Il Cestino](#il-cestino)): queste restano sempre al loro posto. Le cartelle principali non si possono rinominare né eliminare. **Scrivania** è quella del workspace in cui sei; Documenti, Immagini e Download sono di tutti.
- **In alto**: Indietro, Avanti, Cartella superiore; il percorso (fai clic su una parte per tornarci); **Nuova cartella**; vista **elenco** o **a icone**; i pulsanti che aprono e chiudono i pannelli Anteprima e Informazioni; la ricerca nella cartella aperta (Esc la svuota).
- **Al centro**: il contenuto della cartella. In vista elenco ci sono le colonne Nome, Modificato, Dimensione, Tipo e Workspace (il workspace che ha creato l'elemento, vedi [I workspace](#i-workspace)): fai clic su un'intestazione per ordinare, di nuovo per invertire l'ordine. Le cartelle restano sempre in cima.
- **A destra**, due pannelli che si aprono e si chiudono: **Informazioni** e **Anteprima** (vedi [Anteprima e Informazioni](#anteprima-e-informazioni)).
- **In basso**: quanti elementi ci sono e quanti sono selezionati, il percorso della cartella o un messaggio.

Con gli elementi della cartella fai le stesse cose della scrivania: clic, Ctrl + clic, **Shift + clic** per selezionare un intervallo, doppio clic o Invio per aprire, F2 per rinominare, Canc per eliminare (nel cestino: eliminare definitivamente), Ctrl A per selezionare tutto. Dal tasto destro su un punto vuoto puoi creare cartelle e file di testo. **Ctrl Z** annulla quello che hai fatto in questa finestra (vedi [Annullare e ripetere](#annullare-e-ripetere)).

Tasti per muoversi nell'elenco (non modificabili):

| Tasti | Azione |
| --- | --- |
| Frecce (con Shift per estendere la selezione), Home, Fine | Muoviti tra gli elementi |
| Backspace o Alt ↑ | Cartella superiore |
| Alt ← / Alt → | Indietro / Avanti |

Quello che fai nel File Manager vale anche per la scrivania, e viceversa: una cartella creata in Scrivania compare subito sulla scrivania.

### Anteprima e Informazioni

Il File Manager ha due pannelli a destra dell'elenco. Servono per guardare un elemento senza aprirlo. All'inizio **Informazioni** è aperto e **Anteprima** è chiusa.

| Come | Cosa fa |
| --- | --- |
| Pulsante dell'anteprima o **Alt P** | Apre o chiude l'**Anteprima**, accanto all'elenco |
| Pulsante delle informazioni o **Alt I** | Apre o chiude le **Informazioni**, al bordo destro della finestra |
| **×** nell'intestazione del pannello | Chiude il pannello |
| Tasto destro su un elemento → **Informazioni** | Apre le informazioni di quell'elemento (anche nel Cestino) |

Alt P e Alt I si cambiano in Sistema → Usabilità → Scorciatoie (vedi [Cambiare le scorciatoie](#cambiare-le-scorciatoie)).

**Anteprima** mostra l'elemento selezionato:

- un **file di testo**: i primi 100.000 caratteri, con una nota se il file è più lungo;
- un'**immagine SVG**: il disegno, senza eseguire eventuali script che contiene;
- una **cartella**: il suo contenuto (le prime 200 voci); con un doppio clic su una voce la apri;
- un **collegamento a un'app**: l'app a cui porta.

Il pulsante **Apri** (**Avvia** per un'app) nell'intestazione apre l'elemento. Se selezioni più elementi, l'anteprima ne mostra uno alla volta e lo dice. Per gli elementi nel Cestino chiede di ripristinarli prima. Se salvi il file mentre lo guardi, l'anteprima si aggiorna.

**Informazioni** descrive la selezione:

- **Un elemento**: tipo ed estensione, dimensione (anche in byte), per le cartelle quanti elementi contengono e la dimensione totale, il percorso (nel Cestino: quando è stato eliminato e la posizione originale), quando è stato creato e modificato, il workspace, i tag e gli attributi (di sistema, privata, nascosto da un tag invisibile, nella barra laterale). Per i file di testo anche righe, parole e caratteri (fino a 5 MB).
- **Più elementi**: quanti sono per tipo, la dimensione totale, gli elementi dentro le cartelle, i tipi, la posizione (comune, o il numero di cartelle diverse), la data più vecchia e la più recente, i workspace, i tag e quelli in comune, e l'elenco dei nomi (al massimo 30).
- **Nessun elemento selezionato**: la cartella aperta; nel Cestino il riepilogo (contenuto, dimensione, ultima eliminazione, per quanto tempo si conservano); nella vista di un tag, il riepilogo di quel tag.

**Larghezza.** Trascina il bordo sinistro del pannello. Con la tastiera, sul bordo: **←** e **→** (con Shift a passi più lunghi), **Home** e **Fine** per il minimo e il massimo, doppio clic per tornare alla larghezza iniziale (300 pixel l'anteprima, 260 le informazioni). Ogni pannello va da 180 a 720 pixel. Se la finestra è stretta, i pannelli si restringono per lasciare all'elenco almeno 260 pixel, e tornano alla larghezza scelta quando la allarghi.

lilOS ricorda quali pannelli sono aperti e quanto sono larghi, e li ritrova alla riapertura.

### Spostare con il trascinamento

Trascina file e cartelle (uno o più selezionati) e rilasciali su una cartella per spostarceli. Puoi rilasciarli:

- su una **cartella dell'elenco** o della vista a icone;
- sulla **parte vuota dell'elenco**: vanno nella cartella che stai guardando;
- su una **parte del percorso** in alto, per portarli in una cartella più su;
- su una **cartella della sezione Collegamenti** (Home, Scrivania, Documenti… o il collegamento a una cartella): rilascia al **centro** della voce;
- su una cartella della **scrivania** o di un'altra finestra del File Manager, o nel pannello dell'[Editor](#aprire-una-cartella), e viceversa.

Cosa succede:

- La cartella o la voce di destinazione si evidenzia. Se non si evidenzia, lì non puoi rilasciare (per esempio una cartella dentro se stessa, o la cartella in cui l'elemento già si trova).
- Un messaggio in basso dice dove è andato.
- **Esc** durante il trascinamento annulla.
- Se un elemento è selezionato insieme ad altri, un clic semplice su di esso lascia selezionato solo lui; il trascinamento invece sposta tutta la selezione.
- Se nella cartella di destinazione c'è già un elemento con lo stesso nome, lilOS aggiunge un numero.
- **Ctrl Z** nella finestra del File Manager da cui hai trascinato rimette tutto nelle cartelle d'origine, con i nomi di prima (vedi [Annullare e ripetere](#annullare-e-ripetere)).
- Rilasciando sul **Cestino** (in fondo alla barra a sinistra, al centro o ai bordi) gli elementi vengono eliminati: finiscono nel Cestino e Ctrl Z li rimette. Le cartelle di sistema restano dove sono.
- Non si può rilasciare nel Cestino aperto né nella vista di un tag. Sui **Tag** della barra a sinistra e nello spazio vuoto sotto il Cestino non succede niente (nessuna linea, nessuna azione). Gli elementi nel Cestino non si possono trascinare.
- Si **spostano**, non si copiano: non c'è ancora un modo per copiare con il trascinamento. Le cartelle non si aprono da sole passandoci sopra, e non c'è un modo per spostare con la tastiera.

### Collegamenti nella barra laterale

In cima alla barra a sinistra del File Manager, la sezione **Collegamenti** tiene a portata di clic le cartelle e i file che usi di più. Contiene Home, Scrivania, Documenti, Immagini e Download e i collegamenti che aggiungi tu, nell'ordine che preferisci. Sotto di lei ci sono i **Tag** e il **Cestino**, fuori dall'ordine: non si spostano.

- **Aggiungere**: trascina file o cartelle nella sezione, **tra due voci** (compare una linea che mostra dove andrà), sopra il collegamento a un **file**, oppure nella parte vuota in fondo alla sezione (circa 10 pixel). Oppure tasto destro su un elemento → **Aggiungi alla barra laterale del File Manager** (aggiunge in fondo; la voce compare anche nel pannello dell'[Editor](#aprire-una-cartella) e sulla scrivania, e non per le cartelle di sistema). Compare "Collegamento aggiunto". Un collegamento che esiste già non si duplica. Al massimo 80 voci: quando sono troppe, le più vecchie vengono tolte.
- **Dove rilasci conta**: al **centro** di una cartella (una voce fissa o un collegamento a una cartella) l'elemento si **sposta** davvero in quella cartella, con Ctrl Z per annullare. Vicino al **bordo** di una voce (circa 8 pixel) si crea un collegamento in quel punto. Sul **Cestino** l'elemento finisce sempre nel Cestino: non si crea mai un collegamento. Sui **Tag** non succede niente.
- **Riordinare**: trascina una voce della sezione su un'altra posizione, tra due voci. Vale per i collegamenti e per le voci fisse (Home, Scrivania, Documenti…). I Tag e il Cestino non entrano nell'ordine.
- **Usare**: un clic apre la voce. Una cartella si mostra nella finestra, un file si apre con la sua app, un'app (un collegamento della scrivania) si avvia.
- **Trascinare fuori dalla barra**: trascinando un collegamento fuori dalla barra trascini l'elemento vero. Rilasciandolo su una cartella, per esempio, lo sposti.
- **Eliminare un collegamento**: toglie solo la voce dalla barra, il file o la cartella restano dove sono. Tre modi: il pulsante **×** che compare passando il mouse sulla voce (o quando ha il focus), il tasto **Canc** su un collegamento con il focus (non tocca i file selezionati nell'elenco), oppure tasto destro → **Elimina il collegamento**. Compare "Collegamento a «nome» eliminato" e **Ctrl Z** nella finestra del File Manager lo rimette al suo posto. Le voci fisse (Home, Scrivania…) non si eliminano.
- **Tasto destro** su un collegamento: **Apri**, **Mostra nella cartella** (apre la cartella dove si trova l'elemento) e **Elimina il collegamento**.
- Il collegamento segue l'elemento: se lo rinomini o lo sposti, il collegamento resta valido. Se lo metti nel Cestino, o se si trova sulla Scrivania di un altro workspace, il collegamento non si vede (e ricompare, al suo posto, se l'elemento torna visibile).
- L'ordine della barra e i collegamenti sono gli stessi in tutti i [workspace](#i-workspace).

## Il Cestino

Il **Cestino** raccoglie file e cartelle eliminati, con tutto il loro contenuto. Aprilo da **File Manager**, con la voce **Cestino** in fondo alla barra a sinistra, oppure da **Sistema → Usabilità → Cestino** con **Apri il cestino**.

L'elenco mostra, dal più recente: **Nome**, **Eliminato** (data e ora), **Dimensione**, **Tipo** e **Posizione originale**. Fai clic su un'intestazione per ordinare. In basso trovi dopo quanto tempo gli elementi vengono eliminati definitivamente.

- **Ripristinare**: tasto destro su un elemento → **Ripristina**. Torna nella cartella da cui era partito; se quella cartella non esiste più, torna in Home. Se nella cartella c'è già un elemento con lo stesso nome, lilOS aggiunge un numero. Compare un messaggio che dice dove è andato, e con **Ctrl Z** lo rimetti nel cestino.
- **Ripristinare tutto**: tasto destro su un punto vuoto → **Ripristina tutto**.
- **Eliminare definitivamente**: tasto destro su un elemento → **Elimina definitivamente…**, oppure **Canc**. lilOS chiede sempre conferma, anche se l'hai tolta nelle impostazioni, perché **questa azione non si può annullare**.
- **Svuotare il cestino**: tasto destro su un punto vuoto → **Svuota il cestino…**, oppure **Sistema → Usabilità → Cestino → Svuota…**. Anche questa chiede conferma e non si può annullare.
- Gli elementi nel cestino non si aprono e non si rinominano: ripristinali prima.

Cose da sapere:

- Dopo **30 giorni** (se non cambi il periodo) quello che è nel cestino viene eliminato definitivamente. In **Sistema → Usabilità → Cestino → Conserva gli elementi per** scegli da 1 giorno a 1 anno, oppure "Per sempre". La pulizia avviene quando apri lilOS e poi ogni ora.
- Il cestino occupa spazio come gli altri file. Nelle impostazioni vedi quanti elementi contiene e quanto pesano.
- Quello che elimini dalla **Scrivania** di un workspace compare nel cestino solo di quel workspace. Se elimini il workspace, quegli elementi diventano visibili da tutti.
- Ripristinare la scrivania e i file iniziali (Sistema → Archiviazione) svuota anche il cestino.

## L'Editor

L'**Editor** apre e modifica i file di testo e di codice (txt, md, js, css, html, json, py e altri). Un amministratore può rimuoverlo dall'[AppStore](#lappstore); chiunque può nasconderlo nel proprio workspace. Si apre facendo doppio clic su un file, dal menu di avvio o con **Ctrl Alt N** per un documento nuovo.

- **A sinistra**, i numeri di riga; la riga su cui si trova il cursore è evidenziata.
- **Colori**: parole chiave, testi, numeri e commenti sono colorati secondo il linguaggio, riconosciuto dall'estensione del file. Puoi cambiarlo dal menu in alto a destra (Testo, Markdown, JavaScript, CSS, HTML, JSON, Python).
- **In alto**: Nuovo documento, Apri un file…, Apri una cartella…, Salva, Mostra nella cartella (apre il File Manager dove si trova il file); all'estrema destra il pulsante che mostra o nasconde la cartella aperta.
- **In basso**: riga e colonna del cursore, numero di righe, stato del documento (Salvato, Modificato, Nuovo documento).

### Aprire una cartella

Con **Apri una cartella…** (o **Ctrl Alt O**) scegli una cartella: compare in un pannello **a destra** con tutto il suo contenuto. Quella cartella è la **radice**: dal pannello gestisci quello che c'è dentro senza uscire dall'Editor. Puoi anche fare clic destro su una cartella nel File Manager e scegliere **Apri nell'Editor**.

- **Aprire**: un clic su una cartella la apre o la chiude; doppio clic (o Invio) su un file lo apre nell'Editor. Il file aperto è evidenziato.
- **Creare**: i pulsanti in alto nel pannello (Nuovo file, Nuova cartella) creano dentro la cartella selezionata, nella cartella del file selezionato o nella radice; anche dal clic destro. Scrivi subito il nome e premi Invio (Esc annulla). Un file nuovo si apre da solo.
- **Rinominare**: F2, oppure clic destro → Rinomina.
- **Spostare**: trascina un elemento su una cartella (la destinazione si evidenzia); rilascialo su un file per portarlo nella cartella di quel file, o nella parte vuota del pannello per portarlo nella radice. Puoi trascinare anche da e verso la scrivania e il File Manager: porta l'elemento fuori dal pannello (per esempio sulla scrivania), oppure trascina qui un elemento da lì. Esc annulla il trascinamento. Oppure clic destro → **Sposta in…** e scegli la cartella: questa scelta resta dentro la radice. Se nella destinazione c'è già un elemento con lo stesso nome, viene aggiunto un numero. Dal pannello si trascina un elemento alla volta, e le cartelle di sistema non si spostano.
- **Barra laterale del File Manager**: clic destro → **Aggiungi alla barra laterale del File Manager** mette l'elemento tra i collegamenti del [File Manager](#collegamenti-nella-barra-laterale).
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

Ctrl S, Ctrl Alt N, Ctrl O, Ctrl Alt O, Ctrl B e Ctrl Spazio si cambiano in Sistema → Usabilità → Scorciatoie, sezione Editor.

Un documento nuovo, al primo salvataggio, viene creato nella cartella aperta a destra o, se non ce n'è una, in **Documenti**, con il nome "Senza titolo.txt"; poi puoi rinominarlo dal File Manager o dalla scrivania.

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

- **un file di lilOS** (per esempio `/home/<utente>/Documenti/persona.schema.json`);
- **un indirizzo web** (per esempio `https://www.schemastore.org/package.json`). Il sito deve permettere di essere letto da altre pagine: molti schemi pubblici lo permettono, ma un indirizzo che reindirizza altrove può non funzionare;
- **nessuno schema**.

Vale anche la chiave `"$schema"` scritta nel file. Con uno schema, i suggerimenti propongono le chiavi previste e gli errori segnalano quelle mancanti o sbagliate.

**Impostazioni dell'Editor** (ingranaggio in alto a destra):

| Sezione | Cosa puoi fare |
| --- | --- |
| Evidenziazione | Scegliere il motore per ogni linguaggio; aggiungere una **grammatica TextMate** (un file `.tmLanguage.json` di lilOS): i file con le estensioni indicate dalla grammatica verranno colorati con essa |
| Language server | Accendere o spegnere i server nel browser (JSON, CSS, HTML); collegare un **server esterno** via WebSocket (`ws://…`) per un linguaggio, per esempio TypeScript avviato sul tuo computer con un ponte WebSocket |
| Schemi JSON | Vedere e togliere gli schemi associati ai file |

## Photo

**Photo** mostra le immagini (PNG, JPEG, GIF, WebP, BMP, AVIF, ICO e SVG) e permette qualche ritocco. Non c'è di serie: un amministratore la installa dall'[AppStore](#lappstore). Si apre facendo doppio clic su un'immagine o dal menu di avvio. Le immagini SVG si aprono di solito nell'Editor: per vederle in Photo usa **Apri con**.

### Portare le immagini in lilOS

- **Importa dal computer** (la freccia verso l'alto nella barra) sceglie una o più immagini dal tuo computer e le copia in lilOS, nella cartella dell'immagine aperta oppure in **Immagini**. Puoi anche **trascinarle** dal computer dentro la finestra di Photo.
- **Scarica** (la freccia verso il basso) salva sul tuo computer l'immagine aperta, con le modifiche fatte.
- Le frecce ai lati dell'immagine (o **←** e **→**) passano alle altre immagini della stessa cartella.

### Gli strumenti

| Strumento | Tasto | Cosa fa |
|---|---|---|
| Guarda e sposta | V | Trascinando sposti l'immagine quando è più grande della finestra |
| Disegna | B | Disegna a mano libera: colore, spessore e opacità nella barra sotto. **Gomma** cancella e rende trasparente |
| Testo | T | Clic sull'immagine e scrivi; **Invio** mette il testo sull'immagine, **Maiusc Invio** va a capo, **Esc** annulla. Colore, carattere, dimensione e grassetto nella barra sotto |
| Ritaglia | C | Trascina il riquadro, i suoi bordi o gli angoli (proporzioni libere, come l'immagine, 1:1, 4:3, 16:9…), poi **Ritaglia** o **Invio** |

**Ridimensiona** cambia larghezza e altezza, in pixel o in percentuale, mantenendo le proporzioni se il lucchetto è attivo. **Converti** salva una copia in PNG, JPEG (più leggero, senza trasparenza) o WebP, con la qualità che scegli, e la apre se vuoi.

### Zoom, annullare e salvare

- **+** e **−** (o Ctrl e la rotella del mouse) ingrandiscono e riducono; **0** adatta l'immagine alla finestra, **1** la mostra a dimensione reale. La percentuale è scritta in basso a destra.
- **Ctrl Z** e **Ctrl Y** annullano e ripetono le ultime 20 modifiche.
- **Ctrl S** salva sopra il file, nel suo formato. GIF, SVG, BMP, AVIF e ICO non si possono riscrivere: Photo propone di salvare una copia in PNG, JPEG o WebP.
- Con modifiche non salvate il titolo mostra un pallino (•) e, prima di chiudere o di passare a un'altra immagine, Photo chiede: **Salva**, **Non salvare** o **Annulla**.

## Annullare e ripetere

**Ctrl Z** annulla l'ultima azione, **Ctrl Y** (o **Ctrl Shift Z**) la ripete. Agiscono **dove stai lavorando**: ogni posto ha il suo elenco di azioni, e lilOS sceglie quello dove hai fatto clic per ultimo. In basso compare un breve messaggio, per esempio "Annullato: Elimina «Appunti»" o "Ripetuto: Rinomina…".

| Dove | Cosa si può annullare |
| --- | --- |
| Scrivania (nessuna finestra in primo piano) | Creare, rinominare ed eliminare cartelle e file (anche cartelle con il loro contenuto); spostare le icone, anche con il trascinamento; spostare file e cartelle dentro una cartella trascinandoli da qui; Riordina icone. Per le workarea: creare, rinominare, spostare, ridimensionare ed eliminare |
| Finestra del File Manager | Creare, rinominare, eliminare e ripristinare dal cestino; spostare file e cartelle trascinandoli da questa finestra |
| Editor, nel testo | Scrittura, suggerimenti accettati, rientri: come in un normale editor di testo |
| Editor, nel pannello della cartella | Creare, rinominare, spostare ed eliminare |

Creare un elemento e dargli il nome è una sola azione: Ctrl Z lo toglie. Un elemento eliminato torna con lo stesso contenuto e, sulla scrivania, nello stesso punto. Se l'elemento è andato nel cestino, dopo aver ricaricato la pagina lo ripristini comunque dal Cestino. **Eliminare definitivamente dal cestino non si annulla.**

Cose da sapere:

- **Dopo aver ricaricato la pagina l'elenco è vuoto**: si può annullare solo quello che hai fatto da quando hai aperto lilOS.
- Se una finestra del File Manager viene chiusa, le sue azioni non si possono più annullare.
- Le finestre senza elenco, come Sistema, non fanno nulla con Ctrl Z, e non toccano la scrivania dietro di loro.
- Nei campi di testo (per esempio la ricerca, o il nome mentre lo scrivi) Ctrl Z annulla la scrittura, come in ogni programma.
- Se un'azione non si può più annullare (per esempio la cartella dove si trovava un elemento eliminato non esiste più), compare "Non si può più fare: …" e quell'azione viene tolta dall'elenco.
- Non si annullano: ridurre a icona o riaprire una workarea, e le modifiche fatte nella finestra delle proprietà di una workarea.
- **Il trascinamento si annulla dove è partito.** Se trascini da una finestra del File Manager alla scrivania, Ctrl Z funziona nella finestra del File Manager (non sulla scrivania), e viceversa. Lo spostamento di più elementi si annulla in un colpo solo, e ognuno torna nella sua cartella con il nome di prima.
- Annullando lo spostamento di un solo elemento con **Sposta in…** nel pannello dell'Editor, se per evitare un doppione gli era stato aggiunto un numero, il numero resta. Con il trascinamento invece il nome di prima torna.
- Eliminare un collegamento della barra del File Manager si annulla con Ctrl Z nella finestra del File Manager. Aggiungere un collegamento o riordinare le voci non si annulla (lo spostamento di un elemento in una cartella con il trascinamento sì).
- Una volta fatta una nuova azione, quelle annullate non si possono più ripetere. Ogni elenco ricorda le ultime 100 azioni.

## I tag

I **tag** sono etichette colorate che dai a file e cartelle per ritrovarli tutti insieme, ovunque siano. Un elemento può avere più tag. I tag sono gli stessi in tutti i [workspace](#i-workspace).

### Creare un tag

- Tasto destro su un file o una cartella → **Tag → Nuovo tag…**. Si apre **Sistema → Tag**: scrivi il nome e premi **Crea** (o Invio). Il nuovo tag viene messo subito sugli elementi che avevi selezionato.
- Oppure apri direttamente **Sistema → Tag**: scrivi il nome in **Nuovo tag** e premi **Crea**. Poi lo assegni come descritto sotto.

Il nome può avere al massimo 30 caratteri e non può essere uguale a quello di un altro tag (le maiuscole non contano). Puoi avere al massimo 100 tag. Se il nome è vuoto o già usato, lilOS lo dice con un messaggio in basso e non crea nulla. Il nuovo tag prende il primo colore che non stai già usando.

### Assegnare e togliere un tag

Tasto destro su uno o più file o cartelle (sulla scrivania o nel File Manager) → **Tag**. Il sottomenu elenca i tag, ognuno con il suo colore.

- Scegli un tag per metterlo. Se lo scegli di nuovo, lo togli.
- Con più elementi selezionati, un segno di spunta indica un tag che hanno **tutti**. Sceglierlo lo toglie a tutti; se non ce l'hanno tutti, lo mette a tutti.
- I tag compaiono come pallini colorati: in basso a destra dell'icona, sulla scrivania e nel File Manager; dopo il nome, nell'elenco del File Manager. Se sono più di 4 si vede "+" e il numero; passando il mouse sopra si leggono i nomi.
- Le cartelle principali (Documenti, Immagini, Download…) non si possono etichettare.
- Mettere o togliere un tag **non si annulla** con Ctrl Z: se sbagli, ripeti la scelta.

### Colori

In **Sistema → Tag** ogni tag ha il suo riquadro. In **Colore** scegli tra otto colori: rosso, arancione, giallo, verde, verde acqua, blu, viola e grigio. In **Nome** lo rinomini. Le modifiche si vedono subito dappertutto.

### Cercare per tag

In **File Manager**, nella barra a sinistra sotto **Tag**, fai clic su un tag: vedi **tutti gli elementi che lo hanno**, ovunque siano (la tua scrivania e le cartelle condivise). Un file di un altro workspace che non sta nelle cartelle condivise non si vede.

- Nell'elenco vedi Nome, **Posizione** (la cartella in cui sta l'elemento), Tipo e Workspace.
- Puoi cercare per nome, ordinare, aprire, rinominare ed eliminare gli elementi, come in una cartella. Non puoi creare cartelle lì.
- Tasto destro su un elemento → **Mostra nella cartella** apre la cartella dove sta; **Togli il tag «nome»** lo toglie.
- Dalla scheda del tag in Sistema, **Mostra nel File Manager** apre la stessa vista.

### Rendere un tag invisibile

In **Sistema → Tag**, spegni **Visibile** per un tag. Da quel momento **gli elementi che hanno quel tag spariscono ovunque**: dalla scrivania, dal File Manager, dai selettori di file e dal pannello dell'Editor. Non sono eliminati: li ritrovi cliccando il tag nel File Manager (nella barra laterale i tag invisibili hanno un occhio barrato; in basso compare «Tag invisibile: questi elementi sono nascosti altrove»). Accendi di nuovo **Visibile** e gli elementi tornano dove erano, anche sulla scrivania.

- Un elemento che prende un tag invisibile sparisce subito. Se gli togli il tag, ricompare.
- Nel menu **Tag**, accanto ai tag invisibili c'è scritto «(nasconde)»: scegliere un tag così fa sparire l'elemento.
- Se nascondi una cartella, quello che contiene non si vede finché la cartella è nascosta (ma non è nascosto di suo). Lo raggiungi dalla vista del tag della cartella e con **Mostra nella cartella**.
- I file nascosti restano al loro posto: se un file è aperto in una finestra, la finestra continua a funzionare.

### Eliminare un tag

In **Sistema → Tag**, nella scheda del tag, **Elimina…** (due clic, il pulsante diventa rosso al primo). Il tag viene tolto da tutti gli elementi; quelli che erano nascosti ricompaiono. I file e le cartelle non vengono eliminati. **Non si può annullare.**

### Cosa non è ancora possibile

- Annullare con Ctrl Z un tag messo o tolto.
- Una scorciatoia da tastiera per i tag.
- Cercare per tag dal menu di avvio: si cerca solo nel File Manager.
- Avere tag diversi in ogni workspace: sono uguali in tutti.

## L'AppStore

L'**AppStore** è l'app dove si vedono le app e i «moduli del kernel» (le parti di lilOS che stanno dietro le quinte, come la gestione degli utenti) che si possono installare, e da dove un amministratore le installa, le aggiorna e le toglie. Aprilo dal menu di avvio. C'è sempre e non si può rimuovere.

**Chi può fare cosa.** Tutti vedono cosa c'è e cosa è installato. Solo un **amministratore** può installare, aggiornare e rimuovere app, aggiungere o togliere repository e gestire i moduli del kernel. Chi non lo è vede, al posto dei pulsanti, una scritta («Disponibile», «Installata»…) e non ha la scheda **Kernel**.

**Cercare.** In alto c'è una casella di ricerca. Cerca solo nella scheda aperta, e ogni scheda ricorda il suo testo. **Esc** lo cancella.

Sotto la casella ci sono le schede.

### Installati

Le app e i moduli che ci sono, in due gruppi: **App** e **Moduli del kernel**. Ogni elemento è una scheda con icona, nome, versione e descrizione.

### Aggiornamenti

Le novità disponibili, con il loro numero accanto al nome della scheda. Un amministratore, quando sono più di una, trova **Aggiorna tutto**.

### Le categorie

Poi c'è una scheda per ogni categoria che ha almeno un elemento: **Sistema**, **Produttività**, **Multimedia**, **Sviluppo**, **Altro**. Ogni categoria mette insieme ciò che offrono tutti i repository (un *repository* è un indirizzo da cui lilOS prende app; quello ufficiale c'è sempre, gli altri sono segnati «non ufficiale»). Prima vengono gli elementi da installare, poi quelli già installati.

Ogni scheda mostra icona, nome, versione, a cosa serve, il nome del repository e, se serve, l'etichetta «non ufficiale». Accanto c'è un pulsante o una scritta: **Installa**, **Aggiorna**, «Installata» oppure «Da un altro repository» (c'è già un'app con quel nome, arrivata da un altro posto).

**Un clic su una scheda** apre i dettagli: editore, tipo, categoria, se è «Verificata» o «non ufficiale», versione, da dove viene, i permessi che chiede e le istruzioni scritte da chi l'ha fatta (il file README, se c'è). Se il README è molto lungo se ne vede solo l'inizio: **Scarica il README completo** lo salva nella cartella **Download**, da cui si apre con l'Editor. Da lì un amministratore può **Installare**, **Aggiornare**, **Cercare aggiornamenti**, **Reinstallare** (rifà l'installazione della stessa versione, senza cancellare niente) o **Rimuovere**; tutti possono **Aprire**. Le app che non si possono togliere (File Manager, Sistema, AppStore) sono segnate «Necessaria a lilOS».

Il testo delle istruzioni si mostra in forma semplice: niente pagine web incorporate, i collegamenti si aprono in una nuova scheda del browser e solo se sono indirizzi web, e le immagini non si caricano (si vede il loro testo alternativo).

Prima di installare compare una finestra che dice **cosa potrà fare l'app** (per esempio «Leggere e modificare i file in Home/Documenti/Note»). Se l'app non viene dal repository ufficiale e non è firmata da un editore di cui lilOS si fida, c'è anche un avviso: *non si può sapere chi l'ha scritta né che il codice non sia stato modificato*. **Installa comunque** vuol dire accettare questo rischio: fallo solo se ti fidi di chi la distribuisce. Aggiornando, la finestra compare solo se l'app chiede permessi nuovi o non è ufficiale.

### Kernel

Solo per gli amministratori: i moduli del kernel. Sono parti di lilOS: dove stanno gli utenti, dove stanno i file. **Installa** mostra sempre una finestra di conferma, perché il codice di un modulo ha accesso a tutto: utenti e file di tutti. Dopo ogni installazione, aggiornamento o rimozione compare un avviso con il pulsante **Riavvia il kernel**: le modifiche valgono solo dopo. L'avviso compare anche in Installati e Aggiornamenti. Durante il riavvio (qualche secondo) lilOS può non riuscire a salvare e riprova da solo.

- Se il riavvio da qui non è possibile (il kernel non è stato avviato nel modo previsto), compare un messaggio: chi gestisce lilOS deve riavviarlo a mano.
- Un modulo che lascerebbe lilOS senza file system, o senza accesso mentre lilOS è raggiungibile da altri computer, non si installa e non si rimuove: compare il motivo.
- **Rimuovere un modulo non cancella i suoi dati** (per esempio gli utenti): restano sul computer del kernel, e compare «i suoi dati restano».
- **Attenzione**: togliere il modulo di accesso o il file system da un lilOS in uso è pericoloso. Fallo solo sapendo cosa succede.

### Opzioni

Il link **Opzioni**, in basso a destra, apre:

- **Mostra i repository non ufficiali.** Acceso (come di solito), le schede elencano anche ciò che offrono i repository aggiunti. Spento, solo il repository ufficiale. È una preferenza tua.
- **I repository.** L'elenco degli indirizzi da cui lilOS prende app e moduli, con quante app e moduli offre ciascuno, i pacchetti che non sono validi e gli eventuali errori. Quello ufficiale è «Sempre presente». Un amministratore può **rimuovere** un repository (le app già installate restano) e **aggiungerne** uno con **Aggiungi un repository**: l'indirizzo, che deve contenere l'elenco di ciò che offre, e un nome facoltativo. Se un repository non si apre compare «Non raggiungibile» con il motivo (rete, accesso negato…): per un repository privato il computer su cui gira il kernel deve avere l'accesso.
- **Ricarica.** Rilegge i repository.

### Dopo un'installazione

L'app compare subito nel menu di avvio **per chi l'ha installata**. Gli altri utenti, o un'altra scheda del browser già aperta, la vedono solo dopo aver **ricaricato la pagina**.

## App installate

Oltre a File Manager, Editor, Sistema e AppStore, che vengono dal repository ufficiale e fanno parte di lilOS, un amministratore può **installare altre app** dall'[AppStore](#lappstore). Un'app installata c'è per tutti gli utenti e per tutti i workspace: compare nel menu di avvio e si apre in una finestra come le altre.

- **Un'app può preparare le sue cose.** La prima volta che incontri un'app nuova, lilOS può creare per te qualche cartella o file di esempio, un collegamento sulla scrivania del workspace in cui sei, un tag. Non sostituisce mai quello che hai già.
- **Un'app vede solo ciò che le è stato permesso.** Per esempio può leggere e modificare soltanto i file di una cartella precisa. Non può leggere il resto della scrivania né gli altri dati di lilOS. I file che apri con l'app sono sempre accessibili all'app. (File Manager, Editor, Sistema e AppStore sono parte di lilOS e non hanno questo limite.) Questo vale per le app **isolate**, che è come girano di solito: vedi [Isolate e non isolate](#isolate-e-non-isolate).
- **Alcune app lavorano anche senza finestra.** Un'app può avere parti che girano in secondo piano (per esempio per contare le parole delle tue note) e che si avviano da sole quando servono. Si fermano dopo circa 5 minuti senza essere usate. Se un'app deve restare attiva (per esempio perché tiene in memoria qualcosa che ti serve), compare nella barra in basso un'icona con un fulmine: vedi [Le app che restano attive](#le-app-che-restano-attive).
- **Nasconderla in un workspace.** In **Sistema → Workspace → Questo workspace** ogni app ha un interruttore: spento, l'app sparisce dal menu di avvio e da "Apri con" in quel workspace, e le sue finestre si chiudono (se hanno modifiche non salvate ti viene chiesto). L'app resta installata e negli altri workspace non cambia niente. File Manager, Sistema e AppStore non si nascondono.
- **Quando l'amministratore la rimuove**, sparisce da tutti i workspace e le sue finestre si chiudono. Quello che l'app aveva creato per te viene tolto; **quello che hai modificato o riempito va nel Cestino** (compare un messaggio con quanti elementi), così non perdi il tuo lavoro. I dati che l'app teneva per sé (le sue impostazioni) si cancellano.
- **L'Editor è un caso a parte.** Se lo rimuovi, i file di testo non hanno più un'app che li apre finché non lo reinstalli. Attenzione: **torna da solo** quando il kernel viene riavviato (anche solo per installare un modulo), a meno che chi gestisce lilOS non lo tolga dall'elenco delle app da installare all'avvio. Per non vederlo basta nasconderlo nel workspace.

### Proprietà di un'app

Per vedere che cosa è un'app: tasto destro sull'app nel menu di avvio → **Proprietà…** (o tasto destro sul suo collegamento sulla scrivania → **Proprietà…**). La finestra ha tre schede:

| Scheda | Cosa c'è |
| --- | --- |
| **Generale** | Nome, descrizione, versione, l'editore (con «Firma verificata» oppure «Non verificata»), da dove viene, quando è stata installata e aggiornata, e le sue parti: la finestra principale, che si apre quando apri l'app, e le altre (finestre o parti in secondo piano) che avviano il sistema e le altre app |
| **Permessi** | Che cosa l'app può fare, scritto in parole (per esempio «Leggere e modificare i file in Home/Documenti/Note»), com'è stato concesso quando è stata installata |
| **Sicurezza** | Come gira l'app: isolata o no (vedi sotto) |

Una sola finestra di proprietà per app. Se l'app viene rimossa mentre è aperta, si chiude.

### Isolate e non isolate

Un'app installata può girare in due modi.

- **Isolata** (è il modo di lilOS di partenza). L'app è chiusa in una «scatola»: vede solo quello che i suoi permessi le concedono, niente altro di lilOS.
- **Non isolata.** L'app gira dentro la pagina di lilOS: è più veloce, ma **può fare tutto quello che puoi fare tu**, anche quello che i suoi permessi non prevedono (leggere e modificare ogni tuo file, ogni impostazione, e agire come te). Scegli questo modo solo per app di cui ti fidi davvero.

**Solo un amministratore** sceglie come girano le app. Gli altri utenti vedono il modo in uso, senza poterlo cambiare. Ci sono due posti:

- **Sistema → App → Sicurezza.** L'interruttore **Esegui le app isolate** decide per tutte le app. Sotto, l'elenco delle app installate: per ognuna vedi come gira e se il modo è quello di tutte le altre o una scelta solo sua; il pulsante **Proprietà…** apre la sua scheda Sicurezza.
- **Proprietà → Sicurezza** di una singola app, con tre scelte: **Come le altre app** (segue l'interruttore generale), **Isolata**, **Non isolata**.

Il cambio vale **dalla prossima volta che apri l'app**: le finestre già aperte restano come sono (chiudile e riaprile). Le parti in secondo piano dell'app si fermano subito.

Alcune app hanno un solo modo, e la scheda Sicurezza lo spiega:

- **File Manager, Editor, Sistema e AppStore** fanno parte di lilOS e girano sempre dentro lilOS.
- Le **app che sono un sito** (app remote) girano sempre isolate, nel loro sito.
- Le **app scritte per una versione più vecchia** di lilOS girano solo isolate.

### Le app che restano attive

Quando un'app in secondo piano deve restare attiva, nella barra in basso compare un'icona con un **fulmine** (con un numero se sono più di una). Ci passi sopra per vedere il nome; con un clic si apre un menu: per ogni app puoi aprire le sue **Proprietà…** oppure **Ferma**. Fermarla interrompe quello che stava facendo e le fa dimenticare quello che teneva in memoria; si riavvia da sola alla prossima richiesta. L'icona sparisce quando non ce ne sono.

Cosa non è ancora possibile: i widget sulla scrivania non si vedono ancora, e se ripristini la scrivania e i file iniziali un'app non rifà le sue cartelle e i suoi file di esempio.

## Menu contestuale

In **Sistema → Usabilità → Menu contestuale** decidi cosa compare con il tasto destro su un punto vuoto della scrivania.

- L'elenco mostra le voci nell'ordine del menu; quelle dentro **Nuovo** sono rientrate (↳).
- Le frecce **su** e **giù** spostano una voce; la **×** la toglie.
- **Voce**: aggiunge un'azione (Riordina icone, Mostra tutto, Seleziona tutto, Annulla, Ripeti…) o l'apertura di un'app, nel menu principale o dentro Nuovo.
- **Separatore**: aggiunge una linea, nel menu principale o dentro Nuovo.
- **Nuovo elemento in «Nuovo»**: aggiunge una voce che crea un file o una cartella. Scrivi l'etichetta (per esempio "Foglio di stile") e il nome (per esempio `stile.css`). Con **Modello…** scegli un file di lilOS: il nuovo file partirà con il suo contenuto.
- **Ripristina** torna al menu iniziale.

Le voci **Annulla** e **Ripeti** del menu agiscono sempre sulla scrivania. Le modifiche valgono subito. Nel menu, **Nuovo** si apre passandoci sopra con il mouse, oppure con la freccia → (← per tornare indietro).

## Apri con

Quando apri un file e nessuna app è associata al suo tipo (o hai scelto "Chiedi ogni volta", o l'app associata è nascosta nel workspace in cui sei), compare la finestra **Apri con**:

- scegli l'app nell'elenco (frecce su e giù, o clic);
- spunta **Usa sempre quest'app per i file .xxx** per non doverlo più scegliere;
- **Apri** (o Invio, o doppio clic sull'app) apre il file; **Annulla** o Esc chiude.

Se nessuna app visibile può aprire il file, la finestra lo dice.

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

Ogni app ha di solito una sola finestra: avviandola di nuovo torna in primo piano quella già aperta. Un'app installata può avere anche altre finestre (per esempio una per le impostazioni); ognuna è unica allo stesso modo.

La rotella sopra il contenuto di una finestra lo fa scorrere; Ctrl + rotella fa sempre zoom.

## Sistema

Apri **Sistema** dal menu di avvio, dal pulsante con l'ingranaggio in fondo al menu, o dal collegamento sulla scrivania.

A sinistra ci sono le sezioni (nell’elenco la prima intestazione si chiama anch’essa «Sistema»: i percorsi come «Sistema → Usabilità» partono dal nome dell’app, non da quell’intestazione); alcune sono divise in schede, elencate in orizzontale sopra il contenuto. Con il campo **Cerca impostazioni** trovi una voce scrivendone il nome (Esc svuota la ricerca). Puoi anche usare le frecce per passare da una sezione all'altra.

Le modifiche valgono subito e restano salvate.

| Sezione | Scheda | Cosa puoi cambiare |
| --- | --- | --- |
| Aspetto | Colori | Il tema, **Chiaro** o **Scuro** (scrivania, barra, menu e finestre), e il colore principale di lilOS: selezioni, pulsanti, schede attive, logo |
| Aspetto | Movimento | Animazioni attive o spente. Se nel sistema operativo hai chiesto di ridurre il movimento, le animazioni restano ridotte comunque. |
| Scrivania | Elementi | L'elenco degli elementi fissi della scrivania (solo da leggere) e l'allineamento alla griglia degli elementi trascinati |
| Scrivania | Panoramica | Mappa in miniatura visibile o nascosta |
| Workspace | Questo workspace | Nome, colore e app visibili del workspace in cui sei (vedi [I workspace](#i-workspace)) |
| Workspace | Tutti | Passare a un workspace, eliminarlo o crearne uno nuovo |
| Tag | — | Creare, rinominare ed eliminare i tag; il colore, se sono visibili o invisibili, quanti elementi hanno; aprirne gli elementi nel File Manager (vedi [I tag](#i-tag)) |
| Usabilità | Menu contestuale | Le voci del menu del tasto destro sulla scrivania (vedi [Menu contestuale](#menu-contestuale)) |
| Usabilità | Tipi di file | Per ogni estensione (.txt, .md, .png…, e "Senza estensione"), l'app che apre i file di quel tipo, oppure "Chiedi ogni volta". "Ripristina tutti" torna alle app predefinite |
| Usabilità | Cestino | Se chiedere conferma prima di eliminare, se eliminare definitivamente senza passare dal cestino, per quanto tempo il cestino conserva gli elementi; aprire e svuotare il cestino (vedi [Il Cestino](#il-cestino)) |
| Usabilità | Scorciatoie | Le combinazioni di tasti di ogni comando (vedi [Cambiare le scorciatoie](#cambiare-le-scorciatoie)) e, nella sezione Mouse, la combinazione per la selezione a mano libera (Alt, Ctrl + Alt o Alt + Shift) |
| App | Sicurezza | Se le app installate girano isolate o no: una scelta per tutte (la cambia solo un amministratore) e l'elenco di come gira ognuna; il pulsante **Proprietà…** (vedi [Isolate e non isolate](#isolate-e-non-isolate)) |
| Avvio | Opzioni | Se le app scelte si aprono da sole quando entri e se partono i servizi (vedi [Aprire le app all'avvio](#aprire-le-app-allavvio)) |
| Avvio | Servizi | Le parti delle app che lavorano in sottofondo: se sono accese, quando partono, e i pulsanti per accenderle, spegnerle e leggerne il registro (vedi [Servizi in sottofondo](#servizi-in-sottofondo)) |
| Avvio | App | Quali app si aprono da sole, con quale finestra e con quali scelte (cartella, file…) |
| Archiviazione | — | Quanto spazio usano le tue impostazioni e il contenuto dei tuoi file; ripristino di impostazioni, scorciatoie e app dei tipi di file; ripristino della scrivania e dei file iniziali (con i workspace) |
| Informazioni | — | Versione di lilOS, browser, lingua |

I due pulsanti di ripristino chiedono conferma: al primo clic il pulsante diventa rosso, e solo un secondo clic entro pochi secondi esegue l'operazione. **Ripristinare la scrivania e i file iniziali** elimina tutte le cartelle e i file che hai creato, ovunque si trovino, **tutti i workspace** (si riparte da uno solo, Principale), **tutti i tag**, le workarea, le posizioni e la vista salvate, poi ricarica lilOS. Non si può annullare.

### Aprire le app all'avvio

Puoi far aprire da sole alcune app, ogni volta che entri in lilOS. Le trovi in **Sistema → Avvio**.

**Opzioni**

- **Avvia i servizi automaticamente**: l'interruttore dei tuoi servizi in sottofondo (vedi [Servizi in sottofondo](#servizi-in-sottofondo)).
- **Apri le app quando entri**: l'interruttore che le accende tutte o le spegne tutte. Le scelte fatte in **App** restano salvate.
- **Avvio senza app**: se qualcosa non va, aggiungi `?avvio=no` in fondo all'indirizzo di lilOS e ricarica. Per quella volta non si apre nessuna app; compare un avviso. La volta dopo (senza `?avvio=no`) tutto torna come prima.

**App**

1. Premi **Aggiungi…** e scegli un'app dall'elenco. Si apre la sua finestra principale.
2. Se l'app ha più finestre, ogni finestra ha il suo **interruttore**: accendi quelle che vuoi aprire.
3. Sotto ogni finestra accesa compaiono le sue **scelte**, per esempio la cartella da mostrare nel File Manager, il file da aprire nell'Editor, l'immagine in Photo o la sezione di Sistema. Per cartelle e file premi **Scegli…**; la **x** li toglie. Le scelte si salvano da sole, appena le cambi. Un'app che non descrive le sue scelte ha un campo di testo per le impostazioni avanzate: serve solo a chi sa cosa scrivere.
4. **Rimuovi dall'avvio** toglie l'app dall'elenco. Anche se spegni tutte le sue finestre l'app esce dall'elenco.

Le app si aprono nell'ordine dell'elenco, nel workspace in cui sei quando entri. Se un'app è nascosta in quel workspace, o l'hai tolta da lilOS, viene saltata (se l'hai tolta, esce anche dall'elenco). Se il file o la cartella scelti non ci sono più, quella finestra non si apre e un avviso lo dice.

Le app si aprono **solo nella prima scheda** di lilOS di questo browser. Se ne apri una seconda, quella resta vuota. Chiudendo la prima, la scheda successiva che apri riparte da capo e riapre le app.

Le app si aprono dopo che le finestre che avevi lasciato aperte sono tornate; se un'app ha già la sua finestra, la rivedi in primo piano invece di averne due.

### Servizi in sottofondo

Alcune app hanno una parte che lavora in sottofondo, senza finestra, anche quando lilOS è chiuso. Per esempio l'AppStore può controllare se ci sono aggiornamenti. La chiamiamo **servizio**. Li trovi in **Sistema → Avvio → Servizi**.

Per ogni servizio vedi il nome dell'app, se è **Acceso**, **Spento** o **Fermo** (con il motivo), e da quanto. Puoi:

- **Scegliere quando parte**: **Non si avvia**, **All'accesso** (parte quando entri tu) o **All'avvio del sistema** (parte con lilOS, per tutti gli utenti). Quest'ultima la possono scegliere solo gli amministratori. Se la sceglie un amministratore, tu vedi la scelta bloccata.
- **Accendere** o **Spegnere** il servizio subito, e **Riavviarlo** (l'icona con la freccia).
- Aprire il **Registro**, una finestra con le ultime righe che il servizio ha scritto.
- Cambiare le **scelte** del servizio (per esempio ogni quante ore controlla), che compaiono sotto di lui quando parte da solo. Valgono dalla prossima partenza.

In **Opzioni** l'interruttore **Avvia i servizi automaticamente** spegne tutti i tuoi servizi insieme: le scelte restano salvate. I servizi scelti da un amministratore per tutti partono comunque.

Se sposti un servizio acceso da «All'accesso» a «All'avvio del sistema», o al contrario, riparte subito.

I servizi hanno bisogno di un componente del sistema, `services-isolate`. Se manca, la scheda lo dice: si aggiunge dall'AppStore (scheda **Kernel**), e un amministratore deve riavviare il sistema.

**Aggiornamenti dell'AppStore.** In **AppStore → Opzioni** l'interruttore **Controlla gli aggiornamenti all'avvio** accende il servizio dell'AppStore: quando entri, e poi ogni giorno anche a lilOS chiuso, controlla se le app installate hanno una versione nuova. Se ne trova, compare un avviso con il nome dell'app e la versione; per ogni versione ti avvisa una volta sola. L'avviso si vede solo se lilOS è aperto. Se un amministratore ha scelto quel servizio per tutti, l'interruttore è bloccato e si cambia da **Sistema → Avvio → Servizi**.

## Il menu di avvio

Aprilo con il **pulsante del logo** in basso a sinistra oppure con **Ctrl K**.

- Scrivi per cercare un'app per nome. Compaiono le app visibili nel workspace in cui sei.
- Usa le **frecce** per scegliere e **Invio** per avviare, oppure fai clic sull'app.
- **Tasto destro** su un'app: **Apri**, oppure **Proprietà…** (vedi [Proprietà di un'app](#proprietà-di-unapp)).
- **Esc** o di nuovo **Ctrl K** chiudono il menu. Si chiude anche facendo clic fuori.

In fondo al menu trovi il tuo nome e due pulsanti:

- **Sistema** (ingranaggio): apre la finestra di Sistema, con le impostazioni di lilOS.
- **Esci** (simbolo di accensione, se lilOS ha più utenti): chiude la tua sessione e torna alla schermata di accesso (vedi [Accedere e uscire](#accedere-e-uscire)). Se lilOS ha un solo utente il pulsante si chiama **Riavvia sessione** e ricarica lilOS.

App del menu: File Manager, Editor, Sistema, AppStore e le [app installate](#app-installate). File Manager, Sistema e AppStore ci sono in ogni workspace; le altre in quelli dove non le hai nascoste.

## I tuoi dati

lilOS salva da solo, mentre lavori, le cartelle e i file con i loro nomi e il loro contenuto (quando salvi nell'Editor), i tag e quelli che hai messo su file e cartelle, l'ordine e i collegamenti della barra del File Manager (gli stessi in tutti i workspace), la posizione degli elementi sulla scrivania, il punto della scrivania che stavi guardando, le app che si aprono da sole quando entri e le impostazioni. Tutto questo è salvato per ogni [workspace](#i-workspace). Anche le workarea sono salvate. Dopo aver ricaricato la pagina le finestre di ogni workspace si riaprono dove erano, dentro e fuori dalle workarea (quelle di un workspace in cui non sei si riaprono la prima volta che ci vai). Il testo non ancora salvato in una finestra però non si salva da solo: ricaricando la pagina si perde, quindi salva con Ctrl S. Il resto lo ritrovi com'era.

Il salvataggio avviene **nel tuo spazio su lilOS**, non nel browser:

- con un altro browser o un altro computer, dopo aver fatto l'accesso, trovi la stessa scrivania;
- cancellare i dati di navigazione del sito non cancella la tua scrivania (vedi [Accedere e uscire](#accedere-e-uscire) per i dati che il browser aveva prima);
- se lilOS non riesce a salvare, compare un avviso e riprova da solo; non chiudere la pagina finché non compare **Modifiche salvate**;
- un'impostazione o un file cambiato in due schede insieme: vince l'ultima che salva. Usa una scheda sola.

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

Queste sono le combinazioni iniziali. Puoi cambiarle tutte in **Sistema → Usabilità → Scorciatoie** (vedi sotto).

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
| Alt P | Apri o chiudi l'anteprima nel File Manager |
| Alt I | Apri o chiudi le informazioni nel File Manager |

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

Apri **Sistema → Usabilità → Scorciatoie**. Ogni comando mostra le sue combinazioni.

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
Probabilmente è un collegamento a un'app che non c'è più (per esempio i collegamenti a Terminale, Browser, Calendario, Immagini, Musica o Posta delle versioni precedenti, o un'app rimossa dall'amministratore): cancellalo. Le app che ci sono sempre sono File Manager, Sistema e AppStore; le altre le installa un amministratore (vedi [L'AppStore](#lappstore)).

**Un file si apre con l'app sbagliata, o mi chiede ogni volta.**
Cambia l'app in Sistema → Usabilità → Tipi di file, oppure spunta "Usa sempre quest'app" nella finestra Apri con.

**Trascinando lo sfondo la scrivania non si sposta più.**
Il trascinamento con il tasto sinistro ora serve a selezionare. Per spostarti tieni premuto Spazio e trascina, oppure usa il tasto centrale del mouse.

**Perché non posso creare una workarea qui?**
Le workarea aperte non possono sovrapporsi: scegli un punto fuori da ogni area, oppure rimpicciolisci o sposta quella vicina.

**Ho eliminato un elemento per sbaglio. Posso recuperarlo?**
Sì. Di solito è nel **Cestino**: aprilo dal File Manager (barra a sinistra), tasto destro sull'elemento → **Ripristina**. Se l'hai appena eliminato, **Ctrl Z** lo rimette a posto. Se hai scelto di eliminare definitivamente (nelle impostazioni), lo recuperi solo con Ctrl Z e solo finché non ricarichi la pagina. Se l'hai eliminato anche dal cestino, o il cestino l'ha svuotato dopo il periodo impostato, non si può più recuperare.

**Come metto un file in una cartella?**
Trascinalo sulla cartella e rilascia: funziona sulla scrivania, nel File Manager e nell'Editor, anche da una all'altra. Vedi [Spostare](#spostare) e [Spostare con il trascinamento](#spostare-con-il-trascinamento). Con Ctrl Z torna dov'era.

**Trascino un file su una cartella ma non succede niente.**
La cartella non si evidenzia se lì non si può rilasciare: è la cartella in cui il file già si trova, o il file è una cartella e la destinazione è lei stessa o una cartella al suo interno; le cartelle di sistema non si spostano. Sopra una finestra conta solo quello che c'è sotto il puntatore, non la scrivania dietro. Nella vista di un tag e nel Cestino aperto non si rilascia. Con Esc il trascinamento si annulla.

**Posso copiare un file trascinandolo?**
Non ancora: il trascinamento sposta soltanto.

**Un collegamento nella barra del File Manager è sparito.**
Non si vede se l'elemento è nel Cestino o sulla Scrivania di un altro workspace; ricompare, al suo posto, quando l'elemento torna visibile. Se hai più di 80 voci, le più vecchie vengono tolte. Per rimetterlo: trascina l'elemento tra due voci della barra. Il ripristino "Scrivania e file iniziali" (Sistema → Archiviazione) azzera anche la barra.

**Non trovo più i miei elementi o una finestra.**
Controlla di essere nel workspace giusto: il nome è nel pulsante accanto al logo. Poi premi Shift 1 per inquadrare tutto, oppure guarda la mappa in miniatura. Per una finestra, usa il suo pulsante nella barra in basso.

**Dove sono finiti i miei file?**
Se mancano dalla scrivania o dal File Manager, forse hanno un **tag invisibile**: un tag invisibile nasconde ovunque gli elementi che lo hanno. Apri il File Manager, fai clic sul tag nella barra a sinistra (quelli invisibili hanno un occhio barrato) e li trovi lì. Per farli tornare, accendi **Visibile** in Sistema → Tag, oppure togli il tag agli elementi. Se non è questo, prova anche il [Cestino](#il-cestino) e controlla di essere nel workspace giusto.

**Un file di un altro workspace non si vede.**
La cartella Scrivania di ogni workspace è visibile solo da lì. Per condividere un file con gli altri workspace tienilo in Documenti, Immagini o Download. Se hai eliminato il workspace, i suoi file sono in Documenti → Scrivania di *nome*.

**Mancano File Manager, Sistema o l'AppStore, o il menu di avvio non ha app.**
Quelle app arrivano dal repository ufficiale, e il kernel le installa da solo quando parte. Se in quel momento il computer del kernel non riusciva a raggiungerlo (niente rete, accesso negato), lilOS parte senza. Chiedi a chi gestisce lilOS di sistemare l'accesso e di riavviare il kernel: le app compaiono da sole.

**Ho installato un'app ma un altro utente (o un'altra scheda) non la vede.**
Deve ricaricare la pagina.

**Un'app non parte e compare un messaggio.**
L'app è nascosta nel workspace in cui sei. Mostrala in Sistema → Workspace → Questo workspace.

Oppure l'app non è riuscita ad avviarsi: il messaggio dice «*nome* non è partita» e il motivo. Se l'amministratore ha appena cambiato come gira l'app, chiudi la finestra e riaprila.

**Come faccio a sapere se un'app può fare troppo?**
Tasto destro sull'app nel menu di avvio → **Proprietà…**: la scheda **Permessi** elenca cosa può fare, la scheda **Sicurezza** dice se gira isolata. Un'app non isolata può fare tutto quello che puoi fare tu, quindi lasciala così solo se ti fidi di chi l'ha scritta. Solo un amministratore cambia il modo.

**All'apertura compare "Il kernel di lilOS non risponde".**
Il programma che conserva i tuoi dati non è acceso: chiedi a chi gestisce lilOS di avviarlo, poi premi **Riprova**. I tuoi dati non sono persi.

**Compare "Modifiche non salvate".**
lilOS non riesce a raggiungere il suo archivio (il computer ha perso la connessione, o l'archivio è spento). Riprova da solo ogni poco; non chiudere la pagina. Quando ci riesce compare "Modifiche salvate".

**Ho dimenticato la password.**
Non si può recuperare da lilOS: chiedi a chi lo gestisce di cambiartela. Dopo il cambio devi accedere di nuovo ovunque.

**Lo zoom del browser cambia invece della scrivania.**
Non dovrebbe succedere: lilOS intercetta Ctrl + rotella. Se succede, fai clic sulla scrivania e riprova.
