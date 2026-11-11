# Progetti

Un **progetto** di Logic Studio è una **cartella** con dentro un file `Nome.lsproj` e tre sottocartelle:

| Cartella | Cosa contiene |
|---|---|
| `schemi/` | Gli schemi (`.lsch`), anche in sottocartelle tue. |
| `ui/` | Le finestre (`.lsui`), anche in sottocartelle tue. |
| `risorse/` | Gli altri file del progetto: immagini e quello che vuoi usare nelle finestre. |

Il file `.lsproj` dice come si chiamano gli schemi e le finestre, qual è la **finestra main**, i collegamenti tra gli schemi, le console e le opzioni. Il suo contenuto è descritto in [Formati dei file](ide/formats).

Puoi anche aprire **uno schema da solo** (un `.lsch` senza progetto): si prova e si attiva come un progetto, ma non ha finestre, mappa, opzioni né altre console oltre la principale.

## La Home

La scheda **Home** è sempre la prima e non si chiude. Contiene:

- **Nuovo progetto** e **Apri…**;
- **Recenti**: gli ultimi 10 progetti o schemi aperti da te, con la cartella dove stanno. Un clic li riapre. Quelli che non esistono più spariscono dall'elenco. Se non ce ne sono: **Nessun progetto aperto finora**;
- **I miei programmi** e **Quello che uso**: vedi [Prova e programmi attivi](ide/run).

Quando non c'è un progetto aperto, la barra in alto ha solo **Nuovo progetto** e **Apri…**, e la scheda **Progetto** dice **Apri o crea un progetto dalla Home.**

## Creare un progetto

1. Nella Home (o nella barra) premi **Nuovo progetto**.
2. Si apre la finestra **Nuovo progetto**: «Il progetto è una cartella in «Logic Studio», con le cartelle schemi, ui e risorse.» Scrivi il **Nome** (al massimo 80 caratteri; è proposto **Il mio progetto**) e premi **Crea**.
3. L'IDE crea, nella tua home:

```
~/Logic Studio/
  Il mio progetto/
    Il mio progetto.lsproj
    schemi/
      main.lsch
    ui/
      Principale.lsui
    risorse/
```

- La cartella **Logic Studio** viene creata se non c'è.
- Se esiste già una cartella con quel nome, il nome viene cambiato in uno libero, e quello diventa anche il nome del progetto.
- I caratteri che non possono stare nel nome di un file vengono tolti. Se non resta niente (per esempio hai scritto solo `///`), il progetto non viene creato e non compare nessun messaggio: riprova con un altro nome.
- Lo schema si chiama **main** ed è vuoto. La finestra si chiama **Principale**, è la **finestra main** e ha come titolo il nome del progetto.

4. Il progetto si apre sulla **Mappa**.

## Aprire

- **Apri…** (Home o barra) apre la finestra di scelta dei file con i tipi `.lsproj` e `.lsch`.
- Un **doppio clic** su un `.lsproj` o un `.lsch` nel File Manager o sulla scrivania apre l'IDE con quel file. Se l'IDE è già aperto, il file si apre lì.
- Aprendo una **finestra** (`.lsui`), l'IDE cerca il `.lsproj` nella sua cartella e in quelle sopra, apre quel progetto e poi la finestra. Se non lo trova: **Questa finestra non è in un progetto** — «Una finestra (.lsui) si apre con il suo progetto: nella sua cartella e in quelle sopra non c'è un .lsproj.»
- Un file `.lsapp` non si apre nell'IDE: lo fa partire lilOS come app (vedi [Fare un'app](ide/create-app)).
- Un progetto si apre sulla **Mappa**; uno schema da solo si apre direttamente nel suo editor.

Un IDE tiene **un progetto alla volta**. Aprirne un altro chiude quello aperto (ti chiede prima di salvare, se serve) e ferma la prova in corso. Se vuoi due progetti insieme, apri due finestre dell'IDE.

Quando lilOS riapre le finestre della sessione precedente, l'IDE riapre il progetto che avevi aperto.

### Quando l'apertura non riesce

Il messaggio è **Non si è potuto aprire**, con il motivo:

