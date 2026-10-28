# Processo

## Verificare una modifica

Il repository non ha ancora una suite di test. Prima di ogni commit:

1. `npm run build` deve terminare senza errori.
2. Prova la modifica nel browser con `npm run dev`, con la console aperta: non devono comparire errori.
3. Ripeti la parte della lista seguente che riguarda l'area toccata.

### Lista di controllo manuale

Parti da una scrivania pulita: `localStorage.clear()` nella console, poi ricarica.

**Scrivania**
- [ ] Spazio + trascina e il tasto centrale spostano la vista, anche partendo da sopra gli elementi; trascinare lo sfondo con il tasto sinistro **non** la sposta.
- [ ] Trascinare lo sfondo disegna il rettangolo e seleziona quello che tocca; Alt + trascina disegna il percorso libero e seleziona quello che ha il centro dentro; con Ctrl o Shift si aggiunge alla selezione; il disegno sparisce al rilascio.
- [ ] Cambiando in Impostazioni la combinazione del percorso libero (es. Ctrl + Alt), Alt da solo disegna il rettangolo.
- [ ] La rotella fa zoom attorno al puntatore; la percentuale nel pannello si aggiorna.
- [ ] Ctrl + / Ctrl − / Ctrl 0 e Shift 1 funzionano; Ctrl + rotella non cambia lo zoom della pagina.
- [ ] Clic e trascinamento sulla minimappa spostano la vista.
- [ ] Ricaricando, la vista resta dov'era.

**Elementi**
- [ ] Al primo avvio compaiono i 5 elementi di esempio (Progetti, benvenuto.txt, File, Terminale, Impostazioni) e le cartelle di sistema.
- [ ] Una vecchia `lilos:desktop` viene migrata con le posizioni e poi eliminata.
- [ ] Clic seleziona; Ctrl + clic aggiunge e toglie; clic sullo sfondo ed Esc tolgono la selezione; Ctrl A seleziona tutto.
- [ ] Il trascinamento sposta tutta la selezione e allinea alla griglia al rilascio; Ctrl Z rimette le icone dove erano.
- [ ] Tasto destro sullo sfondo → Nuova cartella: compare nel punto del clic con il nome in modifica.
- [ ] F2 seleziona il nome senza estensione; Invio conferma, Esc annulla, un nome già usato riceve un numero.
- [ ] Rinominando `x.txt` in `x.pdf` l'icona cambia.
- [ ] Canc elimina; Riordina icone dispone gli elementi nella vista.
- [ ] Ricaricando, posizioni e nomi restano.

**Finestre e Impostazioni**
- [ ] Impostazioni si apre dal menu di avvio, dal piè di pagina del menu e dal collegamento sul desktop; avviandola di nuovo torna in primo piano la stessa finestra.
- [ ] Il titolo segue la sezione ("Impostazioni — Aspetto"); frecce su/giù cambiano sezione, sinistra/destra le schede.
- [ ] La ricerca filtra le sezioni e mostra la scheda giusta; Esc la svuota; "Nessun risultato" se non trova nulla.
- [ ] Colore principale, animazioni, griglia e minimappa hanno effetto subito e restano dopo la ricarica.
- [ ] Trascinamento dalla barra del titolo; ridimensionamento da ognuno degli 8 bordi e angoli (il lato opposto resta fermo), anche a zoom diversi da 100%; dimensioni minime e massime rispettate; il centro del pulsante Chiudi chiude, non ridimensiona.
- [ ] Una `Window` con `controls` o `resizable` ridotti (anche cambiati dopo con `setControl` / `setResizable`) mostra solo pulsanti e bordi attivi; barra, doppio clic sul titolo e Alt W rispettano i controlli spenti.
- [ ] Ingrandisci e ripristina (anche con doppio clic sul titolo), riduci a icona e riapri dalla barra, chiudi.
- [ ] Con una finestra in primo piano Canc, Ctrl A ed Esc non agiscono sul desktop; dopo un clic sulla scrivania sì.
- [ ] `lilos:settings` con valori sbagliati (tipi diversi, colori non validi) viene ignorato senza errori.

