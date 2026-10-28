# Stato e roadmap

Aggiornato al 28 ottobre 2026 (tag, trascinamento tra viste e collegamenti aggiunti, SDK 0.2.3 non ancora rilasciata; ultimo commit: 1762512).

## Cosa c'è

| Area | Stato |
| --- | --- |
| Scrivania infinita | Fatta: spostamento, zoom al cursore, animazioni, "Mostra tutto", camera salvata |
| Minimappa e controlli zoom | Fatti |
| Elementi del desktop | Fatti: cartella, file, app; selezione multipla, trascinamento con griglia, rinomina, elimina, riordina, menu contestuali, salvataggio |
| Barra in basso | Fatta: logo, pulsante del workspace, area finestre, utente, data e ora |
| Menu di avvio | Fatto: ricerca, tastiera, piè di pagina con utente |
| Menu contestuale | Componente riutilizzabile fatto |
| SDK `@lilos/sdk` | Fatto (0.2.3): basi, controlli, `Window`, `SettingsView`, `SettingsWindow`, `settings`, `shortcuts`, `fs`, `selectionGesture` |
| File system | Fatto: cartelle, file con contenuto (IndexedDB) e collegamenti, cartelle di sistema, migrazione della vecchia scrivania |
| Associazioni dei tipi di file | Fatte: predefinite dal registro, modificabili in Impostazioni → Usabilità → Tipi di file, finestra "Apri con" |
| Selezione sulla scrivania | Fatta: clic, Ctrl/Shift, rettangolo, percorso libero (Alt + trascina, modificabile) |
| Scorciatoie da tastiera | Fatte: registro unico, 20 comandi, modificabili in Impostazioni → Usabilità → Scorciatoie, con controllo di conflitti e combinazioni non valide |
| Gestore delle finestre | Fatto, versione di base: apertura, focus, trascinamento, ridimensionamento da tutti i bordi e gli angoli, ingrandisci, riduci, chiudi, pulsanti nella barra; controlli e bordi attivabili uno per uno |
| Finestra base delle impostazioni | Fatta (`SettingsWindow`), dal render approvato `design/settings-window.html` |
| App | File (File Manager), Editor e Impostazioni fatte. Le altre 6 del registro **da fare** |
| Editor: cartelle | Fatto: Apri un file / Apri una cartella, pannello a destra ridimensionabile con creazione, rinomina, spostamento (trascinamento, anche da e verso scrivania e File, o "Sposta in…" dentro la radice) ed eliminazione |
| Editor: linguaggi | Fatto: Tree-sitter (JS, Python, JSON, CSS, HTML, Shell), TextMate (anche grammatiche aggiunte), Language Server nel browser (JSON, CSS, HTML) ed esterni via WebSocket, schemi JSON da file o web |
| Menu configurabili | Fatto per lo sfondo della scrivania (sottomenu Nuovo, azioni, app, separatori, ordine) |
| Tema chiaro / scuro | Fatto |
| Workarea | Fatte (28 ottobre 2026): aree della scrivania con titolo, appartenenza per centro, niente sovrapposizioni, spostamento e ridimensionamento, ridurre a icona e riaprire con le finestre com'erano, proprietà con metadati, finestre salvate al ricaricamento. Vedi [D25](decisioni.md#d25-workarea-aree-della-scrivania-con-contenuto-geometrico) |
| Annulla e ripeti | Fatti (28 ottobre 2026): Ctrl Z / Ctrl Y centrali, per chi ha il focus ([D26](decisioni.md#d26-annulla-e-ripeti-centrali-per-chi-ha-il-focus)). Scrivania (creare, rinominare, eliminare con il contenuto, spostare, riordinare, workarea), finestra File, pannello della cartella dell'Editor e testo dell'Editor. Messaggi in basso, voci di menu `edit.undo` / `edit.redo` |
| Workspace | Fatti (28 ottobre 2026): scrivanie separate, ognuna con cartella Scrivania privata, vista, posizioni, workarea, finestre e app installate; Documenti, Immagini e Download condivise; proprietario su ogni nodo e colonna Workspace in File; pulsante nella barra e Ctrl Alt ← / →; finestre nascoste (non chiuse) cambiando workspace e ricordate al ricaricamento anche fuori dalle workarea; app installate per workspace; Impostazioni → Workspace; eliminazione che tiene i file; migrazione dei dati precedenti in «Principale». Vedi [D27](decisioni.md#d27-workspace-scrivanie-separate-isolate-dal-file-system) |
| Cestino | Fatto (28 ottobre 2026): eliminare sposta nel cestino (seconda radice nascosta di `fs`, [D28](decisioni.md#d28-il-cestino-è-una-seconda-radice-nascosta-del-file-system)), che sopravvive alla ricarica. Voce Cestino in File (ripristina, elimina definitivamente, ripristina tutto, svuota), pulizia automatica dopo 30 giorni (modificabile), conferma e «elimina definitivamente» configurabili in Impostazioni → Usabilità → Cestino. Visibile per workspace per ciò che viene dalla Scrivania privata |
| Tag | Fatti (28 ottobre 2026): etichette colorate (8 colori) da mettere su file e cartelle dal menu del tasto destro → Tag, uguali in tutti i workspace ([D29](decisioni.md#d29-i-tag-stanno-sui-nodi-e-un-tag-invisibile-nasconde-gli-elementi)). Pallini sulle icone e in File, vista del tag in File (tutti gli elementi con quel tag, ovunque) con "Mostra nella cartella", Impostazioni → Tag (nuovo, nome, colore, visibile, elimina). Un tag invisibile nasconde i suoi elementi ovunque; si ritrovano dalla vista del tag |
| Trascinamento di file e cartelle | Fatto (28 ottobre 2026): un solo modulo (`src/items/itemDrag.js`, [D30](decisioni.md#d30-un-solo-modulo-di-trascinamento-per-tutte-le-viste-di-file-e-cartelle)) per scrivania, app File (elenco, icone, percorso, barra laterale) e pannello dell'Editor: si sposta tutta la selezione da una vista all'altra, con fantasma, Esc e un solo passo di annulla nella vista di partenza; rilasciando sul Cestino si elimina |
| Barra laterale di File: collegamenti e ordine | Fatti (28 ottobre 2026): la sezione «Collegamenti» in cima contiene le voci fisse (Home, Scrivania, Documenti…) e i collegamenti dell'utente, nell'ordine che sceglie trascinando; Tag e Cestino stanno sotto, fuori dall'ordine. Si aggiungono trascinando tra due voci o dal menu «Aggiungi alla barra laterale di File» (scrivania, File, Editor); al centro di una cartella il rilascio sposta davvero. Eliminare un collegamento (×, Canc, menu) toglie solo la voce e si annulla con Ctrl Z nella finestra File. `src/items/links.js`, `lilos:files-sidebar`, al massimo 80, uguali in tutti i workspace |
| Apertura di cartelle e file | Fatta: cartelle nell'app File, file con l'app associata o "Apri con" |
| Utenti | **Da fare.** Nome fisso in `sdk/core/session.js` |
| Test automatici | **Da fare.** Vedi [Processo](processo.md) |

## Limiti noti

### Funzionali

- **Tag: mettere o togliere un tag non si annulla.** Non entra nella cronologia (Ctrl Z non lo vede).
- **Tag: uguali in tutti i workspace.** Le definizioni (nome, colore, visibile) sono globali, ma la vista del tag mostra solo ciò che il workspace attuale vede (la sua scrivania e le cartelle condivise).
- **Tag: elementi dentro una cartella nascosta.** Un elemento in una cartella con un tag invisibile non è nascosto a sua volta (se non ha il tag), ma non si vede finché la cartella è nascosta: si raggiunge dalla vista del tag della cartella o da "Mostra nella cartella".
- **Tag: le cartelle di sistema non si etichettano.** Documenti, Immagini e Download non hanno la voce Tag attiva (`fs.setTags` lancia un errore sui nodi `system`). I collegamenti alle app sulla scrivania (File, Impostazioni…) sono nodi normali: si possono etichettare e nascondere con un tag invisibile; l'app resta raggiungibile dal menu di avvio.
- **Tag: nessuna scorciatoia da tastiera** per assegnarli o aprirne la vista.
- **Tag: la ricerca per tag è solo nell'app File.** Il menu di avvio cerca solo le app.
- **Tag: al massimo 100 tag**, 30 per elemento, nomi di 30 caratteri.
- **Cestino: l'eliminazione definitiva non si annulla.** Vale per "Elimina definitivamente" nel cestino, per lo svuotamento, per la pulizia automatica e, con "Elimina definitivamente" attivo nelle impostazioni, per l'eliminazione dopo una ricarica (finché la pagina è aperta resta Ctrl Z).
- **Cestino: non si apre dalla scrivania.** Si raggiunge da File (barra laterale) o da Impostazioni → Usabilità → Cestino; non c'è un'icona sulla scrivania. Le workarea eliminate non passano dal cestino (si annulla solo con Ctrl Z).
- **Cestino: occupa spazio.** I nodi cestinati restano in `lilos:fs` (`localStorage`) e i contenuti in IndexedDB fino all'eliminazione definitiva, e non c'è un limite di dimensione, solo di tempo (`trashRetention`).
- **Cestino: non si apre né si rinomina un elemento cestinato**; va prima ripristinato. Il ripristino non permette di scegliere la cartella: torna dove era, o in Home se non c'è più.
- **Le cronologie si perdono.** Stanno solo in memoria: vuote dopo una ricarica; quella dell'app File è per finestra e si perde chiudendola.
- **Annulla solo in alcuni posti.** Impostazioni e le altre finestre non hanno una cronologia: Ctrl Z non fa nulla (e non agisce sulla scrivania dietro). Non si annullano le modifiche fatte nella finestra delle proprietà di una workarea, né ridurre a icona e riaprire una workarea.
- **Annullare «Sposta in…» non rimette il nome cambiato per renderlo unico** (pannello dell'Editor, `moveNode`). Il trascinamento (`moveNodes`) invece lo rimette.
- **Trascinamento: solo spostare.** Niente copia (Ctrl), niente apertura automatica delle cartelle al passaggio e nessuno spostamento da tastiera su scrivania e File (solo «Sposta in…» nell'Editor).
- **Trascinamento: dall'Editor un elemento alla volta**, perché il pannello non ha selezione multipla.
- **Barra laterale di File: aggiungere collegamenti e riordinare non si annulla** (eliminare un collegamento e spostare un elemento in una cartella sì). Un collegamento a un nodo che non si vede (cestino, Scrivania di un altro workspace) non compare ma resta nell'ordine. Tag e Cestino non si trascinano e non fanno parte dell'ordine.
- **Blocco Tag della barra laterale di File: non è un bersaglio** (al centro non succede niente; non si assegna un tag trascinando un elemento su di lui).
- **Niente navigazione da tastiera tra gli elementi.** Non si possono scegliere gli elementi con le frecce.
- **Più schede aperte si sovrascrivono.** Ogni scheda salva l'intero desktop (compreso l'elenco dei workspace): l'ultima che salva vince e cancella le modifiche fatte nelle altre. Non c'è sincronizzazione tra schede (si potrebbe usare l'evento `storage`).
- **Workspace: al massimo 20.** Oltre, «Nuovo workspace» mostra un messaggio.
- **Workspace: finestre di un workspace eliminato.** Passano nel workspace attuale e si mettono al centro della vista, anche dentro una workarea attuale. Le finestre secondarie (selettori, proprietà…) si chiudono.
- **Workspace: file condiviso aperto altrove.** Un file condiviso aperto in un Editor di un altro workspace e poi spostato nella Scrivania privata del workspace attuale diventa invisibile a quell'Editor: salvare fallisce.
- **Workspace: preferenze globali.** Tema, colore principale, scorciatoie, menu e tipi di file sono uguali in ogni workspace.
- **Workspace: il menu del pulsante non ha `aria-expanded`.**
- **Workspace: finestre secondarie non ricordate.** Come per le workarea, selettori e proprietà non tornano dopo la ricarica; Impostazioni riparte dalla prima scheda e le finestre ingrandite tornano non ingrandite.
- **Workarea: finestre di servizio e stato parziale.** Selettori, proprietà e altre finestre secondarie si chiudono senza essere salvate. Impostazioni si riapre sulla prima scheda. Le finestre ingrandite tornano non ingrandite. Salvano il proprio stato solo File ed Editor (`getState`).
- **Workarea: elementi nascosti ancora in File.** Gli elementi di una workarea ridotta restano in `/Scrivania`, quindi si vedono nell'app File.
- **Workarea: voci di menu solo sullo sfondo.** Titolo, Rinomina, Proprietà, Riduci ed Elimina si trovano solo nel menu dello sfondo (e della barra del titolo) dentro l'area, non tra le voci configurabili. L'unica voce configurabile è **Nuovo → Workarea** (`workarea.create`), che non viene aggiunta a un menu già personalizzato dall'utente.
- **Workarea: niente sovrapposizioni.** Un'area non si può creare, spostare o ingrandire sopra un'altra aperta; al massimo 200 workarea, 30 finestre salvate per workarea.
- **Il bordo inferiore di una finestra può finire sotto la barra in basso**: per ridimensionarlo bisogna prima spostare la finestra o la vista.
- **Ridimensionamento solo con il mouse**: niente tasti per cambiare le dimensioni.
- **Esc non si può assegnare a un comando nuovo**: durante la registrazione annulla. Resta assegnato a "Togli la selezione" finché non lo togli, e torna con Ripristina.
- **Le combinazioni riservate dal browser** sono un elenco fisso (Ctrl W, Ctrl T, Ctrl N…): altre combinazioni intercettate dal browser o dal sistema operativo si possono assegnare ma potrebbero non arrivare a lilOS.
- **Scorciatoie uguali in contesti diversi** non sono ammesse: una combinazione appartiene a un solo comando, anche se i due comandi non sono mai attivi insieme.
- **Language server solo per JSON, CSS e HTML nel browser**: per JavaScript, TypeScript, Python e gli altri servono server esterni via WebSocket (con un ponte sul proprio computer); senza, restano i suggerimenti interni approssimati.
- **Dal language server solo completamento ed errori**: niente informazioni al passaggio del mouse, vai alla definizione, formattazione.
- **Messaggi dei server in inglese.**
- **Schemi web**: servono CORS anche sui reindirizzamenti (per esempio `json.schemastore.org` reindirizza senza CORS: usare `www.schemastore.org`).
- **Menu configurabile solo per lo sfondo della scrivania**: i menu degli elementi e dell'app File sono ancora fissi; le voci non si rinominano (si tolgono e si aggiungono).
- **Tema chiaro/scuro senza "automatico"** (seguire il sistema operativo).
- **Editor semplice**: un documento per finestra, niente cerca e sostituisci, niente a capo automatico, niente "Salva come" (i documenti nuovi vanno nella cartella aperta o in Documenti), niente schede per più file aperti, evidenziazione approssimata; oltre 300 000 caratteri il testo non è colorato.
- **Solo l'Editor apre file**: le immagini e gli altri tipi non hanno ancora un'app.
- **Contenuto solo testo**: niente file binari (immagini vere, PDF), niente importazione dal computer.
- **Copia e taglia/incolla**: si sposta con il trascinamento, ma non si copia, e non ci sono taglia/copia/incolla.
- **Nell'app File manca il rettangolo di selezione** (c'è sulla scrivania).
- **Il rettangolo di selezione non fa scorrere la vista** quando si arriva al bordo dello schermo.
- **Spazio di `localStorage`**: tutto il file system sta in una chiave; con molte migliaia di nodi si potrebbe arrivare al limite del browser (di solito 5 MB).
- **Schermi touch.** Un dito sposta la vista, ma lo zoom con due dita non è gestito (funziona solo il pizzico del trackpad, che il browser trasmette come Ctrl + rotella). Non c'è un'alternativa al tasto destro.

### Tecnici

- **Distruzione dei componenti solo per le finestre.** `Window` ha `destroy()` e un `signal` (`AbortController`) per i listener del contenuto. I componenti del sistema (Canvas, Desktop, Taskbar…) non hanno `destroy()`: va bene finché vengono creati una sola volta.
- **La minimappa ricrea tutti i blocchi a ogni cambiamento.** Va bene fino a qualche centinaio di oggetti; oltre conviene disegnare su un `<canvas>`.
- **I font arrivano da Google Fonts.** Senza rete si usano i font di sistema. Per l'uso offline andranno inclusi nel progetto.

## Roadmap

In ordine di priorità.

### 1. Gestore delle finestre: completamento

Fatto: vedi la tabella sopra (compreso il ridimensionamento da tutti i bordi e il ricordo delle finestre fuori dalle workarea, per workspace). Resta:

- finestre di dialogo (conferme) nell'SDK, al posto del pulsante "a due clic" usato nell'app Impostazioni.

### 2. Struttura delle app

Fatto: caricamento al primo avvio (`load` nel registro) ed export predefinito `({ args }) → Window`. Resta da definire il contesto passato alle app (accesso ai file, comunicazione con altre app).

Prossime app: visualizzatore di Immagini (dipende dai contenuti binari), Terminale.

### 3. File system: contenuti e spostamenti

Fatto: albero di cartelle, file con contenuto e collegamenti, scrivania come cartella, app File, Editor, associazioni dei tipi di file, migrazione (vedi [D15](decisioni.md#d15-file-system-virtuale-la-scrivania-è-una-cartella)). Resta:

- importare ed esportare file dal computer (trascinamento, download), contenuti binari;
- copiare (Ctrl + trascinamento) e taglia/copia/incolla; spostare da tastiera; aprire le cartelle passandoci sopra mentre si trascina (lo spostamento col trascinamento tra scrivania, File ed Editor è fatto, vedi [D30](decisioni.md#d30-un-solo-modulo-di-trascinamento-per-tutte-le-viste-di-file-e-cartelle));
- rettangolo di selezione anche nell'app File.

### 4. Cestino e annulla

Il cestino è fatto (vedi [D28](decisioni.md#d28-il-cestino-è-una-seconda-radice-nascosta-del-file-system)) e Ctrl Z annulla le azioni sugli elementi ([D26](decisioni.md#d26-annulla-e-ripeti-centrali-per-chi-ha-il-focus)). Resta una cronologia salvata che sopravviva alla ricarica; idee, non decise: ripristino in una cartella scelta, icona del cestino sulla scrivania, workarea nel cestino.

### 4 bis. Tag: rifiniture

I tag sono fatti (vedi la tabella). Idee, non ancora decise: annullare il cambio di tag con Ctrl Z, una scorciatoia per assegnarli, cercare per tag dal menu di avvio, tag diversi per workspace, trascinare un elemento sul tag nella barra laterale di File (il trascinamento c'è, ma i tag non sono ancora bersagli).

### 5. Miglioramenti della scrivania

Selezione a rettangolo, navigazione con le frecce, copia e incolla, trascinamento di file dal sistema operativo sulla scrivania.

### 6. Workspace: rifiniture

I workspace sono fatti (vedi la tabella). Idee, non ancora decise: preferenze per workspace, `aria-expanded` sul menu del pulsante, finestre di un workspace eliminato che si dispongono dentro l'area attuale.

### 7. Impostazioni e utente

Nome utente, sfondo e colore principale, poi un vero accesso.

### 8. Qualità

Test automatici nel repository (vedi [Processo](processo.md#test-automatici)), validazione dei dati salvati, gestione delle schede multiple.