| Motivo | Quando |
|---|---|
| Il file non c'è più | Il file è stato cancellato o spostato. |
| Non è un progetto (.lsproj) o uno schema (.lsch) di Logic Studio | Il file ha un'altra estensione. |
| «This is not a Logic Studio project (.lsproj)» o «This is not a Logic Studio schema (.lsch)» (il testo viene dall'SDK di lilOS: lo vedi tradotto se c'è il pacchetto di lingua) | Il file è JSON ma il suo campo `format` non è quello giusto. |
| Un errore di JSON | Il file non è JSON valido (per esempio è stato troncato o modificato a mano). |
| Manca il file … | Un elemento del progetto non si trova quando lo apri. |

### File vecchi o rovinati

L'IDE legge i file con tolleranza, e quello che non è valido **lo lascia fuori** invece di rifiutare tutto:

- in uno schema: i blocchi senza un id valido (lettere, cifre, `_` e `-`, al massimo 40) o con un id ripetuto spariscono, e con loro i collegamenti che li toccano; un'etichetta più lunga di 80 caratteri viene tagliata; impostazioni e porte non valide diventano vuote; la vista non valida torna a zoom 100%;
- in una finestra: una componente senza id valido ne riceve uno nuovo; i contenitori annidati oltre 32 livelli spariscono; una larghezza sotto 160 o un'altezza sotto 120 pixel vengono alzate;
- nel progetto: gli elementi senza nome o senza percorso spariscono; le opzioni che mancano prendono il valore di serie.

Quello che hai perso così sparisce davvero al primo **Salva**. Il motore, quando provi, ricontrolla tutto e se trova ancora qualcosa che non va lo scrive nei **Problemi** (vedi [Prova e programmi attivi](ide/run)).

### Il progetto e le sue cartelle si allineano

Ogni volta che apri un progetto, l'IDE confronta il `.lsproj` con le cartelle `schemi/` e `ui/`:

- un file `.lsch` o `.lsui` che è nelle cartelle ma non nel progetto **viene aggiunto**, con il nome del file (senza estensione); se il nome è già preso, diventa «Nome 2», «Nome 3»…;
- un elemento del progetto il cui file non c'è più **viene tolto**;
- se la finestra main non c'è più, diventa main la prima finestra che resta.

Così puoi copiare uno schema dentro `schemi/` con il File Manager e ritrovarlo nel progetto. Se l'allineamento ha cambiato qualcosa, il progetto risulta modificato: salva per scriverlo nel `.lsproj`.

Attenzione: un elemento che nel `.lsproj` punta a un file **fuori** da `schemi/` o `ui/` viene tolto, perché l'IDE cerca solo lì.

## L'elenco «Progetto»

La scheda **Progetto** a sinistra mostra il nome del progetto (con il pulsante **Mappa**) e tre gruppi: **Schemi**, **Finestre** e **Risorse**, ognuno con il numero di elementi che contiene e il pulsante **+**. Sotto ogni gruppo ci sono le sue sottocartelle e i suoi file, cartelle prima e poi file, in ordine alfabetico.

Accanto agli elementi:

| Segno | Significa |
|---|---|
| pallino | **Non salvato**: l'elemento ha modifiche non salvate. |
| ★ | **Finestra main: si apre dal menu applicazioni**. |
| icona di collegamento | La finestra ha un punto d'ingresso (vedi le Opzioni, scheda Finestre). Il suggerimento dice quale. |

Il nome mostrato per schemi e finestre è il loro **nome nel progetto**; per le risorse è il nome del file. Passando il mouse vedi il percorso nel progetto (per esempio `schemi/irrigazione/nord.lsch`).

### Cosa fa il clic

- Su uno schema o una finestra: lo apre in una scheda (o porta davanti la sua scheda, se è già aperta).
- Su una risorsa: la apre con l'app di lilOS associata al suo tipo.
- Su una cartella: la apre o la chiude.

### Il menu (tasto destro)

Sul titolo di un gruppo:

| Voce | Cosa fa |
|---|---|
| **Nuovo schema** / **Nuova finestra** | Chiede un nome e crea l'elemento nella cartella del gruppo (non c'è per Risorse). |
| **Nuova cartella** | Crea una sottocartella. |

Su una cartella: **Nuovo schema** o **Nuova finestra** (secondo il gruppo), **Nuova cartella**, **Rinomina** (F2), **Elimina** (Canc).

Su un elemento: **Apri**, **Rendila la finestra main** (solo per le finestre che non lo sono già), **Rinomina** (F2), **Elimina** (Canc).

Con uno schema da solo il menu non c'è.

### Nuovo schema, nuova finestra