**App File**
- [ ] Doppio clic su una cartella della scrivania la apre in File; un'altra cartella si apre nella stessa finestra.
- [ ] Barra laterale, percorso cliccabile, Indietro/Avanti/Su (anche Alt ←/→/↑ e Backspace), ricerca con Esc.
- [ ] Nuova cartella e nuovo file con rinomina in linea; F2, Canc, Invio, Ctrl A, Esc funzionano come sulla scrivania; frecce e Shift per selezionare.
- [ ] Le cartelle di sistema non si rinominano né eliminano; eliminare (Canc, menu) chiede conferma con un piccolo menu e sposta nel cestino.
- [ ] Ordinamento per colonna, vista a icone (ricordata), messaggio per i file senza app.
- [ ] Quello che cambia in File nella cartella Scrivania compare subito sulla scrivania, e viceversa.
- [ ] `lilos:fs` manomesso (tipi sconosciuti, cicli, nomi con `/`) viene ripulito senza errori; i nomi con HTML si vedono come testo.

**Trascinamento di file e cartelle e collegamenti**
- [ ] Scrivania: trascinare file e cartelle (uno e più selezionati) su una cartella della scrivania li sposta lì; le icone tornano prima al loro posto, quindi un solo Ctrl Z li rimette nel punto di partenza. Compare «Spostato … in …».
- [ ] Scrivania: rilasciare sulla scrivania riposiziona come prima; rilasciare sopra una finestra senza cartella sotto il puntatore, fuori dalla scrivania o premere Esc rimette tutto com'era; un rilascio sopra una finestra non arriva alla scrivania sotto.
- [ ] Un clic semplice su uno di più elementi selezionati restringe la selezione al rilascio, non alla pressione (sulla scrivania e in File).
- [ ] File → scrivania: trascinare dall'elenco (e dalla vista a icone) sulla scrivania sposta nella cartella Scrivania e dispone gli elementi dal punto di rilascio; Ctrl Z nella finestra File li rimette nelle cartelle d'origine con il nome di prima.
- [ ] File: rilasciare su una cartella, sulla parte vuota dell'elenco, su una parte del percorso e al centro di una cartella della barra laterale; la destinazione si evidenzia; non si evidenzia (e non succede nulla) con una cartella dentro se stessa o la cartella dove l'elemento già si trova, né nel Cestino aperto né nella vista di un tag; le cartelle di sistema non si spostano; al centro del blocco Tag non succede niente.
- [ ] File: rilasciare al centro della voce Cestino elimina (anche con «Elimina definitivamente» attivo si va nel cestino) con messaggio; Ctrl Z nella finestra di partenza lo rimette; gli elementi nel Cestino aperto non si trascinano.
- [ ] Editor: trascinare una riga del pannello su una cartella, su una riga di file (va nella cartella di quel file) e sulla parte vuota (va nella radice); da e verso la scrivania e File; Esc annulla; Ctrl Z nel pannello rimette l'elemento.
- [ ] Barra laterale di File: in cima la sezione «Collegamenti» (Home, Scrivania, Documenti, Immagini, Download e i collegamenti); sotto, fuori dall'ordine, i Tag, il separatore e il Cestino. Trascinare un file o una cartella nella sezione tra due voci (fascia di circa 8 px dal bordo), sul collegamento a un file o nella parte vuota in fondo (circa 10 px) crea un collegamento in quel punto, indicato da una linea, con il messaggio «Collegamento aggiunto»; sul centro di una cartella (voce fissa o collegamento) sposta davvero (Ctrl Z); un elemento già nella sezione si sposta invece di duplicarsi; rilasciato dov'è già non fa nulla.
- [ ] Cestino della barra: rilasciare al centro o ai bordi lo manda sempre nel cestino e non crea mai un collegamento; sui Tag e nello spazio sotto il Cestino non succede niente (nessuna linea).
- [ ] Le voci della sezione (collegamenti e fisse: Home, Scrivania, Documenti…) si riordinano trascinandole; Tag e Cestino non si trascinano né entrano nell'ordine; un collegamento trascinato fuori dalla barra trascina l'elemento vero (su una cartella lo sposta).
- [ ] Eliminare un collegamento: il pulsante × al passaggio del mouse o con il focus (aria-label «Elimina il collegamento a «nome»»), il tasto Canc sul collegamento con il focus (non tocca i file selezionati nell'elenco), «Elimina il collegamento» dal tasto destro; il file resta, compare «Collegamento a «nome» eliminato» e Ctrl Z nella finestra File lo rimette al suo posto; le voci fisse non si eliminano.
- [ ] «Aggiungi alla barra laterale di File» dal menu (scrivania, File, Editor) aggiunge in fondo, non compare per le cartelle di sistema né per un elemento già collegato; clic su un collegamento apre cartella, file o app; tasto destro: Apri, Mostra nella cartella, Elimina il collegamento; dopo rinomina o spostamento il collegamento resta; nel cestino o su un'altra Scrivania non si vede e torna al suo posto; l'ordine resta dopo la ricarica e in ogni workspace; `lilos:files-sidebar` manomesso (non un elenco, doppioni, non stringhe, più di 80, chiavi `tags`/`trash` vecchie) viene ripulito o ignorato senza errori; una vecchia `lilos:files-links` viene letta una volta e tolta; «Scrivania e file iniziali» cancella `lilos:files-sidebar`.

**Cestino**
- [ ] Eliminare un file o una cartella (anche con contenuto) chiede conferma ("Sposta nel cestino…") e lo manda nel cestino; Ctrl Z lo rimette; ricaricando, l'elemento è ancora in File → Cestino.
- [ ] Impostazioni → Usabilità → Cestino: senza "Chiedi conferma" si elimina subito; con "Elimina definitivamente" l'elemento non va nel cestino e si recupera solo con Ctrl Z fino alla ricarica.
- [ ] File → Cestino: colonne Nome / Eliminato / Dimensione / Tipo / Posizione originale ordinabili; gli elementi non si aprono né si rinominano; Nuova cartella è disattivata.
- [ ] Ripristina (menu, anche su più elementi) rimette nella cartella d'origine, o in Home se non c'è più, con numero aggiunto se il nome esiste; compare il messaggio con la destinazione; Ctrl Z li rimette nel cestino. Ripristina tutto dal menu dello sfondo.
- [ ] Canc o "Elimina definitivamente…" nel cestino e "Svuota il cestino…" chiedono sempre conferma; dopo, gli elementi non tornano con Ctrl Z.
- [ ] "Conserva gli elementi per": con 1 giorno, un elemento cestinato da più di un giorno sparisce al riavvio (prova cambiando `trashed.at` in `lilos:fs`); con "Per sempre" resta.
- [ ] Un elemento eliminato dalla Scrivania di un workspace non si vede nel cestino di un altro; eliminando il workspace, diventa visibile a tutti.
- [ ] "Impostazioni predefinite" riporta conferma, eliminazione definitiva e periodo ai valori iniziali; "Scrivania e file iniziali" svuota anche il cestino.

**Annulla e ripeti**
- [ ] Sulla scrivania (nessuna finestra in primo piano): creare con nome, rinominare, eliminare (anche una cartella con file dentro), trascinare, Riordina icone e creare, spostare, rinominare, eliminare una workarea si annullano con Ctrl Z e si ripetono con Ctrl Y e Ctrl Shift Z; un elemento eliminato torna con il contenuto e al suo posto; in basso compare "Annullato: …" / "Ripetuto: …".
- [ ] Con il focus in una finestra File, Ctrl Z annulla solo le azioni di quella finestra (crea con nome, rinomina, elimina), non quelle della scrivania.
- [ ] Nell'Editor: Ctrl Z nel testo annulla la scrittura; con il focus nel pannello della cartella annulla crea, rinomina, sposta, elimina del pannello.
- [ ] In Impostazioni Ctrl Z non fa nulla e non tocca la scrivania; in un campo di testo annulla la scrittura del campo.
- [ ] Dopo aver annullato un'eliminazione la cui cartella è stata tolta, compare "Non si può più fare: …" e la voce sparisce.
- [ ] Dopo una ricarica Ctrl Z non annulla nulla. Le scorciatoie si cambiano in Impostazioni → Usabilità → Scorciatoie (gruppo Modifica).

**Workspace**
- [ ] Al primo avvio c'è il workspace «Principale» (pulsante accanto al logo con pallino e nome) con gli elementi di esempio. Con dati di prima dei workspace (`lilos:fs` con `/Scrivania`, `lilos:camera`, `lilos:desktop-layout`, `lilos:workareas`) compare «Principale» con gli stessi elementi, posizioni, vista e workarea; le vecchie chiavi non ci sono più e ci sono quelle `lilos:ws:<id>:…`.
- [ ] Menu del pulsante: elenco con la spunta sull'attuale, Successivo / Precedente (disattivi con un solo workspace), Nuovo workspace (lo crea e ci passa, con scrivania vuota), Gestisci i workspace… (apre Impostazioni → Workspace). Ctrl Alt → e Ctrl Alt ← cambiano workspace anche mentre si scrive; compare «Workspace «nome»».
- [ ] La scrivania del nuovo workspace è vuota; la sua cartella Scrivania non si vede nell'altro, né in File (barra laterale, percorso, ricerca), né nei selettori, né nel pannello dell'Editor. Documenti, Immagini e Download si vedono da tutti.
- [ ] Ogni workspace ricorda vista, posizioni e workarea; ricaricando, il workspace attuale resta quello.
- [ ] Cambiando workspace le finestre aperte spariscono (anche dalla barra) senza chiudersi: tornando, l'Editor ha ancora il testo non salvato; il focus torna alla finestra che l'aveva. Ctrl Z riparte dalla cronologia della nuova scrivania.
- [ ] Ricaricando, le finestre fuori dalle workarea tornano per ogni workspace (quelle del workspace non attuale alla prima visita), nella stessa posizione.
- [ ] File: colonna Workspace con pallino e nome, ordinabile; «Condiviso» sulle cartelle di sistema; un file creato in Documenti da un workspace dice quale, anche visto da un altro; nella vista a icone il tooltip dice «Workspace: …».
- [ ] Impostazioni → Workspace → Questo workspace: rinomina e colore si vedono subito nel pulsante e in File; il numero di elementi creati cresce creando file; disinstallare un'app la toglie dal menu di avvio e chiude (chiedendo, se ci sono modifiche) le sue finestre; avviare un collegamento a un'app non installata mostra un messaggio; aprire un file la cui app non è installata mostra «Apri con» con solo le app installate.
- [ ] Impostazioni → Workspace → Tutti: Passa a questo, Elimina… (due clic), Crea; l'ultimo workspace non si elimina.
- [ ] Eliminare un workspace con file sulla scrivania: la cartella Documenti/Scrivania di <nome> li contiene; con la scrivania vuota non resta nessuna cartella; le sue finestre delle app compaiono nel workspace attuale con il testo non salvato, quelle secondarie si chiudono; i file creati da quel workspace in altre cartelle mostrano «Nome (eliminato)».
- [ ] Con 20 workspace «Nuovo workspace» mostra un messaggio.
- [ ] Riparazioni: cancellando `lilos:workspaces` con `lilos:fs` intatto tornano i workspace (nome «Workspace recuperato»); chiavi `lilos:ws:xyz:…` di un workspace inesistente spariscono all'avvio. Ripristino «Scrivania e file iniziali» in Impostazioni cancella anche workspace e workarea.

**Tag**
- [ ] Tasto destro su un file o una cartella (scrivania e File) → Tag: un pallino colorato per tag; "Nuovo tag…" apre Impostazioni → Tag con il campo del nome attivo; il tag creato lì va sugli elementi selezionati. Su una cartella di sistema (Documenti…) la voce Tag è disattivata.
- [ ] Scegliere un tag lo mette (pallino in basso a destra dell'icona sulla scrivania, nelle icone di File, dopo il nome nell'elenco); con più elementi selezionati, se tutti l'hanno compare la spunta e sceglierlo lo toglie a tutti, altrimenti lo mette a tutti. Dopo 4 tag compare «+n»; i nomi sono nel tooltip.
- [ ] Impostazioni → Tag: Crea (anche con Invio); nome vuoto o già usato (anche con maiuscole diverse) mostra un messaggio e non crea; un nuovo tag prende il primo colore non usato; rinominare, cambiare colore e interruttore Visibile hanno effetto subito sui pallini e in File; Elementi dice quanti sono; Mostra in File apre la vista del tag; Elimina… chiede due clic.
- [ ] File → barra laterale → Tag: una voce per tag (il tag invisibile ha l'occhio barrato). La vista mostra tutti gli elementi con quel tag, anche in cartelle diverse e sulla scrivania, con colonne Nome / Posizione / Tipo / Workspace; ricerca, ordinamento, apri, rinomina, elimina funzionano; Nuova cartella è disattivata; "Mostra nella cartella" apre la cartella con l'elemento selezionato; "Togli il tag «X»" lo toglie; la barra di stato dice «Tutti gli elementi con questo tag». La finestra ricorda la vista dopo la ricarica.
- [ ] Rendere invisibile un tag: gli elementi spariscono subito da scrivania, File (elenco, ricerca, conteggi), selettore dei file e pannello dell'Editor, ma restano nella vista del tag (barra di stato «Tag invisibile: …»); una finestra dell'Editor con un file nascosto continua a funzionare. Tornando visibile, gli elementi ricompaiono sulla scrivania nello stesso posto, anche dopo la ricarica. "Mostra nella cartella" su un elemento nascosto non lo seleziona e lo dice.
- [ ] Un elemento che prende un tag invisibile sparisce dalla scrivania; togliendogli il tag ricompare. Eliminare un tag invisibile (Impostazioni → Tag → Elimina…) fa ricomparire i suoi elementi.
- [ ] Nel cestino un elemento con tag conserva il tag al ripristino; i tag valgono in tutti i workspace, ma la vista del tag mostra solo ciò che il workspace attuale vede.
- [ ] `lilos:tags` manomesso (tipi sbagliati, id doppi, nomi doppi, colori non validi) viene ripulito senza errori; "Scrivania e file iniziali" cancella anche i tag.
- [ ] Mettere o togliere un tag non si annulla con Ctrl Z (limite noto).

**Editor e tipi di file**
- [ ] benvenuto.txt al primo avvio ha un testo; doppio clic lo apre nell'Editor con numeri di riga e riga corrente.
- [ ] Scrivere mostra il pallino nel titolo; Ctrl S salva (anche dopo la ricarica); un documento nuovo finisce in /Documenti.
- [ ] Tab, Shift Tab, Invio con rientro, Ctrl Z; colori corretti per JS, Markdown, CSS, HTML, JSON, Python; il testo con HTML resta testo.
- [ ] Chiudere, Alt W, aprire un altro file o Ctrl Alt N con modifiche: barra Salva / Non salvare / Annulla.
- [ ] File aperto rinominato o eliminato altrove: titolo aggiornato / testo conservato.
- [ ] Suggerimenti per ogni linguaggio (JS, CSS con valori dopo la proprietà, HTML con tag chiusi e attributi, JSON, Python, Markdown, testo); frecce, Invio, Tab, Esc, clic, Ctrl Spazio; niente da soli in stringhe e commenti; la riga che chiude un blocco Markdown non propone linguaggi.
- [ ] Impostazioni → Usabilità → Tipi di file: cambiare un'estensione su "Chiedi ogni volta" fa comparire "Apri con"; "Usa sempre" la ricorda; un tipo senza app (es. .png) chiede sempre; "Apri con…" nel tasto destro.

**Linguaggi dell'Editor**
- [ ] JavaScript con Tree-sitter (nome delle funzioni colorato), Markdown con TextMate; cambiare motore nelle Impostazioni dell'Editor ha effetto subito.
- [ ] JSON: server nel browser; schema da file di lilOS e da indirizzo web (es. `https://www.schemastore.org/package.json`); `"$schema"` nel file; errori sottolineati, nel margine, nel conteggio e sotto il cursore; suggerimenti delle chiavi dello schema; modificare il file dello schema rivaluta.
- [ ] CSS: proprietà sconosciuta segnalata, suggerimenti dal server, valori dopo la proprietà. HTML: tag dal server.
- [ ] Spegnere un server: tornano i suggerimenti interni. Server esterno irraggiungibile: "Server non disponibile" in basso.
- [ ] Aggiungere una grammatica `.tmLanguage.json`: i file con le sue estensioni vengono colorati; una grammatica non valida viene segnalata.

**Menu contestuale e tema**
- [ ] Tasto destro sullo sfondo: Nuovo (sottomenu) con mouse e tastiera (→ ←, Esc chiude un livello); "Pagina HTML" crea il file con lo scheletro.
- [ ] Impostazioni → Usabilità → Menu contestuale: spostare, togliere, aggiungere voci, app, separatori, nuovi elementi con modello; Ripristina.
- [ ] Impostazioni → Aspetto → Colori → Tema: Chiaro e Scuro cambiano scrivania, barra, menu, finestre ed evidenziazione; restano dopo la ricarica.

**Scorciatoie**
- [ ] Le combinazioni iniziali funzionano (Ctrl K, Ctrl + / − / 0, Shift 1, Invio, F2, Canc, Ctrl A, Esc, Alt W, Alt N), solo nei contesti giusti (desktop con il focus, finestra attiva, non mentre si scrive salvo zoom, menu e finestre).
- [ ] In Impostazioni → Usabilità → Scorciatoie: aggiungere, togliere, ripristinare; Esc e clic altrove annullano la registrazione.
- [ ] Combinazioni non valide spiegate (lettera da sola, Tab, riservate dal browser, comandi attivi nei campi senza Ctrl/Alt); conflitto con Sostituisci/Annulla.
- [ ] Menu contestuali, tooltip dell'HUD e del logo mostrano le combinazioni attuali.
- [ ] Le personalizzazioni restano dopo la ricarica; `lilos:shortcuts` manomesso viene ignorato.

**Barra e menu**
- [ ] Il logo e Ctrl K aprono e chiudono il menu di avvio; il focus va nella ricerca.
- [ ] La ricerca filtra; frecce e Invio avviano l'app; in console compare `[lilos] avvia app: …`.
- [ ] Clic fuori ed Esc chiudono il menu di avvio e i menu contestuali.
- [ ] Mentre un menu è aperto, Canc e Ctrl A non agiscono sulla scrivania.
- [ ] Data e ora sono corrette; il tooltip mostra la data completa.

### Test automatici

Finora le verifiche automatiche sono state fatte con uno script esterno al repository: puppeteer-core che pilota Edge senza interfaccia su `npm run preview` e ripercorre la lista sopra, con screenshot e raccolta degli errori della console.

Il passo successivo è portare questa verifica nel repository:

- `@playwright/test` come dipendenza di sviluppo e uno script `npm test`;
- un test di base che apra la pagina, controlli l'assenza di errori in console e ripercorra la lista di controllo;
- l'esecuzione su GitHub Actions a ogni push.

Due cose utili da sapere per scrivere i test:

- per il doppio clic usare `page.mouse.click(x, y, { count: 2 })`;
- svuotare `localStorage` e ricaricare prima di ogni test, altrimenti lo stato salvato da un test influenza il successivo.

## Agenti di Claude Code

In `.claude/agents/` ci sono tre agenti specifici per lilOS. In Claude Code si invocano chiedendo per nome (per esempio "usa il qa-tester sulle ultime modifiche"). Per questo progetto prendono il posto di eventuali agenti con lo stesso nome nella configurazione personale.

| Agente | Cosa fa | Quando usarlo | Cosa produce |
| --- | --- | --- | --- |
| `qa-tester` | Verifica che tutto funzioni e risponda come previsto in ogni situazione (casi limite, dati salvati rovinati, storage bloccato, tastiera, finestre piccole); mantiene ed esegue la suite di test; può correggere bug piccoli e chiari | Dopo una funzionalità o un refactor, prima di un rilascio | `test_reports/qa_<data>.md`, test in `tests/` |
| `security-tester` | Cerca vulnerabilità di un'app solo client: XSS da nomi e dati salvati, `innerHTML`, dati non validati, prototype pollution, contenuti esterni, CSP, dipendenze. Non modifica il codice | Prima di un rilascio, dopo modifiche a SDK, rendering o salvataggio | `test_reports/security_<data>.md` con correzioni pronte |
| `doc-writer` | Allinea `doc/`, `README.md` e `sdk/README.md` al codice, scrivendo per il pubblico di ogni pagina. Non modifica il codice | Dopo ogni modifica che cambia comportamento, API, dati salvati o architettura | Documentazione aggiornata e resoconto delle incoerenze trovate |

Ordine consigliato dopo una modifica importante: `qa-tester` → correzioni → `security-tester` → correzioni → `doc-writer`.

Nessun agente fa commit o push: si decide dopo aver letto i report.

## Dipendenze

- `npm install` installa le versioni esatte di `package-lock.json`; nessun pacchetto ha script di installazione.
- Le grammatiche Tree-sitter stanno in `public/tree-sitter/` (nel repository). Per aggiornarle, cambia le versioni in `scripts/vendor-tree-sitter.mjs` e lancia `node scripts/vendor-tree-sitter.mjs`.
- Prima di aggiungere una dipendenza: [Convenzioni → Dipendenze](../sviluppatore/convenzioni.md#dipendenze).

## Git

- Repository: https://github.com/GexyLab/lilos, ramo `main`.
- Finora si è lavorato direttamente su `main`. Con più persone conviene passare a un ramo per funzionalità e a pull request.
- Messaggi di commit in italiano (vedi [Convenzioni](../sviluppatore/convenzioni.md#git)).
- Non riscrivere la storia di `main` già pubblicata (niente `push --force`).

## Rilascio

Non c'è ancora un ambiente pubblicato. `npm run build` produce in `dist/` un sito statico che si può pubblicare su qualsiasi hosting statico.

Su GitHub Pages il sito sarebbe servito da `/lilos/`: in quel caso va impostato `base: '/lilos/'` in una `vite.config.js`, altrimenti script, stili e favicon vengono cercati nella radice del dominio.

## Documentazione

La documentazione fa parte della modifica: un commit che cambia un comportamento aggiorna anche le pagine interessate (vedi [indice](../README.md#aggiornare-questa-documentazione)).
