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
- [ ] Il trascinamento sposta tutta la selezione e allinea alla griglia al rilascio.
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
- [ ] Le cartelle di sistema non si rinominano né eliminano; una cartella non vuota chiede conferma prima di essere eliminata.
- [ ] Ordinamento per colonna, vista a icone (ricordata), messaggio per i file senza app.
- [ ] Quello che cambia in File nella cartella Scrivania compare subito sulla scrivania, e viceversa.
- [ ] `lilos:fs` manomesso (tipi sconosciuti, cicli, nomi con `/`) viene ripulito senza errori; i nomi con HTML si vedono come testo.

**Editor e tipi di file**
- [ ] benvenuto.txt al primo avvio ha un testo; doppio clic lo apre nell'Editor con numeri di riga e riga corrente.
- [ ] Scrivere mostra il pallino nel titolo; Ctrl S salva (anche dopo la ricarica); un documento nuovo finisce in /Documenti.
- [ ] Tab, Shift Tab, Invio con rientro, Ctrl Z; colori corretti per JS, Markdown, CSS, HTML, JSON, Python; il testo con HTML resta testo.
- [ ] Chiudere, Alt W, aprire un altro file o Ctrl Alt N con modifiche: barra Salva / Non salvare / Annulla.
- [ ] File aperto rinominato o eliminato altrove: titolo aggiornato / testo conservato.
- [ ] Impostazioni → Usabilità → Tipi di file: cambiare un'estensione su "Chiedi ogni volta" fa comparire "Apri con"; "Usa sempre" la ricorda; un tipo senza app (es. .png) chiede sempre; "Apri con…" nel tasto destro.

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
