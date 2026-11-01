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

> Aggiornata da [D59](#d59-la-rete-i-protocolli-sono-moduli-del-kernel-e-i-trasferimenti-li-fa-il-kernel): dalla versione 1.1.0 il modulo (ora `fs-postgres_1.1.0`) legge e scrive i contenuti grandi a pezzi (tabella `lilos_chunks`).

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
- I widget sono validati nel manifesto ma lilOS non li mostra.

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
- Alcuni permessi sono accettati dal manifesto ma il ponte non ha ancora le funzioni che li userebbero: `clipboard.read`, `media.*`, `geo`, `ai.*`, `desktop.widget` (`apps.call` ora ha `lilos.apps.call`, [D42](#d42-punti-dingresso-e-due-modalità-di-esecuzione-per-le-app); `ui.menus` ha effetto dal 31 ottobre 2026, [D47](#d47-pipe-sugli-eventi-dati-delle-app-sui-file-e-filecrypt)). Vedi [Stato e roadmap](stato-e-roadmap.md).

**Quando ripensarla.** Quando ci sarà un catalogo pubblico di app (l'interfaccia per installarle c'è: l'AppStore).

## D38. Le app di sistema vengono dal repository ufficiale e girano dentro lilOS

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

- **Un modulo, non il kernel.** I servizi li esegue un servizio opzionale del kernel, `runtime` (modulo `services-isolate_1.0.0`, attivo in `config.json`). Senza il modulo lilOS funziona, senza servizi. Isolamento: un processo Node per servizio, con il modello di permessi di Node (`--permission`: legge solo la cartella del modulo, niente programmi né worker, `--allow-addons` per `isolated-vm`) e il codice dell'app in un isolato V8 con 128 MB e 10 s per ogni esecuzione. Niente `import`, `require`, `process`, rete né file: solo `lilos`, le cui richieste tornano al kernel, che le controlla con i permessi dell'app. Un crash o un ciclo infinito fermano solo quel servizio.
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

**Decisione.** L'immagine di sfondo della scrivania è una copia del file scelto, in **Sistema**, una cartella condivisa della radice (impostazione `wallpaper` = id della copia). La copia si legge all'avvio e sta in uno strato fisso dietro la scrivania, alto quanto la scrivania con le sue proporzioni (`src/desktop/wallpaper.js`). Il colore (`deskColor`) è un'impostazione a parte. Deciso il 1° novembre 2026; la prima versione (lilOS 1.9.0–1.9.3) teneva l'id dell'originale, la copia è dalla 1.9.4.

**Perché.**

- **L'utente vuole che eliminare l'originale non cambi niente.** Con un riferimento, spostare il file nel cestino toglieva lo sfondo: non è quello che ci si aspetta da un'immagine «messa» come sfondo.
- **Il kernel accetta al massimo 512 KB per valore di storage.** Tenere l'immagine nelle impostazioni (come data URL, come la foto profilo, che per questo è ridotta a 192 px) non è possibile: una foto vera pesa molto di più. Un file può invece arrivare a 10 MB. La copia va quindi nel file system.
- **Una cartella di sistema, visibile.** lilOS non ha cartelle nascoste: la copia sta in Sistema (condivisa da tutti i workspace, non si rinomina né si elimina, icona `gear`, ultima in `SYSTEM_FOLDERS`), dove l'utente la vede.
- **Una sola copia.** Sistema tiene solo quella in uso: un nuovo sfondo, «Togli» e «Ripristina» eliminano la precedente per sempre (non nel cestino), così non si accumulano duplicati. `dropCopy` non tocca mai un file fuori da Sistema.
- **Lettura prima del workspace.** Con i workspace `fs` mostra solo la scrivania del workspace attuale. Uno sfondo salvato dalla 1.9.0–1.9.3 (id dell'originale, magari nella Scrivania privata di un altro workspace) si copia in Sistema al primo avvio, in `preloadWallpaper`, prima di `setupWorkspaces`. L'originale resta dov'è.

**Alternative scartate.** Un riferimento al file (la prima versione: nessun duplicato, ma eliminare il file toglieva lo sfondo); l'immagine nelle impostazioni (limite di 512 KB); una cartella nascosta (lilOS non ne ha); tutte le copie tenute in Sistema (da pulire a mano); uno sfondo per workspace (non richiesto).

**Conseguenze.**

- Eliminare o modificare l'originale non cambia lo sfondo. Eliminare la copia, anche solo spostandola nel cestino, toglie lo sfondo; ripristinarla non lo rimette.
- Scegliere un file già dentro Sistema non crea un'altra copia.
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
- **SMB solo 2 e 3**, niente SMB1 (CIFS). La libreria è [smb3-client](https://github.com/euricojardim/smb3-client) (MIT): il lavoro che ci abbiamo fatto (quattro correzioni, vedi `VENDORED.md`) si propone all'autore con pull request, e intanto resta in `netfs-smb/lib/smb3-client/`. Se l'autore non risponde, resta lì per sempre.
- **Niente scoperta automatica dei server**, per ora: l'indirizzo lo scrive l'utente.
- **Contenuti grandi nel file system del kernel.** I trasferimenti verso la home scrivono file che possono essere enormi: per questo `fs-postgres` passa alla 1.1.0 e il servizio `fs` ha `readStream` e `writeFrom` facoltativi (contenuti a pezzi da 1 MB nella tabella `lilos_chunks`).

**Perché.**

- **Il browser non apre connessioni FTP, SSH o SMB**, e comunque le password non devono passare dalla pagina più del necessario: il collegamento lo fa il kernel, che in lilOS è già il posto dei dati e dei segreti.
- **Un modulo per protocollo** tiene fuori dal kernel le librerie pesanti (ssh2, basic-ftp, SMB), le fa installare e togliere come gli altri moduli (AppStore → Kernel) e rende il contratto la sola cosa da imparare per aggiungere un protocollo. Lo stesso modello di `fs`, `auth` e `notifications` ([D31](#d31-un-kernel-modulare-con-il-controllo-degli-accessi-dentro-il-modulo-del-file-system)).
- **I trasferimenti nel kernel** perché una copia di gigabyte non può dipendere da una scheda del browser: deve sopravvivere a una pagina chiusa, a un riavvio e a una connessione che cade (tre tentativi, con ripresa da metà se il protocollo può). Le code per destinazione evitano che molte copie insieme saturino lo stesso server, e non fanno aspettare destinazioni diverse.
- **Una cartella per connessione, in Rete,** perché l'utente le usa come tutte le altre cartelle (File Manager, trascinamento, Editor) senza imparare un'altra interfaccia; la differenza (si copia, non si sposta; si elimina per sempre) è dichiarata dove conta.
- **Confermare prima di mandare la password** perché un server falso, o una chiave che cambia, è il modo più semplice di rubare credenziali.

**Alternative scartate.** Protocolli nella pagina o nell'SDK (il browser non può, e le password passerebbero dalla pagina); tutti i protocolli in un solo modulo (librerie obbligate per chi ne vuole uno); connessioni condivise tra utenti (le credenziali sono personali); trasferimenti guidati dalla pagina (finiscono con la scheda); una sola coda per tutti (una destinazione lenta frena le altre); fermare un trasferimento chiudendo la finestra (un trasferimento lungo non deve sparire per sbaglio); SMB1 (insicuro e spento in Windows); aspettare una nuova versione di smb3-client prima di usarla (le correzioni servivano subito).

**Conseguenze.**

- I moduli `netfs-*` non sono nel `config.json` del repository: vanno attivati (e `npm run kernel:setup` installa ssh2 e basic-ftp). Senza, la sezione Rete non compare.
- Password e chiavi sono protette da chi legge i file delle connessioni o una loro copia, **non** da chi può leggere la cartella del kernel: il kernel deve poterli usare da solo, e `secret.key` sta accanto ai dati. Perdere `secret.key` vuol dire dover riscrivere le password.
- Copiare è l'unica operazione tra home e server: **spostare** non esiste (si copia e si elimina a mano); tag, colori, collegamenti alle app e dati delle app non si possono mettere sui file remoti, e non ci sono miniature (andrebbero scaricati).
- Le cartelle di FTP, SFTP e WebDAV possono essere vecchie finché non si riaprono.
- Il kernel tiene copia della libreria SMB: le sue correzioni vanno mantenute finché non sono a monte.
- `fs-postgres_1.0.0` non c'è più nel repository: la 1.1.0 la sostituisce (stesso schema, più la colonna `chunks` e la tabella `lilos_chunks`, applicati da soli). Il testo di [D31](#d31-un-kernel-modulare-con-il-controllo-degli-accessi-dentro-il-modulo-del-file-system) e della decisione sul database parla della 1.0.0.
- Nuovi codici d'errore del kernel: `untrusted` (409) e `secret_required` (428), con `details`.

**Non ancora fatto.** Kerberos, DFS, lease e durable handle di SMB, i blocchi di intervallo di byte e SMB 2.0.2; i segni «in arrivo» nel File Manager per ciò che sta per essere copiato; la scoperta automatica dei server.

**Quando ripensarla.** Se serve cifrare i segreti con qualcosa che il kernel non tiene accanto a sé (un portachiavi del sistema operativo o una password dell'utente), se gli utenti vogliono connessioni condivise, se arriva un protocollo che non entra nel contratto (per esempio uno con eventi di modifica ma senza elenco), o se le correzioni di smb3-client entrano nella versione ufficiale (allora si toglie la copia).
