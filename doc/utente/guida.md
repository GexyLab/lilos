# Guida utente

lilOS è un desktop che si usa dal browser o, se preferisci, dal [programma lilOS](#il-programma-lilos), una finestra tutta sua per Windows, macOS e Linux. Al posto di uno schermo fisso c'è una **scrivania infinita**: puoi spostarti in qualsiasi direzione, ingrandire e rimpicciolire, e sistemare cartelle, file e app dove preferisci.

> lilOS è in sviluppo. Le app che ci sono sempre sono **File Manager**, **Pannello di controllo**, **AppStore** e **Pianificazione**; c'è anche l'**Editor**, che si può togliere. Altre app le può installare un amministratore dall'AppStore (vedi [L'AppStore](#lappstore)).

## Lo schermo

- **La scrivania** occupa quasi tutto lo schermo. Lo sfondo a puntini ti aiuta a capire quando ti stai spostando o stai cambiando zoom.
- **Il pannello in basso a destra** mostra una mappa in miniatura della scrivania e i controlli dello zoom.
- **La barra delle applicazioni**, in basso: a sinistra il pulsante con il logo di lilOS, che apre il menu di avvio, e subito dopo il pulsante del [workspace](#i-workspace) (un pallino colorato e il nome; oppure un pulsante per ogni workspace, vedi [Tutti i workspace nella barra](#tutti-i-workspace-nella-barra)); al centro un pulsante per ogni finestra aperta; a destra l'**area di notifica**, la data e l'ora. Passando sopra la data vedi la data completa.
- **L'area di notifica**, nella parte destra della barra delle applicazioni, raccoglie quello che richiede attenzione: il pulsante con la freccia verso il basso quando ci sono [app aggiornate da riavviare](#quando-unapp-viene-aggiornata-altrove), l'icona con il fulmine quando ci sono [app che restano attive](#le-app-che-restano-attive) e, sempre, la campanella delle [notifiche](#le-notifiche), con il numero di quelle da leggere.

## Accedere e uscire

Se lilOS ha più utenti, all'apertura compare **Accedi a lilOS**: scrivi il **nome utente**, premi **Invio** per passare alla **password** e premi **Accedi** (o di nuovo **Invio**). Gli account li crea chi gestisce lilOS: da qui non si può crearne uno. Se lilOS ha un solo utente non c'è nulla da scrivere e si entra direttamente.

La schermata ha due metà: a sinistra il pannello di lilOS, con una **citazione** (da film e scienziati, scelta a caso, che ogni 2 minuti lascia il posto a un'altra; la stessa compare quando lilOS è bloccato, sotto l'ora) e in basso lo **stato della connessione** (pallino verde: il kernel risponde, con il tempo di risposta; rosso: non risponde) e la versione; a destra quello che devi fare. È scura; il pulsante con il sole in alto a destra la fa chiara (e quello con la luna la rifà scura): il browser se lo ricorda per le prossime volte.

- Il pulsante con l'occhio nel campo della password la **mostra** (e la nasconde di nuovo). Se il **Bloc Maiusc** è attivo, sotto la password compare **Bloc Maiusc è attivo**.
- **Resta connesso** (acceso all'inizio): lilOS ti tiene dentro anche dopo aver chiuso il browser, finché la sessione non scade. Spento, la sessione finisce quando chiudi il browser: usalo su un computer che non è solo tuo. Il browser si ricorda la tua scelta.
- **Password dimenticata?** spiega che la password la cambia un amministratore di lilOS: da qui non si può reimpostare.
- Se sbagli la password compare un messaggio sopra i campi. Dopo alcuni tentativi sbagliati (5 con lo stesso nome utente) lilOS ti fa aspettare, e l'attesa si allunga a ogni errore: il pulsante dice **Riprova tra … s** e torna **Accedi** quando puoi riprovare.
- Se compare **Il kernel di lilOS non risponde**, il programma che conserva i tuoi dati non è acceso o non si raggiunge. lilOS riprova da solo (dopo 5, 10, poi ogni 30 secondi) e torna all'accesso appena il kernel risponde; **Riprova ora** non aspetta. Se non riparte, chi gestisce lilOS deve avviarlo.
- Dopo l'accesso la schermata mostra i passi dell'avvio (accesso, licenza, lettura dei tuoi dati, apertura del desktop), spuntati man mano, fino al desktop.
- Il tuo spazio è tuo: ogni utente ha le sue cartelle, i suoi file e le sue impostazioni, e gli altri non li vedono.

**Uscire.** Apri il menu di avvio e premi il pulsante di accensione in alto a destra, **Esci**. Prima le finestre con modifiche non salvate ti chiedono se salvarle; poi lilOS salva quello che stava ancora salvando, cancella dal browser la copia dei tuoi file e torna alla schermata di accesso. Su un computer che non è solo tuo, esci sempre. Se lilOS ha un solo utente il pulsante si chiama **Riavvia sessione**: dopo la stessa domanda delle finestre ricarica la pagina. Puoi uscire anche dalla [pagina utente](#la-pagina-utente).

**La sessione scade.** Per sicurezza, dopo molti giorni (o dopo alcuni giorni senza usare lilOS) devi accedere di nuovo. Se succede mentre lavori compare **Sessione scaduta**: accedi con lo stesso utente e le modifiche che aspettavano vengono salvate. Se provi con un altro utente lilOS non lo accetta.

**Salvare.** lilOS salva da solo, un attimo dopo ogni modifica. Se non riesce (per esempio il computer ha perso la connessione) compare **Modifiche non salvate** e lilOS riprova da solo; quando ci riesce compare **Modifiche salvate**. Finché è così non chiudere la pagina: il browser ti avvisa se ci sono modifiche che non sono ancora arrivate.

### La licenza di lilOS

La prima volta che si entra in un lilOS appena installato compare **Licenza di lilOS**: la licenza d'uso, letta dal [repository ufficiale](https://github.com/GexyLab/lilos-plugins-official/blob/main/LICENSE.md). Si accetta **una volta per tutta l'installazione**, e lo fa un amministratore: leggila, spunta **Ho letto la licenza e la accetto** e premi **Accetta**. Con **Esci** torni alla schermata di accesso.

- Un utente che non è amministratore, finché nessun amministratore l'ha accettata, vede **Licenza di lilOS da accettare** e non entra: chiedi a chi gestisce lilOS, poi premi **Riprova**.
- Se il repository ufficiale non risponde (per esempio senza internet) compare la copia che lilOS porta con sé, e lo dice sotto il testo. Quando il repository torna raggiungibile, se il testo è diverso, la licenza va accettata di nuovo.
- Se la licenza cambia, un amministratore la rivede e la accetta di nuovo al suo prossimo accesso.
- Chi prepara un'installazione con `lilos-install.json` può accettarla nel file (`"acceptLicense": true`, vedi [Installare lilOS già pronto](#installare-lilos-già-pronto-per-chi-amministra)): allora al primo avvio non si chiede.

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
- **File**, con un foglio chiaro e una fascia colorata con l'estensione ritagliata (TXT, PDF, …). Il colore dipende dal tipo di file, vedi [Tipi di file](#tipi-di-file).
- **App**, con un quadrato colorato e il simbolo dell'app ritagliato: sono collegamenti per avviarla.

Al primo avvio trovi alcuni elementi di esempio: la cartella Progetti, il file benvenuto.txt e i collegamenti a Editor e Pannello di controllo (il File Manager è tra gli [elementi fissi](#gli-elementi-fissi)). Se usavi lilOS prima che le app si chiamassero File Manager e Pannello di controllo, sulla scrivania puoi trovare ancora le icone con i vecchi nomi «File», «Impostazioni» o «Sistema»: sono gli stessi collegamenti, puoi rinominarli.

Gli elementi della scrivania sono il contenuto della cartella **Scrivania**: li ritrovi anche nel [File Manager](#il-file-manager).

### Anteprima dei file sulla scrivania

All'inizio i file hanno la loro icona. Se vuoi vedere dentro i file, apri il Pannello di controllo → Scrivania → Elementi → **Icone** e accendi **Mostra l'anteprima dei file**. Le immagini (aperte da Photo) e i file di testo (aperti dall'Editor) mostrano una piccola immagine di quello che contengono al posto dell'icona. Gli altri file, le cartelle e i file cifrati con un'app restano con l'icona; vale anche per i file di cui l'app non riesce a fare l'immagine. L'icona resta finché l'anteprima non è pronta, quindi può servire qualche istante. Con l'interruttore spento tutto torna come prima. Nel File Manager c'è la [vista anteprime](#il-file-manager), che è indipendente da questa impostazione.

### Colore e immagine di sfondo

Puoi cambiare lo sfondo della scrivania con un colore o con un'immagine. Vale per tutti i workspace.

**Il colore.** Apri il Pannello di controllo → Scrivania → **Sfondo**. Nella sezione **Colore** scegli uno dei campioni, oppure **Altro colore** per sceglierne uno qualsiasi. I puntini della scrivania e i nomi degli elementi diventano chiari o scuri da soli, in modo che si leggano. **Usa il colore del tema** (compare solo se hai scelto un colore) torna al colore di prima.

**L'immagine.** Il modo più veloce: tasto destro su un file immagine che sta sulla scrivania → **Usa come sfondo desktop**. La voce c'è solo per un file immagine alla volta (jpg, jpeg, png, gif, webp, avif, bmp, svg), non per altri file né per più elementi selezionati. Oppure, nella sezione **Immagine** della scheda Sfondo, **Scegli…** apre la scelta del file: mostra solo le immagini. Il pulsante **Togli** toglie l'immagine.

- L'immagine è alta esattamente quanto la scrivania e non si deforma: in altezza si vede sempre tutta. Se è più larga dello schermo, le parti in più si tagliano ai due lati; se è più stretta, ai lati si vede il colore della scrivania.
- Sta ferma dietro la scrivania: muovendoti o ingrandendo non si sposta e non cambia misura.
- Sopra un'immagine i nomi degli elementi sono bianchi, con un'ombra, per leggersi su qualsiasi colore.
- Se l'immagine ha parti trasparenti si vede il colore della scrivania.
- Lo sfondo è una **copia** dell'immagine, che lilOS mette nella cartella **Sistema** della Home. È una cartella nascosta: non compare nel File Manager né nella scelta dei file. Se elimini o modifichi l'originale, lo sfondo non cambia.
- In Sistema c'è sempre solo la copia in uso: quando scegli un'altra immagine, o premi **Togli** o **Ripristina**, la copia di prima viene eliminata **per sempre** (non va nel Cestino). Il file originale non si tocca. La copia ha il nome dell'originale.
- La cartella Sistema è condivisa da tutti i workspace e non si può rinominare né eliminare. Per aprirla scrivi `~/Sistema` nel percorso del File Manager. Se elimini la copia (anche solo spostandola nel Cestino), non c'è più nessuno sfondo e ripristinarla dal Cestino **non** lo rimette. Se l'immagine non si apre compare una notifica di errore e lo sfondo resta quello di prima.
- Lo sfondo è lo stesso in tutti i workspace.
- **Ripristina** nel Pannello di controllo → Archiviazione riporta anche colore e immagine a quelli iniziali.
- La scheda **Sfondo** compare solo se la tua versione di lilOS è abbastanza recente.

### Gli elementi fissi

Su ogni scrivania, in ogni workspace, ci sono sei elementi: **Home**, **Documenti**, **Immagini**, **File Manager**, **Download** e **Cestino**. All'inizio ci sono tutti; puoi togliere quelli che non ti servono (vedi sotto). Non sono file della cartella Scrivania, quindi non li trovi nel File Manager.

- **Si aprono** con doppio clic o **Invio**: Home, Documenti, Immagini e Download si aprono nel [File Manager](#il-file-manager), il File Manager si avvia, il Cestino mostra il [Cestino](#il-cestino). Con **Ctrl + doppio clic** le cartelle e il Cestino si aprono in una finestra del File Manager tutta loro.
- **Si spostano** come gli altri elementi, e la posizione resta salvata. Su una scrivania che non li aveva ancora, compaiono nei primi posti liberi.
- **Non si rinominano e non si eliminano.** Con **Canc** o **Elimina** non succede niente, a parte un messaggio che lo spiega. Se hai selezionato anche altri elementi, vengono eliminati solo quelli. Il tasto destro offre **Apri**, **Togli dalla scrivania** ed **Elementi fissi della scrivania…**, che porta al Pannello di controllo.
- **Accettano elementi trascinati.** Su Home, Documenti, Immagini e Download i file e le cartelle si **spostano** lì, come su una cartella qualsiasi. Sul Cestino finiscono nel cestino, con **Ctrl Z** li riprendi. L'icona del Cestino mostra della carta quando dentro c'è qualcosa.

Ogni workspace ha i suoi. Si scelgono nel Pannello di controllo → Workspace, sezione «Elementi fissi», dove ogni elemento ha un interruttore:

- nella scheda **Questo workspace**, o in quella di un altro workspace, l'interruttore vale solo per la scrivania di quel workspace. Spento, l'elemento sparisce da lì; riacceso, torna dove l'avevi lasciato;
- nella scheda **Tutti**, l'interruttore lo accende o lo spegne in tutti i workspace insieme, e anche in quelli che creerai dopo. Se è acceso solo in alcuni, sotto il nome lo dice (per esempio «Acceso in 2 workspace su 3»).

**Togli dalla scrivania**, nel tasto destro, lo toglie solo dal workspace in cui sei. Nel Pannello di controllo → Scrivania → Elementi trovi un pulsante che porta lì.

Se usavi lilOS prima di questa novità, il collegamento al File Manager che avevi già sulla scrivania resta: ora c'è anche l'elemento fisso, e il vecchio collegamento lo puoi eliminare.

### Selezionare

- **Clic** su un elemento per selezionarlo.
- **Ctrl + clic** (o **Shift + clic**) per aggiungere o togliere un elemento dalla selezione.
- **Rettangolo di selezione**: tieni premuto il tasto sinistro su un punto vuoto e trascina. Si selezionano gli elementi che il rettangolo tocca.
- **Selezione a mano libera**: tieni premuto **Alt** e trascina su un punto vuoto. Disegni un percorso chiuso che segue il mouse; si selezionano gli elementi che hanno il centro dentro il percorso. La combinazione si cambia nel Pannello di controllo → Usabilità → Scorciatoie, sezione Mouse.
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

**Doppio clic** oppure **Invio** sugli elementi selezionati. Le cartelle si aprono nel [File Manager](#il-file-manager), nella finestra già aperta se c'è; con **Ctrl + doppio clic** (⌘ + doppio clic sul Mac) si aprono invece in una finestra nuova, così puoi averne più di una affiancate. Vale anche per le cartelle dentro una workarea e per i collegamenti a una cartella. Le app si avviano, i file si aprono con l'app associata al loro tipo (i file di testo e di codice nell'[Editor](#leditor)). Se nessuna app è associata compare la finestra [Apri con](#apri-con).

Un [collegamento sulla scrivania](#collegamenti-sulla-scrivania) apre ciò a cui punta: la cartella nel File Manager, il file con la sua app, la pagina web in NetWave Browser (se c'è) o in una nuova scheda del browser.

Con il tasto destro su un file, **Apri con…** permette di scegliere l'app anche quando ce n'è già una associata. Su un file immagine c'è anche **Usa come sfondo desktop** (vedi [Colore e immagine di sfondo](#colore-e-immagine-di-sfondo)).

### Proprietà

Tasto destro su **un** elemento → **Proprietà…**. Se ne hai selezionati più di uno la voce non compare. Nel File Manager c'è la stessa voce. I nomi delle righe e i valori (tipi, date, «Non trovato»…) seguono la lingua scelta per lilOS.

- **Per una cartella o un file** si apre una piccola finestra, solo da leggere: il tipo, dove si trova, quanto pesa (per una cartella, quanti file e cartelle contiene e la loro dimensione), quando è stato creato e modificato, il workspace, i tag e, per un file, l'app con cui si apre. Se un'app ha segnato l'elemento (per esempio un file cifrato) c'è anche una riga **App** con il suo segno (per esempio «Cifrato con FileCrypt»); se quell'app non è più installata, una riga **Dati di** *nome dell'app* con il pulsante **Rimuovi**. Se l'elemento cambia mentre la finestra è aperta, si aggiorna; se sparisce, la finestra si chiude. Per ogni elemento c'è una sola finestra.
- **Per un collegamento** (vedi [Collegamenti sulla scrivania](#collegamenti-sulla-scrivania)) si apre la stessa finestra, con il **Tipo** (collegamento a un file, a una cartella o a una pagina web), l'**Originale** (dove punta: il percorso, oppure il nome della connessione e il percorso; «Non trovato» se non c'è più) e, se l'ultima volta l'originale non è stato trovato, lo **Stato**: «Rotto: l’originale non è stato trovato l’ultima volta».
- **Per un'app** (un'icona di app sulla scrivania) si aprono le proprietà dell'app, che trovi anche con il tasto destro su un'app nel menu di avvio. Vedi [Proprietà di un'app](#proprietà-di-unapp).

Una **workarea** ha le sue proprietà, con il titolo e la descrizione (vedi [Le workarea](#le-workarea)).

### Creare cartelle e file

Fai clic con il **tasto destro** su un punto vuoto e apri **Nuovo**: scegli **Cartella**, **Workarea** (vedi [Le workarea](#le-workarea)), **Documento di testo**, **Documento Markdown** o **Pagina HTML** (che parte già con lo scheletro di una pagina). L'elemento compare dove hai fatto clic e puoi scriverne subito il nome.

Le voci del menu, anche quelle di **Nuovo**, si cambiano nel Pannello di controllo → Usabilità → [Menu contestuale](#menu-contestuale).

Un file di testo nuovo è vuoto: aprilo nell'Editor per scriverci.

**Collegamento…** (sempre in **Nuovo**) non crea un file: apre la finestra per fare un collegamento a qualcosa che sta altrove (vedi [Collegamenti sulla scrivania](#collegamenti-sulla-scrivania)).

### Collegamenti sulla scrivania

Un collegamento è un'icona della scrivania che apre un file, una cartella o una pagina web che sta altrove. È solo una scorciatoia: eliminarlo non tocca l'originale. L'icona è quella dell'originale con una piccola catena in basso a sinistra; per una pagina web è un globo.

**Farne uno da un file o una cartella.** Tasto destro su un file o una cartella (sulla scrivania o nel File Manager, anche in una cartella di un server della [Rete](#rete)) → **Aggiungi un collegamento al desktop**. Con più elementi selezionati ne fai uno per ciascuno. Lo stesso comando c'è con il tasto destro su una connessione della Rete. Il collegamento compare sulla scrivania del workspace in cui sei e ha il nome dell'originale; compare "Collegamento aggiunto al desktop" e **Ctrl Z** lo toglie. Il collegamento di un collegamento punta all'originale.

**Farne uno scrivendo dove punta.** Tasto destro su un punto vuoto della scrivania → **Nuovo** → **Collegamento…**. Nel File Manager, tasto destro su un punto vuoto → **Nuovo collegamento…** (non dentro le cartelle di un server): il collegamento nasce nella cartella che stai guardando. Si apre la finestra **Nuovo collegamento**:

- **Percorso o indirizzo**: dove punta. Con **Sfoglia…** scegli **Un file…** o **Una cartella…** tra i tuoi.
- **Nome**: se non lo scrivi, lo prende dall'ultima parte del percorso.
- **Crea** (o Invio) fa il collegamento. Prima lilOS controlla che l'originale esista: per un server lo legge dal server (compare "Lo cerco sul server…").

Cosa puoi scrivere:

| Scrivi | Punta a |
| --- | --- |
| `~/Documenti/Note.txt`, `/home/ann/Documenti`, `Documenti/Progetti` | Un file o una cartella tuoi |
| `sftp://ann@server:22/var/www`, `ftp://…`, `ftps://…` | Un file o una cartella di un server |
| `smb://server/condivisione/cartella` | Una cartella o un file di una condivisione di rete |
| `webdav://server/cartella`, `webdavs://server/cartella` | Un server WebDAV (`webdav` è su http, `webdavs` su https) |
| `nfs://…` e altri | Qualunque protocollo che un amministratore ha aggiunto dall'AppStore → Kernel |
| `https://…` o `http://…` | Una pagina web, che si apre in [NetWave Browser](#netwave-browser) se è installato e le pagine web sono disponibili, altrimenti in una nuova scheda del browser |

Regole:

- **Le cartelle si separano sempre con `/`**, anche per SMB e per i percorsi di Windows. Se scrivi `\` compare un messaggio. Un percorso come `C:/…` senza il protocollo davanti non è accettato.
- **Un indirizzo passa da una connessione della Rete.** Se ne hai una per quel server (stesso protocollo, porta e utente, se lo scrivi) e la cartella dell'indirizzo sta dentro la sua, il collegamento passa da lì. Se non ne hai, si apre **Connetti a un server** già compilato: quando sei connesso, il collegamento viene creato.
- **Non scrivere la password nell'indirizzo**: la chiede la connessione.
- Una pagina web con lo stesso indirizzo di una tua connessione WebDAV è considerata quella connessione.

La finestra ti dice quando qualcosa non va: il percorso non esiste, la password è nell'indirizzo, manca il protocollo, nessun modulo di lilOS conosce il protocollo scritto, manca la connessione, il percorso non c'è sul server.

**Aprire.** Doppio clic o Invio. Per un file o una cartella tuoi, il collegamento segue l'originale se lo sposti o lo rinomini. Per un server, lilOS lo cerca cartella per cartella: se la connessione chiede la password o di confermare il server, si apre il File Manager, che te lo chiede e poi apre il collegamento.

**Quando l'originale non c'è più.** Compare un messaggio con il motivo («L’originale è nel cestino: ripristinalo per usare di nuovo il collegamento», «è stato eliminato», «la connessione di rete non c'è più», «il percorso non c'è più sul server»…) e l'icona diventa sbiadita con una croce rossa: il collegamento è **rotto**. Se l'originale torna (lo ripristini dal Cestino, per esempio) e riapri il collegamento, il segno sparisce. Se il server non risponde, compare un messaggio con **Riprova**; in quel caso il collegamento non viene segnato come rotto, perché l'originale potrebbe esserci.

Limiti di oggi:

- L'icona non si accorge da sola che un originale tuo è stato eliminato: resta com'era finché non apri il collegamento.
- Non si può fare un collegamento dentro le cartelle di un server.
- I collegamenti si creano solo a file, cartelle e pagine web, non ad app.

### Rinominare

Seleziona un solo elemento e premi **F2**, oppure tasto destro → **Rinomina**. Il nome viene selezionato senza l'estensione, così puoi riscriverlo senza toccare ".txt".

- **Invio** conferma, **Esc** annulla.
- Facendo clic altrove il nome viene confermato.
- Se esiste già un elemento con lo stesso nome (senza distinguere maiuscole e minuscole), lilOS aggiunge un numero: "Progetti 2", "note 2.txt".

Cambiando l'estensione di un file cambia anche la sua icona.

### Eliminare

Premi **Canc**, oppure tasto destro → **Elimina**.

Di solito lilOS chiede prima conferma con un piccolo menu: scegli "Sposta nel cestino…" oppure "Annulla" (il testo segue la lingua di lilOS). Le cartelle si spostano con tutto il loro contenuto.

Gli elementi eliminati non spariscono subito: vanno nel **Cestino** (vedi [Il Cestino](#il-cestino)), da dove li puoi ripristinare. Con **Ctrl Z** puoi anche annullare l'eliminazione subito (vedi [Annullare e ripetere](#annullare-e-ripetere)).

Puoi cambiare questo comportamento nel **Pannello di controllo → Usabilità → Cestino**: togliere la conferma, oppure eliminare definitivamente senza passare dal cestino. In quel caso l'elemento si recupera solo con Ctrl Z, finché non ricarichi la pagina.

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

- Se una finestra ha modifiche non salvate (per esempio un'immagine ritoccata), lilOS chiede cosa fare. L'Editor no: tiene da parte schede e testo (vedi [Chiudere l'Editor senza perdere niente](#chiudere-leditor-senza-perdere-niente)). Con **Annulla** la workarea resta com'è.
- Le finestre si chiudono, ma lilOS ricorda le app, dove erano e che cosa mostravano (per esempio il file aperto nell'Editor o la cartella aperta nel File Manager). Il testo non salvato di una finestra non viene ricordato: per questo lo chiede prima.
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
- Se hai già personalizzato il menu del tasto destro, la voce **Workarea** in **Nuovo** non viene aggiunta da sola: aggiungila dal Pannello di controllo → Usabilità → Menu contestuale.

## I workspace

Un **workspace** è una scrivania a parte. Ognuno ha i suoi elementi sulla scrivania, le sue finestre aperte, le sue workarea, il punto della scrivania che stavi guardando e le app che mostra. Serve a separare lavori diversi, per esempio "Lavoro" e "Casa": cambiando workspace vedi solo le cose di quel lavoro.

Al primo avvio c'è un solo workspace, **Principale**. Se usavi lilOS prima dei workspace, tutto quello che avevi si trova lì.

### Cambiare workspace

- Fai clic sul **pulsante del workspace** nella barra delle applicazioni, accanto al logo. Il menu mostra l'elenco (con una spunta su quello in cui sei), **Successivo**, **Precedente**, **Nuovo workspace** e **Gestisci i workspace…**.
- Oppure premi **Ctrl Alt →** per il successivo e **Ctrl Alt ←** per il precedente. Funzionano anche mentre scrivi, e solo se hai almeno due workspace.
- Oppure apri il [menu di avvio](#il-menu-di-avvio) e premi il pulsante del workspace in basso. Il menu resta aperto e si aggiorna.

In basso compare per un attimo il nome del workspace in cui sei arrivato.

### Tutti i workspace nella barra

Di solito la barra delle applicazioni mostra solo il workspace in cui sei. Per vederli **tutti in fila**, un pulsante per ognuno (pallino e nome), apri il **Pannello di controllo → Workspace → Tutti** e in **Barra delle applicazioni** scegli **Tutti**; **Solo l'attuale** torna come prima. Si cambia anche dal menu dei workspace: **Mostra tutti i workspace** / **Mostra solo il workspace attuale**.

Con tutti i workspace in fila:

- quello in cui sei è evidenziato, con una linea del colore principale sotto;
- un clic su un altro workspace ti ci porta;
- la freccia dopo l'ultimo, o il clic destro su uno qualsiasi, apre il menu dei workspace;
- passando sopra un pulsante vedi il nome intero e la descrizione.

Se i nomi sono lunghi o i workspace sono tanti, i nomi si accorciano con i puntini: la fila occupa al massimo metà della barra.

Il workspace che lasci resta **esattamente com'era**. Le sue finestre non si chiudono: si nascondono (spariscono anche dalla barra delle applicazioni) e tornano quando ci ritorni, con il testo non ancora salvato. Quello che fai con Ctrl Z riparte da zero in ogni scrivania.

### Cosa è separato e cosa è di tutti

| Cosa | Com'è |
| --- | --- |
| Scrivania (la cartella **Scrivania**) | Separata. Gli altri workspace non la vedono affatto: non compare né nel File Manager, né quando scegli un file o una cartella, né nel pannello dell'Editor |
| Posizione degli elementi, vista, workarea, finestre aperte | Separate |
| App visibili | Separate (vedi sotto): le app si installano per tutti, ogni workspace sceglie quali mostrare |
| Preferite e app e file usati di recente nel menu di avvio | Separati |
| **Documenti**, **Immagini**, **Download**, **Sistema** | Condivise: tutti i workspace vedono gli stessi file |
| Tema, colore principale, scorciatoie, menu del tasto destro, app dei tipi di file | Uguali in tutti i workspace |

Ogni file e cartella ricorda **il workspace che l'ha creato**. Non cambia se lo sposti o lo rinomini. Nel File Manager, in vista elenco, la colonna **Workspace** mostra un pallino con il colore e il nome del workspace; **Condiviso** compare sulle cartelle principali, che non sono di nessuno. In vista a icone, il suggerimento che compare passando sopra un elemento dice «Workspace: …». Fai clic sull'intestazione per ordinare per workspace.

### Le app di ogni workspace

**File Manager**, **Pannello di controllo**, **AppStore** e **Pianificazione** ci sono sempre. Le altre app (anche l'Editor e quelle [installate](#app-installate)) valgono per tutti i workspace, ma ognuno può **nasconderne** alcune, dal Pannello di controllo → Workspace → Questo workspace. Il menu di avvio mostra solo le app visibili nel workspace in cui sei.

- Se avvii un'app che qui è nascosta (per esempio da un collegamento sulla scrivania), compare un messaggio che ti dice dove mostrarla.
- Se apri un file e la sua app è nascosta, compare **Apri con**, che propone solo le app visibili. La scelta dell'app per ogni tipo di file è la stessa in tutti i workspace.
- Se nascondi un'app, le sue finestre in questo workspace si chiudono (se hanno modifiche non salvate ti viene chiesto).

### Creare, rinominare, eliminare

Apri il **Pannello di controllo → Workspace**. Ci sono due schede.

- **Questo workspace**: il **nome** (al massimo 40 caratteri), la **descrizione** (una riga, al massimo 200 caratteri: compare sotto il nome nel [menu di avvio](#il-menu-di-avvio); può restare vuota), il **colore** (è il pallino nella barra delle applicazioni e accanto ai suoi file nel File Manager), quanti file, cartelle e collegamenti ha creato, un interruttore per ogni app (acceso: l'app è visibile) e uno per ogni [elemento fisso](#gli-elementi-fissi) della sua scrivania.
- **una scheda per ogni altro workspace**, con il suo nome: le stesse impostazioni, per cambiarle senza passarci. **Passa a questo** ti ci porta.
- **Tutti**: come mostrare i workspace nella barra delle applicazioni (**Solo l'attuale** o **Tutti**, vedi [sopra](#tutti-i-workspace-nella-barra)), l'elenco dei workspace, con quanti elementi hanno creato e quante app mostrano. **Passa a questo** ti ci porta, **Elimina…** lo elimina, **Crea** ne fa uno nuovo con la scrivania vuota e tutte le app visibili. Puoi averne **al massimo 20**. L'ultimo workspace non si può eliminare. Sotto, gli elementi fissi da accendere o spegnere in tutti i workspace insieme.

Un workspace nuovo si crea anche dal menu del pulsante nella barra delle applicazioni (**Nuovo workspace**) e ti ci porta subito.

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
- Dopo aver ricaricato la pagina le finestre di servizio non tornano, le finestre ingrandite tornano non ingrandite e il Pannello di controllo si riapre sulla prima scheda.

## Il File Manager

**File Manager** mostra le cartelle e il loro contenuto. Aprilo dal menu di avvio o dall'elemento **File Manager** della scrivania, oppure fai doppio clic su una cartella della scrivania: si apre direttamente lì, nella finestra del File Manager già aperta. Con **Ctrl + doppio clic** la cartella si apre in una finestra nuova del File Manager. Dal tasto destro su un punto vuoto della scrivania, **Apri la Scrivania nel File Manager** mostra gli elementi della scrivania come elenco.

- **A sinistra**, la barra laterale. In cima la sezione **Collegamenti**: Home e le cartelle principali (Scrivania, Documenti, Immagini, Download) e i collegamenti che aggiungi tu (vedi [Collegamenti nella barra laterale](#collegamenti-nella-barra-laterale)), nell'ordine che scegli trascinandoli. Sotto, la voce **Tag** con un elemento per ogni tag che hai creato (vedi [I tag](#i-tag)), la sezione **Rete** con le connessioni ai server (vedi [Rete](#rete)) e in fondo il **Cestino** (vedi [Il Cestino](#il-cestino)): queste restano sempre al loro posto. Le sezioni **Collegamenti**, **Tag** e **Rete** si chiudono e si riaprono con il triangolino a sinistra del titolo (per Collegamenti e Tag basta anche un clic sul titolo): le scelte restano anche dopo aver chiuso il File Manager. Le cartelle principali non si possono rinominare né eliminare. **Scrivania** è quella del workspace in cui sei; Documenti, Immagini e Download sono di tutti.
- **In alto**: Indietro, Avanti, Cartella superiore; il percorso (fai clic su una parte per tornarci, o accanto alle cartelle per scriverlo: vedi sotto); **Nuova cartella**; vista **elenco**, **a icone** o **anteprime** (tre pulsanti vicini; l'ultima ha il simbolo di un'immagine); i pulsanti che aprono e chiudono i pannelli Anteprima e Informazioni; la ricerca nella cartella aperta (Esc la svuota).
- **Al centro**: il contenuto della cartella. In vista elenco ci sono le colonne Nome, Modificato, Dimensione, Tipo e Workspace (il workspace che ha creato l'elemento, vedi [I workspace](#i-workspace)): fai clic su un'intestazione per ordinare, di nuovo per invertire l'ordine. Le cartelle restano sempre in cima.
- **A destra**, due pannelli che si aprono e si chiudono: **Informazioni** e **Anteprima** (vedi [Anteprima e Informazioni](#anteprima-e-informazioni)).
- **In basso**: quanti elementi ci sono e quanti sono selezionati, il percorso della cartella o un messaggio.

Quando qualcosa non riesce (un nome che non si può dare, una cartella di sistema da eliminare, una cartella da aprire che non esiste più) il File Manager lo dice in un riquadro sopra la finestra: finché non premi **OK** (o **Invio**, o **Esc**) il resto della finestra aspetta. Se il nome non va, **Riprova** ti fa scrivere di nuovo il nome.

**Scrivere un percorso.** Fai clic sul percorso in alto, in un punto fuori dai nomi delle cartelle, oppure premi **Ctrl L** (la combinazione si cambia nel Pannello di controllo → Usabilità → Scorciatoie): il percorso diventa un campo di testo, per esempio `~/Documenti`. Scrivi la cartella che vuoi e premi **Invio** per andarci; se scrivi il percorso di un file, si apre la cartella che lo contiene con il file selezionato. **Esc** lascia il percorso com'era. Se il percorso non esiste compare un riquadro «Percorso non trovato»: **Riprova** ti rimette nel campo con quello che avevi scritto, per correggerlo; **Annulla** torna al percorso di prima.

Con gli elementi della cartella fai le stesse cose della scrivania: clic, Ctrl + clic, **Shift + clic** per selezionare un intervallo, doppio clic o Invio per aprire, F2 per rinominare, Canc per eliminare (nel cestino: eliminare definitivamente), Ctrl A per selezionare tutto. Dal tasto destro su un punto vuoto puoi creare cartelle e file di testo. **Ctrl Z** annulla quello che hai fatto in questa finestra (vedi [Annullare e ripetere](#annullare-e-ripetere)).

**Vista anteprime.** Mostra gli elementi in riquadri più larghi, con le icone grandi. I file di cui l'app che li apre sa fare un'immagine (le immagini con Photo, i file di testo con l'Editor) mostrano quell'immagine al posto dell'icona; gli altri restano con l'icona. Le anteprime compaiono man mano, mentre scorri, e qualche istante dopo l'apertura della cartella. I file cifrati con un'app non ne hanno. Per cambiare vista puoi anche usare il tasto destro su un punto vuoto, voce **Vista**: spunta quella in uso. Le frecce spostano il cursore come nella vista a icone. La vista scelta resta per la volta dopo.

Tasti per muoversi nell'elenco (non modificabili):

| Tasti | Azione |
| --- | --- |
| Frecce (con Shift per estendere la selezione), Home, Fine | Muoviti tra gli elementi |
| → / ← (vista elenco) | Apri / chiudi la cartella nell'elenco (vedi [Aprire le cartelle nell'elenco](#aprire-le-cartelle-nellelenco)) |
| Backspace o Alt ↑ | Cartella superiore |
| Alt ← / Alt → | Indietro / Avanti |

Quello che fai nel File Manager vale anche per la scrivania, e viceversa: una cartella creata in Scrivania compare subito sulla scrivania.

### Aprire le cartelle nell'elenco

In vista elenco ogni cartella ha un triangolo **›** prima dell'icona. Il triangolo apre la cartella **sul posto**: il suo contenuto compare sotto, un po' più a destra, e puoi aprire anche le cartelle che contiene. Così vedi più livelli insieme, come un albero, senza cambiare cartella.

| Come | Cosa fa |
| --- | --- |
| Clic sul triangolo | Apre o chiude la cartella |
| **Alt** + clic sul triangolo | Apre o chiude la cartella con tutte le sue sottocartelle |
| **→** | Apre la cartella; se è già aperta, va al primo elemento che contiene |
| **←** | Chiude la cartella; su un elemento al suo interno, torna alla cartella che lo contiene |
| Tasto destro su una cartella → **Mostra il contenuto qui** / **Nascondi il contenuto** | Apre o chiude la cartella |
| Tasto destro su una cartella → **Mostra il contenuto con tutte le sottocartelle** | Apre la cartella e tutto quello che contiene |
| Tasto destro su un punto vuoto → **Chiudi tutte le cartelle** | Chiude tutte le cartelle aperte nell'elenco |

Il doppio clic su una cartella la apre come prima, al posto di quella che stai guardando.

- Ogni livello segue l'ordinamento scelto, con le cartelle in cima.
- La ricerca cerca anche nelle cartelle aperte. Una cartella che non corrisponde resta visibile se contiene qualcosa che corrisponde.
- Selezione, trascinamento, rinomina ed eliminazione funzionano anche sugli elementi delle cartelle aperte.
- Se chiudi una cartella con dentro elementi selezionati, la selezione passa alla cartella.
- Nel Cestino e nella vista a icone le cartelle non si aprono sul posto.

### Anteprima e Informazioni

Il File Manager ha due pannelli a destra dell'elenco. Servono per guardare un elemento senza aprirlo. All'inizio **Informazioni** è aperto e **Anteprima** è chiusa.

| Come | Cosa fa |
| --- | --- |
| Pulsante dell'anteprima o **Alt P** | Apre o chiude l'**Anteprima**, accanto all'elenco |
| Pulsante delle informazioni o **Alt I** | Apre o chiude le **Informazioni**, al bordo destro della finestra |
| **×** nell'intestazione del pannello | Chiude il pannello |
| Tasto destro su un elemento → **Informazioni** | Apre le informazioni di quell'elemento (anche nel Cestino) |

Alt P e Alt I si cambiano nel Pannello di controllo → Usabilità → Scorciatoie (vedi [Cambiare le scorciatoie](#cambiare-le-scorciatoie)).

**Anteprima** mostra l'elemento selezionato:

- un **file di testo**: i primi 100.000 caratteri, con una nota se il file è più lungo;
- un'**immagine SVG**: il disegno, senza eseguire eventuali script che contiene;
- una **cartella**: il suo contenuto (le prime 200 voci); con un doppio clic su una voce la apri;
- un **collegamento a un'app**: l'app a cui porta.

Per alcuni tipi di file l'anteprima la prepara l'app che li apre (per esempio mostra un disegno o una pagina al posto del testo). Lo vedi dalla riga **Anteprima creata da…** sotto l'anteprima. Se quell'app non risponde o sbaglia, vedi l'anteprima di sempre.

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
- Una notifica dice dove è andato.
- **Esc** durante il trascinamento annulla.
- Se un elemento è selezionato insieme ad altri, un clic semplice su di esso lascia selezionato solo lui; il trascinamento invece sposta tutta la selezione.
- Se nella cartella di destinazione c'è già un elemento con lo stesso nome, lilOS aggiunge un numero.
- **Ctrl Z** nella finestra del File Manager da cui hai trascinato rimette tutto nelle cartelle d'origine, con i nomi di prima (vedi [Annullare e ripetere](#annullare-e-ripetere)).
- Rilasciando sul **Cestino** (in fondo alla barra a sinistra, al centro o ai bordi) gli elementi vengono eliminati: finiscono nel Cestino e Ctrl Z li rimette. Le cartelle di sistema restano dove sono.
- Rilasciando nel **Cestino aperto** (nel suo elenco) gli elementi vengono eliminati allo stesso modo.
- Gli elementi **del Cestino** si trascinano fuori per ripristinarli dove li lasci (vedi [Il Cestino](#il-cestino)).
- Non si può rilasciare nella vista di un tag. Sui **Tag** della barra a sinistra e nello spazio vuoto sotto il Cestino non succede niente (nessuna linea, nessuna azione).
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

Il **Cestino** raccoglie file e cartelle eliminati, con tutto il loro contenuto. Aprilo da **File Manager**, con la voce **Cestino** in fondo alla barra a sinistra, oppure dal **Pannello di controllo → Usabilità → Cestino** con **Apri il cestino**.

L'elenco mostra, dal più recente: **Nome**, **Eliminato** (data e ora), **Dimensione**, **Tipo** e **Posizione originale**. Fai clic su un'intestazione per ordinare. In basso trovi dopo quanto tempo gli elementi vengono eliminati definitivamente.

- **Ripristinare**: tasto destro su un elemento → **Ripristina**. Torna nella cartella da cui era partito; se quella cartella non esiste più, torna in Home. Se nella cartella c'è già un elemento con lo stesso nome, lilOS aggiunge un numero. Compare un messaggio che dice dove è andato, e con **Ctrl Z** lo rimetti nel cestino.
- **Ripristinare trascinando**: trascina uno o più elementi fuori dal cestino e lasciali su una cartella (della scrivania, della barra a sinistra, di un'altra finestra del File Manager…) o su un punto vuoto della scrivania. Tornano **lì**, non nella cartella da cui erano partiti; sulla scrivania si mettono nel punto in cui li lasci. Una notifica dice dove sono andati e **Ctrl Z** nel Cestino li rimette dentro. Rilasciarli sul Cestino stesso non fa niente.
- **Ripristinare tutto**: tasto destro su un punto vuoto → **Ripristina tutto**.
- **Mettere nel cestino trascinando**: lascia file e cartelle sull'icona del Cestino della scrivania, sulla voce **Cestino** del File Manager o nell'elenco del Cestino aperto. **Ctrl Z** nella vista da cui li hai trascinati li rimette.
- **Eliminare definitivamente**: tasto destro su un elemento → **Elimina definitivamente…**, oppure **Canc**. lilOS chiede sempre conferma, anche se l'hai tolta nelle impostazioni, perché **questa azione non si può annullare**.
- **Svuotare il cestino**: tasto destro su un punto vuoto → **Svuota il cestino…**, oppure il **Pannello di controllo → Usabilità → Cestino → Svuota…**. Anche questa chiede conferma e non si può annullare.
- Gli elementi nel cestino non si aprono e non si rinominano: ripristinali prima.

Cose da sapere:

- Dopo **30 giorni** (se non cambi il periodo) quello che è nel cestino viene eliminato definitivamente. Nel **Pannello di controllo → Usabilità → Cestino → Conserva gli elementi per** scegli da 1 giorno a 1 anno, oppure "Per sempre". La pulizia avviene quando apri lilOS e poi ogni ora.
- Il cestino occupa spazio come gli altri file e **conta nello spazio che hai a disposizione** (vedi [Spazio e limiti dei file](#spazio-e-limiti-dei-file)): se lo spazio è finito, svuotarlo lo libera. Nelle impostazioni vedi quanti elementi contiene e quanto pesano.
- Quello che elimini dalla **Scrivania** di un workspace compare nel cestino solo di quel workspace. Se elimini il workspace, quegli elementi diventano visibili da tutti.
- Ripristinare la scrivania e i file iniziali (Pannello di controllo → Archiviazione) svuota anche il cestino.

## Rete

**Rete** porta in lilOS i file di un altro computer: un server FTP, un sito con SFTP, un Nextcloud o un altro WebDAV, la condivisione di un NAS o di un PC Windows (SMB), il tuo OneDrive o Google Drive, le foto che scegli da Google Foto, un bucket di Amazon S3 o un contenitore di Azure, una cartella NFS e, con il [programma lilOS](#le-cartelle-e-le-chiavette-del-computer-in-rete), le cartelle e le chiavette del tuo computer. Ogni connessione diventa una cartella dentro la cartella **Rete**, e si usa come le altre: la apri, ci guardi dentro, ci crei cartelle, rinomini, elimini e copi file trascinandoli.

Le connessioni sono tue: gli altri utenti di lilOS non le vedono. Il collegamento al server lo fa lilOS sul computer in cui gira, non il tuo browser: un trasferimento continua anche se chiudi la pagina.

Se la sezione **Rete** non c'è nel File Manager, il tuo lilOS non ha ancora i protocolli di rete: chiedi a chi lo amministra.

### Collegarsi a un server

1. Apri il **File Manager**. Nella barra a sinistra c'è la sezione **Rete**; premi il **+** accanto al titolo (**Connetti a un server…**).
2. Scegli il **Protocollo** dall'elenco: sotto compaiono i campi che servono a quel protocollo.
3. Scrivi il **Nome della cartella in Rete**: è il nome che avrà la connessione (al massimo 60 caratteri, diverso da quello delle altre tue connessioni).
4. Compila i campi (vedi sotto). Quando serve, sotto il campo c'è un suggerimento.
5. Scegli se **Ricorda la password** e se **Connetti all'accesso** (la connessione si apre da sola quando entri in lilOS).
6. Premi **Prova** per controllare che il server risponda e che la cartella si legga, senza salvare niente. Poi **Connetti**.

La connessione compare nella barra a sinistra con un pallino che dice com'è: **Connessa**, **Connessione in corso…**, **Non connessa** o **Non si connette** (con il motivo). Puoi avere al massimo 50 connessioni.

| Protocollo | Campi |
| --- | --- |
| **FTP** | **Server**, **Porta** (21), **Utente** (vuoto: accesso anonimo), **Password**, **Cartella remota** (`/`; senza `/` all'inizio è dentro la cartella in cui il server ti mette) |
| **FTPS** (FTP con TLS) | Gli stessi dell'FTP, più **TLS**: **Esplicito (AUTH TLS)** o **Implicito (TLS dall'inizio)**. Con il TLS implicito di solito la porta è la 990 |
| **SFTP** (SSH) | **Server**, **Porta** (22), **Utente**, **Accesso** (**Password** o **Chiave SSH**), poi la **Password** oppure la **Chiave privata** (un file di lilOS, per esempio `id_ed25519`; **Sfoglia…** lo sceglie) con la **Passphrase della chiave** se ne ha una, e la **Cartella remota** |
| **WebDAV** | **Indirizzo** della cartella da aprire, con `https://` (Nextcloud: `…/remote.php/dav/files/<utente>/`), **Utente**, **Password** (per Nextcloud conviene una password per le app) |
| **SMB** (condivisioni Windows e NAS) | **Server**, **Porta** (445), **Condivisione** (**Elenca…** mostra quelle che il server offre), **Accesso** (**Utente e password** oppure **Ospite**), **Dominio o gruppo di lavoro** (`WORKGROUP`), **Utente**, **Password**, **Consenti connessioni non firmate (solo vecchi NAS: meno sicuro)** (lasciala spenta se il tuo server si collega senza), **Cartella dentro la condivisione** |
| **OneDrive** | **Accedi con Microsoft** (l'account, niente password) e, se vuoi, **Cartella di OneDrive**: vedi [OneDrive](#onedrive) |
| **Google Drive**, **Google Foto**, **Amazon S3 e compatibili**, **Azure Blob Storage**, **NFS** | Moduli da installare: vedi [Google Drive, Google Foto, Amazon S3, Azure Blob Storage, NFS](#google-drive-google-foto-amazon-s3-azure-blob-storage-nfs) |

Attenzione alle password: con l'**FTP** semplice e con un indirizzo WebDAV `http://` viaggiano in chiaro sulla rete. Se il server ha FTPS, SFTP o `https://`, usa quelli.

Se lilOS ha più utenti, a collegarsi ai server è il computer su cui gira lilOS, non il tuo: per questo non ci si può collegare a quel computer stesso, e di serie neanche agli indirizzi della sua rete locale (per esempio `192.168.…`, dove di solito sta un NAS). Se provi, compare **Indirizzo non permesso per le connessioni di rete**: un amministratore può aprire questo computer, tutta la rete locale o solo l'indirizzo del vostro NAS dal **Pannello di controllo → Rete** (dalla 1.25.0; prima si faceva nella configurazione). Le stesse regole valgono per il [Terminale](#terminale) e per [NetTest](#nettest).

### Confermare il server

Quando ti colleghi a un server di cui lilOS non si fida ancora, si ferma e ti mostra la sua **impronta** in una finestra **Conferma il server di «nome»**:

- con **SFTP** è l'impronta della chiave del server: compare la prima volta e ogni volta che la chiave cambia;
- con **FTPS** e **WebDAV** `https://` compare solo se il certificato non è valido (fatto da sé, scaduto o per un altro nome).

Se un server di cui ti eri già fidato **cambia chiave o certificato**, la finestra è più severa: ha l'icona dell'errore, il titolo **Il server di «nome» ha CAMBIATO chiave** e mostra l'impronta di prima e quella di adesso. Qualcuno potrebbe fingersi il server: continua solo se sai che l'hanno cambiata apposta.

La finestra parte con **Annulla** come scelta: **Invio** ed **Esc** annullano, per proseguire premi tu **Continua**. Premi **Continua** solo se l'impronta corrisponde a quella del tuo server (te la dà chi lo gestisce). Fino ad allora lilOS **non manda al server né utente né password**. La conferma vale per quel server e quella porta, per te: anche per il **Terminale** (un server SSH confermato per una connessione SFTP non viene richiesto quando apri un terminale verso di lui, e viceversa). Se cambi l'indirizzo o la porta di una connessione, la conferma va rifatta.

### La password

- Con **Ricorda la password**, lilOS la tiene cifrata sul computer in cui gira e non la mostra più.
- Senza, la tiene a mente finché non premi **Disconnetti** o lilOS non si riavvia; poi la chiede di nuovo in una finestra **Password di «nome»**. La chiede anche quando il server dice che quella in uso non è giusta (**Utente o password non giusti**).
- La password salvata vale per quel server e quell'account: se cambi server, porta, indirizzo, utente, dominio, condivisione o tipo di accesso, lilOS la dimentica e te la richiede.
- Per cambiarla, tasto destro sulla connessione → **Modifica connessione…**: i campi della password restano vuoti, e lasciarli vuoti vuol dire «invariata».

### Lavorare nelle cartelle del server

Apri la connessione dalla barra a sinistra o dalla cartella **Rete**: lilOS legge la cartella dal server (**Lettura della cartella dal server…**). Sopra l'elenco una barra dice a cosa sei connesso e ha il pulsante **Disconnetti**.

- Il contenuto di una cartella si legge dal server **quando la apri**. Se qualcuno cambia i file nel frattempo, **riaprila** (esci e rientra) per vedere le novità. Le connessioni **SMB** si aggiornano da sole.
- Il tasto destro su una connessione (nella barra a sinistra) ha **Apri**, **Connetti** o **Disconnetti**, **Modifica connessione…** e **Rimuovi connessione**. **Rimuovi** toglie la cartella da Rete e cancella la password salvata; i file sul server restano dov'erano.
- Le cartelle delle connessioni hanno il simbolo di un globo. I file sul server non hanno miniature (andrebbero scaricati tutti). Nel pannello **Anteprima** si vedono i file fino a 1 MB.
- Aprire un file del server lo scarica; salvarlo lo rimanda al server.
- **Eliminare sul server è definitivo.** Non c'è il cestino e non si annulla: lilOS chiede sempre conferma (**Elimina dal server «nome» (definitivo)**), anche se hai tolto la conferma nelle impostazioni. Fa eccezione OneDrive, che ha un cestino suo (vedi [Eliminare e cartelle condivise su OneDrive](#eliminare-e-cartelle-condivise-su-onedrive)).
- Quello che è nel cestino di lilOS non si può ripristinare dentro una cartella del server.
- I nomi che il server dà e che lilOS ritiene pericolosi (con `..`, caratteri di controllo o simboli che invertono il verso del testo) non compaiono e non si trasferiscono. I collegamenti a cartelle (scorciatoie del server) si vedono ma lilOS non ci entra quando copia, e se li elimini si toglie solo il collegamento. Una cartella può mostrare al massimo 50 000 elementi.
- Se più persone usano lilOS con un accesso, lilOS non si collega a questo computer né a indirizzi speciali (non può essere un server «locale»); la rete di casa o dell'ufficio è permessa, salvo che chi amministra lo vieti.
- Tag, collegamenti alle app e dati delle app non si possono mettere sui file del server.
- Su una connessione SFTP, con i moduli dei terminali remoti attivi, il tasto destro ha **Apri terminale SSH qui**.

### Copiare trascinando

Trascina file e cartelle tra le tue cartelle e una cartella del server (o da un server all'altro): lilOS li **copia**, gli originali restano dove sono. Dentro la stessa connessione, invece, trascinare sposta, come altrove.

La copia la fa lilOS in sottofondo e la mostra nella finestra **Trasferimento dati**. Se una cartella ne contiene altre, vengono copiate tutte; se nella destinazione esiste già una cartella con quel nome, i file ci finiscono dentro.

### La finestra Trasferimento dati

Mostra cosa si sta copiando. Si apre da sola quando una copia da o verso un server dura **più di 5 secondi** (una volta sola per serie di copie: se la chiudi, non si riapre finché non ne parte un'altra serie) e quando devi scegliere cosa fare di un file che esiste già. Altrimenti la apri tu:

- dal pulsante dei trasferimenti nell'area di notifica della barra in basso, che compare finché ci sono trasferimenti da vedere (un anello si riempie man mano e il suo testo riassume lo stato);
- facendo clic sulla notifica di fine trasferimento;
- con il comando **Apri il trasferimento dati** (gruppo **Generale**), a cui puoi dare una combinazione di tasti nel Pannello di controllo → Usabilità → Scorciatoie.

Puoi chiudere la finestra: **i trasferimenti continuano**, anche se chiudi il File Manager o la pagina, e ripartono se lilOS si riavvia.

- In alto vedi quanto è stato **Inviato** e **Ricevuto**, con la velocità.
- C'è una **coda per ogni destinazione** (**Verso «nome»**). Una coda copia un file alla volta; code diverse vanno insieme. Se aggiungi altri file a una destinazione che ha già una coda, vanno in fondo a quella coda.
- Una cartella si apre con la freccia, per vedere i suoi file.
- **Pausa** ferma una coda, **Riprendi** la fa ripartire. Un trasferimento si ferma **solo** con **Annulla**: **Annulla tutto**, **Annulla destinazione**, **Annulla la cartella** o **Annulla questo file**. Chiudere la finestra non ferma niente.
- Se la connessione cade, lilOS riprova per tre volte, aspettando ogni volta un po' di più (e, se il server lo permette, riparte da dove si era fermato). Se non riesce, il file resta nell'elenco con l'errore: **Riprova**, **Riprova tutti** oppure **Togli dall'elenco** / **Chiudi**.
- Quando sostituisci un file su un server, il nuovo viene scritto prima accanto (con il nome `.nome.lilos-part`) e poi scambiato: se fermi tutto a metà, il vecchio resta com'era. La scelta fatta resta valida anche se metti in pausa o lilOS si riavvia.
- Se nella destinazione esiste già un file con quel nome, la coda si ferma e la finestra chiede: **Sostituisci**, **Mantieni entrambi** (il nuovo prende un numero) o **Salta**. Con **Per tutti i conflitti di questa coda** la scelta vale anche per i file successivi.

Quando una coda ha finito arriva una notifica, per esempio **Trasferimento completato: 12 file trasferiti in «NAS» (48 MB).**; se qualcosa è andato storto dice **finito con errori** o **non riuscito**. I file che non sono andati restano nella finestra.

### OneDrive

Con **OneDrive** i file del tuo OneDrive (quello personale, di outlook.com o hotmail.com, oppure quello di lavoro o dell'istituto) diventano una cartella dentro Rete. Non scrivi nessuna password: l'accesso si fa nella finestra di Microsoft, e lilOS non vede mai la tua password di Microsoft.

Se **OneDrive** non è nell'elenco dei protocolli, il tuo lilOS non ce l'ha: chiedi a chi lo amministra. Se c'è ma al posto dei campi compare **OneDrive non è ancora pronto su questo lilOS**, un amministratore deve prima registrare l'app di lilOS su Azure (vedi [La scheda OneDrive](#la-scheda-onedrive-del-pannello-di-controllo)): il pulsante **Apri le impostazioni** porta al Pannello di controllo.

**Collegare il tuo OneDrive.**

1. Nel File Manager premi il **+** accanto a **Rete** e scegli il protocollo **OneDrive**.
2. Premi **Accedi con Microsoft**. Si apre una finestra di Microsoft: scegli l'account (o accedi) e accetta i permessi che chiede. Se il browser blocca la finestra, consenti le finestre a comparsa per lilOS e riprova.
3. Finito l'accesso la finestra si chiude da sola e nel campo compare il tuo account. Per cambiarlo premi **Usa un altro account**. Mentre aspetti, **Annulla** ferma l'attesa; l'accesso non finito scade dopo 10 minuti.
4. Facoltativo: in **Cartella di OneDrive** scrivi una cartella (per esempio `/Lavoro/2026`) per vedere solo quella; vuoto, vedi tutto il tuo OneDrive.
5. Il nome della cartella in Rete è **OneDrive**, finché non ne scrivi un altro. Scegli se **Ricorda l'accesso** (lilOS lo tiene cifrato) e se **Connetti all'accesso**.
6. Premi **Prova** e poi **Connetti**.

L'accesso con la finestra di Microsoft funziona solo se apri lilOS con un indirizzo `https://`, oppure con `http://localhost` (da questo stesso computer): Microsoft non accetta altri indirizzi. Altrimenti il pulsante dà un errore e un amministratore deve aprire lilOS da un indirizzo `https://`.

**Accedere di nuovo.** Senza **Ricorda l'accesso**, lilOS lo tiene a mente fino a **Disconnetti** o al riavvio. Anche con l'accesso ricordato, può servire rifarlo: se hai cambiato la password di Microsoft, hai tolto lilOS dalle app autorizzate, o è passato troppo tempo, Microsoft non lo accetta più. Allora compare la finestra **Accedi di nuovo a «nome»**: premi **Accedi con Microsoft** e rifai l'accesso, **Più tardi** per rimandare. Devi usare lo stesso account della connessione; con un altro lilOS dice **Hai fatto l'accesso come …, ma «nome» è di …**.

**Cosa cambia rispetto agli altri server.**

- Non c'è la conferma del server (l'impronta): la sicurezza la dà il collegamento a Microsoft.
- Aprire un file di OneDrive lo scarica; se il download si ferma riparte da dove era arrivato. Il caricamento di un file, invece, riparte da capo.
- OneDrive non accetta nei nomi `"` `*` `:` `<` `>` `?` `\` `|` e alcuni nomi riservati (come `con`, `nul`, `desktop.ini`, o nomi che iniziano con `~$`). Un blocco appunti di OneNote si apre solo sul web.

### Aprire i documenti Office di OneDrive

Un documento Word, Excel o PowerPoint di OneDrive (`.doc`, `.docx`, `.odt`, `.xls`, `.xlsx`, `.ods`, `.ppt`, `.pptx`, `.odp` e simili) si apre in **Office per il web**, in una nuova scheda del browser: lilOS non lo scarica.

- Tasto destro sul documento → **Apri in Word online**, **Apri in Excel online** o **Apri in PowerPoint online** (secondo il tipo).
- Il **doppio clic** fa lo stesso, a meno che tu abbia scelto un'app di lilOS per quel tipo di file (Pannello di controllo → Usabilità → Tipi di file) o l'abbia spento (vedi [La scheda OneDrive](#la-scheda-onedrive-del-pannello-di-controllo)).
- Per ogni altro elemento di OneDrive (file, cartella) il tasto destro ha **Apri nel browser**: si apre la sua pagina su onedrive.com. Lo stesso fa il pulsante **Apri nel browser** nella barra sopra l'elenco, per la cartella in cui sei.

Quello che cambi in Office si salva su OneDrive da solo. Se la scheda non si apre, controlla che il browser non blocchi le finestre a comparsa.

### Carica su OneDrive e apri

Per modificare in Office per il web un documento Office che sta nella tua Home: tasto destro sul documento → **Carica su OneDrive e apri**. La voce c'è se hai almeno una connessione OneDrive.

1. lilOS **copia** il documento nella cartella di OneDrive scelta nel Pannello di controllo (di serie `/lilOS`; se manca la crea).
2. Apre la copia in Office per il web, in una nuova scheda.
3. Arriva una notifica: **«nome» è su …: quello che cambi in Office si salva lì**.

Cose da sapere:

- **L'originale resta nella Home e non cambia.** Quello che modifichi in Office è nella copia su OneDrive: per riportarlo in lilOS trascinalo da OneDrive nella tua cartella (è una copia, e se c'è già un file con quel nome lilOS ti chiede cosa fare).
- Se hai più connessioni OneDrive e non ne hai scelta una nel Pannello di controllo, compare un menu **Carica su:**. Se non ne hai nessuna: **Prima collega OneDrive (Rete → +)**.
- Se su OneDrive c'è già un file con lo stesso nome, di serie compare la finestra **File già su OneDrive** con **Annulla**, **Tieni entrambi** (il nuovo prende un numero) e **Sostituisci** (quello che era stato cambiato online si perde). Nel Pannello di controllo puoi decidere una volta per tutte.
- Se Microsoft chiede di rifare l'accesso, compare la finestra **Accedi di nuovo**; dopo, rifai **Carica su OneDrive e apri**.

### Eliminare e cartelle condivise su OneDrive

- **Eliminare su OneDrive manda nel cestino di OneDrive**, non nel cestino di lilOS e non per sempre: lilOS chiede conferma (**Elimina da OneDrive «nome» (va nel suo cestino)**) e l'elemento si recupera da onedrive.com, nel suo cestino, finché Microsoft lo tiene. Una cartella va nel cestino intera, con tutto quello che contiene. Dentro lilOS non c'è un modo per ripristinarlo.
- **Cartelle condivise da altri.** L'elenco «Condivisi con me» di Microsoft smette di funzionare a novembre 2026 e non ha sostituti, quindi lilOS non lo usa. Si arriva alle cartelle condivise attraverso i loro collegamenti: su onedrive.com apri **Condivisi**, scegli la cartella e premi **Aggiungi collegamento a I miei file**. Se un amministratore ha acceso **Apri le cartelle condivise con me** (Pannello di controllo → OneDrive), il collegamento compare in OneDrive come una cartella e ci puoi lavorare. Senza quell'impostazione i collegamenti non si vedono.
- Accendere o spegnere **Apri le cartelle condivise con me** cambia i permessi che lilOS chiede a Microsoft: le connessioni OneDrive di tutti si chiudono e chiedono di rifare l'accesso.

### La scheda OneDrive del Pannello di controllo

Nel Pannello di controllo la sezione **OneDrive** (tra **Avvio** e **Archiviazione**) compare solo se il tuo lilOS ha OneDrive. Ha tre parti: l'interruttore **Apri le cartelle condivise con me** (solo un amministratore lo cambia), **Carica su OneDrive e apri** e **Documenti Office**.

**L'app Microsoft** si imposta una volta sola, nella scheda **App Microsoft** del Pannello di controllo, e vale per OneDrive e per Azure Blob Storage (accesso con Microsoft Entra). Le impostazioni le cambia solo un amministratore; gli altri vedono solo se è **Pronta** o **Non ancora impostata**, l'indirizzo di ritorno e i passi. Ogni lilOS usa una propria app registrata su Azure, il servizio di Microsoft per le app: serve un account Azure, anche gratuito. Per registrarla:

1. Su [portal.azure.com](https://portal.azure.com) vai in **Registrazioni app** → **Nuova registrazione**.
2. Scegli i **Tipi di account supportati** (gli stessi di **Account ammessi** nel Pannello di controllo).
3. In **URI di reindirizzamento** scegli la piattaforma **Client pubblico/nativo (dispositivi mobili e desktop)** e scrivi l'**Indirizzo di ritorno** che il Pannello di controllo mostra (con **Copia**): è l'indirizzo di questo lilOS seguito da `/api/net/signin/callback`, per esempio `http://localhost:8790/api/net/signin/callback`. Non scegliere «Web» né «Applicazione a pagina singola».
4. In **Autenticazione** metti **Consenti flussi client pubblici** su **Sì**.
5. In **Autorizzazioni API** → Microsoft Graph, autorizzazioni delegate: `Files.ReadWrite`, `User.Read`, `offline_access` (e `Files.ReadWrite.All` se vuoi le cartelle condivise).
6. Copia l'**ID dell'applicazione (client)** dalla **Panoramica** nel campo omonimo del Pannello di controllo.

Le impostazioni della scheda **App Microsoft**, che valgono subito (compare **Salvato**) e fanno chiudere le connessioni aperte che la usano, che si riaprono da sole al primo uso:

| Impostazione | Cosa è |
| --- | --- |
| **ID dell'applicazione (client)** | L'ID dell'app su Azure |
| **Account ammessi** | **Personali, e di lavoro o dell'istituto**, **Solo di lavoro o dell'istituto**, **Solo personali** o **Solo di un'organizzazione** (con **ID della directory (tenant) o dominio**). Deve corrispondere ai tipi di account scelti su Azure |

Se apri lilOS con un indirizzo che non è `https://` né `localhost`, sotto l'indirizzo di ritorno compare l'avviso che Microsoft non lo accetta: per fare l'accesso apri lilOS in uno dei due modi.

**Apri le cartelle condivise con me** (nella scheda OneDrive) mostra i collegamenti alle cartelle condivise (vedi sopra); chiede un permesso in più: tutti rifanno l'accesso.

**Carica su OneDrive e apri** (le tue scelte): la **Connessione** (**Chiedi ogni volta** o una delle tue), la **Cartella** su OneDrive (di serie `/lilOS`) e **Un file con lo stesso nome**: **Chiedi**, **Tieni entrambi** o **Sostituiscilo**.

**Documenti Office**: l'interruttore **Il doppio clic apre Office online**.

### Google Drive, Google Foto, Amazon S3, Azure Blob Storage, NFS

Questi cinque protocolli sono **moduli del kernel da installare**: un nuovo lilOS non li ha. Google Drive e Google Foto sono un solo modulo (`netfs-google`). Un amministratore li installa dall'**AppStore** (scheda dei moduli del kernel) solo se servono; dal File Manager 1.16.0 l'AppStore li propone anche, come parti facoltative, quando installa o aggiorna il File Manager. Poi compaiono in **Connetti a un server**, dove l'elenco è diviso in **Server**, **Cloud** e **Rete locale**.

| Protocollo | Campi |
| --- | --- |
| **Google Drive** | **Accedi con Google**, **Drive** (vuoto: Il mio Drive; **Elenca…** mostra anche i Drive condivisi della tua organizzazione), **Cartella** (facoltativa) |
| **Google Foto** | **Accedi con Google**: lilOS vede solo le foto che scegli e gli album che crea (vedi sotto) |
| **Amazon S3 e compatibili** | **Fornitore** (AWS, Cloudflare R2, Backblaze B2, Wasabi, MinIO o **Altro servizio compatibile con S3** con il suo **Indirizzo del server**), **Regione** (su AWS la trova da sola; per Backblaze B2 è obbligatoria), **ID della chiave di accesso**, **Chiave di accesso segreta**, **Token di sessione** (solo per credenziali temporanee), **Bucket** (**Elenca…**), **Cartella nel bucket** |
| **Azure Blob Storage** | **Account di archiviazione**, **Accesso**: **Chiave dell'account**, **Token SAS** o **Microsoft Entra (accesso con account)**; **Contenitore** (**Elenca…**), **Cartella nel contenitore**, **Indirizzo personalizzato** (facoltativo: Azurite, cloud nazionali) |
| **NFS (Linux, NAS)** | **Server**, **Versione** (NFSv3; NFSv4.1 si vede ma non si sceglie ancora), **Cartella esportata** (**Elenca…** mostra quelle che il server esporta), **Autenticazione** (**UID e GID dell'amministratore**; **Kerberos** si vede ma non si sceglie ancora), **Porta NFS** (facoltativa) |

Se al posto dei campi compare **… non è ancora pronto su questo lilOS**, un amministratore deve prima impostare il modulo nel Pannello di controllo (il pulsante porta alla scheda giusta).

**Accedere incollando l'indirizzo.** Google (e Microsoft) rimandano la finestra di accesso solo a lilOS aperto con `https://` o da `http://localhost`. Se apri lilOS in un altro modo (per esempio `http://192.168.1.10:8790`), **Accedi con Google** apre la pagina di Google in una **nuova scheda** e sotto il pulsante compare un campo:

1. Nella nuova scheda accedi con il tuo account e accetta i permessi. La prima volta Google può dire che **l'app non è verificata**: è il progetto di chi amministra il tuo lilOS; se ti fidi, prosegui.
2. Alla fine la scheda mostra una pagina che **non si apre** (l'indirizzo comincia con `http://127.0.0.1:53682/`). È normale.
3. Copia **tutto l'indirizzo** di quella pagina dalla barra del browser, incollalo nel campo di lilOS e premi **Continua**. Se incolli l'indirizzo sbagliato, lilOS lo dice e lo richiede.

### Google Drive

- Il Drive diventa una cartella di Rete come le altre; in alto, nella barra, c'è lo spazio usato (**8,2 GB di 15 GB usati**).
- I **documenti Google** (Documenti, Fogli, Presentazioni, Disegni) hanno un'etichetta accanto al nome (**Documento Google**, **Foglio Google**…). Il **doppio clic** li apre su Google in una nuova scheda. Se li **copi fuori da Drive** (in lilOS o su un altro server) diventano file `.docx`, `.xlsx`, `.pptx` (oppure OpenDocument o PDF, come ha scelto l'amministratore); Google li esporta fino a 10 MB. Moduli, Siti e Mappe si aprono solo sul web e non si copiano.
- In una cartella di Drive ci possono essere **due file con lo stesso nome**: in lilOS il secondo si vede come **Preventivo (2).pdf**, con l'etichetta **stesso nome su Drive**. Rinominandolo, il nuovo nome vale anche su Drive. Una `/` nei nomi si vede come `／`.
- **Condivisi con me**, in cima alla connessione (se l'amministratore la lascia attiva), contiene ciò che altri hanno condiviso con te. Lì dentro non si crea, non si rinomina e non si elimina ciò che non è tuo.
- Le **scorciatoie** di Drive si aprono come cartelle.
- **Eliminare** manda nel **cestino di Google Drive** (si recupera da drive.google.com).
- **Apri nel browser** (tasto destro, o nella barra) apre la pagina dell'elemento su Google.

### Google Foto

Dal 2025 Google non lascia più vedere tutta la libreria alle app. Con Google Foto in lilOS si fanno due cose:

- **Importa da Google Foto…** (nella barra della connessione): scegli **Dove copiarle** (di serie `~/Immagini/Google Foto`; **Cambia…** sceglie un'altra cartella), premi **Scegli in una nuova scheda**, seleziona fino a 2000 foto e video nella pagina di Google e premi **Fine**. lilOS dice **N elementi scelti**: premi **Importa** e le copia, originali e con i loro dati, in una cartella con la data e l'ora. La copia va avviata entro un'ora; la segui nella finestra **Trasferimento dati**.
- Gli **album creati da lilOS** sono le cartelle della connessione. Copiando foto e video in un album li carichi nella tua libreria di Google Foto e nell'album. Una nuova cartella è un nuovo album; un album si rinomina.
- Google non permette alle app di eliminare o rinominare le foto, né di eliminare gli album: dal menu una foto si **toglie dall'album** (resta nella tua libreria); un album si elimina da photos.google.com.

### Amazon S3 e Azure Blob Storage

- Il bucket (o il contenitore) è una cartella di Rete. Le cartelle lì non esistono davvero (sono parti dei nomi): una cartella vuota la crea lilOS come un oggetto vuoto.
- **Rinominare** una cartella copia sul server ogni file che contiene e poi elimina l'originale: con molti file ci vuole tempo. Sugli account Azure con spazio dei nomi gerarchico (Data Lake Gen2) è immediato.
- I file grandi vanno a parti; se il trasferimento si interrompe, il download riparte da dove era arrivato, il caricamento da capo.
- I file **archiviati** (Glacier, Deep Archive; livello Archivio di Azure) hanno l'etichetta **archiviato** e si leggono solo dopo averli ripristinati dalla console del fornitore.
- **Eliminare è definitivo** (salvo il versioning del bucket o l'eliminazione temporanea dell'account).
- Con **Microsoft Entra** il tuo account deve avere un ruolo sui dati dell'account di archiviazione (**Collaboratore ai dati dei BLOB di archiviazione**): altrimenti lilOS lo dice.

### NFS

- Con NFS (versione 3) il server non chiede una password: si fida dei numeri **UID** e **GID** che lilOS gli manda. Per questo non li scrivi tu: li assegna un **amministratore** a ogni utente di lilOS (Pannello di controllo → NFS). Se non te li ha ancora assegnati, collegandoti compare **Un amministratore non ti ha ancora assegnato UID e GID per NFS: chiediglielo**.
- Se il server rifiuta il collegamento, sul server va permessa la connessione da porte non privilegiate (**insecure** in `/etc/exports`, **Consenti connessioni da porte non privilegiate** su Synology): chiedi a chi lo gestisce.
- Lettura e scrittura riprendono da dove si erano fermate. In alto c'è lo spazio del disco del server. **Eliminare è definitivo.**

### Le schede Progetto Google, Google Drive, Azure Blob Storage e NFS del Pannello di controllo

Ognuna compare solo se il suo modulo è installato (**Progetto Google** se c'è Google Drive o Google Foto). Le impostazioni le cambia solo un amministratore e valgono per tutti; gli altri vedono se il protocollo è **Pronto** o **Non ancora impostato**.

- **Progetto Google**: il progetto Google Cloud di questo lilOS, uno solo per Google Drive e Google Foto (**ID client**, **Segreto client**: si scrive una volta, poi compare solo **Impostato** e si può sostituire o togliere; **Tipo di client**: **Applicazione web** o **App desktop**, con cui l'accesso è sempre incollando l'indirizzo). Sotto, gli **Indirizzi da registrare** nel progetto Google (con **Copia**) e i passi per creare il progetto.
- **Google Drive**: **Mostra «Condivisi con me»** e **Documenti Google copiati fuori da Drive** (Office, OpenDocument o PDF).
- **Azure Blob Storage**: l'accesso con **Microsoft Entra** usa l'app della scheda **App Microsoft** (la stessa di OneDrive). Con la chiave dell'account o un token SAS non serve niente.
- **NFS**: **UID e GID di ogni utente**, una riga per utente (`mario = 1026:100`, altri gruppi dopo una virgola: `anna = 1027:100,101`), e il tuo nome utente da scrivere nella riga.

### Cosa non è ancora possibile

- Cercare i server in automatico: l'indirizzo lo scrivi tu.
- **SMB** solo nelle versioni 2 e 3 (quelle dei Windows e dei NAS recenti): i server che parlano solo SMB1 (CIFS) non funzionano. Non c'è ancora l'accesso con Kerberos.
- Fermare un trasferimento in un altro modo che con **Annulla**.
- Le cartelle di FTP, SFTP, WebDAV, OneDrive, Google Drive, S3, Azure e NFS non si aggiornano da sole (solo SMB): vanno riaperte.
- Spostare (non copiare) tra le tue cartelle e un server: si copia e poi si elimina a mano.
- **OneDrive**: modificare un documento Office dentro lilOS (si apre in Office per il web, in una scheda del browser); l'elenco «Condivisi con me» di Microsoft (si usano i collegamenti, vedi sopra); un accesso con lilOS aperto da un indirizzo `http://` che non sia `localhost`.
- **Google Drive**: modificare i documenti Google dentro lilOS (si aprono su Google); un caricamento interrotto riparte da capo.
- **Google Foto**: vedere tutta la libreria (Google non lo permette più alle app), eliminare foto o album.
- **Amazon S3** e **Azure**: un link temporaneo per condividere un file; ripristinare dall'archivio i file archiviati.
- **NFS**: la versione 4.1 e l'accesso con Kerberos (arriveranno), i blocchi sui file.
## L'Editor

L'**Editor** apre e modifica i file di testo e di codice (txt, md, js, css, html, json, py e altri). Un amministratore può rimuoverlo dall'[AppStore](#lappstore); chiunque può nasconderlo nel proprio workspace. Si apre facendo doppio clic su un file, dal menu di avvio o con **Ctrl Alt N** per un documento nuovo.

- **A sinistra**, i numeri di riga; la riga su cui si trova il cursore è evidenziata.
- **Colori**: parole chiave, testi, numeri e commenti sono colorati secondo il linguaggio, riconosciuto dall'estensione del file. Puoi cambiarlo dal menu in alto a destra (Testo, Markdown, JavaScript, CSS, HTML, JSON, Python).
- **In alto**: Nuovo documento, Apri un file…, Apri una cartella…, Salva, Trova e sostituisci, Mostra nella cartella (apre il File Manager dove si trova il file); all'estrema destra il pulsante che mostra o nasconde la cartella aperta.
- **In basso**: riga e colonna del cursore, numero di righe, stato del documento (Salvato, Modificato, Nuovo documento).
- **Sopra il testo**: una [scheda](#le-schede-delleditor) per ogni documento aperto.

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
| Ctrl Shift S | Salva con nome |
| Ctrl F | Trova |
| Ctrl H | Trova e sostituisci |
| Ctrl Alt N | Nuovo documento |
| Ctrl O | Apri un file |
| Ctrl Alt O | Apri una cartella |
| Ctrl B | Mostra o nascondi la cartella aperta |
| Tab / Shift Tab | Aggiunge / toglie un rientro di due spazi |
| Invio | Va a capo mantenendo il rientro della riga |
| Ctrl Z | Annulla l'ultima modifica al testo |
| Ctrl Y, Ctrl Shift Z | Ripete quello che hai annullato |
| Esc | Esce dal testo (poi Tab sposta il focus sui pulsanti) |

Ctrl S, Ctrl Shift S, Ctrl F, Ctrl H, Ctrl Alt N, Ctrl O, Ctrl Alt O, Ctrl B e Ctrl Spazio (come le scorciatoie delle schede, qui sotto) si cambiano nel Pannello di controllo → Usabilità → Scorciatoie, sezione Editor.

### Salva con nome

**Ctrl Shift S** apre sopra il testo una barra con il nome del file e la cartella; **Scegli cartella…** cambia la cartella. **Invio** o **Salva** salva, **Esc** o **Annulla** lasciano tutto com'è. Dopo, la scheda mostra il nuovo file. Se nella cartella c'è già un file con quel nome, l'Editor chiede prima se sostituirlo: **il suo contenuto va perso**.

Un documento nuovo, al primo salvataggio, apre la stessa barra. Propone la cartella aperta a destra o, se non ce n'è una, **Documenti**, e il nome "Senza titolo.txt".

### Trova e sostituisci

**Ctrl F** apre una barra sopra il testo; **Ctrl H** apre anche la riga **Sostituisci con**. Se hai selezionato una parola, diventa quella da cercare. Mentre scrivi, i risultati si colorano nel testo e la barra dice «3 di 12» (o «Nessun risultato»).

- **Invio** va al risultato successivo, **Maiusc Invio** al precedente, **Esc** chiude la barra.
- Tre interruttori: **Maiuscole e minuscole**, **Parola intera** ed **Espressione regolare**. Se l'espressione non è valida, la barra lo dice.
- **Sostituisci** cambia il risultato selezionato e passa al successivo. **Sostituisci tutto** li cambia tutti: un solo **Ctrl Z** annulla l'intera sostituzione.

Il titolo della finestra mostra un pallino (•) quando ci sono modifiche non salvate. Se chiudi una scheda con modifiche, l'Editor chiede: **Salva**, **Non salvare** o **Annulla**. Chiudendo la finestra invece non chiede niente: vedi [Chiudere l'Editor senza perdere niente](#chiudere-leditor-senza-perdere-niente).

Se un file aperto viene rinominato o spostato altrove, titolo e percorso si aggiornano; se viene eliminato, il testo resta nell'Editor finché non lo salvi (il salvataggio chiede dove metterlo, come per un documento nuovo).

### Le schede dell'Editor

Ogni documento aperto ha la sua **scheda**, sopra il testo.

- **Nome e stato**: sulla scheda c'è il nome del file. Se ci sono modifiche non salvate compare un pallino; passandoci sopra con il mouse torna la **×** per chiudere. Se due file aperti si chiamano uguale, accanto al nome compare la loro cartella.
- **Nuovo documento**: il pulsante **+** (o **Ctrl Alt N**) crea una scheda "Senza titolo", poi "Senza titolo 2" e così via. Anche un doppio clic nello spazio libero della barra ne crea una.
- **Aprire un file** (con Apri, dal pannello della cartella o dal File Manager) lo apre in una scheda nuova. Se è già aperto, mostra la sua scheda. Un "Senza titolo" vuoto, che non hai mai toccato, lascia il posto al file.
- **Chiudere**: la × della scheda, il clic con il tasto centrale o **Ctrl Alt W**. Se la scheda ha modifiche, l'Editor chiede **Salva**, **Non salvare** o **Annulla**.
- **Riordinare**: trascina una scheda. Se ce ne sono troppe per la larghezza, scorri la barra con la rotellina.
- **Tasto destro** su una scheda: Chiudi, Chiudi le altre, Chiudi quelle a destra, Chiudi quelle salvate, Copia il percorso, Mostra nel File Manager.
- **Da tastiera**, con il focus sulla barra delle schede (vale uguale per le schede del Terminale): le frecce sinistra e destra, **Home** e **Fine** passano da una scheda all'altra e la aprono subito, **Canc** chiude la scheda, il tasto menu (o **Maiusc F10**) apre il menu.

| Tasti | Cosa fanno |
| --- | --- |
| Ctrl Alt W | Chiude la scheda |
| Ctrl Alt Pag giù / Pag su | Scheda successiva / precedente |
| Ctrl Alt T | Riapre l'ultima scheda chiusa |

Si cambiano nel Pannello di controllo → Usabilità → Scorciatoie, sezione Editor.

Annulla e Ripeti (Ctrl Z, Ctrl Y) valgono per la scheda in cui sei e restano separati per ogni scheda, finché la finestra è aperta.

### Chiudere l'Editor senza perdere niente

**Chiudere la finestra dell'Editor non chiede di salvare.** Le schede aperte e il testo non salvato vengono messi da parte (il testo si salva da solo circa un secondo dopo l'ultima modifica, senza toccare il file) e tornano alla prossima apertura dell'Editor. Lo stesso vale quando lilOS chiude e riapre la finestra da solo: cambiando workspace, riaprendo una workarea o dopo un aggiornamento dell'app.

- Se chiudi più finestre dell'Editor, le loro schede si sommano e la prossima finestra nuova le riprende tutte, più l'eventuale file che stai aprendo. Le schede di file che il workspace in cui sei non vede restano da parte per un'altra finestra in quel workspace.
- I file si leggono quando si apre la loro scheda.
- Se il file è **cambiato** mentre l'Editor era chiuso, sopra il testo compare "«nome» è cambiato dopo le tue ultime modifiche non salvate" con due pulsanti: **Tieni la mia versione** e **Usa quella del file**.
- Se il file è stato **eliminato**, la scheda resta con il testo e l'avviso "Il file non esiste più: il testo resta qui finché non lo salvi".
- Se il file non si può leggere (per esempio è cifrato e FileCrypt non c'è), la scheda si apre in sola lettura con l'avviso.
- **Attenzione, chiede comunque** alla chiusura: i file cifrati con FileCrypt (il loro testo non viene mai salvato fuori dal file) e i testi molto lunghi (oltre circa 2 milioni di caratteri). Solo per questi il browser avvisa anche prima di ricaricare la pagina.
- Se un file cifrato viene bloccato di nuovo, si chiudono le sue schede (le altre restano).
- I documenti messi da parte e non riaperti per **90 giorni** vengono cancellati insieme al loro testo.

Per fare come prima, nelle **Impostazioni dell'Editor** → **Generale** → Schede spegni **Riapri schede e modifiche** (è acceso di partenza). Da spento, chiudere chiede per ogni documento con modifiche e non si mette niente da parte.

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
| Schede (scheda **Generale**) | Spegnere **Riapri schede e modifiche**: da spento la chiusura chiede per ogni modifica e non mette niente da parte |
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

## Calcolatrice

La **Calcolatrice** è una semplice calcolatrice da tavolo. Non c'è di serie: un amministratore la installa dall'[AppStore](#lappstore). Si apre dal menu di avvio.

- **Le quattro operazioni** (+, −, ×, ÷). Come su una calcolatrice da tavolo, ogni operazione si esegue appena premi la successiva: 2 + 3 × 4 = dà 20.
- **%** dopo + o − calcola la percentuale del primo numero (200 + 10 % = dà 220); dopo × o ÷ divide il numero per 100 (50 × 10 % = dà 5).
- **x²** e **√x** danno il quadrato e la radice quadrata del numero mostrato.
- **±** cambia il segno, **CE** azzera il numero, **C** azzera tutto e **⌫** cancella l'ultima cifra.
- Premendo di nuovo **=** si ripete l'ultima operazione: 5 + 3 = = dà 11.

Sopra il risultato una riga piccola mostra il calcolo in corso, per esempio `200 + 20`. Il pulsante in alto a sinistra (o **Ctrl C**) copia il risultato negli appunti.

### Tastiera

| Tasto | Cosa fa |
| --- | --- |
| 0-9, `,` o `.` | Cifre e virgola |
| `+` `-` `*` `/` | Operazioni (anche `x` per moltiplicare) |
| Invio o `=` | Risultato |
| `%` | Percentuale |
| `Q` | Quadrato |
| `@` | Radice quadrata |
| F9 | Cambia il segno |
| Backspace | Cancella l'ultima cifra |
| Canc | CE |
| Esc | C |
| Ctrl C | Copia il risultato |

Questi tasti valgono solo nella finestra della Calcolatrice e non si cambiano dal Pannello di controllo.

### Da sapere

- I numeri hanno al massimo 16 cifre; i risultati tengono 15 cifre significative (0,1 + 0,2 dà 0,3). Per numeri molto grandi o molto piccoli compare l'esponente (`1e+21`).
- Dividere per zero, la radice di un numero negativo e un risultato troppo grande mostrano un messaggio. Per ripartire premi una cifra, **C**, **CE** o **⌫**.
- I numeri seguono la lingua del sistema (in italiano 1.234,5).
- Con una versione di lilOS precedente a questa, l'icona della Calcolatrice è un punto di domanda.

## Tastiera a schermo

La **Tastiera a schermo** ti fa scrivere con il mouse o con il dito, senza la tastiera vera. Non c'è di serie: un amministratore la installa dall'[AppStore](#lappstore). Si apre dal menu di avvio, nella scheda Sistema.

È una finestra come le altre: la sposti dalla barra del titolo e si ingrandisce e rimpicciolisce con lo zoom. Ha due particolarità:

- **Non toglie il focus.** Quando tocchi un tasto, le lettere vanno nella finestra in cui stavi scrivendo (il cursore resta lì). Prima di usarla fai clic nel campo dove vuoi scrivere.
- **Sta sempre sopra** le altre finestre.

Nelle app che mostrano un altro sito web (le app remote) i tasti non arrivano: lilOS non può scrivere dentro un sito che non è suo.

### I tasti

- **Lettere, numeri e simboli.** Il tasto scrive il carattere indicato. In piccolo, come su una tastiera vera, vedi il carattere che scrive con Maiusc (in alto a sinistra) e quello con AltGr (in basso a destra, colorato). Con **Maiusc** attivo le etichette cambiano e mostrano quello che il tasto scrive ora. **Bloc Maiusc** cambia solo le lettere.
- **Altri tasti.** Invio, Tab (porta al campo successivo della stessa finestra), Backspace, Spazio, Canc e le frecce fanno quello che farebbero sulla tastiera vera. Le frecce spostano il cursore nei campi di testo; con **Maiusc** premuto selezionano. Su un pulsante, Spazio e Invio lo premono.
- **Riga in basso.** Esc, Ctrl, Alt, il tasto del layout (**IT** o **EN**), Spazio (con il nome del layout), AltGr, Canc e le frecce.
- **Scorciatoie.** Con **Ctrl** premuto: **A** seleziona tutto, **C** copia, **X** taglia, **V** incolla, **Z** annulla, **Y** ripete. Con Ctrl, Backspace e Canc cancellano una parola, e le frecce saltano di parola.
- **Tenere premuto.** Un tasto tenuto premuto si ripete dopo circa mezzo secondo.
- **Tastiera vera.** Se premi un tasto sulla tastiera vera, si illumina anche quello sullo schermo.

### Maiusc, Ctrl, Alt e AltGr

Questi tasti si usano insieme a un altro tasto:

- **Un tocco**: vale per il tasto successivo, poi si spegne da solo.
- **Due tocchi veloci** (a meno di mezzo secondo l'uno dall'altro): il tasto resta **bloccato** e compare un pallino. Un altro tocco lo spegne.

Con **AltGr** attivo i tasti mostrano il loro terzo carattere (per esempio **€** sulla E); quelli che non ne hanno uno mostrano la lettera attenuata.

### Layout italiano e americano

Si cambia con il tasto **IT** / **EN**. La scelta resta salvata. Al primo avvio la tastiera sceglie in base alla lingua del sistema.

- **Italiano.** Invio è alto due righe. Con AltGr: **E** scrive €, **è** scrive [ (con Maiusc {), **+** scrive ] (con Maiusc }), **ò** scrive @, **à** scrive #, **'** scrive ` e **ì** scrive ~.
- **Americano.** Il tasto Alt di destra è un secondo Alt, non AltGr.

### Da sapere

- Con una versione di lilOS precedente a questa, la tastiera mostra un messaggio che chiede di aggiornare lilOS.
- Nelle app isolate (vedi [Isolate e non isolate](#isolate-e-non-isolate)) **Ctrl C**, **Ctrl X** e **Ctrl V** possono non funzionare: il browser le permette solo a un gesto fatto proprio lì.
- **Su** e **Giù** nei campi di testo su più righe si muovono per righe del testo, non per righe come appaiono sullo schermo: se una riga va a capo, il cursore salta alla riga logica precedente o successiva.

## Compress Archive

**Compress Archive** crea ed estrae archivi: **zip, 7z, tar, tar.gz, tar.bz2, tar.xz, iso**, i file compressi singoli **gz, bz2 e xz**, e apre i **rar**. Ha preso il posto dell'app Zip. Non è un'app ufficiale di lilOS: sta nel repository community [lilos-plugins-community](https://github.com/GexyLab/lilos-plugins-community), con i sorgenti aperti a tutti. Per averla, un amministratore aggiunge il repository dall'[AppStore](#lappstore) (**Opzioni** → **Aggiungi un repository**, indirizzo `https://github.com/GexyLab/lilos-plugins-community`) e la installa dalla categoria **Produttività**. All'installazione chiede di poter leggere e modificare i file della tua home, perché deve leggere il contenuto delle cartelle e scrivere l'archivio accanto.

Si usa dal menu del tasto destro, sulla scrivania e nel File Manager, con la voce **Comprimi**:

- **Comprimi → Zip** e **Comprimi → Tar.gz** su file e cartelle che non sono archivi: creano subito l'archivio nella stessa cartella. Con un solo elemento l'archivio prende il suo nome (`Foto` → `Foto.zip`, `nota.txt` → `nota.zip`); con più elementi selezionati si chiama `Archivio.zip` (o `Archivio.tar.gz`). Le cartelle entrano con tutto ciò che contengono, anche le cartelle vuote.
- **Comprimi → Comprimi come…**: una finestra in cui scegli il **formato**, il **nome**, la **compressione** (veloce, normale o massima) e, per lo zip, una **password**. **Gz**, **bz2** e **xz** comprimono un solo file così com'è (`nota.txt` → `nota.txt.gz`): con una cartella o più elementi si spengono, e al loro posto ci sono Tar.gz, Tar.bz2 e Tar.xz. Le scelte vengono ricordate per la volta dopo.
- **Comprimi → Estrai qui** su un archivio (anche più di uno): lo estrae nella stessa cartella. Se l'archivio contiene una sola cartella, ottieni quella cartella; altrimenti una cartella nuova con il nome dell'archivio raccoglie tutto. Un file compresso singolo torna il file che era (`nota.txt.gz` → `nota.txt`). Il formato si riconosce dal contenuto, non dall'estensione.

Un nome già usato prende un numero (`Foto 2.zip`, `Foto 2`): Compress Archive non sovrascrive mai niente. A lavoro finito compare una notifica, per esempio "Creato «Foto.zip» (12 file, 3,4 MB)".

Con il doppio clic su un archivio si apre la finestra di Compress Archive: in alto il nome e il formato (per esempio `RAR 5` o `tar.xz`), sotto il contenuto ad albero con dimensioni e date. Le cartelle si aprono e chiudono con la freccia accanto al nome, la casella **Cerca nell'archivio** mostra solo gli elementi che corrispondono. Puoi **estrarre tutto** con **Estrai qui**, oppure spuntare file e cartelle e scegliere **Estrai gli elementi selezionati**.

### Archivi con password

- Per creare uno zip con password usa **Comprimi come…**, scegli **Zip** e scrivi la password due volte. Lo zip viene cifrato con AES-256: senza la password nessuno può aprirlo, e se la dimentichi non si può recuperare.
- Quando estrai uno zip cifrato, la finestra dell'archivio chiede la password (con **Estrai qui** dal menu si apre da sola). Se è sbagliata te lo dice e puoi riprovare.
- La password serve solo per quell'operazione: non viene mai salvata.
- I file cifrati di un rar o di un 7z non si possono estrarre: restano fuori e la notifica lo dice; gli altri file dell'archivio si estraggono.

### Da sapere

- Per ogni archivio e ogni file estratto vale il limite di lilOS (1 GB di serie; lo cambia un amministratore, vedi [Spazio e limiti dei file](#spazio-e-limiti-dei-file)). Ma Compress Archive lavora tutto in memoria: in tutto non va oltre 256 MB e 10.000 file per volta. Gli archivi e le immagini ISO più grandi restano fuori.
- Gli archivi **rar** si aprono ma non si creano: il formato è proprietario.
- Le compressioni **zstd**, **lz4**, **lzip** e **.Z** vengono riconosciute e la notifica dice che non sono supportate.
- Nello zip le immagini, i video, la musica e gli altri archivi entrano così come sono, senza comprimerli di nuovo: lo sono già.
- Dall'archivio restano fuori, e la notifica lo dice, i collegamenti, i dispositivi, i percorsi pericolosi (`..`) e i file più grandi del limite di lilOS. Le cartelle `__MACOSX` e i file `.DS_Store`, `Thumbs.db` e `desktop.ini` si saltano senza avviso.
- Con una selezione che mescola archivi e altri elementi compare solo **Comprimi come…**.
- Il lavoro si fa nel processo in background dell'app: puoi continuare a usare lilOS mentre comprime o estrae.
- **Chi aveva Zip**: Zip non è più nell'AppStore. Installa Compress Archive, poi disinstalla Zip; le automazioni registrate con Zip vanno registrate di nuovo.
- **Chi l'aveva installata dal repository ufficiale** (dove è stata per poco): continua a funzionare, ma gli aggiornamenti arrivano solo dal repository community. Disinstallala e installala di nuovo da lì.

## Automata

**Automata** registra quello che fai in lilOS e lo rifà quando vuoi, anche su altri file. Lo fai una volta, poi lo fa lilOS: per esempio ridimensionare una foto, salvarne una copia in JPEG e metterla in una cartella, su dieci foto con un clic.

Non c'è di serie: un amministratore la installa dall'[AppStore](#lappstore). All'installazione chiede di poter leggere e modificare i file della tua home, perché salva le automazioni lì e rifà le operazioni sui tuoi file. Serve lilOS 1.17.0 o successivo: con una versione precedente la finestra lo dice e non fa altro.

Ogni operazione registrata è un **passo**. Un'automazione è l'elenco dei suoi passi, che puoi accendere, spegnere, spostare e toglierne.

### Registrare

1. Apri **Automata** dal menu di avvio e premi **Registra nuova**. Oppure, dal tasto destro su uno o più file o su una cartella, scegli **Automazioni → Registra partendo da qui**: quei file diventano ciò su cui l'automazione lavorerà.
2. Compare il **Registratore**, una finestra piccola che sta sempre sopra le altre e non ruba mai la tastiera: continui a lavorare dove sei. Nella barra delle applicazioni, nell'area di notifica, c'è anche **REC**, con un pallino rosso che lampeggia e il numero dei passi; un clic sul pulsante riporta davanti il Registratore.
3. Lavora come sempre. Ogni operazione compare nell'elenco del Registratore. **Pausa** lascia fuori quello che fai finché non premi **Riprendi**.
4. **Ctrl Z** annulla l'ultima azione, come sempre, e toglie anche il suo passo: nell'elenco resta barrato con «annullato con Ctrl Z: tolto». **Ctrl Y** rifà l'azione e rimette il passo.
5. **Fine** crea l'automazione e la apre in Automata; **Scarta** dimentica tutto (chiede conferma). Chiudere il Registratore con dei passi registrati chiede di confermare: la registrazione finisce e i passi si perdono.

L'automazione si chiama «Automazione del» e la data di oggi; rinominala quando vuoi. Si salva nella cartella **Automazioni** della tua home, come file `.automata`. Per aggiungere passi a un'automazione già fatta, aprila e premi **Registra altri passi**: i nuovi passi vanno in fondo.

Se ricarichi la pagina mentre registri, il browser chiede di confermare: ricaricandola la registrazione si perde.

**Cosa registra**

| Dove | Passi che puoi registrare |
| --- | --- |
| lilOS | Crea, Rinomina, Sposta, Copia, Sposta nel Cestino, Ripristina dal Cestino, Elimina definitivamente, Svuota il Cestino, Tag, Apri (un file o una cartella), Apri l'app, Chiudi la finestra, Vai al workspace, Impostazione (un'impostazione cambiata), Sposta sulla scrivania (icone trascinate), Riordina le icone |
| File Manager | Vai a una cartella, Cerca nella cartella, Ordina, Cambia vista |
| Photo | Ridimensiona l'immagine, Ritaglia l'immagine, Converti e salva una copia, Salva l'immagine |
| Editor | Salva il file, Sostituisci tutto nel testo, Salva con nome |
| Terminale | Esegui un comando |
| Compress Archive | Comprimi in un archivio (con formato e compressione), Estrai un archivio |
| FileCrypt | Cifra, Togli la cifratura, Blocca |

Cose da sapere sulla registrazione:

- Più file spostati insieme sono un passo solo («Sposta» di tre elementi). Un'impostazione mossa con un cursore è un passo solo, con l'ultimo valore.
- Quando un'app salva un file nuovo (per esempio Photo con **Converti e salva una copia**), c'è un passo solo: quello dell'app, non anche la creazione del file.
- In File Manager una ricerca si registra quando smetti di scrivere per un secondo, o premi Invio.
- Nel Terminale si registra la riga che hai eseguito, solo se è andata a buon fine, e con la cartella in cui l'hai eseguita. Quello che la riga fa ai file non si registra a parte. Le righe che iniziano con `automata` e quelle più lunghe di 4000 caratteri non si registrano.
- Le **password non si registrano mai**: il passo le chiede ogni volta che gira.
- Non si registrano i clic, i tasti, la posizione delle finestre, i file che stanno nella cartella Automazioni, né quello che Automata stessa apre o chiude.
- Quello che un'app non sa registrare compare nell'elenco **barrato**, con «… non lo rende registrabile», e non entra nell'automazione. Oggi succede con il **pennello** e il **testo** di Photo e con la **scrittura** nell'Editor.

### Modificare i passi

Aprendo un'automazione vedi a sinistra l'elenco delle tue automazioni, al centro i suoi passi, a destra le opzioni del passo selezionato. Ogni modifica si salva da sola, un istante dopo.

- In cima puoi cambiare il **nome** e aggiungere una **descrizione**. Il pulsante con le tre righe ha **Opzioni di avvio…**, **Mostra nel File Manager** e **Sposta nel Cestino** (chiede conferma).
- Davanti a ogni passo ci sono tre comandi: la spunta (**Esegui questo passo**: spenta, l'automazione lo salta), il punto interrogativo (**Chiedi conferma prima**) e la matita (**Chiedi i valori**).
- Con le frecce **su** e **giù** scegli un passo; **Alt** con le frecce lo sposta; **Spazio** lo accende o lo spegne; **Canc** lo toglie, dopo una conferma. Un passo può usare quello che ne ha fatto un altro (per esempio la copia creata prima): se sposti il passo da cui dipende, il collegamento lo segue; se lo togli, o lo metti dopo, compare l'avviso «usa un passo che non viene più prima».
- Un passo di un'app che non è più installata compare con «(app non installata)»: resta nel file, ma non si può eseguire.

**Chiedere conferma.** Prima di eseguire il passo compare cosa sta per fare: **Esegui**, **Salta** o **Ferma tutto**. Alcuni passi la chiedono già da soli: **Elimina definitivamente**, **Svuota il Cestino** e **Togli la cifratura**. Un'eliminazione definitiva non si annulla: lasciala sempre con la conferma.

**Chiedere i valori.** Quando il passo gira, ti domanda i suoi valori e ti mostra quello registrato come proposta. Premendo la matita di un passo, ne fai chiedere i campi che hai **cambiato durante la registrazione** (per esempio la larghezza scelta nella finestra di Photo, non il resto); se non ne hai cambiato nessuno, tutti. Premendola di nuovo torni ai valori registrati. Nelle opzioni del passo puoi decidere campo per campo, e scrivere la tua **Domanda**. Se l'automazione lavora su più file, **Usa per tutti gli elementi rimanenti** risponde una volta per tutti. Le password si chiedono sempre.

**Usare un modello.** Un campo di testo, per esempio il nome di un file, può essere un **Modello** invece di un valore fisso. Dentro puoi mettere:

| Segno | Cosa diventa |
| --- | --- |
| `{nome}` | Il nome del file, senza estensione |
| `{est}` | L'estensione |
| `{data}` | La data di oggi (`2026-11-02`) |
| `{ora}` | L'ora (`15.30`) |
| `{n}` | Il numero dell'elemento: 1, 2, 3… |
| `{cartella}` | Il nome della cartella del file |

Per esempio `{nome}-web.{est}` trasforma `vacanza.jpg` in `vacanza-web.jpg`. Sotto il modello Automata mostra un esempio con un file vero. Se manca l'estensione, il punto finale sparisce. Vanno bene anche i nomi inglesi: `{name}`, `{ext}`, `{date}`, `{time}`, `{folder}`.

**Su quali file lavora.** Un campo che nomina un file o una cartella ti fa scegliere: **Sempre** quel percorso, **L'elemento scelto all'avvio**, la sua cartella, o **Quello che fa** un passo precedente (per esempio la copia appena creata). In **Opzioni di avvio…** scegli su cosa lavora l'automazione: **niente**, **i file scelti all'avvio** (i passi si ripetono per ciascuno) o **una cartella scelta all'avvio**. Se registri senza dirlo, lavora sui primi file che usi in un passo.

**Se il passo non riesce** scegli: **Ferma l'automazione e avvisa**, **Saltalo e continua** o **Chiedimi cosa fare** (Riprova, Salta, Ferma).

### Opzioni di avvio

Da **Opzioni di avvio…** (o dal pulsante **Avvio…** in fondo ai passi) decidi come far partire l'automazione:

- **Nel menu dei file**: compare sotto **Automazioni** nel tasto destro dei file e delle cartelle, sulla scrivania e nel File Manager. Con un elenco di estensioni (`jpg, png`) compare solo per quei file. Vale per le automazioni che lavorano sui file o su una cartella: con una cartella, compare solo se ne selezioni una.
- **Scorciatoia**: premi il pulsante, poi i tasti (devono avere Ctrl o Alt); **Canc** la toglie. Se la combinazione è già usata da un altro comando, Automata lo dice. Una scorciatoia agisce sugli elementi selezionati dove sei: nel File Manager quelli che hai selezionato lì (non nel cestino), sulla scrivania quelli della scrivania. Se non ce ne sono (o la finestra davanti non ha una selezione), l'automazione ti chiede su cosa lavorare. La scorciatoia compare anche in **Pannello di controllo → Usabilità → Scorciatoie**, nel gruppo **Automazioni**.
- **Nome per il Terminale**: il nome da scrivere nel comando `automata` (vedi sotto).

- **Quando parte da sola** e **A un'ora**: vedi [Avvio da sola](#avvio-da-sola).

### Avvio da sola

Un'automazione può partire senza che tu faccia niente. In **Opzioni di avvio…**, nella sezione **Quando parte da sola**, aggiungi uno o più motivi (al massimo 10); li togli col pulsante **Togli**. Sull'automazione compare un'etichetta per ciascuno.

| Motivo | Quando parte |
| --- | --- |
| **Quando entro** | Quando accedi a lilOS. |
| **Quando arrivano file in una cartella** | Quando un file viene creato, spostato o copiato in quella cartella (non nelle sue sottocartelle). Se hai indicato delle estensioni, contano solo quelle. I file arrivati insieme fanno una sola esecuzione, e sono i file su cui lavora. |

**A un'ora** o ogni tanti minuti la fa partire la [Pianificazione](#pianificazione): nella sezione **A un'ora**, **Pianifica…** apre la Pianificazione su una nuova operazione per questa automazione, e sotto compaiono quelle che ha già, con la prossima volta e **Cambia in Pianificazione**. Valgono le regole della Pianificazione (giorni, orari, ogni tot minuti, mesi, fusi orari…) e l'operazione parte anche se lilOS era chiuso, appena lo apri. Le partenze «A un'ora» e «Ogni tot minuti» fatte con Automata fino alla 1.1.0 passano da sole in Pianificazione (con lilOS 1.22.0 e Automata 1.2.0), e una notifica lo dice.

Da sapere:

- **Quando entro** e **Quando arrivano file** partono solo mentre lilOS è aperto in una scheda del browser. Con più schede aperte con lo stesso utente, se ne occupa una sola; se la chiudi, ne prende il posto un'altra.
- **A un'ora** e **Quando entro** non hanno file con cui lavorare: imposta **Su cosa lavora** su **niente** (Automata lo dice). **Quando arrivano file** funziona con niente, con i file o con una cartella (in quel caso lavora sulla cartella osservata).
- **Se non c'è nessuno a rispondere**: un'automazione che chiede qualcosa (una conferma, un valore, cosa fare se un passo non riesce) si apre nella finestra **In esecuzione** di Automata, e tocca a te rispondere. Le altre girano in silenzio. Per **Quando entro** e **Quando arrivano file** una notifica dice com'è andata; per quelle della Pianificazione l'esito è nel suo **Storico** (e una notifica se non è riuscita, come scegli nell'operazione).
- Non parte se Automata non è installata, né se è già in esecuzione.
- Quello che fa un'automazione non fa partire altre automazioni da una cartella, e nemmeno i file messi nella cartella **Automazioni** (così non si innescano a catena).
- Un'automazione che cancella o sposta file, partendo da sola, lo fa senza che tu la guardi: provala prima a mano su copie.

### Eseguire

Premi **Esegui** in cima ai passi, oppure scegli l'automazione dal menu **Automazioni**, con la sua scorciatoia o dal Terminale. Si apre la finestra **In esecuzione**: se l'automazione lavora su file e non gliene hai dato nessuno, te li chiede. Quando un passo vuole **più file**, la finestra ti mostra l'elenco: **Aggiungi un file** e **Aggiungi una cartella** li aggiungono, **Togli** ne toglie uno. Serve almeno un elemento. Poi elenca i passi e a ognuno mette una spunta quando ha finito; le domande e le conferme compaiono lì dentro.

- **Pausa** aspetta prima del passo successivo; **Ferma** interrompe l'automazione. A lavoro finito il pulsante diventa **Chiudi**.
- Chiudere la finestra mentre gira la ferma.
- Alla fine una notifica dice com'è andata, o perché si è fermata.
- In Automata, **Esegui da qui** parte dal passo selezionato e **Solo questo passo** esegue quello e basta. Occhio: quello che i passi saltati avrebbero fatto (per esempio una copia che un passo successivo usa) non c'è.
- Mentre un'automazione gira, quello che fa non viene registrato.

Prima di lanciare un'automazione che sposta, rinomina o elimina, provala su copie dei tuoi file.

### Dal Terminale

Nell'app Terminale (se è installata) c'è il comando `automata`:

```
automata list
automata run <nome> [file…] [--campo=valore…] [--yes]
```

- `automata list` elenca le automazioni: il nome per il Terminale (`-` se non ne hanno), il nome e, per quelle che lavorano su file, una nota tra parentesi.
- `<nome>` è il nome per il Terminale, il nome dell'automazione o il percorso del suo file `.automata`. I file si scrivono dopo il nome, partendo dalla cartella in cui sei.
- Se l'automazione chiede conferme o valori, senza `--yes` si apre in Automata e il Terminale lo dice. Con `--yes` gira nel Terminale: le conferme sono date e quello che il passo chiederebbe prende il valore registrato.
- `--campo=valore` risponde in anticipo a un valore, per esempio `--width=1200`. Il nome del campo è quello interno del passo (`width` per la larghezza in Photo, `name` per un nome, `query` per una ricerca…).
- Un passo che chiede una password non può girare senza che tu la dia: con `--yes` fallisce, a meno che tu non la scriva nella riga (`--password=…`). Attenzione: la riga resta nella cronologia del Terminale, tranne se inizia con uno spazio.
- Se l'automazione lavora su file o su una cartella, vanno scritti dopo il nome: altrimenti il comando lo dice.

```
automata run web ~/Immagini/vacanza.jpg --width=1200 --yes
```

### Da sapere

- Le automazioni sono file `.automata` (testo): si copiano, si spostano e si condividono come gli altri file. Automata le trova ovunque nella tua home (non nelle cartelle di rete); l'elenco si aggiorna da solo.
- Un file indicato con «Sempre …» si ritrova anche se l'hai spostato; se non c'è più, Automata prova con il percorso che aveva.
- Un'automazione eseguita cambia davvero file e impostazioni: non c'è un «annulla» unico per tutto.
- Mancano ancora la registrazione di quello che si disegna in Photo e di quello che si scrive nell'Editor. Non ci sono condizioni né cicli: i passi vanno in fila.

## Terminale

**Terminale** è la finestra dei comandi di lilOS. Ogni shell è una **scheda**: il pulsante **+** ne apre un'altra, nella stessa cartella. Le schede si possono anche affiancare in più riquadri e staccare in finestre nuove ([Riquadri e finestre](#riquadri-e-finestre-del-terminale)). Con lo stesso Terminale ti colleghi anche al terminale di un altro computer: **SSH** (cifrato, il più usato), **Telnet**, **rlogin** e **SUPDUP** (i protocolli di router, vecchi sistemi Unix e dei calcolatori storici del MIT). Le sessioni remote hanno ciascuna la loro scheda; la shell di lilOS resta com'era.

Terminale è un'app di sistema, c'è già. Per i collegamenti remoti servono però i moduli dei protocolli che vuoi usare (`ssh`, lo stesso di SFTP nella Rete, `term-telnet`, `term-rlogin`, `term-supdup`). Dal Terminale 1.6.0 l'AppStore li propone come parti facoltative quando un amministratore installa o aggiorna il Terminale ([Installare un'app con ciò che le serve](#installare-unapp-con-ciò-che-le-serve)); si installano anche in ogni momento dall'[AppStore](#lappstore), nella scheda **Kernel**. Senza nessun modulo il Terminale lo dice e non può collegarsi a niente. L'app chiede di poter aprire terminali remoti, di leggere e scrivere i file della tua home (per le chiavi private e per le registrazioni), di aggiungere voci ai menu e, dal Terminale 1.5.0, di lavorare in sottofondo (per i comandi della [Pianificazione](#pianificazione)).

Il collegamento al server lo fa lilOS sul computer in cui gira, non il tuo browser. Per questo le sessioni remote restano aperte anche se chiudi la finestra o ricarichi la pagina.

Prima c'era un'app a parte, **Terminale remoto**: ora è dentro il Terminale e non è più nell'AppStore. Se l'avevi installata puoi disinstallarla. I tuoi host e le sessioni ancora aperte non si perdono: li trovi qui.

### Sessioni remote nel Terminale

Scrivi il comando nella shell. La sessione si apre in una **scheda nuova** e la shell scrive «Aperta in una scheda nuova: …».

- `ssh utente@server -p 2222`, `telnet 192.168.1.1 23`, `rlogin -l utente server`, `supdup its.example`. Va bene anche un indirizzo come `ssh://utente@server`.
- Al posto dell'indirizzo puoi scrivere il nome di un host salvato: `ssh web-01`.
- `sessions` elenca le sessioni remote ancora aperte su lilOS. `sessions 2` mostra la numero 2 in una scheda.

### Host salvati

Il pulsante a sinistra delle schede apre la barra laterale.

- **Host.** Le connessioni che usi di più, anche in cartelle. Un clic su un host lo apre in una nuova scheda. Il tasto destro dà **Connetti** e **Modifica l'host**. Il **+** apre la finestra del nuovo host, con i campi del protocollo scelto, **Ricorda password e passphrase** e, in **Avanzate**, il tipo di terminale, la codifica dei caratteri (UTF-8, ISO-8859-1, ISO-8859-15, CP437) e il tasto Backspace. Gli host sono tuoi: gli altri utenti non li vedono.
- **Ancora attive.** Le sessioni che girano ma non sono in questa finestra, ognuna con **Riprendi**.

### La password

Con **Ricorda password e passphrase** la password si salva cifrata e la pagina non la rivede più. Se non la salvi, la chiede il server nel terminale stesso, come fa `ssh`: la scrivi lì (non si vede mentre digiti) e premi Invio. **Ctrl C** rinuncia. Per SSH puoi anche entrare con una chiave privata: è un file di lilOS, per esempio `id_ed25519`.

### Aprire da altre parti

Nel File Manager, dentro una connessione **SFTP** della cartella [Rete](#rete), il tasto destro su un file o una cartella ha **Apri terminale SSH qui**: apre una scheda del Terminale sullo stesso server, nella stessa cartella, con le stesse credenziali.

### Confermare il server

Alla prima connessione a un server SSH (o a un Telnet su TLS con un certificato che lilOS non riconosce) compare una finestra con l'impronta della sua chiave. Controllala con chi gestisce il server e premi **Continua**: lilOS la ricorda per quel server. **Annulla** non si collega, ed è anche ciò che fanno **Invio** ed **Esc**: per proseguire devi premere tu **Continua**. Puoi prenderti il tempo che serve per controllare. Se più avanti la chiave cambia, la finestra ha l'icona di errore e dice «Continua solo per fidarti della nuova chiave»: può essere un server reinstallato, ma anche qualcuno che si mette in mezzo. Vai avanti solo se sai perché è cambiata.

### Lavorare in una scheda remota

- La scheda funziona come i programmi di oggi si aspettano: colori, mouse, schermo intero per `vim` o `htop`, incolla protetto, caratteri larghi.
- **Copiare**: seleziona con il mouse. **Incollare**: **Ctrl Maiusc V**. Cercare nello storico: **Ctrl Maiusc F** apre una barra in alto a destra nel terminale. Mentre scrivi, le corrispondenze si evidenziano e la barra dice «3 di 12». **Invio** va alla successiva, **Maiusc Invio** alla precedente, **Esc** chiude la barra. I tre pulsanti a destra del campo (**Aa**, **ab** e `.*`) cercano rispettando maiuscole e minuscole, solo parole intere, oppure con un'espressione regolare (se è scritta male la barra lo dice).
- Il menu **Tasti** manda al server i tasti che il browser tiene per sé (Ctrl W, Ctrl T, Ctrl N…) e, per Telnet, **Invia Break**, **Interrompi il processo** e **Ci sei? (AYT)**.
- **Registra la sessione in un file** salva quello che passa sullo schermo in un file di testo della tua home (di solito in `Documenti`, con il nome dell'host e la data). Si ferma da solo a 8 MB.
- Nella barra in basso vedi se la connessione è **Cifrata** o **Non cifrata**, l'indirizzo, la chiave del server e la dimensione dello schermo.
- Se la connessione cade o il server la chiude, la scheda dice **Connessione chiusa** e ha **Riconnetti**.

### Sessioni che restano aperte

Chiudendo la finestra (o ricaricando la pagina) le sessioni remote **non** si chiudono: continuano a girare sul computer di lilOS. Le shell di lilOS invece finiscono. Riaprendo il Terminale trovi le sessioni in **Ancora attive**, con **Riprendi**: lo schermo torna com'era, anche con `vim` o `htop` aperti. Se la sessione è aperta in un'altra finestra, qui la prendi tu e l'altra mostra **La sessione è stata aperta in un'altra finestra**.

- Una sessione senza finestra si **chiude da sola dopo 10 minuti** (l'elenco dice «si chiude tra … minuti»). Quello che stava girando sul server si ferma con lei.
- Ogni utente può averne **10 aperte** insieme.
- Chiudere una scheda con **Chiudi (termina la sessione)** la chiude per davvero.

### Riquadri e finestre del terminale

La finestra del Terminale si può dividere in **riquadri**, uno accanto all'altro o uno sopra l'altro, quanti ne vuoi. Ogni riquadro ha le sue schede.

- **Dividere.** Dal menu della scheda: **Dividi a destra** o **Dividi in basso**. Oppure trascina una scheda sul bordo di un terminale: lì nasce un riquadro nuovo.
- **Misure.** Trascina il separatore tra due riquadri. Un doppio clic lo rimette a misure uguali. Con il separatore selezionato, le frecce della tastiera lo spostano.
- **Menu della scheda.** Tasto destro sulla scheda (o **Maiusc F10**, o il tasto Menu): **Rinomina**, **Duplica**, **Dividi a destra**, **Dividi in basso**, **Sposta nel riquadro**, **Stacca in una nuova finestra**, **Sposta nella finestra** (le altre finestre di Terminale di questo workspace) o **Nuova finestra**, **Salva come collegamento (.term)…**, **Aggiungi alla scrivania**, **Chiudi**, **Chiudi le altre**, **Chiudi quelle a destra**. Sulle schede remote ci sono anche **Riconnetti** e **Copia indirizzo**.
- **Trascinare una scheda.** Su una barra delle schede la sposta lì. Sul bordo di un terminale crea un riquadro nuovo. Fuori dalla finestra apre una finestra nuova (se era l'unica scheda, si sposta la finestra). **Esc** annulla il trascinamento.
- **Staccare non riavvia niente.** Una shell di lilOS conserva il suo schermo e il comando in corso; una sessione SSH è la stessa, ancora collegata. Le finestre staccate tornano con lilOS, con i loro riquadri, e le sessioni remote ancora vive si riagganciano.
- **Invia l'input a tutti i riquadri.** Quello che scrivi va alla scheda mostrata in ogni riquadro, anche se una è SSH e un'altra una shell di lilOS. Si attiva dal menu della scheda e si spegne allo stesso modo.

| Scorciatoia | Cosa fa |
| --- | --- |
| **Alt Maiusc T** | Nuova shell |
| **Alt Maiusc D** | Divide a destra |
| **Alt Maiusc S** | Divide in basso |
| **Alt Maiusc W** | Stacca la scheda in una finestra |
| **Alt Maiusc B** | Invia l'input a tutti i riquadri |
| **Alt Maiusc** + frecce | Passa al riquadro accanto |
| **Alt Maiusc PagSu / PagGiù** | Scheda precedente / successiva del riquadro |
| **Ctrl Alt Maiusc** + frecce | Sposta la scheda |

Puoi cambiarle nel Pannello di controllo → **Scorciatoie**. **Ctrl Alt ←/→** non c'è tra queste perché lilOS la usa per cambiare workspace.

### Collegamenti `.term`

Un file `.term` apre una shell o una sessione remota con le tue scelte già fatte: un doppio clic e il Terminale parte. Nel File Manager se ne vede l'anteprima.

- **Crearlo.** Dal menu della scheda, **Salva come collegamento (.term)…**. Scegli il nome, la cartella dove salvarlo (**Cambia…**), la cartella iniziale, il comando da eseguire (per SSH è il **Comando all'avvio**) e **All'apertura**: in una finestra nuova o in una scheda.
- **Aprirlo.** Di solito si apre in una **finestra nuova**. In **Menu di Terminale → Opzioni…**, **Apri i collegamenti**, puoi scegliere invece una scheda della finestra già aperta. Il file può anche decidere da sé (**All'apertura**).
- **Password.** La casella **Salva la password nel file** mette nel file la password cifrata. Vale solo per chi l'ha salvata, su questo lilOS, per lo stesso server e lo stesso utente: chiunque altro, o un altro lilOS, deve scriverla come al solito. Se non la salvi, il Terminale usa quella di un host salvato con lo stesso indirizzo; se non c'è, la chiede il server.
- **Comandi.** Un collegamento che esegue un comando, e che il Terminale non ha salvato proprio per questo account, chiede conferma la prima volta. Se il contenuto non cambia, non lo richiede più. Controlla il comando prima di dire di sì.
- Serve lilOS dalla 1.16.0 (e Terminale 1.4.0).

### Da sapere

- **Telnet, rlogin e SUPDUP non cifrano**: password comprese, tutto passa in chiaro sulla rete. Il Terminale lo scrive (**Connessione non cifrata**) quando li configuri e nella barra in basso. Usali solo su reti di cui ti fidi, o con apparecchi che non hanno SSH.
- **rlogin**: molti server accettano solo client che si collegano da una porta riservata. lilOS lo fa solo se il computer del kernel lo permette (Windows, o il kernel avviato come amministratore del sistema); altrimenti il server chiude subito e il terminale lo spiega.
- **SUPDUP**: la dimensione dello schermo si comunica solo all'inizio; ridimensionando la finestra il server continua con quella di partenza.
- Il Terminale non può leggere gli appunti da solo: per incollare serve **Ctrl Maiusc V**.
- Non ci sono ancora l'inoltro di porte, l'agente SSH e la connessione attraverso un altro server (host di salto).
- Le schede remote usano [xterm.js](https://xtermjs.org) (licenza MIT); i riconoscimenti sono nella pagina del Terminale nell'AppStore.
- La shell del Terminale può eseguire anche i comandi della [Pianificazione](#pianificazione), a lilOS chiuso: è il servizio «Shell per la Pianificazione» del Terminale 1.5.0, che parte da solo quando serve e non va acceso a mano.
- Serve una versione di lilOS dalla 1.12.0.

### Il comando `nettest`

Con [NetTest](#nettest) installato (Terminale dalla 1.9.0, lilOS dalla 1.25.0) il Terminale ha il comando `nettest`, che manda le richieste di una collezione `.nettest` senza aprire finestre:

- `nettest run FILE` manda tutte le richieste (o quelle di una cartella con `-f CARTELLA`), una riga ciascuna: ✓ riuscita, ✗ fallita, · saltata, con stato, tempo e cosa non è andato. Con `-e AMBIENTE` scegli l'ambiente, con `-n GIRI` i giri, con `-d DATI.csv` (o `.json`) un file di dati, con `--bail` ci si ferma al primo errore, con `-v` si vede di più. Esce con 0 se tutte sono riuscite, con 1 altrimenti: va bene negli script.
- `nettest send FILE RICHIESTA` manda una richiesta, per nome, e scrive il corpo della risposta (con `-i` prima ci sono stato e header; `-e` sceglie l'ambiente).
- `nettest list FILE` elenca le cartelle e le richieste con il loro protocollo.

I valori segreti sono quelli che hai sigillato tu nel file.

## NetTest

**NetTest** serve a provare le API e i servizi di rete, come fa Postman: scrivi una richiesta, la mandi, guardi la risposta. Le richieste non partono dal browser ma dal computer su cui gira lilOS, quindi non ci sono i limiti del browser (quelli che bloccano le richieste verso altri siti) e arrivano ai server che quel computer raggiunge.

Sa fare:

- **HTTP e REST**, e **GraphQL** (con lo schema letto dal server);
- **sessioni** che restano aperte: **WebSocket**, **SSE**, **TCP**, **TLS**, **UDP**, **MQTT** e **gRPC**;
- **ambienti** (Sviluppo, Produzione…) con **variabili segrete**, e le diverse **autorizzazioni** (Basic, Bearer, chiave API, Digest, firma AWS, OAuth 2.0);
- **script**, **verifiche** e **collezioni** di richieste da eseguire in ordine, anche da sole con la [Pianificazione](#pianificazione).

NetTest non c'è di serie: un amministratore lo installa dall'[AppStore](#lappstore), categoria **Sviluppo**, e poi lo trovi nel menu di avvio. Serve lilOS dalla 1.25.0. L'app chiede di fare richieste di rete dal computer di lilOS e di scrivere i file della tua home (per le collezioni). Alcune parti sono facoltative e l'AppStore te le propone quando installi NetTest ([Installare un'app con ciò che le serve](#installare-unapp-con-ciò-che-le-serve)): gli **script** vogliono il modulo `services-isolate`, **gRPC** il modulo `call-grpc`, **MQTT** il modulo `call-mqtt`.

### La finestra

A sinistra c'è l'elenco delle **Collezioni** (con la ricerca) e la **Cronologia** delle richieste che hai mandato. **Le mie richieste** c'è sempre: la tiene NetTest, si salva da sola. Le altre collezioni sono file **`.nettest`** della tua home. In alto: **Nuova**, **Importa**, **Apri collezione**, **Cookie**, **Esegui**, **Pianifica** e **Salva**. A destra ci sono le richieste aperte, ognuna in una scheda: chiudendo la finestra le schede tornano alla prossima apertura.

Il tasto destro su una collezione offre **Nuova richiesta** (si sceglie il protocollo), **Nuova cartella**, **Impostazioni**, **Ambienti**, **Esegui**, **Pianifica…**, **Salva**, **Salva con nome…**, **Esporta per Postman…** e, per i file, **Chiudi**. Una cartella ha **Nuova richiesta**, **Nuova cartella**, **Impostazioni**, **Esegui** (solo le sue richieste), **Rinomina**, **Duplica** ed **Elimina**; una richiesta ha **Apri**, **Copia come codice…** (per HTTP e GraphQL), **Rinomina**, **Duplica** ed **Elimina**.

### Mandare una richiesta

1. **Nuova richiesta** e scegli il protocollo; scrivi il metodo (GET, POST…) e l'indirizzo.
2. Nelle schede scrivi i **Parametri** (la parte dell'indirizzo dopo il `?`, riga per riga), le **Header**, il **Corpo** (JSON, testo, XML, HTML, form, multipart o un file della tua home) e, se serve, l'**Autorizzazione**.
3. **Invia** (o Ctrl Invio). **Ferma** annulla la richiesta mentre aspetta.

La risposta mostra stato, tempo e dimensione, e le schede **Corpo** (**Formattato**, **Com'è arrivato** o **Anteprima**, con **Copia** e **Scarica**), **Header**, **Cookie**, **Risultati**, **Console**, **Tempi** (DNS, connessione, TLS, attesa, scaricamento) e **Richiesta inviata**. **Anteprima** mostra la pagina senza eseguire script e senza caricare niente dalla rete (immagini e stili esterni non compaiono). Per un sito sicuro vedi anche chi ha rilasciato il certificato.

In **Impostazioni** di ogni richiesta: il tempo massimo (30 secondi di serie), i reindirizzamenti, la versione HTTP (HTTP/2 se il server la offre), se controllare il certificato del server, se decomprimere la risposta, se mandare e tenere i cookie, il certificato del cliente (per i server che chiedono chi sei), altri certificati di autorità fidate e la dimensione massima della risposta (20 MB di serie, il resto si taglia).

**GraphQL**: la scheda **Query** ha la query e le variabili (in JSON) e **Schema** mostra i tipi che il server dichiara, con un filtro. Se il server non dà il suo schema (l'introspezione è spenta) NetTest lo dice.

**Certificato da confermare.** Se il certificato di un server non è valido (per esempio è fatto da chi gestisce il server), la risposta dice **Certificato da confermare** e **Conferma il certificato…** mostra l'impronta. Controllala con chi gestisce il server, poi conferma: da lì la richiesta riparte. La conferma vale per quel server e quella porta, per te, anche nella cartella [Rete](#rete) e nel [Terminale](#terminale), e viceversa.

### Variabili e ambienti

Dove vuoi (indirizzi, header, corpi, autorizzazione) puoi scrivere `{{nome}}`: al suo posto va il valore della variabile. Le variabili stanno in tre posti, in quest'ordine di precedenza: l'**ambiente** scelto (il menu **Ambiente** sopra la richiesta; **Ambienti e variabili** li gestisce), la **collezione** (le stesse in ogni ambiente) e le **globali** (per tutte le collezioni, tenute da NetTest e non nei file). Ci sono anche valori che cambiano a ogni richiesta, come `{{$guid}}`, `{{$timestamp}}` e `{{$randomInt}}`. Se una variabile non ha un valore, NetTest te lo dice prima di inviare.

**Variabili segrete.** Una password, un token o una chiave non vanno scritti in chiaro. Nell'ambiente, il **lucchetto** di una variabile la rende segreta: lilOS **sigilla** il valore subito. Nel file resta cifrato e lo apri solo tu, su questo lilOS; lo mette nella richiesta il computer di lilOS, e richieste, risposte, script e cronologia lo mostrano come `••••`, anche se il server lo rimanda indietro. Nessuno lo rivede più (nemmeno tu): puoi solo darne uno nuovo. Un file `.nettest` passato a un'altra persona, o aperto su un altro lilOS, non porta con sé i valori segreti: chi lo apre deve rimetterli. Se togli il lucchetto, il valore sigillato se ne va e ne scrivi uno nuovo, che resta visibile nel file.

Attenzione: le variabili senza lucchetto, quelle globali e quelle della collezione, e ciò che scrivi direttamente nei campi dell'autorizzazione restano **in chiaro** nel file.

### Autorizzazione

Nella scheda **Autorizzazione**: **Dalla cartella** (di serie: usa quello che dicono la cartella o la collezione), **Nessuna**, **Basic**, **Token Bearer**, **Chiave API** (in un header o nell'indirizzo), **Digest** (la risposta al 401 la fa NetTest), **Firma AWS v4** e **OAuth 2.0**. Con OAuth 2.0 scegli:

- **Un token che ho**: lo scrivi tu (meglio con una variabile segreta);
- **Accesso (codice + PKCE)**: **Accedi** apre la pagina del fornitore in una finestra; finito l'accesso torna a lilOS. L'indirizzo di ritorno da registrare presso il fornitore è quello mostrato nella scheda (`…/api/calls/oauth/callback`, di questo lilOS). Se il fornitore vuole un indirizzo suo, lo scrivi in **Indirizzo di ritorno**: finito l'accesso la pagina potrebbe non aprirsi, e NetTest ti chiede di incollare l'indirizzo dove è finita;
- **Credenziali del client** e **Utente e password**: il computer di lilOS chiede il token quando serve alla richiesta e lo tiene finché vale.

I token ottenuti si rinnovano da soli. **Dimentica l'accesso** li toglie. L'autorizzazione di una cartella o della collezione (**Impostazioni**) vale per tutte le richieste dentro che scelgono **Dalla cartella**.

### Script e verifiche

Nella scheda **Script**, **Prima della richiesta** e **Dopo la risposta**: codice JavaScript eseguito dal computer di lilOS in un ambiente isolato, senza rete né file, per **5 secondi** al massimo. Sa leggere e cambiare variabili e richiesta, guardare la risposta e scrivere test; l'oggetto si chiama `nt` (e `pm`, con gli stessi comandi, così gli script scritti per Postman di solito funzionano). **Aggiungi** inserisce degli esempi. Le variabili segrete negli script si leggono come `{{nome}}`: il valore non arriva mai allo script. Gli script chiedono il modulo `services-isolate`: senza, una richiesta con script non parte e NetTest dice cosa manca.

Senza scrivere codice, **Verifiche** controlla la risposta (stato, tempo, dimensione, un header, un campo JSON, il corpo: è, contiene, corrisponde a…) e **Salva in variabile** tiene un valore della risposta (un percorso JSON come `$.data.id`, un header o un pezzo del corpo) per le richieste dopo, per esempio un token. I risultati stanno in **Risultati**, ciò che gli script scrivono in **Console**.

### Cookie

NetTest tiene i cookie dei server come farebbe un browser: li rimanda alle richieste dopo allo stesso server, se la richiesta non ha già un header Cookie o non lo vieta nelle sue impostazioni. **Cookie** (in alto) li elenca e li toglie.

### Sessioni: WebSocket, SSE, TCP, TLS, UDP, MQTT, gRPC

Questi protocolli tengono un collegamento aperto. **Collega** lo apre, **Scollega** lo chiude; i messaggi inviati e ricevuti compaiono in **Messaggi** (con un filtro, **Svuota**, e formato testo, JSON, byte in esadecimale o Base64). **Tieni questo messaggio** lo conserva nella richiesta per rimandarlo. Dettagli di ognuno:

- **WebSocket**: header e sottoprotocolli; **Ping**. **SSE**: gli eventi del server compaiono con nome e id.
- **TCP**, **TLS** (con il nome del server per il certificato) e **UDP**: scrivi server e porta, poi invii testo o byte. TCP e UDP non sono cifrati.
- **MQTT** (3.1.1 e 5): broker, identificativo, keep alive, sessione pulita; **Iscrizioni** (con `+` e `#`); per pubblicare scrivi il topic, scegli QoS e se conservare il messaggio. Senza TLS password e messaggi passano in chiaro.
- **gRPC**: i servizi e i metodi si leggono dal server (reflection) o dal file `.proto` che incolli. Un metodo con una sola risposta si chiama con **Invoca** e ha anche verifiche e script come HTTP; i flussi si aprono con **Apri il flusso**, e **Chiudi l'invio** o **Chiudi il flusso** li finiscono.

Il collegamento lo tiene il computer di lilOS: **chiudendo la finestra la sessione resta aperta per 10 minuti**, e riaprendo la richiesta la ritrovi con i suoi messaggi. Dopo 10 minuti senza finestra si chiude da sola (la scheda dice a che ora). Puoi avere **10 sessioni** aperte insieme. Una sessione aperta in un'altra finestra passa a quella che la riprende.

### Collezioni

Una collezione è un insieme di richieste, in cartelle, con i suoi ambienti, variabili, autorizzazione e script. **Nuova collezione…** ne crea una, **Apri collezione** apre un file `.nettest`, **Salva** (Ctrl S) la scrive nella tua home: una collezione modificata e non salvata è segnata **Non salvata**, e chiudendola NetTest chiede se salvare. **Le mie richieste** invece si salva da sola. Un file `.nettest` si apre anche con un doppio clic dalla scrivania o dal File Manager, dove ha la sua anteprima.

**Esegui** manda in ordine le richieste di una cartella o di tutta la collezione. Scegli: l'**ambiente**, i **giri** (quante volte), un **file di dati** (CSV con la prima riga di intestazioni, o JSON con un elenco di oggetti: un giro per riga, e le colonne diventano variabili), la **pausa** tra le richieste, se **fermarsi al primo errore** e se **tenere le variabili** che l'esecuzione ha cambiato. Ogni richiesta ha il suo esito (riuscita, fallita, saltata): una fallisce se la rete o il server non rispondono, o se una verifica o un test non passano. **Ferma** interrompe, **Esporta i risultati** li salva. Le sessioni (WebSocket, TCP…) nelle esecuzioni si saltano. Puoi avere 5 esecuzioni insieme, e NetTest ne mostra al massimo 1000 risultati (ognuno con la risposta tagliata a 64 KB).

### Importare, esportare, copiare come codice

- **Importa** legge una collezione di **Postman** (v2, e i suoi ambienti), **Insomnia** (v4 e v5), **OpenAPI 3** e **Swagger 2** (JSON o YAML), un file **HAR** o dei comandi **cURL**, scelti da un file o incollati: il formato si riconosce da solo. Il risultato è una nuova collezione (un file `.nettest`) o una cartella di **Le mie richieste**. I valori segreti non passano con i file: dopo l'importazione NetTest ti dice quali rimettere, in **Ambienti**.
- **Esporta per Postman…** scrive la collezione (e gli ambienti, con i valori segreti vuoti) in un file per Postman.
- **Copia come codice…** (nel menu **Altro** di una richiesta) scrive la richiesta per cURL (anche per il cmd di Windows), HTTPie, PowerShell, JavaScript (fetch), Node.js, Python, Go, Java, C#, PHP o come HTTP grezzo. Le variabili segrete restano `{{nome}}`: non escono mai da lilOS.

### Pianificare e usare dal Terminale

**Pianifica** (nel menu di una collezione o di una richiesta) apre la [Pianificazione](#pianificazione) con una nuova operazione **Collezione di NetTest** già compilata. La collezione deve essere un file salvato nella tua home: «Le mie richieste» va prima salvata come collezione. Nel [Terminale](#terminale) il comando `nettest` fa lo stesso senza finestra: `nettest run`, `nettest send` e `nettest list`.

### Dove si può andare

I server li raggiunge il computer di lilOS, con le stesse regole della cartella [Rete](#rete): con un solo utente senza accesso va dove vai tu; con più utenti non si arriva a quel computer stesso né, di serie, alla rete locale. Un amministratore può aprirle dal **Pannello di controllo → Rete** (vedi [Il Pannello di controllo](#pannello-di-controllo)). Se provi, compare **Indirizzo non permesso per le connessioni di rete**.

### Da sapere

- Le richieste di NetTest **fanno davvero** quello che dicono: una DELETE cancella. Provale prima su un servizio di prova.
- Puoi avere 8 richieste in corso insieme.
- Una password o un token scritti direttamente nei campi dell'autorizzazione, o in una variabile senza lucchetto, restano in chiaro nel file e nella cronologia. Usa le variabili segrete.
- Le sessioni TCP, UDP e MQTT senza TLS non sono cifrate.
- Un file `.nettest` è JSON leggibile; si apre anche con l'Editor. Fino a 32 MB.
- La cronologia tiene le ultime 200 richieste. Le variabili globali e i cookie sono salvati nel tuo spazio su lilOS, non nei file delle collezioni.
- Non ci sono ancora: i file `.proto` che includono altri file (gli import non si seguono: incolla un file solo) e MQTT su WebSocket.
- Per le librerie usate (protobufjs per gRPC), i riconoscimenti sono nella pagina di NetTest nell'AppStore e in Pannello di controllo → Informazioni → Riconoscimenti.

## NetWave Browser

**NetWave Browser** è un browser dentro lilOS: apri siti web in schede, in quante finestre vuoi. Ogni finestra può essere salvata come **sessione**, un file con tutte le sue schede, da riaprire quando vuoi.

NetWave non c'è di serie: un amministratore lo installa dall'[AppStore](#lappstore), categoria **Produttività**, e poi lo trovi nel menu di avvio. Serve lilOS dalla 1.38.0 (dalla 1.38.1 per i limiti nuovi su download e popup). L'app chiede di scrivere i file della tua home (per le sessioni e i download).

**Le pagine web si vedono solo nel [programma lilOS](#il-programma-lilos)** (dalla versione 0.5.1), collegato a un lilOS di cui si fida. Se usi lilOS dal browser, NetWave si apre lo stesso e ti avvisa che qui le pagine non ci sono: **Apri nel browser** apre l'indirizzo nel tuo browser. Le sessioni e la cronologia funzionano comunque. Le pagine girano separate da lilOS: non possono vedere i tuoi file né i tuoi dati di lilOS, e non possono aprire lilOS stesso, né con il suo indirizzo né con un altro nome di questo computer.

### Schede e finestre

- **Ctrl T** apre una scheda, **Ctrl W** la chiude, **Ctrl Shift T** riapre l'ultima chiusa. **Ctrl N** apre una nuova finestra.
- Nella barra scrivi un indirizzo o delle parole da cercare. **Ctrl L** porta lì il cursore. Indirizzi come `file:`, `javascript:`, `mailto:` o `about:` (tranne `about:blank`) non si aprono e non diventano una ricerca: compare la pagina «NetWave non apre questo indirizzo».
- Quando una pagina vuole aprire una nuova scheda (un popup, un collegamento a una nuova finestra), NetWave lo chiede con una barra sopra la pagina: **Non consentire** o **Apri**. Con la casella **Ricorda per questo sito** la risposta vale per sempre. Se apri tu un collegamento in una scheda sullo sfondo (Ctrl o clic centrale) non chiede. Si può togliere la domanda in **Opzioni** (vedi sotto): allora le schede si aprono subito, al massimo 5 ogni 10 secondi per pagina.
- Il tasto destro su una scheda la ricarica, duplica, fissa, silenzia, chiude o la sposta in una nuova finestra.
- **Home** apre la pagina iniziale che scegli nelle Opzioni. Di serie è la pagina di partenza di NetWave, con le sessioni e le finestre chiuse di recente.
- Un collegamento a una pagina web sulla scrivania (vedi [Collegamenti sulla scrivania](#collegamenti-sulla-scrivania)) si apre in NetWave, se è installata e le pagine web sono disponibili; altrimenti nel browser.
- **Ctrl F** cerca nella pagina; **Ctrl +**, **Ctrl −** e **Ctrl 0** cambiano lo zoom della scheda.

### Finestra privata

**Ctrl Shift N** apre una finestra privata. Cookie e dati dei siti restano solo in memoria e spariscono quando la chiudi. Le pagine che apri non entrano nella cronologia, non si ricordano i permessi e la finestra non si salva come sessione. Non nasconde niente a chi gestisce la rete né ai siti che visiti.

### Sessioni

Una sessione è un file `.nwsession` con tutte le schede di una finestra. Salvarla serve a ritrovare il lavoro: la ricerca di ieri, le pagine di un progetto.

- **Ctrl S** salva la finestra come sessione (la prima volta chiede nome e cartella; di serie **Documenti › Sessioni NetWave**). **Ctrl Shift S** la salva come una sessione nuova. **Ctrl O** ne apre una.
- Una sessione aperta o salvata si può far salvare da sola a ogni cambiamento (schede aperte, chiuse, spostate). Se chiudi una finestra legata a una sessione cambiata dopo l'ultimo salvataggio (e che non si salva da sola), NetWave chiede se salvare: **Salva**, **Non salvare** o annulla.
- Un doppio clic su un file `.nwsession` dal File Manager o dalla scrivania apre la sessione. L'anteprima mostra quante schede ha.
- Nel file ci sono solo **indirizzi e titoli**. Cookie, password, dati dei moduli e permessi dei siti non si salvano mai in una sessione: puoi darla a un'altra persona.
- Il file è di testo e si apre anche con l'[Editor](#leditor).

### Cronologia

**Ctrl H** apre la cronologia, tua e di nessun altro. Ha tre parti:

- **Pagine**: quelle che hai visitato, per giorno, con la sessione in cui le hai aperte. Puoi cercare, limitarti a una sessione e togliere una pagina o tutte quelle di un sito.
- **Sessioni**: quelle che hai aperto, salvato e chiuso. NetWave ne ricorda anche le schede com'erano, così **Riapri** funziona anche se hai cancellato il file.
- **Chiuse di recente**: le ultime 20 schede e finestre chiuse.

**Cancella cronologia…** toglie l'ultima ora, oggi o tutto, scegliendo se pagine e schede chiuse o sessioni (i file delle sessioni restano dove sono). La cronologia tiene 90 giorni di serie (cambia nelle Opzioni).

### Permessi dei siti

Quando un sito chiede la tua posizione, la fotocamera, il microfono, le notifiche e cose simili, compare una barra di NetWave sopra la pagina con due scelte: **Non consentire** e **Consenti**. Con la casella **Ricorda per questo sito** la risposta vale anche la prossima volta; senza, vale solo per questa richiesta. Fotocamera e microfono si chiedono e si ricordano separatamente. Se non rispondi entro 2 minuti vale come «Non consentire» e la barra sparisce. Lo scudo accanto all'indirizzo mostra cosa hai deciso per il sito e permette di **Chiedi di nuovo**, anche per le schede già aperte. In una finestra privata la risposta non si ricorda e la casella non c'è.

### Download

Un file scaricato va nella cartella **Download** della tua home e compare una notifica. **Ctrl J** apre l'elenco degli ultimi 30. Un file può pesare fino a 1 GB: oltre, NetWave non lo scarica e ti avvisa. Si scaricano al massimo 4 file alla volta per finestra di lilOS (gli altri vengono rifiutati con un avviso: riprova quando i primi hanno finito). Se un download viene interrotto, per esempio perché chiudi la scheda, ricevi un avviso. I nomi molto lunghi vengono accorciati a 150 caratteri.

### Opzioni

Dal menu di NetWave → **Opzioni**: la **pagina iniziale**, il **motore di ricerca** (DuckDuckGo, Startpage, Bing, Google o Ecosia; di serie DuckDuckGo), i **giorni di cronologia** (7, 30, 90, 365 o per sempre), i **permessi ricordati** e, in **Siti**, l'interruttore **Chiedi prima che una pagina apra nuove schede** (acceso di serie).

### Da sapere

- NetWave non apre gli indirizzi di lilOS (con nessun nome di questo computer) né i file del tuo computer (`file:`): solo pagine `http` e `https`.
- Se NetWave ti avvisa che una pagina ha provato ad aprire un indirizzo non permesso, l'avviso compare al massimo ogni 20 secondi per scheda e mostra solo il tipo e il sito.
- Il titolo della finestra mostra il sito, non il titolo che la pagina sceglie per sé. Dopo un ricaricamento di lilOS una finestra privata non si riapre (le sue schede e i suoi dati sono già spariti).
- I cookie e gli accessi ai siti sono tuoi e sono gli stessi in tutte le tue finestre normali di NetWave; un altro utente di lilOS ne ha di propri. Cancellare la cronologia non li cancella.
- Mentre sei dentro una pagina, le scorciatoie di lilOS non funzionano: valgono quelle di NetWave (vedi [Scorciatoie da tastiera](#scorciatoie-da-tastiera)).
- Lo schermo intero chiesto da una pagina (per un video, per esempio) e gli strumenti per sviluppatori sono spenti.
- Se una notifica o un menu di lilOS passa sopra la pagina, per qualche secondo al suo posto c'è un'immagine: non puoi usarla finché la notifica resta lì.
- Non ci sono ancora le pagine web per chi usa lilOS dal browser (arriveranno, in un secondo tempo, con un motore sul computer di lilOS).

## ArduinoIDE4LilOS

**ArduinoIDE4LilOS** serve a scrivere programmi (gli *sketch*) per le schede **Arduino Uno, Nano e Mega**, controllarli e caricarli sulla scheda collegata al tuo computer. Non è un'app ufficiale di lilOS: sta nel repository community [lilos-plugins-community](https://github.com/GexyLab/lilos-plugins-community), con i sorgenti aperti a tutti.

Per averla, un amministratore:

1. aggiunge il repository dall'[AppStore](#lappstore): **Opzioni** → **Aggiungi un repository**, indirizzo `https://github.com/GexyLab/lilos-plugins-community`;
2. installa il modulo **arduino** dalla scheda **Kernel** e riavvia lilOS;
3. installa **ArduinoIDE4LilOS** dalla categoria **Sviluppo**;
4. apre ArduinoIDE4LilOS una volta e preme **Prepara** (circa 150 MB da scaricare).

L'AppStore avvisa che i pacchetti di un repository non ufficiale non sono verificati. Come si usa l'app (sketch, scheda e porta, caricamento, monitor seriale, librerie) lo spiega il suo README, che l'AppStore mostra nei dettagli dell'app. Per caricare sulla scheda servono Chrome, Edge o Firefox 151 o più recente, con lilOS su `https` o `localhost`; serve lilOS dalla 1.18.0.

## Pianificazione

**Pianificazione** fa le cose al posto tuo, a una data e a un'ora, oppure ogni tanto: un promemoria, la copia di una cartella, un comando, una richiesta a un sito. Ogni cosa da fare si chiama **operazione**. Quasi tutte partono anche quando lilOS è chiuso nel browser, perché le fa il computer su cui gira lilOS.

Pianificazione c'è già, è un'app di sistema e non si può togliere. Serve lilOS dalla 1.19.0. La trovi nel menu di avvio.

### La finestra

In alto ci sono **Nuova operazione**, **Esegui ora**, **Pausa** (o **Riattiva**) e la ricerca. Le due schede sono:

- **Elenco**: le operazioni, con quando sono fatte, la prossima volta e com'è andata l'ultima. A sinistra i filtri: **Tutte**, **Attive**, **In pausa**, **Non riuscite**, e **Dove gira** (kernel o browser, vedi sotto). Chi non è amministratore può anche scegliere tra le operazioni create da lui (**Me**) e quelle create dalle sue app (**Le mie app**).
- **Storico**: ogni volta che un'operazione è partita, con il momento, l'esito, quanto è durata e perché è partita (a orario, a mano, per recuperare una volta persa, per un nuovo tentativo). Un clic su una riga mostra il resoconto: per esempio le righe scritte da un comando o la risposta di un sito. Due menu in alto filtrano per operazione e per esito.

Con un clic su un'operazione, a destra compare il suo riquadro: la regola scritta in parole, cosa fa, dove gira, cosa succede se la volta viene persa, le **prossime volte** e le **ultime corse** (un pallino per ognuna: passandoci sopra vedi quando e com'è andata). Da lì puoi **Esegui ora**, **Modifica**, **Pausa**, **Duplica**, **Elimina** e aprire lo **Storico** di quella sola operazione. **Elimina** chiede conferma: l'operazione non parte più e se ne va anche il suo storico.

**Esegui ora** fa partire l'operazione subito, senza toccare le volte già pianificate.

### Creare un'operazione

**Nuova operazione** apre una finestra in tre passi: **Cosa**, **Quando**, **Opzioni**. Con **Avanti** e **Indietro** ti muovi tra i passi, **Crea** (o **Salva**, se stai modificando) conclude. Se qualcosa non va (una data sbagliata, un file che non c'è più) lilOS lo dice e non salva.

**Cosa** si può fare:

| Operazione | Cosa fa |
| --- | --- |
| **Promemoria** | Ti manda una notifica con il testo che scrivi e un tipo (informazione, riuscita, avviso, errore). Un clic sulla notifica può aprire un file o un'app. |
| **Servizio di un'app** | Avvia una parte in sottofondo di un'app installata (per esempio il controllo degli aggiornamenti dell'AppStore), con i valori che scegli. Se il servizio era spento, parte per quella volta e poi si spegne. |
| **Copia una cartella** | Copia una cartella tua, o di una connessione della [Rete](#rete), in un'altra. La copia va in una cartella con lo stesso nome di quella copiata. Tre modi: **Versioni datate** (ogni volta una cartella nuova con la data, tenendo le ultime da 1 a 100, di serie 7), **Aggiorna** (copia solo i file nuovi o cambiati, di serie) e **Specchio** (come Aggiorna, e ciò che non c'è più nell'originale va via anche dalla copia: nel Cestino se la copia è in lilOS, **per sempre** se è su un server). Puoi escludere dei nomi (con `*` e `?`, per esempio `*.tmp`). I collegamenti e i file che esistono solo sul sito del fornitore (per esempio un documento di Google) non si copiano. Se un file non si riesce a copiare, il resoconto lo dice e la copia va avanti, ma l'operazione risulta non riuscita. |
| **Comando del Terminale** | Esegue righe di comandi, una per riga, come nel [Terminale](#terminale). **In lilOS**: la shell del Terminale lavora sui tuoi file (parte dalla cartella che scegli, di serie la tua home). **Su un host SSH**: usa uno degli host che hai salvato nel Terminale. Riesce se l'ultimo comando esce con 0. Quello che i comandi scrivono finisce nello storico e, se vuoi, in un file (sostituito a ogni volta, oppure con le righe nuove aggiunte in fondo). |
| **Richiesta web** | Chiama un indirizzo `http` o `https` (metodo, intestazioni e corpo a scelta) e controlla la risposta: di serie riesce se lo stato è 2xx, ma puoi chiedere uno stato preciso o che la risposta contenga un testo. Le intestazioni segnate come **segreto** (per esempio una chiave di accesso) restano cifrate e, dopo averle salvate, non si rivedono più; per tenerne una basta non toccarla. Puoi salvare la risposta in un file (sostituito, oppure uno nuovo ogni volta con la data nel nome). Valgono le regole della Rete: con più utenti non si raggiunge il computer di lilOS, e la rete locale solo se un amministratore l'ha aperta. Se il certificato del sito non è valido, la richiesta riesce solo se l'hai già confermato in [NetTest](#nettest), nella [Rete](#rete) o nel [Terminale](#terminale) (dalla 1.25.0); altrimenti l'operazione dice «confermalo una volta da NetTest». |
| **Collezione di NetTest** | Manda le richieste di un file `.nettest` della tua home, una dopo l'altra, come il pulsante **Esegui** di [NetTest](#nettest), con l'ambiente che scegli (o nessuno). Riesce se ogni richiesta risponde e passa le sue verifiche e i suoi test; lo Storico ha una riga per richiesta (✓ riuscita, ✗ fallita, · saltata, con stato e tempo) e il motivo di ogni errore. I valori segreti sono quelli che hai sigillato tu nel file: se non ci sono, la richiesta parte senza. Serve NetTest installato e lilOS dalla 1.25.0. |
| **Apri un'app o un file** | Apre quell'app o quel file nel browser. |
| **Automazione** | Fa partire nel browser un'automazione di [Automata](#automata): si apre la finestra **In esecuzione** di Automata. Si pianificano solo le automazioni che lavorano su **niente** (in **Opzioni di avvio…**), perché a quell'ora nessuno sceglie i file. Serve Automata installata. |

**Quando** si fa:

- **Una volta**: data e ora.
- **Ripeti**: **Ogni** *n* minuti, ore, giorni, settimane, mesi o anni. Con minuti e ore puoi limitare ai giorni della settimana e a una fascia (**Solo tra** due orari). Con i giorni scegli uno o più orari. Con le settimane scegli i giorni (lunedì, giovedì…). Con i mesi scegli il giorno del mese, anche l'ultimo, oppure «il secondo martedì»; con gli anni anche il mese. Poi **Dal**, il **Fuso orario** (di serie quello di questo browser) e la **Fine**: mai, in una data, o dopo un numero di volte.
- **Avanzato (cron)**: una riga come quelle di cron: minuto, ora, giorno del mese, mese, giorno della settimana. Per esempio `0 2 * * 0` è ogni domenica alle 02:00.

A destra la finestra mostra sempre la regola in parole e le prossime volte. Il tempo minimo tra due volte è un minuto (chi gestisce lilOS può alzarlo). Ogni utente può avere fino a 100 operazioni (anche questo limite lo decide chi gestisce lilOS).

**Ora legale.** Le ore sono quelle dell'orologio del fuso scelto. Se un'ora non esiste (le 02:30 del giorno in cui gli orologi vanno avanti) l'operazione parte quando gli orologi sono andati avanti (le 03:00). Se un'ora c'è due volte (quando tornano indietro) parte la prima volta. Gli intervalli di minuti e ore senza fascia contano il tempo vero: 60 minuti sono sempre 60 minuti.

**Opzioni**:

| Opzione | Cosa decide |
| --- | --- |
| **Nome** | Come si chiama nell'elenco. |
| **Se a quell'ora il kernel era spento** | **Eseguila una volta appena riparte** (di serie) oppure **Saltala**. Vedi sotto. |
| **Chiedi prima di eseguirla quando apri lilOS** | Solo per le operazioni che girano nel browser (di serie sì). |
| **Se la volta prima è ancora in corso** | **Salta questa** (di serie), **Aspetta che finisca** o **Falle andare insieme**. |
| **Fermala dopo** | Dopo quanti minuti si interrompe (di serie 60). |
| **Se non riesce, riprova** | Quante volte (da 0 a 5, di serie 0) e dopo quanti minuti. |
| **Avvisami con una notifica** | **Solo se non riesce** (di serie), **Ogni volta** o **Mai**. |
| **Attiva subito** | Se lo spegni, l'operazione resta in pausa finché non la riattivi. |

### Dove gira un'operazione

- **Nel kernel** (promemoria, servizio, copia, comando, richiesta web, collezione di NetTest): la fa il computer su cui gira lilOS, anche con il browser chiuso, **come l'utente a cui appartiene** e con i suoi file e le sue connessioni.
- **Nel browser** (aprire un'app o un file, automazione): serve lilOS aperto in una scheda. Se a quell'ora una scheda c'è, l'operazione parte; se non c'è, **aspetta**. Alla prossima apertura di lilOS parte subito, oppure compare la finestra **Operazioni in attesa**, che per ognuna dice cosa era prevista e quando, e offre **Esegui ora** e **Salta** (con la casella «D'ora in poi esegui senza chiedere», che toglie la domanda per quell'operazione). Quelle a cui non rispondi restano in attesa fino alla prossima apertura, poi scadono. Una che aspetta più di 12 ore dall'ora prevista (un amministratore può cambiare il limite) viene saltata.

### Se il kernel era spento

Se il computer di lilOS era spento o in sospensione quando era l'ora, la volta persa si **recupera una sola volta**, appena lilOS riparte, purché siano passate meno di 12 ore (un amministratore può cambiare il limite). Anche se si sono perse dieci volte, parte una volta sola. Con l'opzione **Saltala** non si recupera niente. Nello storico la riga dice «Era prevista…: il kernel era spento».

### Notifiche

- Un'operazione che **non riesce** manda una notifica con il motivo (di serie; si cambia nelle Opzioni di ogni operazione). Un clic sulla notifica apre lo Storico a quella corsa.
- Un promemoria è la notifica stessa: non ne arriva un'altra che dice «riuscita».
- Se un amministratore crea, cambia, mette in pausa, sposta, esegue o elimina una tua operazione, ricevi una notifica che lo dice.

### Dal File Manager e dalla scrivania

Il tasto destro su un file o una cartella ha il sottomenu **Pianifica**, che apre la finestra di una nuova operazione già compilata:

- su una cartella: **Copia questa cartella…**, **Comando in questa cartella…**, **Aprila…**;
- su un file: **Apri questo file…**, oppure, se è un'automazione, **Esegui questa automazione…**;
- su qualunque elemento: **Promemoria su questo…**.

### Amministratori

Un amministratore vede e può fare tutto: le operazioni di tutti gli utenti e quelle del **Sistema**. Nei filtri compaiono i gruppi **Sistema** e **Utenti**. Quando crea un'operazione sceglie **Esegui come**: sé stesso, un altro utente o il Sistema.

- Un'operazione di un utente gira con i file e le connessioni di quella persona: **chi la cambia agisce al suo posto**. Per questo il proprietario riceve una notifica ogni volta (vedi sopra), e il riquadro dell'operazione lo ricorda.
- Un'operazione del **Sistema** non ha una home: può solo mandare promemoria a tutti gli amministratori, avviare servizi e fare richieste web senza file. Niente copie, comandi, collezioni di NetTest, app o automazioni.
- Le operazioni di un utente tolto da lilOS vengono eliminate; quelle di un'app tolta, con lei.

### Altre app

Le app possono creare le proprie operazioni (promemoria, i propri servizi, aprire sé stesse) e, se chi le installa concede il permesso, vedere o spostare quelle di tutti: per esempio un calendario. Nell'elenco un'operazione fatta da un'app è segnata «creata da…».

### AppStore: Controlla gli aggiornamenti

Con lilOS dalla 1.19.0 e l'AppStore 1.7.0, in **AppStore → Opzioni** il controllo degli aggiornamenti è un'operazione di Pianificazione: l'interruttore **Controlla gli aggiornamenti** la accende e il menu **Ogni quanto** la imposta su **Ogni giorno alle 09:00** o **Ogni lunedì alle 09:00**; **Cambiala nella Pianificazione** apre la finestra per scegliere altro. Se prima avevi scelto di controllare «all'avvio», la scelta passa in un'operazione giornaliera la prima volta che apri l'AppStore.

### Pianificazione e avvio da sola di Automata

Anche **Automata** può far partire da sola un'automazione (vedi [Avvio da sola](#avvio-da-sola)), ma solo **quando entri** o **quando arrivano file in una cartella**. A un'ora o ogni tot minuti la fa partire la Pianificazione: Automata ti porta lì con **Pianifica…**, e le vecchie partenze a un'ora di Automata ci passano da sole.

Un'automazione fatta partire dalla Pianificazione gira nel browser: se lilOS è chiuso aspetta che tu lo apra. Gira come quelle che partono da sole: in silenzio, o nella finestra **In esecuzione** di Automata se chiede qualcosa; se un passo non riesce, nello **Storico** risulta non riuscita.

### Da sapere

- Le operazioni restano dopo il riavvio di lilOS e dopo gli aggiornamenti. Si salvano sul computer di lilOS, non nel browser.
- Un comando o una copia **fanno davvero** quello che dicono, anche quando non guardi: provali prima a mano con **Esegui ora**, specie **Specchio**, che toglie file, e i comandi che cancellano.
- Il comando **in lilOS** usa la shell del Terminale (serve il Terminale 1.5.0 o successivo): non apre app né finestre, non legge i file protetti da un'app (per esempio cifrati con FileCrypt) e non legge `~/.bashrc`. Può durare quanto il **Tempo massimo** dell'operazione (nel passo **Opzioni**, di serie 60 minuti). **Annulla**, o il tempo che scade, lo fermano come farebbe Ctrl+C: nello Storico resta quello che aveva scritto fino a lì. Servono il Terminale **1.7.0** e il modulo **services-isolate 1.2.0** (AppStore → Kernel): con le versioni di prima un comando dura al massimo 60 secondi e Annulla non lo ferma davvero. Su un host SSH servono la password o la chiave salvata nell'host e la chiave del server già confermata: collegati una volta dal Terminale (o dalla Rete, con una connessione SFTP allo stesso server e porta). Un comando fermato da un segnale (per esempio `kill -9`) risulta non riuscito, con il nome del segnale: serve il modulo **ssh** (AppStore → Kernel).
- Le operazioni **nel browser** non partono se non c'è lilOS aperto.
- I file cifrati da un'app (per esempio FileCrypt) non si aprono né si sovrascrivono da un comando, da una copia o da una richiesta web che salva la risposta: l'operazione risulta non riuscita.
- Una richiesta web che viene mandata a un altro sito (un reindirizzamento) lascia a casa le chiavi segrete, i cookie e `Authorization`, e se ha un corpo da mandare non viene seguita. Se cambi l'indirizzo di una richiesta con una chiave segreta salvata, devi scrivere la chiave di nuovo.
- Una **collezione di NetTest** cerca il file per il suo posto nella tua home: se lo cancelli, l'operazione non riesce. Per la rete e i certificati vale quello che si dice di NetTest, e gli script delle richieste girano solo se c'è il modulo `services-isolate`.
- Le operazioni fatte da un'**app** hanno limiti più stretti: al massimo 20 per app e mai più spesso di ogni 15 minuti. Se un'app ti propone un'operazione, la finestra dice «Proposta da» e il nome dell'app: controllala prima di crearla.
- Per ogni utente girano insieme al massimo 2 operazioni (di serie): le altre aspettano il loro turno. Gli altri limiti (corse conservate nello storico di ogni operazione, dimensione dei resoconti) li decide chi gestisce lilOS.
- Le operazioni partono a un'ora, non quando succede qualcosa: per l'arrivo di file in una cartella o per l'accesso usa l'avvio da sola di Automata (vedi sotto). Un calendario non c'è ancora.

## Note adesive

**Note adesive** sono foglietti colorati che attacchi sulla scrivania e su cui scrivi direttamente lì. Servono per un promemoria, una lista della spesa, un numero di telefono. Non ci sono di serie: un amministratore le installa dall'[AppStore](#lappstore), categoria **Produttività**. Serve lilOS dalla 1.31.0. Per i promemoria serve anche la [Pianificazione](#pianificazione), che c'è già.

### Creare e scrivere una nota

- Tasto destro su un punto vuoto → **Nuovo** → **Nota adesiva**. La nota compare dove hai fatto clic, pronta da scrivere. Se Note adesive non è installata, la voce non c'è.
- **Doppio clic** sulla nota (oppure **Invio** se è selezionata) per scrivere. Per smettere premi **Esc**, il pulsante **Fine** o fai clic fuori: la nota si salva da sola. Una nota nuova lasciata vuota sparisce.
- La **prima riga** è il titolo.
- Mentre scrivi vedi il testo com'è davvero, con i segni come `- [ ]`. Quando smetti, la nota li mostra in forma pulita.

### Elenchi e caselle da spuntare

- `- ` all'inizio di una riga fa un elenco puntato.
- `- [ ] ` fa una casella da spuntare. Puoi usare anche i pulsanti nella barra sopra la nota.
- Le caselle si spuntano con un clic anche senza scrivere.
- `**parola**` è in grassetto (o **Ctrl B**).

### Colore e misura

La barra sopra la nota e il suo menu (tasto destro) hanno sei colori: giallo, rosa, verde, azzurro, viola, arancione. Per cambiare la misura trascina l'angolo in basso a destra, oppure scegli **Misura** nel menu: Piccola, Media, Grande. Il menu ha anche **Copia il testo**.

### Promemoria

La campanella (o **Promemoria…** nel menu della nota) propone **Tra un'ora**, **Stasera**, **Domani mattina**, **Lunedì prossimo**, oppure una data e un'ora a scelta. A quell'ora arriva una [notifica](#le-notifiche); con un clic sulla notifica lilOS ti porta alla nota. Il promemoria parte anche quando lilOS è chiuso nel browser, ma la notifica la vedi quando lo riapri. Con **Togli** lo cancelli. Se la Pianificazione non c'è, la campanella non compare.

### Sulla scrivania

Le note si selezionano, si spostano, entrano nelle [workarea](#le-workarea) e vanno nel [Cestino](#il-cestino) come le icone. **Riordina icone** non le muove: restano dove le hai messe. Da lontano si legge solo il titolo, più grande; ancora più lontano resta il foglietto colorato (anche nella mappa in miniatura).

### La finestra Note adesive

Dal menu di avvio si apre una finestra con **tutte** le note, di ogni workspace. Cerchi nel testo e filtri per workspace, colore o promemoria. Su ogni nota:

- **Mostra** ti porta alla nota, cambiando workspace se serve;
- **Porta qui** la sposta sulla scrivania che stai guardando, al centro della vista (**attenzione**: la nota lascia l'altro workspace);
- **Nuova nota** ne crea una al centro della vista e riduce a icona la finestra, così vedi la nota mentre scrivi.

### Le note sono file

Ogni nota è un file di testo con estensione `.sticky` nella cartella Scrivania. Lo vedi nel [File Manager](#il-file-manager) (anche con l'anteprima), lo apri con l'[Editor](#leditor) e lo copi o lo cerchi come gli altri. Il colore, la misura e il promemoria non stanno nel testo: sono dati che l'app tiene sul file.

### Da sapere

- Le note si mostrano così solo se **Note adesive è l'app che apre i file `.sticky`** (Pannello di controllo → Usabilità → Tipi di file). Se la togli o ne scegli un'altra, le note tornano a essere icone di file; il testo non si perde.
- Se hai già personalizzato il menu **Nuovo** (Pannello di controllo → Usabilità → [Menu contestuale](#menu-contestuale)), la voce **Nota adesiva** non compare da sola: ripristina il menu o aggiungila a mano.
- La notifica di un promemoria ha un solo clic, che mostra la nota: non ci sono «Rimanda» né «Fatto».

## Logic Studio

**Logic Studio** serve a costruire piccoli programmi senza scrivere codice: si mettono dei **blocchi** su un foglio e li si **collegano** tra loro. I dati passano sui collegamenti e ogni blocco fa la sua parte: un blocco somma due numeri, uno aspetta un secondo, uno ti manda una notifica, uno scrive una riga in un file. Con le **finestre** del progetto (pulsanti, campi, indicatori, grafici) il programma ha anche un'interfaccia, e si può trasformare in un'app.

Un programma di Logic Studio può girare **anche quando lilOS è chiuso nel browser**: lo fa il computer su cui gira lilOS. Per questo, prima di attivarne uno, leggi «[Da sapere](#da-sapere-8)».

Logic Studio non c'è di serie. Serve lilOS dalla 1.37.0 (dalla 1.40.0 per la documentazione, vedi «[La documentazione](#la-documentazione)»; dalla 1.48.0 per i testi e le forme, vedi «[Testi e forme sul foglio](#testi-e-forme-sul-foglio)»; dalla 1.49.0 per gli argomenti e il codice di uscita, vedi «[Programmi da riga di comando](#programmi-da-riga-di-comando)») e l'app **Logic Studio IDE** (categoria **Sviluppo**), che un amministratore installa dall'[AppStore](#lappstore): l'AppStore installa con lei anche le parti che le servono (il motore e i blocchi di base). Altri blocchi arrivano con altri pacchetti dello stesso AppStore, nella scheda **Kernel**: liste e matrici, grandezze e unità di misura, i segnali (generatori, FFT, filtri, modulazione), geometria solida e geometria piana, trigonometria, funzioni e derivate, integrali, analisi numerica (campionare una funzione, serie, equazioni differenziali, interpolazione, regressione, numeri complessi), i blocchi di lilOS (notifiche, file), la rete, l'hardware del computer (porte seriali, USB, webcam, audio…), i database, le componenti delle finestre e i grafici. I blocchi dei database e le password cifrate nelle Proprietà chiedono lilOS dalla 1.50.0 e l'IDE dalla 1.15.0 (vedi «[I database](#i-database)»); i blocchi dell'hardware chiedono lilOS dalla 1.51.0 e l'IDE dalla 1.16.0 (vedi «[L'hardware](#lhardware)»).

### Le parole

| Parola | Cosa vuol dire |
| --- | --- |
| Blocco | Un pezzo che fa una cosa: un calcolo, un confronto, una pausa, una scrittura su un file |
| Porta | Un punto del blocco dove entra (a sinistra) o esce (a destra) un valore |
| Collegamento | Il segno che porta il valore dall'uscita di un blocco all'ingresso di un altro |
| Schema | Un foglio di blocchi collegati |
| Finestra | Un'interfaccia fatta di componenti (pulsanti, campi, grafici…) che il progetto mostra a chi lo usa |
| Progetto | Uno o più schemi e finestre, con le loro opzioni: è una cartella |
| Console | Un posto dove il programma scrive righe e fa domande |

Ogni blocco ha anche una porta **Exception**: esce un valore da lì quando il blocco non riesce a fare il suo lavoro (per esempio una divisione per zero). Se non la colleghi a niente, l'errore compare nella console principale. Nel disegno l'Exception è **rossa** ed è **nascosta** finché non la mostri (vedi sotto). Per gestire gli errori ci sono i blocchi della categoria **Eccezioni**: **Catch (cattura)** sceglie quali errori gestire (per un testo nel messaggio, un'espressione, un blocco o un tipo di blocco), **Dati di Exception (e.message…)** ne legge il messaggio, il blocco, lo schema e il momento, **Throw (lancia Exception)** lancia un errore tuo o rilancia quello che arriva, e **Catch globale (onerror)** riceve tutti gli errori che nessuno ha collegato, dello schema o di tutto il programma (dalla 1.3.0 dei blocchi di base).

### Aprire Logic Studio

Apri **Logic Studio IDE** dal menu di avvio. Si apre sulla **Home**:

- **Nuovo progetto** crea una cartella con il nome che scegli dentro la cartella **Logic Studio** della tua home, con uno schema e una finestra già pronti. Dentro ci sono le cartelle **schemi**, **ui** e **risorse** (per immagini e altri file da usare nelle finestre).
- **Apri…** apre un progetto (`.lsproj`) o uno schema da solo (`.lsch`). Un doppio clic su questi file, dal [File Manager](#il-file-manager) o dalla scrivania, apre Logic Studio.
- **Recenti** elenca gli ultimi progetti aperti.
- **I miei programmi** elenca i tuoi programmi in esecuzione: prove, programmi attivi, app. Per ognuno puoi **Apri la finestra**, **Apri il progetto** e **Ferma**; un programma fermo si toglie dall'elenco con **Togli**.
- **Quello che uso** mostra quanti programmi attivi, prove, richieste di rete e quanto registro stai usando rispetto al tuo limite.

La Home è una scheda come le altre: si chiude con la sua × o con il clic del tasto centrale. Per riaprirla usa **Home** nella barra in alto (o il pulsante che compare quando non c'è nessuna scheda aperta).

Dentro Logic Studio il **tasto centrale** del mouse vale solo per Logic Studio: sposta la vista dello schema o chiude una scheda, ma non sposta mai la scrivania né la finestra.

Con un progetto aperto la finestra ha, a sinistra, le schede **Progetto** (l'elenco di schemi, finestre e risorse, con le sottocartelle che vuoi) e **Blocchi** (o **Componenti**, quando disegni una finestra); al centro i fogli aperti, ognuno in una scheda; a destra **Proprietà** di quello che hai selezionato; in basso le **console** del programma e i **Problemi**. Puoi allargare o stringere i pannelli laterali trascinando la barra tra loro e il foglio, e **comprimerli** come quello delle console: la freccia nella loro intestazione li riduce a una striscia stretta con le schede scritte in verticale, e la freccia della striscia (o un clic su una scheda) li riapre. Lo stato resta alla prossima apertura.

### Disegnare uno schema

1. Nella scheda **Blocchi** scegli un blocco (c'è una ricerca in alto): un clic lo mette in mezzo al foglio, trascinandolo lo metti dove lo lasci. I blocchi sono divisi per tipo: valori, logica, matematica, testo, oggetti, liste, matrici, unità di misura, tempo, console, porte di schema, lilOS, rete, database, eccezioni, disegno. Un clic sul nome di un tipo lo comprime o lo riapre (con il tasto destro: **Comprimi tutte**, **Espandi tutte**); le categorie compresse restano tali alla prossima apertura.
2. Per **collegare** due blocchi, trascina da un'uscita (a destra) a un ingresso (a sinistra). Per togliere un collegamento, trascina l'estremità dell'ingresso via, oppure selezionalo e premi **Canc**. Le porte di tipo diverso si possono collegare, ma il collegamento è segnalato se i tipi non vanno d'accordo.
3. Seleziona un blocco per cambiarne le **Impostazioni** nella barra **Proprietà**: per esempio quanti secondi aspettare, o il testo di una domanda. Lì puoi anche dargli un'**Etichetta**, cioè un nome tuo.
4. Alcuni blocchi (AND, OR, Somma, Template, Switch · Case, Print…) permettono di **aggiungere ingressi o uscite**: sempre dalla barra **Proprietà**, con **Aggiungi ingresso** o **Aggiungi uscita**; si possono rinominare, spostare su e giù e togliere con **Togli**. Le porte aggiunte hanno il nome in corsivo. Togliere una porta toglie anche i suoi collegamenti, ma **Ctrl Z** li rimette.
5. Le porte che non usi si possono **nascondere**: nella barra **Proprietà**, accanto a ogni porta, l'**occhio** la nasconde nel disegno (occhio barrato) o la mostra di nuovo. Una porta **collegata** non si nasconde: il suo occhio è spento finché non togli il collegamento. La porta **Exception** parte nascosta (tranne nel blocco **Throw**, dove è l'unica uscita): per collegarla premi prima il suo occhio. Anche alcune porte che servono di rado partono nascoste, per esempio **invia** e **imposta** di **Costante · Variabile**. Nascondere una porta cambia solo il disegno: un ingresso nascosto tiene il suo valore all'avvio.
6. Per ogni ingresso, nelle **Proprietà**, scegli se **lo avvia** (se arriva un valore, il blocco lavora) e se ha un **valore iniziale** da quando parte il programma. Un ingresso che non avvia il blocco serve solo a tenere un valore da usare quando il blocco parte per un altro ingresso.

I nomi dei blocchi richiamano le funzioni equivalenti dei linguaggi di programmazione: **If · Else**, **Switch · Case**, **Intervallo (setInterval)**, **Ritardo (setTimeout)**, **Print (console.log)**, **Push · Unshift**, **readFile**… (dalla 1.1.0 dei pacchetti di blocchi; gli schemi salvati prima non cambiano).

Il blocco **Costante · Variabile** dà un valore (numero, testo, sì/no o JSON). Di serie è una **costante** e il valore esce all'avvio dello schema. Ha due ingressi nascosti, che mostri con l'occhio nelle Proprietà:

- **invia**: se lo colleghi, il valore non esce più all'avvio ma solo a ogni impulso che arriva;
- **imposta**: se lo colleghi, il blocco diventa una **variabile**: il valore che arriva (convertito nel tipo scelto) prende il posto di quello attuale. Esce subito, oppure al prossimo impulso su **invia** se è collegato. Il valore delle impostazioni è quello di partenza.

Sul foglio: trascina lo sfondo per selezionare con un rettangolo; per spostare la vista tieni premuto **Spazio** (o usa il tasto centrale del mouse) e trascina; la **rotella** ingrandisce e rimpicciolisce; **Adatta** mostra tutto il foglio; **Allinea** (con almeno 2 blocchi selezionati) li mette in fila: in orizzontale sui bordi a sinistra, sui centri o sui bordi a destra, in verticale sui bordi in alto, sui centri o sui bordi in basso, oppure (da 3 blocchi) li **distribuisce** con lo stesso spazio fra l'uno e l'altro; si annulla con Ctrl Z. Con il foglio in primo piano: **Canc** elimina quello che hai selezionato, **Ctrl A** seleziona tutto, **Ctrl D** duplica, **Ctrl G** raggruppa, **Ctrl Maiusc G** scioglie i gruppi, le **frecce** spostano, **Esc** toglie la selezione. Tasto destro su un blocco: **Duplica**, **Etichetta…**, **Allinea** (con più blocchi selezionati), **Raggruppa**, **Aggiungi al gruppo**, **Togli dal gruppo**, **Elimina il blocco** (i gruppi: vedi «[Gruppi di blocchi](#gruppi-di-blocchi)»); su un collegamento: **Elimina il collegamento**; sul foglio: **Aggiungi un blocco qui**, **Seleziona tutto**. **Ctrl Z** e **Ctrl Y** annullano e ripetono, **Ctrl S** salva tutto.

Un blocco che viene da un pacchetto che non è installato è segnato con **Manca il pacchetto**: installalo dall'AppStore, oppure togli il blocco.

### Testi e forme sul foglio

Per spiegare uno schema puoi scrivere sul foglio e disegnarci sopra. Nella scheda **Blocchi**, nella categoria **Disegno**, ci sono due pezzi:

- **Testo · Commento (// nota)**: un testo libero, per esempio una nota per te o per chi leggerà lo schema. Puoi scegliere dimensione, colore, sfondo, grassetto, corsivo, sottolineato, allineamento e larghezza.
- **Forma**: un rettangolo (anche con gli angoli arrotondati), un'ellisse o un cerchio, un rombo, un triangolo, una linea o una freccia. Scegli colore e spessore della linea, se è continua, tratteggiata o a puntini, il riempimento e un testo da scrivere dentro.

Questi pezzi **non hanno porte e non fanno niente**: il programma li ignora. Stanno sotto i collegamenti e i blocchi, così puoi, per esempio, disegnare un riquadro attorno a un gruppo di blocchi. Si spostano, si copiano e si eliminano come i blocchi.

- **Scrivere il testo.** Doppio clic sul pezzo, oppure tasto destro e **Scrivi il testo**. Con **Ctrl Invio**, o con un clic fuori, il testo resta; con **Esc** torna com'era.
- **Cambiare la grandezza.** Seleziona il pezzo e trascina la maniglia in basso a destra: la grandezza va a scatti di 10 pixel, e con **Alt** premuto è libera. Di un testo cambia solo la larghezza. Un solo **Ctrl Z** annulla tutto il ridimensionamento.
- **Le proprietà.** Nelle **Proprietà** compaiono solo le impostazioni del pezzo (niente etichetta e niente porte). I colori hanno un selettore e un campo di testo; **vuoto vuol dire il colore del tema**, che segue il tema chiaro o scuro.
- Una forma **senza riempimento** si afferra solo dalla sua linea: il suo interno resta libero per i blocchi che ci metti sopra.
- I pezzi di disegno contano nel numero massimo di blocchi di uno schema.

Anche le finestre dei progetti hanno **Testo formattato** e **Forma** (categoria **Disegno** della scheda **Componenti**), con le stesse scelte. Il testo e il colore del testo, e il riempimento, il colore della linea e il testo della forma, li può cambiare uno schema collegato al loro oggetto. Un colore che arriva da uno schema vale solo se è scritto come `#336699`, `rgb(…)`, `hsl(…)` o con un nome semplice come `red`; altrimenti si usa il colore del tema.

### I database

I pacchetti dei database portano blocchi per leggere e scrivere dati in un database. Si installano dall'[AppStore](#lappstore), nella scheda **Kernel**, e nella scheda **Blocchi** stanno nella categoria **Database**. Ogni blocco ha un nome che comincia con la famiglia: «SQL · », «MongoDB · », «Redis · », «InfluxDB · », «Elasticsearch · ».

| Pacchetto | Database |
| --- | --- |
| Database SQL | PostgreSQL, MySQL e MariaDB, SQL Server, SQLite (un file della tua home), Oracle, ClickHouse |
| MongoDB | MongoDB |
| Redis | Redis |
| InfluxDB | InfluxDB |
| Elasticsearch | Elasticsearch e OpenSearch |

**Come si usano.**

1. Metti il blocco di **connessione** del tuo database (per esempio «SQL · PostgreSQL (connect)») e scrivi nelle **Proprietà** indirizzo, porta, nome del database e utente.
2. Collega la sua uscita **connection** agli altri blocchi dello stesso database. La connessione resta aperta finché il programma gira e si chiude da sola quando il programma si ferma.
3. Aggiungi i blocchi che servono. Per i database SQL, **Query** esegue una richiesta SQL con parametri scritti come `:nome` (i valori arrivano da ingressi con quel nome, mai incollati nel testo, e così non si rompono con apici e virgolette); **Leggi tabella**, **Inserisci**, **Aggiorna** ed **Elimina** fanno lo stesso senza scrivere SQL; **Transazione** raggruppa più modifiche e, se qualcosa va storto, le annulla tutte da sola; **Scorri righe** legge un risultato grande una riga alla volta; **Tabelle e colonne** mostra com'è fatto il database; **Ascolta** e **Notifica** (solo PostgreSQL) mettono in contatto programmi diversi. Anche gli altri pacchetti hanno i loro blocchi (trova, inserisci, aggiorna, elimina, scrivi punti, cerca documenti…); ognuno ha la sua pagina nella [documentazione](#la-documentazione).

**La password.** Nelle **Proprietà** di un blocco di connessione il campo **Password** non mostra mai quello che hai scritto. Dopo averla scritta compare «Salvata, cifrata: scrivi per cambiarla»; se non c'è, «Non impostata». **Cancella** la toglie. La password è **cifrata da lilOS** e nello schema resta solo il testo cifrato: si apre solo per **te**, su **questo** lilOS. Se copi lo schema a un altro utente o a un altro lilOS, la password va riscritta. Alcuni blocchi hanno anche una porta **password** (nascosta di serie) per darla da un altro blocco.

**Le impostazioni lunghe.** Dove serve scrivere più righe (una query, un filtro) le Proprietà mostrano un campo di testo grande, con caratteri a larghezza fissa.

**Cosa non si può fare.**

- I database di lilOS stesso non si raggiungono mai, in nessun modo.
- Di serie non si arriva ai database di **questo computer** né della **rete locale**: solo a quelli su internet. Un amministratore può permetterlo nelle impostazioni del modulo del pacchetto. Lo stesso amministratore può anche spegnere un tipo di database, e fissare quante righe e quanti KB al massimo restituisce un risultato (di serie 10000 righe e 4096 KB), il tempo massimo di un'operazione (30 secondi), quante connessioni aperte può avere ogni utente (10) e quante operazioni al minuto (600).
- **SQLite** apre un file della tua home e lo tiene in memoria mentre lavora; sopra un limite (di serie 1024 MB) non lo apre. Le modifiche si scrivono nel file un attimo dopo.
- **ClickHouse** non ha le transazioni: le modifiche non si possono annullare.
- Come gli altri blocchi che toccano i dati, un programma attivo scrive **davvero** nel database, anche quando non guardi. Prova prima su una copia.

### L'hardware

I blocchi **Hardware** (categoria **Hardware**) fanno usare a un programma i dispositivi del **computer su cui gira lilOS**: le porte seriali (per esempio un Arduino), i dispositivi USB, le webcam, il microfono e gli altoparlanti, la voce che legge un testo, le tastiere e le schede MIDI, le informazioni sul computer (processore, memoria, batteria, dischi, rete), le stampanti e, su Linux, i pin GPIO e il bus I²C (per esempio su un Raspberry Pi). Non sono i dispositivi del computer da cui guardi lilOS nel browser: se lilOS gira su un altro computer, la webcam è la sua. Si installano dall'[AppStore](#lappstore), scheda **Kernel**, e funzionano anche a lilOS chiuso. Il pacchetto chiede lilOS dalla 1.51.0 e l'IDE dalla 1.16.0.

- **Chi può usarli.** Di serie **solo gli amministratori**. Un amministratore può permettere ogni tipo di dispositivo (porte seriali, USB, HID, webcam, audio, MIDI, informazioni di sistema e stampanti, GPIO e I²C) a tutti, o a singoli utenti, nel **Pannello di controllo → Logic Studio → Hardware**. Senza il permesso il blocco esce dalla porta **Exception** con un messaggio che lo dice.
- **Un dispositivo alla volta per programma.** Una porta, una webcam o un dispositivo aperti da un programma non li può usare un altro programma finché il primo non li chiude o non si ferma. Ogni utente ne può tenere aperti al massimo 16.
- **Webcam e registrazioni** (foto, fotogrammi, video, registrazione audio, livello del microfono) usano il programma **ffmpeg**, che deve essere già installato sul computer: lilOS non lo porta con sé. Anche la voce, i suoni, il volume e la stampa usano programmi del sistema operativo; la pagina di ogni blocco dice quali.
- **USB su Windows.** I trasferimenti diretti con un dispositivo USB funzionano solo se il dispositivo ha il driver **WinUSB** (si installa con un programma come Zadig). Le tastiere non si aprono mai; nei trasferimenti USB diretti non si usano nemmeno le memorie di massa, gli hub e i dispositivi HID.
- **Una foto in una finestra.** Il blocco della foto dà anche l'immagine pronta per il pezzo **Immagine** di una finestra (serve il pacchetto delle componenti dalla 1.2.0).
- **Cosa non c'è.** SPI, Bluetooth e i dispositivi del browser (la webcam o il microfono del computer da cui guardi).
- **Non provato.** Webcam e microfoni veri, e Linux e macOS, non sono ancora stati provati su dispositivi reali.

### Gruppi di blocchi

Un **gruppo** raccoglie alcuni blocchi in una cornice, con un nome. Serve a tenere in ordine uno schema grande, a farlo ripartire da capo quando serve e, se vuoi, a farlo lavorare in un **thread a parte**, cioè in una parte del computer tutta sua.

- **Fare un gruppo.** Seleziona i blocchi e premi **Ctrl G**, oppure tasto destro e **Raggruppa**. Un blocco può stare in un solo gruppo; i gruppi non si mettono uno dentro l'altro. Per mettere un blocco in un gruppo che c'è già: tasto destro sul blocco, **Aggiungi al gruppo**, oppure trascinalo dentro la cornice e lascialo lì. Per toglierlo: **Togli dal gruppo**.
- **Sciogliere un gruppo.** **Ctrl Maiusc G**, oppure tasto destro sul gruppo e **Sciogli il gruppo**: i blocchi restano dove sono. **Elimina il gruppo e i suoi blocchi** invece toglie tutto (**Ctrl Z** rimette).
- **Spostarlo.** Trascina la testata della cornice (la barra in alto): i blocchi vanno con lei.
- **Comprimerlo.** Doppio clic sulla testata, oppure **Comprimi** nel menu del gruppo: il gruppo diventa un solo blocco, con il suo nome e solo le porte che hai scelto di mostrare. Doppio clic sul gruppo compresso per riaprirlo. I collegamenti interni non si vedono finché è compresso.
- **Rinominarlo.** **Rinomina il gruppo** nel menu, oppure il nome nelle **Proprietà**. Il menu ha anche **Duplica** e **Documentazione**.

#### La porta Run

Ogni gruppo ha una porta **Run**, di tipo impulso. **I blocchi di un gruppo non partono con il programma: partono quando Run riceve un impulso.**

- Per far partire il gruppo, collega a Run (il pallino sul bordo sinistro della cornice) l'uscita di un blocco **fuori** dal gruppo, per esempio **All'avvio**.
- Per far partire un blocco *dentro* il gruppo dall'impulso, collega a quel blocco il secondo pallino di Run (quello dopo la scritta «Run»).
- Se a Run non è collegato niente, i blocchi del gruppo **non partono mai**; la cornice è tratteggiata per ricordartelo.
- Quando Run riceve un impulso, partono i blocchi che partono da soli (una costante, **All'avvio**, un **Intervallo** che parte da solo, gli ingressi con un valore iniziale) e l'impulso va ai blocchi collegati a Run.
- **A ogni nuovo impulso il gruppo riparte da capo**: i suoi blocchi si fermano, i timer si annullano, quello che i blocchi ricordavano si azzera. I valori già arrivati agli ingressi restano.
- Se arrivano valori a un gruppo che non è ancora partito, restano sugli ingressi e non fanno partire niente.

#### Le porte esposte

Un collegamento che passa dal bordo del gruppo può toccare solo una **porta esposta**. Basta collegare dall'esterno una porta di un blocco del gruppo: si espone da sola, e ha un anello arancione. Anche **Raggruppa** espone le porte dei collegamenti che già attraversano il bordo.

Nelle **Proprietà** di un blocco che sta in un gruppo, accanto all'occhio di ogni porta, il pulsante **Esponi fuori dal gruppo** o **Non esporre** lo fa a mano. **Attenzione:** smettere di esporre una porta toglie i collegamenti che la raggiungono da fuori (prima ti viene chiesto di confermare; **Ctrl Z** li rimette). Nelle Proprietà del gruppo, **Porte esposte** elenca le porte: dai a ognuna il nome che vedrai sul gruppo compresso, spostala su e giù o toglila con **Togli**.

#### In un thread a parte

Con **Esegui in un thread a parte** (nel menu o nelle Proprietà del gruppo) i blocchi del gruppo lavorano separati dal resto del programma. Così un gruppo che calcola a lungo non rallenta gli altri blocchi.

- Ogni utente ha un numero massimo di thread (di serie **4**, lo cambia un amministratore: [Il Pannello di controllo](#il-pannello-di-controllo)). Se non ce n'è uno libero il gruppo gira insieme agli altri e la console principale scrive un avviso.
- Un gruppo in un thread a parte **non può contenere** blocchi **Ingresso** e **Uscita di schema** né oggetti delle finestre: lo schema non parte e ti dice quale blocco toglie. Le Proprietà del gruppo lo avvisano.
- Parte solo se Run è collegata.

#### Impulsi

Un **impulso** è un sì che dura un attimo: la porta manda «sì» e torna subito su «no». Un ingresso che riceve un impulso vale «sì» per l'esecuzione che fa partire, poi torna «no» senza far ripartire il blocco. Se togli **Lo avvia** da quell'ingresso, resta «sì» fino alla prossima esecuzione. Un ingresso impulso non parte mai con «no». Un impulso si può collegare anche a un ingresso sì/no, senza segnalazione. Il valore che vedi sull'uscita impulso, mentre il programma gira, torna «no».

### Più schemi: la mappa

Con il pulsante **Mappa** vedi il progetto intero: ogni schema è un riquadro con le sue **porte**, ogni finestra è un riquadro che dice in quali schemi stanno gli oggetti delle sue componenti. Gli schemi di uno stesso progetto si collegano **solo con le loro porte**: metti in uno schema un blocco **Parametro (ingresso di schema)** o **Return (uscita di schema)** (con un nome, nelle Proprietà), poi nella mappa trascina da un'uscita di uno schema a un ingresso di un altro. Il progetto ha un solo posto per questi collegamenti, la mappa.

### Disegnare una finestra

Le finestre sono nella cartella **ui**. Un progetto ne ha almeno una, la **finestra main**: è quella che si apre dal menu delle applicazioni. Puoi cambiare quale è la main (dal menu dell'elenco, **Rendila la finestra main**, o dalle Opzioni del progetto), ma non toglierla.

Nella barra in alto scegli **Progetta** (per mettere i pezzi) o **Anteprima** (la finestra funziona come quella vera). Nella scheda **Componenti** a sinistra ci sono i pezzi: testo e valori (etichetta, valore, indicatore, spia, barra di avanzamento, immagine, tabella, console), comandi (pulsante, interruttore, casella di spunta, pulsanti di opzione, selezione, cursore, campo di testo, campo numerico, data e ora, elenco, scegli file, colore), contenitori (colonna, riga, griglia, riquadro, schede, area libera, separatore) e i **grafici** (linee, aree, colonne, barre, torta e ciambella, dispersione, istogramma, tempo reale, gradini, mappa di calore, radar, mini linea) e il **disegno** (testo formattato, forma). Un clic su un pezzo lo mette nel contenitore selezionato; trascinandolo lo metti dove mostra la linea blu. Appena aggiungi un pezzo (non un contenitore), Logic Studio chiede **in quale schema** creare il suo oggetto, il blocco logico che lo collega agli schemi: scegli uno schema (propone l'ultimo che hai scelto) o **Nuovo schema…**, poi **Crea il suo oggetto**; con **Dopo** lo crei più tardi dalle Proprietà. Resti sulla finestra che stai disegnando. Le proprietà del pezzo selezionato (testo, minimo e massimo, colori…) sono a destra.

**Come uno schema parla con una componente.** Gli schemi non toccano i pezzi di una finestra direttamente: ogni componente ha il suo **oggetto** in uno schema, un blocco che ne ha le porte. Il titolo dell'oggetto è **UI > nome della componente** (per esempio «UI > Avvia»), così nello schema si riconosce subito che è un pezzo di una finestra; sotto il titolo c'è dove sta (finestra › componente). Quando aggiungi una componente, Logic Studio ti chiede subito in quale schema mettere il suo oggetto. Nelle Proprietà di una componente, **Oggetto nello schema** dice dove sta, e **Crea il suo oggetto** lo mette in uno schema se prima hai scelto **Dopo**. Poi colleghi gli altri blocchi a quello. Le frecce nelle porte dicono il verso: **←** è quello che imposta uno schema (per esempio il testo da mostrare), **→** è quello che fa chi usa la finestra (per esempio «premuto»). Senza il suo oggetto, una componente si vede ma non fa niente. Se elimini una componente, il suo oggetto resta nello schema e segna un errore finché non togli anche quello.

Un pulsante può anche, al clic, **aprire un'altra finestra** del progetto o **chiudere questa finestra** (**Azione al clic**), oltre a mandare «premuto» al suo oggetto. Una finestra aperta una volta non si apre due volte: aprirla di nuovo la porta davanti.

**Dimensione e apertura della finestra.** La finestra che disegni si ridimensiona con il mouse: trascina il bordo destro, il bordo in basso o l'angolo in basso a destra, e un'etichetta mostra la misura mentre trascini (Ctrl+Z la annulla). Con niente selezionato, nelle Proprietà, sotto **All'apertura** scegli come lilOS la apre: **Stato** **Normale** o **Estesa** (grande quanto lo schermo), **Finestra di dialogo** (finché è aperta, le altre finestre dell'app aperte prima non si usano: un clic su di loro porta avanti la finestra di dialogo, che lampeggia; le console e le altre app restano libere) e **Sempre in primo piano**. Nella barra del titolo disegnata delle etichette ricordano le scelte.

### Le console

Un programma scrive righe in una **console** e può fare domande a chi lo usa. Il blocco **Print (console.log)** scrive (con un livello: normale, informazione, avviso, errore); **Input (readline)** fa una domanda e aspetta la risposta, di un tipo che scegli: testo, numero, sì/no, un tasto. Puoi dargli un valore predefinito, un tempo massimo e la richiesta di nascondere quello che si scrive (per le password). Se la risposta non va bene, la domanda si ripete (si può spegnere); **Esc** annulla.

In basso nell'IDE c'è una scheda per ogni console del progetto: la **principale** (con la stella) c'è sempre. Nelle **Opzioni del progetto → Console** puoi aggiungerne altre (fino a 10, con nome e colore), scegliere quante righe tenere, e scegliere **cosa succede fuori dall'IDE**, cioè quando il programma gira senza che l'IDE sia aperto:

| Scelta | Cosa succede |
| --- | --- |
| Mostrale tutte | Ogni console si apre in una finestra quando si apre la prima finestra del progetto |
| Solo quando chiedono un dato | È la scelta di serie: una console si apre quando un blocco fa una domanda, e si chiude dopo la risposta (puoi tenerla aperta togliendo la spunta) |
| Non mostrarle | Le console non si vedono: le domande ricevono il loro valore predefinito (o sono annullate se non ce l'hanno) |
| Tutte nella console principale | Una finestra sola, con ogni riga segnata dal nome della sua console |

Se un programma fa una domanda e nessuna finestra del progetto è aperta, ricevi una **notifica** che apre la console (si può spegnere nelle opzioni). Le righe si possono anche copiare nel **registro** del progetto: niente, solo avvisi ed errori (di serie), o tutte.

### Provare e attivare

- **Prova** (o **F5**) fa girare il progetto **com'è adesso negli editor**, anche se non l'hai salvato. Sui fogli vedi i valori che passano sui collegamenti e i blocchi che lavorano; le console del progetto sono in basso. Una prova si ferma da sola dopo qualche minuto (5 di serie) o quando premi **Ferma** (o F5 di nuovo). Chiudere l'IDE ferma la prova.
- **Attiva** fa girare **il progetto salvato** come **programma attivo**: va avanti anche con l'IDE chiuso e **anche con lilOS chiuso nel browser**, e riparte quando riparte il computer su cui gira lilOS. Se hai modifiche non salvate, l'IDE chiede di salvare. Se il progetto è già attivo, puoi **Sostituire** il programma attivo con il progetto com'è adesso.
- Per fermare un programma attivo usa **Ferma** nella Home (o nel Pannello di controllo). **Non riparte con lilOS finché non lo attivi di nuovo.**

- **Argomenti** (accanto a **Prova**) apre una finestra con una riga di testo: sono gli argomenti che le prove danno al programma, come se lo avviassi dal terminale. Gli spazi li separano; per un argomento con degli spazi usa le virgolette (`-o "Il mio file.txt"`). Quando c'è qualcosa scritto, il pulsante ha un pallino. La riga si ricorda per ogni progetto (gli ultimi 50). Vale solo per le prove: **Attiva** parte senza argomenti.

Se un programma attivo si ferma per un errore, ricevi una notifica. Un programma attivo che usa un blocco di un pacchetto che non è più installato resta in attesa (**Aspetta un pacchetto**) e riparte quando il pacchetto torna.

### Programmi da riga di comando

Un progetto può comportarsi come un programma del terminale: riceve **argomenti** (`report.csv --verbose --port=8080`) e, alla fine, restituisce un **valore**. Nella scheda **Blocchi**, categoria **Programma**, ci sono tre pezzi:

- **Argomenti (argv)**: dà tutti gli argomenti, quelli che non sono opzioni (i «posizionali») e le opzioni già lette (`--port=8080` diventa `port` con valore 8080).
- **Opzione (-x · --nome)**: legge una sola opzione, con il nome corto e il nome lungo. Puoi dire se è un interruttore (c'è o non c'è), se vuole un valore, se il valore è un testo, un numero o sì/no, il valore da usare quando manca e se è obbligatoria.
- **Exit (chiudi il programma · return)**: chiude tutto il programma e dà un valore. Per i dettagli apri la pagina del blocco con il tasto destro → **Documentazione**.

Dove si usano:

- **Nell'IDE**, con il pulsante **Argomenti** (vedi [Provare e attivare](#provare-e-attivare)). Quando un blocco **Exit** chiude la prova, la barra di stato dice «Chiuso dal programma con il valore …» fino alla prova seguente.
- **Da un terminale**, con il comando `lilos logic run` (vedi [Programmi di Logic Studio: logic](#programmi-di-logic-studio-logic)). Serve il motore di Logic Studio dalla 1.6.0.

Un programma attivo chiuso da **Exit** si ferma e **non riparte** quando riparte lilOS. Nel Pannello di controllo e nella Home, un programma lanciato da terminale ha il tipo **Riga di comando**.

### I progetti nel menu applicazioni

I programmi attivi che hanno finestre compaiono nella scheda **Progetti** del [menu di avvio](#il-menu-di-avvio) (la scheda c'è solo se ne hai): un clic apre la finestra main del progetto, senza aprire l'IDE. Le finestre si comportano come quelle delle app, e le console si aprono secondo la scelta fatta nelle Opzioni del progetto. Se il programma si ferma, le sue finestre si chiudono.

Altre due scelte, in **Opzioni del progetto → L'app e le sue finestre**, valgono per tutte le finestre del progetto:

- **Una finestra riaperta mostra subito gli ultimi valori** (acceso di serie): chi riapre una finestra vede gli ultimi valori ricevuti, non una finestra vuota.
- **Le copie della stessa finestra restano allineate** (acceso di serie): la stessa finestra aperta su due schermi o due browser mostra gli stessi valori; un cambiamento su una si vede sull'altra.

Pulsanti, interruttori e cursori mandano qualcosa al programma solo quando qualcuno li usa: quando una finestra si apre non viene «ripremuto» niente.

### Opzioni del progetto

Il pulsante **Opzioni del progetto** (l'ingranaggio) apre una finestra con quattro schede: **Generale** (nome, versione con tre numeri come 1.0.0, descrizione), **Finestre** (la finestra main e, per le altre, **Si apre da**), **Console** (vedi sopra) e **L'app e le sue finestre** (vedi sopra).

In **Finestre** ogni finestra che non è la main può avere un punto d'ingresso: aprire un tipo di file (scrivi le estensioni, per esempio `csv, txt`), una voce nel menu dei file, una chiamata da altre app, o l'ingresso dell'utente. Una finestra senza punto d'ingresso si apre solo da un'altra finestra dell'app (un pulsante con **Apri una finestra**). **I punti d'ingresso funzionano solo nelle app fatte con Crea app**, e per ora quelle app non si installano: quindi, per adesso, non fanno ancora niente.

### Fare un'app: Crea app

**Crea app…** trasforma il progetto in un'app di lilOS. Scegli il nome, un id (lettere minuscole, cifre e trattini), la versione, la descrizione e l'icona con il suo colore. **Crea** prepara l'app; **Crea ed esegui** la prepara e la apre.

L'app **non si installa**. Il suo pacchetto sta nella cartella **App create** della tua home, in una cartella con il suo id, e dentro c'è un file `.lsapp`: **aprendo quel file** (doppio clic) l'app parte, **solo per te**, e dura finché le sue finestre sono aperte; quando chiudi l'ultima, il programma si ferma. Per rifarla dopo aver cambiato il progetto, usa di nuovo **Crea app**: **la cartella dell'app con lo stesso id viene sostituita, non va nel Cestino**, quindi non metterci dentro file tuoi.

L'app gira **con i tuoi permessi**. Se i suoi blocchi usano i file, la rete, le notifiche, gli eventi o l'hardware, prima di partire lilOS apre una finestra con **Esegui** e **Annulla** e ti elenca cosa potrà fare (leggere e cambiare i tuoi file, fare richieste su internet o parlare con dei database, mandarti notifiche, mandare eventi a lilOS, usare l'hardware del computer su cui gira lilOS) e da quale cartella viene. Esegui un'app solo se ti fidi di chi l'ha fatta (o se l'hai fatta tu). Se premi **Esegui**, lilOS non te lo richiede finché quell'app non cambia; se cambia, te lo chiede di nuovo.

L'app ha le finestre del progetto e usa il motore di questo lilOS: serve lilOS dalla 1.37.0, e funziona solo dove sono installati i pacchetti che il progetto usa.

### Il Pannello di controllo

Se il motore c'è, il [Pannello di controllo](#pannello-di-controllo) ha la sezione **Logic Studio**:

| Scheda | Chi la vede | Cosa c'è |
| --- | --- | --- |
| Il mio uso | Tutti | Quanti programmi attivi e prove hai, le richieste di rete di questo minuto, il registro, la CPU e la memoria che puoi usare; i tuoi programmi, con **Ferma** e **Togli** |
| Limiti | Amministratori | I limiti per tutti: programmi attivi e memoria in tutto, esecuzioni di blocchi, tempo massimo di un blocco, durata di una prova, gruppi in un thread a parte per utente, blocchi e collegamenti per schema, schemi, finestre e componenti per progetto, console. Valgono per i programmi che partono dopo |
| Quote | Amministratori | Le quote di ogni utente (programmi attivi, prove, CPU %, memoria, richieste al minuto, registro) e, per un utente, quote sue: una casella vuota vuol dire la quota di tutti; **Predefinita** toglie le quote sue |
| In esecuzione | Amministratori | I programmi di tutti gli utenti, da fermare |
| Hardware | Amministratori | Chi può usare quali dispositivi del computer (porte seriali, USB, HID, webcam, audio, MIDI, informazioni di sistema, GPIO e I²C): un interruttore **Permesso a tutti** per ogni tipo e, per ogni utente, **Come tutti**, **Sì** o **No**. In **Trovati su questo computer** vedi quali librerie e quali programmi del sistema (come ffmpeg) ci sono; **Cerca di nuovo** li cerca un'altra volta. Se il pacchetto non c'è, dice «Il pacchetto Hardware non è installato» |
| Pacchetti | Tutti | I pacchetti di blocchi e componenti installati, con quanti blocchi e componenti danno |

### La documentazione

Logic Studio ha la sua guida, scritta in italiano e in inglese e **dentro l'IDE**: ogni blocco e ogni componente ha una pagina che dice a cosa serve, che porte ha, come funziona e con qualche esempio. Per aprirla:

- premi **F1**: si apre la pagina di ciò che hai selezionato (un blocco, una componente, un collegamento); se non hai selezionato niente, la pagina dell'editor che stai usando;
- fai clic con il tasto destro su un blocco, un collegamento, un punto vuoto dello schema, una componente, una finestra, una voce dell'elenco dei blocchi o dei progetti e scegli **Documentazione**;
- premi il pulsante **?** accanto al nome del blocco nelle **Proprietà**, oppure quello nella barra in alto.

Si apre una finestra con l'indice a sinistra (la guida dell'IDE e poi un gruppo per ogni pacchetto, con i blocchi divisi per categoria) e la pagina a destra. Con le frecce in alto, o **Alt+←** e **Alt+→**, torni alle pagine già viste; la casetta riporta alla pagina iniziale; la ricerca (o **Ctrl+F**) cerca nei titoli. Le pagine sono nella lingua di lilOS; se una non c'è, la vedi in inglese. Le pagine dei blocchi arrivano con il loro pacchetto: se togli un pacchetto, spariscono le sue pagine. La documentazione si può solo leggere.

### Da sapere

- **Un programma attivo fa davvero quello che dice, anche quando non guardi.** Un blocco **writeFile** sovrascrive il file; **appendFile** lo allunga; **HTTP (fetch)** chiama davvero il sito. Provalo prima con **Prova**, con file di prova.
- I blocchi di lilOS lavorano **solo sui file della tua home** (mai la cartella `.config`, né i file protetti da un'app come FileCrypt) e con i tuoi permessi: quello che non puoi fare tu, non lo fa il programma. Si leggono e si scrivono al massimo 5 MB alla volta.
- Il blocco **HTTP (fetch)** non arriva a questo computer né alla rete locale, a meno che un amministratore non lo permetta nelle impostazioni del modulo.
- I blocchi **Hardware** usano i dispositivi del computer su cui gira lilOS e, di serie, li possono usare solo gli amministratori (vedi «[L'hardware](#lhardware)»). Un programma attivo che usa una webcam, una porta seriale o una stampante continua a farlo anche quando non guardi.
- Ogni utente ha dei limiti: un numero di programmi attivi, una parte della CPU e della memoria, e un numero di richieste di rete al minuto. Se un programma supera i limiti, si ferma e ricevi un messaggio.
- Un programma che sembra un ciclo senza fine (più di 10000 esecuzioni di blocchi in 10 secondi, di serie) si ferma da solo.
- Una domanda di console, se nessuna pagina di lilOS è aperta, **aspetta** finché non arriva una risposta o scade il tempo massimo del blocco: il resto del programma va avanti.
- I grafici nel tempo mostrano gli ultimi secondi che scegli; **non si possono ingrandire** con il mouse.
- I testi dell'IDE e dei blocchi sono in inglese e italiano. I testi delle finestre dei tuoi progetti sono quelli che scrivi tu: per ora l'IDE non ha un posto dove tradurli.
- Un elemento eliminato dall'elenco **Progetto** va nel Cestino, e i suoi collegamenti nel progetto vengono tolti.
- Non ci sono ancora: schemi e finestre da disporre sulla scrivania come widget, più copie della stessa finestra, il comando `logic` nell'app Terminale (c'è solo nel comando `lilos`) e le azioni di Automata.

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
- Le finestre senza elenco, come Pannello di controllo, non fanno nulla con Ctrl Z, e non toccano la scrivania dietro di loro.
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

- Tasto destro su un file o una cartella → **Tag → Nuovo tag…**. Si apre il **Pannello di controllo → Tag**: scrivi il nome e premi **Crea** (o Invio). Il nuovo tag viene messo subito sugli elementi che avevi selezionato.
- Oppure apri direttamente il **Pannello di controllo → Tag**: scrivi il nome in **Nuovo tag** e premi **Crea**. Poi lo assegni come descritto sotto.

Il nome può avere al massimo 30 caratteri e non può essere uguale a quello di un altro tag (le maiuscole non contano). Puoi avere al massimo 100 tag. Se il nome è vuoto o già usato, lilOS lo dice con una notifica e non crea nulla. Il nuovo tag prende il primo colore che non stai già usando.

### Assegnare e togliere un tag

Tasto destro su uno o più file o cartelle (sulla scrivania o nel File Manager) → **Tag**. Il sottomenu elenca i tag, ognuno con il suo colore.

- Scegli un tag per metterlo. Se lo scegli di nuovo, lo togli.
- Con più elementi selezionati, un segno di spunta indica un tag che hanno **tutti**. Sceglierlo lo toglie a tutti; se non ce l'hanno tutti, lo mette a tutti.
- I tag compaiono come pallini colorati: in basso a destra dell'icona, sulla scrivania e nel File Manager; dopo il nome, nell'elenco del File Manager. Se sono più di 4 si vede "+" e il numero; passando il mouse sopra si leggono i nomi.
- Le cartelle principali (Documenti, Immagini, Download…) non si possono etichettare.
- Mettere o togliere un tag **non si annulla** con Ctrl Z: se sbagli, ripeti la scelta.

### Colori

Nel **Pannello di controllo → Tag** ogni tag ha il suo riquadro. In **Colore** scegli tra otto colori: rosso, arancione, giallo, verde, verde acqua, blu, viola e grigio. In **Nome** lo rinomini. Le modifiche si vedono subito dappertutto.

### Cercare per tag

In **File Manager**, nella barra a sinistra sotto **Tag**, fai clic su un tag: vedi **tutti gli elementi che lo hanno**, ovunque siano (la tua scrivania e le cartelle condivise). Un file di un altro workspace che non sta nelle cartelle condivise non si vede.

- Nell'elenco vedi Nome, **Posizione** (la cartella in cui sta l'elemento), Tipo e Workspace.
- Puoi cercare per nome, ordinare, aprire, rinominare ed eliminare gli elementi, come in una cartella. Non puoi creare cartelle lì.
- Tasto destro su un elemento → **Mostra nella cartella** apre la cartella dove sta; **Togli il tag «nome»** lo toglie.
- Dalla scheda del tag nel Pannello di controllo, **Mostra nel File Manager** apre la stessa vista.

### Rendere un tag invisibile

Nel **Pannello di controllo → Tag**, spegni **Visibile** per un tag. Da quel momento **gli elementi che hanno quel tag spariscono ovunque**: dalla scrivania, dal File Manager, dai selettori di file e dal pannello dell'Editor. Non sono eliminati: li ritrovi cliccando il tag nel File Manager (nella barra laterale i tag invisibili hanno un occhio barrato; in basso compare «Tag invisibile: questi elementi sono nascosti altrove»). Accendi di nuovo **Visibile** e gli elementi tornano dove erano, anche sulla scrivania.

- Un elemento che prende un tag invisibile sparisce subito. Se gli togli il tag, ricompare.
- Nel menu **Tag**, accanto ai tag invisibili c'è scritto «(nasconde)»: scegliere un tag così fa sparire l'elemento.
- Se nascondi una cartella, quello che contiene non si vede finché la cartella è nascosta (ma non è nascosto di suo). Lo raggiungi dalla vista del tag della cartella e con **Mostra nella cartella**.
- I file nascosti restano al loro posto: se un file è aperto in una finestra, la finestra continua a funzionare.

### Eliminare un tag

Nel **Pannello di controllo → Tag**, nella scheda del tag, **Elimina…** (due clic, il pulsante diventa rosso al primo). Il tag viene tolto da tutti gli elementi; quelli che erano nascosti ricompaiono. I file e le cartelle non vengono eliminati. **Non si può annullare.**

### Cosa non è ancora possibile

- Annullare con Ctrl Z un tag messo o tolto.
- Una scorciatoia da tastiera per i tag.
- Cercare per tag dal menu di avvio: si cerca solo nel File Manager.
- Avere tag diversi in ogni workspace: sono uguali in tutti.

## L'AppStore

L'**AppStore** è l'app dove si vedono le app e i «moduli del kernel» (le parti di lilOS che stanno dietro le quinte, come la gestione degli utenti) che si possono installare, e da dove un amministratore le installa, le aggiorna e le toglie. Da qui si aggiorna anche **lilOS stesso** (vedi [Aggiornare lilOS](#aggiornare-lilos)). Aprilo dal menu di avvio. C'è sempre e non si può rimuovere.

**Chi può fare cosa.** Tutti vedono cosa c'è e cosa è installato. Solo un **amministratore** può installare, aggiornare e rimuovere app, aggiornare lilOS, aggiungere o togliere repository e gestire i moduli del kernel. Chi non lo è vede, al posto dei pulsanti, una scritta («Disponibile», «Installata»…) e non ha la scheda **Kernel**. Fanno eccezione le **lingue**: le può installare, aggiornare e (se le ha installate lui) rimuovere qualsiasi utente (vedi [Lingue](#lingue)).

**Cercare.** In alto c'è una casella di ricerca. Cerca solo nella scheda aperta, e ogni scheda ricorda il suo testo. **Esc** lo cancella.

Sotto la casella ci sono le schede.

### Installati

Le app e i moduli che ci sono, in due gruppi: **App** e **Moduli del kernel**. Ogni elemento è una scheda con icona, nome, versione e descrizione. Per un amministratore ogni app che non è necessaria a lilOS ha il pulsante **Disinstalla**: chiede conferma, poi toglie l'app per tutti gli utenti, con le sue impostazioni e i suoi dati. I file che l'app aveva creato si eliminano, o finiscono nel Cestino se qualcuno li ha modificati; gli altri file restano dove sono.

**Se serve ad altre app.** Un'app o un modulo di cui un'altra app installata ha bisogno **non si toglie**: l'AppStore lo dice («*nome* non si può rimuovere: serve a *altre app*») e ha solo **Chiudi**. Togli prima quelle che lo usano, poi questo. Le parti **facoltative** non bloccano.

**Ciò che non serve più.** Se togli un'app che aveva portato con sé altre app o moduli, e adesso non li usa più nessuno, la finestra di conferma li elenca sotto **Non servono più**, già spuntati: erano stati installati solo per quell'app. Togli la spunta per tenerli. Quelli che avevi installato tu direttamente non compaiono mai. Se con l'app se ne vanno anche dei moduli, l'AppStore chiede **Riavvia ora** o **Più tardi**: i moduli si fermano solo al riavvio del kernel.

### Aggiornamenti

Le novità disponibili, con il loro numero accanto al nome della scheda. Se c'è una versione nuova di lilOS, compare anche qui. Un amministratore, quando sono più di una, trova **Aggiorna tutto**.

### Le categorie

Poi c'è una scheda per ogni categoria che ha almeno un elemento: **Pannello di controllo**, **Produttività**, **Multimedia**, **Sviluppo**, **Altro**. Ogni categoria mette insieme ciò che offrono tutti i repository (un *repository* è un indirizzo da cui lilOS prende app; quello ufficiale c'è sempre, gli altri sono segnati «non ufficiale»). Prima vengono gli elementi da installare, poi quelli già installati.

Ogni scheda mostra icona, nome, versione, a cosa serve, il nome del repository e, se serve, l'etichetta «non ufficiale». Accanto c'è un pulsante o una scritta: **Installa**, **Aggiorna**, «Installata» oppure «Da un altro repository» (c'è già un'app con quel nome, arrivata da un altro posto).

**Un clic su una scheda** apre i dettagli: editore, tipo, categoria, se è «Verificata» o «non ufficiale», versione, da dove viene, i permessi che chiede e le istruzioni scritte da chi l'ha fatta (il file README, se c'è). Se il README è molto lungo se ne vede solo l'inizio: **Scarica il README completo** lo salva nella cartella **Download**, da cui si apre con l'Editor. Se l'app (o il modulo) ha bisogno di altre cose per funzionare, c'è anche la sezione **Ha bisogno di**: per ognuna dice se è già installata, se manca o se funzionerà dopo il riavvio del kernel, e se è facoltativa. Da lì un amministratore può **Installare**, **Aggiornare**, **Cercare aggiornamenti**, **Reinstallare** (rifà l'installazione della stessa versione, senza cancellare niente), **Disinstallare** un'app o **Rimuovere** un modulo; tutti possono **Aprire**. Le app che non si possono togliere (File Manager, Pannello di controllo, AppStore, Pianificazione) sono segnate «Necessaria a lilOS».

Il testo delle istruzioni si mostra in forma semplice: niente pagine web incorporate, i collegamenti si aprono in una nuova scheda del browser e solo se sono indirizzi web, e le immagini non si caricano (si vede il loro testo alternativo).

Prima di installare compare una finestra che dice **cosa potrà fare l'app** (per esempio «Leggere e modificare i file in Home/Documenti/Note»). Se l'app non viene dal repository ufficiale e non è firmata da un editore di cui lilOS si fida, c'è anche un avviso: *non si può sapere chi l'ha scritta né che il codice non sia stato modificato*. **Installa comunque** vuol dire accettare questo rischio: fallo solo se ti fidi di chi la distribuisce. Aggiornando, la finestra compare solo se l'app chiede permessi nuovi o non è ufficiale.

### Installare un'app con ciò che le serve

Alcune app hanno bisogno di altre parti per funzionare: un modulo del kernel (per esempio il protocollo per collegarsi a un tipo di server) o un'altra app. L'AppStore le installa **insieme all'app**, ma prima te lo mostra e aspetta il tuo sì. Vale anche per i moduli del kernel e per gli aggiornamenti.

Premendo **Installa** (o **Aggiorna**), la finestra elenca:

- **Si installa anche**: ciò che serve davvero all'app. Per ogni voce vedi se è un'app o un modulo del kernel, la versione, da quale repository viene e a chi serve. Si installa sempre, insieme all'app.
- **Facoltativi: installare anche questi?**: parti che l'app può usare ma di cui può fare a meno. Ognuna ha una casella: spuntata, si installa; altrimenti no. Se cambi idea, si installa dopo come un'app qualsiasi.
- Un avviso per ciò che **non è verificato**, cioè viene da un repository non ufficiale. Un modulo non verificato girerà nel kernel con accesso completo: installalo solo se ti fidi di chi lo distribuisce. Per installare serve accettare l'avviso.
- I **permessi** che chiedono le app che si installano, come per ogni app.

Se qualcosa che serve davvero **non si può avere** (non c'è nel suo repository, il repository non si apre, nessuna versione va bene), la finestra lo dice e ha solo **Chiudi**: non si installa niente. Una parte facoltativa che non si può avere si segnala soltanto («Ora non disponibili»).

Se un passo non riesce a metà, i pacchetti installati da quell'operazione vengono tolti di nuovo: non resta niente a metà. Gli aggiornamenti già fatti restano.

Un aggiornamento propone solo le parti facoltative **nuove**: su quelle che già conoscevi hai già deciso.

**Il riavvio.** Un modulo del kernel entra in funzione solo dopo il riavvio del kernel. Se tra ciò che hai installato c'è un modulo, alla fine l'AppStore chiede **Riavvia ora** o **Più tardi**. Con **Più tardi** puoi continuare a lavorare, ma l'app che ne ha bisogno **non si apre**: se provi ad aprirla compare un messaggio che dice cosa manca, e lo stesso se manca un'app o un modulo di cui ha bisogno (lo installa un amministratore dall'AppStore). Il riavvio si fa anche più tardi da **Riavvia il kernel**, nella scheda Kernel. Nei dettagli dell'app un avviso dice se aspetta il riavvio («funziona dopo il riavvio del kernel», con il pulsante **Riavvia il kernel** per un amministratore) o se le manca qualcosa («non parte finché non è installato»).

### Kernel

Solo per gli amministratori: i moduli del kernel. Sono parti di lilOS: dove stanno gli utenti, dove stanno i file. **Installa** mostra sempre una finestra di conferma, perché il codice di un modulo ha accesso a tutto: utenti e file di tutti. Dopo ogni installazione, aggiornamento o rimozione compare un avviso con il pulsante **Riavvia il kernel**: le modifiche valgono solo dopo. L'avviso compare anche in Installati e Aggiornamenti. Durante il riavvio (qualche secondo) lilOS può non riuscire a salvare e riprova da solo.

- Se il riavvio da qui non è possibile (il kernel non è stato avviato nel modo previsto), compare un messaggio: chi gestisce lilOS deve riavviarlo a mano.
- Un modulo che lascerebbe lilOS senza file system, o senza accesso mentre lilOS è raggiungibile da altri computer, non si installa e non si rimuove: compare il motivo.
- **Moduli che ne sostituiscono altri.** Alcuni moduli prendono il posto di due vecchi (per esempio `ssh` al posto di `term-ssh` e `netfs-sftp`, `netfs-google` al posto di `netfs-gdrive` e `netfs-gphotos`). Installandoli (o all'avvio, se c'è già) i vecchi escono da soli e il nuovo prende le loro impostazioni, le connessioni salvate e i loro dati; i vecchi non si possono più installare, e nell'elenco compare il nome di chi li sostituisce. Le app che chiedevano i vecchi vanno bene lo stesso.
- **Rimuovere un modulo non cancella i suoi dati** (per esempio gli utenti): restano sul computer del kernel, e compare «i suoi dati restano».
- **Attenzione**: togliere il modulo di accesso o il file system da un lilOS in uso è pericoloso. Fallo solo sapendo cosa succede.
- **Moduli che servono ad altri.** Un modulo di cui ha bisogno un'app (o un altro modulo) installata non si rimuove finché quella c'è, e non si aggiorna a una versione che l'app non accetta. Un modulo si installa anche da solo insieme all'app che lo richiede ([Installare un'app con ciò che le serve](#installare-unapp-con-ciò-che-le-serve)).
- **Moduli obbligatori.** Il modulo `scheduler` (la [Pianificazione](#pianificazione)) viene con lilOS, è segnato «Necessaria a lilOS» e non si rimuove: **Rimuovi** non c'è, e il kernel lo rifiuta. Si aggiorna come gli altri. Se manca dalla cartella dei moduli, o dalla configurazione, il kernel lo rimette da solo all'avvio.

### Aggiornare lilOS

Anche lilOS ha una versione, e le versioni nuove arrivano dal repository ufficiale. In **Installati** (e in **Aggiornamenti**, quando ce n'è una nuova) trovi la scheda **lilOS** con la versione in uso. Un clic apre i dettagli: le novità di ogni versione (il registro delle modifiche), le istruzioni e le versioni di lilOS che sono ancora sul computer. Solo un amministratore può aggiornare.

**Aggiornare.**

1. Apri i dettagli di lilOS e scegli **Aggiorna**.
2. La versione nuova viene scaricata e messa **accanto** a quella in uso, senza toccarla. Compare l'avviso «parte al prossimo riavvio del kernel» con il pulsante **Riavvia il kernel**.
3. Con **Riavvia il kernel** lilOS riparte con la versione nuova. Per qualche secondo può non riuscire a salvare, e riprova da solo. Poi lilOS ti chiede «Riavviare lilOS?»: se accetti, ti chiede di salvare le finestre con modifiche, ricarica la pagina e le finestre si riaprono come erano.

Prima di scaricare, lilOS controlla che la versione nuova funzioni con quello che hai: se un modulo del kernel o un'app installata non è compatibile, l'aggiornamento non parte e il messaggio dice cosa aggiornare prima. Controlla anche che il programma che fa girare lilOS sul computer (Node.js) sia abbastanza recente.

**Se la versione nuova non parte.** lilOS la prova per un massimo di 5 minuti. Se si ferma o non risponde, torna da solo alla versione di prima. Non si perde niente: i tuoi file e le tue impostazioni non fanno parte della versione. Un amministratore trova poi un avviso «Aggiornamento di lilOS non riuscito», con il motivo e le ultime righe del registro del kernel. Puoi riprovare più tardi.

**Se parte.** Un amministratore trova la domanda «lilOS aggiornato alla *versione*», con la versione di prima ancora sul computer. Hai due scelte:

- **Mantieni**: la versione di prima resta, per poterci tornare.
- **Elimina la *versione***: la versione di prima viene cancellata.

Se chiudi la domanda senza rispondere, ricompare la volta dopo.

**Tornare a una versione di prima.** Nei dettagli di lilOS, sotto le versioni conservate, ogni versione che non è in uso ha **Usa questa versione** ed **Elimina**. Con **Usa questa versione** si torna a quella al prossimo riavvio del kernel (**Riavvia il kernel**); anche questo cambio viene provato, e con gli stessi controlli di compatibilità. **Annulla il cambio** rimette la versione in uso, se non hai ancora riavviato. **Elimina** cancella una versione conservata, per sempre. La versione in uso e quella che partirà al prossimo riavvio non si possono eliminare.

**Se hai altre schede aperte.** Quando lilOS riparte con un'altra versione, ogni scheda aperta ti chiede di riavviare lilOS (cioè ricaricare la pagina).

**Se lilOS gira da una copia di lavoro del codice** (lo fanno gli sviluppatori), vedi la versione ma non si aggiorna da qui: si aggiorna con gli strumenti di sviluppo.

### Lingue

La scheda **Lingue** elenca i pacchetti di lingua che il repository ufficiale offre. Un pacchetto traduce i testi di lilOS (scrivania, menu, finestre, messaggi del sistema), **non le app**: ogni app usa la propria traduzione se ce l'ha, altrimenti l'inglese. Come si sceglie e cosa succede lo spiega [La lingua](#la-lingua).

- Ogni lingua mostra il nome nella sua lingua, la versione, se è **In uso** o **Non installata**, chi l'ha installata, e **da destra a sinistra** per l'arabo e l'urdu. Se il repository ha una versione più nuova compare **Aggiornamento disponibile**. Non serve aggiornarle a mano: a ogni avvio (per esempio dopo un aggiornamento di lilOS) lilOS aggiorna da solo le lingue installate per cui il repository ufficiale ha una versione più nuova adatta a quel lilOS, così anche i testi nuovi compaiono nella tua lingua.
- Nei dettagli ci sono il codice della lingua, la versione di lilOS richiesta e il testo di presentazione del pacchetto.
- **Installa** vale per tutti gli utenti, ed è per qualsiasi utente. Dopo l'installazione l'AppStore propone **Usa questa lingua**.
- **Rimuovi** chiede conferma («sarà rimossa per tutti gli utenti di questo lilOS») ed è per chi l'ha installata o per un amministratore; chi la usava torna all'inglese e riceve una notifica. La lingua si può reinstallare quando vuoi.
- Le lingue vengono **solo dal repository ufficiale**: non si installano da repository aggiunti né da una cartella. Se il repository ufficiale è spento nelle **Opzioni**, la scheda non ne elenca.

### Opzioni

Il link **Opzioni**, in basso a destra, apre:

- **Mostra i repository non ufficiali.** Acceso (come di solito), le schede elencano anche ciò che offrono i repository aggiunti. Spento, solo il repository ufficiale. È una preferenza tua.
- **I repository.** L'elenco degli indirizzi da cui lilOS prende app e moduli, con quante app e moduli offre ciascuno, i pacchetti che non sono validi e gli eventuali errori. Quello ufficiale è «Sempre presente». Un amministratore può **rimuovere** un repository (le app già installate restano) e **aggiungerne** uno con **Aggiungi un repository**: l'indirizzo, che deve contenere l'elenco di ciò che offre, e un nome facoltativo. Se un repository non si apre compare «Non raggiungibile» con il motivo (rete, accesso negato…): per un repository privato il computer su cui gira il kernel deve avere l'accesso.
- **Attivare e disattivare un repository.** Ogni repository, anche quello ufficiale, ha un interruttore (dall'AppStore 1.8.0). Spento, l'AppStore non lo legge più: le schede elencano solo quello che offrono i repository attivi, e non propone gli aggiornamenti di ciò che hai installato da lì, nemmeno nel controllo automatico degli aggiornamenti. Spegnere quello ufficiale toglie anche gli aggiornamenti di lilOS. Le app già installate restano e le trovi in **Installati**; nelle altre schede una barra ricorda quali repository sono spenti. È una preferenza tua: gli altri utenti non cambiano, e anche chi non è amministratore la può usare.
- **Ricarica.** Rilegge i repository attivi.

### Aggiornare un'app

Un amministratore aggiorna un'app con **Aggiorna** (o **Aggiorna tutto**), o la riscrive con **Reinstalla**. Un'app aggiornata riparte sempre con il codice nuovo, mai con quello vecchio.

Se l'app ha finestre aperte o lavora in sottofondo, prima compare un avviso con il titolo «Aggiornare *nome*?» (o «Reinstallare»). Dice cosa verrà chiuso: tutte le finestre dell'app, in **tutti i workspace**, comprese quelle secondarie che ha aperto (per esempio le impostazioni), e quello che fa in sottofondo. Hai due scelte:

- **Annulla**: non cambia nulla.
- **Chiudi e aggiorna**: le finestre si chiudono e l'app si aggiorna.

Se una finestra ha modifiche non salvate, lilOS ti chiede cosa fare, una finestra alla volta, mostrandola nel suo workspace. Se rispondi di non chiuderla, l'**aggiornamento non parte** e non cambia nulla. Mentre l'app si aggiorna non si può aprire: compare «si sta aggiornando: un momento».

Se aggiorni l'AppStore stesso, si chiude e si riapre da sola, nello stesso punto, con la versione nuova.

**Quando lilOS chiede di riavviarsi.** Di solito non serve: l'app nuova è pronta subito. Compare l'avviso «Riavviare lilOS?», con i pulsanti **Più tardi** e **Riavvia ora**, solo se:

- l'app dice che per funzionare ha bisogno del riavvio;
- la versione nuova non riesce a partire senza riavviare;
- un modulo del kernel appena aggiornato è stato riavviato e lilOS deve ricaricarsi per usarlo.

Con **Più tardi** puoi continuare a lavorare, ma quell'app **non si apre** finché non riavvii: se provi ad aprirla ricompare l'avviso. Con **Riavvia ora** lilOS ti chiede di salvare le finestre che hanno modifiche, poi ricarica la pagina. Le finestre che avevi aperte si riaprono come erano. Se hai scelto «Più tardi», nell'area di notifica (in basso a destra) resta il pulsante di riavvio descritto qui sotto.

### Quando un'app viene aggiornata altrove

Se un amministratore aggiorna, installa o toglie un'app da un'altra scheda o da un altro computer, lilOS se ne accorge da solo, senza ricaricare la pagina: l'elenco delle app si aggiorna, e le app nuove compaiono nel menu di avvio.

Se l'app aggiornata ha **finestre aperte** da te, quelle continuano a usare la versione di prima. Compare una [notifica](#le-notifiche) e, nell'area di notifica (accanto all'icona delle app che restano attive), un pulsante con una freccia verso il basso. Passandoci sopra si legge «App aggiornate da riavviare». Con un clic si apre un menu con una voce **Riavvia *nome* (*versione*)** per ogni app: lilOS chiude le sue finestre (chiedendo di salvare, se serve) e le riapre con la versione nuova.

Se l'app chiede il riavvio di lilOS, il pulsante è **rosso**, il menu elenca i motivi e offre **Riavvia lilOS**. Finché non riavvii, quell'app non si apre. Il pulsante sparisce quando non c'è più niente da riavviare.

### Dopo un'installazione

L'app compare subito nel menu di avvio per chi l'ha installata, e dopo un istante anche per gli altri utenti e per le altre schede già aperte: non serve ricaricare la pagina.

## App installate

Oltre a File Manager, Editor, Pannello di controllo, AppStore e Pianificazione, che vengono dal repository ufficiale e fanno parte di lilOS, un amministratore può **installare altre app** dall'[AppStore](#lappstore). Un'app installata c'è per tutti gli utenti e per tutti i workspace: compare nel menu di avvio e si apre in una finestra come le altre.

- **Un'app può preparare le sue cose.** La prima volta che incontri un'app nuova, lilOS può creare per te qualche cartella o file di esempio, un collegamento sulla scrivania del workspace in cui sei, un tag. Non sostituisce mai quello che hai già.
- **Un'app vede solo ciò che le è stato permesso.** Per esempio può leggere e modificare soltanto i file di una cartella precisa. Non può leggere il resto della scrivania né gli altri dati di lilOS. I file che apri con l'app sono sempre accessibili all'app. (File Manager, Editor, Pannello di controllo e AppStore sono parte di lilOS e non hanno questo limite.) Questo vale per le app **isolate**, che è come girano di solito: vedi [Isolate e non isolate](#isolate-e-non-isolate).
- **Alcune app lavorano anche senza finestra.** Un'app può avere parti che girano in secondo piano (per esempio per contare le parole delle tue note) e che si avviano da sole quando servono. Si fermano dopo circa 5 minuti senza essere usate. Se un'app deve restare attiva (per esempio perché tiene in memoria qualcosa che ti serve), compare nell'area di notifica un'icona con un fulmine: vedi [Le app che restano attive](#le-app-che-restano-attive).
- **Parla la tua lingua, se può.** Il nome dell'app, i suoi comandi e i suoi testi seguono la lingua scelta in [Pannello di controllo → Lingua](#la-lingua). Se l'app non la conosce, usa l'inglese.
- **Può aggiungere voci al menu del tasto destro.** Un'app può mettere una sua voce nel menu di file e cartelle (per esempio **Cifra…** di [FileCrypt](#filecrypt)) e un piccolo segno sull'icona degli elementi su cui ha lavorato (per esempio un lucchetto). Se l'app non c'è più e l'elemento era suo, l'icona mostra un lucchetto grigio e passandoci sopra leggi quale app serve.
- **Può intervenire quando apri o salvi un file.** Un'app può, per esempio, chiederti una password prima di aprire un file. Le app che lo fanno e l'ordine in cui lavorano si vedono nel **Pannello di controllo → App → Pipe** (vedi [Pannello di controllo](#pannello-di-controllo)). Un'app deve avere il permesso per farlo, e lo vedi nelle sue Proprietà → Permessi.
- **Nasconderla in un workspace.** Nel **Pannello di controllo → Workspace → Questo workspace** ogni app ha un interruttore: spento, l'app sparisce dal menu di avvio e da "Apri con" in quel workspace, e le sue finestre si chiudono (se hanno modifiche non salvate ti viene chiesto). L'app resta installata e negli altri workspace non cambia niente. File Manager, Pannello di controllo e AppStore non si nascondono.
- **Quando l'amministratore la rimuove**, sparisce da tutti i workspace e le sue finestre si chiudono. Quello che l'app aveva creato per te viene tolto; **quello che hai modificato o riempito va nel Cestino** (compare un messaggio con quanti elementi), così non perdi il tuo lavoro. I dati che l'app teneva per sé (le sue impostazioni) si cancellano.
- **L'Editor è un caso a parte.** Se lo rimuovi, i file di testo non hanno più un'app che li apre finché non lo reinstalli. Attenzione: **torna da solo** quando il kernel viene riavviato (anche solo per installare un modulo), a meno che chi gestisce lilOS non lo tolga dall'elenco delle app da installare all'avvio. Per non vederlo basta nasconderlo nel workspace.

### Proprietà di un'app

Per vedere che cosa è un'app: tasto destro sull'app nel menu di avvio → **Proprietà…** (o tasto destro sul suo collegamento sulla scrivania → **Proprietà…**). La finestra ha tre schede:

| Scheda | Cosa c'è |
| --- | --- |
| **Generale** | Nome, descrizione, versione, l'editore (con «Firma verificata», «Verificata: dal repository ufficiale» oppure «Non verificata»), da dove viene, quando è stata installata e aggiornata, e le sue parti: la finestra principale, che si apre quando apri l'app, e le altre (finestre o parti in secondo piano) che avviano il sistema e le altre app |
| **Permessi** | Che cosa l'app può fare, scritto in parole (per esempio «Leggere e modificare i file in Home/Documenti/Note»), com'è stato concesso quando è stata installata |
| **Sicurezza** | Come gira l'app: isolata o no (vedi sotto) |

Una sola finestra di proprietà per app. Se l'app viene rimossa mentre è aperta, si chiude.

### Isolate e non isolate

Un'app installata può girare in due modi.

- **Isolata** (è il modo di lilOS di partenza). L'app è chiusa in una «scatola»: vede solo quello che i suoi permessi le concedono, niente altro di lilOS.
- **Non isolata.** L'app gira dentro la pagina di lilOS: è più veloce, ma **può fare tutto quello che puoi fare tu**, anche quello che i suoi permessi non prevedono (leggere e modificare ogni tuo file, ogni impostazione, e agire come te). Scegli questo modo solo per app di cui ti fidi davvero.

**Solo un amministratore** sceglie come girano le app. Gli altri utenti vedono il modo in uso, senza poterlo cambiare. Ci sono due posti:

- **Pannello di controllo → App → Sicurezza.** L'interruttore **Esegui le app isolate** decide per tutte le app. Sotto, l'elenco delle app installate: per ognuna vedi come gira e se il modo è quello di tutte le altre o una scelta solo sua; il pulsante **Proprietà…** apre la sua scheda Sicurezza.
- **Proprietà → Sicurezza** di una singola app, con tre scelte: **Come le altre app** (segue l'interruttore generale), **Isolata**, **Non isolata**.

Il cambio vale **dalla prossima volta che apri l'app**: le finestre già aperte restano come sono (chiudile e riaprile). Le parti in secondo piano dell'app si fermano subito.

Alcune app hanno un solo modo, e la scheda Sicurezza lo spiega:

- **File Manager, Editor, Pannello di controllo, AppStore e Pianificazione** fanno parte di lilOS e girano sempre dentro lilOS.
- Le **app che sono un sito** (app remote) girano sempre isolate, nel loro sito.
- Le **app scritte per una versione più vecchia** di lilOS girano solo isolate.

### Le app che restano attive

Quando un'app in secondo piano deve restare attiva, nell'area di notifica della barra delle applicazioni compare un'icona con un **fulmine** (con un numero se sono più di una). Ci passi sopra per vedere il nome; con un clic si apre un menu: per ogni app puoi aprire le sue **Proprietà…** oppure **Ferma**. Fermarla interrompe quello che stava facendo e le fa dimenticare quello che teneva in memoria; si riavvia da sola alla prossima richiesta. L'icona sparisce quando non ce ne sono.

Cosa non è ancora possibile: se ripristini la scrivania e i file iniziali un'app non rifà le sue cartelle e i suoi file di esempio.

## FileCrypt

FileCrypt è un'app che **cifra un singolo file con una password**: dopo, il file si apre solo se scrivi la password. Non c'è fra le app che ci sono sempre: la installa un amministratore dall'[AppStore](#lappstore). Il file resta dov'è, con lo stesso nome; cambia solo il contenuto, che nessuno può leggere senza la password (nemmeno chi gestisce lilOS).

> **Se dimentichi la password, il file è perso.** Nessuno può recuperarlo, nemmeno un amministratore. Non si può annullare. Scegli una password che ricordi o che hai scritto in un posto sicuro.

### Cifrare un file

1. Tasto destro sul file (sulla scrivania o nel File Manager) → **Cifra…**.
2. Scrivi la password due volte (almeno 8 caratteri; sotto il campo vedi se è debole o robusta). Sotto **Avanzate** puoi scegliere il metodo di cifratura: quello già scelto va bene per quasi tutti.
3. Premi **Cifra** (o Invio). Il file è cifrato e sull'icona compare un **lucchetto**.

### Aprire un file cifrato

Doppio clic sul file: compare la finestra **Sblocca**. Scrivi la password e premi **Sblocca** (o Invio): il file si apre nell'app di sempre (l'Editor, Photo…). Quando lo salvi, **torna cifrato da solo**. Una password sbagliata dà il messaggio **Password sbagliata**. Se la password è giusta ma compare **La password è giusta, ma il file è stato cambiato o è rovinato**, il file è stato modificato da fuori o si è danneggiato: non si può aprire.

### Bloccare di nuovo

Un file sbloccato resta sbloccato finché non lo blocchi. Si blocca di nuovo:

- con il tasto destro sul file → **Blocca** (anche su più file scelti insieme);
- dalla finestra di FileCrypt (aprila dal menu di avvio): ci sono l'elenco dei file sbloccati, **Blocca** per ognuno e **Blocca tutti**;
- da solo, dopo 15 minuti senza usarlo (non mentre il file è aperto in una finestra). Il tempo si cambia nelle **Impostazioni** della finestra di FileCrypt (**Blocca di nuovo dopo**; **Mai da solo** lo spegne);
- quando esci dal tuo account;
- quando fermi FileCrypt dall'area di notifica (l'icona con il fulmine, poi **Ferma**).

Le finestre che mostrano un file appena bloccato si chiudono; se una ha modifiche non salvate, prima te lo chiede.

### Togliere la cifratura

Tasto destro sul file cifrato → **Rimuovi cifratura…**, poi la password: il file torna in chiaro e chiunque lo veda lo può leggere.

### Copie

Una copia di un file cifrato (per esempio fatta con il comando `cp` del Terminale) resta cifrata e si apre con la stessa password.

### Da sapere

- **Si cifra solo il contenuto.** Il nome, la dimensione, le date e i tag restano visibili a chi vede il file.
- **Se disinstalli FileCrypt**, i file restano cifrati e intatti, ma non si aprono finché non la reinstalli: sulla loro icona compare un lucchetto grigio e, passandoci sopra, leggi quale app serve.
- **Fermare FileCrypt dall'area di notifica** cancella le chiavi e chiude le finestre dei file cifrati (come un blocco: chi ha modifiche non salvate te lo chiede prima). Per riaprire un file serve di nuovo la password.
- **Un file cifrato si può tornare a una versione precedente.** Chi può scrivere il file può rimetterci una sua versione cifrata più vecchia, e FileCrypt non se ne accorge.
- **Se il browser si chiude proprio mentre cifri o togli la cifratura**, può restare un file cifrato che lilOS non riconosce come tale, o l'opposto. Controlla il lucchetto e rifai l'operazione.
- **Il chiaro può restare per un po' in giro.** L'anteprima del File Manager tiene in memoria il contenuto letto finché non cambi selezione. Un modello copiato da un file cifrato con **Nuovo da modello** esce in chiaro. Il comando `cp` del Terminale su un file cifrato bloccato lo sovrascrive. I servizi in sottofondo di lilOS e i comandi pianificati non aprono né sovrascrivono un file cifrato; una copia pianificata di una cartella lo copia così com'è, cioè cifrato.
- **Mentre un file è sbloccato**, un'app che non gira isolata (vedi [Isolate e non isolate](#isolate-e-non-isolate)) lo può leggere. Blocca il file appena hai finito.
- **Le versioni vecchie.** Se il file è stato salvato in chiaro prima di cifrarlo, chi gestisce lilOS può avere copie di sicurezza con quelle versioni. La cronologia dell'Annulla (Ctrl Z) non le rimette.

## Menu contestuale

Nel **Pannello di controllo → Usabilità → Menu contestuale** decidi cosa compare con il tasto destro su un punto vuoto della scrivania.

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
- **Ridurre a icona**: pulsante con il trattino. La finestra sparisce dalla scrivania ma il suo pulsante resta nella barra delle applicazioni.
- **Chiudere**: pulsante con la ×.

Alcune app possono non avere tutti e tre i pulsanti: per esempio una finestra piccola senza il pulsante per ingrandirla. In quel caso anche il doppio clic sul titolo, il pulsante nella barra delle applicazioni o Alt W non fanno quella cosa.

Nella barra delle applicazioni, il pulsante di una finestra la porta in primo piano e la mostra, anche se era ridotta a icona o fuori dalla vista. Se la finestra è già in primo piano, lo stesso pulsante la riduce a icona.

Fai clic su una finestra per portarla davanti alle altre. Mentre una finestra è in primo piano, i tasti come Canc o Ctrl A agiscono sulla finestra e non sugli elementi della scrivania. Fai clic su un punto della scrivania per tornare a usarli sugli elementi.

Ogni app ha di solito una sola finestra: avviandola di nuovo torna in primo piano quella già aperta. Un'app installata può avere anche altre finestre (per esempio una per le impostazioni); ognuna è unica allo stesso modo.

La rotella sopra il contenuto di una finestra lo fa scorrere; Ctrl + rotella fa sempre zoom.

## Le notifiche

Le notifiche sono i messaggi che lilOS e le app ti mandano: ciò che hai appena fatto (per esempio «Spostato «note.txt» in Documenti» o «Annullato: Rinomina»), un'app che non è partita, un aggiornamento da finire, un lavoro in sottofondo che ha finito. Non ci sono altri messaggi sullo schermo: restano tutti in un elenco, così non li perdi se in quel momento non guardavi.

Un messaggio può avere un'etichetta: **Errore**, **Avviso** o **Fatto**. Se lilOS non riesce a conservare una notifica sua (per esempio ne arrivano troppe in un minuto), la tiene comunque nell'elenco fino a quando ricarichi la pagina; poi si perde.

### Quando arrivano

Sopra l'area di notifica, in basso a destra, compare la **barra delle notifiche**. Per ogni notifica vedi chi l'ha mandata (l'app, con la sua icona, oppure lilOS), la data e l'ora, il testo e, se serve, un'etichetta: **Errore**, **Avviso** o **Fatto**.

- **La più nuova sta in cima.** Se ne arrivano altre, la barra cresce fino a 5 notifiche una sopra l'altra. Le più vecchie non si vedono più lì, ma restano nell'elenco.
- **Sparisce da sola** 10 secondi dopo l'ultima arrivata; una linea sotto di lei mostra il tempo che resta. Finché il mouse è sopra la barra, o la tastiera è dentro, resta dov'è.
- **Un clic sulla notifica** apre l'app che l'ha mandata, se la notifica ha qualcosa da aprire (il passaggio del mouse mostra «Apri *nome*»), e la segna come letta. Non consegna mai file all'app: se l'app ne ha bisogno, sceglili tu.
- **La ×** toglie la notifica dalla barra, ma resta nell'elenco.
- **Esc** chiude la barra.
- Se la finestra **Notifiche** è aperta, le nuove vanno direttamente lì e la barra non compare.

I lettori di schermo leggono le notifiche appena arrivano; gli errori interrompono quello che stanno leggendo.

### La campanella e la finestra Notifiche

La **campanella**, nell'area di notifica, mostra quante notifiche non hai ancora letto (9+ se sono più di 9). Un clic apre la finestra **Notifiche**; un altro clic la chiude, se è in primo piano.

- Le notifiche sono dalla più nuova alla più vecchia, **divise per giorno** (Oggi, Ieri, poi la data). In alto vedi quante ne sono conservate e quante sono nuove.
- **Aprire la finestra** le segna come lette. Quelle nuove restano con un puntino finché non la chiudi, e così quelle che arrivano mentre è aperta.
- Un clic su una notifica apre l'app che l'ha mandata, come nella barra.
- La **×** di una notifica la **cancella**.
- **Segna tutte come lette** toglie il numero dalla campanella.
- **Cancella tutte** svuota l'elenco. Non chiede conferma e non si può annullare.

La finestra si apre anche con la scorciatoia **Apri o chiudi le notifiche** (gruppo Generale). Di serie non ha nessun tasto: scegline uno nel Pannello di controllo → Usabilità → Scorciatoie (vedi [Cambiare le scorciatoie](#cambiare-le-scorciatoie)).

### Cambiare come funzionano

Apri il **Pannello di controllo → Notifiche**.

| Voce | Cosa fa |
| --- | --- |
| **Mostrate insieme** | Quante notifiche stanno una sopra l'altra nella barra: da 1 a 10 (di serie 5) |
| **Per quanto restano visibili** | Quanto resta la barra dopo l'ultima notifica arrivata: da 3 a 60 secondi (di serie 5) |
| **Notifiche conservate** | Quante ne tiene l'elenco: 10, 20, 50, 100 o 200 (di serie 20). Quando ne arriva una in più, la più vecchia si cancella. Vale per il tuo utente |
| **Invia una notifica di prova** | Ti manda una notifica, per vedere com'è fatta |

Le modifiche valgono subito e restano salvate.

### Da sapere

- **Ognuno ha le sue.** Le notifiche sono del tuo utente e le vedi in tutte le schede di lilOS aperte. Le notifiche delle parti di sistema che lavorano in sottofondo arrivano agli amministratori.
- **Restano dopo la ricarica.** Se arriva qualcosa mentre lilOS è chiuso (da un'app che lavora in sottofondo), la trovi alla prossima apertura con il numero sulla campanella; la barra non compare per ciò che è già arrivato.
- **Se chi gestisce lilOS non ha acceso la parte che le conserva**, le notifiche compaiono lo stesso ma restano solo nella pagina: ricaricandola si perdono, e le altre schede non le vedono.
- **Un'app non può riempirti lo schermo**: ne può mandare al massimo 10 al minuto; le altre non arrivano. Il testo è lungo al massimo 300 caratteri.
- **Il mittente lo mette lilOS**, non l'app: non può fingersi un'altra app.

Cosa non è ancora possibile: silenziare le notifiche di una sola app, un modo "non disturbare", i suoni, e vedere le notifiche quando la scheda del browser non è davanti a te.

## Pannello di controllo

Apri il **Pannello di controllo** dal menu di avvio, dal pulsante con l'ingranaggio in fondo al menu, o dal collegamento sulla scrivania.

A sinistra ci sono le sezioni (la prima intestazione dell’elenco è «Sistema», le impostazioni del sistema: i percorsi come «Pannello di controllo → Usabilità» partono dal nome dell’app, non da quell’intestazione); alcune sono divise in schede, elencate in orizzontale sopra il contenuto. Con il campo **Cerca impostazioni** trovi una voce scrivendone il nome (Esc svuota la ricerca). Puoi anche usare le frecce per passare da una sezione all'altra.

Le modifiche valgono subito e restano salvate.

| Sezione | Scheda | Cosa puoi cambiare |
| --- | --- | --- |
| Aspetto | Colori | Il tema, **Chiaro** o **Scuro** (scrivania, barra delle applicazioni, menu e finestre), e il colore principale di lilOS: selezioni, pulsanti, schede attive, logo |
| Aspetto | Movimento | Animazioni attive o spente. Se nel sistema operativo hai chiesto di ridurre il movimento, le animazioni restano ridotte comunque. |
| Pagina utente | — | Cosa mostra la [pagina utente](#la-pagina-utente): un interruttore per ogni voce, in gruppi (vedi [Scegliere cosa mostra](#scegliere-cosa-mostra)) |
| Lingua | — | La lingua di lilOS: quella del browser o una tra quelle installate; **Altre lingue** apre l'AppStore sulla scheda Lingue (vedi [La lingua](#la-lingua)) |
| Scrivania | Elementi | L'allineamento alla griglia degli elementi trascinati; **Mostra l'anteprima dei file** (vedi [Anteprima dei file sulla scrivania](#anteprima-dei-file-sulla-scrivania)); un pulsante che porta agli elementi fissi (in Workspace) |
| Scrivania | Sfondo | Il colore della scrivania (campioni o un colore a scelta) e l'immagine di sfondo (vedi [Colore e immagine di sfondo](#colore-e-immagine-di-sfondo)) |
| Scrivania | Panoramica | Mappa in miniatura visibile o nascosta |
| Workspace | Questo workspace | Nome, colore, app visibili ed elementi fissi del workspace in cui sei (vedi [I workspace](#i-workspace)) |
| Workspace | *nome di un altro workspace* | Le stesse impostazioni per quel workspace, e Passa a questo |
| Workspace | Tutti | Passare a un workspace, eliminarlo o crearne uno nuovo; elementi fissi accesi o spenti in tutti i workspace |
| Notifiche | — | Quante notifiche stanno insieme nella barra, per quanto restano visibili, quante se ne conservano; una notifica di prova (vedi [Le notifiche](#le-notifiche)) |
| Lingua | — | La lingua di lilOS ed eliminare i tag; il colore, se sono visibili o invisibili, quanti elementi hanno; aprirne gli elementi nel File Manager (vedi [I tag](#i-tag)) |
| Usabilità | Menu contestuale | Le voci del menu del tasto destro sulla scrivania (vedi [Menu contestuale](#menu-contestuale)) |
| Usabilità | Tipi di file | Per ogni estensione (.txt, .md, .png…, e "Senza estensione"), l'app che apre i file di quel tipo, oppure "Chiedi ogni volta". "Ripristina tutti" torna alle app predefinite |
| Usabilità | Cestino | Se chiedere conferma prima di eliminare, se eliminare definitivamente senza passare dal cestino, per quanto tempo il cestino conserva gli elementi; aprire e svuotare il cestino (vedi [Il Cestino](#il-cestino)) |
| Usabilità | Scorciatoie | Le combinazioni di tasti di ogni comando (vedi [Cambiare le scorciatoie](#cambiare-le-scorciatoie)) e, nella sezione Mouse, la combinazione per la selezione a mano libera (Alt, Ctrl + Alt o Alt + Shift) |
| App | Sicurezza | Se le app installate girano isolate o no: una scelta per tutte (la cambia solo un amministratore) e l'elenco di come gira ognuna; il pulsante **Proprietà…** (vedi [Isolate e non isolate](#isolate-e-non-isolate)) |
| App | Pipe | Cosa fanno le app quando succede qualcosa (aprire, leggere o salvare un file, avviare un'app…): per ogni azione le app che intervengono, nell'ordine in cui lavorano, prima e dopo l'azione. Se due app intervengono nello stesso momento puoi spostarne una **Su** o **Giù** dentro il suo gruppo (tra i primi, in mezzo, tra gli ultimi); **Ripristina** torna all'ordine di installazione. Anche le app possono aggiungere azioni loro: accanto al nome c'è l'app a cui appartengono, per esempio «Nota salvata (di Note)». Vedi solo ciò che accade in questa scheda del browser |
| Avvio | Opzioni | Se le app scelte si aprono da sole quando entri e se partono i servizi (vedi [Aprire le app all'avvio](#aprire-le-app-allavvio)) |
| Avvio | Servizi | Le parti delle app che lavorano in sottofondo: se sono accese, quando partono, e i pulsanti per accenderle, spegnerle e leggerne il registro (vedi [Servizi in sottofondo](#servizi-in-sottofondo)) |
| Avvio | App | Quali app si aprono da sole, con quale finestra e con quali scelte (cartella, file…) |
| Rete | — | Solo amministratori, dalla 1.25.0: dove il computer di lilOS può collegarsi per gli utenti (cartella Rete, Terminale, NetTest). Con più utenti, **Questo computer (localhost)** e **Tutta la rete locale** (due interruttori) e **Solo questi indirizzi** (un elenco separato da virgole, per esempio `192.168.1.50/32`) sono le eccezioni; valgono subito. Gli indirizzi link-local (come i metadati dei servizi cloud), multicast e riservati restano sempre chiusi, anche con **Solo questi indirizzi**. Con un solo utente, senza accesso, tutto è già aperto e la scheda lo dice |
| OneDrive | — | Compare solo se il tuo lilOS ha OneDrive. L'app su Azure e le cartelle condivise (le cambia un amministratore), dove va **Carica su OneDrive e apri**, il doppio clic sui documenti Office (vedi [La scheda OneDrive](#la-scheda-onedrive-del-pannello-di-controllo)) |
| Archiviazione | Il mio spazio | Quanto spazio usano le tue impostazioni e il contenuto dei tuoi file, quanto ne hai a disposizione e il file più grande che puoi salvare; ripristino di impostazioni (anche colore e immagine di sfondo), scorciatoie e app dei tipi di file; ripristino della scrivania e dei file iniziali (con i workspace). Vedi [Spazio e limiti dei file](#spazio-e-limiti-dei-file) |
| Archiviazione | Limiti | Solo amministratori: la dimensione massima di un file e le altre soglie |
| Archiviazione | Utenti | Solo amministratori: lo spazio di ogni utente e la quota predefinita |
| Informazioni | lilOS | Versione di lilOS e dell'SDK, lingua, browser |
| Informazioni | Riconoscimenti | Le librerie, i font e gli strumenti di altri autori che lilOS, le sue app e i moduli del kernel usano: per ognuno versione, licenza, copyright, chi lo usa e il link al sito. Le librerie portate da altre librerie hanno una sezione a parte |

I due pulsanti di ripristino chiedono conferma: al primo clic il pulsante diventa rosso, e solo un secondo clic entro pochi secondi esegue l'operazione. **Ripristinare la scrivania e i file iniziali** elimina tutte le cartelle e i file che hai creato, ovunque si trovino, **tutti i workspace** (si riparte da uno solo, Principale), **tutti i tag**, le workarea, le posizioni e la vista salvate, poi ricarica lilOS. Non si può annullare.

### La lingua

Nel **Pannello di controllo → Lingua** scegli la lingua di lilOS: quella del browser (la scelta automatica) oppure una delle lingue installate. Di serie lilOS è in **inglese** (Stati Uniti o Regno Unito). Le altre lingue si installano dall'AppStore (vedi [Installare una lingua](#installare-una-lingua)). Il pulsante **Altre lingue**, nello stesso posto, apre l'AppStore sulla scheda **Lingue**.

- **Cosa cambia.** Cambia la lingua di lilOS: scrivania, barra delle applicazioni, menu di avvio, pagina utente, finestre e messaggi del sistema, schermate di accesso e di avvio. Cambiano anche le date, le ore e i numeri.
- **Il cambio vale subito per le app, per lilOS dopo un istante.** Le app aperte si aggiornano da sole, o al più alla prossima volta che le apri. Quello che lilOS ha già disegnato resta nella lingua di prima: per questo, quando passi a un'altra lingua di lilOS, compare **lilOS in …** con **Ricarica ora** (la pagina si ricarica e tutto è nella lingua nuova) e **Più tardi**. I testi del pulsante sono quelli della lingua che stai usando.
- **Ogni app ha le sue traduzioni.** Le lingue di lilOS non traducono le app: ognuna usa la propria traduzione se ce l'ha nella tua lingua, altrimenti l'inglese. Succede anche per i testi che mancano: compare l'inglese, o il nome interno del testo. Una lingua installata non rende quindi tradotte tutte le app.
- **Se manca una frase, compare in inglese.** Quando una lingua non ha ancora un testo di lilOS, vedi quel testo in inglese. lilOS non mostra mai nomi interni al posto dei testi.
- **Le parti in sottofondo** (i servizi) usano la lingua che avevi quando sono partite. Per cambiarla spegni e riaccendi il servizio nel **Pannello di controllo → Avvio → Servizi**, o aspetta che riparta. I servizi che lavorano per tutti gli utenti sono sempre in inglese.
- **I nomi che hai già creato non cambiano.** Cartelle, file e collegamenti che esistono già (anche il collegamento a un'app sulla scrivania) si chiamano come quando sono stati creati.

La scelta vale per il tuo utente: ognuno ha la sua lingua.

#### Installare una lingua

Le lingue sono **pacchetti di lingua** che vengono solo dal repository ufficiale di lilOS. Nell'**AppStore**, scheda **Lingue**, ogni lingua ha il suo nome scritto nella lingua stessa, la versione e chi l'ha installata.

1. Apri la scheda **Lingue** (o premi **Altre lingue** nel Pannello di controllo → Lingua).
2. Scegli la lingua e installala.
3. L'AppStore propone **Usa questa lingua**; oppure scegli la lingua più tardi nel Pannello di controllo → Lingua.

- **Può installarla qualsiasi utente**, non serve essere amministratore. Una lingua installata vale per **tutti** gli utenti di questo lilOS: ognuno poi sceglie la sua.
- **Aggiornarla** si fa come l'installazione: se il repository ha una versione nuova, la lingua compare anche in **Aggiornamenti**.
- **La toglie solo chi l'ha installata o un amministratore.** Gli altri non hanno il pulsante. Prima di toglierla l'AppStore ti avvisa che vale per tutti. Chi stava usando quella lingua torna **all'inglese** e riceve una notifica; può scegliere un'altra lingua quando vuole.
- **Lingue scritte da destra a sinistra** (arabo e urdu): scegliendole, l'interfaccia di lilOS si specchia: barra, menu e finestre vanno da destra a sinistra, i sottomenu si aprono dal lato giusto e le frecce della tastiera nei menu si invertono. Le app tengono la direzione della loro lingua: un'app che non ha l'arabo resta da sinistra a destra anche in un lilOS arabo.
- **Prima dell'accesso**, la schermata di accesso usa la lingua dell'ultimo utente che ha usato lilOS con questo browser (o quella del browser, se è installata).
- **Le traduzioni sono state scritte con l'aiuto dell'intelligenza artificiale.** Per hindi, urdu, arabo e greco è consigliata una revisione di chi la lingua la parla, prima di considerarle definitive. Se trovi un testo sbagliato, segnalalo a chi gestisce lilOS.

Le lingue offerte sono 20: italiano, inglese, cinese semplificato, hindi, spagnolo (Spagna), tedesco, francese, portoghese (Brasile), russo, arabo, giapponese, polacco, ucraino, rumeno, olandese, greco, indonesiano, urdu, turco e coreano.

### Aprire le app all'avvio

Puoi far aprire da sole alcune app, ogni volta che entri in lilOS. Le trovi nel **Pannello di controllo → Avvio**.

**Opzioni**

- **Avvia i servizi automaticamente**: l'interruttore dei tuoi servizi in sottofondo (vedi [Servizi in sottofondo](#servizi-in-sottofondo)).
- **Apri le app quando entri**: l'interruttore che le accende tutte o le spegne tutte. Le scelte fatte in **App** restano salvate.
- **Avvio senza app**: se qualcosa non va, aggiungi `?avvio=no` in fondo all'indirizzo di lilOS e ricarica. Per quella volta non si apre nessuna app; compare un avviso. La volta dopo (senza `?avvio=no`) tutto torna come prima.

**App**

1. Premi **Aggiungi…** e scegli un'app dall'elenco. Si apre la sua finestra principale.
2. Se l'app ha più finestre, ogni finestra ha il suo **interruttore**: accendi quelle che vuoi aprire.
3. Sotto ogni finestra accesa compaiono le sue **scelte**, per esempio la cartella da mostrare nel File Manager, il file da aprire nell'Editor, l'immagine in Photo o la sezione del Pannello di controllo. Per cartelle e file premi **Scegli…**; la **x** li toglie. Le scelte si salvano da sole, appena le cambi. Un'app che non descrive le sue scelte ha un campo di testo per le impostazioni avanzate: serve solo a chi sa cosa scrivere.
4. **Rimuovi dall'avvio** toglie l'app dall'elenco. Anche se spegni tutte le sue finestre l'app esce dall'elenco.

Le app si aprono nell'ordine dell'elenco, nel workspace in cui sei quando entri. Se un'app è nascosta in quel workspace, o l'hai tolta da lilOS, viene saltata (se l'hai tolta, esce anche dall'elenco). Se il file o la cartella scelti non ci sono più, quella finestra non si apre e una [notifica](#le-notifiche) lo dice.

Le app si aprono **solo nella prima scheda** di lilOS di questo browser. Se ne apri una seconda, quella resta vuota. Chiudendo la prima, la scheda successiva che apri riparte da capo e riapre le app.

Le app si aprono dopo che le finestre che avevi lasciato aperte sono tornate; se un'app ha già la sua finestra, la rivedi in primo piano invece di averne due.

### Servizi in sottofondo

Alcune app hanno una parte che lavora in sottofondo, senza finestra, anche quando lilOS è chiuso. Per esempio l'AppStore può controllare se ci sono aggiornamenti. La chiamiamo **servizio**. Li trovi nel **Pannello di controllo → Avvio → Servizi**.

Per ogni servizio vedi il nome dell'app, se è **Acceso**, **Spento** o **Fermo** (con il motivo), e da quanto. Puoi:

- **Scegliere quando parte**: **Non si avvia**, **All'accesso** (parte quando entri tu) o **All'avvio del sistema** (parte con lilOS, per tutti gli utenti). Quest'ultima la possono scegliere solo gli amministratori. Se la sceglie un amministratore, tu vedi la scelta bloccata.
- **Accendere** o **Spegnere** il servizio subito, e **Riavviarlo** (l'icona con la freccia).
- Aprire il **Registro**, una finestra con le ultime righe che il servizio ha scritto.
- Cambiare le **scelte** del servizio (per esempio ogni quante ore controlla), che compaiono sotto di lui quando parte da solo. Valgono dalla prossima partenza.

In **Opzioni** l'interruttore **Avvia i servizi automaticamente** spegne tutti i tuoi servizi insieme: le scelte restano salvate. I servizi scelti da un amministratore per tutti partono comunque.

Se sposti un servizio acceso da «All'accesso» a «All'avvio del sistema», o al contrario, riparte subito.

I servizi hanno bisogno di un componente del sistema, `services-isolate`. Se manca, la scheda lo dice: si aggiunge dall'AppStore (scheda **Kernel**), e un amministratore deve riavviare il sistema.

**Aggiornamenti dell'AppStore.** In **AppStore → Opzioni** l'interruttore **Controlla gli aggiornamenti** accende un'operazione della [Pianificazione](#pianificazione): ogni giorno alle 09:00 (o ogni lunedì, a scelta), anche a lilOS chiuso, controlla se le app installate hanno una versione nuova. Se ne trova, compare una notifica con il nome dell'app e la versione; per ogni versione ti avvisa una volta sola, e la trovi alla prossima apertura di lilOS. Quando e quanto spesso si cambia dalla Pianificazione. Se un amministratore ha scelto il servizio dell'AppStore per tutti, si cambia dal **Pannello di controllo → Avvio → Servizi**.

### Spazio e limiti dei file

I file che salvi in lilOS possono pesare fino a **1 GB ciascuno**, di serie. Chi gestisce lilOS può cambiare questo limite e può dare a ogni utente uno **spazio** massimo (una *quota*). Di serie lo spazio non ha limite.

Lo vedi nel **Pannello di controllo → Archiviazione → Il mio spazio**:

- **Spazio usato**: quanto occupano tutti i tuoi file, **cestino compreso**. Se c'è una quota, vedi anche una barra e, per esempio, «3,2 GB di 10 GB». Se non c'è, vedi solo quanto usi.
- **File più grande**: la dimensione fino a cui lilOS salva un file, oppure **Senza limite**.

Cosa succede quando si arriva al limite:

- **File troppo grande.** Il file non viene salvato e un messaggio dice quanto può pesare al massimo. Vale per ogni salvataggio, anche quello delle app.
- **Spazio quasi finito.** Quando superi il 90% dello spazio arriva una notifica; toccandola si apre **Il mio spazio**. Un'altra notifica arriva solo dopo che sei sceso sotto l'85%.
- **Spazio finito.** Un salvataggio che non ci sta viene rifiutato, con un messaggio che dice quanto spazio resta. Non perdi nulla di ciò che c'era già. Eliminare file, svuotare il cestino e rimpicciolire un file è sempre possibile. Per liberare spazio **svuota il cestino**: lì i file contano ancora (e l'eliminazione definitiva non si annulla). Le impostazioni e i dati che lilOS tiene per sé continuano a salvarsi anche con lo spazio finito, così il sistema non si blocca.
- **File grandi.** Un file grosso si carica a pezzi: se la connessione si interrompe, riparte da dove era arrivato invece che dall'inizio.

**Per gli amministratori.** Le altre due schede sono visibili solo a voi:

- **Limiti**: la dimensione massima di un file, il più grande file che un'app apre tutto in una volta in memoria (**Lettura in una volta**), il testo più lungo (**Testo**), la dimensione dei pezzi con cui un file grande arriva dal browser (**Pezzi di caricamento**), le soglie con cui il database tiene i file (**File piccoli in una riga**, **Pezzi nel database**) e fino a che dimensione il browser tiene una copia dei file aperti (**Copia nel browser**). Per ogni valore un'etichetta dice se è quello di serie (**Predefinito**), se l'avete cambiato (**Modificato**), e **Ripristina** torna al valore di serie. Per i valori con «0 = senza limite» scrivere 0 toglie il limite. Le modifiche valgono subito, senza riavviare lilOS.
- **Utenti**: la **Quota predefinita** (per tutti gli utenti che non ne hanno una loro) e, per ogni utente, quanto spazio usa. **Personalizza** dà a un utente una quota sua (**Personale**); **Usa la predefinita** la toglie. Cambiare una quota non cancella niente: chi è già oltre non può più aggiungere file finché non libera spazio.
- Le quote funzionano solo se il modulo che conserva i file nel database è abbastanza nuovo (`fs-postgres` 1.2.0 o più recente). Se non lo è, la scheda **Utenti** lo dice e va aggiornato dall'AppStore, scheda **Kernel**.
- Il limite alla dimensione di un file vale per tutti gli utenti, senza eccezioni; la quota può essere diversa da utente a utente.

## Il menu di avvio

È il menu delle applicazioni: una pagina che copre la scrivania e le finestre (la barra delle applicazioni resta visibile). Aprilo con il **pulsante del logo** in basso a sinistra oppure con **Ctrl K**. Per chiuderlo premi **Esc**, il pulsante **Chiudi** in alto a destra, **Ctrl K** di nuovo o il logo.

**In alto** ci sono il workspace in cui sei, il campo **Cerca app e file** e, a destra:

- il tuo nome (premilo per aprire la [pagina utente](#la-pagina-utente));
- **Pannello di controllo** (ingranaggio): apre le impostazioni di lilOS;
- **Esci** (simbolo di accensione, se lilOS ha più utenti): chiude la tua sessione e torna alla schermata di accesso (vedi [Accedere e uscire](#accedere-e-uscire)). Se lilOS ha un solo utente il pulsante si chiama **Riavvia sessione** e ricarica lilOS;
- **Chiudi**.

**Tre colonne.**

- **Preferite** (a sinistra): le app che hai fissato. Per fissare un'app premi la **stella** sulla sua icona, oppure trascinala nella colonna. Per cambiare l'ordine trascina una preferita più su o più giù, oppure usa il tasto destro: **Sposta su** e **Sposta giù**. Per toglierla, premi di nuovo la stella o scegli **Togli dalle preferite**.
- **Le app** (al centro), in schede:
  - **Recenti e frequenti**: prima le app che hai usato da poco, poi quelle che usi di più negli ultimi 30 giorni (senza ripetere le prime);
  - **Work Area**: le workarea di questo workspace, con titolo, descrizione, quante finestre e quanti elementi contengono e se sono ridotte a icona o quando le hai modificate per l'ultima volta. Un clic ti porta alla workarea (la riapre se era ridotta a icona). Tasto destro: **Vai alla workarea** o **Proprietà…**;
  - una scheda per ogni categoria che ha almeno un'app: **Sistema**, **Produttività**, **Media**, **Sviluppo**, **Altro**.

  Le schede vuote non compaiono: senza app usate in questo workspace non c'è **Recenti e frequenti**, senza workarea non c'è **Work Area**. Il menu si apre sempre sulla prima scheda che c'è.
- **File** (a destra): i file che hai aperto da poco e quelli che apri più spesso (almeno 2 volte negli ultimi 30 giorni). Fai clic su un file per aprirlo. Tasto destro: **Apri**, **Apri con…**, **Mostra nella cartella** (apre il File Manager lì) e **Togli dall'elenco**. **Cancella elenco** svuota gli elenchi dei file di questo workspace. I file non vengono cancellati e non si possono ripristinare gli elenchi.

**In basso** c'è un pulsante per ogni workspace, con il nome e la descrizione (se è lunga viene tagliata). Fai clic per passarci: il menu resta aperto e mostra le app, le preferite e i file di quel workspace. Come descrizione di un workspace vedi [Creare, rinominare, eliminare](#creare-rinominare-eliminare).

**Cercare.** Scrivi nel campo (o inizia a scrivere ovunque nel menu). Compaiono le app il cui nome o la cui descrizione contiene quello che hai scritto, le workarea il cui titolo o la cui descrizione lo contiene e i file negli elenchi a destra. La ricerca non guarda tutti i tuoi file: solo quelli che hai già aperto con lilOS. Esc svuota il campo; un secondo Esc chiude il menu.

**Tastiera.**

| Tasto | Cosa fa |
| --- | --- |
| Frecce | Passano da un elemento all'altro, preferendo la stessa riga o la stessa colonna |
| ↓ nel campo di ricerca | Entra nell'elenco delle app |
| Invio nel campo di ricerca | Apre il primo risultato |
| ← → sulle schede | Cambiano scheda (anche Home e Fine) |
| Tab | Gira dentro il menu, senza uscirne |
| Esc | Svuota la ricerca; se è già vuota, chiude il menu |

**Tasto destro su un'app**: **Apri**, **Aggiungi alle preferite** (o **Togli dalle preferite**), **Mostra sul desktop** e **Proprietà…** (vedi [Proprietà di un'app](#proprietà-di-unapp)). **Mostra sul desktop** rimette l'icona dell'app sul desktop del workspace in cui sei, se l'avevi tolta; quando l'icona c'è già, la voce diventa **Già sul desktop** e non si può scegliere.

**Cosa ricorda.** Le preferite e gli elenchi delle app e dei file sono **separati per workspace** e si cancellano quando elimini il workspace. Contano le app che avvii tu (dal menu, dalla scrivania, dal File Manager, da «Apri con» o da una notifica) e i file che apri con un'app. Non contano le app che lilOS apre da sola (per esempio quelle dell'[avvio](#aprire-le-app-allavvio)) né le finestre che tornano al loro posto dopo un riavvio. Si ricordano al massimo 100 app e 100 file per workspace.

Su uno schermo stretto (meno di 860 pixel) le colonne si mettono una sotto l'altra, con le app per prime.

App del menu: File Manager, Editor, Pannello di controllo, AppStore, Pianificazione e le [app installate](#app-installate). File Manager, Pannello di controllo, AppStore e Pianificazione ci sono in ogni workspace; le altre in quelli dove non le hai nascoste.

## La pagina utente

È la pagina con le cose che riguardano te: la tua foto, uscire o bloccare lilOS, tema e lingua, qualche numero su quello che stai usando. Occupa tutto lo schermo, tranne la barra delle applicazioni.

**Aprirla.** Premi il tuo **nome** in alto a destra nel [menu di avvio](#il-menu-di-avvio).

**Chiuderla.** Premi **Esc** o il pulsante in alto a destra. Si chiude anche da sola se apri una finestra o usi un'altra parte della barra delle applicazioni. Le finestre che avevi aperte restano dove sono.

In alto ci sono sempre il tuo **nome** e la tua **foto**. Sotto il nome trovi il nome con cui accedi e se sei amministratore. Le altre voci le scegli tu (vedi [Scegliere cosa mostra](#scegliere-cosa-mostra)).

### Le azioni

| Voce | Cosa fa |
| --- | --- |
| **Blocca** | Copre lo schermo e chiede di nuovo la tua password. Le finestre restano aperte sotto. Compare solo se lilOS ha più utenti. |
| **Chiudi sessione** | Come **Esci** nel menu di avvio: salva, chiude e torna alla schermata di accesso (vedi [Accedere e uscire](#accedere-e-uscire)). Se lilOS ha un solo utente si chiama **Riavvia sessione** e ricarica lilOS. |
| **Riavvia il sistema** | Solo per gli amministratori. Chiede conferma nella pagina stessa. |
| **Arresta** | Solo per gli amministratori. Spegne lilOS per tutti gli utenti. Chiede conferma nella pagina stessa. |

**Blocca.** Usalo quando ti allontani. Scrivi la tua password per tornare e ritrovi le finestre com'erano. Se preferisci, **Accedi con un altro utente** ti porta alla schermata di accesso. Bloccare è più che coprire lo schermo: lilOS chiude la tua sessione, quindi se ricarichi la pagina ti viene chiesto di accedere di nuovo. Intanto i servizi in sottofondo delle tue app si fermano, come quando esci, e ripartono quando accedi.

**Chiudi sessione.** Prima di uscire, lilOS chiede alle finestre che hanno testo non salvato se possono chiudersi. Se una dice di no, non esci. Anche il pulsante **Esci** del menu di avvio fa così.

**Riavvia il sistema.** Riavvia il programma che conserva i dati di tutti gli utenti. Premendolo compare una domanda: **Riavvia ora** o **Annulla**. Se confermi, le finestre con testo non salvato ti chiedono cosa fare; poi compare **Riavvio del sistema…** e, quando il sistema è tornato, lilOS si ricarica da solo. Chi è collegato in quel momento perde la connessione per qualche secondo. **Funziona solo se chi gestisce lilOS lo ha avviato con `npm run kernel`**: altrimenti compare un avviso e il sistema non si riavvia.

**Arresta.** Spegne lilOS per tutti gli utenti, finché qualcuno non lo riaccende. Premendolo compare la domanda «Arrestare lilOS?» con **Arresta ora** e **Annulla**; **Esc** annulla. Se confermi, le finestre con testo non salvato ti chiedono cosa fare; poi lilOS si ferma.

- **Nel [programma lilOS](#il-programma-lilos)**, con il lilOS di quel computer: si chiude anche il programma, insieme ai suoi servizi e al database. Per riaccenderlo apri di nuovo il programma.
- **Altrove** (per esempio in un browser collegato a un server): compare la schermata **lilOS è spento** con il pulsante **Ricarica**. Il server non riparte da solo: deve riaccenderlo chi lo gestisce (con `npm run kernel`, il servizio o il programma lilOS), e poi premi **Ricarica**.

**Chi è collegato perde subito la connessione**, e le app che lavorano in sottofondo si fermano. Le finestre degli altri utenti non vengono avvisate: chi ha scritto qualcosa senza salvarlo può perderlo. Per questo il tasto serve a chi gestisce lilOS: se vuoi solo ripartire, usa **Riavvia il sistema**.

### Le impostazioni dell'account

| Voce | Cosa fa |
| --- | --- |
| **Foto profilo** | Scegli un'immagine dal computer, oppure cambiala o toglila. Puoi usare anche il pulsante con la macchina fotografica sulla foto. |
| **Tema** | **Chiaro** o **Scuro**, come nel Pannello di controllo. |
| **Lingua** | **Automatica** (quella del browser) o una lingua a scelta, come nel Pannello di controllo. |
| **Tutte le impostazioni** | Apre il [Pannello di controllo](#pannello-di-controllo). |

**La foto profilo.** lilOS ritaglia l'immagine a quadrato dal centro e la riduce: l'originale non viene conservato. Non si accettano immagini sopra i 25 MB; se un file non si apre come immagine compare un avviso. La foto sostituisce le iniziali nella barra delle applicazioni, nel menu di avvio e in questa pagina. Togliendola tornano le iniziali.

### Questa sessione

| Voce | Cosa mostra | Premendola |
| --- | --- | --- |
| **Workspace** | Il nome del workspace in cui sei e, se ce n'è più di uno, quale sei (per esempio «Principale (1 di 2)») | Apre le impostazioni dei workspace |
| **Finestre aperte** | Quante finestre sono aperte e quante app lavorano in sottofondo | Niente: è solo un'informazione |
| **All'avvio** | Quante app si aprono quando entri, oppure «Spento» | Apre il Pannello di controllo → Avvio → App |
| **Spazio usato** | Quanto occupano i tuoi file | Apre il Pannello di controllo → Archiviazione |

In fondo alla pagina c'è la **versione di lilOS** e l'indirizzo a cui sei collegato.

### Scegliere cosa mostra

Apri il **Pannello di controllo → Pagina utente**. Trovi un interruttore per ogni voce, raggruppate come nella pagina (Intestazione, Azioni, Account, Questa sessione, Piè di pagina). Spegni quello che non ti serve: la voce sparisce subito dalla pagina. Il nome e la foto ci sono sempre. Se spegni **Foto profilo** non puoi più cambiare la foto da lì; quella già scelta resta. **Impostazioni predefinite**, nel Pannello di controllo → Archiviazione, riaccende tutte le voci (la foto non viene toccata).

### Cosa non è ancora possibile

- Cambiare il nome visualizzato o la password: lilOS non lo permette ancora.
- Vedere chi altro è collegato.

## Il programma lilOS

Il **programma lilOS** apre lilOS in una finestra tutta sua, senza browser, su Windows, macOS e Linux. Fa anche cose che un browser non può fare: tiene lilOS nell'area di notifica, parte con il computer, mostra il numero di notifiche sull'icona, apre i file con i programmi del computer e vede le chiavette USB. Tutto il resto di questa guida vale uguale.

lilOS si può usare anche solo dal browser: le funzioni di questa sezione, dove non è detto altro, ci sono solo nel programma.

### Installare il programma

Scarica l'installatore dalla pagina delle versioni di lilOS su GitHub ([GexyLab/lilos](https://github.com/GexyLab/lilos/releases)):

| Sistema | File |
| --- | --- |
| Windows | `lilOS-Setup-….exe` (oppure `lilOS-….msi`) |
| macOS | `lilOS-…-arm64.dmg` (Mac con chip Apple) o `lilOS-…-x64.dmg` (Mac con processore Intel) |
| Linux | `lilOS-….AppImage`, oppure il pacchetto `.deb` o `.rpm` (processori x64 e arm64) |

Il numero nel nome del file è la versione di lilOS che il programma porta (per esempio `lilOS-Setup-1.24.0.exe`).

Per ora il programma **non è firmato**, quindi il sistema ti avvisa la prima volta:

- **Windows**: compare «Windows ha protetto il PC» (SmartScreen). Scegli **Ulteriori informazioni**, poi **Esegui comunque**.
- **macOS**: il sistema dice che non può verificare lo sviluppatore. Apri **Impostazioni di Sistema → Privacy e sicurezza** e scegli **Apri comunque**.
- **Linux**: nessun avviso. Un file `.AppImage` va prima reso eseguibile.

### Il primo avvio

Alla prima apertura il programma chiede dove deve girare lilOS. Hai tre scelte:

1. **Su questo computer** (consigliata). Il programma installa e avvia da solo tutto quello che serve: non devi installare altro. Scegli il nome e la password (almeno 8 caratteri) del primo utente, che sarà un **amministratore**, e premi **Installa**. La prima volta lilOS scarica dal repository ufficiale i moduli e le app di sistema: serve internet e ci vogliono alcuni minuti. Al termine lilOS si apre già con il tuo utente.
2. **Collegati a un server**. Scrivi l'indirizzo di un lilOS che gira su un altro computer o in azienda (`https://…`; `http://` solo per questo computer) e accedi con il tuo utente di quel server. Se segni **Mi fido di questo server** gli permetti di aprire file su questo computer e di cambiare le impostazioni del programma: fallo solo per server che controlli tu (vedi [Server e server di fiducia](#server-e-server-di-fiducia)).
3. **Usa il lilOS già installato**. Compare solo se sul computer c'è già un lilOS installato a mano e acceso: il programma lo apre come un server.

I dati del lilOS «su questo computer» (utenti, file, database) stanno nella cartella dei dati del programma, sul tuo computer. Disinstallare il programma **non li cancella**.

Dalla versione 0.4.0 del programma, con lilOS 1.34.0 o successivo, c'è anche una scelta **Senza UI**: lilOS gira su questo computer senza finestre e si usa da un terminale. Vedi [lilOS senza UI](#lilos-senza-ui).

Se qualcosa non parte, il programma mostra una pagina con **Riprova**, **Server** (per sceglierne un altro) e **Apri i log**.

### Installare di nuovo il programma

Su **Windows**, se installi di nuovo il programma (con `.exe` o `.msi`) e sul computer ci sono ancora le impostazioni di un'installazione precedente, al primo avvio compare la pagina **lilOS era già installato qui** (dalla versione 0.3.0 del programma). Succede perché disinstallare non cancella i dati. Hai due scelte:

- **Usa l'installazione precedente.** Il programma si apre come prima. La pagina elenca i server che userà e, se c'è, il lilOS di questo computer con la sua versione e la sua cartella.
- **Riparti da zero.** Il programma dimentica server e impostazioni, spegne l'avvio con il computer e ti chiede di nuovo dove far girare lilOS, come al [primo avvio](#il-primo-avvio) (o segue il file `lilos-install.json`, se c'è). Il lilOS di questo computer viene **messo da parte, non cancellato**: la cartella con i suoi utenti e file e quella del database vengono rinominate aggiungendo `.old-` e la data e l'ora (per esempio `lilos.old-202611031530`). Per tornare indietro basta ridare loro il nome di prima. Se invece spunti **Elimina invece il lilOS di questo computer**, compare un'ultima domanda e poi utenti, file e database vengono **cancellati, e non si può annullare**.

Gli aggiornamenti automatici del programma non fanno questa domanda. Su macOS e Linux non c'è nessuna domanda. Se non c'è nessun server salvato, il programma parte dal primo avvio e basta.

### Area di notifica, avvio con il computer e notifiche

Per impostazione predefinita, chiudendo la finestra lilOS **resta attivo** nell'area di notifica (la barra di Windows, la barra dei menu di macOS, il vassoio di Linux), così il kernel continua a girare. Un clic sull'icona riapre la finestra. Il menu dell'icona ha:

- **Apri lilOS**, il numero di notifiche non lette e, se hai più server, **Apri un altro server**;
- lo stato del kernel e **Apri nel browser**, per usare lo stesso lilOS dal browser;
- **Avvia con il computer**;
- **Esci da lilOS**, che chiude il programma e **ferma il kernel** di questo computer.

Se preferisci che chiudere la finestra chiuda il programma, spegni l'interruttore nel **Pannello di controllo → Computer → Programma**.

- **Avvia con il computer**: il programma parte quando accedi al computer, ma la finestra resta chiusa (si apre dall'icona). Solo in [kiosk](#schermo-intero-e-kiosk) la finestra si apre subito.
- **Il numero sull'icona**: le notifiche di lilOS non lette compaiono come numero sull'icona del programma nella barra delle applicazioni (Windows), nel Dock (macOS) o sull'icona (Linux, se il desktop lo mostra).
- **Notifiche del sistema**: quando la finestra di lilOS non è quella in primo piano, le nuove notifiche compaiono anche nel centro notifiche del computer. Un clic porta lilOS in primo piano ed esegue l'azione della notifica. Si spegne nel Pannello di controllo.

Puoi anche aprire un file di lilOS da fuori con un collegamento come `lilos://open?path=/Documenti/note.txt`: il programma mostra la finestra e apre quel file o quella cartella (se non c'è, lilOS lo dice con una notifica).

### Schermo intero e kiosk

Nel **Pannello di controllo → Computer → Schermo** scegli come si vede lilOS:

| Modo | Cosa fa |
| --- | --- |
| **Finestra** | Una finestra del computer, con la sua cornice. Il programma ricorda posizione e dimensione. |
| **Schermo intero** | lilOS copre tutto lo schermo, anche la barra o il Dock. **F11** entra ed esce. |
| **Kiosk** | Schermo intero che **non si chiude**: la finestra non si può chiudere, F11 non fa niente e il menu dell'icona ha solo **Apri lilOS**. Serve per un computer dedicato a lilOS. |

Se hai più monitor, **Monitor** decide su quale va lilOS a schermo intero e in kiosk. Con l'interruttore **Tasti di sistema a lilOS a schermo intero** il tasto Windows, Alt+Tab ed Esc arrivano a lilOS invece che al sistema. Questa funzione dipende dal sistema e non è garantita ovunque.

**Uscire dal kiosk.** Solo gli amministratori scelgono il kiosk e, quando lilOS è in kiosk, solo loro scelgono un altro modo nel Pannello di controllo. Un utente che non è amministratore, in un lilOS in kiosk, trova **Esci dal kiosk**: un amministratore scrive il suo nome e la sua password (lilOS la controlla, ma non entra con quell'utente) e lilOS torna in una finestra.

Cosa permette ogni sistema:

- **Windows**: **Ctrl+Alt+Canc** resta sempre di Windows. Sostituire il desktop di Windows con lilOS (Shell Launcher) si può fare solo in Windows Enterprise ed Education. Su Home e Pro usa il kiosk con **Avvia con il computer**.
- **macOS**: in kiosk spariscono il Dock e la barra dei menu e sono bloccati ⌘Tab e l'uscita forzata. Il Finder non si può sostituire: per un Mac dedicato crea un account apposta, con lilOS in kiosk che parte all'avvio.
- **Linux**: con il pacchetto `.deb` o `.rpm` puoi fare di lilOS **il desktop intero**. Installa `cage`, poi esegui una volta `sudo sh /opt/lilOS/resources/session/install-session.sh`: nella schermata di accesso compare la sessione **lilOS**. In quella sessione lilOS è sempre in kiosk e senza icona nell'area di notifica; uscire dal kiosk chiude la sessione e torna alla schermata di accesso.

### Portare file dal computer a lilOS e viceversa

- **Trascinare**. Trascina file e cartelle da Esplora file, Finder o dal gestore file di Linux dentro lilOS. Lasciali sulla scrivania (restano dove li lasci), su una cartella, o su una cartella aperta nel File Manager: vengono **copiati** lì, con le sottocartelle. Fino a 2000 file per volta. Una notifica dice quanti sono stati copiati. Funziona anche dal browser. Dentro una cartella di un server di Rete non si copia: copia prima in una cartella di lilOS, poi trascina sul server.
- **Apri sul computer**. Nel menu di un file apre una copia con il programma che il computer usa per quel tipo di file. Se lo modifichi e lo **salvi** lì, il file in lilOS cambia da solo e una notifica lo conferma. Due limiti: i file che il computer eseguirebbe (programmi, installatori, script come `.exe`, `.bat`, `.sh`, `.py`) **non si aprono**, e nemmeno i file sopra 512 MB. Un file di **Rete › Questo computer** (vedi sotto) si apre dov'è, senza copia.
- **Mostra nella cartella del computer**. Per file e cartelle di Rete › Questo computer: apre la loro cartella nel gestore file del computer.
- **Esporta sul computer…**. Per uno o più file: con uno solo si apre la finestra «Salva» del computer; con più file si sceglie la cartella dove metterli. I file restano anche in lilOS. Le cartelle non si esportano: seleziona i file.

**Apri sul computer** e **Mostra nella cartella del computer** funzionano solo con un server di fiducia (il lilOS di questo computer lo è); **Esporta** funziona con ogni server.

### Le cartelle e le chiavette del computer in Rete

Con il lilOS «su questo computer» (o uno installato a mano sul tuo computer e segnato di fiducia), la cartella **Rete** può mostrare le cartelle del tuo computer: Documenti, Download, un disco. Compaiono in **Rete › Questo computer** e si leggono e si scrivono **dove sono**, senza copie.

- **Aggiungere una cartella**: **Pannello di controllo → Computer → Server**, sezione **Cartelle del computer in Rete**, **Scegli…** e scegli la cartella con la finestra del computer. In alternativa, in Rete: **Connetti a un server → Questo computer (cartella)** e scrivi il percorso (`C:\Users\Mario\Documents`, `/home/mario/Documenti`); **Sola lettura** la rende non modificabile.
- **Eliminare è definitivo**: i file eliminati da qui non vanno in nessun Cestino, né di lilOS né del computer.
- **Chi può cosa**: gli **amministratori** (e chi usa lilOS da solo) collegano qualsiasi cartella del computer. Gli altri utenti collegano solo le cartelle che un amministratore elenca nel **Pannello di controllo → Cartelle del computer** (un percorso per riga) o cartelle dentro di esse. Una cartella non esce mai dal suo percorso: i collegamenti simbolici che portano fuori non si vedono.
- **Chiavette USB e schede di memoria**: quando le inserisci compaiono da sole in Rete › Questo computer, con una notifica, e spariscono quando le togli. Succede per gli amministratori (e per chi usa lilOS da solo). Per toglierle senza rischi usa **Espelli** nel **Pannello di controllo → Computer → Hardware**.

Se **Questo computer** non compare in Rete, il modulo che lo fa (`netfs-local`) non è installato: un amministratore lo trova nell'AppStore → Kernel.

### Hardware

Nel **Pannello di controllo → Computer → Hardware** vedi cosa ha il computer (fotocamere, microfoni, porte seriali, dispositivi USB e di input, schede grafiche, stampanti, monitor, unità rimovibili) e decidi come le app usano i dispositivi. Il campo **Le app usano i dispositivi** lo cambia solo un amministratore:

| Regola | Cosa succede |
| --- | --- |
| **Chiedendo ogni volta** | Ogni porta o dispositivo lo scegli tu, in una finestra di lilOS, una volta per dispositivo: poi lilOS se lo ricorda. |
| **App che lo dichiarano** (predefinita) | Le app che hanno tra i permessi (quelli che hai visto all'installazione) un dispositivo, come la porta seriale, lo usano senza chiedere. |
| **Tutte le app** | Ogni app vede e usa ogni dispositivo senza chiedere. Solo per computer dedicati (kiosk, laboratori). |

Quando un'app vuole usare una porta seriale, un dispositivo USB, un dispositivo di input (HID) o uno Bluetooth, o condividere lo schermo, lilOS apre una finestra per **scegliere quale** dispositivo (o quale schermo o finestra) usare. Con **Chiedendo ogni volta** e **App che lo dichiarano** l'app deve comunque avere il permesso per quel tipo di dispositivo.

### Server e server di fiducia

Il programma può aprire più lilOS: quello di questo computer e quelli di altri computer, ognuno **nella sua finestra e con il suo accesso**. Li gestisci in **Pannello di controllo → Computer → Server**: **Apri**, **Apri nel browser** e **Riavvia il kernel** (per quello di questo computer), **Togli** (con conferma; il lilOS di questo computer e quello della finestra attuale non si tolgono). Per aggiungerne uno scrivi l'**Indirizzo** (`https://…`) e, se vuoi, attiva **Server di fiducia**.

Un server è **di fiducia** se lo segni tu. Il lilOS di questo computer lo è sempre. Un server di fiducia può:

- aprire file su questo computer e mostrarli nella loro cartella;
- cambiare le impostazioni del programma (schermo, avvio, aggiornamenti, hardware);
- aggiungere e togliere server.

Un server **non di fiducia** può solo mostrare il numero di notifiche sull'icona, portare la finestra in primo piano, farti scegliere un dispositivo, controllare gli aggiornamenti del programma e salvare un file sul computer con la finestra «Salva» (**Esporta**). Non può cambiare le impostazioni del programma, aprire file, vedere i percorsi del computer né vedere o aggiungere altri server. Segna di fiducia solo server tuoi: **un server di fiducia può cambiare cosa fa il tuo computer**.

### Installare lilOS già pronto (per chi amministra)

Se devi installare lilOS su molti computer, o su un server, puoi preparare in anticipo come deve essere. Si fa con un file di testo chiamato `lilos-install.json` (disponibile da lilOS 1.24.0 e dal programma 0.2.0). Nel file puoi scrivere:

- la cartella dove installare lilOS;
- se il programma deve far girare lilOS su questo computer oppure aprire direttamente un server;
- gli utenti da creare, con nome, ruolo (amministratore o utente) e password;
- le app da installare, anche da repository che non sono quello ufficiale;
- le impostazioni con cui parte ogni nuovo utente (per esempio tema chiaro e colore);
- un'**immagine del sistema**: un lilOS già installato e pronto (app, utenti, file) da usare al posto di quello nuovo;
- `"acceptLicense": true`, se accetti tu la [licenza di lilOS](#la-licenza-di-lilos) per l'installazione che prepari: al primo avvio non viene chiesta a nessuno.
- `"kernel": { "ui": false }`, per installare [lilOS senza UI](#lilos-senza-ui) (da lilOS 1.34.0); con il programma, insieme a un amministratore e a `"acceptLicense": true`, l'installazione parte e finisce senza domande.

**Dove mettere il file.** Il programma lo cerca, in quest'ordine:

1. nella cartella dei dati del programma, prima del primo avvio;
2. accanto al programma: su Windows **accanto al file di installazione** (`lilOS-Setup-….exe`; l'installazione lo copia nella cartella del programma), su Linux accanto al file `.AppImage`, su macOS accanto a `lilOS.app`.

**Cosa succede al primo avvio.**

- Con `"mode": "server"` e l'indirizzo del server, il programma apre subito quel server, senza chiederti niente.
- Con `"mode": "local"` e un amministratore con password (o con un'immagine), il programma installa lilOS da solo, senza la pagina di benvenuto. Se c'è un amministratore, la finestra si apre già con il suo accesso.
- Senza `mode`, compare la pagina di benvenuto come sempre.
- Gli utenti e le app del file vengono creati e installati la prima volta che lilOS parte. Un utente senza password non viene creato.

**Attenzione alle password.** Nel file le password sono scritte in chiaro. Il programma le toglie dal file che sta nella sua cartella dei dati, e lilOS le toglie dalla sua copia, ma **il file messo accanto al programma resta com'è**. Cancellalo dopo l'installazione, o non metterci password e crea gli utenti dal programma.

Un esempio per i computer dei dipendenti, che aprono il server dell'azienda:

```json
{
  "format": 1,
  "installer": {
    "mode": "server",
    "server": { "url": "https://lilos.azienda.it", "name": "lilOS Azienda" }
  }
}
```

E uno che installa lilOS sul computer, in una cartella scelta, a partire da un'immagine:

```json
{
  "format": 1,
  "installer": { "dir": "C:\\lilOS", "mode": "local" },
  "image": "C:\\Immagini\\lilos-azienda.zip",
  "modules": {
    "config": { "fs-postgres": { "url": "postgres://lilos:UNA-PASSWORD@127.0.0.1:5432/lilos" } }
  }
}
```

Con un'immagine, dai il **tuo** database (la riga `fs-postgres`): quello scritto nell'immagine è di chi l'ha fatta. Un file scritto male fa fermare l'installazione con un messaggio che dice quale campo è sbagliato. L'elenco completo dei campi, un esempio per un server aziendale e il modo di fare un'immagine sono nella [documentazione per sviluppatori](../sviluppatore/api.md#impostazioni-di-installazione-lilos-installjson-e-immagini-del-sistema).

### Aggiornare il programma

Il programma si aggiorna dalle versioni su GitHub; **lilOS** invece continua ad aggiornarsi dall'[AppStore](#lappstore), come sempre. Nel **Pannello di controllo → Computer → Programma** scegli come:

- **Automatici** (Windows e Linux): il programma controlla ogni 6 ore, scarica la nuova versione e la installa quando esci.
- **Avvisami**: una notifica dice che c'è una nuova versione e un clic apre la pagina da cui scaricarla.
- **Mai**.

**Controlla ora** cerca subito. Su **macOS** il programma non è firmato e non può sostituirsi da solo: ti avvisa, e l'aggiornamento lo installi tu dal nuovo `.dmg`.

### Cosa non è ancora possibile

- Il programma non è firmato: Windows e macOS mostrano un avviso la prima volta, e su macOS non si aggiorna da solo.
- Sui Mac con processore Intel il lilOS «su questo computer» non ha ancora tutto: manca il motore dei servizi in background delle app isolate.
- Il primo avvio ha bisogno di internet (scarica le app di sistema).
- Le app isolate non possono ancora usare fotocamera e microfono.
- Le pagine web di NetWave Browser (dalla versione 0.5.1 del programma) non sono state provate su macOS e Linux, né con un lilOS non di fiducia: lì NetWave non mostra le pagine.
- I pacchetti per macOS e Linux, il kiosk su questi sistemi e i tasti di sistema a schermo intero non sono ancora stati provati su computer veri.
- lilOS senza UI non è ancora stato provato su macOS e Linux (terminale, comando `lilos` nel PATH).

## lilOS senza UI

**lilOS senza UI** è lilOS che gira su un computer senza scrivania, finestre e pagina web: resta acceso solo il programma che conserva i dati, e lo si usa da un terminale con il comando [`lilos`](#il-comando-lilos). Serve per un server, per un computer che nessuno guarda, o per chi preferisce la riga di comando. Esiste da lilOS 1.34.0 (e dal programma lilOS 0.4.0).

Cosa cambia rispetto al lilOS di sempre:

- **Nessuna pagina.** Se apri l'indirizzo di lilOS in un browser non compare niente: risponde un errore vuoto, senza testo. Rispondono solo le richieste dei programmi, come il comando `lilos`.
- **Niente app.** File Manager, Editor, AppStore e le altre non si installano, perché non avrebbero dove aprirsi. I tuoi file, gli utenti e le impostazioni ci sono comunque, e li tocchi dal terminale.
- **Moduli e lingue sì.** Con `lilos appstore` un amministratore installa e toglie i moduli di lilOS, e chiunque installa le lingue (vedi [Moduli e lingue: appstore](#moduli-e-lingue-appstore)).
- **La licenza si accetta nel terminale**, una volta, quando lilOS parte (vedi [La licenza senza UI](#la-licenza-senza-ui)).

### Come averlo

- **Con il programma lilOS** (il modo più semplice). Al [primo avvio](#il-primo-avvio) scegli **Senza UI**. Il programma ti mostra la licenza (spunta che l'hai letta), poi ti fa creare l'amministratore. Ci sono due caselle, accese per proposta: **Avvia lilOS all'accensione del computer** e **Aggiungi il comando lilos al PATH** (così scrivi `lilos` da qualunque terminale). Alla fine dice **lilOS senza UI è acceso** e puoi premere **Apri il terminale lilOS**.
  Dopo, il programma non apre nessuna finestra: resta come icona nell'area di notifica. Il suo menu mostra lo stato (acceso, in avvio, fermo, errore) e ha **Apri il terminale lilOS**, **Copia il comando lilos**, **Log del kernel**, **Riavvia il kernel**, **Avvia all'accensione del computer**, **Passa a lilOS con la UI** ed **Esci (ferma lilOS)**.
- **Senza il programma**, per chi amministra un server: installa lilOS con `node system/kernel/tools/install.js <cartella> --no-ui`, oppure metti `"ui": false` in `config.json`, oppure `"kernel": { "ui": false }` in `lilos-install.json`. Dettagli nella [documentazione per sviluppatori](../sviluppatore/api.md#lilos-senza-ui-ui-false).

**Passare alla UI.** Dal menu dell'icona, **Passa a lilOS con la UI**: lilOS si ferma, riparte con la sua pagina e installa da solo le app di sistema (la prima volta ci vogliono alcuni minuti e serve internet). Utenti, file e comando `lilos` restano come sono. **Il passaggio inverso, dalla UI a senza UI, in questa versione non c'è.**

### La licenza senza UI

Senza pagina non c'è dove accettare la [licenza di lilOS](#la-licenza-di-lilos): lo chiede lilOS stesso nel terminale in cui lo avvii.

- La prima volta compare il testo, a pagine (**Invio** per andare avanti, **q** per smettere di leggere). Per accettare scrivi `accetto` e premi Invio; qualsiasi altra risposta ferma lilOS.
- Se non c'è un terminale (per esempio parte da solo con il computer) e la licenza non è mai stata accettata, **lilOS non parte** e lo scrive nel log, con codice di uscita 3. Avvialo una volta da un terminale, oppure con l'opzione `--accept-license` (o la variabile `LILOS_ACCEPT_LICENSE=1`), che equivale ad accettarla: usala solo se l'hai letta.
- Se il testo della licenza cambia dopo che l'hai accettata e non c'è un terminale, lilOS **parte lo stesso** e lo scrive nel log. Un amministratore la rilegge e la accetta con `lilos license accept` (vedi [Licenza: license](#licenza-license)).

## Il comando lilos

`lilos` è il [Terminale](#terminale) di lilOS in un terminale del tuo computer. Funziona con qualunque lilOS, anche con la UI, e anche con uno che gira su un altro computer. Usa gli stessi comandi, le stesse cartelle e gli stessi permessi del Terminale in lilOS: quello che fai da qui compare subito anche nelle finestre aperte (cartelle, file, Cestino).

Il comando c'è dove è installato **lilOS senza UI** o il modulo **terminal-cli** (con lilOS senza UI viene da solo). Se è nel PATH basta scrivere `lilos`; altrimenti scrivi il percorso del file `lilos.cmd` (Windows) o `lilos` (macOS e Linux) che sta nella cartella di lilOS, accanto a `run.js`.

### Usarlo

| Scrivi | Cosa succede |
| --- | --- |
| `lilos` | Entra nella shell di lilOS: scrivi un comando dopo l'altro. Hai la modifica della riga, Tab per completare, le frecce per la storia dei comandi, Ctrl+C per interrompere, `exit` o Ctrl+D per uscire. Il file `~/.bashrc` di lilOS si legge all'ingresso, come nel Terminale. |
| `lilos ls Documenti` | Esegue un solo comando e torna al tuo terminale. Il codice di uscita è quello del comando, quindi si può usare negli script. |
| `lilos -c "ls \| wc -l"` | Esegue una riga intera, con pipe, `;` e `&&`, secondo la shell di lilOS (non quella del computer). |
| `lilos < script.sh` | Con l'ingresso da un file o da una pipe, legge ed esegue quello che arriva. |

I comandi sono quelli del Terminale: `help` li elenca. Le cartelle sono quelle di lilOS (la tua home), non quelle del computer.

### Accedere

Con un solo utente non c'è niente da scrivere. Altrimenti `lilos` ti chiede **Utente** e **Password** (la password non si vede mentre scrivi), poi **Resta connesso su questo computer? [S/n]**: con sì, la prossima volta entri subito. La sessione è salvata in un file riservato a te, nella cartella `%APPDATA%\lilos-cli` (Windows) o `~/.config/lilos-cli` (altri sistemi). Per dimenticarla: `lilos --logout`.

Senza un terminale (uno script, un'operazione pianificata) non può chiedere niente: dai l'utente con `--user` e la password con la variabile `LILOS_PASSWORD`, oppure entra prima una volta a mano e scegli di restare connesso.

### Opzioni

| Opzione | Cosa fa |
| --- | --- |
| `--server INDIRIZZO` | Usa un altro lilOS, per esempio `lilos.azienda.it:8790`. Senza, usa il lilOS di questo computer. |
| `--user NOME` | Accede come NOME. |
| `--cwd CARTELLA` | Parte da questa cartella di lilOS invece che dalla home. |
| `--no-color` | Niente colori. |
| `--logout` | Esce e dimentica la sessione salvata per quel lilOS. |
| `-c "RIGA"` | Esegue una riga. |
| `--version`, `--help` | Versione e aiuto. |

Le variabili `LILOS_SERVER`, `LILOS_USER` e `LILOS_PASSWORD` valgono come `--server`, `--user` e la password; `NO_COLOR` come `--no-color`. `LILOS_CLI_DIR` cambia la cartella dove si salvano sessione e storia dei comandi.

### Codici di uscita

| Codice | Significato |
| --- | --- |
| quello del comando | Per i comandi eseguiti (130 se li interrompi con Ctrl+C) |
| 2 | Uso sbagliato (opzione sconosciuta, indirizzo non valido) |
| 3 | lilOS non risponde all'indirizzo |
| 4 | Accesso non riuscito |

### Cosa non c'è

Il comando non ha una pagina davanti, quindi non tutto è possibile:

- **Aprire cose**: `open` e `xdg-open` non aprono finestre.
- **I comandi che aggiungono le app**.
- **Le sessioni remote** (`ssh`, `telnet`, …) e il comando `nettest`.
- **Cambiare i tag** dei file.
- **Il comando `logic`** (`logic` per i progetti di Logic Studio) c'è solo nel comando `lilos`, non nell'app Terminale.

### Moduli e lingue: appstore

Il comando `appstore` fa dal terminale una parte di quello che fa l'[AppStore](#lappstore). **Le app non si installano da qui** (serve la pagina): solo moduli di lilOS e lingue.

```
lilos appstore list                 # cosa c'è (anche: --installed, --updates, --modules, --languages)
lilos appstore search mqtt
lilos appstore info call-mqtt
lilos appstore install call-mqtt    # un modulo (amministratori)
lilos appstore install lang:de      # una lingua (tutti, vale per tutti)
lilos appstore remove call-mqtt
lilos appstore update               # tutti gli aggiornamenti; oppure con i nomi
lilos appstore repo list            # repository: add INDIRIZZO | add community | remove ID
lilos appstore system               # le versioni di lilOS: update | use VERSIONE | remove VERSIONE
lilos appstore restart              # riavvia il kernel e aspetta che torni
```

- Una lingua si scrive `lang:` e il codice (`lang:de`, `lang:pt-BR`). Un nome senza prefisso è un modulo.
- **Moduli, repository e lilOS** li gestisce un amministratore. Le lingue le installa chiunque, e valgono per tutti gli utenti.
- Prima di installare vedi cosa serve (anche gli altri moduli da cui dipende) e confermi. Con `-y` si conferma da soli. Un modulo **non firmato** chiede una conferma a parte, o si dà `--allow-unsigned`: installalo solo se ti fidi di chi lo ha fatto.
- I moduli nuovi partono quando lilOS si riavvia: il comando lo propone. L'ultimo modulo dei file non si può togliere.
- `appstore system` è l'unico modo, senza UI, di aggiornare lilOS stesso. Se la versione nuova non parte, lilOS torna da solo alla precedente.
- Il repository **community** (moduli non ufficiali) si aggiunge con `appstore repo add community`; l'installazione con `--no-ui` lo aggiunge già.

### Programmi di Logic Studio: logic

Il comando `logic` fa girare i progetti di Logic Studio come programmi del terminale. Serve il motore di Logic Studio dalla 1.6.0.

```
lilos logic run Documenti/ciao.lsch --name Eugenio    # esegue e aspetta la fine
lilos logic run -q Documenti/ciao.lsch                # senza scrivere niente
lilos logic run --active Documenti/server.lsproj      # lo lascia acceso come programma attivo
lilos logic list                                      # i tuoi programmi (--all: di tutti, per gli amministratori)
lilos logic stop ID                                   # ferma un programma
```

- Il file è un progetto (`.lsproj`), uno schema (`.lsch`) o un'app fatta con Crea app (`.lsapp`), tra i file di lilOS. **Tutto quello che scrivi dopo il file** va al programma come argomenti, anche `-x` e `--nome`.
- Il comando aspetta che il programma finisca. Scrive le righe delle console (avvisi ed errori sull'uscita degli errori) e, se il programma fa una domanda, la fa a te e legge la risposta dalla tastiera. **Ctrl+C** ferma il programma.
- **Il codice di uscita** viene dal blocco **Exit**: un numero intero da 0 a 255 è il codice; `true` o niente, 0; `false`, 1; qualsiasi altro valore viene scritto (un testo così com'è, il resto in JSON) e il codice è 0. Se il programma va in errore, o lo ferma qualcun altro, il codice è 1.
- Con `-q` non scrive niente (resta il codice).
- Se chiudi il terminale a metà, il programma si ferma da solo dopo circa un minuto. Con `--active` invece resta acceso, come quando lo attivi dall'IDE (e riparte con lilOS).

### Licenza: license

```
lilos license            # il testo della licenza e se è accettata
lilos license status     # solo se è accettata (codice di uscita 1 se no)
lilos license accept     # la accetta (amministratori; -y senza chiedere)
```

## I tuoi dati

lilOS salva da solo, mentre lavori, le cartelle e i file con i loro nomi e il loro contenuto (quando salvi nell'Editor), i tag e quelli che hai messo su file e cartelle, l'ordine e i collegamenti della barra del File Manager (gli stessi in tutti i workspace), la posizione degli elementi sulla scrivania, il punto della scrivania che stavi guardando, le app che si aprono da sole quando entri e le impostazioni. Tutto questo è salvato per ogni [workspace](#i-workspace). Anche le workarea sono salvate. Dopo aver ricaricato la pagina le finestre di ogni workspace si riaprono dove erano, dentro e fuori dalle workarea (quelle di un workspace in cui non sei si riaprono la prima volta che ci vai). Il testo non ancora salvato in una finestra però non si salva da solo: ricaricando la pagina si perde, quindi salva con Ctrl S. Il resto lo ritrovi com'era.

Il salvataggio avviene **nel tuo spazio su lilOS**, non nel browser:

- con un altro browser o un altro computer, dopo aver fatto l'accesso, trovi la stessa scrivania;
- cancellare i dati di navigazione del sito non cancella la tua scrivania (vedi [Accedere e uscire](#accedere-e-uscire) per i dati che il browser aveva prima);
- se lilOS non riesce a salvare, compare un avviso e riprova da solo; non chiudere la pagina finché non compare **Modifiche salvate**;
- le connessioni della **Rete** (nome, indirizzo, protocollo) sono salvate nel tuo spazio su lilOS; le password (o, per OneDrive, l'accesso) solo se scegli **Ricorda la password** (**Ricorda l'accesso**), e cifrate. I file che stanno su un server restano sul server: lilOS non ne tiene una copia;
- le **operazioni della Pianificazione** e il loro storico sono salvati dal computer di lilOS, nel modulo `scheduler`: restano dopo un riavvio e un aggiornamento. Le intestazioni segrete delle richieste web sono cifrate;
- le **automazioni** (i passi, le domande, le scorciatoie) sono file `.automata` nella cartella **Automazioni** della tua home (o dove li metti): le password non si salvano mai;
- gli sketch di **ArduinoIDE4LilOS** sono file normali nella cartella **Arduino** della tua home; le librerie che installi e le tue scelte (scheda, porta) restano tue; le porte che il browser ti ha lasciato usare sono ricordate dal browser, non da lilOS;
- le **richieste di NetTest**: «Le mie richieste», la cronologia (le ultime 200), le variabili globali, l'ambiente scelto per ogni collezione e i cookie sono salvati nel tuo spazio su lilOS, come le impostazioni; le altre collezioni sono file `.nettest` della tua home. I valori segreti degli ambienti sono sigillati nel file: li apri solo tu, su questo lilOS;
- le **sessioni di NetWave** sono file `.nwsession` (di serie in Documenti › Sessioni NetWave) con solo indirizzi e titoli; la cronologia delle pagine e delle sessioni, i permessi ricordati per i siti e le opzioni sono nel tuo spazio su lilOS. I cookie e gli accessi ai siti li tiene il programma lilOS sul computer in cui lo usi, per ogni utente di lilOS, e non girano con te su un altro computer;
- gli host del **Terminale** (nome, cartella, indirizzo, impostazioni) sono salvati nel tuo spazio su lilOS, come le connessioni della Rete: le password solo se scegli **Ricorda password e passphrase**, e cifrate. Le sessioni aperte non si salvano: durano finché il kernel resta acceso e al più 10 minuti senza finestra;
- ogni utente può avere uno **spazio** massimo e ogni file un peso massimo (di serie 1 GB): vedi [Spazio e limiti dei file](#spazio-e-limiti-dei-file);
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
| Arancione scuro | Collezione di NetTest | nettest |
| Azzurro | Sessione di NetWave | nwsession |
| Grigio | Archivio e altri | zip, rar, 7z, tar, gz e ogni estensione non elencata |

## Scorciatoie da tastiera

Queste sono le combinazioni iniziali. Puoi cambiarle tutte nel **Pannello di controllo → Usabilità → Scorciatoie** (vedi sotto).

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
| Ctrl Invio | Invia la richiesta (o collega la sessione) in NetTest |
| Ctrl Alt N | Nuova richiesta HTTP in NetTest (con la sua finestra in primo piano) |
| Ctrl Alt W | Chiudi la scheda in NetTest |
| Ctrl T, Ctrl W, Ctrl Shift T | Nuova scheda, chiudi la scheda, riapri la scheda chiusa in NetWave |
| Ctrl N, Ctrl Shift N | Nuova finestra, nuova finestra privata in NetWave |
| Ctrl L, Alt D, F6 | Vai all'indirizzo in NetWave |
| F5 o Ctrl R, Ctrl Shift R | Ricarica, ricarica senza usare la copia salvata in NetWave |
| Alt ←, Alt →, Alt Home | Indietro, avanti, pagina iniziale in NetWave |
| Ctrl Tab, Ctrl Shift Tab (o Ctrl Pag giù, Ctrl Pag su) | Scheda successiva, precedente in NetWave |
| Ctrl 1 … Ctrl 8, Ctrl 9 | Vai alla scheda 1 … 8, all'ultima scheda in NetWave |
| Ctrl H, Ctrl J | Cronologia, download in NetWave |
| Ctrl S, Ctrl Shift S, Ctrl O | Salva la sessione, salvala come nuova, apri una sessione in NetWave |
| Ctrl F, F3 | Cerca nella pagina, cerca ancora in NetWave |
| Ctrl +, Ctrl −, Ctrl 0 | Ingrandisci, riduci, dimensione reale della pagina in NetWave |

Un comando non ha nessun tasto di serie: **Apri o chiudi le notifiche** (vedi [Le notifiche](#le-notifiche)). Puoi dargliene uno quando vuoi.

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

Apri il **Pannello di controllo → Usabilità → Scorciatoie**. Ogni comando mostra le sue combinazioni.

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
Probabilmente è un collegamento a un'app che non c'è più (per esempio i collegamenti a Terminale, Browser, Calendario, Immagini, Musica o Posta delle versioni precedenti, o un'app rimossa dall'amministratore): cancellalo. Le app che ci sono sempre sono File Manager, Pannello di controllo e AppStore; le altre le installa un amministratore (vedi [L'AppStore](#lappstore)).

**Nel Registratore un passo è barrato. Perché?**
Perché l'app non sa ancora registrare quella operazione (per esempio il pennello di Photo): non entra nell'automazione. Un passo barrato con «annullato con Ctrl Z: tolto» è invece uno che hai annullato.

**Un file si apre con l'app sbagliata, o mi chiede ogni volta.**
Cambia l'app nel Pannello di controllo → Usabilità → Tipi di file, oppure spunta "Usa sempre quest'app" nella finestra Apri con.

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
Non si vede se l'elemento è nel Cestino o sulla Scrivania di un altro workspace; ricompare, al suo posto, quando l'elemento torna visibile. Se hai più di 80 voci, le più vecchie vengono tolte. Per rimetterlo: trascina l'elemento tra due voci della barra. Il ripristino "Scrivania e file iniziali" (Pannello di controllo → Archiviazione) azzera anche la barra.

**Non trovo più i miei elementi o una finestra.**
Controlla di essere nel workspace giusto: il nome è nel pulsante accanto al logo. Poi premi Shift 1 per inquadrare tutto, oppure guarda la mappa in miniatura. Per una finestra, usa il suo pulsante nella barra delle applicazioni.

**Dove sono finiti i miei file?**
Se mancano dalla scrivania o dal File Manager, forse hanno un **tag invisibile**: un tag invisibile nasconde ovunque gli elementi che lo hanno. Apri il File Manager, fai clic sul tag nella barra a sinistra (quelli invisibili hanno un occhio barrato) e li trovi lì. Per farli tornare, accendi **Visibile** nel Pannello di controllo → Tag, oppure togli il tag agli elementi. Se non è questo, prova anche il [Cestino](#il-cestino) e controlla di essere nel workspace giusto.

**Un file di un altro workspace non si vede.**
La cartella Scrivania di ogni workspace è visibile solo da lì. Per condividere un file con gli altri workspace tienilo in Documenti, Immagini o Download. Se hai eliminato il workspace, i suoi file sono in Documenti → Scrivania di *nome*.

**Dopo un aggiornamento di lilOS compare «Aggiornamento di lilOS non riuscito».**
La versione nuova non è partita e lilOS è tornato da solo a quella di prima: va tutto come prima dell'aggiornamento. L'avviso dice il motivo. Chi gestisce lilOS può guardare il registro del kernel; poi si può riprovare dall'AppStore.

**Mancano File Manager, Pannello di controllo o l'AppStore, o il menu di avvio non ha app.**
Quelle app arrivano dal repository ufficiale, e il kernel le installa da solo quando parte. Se in quel momento il computer del kernel non riusciva a raggiungerlo (niente rete, accesso negato), lilOS parte senza. Chiedi a chi gestisce lilOS di sistemare l'accesso e di riavviare il kernel: le app compaiono da sole.

**Ho cambiato la lingua ma un'app resta in inglese (o in un'altra lingua).**
L'app non ha la lingua che hai scelto: in quel caso usa l'inglese. Le lingue installate dall'AppStore traducono lilOS, non le app. Una parte in sottofondo cambia lingua quando riparte (vedi [La lingua](#la-lingua)).

**Ho scelto una lingua ma lilOS è ancora in inglese (o in parte).**
Controlla che la lingua sia installata (AppStore → Lingue). Se è appena cambiata, ricarica lilOS quando te lo chiede: quello che era già disegnato resta nella lingua di prima. Se qualcuno ha rimosso la lingua che usavi, lilOS è tornato all'inglese e te l'ha detto con una notifica. Un testo che la lingua non ha ancora compare in inglese.

**Ho installato un'app ma un altro utente (o un'altra scheda) non la vede.**
Dovrebbe comparire da sola dopo un istante. Se non succede, ricarica la pagina.

**Ho aggiornato un'app ma vedo ancora la versione di prima.**
Le finestre già aperte restano com'erano finché non le riavvii: usa il pulsante con la freccia verso il basso nell'area di notifica (in basso a destra), oppure chiudi e riapri la finestra. Se l'app chiede di riavviare lilOS, riavvia da quel pulsante (rosso) o dall'avviso.

**Un'app non parte e compare una notifica.**
L'app è nascosta nel workspace in cui sei. Mostrala nel Pannello di controllo → Workspace → Questo workspace.

Oppure l'app non è riuscita ad avviarsi: la notifica dice «*nome* non è partita» e il motivo. Se l'amministratore ha appena cambiato come gira l'app, chiudi la finestra e riaprila.

**Come faccio a sapere se un'app può fare troppo?**
Tasto destro sull'app nel menu di avvio → **Proprietà…**: la scheda **Permessi** elenca cosa può fare, la scheda **Sicurezza** dice se gira isolata. Un'app non isolata può fare tutto quello che puoi fare tu, quindi lasciala così solo se ti fidi di chi l'ha scritta. Solo un amministratore cambia il modo.

**All'apertura compare "Il kernel di lilOS non risponde".**
Il programma che conserva i tuoi dati non è acceso: chiedi a chi gestisce lilOS di avviarlo, poi premi **Riprova**. I tuoi dati non sono persi.

**Compare "Modifiche non salvate".**
lilOS non riesce a raggiungere il suo archivio (il computer ha perso la connessione, o l'archivio è spento). Riprova da solo ogni poco; non chiudere la pagina. Quando ci riesce compare "Modifiche salvate".

**Un file non si salva: "File troppo grande" o "Spazio esaurito".**
Il file supera la dimensione massima di lilOS, oppure il tuo spazio è finito. Il messaggio dice quanto può pesare un file o quanto spazio resta. Per fare posto elimina file e **svuota il cestino**, che conta nello spazio. Se serve più spazio o un limite più alto, chiedi a un amministratore. Vedi [Spazio e limiti dei file](#spazio-e-limiti-dei-file).

**Ho dimenticato la password di un file cifrato con FileCrypt.**
Non si può recuperare: il file è perso. Nemmeno un amministratore può aprirlo. Vedi [FileCrypt](#filecrypt).

**Un file ha un lucchetto grigio e non si apre.**
È stato cifrato da un'app che ora non è installata. Chiedi all'amministratore di installarla di nuovo dall'AppStore: il file è ancora intatto. Se l'app non tornerà, tasto destro sul file → **Proprietà…**: la riga **Dati di** *nome dell'app* ha il pulsante **Rimuovi**. Il file resta com'è (cifrato, quindi illeggibile) ma lilOS smette di rifiutarsi di aprirlo.

**Un'operazione della Pianificazione non è partita.**
Apri lo [Storico](#pianificazione): se c'è una riga «in attesa di lilOS», era un'operazione che gira nel browser e lilOS non era aperto. Se c'è «saltata», la volta prima era ancora in corso o il kernel era spento e hai scelto di non recuperarla. Se manca del tutto, controlla che l'operazione non sia in pausa e che l'ora e il fuso orario siano quelli giusti.

**Ho dimenticato la password.**
Non si può recuperare da lilOS: chiedi a chi lo gestisce di cambiartela. Dopo il cambio devi accedere di nuovo ovunque.

**Lo zoom del browser cambia invece della scrivania.**
Non dovrebbe succedere: lilOS intercetta Ctrl + rotella. Se succede, fai clic sulla scrivania e riprova.