1. Premi **+** accanto a **Schemi** o **Finestre** (o usa il menu).
2. Scrivi il **Nome**: al massimo 60 caratteri, senza `/ \ : * ? " < > |` (altrimenti: **Un nome senza / \ : * ? " < > |**), e non già usato da un altro elemento dello stesso tipo (altrimenti: **Il progetto ha già un elemento che si chiama «Nome»**).
3. Premi **Crea**. Il file si chiama come l'elemento (`Nome.lsch` o `Nome.lsui`); se nella cartella c'è già un file con quel nome, il file prende un nome libero, ma l'elemento resta «Nome».
4. L'elemento si apre in una scheda. Il progetto viene salvato subito, per non perderlo.

Una nuova finestra ha titolo uguale al nome, 480 × 360 pixel, ridimensionabile, con una **Colonna** vuota. Se il progetto non aveva finestre, diventa la main.

> Il **+** del gruppo **Risorse** apre una finestra **Aggiungi una risorsa** che in questa versione non riesce a creare niente. Per aggiungere una risorsa copia il file nella cartella `risorse/` del progetto con il File Manager: compare subito nell'elenco.

### Rinominare

**Rinomina** (o **F2**) chiede il nuovo nome con le stesse regole.

- Uno schema o una finestra cambia sia il nome nel progetto sia il nome del file. Rinominando uno schema, i collegamenti tra schemi del progetto lo seguono; rinominando la finestra main resta main; un punto d'ingresso segue la sua finestra.
- Una cartella cambia nome e i percorsi di quello che contiene seguono.
- Una risorsa cambia solo il nome del file (qui scrivi anche l'estensione).

Dopo aver rinominato uno schema o una finestra **aperti in una scheda**, chiudi e riapri la scheda: la scheda continua a mostrare il nome vecchio, e finché non la riapri i valori dal vivo della prova non compaiono su quello schema.

> Rinominando una **finestra**, gli **oggetti delle sue componenti** negli schemi continuano a cercare la finestra con il nome vecchio e, alla prova, i **Problemi** dicono «Il blocco … rappresenta una componente della finestra «Nome vecchio», che non c'è». Nelle Proprietà di ogni oggetto scegli di nuovo la **Finestra** e la **Componente**. Anche i pulsanti di altre finestre con **Apri una finestra** vanno reimpostati.

### Spostare

Trascina un elemento o una cartella su un'altra cartella **dello stesso gruppo** (o sul titolo del gruppo): lo sposti lì. Non puoi portare uno schema tra le finestre, né una cartella dentro se stessa. Il progetto segue i percorsi nuovi e viene salvato.

### Eliminare

**Elimina** (o **Canc**) chiede conferma:

- per un elemento: **Eliminare «Nome»?** — «Va nel cestino. I suoi collegamenti nel progetto vengono tolti.»;
- per una cartella: **Eliminare la cartella «Nome»?** — «Va nel cestino con tutto quello che contiene.»

L'elemento va nel **Cestino** di lilOS (lo puoi recuperare da lì, poi riapri il progetto). Le sue schede si chiudono **senza chiedere** se c'erano modifiche non salvate. Il progetto lo dimentica e viene salvato.

Cose da sapere quando elimini:

- uno **schema**: i collegamenti tra schemi che lo toccano possono restare nel `.lsproj`; alla prova i Problemi dicono per esempio «Collegamento del progetto: lo schema X non ha l'uscita «p»». Toglili dalla Mappa (Proprietà → **Scollega**);
- una **finestra**: gli oggetti delle sue componenti negli schemi restano e segnano un problema finché non li elimini;
- la **finestra main**: diventa main la prima finestra che resta.

### Da tastiera

Nell'elenco: **↑** e **↓** passano da una riga all'altra, **Invio** apre (o apre e chiude una cartella), **F2** rinomina, **Canc** elimina, il **tasto menu** o **Maiusc+F10** apre il menu.

## Salvare

- **Salva** nella barra (o **Ctrl+S**) salva **tutto** quello che è cambiato: ogni schema e finestra aperti e il `.lsproj`. Il pulsante è spento quando non c'è niente da salvare.
- Alcune azioni salvano il `.lsproj` da sole: creare, rinominare, spostare ed eliminare elementi, **Rendila la finestra main** dal menu.
- Le modifiche fatte nelle **Opzioni del progetto**, nella **Mappa** e nelle console vanno nel `.lsproj` subito, ma su disco solo con **Salva**.
- Se il salvataggio non riesce (per esempio il file è stato cancellato nel frattempo): **Salvataggio non riuscito** con il motivo, per esempio **Il file non c'è più**.

### Annulla e Ripeti

Ogni schema, ogni finestra e il progetto hanno la loro **storia** (fino a 200 passi): **Annulla** (↶, **Ctrl+Z**) e **Ripeti** (↷, **Ctrl+Y** o **Ctrl+Maiusc+Z**) agiscono sull'editor della scheda aperta. Le modifiche al `.lsproj` (collegamenti nella mappa, opzioni, console, nomi delle porte di schema) si annullano con la scheda **Mappa** in primo piano. Annullare fino al punto salvato toglie il pallino di «non salvato».

## Chiudere

- Chiudendo la scheda di uno schema o di una finestra con modifiche: **«Nome» ha modifiche non salvate** — «Se non le salvi, si perdono.» con **Annulla**, **Non salvare** e **Salva**.
- Chiudendo l'IDE, aprendo un altro progetto o creandone uno nuovo con modifiche in sospeso: **Il progetto «Nome» ha modifiche non salvate**, con **Annulla**, **Non salvare** e **Salva tutto**.
- Chiudere l'IDE ferma la prova in corso. I programmi attivi continuano.

> In questa versione **Non salvare** sulla scheda di uno schema chiude la scheda ma **non toglie** le modifiche: restano in memoria, la prova le usa, **Salva** le scrive e riaprendo la scheda le ritrovi. Per buttarle via davvero usa **Annulla** (Ctrl+Z) prima di chiudere, oppure chiudi il progetto con **Non salvare**.

## Opzioni del progetto

Il pulsante **Opzioni del progetto** (l'ingranaggio, nella barra) apre una finestra a parte con il nome del progetto. A sinistra quattro schede: **Generale**, **Finestre**, **Console**, **L'app e le sue finestre**. Ogni cambiamento va subito nel progetto (con Annulla dalla scheda Mappa) e su disco con **Salva** nell'IDE. La finestra si apre una volta sola: premendo di nuovo l'ingranaggio torna davanti.

Le Opzioni non ci sono per uno schema da solo.

### Generale

| Campo | Regole |
|---|---|
| **Nome** | Al massimo 80 caratteri. Un nome vuoto non viene preso. Cambia il nome del progetto, non il nome della cartella né del file `.lsproj`. |
| **Versione** | Tre numeri separati da punti, come `1.0.0` («Tre numeri: 1.0.0»). Un valore scritto diversamente **non viene preso** (resta la versione di prima). |
| **Descrizione** | Al massimo 300 caratteri. |

La versione e la descrizione servono a **Crea app…**.

### Finestre

«Le finestre del progetto le apre lilOS. La finestra main è obbligatoria: si apre dal menu applicazioni.»

- **Finestra main**: quale finestra è la main. «Si cambia, non si toglie.»
- Una tabella con ogni **Finestra** e la colonna **Si apre da**:
  - per la main: **Menu applicazioni (finestra main)**;
  - per le altre, una scelta tra:

| Scelta | Cosa vuol dire |
|---|---|
| **Si apre solo da altre finestre dell'app** | Nessun punto d'ingresso: la apre un pulsante con **Apri una finestra**. |
| **Apre un tipo di file** | Compare il campo **Estensioni: csv, txt**: scrivi le estensioni separate da virgole o spazi (il punto iniziale si toglie; solo lettere e cifre, al massimo 16 caratteri l'una e 12 in tutto). |
| **Voce nel menu dei file** | Una voce nel menu dei file. |
| **Chiamata da altre app** | La possono aprire altre app. |
| **All'ingresso dell'utente** | Si apre quando l'utente entra in lilOS. |

  Per ogni scelta diversa dalla prima c'è anche **Etichetta** (al massimo 60 caratteri; vuota vuol dire il nome della finestra).
- Sotto: «Una finestra senza punto d'ingresso si apre solo da un'altra finestra dell'app (un pulsante con «Apri una finestra»).»

Se il progetto non ha finestre: **Il progetto non ha ancora finestre.**

> I punti d'ingresso vengono scritti nell'app fatta con **Crea app…**, ma le app fatte dai progetti per ora non si installano: quindi, per adesso, i punti d'ingresso non fanno ancora niente. Vedi [Fare un'app](ide/create-app).

### Console

La lista delle console del progetto e cosa fanno fuori dall'IDE. Tutto è spiegato in [Console](ide/consoles); in breve:

- tabella **Nome**, **Colore** (8 colori), **Righe tenute** (da 100 a 2000, di serie 1000) e **Togli**; la principale è «fissa: si rinomina, non si toglie»;
- **Nuova console** (al massimo 10 console, salvo limiti diversi); «Togliendo una console, i suoi blocchi passano alla principale.»;
- **Fuori dall'IDE**: **Mostrale tutte**, **Solo quando chiedono un dato**, **Non mostrarle**, **Tutte nella console principale**;
- **Dettagli**: **Chiudi la console dopo la risposta**, **Una notifica quando una console chiede un dato e il progetto non ha finestre aperte**, **Copia nel registro del progetto**, **Con «Tutte nella principale», la principale si apre**.

### L'app e le sue finestre

«Cosa condividono le finestre del progetto mentre gira: anche nell'app fatta da questo progetto.»

| Opzione | Di serie | Cosa fa |
|---|---|---|
| **Una finestra riaperta mostra subito gli ultimi valori** | sì | Il motore tiene l'ultimo valore mandato a ogni componente: chi riapre una finestra non la vede vuota. |
| **Le copie della stessa finestra restano allineate** | sì | La stessa finestra aperta su due dispositivi mostra gli stessi valori; un cambiamento su una si vede sull'altra. |

E una nota: «Pulsanti, interruttori e cursori mandano qualcosa solo quando qualcuno li usa in una finestra aperta: quando una finestra si apre non viene «ripremuto» niente.»

## Limiti

Il motore controlla i progetti quando li provi o li attivi. I valori di serie (un amministratore li cambia nel Pannello di controllo → Logic Studio → Limiti; vedi [Limiti](logicstudio-engine/limits)):

| Cosa | Al massimo |
|---|---|
| Schemi per progetto | 20 |
| Finestre per progetto | 10 |
| Collegamenti tra schemi per progetto | 200 |
| Console per progetto | 10 |
| Blocchi per schema | 200 |
| Collegamenti per schema | 600 |
| Componenti per finestra | 200 |
| Porte aggiunte per blocco | 32 |
| Progetto per un programma attivo | 2 MB di JSON |

L'IDE non ti ferma quando crei il ventunesimo schema o l'undicesima finestra: è la prova a dire, nei Problemi, **Troppi schemi: al massimo 20 per progetto** o **Troppe finestre: al massimo 10 per progetto**.

## Esempi

### 1. Un progetto con schemi in ordine

Un progetto per l'irrigazione dell'orto, con uno schema per zona:

1. **Nuovo progetto** → `Orto` → **Crea**.
2. Nell'elenco **Progetto**, tasto destro su **Schemi** → **Nuova cartella** → `zone` → **Crea**.
3. Tasto destro sulla cartella **zone** → **Nuovo schema** → `nord`; poi ancora → `sud`.
4. Rinomina **main** in `comandi` (tasto destro → **Rinomina**).

Il risultato su disco:

```
Orto/
  Orto.lsproj
  schemi/
    comandi.lsch
    zone/
      nord.lsch
      sud.lsch
  ui/
    Principale.lsui
  risorse/
```

Nel `.lsproj`: `"schemas": { "comandi": "schemi/comandi.lsch", "nord": "schemi/zone/nord.lsch", "sud": "schemi/zone/sud.lsch" }`.

### 2. Riprendere uno schema da un altro progetto

1. Nel File Manager copia `vecchio/schemi/allarme.lsch` dentro `Orto/schemi/`.
2. Riapri il progetto **Orto** (Home → **Recenti**).
3. Nell'elenco compare **allarme** con il pallino del progetto modificato: premi **Salva**.

Se lo schema usa blocchi di un pacchetto che qui non è installato, li vedi tratteggiati con **Manca il pacchetto** (vedi [Schemi](ide/schemas)).

### 3. Una seconda finestra che si apre da un pulsante

1. **+** accanto a **Finestre** → `Impostazioni` → **Crea**.
2. Apri la finestra **Principale**, aggiungi un **Pulsante** e, nelle sue Proprietà, **Azione al clic** = **Apri una finestra**, poi scegli **Impostazioni**.
3. In **Opzioni del progetto → Finestre** lascia **Impostazioni** su **Si apre solo da altre finestre dell'app**.

Vedi [Finestre](ide/windows).

## Vedi anche

- [Schemi](ide/schemas)
- [Finestre](ide/windows)
- [Console](ide/consoles)
- [Formati dei file](ide/formats)
- [Prova e programmi attivi](ide/run)
