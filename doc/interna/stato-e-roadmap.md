# Stato e roadmap

Aggiornato al 31 ottobre 2026 (avvio automatico fase 1 ed elementi fissi della scrivania, non ancora in un commit; l'app Impostazioni ora si chiama Sistema; File Manager 1.1.0 con Informazioni e Anteprima; kernel, accesso degli utenti, app installate, repository, AppStore e app di sistema nel repository ufficiale aggiunti, non ancora in un commit; punti d'ingresso delle app, modalità isolata / non isolata e «Proprietà…» fatti sul ramo `app-entrypoints-pipes` (a6b984d); SDK 0.3.0; ultimo commit: 8faf71d; repository ufficiale: tag v1.3.0, con l'AppStore 1.1.0).

## Cosa c'è

| Area | Stato |
| --- | --- |
| Scrivania infinita | Fatta: spostamento, zoom al cursore, animazioni, "Mostra tutto", camera salvata |
| Minimappa e controlli zoom | Fatti |
| Elementi del desktop | Fatti: cartella, file, app; selezione multipla, trascinamento con griglia, rinomina, elimina, riordina, menu contestuali, salvataggio |
| Barra in basso | Fatta: logo, pulsante del workspace, area finestre, utente, data e ora |
| Menu di avvio | Fatto: ricerca, tastiera, piè di pagina con utente |
| Menu contestuale | Componente riutilizzabile fatto |
| SDK `@lilos/sdk` | Fatto (0.3.0): basi, controlli, `Window`, `SettingsView`, `SettingsWindow`, `settings`, `shortcuts`, `fs`, `selectionGesture`; collegamento al kernel (`kernel`, `KernelError`, `apps`, `repositories`, `kernelModules`, `storage.keys`, `storage.bytes`, `fs.reset`); invio al kernel a blocchi |
| File system | Fatto: cartelle, file con contenuto e collegamenti, cartelle di sistema, migrazione della vecchia scrivania. Salvato nel database del kernel (IndexedDB ne tiene una copia); senza kernel l'SDK usa il browser |
| Associazioni dei tipi di file | Fatte: predefinite dal registro, modificabili in Sistema → Usabilità → Tipi di file, finestra "Apri con" |
| Selezione sulla scrivania | Fatta: clic, Ctrl/Shift, rettangolo, percorso libero (Alt + trascina, modificabile) |
| Scorciatoie da tastiera | Fatte: registro unico, 20 comandi, modificabili in Sistema → Usabilità → Scorciatoie, con controllo di conflitti e combinazioni non valide |
| Gestore delle finestre | Fatto, versione di base: apertura, focus, trascinamento, ridimensionamento da tutti i bordi e gli angoli, ingrandisci, riduci, chiudi, pulsanti nella barra; controlli e bordi attivabili uno per uno |
| Finestra base delle impostazioni | Fatta (`SettingsWindow`), dal render approvato `design/settings-window.html` |
| App di sistema | File Manager (id `files`, 1.1.0), Editor, Sistema e AppStore fatte (29 ottobre 2026), ma **non in questo repository**: sono pacchetti di [lilos-plugins-official](https://github.com/GexyLab/lilos-plugins-official) (privato, tag `v1.0.0`) che girano dentro lilOS senza sandbox e che il kernel installa da solo se mancano ([D38](decisioni.md#d38-le-app-di-sistema-vengono-dal-repository-ufficiale-e-girano-dentro-lilos), [D41](decisioni.md#d41-le-app-di-sistema-mancanti-si-installano-allavvio-del-kernel)). Nel registro non c'è più nessuna app integrata. Le app segnaposto (Browser, Terminale, Calendario, Immagini, Musica, Posta) sono state tolte |
| Editor: cartelle | Fatto: Apri un file / Apri una cartella, pannello a destra ridimensionabile con creazione, rinomina, spostamento (trascinamento, anche da e verso scrivania e File Manager, o "Sposta in…" dentro la radice) ed eliminazione |
| Editor: linguaggi | Fatto: Tree-sitter (JS, Python, JSON, CSS, HTML, Shell), TextMate (anche grammatiche aggiunte), Language Server nel browser (JSON, CSS, HTML) ed esterni via WebSocket, schemi JSON da file o web |
| Menu configurabili | Fatto per lo sfondo della scrivania (sottomenu Nuovo, azioni, app, separatori, ordine) |
| Tema chiaro / scuro | Fatto |
| Workarea | Fatte (28 ottobre 2026): aree della scrivania con titolo, appartenenza per centro, niente sovrapposizioni, spostamento e ridimensionamento, ridurre a icona e riaprire con le finestre com'erano, proprietà con metadati, finestre salvate al ricaricamento. Vedi [D25](decisioni.md#d25-workarea-aree-della-scrivania-con-contenuto-geometrico) |
| Annulla e ripeti | Fatti (28 ottobre 2026): Ctrl Z / Ctrl Y centrali, per chi ha il focus ([D26](decisioni.md#d26-annulla-e-ripeti-centrali-per-chi-ha-il-focus)). Scrivania (creare, rinominare, eliminare con il contenuto, spostare, riordinare, workarea), finestra del File Manager, pannello della cartella dell'Editor e testo dell'Editor. Messaggi in basso, voci di menu `edit.undo` / `edit.redo` |
| Workspace | Fatti (28 ottobre 2026): scrivanie separate, ognuna con cartella Scrivania privata, vista, posizioni, workarea, finestre e app installate; Documenti, Immagini e Download condivise; proprietario su ogni nodo e colonna Workspace nel File Manager; pulsante nella barra e Ctrl Alt ← / →; finestre nascoste (non chiuse) cambiando workspace e ricordate al ricaricamento anche fuori dalle workarea; app nascoste per workspace (dal 29 ottobre 2026 le app si installano in lilOS, non nel workspace); Sistema → Workspace; eliminazione che tiene i file; migrazione dei dati precedenti in «Principale». Vedi [D27](decisioni.md#d27-workspace-scrivanie-separate-isolate-dal-file-system) |
| Cestino | Fatto (28 ottobre 2026): eliminare sposta nel cestino (seconda radice nascosta di `fs`, [D28](decisioni.md#d28-il-cestino-è-una-seconda-radice-nascosta-del-file-system)), che sopravvive alla ricarica. Voce Cestino nel File Manager (ripristina, elimina definitivamente, ripristina tutto, svuota), pulizia automatica dopo 30 giorni (modificabile), conferma e «elimina definitivamente» configurabili in Sistema → Usabilità → Cestino. Visibile per workspace per ciò che viene dalla Scrivania privata |
| Elementi fissi della scrivania | Fatti (31 ottobre 2026, non ancora in un commit): Home, Documenti, Immagini, File Manager, Download e Cestino su ogni scrivania, non rinominabili né eliminabili, con posizione salvata e rilascio di file ([D43](decisioni.md#d43-gli-elementi-fissi-della-scrivania-non-sono-file)). Elencati in Sistema → Scrivania → Elementi. Limite: l'elenco è fisso, e chi aveva il collegamento al File Manager lo ha due volte |
| Tag | Fatti (28 ottobre 2026): etichette colorate (8 colori) da mettere su file e cartelle dal menu del tasto destro → Tag, uguali in tutti i workspace ([D29](decisioni.md#d29-i-tag-stanno-sui-nodi-e-un-tag-invisibile-nasconde-gli-elementi)). Pallini sulle icone e nel File Manager, vista del tag nel File Manager (tutti gli elementi con quel tag, ovunque) con "Mostra nella cartella", Sistema → Tag (nuovo, nome, colore, visibile, elimina). Un tag invisibile nasconde i suoi elementi ovunque; si ritrovano dalla vista del tag |
| Trascinamento di file e cartelle | Fatto (28 ottobre 2026): un solo modulo (`src/items/itemDrag.js`, [D30](decisioni.md#d30-un-solo-modulo-di-trascinamento-per-tutte-le-viste-di-file-e-cartelle)) per scrivania, File Manager (elenco, icone, percorso, barra laterale) e pannello dell'Editor: si sposta tutta la selezione da una vista all'altra, con fantasma, Esc e un solo passo di annulla nella vista di partenza; rilasciando sul Cestino si elimina |
| Barra laterale di File: collegamenti e ordine | Fatti (28 ottobre 2026): la sezione «Collegamenti» in cima contiene le voci fisse (Home, Scrivania, Documenti…) e i collegamenti dell'utente, nell'ordine che sceglie trascinando; Tag e Cestino stanno sotto, fuori dall'ordine. Si aggiungono trascinando tra due voci o dal menu «Aggiungi alla barra laterale del File Manager» (scrivania, File Manager, Editor); al centro di una cartella il rilascio sposta davvero. Eliminare un collegamento (×, Canc, menu) toglie solo la voce e si annulla con Ctrl Z nella finestra del File Manager. `src/items/links.js`, `lilos:files-sidebar`, al massimo 80, uguali in tutti i workspace |
| File Manager: Informazioni e Anteprima | Fatti (versione 1.1.0 dell'app `files`; l'app si chiamava «File»): due pannelli a destra, ridimensionabili e a scomparsa, Alt I e Alt P (modificabili), stato in `lilos:files-panels`. Gli utenti già esistenti mantengono sulla scrivania l'icona «File» (è un nodo già creato) |
| App Sistema | Fatta (30 ottobre 2026): l'app `settings` (id invariato) si chiamava «Impostazioni» e ora si chiama «Sistema» (versione 1.1.2 nel repository ufficiale, non ancora pubblicata con un tag). Sulle scrivanie già esistenti l'icona resta «Impostazioni» (è un nodo già creato); le nuove la chiamano «Sistema». Dentro l'app il primo gruppo di schede si chiama già «Sistema» |
| Apertura di cartelle e file | Fatta: cartelle nel File Manager, file con l'app associata o "Apri con" |
| Kernel | Fatto (29 ottobre 2026): backend Node modulare in `system/kernel/` ([D31](decisioni.md#d31-un-kernel-modulare-con-il-controllo-degli-accessi-dentro-il-modulo-del-file-system)), con i moduli `users-basic` ([D32](decisioni.md#d32-utenti-in-un-file-il-modulo-users-basic)) e `fs-postgres` ([D33](decisioni.md#d33-il-file-system-del-kernel-sta-in-postgresql)); API per accesso, home dell'utente, impostazioni e app; riga di comando per gli utenti |
| Utenti | Fatti (29 ottobre 2026): schermata di accesso, uscita dal menu di avvio, nuovo accesso se la sessione scade, trasferimento una tantum dei dati che il browser aveva prima ([D34](decisioni.md#d34-il-frontend-tiene-i-dati-in-memoria-e-li-sincronizza-per-differenze)). Ogni utente ha la sua cartella; senza modulo di accesso c'è un solo utente |
| App installate | Fatte (29 ottobre 2026): pacchetti con `lilos.json`, installazione da un repository git o da una cartella locale, firma, permessi, operazioni per utente, esecuzione in iframe isolato per quelle non di sistema ([D35](decisioni.md#d35-le-app-locali-girano-in-un-iframe-sandbox-senza-allow-same-origin), [D36](decisioni.md#d36-le-app-installate-sono-di-tutti-le-operazioni-di-installazione-sono-per-utente), [D37](decisioni.md#d37-fiducia-nei-pacchetti-origine-firma-e-permessi)). Si installano dall'AppStore, dall'SDK (`apps.install`) o con le API; esempio in `examples/apps/note/`. Un'app installata vale per tutti i workspace, che possono solo nasconderla (non le necessarie) |
| Punti d'ingresso delle app | Fatti (30 ottobre 2026, [D42](decisioni.md#d42-punti-dingresso-e-due-modalità-di-esecuzione-per-le-app)): manifesto con `sdk` `"2"` ed `entrypoints` (finestre e background); un'app esporta una funzione per punto d'ingresso; `lilos.app.call` / `connect` / `keepAlive`, `lilos.apps.call` con il permesso `apps.call:<app>`, `lilos.handle`; `callEntrypoint`, `connectEntrypoint`, `entrypointsOf` in `@lilos/system`; i background si fermano dopo 5 minuti senza usi, salvo `keepAlive` (icona nella barra con «Ferma»). Esempio: `examples/apps/note/` (finestra `main` e background `stats`) |
| Avvio automatico, fase 1 | Fatta (31 ottobre 2026, non ancora in un commit, [D44](decisioni.md#d44-avvio-automatico-due-eventi-app-solo-nella-prima-scheda-servizi-nel-kernel)): eventi `system:ready` e `user:login`; Sistema → Avvio (Opzioni e App) con la lista delle app per utente, i punti d'ingresso e i parametri (`params` nel manifesto: File Manager, Editor, Photo e Sistema ne dichiarano); solo nella prima scheda del browser; `?avvio=no`. Mancano le fasi 2 e 3 (vedi la roadmap) |
| Modalità di esecuzione delle app | Fatta (30 ottobre 2026, D42): isolata (predefinita: iframe `sandbox`, anche per i background) o non isolata (pagina di lilOS in uno Shadow DOM; background in un Web Worker), scelta da un amministratore per tutte le app (Sistema → App → Sicurezza) o per una (Proprietà → Sicurezza); vale dalla prossima apertura. App di sistema sempre nella pagina; remote e `sdk` `"1"` sempre isolate |
| Proprietà… | Fatta (30 ottobre 2026): finestra per file e cartelle (tipo, posizione, dimensione, date, workspace, tag; sola lettura) dal menu del tasto destro sulla scrivania e dal File Manager; per le app (menu di avvio con il tasto destro, collegamento sulla scrivania, icona dei background nella barra, Sistema → App → Sicurezza) le schede Generale, Permessi e Sicurezza |
| AppStore | Fatto (30 ottobre 2026, 1.1.0, app di sistema): finestra normale con ricerca per scheda; schede Installati, Aggiornamenti, una per categoria (`category` del manifesto) e Kernel (moduli, solo amministratori); card con icona, README dei pacchetti (Markdown sicuro) e dettagli; Opzioni con repository (aggiungi, rimuovi, ricarica) e «Mostra i repository non ufficiali»; avviso per ciò che non è ufficiale; i non amministratori vedono ma non cambiano |
| Repository | Fatti (29 ottobre 2026): origini via `git`, anche per repository privati, con le credenziali git del computer del kernel; l'ufficiale sempre presente, altri aggiunti da un amministratore, ognuno con un `catalog.json` ([D39](decisioni.md#d39-i-pacchetti-si-prendono-con-git)) |
| Moduli del kernel come pacchetti | Fatti (29 ottobre 2026): `users-basic` e `fs-postgres` sono anche nel repository ufficiale; un amministratore installa, aggiorna e toglie i moduli dall'AppStore e riavvia il kernel (`npm run kernel` passa da `run.js`); i dati si conservano alla rimozione ([D40](decisioni.md#d40-i-moduli-del-kernel-si-installano-come-pacchetti-e-valgono-dopo-il-riavvio)) |
| Test automatici | **Da fare.** Vedi [Processo](processo.md) |

## Limiti noti

### Funzionali

- **Tag: mettere o togliere un tag non si annulla.** Non entra nella cronologia (Ctrl Z non lo vede).
- **Tag: uguali in tutti i workspace.** Le definizioni (nome, colore, visibile) sono globali, ma la vista del tag mostra solo ciò che il workspace attuale vede (la sua scrivania e le cartelle condivise).
- **Tag: elementi dentro una cartella nascosta.** Un elemento in una cartella con un tag invisibile non è nascosto a sua volta (se non ha il tag), ma non si vede finché la cartella è nascosta: si raggiunge dalla vista del tag della cartella o da "Mostra nella cartella".
- **Tag: le cartelle di sistema non si etichettano.** Documenti, Immagini e Download non hanno la voce Tag attiva (`fs.setTags` lancia un errore sui nodi `system`). I collegamenti alle app sulla scrivania (File Manager, Sistema…) sono nodi normali: si possono etichettare e nascondere con un tag invisibile; l'app resta raggiungibile dal menu di avvio.
- **Tag: nessuna scorciatoia da tastiera** per assegnarli o aprirne la vista.
- **Tag: la ricerca per tag è solo nel File Manager.** Il menu di avvio cerca solo le app.
- **Tag: al massimo 100 tag**, 30 per elemento, nomi di 30 caratteri.
- **Cestino: l'eliminazione definitiva non si annulla.** Vale per "Elimina definitivamente" nel cestino, per lo svuotamento, per la pulizia automatica e, con "Elimina definitivamente" attivo nelle impostazioni, per l'eliminazione dopo una ricarica (finché la pagina è aperta resta Ctrl Z).
- **Cestino: non si apre dalla scrivania.** Si raggiunge dal File Manager (barra laterale) o da Sistema → Usabilità → Cestino; non c'è un'icona sulla scrivania. Le workarea eliminate non passano dal cestino (si annulla solo con Ctrl Z).
- **Cestino: occupa spazio.** I nodi cestinati restano nella cartella dell'utente, nel database del kernel, fino all'eliminazione definitiva, e non c'è un limite di dimensione, solo di tempo (`trashRetention`).
- **Cestino: non si apre né si rinomina un elemento cestinato**; va prima ripristinato. Il ripristino non permette di scegliere la cartella: torna dove era, o in Home se non c'è più.
- **Le cronologie si perdono.** Stanno solo in memoria: vuote dopo una ricarica; quella del File Manager è per finestra e si perde chiudendola.
- **Annulla solo in alcuni posti.** Sistema e le altre finestre non hanno una cronologia: Ctrl Z non fa nulla (e non agisce sulla scrivania dietro). Non si annullano le modifiche fatte nella finestra delle proprietà di una workarea, né ridurre a icona e riaprire una workarea.
- **Annullare «Sposta in…» non rimette il nome cambiato per renderlo unico** (pannello dell'Editor, `moveNode`). Il trascinamento (`moveNodes`) invece lo rimette.
- **Trascinamento: solo spostare.** Niente copia (Ctrl), niente apertura automatica delle cartelle al passaggio e nessuno spostamento da tastiera su scrivania e File Manager (solo «Sposta in…» nell'Editor).
- **Trascinamento: dall'Editor un elemento alla volta**, perché il pannello non ha selezione multipla.
- **Barra laterale di File: aggiungere collegamenti e riordinare non si annulla** (eliminare un collegamento e spostare un elemento in una cartella sì). Un collegamento a un nodo che non si vede (cestino, Scrivania di un altro workspace) non compare ma resta nell'ordine. Tag e Cestino non si trascinano e non fanno parte dell'ordine.
- **Blocco Tag della barra laterale del File Manager: non è un bersaglio** (al centro non succede niente; non si assegna un tag trascinando un elemento su di lui).
- **Niente navigazione da tastiera tra gli elementi.** Non si possono scegliere gli elementi con le frecce.
- **Più schede aperte si sovrascrivono.** Ogni scheda manda al kernel le sue differenze e, sul singolo nodo o sulla singola chiave, vince l'ultima scrittura: l'elenco dei workspace, per esempio, è una chiave sola, quindi quello della scheda che salva per ultima cancella le modifiche fatte nelle altre. Non c'è sincronizzazione in diretta tra schede.
- **Workspace: al massimo 20.** Oltre, «Nuovo workspace» mostra un messaggio.
- **Workspace: finestre di un workspace eliminato.** Passano nel workspace attuale e si mettono al centro della vista, anche dentro una workarea attuale. Le finestre secondarie (selettori, proprietà…) si chiudono.
- **Workspace: file condiviso aperto altrove.** Un file condiviso aperto in un Editor di un altro workspace e poi spostato nella Scrivania privata del workspace attuale diventa invisibile a quell'Editor: salvare fallisce.
- **Workspace: preferenze globali.** Tema, colore principale, scorciatoie, menu e tipi di file sono uguali in ogni workspace.
- **Workspace: il menu del pulsante non ha `aria-expanded`.**
- **Workspace: finestre secondarie non ricordate.** Come per le workarea, selettori e proprietà non tornano dopo la ricarica; Sistema riparte dalla prima scheda e le finestre ingrandite tornano non ingrandite.
- **Workarea: finestre di servizio e stato parziale.** Selettori, proprietà e altre finestre secondarie si chiudono senza essere salvate. Sistema si riapre sulla prima scheda. Le finestre ingrandite tornano non ingrandite. Salvano il proprio stato solo File Manager ed Editor (`getState`).
- **Workarea: elementi nascosti ancora nel File Manager.** Gli elementi di una workarea ridotta restano in `/Scrivania`, quindi si vedono nel File Manager.
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
- **Menu configurabile solo per lo sfondo della scrivania**: i menu degli elementi e del File Manager sono ancora fissi; le voci non si rinominano (si tolgono e si aggiungono).
- **Tema chiaro/scuro senza "automatico"** (seguire il sistema operativo).
- **Editor semplice**: un documento per finestra, niente cerca e sostituisci, niente a capo automatico, niente "Salva come" (i documenti nuovi vanno nella cartella aperta o in Documenti), niente schede per più file aperti, evidenziazione approssimata; oltre 300 000 caratteri il testo non è colorato.
- **Solo l'Editor apre file**: le immagini e gli altri tipi non hanno ancora un'app.
- **Contenuto solo testo**: niente file binari (immagini vere, PDF), niente importazione dal computer.
- **Copia e taglia/incolla**: si sposta con il trascinamento, ma non si copia, e non ci sono taglia/copia/incolla.
- **Nel File Manager manca il rettangolo di selezione** (c'è sulla scrivania).
- **Il rettangolo di selezione non fa scorrere la vista** quando si arriva al bordo dello schermo.
- **Senza il kernel il sistema non parte.** La schermata iniziale chiede di avviarlo (`npm run kernel`). L'SDK da solo, senza kernel, salva ancora nel browser (con il limite di `localStorage`, di solito 5 MB, perché tutto il file system sta in una chiave).
- **Limiti del kernel.** Un file al massimo 10 MB; una chiave delle impostazioni 512 KB; i metadati di un nodo 4 KB. Un valore o un file più grande viene rifiutato e lilOS riprova senza riuscirci, avvisando «Modifiche non salvate». Il numero di modifiche invece non è più un limite: lilOS le manda a blocchi (2000 nodi, oppure 200 chiavi e 4 MB, per richiesta; il kernel ne accetta al più 5000 e 500).
- **Riaprire le finestre e lanciare un'app insieme.** Se si lancia un'app (per esempio File Manager) mentre all'avvio lilOS sta ancora riaprendo le finestre salvate, può comparire una **seconda finestra** dell'app: ogni app dovrebbe averne una sola per ambito.
- **Un'app installata da un altro utente o da un'altra scheda compare solo ricaricando.** Il browser conosce l'elenco delle app dall'avvio e si aggiorna da solo soltanto per ciò che fa lui stesso (installare, aggiornare, rimuovere dall'AppStore).
- **Schermi touch.** Un dito sposta la vista, ma lo zoom con due dita non è gestito (funziona solo il pizzico del trackpad, che il browser trasmette come Ctrl + rotella). Non c'è un'alternativa al tasto destro.

### Kernel e app installate

- **Un'app non isolata può fare tutto ciò che può fare l'utente.** I permessi che ha dichiarato non la limitano più (D42). Solo un amministratore la sceglie, e non per le app di sistema, remote o con `sdk` `"1"`.
- **Il cambio di modalità non agisce su ciò che è già aperto.** Vale dalla prossima apertura; i background dell'app si fermano subito.
- **Solo `sdk` `"2"` ha punti d'ingresso.** Le app con `sdk` `"1"` restano un modulo che gira all'avvio, solo isolate.
- **I background non vivono a lilOS chiuso.** Girano solo nella sessione aperta, per utente e scheda (il permesso `background` non fa nulla).
- **Il primo avvio richiede `git`, la rete e l'accesso al repository ufficiale.** Il repository è privato: il kernel usa le credenziali git del suo computer. Senza, il kernel parte e non installa le app di sistema (log: «App di sistema non installate»): lilOS non ha File Manager, Sistema né AppStore ([D41](decisioni.md#d41-le-app-di-sistema-mancanti-si-installano-allavvio-del-kernel)). Servono anche, ogni volta, per installare o aggiornare da qualunque repository.
- **Le app di sistema girano senza sandbox.** Chi può scrivere nel repository ufficiale scrive codice che gira nella pagina di ogni utente ([D38](decisioni.md#d38-le-app-di-sistema-vengono-dal-repository-ufficiale-e-girano-dentro-lilos)). `@lilos/system` è un contratto: togliere un export rompe le app installate.
- **Le app di sistema non si provano in locale.** Non c'è un server di sviluppo e un clone locale non conta come repository ufficiale: per provare si manda un ramo e si aggiorna l'app da lì con una versione più alta.
- **Il kernel non aggiorna da solo le app già installate.** All'avvio installa solo quelle che mancano: tutte le app di `apps.bootstrap` al primo avvio, poi solo le necessarie (un Editor rimosso resta rimosso). Gli aggiornamenti si fanno dall'AppStore.
- **Il riavvio del kernel funziona solo con `npm run kernel`.** Fuori da `run.js` l'AppStore dice di riavviare a mano. Durante il riavvio lilOS non può salvare per qualche secondo.
- **Solo la versione più alta di un repository.** L'AppStore installa e propone l'ultimo tag; per una versione precedente servono le API (`ref`).
- **Solo indirizzi `https://`** per i repository (e un percorso locale in sviluppo): niente `ssh://`.
- **Moduli del kernel: i dati restano alla rimozione.** La cartella con i dati (per esempio gli utenti di `users-basic`) si cancella a mano. Un modulo messo a mano si toglie ma non si aggiorna dall'AppStore.
- **Moduli del kernel: solo gli amministratori li vedono.** Gli altri utenti leggono «Solo un amministratore vede e gestisce i moduli del kernel».
- **I widget non si vedono.** Il manifesto li valida (`contributes.widgets`, permesso `desktop.widget`) ma lilOS non li mostra sulla scrivania.
- **Permessi dichiarati ma senza effetto.** L'oggetto `lilos` offre file, dati propri, titolo, avvisi, appunti in scrittura e i punti d'ingresso (`apps.call` ha effetto dal 30 ottobre 2026). `clipboard.read`, `media.*`, `geo`, `ai.*`, `background` e `ui.menus` si possono dichiarare ma non hanno funzioni. I permessi `use` non vengono chiesti all'utente a ogni uso.
- **App remote senza accesso al proprio servizio.** Il permesso `auth.remote` esiste, ma non c'è ancora un token da dare all'app remota.
- **Nessuna sincronizzazione in diretta tra schede** (vedi sopra): ogni scheda manda le sue differenze, e sul singolo nodo vince l'ultima scrittura.
- **Operazioni di installazione solo all'apertura di lilOS.** Girano per ogni utente la prima volta che incontra l'app (vedi [D36](decisioni.md#d36-le-app-installate-sono-di-tutti-le-operazioni-di-installazione-sono-per-utente)); il ripristino «Scrivania e file iniziali» le fa ripetere al ricaricamento.
- **Un solo kernel per volta.** `users.json` si riscrive intero senza blocchi tra processi: due kernel accesi sullo stesso file si sovrascriverebbero (vedi [D32](decisioni.md#d32-utenti-in-un-file-il-modulo-users-basic)).
- **Il sito statico di `npm run build` non basta.** Il frontend parla con `/api` della stessa origine: in sviluppo e con `npm run preview` lo inoltra Vite al kernel su 127.0.0.1:8790; per la produzione serve un server che faccia lo stesso, e non è ancora descritto.

### Tecnici

- **Distruzione dei componenti solo per le finestre.** `Window` ha `destroy()` e un `signal` (`AbortController`) per i listener del contenuto. I componenti del sistema (Canvas, Desktop, Taskbar…) non hanno `destroy()`: va bene finché vengono creati una sola volta.
- **La minimappa ricrea tutti i blocchi a ogni cambiamento.** Va bene fino a qualche centinaio di oggetti; oltre conviene disegnare su un `<canvas>`.
- **I font arrivano da Google Fonts.** Senza rete si usano i font di sistema. Per l'uso offline andranno inclusi nel progetto.

## Roadmap

In ordine di priorità.

### 1. Gestore delle finestre: completamento

Fatto: vedi la tabella sopra (compreso il ridimensionamento da tutti i bordi e il ricordo delle finestre fuori dalle workarea, per workspace). Resta:

- finestre di dialogo (conferme) nell'SDK, al posto del pulsante "a due clic" usato nell'app Sistema.

### 2. Struttura delle app

Fatto: caricamento al primo avvio (`load` nel registro) ed export predefinito `({ args }) → Window`. Resta da definire il contesto passato alle app non di sistema (accesso ai file, comunicazione con altre app).

Le app segnaposto del registro sono state tolte (29 ottobre 2026). Ora le app si aggiungono come pacchetti installati, con l'AppStore (vedi [D35](decisioni.md#d35-le-app-locali-girano-in-un-iframe-sandbox-senza-allow-same-origin) e [D36](decisioni.md#d36-le-app-installate-sono-di-tutti-le-operazioni-di-installazione-sono-per-utente)). Resta da fare:

- i widget sulla scrivania;
- il token per le app remote (`auth.remote`) e le funzioni del ponte che mancano, con i permessi `use` chiesti all'utente a ogni uso (`clipboard.read`, fotocamera, microfono, posizione…);
- la sincronizzazione in diretta tra schede e tra utenti (oggi vince l'ultima scrittura; un'app installata da altri compare solo ricaricando);
- un visualizzatore di Immagini (dipende dai contenuti binari) e un Terminale, come app installabili.

#### Punti d'ingresso: cosa resta

I punti d'ingresso sono la base per due cose **non ancora costruite** ([D42](decisioni.md#d42-punti-dingresso-e-due-modalità-di-esecuzione-per-le-app)):

- **Cassaforte**: un'app per cifrare i file uno per uno, con le chiavi tenute in un background (`keepAlive`). Non esiste ancora.
- **Pipe sugli eventi**: un'app si iscrive a ciò che succede (per esempio a un file salvato) e passa il risultato a un'altra. Non esistono ancora: oggi un'app può solo chiamare un punto d'ingresso, non iscriversi a eventi.
- **Metadati per app sui nodi**: non c'è ancora un modo per un'app di annotare un file o una cartella (per esempio «questo file è cifrato dalla Cassaforte»).
- `apps.call` non chiede conferma all'utente a ogni uso, e chi riceve non conosce altro di chi chiama oltre all'id dell'app.

#### Avvio automatico: fasi 2 e 3

La fase 1 (app all'avvio e due eventi) è fatta ([D44](decisioni.md#d44-avvio-automatico-due-eventi-app-solo-nella-prima-scheda-servizi-nel-kernel)). Restano, **non ancora costruite**:

- **Fase 2, servizi nel kernel**: punti d'ingresso con `kind: 'service'`, eseguiti da un modulo del kernel con `isolated-vm` (un processo per servizio), con il permesso `background`. I servizi di sistema li sceglie l'amministratore e partono sempre; si legano a `system:ready`.
- **Fase 3**: la scheda Servizi in Sistema → Avvio (il render `design/avvio.html` la mostra già) e il servizio `updates` dell'AppStore.
- Le sessioni cambieranno con i servizi (oggi nessuna parte gira a lilOS chiuso): non sono state prese in conto.
- Limite della fase 1: l'avvio non sa nulla di un'app che si apre ma poi fallisce; un file o una cartella dei parametri eliminati fanno saltare solo quell'apertura, con un messaggio.

### 3. File system: contenuti e spostamenti

Fatto: albero di cartelle, file con contenuto e collegamenti, scrivania come cartella, File Manager, Editor, associazioni dei tipi di file, migrazione (vedi [D15](decisioni.md#d15-file-system-virtuale-la-scrivania-è-una-cartella)). Resta:

- importare ed esportare file dal computer (trascinamento, download), contenuti binari;
- copiare (Ctrl + trascinamento) e taglia/copia/incolla; spostare da tastiera; aprire le cartelle passandoci sopra mentre si trascina (lo spostamento col trascinamento tra scrivania, File Manager ed Editor è fatto, vedi [D30](decisioni.md#d30-un-solo-modulo-di-trascinamento-per-tutte-le-viste-di-file-e-cartelle));
- rettangolo di selezione anche nel File Manager.

### 4. Cestino e annulla

Il cestino è fatto (vedi [D28](decisioni.md#d28-il-cestino-è-una-seconda-radice-nascosta-del-file-system)) e Ctrl Z annulla le azioni sugli elementi ([D26](decisioni.md#d26-annulla-e-ripeti-centrali-per-chi-ha-il-focus)). Resta una cronologia salvata che sopravviva alla ricarica; idee, non decise: ripristino in una cartella scelta, icona del cestino sulla scrivania, workarea nel cestino.

### 4 bis. Tag: rifiniture

I tag sono fatti (vedi la tabella). Idee, non ancora decise: annullare il cambio di tag con Ctrl Z, una scorciatoia per assegnarli, cercare per tag dal menu di avvio, tag diversi per workspace, trascinare un elemento sul tag nella barra laterale del File Manager (il trascinamento c'è, ma i tag non sono ancora bersagli).

### 5. Miglioramenti della scrivania

Selezione a rettangolo, navigazione con le frecce, copia e incolla, trascinamento di file dal sistema operativo sulla scrivania.

### 6. Workspace: rifiniture

I workspace sono fatti (vedi la tabella). Idee, non ancora decise: preferenze per workspace, `aria-expanded` sul menu del pulsante, finestre di un workspace eliminato che si dispongono dentro l'area attuale.

### 7. Impostazioni e utente

L'accesso con più utenti c'è (29 ottobre 2026). Restano: cambiare la password e il nome dall'interfaccia (oggi la password si cambia solo da riga di comando e il nome visibile solo modificando `users.json` a mano), sfondo, e la sincronizzazione in diretta tra schede o dispositivi.

### 7 bis. Kernel

Fatto: i moduli si installano dall'AppStore ([D40](decisioni.md#d40-i-moduli-del-kernel-si-installano-come-pacchetti-e-valgono-dopo-il-riavvio)). Restano: l'isolamento dei moduli, la pubblicazione in produzione (server che inoltra `/api`, HTTPS con `secureCookies`), un secondo modulo di accesso per più kernel o accessi esterni.

### 8. Qualità

Test automatici nel repository (vedi [Processo](processo.md#test-automatici)), validazione dei dati salvati, sincronizzazione delle schede multiple.
