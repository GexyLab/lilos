# Decisioni

Registro delle scelte di architettura. Ogni voce dice cosa si è deciso, perché, cosa comporta e quando conviene ripensarla. Quando una decisione viene cambiata, non cancellarla: segnala che è superata e aggiungi la nuova.

---

## D1. JavaScript senza framework, con Vite

> Aggiornata da [D21](#d21-tree-sitter-textmate-e-language-server-nelleditor): l'Editor usa alcune dipendenze a runtime, caricate solo quando serve.

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

**Decisione.** `settings` (SDK) accetta solo chiavi dichiarate con `define()`; il valore predefinito fissa il tipo e i valori salvati di tipo diverso vengono scartati. Le impostazioni del sistema sono dichiarate in `src/systemSettings.js`. L'app Impostazioni mostra solo impostazioni che funzionano davvero.

**Perché.** `localStorage` non è affidabile (D6): così un valore rovinato o manomesso non arriva al codice. Un solo punto in cui sono dichiarate evita chiavi scritte in modi diversi.

**Conseguenze.** I valori che finiscono in CSS o nel DOM vanno comunque validati da chi li applica (il colore principale accetta solo `#rrggbb`). Il colore principale è un solo token, `--accent`, da cui le varianti derivano con `color-mix`.

## D13. La finestra delle impostazioni è un componente unico

**Decisione.** Tutte le finestre che modificano impostazioni usano `SettingsWindow`: tab principali verticali a sinistra (con gruppi, contatore e ricerca), intestazione, tab secondari orizzontali facoltativi, sezioni di righe "etichetta + controllo", piè di pagina facoltativo. Render approvato il 28 ottobre 2026: `design/settings-window.html`.

**Perché.** Un solo modello rende tutte le impostazioni riconoscibili e fa risparmiare lavoro: chi scrive un'app descrive i tab e i controlli, non l'impaginazione.

**Conseguenze.** Senza piè di pagina le modifiche si applicano subito (caso normale); con il piè di pagina (Annulla / Applica / OK) alla conferma. Nuove esigenze di impaginazione si aggiungono a `SettingsView`, non alle singole finestre.

## D14. Un registro unico delle scorciatoie, modificabili dall'utente

**Decisione.** Tutte le scorciatoie sono comandi registrati in `shortcuts` (SDK) con `id`, etichetta, gruppo, combinazioni predefinite e condizione di attività (`when`). Un solo listener esegue il comando corrispondente. Le combinazioni sono stringhe canoniche (`'Ctrl+Shift+A'`); l'utente le cambia da Impostazioni → Usabilità → Scorciatoie e vengono salvate solo quelle personalizzate (`lilos:shortcuts`). I tasti di navigazione dentro i componenti (frecce, Invio, Esc nei menu e nei tab) e Spazio + trascina restano fissi.

**Perché.** Prima ogni componente aveva il suo listener con i tasti scritti a mano: impossibile cambiarli, elencarli o evitare conflitti. Con un registro, ogni nuovo comando compare da solo nelle Impostazioni e le etichette di menu e tooltip restano giuste.

**Scelte di dettaglio.**

- Cifre per posizione del tasto (`Shift+1` funziona con ogni layout), lettere secondo il layout; Shift ignorato per i simboli, perché serve a produrli.
- Con il focus su un controllo, i tasti senza Ctrl o Alt appartengono al controllo.
- Una combinazione appartiene a un solo comando; in caso di conflitto l'utente sceglie se sostituire.
- Le combinazioni che rompono la scrittura o la navigazione (lettere da sole, Tab, Spazio) o che il browser tiene per sé non sono assegnabili.

**Da ripensare quando** serviranno scorciatoie dentro le app: probabilmente con un contesto per app (la stessa combinazione in app diverse), oggi non ammesso.

## D15. File system virtuale: la scrivania è una cartella

**Decisione.** Cartelle, file e collegamenti sono nodi di un albero (`fs` nell'SDK), salvato per intero in `lilos:fs` e validato alla lettura. Le cartelle di sistema (Scrivania, Documenti, Immagini, Download) non si rinominano né eliminano. La scrivania è la vista della cartella `/Scrivania` (dal [D27](#d27-workspace-scrivanie-separate-isolate-dal-file-system), quella del workspace attuale, privata); le posizioni degli elementi stanno a parte (oggi `lilos:ws:<id>:desktop-layout`). Desktop e app File modificano solo tramite `fs` e si aggiornano sui suoi eventi. La vecchia scrivania piatta viene migrata al primo avvio.

**Perché.** Il File Manager deve aprire cartelle vere. Una sola fonte di verità evita che desktop e File divergano.

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

**Decisione.** L'albero del file system resta in `lilos:fs` (sincrono, piccolo); il contenuto dei file va in IndexedDB (`lilos` → `contents`, chiave = id del file), con `fs.read` / `fs.write` asincroni. Se IndexedDB non c'è, il contenuto resta in memoria. I contenuti orfani si eliminano dopo l'avvio.

**Perché.** `localStorage` ha pochi MB ed è sincrono: va bene per i metadati, non per i testi. Era previsto da D6 e D15.

**Conseguenze.** Leggere un file è asincrono (l'Editor attende `read`). La dimensione dei file è reale (byte UTF-8). Eliminare un nodo elimina anche il contenuto.

## D18. Associazioni dei tipi di file e "Apri con"

**Decisione.** Le app dichiarano nel registro le estensioni che aprono (`opens`): sono le predefinite. L'utente le cambia per ogni estensione in Impostazioni → Usabilità → Tipi di file, anche con "Chiedi ogni volta"; si salvano solo le scelte diverse dalla predefinita (`lilos:file-apps`). Senza app associata compare la finestra "Apri con", che può ricordare la scelta.

**Perché.** Richiesta esplicita; è il modello che gli utenti conoscono dai sistemi operativi.

**Conseguenze.** Tutte le aperture di file passano da `openFile`. Le scorciatoie delle app sono dichiarate nel registro (`commands`) e registrate all'avvio, così sono nelle Impostazioni anche prima che l'app venga caricata.

## D19. Editor con textarea ed evidenziazione sovrapposta, senza librerie

> Aggiornata da [D21](#d21-tree-sitter-textmate-e-language-server-nelleditor): la textarea sovrapposta resta, l'evidenziazione può venire da Tree-sitter o TextMate.

**Decisione.** L'Editor usa una `textarea` trasparente sopra una copia evidenziata con le stesse misure, e un piccolo evidenziatore a espressioni regolari scritto nel progetto.

**Perché.** Nessuna dipendenza (D1); la `textarea` dà gratis cursore, selezione, Annulla, accessibilità e input da tastiere straniere.

**Conseguenze.** Niente a capo automatico (le righe devono coincidere); evidenziazione approssimata, non un vero analizzatore; oltre 300 000 caratteri il testo non viene colorato.

**Da ripensare quando** serviranno più documenti per finestra, cerca e sostituisci, a capo automatico o file molto grandi: valutare un editor dedicato (per esempio CodeMirror) caricato solo nell'app.

## D20. Suggerimenti dell'Editor con vocabolari nel codice, per ora

> Superata da [D21](#d21-tree-sitter-textmate-e-language-server-nelleditor): i vocabolari restano solo quando non c'è un language server.

**Decisione.** I suggerimenti dell'Editor vengono da elenchi scritti nel progetto (`src/apps/editor/complete.js`) e da un riconoscimento del contesto con espressioni regolari, più le parole del documento. Si aprono da soli mentre si scrive e con Ctrl Spazio (scorciatoia modificabile).

**Perché.** Nessuna dipendenza (D1), risposta immediata, e copre i casi frequenti (parole chiave, proprietà e valori CSS, tag e attributi HTML).

**Alternative per il futuro** (formati standard, da valutare se i suggerimenti devono diventare più ricchi):

- **Dati di VS Code per HTML e CSS** (`html-data` / `css-data`, pacchetto `@vscode/web-custom-data`): JSON con tag, attributi, proprietà e valori presi da MDN, con descrizioni. Si potrebbero caricare al posto degli elenchi, anche solo per le parti usate.
- **Language Server Protocol**: il protocollo standard per completamento, errori e informazioni. I servizi di VS Code per HTML, CSS e JSON (`vscode-html-languageservice` e simili) girano anche nel browser, in un worker; per JSON con **JSON Schema**.
- **Grammatiche TextMate** (`.tmLanguage.json`, usate da VS Code, Sublime, Shiki) o **Tree-sitter** per l'evidenziazione: più precise, ma richiedono un motore (Oniguruma o Tree-sitter in WebAssembly).
- **Snippet** nel formato di VS Code/TextMate (`$1`, `$0` per le posizioni del cursore), al posto del nostro `|`.

## D21. Tree-sitter, TextMate e Language Server nell'Editor

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

**Perché.** Richiesta esplicita, e un modello riutilizzabile per altri menu (File, finestre).

**Conseguenze.** Una voce salvata che riferisce un'azione sconosciuta o con parametri non validi viene ignorata, non rompe il menu. Le azioni vanno dichiarate prima di costruire il menu.

## D23. Temi chiaro e scuro con token

**Decisione.** Impostazione `theme` (`'dark'` predefinito, `'light'`) che imposta `data-theme` su `<html>`. I token si dividono in due famiglie (superfici delle finestre; scrivania e barra): il tema scuro scurisce anche le finestre, il chiaro schiarisce anche scrivania, barra e menu. Tutti i colori scritti a mano negli stili sono diventati token. TextMate usa `github-light` o `github-dark`.

**Perché.** Richiesta esplicita. Con i token un tema è un insieme di valori, non un altro foglio di stile.

**Conseguenze.** L'aspetto predefinito cambia: prima la scrivania era scura con finestre chiare, ora con il tema scuro anche le finestre sono scure. Gli stili nuovi devono usare solo token.

## D24. Cartella aperta nell'Editor e `fs.move`

**Decisione.** L'Editor apre una cartella in un pannello a destra (`FileTree.js`), ridimensionabile dal bordo sinistro. La cartella è la radice: dentro si crea, rinomina, sposta ed elimina; fuori non si va (anche "Sposta in…" mostra solo le sue cartelle). Per spostare serve una nuova operazione dell'SDK, `fs.move(id, parentId)`, con l'evento `change` di tipo `move` (`from`, `ids`). Cartella aperta, cartelle espanse e larghezza sono condivise tra le finestre dell'Editor (`lilos:editor-tree`).

**Perché.** Richiesta esplicita (pannello a destra, gestione del contenuto, ridimensionabile). Spostare un nodo cambiando `parent` conserva id e contenuto: chi ha aperto il file non lo perde, deve solo aggiornare percorso e URI. Limitare le azioni alla radice evita di modificare per sbaglio cartelle fuori dal progetto.

**Conseguenze.** Ogni vista che segue `fs` deve gestire `move` (scrivania, File, Editor lo fanno): un elemento può comparire o sparire da una cartella senza `create` o `remove`. Lo spostamento esiste per ora solo nel pannello dell'Editor; File e scrivania non trascinano ancora dentro le cartelle.

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

- Le finestre ridotte, secondarie (selettori, proprietà, impostazioni dell'Editor) e quelle ingrandite non si ricordano com'erano: le secondarie si chiudono, le ingrandite tornano non ingrandite, Impostazioni riparte dalla prima scheda.
- L'app che vuole riaprirsi com'era imposta `getState` e accetta i dati in `args` (vedi la [ricetta](../sviluppatore/ricette.md#far-riaprire-la-finestra-di-unapp-da-una-workarea)); lo stato è al massimo 4000 caratteri di JSON.
- Gli elementi nascosti di una workarea ridotta restano nodi di `/Scrivania`: compaiono nell'app File.
- Le workarea sono dati di sistema, non nodi del file system: le icone delle workarea non sono salvate nelle posizioni della scrivania (`lilos:ws:<id>:desktop-layout`).
- La voce **Nuovo → Workarea** è predefinita: un menu già personalizzato dall'utente non la riceve da solo.
- Ogni workarea aperta aggiunge un oggetto al canvas, sotto tutti gli altri, che lascia passare il puntatore: serve fare attenzione a non catturare i clic dentro l'area.

**Quando ripensarla.** Se serviranno aree che si sovrappongono o contenuto indipendente dalla posizione (appartenenza dichiarata), o quando arriverà il "workspace" vero e proprio, per decidere come convivono (arrivato con D27: ogni workspace ha le sue workarea, salvate in `lilos:ws:<id>:workareas`).

## D26. Annulla e ripeti centrali, per chi ha il focus

**Decisione.** Ctrl Z e Ctrl Y (anche Ctrl Shift Z) sono due comandi unici (`src/systemHistory.js`) che agiscono sulla cronologia di **chi ha il focus**. Ogni posto che ha azioni da annullare tiene una `UndoStack` (SDK, `sdk/core/history.js`) e la collega a un suo elemento con `history.attach`: la scrivania (`desktop.history`, la radice), ogni finestra File, il pannello della cartella dell'Editor. `history.resolve()` parte dall'elemento con il focus e sale fino al primo con un gestore; senza focus vale la finestra attiva; una finestra senza cronologia non fa nulla (non si tocca la scrivania dietro); senza finestra attiva vale la scrivania. Le azioni sul file system passano da `src/items/fsHistory.js`; per eliminare, `fs.snapshot` copia nodi e contenuti prima di `fs.remove`, e `fs.restore` li rimette con gli stessi id.

**Perché.** Annullare l'eliminazione era il limite più sentito (allora non c'era un cestino; vedi [D28](#d28-il-cestino-è-una-seconda-radice-nascosta-del-file-system)). Una cronologia unica e globale mescolerebbe cose che l'utente non vede insieme: Ctrl Z in una finestra File non deve annullare lo spostamento di un'icona dall'altra parte della scrivania. Legare la cronologia al focus rende il comportamento prevedibile e permette a ogni app di avere la sua senza che il sistema ne sappia nulla. Una voce con `undo` e `redo` (e non uno stato intero da ripristinare) funziona per azioni diverse e leggere, come un trascinamento.

**Conseguenze.**

- **Una cronologia per posto, non una globale.** Chi aggiunge un'app con azioni annullabili crea la sua `UndoStack` e la collega (vedi la [ricetta](../sviluppatore/ricette.md#aggiungere-annulla-e-ripeti-a-unapp)). Le finestre senza cronologia (Impostazioni) non annullano nulla.
- **Voci asincrone.** `undo` e `redo` possono restituire una Promise (lo snapshot legge i contenuti da IndexedDB). Un solo passo alla volta: finché uno è in corso, gli altri rispondono `null`.
- **Una voce che fallisce si toglie.** Se `undo` o `redo` lancia (per esempio la cartella non esiste più), la voce viene scartata e compare "Non si può più fare: …": la cronologia non resta mai bloccata.
- **I campi di testo tengono l'annulla del browser**, a meno che il gestore dica `text: true`. L'Editor lo dice e usa `document.execCommand('undo' | 'redo')`: la cronologia della `textarea` include scrittura, suggerimenti e rientri, che non si possono rifare a mano.
- **Le cronologie vivono solo in memoria** (massimo 100 voci ciascuna): dopo una ricarica sono vuote, e quella di una finestra File si perde alla chiusura.
- **Eliminare è annullabile.** Dal D28 l'eliminazione normale va nel cestino e annullare è `fs.untrash`; lo snapshot, preso prima di rimuovere, resta per l'eliminazione definitiva (`deletePermanent`). Nel caso dello snapshot il costo è la memoria: i testi di una cartella eliminata restano nella voce finché la cronologia la ricorda.
- Annullare uno spostamento nell'Editor non rimette il nome cambiato per renderlo unico.

**Quando ripensarla.** Se serviranno cronologie che sopravvivono alla ricarica (andrebbero salvate, con un limite di spazio), un annulla globale che attraversi più posti.

## D27. Workspace: scrivanie separate, isolate dal file system

**Decisione.** Un **workspace** (`src/workspaces/`) è una scrivania completa e separata. Ne ha una per sé: la cartella Scrivania, la vista, le posizioni degli elementi, le workarea, le finestre aperte e le app installate. L'elenco è in `lilos:workspaces`; le parti di ciascuno in `lilos:ws:<id>:camera | desktop-layout | workareas | windows`. Le regole:

- **L'isolamento sta in `fs`, non nelle viste.** La Scrivania di un workspace è una cartella `private` con `workspace` = il suo id. Con `fs.setWorkspace(id)`, le cartelle private degli altri workspace e tutto ciò che contengono non esistono per nessuna operazione di `fs`. Documenti, Immagini e Download sono condivise.
- **Ogni nodo ricorda chi l'ha creato** (`workspace`), anche fuori dalla propria Scrivania; spostare o rinominare non lo cambia. Le cartelle di sistema condivise non hanno proprietario. L'app File mostra il proprietario in una colonna.
- **Cambiare workspace non chiude nulla.** Le finestre del workspace lasciato restano aperte e nascoste (`ws-away`), con il testo non salvato; la cronologia annulla della scrivania riparte. Le finestre delle app fuori dalle workarea si salvano per workspace e si riaprono alla prima visita della sessione.
- **App installate per workspace.** File e Impostazioni sono `system` (sempre installate). Menu di avvio e "Apri con" mostrano solo le installate; un'app non installata non parte (messaggio). Disinstallare chiude, chiedendo, le finestre di quell'app nel workspace attuale. Le associazioni dei tipi di file restano globali.
- **Eliminare un workspace non cancella mai file** (neanche quelli nel cestino: dal [D28](#d28-il-cestino-è-una-seconda-radice-nascosta-del-file-system) ciò che aveva cestinato dalla sua Scrivania diventa visibile a tutti, `fs.unscopeTrash`). La sua Scrivania diventa `/Documenti/Scrivania di <nome>` (rimossa se vuota; `fs.share`), le sue finestre delle app passano nel workspace attuale con il testo non salvato (`wm.adopt`; le secondarie si chiudono). Workarea, vista, posizioni e app installate si perdono. Nell'elenco resta una voce "rimossa" con nome e colore, perché i suoi file dicano ancora di chi erano.
- **Preferenze globali.** Tema, colore principale, scorciatoie, menu e tipi di file valgono per tutti i workspace.
- **Avvio e migrazione.** I dati di prima dei workspace diventano un workspace «Principale», proprietario di tutti i nodi esistenti (`fs.claim`), con la vecchia `/Scrivania` resa privata e le chiavi `camera`, `desktop-layout`, `workareas` portate sotto `ws:<id>:`. All'avvio si ripara: Scrivania privata senza workspace (il workspace torna), workspace senza Scrivania (ne riceve una vuota), chiavi di workspace inesistenti (cancellate). Al massimo 20 workspace vivi.

**Perché.** Richiesta esplicita: cambiando workspace si hanno elementi diversi sul desktop e ognuno vede solo i suoi, ma i file in altre posizioni sono visibili a tutti e deve essere sempre possibile capire di quale workspace fanno parte. Mettere la visibilità in `fs` fa rispettare l'isolamento a ogni vista (scrivania, File, selettori, pannello dell'Editor) e a ogni app futura senza che lo sappiano; filtrare nelle viste ne dimenticherebbe sempre una. Nascondere le finestre invece di chiuderle evita di perdere il testo non salvato a ogni cambio. Non cancellare i file eliminando un workspace segue la regola del progetto: senza cestino, le azioni distruttive vanno evitate. Le preferenze sono globali perché sono dell'utente, non del lavoro.

**Alternative scartate.** Filtrare nelle singole viste: fragile. Un'etichetta o una cartella per workspace con le viste filtrate dall'esterno: l'isolamento non sarebbe garantito. Chiudere le finestre cambiando workspace: perde testo. Cancellare i file con il workspace: irreversibile. Preferenze per workspace: più complessità senza una richiesta.

**Conseguenze.**

- Ogni modulo che salva dati del lavoro (vista, posizioni, workarea, finestre) usa una chiave per workspace (`workspaceKey`) e va aggiunta a `PARTS`, o resta nei dati dopo l'eliminazione.
- `Desktop`, `Canvas` e `Workareas` si sanno ricaricare (`load`, `useCamera`) invece di essere ricreati.
- Una finestra appartiene al workspace in cui è nata; `wm.windows` e `wm.get` guardano solo il workspace attuale.
- Un file condiviso aperto in un Editor di un altro workspace e poi spostato nella Scrivania privata del workspace attuale diventa invisibile a quell'Editor: salvare fallisce.
- Le finestre di un workspace eliminato finiscono al centro della vista attuale, anche dentro una workarea attuale.
- Un'app nuova nel registro non è installata nei workspace già salvati: l'utente la attiva in Impostazioni → Workspace.
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
- Dopo il ripristino di un elemento, Ctrl Z lo rimette nel cestino. **Eliminare definitivamente dal cestino non si annulla**, per questo l'app File chiede sempre conferma. Con `deletePermanent` si usa ancora lo snapshot (D26), che vale solo finché la pagina resta aperta.
- Ripristinare la scrivania e i file iniziali cancella anche il cestino (azzera `lilos:fs`).
- Il cestino aumenta la dimensione di `lilos:fs` (vedi il limite di `localStorage` nei limiti noti).

**Quando ripensarla.** Se `lilos:fs` si avvicinasse al limite di `localStorage` (i nodi cestinati pesano come gli altri), se servissero cestini per cartella o per utente, o se anche le workarea dovessero passare dal cestino.

---

## D29. I tag stanno sui nodi e un tag invisibile nasconde gli elementi

**Decisione.** Un tag è `{ id, name, color, visible }`, definito nell'SDK (`tags`, `sdk/core/tags.js`) e salvato in `lilos:tags`. L'assegnazione sta sul nodo del file system: il campo `tags` (id dei tag, al massimo 30, mai sui nodi di sistema), che si cambia con `fs.setTags` e si legge con `fs.tagged(tagId)` (tutti i nodi con il tag che il workspace attuale vede, esclusi quelli nel cestino). Un tag **invisibile** nasconde gli elementi che lo hanno, ovunque: `tags` comunica a `fs` l'insieme dei tag nascosti (`fs.setHiddenTags`, evento `scope`) e `fs.children()` esclude i nodi che ne hanno uno. `get`, `exists`, `resolve`, `ancestors`, `path`, `read` e `tagged` li trovano ancora. Gli elementi nascosti si ritrovano solo cercando per tag (la vista del tag in File). Eliminare un tag lo toglie da tutti gli elementi, cestino compreso (`fs.dropTag`). I tag sono globali: gli stessi in tutti i workspace.

**Perché.**

- *Nodo.* Il tag segue l'elemento quando lo si sposta, rinomina, cestina e ripristina, e vale per scrivania, File e Editor senza codice in più. `snapshot`/`restore` e il cestino (D28) lo conservano già.
- *Nascondere in `children()`.* È l'unico punto da cui tutte le viste (scrivania, File, selettore, pannello dell'Editor, conteggi) leggono gli elenchi: nessuna deve saperlo. Non si nasconde in `get`/`exists` perché una finestra aperta su un file con un tag invisibile, l'Editor, la vista del tag, "Mostra nella cartella" e le scorciatoie devono continuare a trovarlo; sarebbe come eliminarlo.
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
- Un utente può "perdere" file nascondendoli senza ricordarselo: la guida lo spiega e File mostra i tag invisibili con il simbolo dell'occhio barrato.
- Il nome dell'elemento è ancora unico nella sua cartella anche se nascosto: creare un file con lo stesso nome di uno nascosto dà un nome con il numero.
- `lilos:fs` cresce di poco: al massimo 30 id per nodo.
- Mettere o togliere un tag non si annulla (non entra nella cronologia, D26).
- Il ripristino "Scrivania e file iniziali" cancella anche `lilos:tags`.

**Quando ripensarla.** Se servissero tag diversi per workspace, tag annidati o con regole (per esempio "nascondi solo sulla scrivania"), se i nodi crescessero tanto da rendere lento `tagged` (oggi scorre tutti i nodi), o se si volesse cercare per tag anche dal menu di avvio.

---

## D30. Un solo modulo di trascinamento per tutte le viste di file e cartelle

**Decisione.** Il trascinamento di file e cartelle sta in `src/items/itemDrag.js` e lo usano la scrivania, l'app File e il pannello dell'Editor. Una vista fa tre cose: `markItem(el, node)` marca l'elemento che mostra un nodo (`data-node`), `dropZone(el, zone)` registra un'area che accetta rilasci, `dragItems(e, { ids, stack, … })` avvia il trascinamento da un `pointerdown`. Il bersaglio si trova dal DOM: sotto il puntatore, risalendo gli antenati, vale la prima zona registrata o il primo elemento marcato che è una cartella; un elemento `.window` ferma la ricerca (un rilascio sopra una finestra non arriva mai alla scrivania sotto). Un file marcato lascia passare il rilascio a ciò che lo contiene. Lo spostamento (`moveNodes` in `fsHistory.js`) è **un solo passo** di annulla e si registra **una volta**, nella cronologia della vista da cui parte il trascinamento. L'app File tiene nella sezione «Collegamenti» della barra laterale le voci fisse (Home, Scrivania…) e i collegamenti, nell'ordine scelto dall'utente; i tag e il Cestino stanno sotto, fuori dall'ordine (`src/items/links.js`, `lilos:files-sidebar`): una lista di chiavi (id di nodo, `desk`), massimo 80, condivisa tra workspace.

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
- Nella barra laterale di File decide `#sideTarget` dalla posizione: nella sezione Collegamenti, al centro di una cartella sposta (annullabile), tra due voci crea o sposta un collegamento (non annullabile); sul Cestino elimina sempre (annullabile nella finestra di partenza); sui tag e sotto il Cestino non fa nulla. Eliminare un collegamento (×, Canc, menu) toglie solo la voce e si annulla con Ctrl Z nella finestra File.
- Non c'è copia (Ctrl), né apertura automatica delle cartelle al passaggio, né spostamento da tastiera su scrivania e File; il blocco Tag della barra laterale non è un bersaglio (al centro non fa nulla).

**Quando ripensarla.** Se serviranno la copia o il taglia/copia/incolla (conviene allora un'operazione scelta dal bersaglio, non dalla vista di partenza), il trascinamento da e verso il sistema operativo (qui il drag nativo diventa inevitabile, per i file esterni), lo spostamento da tastiera, oppure se le viste diventassero così tante da rendere lenta la ricerca dal DOM.
