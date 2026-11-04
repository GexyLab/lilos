# Decisioni

Registro delle scelte di architettura. Ogni voce dice cosa si è deciso, perché, cosa comporta e quando conviene ripensarla. Quando una decisione viene cambiata, non cancellarla: segnala che è superata e aggiungi la nuova.

---

## D1. JavaScript senza framework, con Vite

> Aggiornata da [D21](#d21-tree-sitter-textmate-e-language-server-nelleditor): l'Editor usa alcune dipendenze a runtime, caricate solo quando serve. Dal 29 ottobre 2026 l'Editor sta nel repository ufficiale ([D38](#d38-le-app-di-sistema-vengono-dal-repository-ufficiale-e-girano-dentro-lilos)) e lilOS è di nuovo senza dipendenze a runtime.

**Decisione.** Moduli ES in JavaScript, nessun framework UI, Vite solo come server di sviluppo e per la build.

**Perché.** Il cuore di lilOS è la gestione diretta di puntatore, trasformazioni e misure del DOM, dove un framework aggiunge poco e a volte intralcia. Senza dipendenze a runtime il bundle resta piccolo e il codice si legge senza conoscere altro.

**Conseguenze.** Il DOM si costruisce a mano con `h()`. Gli aggiornamenti dell'interfaccia sono espliciti (`replaceChildren`, `textContent`). Non c'è reattività.

**Da ripensare quando** le app (editor, posta, impostazioni) avranno interfacce con molto stato. Si potrà introdurre una libreria leggera dentro le singole app senza toccare il resto del sistema.

## D2. Scrivania infinita con un solo livello trasformato

**Decisione.** Tutti gli oggetti stanno in `.world`, che riceve `translate(x, y) scale(s)`. Gli oggetti sono posizionati con `left` e `top` in coordinate mondo.

**Perché.** Una sola trasformazione da aggiornare per ogni movimento della vista: il browser la gestisce sulla GPU e gli oggetti non vanno ricalcolati. `offsetLeft` e `offsetTop` restituiscono già le coordinate mondo, quindi le misure sono semplici.

**Conseguenze.**

- Gli oggetti non possono usare `transform` per posizionarsi.
- I trascinamenti dividono lo spostamento per `cam.s`.
- Con zoom molto diversi da 1 testo e bordi possono apparire meno nitidi.
- Lo zoom è limitato tra 0,1 e 3.

**Alternative scartate.** Disegnare tutto su un `<canvas>` 2D: perde il DOM, quindi testo selezionabile, accessibilità e iframe delle app web. Trasformare ogni oggetto singolarmente: costoso con molti oggetti e senza vantaggi.

## D3. Il canvas sposta la vista in fase di cattura

> Aggiornata da [D16](#d16-il-tasto-sinistro-seleziona-la-vista-si-sposta-con-spazio-o-il-tasto-centrale): il tasto sinistro sui punti vuoti non sposta più la vista.

**Decisione.** Il `pointerdown` del canvas è registrato in cattura. Sposta la vista con il tasto centrale, con Spazio premuto, oppure con il sinistro sui punti vuoti. In tutti gli altri casi lascia passare l'evento.

**Perché.** Spostarsi deve funzionare ovunque e prima di qualsiasi oggetto (tasto centrale, Spazio), senza che ogni oggetto debba collaborare.

**Conseguenze.** Gli oggetti ricevono solo i clic sinistri senza Spazio. Il menu del browser è disattivato su tutta la scrivania.

## D4. Rotella = zoom, con eccezione esplicita

**Decisione.** La rotella fa zoom ovunque. Le aree che devono scorrere si marcano con `data-wheel="native"`. Ctrl + rotella fa sempre zoom e lo zoom del browser è bloccato.

**Perché.** Sulla scrivania lo zoom è l'azione più frequente. Rendere lo scorrimento una scelta esplicita evita che contenuti scorrevoli "rubino" la rotella in modo imprevedibile.

**Conseguenze.** Ogni componente scorrevole dentro la scrivania (contenuto delle finestre) deve marcare la propria area.

## D5. Bus di eventi per le richieste di sistema

**Decisione.** Avviare un'app o aprire un file emette un evento su `bus` (`app:launch`, `item:open`), senza chiamare direttamente chi lo gestirà.

**Perché.** Menu di avvio, desktop e in futuro altre app non devono conoscere il gestore delle finestre. Si possono costruire e provare separatamente, e il gestore si collega senza toccare chi emette.

**Conseguenze.** Gli eventi sono il contratto tra i moduli: vanno documentati in `sdk/core/events.js` e nel [riferimento API](../sviluppatore/api.md#eventi-del-bus).

## D6. localStorage per stato piccolo, mai eccezioni

> Aggiornata da [D34](#d34-il-frontend-tiene-i-dati-in-memoria-e-li-sincronizza-per-differenze): con il kernel collegato `storage` tiene i valori in memoria e li salva nella cartella dell'utente; `localStorage` resta per quando il kernel non c'è.

**Decisione.** `storage` incapsula `localStorage` con prefisso `lilos:`, JSON e `try/catch` su ogni accesso.

**Perché.** Camera e posizioni degli elementi sono piccole e sincrone da leggere all'avvio. Lo storage può essere bloccato (navigazione privata, impostazioni) o pieno: lilOS deve comunque funzionare.

**Conseguenze.** Lo stato resta legato a un browser. Il desktop viene salvato per intero a ogni modifica.

**Da ripensare quando** arriverà il file system con contenuti veri: servirà IndexedDB, asincrono e con più spazio. `localStorage` resterà per impostazioni e stato dell'interfaccia.

## D7. Testo sempre come testo

**Decisione.** `h()` trasforma le stringhe in nodi di testo. `svg()`, che usa `innerHTML`, accetta solo markup statico.

**Perché.** Nomi di file e contenuti arrivano dall'utente e in futuro da app e file importati. Rendere sicura la strada più comoda elimina un'intera classe di vulnerabilità (XSS).

**Conseguenze.** Per inserire HTML serve una scelta esplicita e motivata.

## D8. Interfaccia di sistema scura, finestre chiare

**Decisione.** Barra, menu, HUD e scrivania sono scuri; le finestre (ancora da fare) saranno chiare, come nel mockup.

**Perché.** La cornice di sistema si fa da parte e il contenuto delle finestre resta leggibile e in primo piano.

**Conseguenze.** `sdk/styles/tokens.css` ha due famiglie di colori: `--bar-*` e `--panel*` per l'interfaccia di sistema, `--surface`, `--chrome` e `--text` per le finestre.

## D9. Elementi del desktop in un unico spazio

> Superata da [D15](#d15-file-system-virtuale-la-scrivania-è-una-cartella).

**Decisione.** Gli elementi del desktop sono un elenco piatto salvato in `lilos:desktop`, con posizione libera. Le cartelle non contengono ancora nulla.

**Perché.** Era il minimo per costruire e provare selezione, trascinamento, rinomina e menu.

**Da ripensare quando** arriverà il file system: il desktop diventerà la vista di una cartella (per esempio `/Scrivania`), e le posizioni saranno metadati di quella vista.

## D10. Un SDK nel repository, `@lilos/sdk`

**Decisione.** Le basi riutilizzabili (utilità DOM, eventi, salvataggio, sessione, icone, menu, avatar, icona delle app e i loro stili) stanno in `sdk/`, con un unico punto d'ingresso `sdk/index.js` importato come `@lilos/sdk`. Il sistema in `src/` è il primo utilizzatore. Ogni nuova struttura di base (finestre, finestra delle impostazioni…) nasce nell'SDK.

**Perché.** Le app e il sistema devono costruire sulle stesse basi, con un confine chiaro tra ciò che è pubblico e stabile e ciò che è interno al sistema. Un solo punto d'ingresso permette di riorganizzare i file dell'SDK senza rompere chi lo usa.

**Come.** Il nome `@lilos/sdk` è collegato alla cartella da un alias in `vite.config.js` e da `paths` in `jsconfig.json` per l'editor. `sdk/package.json` dichiara nome, versione ed export, così l'SDK può diventare un pacchetto separato senza cambiare gli import.

**Conseguenze.**

- L'SDK non importa mai da `src/`.
- Gli export di `sdk/index.js` sono API pubblica: toglierli o cambiarne la firma è una modifica incompatibile e alza la versione.
- I componenti dell'SDK portano il proprio CSS in `sdk/styles/`.

**Alternative scartate.** Workspace npm con un link simbolico in `node_modules`: più "standard", ma su Windows i link possono dare problemi e oggi non serve. Lasciare tutto in `src/` con un file indice: non impedisce al codice delle basi di dipendere dal sistema.

**Da ripensare quando** l'SDK dovrà essere usato fuori da questo repository (app di terze parti): allora andrà pubblicato come pacchetto, con una build propria.

## D11. Cornice delle finestre nell'SDK, gestione nel sistema

**Decisione.** `Window` (SDK) disegna la finestra e segnala le richieste (`minimize`, `maximize`, `close`); il `WindowManager` (sistema) la ospita sulla scrivania e decide posizione, focus, ordine, trascinamento, ridimensionamento, pulsante nella barra. Le app sono moduli caricati al primo avvio che restituiscono una `Window`; una finestra per app.

**Perché.** Le app e le finestre di impostazioni devono poter costruire finestre senza conoscere la scrivania, la camera o la barra. Il sistema resta l'unico a decidere come le finestre convivono.

**Conseguenze.**

- Un'app non sposta né chiude la sua finestra: emette la richiesta.
- Ogni controllo (riduci, ingrandisci, chiudi) e ogni bordo di ridimensionamento si accende e si spegne da solo nella `Window`; il gestore legge lo stato al momento dell'azione, così le modifiche a finestra aperta valgono subito.
- `Window.signal` permette di legare i listener del contenuto alla vita della finestra.
- "Ingrandisci" su una scrivania infinita = finestra grande quanto lo schermo e vista al 100% su di essa (come nel mockup approvato); il ripristino riporta anche la vista.
- Quando una finestra ha il focus, le scorciatoie del desktop sono disattivate.

**Da ripensare quando** servirà più di una finestra per app (documenti multipli): la chiave del `WindowManager` diventerà app + documento.

## D12. Preferenze dichiarate, con il tipo fissato dal valore predefinito

**Decisione.** `settings` (SDK) accetta solo chiavi dichiarate con `define()`; il valore predefinito fissa il tipo e i valori salvati di tipo diverso vengono scartati. Le impostazioni del sistema sono dichiarate in `src/systemSettings.js`. L'app Pannello di controllo mostra solo impostazioni che funzionano davvero.

**Perché.** `localStorage` non è affidabile (D6): così un valore rovinato o manomesso non arriva al codice. Un solo punto in cui sono dichiarate evita chiavi scritte in modi diversi.

**Conseguenze.** I valori che finiscono in CSS o nel DOM vanno comunque validati da chi li applica (il colore principale accetta solo `#rrggbb`). Il colore principale è un solo token, `--accent`, da cui le varianti derivano con `color-mix`.

## D13. La finestra delle impostazioni è un componente unico

**Decisione.** Tutte le finestre che modificano impostazioni usano `SettingsWindow`: tab principali verticali a sinistra (con gruppi, contatore e ricerca), intestazione, tab secondari orizzontali facoltativi, sezioni di righe "etichetta + controllo", piè di pagina facoltativo. Render approvato il 28 ottobre 2026: `design/settings-window.html`.

**Perché.** Un solo modello rende tutte le impostazioni riconoscibili e fa risparmiare lavoro: chi scrive un'app descrive i tab e i controlli, non l'impaginazione.

**Conseguenze.** Senza piè di pagina le modifiche si applicano subito (caso normale); con il piè di pagina (Annulla / Applica / OK) alla conferma. Nuove esigenze di impaginazione si aggiungono a `SettingsView`, non alle singole finestre.

## D14. Un registro unico delle scorciatoie, modificabili dall'utente

**Decisione.** Tutte le scorciatoie sono comandi registrati in `shortcuts` (SDK) con `id`, etichetta, gruppo, combinazioni predefinite e condizione di attività (`when`). Un solo listener esegue il comando corrispondente. Le combinazioni sono stringhe canoniche (`'Ctrl+Shift+A'`); l'utente le cambia dal Pannello di controllo → Usabilità → Scorciatoie e vengono salvate solo quelle personalizzate (`lilos:shortcuts`). I tasti di navigazione dentro i componenti (frecce, Invio, Esc nei menu e nei tab) e Spazio + trascina restano fissi.

**Perché.** Prima ogni componente aveva il suo listener con i tasti scritti a mano: impossibile cambiarli, elencarli o evitare conflitti. Con un registro, ogni nuovo comando compare da solo nel Pannello di controllo e le etichette di menu e tooltip restano giuste.

**Scelte di dettaglio.**

- Cifre per posizione del tasto (`Shift+1` funziona con ogni layout), lettere secondo il layout; Shift ignorato per i simboli, perché serve a produrli.
- Con il focus su un controllo, i tasti senza Ctrl o Alt appartengono al controllo.
- Una combinazione appartiene a un solo comando; in caso di conflitto l'utente sceglie se sostituire.
- Le combinazioni che rompono la scrittura o la navigazione (lettere da sole, Tab, Spazio) o che il browser tiene per sé non sono assegnabili.

**Da ripensare quando** serviranno scorciatoie dentro le app: probabilmente con un contesto per app (la stessa combinazione in app diverse), oggi non ammesso.

## D15. File system virtuale: la scrivania è una cartella

**Decisione.** Cartelle, file e collegamenti sono nodi di un albero (`fs` nell'SDK), salvato per intero in `lilos:fs` e validato alla lettura. Le cartelle di sistema (Scrivania, Documenti, Immagini, Download) non si rinominano né eliminano. La scrivania è la vista della cartella `/Scrivania` (dal [D27](#d27-workspace-scrivanie-separate-isolate-dal-file-system), quella del workspace attuale, privata); le posizioni degli elementi stanno a parte (oggi `lilos:ws:<id>:desktop-layout`). Desktop e File Manager modificano solo tramite `fs` e si aggiornano sui suoi eventi. La vecchia scrivania piatta viene migrata al primo avvio.

**Perché.** Il File Manager deve aprire cartelle vere. Una sola fonte di verità evita che desktop e File Manager divergano.

**Conseguenze.**

- I file sono ancora solo nomi: niente contenuto, dimensione sempre 0.
- `localStorage` basta finché si salvano solo metadati; con i contenuti servirà IndexedDB (come previsto in D6).
- Eliminare una cartella elimina il contenuto: in origine si chiedeva conferma per le cartelle non vuote; dal [D28](#d28-il-cestino-è-una-seconda-radice-nascosta-del-file-system) l'eliminazione va nel cestino.
- I comandi sugli elementi sono comuni a tutte le viste (`src/items/targets.js`) e agiscono su quella attiva.

**Da ripensare quando** arriveranno i contenuti dei file (IndexedDB, salvataggio asincrono), lo spostamento tra cartelle e il cestino (fatti: D17, D24, D28).

## D16. Il tasto sinistro seleziona, la vista si sposta con Spazio o il tasto centrale

**Decisione.** Trascinare un punto vuoto della scrivania con il tasto sinistro disegna un rettangolo di selezione; con i modificatori dell'impostazione `lasso` (predefinito Alt) disegna un percorso libero chiuso. Ctrl/Shift aggiungono alla selezione. La vista si sposta solo con Spazio + trascina o con il tasto centrale; sugli schermi touch resta lo spostamento con un dito, perché lì non ci sono alternative.

**Perché.** Richiesta esplicita: la selezione multipla con il mouse è più frequente dello spostamento, che ha già due modi comodi.

**Conseguenze.**

- Il canvas non decide più cosa fa il tasto sinistro sullo sfondo: emette `background:press` e chi ascolta decide (`selectionGesture` nell'SDK per il disegno).
- La combinazione del percorso libero è un'impostazione (non una scorciatoia da tastiera, perché è un modificatore + trascinamento) e si sceglie tra tre combinazioni che contengono Alt, per non scontrarsi con Ctrl/Shift che aggiungono alla selezione.
- Su alcuni sistemi Alt da solo può attivare menu del browser o del sistema: per questo la combinazione è modificabile.

## D17. Contenuto dei file su IndexedDB

> Aggiornata da [D34](#d34-il-frontend-tiene-i-dati-in-memoria-e-li-sincronizza-per-differenze): con il kernel collegato il contenuto dei file sta nel database del kernel; IndexedDB ne tiene solo una copia, per quando il kernel non risponde.

**Decisione.** L'albero del file system resta in `lilos:fs` (sincrono, piccolo); il contenuto dei file va in IndexedDB (`lilos` → `contents`, chiave = id del file), con `fs.read` / `fs.write` asincroni. Se IndexedDB non c'è, il contenuto resta in memoria. I contenuti orfani si eliminano dopo l'avvio.

**Perché.** `localStorage` ha pochi MB ed è sincrono: va bene per i metadati, non per i testi. Era previsto da D6 e D15.

**Conseguenze.** Leggere un file è asincrono (l'Editor attende `read`). La dimensione dei file è reale (byte UTF-8). Eliminare un nodo elimina anche il contenuto.

## D18. Associazioni dei tipi di file e "Apri con"

**Decisione.** Le app dichiarano nel registro le estensioni che aprono (`opens`): sono le predefinite. L'utente le cambia per ogni estensione nel Pannello di controllo → Usabilità → Tipi di file, anche con "Chiedi ogni volta"; si salvano solo le scelte diverse dalla predefinita (`lilos:file-apps`). Senza app associata compare la finestra "Apri con", che può ricordare la scelta.

**Perché.** Richiesta esplicita; è il modello che gli utenti conoscono dai sistemi operativi.

**Conseguenze.** Tutte le aperture di file passano da `openFile`. Le scorciatoie delle app sono dichiarate nel registro (`commands`) e registrate all'avvio, così sono nel Pannello di controllo anche prima che l'app venga caricata.

## D19. Editor con textarea ed evidenziazione sovrapposta, senza librerie

> Aggiornata da [D21](#d21-tree-sitter-textmate-e-language-server-nelleditor): la textarea sovrapposta resta, l'evidenziazione può venire da Tree-sitter o TextMate.

**Decisione.** L'Editor usa una `textarea` trasparente sopra una copia evidenziata con le stesse misure, e un piccolo evidenziatore a espressioni regolari scritto nel progetto.

**Perché.** Nessuna dipendenza (D1); la `textarea` dà gratis cursore, selezione, Annulla, accessibilità e input da tastiere straniere.

**Conseguenze.** Niente a capo automatico (le righe devono coincidere); evidenziazione approssimata, non un vero analizzatore; oltre 300 000 caratteri il testo non viene colorato.

**Da ripensare quando** serviranno più documenti per finestra, cerca e sostituisci, a capo automatico o file molto grandi: valutare un editor dedicato (per esempio CodeMirror) caricato solo nell'app.

## D20. Suggerimenti dell'Editor con vocabolari nel codice, per ora

> Superata da [D21](#d21-tree-sitter-textmate-e-language-server-nelleditor): i vocabolari restano solo quando non c'è un language server.

**Decisione.** I suggerimenti dell'Editor vengono da elenchi scritti nel progetto (`complete.js` dell'Editor, oggi nel repository ufficiale) e da un riconoscimento del contesto con espressioni regolari, più le parole del documento. Si aprono da soli mentre si scrive e con Ctrl Spazio (scorciatoia modificabile).

**Perché.** Nessuna dipendenza (D1), risposta immediata, e copre i casi frequenti (parole chiave, proprietà e valori CSS, tag e attributi HTML).

**Alternative per il futuro** (formati standard, da valutare se i suggerimenti devono diventare più ricchi):

- **Dati di VS Code per HTML e CSS** (`html-data` / `css-data`, pacchetto `@vscode/web-custom-data`): JSON con tag, attributi, proprietà e valori presi da MDN, con descrizioni. Si potrebbero caricare al posto degli elenchi, anche solo per le parti usate.
- **Language Server Protocol**: il protocollo standard per completamento, errori e informazioni. I servizi di VS Code per HTML, CSS e JSON (`vscode-html-languageservice` e simili) girano anche nel browser, in un worker; per JSON con **JSON Schema**.
- **Grammatiche TextMate** (`.tmLanguage.json`, usate da VS Code, Sublime, Shiki) o **Tree-sitter** per l'evidenziazione: più precise, ma richiedono un motore (Oniguruma o Tree-sitter in WebAssembly).
- **Snippet** nel formato di VS Code/TextMate (`$1`, `$0` per le posizioni del cursore), al posto del nostro `|`.

## D21. Tree-sitter, TextMate e Language Server nell'Editor

> Dal 29 ottobre 2026 l'Editor non è più in questo repository ma nel repository ufficiale ([D38](#d38-le-app-di-sistema-vengono-dal-repository-ufficiale-e-girano-dentro-lilos)): le dipendenze, `public/tree-sitter/` e `vendor-tree-sitter.mjs` descritti qui stanno là (`npm run vendor:tree-sitter`). lilOS stesso è tornato senza dipendenze a runtime.

**Decisione.** L'Editor supporta i formati standard: grammatiche **Tree-sitter** (`web-tree-sitter`, grammatiche ufficiali copiate in `public/tree-sitter/`), grammatiche **TextMate** (Shiki con il motore di espressioni regolari JavaScript; anche file `.tmLanguage.json` aggiunti dall'utente) e il **Language Server Protocol** (client scritto nel progetto; server nel browser per JSON, CSS e HTML con i servizi di linguaggio di VS Code in Web Worker; server esterni via WebSocket). Per JSON si può indicare uno schema da un file di lilOS o da un indirizzo web, oltre a `$schema`. Il motore si sceglie per linguaggio nelle Impostazioni dell'Editor.

**Perché.** Richiesta esplicita: usare i formati che gli editor reali condividono invece di vocabolari scritti a mano.

**Conseguenze.**

- **Prime dipendenze a runtime** (modifica a D1): `@shikijs/core`, `@shikijs/engine-javascript`, `@shikijs/langs`, `@shikijs/themes`, `web-tree-sitter`, `vscode-json-languageservice`, `vscode-css-languageservice`, `vscode-html-languageservice`, `vscode-languageserver-textdocument`. Versioni esatte, pubblicate da almeno due settimane, nessuno script di installazione; caricate solo dall'Editor e solo quando servono.
- Le grammatiche Tree-sitter non sono dipendenze (i pacchetti compilano codice nativo all'installazione): se ne copiano `.wasm`, `highlights.scm` e licenza con `scripts/vendor-tree-sitter.mjs`.
- Gli schemi web passano da `fetch` senza cookie e richiedono che il sito permetta CORS (anche sui reindirizzamenti).
- I messaggi dei server sono in inglese.

**Alternative scartate.** CodeMirror o Monaco: editor completi e pesanti, che avrebbero sostituito tutto l'Editor; il protocollo LSP permette di usarne i server senza cambiare editor. TextMate con Oniguruma in WebAssembly: più fedele, ma un altro file WebAssembly da 500 KB; il motore JavaScript con `forgiving` basta per le grammatiche usate.

## D22. Menu configurabili nell'SDK

**Decisione.** `menus` (SDK) separa le *azioni* (dichiarate dal codice, con parametri validati) dalla *disposizione* (voci, sottomenu di un livello, separatori, ordine), che l'utente cambia e che viene salvata in `lilos:menus`. Il menu dello sfondo della scrivania è il primo: ha il sottomenu **Nuovo**, a cui si aggiungono voci che creano file o cartelle (anche da un file modello). `openMenu` supporta i sottomenu.

**Perché.** Richiesta esplicita, e un modello riutilizzabile per altri menu (File Manager, finestre).

**Conseguenze.** Una voce salvata che riferisce un'azione sconosciuta o con parametri non validi viene ignorata, non rompe il menu. Le azioni vanno dichiarate prima di costruire il menu.

## D23. Temi chiaro e scuro con token

**Decisione.** Impostazione `theme` (`'dark'` predefinito, `'light'`) che imposta `data-theme` su `<html>`. I token si dividono in due famiglie (superfici delle finestre; scrivania e barra): il tema scuro scurisce anche le finestre, il chiaro schiarisce anche scrivania, barra e menu. Tutti i colori scritti a mano negli stili sono diventati token. TextMate usa `github-light` o `github-dark`.

**Perché.** Richiesta esplicita. Con i token un tema è un insieme di valori, non un altro foglio di stile.

**Conseguenze.** L'aspetto predefinito cambia: prima la scrivania era scura con finestre chiare, ora con il tema scuro anche le finestre sono scure. Gli stili nuovi devono usare solo token.

## D24. Cartella aperta nell'Editor e `fs.move`

**Decisione.** L'Editor apre una cartella in un pannello a destra (`FileTree.js`), ridimensionabile dal bordo sinistro. La cartella è la radice: dentro si crea, rinomina, sposta ed elimina; fuori non si va (anche "Sposta in…" mostra solo le sue cartelle). Per spostare serve una nuova operazione dell'SDK, `fs.move(id, parentId)`, con l'evento `change` di tipo `move` (`from`, `ids`). Cartella aperta, cartelle espanse e larghezza sono condivise tra le finestre dell'Editor (`lilos:editor-tree`).

**Perché.** Richiesta esplicita (pannello a destra, gestione del contenuto, ridimensionabile). Spostare un nodo cambiando `parent` conserva id e contenuto: chi ha aperto il file non lo perde, deve solo aggiornare percorso e URI. Limitare le azioni alla radice evita di modificare per sbaglio cartelle fuori dal progetto.

**Conseguenze.** Ogni vista che segue `fs` deve gestire `move` (scrivania, File Manager, Editor lo fanno): un elemento può comparire o sparire da una cartella senza `create` o `remove`. Lo spostamento esiste per ora solo nel pannello dell'Editor; File Manager e scrivania non trascinano ancora dentro le cartelle.

## D25. Workarea: aree della scrivania con contenuto geometrico

> Il "workspace" riservato qui è ora [D27](#d27-workspace-scrivanie-separate-isolate-dal-file-system). Le finestre fuori dalle workarea non sono più un limite: le ricorda D27, per workspace.

**Decisione.** Una **workarea** è un rettangolo della scrivania con un titolo (`src/workareas/`, salvate in `lilos:workareas`). Le regole:

- **Il nome è "workarea"**, al femminile ("la workarea"). "Workspace" era riservato a una funzione futura diversa, ora realizzata da [D27](#d27-workspace-scrivanie-separate-isolate-dal-file-system): nel codice e nella documentazione "workspace" non indica una workarea.
- **Appartenenza geometrica.** Un elemento del desktop o una finestra appartiene alla workarea aperta che contiene il suo **centro**. Non c'è un elenco di membri da tenere aggiornato: spostare una cosa dentro o fuori, o ridimensionare l'area, ne cambia il contenuto.
- **Le workarea aperte non si sovrappongono.** Creare dove c'è già un'area è rifiutato con un messaggio; trascinare e ridimensionare si fermano all'ultimo punto valido; riaprendo una workarea che coprirebbe un'altra, la si sposta a destra con il contenuto.
- **Una workarea attuale** (l'ultima in cui l'utente ha fatto clic, o la cui finestra ha il focus) a cui si restringono le richieste della scrivania: Seleziona tutto, Riordina, Mostra tutto, rettangolo di selezione, app avviate.
- **Una finestra per app per ambito.** Il launcher cerca la finestra di un'app solo tra quelle della workarea attuale (o fuori da ogni workarea); una finestra identica altrove non conta come già aperta. Una nuova finestra si apre dentro l'area, sotto la barra del titolo.
- **Ridurre a icona** nasconde gli elementi, chiude le finestre salvandone lo stato (`Window.getState`, posizione, dimensione) e lascia sulla scrivania un'icona; aprirla rimette tutto e inquadra l'area.
- **Il testo non salvato si chiede, non si salva.** Prima di ridurre, ogni finestra con modifiche (`canClose`) chiede all'utente; con Annulla non si riduce.
- **Eliminare una workarea tiene il contenuto sulla scrivania** (la riapre prima, se ridotta). Si elimina solo il contenitore.
- **Finestre salvate anche da aperta.** Le finestre delle app nelle workarea aperte sono scritte in `lilos:workareas` e tornano dopo il ricaricamento; quelle fuori da ogni area no (aggiornato: ora le ricorda D27, per workspace).

**Perché.** Richiesta esplicita: tenere insieme i lavori e poter mettere via un intero contesto. L'appartenenza per centro evita una seconda fonte di verità (membri dichiarati contro posizione reale) e fa funzionare tutto con i gesti già esistenti, senza "aggiungi alla workarea". Niente sovrapposizioni evita che un elemento appartenga a due aree. Una finestra per app per ambito permette di avere un Editor per ogni lavoro senza cambiare il modello "un'app, una finestra". Il testo non salvato viene chiesto perché salvare bozze nascoste cambierebbe il significato di "salva" e potrebbe sovrascrivere file. Eliminare tenendo il contenuto rende l'azione sicura: non c'è cestino.

**Conseguenze.**

- Le finestre ridotte, secondarie (selettori, proprietà, impostazioni dell'Editor) e quelle ingrandite non si ricordano com'erano: le secondarie si chiudono, le ingrandite tornano non ingrandite, il Pannello di controllo riparte dalla prima scheda.
- L'app che vuole riaprirsi com'era imposta `getState` e accetta i dati in `args` (vedi la [ricetta](../sviluppatore/ricette.md#far-riaprire-la-finestra-di-unapp-da-una-workarea)); lo stato è al massimo 4000 caratteri di JSON.
- Gli elementi nascosti di una workarea ridotta restano nodi di `/Scrivania`: compaiono nel File Manager.
- Le workarea sono dati di sistema, non nodi del file system: le icone delle workarea non sono salvate nelle posizioni della scrivania (`lilos:ws:<id>:desktop-layout`).
- La voce **Nuovo → Workarea** è predefinita: un menu già personalizzato dall'utente non la riceve da solo.
- Ogni workarea aperta aggiunge un oggetto al canvas, sotto tutti gli altri, che lascia passare il puntatore: serve fare attenzione a non catturare i clic dentro l'area.

**Quando ripensarla.** Se serviranno aree che si sovrappongono o contenuto indipendente dalla posizione (appartenenza dichiarata), o quando arriverà il "workspace" vero e proprio, per decidere come convivono (arrivato con D27: ogni workspace ha le sue workarea, salvate in `lilos:ws:<id>:workareas`).

## D26. Annulla e ripeti centrali, per chi ha il focus

**Decisione.** Ctrl Z e Ctrl Y (anche Ctrl Shift Z) sono due comandi unici (`src/systemHistory.js`) che agiscono sulla cronologia di **chi ha il focus**. Ogni posto che ha azioni da annullare tiene una `UndoStack` (SDK, `sdk/core/history.js`) e la collega a un suo elemento con `history.attach`: la scrivania (`desktop.history`, la radice), ogni finestra del File Manager, il pannello della cartella dell'Editor. `history.resolve()` parte dall'elemento con il focus e sale fino al primo con un gestore; senza focus vale la finestra attiva; una finestra senza cronologia non fa nulla (non si tocca la scrivania dietro); senza finestra attiva vale la scrivania. Le azioni sul file system passano da `src/items/fsHistory.js`; per eliminare, `fs.snapshot` copia nodi e contenuti prima di `fs.remove`, e `fs.restore` li rimette con gli stessi id.

**Perché.** Annullare l'eliminazione era il limite più sentito (allora non c'era un cestino; vedi [D28](#d28-il-cestino-è-una-seconda-radice-nascosta-del-file-system)). Una cronologia unica e globale mescolerebbe cose che l'utente non vede insieme: Ctrl Z in una finestra del File Manager non deve annullare lo spostamento di un'icona dall'altra parte della scrivania. Legare la cronologia al focus rende il comportamento prevedibile e permette a ogni app di avere la sua senza che il sistema ne sappia nulla. Una voce con `undo` e `redo` (e non uno stato intero da ripristinare) funziona per azioni diverse e leggere, come un trascinamento.

**Conseguenze.**

- **Una cronologia per posto, non una globale.** Chi aggiunge un'app con azioni annullabili crea la sua `UndoStack` e la collega (vedi la [ricetta](../sviluppatore/ricette.md#aggiungere-annulla-e-ripeti-a-unapp)). Le finestre senza cronologia (Pannello di controllo) non annullano nulla.
- **Voci asincrone.** `undo` e `redo` possono restituire una Promise (lo snapshot legge i contenuti da IndexedDB). Un solo passo alla volta: finché uno è in corso, gli altri rispondono `null`.
- **Una voce che fallisce si toglie.** Se `undo` o `redo` lancia (per esempio la cartella non esiste più), la voce viene scartata e compare "Non si può più fare: …": la cronologia non resta mai bloccata.
- **I campi di testo tengono l'annulla del browser**, a meno che il gestore dica `text: true`. L'Editor lo dice e usa `document.execCommand('undo' | 'redo')`: la cronologia della `textarea` include scrittura, suggerimenti e rientri, che non si possono rifare a mano.
- **Le cronologie vivono solo in memoria** (massimo 100 voci ciascuna): dopo una ricarica sono vuote, e quella di una finestra del File Manager si perde alla chiusura.
- **Eliminare è annullabile.** Dal D28 l'eliminazione normale va nel cestino e annullare è `fs.untrash`; lo snapshot, preso prima di rimuovere, resta per l'eliminazione definitiva (`deletePermanent`). Nel caso dello snapshot il costo è la memoria: i testi di una cartella eliminata restano nella voce finché la cronologia la ricorda.
- Annullare uno spostamento nell'Editor non rimette il nome cambiato per renderlo unico.

**Quando ripensarla.** Se serviranno cronologie che sopravvivono alla ricarica (andrebbero salvate, con un limite di spazio), un annulla globale che attraversi più posti.

## D27. Workspace: scrivanie separate, isolate dal file system

> In parte superata da [D36](#d36-le-app-installate-sono-di-tutti-le-operazioni-di-installazione-sono-per-utente): le app non si installano più per workspace. Un'app installata in lilOS vale per tutti i workspace e ognuno può solo nasconderla (il campo `apps` di un workspace è l'elenco delle app **visibili**). Il resto vale ancora.

**Decisione.** Un **workspace** (`src/workspaces/`) è una scrivania completa e separata. Ne ha una per sé: la cartella Scrivania, la vista, le posizioni degli elementi, le workarea, le finestre aperte e le app installate. L'elenco è in `lilos:workspaces`; le parti di ciascuno in `lilos:ws:<id>:camera | desktop-layout | workareas | windows`. Le regole:

- **L'isolamento sta in `fs`, non nelle viste.** La Scrivania di un workspace è una cartella `private` con `workspace` = il suo id. Con `fs.setWorkspace(id)`, le cartelle private degli altri workspace e tutto ciò che contengono non esistono per nessuna operazione di `fs`. Documenti, Immagini e Download sono condivise.
- **Ogni nodo ricorda chi l'ha creato** (`workspace`), anche fuori dalla propria Scrivania; spostare o rinominare non lo cambia. Le cartelle di sistema condivise non hanno proprietario. Il File Manager mostra il proprietario in una colonna.
- **Cambiare workspace non chiude nulla.** Le finestre del workspace lasciato restano aperte e nascoste (`ws-away`), con il testo non salvato; la cronologia annulla della scrivania riparte. Le finestre delle app fuori dalle workarea si salvano per workspace e si riaprono alla prima visita della sessione.
- **App installate per workspace.** File Manager e Pannello di controllo sono `system` (sempre installate). Menu di avvio e "Apri con" mostrano solo le installate; un'app non installata non parte (messaggio). Disinstallare chiude, chiedendo, le finestre di quell'app nel workspace attuale. Le associazioni dei tipi di file restano globali.
- **Eliminare un workspace non cancella mai file** (neanche quelli nel cestino: dal [D28](#d28-il-cestino-è-una-seconda-radice-nascosta-del-file-system) ciò che aveva cestinato dalla sua Scrivania diventa visibile a tutti, `fs.unscopeTrash`). La sua Scrivania diventa `/Documenti/Scrivania di <nome>` (rimossa se vuota; `fs.share`), le sue finestre delle app passano nel workspace attuale con il testo non salvato (`wm.adopt`; le secondarie si chiudono). Workarea, vista, posizioni e app installate si perdono. Nell'elenco resta una voce "rimossa" con nome e colore, perché i suoi file dicano ancora di chi erano.
- **Preferenze globali.** Tema, colore principale, scorciatoie, menu e tipi di file valgono per tutti i workspace.
- **Avvio e migrazione.** I dati di prima dei workspace diventano un workspace «Principale», proprietario di tutti i nodi esistenti (`fs.claim`), con la vecchia `/Scrivania` resa privata e le chiavi `camera`, `desktop-layout`, `workareas` portate sotto `ws:<id>:`. All'avvio si ripara: Scrivania privata senza workspace (il workspace torna), workspace senza Scrivania (ne riceve una vuota), chiavi di workspace inesistenti (cancellate). Al massimo 20 workspace vivi.

**Perché.** Richiesta esplicita: cambiando workspace si hanno elementi diversi sul desktop e ognuno vede solo i suoi, ma i file in altre posizioni sono visibili a tutti e deve essere sempre possibile capire di quale workspace fanno parte. Mettere la visibilità in `fs` fa rispettare l'isolamento a ogni vista (scrivania, File Manager, selettori, pannello dell'Editor) e a ogni app futura senza che lo sappiano; filtrare nelle viste ne dimenticherebbe sempre una. Nascondere le finestre invece di chiuderle evita di perdere il testo non salvato a ogni cambio. Non cancellare i file eliminando un workspace segue la regola del progetto: senza cestino, le azioni distruttive vanno evitate. Le preferenze sono globali perché sono dell'utente, non del lavoro.

**Alternative scartate.** Filtrare nelle singole viste: fragile. Un'etichetta o una cartella per workspace con le viste filtrate dall'esterno: l'isolamento non sarebbe garantito. Chiudere le finestre cambiando workspace: perde testo. Cancellare i file con il workspace: irreversibile. Preferenze per workspace: più complessità senza una richiesta.

**Conseguenze.**

- Ogni modulo che salva dati del lavoro (vista, posizioni, workarea, finestre) usa una chiave per workspace (`workspaceKey`) e va aggiunta a `PARTS`, o resta nei dati dopo l'eliminazione.
- `Desktop`, `Canvas` e `Workareas` si sanno ricaricare (`load`, `useCamera`) invece di essere ricreati.
- Una finestra appartiene al workspace in cui è nata; `wm.windows` e `wm.get` guardano solo il workspace attuale.
- Un file condiviso aperto in un Editor di un altro workspace e poi spostato nella Scrivania privata del workspace attuale diventa invisibile a quell'Editor: salvare fallisce.
- Le finestre di un workspace eliminato finiscono al centro della vista attuale, anche dentro una workarea attuale.
- Un'app nuova nel registro non è installata nei workspace già salvati: l'utente la attiva nel Pannello di controllo → Workspace.
- Più schede del browser continuano a sovrascriversi (vedi i limiti noti).

**Quando ripensarla.** Se serviranno preferenze per workspace, condivisione di una cartella tra alcuni workspace (oggi: tutti o uno), o l'accesso di più utenti (i workspace diventerebbero per utente).

## D28. Il cestino è una seconda radice nascosta del file system

**Decisione.** Eliminare sposta i nodi sotto una seconda radice, `fs.trashRoot` (`'trash'`), invece di toglierli. Il nodo tiene id, contenuto e sottoalbero, e prende `trashed: { at, from, scope? }` (quando, da quale cartella, e per i nodi venuti da una cartella privata il workspace). Per `get`, `exists`, `children`, `resolve`, `read`, `snapshot` e tutti gli altri metodi i nodi nel cestino **non esistono**; si vedono solo con `fs.trashed()`. Il resto lo fa `fs`: `untrash` (torna nella cartella d'origine o, se non c'è più o non è visibile, nella radice, con il nome reso unico), `purge`, `purgeTrash(time?)`, `unscopeTrash`. L'evento `change` di tipo `remove` porta `trashed: true`, così le viste si aggiornano come per un'eliminazione. Le impostazioni `deleteConfirm`, `deletePermanent` e `trashRetention` decidono se chiedere, se saltare il cestino e per quanto tempo conservare; `src/systemTrash.js` elimina ciò che è scaduto (all'avvio, ogni ora, quando cambia il periodo). Eliminare una workarea non passa dal cestino.

**Perché.** Le viste, le app e le regole dei workspace funzionano già su `fs`: se il cestino ne fa parte, un nodo cestinato sparisce da ogni vista senza che nessuna debba saperlo, e conserva id, contenuto (in IndexedDB) e sottoalbero, quindi ripristinare è uno spostamento e non una ricostruzione. Anche l'annulla (D26) diventa un semplice `untrash`, senza copiare i testi in memoria. L'isolamento dei workspace (D27) si estende da solo: `scope` fa vedere nel cestino solo ciò che il workspace ha eliminato dalla sua scrivania privata.

**Alternative scartate.**

- **Una cartella visibile sotto la radice** (per esempio `/Cestino`). Comparirebbe in `children(root)`, nei selettori e nel pannello dell'Editor, si potrebbe rinominare, spostare o riempire come una cartella qualsiasi, e ci sarebbe un solo nome possibile per ogni elemento; ogni vista dovrebbe poi escluderla a mano.
- **Un archivio separato con gli snapshot** (in `localStorage` o IndexedDB). Copierebbe i testi di ciò che si elimina e li duplicherebbe ripristinando; `localStorage` ha un limite di spazio molto stretto; due fonti di verità (albero e archivio) da tenere allineate, con id e collegamenti da ricostruire.

**Conseguenze.**

- I nodi nel cestino restano in `lilos:fs` (con `parent: 'trash'`) e i loro contenuti in IndexedDB: occupano spazio finché non si eliminano per sempre. Alla lettura si scartano i figli del cestino senza un `trashed` valido.
- Nel cestino i nomi possono ripetersi: il nome si rende unico solo al ripristino.
- Le cartelle che contengono nodi di sistema non si cestinano. `ownedCount` esclude il cestino.
- Il cestino è visto dal workspace attuale (`scope`); la pulizia automatica invece guarda tutti. Eliminare un workspace rende visibili a tutti i suoi elementi cestinati (`unscopeTrash`): quindi **eliminare un workspace continua a non cancellare file**.
- Dopo il ripristino di un elemento, Ctrl Z lo rimette nel cestino. **Eliminare definitivamente dal cestino non si annulla**, per questo il File Manager chiede sempre conferma. Con `deletePermanent` si usa ancora lo snapshot (D26), che vale solo finché la pagina resta aperta.
- Ripristinare la scrivania e i file iniziali cancella anche il cestino (azzera `lilos:fs`).
- Il cestino aumenta la dimensione di `lilos:fs` (vedi il limite di `localStorage` nei limiti noti).

**Quando ripensarla.** Se `lilos:fs` si avvicinasse al limite di `localStorage` (i nodi cestinati pesano come gli altri), se servissero cestini per cartella o per utente, o se anche le workarea dovessero passare dal cestino.

---

## D29. I tag stanno sui nodi e un tag invisibile nasconde gli elementi

**Decisione.** Un tag è `{ id, name, color, visible }`, definito nell'SDK (`tags`, `sdk/core/tags.js`) e salvato in `lilos:tags`. L'assegnazione sta sul nodo del file system: il campo `tags` (id dei tag, al massimo 30, mai sui nodi di sistema), che si cambia con `fs.setTags` e si legge con `fs.tagged(tagId)` (tutti i nodi con il tag che il workspace attuale vede, esclusi quelli nel cestino). Un tag **invisibile** nasconde gli elementi che lo hanno, ovunque: `tags` comunica a `fs` l'insieme dei tag nascosti (`fs.setHiddenTags`, evento `scope`) e `fs.children()` esclude i nodi che ne hanno uno. `get`, `exists`, `resolve`, `ancestors`, `path`, `read` e `tagged` li trovano ancora. Gli elementi nascosti si ritrovano solo cercando per tag (la vista del tag nel File Manager). Eliminare un tag lo toglie da tutti gli elementi, cestino compreso (`fs.dropTag`). I tag sono globali: gli stessi in tutti i workspace.

**Perché.**

- *Nodo.* Il tag segue l'elemento quando lo si sposta, rinomina, cestina e ripristina, e vale per scrivania, File Manager e Editor senza codice in più. `snapshot`/`restore` e il cestino (D28) lo conservano già.
- *Nascondere in `children()`.* È l'unico punto da cui tutte le viste (scrivania, File Manager, selettore, pannello dell'Editor, conteggi) leggono gli elenchi: nessuna deve saperlo. Non si nasconde in `get`/`exists` perché una finestra aperta su un file con un tag invisibile, l'Editor, la vista del tag, "Mostra nella cartella" e le scorciatoie devono continuare a trovarlo; sarebbe come eliminarlo.
- *Invisibile = nasconde gli elementi.* È la scelta dell'utente alla domanda su cosa voglia dire invisibile. Serve a togliere di mezzo file e cartelle senza eliminarli.
- *Tag globali.* Cartelle di sistema e file condivisi sono visti da tutti i workspace: un tag per workspace darebbe nomi e colori diversi allo stesso elemento e nasconderlo in uno solo sarebbe incoerente.

**Alternative scartate.**

- **Invisibile = nascondere solo il pallino** del tag. Più semplice e senza rischi, ma non risponde alla richiesta: l'utente voleva far sparire gli elementi.
- **Nascondere in `get`/`exists`** (come per le cartelle private, D27). Le finestre aperte perderebbero il file, l'Editor non riaprirebbe i documenti, e non ci sarebbe modo di ritrovare gli elementi dalla vista del tag.
- **Tag per workspace.** Vedi sopra.
- **Una tabella separata nodo → tag.** Due fonti di verità da tenere allineate negli spostamenti, nel cestino e nel ripristino.

**Conseguenze.**

- `fs` ha due insiemi che cambiano ciò che si vede: il workspace e i tag nascosti. Per questo l'evento `scope` significa ora "cambia ciò che è visibile" e chi mostra elenchi lo ascolta (la scrivania si riallinea con `#reconcile`). I getter di `fs` restituiscono copie che non condividono l'array `tags`.
- Un elemento dentro una cartella nascosta non è nascosto a sua volta, se non ha il tag, ma non si vede finché la cartella è nascosta: si raggiunge dalla vista del tag della cartella o da "Mostra nella cartella".
- Sulla scrivania un elemento nascosto tiene la sua posizione in `lilos:ws:<id>:desktop-layout` e ricompare lì quando il tag torna visibile, viene tolto o eliminato.
- Un utente può "perdere" file nascondendoli senza ricordarselo: la guida lo spiega e File Manager mostra i tag invisibili con il simbolo dell'occhio barrato.
- Il nome dell'elemento è ancora unico nella sua cartella anche se nascosto: creare un file con lo stesso nome di uno nascosto dà un nome con il numero.
- `lilos:fs` cresce di poco: al massimo 30 id per nodo.
- Mettere o togliere un tag non si annulla (non entra nella cronologia, D26).
- Il ripristino "Scrivania e file iniziali" cancella anche `lilos:tags`.

**Quando ripensarla.** Se servissero tag diversi per workspace, tag annidati o con regole (per esempio "nascondi solo sulla scrivania"), se i nodi crescessero tanto da rendere lento `tagged` (oggi scorre tutti i nodi), o se si volesse cercare per tag anche dal menu di avvio.

---

## D30. Un solo modulo di trascinamento per tutte le viste di file e cartelle

**Decisione.** Il trascinamento di file e cartelle sta in `src/items/itemDrag.js` e lo usano la scrivania, il File Manager e il pannello dell'Editor. Una vista fa tre cose: `markItem(el, node)` marca l'elemento che mostra un nodo (`data-node`), `dropZone(el, zone)` registra un'area che accetta rilasci, `dragItems(e, { ids, stack, … })` avvia il trascinamento da un `pointerdown`. Il bersaglio si trova dal DOM: sotto il puntatore, risalendo gli antenati, vale la prima zona registrata o il primo elemento marcato che è una cartella; un elemento `.window` ferma la ricerca (un rilascio sopra una finestra non arriva mai alla scrivania sotto). Un file marcato lascia passare il rilascio a ciò che lo contiene. Lo spostamento (`moveNodes` in `fsHistory.js`) è **un solo passo** di annulla e si registra **una volta**, nella cronologia della vista da cui parte il trascinamento. Il File Manager tiene nella sezione «Collegamenti» della barra laterale le voci fisse (Home, Scrivania…) e i collegamenti, nell'ordine scelto dall'utente; i tag e il Cestino stanno sotto, fuori dall'ordine (`src/items/links.js`, `lilos:files-sidebar`): una lista di chiavi (id di nodo, `desk`), massimo 80, condivisa tra workspace.

**Perché.**

- *Stesse operazioni ovunque.* Un file si trascina da qualsiasi vista a qualsiasi altra, con lo stesso fantasma vicino al puntatore, lo stesso evidenziamento del bersaglio, Esc per annullare e gli stessi messaggi. Prima solo il pannello dell'Editor spostava, con codice suo.
- *Nessuna dipendenza tra viste.* La vista di partenza non sa chi riceve, chi riceve non sa da dove arriva: si incontrano solo nel DOM (`data-node`, zone registrate) e nel file system. Una vista nuova, o un'app di terzi, si inserisce marcando i suoi elementi, senza toccare le altre.
- *Una registrazione sola.* Se partenza e arrivo registrassero ciascuna il proprio passo, Ctrl Z ne vedrebbe due e dipenderebbe da quale cronologia ha il focus. Registrando nella cronologia d'origine, annullare (Ctrl Z dove si è trascinato) rimette tutto al suo posto in un colpo.
- *Un elemento `.window` blocca.* Le finestre coprono la scrivania: senza questa regola un rilascio su una finestra senza bersaglio finirebbe su una cartella nascosta sotto di essa.
- *I collegamenti sono id.* Seguono il nodo quando cambia nome o posizione e non duplicano nulla; se il nodo non si vede (cestino, scrivania di un altro workspace) il collegamento non si mostra, ma resta nell'ordine al suo posto.
- *La barra laterale è una zona con `target`, non voci con `markItem`.* Una stessa voce ha due significati: il centro di una cartella sposta dentro, il bordo (circa 8 px, tra due voci) crea un collegamento in quel punto; il Cestino invece elimina sempre, anche ai bordi, e i tag non fanno nulla. `markItem` dice solo «questo elemento è questo nodo» e `zone.folder` restituisce una cartella sola: non possono distinguere il punto. La zona con `target(hit, x, y, ids)` decide tutto da sola, e le voci portano solo `data-entry` e `data-folder`. Il costo è che la barra riscrive per conto suo la regola «una cartella accetta rilasci».

**Alternative scartate.**

- **Drag and drop nativo di HTML5** (`draggable`, `dragstart`, `drop`). Con il canvas trasformato (zoom e spostamento) l'immagine di trascinamento e gli eventi `dragover` si comportano male, e non dà controllo sul fantasma, su Esc, sul ritorno delle icone al loro posto né sull'annulla.
- **Un bus di eventi tra le app** (la vista di partenza annuncia, quella di arrivo risponde). Servirebbe un protocollo, un ordine tra chi ascolta e un modo per sapere chi ha gestito; la ricerca dal DOM è più semplice e si vede dove si rilascia.
- **Un oggetto modello per ogni elemento, condiviso tra le viste.** Ogni vista ha già il suo modo di mostrare un nodo (icona sulla scrivania, riga, riquadro, riga dell'albero): un modello comune le legherebbe tra loro e a un ciclo di vita da gestire. Il nodo di `fs` è già il modello comune.

**Conseguenze.**

- Lo spostamento mantiene id, contenuto, tag e collegamenti. Annullando, i nodi tornano nella cartella d'origine con il vecchio nome (anche se per renderlo unico ne era stato cambiato uno). Se un nodo dà errore (per esempio un nome che non si può usare) e nessun altro si sposta, `moveNodes` lancia l'errore e `moveInto` lo mostra come messaggio; se non c'è nulla da spostare, non succede niente.
- Un nodo di sistema, una cartella dentro se stessa o dentro una sua discendente, e una cartella dove il nodo già si trova non sono bersagli validi.
- La scrivania fa tornare le icone al loro posto prima di spostare, così Ctrl Z le rimette dove erano. Rilasciando sopra una finestra senza bersaglio, fuori dalla scrivania o con Esc, tutto torna com'era.
- Nella barra laterale del File Manager decide `#sideTarget` dalla posizione: nella sezione Collegamenti, al centro di una cartella sposta (annullabile), tra due voci crea o sposta un collegamento (non annullabile); sul Cestino elimina sempre (annullabile nella finestra di partenza); sui tag e sotto il Cestino non fa nulla. Eliminare un collegamento (×, Canc, menu) toglie solo la voce e si annulla con Ctrl Z nella finestra del File Manager.
- Non c'è copia (Ctrl), né apertura automatica delle cartelle al passaggio, né spostamento da tastiera su scrivania e File Manager; il blocco Tag della barra laterale non è un bersaglio (al centro non fa nulla).

**Quando ripensarla.** Se serviranno la copia o il taglia/copia/incolla (conviene allora un'operazione scelta dal bersaglio, non dalla vista di partenza), il trascinamento da e verso il sistema operativo (qui il drag nativo diventa inevitabile, per i file esterni), lo spostamento da tastiera, oppure se le viste diventassero così tante da rendere lenta la ricerca dal DOM.

## D31. Un kernel modulare, con il controllo degli accessi dentro il modulo del file system

**Decisione.** Il backend è un processo Node (`system/kernel/`, `npm run kernel`) che non sa niente di utenti o di database. Carica **moduli** dalla cartella `system/kernel/modules/<nome>_<versione>/` (un `module.json` con `provides` e `requires`, un `index.js` con `init(ctx)`, `stop()` ed eventuali `commands`) e li avvia nell'ordine che le dipendenze richiedono. Quali moduli si usano lo dice `system/kernel/config.json`. I servizi che il kernel stesso usa sono tre, con l'interfaccia fissata in `src/services.js`: `auth` (accesso e sessioni), `users` (le persone) e `fs` (il file system). Un modulo può aggiungere endpoint propri con `ctx.route`, sotto `/api/modules/<nome>/…`, solo per utenti che hanno fatto l'accesso.

Il **controllo degli accessi sta nel modulo `fs`**: ogni metodo riceve chi chiede (`{ kind: 'user', id, … }` oppure `{ kind: 'kernel' }`) e rifiuta ciò che non è permesso (`not_found` per ciò che non si deve nemmeno sapere che esiste, `forbidden` per ciò che si vede ma non si cambia). Il kernel instrada, controlla chi sta chiedendo e passa oltre.

Senza un modulo `auth` lilOS ha un solo utente (`local`, amministratore) e il kernel rifiuta di partire su un indirizzo che non sia di questo computer (127.0.0.1).

**Perché.** Il modulo che custodisce i dati è l'unico che può garantire chi li legge: se il controllo stesse nel kernel, il modulo `fs` diventerebbe un semplice archivio e il kernel dovrebbe conoscere regole (le aree, le home) che dipendono da come i dati sono salvati. Con moduli sostituibili si può cambiare database senza toccare il kernel né il frontend.

**Alternative scartate.** Un backend unico con database e utenti dentro: più semplice oggi, ma ogni cambio di archivio o di sistema di accesso tocca tutto. Controllo degli accessi nel kernel: ogni modulo `fs` erediterebbe regole che non può verificare.

**Conseguenze.**

- Chi scrive un modulo `fs` deve scrivere anche le regole di accesso: è la parte che non va sbagliata.
- ~~Non c'è un sistema di installazione dei moduli.~~ Superato da [D40](#d40-i-moduli-del-kernel-si-installano-come-pacchetti-e-valgono-dopo-il-riavvio): un amministratore li installa dall'AppStore. A mano si può ancora: un modulo si mette nella cartella `modules/` e si attiva in `config.json`; `npm run kernel:setup` installa le dipendenze di quelli che hanno un `package.json`.
- I moduli girano nello stesso processo del kernel, con gli stessi permessi: un modulo non è isolato.
- Il kernel mette le intestazioni di sicurezza a ogni risposta (`Cache-Control: no-store`, `nosniff`, una CSP che vieta tutto) e per le richieste che modificano pretende `X-Lilos: 1` e, se il browser manda `Origin`, che sia ammessa.

**Quando ripensarla.** Quando serviranno più moduli per lo stesso servizio o l'isolamento dei moduli in processi separati (l'installazione dall'interfaccia c'è: [D40](#d40-i-moduli-del-kernel-si-installano-come-pacchetti-e-valgono-dopo-il-riavvio)).

## D32. Utenti in un file: il modulo `users-basic`

**Decisione.** Il primo modulo di accesso, `users-basic_1.0.0`, tiene utenti e sessioni in un solo file, `users.json`, nella cartella del modulo (ignorato da git: contiene gli hash delle password). Le password sono salvate con scrypt (costo 2^15). Dopo l'accesso il browser riceve un cookie `lilos_session` `HttpOnly; SameSite=Strict; Path=/api`, con un token casuale: nel file resta **solo il suo hash SHA-256**. Una sessione dura al massimo 30 giorni e scade dopo 7 senza uso (`sessionDays` e `idleDays` nella configurazione del modulo). I tentativi sbagliati sono limitati: dopo 5 per nome utente, o dopo 20 per indirizzo, l'attesa raddoppia a ogni errore (2 secondi, 4, 8…) fino a 15 minuti; il conteggio è in memoria e riparte col kernel. Gli utenti si gestiscono da riga di comando: `npm run kernel:cli -- users-basic add <nome> [--admin]`, `passwd`, `remove`, `list`.

**Perché.** Nessun servizio in più da avviare e nessuna dipendenza: basta Node. Salvare solo l'hash del token vuol dire che neppure chi legge il file può usare le sessioni; il cookie con `SameSite=Strict` e l'intestazione `X-Lilos` rendono difficile far agire il browser da un altro sito.

**Conseguenze.**

- Il file si riscrive intero a ogni cambiamento, uno alla volta, passando da un file temporaneo. Va bene per pochi utenti con un solo kernel acceso; **due kernel sullo stesso file si sovrascriverebbero**.
- Il file si rilegge quando cambia (la riga di comando lo modifica mentre il kernel gira) e si controlla a ogni lettura, perché si può anche modificare a mano.
- Rimuovere un utente non cancella la sua home: resta nel file system.
- Cambiare la password chiude tutte le sue sessioni.
- Non c'è registrazione né recupero della password: l'amministratore usa la riga di comando.

**Quando ripensarla.** Con molti utenti, più kernel in parallelo, o accessi esterni (OAuth, SSO): sarà un altro modulo che fornisce `auth` e `users`.

## D33. Il file system del kernel sta in PostgreSQL

> Aggiornata da [D59](#d59-la-rete-i-protocolli-sono-moduli-del-kernel-e-i-trasferimenti-li-fa-il-kernel): dalla versione 1.1.0 il modulo (ora `fs-postgres_1.1.1`) legge e scrive i contenuti grandi a pezzi (tabella `lilos_chunks`).

**Decisione.** Il modulo `fs-postgres_1.0.0` salva ogni cartella, file e collegamento come riga della tabella `lilos_nodes` (`schema.sql`, applicato a ogni avvio: crea solo ciò che manca). Il contenuto è una colonna `bytea`; eliminare una cartella porta con sé il sottoalbero (`on delete cascade`). Ogni nodo ha un'**area** che prende dal genitore e non cambia: `root`, `system`, `app` (`/system/app`), `commons` (`/system/commons`), `tmp` (`/system/tmp`), `homes` (`/home`) e `home` (`/home/<utente>`). Le regole: ogni utente legge e scrive solo la propria home; `/system/app` e `/system/commons` li leggono tutti ma li scrive solo il kernel; `/system/tmp` e l'elenco delle home sono del kernel; niente si sposta da una home all'altra. Per lo sviluppo c'è un PostgreSQL in Docker (`docker-compose.yml` nel modulo, `npm run db:up` e `npm run db:down`), raggiungibile solo da questo computer, su `127.0.0.1:5433`; in produzione l'indirizzo si dà con la variabile `LILOS_PG_URL`, che vince su `url` della configurazione.

**Perché.** Un database dà transazioni (le modifiche del frontend arrivano in un'unica `apply`, tutte o nessuna) e interrogazioni sull'albero senza costruirle a mano. Le aree rendono esplicite le regole di accesso invece di ricavarle dai nomi.

**Conseguenze.**

- Serve un PostgreSQL acceso per far partire il kernel (il modulo riprova a connettersi dieci volte, a un secondo di distanza).
- I nomi in una cartella non sono unici nel database: `lookup()` prende il più vecchio. L'unicità la garantisce lilOS nel frontend.
- La password dell'ambiente di sviluppo (`lilos`/`lilos`) è nota: non va usata fuori dal proprio computer.
- Ogni file è letto e scritto intero (una colonna `bytea`).

**Quando ripensarla.** Se i file diventeranno grandi, o se servirà un archivio diverso (disco, oggetti): basterà un altro modulo che fornisce `fs`.

## D34. Il frontend tiene i dati in memoria e li sincronizza per differenze

**Decisione.** Il frontend si collega al kernel prima di tutto il resto (`src/main.js` → `src/boot/boot.js`: legge la sessione, mostra la schermata di accesso se serve, poi `kernel.connect()` carica con `GET /api/boot` l'albero, le impostazioni e le app). Solo dopo importa il sistema (`src/system.js`, l'ex `main.js`), perché l'SDK legge quei dati appena viene caricato. Da lì:

- `storage` e `fs` restano **sincroni e in memoria**, con la stessa API di prima. Ogni cambiamento è segnato; 300 ms dopo l'ultimo, un tracker confronta lo stato con quello che il kernel ha già (testo JSON per chiave) e manda **solo le differenze**: `POST /api/storage` per le chiavi, `POST /api/fs/sync` per i nodi, in una transazione.
- Se l'invio fallisce, riprova aspettando sempre di più (da un secondo a 30 secondi) e avvisa l'utente; con la sessione scaduta aspetta un nuovo accesso (`kernel.resume()`). Quando la pagina si nasconde o si chiude manda quel che resta, con `keepalive`.
- Il **contenuto dei file** non è in memoria: `fs.read` e `fs.write` vanno al kernel (dopo aver mandato i nodi in attesa, perché il file deve esistere). IndexedDB ne tiene una copia nel database `lilos:<id utente>`, usata solo per leggere se il kernel non risponde, e viene cancellata all'uscita.
- I dati che questo browser aveva prima del kernel (`lilos:*` in `localStorage` e IndexedDB `lilos`) si portano **una volta sola** nell'account, se l'utente lo vuole e la sua home è vuota, e poi si cancellano dal browser.

**Perché.** Tutto il sistema usa `fs` e `storage` in modo sincrono (viste, annulla, menu): renderli asincroni avrebbe riscritto ogni modulo. Mandare le differenze invece dell'intero albero tiene piccole le richieste e permette di salvare un nodo alla volta.

**Alternative scartate.** API asincrone verso il kernel a ogni lettura: troppo lavoro e troppo lento per le viste. Mandare l'intero albero a ogni modifica: pesante, e peggiora i conflitti.

**Conseguenze.**

- **Più schede si sovrascrivono ancora.** Ogni scheda manda le proprie differenze e sul singolo nodo vince l'ultima scrittura. Non c'è sincronizzazione in diretta tra schede.
- L'SDK senza kernel funziona ancora come prima (solo nel browser), ma **il sistema parte solo con il kernel**: se non risponde, la schermata iniziale chiede di avviarlo.
- Chiudere la pagina con modifiche non ancora inviate mostra l'avviso del browser (`kernel.pending`).

**Quando ripensarla.** Quando serviranno più schede o più dispositivi aperti insieme (sincronizzazione in diretta, con un canale dal kernel) o file grandi e binari.

## D35. Le app locali girano in un iframe `sandbox` senza `allow-same-origin`

> Vale per le app che non sono di sistema. Le app di sistema del repository ufficiale girano dentro lilOS, senza sandbox: [D38](#d38-le-app-di-sistema-vengono-dal-repository-ufficiale-e-girano-dentro-lilos).
>
> **Rivista da [D42](#d42-punti-dingresso-e-due-modalità-di-esecuzione-per-le-app) (30 ottobre 2026).** L'iframe `sandbox` resta il **modo predefinito**, ma non è più l'unico: un amministratore può far girare una singola app, o tutte, **non isolate** (finestra nella pagina di lilOS, background in un Web Worker). Valgono ancora per sempre isolate le app `remote` e quelle con `sdk` `"1"`. Quando sotto si legge «sempre» e «solo», si intende «per impostazione predefinita».

**Decisione.** Un'app installata di tipo `local` si esegue in un `<iframe sandbox="allow-scripts">` e nient'altro: la pagina non ha un'origine propria, quindi non vede il DOM, i cookie, `localStorage` né IndexedDB di lilOS. Il documento (`srcdoc`) lo costruisce lilOS: una `Content-Security-Policy` in `<meta>` che permette solo il codice messo da lilOS, le librerie del manifesto e le origini dei permessi `net:` (`connect-src`), il ponte `window.lilos` e il codice dell'app. **Il codice si scarica dal kernel e se ne controlla l'hash con quello del manifesto prima di eseguirlo**; lo stesso vale per le librerie con `cache`. L'app parla con lilOS solo con messaggi (`postMessage`), e ogni messaggio è controllato in `src/apps/packages/host.js` contro i permessi del manifesto. Poiché l'origine è opaca, il messaggio si riconosce dalla finestra che lo manda, non dall'origine. Un'app di tipo `remote` è invece un sito: un iframe sul suo indirizzo (`https`, o `http://localhost`), con `allow-same-origin` che vale per il **suo** sito; lilOS rifiuta un indirizzo con la propria origine.

**Perché.** Un'app è codice di altri. In un iframe con la stessa origine di lilOS potrebbe leggere ogni dato dell'utente, e agire con la sua sessione verso il kernel. Senza `allow-same-origin` il browser stesso impedisce l'accesso, e i permessi diventano ciò che il ponte concede.

**Alternative scartate.** Eseguire il codice dell'app nella pagina di lilOS: nessun isolamento. Un iframe con `allow-same-origin`: cancella l'isolamento. Un Web Worker: non ha interfaccia.

**Conseguenze.**

- L'app non ha `localStorage`, cookie né accesso diretto a `fs`: usa `lilos.storage` e `lilos.files` (vedi [API → apps/packages](../sviluppatore/api.md#appspackages)).
- Tutta l'interazione è asincrona.
- Le librerie senza `cache` si caricano dall'indirizzo del manifesto con `integrity` (e quell'indirizzo entra nella CSP).
- Le app remote non hanno ancora un modo per sapere chi è l'utente (`auth.remote` è nell'elenco dei permessi, ma il token non c'è).
- I widget sono validati nel manifesto. Dal 4 novembre 2026 (lilOS 1.31.0) quelli con `fileType` si mostrano sulla scrivania, ma solo per le app di sistema ([D83](#d83-i-widget-della-scrivania-legati-a-un-tipo-di-file-le-note-adesive-sono-file)).

**Quando ripensarla.** Quando servirà far girare codice senza interfaccia (permesso `background`) o quando le app remote avranno un accesso al proprio servizio.

## D36. Le app installate sono di tutti, le operazioni di installazione sono per utente

**Decisione.** Installare un'app (solo un amministratore) scrive il pacchetto una volta sola in `/system/app/<id>/<versione>` e le librerie condivise in `/system/commons/<libreria>/<versione>`: vale per **tutti gli utenti e tutti i workspace**. Ogni workspace può soltanto **nasconderla** (Pannello di controllo → Workspace). Ciò che il manifesto chiede di fare *nella cartella di ogni utente* (`install` e `update`: cartelle, file di esempio, collegamento sulla scrivania, tag, impostazioni) lo esegue **lilOS nel browser, per ciascun utente, la prima volta che incontra l'app** (e, a ogni nuova versione, i passi di `update` che riguardano le versioni saltate), e **non sovrascrive mai** ciò che c'è già. Ciò che ha creato è scritto, per utente, nella chiave `app-setup`. Quando l'app viene rimossa lilOS toglie ciò che aveva creato; ciò che l'utente ha modificato (un file con la data cambiata, una cartella non vuota) e i percorsi delle operazioni `remove` del manifesto vanno nel **Cestino**. I dati propri dell'app (`lilos.storage`) si cancellano.

**Perché.** Le operazioni parlano il linguaggio del desktop (la Scrivania del workspace, i tag, le impostazioni dell'utente): solo lilOS lo conosce. Farle all'installazione, nel kernel, obbligherebbe a conoscere tutti gli utenti e a lasciare indietro quelli che arrivano dopo.

**Alternative scartate.** Eseguirle per tutti gli utenti dal kernel durante l'installazione. Un'installazione per utente e per workspace (era il modello di [D27](#d27-workspace-scrivanie-separate-isolate-dal-file-system)): complica e non serve, perché le app sono comunque dello stesso sistema.

**Conseguenze.**

- Le operazioni girano quando l'utente apre lilOS, non all'installazione. Un utente che non accede non le riceve.
- Se due schede dello stesso utente si aprono insieme, entrambe potrebbero eseguirle (non sovrascrivono, ma potrebbero creare un doppio collegamento sulla scrivania).
- Il ripristino «Scrivania e file iniziali» cancella anche `app-setup`: dopo il ricaricamento le app installate ricreano cartelle, file ed elementi sulla scrivania.

**Quando ripensarla.** Quando le app avranno dati che l'amministratore vuole mettere nelle cartelle degli utenti già esistenti, o quando un'operazione dovrà vedere cose che il browser non vede.

## D37. Fiducia nei pacchetti: origine, firma e permessi

> Aggiornata da [D39](#d39-i-pacchetti-si-prendono-con-git) (le origini passano da `git`, non più dall'API di GitHub né da `LILOS_GITHUB_TOKEN`) e da [D38](#d38-le-app-di-sistema-vengono-dal-repository-ufficiale-e-girano-dentro-lilos) (le app di sistema).

**Decisione.** Un pacchetto ha un manifesto `lilos.json` con l'elenco dei suoi file e l'hash di ciascuno; il kernel li controlla tutti prima di scriverli. Si installa da un repository git (anche privato; era GitHub con la variabile `LILOS_GITHUB_TOKEN`, ora vedi D39; la versione è l'ultimo tag `vX.Y.Z`, oppure il `ref` indicato, e si registra il commit) o da una cartella del computer del kernel, **solo con `apps.allowLocalSources: true`** nella configurazione (sviluppo). Un'app può essere **di sistema** (`system: true`, con i permessi riservati) soltanto se viene dal repository ufficiale `GexyLab/lilos-plugins-official`. Un'app è **verificata** se è firmata (Ed25519 sul manifesto senza `signature`, chiavi in ordine) e la sua chiave è in `apps.trustedPublishers` della configurazione, oppure se viene dal repository ufficiale, di sistema o no, come i moduli del kernel (con `apps.officialKey` serve anche la firma ufficiale; aggiunto il 1° novembre 2026 per FileCrypt, la prima app non di sistema del repository); un'app non verificata si installa solo con `allowUnsigned` (l'interfaccia dovrà mostrare un avviso). Una firma che non corrisponde al manifesto è **sempre** rifiutata. I permessi sono un elenco chiuso con quattro livelli: `implicit` (dati propri, avvisi, appunti in scrittura…), `install` (li concede chi installa), `use` (concessi all'installazione e da richiedere ancora a ogni uso: appunti in lettura, fotocamera, microfono, posizione) e `reserved` (solo app di sistema).

**Perché.** Un amministratore deve poter decidere se fidarsi, e sapere che ciò che gira è ciò che ha approvato: hash per ogni file, firma per l'editore, permessi dichiarati.

**Conseguenze.**

- La chiave di un editore si dà fuori banda (`pack.js --keygen` la stampa; chi si fida la mette in `config.json`).
- ~~Il repository ufficiale non è ancora raggiungibile pubblicamente: oggi non si può installare un'app di sistema.~~ Ora il repository ufficiale esiste (privato) e il kernel ne installa le app all'avvio ([D41](#d41-le-app-di-sistema-mancanti-si-installano-allavvio-del-kernel)).
- Alcuni permessi sono accettati dal manifesto ma il ponte non ha ancora le funzioni che li userebbero: `clipboard.read`, `media.*`, `geo`, `ai.*` (`desktop.widget` ha effetto dal 4 novembre 2026 per le app di sistema, [D83](#d83-i-widget-della-scrivania-legati-a-un-tipo-di-file-le-note-adesive-sono-file); `apps.call` ora ha `lilos.apps.call`, [D42](#d42-punti-dingresso-e-due-modalità-di-esecuzione-per-le-app); `ui.menus` ha effetto dal 31 ottobre 2026, [D47](#d47-pipe-sugli-eventi-dati-delle-app-sui-file-e-filecrypt)). Vedi [Stato e roadmap](stato-e-roadmap.md).

**Quando ripensarla.** Quando ci sarà un catalogo pubblico di app (l'interfaccia per installarle c'è: l'AppStore).

## D38. Le app di sistema vengono dal repository ufficiale e girano dentro lilOS

> Aggiornata da [D71](#d71-i-sorgenti-delle-app-ufficiali-e-dei-moduli-stanno-nel-repository-di-lilos-sotto-plugins): dal 3 novembre 2026 i **sorgenti** delle app e dei moduli sono di nuovo nel repository di lilOS, sotto `plugins/`; il repository ufficiale ha solo i pacchetti costruiti.

**Decisione.** File Manager, Editor, Pannello di controllo e AppStore **non stanno più nel repository di lilOS**: sono pacchetti di [GexyLab/lilos-plugins-official](https://github.com/GexyLab/lilos-plugins-official), un repository privato che contiene anche i moduli del kernel `users-basic` e `fs-postgres` (tag `v1.0.0`). Un pacchetto con `system: true` nel manifesto è un'**app di sistema**: il kernel la accetta solo se viene da quel repository ([D37](#d37-fiducia-nei-pacchetti-origine-firma-e-permessi)) e lilOS la esegue **dentro la propria pagina, senza sandbox**. Il modulo si importa con `import()` da `/api/apps/<id>/v/<versione>/<entry>` (la versione è nel percorso, così blocchi, worker e file `.wasm` si risolvono accanto al modulo) e i fogli di stile elencati in `styles` si caricano con lui. L'app importa `@lilos/sdk` e `@lilos/system`, ma nel build restano esterni: a runtime sono `/host/sdk.js` e `/host/system.js`, file generati da `scripts/host-shims.mjs` (`predev`, `prebuild`) che rileggono `globalThis.__lilosHost`, impostato da `src/system.js` con l'SDK e con `src/systemApi.js`. `@lilos/system` è l'API di sistema per le app di sistema (colori, cartelle, registro delle app, apertura dei file, trascinamento, tag…). Il manifesto ha tre campi nuovi: `description`, `required` (app necessaria: non si rimuove né si nasconde) e `styles`. Il registro delle app non ha più app integrate: `system` vuol dire necessaria (`required`) e `trusted` app di sistema (`system`).

**Perché.** Le app ufficiali sono parte del sistema: condividono con lui il file system, la cronologia, il trascinamento tra viste, i menu e le impostazioni. Un'app in iframe isolato ([D35](#d35-le-app-locali-girano-in-un-iframe-sandbox-senza-allow-same-origin)) vede solo ciò che il ponte `window.lilos` offre (file, dati propri, titolo, avvisi, appunti in scrittura): troppo poco. Fuori dal repository di lilOS, le app (l'Editor ha molte dipendenze) si aggiornano senza rilasciare lilOS e il sistema resta senza dipendenze a runtime. Usare l'SDK di lilOS invece di averne una copia per app dà un solo `fs`, una sola connessione al kernel e nessun duplicato nel pacchetto.

**Alternative scartate.** Tenere le app nel repository di lilOS (il sistema porta con sé tutte le dipendenze dell'Editor, e ogni modifica è un rilascio di lilOS). Farle girare nel sandbox con un ponte più ampio (si rifarebbe `fs`, la cronologia e il trascinamento attraverso messaggi). Una copia dell'SDK dentro ogni app (due `fs` e due connessioni al kernel nella stessa pagina).

**Conseguenze.**

- **Chi controlla il repository ufficiale controlla codice che gira nella pagina di ogni utente, con la sua sessione.** Il repository va tenuto privato e protetto; `apps.officialKey` permette di pretendere anche una firma.
- `src/systemApi.js` (come `sdk/index.js`) è un contratto con le app già installate: togliere o rinominare un export le rompe; un export nuovo va rilasciato in lilOS **prima** dell'app che lo usa. Ogni export deve avere la forma `export { a, b } from '…'` su una riga, altrimenti lo script non lo ri-esporta.
- Il kernel installa i file così come sono: il risultato del build (`apps/<id>/dist/` e `lilos.json` con gli hash) **si committa** nel repository ufficiale.
- Non c'è un server di sviluppo per le app, e un clone locale non è "ufficiale": per provare una modifica si manda un ramo e si aggiorna l'app da quel ramo con una versione più alta (vedi [README per sviluppatori](../sviluppatore/README.md#le-app-di-sistema-e-il-repository-ufficiale)).
- I file di una versione si mettono in cache per sempre (`immutable`): cambiare il codice senza alzare la versione non ha effetto nei browser che l'hanno già scaricato.
- Senza il repository raggiungibile al primo avvio lilOS parte senza File Manager, Pannello di controllo e AppStore ([D41](#d41-le-app-di-sistema-mancanti-si-installano-allavvio-del-kernel)).
- Le tre app necessarie non si nascondono, quindi se una si rompe non si può toglierla dal menu; l'Editor sì.

**Quando ripensarla.** Se altri autori vorranno la stessa integrazione (serve un modo di concederla, oltre all'origine), se lilOS dovrà funzionare offline dal primo avvio, o se un'app di sistema dovrà essere isolata (per esempio un'app che apre contenuti di altri).

## D39. I pacchetti si prendono con git

**Decisione.** L'origine di un pacchetto (app o modulo del kernel) è una cartella di un repository **git**, letta con il comando `git` del computer del kernel: `{ type: 'git', url, ref?, path? }`; `{ type: 'github', repo: 'proprietario/nome', … }` è lo stesso, scritto in breve; `{ type: 'local', dir }` è una cartella semplice, solo per sviluppare (`apps.allowLocalSources`). I repository privati si leggono con le credenziali che git ha già sul computer (credential helper, token, chiavi): il kernel non ne conserva e non esiste più `LILOS_GITHUB_TOKEN` ([D37](#d37-fiducia-nei-pacchetti-origine-firma-e-permessi)). Senza `ref` si usa il tag di versione più alto (`v1.2.3` o `1.2.3`), altrimenti il ramo predefinito; il commit risolto si registra nello stato, e gli aggiornamenti partono da lì. Il repository si scarica in una copia temporanea (`fetch --depth 1`) **senza conversione delle fine riga**, per non alterare gli hash del manifesto. L'indirizzo è `https://…`; un percorso assoluto di un repository locale vale solo con `allowLocalSources`. I repository da cui si pesca sono l'**ufficiale** (sempre presente) e quelli aggiunti da un amministratore (`system/kernel/repos.json`, ignorato da git, al massimo 30). Ognuno ha un `catalog.json` che elenca le cartelle delle app e dei moduli.

**Perché.** Un solo meccanismo per ogni host (GitHub, GitLab, un server proprio) e per i repository privati, senza passare per le API di un fornitore e senza che il kernel custodisca segreti. I tag danno le versioni; il commit registrato rende ripetibile un'installazione.

**Alternative scartate.** L'API HTTP di GitHub con un token nella configurazione (solo GitHub, un segreto in più nel kernel: era il modello di D37). Scaricare archivi da un indirizzo (nessun modo uniforme di dire la versione e di autenticarsi).

**Conseguenze.**

- Il computer del kernel deve avere `git`, la rete e le credenziali. `git` non può chiedere una password (`GIT_TERMINAL_PROMPT=0`): se non le ha già, fallisce con un errore.
- Un tag nuovo è una versione nuova: pubblicare è `git tag` e `git push`. Con tag sparsi senza numero di versione (per esempio `latest`) si usa il ramo.
- Un pacchetto pesa al massimo 80 MB e 2000 file (20 MB l'uno); ogni comando git ha 180 secondi.
- Le fine riga devono essere quelle committate: chi lavora su Windows con `core.autocrlf` rischia hash che non corrispondono.
- Un repository si legge sempre alla versione più alta: non c'è un modo, dall'interfaccia, di installare una versione precedente.

**Quando ripensarla.** Se serviranno indirizzi `ssh://`, repository enormi, o un catalogo che non sia un repository.

## D40. I moduli del kernel si installano come pacchetti e valgono dopo il riavvio

**Decisione.** Un modulo del kernel può stare in un repository (cartella con `module.json`, elencata in `modules` di `catalog.json`) e un **amministratore** lo installa, aggiorna e toglie dall'AppStore (`system/kernel/src/apps/modulePackage.js`). L'installazione copia il modulo in `modules/<nome>_<versione>/` con un `source.json` (da dove viene), installa le dipendenze (`npm ci --omit=dev --ignore-scripts`) e lo accende in `config.json` con `defaultConfig`. Prima di cambiare la configurazione il kernel **verifica che si avvierebbe** con quei moduli (dipendenze soddisfatte, un modulo che fornisce `fs`, e senza `auth` solo su `127.0.0.1`); se no, rifiuta e lascia tutto com'era. Un modulo non ufficiale si installa solo con `allowUnsigned`, cioè dopo l'avviso nell'AppStore: il suo codice gira nel kernel con accesso completo. Ogni modifica vale **dal riavvio**: `POST /api/kernel/restart` fa uscire il kernel con il codice 75 e `system/kernel/run.js` (`npm run kernel`) lo riavvia; fuori da `run.js` la richiesta risponde che non è possibile. `module.json` ha due campi nuovi: `data` (i file dei dati del modulo) e `defaultConfig`. Aggiornando, i file di `data` passano alla nuova versione; **rimuovendo**, le cartelle che li contengono restano (gli utenti di `users-basic` non spariscono).

**Perché.** Chi gestisce lilOS non deve copiare cartelle a mano per cambiare il database o il sistema di accesso, e deve poterlo fare con la stessa fiducia (ufficiale o avviso) delle app. I moduli sono caricati all'avvio e tengono riferimenti l'uno all'altro: sostituirli a caldo sarebbe fragile, riavviare è semplice e sicuro. Non perdere i dati alla rimozione evita di cancellare gli account con un clic.

**Alternative scartate.** Caricare e scaricare moduli a caldo (servizi già agganciati ad altri moduli). Isolare i moduli in processi separati (resta nella lista di [D31](#d31-un-kernel-modulare-con-il-controllo-degli-accessi-dentro-il-modulo-del-file-system)). Lasciare l'installazione a mano.

**Conseguenze.**

- Per qualche secondo, durante il riavvio, il kernel non risponde: i salvataggi in attesa si ripetono da soli ([D34](#d34-il-frontend-tiene-i-dati-in-memoria-e-li-sincronizza-per-differenze)).
- Un modulo senza `source.json` (messo a mano) si vede nell'AppStore come «Installato a mano» e non si aggiorna da lì; si può togliere. Se il catalogo ufficiale offre un modulo con lo stesso nome, l'AppStore lo mostra due volte: la scheda del catalogo dice «Da un altro repository».
- Per questo `tools/install.js --from` riconosce i moduli copiati che sono quelli ufficiali (stesso nome, versione e codice; `module.json` uguale tranne `icon` e `description`; oltre al codice, solo i file di `data`): li riscrive dal repository ufficiale con `source.json`, tenendo i dati. Gli altri restano messi a mano.
- Le cartelle conservate alla rimozione si cancellano a mano. Reinstallare la stessa versione le riusa.
- Due versioni restano sul disco dopo un aggiornamento (quella in uso e la precedente).
- Gli endpoint di un modulo stanno sotto `/api/modules/<nome>/…`, lo stesso prefisso delle rotte di amministrazione (`/api/modules/:nome/update`): un modulo con un proprio percorso `/update` nasconderebbe quella rotta.

**Quando ripensarla.** Se servirà cambiare moduli senza interrompere il servizio, o isolarli.

## D41. Le app di sistema mancanti si installano all'avvio del kernel

**Decisione.** La configurazione ha `apps.bootstrap`: gli `id` delle app che lilOS vuole sempre (predefinito `files`, `editor`, `settings`, `appstore`). All'avvio, dopo aver registrato le rotte e **prima di mettersi in ascolto**, il kernel (`kernel.js`, `#bootstrapApps`) controlla quali mancano; se ce ne sono, legge il catalogo del repository ufficiale e le installa dall'ultimo tag, come kernel, concedendo i permessi del loro manifesto. Se il repository non risponde (rete, `git`, credenziali), il kernel parte lo stesso e lo scrive nel log: lilOS gira senza quelle app.

**Perché.** Un lilOS senza File Manager, Pannello di controllo e AppStore non è usabile, e l'AppStore non può installare sé stesso. Così basta avviare il kernel: niente passi a mano per le app ufficiali.

**Alternative scartate.** Tenerle nel repository di lilOS ([D38](#d38-le-app-di-sistema-vengono-dal-repository-ufficiale-e-girano-dentro-lilos)). Chiedere all'amministratore di installarle dal browser (serve già l'AppStore). Installarle al primo accesso dal frontend (il kernel non sarebbe l'unico a decidere).

**Conseguenze.**

- **Il primo avvio richiede `git`, la rete e l'accesso al repository ufficiale.** Dal secondo le app sono nel database e non serve più nulla finché non si aggiornano.
- L'avvio è più lungo la prima volta (il kernel non ascolta finché non ha finito).
- Si installano solo le app **mancanti**: non si aggiornano. Gli aggiornamenti si fanno dall'AppStore.
- Al primo avvio (nessuna app installata) il kernel installa tutte le app di `bootstrap`; dopo, solo quelle necessarie (`required`) che mancano. Un'app che l'amministratore rimuove (l'Editor: le altre sono necessarie) resta rimossa.
- Il catalogo ufficiale deve contenere le app indicate: una assente viene saltata con un avviso nel log.

**Quando ripensarla.** Se le app di sistema diventeranno molte o opzionali, se il kernel dovrà partire senza rete, o se servirà aggiornarle da sole.

## D42. Punti d'ingresso e due modalità di esecuzione per le app

**Decisione.** Un'app installata con `sdk` `"2"` non è più «un modulo che gira all'avvio»: esporta **una funzione per ogni punto d'ingresso**. `main` è la finestra che apre l'utente; il manifesto può dichiararne altri (`entrypoints`, al massimo 20), di tipo `window` (un'altra finestra) o `background` (nessuna finestra: risponde alle chiamate con `lilos.handle`). Li avvia il sistema (`callEntrypoint`) o un'app: le proprie con `lilos.app.call` e `lilos.app.connect` (un canale `MessagePort`), quelle di altre app con `lilos.apps.call`, che richiede il permesso `apps.call:<app>` (finora dichiarabile ma senza effetto). Un background parte alla prima chiamata, si ferma dopo 5 minuti senza usi e resta acceso solo se lo chiede (`keepAlive`), mostrandosi nella barra con un pulsante «Ferma». Un'app passa a un'altra un `file` solo se l'ha ricevuto lei; ogni altro dato arriva così com'è e chi risponde lo controlla.

Le app `local` con `sdk` `"2"` girano in **due modi**, scelti da un amministratore: una regola generale (Pannello di controllo → App → Sicurezza, `meta.security.isolated` della cartella `/system/app/.security`) e, per una singola app, una scelta propria (Proprietà → Sicurezza, `isolated` nello stato dell'app: `true`, `false` o `null` per la regola generale). Il predefinito è **isolato**.

| | Isolata | Non isolata |
| --- | --- | --- |
| Finestra | `<iframe sandbox="allow-scripts">` | Pagina di lilOS, in uno Shadow DOM |
| Background | iframe `sandbox` nascosto | Web Worker con l'origine di lilOS |
| Cosa può fare l'app | Quello che concedono `lilos` e i permessi | **Tutto ciò che può fare l'utente**, permessi o no |

Le app di sistema girano sempre nella pagina; le app `remote` e quelle con `sdk` `"1"` sempre isolate (una sola modalità, il kernel rifiuta la scelta per le prime due). Il cambio vale dalla prossima apertura. Il codice è lo stesso nei due modi: `lilosApi()` costruisce l'oggetto `lilos` attorno a una funzione `call`, che nella sandbox manda messaggi e nella pagina chiama direttamente.

**Perché.** Servono app che fanno lavoro senza interfaccia e che si parlano: l'app di cifratura per file (che tiene le chiavi in un background; nata come «Cassaforte», oggi **FileCrypt**) e le **pipe** sugli eventi (un'app che si iscrive a ciò che succede ai file e lo cambia o lo ferma). Entrambe sono arrivate con [D47](#d47-pipe-sugli-eventi-dati-delle-app-sui-file-e-filecrypt). Entrambe hanno bisogno di punti d'ingresso con nome e permessi tra app. La modalità non isolata c'è perché la sandbox ha un costo (ogni app è una pagina a parte, i dati passano per messaggi, il disegno non condivide gli stili) e perché alcune app, di cui l'amministratore si fida, hanno bisogno di fare più di quanto il ponte permetta. Che sia una scelta di un amministratore, con un avviso, e che il predefinito resti isolato mantiene l'idea di [D35](#d35-le-app-locali-girano-in-un-iframe-sandbox-senza-allow-same-origin).

**Un background isolato non è un Worker.** La prima idea era far girare il background isolato in un Web Worker creato dalla sandbox. Su Chrome non funziona: un Worker dentro una sandbox senza origine **non ha `crypto.subtle`** (non è un contesto sicuro), che serve proprio a un'app di cifratura, e i worker a modulo non partono. Così il background isolato è un **iframe `sandbox` nascosto**, senza interfaccia. Chrome esegue un iframe sandbox in un processo separato: non rallenta la pagina di lilOS anche se l'app lavora molto. Il Worker resta per la modalità non isolata, dove l'origine è quella di lilOS.

**Alternative scartate.** Isolare tutto in un Worker (vedi sopra). Far girare tutto non isolato (D35: codice di altri con la sessione dell'utente). Permessi che limitano anche le app non isolate: non si possono imporre a codice che gira nella pagina.

**Conseguenze.**

- **Un'app non isolata può fare tutto ciò che può fare l'utente.** I permessi del manifesto restano scritti e si vedono (Proprietà → Permessi), ma non la limitano. Chi sceglie la modalità deve fidarsi dell'editore: l'interfaccia lo dice nella scheda Sicurezza e nel Pannello di controllo.
- Il cambio di modalità non agisce su ciò che è già aperto. La scelta per una singola app ne ferma i background (l'app cambia nel registro); la regola generale no: i background già avviati restano come sono finché non si fermano.
- Un'app con `sdk` `"1"` non si può rendere non isolata, né dichiarare `entrypoints`; per cambiare serve aggiornare il manifesto a `sdk` `"2"` e il codice a esportare `main`.
- Un'app non isolata disegna in uno Shadow DOM: gli stili di lilOS non entrano (le variabili di tema sì), e gli stili dell'app non escono.
- `@lilos/system` ha export nuovi (`callEntrypoint`, `connectEntrypoint`, `entrypointsOf`, `executionMode`, `canChangeExecution`, `describePermission`, `showAppProperties`, `showAppSecurity`, `showProperties`): vanno rilasciati in lilOS prima delle app che li usano ([D38](#d38-le-app-di-sistema-vengono-dal-repository-ufficiale-e-girano-dentro-lilos)).
- Il kernel conserva la scelta nello stato dell'app (`isolated`) e la regola generale nella cartella `/system/app/.security`: un'app aggiornata mantiene la sua scelta, una rimossa la perde.
- Le finestre di un punto d'ingresso diverso da `main` sono una per app e per punto d'ingresso, e tornano dalle workarea con lo stesso punto d'ingresso.
- Non c'è ancora un modo di sapere chi chiama oltre a `from` (l'id dell'app, o `null` per il sistema), e `apps.call` non chiede conferma all'utente a ogni uso.
- Quando fu scritta questa decisione non c'erano le pipe, l'app di cifratura né i dati per app sui nodi del file system (una chiave per file che dica all'app che lo ha cifrato come leggerlo). Sono arrivati il 31 ottobre 2026: vedi [D47](#d47-pipe-sugli-eventi-dati-delle-app-sui-file-e-filecrypt).

**Quando ripensarla.** Se un'app non isolata dovrà essere limitata comunque (per esempio con una CSP). *(Il caso dei background a lilOS chiuso è superato in parte: i servizi nel kernel, [D44](#d44-avvio-automatico-due-eventi-app-solo-nella-prima-scheda-servizi-nel-kernel), vivono a lilOS chiuso con il permesso `background`; i background restano nel browser.)*

## D43. Gli elementi fissi della scrivania non sono file

**Decisione.** Su ogni scrivania (di ogni workspace) ci sono sempre Home, Documenti, Immagini, File Manager, Download e Cestino (`src/desktop/fixedItems.js`, elenco `FIXED_ITEMS`). Non sono nodi del file system: `Desktop` li monta a ogni caricamento accanto ai nodi della cartella Scrivania, con id `fixed:<chiave>`. Non si rinominano né si eliminano, si aprono e si spostano come gli altri, e la posizione si salva nello stesso elenco delle posizioni della scrivania. Il File Manager esce dal seed del primo avvio.

**Perché.** I luoghi che si usano di più (la casa, le cartelle condivise, il cestino) devono essere a un gesto di distanza e trascinabili, anche per mettere un file nel cestino con il mouse. Se fossero collegamenti o cartelle normali, l'utente potrebbe eliminarli o rinominarli, e ogni workspace avrebbe la sua copia da mantenere.

**Alternative scartate.** Creare nodi (collegamenti) nella Scrivania di ogni workspace: si possono eliminare, vanno ricreati per i workspace nuovi e per gli utenti già esistenti, e finiscono nel File Manager come elementi della cartella. Mostrarli in una barra separata dalla scrivania: non si trascinano sulla scrivania infinita come gli altri elementi.

**Conseguenze.**

- L'elenco è nel codice: il Pannello di controllo lo legge da `DESK_FIXED_ITEMS` di `@lilos/system`. Aggiungerne o toglierne uno richiede una modifica a `fixedItems.js` e il rilascio di lilOS prima dell'app Pannello di controllo che lo usa. Si può solo accendere o spegnere ogni elemento.
- Acceso o spento è **per workspace** (31 ottobre 2026): ogni scrivania ha usi diversi, e un workspace di lavoro può non volere Immagini o Download. Lo tiene il workspace (`hidden` in `lilos:workspaces`), non un'impostazione per workspace, perché è un dato del workspace come le app visibili, e se ne va con lui. L'impostazione `deskHidden` resta come scelta di «tutti»: la seguono i workspace che non hanno mai scelto (`hidden: null`, cioè i nuovi e quelli salvati prima), e Pannello di controllo → Workspace → Tutti la cambia insieme a tutti i workspace. Alternativa scartata: un valore a tre stati per workspace (eredita / acceso / spento), più flessibile ma difficile da capire in un elenco di interruttori.
- Chi aveva già il collegamento al File Manager sulla scrivania lo conserva: ora ci sono due icone e il vecchio collegamento si elimina a mano.
- Documenti, Immagini e Download si trovano per nome tra le cartelle di sistema nella radice (`fixedFolder`): se manca, l'elemento resta e un clic mostra un messaggio.
- Gli elementi fissi non hanno tag, collegamenti né Proprietà, e `arrange()` li mette per primi nell'ordine dell'elenco.

**Quando ripensarla.** Se si vorrà poter nascondere o aggiungere elementi fissi per utente, o se i widget della scrivania daranno un altro modo di avere luoghi sempre presenti.

## D44. Avvio automatico: due eventi, app solo nella prima scheda, servizi nel kernel

**Decisione.** lilOS emette due eventi sul bus, una volta per pagina, dopo che le finestre salvate sono tornate (`workspaces.ready` e `workareas.ready`): `system:ready` `{ at }` («Sistema pronto») e, subito dopo, `user:login` `{ user, workspace }` («Utente entrato»). Su `user:login` si aprono le **app dell'utente** scelte nel Pannello di controllo → Avvio (`src/apps/startup.js`); i **servizi** (fase 2, fatta) partono invece dal kernel, con i suoi momenti `system:ready` e `user:login`, che non dipendono da una pagina aperta.

- **App all'avvio.** Una lista per utente, chiave salvata `startup-apps`: `[{ app, entries: [{ entry, params }] }]`. Si aprono nell'ordine, nel workspace attuale, solo se l'impostazione `startupApps` è accesa. Un'app nascosta nel workspace o rimossa si salta (e se è rimossa esce dalla lista).
- **Solo la prima scheda.** L'apertura avviene solo nella prima scheda dell'utente in quel browser: Web Locks, lucchetto `lilos:avvio:<id utente>` tenuto finché la scheda è aperta. Le altre si aprono pulite.
- **`?avvio=no`** nell'indirizzo salta l'avvio per quel caricamento, con un avviso.
- **Parametri dichiarati nel manifesto.** Un punto d'ingresso di tipo finestra può dichiarare `params` (`text`, `number`, `boolean`, `choice`, `file`, `folder`; al massimo 10). Sono gli `args` della finestra, i mancanti prendono il predefinito. Un `file` si consegna all'app (può leggerlo e scriverlo, anche se isolata); una `folder` arriva come id alle app di sistema e come percorso `~/…` a quelle installate, perché il ponte lavora per percorsi. Senza `params` dichiarati, vale un oggetto JSON qualsiasi fino a 4 KB. Anche le app con `sdk` `"1"` possono dichiarare `entrypoints`, ma solo `main` (per i suoi `params`) e i `service` (fase 3: così le app di sistema, che sono `sdk` `"1"`, hanno servizi senza passare a `"2"`).
- **Due tipi di parti senza finestra** (deciso con l'utente il 31 ottobre 2026). `background` resta **nel browser**, a richiesta: serve alle parti che tengono segreti dell'utente (come le chiavi di FileCrypt, [D47](#d47-pipe-sugli-eventi-dati-delle-app-sui-file-e-filecrypt)), che il kernel non deve vedere. Il nuovo `kind: 'service'` gira **nel kernel** e parte con il sistema o con l'utente, anche a lilOS chiuso.

**Piano in tre fasi.**

1. **App all'avvio e i due eventi**: fatta.
2. **Servizi nel kernel**: fatta (31 ottobre 2026, d262f7b). Un modulo del kernel (`services-isolate`) li esegue con `isolated-vm`, un processo per servizio; il permesso `background` serve a dichiararli; i servizi di tutti li sceglie l'amministratore. Dettagli sotto.
3. **Scheda Servizi** nel Pannello di controllo → Avvio e il servizio `updates` dell'AppStore (controllo degli aggiornamenti anche a lilOS chiuso): fatta (31 ottobre 2026, non ancora in un commit; Pannello di controllo 1.3.0, AppStore 1.2.0). **Con la fase 3 l'avvio automatico è completo.** Dettagli sotto.

**Fase 3: scelte di dettaglio** (31 ottobre 2026).

- **Interfaccia nel Pannello di controllo** (1.3.0). Sottoscheda **Servizi** in Avvio, tra Opzioni e App: stato, quando parte (Non si avvia, All'accesso, All'avvio del sistema solo per gli amministratori), parametri se parte da solo, Riavvia, Accendi/Spegni e Registro in una finestra. Si aggiorna con gli eventi del kernel. Chi non è amministratore vede bloccati i servizi scelti per tutti. In Opzioni, la riga «Avvia i servizi automaticamente».
- **Passare da utente a sistema riavvia.** `setStartup` ferma l'istanza che non vale più e, se era accesa, la riaccende subito nell'altra forma: altrimenti chi sposta un servizio lo troverebbe spento senza averlo chiesto.
- **`lilos.apps.updates()`.** Un servizio non può chiamare `apps.*` del browser, quindi il kernel offre una sola chiamata di sola lettura (permesso `apps.manage`): le app installate con una versione più nuova nel repository da cui vengono. Un catalogo che non si legge si riprova una volta (un altro lo può leggere nello stesso momento), poi si salta.
- **Servizio `updates` dell'AppStore** (1.2.0). All'avvio e ogni `ore` ore (predefinito 24, da 1 a 168) controlla e avvisa **una volta per versione** (ricorda in `updates.told`). Non parte da solo: l'utente lo accende in AppStore → Opzioni («Controlla gli aggiornamenti all'avvio», che lo mette All'accesso e lo accende) o nel Pannello di controllo.
- **Servizi di app di sistema.** Il codice di un servizio non passa da Vite: `build.mjs` copia `src/<app>/services/*.js` in `dist/` così com'è, perché dentro l'isolato non esistono `import`.
- **Avvisi con il nome dell'app**: `src/apps/services.js` mostra `<nome dell'app>: <testo>`, non l'id.

**Fase 2: scelte di dettaglio** (31 ottobre 2026).

- **Un modulo, non il kernel.** I servizi li esegue un servizio opzionale del kernel, `runtime` (modulo `services-isolate`, attivo in `config.json`; dalla 1.1.0 ha anche `lilos.home`, [D68](#d68-la-pianificazione-un-modulo-obbligatorio-del-kernel-con-le-azioni-nel-kernel)). Senza il modulo lilOS funziona, senza servizi. Isolamento: un processo Node per servizio, con il modello di permessi di Node (`--permission`: legge solo la cartella del modulo, niente programmi né worker, `--allow-addons` per `isolated-vm`) e il codice dell'app in un isolato V8 con 128 MB e 10 s per ogni esecuzione. Niente `import`, `require`, `process`, rete né file: solo `lilos`, le cui richieste tornano al kernel, che le controlla con i permessi dell'app. Un crash o un ciclo infinito fermano solo quel servizio.
- **Proprietario: utente o sistema (`*`).** Un servizio gira per un utente (con la sua home) o come sistema (nessun utente: una sola istanza per tutti, senza file, solo dati propri e rete). Un servizio **scelto per tutti** gira **solo come sistema**: chiamate e comandi di chiunque vanno a quell'istanza, e solo gli amministratori lo scelgono, avviano, fermano o ne leggono il registro. Le scelte per tutti stanno nel nodo `/system/app/.startup`, quelle per un utente nella chiave `startup-services` della sua `.config`.
- **Quando partono.** `system:ready`: il kernel avvia i servizi di tutti dopo aver iniziato ad ascoltare. `user:login`: la **prima richiesta di quell'utente in questa esecuzione del kernel** (anche con una sessione ancora valida) o il suo accesso; un interruttore per utente (`enabled`) li spegne. Il logout li ferma; i servizi partiti a mano o a chiamata restano accesi fino all'arresto o all'uscita del proprietario.
- **Ripartenze.** Se un servizio si ferma da solo riparte dopo 1, 5 e 30 s; dopo tre volte entro 5 minuti resta spento, con l'errore. Ogni istanza tiene 200 righe di registro. Un'app aggiornata riavvia i suoi servizi con il codice nuovo; un'app rimossa li ferma e esce dall'elenco dei servizi di tutti.
- **Dati.** Per un utente lo storage è lo stesso delle finestre (`app:<id>:<chiave>` nella `.config`): lilOS lo rilegge solo quando si ricarica la pagina, quindi un valore scritto da un servizio mentre lilOS è aperto si vede dopo un ricaricamento. Lo stesso per i file che un servizio crea nella home. Per il sistema, un file `.data` nella cartella dell'app.
- **Avvisi.** `lilos.ui.notify` manda un evento al flusso `/api/services-events` (SSE) del proprietario, che lilOS mostra come avviso; se lilOS è chiuso l'avviso si perde.
- **Librerie del manifesto.** Per ora non si caricano nei servizi: il codice deve avere tutto dentro.
- **Node 22-25.** `isolated-vm` 6.2 ha binari già compilati solo per queste versioni: il modulo dichiara `engines` `>=22 <26`. `npm run kernel:setup` lo installa.

**Perché.** Chi apre lilOS ogni giorno con gli stessi strumenti deve ritrovarli. E alcune cose (aggiornamenti, sincronizzazioni, pipe) devono funzionare anche quando nessuna scheda è aperta, cosa che un `background` nel browser non può fare. Due eventi, e non uno, perché i servizi dipendono dal sistema e le app dall'utente.

**Alternative scartate.** Aprire le app in ogni scheda: con due schede ogni app comparirebbe due volte. Un campo `args` libero nel manifesto o nell'elenco: l'interfaccia non potrebbe chiederlo né controllarlo, e il manifesto non dice cosa un'app accetta. Far girare tutti i servizi nel kernel, comprese le parti con i segreti: il kernel vedrebbe le chiavi dell'utente.

**Conseguenze.**

- `@lilos/system` esporta `startup`; il manifesto, `params`; il bus, due eventi; `launch()` e `app:launch`, `files`.
- Se un'app all'avvio si blocca, si esce con `?avvio=no`, o spegnendo «Apri le app quando entri».
- Se un file o una cartella dei parametri è stato eliminato, l'app non si apre e un messaggio lo dice.
- `@lilos/system` esporta anche `services`; il kernel ha le rotte `/api/services*`, l'interfaccia `runtime` e il nodo `/system/app/.startup`; il manifesto ha `kind: 'service'` e il permesso `background` ora ha un effetto (serve per i servizi).
- Le sessioni non sono cambiate: per ora un utente "è entrato" alla sua prima richiesta, e ogni uscita (`DELETE /api/session`) ferma i suoi servizi anche se ha altre sessioni aperte. Con sessioni che durano a lilOS chiuso il significato di "entrare" e "uscire" va rivisto.
- Un servizio di un utente parte solo se l'utente fa una richiesta dopo l'avvio del kernel: a lilOS chiuso, dopo un riavvio del kernel, non parte finché non si riapre.
- Un'app che cambia i dati di un utente da un servizio non avvisa le finestre aperte (lo storage non si aggiorna in diretta).

**Quando ripensarla.** Se le sessioni cambieranno (e con loro "entrare"), se i servizi dovranno usare librerie o parlarsi tra loro, se la versione di Node supportata da `isolated-vm` cambierà, o se un'app dovrà aprirsi in ogni scheda.

## D45. Un file di traduzioni per app, inglese predefinito, un solo motore

**Decisione.** Le app si traducono con **un solo file** (`locales.json`, indicato da `locales` nel manifesto): `{ lingua: { extends?, strings } }`, con l'inglese (`en`) obbligatorio. La lingua è una per tutto il sistema (impostazione `language`, `'auto'` = lingua del browser; Pannello di controllo → Lingua). Una stringa si cerca nella lingua esatta (`it-CH`), in quelle che estende, nella lingua senza regione (`it`), in `en`, e infine è la chiave stessa. Le stringhe sono testi con `{segnaposto}` o forme plurali (`Intl.PluralRules` su `params.n`, con `zero` facoltativo). I testi del manifesto (nome, comandi, etichette) sono **in inglese** nel manifesto e si traducono con chiavi che cominciano per `@` nello stesso file.

lilOS legge il file **prima** di avviare l'app e le dà le stringhe già risolte: `lilos.locale` (`code`, `i18n.t`, `i18n.lang`, `i18n.date`, `i18n.number`) è **sincrono**, e al cambio di lingua arriva l'evento `locale`. Il nome `lilos.locale.i18n` è stato scelto dall'utente.

**Il motore è uno solo**: `sdk/core/i18n.js`, **senza import**. Gira nella pagina di lilOS, nelle sandbox e nei worker (`bridge.js` lo inserisce come testo, con `toString()`, come già fa con `lilosApi`) e nel **kernel**, che lo importa dall'SDK (`manifest.js` per controllare il file, `appServices.js` per i servizi, `repos.js` per il catalogo). Il controllo del file è quindi lo stesso in installazione e in esecuzione.

**Perché.**

- **Un file per app, non uno per lingua**: l'autore vede insieme le stringhe e scopre subito quelle che mancano; il pacchetto resta di un file in più; il manifesto, con un solo hash per file, non deve elencare le lingue.
- **Inglese predefinito e obbligatorio**: dà sempre un ripiego e un testo a cui tornare. Per questo i testi del manifesto sono in inglese: lilOS li mostra (menu, proprietà, AppStore) senza eseguire l'app né leggere altro.
- **Stringhe già risolte prima dell'avvio**: `t()` può essere sincrono. Con un caricamento asincrono ogni app dovrebbe aspettare prima di disegnare, e ogni finestra avrebbe un istante senza testo.
- **Il file è un dato di chi scrive l'app, non codice**: `parseLocales` tiene solo ciò che si aspetta, con limiti (1 MiB, 50 lingue, 5000 stringhe, 4000 caratteri per testo, chiavi `[\w.:-]`), e il kernel lo rifiuta all'installazione.
- **Il kernel importa dall'SDK**: due copie delle regole si sarebbero allontanate. Il motore non ha import proprio per questo e per poterlo mandare nelle sandbox come testo.

**Alternative scartate.** Un file per lingua (`it.json`, `en.json`): più file da firmare con hash e da tenere allineati. Chiavi nel manifesto stesso (`name: { en, it }`): manifesti grossi e un formato che il kernel deve conoscere campo per campo. Un servizio di traduzione che le app chiamano (`await t()`): app che aspettano prima di disegnare. Pacchetti di lingua installabili: per ora rinviati (sotto).

**Conseguenze.**

- `session.locale` non è più `'it-IT'` fisso: segue la lingua del sistema, quindi orologio e date delle proprietà seguono la scelta.
- Il sistema scrive la lingua risolta nella chiave `locale` dell'utente: è l'unico modo che il kernel ha di conoscerla (le impostazioni vivono nel browser). Un utente che non ha mai aperto lilOS con questa versione ha i servizi in inglese.
- Le stringhe di un **servizio** sono fissate all'avvio: per cambiarle serve riavviarlo. I servizi di sistema sono sempre in inglese.
- Il catalogo di un repository porta per ogni app la tabella con le sole chiavi `@`, perché l'AppStore mostri nome e descrizione nella lingua dell'utente senza scaricare il pacchetto.
- Le app di sistema usano `locale.forApp(id)` dell'SDK. Un lilOS più vecchio non ha `locale`: le app ufficiali tengono un ripiego in italiano (`src/shared/i18n.js` del repository ufficiale). `@lilos/sdk` ha export nuovi e va rilasciato prima delle app che li usano ([D38](#d38-le-app-di-sistema-vengono-dal-repository-ufficiale-e-girano-dentro-lilos)).
- I nomi già creati (cartelle, file, collegamento sulla scrivania) non si ritraducono.
- La traduzione di un nome non ha il limite di 40 caratteri del manifesto (vale quello di 4000 per tutti i testi).

**Quando ripensarla.** Quando si tradurrà l'interfaccia di lilOS (oggi in italiano: potrebbe usare lo stesso motore, con il proprio file), quando si vorranno **pacchetti di lingua installabili** da altri (un file `.lang.json` per aggiungere una lingua a tutte le app, già abbozzato con il suo schema) o lingue da destra a sinistra, e se un'app avrà bisogno di cambiare lingua a un servizio già avviato.

## D46. Aggiornare le app: ricaricamento a caldo, riavvio solo quando serve

**Decisione.** Aggiornando (o reinstallando) un'app mentre lilOS gira, lilOS la sostituisce **a caldo**: chiude tutto ciò che l'app aveva aperto, aggiorna, e la volta dopo parte il codice nuovo. Il **riavvio di lilOS** (ricarica della pagina) si propone solo in tre casi: l'app lo chiede con `restartOnUpdate` nel manifesto (`true`, o un intervallo come `"<2.0.0"`, valutato sulla versione di partenza e solo se la pagina aveva eseguito il codice vecchio), la versione nuova non si carica, o il sistema lo chiede con `requestRestart(reason, key)` (l'AppStore lo usa dopo il riavvio del kernel per i moduli). Finché non si riavvia, quell'app non si apre. Il codice è in `src/apps/updates.js`.

**Come.**

- `updateApps()` mostra prima cosa si chiude: le finestre dell'app in ogni workspace (comprese le secondarie aperte con `wm.open(..., { owner })`) e i suoi background e servizi. Le finestre con `canClose` possono chiedere di salvare, ciascuna mostrata nel proprio workspace; se una rifiuta, non parte nulla.
- Le app di sistema si importano da `/api/apps/<id>/v/<versione>+<build>/…`, con `build` = impronta FNV-1a degli hash dei file del manifesto. Il kernel accetta `+<build>` e lo ignora.
- Il kernel offre un flusso `GET /api/apps-events` (`change` `{ id }`): ogni sessione, scheda o utente rilegge l'elenco delle app. Se l'app cambiata ha finestre aperte, un pulsante nella barra offre di riavviarla (chiude e riapre le finestre con il codice nuovo); se chiede il riavvio, il pulsante è rosso e propone di riavviare lilOS.

**Perché.**

- Il browser tiene per sempre ogni modulo importato da un indirizzo. Con solo `v/<versione>/`, reinstallare la stessa versione con file diversi (o un pacchetto di sviluppo) lasciava in pagina il codice vecchio. Il build nell'indirizzo rende nuovo l'indirizzo senza chiedere al kernel di capire nulla.
- Riavviare sempre sarebbe sicuro ma pesante: chiude tutto per aggiornare un'app. Quasi tutte le app non lasciano nulla in pagina che il ricaricamento a caldo non sostituisca, quindi il riavvio è l'eccezione che l'autore dichiara.
- Chiudere tutto ciò che l'app ha aperto (anche i servizi e le finestre secondarie) evita che il codice vecchio e quello nuovo convivano e che un servizio vecchio chiami finestre nuove.
- Chiedere di salvare prima rende l'aggiornamento sicuro per il lavoro dell'utente; un rifiuto lo annulla del tutto, per non lasciare le app a metà.

**Alternative scartate.** Riavviare lilOS a ogni aggiornamento (vedi sopra). Lasciare aperte le finestre vecchie accanto al codice nuovo (due versioni insieme).

**Conseguenze.**

- Un'app che tiene stato in modo condiviso nella pagina (moduli, `window`, listener globali) deve dichiarare `restartOnUpdate`: il ricaricamento a caldo non scarica i moduli già importati. Le finestre già aperte restano con il codice vecchio finché l'app non si riavvia (anche in un'altra scheda).
- Solo chi chiama `updateApps` (l'AppStore) ottiene l'avviso, la chiusura e la riapertura: chi chiama `apps.update` direttamente aggiorna il pacchetto, e le altre schede lo vedono solo come aggiornamento fatto altrove.
- I testi di `updates.js` sono in italiano, come il resto dell'interfaccia di lilOS.

**Quando ripensarla.** Quando le app potranno salvare e ripristinare il proprio stato da sole (si potrebbe riaprirle senza avvisi), quando lilOS tradurrà la sua interfaccia, o se l'avviso per ogni aggiornamento si rivelasse troppo invadente (per esempio con aggiornamenti automatici).

## D47. Pipe sugli eventi, dati delle app sui file e FileCrypt

**Decisione.** Tre pezzi nati insieme (31 ottobre 2026, ramo `filecrypt`, non ancora in un commit), perché il terzo ha bisogno degli altri due.

1. **Pipe sugli eventi** (`sdk/core/pipes.js`, eventi in `sdk/core/pipeCatalog.js`). Ogni operazione del sistema che altri possono guardare o cambiare è un *evento* dichiarato in un catalogo, con due fasi: `before` (prima dell'operazione: si può cambiare la richiesta o fermarla) e `after` (sul risultato, in ordine inverso, così due app che si sovrappongono, una che comprime e una che cifra, si annidano). Un'app si iscrive dal manifesto (`contributes.pipes`: lilOS avvia il suo punto d'ingresso in background quando l'evento arriva) o dal codice (`lilos.pipes.subscribe`), con i permessi `pipe:<evento>` o `pipe.own:<evento>` (solo i file che l'app ha segnato). Ogni iscrizione chiede una fascia (prima, in mezzo, ultima); dentro la fascia conta l'ordine scelto dall'utente (Pannello di controllo → App → Pipe, chiave `pipes-order`). Gli eventi aperti alle app in modifica sono `file.open`, `file.read`, `file.write` e `app.launch`; gli altri (creare, rinominare, spostare, copiare, eliminare, cestino, tag, finestre, workspace, impostazioni) le app li guardano soltanto, dopo che sono avvenuti. Gli eventi protetti (`system.ready`, `session.*`, `apps.*`, `permissions.change`, `settings.system`, `pipes.change`) sono solo di lilOS e delle app di sistema. Un'app può anche dichiarare eventi propri (`<id app>.<una parola>`, al massimo 20) e farli passare dalle pipe (`lilos.pipes.define` e `run`).
2. **Dati delle app sui file.** Ogni nodo può avere `apps`: per ogni app un piccolo oggetto che solo lei scrive (al massimo 1 KB di JSON per app, 8 app per nodo e 2 KB in tutto per nodo). Con `content: true` l'app dichiara che il contenuto è suo (per esempio cifrato): senza l'app, lilOS non lo apre, non lo legge e non lo scrive così com'è (la guardia è in `src/apps/pipes.js`; vale anche se l'app c'è ma le sue pipe `file.read` (dopo) e `file.write` (prima) non sono attive: nel dubbio non si apre). Solo un'app con i permessi `pipe` o `pipe.own` sia su `file.read` sia su `file.write` può segnare un contenuto come suo, altrimenti potrebbe chiudere l'utente fuori dai suoi file. `fs.write(id, dati, { mark })` salva contenuto e segno nello stesso cambiamento, e `fs.copy` / `fs.copyContent` copiano il contenuto così com'è con i dati dell'app: una copia cifrata resta cifrata.
3. **Voci di menu e segni sulle icone** (`contributes.actions` e `contributes.badge`, permesso `ui.menus`). Un'app aggiunge voci al menu di file e cartelle (che avviano un suo punto d'ingresso con i file scelti) e un segno sull'icona di ciò su cui ha dati. Ora `ui.menus` ha un effetto.

**FileCrypt** è la prima app che usa tutto questo: cifra un file al suo posto con una password, ne tiene le chiavi in un background e lo decifra e cifra da sola quando lilOS lo legge o lo salva. Dopo una revisione di sicurezza (31 ottobre 2026): al massimo 4 destinatari nell'intestazione e un limite di lavoro per lo sblocco (un file ostile non blocca il vault), password normalizzate NFC con minimo 8 caratteri controllato anche nel vault, impostazioni validate, chiavi azzerate al blocco, blocco per inattività che salta i file mostrati in una finestra (`lilos.files.shown`), un errore distinto «La password è giusta, ma il file è stato cambiato o è rovinato» da «Password sbagliata». Non è di sistema: è un'app installata, isolata di default, nel repository ufficiale (`apps/filecrypt/`, 1.0.0; con File Manager 1.2.1, Pannello di controllo 1.6.0 e Terminale 1.1.1).

**Perché.**

- Cifrare i file non si può fare con un'app che sta a lato: deve esserci quando un file si apre, si legge e si salva, anche se a farlo è un'altra app (l'Editor, Photo). Perciò non bastavano i punti d'ingresso di [D42](#d42-punti-dingresso-e-due-modalità-di-esecuzione-per-le-app): serviva poter stare in mezzo a quelle operazioni.
- Un errore o un tempo scaduto (15 secondi) di un gestore **fa fallire l'operazione**: non si salta mai. Altrimenti un file verrebbe salvato in chiaro perché la sua cifratura non ha risposto.
- Le operazioni che un'app chiede **saltano i suoi stessi gestori** (altrimenti la cifratura cifrerebbe ciò che sta cifrando), e il numero di operazioni che passano dalle pipe è limitato (256 insieme, 32 chieste da una stessa app; al posto del vecchio limite di profondità 16), così come le iscrizioni (50 per app).
- **Un contenuto di un'app non lo vedono le altre.** Per `file.open`, `file.read` e `file.write` di un file con `node.apps[x].content`, girano solo i gestori di lilOS e quelli dell'app `x`; e ogni gestore vede sul nodo (e in `source`) solo i dati della propria app, non quelli delle altre. Una app che si iscrive a tutti i file non può quindi leggere un file cifrato da un'altra né sapere cosa le altre vi hanno segnato.
- **Chi può passare un file e a chi.** Un'app passa a un'altra (`app.call`, `apps.call`) solo file che ha già (`file` e `files`). lilOS dà a un'app l'accesso a un file che arriva in una pipe solo se il suo albero (`fs.appMeta`) conferma che l'ha segnato lei, non perché lo dicano i dati. Un gestore di `file.open` può dare il file solo a un'app che apre file; un gestore di `app.launch` cambia gli `args` ma non `file` e `files`. Nei nomi degli `edit` non sono ammessi `__proto__`, `constructor` e `prototype`.
- Il segno dell'app e il contenuto vanno salvati insieme (`mark`): se si separassero, resterebbe un file cifrato che nessuno sa leggere o un segno su un file in chiaro.
- Quando il segno ha `content: true` la cronologia di annulla viene ripulita di quel contenuto (`fs.scrub`): Ctrl Z non deve rimettere in chiaro un file appena cifrato.
- Le fasce e l'ordine dell'utente servono a rendere prevedibile cosa succede quando due app si iscrivono allo stesso evento.

**Scelte fatte lungo la strada.**

- **Il nome.** L'app doveva chiamarsi «Cassaforte» (così in D42); su richiesta dell'utente si chiama **FileCrypt**.
- **Formato binario, non base64.** Il file cifrato è `LILOS-ENC/1`: un'intestazione, poi il contenuto cifrato, in byte. Con il testo in base64 un file occuperebbe un terzo in più; si può fare così perché ora lilOS salva byte (`fs.write` con `Blob`, `PUT /api/fs/content/:id`).
- **ChaCha20-Poly1305 dentro il codice dell'app.** La libreria (`@noble/ciphers`) non ha una versione che si carichi come script classico, quindi non può stare in `libraries` del manifesto: il codice sta nel pacchetto. Argon2id viene invece da `hash-wasm`, tramite `libraries` con `cache: true`.
- **Niente `<form>` nelle finestre delle app isolate.** La sandbox non ha `allow-forms`: il submit di un modulo non parte. Le finestre di FileCrypt usano un pulsante e il tasto Invio.
- **`users.*` non c'è nel catalogo.** Il progetto originale prevedeva eventi sugli utenti, ma nel frontend non esiste nessuna operazione sugli utenti: si gestiscono dalla riga di comando del kernel.
- **I servizi del kernel non si iscrivono alle pipe.** I punti d'ingresso `kind: 'service'` ([D44](#d44-avvio-automatico-due-eventi-app-solo-nella-prima-scheda-servizi-nel-kernel)) girano nel kernel e le pipe nel browser: non è mai stato progettato come unirli. **È una domanda aperta**: un servizio che reagisse a un file salvato dovrebbe passare per il browser, o il kernel dovrebbe avere le sue pipe.

**Alternative scartate.**

- Un semplice bus di eventi a cui ci si iscrive per guardare (come `bus`): non permette di cambiare né fermare l'operazione, che è ciò che serve a una cifratura.
- Saltare il gestore che sbaglia e proseguire: vedi sopra, scriverebbe in chiaro.
- Fare la cifratura nel kernel: il kernel vedrebbe la password e le chiavi (lo stesso motivo per cui un `background` resta nel browser, D44).

**Conseguenze.**

- **L'SDK e `@lilos/system` crescono.** `pipes` e `PipeStopped` (SDK); `itemBadges`, `appActionEntries`, `appPipes` (`@lilos/system`): vanno rilasciati in lilOS prima delle app che li usano ([D38](#d38-le-app-di-sistema-vengono-dal-repository-ufficiale-e-girano-dentro-lilos)). Pannello di controllo 1.6.0 si avvia anche senza pipe (la scheda dice «Questa versione di lilOS non ha le pipe»).
- **`openFile` è asincrono**, perché passa da `file.open`; `fs.read`, `readBlob` e `write` accettano `caller` (chi chiede) e passano dalle pipe solo se qualcuno le vuole.
- **Fermare il vault dalla barra cancella le chiavi e chiude le finestre dei file cifrati**, come un blocco (chi ha modifiche non salvate è prima avvisato): niente resta in chiaro su schermo né, al salvataggio, su disco.
- **Le versioni in chiaro possono restare nei backup di PostgreSQL**; la cronologia di annulla viene ripulita.
- **Mentre un file è sbloccato, un'app non isolata o uno script nella pagina lo può leggere** (le app non isolate possono tutto, D42).
- Il kernel conserva `apps` nei metadati dei nodi, che sono limitati a 4 KB per nodo in tutto (`MAX_META` in `home.js`): per questo i dati di tutte le app su un nodo stanno insieme in al massimo 2 KB (`setAppMeta` lancia «Troppi dati delle app su questo elemento»).
- **Dati di un'app che non c'è più.** Nelle Proprietà di un elemento, per i dati di un'app non installata c'è una riga «Dati di `<id>`» con il pulsante **Rimuovi**. Il contenuto resta com'è (un file cifrato resta illeggibile), ma lilOS smette di rifiutarsi di aprirlo.
- **Limiti che restano** (decisi di accettarli per ora):
  - il rollback non è rilevato: chi può scrivere il file può rimetterci una versione cifrata precedente valida;
  - contenuto e segno non arrivano al kernel in modo atomico: se il browser si chiude nel mezzo può restare un file cifrato senza segno, o un segno su un file in chiaro;
  - l'anteprima del File Manager tiene in memoria il chiaro che ha letto finché non cambia la selezione;
  - un modello di file cifrato copiato con «Nuovo da modello» esce in chiaro;
  - `cp` del Terminale su un file cifrato bloccato lo sovrascrive (il Terminale è un'app di sistema);
  - i servizi del kernel leggono e scrivono il contenuto grezzo (non passano dalle pipe).
- Un'app di cifratura non installata lascia i file illeggibili: lilOS li tratta come «di un'app che manca», non li apre e sull'icona mostra un lucchetto grigio con «Serve l'app …».

**Quando ripensarla.** Quando un servizio nel kernel dovrà reagire agli eventi (vedi sopra); se serviranno eventi sugli utenti (quando il frontend avrà operazioni sugli utenti); se due gestori sullo stesso contenuto (per esempio compressione e cifratura) mostreranno che le fasce non bastano; se il limite di 1 KB per app, di 8 app e di 2 KB in tutto per nodo si rivelerà stretto; se serviranno protezioni contro il rollback e la scrittura non atomica; e se un'app non isolata dovrà essere esclusa dai file sbloccati.

---

## D48. La pagina utente e il blocco come fine della sessione

**Decisione.** Il nome dell'utente nella barra (e in fondo al menu di avvio) apre una **pagina a tutto schermo** (`src/user/`, 31 ottobre 2026) con le cose personali: nome e foto, **Blocca**, **Chiudi sessione**, **Riavvia il sistema** (solo amministratori), tema, lingua, foto profilo e qualche dato della sessione (workspace, finestre, app all'avvio, spazio usato, versione). Cosa mostra lo sceglie l'utente nel Pannello di controllo → Pagina utente: l'elenco delle voci sta nel sistema (`USER_PAGE_ITEMS`), le scelte nell'impostazione `userPageHidden` (le chiavi spente).

**Blocca = fine della sessione sul kernel.** `lockSession()` salva, chiama `DELETE /api/session` e copre lilOS con una schermata opaca che chiede la password dello **stesso** utente. Le finestre restano aperte sotto (con `inert`, fuori dalla portata anche della tastiera) e tornano com'erano. Un altro utente non è accettato: c'è «Accedi con un altro utente», che ricarica la pagina.

**Perché.**

- Un blocco solo grafico si aggira: basta ricaricare la pagina, o aprire lilOS da un'altra scheda, perché il cookie di sessione è ancora valido. Terminare la sessione sul kernel rende il blocco vero: senza password non si ottiene più nulla, né da questa scheda né da altre.
- Il kernel offre già tutto: la fine della sessione e il nuovo accesso (lo stesso meccanismo di «Sessione scaduta», `signInAgain`) funzionano già con le finestre aperte. Il blocco ne è un caso d'uso, senza API nuove.
- I servizi dell'utente si fermano a ogni uscita ([D44](#d44-avvio-automatico-due-eventi-app-solo-nella-prima-scheda-servizi-nel-kernel)) e ripartono all'accesso: con il blocco succede lo stesso, ed è coerente con l'idea di non lasciare lavorare a nome di chi non è davanti allo schermo.
- La pagina è un'unica vista per tutto ciò che riguarda l'utente, invece di sparpagliarlo tra barra, menu e Pannello di controllo. Le voci si accendono e si spengono perché non tutti vogliono Blocca o Riavvia il sistema a un clic di distanza.

**Alternative scartate.**

- Un blocco solo nel browser (uno strato sopra la pagina): si toglie ricaricando.
- Fermare la sessione e ricaricare la pagina: si perderebbe il testo non salvato nelle finestre.

**Conseguenze.**

- **Il blocco chiude la sessione, ma non svuota le copie locali.** A differenza di `kernel.logout()`, `lockSession` non chiama `onLogout`: le copie dei contenuti in IndexedDB restano nel browser, perché al ritorno serve ritrovare tutto com'era. Chi vuole che nulla resti nel browser deve **Chiudere la sessione**.
- **Blocca esiste solo con più utenti** (`kernel.mode === 'multi'`). Con un utente solo non c'è una password da chiedere; «Chiudi sessione» diventa «Riavvia sessione».
- **Se chiudere la sessione sul kernel fallisce, il blocco non parte** (un avviso lo dice): meglio non bloccare che fingere.
- **Il riavvio del sistema funziona solo se il kernel è stato avviato con `npm run kernel`** (il kernel si rilancia da solo). Altrimenti risponde con un errore e la pagina mostra un avviso. Passa da `restartKernel()` (`apps/updates.js`), che prima chiede alle finestre di salvare; chi è collegato perde il kernel per qualche secondo.
- **`signOut()` chiede alle finestre prima di uscire** (anche dal pulsante del menu di avvio): una finestra con lavoro non salvato può fermare l'uscita.
- **La foto sta nelle impostazioni** (`userPhoto`, JPEG 192 px come `data:` URL, validato alla lettura), non tra i file: segue l'utente in ogni browser e non occupa il file system. Il tetto (200 000 caratteri) tiene piccolo il file delle impostazioni.
- **Nome visualizzato e password non si cambiano da qui**: il kernel non ha un'API per farlo; né per elencare gli utenti collegati. Sono voci possibili quando l'avrà.
- **`@lilos/system` cresce** (`USER_PAGE_GROUPS`, `USER_PAGE_ITEMS`, `isUserPageShown`, `setUserPageShown`): Pannello di controllo 1.7.0 li usa, quindi va rilasciato dopo lilOS ([D38](#d38-le-app-di-sistema-vengono-dal-repository-ufficiale-e-girano-dentro-lilos)).

**Quando ripensarla.** Quando il kernel potrà cambiare nome e password e dire chi è collegato (la pagina potrà offrirli); se serviranno blocchi che non perdano la sessione su altre schede; se il riavvio dovrà funzionare anche senza `npm run kernel`.

---

## D49. Le notifiche: un modulo opzionale, con il mittente messo da lilOS

> In parte superata da [D52](#d52-niente-più-toast-ogni-messaggio-è-una-notifica): non esiste più il `toast`, nemmeno per le risposte a un gesto, e le notifiche di lilOS che il kernel non accetta restano nella pagina. Il resto vale ancora.

**Decisione.** lilOS ha le **notifiche** (1° novembre 2026; Pannello di controllo 1.9.0 e il modulo nel tag v1.13.0 del repository ufficiale): messaggi che restano, a differenza dei `toast`.

- **Un modulo del kernel separato e facoltativo**, `notifications-basic`, fornisce il servizio `notifications` (`send`, `list`, `read`, `remove`, `setOptions`; interfaccia controllata dal kernel come per `auth`, `users`, `fs` e `runtime`). Tiene tutto in `notifications.json` nella sua cartella, per utente. Di serie è acceso in `system/kernel/config.json`. Senza di lui lilOS mostra le notifiche lo stesso, ma solo nella pagina.
- **Il kernel sa dire qualcosa alle pagine di un utente**: i moduli hanno `ctx.emit(userId, evento, dati)`, `kernel.events` lo porta, e il flusso `GET /api/services-events` (già usato per i servizi) manda anche questi eventi a chi è collegato. Il modulo manda `notification.new` `{ id }` e `notification.change`.
- **`lilos.ui.notify(testo | { text, level, action })`** per finestre, background e servizi nel kernel (permesso `ui.notify`, che tutte le app hanno già). `level` è `info`, `success`, `warning` o `error`; `action` `{ entry, args }` dice cosa apre il clic.
- **Il mittente lo mette lilOS, non l'app.** Il ponte aggiunge l'id dell'app che chiama; l'API HTTP accetta solo l'id di un'app installata e legge il nome dal suo `lilos.json`.
- **Un'azione non consegna file.** Il clic apre l'app al punto d'ingresso indicato con i suoi `args`, ma `file` e `files` vengono tolti.
- **Un limite al minuto**: 10 notifiche per coppia utente-mittente (`perMinute`, in memoria). Testo fino a 300 caratteri, `args` fino a 4 KB.
- **Cosa resta `toast` e cosa diventa notifica.** Il `toast` risponde a un gesto che l'utente sta guardando («Spostato in Documenti», «Annullato», «si sta aggiornando: un momento»). Diventa notifica ciò che arriva senza un gesto o può passare inosservato: un'app che non parte (`launcher.js`, `background.js`, `app.failed`), le app aggiornate da riavviare (`updates.js`), un'app dell'avvio che non si apre da sola (`startup.js`), ciò che dicono i servizi. Se una notifica di lilOS non si riesce a mandare (`notifications/notify.js`), esce come `toast`.
- **L'interfaccia**: la barra in basso si chiama **barra delle applicazioni**; a destra ha l'**area di notifica** (aggiornamenti da riavviare, app in background, campanella con il numero da leggere). Le notifiche nuove compaiono in una **barra delle notifiche** sopra l'area (la più nuova in cima, fino a `notifyShown`, per `notifySeconds`); la campanella apre la finestra **Notifiche**. Pannello di controllo 1.9.0 ha la scheda Notifiche.

**Perché.**

- Un `toast` dura pochi secondi ed è uno alla volta: chi guardava altrove lo perde. Ciò che non nasce da un gesto (un servizio in sottofondo, un errore in un background) ha bisogno di un posto dove restare.
- Le notifiche devono arrivare **anche con lilOS chiuso** (un servizio nel kernel che ha finito un lavoro) e a tutte le schede: perciò stanno nel kernel e non nel browser.
- Un modulo, come `users` e `fs` ([D31](#d31-un-kernel-modulare-con-il-controllo-degli-accessi-dentro-il-modulo-del-file-system)): chi le vuole in un database, o non le vuole, lo sostituisce o lo toglie senza toccare il kernel. È facoltativo come `runtime` ([D44](#d44-avvio-automatico-due-eventi-app-solo-nella-prima-scheda-servizi-nel-kernel)): lilOS deve funzionare senza.
- Se l'app dichiarasse il proprio nome, potrebbe farsi passare per un'altra app o per lilOS («lilOS: inserisci la password»). Il mittente messo da chi controlla il ponte non si falsifica dall'app.
- Un'azione che consegna file significherebbe che l'app decide, al momento in cui scrive la notifica, quale file dare a se stessa, o a un'altra app, con un clic che l'utente dà per tutt'altro motivo ([D47](#d47-pipe-sugli-eventi-dati-delle-app-sui-file-e-filecrypt): un'app riceve un file solo dall'utente). L'app può comunque aprirsi con degli `args` e chiedere lei all'utente.
- Con 20 notifiche conservate, un'app (o un servizio in un ciclo) che ne manda 100 al secondo cancellerebbe quelle di tutte le altre e riempirebbe lo schermo. Il limite al minuto lo impedisce e costa poco.
- Il flusso `/api/services-events` c'era già e un utente collegato ce l'ha sempre aperto: niente nuova connessione, né polling.

**Alternative scartate.**

- **Notifiche solo nel browser** (`localStorage` o `storage`): non ci sarebbero per un servizio a lilOS chiuso, né l'avviso in diretta alle altre schede.
- **Notifiche nel kernel, non in un modulo**: legherebbero il kernel a un modo di conservarle.
- **Un permesso nuovo per mandarle**: `ui.notify` c'era già, implicito per tutte le app, e il limite al minuto protegge meglio di un permesso che tutti darebbero.
- **Il mittente dichiarato dall'app**: vedi sopra.
- **Le notifiche del browser (Notification API) e i suoni**: richiedono un permesso del browser e fanno rumore; per ora no.

**Conseguenze.**

- **Il limite al minuto è in memoria**: il riavvio del kernel lo azzera. In modalità locale (senza modulo) l'SDK non lo applica, né controlla `action`.
- **Chi non è collegato non riceve l'evento.** Una pagina rilegge l'elenco (`GET /api/notifications`) quando si apre e quando il flusso si riconnette. Ciò che era già arrivato non fa comparire la barra, solo il numero sulla campanella.
- **Un servizio di sistema notifica tutti gli amministratori** (`kernel.adminIds()`), una copia ciascuno; il limite vale per ognuno.
- **Senza il modulo, `ui.notify` di un servizio torna al vecchio evento `notify`** (solo testo, fino a 200 caratteri, e solo a lilOS aperto), che lilOS trasforma in una notifica della pagina.
- **L'API HTTP prende `app` dal client.** Un'app **non isolata** gira nella pagina di lilOS e può chiamare `kernel.request` ([D42](#d42-punti-dingresso-e-due-modalità-di-esecuzione-per-le-app)): può quindi mandare una notifica a nome di un'altra app installata. È coerente con il resto (un'app non isolata può fare tutto ciò che può fare l'utente), ma va saputo; le app isolate passano dal ponte, che mette l'id vero.
- **Il Pannello di controllo 1.9.0 usa `notifications` dall'SDK**: va rilasciato dopo lilOS ([D38](#d38-le-app-di-sistema-vengono-dal-repository-ufficiale-e-girano-dentro-lilos)). Una versione precedente di lilOS non ha `notifications` e la scheda non compare.
- **SDK 0.3.1** (compatibile): `notifications`, il simbolo `bell`, il token `--success`.
- **La finestra Notifiche e i suoi testi sono ancora in italiano** (come il resto dell'interfaccia di lilOS, [D45](#d45-un-file-di-traduzioni-per-app-inglese-predefinito-un-solo-motore)); i testi delle app che notificano sono quelli delle app.

**Quando ripensarla.** Se serviranno notifiche con pulsanti o risposte; se un archivio più grande o ricercabile (un modulo su PostgreSQL) o una durata più lunga mostreranno che 200 non bastano; se si vorranno suoni, notifiche del browser o «non disturbare» per app; se il limite al minuto dovrà sopravvivere al riavvio; se la falsificazione del mittente da parte di un'app non isolata diventerà un problema (il kernel potrebbe firmare la richiesta, o rifiutare `app` dai client).

## D50. Il menu applicazioni: una pagina, con la storia d'uso salvata per workspace

**Decisione.** Il menu di avvio diventa il **menu applicazioni** (1° novembre 2026, su `development`): non più un elenco a tendina sopra il logo, ma una pagina a schermo intero sopra scrivania e finestre, come la pagina utente ([D48](#d48-la-pagina-utente-e-il-blocco-come-fine-della-sessione)), con la barra delle applicazioni sempre visibile.

- **Contenuto.** In alto ricerca (app, workarea, file degli elenchi), pagina utente, Pannello di controllo ed Esci; a sinistra le **preferite**; al centro schede (Recenti e frequenti, Work Area, una per categoria del manifesto); a destra i **file** aperti di recente e più spesso; in basso un pulsante per **workspace**, che cambia workspace senza chiudere il menu.
- **La storia d'uso sta in `storage`, per workspace** (`lilos:ws:<id>:launcher`, parte `launcher` di `PARTS`): preferite in ordine, e per ogni app e file l'ultimo uso e i conteggi per giorno degli ultimi 30 giorni, al massimo 100 voci. Si cancella con il workspace come le altre parti di [D27](#d27-workspace-scrivanie-separate-isolate-dal-file-system).
- **Si conta in un punto solo**: `src/taskbar/usage.js` ascolta `app:launch` sul bus. Conta ogni avvio della finestra `main` e `args.file`, **tranne** quelli con `auto: true`, che mette `launch(..., { auto: true })` e che usa l'avvio automatico (`startup.js`).
- **Le app hanno una `category`** nel registro (quella del manifesto, `other` se manca; `CATEGORIES` in `registry.js`).
- **I workspace hanno una `description`** (200 caratteri), mostrata sotto il nome nei pulsanti in basso. Si cambia dal Pannello di controllo (1.10.0).
- **`Workareas.show(id)`** porta in vista una workarea (la riapre se ridotta a icona): il clic su una workarea del menu.

**Perché.**

- Chi ha molte app e più workspace ritrova prima ciò che usa davvero: le preferite stanno ferme, i recenti e i frequenti cambiano da soli, per ogni scrivania.
- Una pagina larga ha posto per tre colonne, per le schede e per i workspace, cosa che un menu a tendina di poche decine di righe non ha.
- Contare dal bus evita di cambiare ogni punto che avvia un'app (menu, scrivania, File Manager, «Apri con», notifiche): tutti passano da `launch`.
- Per workspace perché i workspace servono a separare lavori diversi: le app del lavoro non devono riempire i recenti di casa.

**Alternative scartate.**

- **Storia globale** (una per utente): mescola i workspace, contro l'idea di D27.
- **Contare dentro il launcher** (`connectLauncher`): il launcher non conosce il significato «l'utente ha scelto» e riaprirebbe come uso anche le finestre che tornano da sole.
- **Contare ogni apertura di finestra**: includerebbe le finestre riaperte dopo un ricaricamento e le workarea.
- **Tenere i recenti in memoria**: si perderebbero a ogni uscita.

**Conseguenze.**

- **Chi emette `app:launch` per conto di lilOS (non dell'utente) deve passare `auto: true`.** Oggi lo fa solo `startup.js`; un nuovo avvio automatico che se ne dimenticasse falserebbe i recenti.
- **La ricerca dei file guarda solo gli elenchi** (file già aperti da questo workspace), non tutto il file system.
- **Il Pannello di controllo 1.10.0 va rilasciato dopo lilOS** ([D38](#d38-le-app-di-sistema-vengono-dal-repository-ufficiale-e-girano-dentro-lilos)) per avere il campo Descrizione; senza, la descrizione resta vuota e tutto il resto funziona.
- **I testi del menu sono ancora in italiano**, come il resto dell'interfaccia di lilOS ([D45](#d45-un-file-di-traduzioni-per-app-inglese-predefinito-un-solo-motore)).
- **SDK**: cambia solo l'aspetto del simbolo `gear` (ora un ingranaggio) e arrivano `star` e `grip`; vedi `sdk/README.md`.
- Il cambio di workspace non chiude più il menu: `Workspaces` non lo chiude e il menu si ridisegna da solo (`switch`).

**Quando ripensarla.** Se serviranno raccolte di app a scelta dell'utente (non solo le preferite), una storia condivisa tra workspace, la ricerca di tutti i file o le impostazioni, o se 100 voci per elenco e 30 giorni non bastano.

---

## D51. L'Editor con le schede tiene da parte il lavoro invece di chiedere

**Decisione.** L'Editor 1.2.0 (repository ufficiale) apre ogni documento in una scheda. **Chiudere la finestra non chiede di salvare**: schede e testo non salvato restano nello `storage` dell'utente e tornano.

- Chiavi `editor-tabs` (sessioni: una per finestra, più `closed` per quelle chiuse dall'utente) e `editor-draft:<scheda>` (`{ text, base, time }`, scritta circa 1 s dopo l'ultima modifica). Impostazione `tabs.reopen` in `editor-lang`, accesa di partenza.
- lilOS aggiunge due cose generali: l'evento **`dismiss`** di `Window` (emesso da `wm.requestClose` dopo `canClose`, mai da `wm.close`) e `getState().files` / `win.closeFiles(ids)` per `files:locked` e `files:shown`.
- **Perché `dismiss`**: l'app deve distinguere «l'utente ha chiuso» (le schede passano alla sessione `closed`) da «lilOS ricrea la finestra» (workarea, aggiornamento: la sessione resta alla finestra, che la riprende da `getState().session`). `destroy` non lo dice.
- Restano le domande per i file con contenuto di un'app (FileCrypt: il testo non deve uscire dal file) e per i testi oltre circa 2 milioni di caratteri.
- Sessioni non riaperte da 90 giorni cancellate con le bozze.

**Alternative scartate.** Chiedere sempre alla chiusura (come prima: perde lavoro se il browser si chiude, un documento alla volta); salvare in automatico nel file (cambia il file senza che l'utente lo voglia); tenere le bozze in memoria (si perdono al ricaricamento).

**Conseguenze.** Le bozze sono testo in chiaro nello `storage` dell'utente, fuori dal file. Un file cambiato nel frattempo si segnala al ritorno (Tieni la mia versione / Usa quella del file). Un `files:locked` chiude solo le schede, non la finestra.

**Quando ripensarla.** Se le bozze dovessero poter essere cifrate, o se altre app con documenti vorranno lo stesso comportamento (allora la logica di sessioni va nell'SDK).

---

## D52. Niente più toast: ogni messaggio è una notifica

**Decisione.** Il breve messaggio in basso sullo schermo (`toast`) non esiste più (1° novembre 2026). Ogni messaggio di lilOS e delle app passa dal servizio notifiche: barra delle notifiche sopra l'area di notifica e finestra Notifiche, conservate dal kernel ([D49](#d49-le-notifiche-un-modulo-opzionale-con-il-mittente-messo-da-lilos)).

- **lilOS** usa `notify(testo, { level })` di `src/notifications/notify.js` al posto di `toast`. Il livello (`info`, `success`, `warning`, `error`) è scelto per ogni messaggio.
- **SDK**: `toast(testo, { level })` resta esportato solo come vecchio nome: chiama `notifications.send` da lilOS; `timeout` è ignorato. Il CSS `.toast` è stato tolto da `sdk/styles/components.css`.
- **`notifications.send`**: una notifica di lilOS (senza `app`) che il kernel non accetta (oltre `perMinute`, kernel che non risponde; non gli errori `invalid`) resta nella pagina, mescolata a quelle del kernel, fino al ricaricamento. Un'app riceve invece l'errore del kernel.
- **App isolate**: `lilos.ui.toast(testo)` è il vecchio nome di `lilos.ui.notify(testo)`: notifica firmata con l'app e soggetta al suo limite al minuto. L'esempio `examples/apps/note` usa `ui.notify({ text, level: 'success' })`.

**Perché.**

- Con due canali («gesto = toast, resto = notifica») bisognava scegliere ogni volta, e il confine era sfocato: «Annullato» o «Spostato» passavano inosservati a chi guardava altrove, mentre un errore in un gesto sparisce in 3 secondi.
- Un solo posto per i messaggi: stessi lettori di schermo, stessa durata scelta dall'utente (Pannello di controllo → Notifiche), stesso elenco dove rileggerli.
- Il `toast` aveva uno stile e un elemento suoi, sempre uno alla volta: il nuovo messaggio cancellava il precedente.
- La notifica di lilOS non deve perdersi se il kernel non la prende: per questo resta nella pagina, invece di ricadere su un messaggio a parte (come faceva `notify` in D49).

**Alternative scartate.** Tenere il `toast` solo per le risposte a un gesto (due canali, confine sfocato); togliere `toast` dall'SDK (romperebbe le app che lo chiamano); far arrivare al kernel anche le notifiche in eccesso (aggirerebbe il limite al minuto).

**Conseguenze.**

- Ogni gesto con conferma (spostare, annullare, ripetere) riempie l'elenco e consuma lo spazio delle notifiche conservate (20 di serie): quelle importanti si perdono prima. Anche lo spazio nel kernel è consumato: ogni messaggio di lilOS va al kernel, ma solo il limite al minuto (10 per mittente) protegge da un ciclo.
- Le notifiche di lilOS che restano nella pagina non sono salvate: si perdono al ricaricamento.
- Un'app che usa ancora `toast` (SDK o `lilos.ui.toast`) funziona, ma il messaggio non è più «breve»: resta nell'elenco. Quelle isolate contano per il limite al minuto.
- Chi aveva copiato lo stile `.toast` dall'SDK deve portarselo.

**Quando ripensarla.** Se l'elenco si riempie di conferme e nasconde le notifiche importanti (allora: messaggi brevi che non si conservano, o un livello che non viene conservato), o se il limite di 20 conservate diventa stretto.

---

## D53. Le tastiere a schermo sono app di sistema e lilOS esegue l'azione del browser

**Decisione.** Una tastiera a schermo è un'app di sistema (1° novembre 2026). `sendKey(key)` (`@lilos/system`, `src/input/sendKey.js`) manda un tasto all'elemento col focus: invia `keydown`, `keypress` e `keyup` e, se nessuno li annulla, esegue l'azione che il browser farebbe (scrivere, cancellare, muovere il cursore, Invio, Tab, Ctrl+A/C/X/V/Z/Y). Per non togliere il focus a chi sta scrivendo, `Window` ha le opzioni `focusable: false` e `onTop: true`.

**Perché.**

- Solo un'app di sistema vive nella pagina di lilOS e può raggiungere l'elemento col focus nelle altre finestre (anche nello Shadow DOM delle app non isolate e, con un messaggio al bridge, nella sandbox di quelle isolate). Un'app installata, per scelta ([D42](#d42-punti-dingresso-e-due-modalità-di-esecuzione-per-le-app)), non deve poter scrivere nelle altre.
- Un tasto creato da uno script (`isTrusted: false`) non fa niente da solo: nessuna lettera nei campi, nessun cursore che si muove. Per questo lilOS esegue l'azione da sé.
- `focusable: false` è nella finestra e non nell'app, perché tocca il focus e l'ordine delle finestre, che sono del `WindowManager`.

**Alternative scartate.** Tastiera come app installata (non può arrivare alle altre finestre); un permesso per «scrivere nelle altre app» (ogni app potrebbe scrivere dove vuole); un campo di testo proprio dentro la tastiera (non scrive nelle altre app).

**Conseguenze.**

- Si imita il browser, non lo si usa: ogni azione nuova va aggiunta a `sendKey`. Limiti noti: Su e Giù nelle `textarea` vanno per righe logiche; Ctrl+C, X e V nelle app isolate possono non funzionare, perché l'iframe non ha l'attivazione dell'utente.
- Le app remote (un sito proprio) non ricevono tasti: lilOS non ha codice dentro.
- Il bridge dell'app isolata ha un messaggio in più (`key`) e porta con sé il codice di `typeKey`.
- `sendKey` entra nel contratto di `@lilos/system`: non si toglie senza rompere le tastiere già installate.

**Quando ripensarla.** Se serve una tastiera per le app remote, o se le azioni da imitare crescono tanto da rendere pesante il codice.

## D54. Le voci delle app nel menu dei file possono stare in un sottomenu

**Decisione.** Un'app raggruppa le sue azioni (`contributes.actions`) in sottomenu che dichiara in `contributes.menus: [{ id, label, glyph? }]`; un'azione con `menu: "<id>"` va in quel sottomenu (1° novembre 2026, per l'app Zip: **Comprimi → Zip / Unzip**). `when` accetta anche `notExt`: l'azione vale per tutto tranne i file con quelle estensioni.

- Il sottomenu compare solo se almeno una delle sue azioni vale per gli elementi scelti, al posto della prima di esse; dentro ci sono solo quelle che valgono.
- I sottomenu sono di una sola app: due app non ne condividono uno, nemmeno con la stessa etichetta.
- L'etichetta si traduce con la chiave `@menus.<id>.label` del `locales.json`.
- Il kernel controlla id (inizia con l'id dell'app, uno per menu, al massimo 10), etichetta, simbolo e che `menu` di un'azione sia uno di essi.

**Perché.**

- L'utente voleva una voce **Comprimi** con dentro **Zip** o **Unzip** secondo l'elemento: le azioni piatte non bastavano.
- Senza `notExt` «Zip» sarebbe comparso anche sugli archivi: con `ext` si può dire solo «questi tipi», non «tutti tranne questi».
- Un lilOS precedente ignora `menu` e mostra le azioni una per una: il campo non rompe niente.

**Alternative scartate.** Il sottomenu descritto in ogni azione (`menu: { label, glyph }` ripetuto, con il rischio di etichette diverse); un sottomenu comune a più app (chi ne decide nome e ordine?); azioni annidate (`items` dentro un'azione: più profondità di quella che serve).

**Conseguenze.**

- Un manifesto con `when.notExt` è rifiutato da un kernel precedente: l'app Zip vuole questa versione di lilOS.
- Un sottomenu con una sola voce costa un passaggio in più: va usato quando raccoglie azioni dello stesso tema.

**Quando ripensarla.** Se più app vogliono mettere voci nello stesso posto (allora: sottomenu di sistema con id noti, come «Comprimi» o «Invia a»), o se serve un livello in più.

## D55. L'anteprima dei file la può fare l'app che li apre

**Decisione.** Un'app dichiara un punto d'ingresso `background` di nome `filePreview` (`sdk` 2); quando il File Manager deve mostrare un file, lilOS (`filePreview` di `@lilos/system`, `src/apps/filePreview.js`) lo chiede all'app che apre quel tipo (`appFor`). L'app risponde con `text`, `image` o `html` (più una `note`), oppure `null`. Limiti: 1 MB di testo e di html, 20 MB di immagine, 10 secondi. Decisa il 1° novembre 2026, con il File Manager 1.6.0.

**Perché.**

- **Sola lettura.** L'anteprima compare con un clic, senza che l'utente abbia chiesto di aprire niente: un'app che potesse scrivere il file, o passarlo ad altre app, avrebbe un'occasione in più di farlo di nascosto. Per questo il file va in un insieme `readOnly` e non in `handles`: si legge, non si scrive, non si inoltra. E vale solo finché dura la chiamata: quando l'app risponde (o fallisce) il file le viene tolto, così non può tornare a leggere più tardi i file di cui ha fatto l'anteprima. Se l'app non risponde in tempo, il File Manager smette di aspettarla, ma il file resta leggibile finché la sua chiamata non finisce davvero. Conta però come file consegnato all'app per le pipe (FileCrypt lo decifra per lei).
- **Html ripulito, iframe senza permessi, CSP.** L'html è di un'app installata da chiunque e finisce nella pagina di lilOS. Un iframe `sandbox=""` toglie script, form e popup, ma non i modi di uscire senza script (un link, un `meta refresh`, un `base`, un `href` animato da un SVG): per questo lilOS toglie anche quei tag e attributi. La CSP (`default-src 'none'`, immagini e font solo `data:`) impedisce che l'anteprima chiami la rete solo perché è stata aperta. Tre difese, perché ciascuna da sola ha buchi noti.
- **Fallback silenzioso.** L'anteprima è un aiuto, non il lavoro dell'utente: se l'app sbaglia o tarda, il File Manager mostra quella di sempre e scrive un avviso in console. Una notifica o un errore a ogni clic su un file sarebbero peggio del difetto. Un lilOS più vecchio, senza `system.filePreview`, si comporta allo stesso modo.
- **L'app che apre il tipo.** Non serve una nuova associazione: la scelta dell'utente per un tipo di file decide anche chi ne fa l'anteprima.

**Alternative scartate.** Dare all'app un elemento nella pagina di lilOS (può rubare spazio ed eventi); lasciare l'html senza pulizia e fidarsi solo della sandbox; permettere i link (porterebbero l'utente altrove da una pagina che non ha scelto); mostrare un errore quando l'app fallisce.

**Conseguenze.**

- `filePreview`, `previewAppFor` e `PREVIEW_ENTRY` entrano nel contratto di `@lilos/system`; `theme()` di `host.js` è esportata.
- Se nasce un altro modo di uscire da una pagina senza script, va aggiunto all'elenco dei tag tolti o alla CSP.
- Un'app che apre molti tipi fa tutte le anteprime con lo stesso punto d'ingresso: deve guardare l'estensione (`lilos.files.info`).
- Un html con link, form o contenuti esterni si vede senza quelle parti.

**Quando ripensarla.** Se le app vogliono anteprime interattive (allora: un iframe con `allow-scripts` e un canale di messaggi, come le finestre isolate), o se servono altre forme di risposta (audio, video, PDF).

**Aggiunta (1° novembre 2026): anche le app installate chiedono anteprime.** Con `lilos.files.preview(rif, { size? })` e il permesso `fs.preview` (livello `install`). Serve un permesso a sé, e non basta `fs.read`, perché la chiamata fa partire il codice di un'altra app e le consegna il file. Chi chiede deve poter già leggere il file, perché l'anteprima ne mostra il contenuto. L'app che la fa vede chi chiede (`from`) e può rifiutare.

## D56. Le miniature sono le immagini che le app fanno dei file

**Decisione.** Una miniatura è la risposta `image` del `filePreview` dell'app che apre il file ([D55](#d55-lanteprima-dei-file-la-può-fare-lapp-che-li-apre)), chiesta piccola con il nuovo `size` e tenuta in memoria (`src/apps/thumbnails.js`: `fileThumbnail`, `canThumbnail`, `thumbnailIcon`, esportate da `@lilos/system` le prime due). Si vedono in due posti, **entrambi voluti dall'utente il 1° novembre 2026**: sulla scrivania, **solo se acceso** (impostazione `deskPreviews`, predefinita `false`, Pannello di controllo → Scrivania → Elementi → Icone) e nel File Manager in una **terza vista** separata, «Vista anteprime» (1.7.0). Photo 1.2.0 ed Editor 1.3.0 le fanno.

**Perché.**

- **Solo `image`.** Un testo o una pagina HTML non sono una miniatura: disegnarli in 56 pixel sarebbe compito di lilOS, che non sa come. L'Editor risponde quindi con un'immagine (un foglio con le prime righe). Errori e `null` lasciano l'icona e scrivono un avviso in console: una miniatura è un abbellimento, non va notificata.
- **Cache in memoria.** Una miniatura costa una chiamata all'app, la lettura del file e una codifica. Si tiene come object URL con chiave id + `modified` + `size` + app@versione + misura: un file cambiato o un'app aggiornata la invalidano da soli, senza dover scrivere niente sul disco (né dentro l'utente, né nel file system). Si ricrea a ogni ricarica. Misure arrotondate a 64/128/256/512 perché icone di taglia vicina la condividano; 400 miniature, le più vecchie pronte revocate; la precedente di un file cambiato è revocata subito, per non accumulare memoria.
- **Sulla scrivania è un'opzione spenta.** Ogni miniatura fa girare un'app e leggere un file; una scrivania con molti file lo farebbe all'ingresso di ogni utente, anche di chi non la vuole. Per questo le chiamate partono solo per le icone sullo schermo (`IntersectionObserver`, 200 px di margine), due app alla volta.
- **Nel File Manager è una vista a parte.** Chi sceglie «Vista anteprime» ha chiesto le miniature; la vista a icone non cambia, così la lista resta leggera come prima.
- **File con contenuto di un'app esclusi.** Un file con `apps[x].content === true` (FileCrypt) ha il contenuto che solo la sua app capisce: un'anteprima chiederebbe alle pipe di decifrarlo (D55) solo per disegnare un'icona, a ogni apertura di cartella.

**Alternative scartate.** Miniature sempre accese sulla scrivania (costo per chi non le vuole); una cache su disco (da invalidare, da proteggere come i file, con il rischio di lasciare dati leggibili di file cifrati o cancellati); lilOS che disegna le miniature di testo da sé (duplica l'evidenziatore dell'Editor); miniature anche per `text` e `html`.

**Conseguenze.**

- `fileThumbnail` e `canThumbnail` entrano nel contratto di `@lilos/system`; `filePreview` accetta `{ size }` e l'app lo riceve in `data.size`. `itemIcon` ha l'opzione `preview`.
- Un lilOS senza `fileThumbnail` non ha l'opzione nel Pannello di controllo; il File Manager 1.7.0 lì mostra solo icone grandi.
- Un'app che risponde `image` senza rispettare `size` funziona, ma pesa: una foto da 20 MB è decodificata per ogni icona.
- Aggiornare l'app che apre un tipo rifà tutte le miniature di quel tipo.

**Quando ripensarle.** Se la lentezza si vede (allora: una cache persistente con chiave sul contenuto, o la creazione in anticipo), o se altre app vogliono miniature non immagini.

## D57. lilOS si aggiorna dal repository ufficiale, come un pacchetto

**Decisione.** Tutto ciò che di lilOS non è un'app o un modulo (la pagina, il kernel e quello che il kernel usa dell'SDK) è un pacchetto del repository ufficiale, sotto `system/lilos` (`"system": "system/lilos"` in `catalog.json`). Un amministratore lo vede come una voce dell'AppStore («lilOS») e lo aggiorna come gli altri pacchetti. Deciso con l'utente il 1° novembre 2026. Il codice è in `system/kernel/src/apps/systemPackage.js`; contratti in [API → lilOS come pacchetto](../sviluppatore/api.md#lilos-come-pacchetto-systempackagejs).

- **Solo amministratori, solo dal repository ufficiale.** Un repository aggiunto non può offrire lilOS (il catalogo ignora `system` se il repository non è l'ufficiale).
- **Nel repository ufficiale va solo la build** da installare, con il suo `README.md` e `CHANGELOG.md`, mai i sorgenti di lilOS. La fa `npm run release -- <cartella del repository ufficiale>` (`scripts/release.mjs`) a partire da un commit di questo repository. Anche il kernel, che non ha un passo di build, va impacchettato e minificato (Vite, in `system/kernel/src/` della release: dalla 1.9.1, chiesto dall'utente), così nel repository non c'è il suo codice leggibile. La versione di lilOS è quella di `package.json` (era `0.1.0`, ora `1.8.0`): va alzata insieme al tag.
- **Versioni affiancate.** In un lilOS installato ogni versione sta in `releases/<versione>`, `current.json` dice quale parte, e `run.js` (fisso, fuori dalle release) la avvia. I dati (`config.json`, `repos.json`, `modules/`) stanno fuori dalle release.
- **Se la nuova versione non parte**, `run.js` torna da solo alla precedente e scrive `failed` in `current.json`: gli amministratori ne hanno l'avviso. **Se parte**, scrive `updated` e lilOS chiede agli amministratori se eliminare la versione vecchia (Mantieni / Elimina).
- **Una copia del repository (sviluppo, Vite) mostra la versione ma non si aggiorna da qui**: si aggiorna con git (`update`, `use`, `remove` e `acknowledge` lanciano `conflict`).

**Perché.**

- **Una sola strada per aggiornare.** App e moduli si aggiornavano dall'AppStore, lilOS no: chi lo installava doveva scaricare i sorgenti, e ogni installazione restava ferma a una versione. Con un pacchetto in più, l'amministratore ha una voce sola per tutto.
- **Non pubblicare i sorgenti.** Il repository ufficiale è la fonte di ciò che gira, non il luogo dove si sviluppa lilOS. Una build con l'hash di ogni file (`system.json`) basta a installare e controllare; i sorgenti hanno il loro repository.
- **Affiancare invece di sostituire.** Sovrascrivere i file di un kernel in esecuzione lascia una versione a metà se qualcosa si interrompe. Una cartella nuova accanto alla vecchia si scrive con calma (in una cartella temporanea, poi rinominata) e tornare indietro è cambiare un nome in `current.json`.
- **`run.js` fisso.** È l'unica parte che deve funzionare quando la versione nuova è rotta: se si aggiornasse con le versioni, un errore lì non avrebbe nessuno che lo ripari. Per questo è piccolo, senza dipendenze dal resto, e `tools/install.js` lo copia solo all'installazione.
- **Prova con ritorno automatico.** Una versione nuova che non parte lascerebbe lilOS spento e raggiungibile solo a mano. `run.js` la tiene «in prova» (`trial`) finché il kernel non manda `ready` (5 minuti al massimo) e, in caso contrario, riparte la precedente. L'utente non deve saper nulla.
- **Chiedere prima di eliminare la versione vecchia.** Subito dopo un aggiornamento è proprio la versione a cui si vorrebbe tornare se qualcosa non va; cancellarla da soli toglierebbe la via d'uscita, tenerla per sempre riempirebbe il disco. La scelta è dell'amministratore, e se non risponde la domanda ricompare.
- **Compatibilità controllata prima, non dopo.** Una versione nuova che lascia fuori un modulo (`kernel` diverso) o un'app (`sdk`, nuovo campo `lilos` del manifesto) la romperebbe al riavvio. `update` e `use` rifiutano e dicono cosa aggiornare prima; `installer.js` fa il controllo inverso (un'app che chiede un'altra versione di lilOS non si installa).
- **Il kernel serve la pagina** in un lilOS installato (`web.js`): non c'è Vite, e la pagina e il kernel di una release sono sempre della stessa versione.

**Alternative scartate.**

- Aggiornare con git un clone sul server: richiede sorgenti, `npm install` e Vite sul computer che fa girare lilOS, e non ha il ritorno automatico.
- Sostituire i file sul posto: nessuna via di ritorno se l'aggiornamento si interrompe.
- Un repository separato per lilOS: un secondo indirizzo di fiducia da configurare, e la compatibilità tra app e lilOS starebbe in due posti.
- Cancellare da soli la versione vecchia dopo un avvio riuscito: si perderebbe la possibilità di tornare indietro per un problema che si vede solo dopo ore.

**Conseguenze.**

- Per rilasciare lilOS: alzare `version` in `package.json`, fare il commit, `npm run release -- <repository ufficiale>`, controllare `CHANGELOG.md`, commit e tag nel repository ufficiale, e tag `v<versione>` in questo repository (il changelog parte dal tag della versione prima). Il comando rifiuta di partire con modifiche non salvate.
- `sdk/package.json` deve dichiarare `core/pipeCatalog.js` tra i `sideEffects`: la build di produzione, che prima nessuno usava, lo scartava e la pagina si bloccava con «Evento sconosciuto: file.open».
- Il manifesto di un'app può avere `lilos` (un intervallo come `>=1.8.0 <2.0.0`); `SDK_VERSIONS` (`['1', '2']`) e la versione dell'API dei moduli (`KERNEL_API`) finiscono in `system.json` e si controllano contro app e moduli installati.
- Il ritorno automatico copre solo il kernel che non parte o non risponde: una pagina rotta ma servita non lo fa scattare. Per questo l'amministratore può tornare a mano con **Usa questa versione**.
- L'integrità è l'hash di ogni file in `system.json`, scritto dallo stesso repository: protegge da file danneggiati, non da un repository ufficiale compromesso (la firma di `officialKey` non si controlla per lilOS).
- I dati non cambiano con la versione, quindi una versione che cambiasse il loro formato in modo incompatibile non permetterebbe di tornare indietro: oggi non c'è una migrazione né un controllo.
- L'aggiornamento non cambia la pagina già aperta: ogni scheda chiede di riavviare lilOS quando il kernel torna con un'altra versione (`checkSystemVersion`).

**Quando ripensarla.** Quando la firma sarà usata per lilOS stesso (oggi si fida del repository), quando le migrazioni dei dati renderanno pericoloso tornare indietro, o se servirà più di un canale (anteprime, versioni stabili).
## D58. Lo sfondo è una copia nella cartella Sistema

**Decisione.** L'immagine di sfondo della scrivania è una copia del file scelto, in **Sistema**, una cartella condivisa e nascosta della radice (impostazione `wallpaper` = id della copia). La copia si legge all'avvio e sta in uno strato fisso dietro la scrivania, alto quanto la scrivania con le sue proporzioni (`src/desktop/wallpaper.js`). Il colore (`deskColor`) è un'impostazione a parte. Deciso il 1° novembre 2026; la prima versione (lilOS 1.9.0–1.9.3) teneva l'id dell'originale, la copia è dalla 1.9.4, Sistema è nascosta dalla 1.13.1.

**Perché.**

- **L'utente vuole che eliminare l'originale non cambi niente.** Con un riferimento, spostare il file nel cestino toglieva lo sfondo: non è quello che ci si aspetta da un'immagine «messa» come sfondo.
- **Il kernel accetta al massimo 512 KB per valore di storage.** Tenere l'immagine nelle impostazioni (come data URL, come la foto profilo, che per questo è ridotta a 192 px) non è possibile: una foto vera pesa molto di più. Un file può invece arrivare a 10 MB. La copia va quindi nel file system.
- **Una cartella di sistema, nascosta.** La copia sta in Sistema (condivisa da tutti i workspace, non si rinomina né si elimina). È roba di lilOS, non dell'utente: dalla 1.13.1 non è più in `SYSTEM_FOLDERS` (niente voce nella barra laterale del File Manager) e `setupFileSystem` la nasconde con `fs.setHiddenNodes`, come un elemento con un tag invisibile: `children()` la esclude (File Manager, selettore, Editor, Terminale, conteggi), `get`, `exists` e `resolve` la trovano. Nella 1.9.4–1.13.0 era visibile, con il simbolo `gear`.
- **Una sola copia.** Sistema tiene solo quella in uso: un nuovo sfondo, «Togli» e «Ripristina» eliminano la precedente per sempre (non nel cestino), così non si accumulano duplicati. `dropCopy` non tocca mai un file fuori da Sistema.
- **Lettura prima del workspace.** Con i workspace `fs` mostra solo la scrivania del workspace attuale. Uno sfondo salvato dalla 1.9.0–1.9.3 (id dell'originale, magari nella Scrivania privata di un altro workspace) si copia in Sistema al primo avvio, in `preloadWallpaper`, prima di `setupWorkspaces`. L'originale resta dov'è.

**Alternative scartate.** Un riferimento al file (la prima versione: nessun duplicato, ma eliminare il file toglieva lo sfondo); l'immagine nelle impostazioni (limite di 512 KB); Sistema visibile nel File Manager (1.9.4–1.13.0: l'utente vedeva e poteva eliminare un file che non è suo); un campo `hidden` salvato sul nodo (serviva anche il kernel, che conserva solo i campi che conosce); tutte le copie tenute in Sistema (da pulire a mano); uno sfondo per workspace (non richiesto).

**Conseguenze.**

- Eliminare o modificare l'originale non cambia lo sfondo. Eliminare la copia, anche solo spostandola nel cestino, toglie lo sfondo; ripristinarla non lo rimette.
- Scegliere un file già dentro Sistema non crea un'altra copia (si arriva a Sistema solo scrivendone il percorso, `~/Sistema`).
- Il nome Sistema resta occupato nella radice: una cartella nuova con quel nome diventa «Sistema 2».
- La copia prende il nome dell'originale (dopo l'eliminazione della precedente, se `fs` l'aveva numerata).
- L'immagine occupa spazio due volte: la copia pesa quanto l'originale.
- L'immagine resta in memoria come object URL finché è lo sfondo; si revoca quando cambia.
- Il browser decodifica l'immagine a piena misura: una foto molto grande pesa.

**Quando ripensarla.** Se serve uno sfondo diverso per workspace (allora: una copia per workspace e lettura di tutte all'avvio), o se lilOS avrà cartelle nascoste o un'area dati per sé (la copia andrebbe lì).

## D59. La rete: i protocolli sono moduli del kernel e i trasferimenti li fa il kernel

**Decisione.** lilOS si collega a server remoti (FTP, FTPS, SFTP, WebDAV, SMB) e li mostra come cartelle dentro **Rete**, una cartella di sistema della radice. Deciso e costruito il 1° novembre 2026, sul ramo `rete`.

- **I protocolli sono moduli del kernel.** Ogni protocollo è un servizio `netfs.<protocollo>` di un modulo (`netfs-sftp`, `netfs-ftp` per FTP e FTPS, `netfs-webdav`, `netfs-smb`) che segue il contratto di `src/net/drivers.js`: i campi che chiede (descritti, così la finestra «Connetti a un server» si disegna da sola), `connect`, e una sessione con elenco, lettura, scrittura, creazione, rinomina, eliminazione e, se può, osservazione e ripresa. Il kernel trova i protocolli all'avvio; senza, Rete non c'è. Un protocollo nuovo è un modulo nuovo, senza toccare il kernel né la pagina.
- **Connessioni per utente.** Ognuno ha le sue, salvate in `net/` accanto a `config.json`, e vede e cambia solo quelle. Ogni connessione è una cartella in `~/Rete` (nodo `net-<id>` in `fs`).
- **Segreti cifrati, mai spediti a un server non verificato.** Password e chiavi si salvano solo su richiesta («Ricorda la password»), cifrate con una chiave del kernel (`secret.key`); altrimenti restano in memoria. Prima di mandare le credenziali il driver verifica il server: SFTP confronta la chiave con l'impronta confermata dall'utente, FTPS e WebDAV `https://` accettano un certificato valido o quello confermato. Se non è fidato, la connessione si ferma con `untrusted` e l'impronta da mostrare; solo dopo la conferma si richiama `connect`.
- **I trasferimenti li fa il kernel.** Copiare tra la home e una connessione, o tra due connessioni, è una richiesta al kernel (`POST /api/net/transfers`), che copia da sé. Continua se si chiude il File Manager o la pagina, e riprende dopo un riavvio del kernel (le code si salvano ogni 2 secondi). Una coda per destinazione, un file alla volta; ciò che si aggiunge a una destinazione che ha già una coda va in fondo. Un file che esiste già ferma la coda finché l'utente sceglie. Si ferma solo con **Annulla** (tutto, destinazione, cartella, file); chiudere la finestra non ferma niente. A coda finita arriva una notifica.
- **La finestra «Trasferimento dati»** si apre da sola solo per i trasferimenti di rete che durano più di **5 secondi** (una volta per serie di copie) e quando serve una scelta (un file che esiste già); altrimenti la apre l'utente dal pulsante nella barra o dalla notifica.
- **Cartelle senza notifiche di modifica.** I contenuti si leggono quando si apre (o riapre) la cartella. SMB invece osserva le cartelle (`CHANGE_NOTIFY`) e la pagina si aggiorna da sola.
- **Eliminare su un server è definitivo** e chiede sempre conferma: non c'è un cestino sul server.
- **SMB solo 2 e 3**, niente SMB1 (CIFS). La libreria è [smb3-client](https://github.com/euricojardim/smb3-client) (MIT): il lavoro che ci abbiamo fatto (sette correzioni, vedi `VENDORED.md`) si propone all'autore con pull request, e intanto resta in `netfs-smb/lib/smb3-client/`. Se l'autore non risponde, resta lì per sempre.
- **Niente scoperta automatica dei server**, per ora: l'indirizzo lo scrive l'utente.
- **Dove il kernel può collegarsi** (`net/guard.js`). Con più utenti (accesso richiesto) la rete del kernel è di tutti: non si collega mai a questo computer (loopback), agli indirizzi link-local (i servizi di metadati dei cloud), al multicast né a `0.0.0.0`. La rete locale è **chiusa di serie** (deciso con l'utente il 2 novembre 2026): la apre `net: { allowPrivate: true }` in `config.json`, oppure `net.allow: ['192.168.1.50/32', …]` lascia passare solo certi indirizzi o intervalli (il NAS). Il controllo si rifà a ogni salvataggio, prova e apertura, perché un nome può puntare altrove più tardi. Con un solo utente nessun limite.
- **Nomi e collegamenti del server non sono fidati.** Un nome con `..`, caratteri di controllo o inversioni di direzione del testo (che farebbero sembrare `exe.txt` un `txt.exe`) non compare negli elenchi e non si trasferisce. I collegamenti simbolici si riconoscono (`link: true`): non si entra mai nelle cartelle a cui puntano e si eliminano loro, non la destinazione. Gli elenchi hanno al massimo 50 000 voci.
- **Una password ricordata vale per quel server e quell'account.** Se cambiano `host`, `port`, `url`, `user`, `tls`, `domain`, `share` o `auth`, la password salvata si scorda e va riscritta. Se la chiave o il certificato di un server sono diversi da quelli confermati, l'avviso è più forte (`changed`, con l'impronta di prima).
- **Sostituire un file su un server** lo scrive prima accanto (`.nome.lilos-part`) e poi lo scambia: se il trasferimento si ferma, il vecchio file resta intero. La scelta per un conflitto si ricorda finché l'elemento non finisce, anche con pausa o riavvio.
- **Contenuti grandi nel file system del kernel.** I trasferimenti verso la home scrivono file che possono essere enormi: per questo `fs-postgres` passa alla 1.1.0 e il servizio `fs` ha `readStream` e `writeFrom` facoltativi (contenuti a pezzi da 1 MB nella tabella `lilos_chunks`).

**Perché** (ricostruzione, da confermare)**.**

- **Il browser non apre connessioni FTP, SSH o SMB**, e comunque le password non devono passare dalla pagina più del necessario: il collegamento lo fa il kernel, che in lilOS è già il posto dei dati e dei segreti.
- **Un modulo per protocollo** tiene fuori dal kernel le librerie pesanti (ssh2, basic-ftp, SMB), le fa installare e togliere come gli altri moduli (AppStore → Kernel) e rende il contratto la sola cosa da imparare per aggiungere un protocollo. Lo stesso modello di `fs`, `auth` e `notifications` ([D31](#d31-un-kernel-modulare-con-il-controllo-degli-accessi-dentro-il-modulo-del-file-system)).
- **I trasferimenti nel kernel** perché una copia di gigabyte non può dipendere da una scheda del browser: deve sopravvivere a una pagina chiusa, a un riavvio e a una connessione che cade (tre tentativi, con ripresa da metà se il protocollo può). Le code per destinazione evitano che molte copie insieme saturino lo stesso server, e non fanno aspettare destinazioni diverse.
- **Una cartella per connessione, in Rete,** perché l'utente le usa come tutte le altre cartelle (File Manager, trascinamento, Editor) senza imparare un'altra interfaccia; la differenza (si copia, non si sposta; si elimina per sempre) è dichiarata dove conta.
- **Confermare prima di mandare la password** perché un server falso, o una chiave che cambia, è il modo più semplice di rubare credenziali.

**Alternative scartate** (ricostruzione, da confermare)**.** Protocolli nella pagina o nell'SDK (il browser non può, e le password passerebbero dalla pagina); tutti i protocolli in un solo modulo (librerie obbligate per chi ne vuole uno); connessioni condivise tra utenti (le credenziali sono personali); trasferimenti guidati dalla pagina (finiscono con la scheda); una sola coda per tutti (una destinazione lenta frena le altre); fermare un trasferimento chiudendo la finestra (un trasferimento lungo non deve sparire per sbaglio); SMB1 (insicuro e spento in Windows); aspettare una nuova versione di smb3-client prima di usarla (le correzioni servivano subito).

**Conseguenze.**

- I moduli `netfs-*` sono attivi nel `config.json` di sviluppo del repository; in un'altra installazione vanno aggiunti a `modules` (o installati dall'AppStore). `npm run kernel:setup` installa ssh2 e basic-ftp. Senza, la sezione Rete non compare.
- Con più utenti, il kernel rifiuta server su questo computer o su indirizzi link-local, e al massimo 3 prove di connessione (Prova, Elenca) alla volta per utente.
- Password e chiavi sono protette da chi legge i file delle connessioni o una loro copia, **non** da chi può leggere la cartella del kernel: il kernel deve poterli usare da solo, e `secret.key` sta accanto ai dati. Perdere `secret.key` vuol dire dover riscrivere le password.
- Copiare è l'unica operazione tra home e server: **spostare** non esiste (si copia e si elimina a mano); tag, colori, collegamenti alle app e dati delle app non si possono mettere sui file remoti, e non ci sono miniature (andrebbero scaricati).
- Le cartelle di FTP, SFTP e WebDAV possono essere vecchie finché non si riaprono.
- Il kernel tiene copia della libreria SMB: le sue correzioni vanno mantenute finché non sono a monte.
- `fs-postgres_1.0.0` non c'è più nel repository: la 1.1.0 la sostituisce (stesso schema, più la colonna `chunks` e la tabella `lilos_chunks`, applicati da soli). Il testo di [D31](#d31-un-kernel-modulare-con-il-controllo-degli-accessi-dentro-il-modulo-del-file-system) e della decisione sul database parla della 1.0.0.
- Nuovi codici d'errore del kernel: `untrusted` (409) e `secret_required` (428), con `details`.

**Non ancora fatto.** Kerberos, DFS, lease e durable handle di SMB, i blocchi di intervallo di byte (SMB 2.0.2 c'è da netfs-smb 1.0.1); i segni «in arrivo» nel File Manager per ciò che sta per essere copiato; la scoperta automatica dei server.

**Quando ripensarla.** Se serve cifrare i segreti con qualcosa che il kernel non tiene accanto a sé (un portachiavi del sistema operativo o una password dell'utente), se gli utenti vogliono connessioni condivise, se arriva un protocollo che non entra nel contratto (per esempio uno con eventi di modifica ma senza elenco), o se le correzioni di smb3-client entrano nella versione ufficiale (allora si toglie la copia).

> Estesa da [D60](#d60-onedrive-nella-rete-laccesso-con-la-finestra-del-fornitore-e-le-impostazioni-dei-moduli): un protocollo può avere un account del fornitore invece di una password, e OneDrive ha un cestino suo ("Eliminare su un server è definitivo" vale per gli altri protocolli).

## D60. OneDrive nella Rete: l'accesso con la finestra del fornitore e le impostazioni dei moduli

> Aggiornata da [D70](#d70-accesso-ai-fornitori-server-confermati-e-file-json-nel-kernel-i-moduli-si-possono-fondere): da lilOS 1.22.0 i token li chiede e li rinnova il kernel (`oauth` del driver) e l'app Azure è del kernel, impostata una volta per tutti i protocolli, non più nelle impostazioni del modulo.

**Decisione.** OneDrive entra nella cartella Rete come protocollo (`netfs-onedrive`, un modulo del repository ufficiale), con tre novità nel kernel che servono anche ad altri. Deciso e costruito il 2 novembre 2026, sul ramo `onedrive`.

- **L'app su Azure è di ogni installazione.** Ogni lilOS registra la propria app su Azure: client pubblico, piattaforma «Client pubblico/nativo (dispositivi mobili e desktop)», **nessun segreto**. L'amministratore mette l'ID nel Pannello di controllo → OneDrive (`clientId`; `accounts` e `tenant` scelgono quali account ammettere).
- **L'accesso si fa nella finestra del fornitore** (OAuth 2.0, codice di autorizzazione con PKCE). La pagina apre una finestra e il kernel le dà l'indirizzo del fornitore; il fornitore la rimanda a `/api/net/signin/callback` del kernel, che scambia il codice. **La pagina non vede mai i token.** È il campo `signin` dei protocolli (`net/signin.js`).
- **Il token di aggiornamento è il segreto della connessione**, cifrato come le password. Microsoft lo cambia a ogni rinnovo: il driver lo ridà al kernel con `saveSecret`. Se Microsoft non lo accetta più, l'errore è `secret_required` con `reason: 'signin'` e la pagina fa rifare l'accesso (la stessa connessione, lo stesso account).
- **Le cartelle condivise si aprono dai loro collegamenti.** L'API Graph `sharedWithMe` è deprecata e smette di dare dati a novembre 2026, senza sostituto ufficiale (per gli account personali non c'è alternativa). Si apre la cartella condivisa attraverso il suo collegamento in «I miei file» (su onedrive.com: Aggiungi collegamento). L'impostazione `shared` li mostra e chiede il permesso `Files.ReadWrite.All`; cambiarla chiude le connessioni, che chiedono un nuovo accesso.
- **Impostazioni dei moduli, un meccanismo generico.** `settings` in `module.json` (gli stessi campi dei protocolli), `GET` e `PUT /api/modules/:nome/settings` per gli amministratori (`kernelModules.settings`, `saveSettings`), `ctx.onConfig` per applicarle senza riavvio. Cambiando le impostazioni di un modulo di rete le connessioni aperte si chiudono.
- **Eliminare manda nel cestino di OneDrive** (`recycles`), una cartella in una sola richiesta (`removeTree`). Il File Manager lo dice nella conferma.
- **Aprire in Office per il web.** `link(path)` dà la pagina del file sul sito del fornitore; per un documento Office è Office per il web (`links.office`). **Carica su OneDrive e apri** (`putHome`) copia un documento della Home nella cartella scelta (di serie `/lilOS`), chiede se c'è già un file con quel nome (Sostituisci, Tieni entrambi) e apre Office per il web in una nuova scheda. L'originale resta nella Home: quello che si cambia online sta nella copia.

**Perché** (ricostruzione, da confermare)**.**

- **Un'app per installazione** perché lilOS è software che ognuno ospita: una sola app registrata dal progetto metterebbe il suo ID e le quote di Microsoft in mano a tutti, e il progetto risponderebbe di ogni uso. Un client pubblico non ha un segreto da custodire.
- **La finestra del fornitore** perché è il modo in cui Microsoft vuole l'accesso: la password dell'utente non passa da lilOS, e l'utente vede dove la scrive. Che il kernel scambi il codice tiene i token fuori dalla pagina, come le password degli altri protocolli. L'indirizzo di ritorno è il kernel e non la pagina perché la pagina non può ricevere una richiesta di un altro sito; la rotta non ha la sessione perché il cookie `SameSite=Strict` non arriva quando un altro sito rimanda il browser, e il `state` casuale fa da prova.
- **Un meccanismo generico per le impostazioni** perché un modulo di rete ha bisogno di un ID e di scelte, e il modulo non ha una pagina sua: descrivere i campi in `module.json` riusa il disegno dei campi dei protocolli e non fa scrivere a mano `config.json` (che oggi richiede il riavvio, [D40](#d40-i-moduli-del-kernel-si-installano-come-pacchetti-e-valgono-dopo-il-riavvio)).
- **I collegamenti per le cartelle condivise** perché è quello che resta: chi usa un account personale non ha altro.

**Alternative scartate.**

- **Accesso a codice (device code)**, dove l'utente scrive un codice su una pagina di Microsoft: scartato dall'utente in favore della finestra, più naturale.
- **Cercare i file condivisi con `sharedWithMe`**: smette di funzionare a novembre 2026, senza sostituto.
- **Office Online Server**, per modificare i documenti dentro lilOS: escluso dall'utente.
- (Ricostruzione, da confermare) **Una sola app registrata dal progetto**, per non far fare niente all'amministratore; **impostazioni solo in `config.json`**, che richiedono la mano dell'amministratore e il riavvio.

**Conseguenze.**

- **Serve https, o http da `localhost`.** Microsoft non accetta altri indirizzi di ritorno, e `cleanRedirect` li rifiuta. Con lilOS su un altro `http://` l'accesso non funziona.
- Prima che un amministratore metta l'ID, il protocollo c'è ma dice che non è pronto (`ready()`); il File Manager rimanda al Pannello di controllo.
- Il token di aggiornamento può scadere o essere revocato: l'utente rifà l'accesso, con lo stesso account.
- **Accendere o spegnere `shared` cambia i permessi:** tutti rifanno l'accesso.
- I caricamenti ripartono da capo (Microsoft non lascia aggiungere a un file); i download riprendono.
- Il modulo non è in questo repository: si installa dall'AppStore. Servono lilOS 1.11.0 (kernel) e File Manager 1.11.0 e Pannello di controllo 1.14.0 per la parte visibile.
- Le scelte dell'utente (connessione, cartella, file già presente, doppio clic) sono nella chiave `onedrive`, non nel kernel.
- Nuovo codice di errore del client: `blocked` e `canceled` (da `net.signIn`, in `KernelError`).

**Non ancora fatto.** Modificare i documenti dentro lilOS: due strade previste. Un modulo `wopi-host` (il kernel fa da host del protocollo WOPI) con **Collabora** o **ONLYOFFICE**, e poi **Microsoft 365** (il programma CSPP di Microsoft, che apre Office per il web su file di lilOS). Fino ad allora i documenti passano da OneDrive.

**Quando ripensarla.** Se Microsoft offre un sostituto di `sharedWithMe` (allora i condivisi tornano un elenco); se serve un'app unica per più installazioni (un servizio del progetto che fa da intermediario, con tutto quello che comporta); se un altro fornitore (Google Drive, Dropbox) vuole lo stesso modello e conviene tirare fuori da `netfs-onedrive` il codice comune di OAuth; o se arriva il modulo WOPI e «Carica su OneDrive e apri» non serve più.
## D61. I terminali remoti: le sessioni vivono nel kernel, un WebSocket nostro

> Aggiornata da [D70](#d70-accesso-ai-fornitori-server-confermati-e-file-json-nel-kernel-i-moduli-si-possono-fondere): da lilOS 1.22.0 le chiavi dei server confermate sono le stesse della Rete (`net/knownHosts.js`), e i driver mandano l'output con `ctx.output` e `ctx.closed`.

**Decisione.** lilOS apre terminali **SSH**, **Telnet**, **rlogin** e **SUPDUP** con l'app **Terminale remoto** (id `remote-terminal`). Deciso con l'utente e costruito il 2 novembre 2026.

- **L'app è dell'AppStore, non di sistema.** Sta nel repository ufficiale (`apps/remote-terminal`), si installa quando serve e chiede il permesso `term`. Il terminale sullo schermo è **xterm.js** 6.0.0 (licenza MIT), dentro l'app; i riconoscimenti sono nella finestra Informazioni e nel README dell'app.
- **I protocolli sono moduli del kernel**, come per la Rete ([D59](#d59-la-rete-i-protocolli-sono-moduli-del-kernel-e-i-trasferimenti-li-fa-il-kernel)): un servizio `term.<protocollo>` (`term-ssh`, `term-telnet`, `term-rlogin`, `term-supdup`) con `fields`, `open(values, ctx)` e una sessione di byte. Il contratto è in `system/kernel/src/term/drivers.js`. Un protocollo nuovo è un modulo nuovo.
- **Le sessioni vivono nel kernel.** La connessione al server la fa il kernel e resta aperta anche senza pagina. Una sessione senza finestra si chiude dopo **10 minuti**; ogni utente ne ha al massimo **10** aperte. Il kernel tiene gli ultimi **1 MB** di schermo e, a chi si ricollega, ridà i modi del terminale (schermo alternativo, mouse, tasti del cursore) e poi i byte: `vim` e `htop` tornano com'erano. Le sessioni non sopravvivono a un riavvio del kernel.
- **Un WebSocket scritto da noi, senza librerie.** Lo schermo e i tasti passano da un WebSocket (`system/kernel/src/ws.js`, RFC 6455: messaggi di testo e binari, anche frammentati, ping e pong, chiusura; niente estensioni né sottoprotocolli). Il kernel ha un `Router` per le richieste `upgrade` accanto a quello normale.
- **Chi apre il WebSocket è la pagina, non l'app.** Le app isolate non hanno rete: la pagina di lilOS apre il WebSocket e lo dà all'app come `MessagePort` (`lilos.term.attach`), con byte binari per lo schermo e i tasti e JSON per il resto. I canali si chiudono con la finestra; le sessioni restano.
- **Un WebSocket vuole un `Origin` permesso.** Il browser lo apre verso qualunque sito con i cookie dell'utente e non può aggiungere `X-Lilos`: `checkSocketOrigin` (`http.js`) rifiuta una richiesta senza `Origin`, o con uno che non sia tra quelli permessi o l'indirizzo stesso del kernel (CSWSH).
- **Le password non salvate le chiede il terminale.** Se l'utente non ha scelto di ricordarla, la password (o la passphrase della chiave) la chiede il server nel terminale stesso, come fa `ssh` (`ctx.ask`): non passa da un modulo della pagina. Quelle salvate sono cifrate nel kernel (`net/secrets.js`) e non tornano mai alla pagina.
- **Le chiavi dei server si confermano sulla pagina** e si ricordano per utente, per protocollo, host e porta (`known` nel file dell'utente); se cambiano, l'avviso è più forte (`changed`, con l'impronta di prima). Come per la Rete, prima di mandare le credenziali.
- **Host salvati per utente** in `DATA_DIR/term/<utente>.json`, in cartelle scelte dall'utente. Al massimo 200.
- **SUPDUP si traduce dentro il suo modulo.** Il server parla il suo schermo (ITS, codici %TD); il modulo lo converte in sequenze xterm e i tasti in caratteri SUPDUP, così la pagina e l'app non conoscono SUPDUP. Provato con KA ITS 1652 (progetto PDP-10/its).
- **Apri terminale SSH qui.** Nel File Manager, dentro una connessione SFTP, una voce dell'app (`when.net: ['sftp']`) apre una sessione sullo stesso server, in quella cartella, con le credenziali della connessione e la chiave del server già confermata (`Network.credentials`, che la pagina non vede).
- **Fuori dalla prima versione:** inoltro delle porte SSH, agente SSH, host di salto.

**Perché** (ricostruzione, da confermare)**.**

- **Il browser non apre connessioni SSH né Telnet**, e una sessione deve poter durare più di una pagina: il kernel è già il posto delle connessioni lunghe e dei segreti (come per la Rete).
- **Sessioni nel kernel** perché un terminale è un lavoro in corso: un `make` o un `vim` non possono morire con una scheda del browser. Il tempo limite (10 minuti) e il tetto (10 sessioni) evitano che connessioni dimenticate restino aperte per sempre.
- **xterm.js e non un terminale nostro** perché emulare bene xterm (colori, mouse, schermo alternativo, Unicode largo, incolla protetto) è un lavoro enorme, e xterm.js è lo standard con licenza MIT. Dentro l'app e non nell'SDK perché pesa e serve a una sola app.
- **WebSocket e non SSE più POST** perché lo schermo e i tasti sono un flusso in due sensi con pochissima latenza e byte binari: SSE è solo testo e in un solo senso, e ogni tasto sarebbe una richiesta HTTP. Scritto a mano perché il protocollo che servono i browser è piccolo e il kernel finora non ha dipendenze (il suo `package.json` non ha librerie; i moduli sì).
- **Il WebSocket lo apre la pagina** perché è lei che ha il cookie dell'utente e la rete; l'app isolata non deve avere né l'uno né l'altra, e così il permesso `term` basta.
- **Chiedere la password nel terminale** perché un server può chiederla in ogni momento e in più modi (password, codice monouso, passphrase): un modulo della pagina dovrebbe conoscerli tutti. Così il flusso è quello di `ssh` e il segreto resta fuori dalla pagina.
- **SUPDUP tradotto nel modulo** per tenere un solo emulatore, quello di xterm.js: l'app non sa quale protocollo c'è dall'altra parte.

**Alternative scartate** (ricostruzione, da confermare)**.** Un emulatore scritto da noi (troppo lavoro, e peggiore); xterm.js nell'SDK (peso per chi non lo usa); SSE per lo schermo e POST per i tasti (lenti, solo testo, una richiesta per tasto); una libreria WebSocket (una dipendenza nuova per un protocollo piccolo); sessioni solo nella pagina (muoiono con la scheda); sessioni che restano per sempre (connessioni dimenticate, risorse del server); un'app di sistema invece che dell'AppStore (non serve a tutti, e ha moduli da installare); aprire il WebSocket dentro l'app isolata (le servirebbero rete e cookie); chiedere la password in un modulo della pagina (passerebbe dalla pagina); collegarsi con un client `ssh` del sistema (dipende da quello che c'è sul computer e non da noi).

**Conseguenze.**

- I moduli `term-*` sono attivi nel `config.json` di sviluppo; altrove vanno aggiunti a `modules` o installati dall'AppStore (scheda Kernel). Senza, l'app dice che non ci sono protocolli. `npm run kernel:setup` installa ssh2 per `term-ssh`.
- Nuova rotta `GET /api/term/sessions/:id/socket` e un controllo dell'`Origin` che gli altri endpoint non hanno; in sviluppo il proxy di Vite deve inoltrare i WebSocket (`ws: true`).
- Un nuovo permesso `term` per le app (`install`), un nuovo `when.net` nelle voci di menu delle app, e `lilos.term.*` nel ponte.
- Un'app con `term` può aprire sessioni verso qualunque server che il kernel raggiunge (valgono le regole di `net/guard.js`) e usare gli host salvati dell'utente con le loro password: è un permesso da concedere con cautela.
- Le sessioni non si salvano: un riavvio del kernel (anche per un aggiornamento) le chiude.
- Telnet, rlogin e SUPDUP non cifrano; l'app lo dice nel dialogo dell'host e nella barra di stato.
- Il tasto Incolla non può leggere gli appunti dentro un'app isolata ([la stessa ragione di Ctrl V](../utente/guida.md#isolate-e-non-isolate)): si incolla con Ctrl+Maiusc+V, che dà al browser il gesto dell'utente.

**Non ancora fatto.** Inoltro delle porte SSH, agente SSH, host di salto; ridimensionare lo schermo con SUPDUP (il protocollo non lo permette); i dati urgenti di rlogin (Node non li vede); la porta privilegiata di rlogin fuori da Windows e dall'utente root.

**Quando ripensarla.** Se servono sessioni che sopravvivono a un riavvio del kernel (allora vanno tenute in un processo a parte, come `tmux`), se un altro canale in due sensi oltre al terminale giustifica una libreria WebSocket vera (compressione, sottoprotocolli), se arrivano protocolli i cui byte non sono xterm e non si possono tradurre dentro il modulo, o se il tempo di 10 minuti si dimostra troppo corto o troppo lungo.

**Aggiornamento (2 novembre 2026): l'app Terminale remoto è entrata nel Terminale.** Deciso con l'utente il giorno dopo la prima versione. Il client dei terminali remoti non è più un'app a parte: è il **Terminale** di sistema (`terminal` 1.2.0, repository ufficiale; serve lilOS 1.12.0 e, oltre ai permessi di prima, `term` e `ui.menus`). Sono cambiate l'app e l'interfaccia; il kernel, i moduli `term-*`, `lilos.term`, il permesso `term` e tutto il resto di questa decisione restano come sopra.

- **Ogni shell è una scheda** (**+** ne apre una nuova nella stessa cartella). La shell locale non cambia e ha il suo disegno dello schermo; **xterm.js è usato solo nelle schede remote** (scelta dell'utente: la shell locale non ne ha bisogno e non paga il suo peso).
- **I comandi `ssh`, `telnet`, `rlogin` e `supdup` aprono la sessione in una scheda nuova** (scelta dell'utente), e la shell scrive «Aperta in una scheda nuova: …». Al posto dell'indirizzo si può dare il nome di un host salvato. Il comando `sessions` elenca le sessioni remote ancora nel kernel; `sessions <n>` ne mostra una in una scheda.
- **Host e sessioni** stanno in una barra laterale (Host in cartelle, **Ancora attive** con Riprendi). Le sessioni e gli host stanno nel kernel e non cambiano: chi aveva Terminale remoto ritrova tutto. Chiudendo la finestra le sessioni remote restano 10 minuti, le shell finiscono.
- **La chiave del server si conferma in una finestra di messaggio di lilOS** (Annulla / Continua; con l'icona di errore e «Continua solo per fidarti della nuova chiave» se è cambiata) e non più in un dialogo dell'app.
- **«Apri terminale SSH qui»** è ora un'azione del Terminale (`terminal.sshHere`, `when.net: ['sftp']`).
- **Terminale remoto è tolto dal catalogo** (`remote-terminal`), senza un aggiornamento di congedo: chi l'aveva installata la disinstalla.
- **Perché** (ricostruzione, da confermare)**:** per l'utente un terminale è uno solo; avere "il terminale" e "il terminale remoto" separati voleva dire due finestre, due elenchi di schede e due modi di aprire SSH, mentre il Terminale aveva già i comandi `ssh` e simili che rimandavano all'altra app.
- **Correzione nel kernel: `term-ssh` 1.0.1.** Se l'utente impiegava più di 20 secondi a confermare la chiave del server, il timer della connessione chiudeva la connessione e la risposta in ritardo faceva lanciare un errore a ssh2 fuori dal processo del kernel, che si fermava del tutto. Ora il timer si ferma quando il server risponde e una risposta in ritardo è ignorata. I moduli si prendono dal catalogo ufficiale: per i nuovi usi non serve una versione di lilOS.

## D62. I collegamenti: un tipo di nodo di lilOS, una scorciatoia per il kernel

**Decisione.** Un collegamento sulla scrivania è un nodo del file system di lilOS di tipo `link`, che punta a un file o una cartella della home (`{ home: id }`) o di una connessione di rete (`{ mount, path }`), oppure a una pagina web (`{ url, kind: 'web' }`). Il kernel lo conserva come una **scorciatoia a un'app** (tipo `app` con `link` nei metadati): database e moduli `fs-*` non cambiano. Deciso con l'utente e costruito il 2 novembre 2026 (lilOS 1.13.0, SDK 0.7.0, File Manager 1.12.0).

- **Come si fa.** «Aggiungi un collegamento al desktop» nel menu di file, cartelle (anche di rete) e connessioni; «Nuovo → Collegamento…» sulla scrivania e «Nuovo collegamento…» nel File Manager (punto d'ingresso `newLink`). Un collegamento di un collegamento punta all'originale.
- **Dove sta il codice.** `sdk/core/fs.js` (il tipo, `cleanLink`, `update(id, { broken })`), `system/kernel/src/api/home.js` (la traduzione nei due sensi), `src/items/deskLinks.js` (creare, aprire, controllare; esportato da `@lilos/system`).
- **Si apre cercando l'originale.** Nella home per id, quindi segue spostamenti e rinomine. In rete per percorso, leggendo il server cartella per cartella (nome esatto, poi senza maiuscole e minuscole). Se la connessione chiede la password o la conferma del server, il collegamento passa al File Manager, che la chiede e poi lo apre.
- **Originale non trovato** (cestino, eliminato, percorso sparito, connessione rimossa): messaggio con il motivo e segno «rotto» (`broken`) sul collegamento; ritrovato, il segno sparisce. **Server irraggiungibile:** messaggio con Riprova, e il collegamento non viene segnato, perché l'originale potrebbe esserci.
- **Percorsi senza stile Windows.** La finestra «Nuovo collegamento» accetta percorsi di lilOS e indirizzi con il protocollo (`sftp://`, `smb://`, `webdavs://`…), sempre con `/`. Una `\` è rifiutata con un messaggio; se un protocollo la vuole, la converte il suo modulo mentre parla con il server. Niente `C:/…` e niente UNC.
- **L'originale deve esistere** quando si crea il collegamento (per un server viene letto): il tipo (file o cartella) viene da lì.

**Perché.**

- **Il kernel non ha un nuovo tipo.** I moduli del kernel si aggiornano separatamente dal core: un tipo nuovo nel `CHECK` del database (o nei moduli `fs-*`) avrebbe rotto le installazioni con un `fs-postgres` vecchio. Una scorciatoia sa già viaggiare senza contenuto, e gli utenti del file system del kernel (trasferimenti, servizi delle app) già la lasciano stare.
- **Per id nella home** perché è ciò che rende il collegamento solido contro rinomine e spostamenti; **per percorso in rete** perché un server non dà id stabili.
- **Non segnare rotto quando il server non risponde**, perché un errore di rete non dice che l'originale non c'è: segnarlo farebbe perdere all'utente la fiducia nel segno.
- **Solo `/`** per scelta dell'utente: una regola sola, uguale per tutti i protocolli, senza ambiguità tra `\` e caratteri dei nomi.

**Alternative scartate.**

- **Un tipo `link` anche nel database e nei moduli `fs-*`.** Più pulito ma rompe i moduli già installati; si può rifare quando i moduli e il core si aggiornano insieme.
- **Un file con un metadato** (un `.txt` o un `.lnk` con dentro la destinazione). Sarebbe un file vero: lo si leggerebbe, copierebbe e cercherebbe come tale, e un collegamento non è contenuto.
- **Percorsi stile Windows e UNC** (`C:\…`, `\\server\condivisione`). Rifiutati dall'utente.
- **Cercare l'originale per id anche in rete.** I server non danno id che restino uguali.

**Conseguenze.**

- Il nodo `link` esiste solo lato lilOS: chi legge il file system dal kernel o dai moduli vede una scorciatoia `app` con `link` nei metadati.
- Un modulo `fs-*` o una funzione del kernel che mostri le scorciatoie `app` come app deve guardare `meta.link`.
- L'icona non si aggiorna da sola se l'originale sparisce: resta com'era finché non si apre il collegamento.
- Non c'è un test automatico per i collegamenti (verificati a mano).
- Chi mostra i nodi per tipo (app di sistema, app installate) deve conoscere `link`.

**Quando ripensarla.** Se il database e i moduli `fs-*` si aggiornano insieme al core (allora un tipo vero è più pulito), se servono collegamenti a cose che non sono file, cartelle o pagine web (app, comandi), o se i server danno identificatori stabili da usare al posto del percorso.

## D63. Google Drive, Google Foto, S3, Azure e NFS: moduli da installare, accesso incollando l'indirizzo e un client NFS nostro

> Aggiornata da [D70](#d70-accesso-ai-fornitori-server-confermati-e-file-json-nel-kernel-i-moduli-si-possono-fondere): da lilOS 1.22.0 il progetto Google e l'app Microsoft sono del kernel (uno per fornitore), e Google Drive e Google Foto sono un solo modulo, `netfs-google`.

**Decisione.** Cinque nuovi protocolli della Rete, ognuno un modulo del repository ufficiale (`netfs-gdrive`, `netfs-gphotos`, `netfs-s3`, `netfs-azblob`, `netfs-nfs`), **solo nel catalogo**: un'installazione nuova non li ha, l'amministratore li installa dall'AppStore. Nessuno ha dipendenze. Deciso con l'utente il 2 novembre 2026 (render `design/rete-cloud.html`), costruito lo stesso giorno sul ramo `cloud`.

- **Google: il progetto è di ogni installazione**, come l'app Azure di OneDrive ([D60](#d60-onedrive-nella-rete-laccesso-con-la-finestra-del-fornitore-e-le-impostazioni-dei-moduli)). Google vuole anche un **segreto client**: le impostazioni dei moduli hanno ora i campi `password`, tenuti cifrati in `config.json` e mai rimandati alla pagina.
- **L'accesso si fa nella finestra, oppure incollando l'indirizzo.** Google rimanda la finestra solo a `https://` con un nome di dominio o a `localhost`. Altrove la pagina del fornitore si apre in una scheda, finisce su `http://127.0.0.1:53682/` (una pagina che non si apre) e l'utente ne incolla l'indirizzo in lilOS (`signIn.manual`, `POST /api/net/signin/:id/paste`). Con un client Google di tipo «App desktop» è sempre così (`signIn.onlyManual`). Vale anche per Azure con Microsoft Entra.
- **Due moduli Google separati**, Drive e Foto, ognuno con le sue impostazioni (possono usare lo stesso progetto).
- **Documenti Google copiati in formato Office** (`.docx`, `.xlsx`, `.pptx`); l'amministratore può scegliere OpenDocument o PDF. Nel contratto dei protocolli sono elementi `web` con `export`; il doppio clic li apre su Google.
- **Google Foto: importare in una cartella di lilOS.** Dal 31 marzo 2025 Google non fa leggere la libreria alle app: si scelgono le foto nel Picker di Google (`importer` del protocollo) e il kernel le copia nella cartella scelta (di serie `~/Immagini/Google Foto/<data ora>`). Gli album creati da lilOS sono le cartelle della connessione; le foto non si eliminano né si rinominano (Google non lo permette): si tolgono dall'album.
- **Niente link temporanei** per S3 e Azure.
- **NFS: UID e GID li assegna sempre l'amministratore**, per ogni utente di lilOS (impostazione `identities` del modulo), anche con un solo utente: gli utenti non li scrivono. Senza assegnazione la connessione non si apre. **Kerberos** e **NFSv4.1** si vedono nella finestra ma non si scelgono (`options[].disabled`).
- **La libreria NFSv3 è nostra e sta solo nel modulo** (`lib/`): XDR, ONC RPC su TCP, portmapper, MOUNT v3, NFS v3.
- Aggiunte generiche al contratto: `group` (Server, Cloud, Rete locale nell'elenco), elementi con `web`/`export`, `badge`, `can`, `removeLabel`, `removeText`; sessioni con `space()` e `importer`; `user` in `connect`.

**Perché.**

- **Solo nel catalogo** perché sono servizi che la maggior parte delle installazioni non usa, e Google e Azure chiedono un progetto o un'app registrati dall'amministratore: un modulo attivo ma «non pronto» in ogni lilOS sarebbe rumore. Chi li vuole li installa.
- **Incollare l'indirizzo** perché molti lilOS sono aperti dalla rete locale su `http://`, e Google non accetta quell'indirizzo di ritorno: senza questa via Google Drive funzionerebbe solo con un dominio e un certificato. Il codice che l'utente incolla non basta da solo a nessuno: il `verifier` PKCE e il segreto stanno nel kernel.
- **Il segreto client cifrato** perché Google lo chiede anche con PKCE, e in `config.json` in chiaro finirebbe nelle copie di sicurezza.
- **UID e GID dall'amministratore** perché con AUTH_SYS il server crede ai numeri che riceve: chi può sceglierli può leggere i file di chiunque su quel server. Deciderli è un atto di chi amministra, non di chi si collega.
- **Una libreria NFS nostra** perché su npm non c'è un client NFS in JavaScript (`node-nfsc` è nativo e solo per Linux, `node-nfs` di Joyent fa il server) e montare dal sistema operativo vuole privilegi e non c'è su Windows Home.
- **Firme fatte da noi** (SigV4 per S3, Shared Key per Azure) perché gli SDK ufficiali pesano decine di MB per poche richieste.

**Alternative scartate.**

- Moduli attivi di serie in ogni nuova installazione; un solo modulo `netfs-google` con i due protocolli; il formato dei documenti Google scelto da ogni utente; link temporanei (URL prefirmati e SAS); UID e GID scritti da ogni utente; pubblicare la libreria NFS come pacchetto a parte; una cartella temporanea «Scelte» in Google Foto da cui trascinare (decisioni dell'utente).
- L'accesso a codice di Google (dispositivi con input limitato): non dà l'ambito `drive` completo.

**Conseguenze.**

- Servono lilOS 1.14.0 (kernel e SDK 0.8.0), File Manager 1.13.0 e Pannello di controllo 1.15.0 (schede Google Drive, Google Foto, Azure Blob Storage, NFS). netfs-onedrive 1.1.0 dà anche lo spazio usato.
- Google: un'app non verificata con l'ambito `drive` ha al massimo 100 utenti e in «Test» l'accesso scade dopo 7 giorni (va pubblicata, o «Interno» con Workspace). La prima volta Google avvisa che l'app non è verificata.
- In S3 e Azure senza spazio dei nomi gerarchico rinominare una cartella copia ogni file sul server; NFS sostituisce il file di destinazione in `RENAME`, quindi il driver controlla prima.
- NFS: molti server vogliono una porta sotto 1024; il kernel la ottiene su Windows o con privilegi, altrimenti il server va configurato `insecure`.
- Le dimensioni che il fornitore non dice (foto di Google Foto, documenti esportati) sono 0 finché la copia non finisce.
- Provati con server finti o in Docker (Google finto, RustFS per S3, Azurite, NFS-Ganesha): mai contro i servizi veri.

**Quando ripensarla.** Se Google riapre la lettura della libreria di Foto; se serve Kerberos (con quello di SMB) o NFSv4.1 (AWS EFS, Azure Files NFS); se un fornitore offre notifiche dei cambiamenti senza un indirizzo pubblico; se il codice comune dei moduli (OAuth, firme, XML) conviene metterlo in un pacchetto condiviso.

## D64. Le automazioni: operazioni con un senso, dichiarate dalle app

**Decisione.** lilOS registra quello che l'utente fa e lo rifà, con l'app **Automata** (id `automata`). Deciso con l'utente e costruito il 2 novembre 2026; rilasciato con lilOS 1.15.0 (SDK 0.9.0).

Le scelte prese con l'utente:

- **È un'app di sistema** (repository ufficiale, `system: true`), non un modulo del kernel né una funzione della pagina: l'interfaccia (editor, registratore, esecuzione) è l'app; il resto sta in lilOS perché ha bisogno del sistema.
- **Le domande stanno nel passo.** Un passo può chiedere conferma prima di girare e chiedere i suoi valori; la risposta arriva quando il passo gira, non all'avvio dell'automazione. Anche i campi che l'utente non ha cambiato possono essere chiesti (di serie si chiedono per primi quelli cambiati).
- **L'avvio da solo (a un'ora, quando succede un evento) è rimandato.** Per ora si avvia a mano, dal menu dei file, da una scorciatoia o dal Terminale.
- **Un evento nuovo, `desk.place`**, per sapere dove l'utente mette le icone sulla scrivania; senza, lo spostamento delle icone non si poteva registrare.

Le scelte di struttura:

- **Si registrano operazioni con un senso, non clic e tasti.** Un passo è un'*azione* (`lilos.move`, `photo.resize`…) con parametri tipizzati. Le azioni di lilOS le definisce il sistema (`src/automation/actions.js`) e le trasforma in passi guardando gli eventi delle pipe ([D47](#d47-pipe-sugli-eventi-dati-delle-app-sui-file-e-filecrypt)) e le finestre che si chiudono; quelle di un'app le dichiara l'app nel manifesto (`contributes.automation`) e **racconta lei** cosa ha fatto l'utente, dopo averlo fatto (`automation.record`, `lilos.automation.record`). L'app non registra nulla da sola.
- **I parametri «cambiati» sono quelli diversi da quanto la finestra proponeva.** L'app dà i `defaults` e il passo ricorda quali valori l'utente ha cambiato: Automata li mostra e li chiede per primi. Senza `defaults` sono cambiati tutti i parametri tranne l'oggetto del passo (`subject`) e i segreti.
- **Le password non si registrano mai.** Un parametro `secret` si scarta quando si registra e il passo lo chiede ogni volta.
- **Il file creato da un'app è un passo solo.** Se un'app dice di aver fatto un file (`result`), il passo «Crea» che lilOS ha registrato per lo stesso file nei 5 secondi prima viene ritirato (`retracted: 'merged'`).
- **Annullare mentre si registra toglie il passo.** `UndoStack` ritira i passi registrati durante la voce che annulla e li rimette con «Ripeti» (`stepsBetween`, `retract`, `restore`). Quello che si registra è il risultato, non i tentativi.
- **Mentre lilOS rifà, non registra** (`automation.quiet`). Anche il Terminale esegue la riga dentro `quiet`: quello che la riga fa ai file è nel suo passo `terminal.run`, non registrato due volte.
- **Rifare vuol dire chiamare l'app, in due modi.** Le azioni con `target: 'window'` le fa la finestra dell'app che mostra il file del passo (`automation.handle`, solo app di sistema); se non c'è, lilOS apre il file con l'app e aspetta la finestra. Le azioni con `entry` le fa un punto d'ingresso dell'app, chiamato con `{ automation: { action, params }, files }` (Zip, FileCrypt: è l'unico modo per le app isolate). Le azioni di lilOS hanno una `run`.
- **L'automazione è un file `.automata`** (JSON, `src/automation/document.js`) nella home, di serie in `~/Automazioni`: si copia e si condivide come ogni file. Un file viene da chiunque, quindi si controlla sempre (`checkDocument`) prima di usarlo.
- **I nodi sono riferimenti, non id fissi.** Un passo dice `{ input }` (l'elemento su cui lavora l'automazione adesso), `{ step, index }` (ciò che ha fatto un passo prima) o `{ path, id }` (un nodo fisso). Con `input: 'files'` i passi si ripetono per ogni file scelto all'avvio: una stessa automazione serve per un file o per cento.
- **L'elenco** (`library.js`) rilegge i file `.automata` della home e dà la voce **Automazioni** al menu di file e cartelle, le scorciatoie (solo Ctrl o Alt, e libere: il file può venire da chiunque) e il comando `automata` del Terminale.
- **Il ponte per le app isolate è stretto.** `lilos.automation.record` accetta solo azioni dell'app, file che l'app ha ricevuto e, per `result`, file che può scrivere. Non serve un permesso: dire cosa si è fatto non dà accesso a niente.

**Perché** (ricostruzione, da confermare)**.**

- **Operazioni e non clic.** Registrare clic e tasti non funziona su una pagina fatta di finestre di app isolate (iframe), non si può rifare su altri file, e non permette all'utente di cambiare un valore: un passo con un nome e dei parametri sì.
- **L'app racconta.** Solo l'app sa cosa ha fatto davvero (il file creato, la dimensione scelta); lilOS vede gli eventi del file system, non le decisioni dentro una finestra. Le app isolate non si possono osservare dall'esterno.
- **Le domande nel passo** perché cosa chiedere dipende dal momento (il nome di ogni file, una conferma prima di eliminare), e un'unica schermata all'inizio non lo sa.
- **File e non una voce nelle impostazioni** perché le automazioni si condividono, si copiano e si tengono in cartelle come tutto il resto, e perché il formato (JSON) si legge e si ripara a mano.
- **Riferimenti** perché un'automazione registrata su `vacanza.jpg` deve funzionare su `compleanno.jpg`, e perché un file fatto da un passo non ha un percorso noto in anticipo.

**Alternative scartate** (ricostruzione, da confermare)**.** Registrare clic e tasti (fragile, non vale per le app isolate, senza significato per l'utente); un linguaggio di script (non per chi non programma); osservare le app da fuori (impossibile con l'isolamento); chiedere tutto all'avvio (non sa cosa chiedere); un modulo del kernel (la registrazione e le finestre sono della pagina); un permesso per registrare (non dà accesso a niente); un evento per ogni app invece di `contributes.automation` (il catalogo non sarebbe noto prima che l'app giri).

**Conseguenze.**

- Nuovo export dell'SDK, `automation` (0.9.0), e `automations` in `@lilos/system`. Nuovo evento `desk.place`; `trash.purge` ha anche `ids`; `UndoStack.push` ha un secondo argomento (`since`).
- Il manifesto ha `contributes.automation`; il kernel lo controlla (`manifest.js`) e `localizeManifest` traduce `@automation.…`.
- Le app ufficiali diventano registrabili un'azione per volta: Photo 1.3.0, Editor 1.4.0, File Manager 1.14.0, Terminale 1.3.0, Zip 1.1.0, FileCrypt 1.1.0. Automata 1.0.0 vuole lilOS 1.15.0.
- Un'automazione eseguita cambia davvero file e impostazioni: i passi che eliminano per sempre chiedono conferma di serie, ma non c'è un «annulla» unico.
- Nell'area di notifica c'è il pulsante **REC** mentre si registra; ricaricare la pagina perde la registrazione (vive nella pagina).
- Il file `.automata` è del primo formato (`version: 1`); `checkDocument` scarta i campi che non conosce.

**Non ancora fatto.** Il pennello e il testo di Photo; condizioni e cicli. L'avvio da solo, «Trova e sostituisci» e «Salva con nome» dell'Editor e la scelta di più file in un passo sono fatti: vedi l'aggiornamento qui sotto.

**Aggiornamento (2 novembre 2026): l'avvio da solo.** Deciso con l'utente e fatto nello stesso giorno (lilOS 1.17.0, Automata 1.1.0, Editor 1.5.0, File Manager 1.15.0; SDK invariato a 0.10.0). Le scelte:

- **Solo finché la pagina è aperta.** Gli avvii (`launch.triggers`: `time`, `every`, `login`, `folder`; `src/automation/triggers.js`) girano nella pagina, non in un servizio del kernel. Un'automazione usa le azioni delle app e le finestre, che esistono solo nella pagina; un servizio del kernel dovrebbe rifare tutto da capo e senza l'utente. Il prezzo: a lilOS chiuso non parte niente.
- **Una scheda per utente, con un Web Lock.** Con due schede aperte la stessa automazione partirebbe due volte. La scheda che prende il lock `lilos:automazioni:<utente>` fa il lavoro; chiusa, un'altra subentra. Il lock lo gestisce il browser, che lo rilascia anche se la scheda sparisce. Senza `navigator.locks` ogni scheda lavora (rischio di doppio avvio). La scheda che subentra dopo i primi 15 secondi non rifà gli avvii «all'accesso».
- **Quelle che chiedono qualcosa aprono la finestra.** Se un passo ha conferma, un campo da chiedere o «Chiedimi cosa fare», l'automazione si apre nella finestra «In esecuzione» di Automata: le risposte restano a chi è davanti (le conferme non si possono saltare in silenzio). Le altre girano senza finestra.
- **Notifiche.** Un errore si notifica sempre; una riuscita anche, tranne per `every`, che altrimenti riempirebbe le notifiche. Non c'è un registro delle esecuzioni oltre alle notifiche.
- **`catchUp` è una scelta dell'utente, spenta di serie.** Rifare all'accesso un'ora mancata può essere sbagliato (un'automazione delle 8 che parte alle 17 e sposta file) o giusto (un resoconto): decide chi la scrive. Senza, un `time` parte solo se lilOS è aperto entro 2 minuti dall'ora. Gli ultimi avvii stanno in `storage` (`automation-runs`); un motivo mai visto comincia solo a contare, così non parte appena aggiunto.
- **Nessun ciclo.** Gli eventi delle cartelle sono ignorati mentre gira un'automazione (`automation.quietNow`) e dentro `~/Automazioni`: un'automazione che salva nella cartella che osserva non si richiama da sola.
- **Orario, intervallo e accesso non hanno elementi:** `input: 'none'` (lo chiede l'interfaccia, non il file). `folder` funziona con `none`, `files` (i file arrivati) e `folder` (la cartella osservata).
- **La scorciatoia usa la selezione di dove sei.** La finestra attiva dice cosa ha selezionato con `win.selection` (convenzione documentata in `sdk/ui/Window.js`, senza API nuova; il File Manager la dà, e niente nel cestino), altrimenti la scrivania. Prima, con una finestra davanti, non c'era selezione.
- **Più file in un passo:** la finestra di esecuzione mostra l'elenco con «Aggiungi un file», «Aggiungi una cartella» e «Togli».
- **Editor 1.5.0:** «Trova e sostituisci» e «Salva con nome» (anche per i documenti nuovi). Si registrano `editor.replace` (alla pressione di «Sostituisci tutto») e `editor.saveAs` (con il file creato come risultato). Rifatto, `editor.saveAs` scrive sopra un file con lo stesso nome senza chiedere: un passo che gira non si ferma su una domanda, e il nome l'ha scelto l'utente registrando.

**Aggiornamento (lilOS 1.22.0, Automata 1.2.0): un solo orologio, quello della Pianificazione.** `time` ed `every` non partono più dalla pagina: a un'ora o ogni tanti minuti un'automazione è un'operazione della Pianificazione ([D68](#d68-la-pianificazione-un-modulo-obbligatorio-del-kernel-con-le-azioni-nel-kernel)), che tiene l'ora nel kernel e parte anche a lilOS chiuso (la corsa aspetta la pagina). `catchUp` è diventato `options.missed` (`'once'` o `'skip'`); la chiave `automation-runs` non serve più e si cancella. Automata 1.2.0 sposta i vecchi motivi in operazioni (quando si apre e dal suo punto d'ingresso `triggers`, che lilOS avvia all'accesso finché ne restano); `checkDocument` continua a leggerli, perché un'Automata più vecchia non li perda prima. Nella pagina restano `login` e `folder`. Un'automazione fatta partire dalla Pianificazione gira come quelle che partono da sole (`runByItself`): in silenzio, o nella finestra se chiede qualcosa; il suo esito, errori compresi, è nella cronologia dell'operazione, e le notifiche le decide `options.notify`.

Conseguenze: se tutte le schede si chiudono non parte niente; un'automazione con motivi letta da un lilOS precedente alla 1.17.0 li perde (`checkDocument` scarta i campi che non conosce); Automata 1.1.0 vuole la 1.17.0. Resta aperto il rischio che un'automazione che parte da sola e cancella o sposta file lo faccia senza che nessuno la guardi.

**Quando ripensarla.** Se serviranno avvii a lilOS chiuso (un servizio del kernel che rifà solo i passi senza finestre, con le domande messe da parte); se i parametri `value`, `tags` e `places`, per ora solo di lilOS, servono alle app; se i file `.automata` condivisi tra utenti pongono problemi di fiducia (oggi un passo può fare solo ciò che l'utente può fare, ma può farne molti).

## D65. I riconoscimenti delle librerie esterne: un elenco generato e controllato dal build

**Decisione.** Ogni libreria, font o strumento di altri autori che lilOS, le app di sistema o i moduli del kernel usano compare nel Pannello di controllo, in **Informazioni → Riconoscimenti**: nome, versione, licenza, riga di copyright, chi la usa (app, modulo del kernel, lilOS) e il link al sito. Regola dell'utente: vale per ogni dipendenza, da ora in poi, e si aggiunge nella stessa modifica che porta la dipendenza.

- **Da dove viene l'elenco.** `src/settings/credits.json` nel repository ufficiale, scritto da `scripts/credits.mjs` (`npm run credits`): le dipendenze delle app (`package.json` della radice) con quelle che si portano dietro, attribuite alle app che le importano; quelle dei moduli del kernel (`modules/*/package-lock.json`); il codice copiato (`VENDORED`: grammatiche Tree-sitter, smb3-client); i font di Google Fonts di lilOS e delle app (`FONTS`); gli strumenti di build (Vite). Licenza, copyright e sito si leggono da `node_modules`. I pacchetti di soli tipi (`@types/*`) restano fuori: nessun loro codice gira.
- **Il controllo.** `npm run build` (e `npm run check:credits`) confronta l'elenco con i `package-lock.json`, le `LICENSE` fuori da `node_modules` e i link a Google Fonts, senza bisogno di `node_modules`: si ferma se manca qualcosa o se c'è qualcosa che non si usa più.
- **Nel Pannello di controllo** (1.16.0) la scheda Informazioni ha due sottoschede, lilOS e Riconoscimenti; le librerie portate da altre librerie stanno in una sezione a parte, con quella che le porta.

**Perché.**

- **Generato, non scritto a mano**, perché le dipendenze indirette sono decine (87 librerie oggi) e cambiano a ogni aggiornamento: a mano l'elenco sarebbe sbagliato dopo il primo `npm update`.
- **Controllato dal build**, perché una regola che dipende dalla memoria di chi aggiunge la dipendenza prima o poi si salta.
- **Nel repository ufficiale**, perché lì stanno quasi tutte le dipendenze (lilOS non ne ha a runtime, solo i font) e lì c'è anche il rilascio di lilOS (`system/lilos`), da cui si leggono i font.

**Alternative scartate.**

- **Un file di riconoscimenti per ogni app o modulo**, letto dal Pannello di controllo per ciò che è installato. Più preciso, ma chiede un'API nuova per leggere file di altri pacchetti; le app ufficiali sono tutte in un repository e l'elenco unico basta.
- **Il testo completo di ogni licenza.** Pesante (decine di testi quasi uguali); c'è il link al sito, dove si trova.

**Conseguenze.**

- Prima di `npm run credits` servono `npm ci` nella radice e in ogni modulo con un `package-lock.json`.
- Codice copiato nuovo (una cartella con la sua `LICENSE`) va aggiunto a `VENDORED`, un font nuovo a `FONTS`: il build lo chiede.
- Un font o una libreria che entra nel core di lilOS viene vista solo quando il rilascio arriva nel repository ufficiale.
- Le app installate da altri repository non sono nell'elenco.

**Quando ripensarla.** Se le app di altri autori devono mostrare i loro riconoscimenti, o se lilOS prende dipendenze a runtime sue: allora un file per pacchetto, letto per ciò che è installato.

---

## D66. Terminale a riquadri: finestre staccate come finestre principali e password dei file `.term` cifrate dal kernel

**Decisione.**

- **Finestre staccate = finestre principali dell'app.** Il launcher dà alle app `openWindow(win, key?, { main?, at? })`. Con `main: true` la finestra è registrata con `app` = l'app (come quella aperta dal launcher), non come finestra secondaria. Le schede staccate di Terminale usano questa via: sono salvate e ripristinate da workspace, workarea e aggiornamenti, e alla riapertura l'export predefinito riceve il loro `getState()` come `args`. `at: { x, y }` (punto dello schermo) le mette dove è stata lasciata la scheda.
- **La password di un file `.term` è solo cifrata dal kernel.** Nuova rotta `POST /api/term/seal`: cifra i campi segreti con la chiave del kernel (`net/secrets.js`) e li lega all'utente, al protocollo e ai valori BOUND (`host` in minuscolo, `port` o la predefinita, `user`, `auth`, `tls`). `POST /api/term/sessions` accetta `sealed` e lo rifiuta (`forbidden`, 403) se è di un altro utente, di un altro lilOS, di un altro server o account o è rovinato. La pagina e le app non vedono mai la password in chiaro.
- **Senza password nel file** una connessione rapida usa quella di un host salvato con gli stessi valori BOUND (il più usato di recente).
- **Un `.term` che esegue un comando** chiede conferma la prima volta se non l'ha salvato Terminale su questo account (lo decide l'app).
- Nuovi: `cwd` e `name` in `POST /api/term/sessions`, `term.seal` nell'SDK (0.10.0), `lilos.term.seal` e i campi in più di `lilos.term.open` nel bridge, il tipo `term` in `fileTypes`.

**Perché.**

- **Finestre principali** perché una finestra secondaria appartiene a quella che l'ha aperta e non si ripristina da sola: staccare una scheda deve sopravvivere a ricarica e aggiornamenti come ogni altra finestra di Terminale, senza un meccanismo di salvataggio a parte.
- **Cifrare nel kernel** perché un file `.term` sta nella home, può essere copiato, condiviso o aperto da un altro utente: una password in chiaro (o cifrata con un segreto che la pagina conosce) sarebbe una fuga. Legata a utente, lilOS, server e account, una copia del file non apre niente altrove e non può puntare la password a un altro server.

**Alternative scartate.**

- Password in chiaro nel file; cifrata nella pagina con una chiave dell'app; non salvarla mai (scomodo per i collegamenti che si usano ogni giorno).
- Un secondo punto d'ingresso nel manifesto per le finestre staccate.

**Conseguenze.**

- Serve lilOS 1.16.0 (SDK 0.10.0) e Terminale 1.4.0.
- Cambiare host, porta, utente, tipo di accesso o TLS rende il `sealed` inservibile: la password va salvata di nuovo. Cambiare la chiave del kernel (`secret.key`) fa lo stesso per tutti i file.
- La conferma dei comandi è dell'app, non del kernel: il kernel non sa cosa c'è in un `.term`.

**Quando ripensarla.** Se serve condividere un collegamento con la password tra utenti; se le finestre secondarie imparano a ripristinarsi da sole.

---

## D67. Arduino: la porta seriale la apre il browser, la compilazione la fa il kernel

**Decisione.**

- **La porta seriale la apre la pagina di lilOS**, con Web Serial, e passa all'app un canale `MessagePort` (`serial` nell'SDK 0.11.0, `lilos.serial` con il permesso `serial`). Le app isolate (iframe `sandbox` con origine opaca) non hanno Web Serial: la pagina apre la porta e dà loro il canale, come per `lilos.term.attach` ([D61](#d61-i-terminali-remoti-le-sessioni-vivono-nel-kernel-un-websocket-nostro)). Il canale porta i byte; DTR, RTS e break sono messaggi JSON, con `done` per sapere quando una scrittura è finita (serve al reset della scheda).
- **La compilazione e i suggerimenti li fa il kernel**, nel modulo `arduino` 1.0.0: scarica `arduino-cli` 1.5.1, `arduino-language-server` 0.7.7 e `clangd` 14.0.0 controllandone l'SHA-256, compila, gestisce i pacchetti delle schede (uno solo per tutti) e le librerie (per utente). La preparazione la fa un amministratore. I suggerimenti passano da un WebSocket del modulo.
- **Nuovi pezzi generici**, usabili da altri moduli e app: `ctx.socket(path, handler)` e `ctx.dataDir` per i moduli del kernel (`<dati>/modules-data/<nome>`, che sopravvive alle versioni del modulo); `kernel.channel` e `kernel.module(nome)` nell'SDK; `lilos.kernel.request` e `lilos.kernel.channel` nelle app, con il permesso `kernel:<modulo>`. Entrambi i permessi nuovi sono di livello `install`.
- **Il modulo difende il computer del kernel.** Un filtro, che legge il testo come il preprocessore (fine riga `\r`, `\r\n`, `\n`; continuazioni di riga anche con spazi; commenti, stringhe, raw string, digrafo `%:`), rifiuta `#include`/`#import`/`#embed` (e `__has_include`) con percorso assoluto, con `..` o fatti da una macro, l'assembler inline e `.incbin`/`.include`, i file `.s`/`.S`, i nomi che arduino-cli legge come opzioni (`build_opt.h`, `build_extra_flags.h`, `platform*.txt`…) e `ldflags`/`precompiled` in `library.properties`; il server dei suggerimenti riceve i testi con le stesse parti cancellate, solo i metodi LSP che servono e un `initialize` riscritto sulla cartella dello sketch. I programmi girano con un ambiente ridotto (niente variabili del kernel). Le app non raggiungono `/update` e `/settings` di un modulo (sono la sua gestione da parte di un amministratore). Impostazione `dataPath` per mettere i dati in una cartella corta: su Windows `avr-gcc` non legge percorsi oltre 260 caratteri.
- **App ArduinoIDE** 1.0.0 (categoria Sviluppo; prima nel repository ufficiale, dal 2 novembre 2026 nel repository community [lilos-plugins-community](https://github.com/GexyLab/lilos-plugins-community) insieme al modulo `arduino`, con la sua documentazione; dalla 1.0.1 si chiama **ArduinoIDE4LilOS**, con lo stesso id `arduino-ide`): editor CodeMirror 6, Verifica, Carica con il protocollo STK500 v1 (Uno, Nano) e v2 (Mega) scritto in JavaScript, monitor seriale, gestore delle librerie, esempi. Sketch in `~/Arduino`, librerie proprie in `~/Arduino/libraries`.

**Perché.**

- **La scheda sta attaccata al computer dell'utente**, mentre il kernel può essere su un server o nel cloud: solo il browser vede quella porta. Caricare dal kernel avrebbe funzionato solo con kernel e utente sullo stesso computer.
- **Il compilatore sta nel kernel** perché è pesante (centinaia di MB), non si può eseguire nel browser e serve identico a tutti.
- **Il canale `MessagePort`** perché è lo stesso contratto del terminale: l'app isolata non ottiene mai l'oggetto `SerialPort`, quindi non può tenerlo dopo la chiusura della finestra (i canali si chiudono con la finestra) né aprire altre porte che l'utente non le ha fatto scegliere.
- **Permessi nuovi e non un permesso solo**, perché `serial` dà accesso a dispositivi dell'utente e `kernel:<modulo>` a un modulo preciso: chi installa vede quale.

**Alternative scartate.**

- Caricare dal kernel (la scheda dovrebbe stare sul suo computer).
- Un programma da installare sul computer dell'utente che faccia da ponte.
- Dare `navigator.serial` alle app non isolate: funzionerebbe solo per quelle, e le isolate (la modalità predefinita) resterebbero fuori.
- Compilare nel browser (WebAssembly): il compilatore AVR e le librerie non ci sono in una forma utilizzabile.
- Un permesso `kernel` unico per tutti i moduli: un'app di terze parti potrebbe chiamare moduli di sistema.

**Conseguenze.**

- Per caricare e usare il monitor servono Chrome, Edge o Firefox 151+, e `https` o `localhost`; Safari no. Scrivere e verificare vanno in ogni browser.
- Il browser chiede all'utente di scegliere la porta, una volta per porta e per sito; `request` vale solo subito dopo un clic o un tasto.
- Un'app con il permesso `serial` può parlare con qualunque dispositivo seriale che l'utente le fa scegliere; con `kernel:<modulo>` può chiamare tutto ciò che quel modulo espone. Il controllo di chi può cosa è del modulo (`ctx.route` e `ctx.socket` accettano solo utenti con l'accesso fatto, nient'altro).
- Il modulo scrive in `modules-data/` fuori dalla cartella della versione: un aggiornamento del modulo non butta via i pacchetti scaricati. Rimuovere il modulo non li cancella.
- Il filtro non è una sandbox: il compilatore gira con i diritti del kernel, e le librerie installate dall'indice di Arduino non passano dal filtro. Su un server con utenti non fidati il kernel va eseguito come un utente che non può leggere niente di segreto.
- Serve lilOS 1.18.0 (SDK 0.11.0), ArduinoIDE 1.0.0 e il modulo `arduino` 1.0.0.

**Quando ripensarla.** Se arrivano altre schede (ESP32, RP2040: protocolli e strumenti diversi, gli strumenti sono molto più grandi); se Web Serial diventa disponibile nelle sandbox (allora basta passare la porta); se serve compilare senza un kernel; se il modulo va aperto a utenti non fidati (allora il compilatore va chiuso in una sandbox del sistema operativo).

---

## D68. La Pianificazione: un modulo obbligatorio del kernel, con le azioni nel kernel

**Decisione.**

- **Un modulo, ma obbligatorio.** Le operazioni a una data e ora o ripetute stanno nel modulo `scheduler` (servizio `scheduler`), non nel nucleo del kernel. Il modulo tiene le operazioni, l'orologio e lo storico e non sa cosa fa un'operazione. È però **obbligatorio**: `REQUIRED_MODULES` in `modules.js`, `"required": true` nel `module.json`. Viene con lilOS (`system/kernel/modules/` del repository e di ogni release, portato da `scripts/release.mjs`), il kernel lo rimette in `modules/` e nella configurazione se manca o se la release ne ha uno più nuovo (`ensureRequiredModules`), e `ModuleAdmin` rifiuta di toglierlo. Si aggiorna come gli altri moduli.
- **Le azioni le fa il kernel.** Promemoria, servizio di un'app, copia di una cartella, richiesta web e comando del Terminale girano nel kernel (`system/kernel/src/schedule/`), come l'utente proprietario, anche a lilOS chiuso. Il kernel controlla l'azione (`what.js`) prima che il modulo la salvi: nel modulo non c'è niente di fidato da interpretare.
- **Le azioni del browser passano da un `claim`.** Aprire un'app o un file e far partire un'automazione (Automata) si può fare solo in una pagina. Il kernel manda `schedule.due` alle pagine del proprietario; la **prima** che fa `claim` la esegue e riferisce con `report`. Senza pagine aperte la corsa resta `waiting` e, quando lilOS si apre, parte o chiede (`options.ask`, finestra «Operazioni in attesa»), finché non scade (`catchUpHours`).
- **Un motore di regole nostro, senza dipendenze.** `sdk/core/scheduleRules.js` (senza `import`) controlla le regole, calcola le volte nei fusi orari con l'ora legale, le dice in parole e le dà come RRULE di iCalendar. È lo stesso codice nel kernel, nella pagina (l'editor) e nelle app (i calendari).
- **Gli amministratori possono tutto, e il proprietario lo sa.** Un amministratore vede e cambia le operazioni di tutti e quelle del sistema e può crearne per un altro utente («Esegui come»). Ogni volta che agisce su un'operazione altrui il proprietario riceve una notifica (`tellOwner`). Non c'è un'approvazione.
- **Un aggancio per un calendario separato.** Il calendario non è nel sistema. Le app con `schedule.read` leggono le operazioni (`tasks()` con `recurrence`: la regola come RRULE di RFC 5545, con `exdate` e `rdate`; `occurrences`), con `schedule.move` spostano il *quando* (`move`), e i punti d'ingresso `edit`, `create` e `history` della Pianificazione aprono la finestra di modifica, di creazione già compilata e dello storico. Le app con solo `schedule` pianificano le *proprie* cose: promemoria, i propri servizi, aprirsi.
- **Il comando del Terminale gira con la shell del Terminale, nel kernel.** L'app Terminale 1.5.0 ha il servizio `shell` (`src/terminal/kernel/`), impacchettato con la shell e i suoi comandi in un modulo senza `import`. Lavora sulla home con un piccolo `fs` suo (`kfs.js`), costruito su `lilos.home` (`load`, `sync`, `read`, `write`) del servizio `services-isolate` 1.1.0, e non con l'`fs` dell'SDK. Su un host SSH salvato il comando passa da `Terminals.exec`.
- **Rapporto con l'avvio da sola di Automata ([D64](#d64-le-automazioni-operazioni-con-un-senso-dichiarate-dalle-app)).** Le automazioni di Automata partono da sole (a un'ora, ogni tot minuti, all'accesso, all'arrivo di file: `launch.triggers`, `src/automation/triggers.js`), ma **nella pagina**: solo con lilOS aperto, in una scheda per utente (Web Lock), con la volta persa recuperata all'accesso se il motivo lo chiede. La Pianificazione è nel kernel e gira anche con lilOS chiuso; la sua azione `automation` fa partire un'automazione **nel browser** (`launch('automata', …, 'run')`, senza file), con le stesse condizioni di una pagina aperta. I due meccanismi non si conoscono: la stessa automazione fatta partire con tutti e due parte due volte. Le regole di tempo della Pianificazione (mesi, ultimo giorno, cron, fasce, fusi orari, ora legale) non sono quelle semplici di Automata, che resta l'unica a partire all'arrivo di file e all'accesso.
  *Da lilOS 1.22.0 (Automata 1.2.0) l'orologio è uno solo:* a un'ora o ogni tanti minuti le automazioni partono solo dalla Pianificazione (Automata vi sposta i vecchi `time` ed `every`; `catchUp` è `options.missed`), e la sua azione `automation` le esegue come quelle che partono da sole (`runByItself`: in silenzio, o nella finestra se chiedono qualcosa), con l'esito vero nella cronologia. Nella pagina restano `login` e `folder`. Vedi l'aggiornamento di D64.
- Nuovi: l'export `schedule` dell'SDK (0.12.0), `lilos.schedule` e i permessi `schedule`, `schedule.read`, `schedule.move`, `fs.external` con `trash` e spostamenti, `lilos.home` e la reason `'schedule'` dei servizi, `AppServices.runScheduled`, `Terminals.exec`, le rotte `/api/schedule…`. L'AppStore 1.7.0 usa la Pianificazione per «Controlla gli aggiornamenti».

**Perché.**

- **Un modulo** perché la Pianificazione è un servizio con i suoi dati (`scheduler.json`, `history.json`), il suo orologio e un ciclo di aggiornamento che non c'entrano con il resto del kernel; come modulo si aggiorna dall'AppStore e si prova da solo, e il nucleo del kernel non cresce. **Obbligatorio** perché ormai ci contano altre cose: la Pianificazione è un'app necessaria a lilOS, l'AppStore controlla gli aggiornamenti con lei e le app la danno per scontata. Un lilOS in cui «può non esserci» costringerebbe ogni app a gestire due strade. Per questo il modulo è nella release e il kernel lo rimette: non dipende dal repository ufficiale né dalla rete.
- **Le azioni nel kernel** perché lo scopo è che le cose accadano anche con il browser chiuso. Il kernel ha già i file dell'utente, la rete con la sua guardia, i servizi delle app, i terminali e le notifiche: l'azione è una chiamata a ciò che c'è. Controllare `what` nel kernel significa che né una pagina né un'app, né un file modificato a mano, possano far eseguire altro da ciò che è permesso.
- **Il `claim`** perché alcune azioni hanno senso solo nella pagina (la finestra di un'app, Automata). Con più schede aperte una sola deve farle; il `claim` lo decide senza coordinare le pagine tra loro, e la finestra «Operazioni in attesa» è nella pagina perché è lì che l'utente risponde.
- **Un motore nostro** perché il modulo deve stare nella release senza `node_modules` e senza una rete per installarle all'avvio; una dipendenza (una libreria di cron o di RRULE) avrebbe dovuto essere impacchettata e aggiornata con lilOS. Servivano poi cose che le librerie danno a metà: ora legale come la spieghiamo all'utente (un'ora che non esiste scatta dopo il salto; una che c'è due volte, la prima), intervalli di minuti e ore sul tempo vero, fasce orarie, «l'ultimo giorno» e «il secondo martedì», spostare una sola volta (`skip`/`extra`), parole in italiano e inglese, RRULE per i calendari **e** lo stesso codice nel browser e nel kernel. Il codice è sotto `sdk/` perché lo usano editor, calendari e kernel.
- **Gli amministratori** perché sono già coloro che gestiscono il sistema (le operazioni del Sistema sono sue) e devono poter fermare o correggere un'operazione sbagliata di un utente. Ma un'operazione gira *come* il proprietario, con i suoi file: cambiarla è agire al suo posto. La notifica non impedisce niente e lo rende visibile; un'approvazione avrebbe reso inservibili le operazioni di un utente in vacanza.
- **L'aggancio per il calendario** perché la Pianificazione è un elenco di regole, un calendario è un'altra vista degli stessi dati: con `rrule`, le volte e lo spostamento, un'app separata la disegna senza che il sistema decida come. La Pianificazione resta la sola a sapere *cosa* si fa.
- **La shell nel kernel con un `fs` suo** perché l'`fs` dell'SDK è un oggetto della pagina (client del kernel, copia in IndexedDB, eventi, DOM) e non gira nell'isolato dei servizi, che non ha `import`, `Blob` né `fetch`. `kfs.js` offre solo i metodi che la shell e i suoi comandi usano, su un albero caricato con `home.load` e rimandato a gruppi con `home.sync`: la shell e i comandi restano quelli di sempre, senza una seconda shell scritta apposta.

**Alternative scartate.**

- Metterla nel nucleo del kernel (nessun ciclo di aggiornamento proprio, ma il nucleo cresce a ogni funzione); oppure un modulo facoltativo (ogni app dovrebbe gestire «la Pianificazione non c'è»).
- Far fare tutto alla pagina (non funziona con lilOS chiuso; è il limite dei background) o far scrivere un servizio a ogni app (nessuna finestra comune, nessuno storico, ognuno con le sue regole).
- Una libreria di cron o RRULE (`croner`, `rrule`, `cron-parser`): dipendenza da portare nella release, ora legale e spostamenti da completare comunque, due codici (kernel e pagina) o un bundle.
- Il cron del sistema operativo (non portabile tra Windows e Linux, non conosce gli utenti, i file e le notifiche di lilOS).
- Un'approvazione del proprietario per le modifiche degli amministratori, o impedire loro di vedere le operazioni degli utenti.
- Un secondo interprete di comandi per il kernel, o far girare nel kernel l'`fs` dell'SDK.
- Un calendario dentro la Pianificazione.

**Conseguenze.**

- Serve lilOS 1.19.0 (SDK 0.12.0), con nel repository ufficiale Pianificazione 1.0.0 (`scheduler`), Terminale 1.5.0 (il comando «in lilOS»), AppStore 1.7.0 e i moduli `scheduler` 1.0.0 e `services-isolate` 1.1.0. Il comando in lilOS senza Terminale 1.5.0 dice «Serve il Terminale 1.5.0 o più recente».
- Le azioni nel browser dipendono da una pagina aperta e da un `claim`: con lilOS chiuso aspettano e poi scadono.
- Una volta persa si recupera **una sola volta** e solo entro `catchUpHours`; una operazione rimessa in funzione riparte da adesso.
- Il servizio `scheduler` dà al kernel un modulo che non può mancare: una release senza i suoi file non si fa (`release.mjs` si ferma) e un `modules/` senza il modulo e senza la copia di lilOS fa fermare il kernel.
- I limiti del modulo (`maxTasksPerUser`, `minIntervalMinutes`, `maxParallel`, `historyPerTask`, `catchUpHours`, `outputKb`, `maxParallelPerUser`, `historyMb`) si cambiano da `config.json` o con `kernelModules.saveSettings`; il Pannello di controllo non ha ancora una scheda per loro.
- Un comando pianificato fa cose vere sui file dell'utente senza che lui guardi. La shell del kernel non apre app né finestre, non legge i file che un'app protegge (cifrati: le chiavi non sono nel kernel), non vede le cartelle private dei workspace e non legge `~/.bashrc`.
- Le richieste web passano dalla guardia di rete, ad ogni reindirizzamento; le intestazioni segrete sono cifrate con la chiave del kernel e non tornano più alle pagine. Cambiare quella chiave le rende inservibili.
- `kfs.js` ripete a mano il comportamento dell'`fs` della pagina che la shell usa: se cambia uno, va controllato l'altro.
- L'avvio da sola di Automata e la Pianificazione hanno due orologi, due fusi orari e due modi di recuperare una volta persa; chi li usa insieme deve scegliere. *Risolto in lilOS 1.22.0: l'orologio è solo quello della Pianificazione.*
- Un'operazione di un'app muore con l'app; quelle di un utente tolto, con lui. Le app hanno limiti più stretti degli utenti (20 operazioni, una volta ogni 15 minuti al più), perché un'app non riempia di corse il kernel.

**Quando ripensarla.** Se Automata e Pianificazione si pestano i piedi (la stessa automazione con due partenze), conviene che l'avvio da sola di Automata passi dalla Pianificazione e usi il suo orologio; se arrivano altre azioni che hanno bisogno della pagina (conviene un modo meno legato a «la prima pagina»); se una libreria senza dipendenze copre l'ora legale e gli spostamenti; se il Pannello di controllo impara a mostrare le impostazioni di un modulo qualsiasi; se serve il consenso del proprietario alle modifiche degli amministratori; se `kfs.js` e l'`fs` dell'SDK si allontanano troppo, e conviene un nucleo comune; se i calendari vogliono creare operazioni di ogni tipo, non solo spostarle.


---

## D69. Le dipendenze tra pacchetti: le installa l'AppStore, con il consenso dell'amministratore

**Decisione.**

- **Un campo `dependencies`** nel manifesto delle app (`lilos.json`) e in `module.json`: un elenco di voci `{ module | app, version?, repo?, optional?, reason? }`. I tipi di dipendenza sono quattro: **moduli obbligatori**, **moduli facoltativi**, **versione minima o intervallo** (come il campo `lilos`: uno o due limiti) e **altre app**. Un'app può avere moduli obbligatori e facoltativi o nessuno; un modulo dipende solo da moduli.
- **Il repository lo dichiara l'app** (`repo`); se manca, si usa il repository ufficiale. Il repository nominato non entra tra quelli dell'AppStore: il kernel ne legge il catalogo solo per quella ricerca (`Repos.packages(url)`).
- **Un piano, poi l'esecuzione.** Installare o aggiornare un pacchetto parte da un *piano* (`POST /api/packages/plan`): cosa serve e manca, o è installato fuori intervallo, da dove si prende, se è verificato, quali permessi chiede, cosa è facoltativo e cosa non si può avere. L'AppStore lo mostra («Si installa anche», i facoltativi con una casella, i problemi). Il sì dell'amministratore parte con le sue risposte (`POST /api/packages/install`), e il kernel **rifà il piano**: se è cambiato, non fa niente. Poi installa nell'ordine, ognuno dopo ciò che richiede, per ultimo il pacchetto richiesto. Se un passo fallisce, toglie quelli che questa esecuzione ha installato (gli aggiornamenti restano).
- **Rimozione: «chiedi e blocca».** Un pacchetto richiesto da un altro pacchetto installato con una dipendenza *obbligatoria* non si toglie (le facoltative non bloccano). I pacchetti installati **solo** come dipendenza (`dependency: true` nello stato dell'app o nel `source.json` del modulo) che dopo la rimozione non servono più a nessuno si propongono per la rimozione, già spuntati. Quelli che l'amministratore ha installato di sua mano non si propongono mai.
- **Un modulo installato parte al riavvio.** Dopo un'installazione che comprende un modulo, l'AppStore chiede «Riavvia ora» o «Più tardi». Finché il kernel non riparte, un'app con una dipendenza obbligatoria in attesa non si apre: il kernel la segna con `unmet` (`why: 'restart'` o `'missing'`) e il launcher mostra un messaggio. Le dipendenze facoltative non bloccano mai.
- **Le regole stanno nel kernel, non nell'AppStore.** `Installer` e `ModuleAdmin` hanno un `guard` (`Dependencies`) che rifiuta: un pacchetto con dipendenze obbligatorie mancanti (in `install` e `update`), una rimozione di un pacchetto che serve ad altri e una versione fuori dall'intervallo che un pacchetto installato chiede. Chi usa `apps.install` o `kernelModules.install` direttamente non può quindi saltare il piano.
- **Le app di sistema al primo avvio.** Il kernel installa le app di sistema con `installAuto`: porta anche le dipendenze obbligatorie dal repository ufficiale; non le facoltative, e non un pacchetto che richiederebbe di accettare un avviso. Dal repository ufficiale: Terminale 1.6.0 (moduli `term-*` facoltativi), File Manager 1.16.0 (moduli `netfs-*` facoltativi), Pianificazione 1.0.1 (modulo `scheduler`).
- **Compatibilità all'indietro.** Un lilOS più vecchio scarta il campo (il manifesto resta valido per il kernel 1.19) e installa le app come prima, senza le dipendenze.
- Nuovi: `system/kernel/src/apps/dependencies.js` (`Dependencies`), `system/kernel/src/api/packages.js`, `checkDependencies` e `dependencyKey` in `manifest.js`, `Repos.packages`, `Installer.updateSource` e `verified`, l'export `packages` dell'SDK, `unmet` e `dependency` in `apps.list`, la chiave di traduzione `@dependencies.<modulo o app>.reason`; lilOS 1.21.0, SDK 0.13.0, AppStore 1.9.0.

**Perché.**

- **L'AppStore e non l'app.** Le app isolate non possono installare nulla; e l'installazione di un modulo cambia ciò che gira nel kernel con accesso completo: deve passare da un amministratore che vede cosa succede. Un piano mostrato prima dà quel consenso a pacchetti che l'amministratore non ha scelto uno a uno.
- **Obbligatorie e facoltative separate.** Terminale e File Manager funzionano senza i protocolli remoti: imporli a chi non li vuole sarebbe un costo (i moduli girano nel kernel). Una dipendenza facoltativa dà all'AppStore la voce «ti serve anche questo?» senza che l'app debba spiegarlo.
- **Il repository nel manifesto.** Così un'app di un repository non ufficiale porta con sé i suoi moduli senza che l'amministratore debba aggiungerli a mano, e l'origine di ogni pacchetto è visibile nel piano. Un modulo non ufficiale è «non verificato»: l'avviso c'è ugualmente.
- **Rifare il piano all'esecuzione** perché tra la vista e il sì il repository può cambiare, o un altro amministratore può installare qualcosa: l'amministratore consente a ciò che ha visto, non a quello che sarebbe.
- **«Chiedi e blocca».** Togliere un modulo da sotto un'app la romperebbe in silenzio; bloccare è più prevedibile che chiedere se «rompere comunque». Togliere insieme i pacchetti nati solo per un'app evita di lasciare moduli nel kernel che nessuno usa, e `dependency: true` distingue questi da quelli che l'amministratore ha voluto.
- **Le regole nel kernel** perché l'AppStore è una delle strade (c'è l'API HTTP, il CLI, un'app di sistema che chiama `apps.install`): un controllo solo nell'interfaccia sarebbe un suggerimento.
- **Nessun rifiuto all'indietro.** Aggiungere un campo che i kernel vecchi ignorano non rompe nessun manifesto già in giro; le app ufficiali restano installabili da un lilOS 1.19.

**Alternative scartate.**

- Che sia l'app a chiedere i moduli quando serve (`lilos.kernel.install`): un'app isolata installerebbe codice del kernel, senza che l'amministratore veda un piano.
- Un'app che porta il modulo dentro il proprio pacchetto: i moduli hanno un ciclo di vita proprio (versioni affiancate, riavvio, dati) e li condividono più app.
- Solo dipendenze obbligatorie: ogni protocollo di rete o di terminale diventerebbe un requisito di File Manager e Terminale.
- Solo il repository ufficiale per le dipendenze: nessuna app di una comunità porterebbe i suoi moduli.
- Togliere a cascata le app che dipendono da ciò che si toglie («chiedi e rimuovi tutto»), o togliere comunque con un avviso: più pericoloso (si perdono app e dati di app per un clic) e più difficile da annullare. Si blocca, e si dice cosa togliere prima.
- Riavviare il kernel da soli dopo un'installazione: chi è collegato aspetta qualche secondo e può avere lavoro in corso; lo decide l'amministratore («Più tardi»).

**Conseguenze.**

- Un'app con una dipendenza obbligatoria non parte finché non c'è: dopo l'installazione di un modulo, fino al riavvio del kernel. Il messaggio lo dice; con «Più tardi» l'amministratore può trovarsela chiusa.
- Installare un'app con moduli non ufficiali chiede di accettare un avviso per ognuno, perché girano nel kernel con accesso completo. Il kernel non guarda dentro un modulo: l'avviso è l'unica difesa.
- Un aggiornamento che aggiunge una dipendenza obbligatoria richiede che l'AppStore faccia il piano: `apps.update` da solo, con la dipendenza mancante, è rifiutato (`conflict`). Le facoltative già dichiarate non si riproporranno: chi ha detto no una volta non riceve la stessa domanda.
- Un pacchetto installato come dipendenza porta `dependency: true` per sempre (anche negli aggiornamenti): l'amministratore che lo vuole tenere dopo aver tolto l'app lo deve deselezionare, ogni volta. Non c'è ancora un modo di dire «questo lo voglio, non è più solo una dipendenza».
- Un pacchetto già installato che soddisfa una dipendenza non viene toccato; se è installato fuori intervallo, il piano lo aggiorna **dalla sua origine**, anche se è un pacchetto che l'amministratore aveva installato apposta.
- Le dipendenze fra app (`app: …`) non le usa ancora nessun pacchetto ufficiale: il percorso è meno collaudato di quello dei moduli.

**Quando ripensarla.** Se serve dire «mantieni questo pacchetto» dopo averlo installato come dipendenza; se arrivano dipendenze con una versione che dipende dall'altra (un solo piano per tutto non basta più: oggi non c'è un risolutore, si guarda la versione più alta del repository); se i moduli nel kernel hanno un isolamento vero (allora l'avviso e il consenso possono cambiare); se serve richiedere un modulo per una sola funzione dell'app (oggi l'app lo controlla da sé); se il riavvio dopo un modulo diventa da evitare (moduli caricati a caldo).

---

## D70. Accesso ai fornitori, server confermati e file JSON nel kernel; i moduli si possono fondere

**Decisione.** Parte dell'accorpamento delle funzionalità doppie tra il kernel e i suoi moduli, deciso con l'utente il 2 novembre 2026 (lilOS 1.22.0). Quello che più moduli rifacevano ognuno per conto suo passa al kernel, e i moduli lo ricevono in `ctx`:

- **Accesso ai fornitori (`net/oauth.js`).** I token OAuth li chiede e li rinnova il kernel. Un driver dichiara `oauth: { provider, scopes, … }` e riceve `ctx.tokens` (`get()`, `renew()`); il kernel fa `signIn`, legge l'account dall'id token (o chiede al driver), traduce gli errori del fornitore e tiene il token di aggiornamento nuovo (`saveSecret`). Per Microsoft (Entra, con la directory) e Google ci sono le impostazioni già pronte: il driver dice solo il fornitore e gli ambiti.
- **Un'app per fornitore, impostata una volta.** L'app registrata su Azure e il progetto su Google Cloud sono del kernel (`oauth` in `config.json`, segreti cifrati come le impostazioni dei moduli), non di ogni modulo: OneDrive e Azure Blob Storage usano la stessa app Microsoft, Google Drive e Google Foto lo stesso progetto. Il Pannello di controllo le mostra in una scheda per app (`GET`/`PUT /api/net/oauth`, la stessa forma delle impostazioni di un modulo). I valori di prima si spostano da soli all'avvio, e lasciano un modulo solo quando la sua versione non li dichiara più.
- **Un solo elenco di server confermati (`net/knownHosts.js`).** Le chiavi SSH e i certificati TLS confermati sono per utente e per tipo, host e porta, per la Rete e per il Terminale insieme: lo stesso server non si conferma due volte. I `trust` delle connessioni e i `known` dei terminali si spostano lì all'avvio.
- **La guardia fino alla connessione.** I driver ricevono `ctx.lookup`, il `dns.lookup` della guardia (`NetGuard.lookup`), da passare alle loro connessioni: il nome si risolve e si controlla un attimo prima di collegarsi, non solo quando il kernel controlla i valori (DNS rebinding).
- **File JSON (`jsonFile.js`).** Scrittura intera e sicura (file temporaneo e rinomina, permessi `0600`, una scrittura alla volta per file) per tutti i file del kernel, e `ctx.jsonStore` per i moduli al posto delle loro classi `Store`.
- **Percorsi.** `ctx.paths` (`cleanPath`, `joinPath`, `parentOf`, `baseName`, `isSafeName`, `cleanName`) ai moduli e ai driver.
- **Terminali.** `open()` riceve `ctx.output` e `ctx.closed`: il driver manda ciò che arriva appena arriva, anche prima che `open()` finisca, senza tenerlo da parte finché il kernel ascolta. `onData` e `onClose` restano ascoltati se ci sono.
- **Moduli fusi (`replaces`).** Un modulo può prendere il posto di altri (`netfs-gdrive` + `netfs-gphotos` → `netfs-google`; `term-ssh` + `netfs-sftp` → `ssh`): installato, o trovato all'avvio, prende la loro configurazione (il primo valore di ciascuna chiave, i segreti così come sono), i loro dati e la loro cartella di dati; loro escono dalla configurazione e dal disco. I servizi tengono i nomi, quindi le connessioni salvate restano. Un modulo sostituito non si installa più e il catalogo lo dice (`replacedBy`).
- **La versione del kernel resta `"1"`.** Sono tutte aggiunte: un modulo che usa un membro nuovo di `ctx` fallisce con «richiede lilOS ≥ 1.22.0» su un kernel più vecchio, invece di portarsi una copia.

**Perché.**

- **OAuth nel kernel** perché quattro moduli avevano la stessa classe `Tokens` (tre copie identiche), la stessa richiesta di token e la stessa pagina di Microsoft o di Google, e il kernel aveva già la metà del lavoro (PKCE, `state`, ritorno, incolla, segreti cifrati). Una correzione (il rinnovo, un codice d'errore di Microsoft) ora vale per tutti.
- **Un'app per fornitore** perché è così che funziona dall'altra parte: l'amministratore registra un'app e le dà più permessi; scriverne l'ID in due schede (e il suggerimento «usa quella di OneDrive») era un passo in più e un errore possibile.
- **Un solo elenco di server** perché la chiave di un server è del server, non della connessione o dell'app con cui ci si arriva: due conferme dello stesso server insegnano a premere Continua senza guardare. Tipo, host e porta perché è ciò che identifica la chiave (una porta, un servizio).
- **`ctx.lookup`** perché la guardia controllava il nome e poi il driver lo risolveva di nuovo: tra le due risoluzioni il nome poteva puntare altrove. Ora è la stessa risoluzione.
- **`replaces`** perché fondere due moduli senza perdere la configurazione, i segreti e le connessioni salvate richiede il kernel: è lui che possiede `config.json` e le cartelle dei moduli.

**Alternative scartate.**

- Una libreria OAuth (dipendenza da portare nella release; il kernel ne usa una piccola parte, già scritta).
- Impostazioni «condivise» tra moduli con una chiave di gruppo nel `module.json` (gli stessi campi ripetuti in ogni modulo, da tenere uguali a mano; e l'app non è di nessun modulo).
- Tenere i token nel modulo e dare solo una classe di aiuto (ogni modulo rifarebbe comunque la richiesta, gli errori e il salvataggio).
- Elenchi di server per connessione con una copia verso il Terminale (com'era per «Apri terminale SSH qui»): non copriva l'altra direzione né i server raggiunti in due modi.
- Fondere i moduli lasciando i vecchi installati e spenti (due cartelle per lo stesso servizio, l'AppStore li mostrerebbe «installati a mano»).
- Alzare la versione del kernel a `"2"` (i moduli di oggi smetterebbero di caricarsi tutti insieme, per delle aggiunte).

**Conseguenze.**

- I moduli che usano i membri nuovi richiedono lilOS 1.22.0. Il Pannello di controllo deve mostrare le app dei fornitori (`/api/net/oauth`) al posto dei campi `clientId` dei moduli; con i moduli vecchi (che li dichiarano ancora) l'app è in due posti finché non si aggiornano: il modulo vecchio usa la sua, il kernel quella copiata.
- Le connessioni salvate non cambiano: il segreto del campo `signin` è sempre il token di aggiornamento. I dati di prima (`trust`, `known`, le impostazioni dell'app) si spostano una volta, all'avvio; tornando a una versione precedente di lilOS le conferme dei server vanno rifatte e l'app va reimpostata nei moduli.
- Una conferma vale per tutte le connessioni e i terminali dell'utente verso quel server e porta; cambiarla in un posto la cambia ovunque.
- Le scritture dei file JSON sono in coda per file solo dentro il processo del kernel: un altro processo (la riga di comando) scrive lo stesso file solo con il proprio `JsonStore`, e chi legge con `watch` se ne accorge dalla data di modifica.
- Un modulo che sostituisce altri non può sostituire un modulo obbligatorio né sé stesso. Una cartella di un modulo sostituito con dati che il nuovo non prende resta, con un avviso.
- Con le dipendenze tra pacchetti ([D69](#d69-le-dipendenze-tra-pacchetti-le-installa-lappstore-con-il-consenso-dellamministratore)): una dipendenza da un modulo sostituito (pacchetti pubblicati che chiedono ancora `term-ssh` o `netfs-gdrive`) vale come dipendenza dal modulo che lo sostituisce: lo soddisfa, si installa al suo posto, ed è lui che conta per le rimozioni; chi prende il posto di moduli portati solo come dipendenze lo diventa anche lui.

**Quando ripensarla.** Se servono fornitori con altri flussi (credenziali del client, dispositivo), o app diverse per protocolli dello stesso fornitore (un'organizzazione che vuole due app Azure); se i server confermati devono essere di tutti gli utenti (un amministratore che li conferma per tutti); se un modulo vuole il proprio `lookup` (un proxy); se i file JSON del kernel diventano tanti da volere un database.

## D71. I sorgenti delle app ufficiali e dei moduli stanno nel repository di lilOS, sotto `plugins/`

> Aggiorna [D38](#d38-le-app-di-sistema-vengono-dal-repository-ufficiale-e-girano-dentro-lilos): le app di sistema girano e si installano come prima, ma i loro **sorgenti** tornano nel repository di lilOS. Il repository ufficiale ha solo i pacchetti.

**Decisione.** Deciso il 3 novembre 2026.

- **Dove stanno i sorgenti.** Le app ufficiali e i moduli del kernel, che stavano in [GexyLab/lilos-plugins-official](https://github.com/GexyLab/lilos-plugins-official) (`src/<app>`, `src/shared`, `modules/<nome>`, `scripts/`, `package.json`, `vite.config.js`, `catalog.json`), stanno ora nel repository `lilos` sotto `plugins/`, con la stessa struttura interna: `plugins/src/<app>/` (con `app.json`, `locales.json` e il `README.md` del pacchetto che l'AppStore mostra, prima in `apps/<app>/README.md`), `plugins/src/shared/`, `plugins/modules/<nome>/`, `plugins/scripts/` e `plugins/catalog.json`. Le dipendenze npm delle app sono in `plugins/package.json`: `npm install` si fa in `plugins/`. Sono stati importati dal repository ufficiale con un solo commit; la storia precedente resta lì fino al tag `v1.51.0`.
- **Il repository ufficiale ha solo i pacchetti installabili:** `apps/<id>/`, `modules/<nome>/` (minificati), `system/lilos/`, `catalog.json`, `changelog/<tag>.md`, `README.md`, `.gitattributes`. Niente sorgenti. Il kernel lo legge come prima: nessun cambiamento nel codice del kernel.
- **Il build** (`npm run build [-- <app|modulo>…]`, in `plugins/`) scrive in `plugins/build/` (ignorato da git): `build/apps/<id>/` (`lilos.json` con gli hash, `dist/`, `locales.json`, `README.md`) e `build/modules/<nome>/`. Le app sono costruite con Vite, già minificate, in un solo `dist/index.js` tranne ciò che si carica a richiesta (worker, wasm, grammatiche dell'Editor). Nei moduli del kernel il codice (`index.js` con ciò che importa, per esempio `lib/`) è **unito e minificato** in `index.js`; un `.js` in cima non raggiunto (il `runner.js` di `services-isolate`, avviato come processo a sé) è unito a parte; gli altri file (`module.json`, `README.md`, `package.json`, `package-lock.json`, `schema.sql`, `LICENSE`…) sono copiati così come sono; i pacchetti npm e quelli `node:` restano `import` (il kernel fa `npm ci`). Un nome che è sia di un'app sia di un modulo (`scheduler`) si scrive `app/scheduler` o `module/scheduler`. Opzioni: `--no-minify`, `--no-merge`.
- **La pubblicazione** (`npm run publish:repo -- <cartella del repository> [nomi…] [--sources] [--no-minify] [--no-merge]`, in `plugins/`): senza nomi pubblica ciò che ha una versione diversa da quella del repository di destinazione (o che manca) e lilOS stesso se la `version` del `package.json` alla radice non è quella di `system/lilos` (chiama `scripts/release.mjs` della radice). Copia `build/apps` e `build/modules` nel repository, aggiorna `catalog.json` (per l'ufficiale prende gli elenchi di `plugins/catalog.json`) e stampa «vecchia → nuova» versione per il changelog. `--sources` copia anche i sorgenti (`src/<id>`, `src/shared`, `src/modules/<nome>`) ed è **vietato per l'ufficiale**. Commit, push e tag del repository di destinazione si fanno a mano dopo.
- **Altri repository.** Il repository community ([lilos-plugins-community](https://github.com/GexyLab/lilos-plugins-community)) resta com'è: ci si pubblicano pacchetti **e** sorgenti. Per ogni altro repository si chiede all'utente se unire, minificare e caricare i sorgenti.
- **Versioni e tag nel repository lilos.** Alla fine di ogni modifica (app, modulo, kernel, core, SDK) si alza la versione del componente, si fa commit e push su `development` e si mette un tag annotato con un messaggio breve: `vX.Y.Z` per lilOS (= `version` del `package.json` alla radice, come prima), `app/<id>/vX.Y.Z` per le app, `module/<nome>/vX.Y.Z` per i moduli.
- **«Pubblicare»** vuol dire: costruire, unire, minificare e scrivere nel repository di destinazione (l'ufficiale, se non si dice altro); controllare i manifesti (`checkManifest` e un'installazione da un repository finto); scrivere lì `changelog/<tag>.md`; commit, push e tag lì. Le note di rilascio complete (`changelog/<tag>.md`) si scrivono **solo alla pubblicazione**, nel repository di destinazione; `system/lilos/CHANGELOG.md` continua a scriverlo `release.mjs`.
- **Riconoscimenti.** `credits.mjs` legge i font di lilOS da `index.html` alla radice (prima da `system/lilos/web/index.html` del repository ufficiale); `npm run credits` e `npm run check:credits` si lanciano in `plugins/`.

**Perché.**

- Una modifica che tocca insieme il sistema e un'app (un export nuovo di `@lilos/system` e l'app che lo usa) era divisa in due repository, con l'ordine «prima lilOS, poi l'app» da ricordare a mano. Con tutto in un repository la modifica è un solo commit, e la ricerca nel codice trova anche chi usa un contratto.
- Il repository ufficiale è letto dal kernel di ogni installazione: tenerci solo i pacchetti lo rende più piccolo e dice chiaramente che ciò che gira è ciò che è stato costruito, non ciò che è stato scritto.
- Unire e minificare i moduli del kernel riduce ciò che il kernel scarica e scrive.
- Un tag per componente dice quale commit ha prodotto la versione di un'app o di un modulo, senza intrecciare le versioni.

**Alternative scartate.**

- **`git subtree`** (tenere il repository ufficiale come sottoalbero): avrebbe portato nel repository lilos anche tutti i `dist` costruiti.
- **Un tag unico per tutto il repository:** non direbbe più la versione di lilOS.
- Lasciare le cose com'erano, con due repository da tenere allineati a mano.

**Conseguenze.**

- Per lavorare su un'app non serve più clonare il repository ufficiale: si modifica `plugins/src/<app>/`, si costruisce in `plugins/` e si pubblica in una copia del repository di destinazione.
- Il repository lilos è più grande; `plugins/node_modules` e `plugins/build` sono ignorati da git.
- La storia delle app prima del tag `v1.51.0` del repository ufficiale non è nel repository lilos: per capire codice più vecchio si va lì.
- Due livelli di versione da non confondere: i tag nel repository lilos dicono da quale sorgente viene un componente; i tag del repository ufficiale dicono cosa c'è nel catalogo (l'AppStore legge l'ultimo).

**Quando ripensarla.** Se il repository lilos diventa troppo pesante da clonare; se le app ufficiali devono avere collaboratori che non vedono il resto del codice; se l'unione dei moduli rende più difficile leggere un errore del kernel (`--no-merge` e `--no-minify` servono a questo).

## D72. Le librerie native nelle app: compilate da noi in WebAssembly, solo nel punto d'ingresso che le usa

**Contesto.** L'app Zip (fflate, solo `.zip`) doveva diventare un archiviatore per zip, 7z, tar, tar.gz, tar.bz2, tar.xz, iso, gz, bz2, xz e rar (3 novembre 2026). Non esiste una libreria JavaScript che li copra; scriverli a mano (encoder bzip2 e LZMA2, decoder RAR5) vorrebbe dire settimane e molti errori. La libreria che li copre tutti è libarchive (quella di bsdtar), in C. Un'app isolata non può leggere file propri né fare richieste (`connect-src 'none'`): riceve solo il codice dei suoi `files`, verificato con l'hash.

**Decisione.**

- **libarchive in WebAssembly, compilata da noi.** L'app **Compress Archive** (`compress-archive` 2.0.0, che sostituisce Zip nel catalogo) porta libarchive 3.8.10 con zlib, bzip2, xz (liblzma) e Mbed TLS (solo la crittografia, per gli zip AES), compilati con Emscripten in Docker da `plugins/scripts/build-libarchive.mjs`: versioni fissate, sorgenti ufficiali controllati con SHA-256, immagine Docker fissata per digest, compilazione senza rete. Il risultato si mette nel repository (`plugins/src/compress-archive/engine/libarchive.js`, il WebAssembly dentro il modulo come base64), con le licenze accanto e i riconoscimenti (anche Emscripten e musl, che finiscono nel file).
- **Solo i formati che servono**: in lettura zip, tar, rar, rar5, iso9660, 7zip e i filtri gzip, bzip2, xz, lzma; zstd, lz4 e gli altri si riconoscono dai primi byte e si dichiarano non supportati. Un piccolo strato C (`native/glue.c`) legge e scrive archivi solo in memoria.
- **Il motore sta in un punto d'ingresso a sé.** Il `work` (background) ha il suo `file` (`dist/work.js`, ~1 MB); le finestre (`main`, `compressAs`, ~20 KB) gli chiedono il lavoro con `lilos.app.call` e ricevono risultati ed errori come dati. Il build dei pacchetti ha `alone` per gli entry point da compilare in un file solo.
- **Nessuna modifica a lilOS.** Bastano `wasm-unsafe-eval` (già nella CSP delle app), `entrypoints[].file` e `lilos.app.call`.

**Perché.**

- **libarchive e non una libreria JavaScript per formato**: un solo codice, usato da anni da Windows, macOS e FreeBSD, invece di cinque librerie di qualità diversa (e per bzip2 in scrittura e RAR5 in lettura non ce ne sono di buone).
- **Compilata da noi e non libarchive.js così com'è**: libarchive.js 2.0.2 (gennaio 2024) porta libarchive 3.7.2, con le vulnerabilità corrette poi nei lettori RAR e tar (3.7.4–3.8.x), proprio i formati che si aprono da file non fidati; porta OpenSSL intero e un worker suo con comlink. La nostra build si aggiorna cambiando una versione e rilanciando lo script.
- **Il WebAssembly dentro il JavaScript** perché un'app isolata non può scaricare un `.wasm`: il codice le arriva come testo verificato.
- **Un file per il background**: le finestre si aprono senza caricare e verificare 1 MB; il lavoro pesante sta in un processo a parte (l'iframe in background ha un processo suo in Chrome, o un Web Worker se l'app non è isolata), e lilOS non rallenta.

**Alternative scartate.**

- Scrivere i formati in JavaScript: tar e ISO sono semplici, ma bzip2, LZMA2 e RAR5 no.
- libarchive.js 2.0.2 così com'è: più veloce da adottare, ma con vulnerabilità note e più pesante.
- Fare il lavoro nel kernel (un modulo con bsdtar): l'app dipenderebbe da un modulo e da programmi installati sul computer del kernel, e i file passerebbero comunque da lì.
- Creare archivi RAR: il formato è proprietario e la licenza di unRAR vieta di usarne il codice per un compressore.

**Conseguenze.**

- La build richiede Docker e circa mezz'ora (la configurazione di libarchive sotto Emscripten è lenta); va rifatta a ogni versione nuova di libarchive o delle librerie, e con i test (`npm run test:compress-archive`, che usano una variante per Node della stessa build).
- I limiti dei file di lilOS restano: 10 MB per file, quindi archivi e immagini ISO piccoli; tutto in memoria, al massimo 256 MB per volta.
- libarchive decifra solo gli zip: i file cifrati di rar e 7z restano fuori, con il motivo nella notifica.
- Chi aveva Zip deve installare Compress Archive e togliere Zip a mano: un'app non ne sostituisce un'altra da sola, e le automazioni registrate con Zip vanno rifatte.

**Aggiornamento (3 novembre 2026).** Compress Archive è passata al repository community [lilos-plugins-community](https://github.com/GexyLab/lilos-plugins-community) (tag v1.2.0; tolta dall'ufficiale nella v1.54.0, dove era entrata nella v1.53.0), con il motore, lo script di build, i test e `doc/compress-archive.md`: i percorsi `plugins/…` qui sopra ora sono alla radice di quel repository. Non è un'app di sistema, come ArduinoIDE4LilOS. La decisione resta valida: il build con `alone` resta anche in `plugins/scripts/build.mjs`, per le app ufficiali che ne avranno bisogno.

**Quando ripensarla.** Se lilOS alza il limite di 10 MB per file (allora servono letture e scritture a pezzi, non tutto in memoria); se un'altra app vuole libarchive (allora conviene una libreria condivisa del manifesto, `libraries`); se WebAssembly con i thread diventa possibile nelle app (xz e 7z più veloci); se serve zstd.

## D73. Il programma lilOS: un guscio Electron con il kernel e PostgreSQL inclusi

**Decisione.** Deciso il 3 novembre 2026.

- **Un programma per Windows, macOS e Linux** (`lilos-desktop/`) che apre lilOS in una finestra, senza browser, e che può far girare sullo stesso computer il kernel e il database. È costruito con **Electron**. Contratti: [il ponte e `host`](../sviluppatore/api.md#il-programma-lilos-lilos-desktop); uso: [guida utente](../utente/guida.md#il-programma-lilos).
- **Tre modi di usarlo**, scelti al primo avvio: *su questo computer* (il programma installa e avvia kernel e database), *un server* (un lilOS altrove, aperto con il suo indirizzo) o *il lilOS già installato* (uno installato a mano e acceso su `127.0.0.1`, aperto come un server). Ogni server ha la sua finestra e la sua sessione (`persist:p-<id>`).
- **La pagina viene dall'origine del kernel**, non da file del programma: la finestra carica `http://127.0.0.1:<porta>` (o l'indirizzo del server). Il programma aggiunge solo un precaricamento che espone `window.lilosHost` e blocca la finestra sul suo server.
- **PostgreSQL incluso, usato solo da `fs-postgres`.** Il programma porta i binari di PostgreSQL (`embedded-postgres`, 17), fa `initdb` e lo avvia con `pg_ctl` su `127.0.0.1` (nessun socket Unix), con un utente `lilos` e una password casuale (`scram-sha-256`) tenuta in `settings.json` (permessi `0600`). Il kernel lo vede come un qualsiasi database: stesso modulo, stesso schema di un lilOS su un server. Il programma non ha altro accesso ai dati.
- **Node.js 22 separato.** Il kernel gira con un `node` scaricato (22), non con quello di Electron: il modulo `services-isolate` usa `isolated-vm`, che ha binari precompilati per Node ma non per l'ABI di Electron. Per usare quello di Electron servirebbe compilare il modulo per ogni versione di Electron e attivare `ELECTRON_RUN_AS_NODE`, che il programma tiene spento (`runAsNode: false` nei fuses).
- **Git portatile.** Il kernel installa app e moduli da repository git; un computer non ha per forza `git`. Il programma porta `dugite-native` (la build di git di GitHub Desktop) e lo mette nel `PATH` del kernel.
- **La release di lilOS è inclusa** (`system/lilos` del repository ufficiale, al tag di `versions.json`) e si installa con `tools/install.js`, come un lilOS installato a mano; da lì il kernel si aggiorna dall'AppStore. Il programma cambia solo porta e indirizzo del database in `config.json`. **Le app di sistema e i moduli non sono inclusi:** il kernel li scarica dal repository ufficiale al primo avvio.
- **Due cartelle e un tag per pubblicare.** Si lavora in `lilos-desktop/development/`. A «pubblica» si copia in `lilos-desktop/production/` e si mette il tag `desktop-vX.Y.Z` (uguale alla `version` del suo `package.json`: il workflow lo controlla). `.github/workflows/lilos-desktop.yml` costruisce gli installer — Windows (exe NSIS e msi, x64), macOS (dmg e zip, arm64 e x64), Linux (AppImage, deb e rpm, x64 e arm64) — e crea la release GitHub (con `changelog/desktop-vX.Y.Z.md` come note, se c'è). **Tag, nomi e note sono cambiati: vedi [D75](#d75-la-release-del-programma-porta-la-versione-di-lilos).** Il programma si aggiorna da `releases/latest/download` con `electron-updater` (Windows e Linux; su macOS avvisa soltanto).
- **Niente firma per ora.** Nessun certificato: su Windows compare SmartScreen, su macOS «Apri comunque» (i pacchetti sono firmati solo *ad hoc*, perché Apple Silicon non esegue codice non firmato), e su macOS il programma non può sostituirsi da solo.
- **`netfs-local`, riservato agli amministratori o alle `roots`.** Un modulo del kernel (`netfs.local`) porta le cartelle del computer del kernel in Rete. Con un solo utente e per gli amministratori vale qualsiasi cartella; per gli altri utenti solo le cartelle elencate in `roots` dall'amministratore (o dentro di esse). Niente `..`, e i collegamenti simbolici che portano fuori dalla cartella collegata non si vedono. Le chiavette USB si collegano da sole in Rete per gli amministratori.
- **Il kiosk e i suoi limiti.** Tre modi della finestra: finestra, schermo intero, kiosk. In kiosk la finestra non si chiude, F11 non fa niente e il menu dell'icona ha solo «Apri lilOS». Si sceglie da amministratore; per uscire un non amministratore dà nome e password di un amministratore, che il kernel controlla con `POST /api/session/verify` (un accesso che si chiude subito, nessuna sessione nuova). Cosa permette ogni sistema: **Windows** tiene sempre Ctrl+Alt+Canc, e sostituire il desktop (Shell Launcher) c'è solo in Enterprise ed Education, quindi su Home e Pro si usa il kiosk con «Avvia con il computer»; **macOS** in kiosk nasconde Dock e barra dei menu e blocca ⌘Tab e l'uscita forzata, ma non lascia sostituire il Finder (serve un account dedicato); **Linux** ha la sessione «lilOS» per la schermata di accesso, che avvia il programma dentro `cage` (un compositor Wayland per una sola applicazione) con `--session`, installata una volta con `install-session.sh`. I tasti di sistema (tasto Windows, Alt+Tab) passano a lilOS con Keyboard Lock di Chromium, che vale solo a schermo intero della pagina.
- **Fiducia.** Il lilOS del programma è di fiducia; un server remoto lo è solo se l'utente lo segna. Un server non di fiducia ha un ponte ridotto (nessuna impostazione da cambiare, nessun file aperto sul computer, nessun percorso). Le regole complete sono nel [riferimento](../sviluppatore/api.md#il-ponte-windowliloshost).

**Perché.**

- **Electron e non Tauri.** lilOS usa funzioni che oggi esistono solo in Chromium: Web Serial, WebUSB, WebHID, Web Bluetooth, Keyboard Lock, WebGPU e la condivisione dello schermo con scelta della sorgente. Tauri usa il motore del sistema (WebView2 su Windows, WKWebView su macOS, WebKitGTK su Linux): ogni sistema avrebbe funzioni diverse e alcune mancherebbero, e la pagina andrebbe provata in tre motori invece di uno. Con Electron il motore è lo stesso su tutti i sistemi e lo stesso con cui lilOS è provato nel browser. Il programma ha già bisogno di Node (per il kernel), quindi scrivere il guscio in JavaScript non aggiunge un linguaggio, e non serve la toolchain di Rust.
- **PostgreSQL incluso** perché `fs-postgres` è il file system che lilOS usa davvero: un database incluso fa girare sul computer lo stesso codice che gira su un server, senza un'altra implementazione da tenere uguale. Chi non ha Docker non deve installare niente.
- **La pagina dal kernel** perché così il programma e il browser mostrano la stessa cosa, i cookie e i controlli di origine del kernel valgono come sempre, e aggiornare lilOS dall'AppStore aggiorna anche ciò che si vede nel programma, senza un nuovo installer. Il programma si aggiorna solo quando cambia il guscio.
- **Development e production con un tag proprio** perché il programma ha una versione e un ritmo suoi, diversi da quelli di lilOS (`vX.Y.Z`) e dei suoi componenti: un tag `desktop-v*` dice che c'è un nuovo installer e fa partire la costruzione su tre sistemi.
- **Niente firma** perché i certificati hanno un costo e un processo (Windows: un certificato di firma del codice; macOS: l'iscrizione ad Apple Developer e la notarizzazione) che per ora non si vogliono affrontare.
- **`netfs-local` solo per gli amministratori** perché il kernel legge il disco con i permessi dell'utente del sistema operativo che lo fa girare: su un server con più utenti, lasciare a tutti le cartelle del server vorrebbe dire leggere i file degli altri.

**Alternative scartate.**

- **Tauri** (vedi sopra) e **un browser aperto in modalità app** (`--app`, `--kiosk`): niente icona nell'area di notifica, niente numero sull'icona, niente file aperti sul computer, niente scelta dei dispositivi nelle finestre di lilOS, niente avvio con il computer.
- **Un'altra base dati inclusa** (SQLite, file su disco): un secondo modulo `fs` da scrivere e provare, con comportamenti diversi dal PostgreSQL dei server.
- **Il Node di Electron per il kernel** (`ELECTRON_RUN_AS_NODE`): vedi `isolated-vm`.
- **Includere app e moduli nell'installer:** l'installer sarebbe più grande e ogni app aggiornata ne farebbe vecchia una parte. Il prezzo è che il primo avvio richiede internet.
- **Aprire i file del computer con `file://`** o far scegliere cartelle alla pagina con l'API del browser: le cartelle devono essere viste dal kernel, perché le copie, Automata e la Pianificazione le fa il kernel anche a pagina chiusa.

**Conseguenze.**

- Il programma pesa centinaia di MB (Chromium, Node, git e PostgreSQL per sistema) e ha un build per sistema e architettura.
- Sui **Mac con processore Intel** `services-isolate` non ha binari `isolated-vm` per `darwin-x64`: i servizi in background delle app isolate non partono.
- Il primo avvio ha bisogno di internet e di qualche minuto (app di sistema e moduli).
- L'SDK ha un nuovo export, `host`, che nelle app di sistema si legge con `import * as sdk` (altrimenti un lilOS più vecchio, che non lo esporta, non le avvierebbe), e `scripts/host-shims.mjs` usa `__lilosApi` come nome interno.
- `netfs-local` è nel `config.json` del repository, quindi acceso in ogni installazione fatta da una release. Su un lilOS con un solo utente raggiungibile da altri computer, quell'utente vede le cartelle del computer del server. Per questo il kernel con un solo utente ascolta solo su questo computer; chi lo apre alla rete deve avere gli accessi.
- Le impostazioni del programma (kiosk, avvio, hardware, server di fiducia) sono **del computer**, non dell'utente di lilOS: le cambia chi usa il programma su quel computer, e quelle che toccano l'hardware solo un amministratore dalla pagina.
- Le API per fotocamera e microfono delle app isolate non esistono ancora in lilOS: il programma concede i permessi `media` alla pagina, ma le app isolate non possono usarli.
- I pacchetti di macOS e Linux non sono ancora stati provati su quei sistemi; Keyboard Lock per il tasto Windows e Alt+Tab è da verificare.
- Il tag `release-v*` (prima `desktop-v*`, [D75](#d75-la-release-del-programma-porta-la-versione-di-lilos)) crea una release marcata «latest»: l'aggiornamento del programma legge `releases/latest/download`, quindi un'altra release del repository creata dopo una `desktop-v*` farebbe cercare gli aggiornamenti nel posto sbagliato.

**Quando ripensarla.** Se i certificati diventano possibili (firma e notarizzazione: allora macOS potrà aggiornarsi da solo e gli avvisi spariscono); se WebKitGTK e WKWebView arrivano a Web Serial, WebUSB, WebHID e Keyboard Lock (allora Tauri tornerebbe a convenire per il peso); se `isolated-vm` offre binari per `darwin-x64` o si cambia il motore dei servizi; se un server vuole `netfs-local` spento per impostazione predefinita; se le release di lilOS e del programma devono avere feed separati.

---

## D74. lilOS si installa da un file di impostazioni e da immagini del sistema

**Decisione.** Deciso il 3 novembre 2026, in lilOS 1.24.0 e programma 0.2.0.

- **Un file, `lilos-install.json` (formato 1),** dice come installare lilOS: dove (`installer.dir`), come lo usa il programma (`installer.mode`: su questo computer o su un server), quale lilOS (`lilos.source` o `image`), la configurazione del kernel, i moduli, i repository, le app, gli utenti con le password e le impostazioni iniziali dei nuovi utenti. Tutti i campi sono facoltativi. Riferimento: [api.md](../sviluppatore/api.md#impostazioni-di-installazione-lilos-installjson-e-immagini-del-sistema).
- **Tre lettori.** `tools/install.js` (`--settings <file>`, la cartella può mancare se c'è `installer.dir`) fa la parte che si fa prima dell'avvio; il kernel, **al primo avvio**, crea gli utenti e installa le app, poi segna `applied` e toglie le password dalla sua copia; il programma lilOS legge solo `installer.*`, il primo amministratore e `image`. Il file predefinito sta nella release (`tools/lilos-install.json`).
- **Le `settings` valgono per ogni nuova home**, anche per gli utenti creati dopo il primo avvio: sono le impostazioni iniziali di lilOS, non solo del primo giorno.
- **Le app da repository non ufficiali** si installano al primo avvio con `allowUnsigned` deciso nel file: chi scrive il file accetta l'avviso dell'AppStore al posto dell'utente.
- **Immagini del sistema.** `tools/image.js` fotografa un lilOS installato e fermo: la cartella installata (versioni, configurazione, moduli e dati, senza sessioni) e il file system esportato attraverso il servizio `fs` (app, librerie, home). `image` in `lilos-install.json` (cartella, `.zip`, `.tar.gz` o indirizzo `http(s)`) la installa al posto della release ufficiale; il kernel carica i file al primo avvio da `.image` e la cancella.
- **Il programma lilOS** cerca il file in `LILOS_INSTALL_FILE`, nella cartella dei dati del programma e accanto al programma (l'installatore di Windows copia quello messo accanto al setup). Con `mode: "server"` apre il server; con `mode: "local"` e un amministratore con password, o un'immagine, installa da solo e apre la finestra già con l'accesso.

**Perché.**

- **Installare lilOS in azienda** (molti computer, un server) a mano vuol dire ripetere gli stessi passi: la procedura guidata, il primo utente, le app, il tema. Un file si scrive una volta e si mette in un sistema di distribuzione.
- **Al primo avvio nel kernel e non in `install.js`** perché utenti e app si creano con i servizi del kernel (`users`, `fs`, installazione con dipendenze), che in `install.js` non girano: il database può non essere nemmeno acceso.
- **Un'immagine e non un dump del database.** Il dump legherebbe l'immagine a un database, a una versione di schema e a un modulo `fs`. Esportare i nodi attraverso il servizio `fs` funziona con qualsiasi modulo e lascia fuori ciò che non va portato (sessioni, `/system/tmp`).
- **`installer.mode` nel file** così il programma può essere distribuito già indirizzato a un server, senza che l'utente scelga.

**Alternative scartate.**

- **Variabili d'ambiente o parametri di riga di comando:** niente per gli utenti, le app e le impostazioni, e non si distribuiscono con un installatore.
- **Un file sempre dentro il programma:** va ricostruito l'installer per ogni azienda. Per questo il file sta accanto al programma.
- **Copiare il database nell'immagine:** vedi sopra.
- **Togliere le password dal file accanto al programma:** il programma non modifica il file messo accanto a sé: è di chi lo distribuisce. Resta un rischio, e si consiglia di non lasciarci password.

**Conseguenze.**

- Le password stanno in chiaro nel file finché qualcuno non lo cancella o non parte il primo avvio. La copia del kernel ha permessi `0600`; quella accanto al programma dipende da chi l'ha messa.
- Un errore su un utente o un'app al primo avvio è un avviso nel log, non ferma lilOS; `applied` viene scritto lo stesso, quindi quel che è fallito **non si riprova**: va fatto a mano.
- Un'immagine porta la configurazione del database di chi l'ha fatta (`fs-postgres.url`): chi la installa deve dare il proprio, altrimenti il kernel punta al database sbagliato. `install.js` lo avvisa.
- Con un lilOS a utente singolo gli `users` del file sono ignorati.
- Un'installazione a metà nella cartella scelta dall'utente cancella solo i file che `install.js` scrive.
- Le immagini hanno `format: 1` e un lilOS più vecchio non le legge.

**Quando ripensarla.** Se serve rifare le operazioni fallite al primo avvio (un registro delle cose da fare invece di `applied`); se le immagini devono includere il database; se le password devono stare in un deposito di segreti invece che nel file; se più aziende vogliono un file firmato.

---

## D75. La release del programma porta la versione di lilOS

**Decisione.** Deciso il 3 novembre 2026. Sostituisce in parte [D73](#d73-il-programma-lilos-un-guscio-electron-con-il-kernel-e-postgresql-inclusi) (tag `desktop-v*` e versione del programma nel nome dei file).

- **`npm run release:desktop`** («pubblica release») rifà `lilos-desktop/production/` da `development/`: solo ciò che è committato, JavaScript e CSS minificati, JSON compatti, niente script di sviluppo. Con `-- --check` dice cosa scriverebbe, senza scrivere.
- **La versione della release è quella di lilOS**, non del programma. In `production/package.json`, `version` è la versione di lilOS portata (da `versions.json`, cioè il `system.json` del repository ufficiale) e `programVersion` è quella del programma (`development/package.json`).
- **Il tag è `release-vX.Y.Z`**, con X.Y.Z = lilOS. Il workflow `.github/workflows/lilos-desktop.yml` parte ai tag `release-v*`, costruisce gli installer (`lilOS-Setup-X.Y.Z.exe`, …) e crea la release GitHub «lilOS X.Y.Z», con `changelog/release-vX.Y.Z.md` come note.
- **Dopo lo script** restano a mano: la nota in `changelog/release-vX.Y.Z.md`, commit, push e tag.
- **Una release per versione di lilOS.** Lo script rifiuta un `release-v` già esistente: se cambia solo il programma serve prima una nuova versione di lilOS (anche solo patch).

**Perché.** Chi scarica l'installatore vuole sapere quale lilOS sta ricevendo, non leggere una seconda numerazione. Gli aggiornamenti automatici funzionano lo stesso: 1.24.0 è più alta di 0.1.1, l'ultimo `desktop-v`.

**Alternative scartate.** Tenere due numerazioni nello stesso nome (`lilOS-1.24.0-p0.2.0`): illeggibile.

**Conseguenze.** La prima release fatta così è lilOS 1.24.0 con programma 0.2.0. Le release `desktop-v*` già pubblicate restano com'erano. L'aggiornamento del programma legge sempre `releases/latest/download`.

**Quando ripensarla.** Se il programma deve uscire più spesso di lilOS senza toccarlo.

## D76. Le licenze: sorgenti PolyForm Strict, SDK MIT, lilOS costruito con una licenza d'uso

**Decisione.** Deciso il 3 novembre 2026, prima di rendere di nuovo pubblico il repository. Titolare del copyright: Eugenio Liguori.

- **Sorgenti** (questo repository): [PolyForm Strict 1.0.0](../../LICENSE.md), testo ufficiale invariato con la riga «Required Notice». Permette solo l'uso non commerciale; niente ridistribuzione, modifiche né opere derivate.
- **SDK** (`sdk/`): MIT (`sdk/LICENSE`), così chiunque scrive e distribuisce app per lilOS, comprese quelle del repository community (MIT).
- **lilOS costruito** (programma, installer, pacchetti del repository ufficiale): la [licenza d'uso](../../EULA.md), in italiano (prevale) e in inglese. Uso gratuito per tutti, aziende comprese, anche installato per un cliente; vietati ridistribuzione, modifiche, opere derivate, lilOS come servizio per terzi e decompilazione (salvo l'art. 64-quater della legge 633/1941). Nel repository ufficiale è il suo `LICENSE.md`.
- **Componenti di terzi**: con le loro licenze (Riconoscimenti del Pannello di controllo). Sono tutte permissive; git (GPL-2.0) è un programma a parte incluso nel programma lilOS, con il link ai suoi sorgenti.

**Perché.** Il repository torna pubblico, ma i sorgenti non devono diventare prodotti di altri, soprattutto aziendali. Chi usa lilOS, anche in un'azienda, deve però poterlo fare liberamente, e chi scrive app deve poter usare l'SDK.

**Alternative scartate.** Licenza proprietaria «tutti i diritti riservati» sui sorgenti: più chiusa, ma senza un testo standard. PolyForm Noncommercial: permette di ridistribuire e modificare per scopi non commerciali. Business Source License ed Elastic License 2.0: permettono la ridistribuzione. Una sola licenza per sorgenti e versioni costruite: PolyForm Strict vieterebbe l'uso nelle aziende.

**Conseguenze.**

- Prima del 3 novembre 2026 il repository era pubblico senza licenza: nessuno aveva comunque il diritto di copiarlo o ridistribuirlo.
- Un contributo di altri, in futuro, deve concedere al titolare i diritti per distribuirlo con queste licenze (per esempio con un accordo per i contributori).
- La licenza d'uso si accetta al primo avvio di lilOS ([D80](#d80-la-licenza-si-accetta-al-primo-avvio-letta-dal-repository-ufficiale)) e la release ne porta una copia (`EULA.md`); non c'è una pagina nel setup del programma.
- I testi vanno fatti rivedere da un legale prima di farli valere.

**Quando ripensarla.** Se si vende una licenza commerciale, se arrivano contributori esterni, o se l'SDK deve restare chiuso.

## D77. NetTest: le richieste le fa il kernel, con i segreti sigillati; i protocolli in più sono moduli

**Decisione.** Deciso il 3 novembre 2026, in lilOS 1.25.0 (SDK 0.16.0), con l'app NetTest 1.0.0, i moduli `call-grpc` e `call-mqtt`, Terminale 1.9.0, Pianificazione 1.2.0 e Pannello di controllo 1.20.0. NetTest è un'app di sistema **non obbligatoria** (si installa dall'AppStore): un client in stile Postman per HTTP, GraphQL e le sessioni WebSocket, SSE, TCP, TLS, UDP, MQTT e gRPC.

- **Le richieste le fa il kernel**, non la pagina (`system/kernel/src/calls/`, rotte `/api/calls`, SDK `calls`, `lilos.calls` per le app isolate, permesso `calls` di livello `install`). Niente CORS, e il kernel raggiunge ciò che raggiunge il suo computer, dentro la guardia di rete (`net/guard.js`).
- **Un solo client HTTP** (`net/http.js` con `net/connect.js`: HTTP/1.1 e HTTP/2, i tempi di ogni passo, il certificato del server). Lo usano NetTest e, al posto del suo vecchio client, l'operazione `web` della Pianificazione, che per questo ora accetta i certificati che l'utente ha confermato. `ws.js` impara a essere **client** WebSocket (`connectSocket`).
- **I segreti sono sigillati dal kernel.** Una variabile segreta di un ambiente si manda a `POST /api/calls/seal` (AES-GCM con la chiave di questo lilOS, legata all'utente) e il file `.nettest` ne tiene solo il sigillo. Il kernel lo apre soltanto dentro la richiesta e scrive `••••` al posto del valore in ogni risposta, anche se il server lo rimanda indietro. Ai token OAuth succede lo stesso: tornano alla pagina sigillati e il kernel li rinnova.
- **Gli script girano nel servizio `runtime`** (il modulo `services-isolate` 1.2.0 o successivo): un isolate V8 senza rete, file né `lilos`, 96 MB e 5 secondi di calcolo per script, un ambiente per utente. L'oggetto si chiama `nt`, con l'alias `pm` per gli script di Postman. Un valore segreto negli script si legge come `{{nome}}`.
- **Le sessioni vive stanno nel kernel**, come quelle del Terminale ([D61](#d61-i-terminali-remoti-le-sessioni-vivono-nel-kernel-un-websocket-nostro)): 10 minuti senza finestra, al massimo 10 per utente, un canale WebSocket per sessione.
- **Un protocollo in più è un modulo** che fornisce `call.<protocollo>` (`calls/drivers.js`: `open`, `invoke`, `describe`), come per `netfs.*` e `term.*`. gRPC (`protobufjs`) e MQTT (client scritto nel modulo) sono moduli facoltativi: chi non li vuole non porta le librerie.
- **Le collezioni sono file `.nettest`** (JSON, formato 1) nella home; «Le mie richieste» sta nei dati dell'app. Il kernel legge i file per percorso (`~/…`), non per id, e li esegue anche senza pagina: nuova operazione `collection` della Pianificazione e comando `nettest` del Terminale usano lo stesso motore (`Calls.runFile`).
- **I certificati confermati sono quelli della Rete e del Terminale** (`net/knownHosts.js`, tipo `tls`): confermato in un posto, vale negli altri.
- **L'eccezione dell'amministratore alle regole di rete.** Con più utenti il kernel non va a questo computer né alla rete locale (e mai a link-local, multicast e `0.0.0.0/8`, nemmeno con `net.allow`). Prima l'amministratore poteva aprire la rete locale (`net.allowPrivate`) e certi intervalli (`net.allow`) solo a mano in `config.json`; ora c'è anche `net.allowLocal` (127.0.0.1 e `::1`, **solo questo**: link-local, multicast e riservati restano chiusi) e `GET`/`PUT /api/net/rules` (solo amministratori), con una scheda **Rete** nel Pannello di controllo. Le regole valgono subito e si salvano in `config.json`. SDK: `net.rules()` e `net.setRules()`.
- Cose piccole: `kernel.request(…, { signal })` (SDK), il tipo di file `nettest`, il componente condiviso `kvTable` per le tabelle di righe nome e valore, e l'evidenziatore di sintassi dell'Editor (`highlight.js`) spostato in `plugins/src/shared/` perché lo usa anche NetTest.

**Perché.**

- **Il kernel** perché una pagina non può fare richieste a un altro sito (CORS), né aprire socket TCP o UDP, né parlare gRPC o MQTT con un broker; e perché è il solo posto dove si può tenere un segreto che la pagina non rivede. Lo stesso motore serve a chi non ha una finestra aperta (Pianificazione, Terminale).
- **Sigillare** perché una collezione si copia, si condivide e si committa: una password in chiaro (o cifrata con un segreto che la pagina conosce) uscirebbe con lei. Un valore legato a utente e lilOS non serve a chi riceve il file, ed è voluto.
- **Un solo client HTTP** perché la Pianificazione ne aveva uno suo che non conosceva i certificati confermati, né HTTP/2, né i tempi: due client da tenere uguali per la stessa guardia.
- **Moduli per gRPC e MQTT** perché `protobufjs` (e il suo codice) non deve stare in ogni lilOS, e perché il contratto `call.<protocollo>` è lo stesso già collaudato di `netfs.*` e `term.*`.
- **`allowLocal` separato da `allowPrivate`** perché aprire il proprio computer è più pericoloso che aprire la rete locale: dietro 127.0.0.1 ci sono i servizi del kernel stesso, un database, strumenti di sviluppo. Va concesso da solo, e il Pannello di controllo lo dice.
- **Le regole nel Pannello di controllo** perché chi amministra lilOS con più utenti, per provare un servizio sul computer o sulla rete dell'ufficio, doveva modificare `config.json` e riavviare.

**Alternative scartate** (ricostruzione dal codice, da confermare).

- Richieste dal browser con un proxy CORS: non reggono socket, gRPC, MQTT né i segreti.
- Segreti nelle impostazioni dell'app, o in chiaro nei file `.nettest`: non viaggiano con la collezione, o escono con lei.
- Script eseguiti nella pagina (`eval`, un Worker): niente limiti di tempo e memoria affidabili, e vedrebbero i segreti. Un motore JS nostro per il kernel: già c'è `services-isolate`.
- Tutti i protocolli nel kernel (gRPC e MQTT in ogni installazione).
- Un solo interruttore «apri la rete locale» che comprenda anche questo computer.

**Conseguenze.**

- Il permesso `calls` è potente: un'app che lo ha manda richieste dal computer del kernel a qualunque server che la guardia permetta, con le variabili segrete che l'utente le passa. Va concesso con la stessa cautela di `term`. Chi ha `allowLocal` acceso lascia agli utenti anche i servizi che stanno su questo computer.
- Gli script chiedono `services-isolate` 1.2.0: l'app lo dichiara come dipendenza facoltativa. Senza, le richieste con script falliscono e dicono cosa manca.
- Un valore sigillato non si apre su un altro lilOS né da un altro utente: spostando una collezione, i segreti vanno rimessi; cambiare la chiave del kernel (`secret.key`) li rende inservibili tutti. Le variabili senza lucchetto, quelle globali e quelle della collezione restano in chiaro nei file.
- La Pianificazione (1.2.0, lilOS 1.25.0) richiede lilOS 1.25.0; le sue richieste web ora usano HTTP/1.1 con `net/http.js` e accettano un certificato non valido solo se già confermato.
- Un'esecuzione manda solo richieste che si chiamano una volta: le sessioni (WebSocket, SSE, TCP, TLS, UDP, MQTT) si saltano; gRPC unario no (`invoke`).
- Limiti: 8 richieste, 5 esecuzioni (1000 risultati ciascuna) e 10 sessioni insieme per utente, 5 accessi OAuth aperti, risposte fino a 20 MB (al massimo 50), file `.nettest` fino a 32 MB.

**Quando ripensarla.** Se serve un proxy per uscire dalla rete dell'azienda o regole per utente (chi può andare dove); se gli script devono fare chiamate a lilOS o alla rete; se MQTT su WebSocket, i `.proto` con import o altri protocolli (GraphQL su WebSocket, SOAP) lo richiedono; se i segreti devono viaggiare tra utenti o installazioni (un portachiavi condiviso); se la collezione deve vivere nel kernel anziché in un file.

## D78. «Arresta» ferma lilOS per tutti e non lo riavvia

**Decisione.** Deciso il 3 novembre 2026, in lilOS 1.26.0 (SDK 0.17.0). La pagina utente ha, per gli amministratori, la tessera «Arresta» accanto a «Riavvia il sistema».

- **Una sola domanda** per riavviare e arrestare (`#confirm` con la tabella `CONFIRM` in `UserPage.js`), invece di una per ciascuno.
- **Il kernel esce senza codice 75.** `POST /api/kernel/shutdown` risponde `{ stopping: true }` e, dopo 200 ms, ferma il kernel ed esce con 0. `run.js` termina con qualunque codice diverso da 75, quindi lilOS resta spento finché qualcuno non lo riavvia a mano (o il servizio che lo aveva avviato).
- **`shutdownSystem()`** (`apps/updates.js`) chiede alle finestre e salva come `restartKernel()`. Nel programma lilOS, con il lilOS che il programma stesso fa girare (`profile.kind === 'local'`), chiama `host.quit()` e il programma si chiude, fermando kernel e database. Altrove (browser, server remoto) ferma il kernel e mostra la schermata «lilOS è spento» con «Ricarica».
- **`host.quit()`** è una chiamata da profili di fiducia: non è tra quelle aperte a ogni server (`OPEN` in `bridge.js`).

**Perché.** Chi gestisce un lilOS sul proprio computer vuole spegnerlo senza cercare il processo. Chiudere solo la finestra lascia kernel e database accesi nell'area di notifica. Il kernel non può chiudere un programma che non è suo: perciò la pagina chiede al programma di chiudersi.

**Alternative scartate** (ricostruzione dal codice, da confermare). Un codice di uscita proprio per `run.js`: basta già «diverso da 75». Mettere il tasto nel Pannello di controllo: la pagina utente ha già Riavvia, e le due azioni stanno bene insieme.

**Conseguenze.**

- Chi è collegato perde subito la connessione. Alle finestre degli altri utenti non viene chiesto niente (solo a quelle di chi preme il tasto): il testo non salvato si perde.
- Con un programma vecchio senza `quit`, anche nel programma lilOS il tasto ferma solo il kernel e la pagina mostra «lilOS è spento»: il programma resta aperto con il kernel fermo.
- Arresta non dipende da `npm run kernel`: funziona anche senza `LILOS_SUPERVISED`.

**Quando ripensarla.** Se altri utenti devono essere avvisati prima, o se serve poter riaccendere lilOS dalla pagina (per esempio con un servizio di sistema).

## D79. Reinstallare il programma su Windows: usare l'installazione precedente o ripartire da zero

**Decisione.** Deciso il 3 novembre 2026, nel programma lilOS 0.3.0. Disinstallare il programma su Windows non cancella `%APPDATA%\lilOS`, quindi chi reinstalla ritrova server e impostazioni di prima. Il primo avvio dopo un'installazione, se ci sono server salvati, mostra la pagina di benvenuto in modalità `previous` con due scelte: **Usa l'installazione precedente** o **Riparti da zero**.

- **Il segno di una nuova installazione** è il file `resources/first-run`, che gli installer (`.exe` e `.msi`, `win.extraResources`) mettono e il programma cancella dopo la scelta. Solo Windows: macOS e Linux non hanno il file e non chiedono niente.
- **Gli aggiornamenti automatici** reinstallano il segno ma non devono chiedere: all'evento `update-downloaded` `updates.js` scrive `settings.updating` con la versione scaricata, e `justInstalled()` non chiede se il programma in esecuzione è quella versione.
- **Ripartire da zero** ferma il lilOS locale e rinomina le sue cartelle (lilOS e database) in `<cartella>.old-AAAAMMGGhhmm` (ora del computer); con la casella «Elimina invece…» e una conferma le cancella. Poi `store.reset()`, avvio con il computer spento e `firstStart()` (pagina di benvenuto o `lilos-install.json`).
- **Senza server salvati** il segno si cancella e la domanda non compare.

**Perché.** Chi reinstalla perché qualcosa non funziona non ha modo di ripartire da zero senza cancellare a mano `%APPDATA%\lilOS`. Chi aggiorna a mano o ripara l'installazione vuole invece ritrovare i suoi dati. Il programma non può sapere quale dei due sia, quindi lo chiede.

**Alternative scartate** (ricostruzione dal codice, da confermare). Cancellare i dati alla disinstallazione: perde utenti e file di chi disinstalla per un errore o per spostare il programma. Non chiedere mai: chi vuole ripartire deve cancellare a mano cartelle che non conosce. Cancellare sempre al posto di rinominare: irreversibile; per questo cancellare è una scelta a parte, con una seconda conferma.

**Conseguenze.**

- Rinominare lascia le vecchie cartelle sul disco (database compreso) finché l'utente non le cancella: occupano spazio.
- Il segno viaggia con gli installer: uno che non lo include (macOS, Linux, o uno costruito senza `win.extraResources`) non fa la domanda.
- Non provata con un vero `.msi` o `.exe` reinstallato né con un aggiornamento automatico.

**Quando ripensarla.** Se il disinstallatore deve chiedere cosa fare dei dati, o se macOS e Linux hanno bisogno della stessa domanda.

## D80. La licenza si accetta al primo avvio, letta dal repository ufficiale

**Decisione.** Deciso il 3 novembre 2026, lilOS 1.27.0.

- **Dopo l'accesso e prima della scrivania** (`src/boot/boot.js`), lilOS chiede `GET /api/license`. Se la licenza non è accettata, un amministratore vede `licenseScreen` (`src/boot/screens.js`: testo in un riquadro che scorre, casella «Ho letto la licenza e la accetto», **Accetta** ed **Esci**); gli altri utenti vedono «Licenza di lilOS da accettare» e non entrano. Con un solo utente quell'utente è amministratore; **Esci** non fa uscire, rimostra la licenza.
- **Una volta per installazione**: il kernel (`src/license.js`) scrive `license.json` nella cartella dei dati: `{ sha256, acceptedAt, by, source }`.
- **Il testo si legge da remoto**: `https://raw.githubusercontent.com/GexyLab/lilos-plugins-official/main/LICENSE.md` (`LILOS_LICENSE_URL` lo cambia, per le prove), con 8 secondi di attesa, al massimo 256 KB, tenuto 10 minuti. L'impronta è SHA-256 del testo con i fine riga normalizzati.
- **Testo cambiato**: un'impronta diversa da quella accettata va riaccettata. `POST /api/license/accept` riceve l'impronta del testo letto: se nel frattempo è cambiato, `conflict` e la pagina lo rimostra.
- **Repository irraggiungibile**: si usa la copia `EULA.md` della release (`scripts/release.mjs` la mette in `system/lilos`; in sviluppo quella del repository). Se una licenza è già stata accettata vale quella; altrimenti si accetta la copia, e quando il repository torna si confrontano le impronte.
- **`acceptLicense: true`** in `lilos-install.json`: chi prepara l'installazione la accetta per lei (`by: 'install'`), al primo avvio.
- I testi della schermata sono in italiano, come le altre schermate prima dell'avvio, che non possono usare le traduzioni dell'SDK.

**Perché.** La licenza d'uso ([D76](#d76-le-licenze-sorgenti-polyform-strict-sdk-mit-lilos-costruito-con-una-licenza-duso)) deve essere letta e accettata da chi installa lilOS, e deve poter cambiare senza una nuova release: per questo si legge dal repository ufficiale. Il kernel la scarica e ne conserva l'impronta, così la pagina non dipende da CORS né da regole di rete, e l'accettazione vale per tutti gli utenti.

**Alternative scartate.** Accettazione di ogni utente: la licenza è di chi installa, non di chi usa. Bloccare senza rete: un lilOS in una rete chiusa non partirebbe più. Una pagina nel setup del programma: non copre chi installa con `install.js` o si collega a un server. Mostrare la licenza dalla pagina con un `fetch` diretto: dipende da CORS e il kernel non saprebbe cosa è stato accettato.

**Conseguenze.**

- Un lilOS già installato che si aggiorna alla 1.27.0 chiede la licenza al primo accesso di un amministratore; fino ad allora gli altri utenti non entrano.
- Se il repository ufficiale cambia `LICENSE.md`, entro 10 minuti ogni lilOS raggiungibile la richiede agli amministratori.
- Il controllo è nella pagina: il kernel non rifiuta le altre API a chi non l'ha accettata.

**Quando ripensarla.** Se serve l'accettazione di ogni utente, una licenza per lingua, o che il kernel blocchi le API finché non è accettata.

## D81. Il lilOS di sviluppo legge le app da un repository locale costruito da `development`

**Contesto.** Il kernel di una copia del repository installava le app di sistema e i moduli dal repository ufficiale su GitHub, e le app di sistema si accettano solo da lì. Una modifica a un'app di `plugins/` non si poteva provare senza pubblicarla (o senza un ramo del repository ufficiale). E il kernel di sviluppo usava la porta 8790, la stessa del lilOS installato.

**Decisione.** Deciso il 3 novembre 2026, lilOS 1.29.0.

- `apps.devRepository` in `config.json` (solo in una copia di sviluppo; ignorato da un lilOS installato e tolto dalla release) indica un repository git su questo computer che il kernel legge **al posto dell'ufficiale**. L'indirizzo resta quello ufficiale ovunque: cambia solo da dove si legge (`useDevRepository` in `sources.js`). Nel repository vale `dev-repo`, cioè `system/kernel/dev-repo`, ignorato da git.
- `npm run dev:update` lo riempie: `git pull --ff-only` della copia su `development`, poi build delle app e dei moduli di `plugins/` con una versione diversa e `publish:repo --no-lilos`, con un commit. lilOS stesso non c'è: la copia di sviluppo si aggiorna con git.
- Le app si aggiornano **a mano** dall'AppStore del lilOS di sviluppo, come su un lilOS installato.
- `npm run dev:start` aggiorna e avvia insieme kernel e pagina. Il kernel di sviluppo ascolta sulla **8791**; Vite prende la porta da `config.json`. La release scrive 8790 nella configurazione delle installazioni.

**Perché.** Il flusso voluto è: modifica su `development`, prova nel lilOS di sviluppo, poi «pubblica». Leggere un repository al posto dell'ufficiale, mantenendone l'indirizzo, riusa tutto il percorso reale (catalogo, dipendenze, fiducia, aggiornamenti dell'AppStore) e non tocca le app già installate, che continuano a vedere i loro aggiornamenti.

**Alternative scartate.** Un secondo repository «ufficiale» con un altro indirizzo: le app già installate puntano a GitHub e non vedrebbero gli aggiornamenti. Installare da `{ type: 'local' }`: le app di sistema non si accettano da una cartella, e non c'è un catalogo da cui l'AppStore offra aggiornamenti. Un ramo del repository ufficiale per le prove: richiede push sul repository pubblicato per ogni prova.

**Conseguenze.** Il primo `dev:update` costruisce tutto e richiede qualche minuto; i successivi solo ciò che ha cambiato versione (una modifica senza alzare la versione non arriva). Il kernel tiene due minuti la copia di un repository letto: dopo un `dev:update` a kernel acceso le versioni nuove compaiono entro quel tempo. Il programma lilOS cerca altri lilOS sulle porte 8790-8795, quindi può vedere quello di sviluppo acceso.

**Quando ripensarla.** Se servono prove su più rami insieme, o un lilOS di sviluppo condiviso da più persone.

## D82. La schermata di accesso a due metà, con i colori propri, e «Resta connesso» col cookie del browser

**Contesto.** Le schermate prima di lilOS (accesso, licenza, messaggi, avvio) erano una scheda piccola al centro, coi colori dell'SDK e senza tema: prima dell'accesso il tema dell'utente non si conosce. L'utente ha chiesto una schermata sul modello di una pagina di accesso divisa in due (pannello sfumato a sinistra, modulo a destra) con i colori di lilOS, scura di default (render `design/accesso.html`). Ogni accesso teneva la sessione per tutta la sua durata (30 giorni), anche su un computer condiviso; dopo troppi tentativi sbagliati il kernel mandava già `Retry-After`, ma la pagina diceva solo «riprova tra poco».

**Decisione.** Decisa il 4 novembre 2026, lilOS 1.30.0, SDK 0.18.0.

- `boot/screens.js` disegna tutte le schermate in una cornice sola: a sinistra il pannello di lilOS (logo, titolo, o l'ora quando la schermata chiede la password dello stesso utente; stato della connessione; versione), a destra il contenuto. `boot.css` ha **colori propri** (`--b-*`), con la sfumatura dall'accento Blu (#3b6ef5) al Viola (#7c5cdb) della tavolozza; scura di default, chiara col pulsante in alto a destra, ricordata in `localStorage` (con `try`: senza, resta scura).
- **Resta connesso** si fa col cookie: `POST /api/session` con `remember: false` manda `lilos_session` **senza `Max-Age`**, un cookie della sessione del browser. Il modulo di accesso non cambia (la sessione sul kernel scade come prima). Acceso di default, come era prima; la scelta resta nel browser e vale anche quando si sblocca o si accede di nuovo dopo la scadenza.
- Il conto alla rovescia usa `Retry-After`, che l'SDK porta in `KernelError.retryAfter`.
- Il kernel che non risponde si riprova da solo (5, 10, poi 30 secondi); i passi dell'avvio restano fino a quando `system.js` è caricato.
- Fuori, per ora: testi e logo dell'organizzazione scelti dall'amministratore, lingua e tastiera a schermo prima dell'accesso (la tastiera è un'app, che prima dell'accesso non c'è), MFA.

**Perché.** Un solo modello per tutte le schermate di avvio le tiene coerenti, e i colori propri evitano di dipendere da un tema che non c'è ancora. Il cookie della sessione del browser è il modo standard di «non ricordarmi» e non tocca il modulo `users-basic`, quindi funziona con i moduli di accesso che ci sono.

**Alternative scartate.** Una durata breve della sessione sul kernel quando la casella è spenta: serve un cambiamento al servizio `auth` di ogni modulo di accesso. Un endpoint pubblico per testi e logo personalizzati: utile, ma non chiesto ora.

**Conseguenze.** Con «Resta connesso» spento la sessione resta valida sul kernel fino alla sua scadenza anche se il browser l'ha dimenticata (nessuno ha più il token). Alcuni browser che riaprono le schede alla riapertura tengono anche i cookie di sessione: lì la casella spenta vale meno.

**Quando ripensarla.** Se servono la personalizzazione per l'organizzazione, l'accesso a più fattori o sessioni brevi imposte dall'amministratore.

## D83. I widget della scrivania legati a un tipo di file; le note adesive sono file

**Contesto.** Il manifesto accettava i widget (`contributes.widgets`, permesso `desktop.widget`) ma lilOS non li mostrava ([D35](#d35-le-app-locali-girano-in-un-iframe-sandbox-senza-allow-same-origin)). L'utente ha chiesto le note adesive: foglietti colorati da scrivere direttamente sulla scrivania, con liste, caselle da spuntare e promemoria (render `design/note-adesive.html`). Serviva un modo, per un'app, di disegnare qualcosa sulla scrivania.

**Decisione.** Decisa il 4 novembre 2026, lilOS 1.31.0, SDK 0.19.0.

- Un widget può avere `fileType`, uno dei `fileTypes` dell'app, diverso per ogni widget (lo controlla `checkManifest`). I file di quel tipo sulla scrivania sono disegnati dal widget dell'app che apre quel tipo (la scelta dell'utente in Tipi di file) al posto dell'icona. Il contratto (export `widgets` del modulo, `host`, controller) è in testa a `src/desktop/widgets.js`; l'elemento è `DeskWidget`, un `DesktopItem`.
- Un widget è un file: si seleziona, si sposta, entra nelle workarea, va nel Cestino, entra nella cronologia e si copia come ogni altro. Aprirlo vuol dire modificarlo sul posto; **Riordina icone** lo lascia dove sta.
- **Solo app di sistema** (repository ufficiale, girano nella pagina) con il permesso `desktop.widget`. Per le altre il permesso non ha effetto.
- Le note adesive sono file `.sticky` di testo; colore, misura e promemoria stanno nei dati dell'app sul file (`fs.setAppMeta`, al massimo 1 KB).
- Nuovo → **Nota adesiva** è un'azione `desktop.newWidget` (`params: { app, widget }`) che il menu mostra solo se l'app c'è e quei file si mostrerebbero come widget (`visible` nelle azioni di `menus`).
- Per elencare e raggiungere le note di tutte le scrivanie: `fs.everywhere(test)` (tutti i nodi di tutti i workspace, con `scope`, **in sola lettura**) e `fs.bring(id, parentId)` (porta nel workspace attuale un nodo che vede solo un altro; per gli altri è `move`). In `@lilos/system`: `revealOnDesk`, `bringToDesk`, `newWidgetOnDesk`, `widgetFor`.
- I promemoria usano la Pianificazione ([D68](#d68-la-pianificazione-un-modulo-obbligatorio-del-kernel-con-le-azioni-nel-kernel)): una notifica a un'ora, che con un clic apre il punto d'ingresso `reveal` dell'app.

**Perché.**

- *Un file e non dati interni dell'app*: la nota si vede nel File Manager (con l'anteprima), si apre con l'Editor, si copia, si cerca, si tagga, va nel Cestino e nella cronologia, e passa dai permessi sui file e dall'isolamento tra workspace senza regole nuove. Un contenitore a parte avrebbe dovuto rifare tutto questo.
- *Legato a un tipo di file e non libero*: il posto sulla scrivania, la selezione e il salvataggio delle posizioni sono già dei file; un widget senza file avrebbe avuto bisogno di un secondo modo di salvare posizione e vita.
- *Solo app di sistema*: un'app isolata (iframe) ha bisogno di un iframe sandbox per ogni widget, con il costo e i rischi (tastiera, zoom, trascinamento) che questo porta. Le app di sistema girano nella pagina e disegnano nell'elemento dato.
- *`everywhere` e `bring` come eccezione*: lo stato di un workspace è separato dagli altri ([D27](#d27-workspace-scrivanie-separate-isolate-dal-file-system)). L'elenco di tutte le note chiede di vedere le scrivanie degli altri: lo si concede in **sola lettura** (`everywhere`), mentre lo spostamento è sempre un'azione esplicita dell'utente («Porta qui») e passa da `bring`, non da `move`, che continua a rifiutare ciò che il workspace non vede.

**Alternative scartate.** Mostrare i widget senza file (stato nell'app): doppio salvataggio, niente File Manager. Widget per le app isolate subito: serve un sandbox per ogni widget. Far vedere a `fs.get` i nodi degli altri workspace: rompe l'isolamento per tutti, non solo per chi ne ha bisogno. Una finestra con l'elenco che legge i file delle altre scrivanie: il testo non serve, bastano il titolo e l'inizio che l'app tiene nei dati sul file.

**Conseguenze.**

- Chi ha già personalizzato il menu della scrivania non vede **Nota adesiva** finché non lo ripristina o non la aggiunge.
- La notifica di un promemoria ha un solo clic (mostra la nota): niente «Rimanda» né «Fatto».
- Se l'utente sceglie un'altra app per `.sticky` o toglie Note adesive, i file tornano icone (nulla si perde).
- `everywhere` legge tutti i nodi in memoria: è lineare nel numero dei nodi; va chiamata con un `test` che scarta presto.
- Un widget di un'app aggiornata si rimonta quando cambia l'app che apre il tipo.

**Quando ripensarla.** Quando si vorranno widget di app non di sistema (servirà un sandbox per widget o un protocollo di disegno), widget senza file (un orologio, un meteo), o un'altra eccezione all'isolamento tra workspace oltre alla sola lettura di `everywhere`. Se i promemoria devono avere azioni (Rimanda, Fatto), servono azioni nelle notifiche della Pianificazione.
