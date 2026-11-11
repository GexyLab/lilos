# Componenti UI standard

`logicstudio-ui` · richiede `logicstudio-engine` e `logicstudio-core`

Le **Componenti UI standard** sono i pezzi con cui disegni le **finestre** di un progetto di Logic Studio (i file `.lsui` nella cartella **ui**): etichette, valori, indicatori, pulsanti, interruttori, campi, elenchi, tabelle e i contenitori che li dispongono. I grafici non sono qui: sono nel pacchetto `logicstudio-charts`.

Una componente da sola si vede ma non fa niente. Per farla parlare con il programma le dai il suo **oggetto** in uno schema: un blocco che ha le porte della componente. Gli altri blocchi si collegano a quell'oggetto, mai direttamente alla finestra.

## Come si installa

Un amministratore lo installa dall'**AppStore**, scheda **Kernel**, insieme al motore (`logicstudio-engine`) e ai blocchi di base (`logicstudio-core`), che l'AppStore aggiunge da solo se mancano. Quando è installato, le componenti compaiono nella scheda **Componenti** dell'IDE mentre disegni una finestra, e lilOS le usa per mostrare le finestre dei programmi attivi e delle app fatte con **Crea app**.

Se una finestra usa una componente di un pacchetto che non c'è, al suo posto vedi un riquadro rosso tratteggiato con il tipo (per esempio `ui.gauge`), e il progetto non parte: «La componente gauge1 (ui.gauge) non c'è: manca il suo pacchetto».

## Le componenti

### Testo e valori

| Componente | Tipo | A cosa serve |
|---|---|---|
| [Etichetta](ui.label) | `ui.label` | Un testo fisso o mandato da uno schema, anche come titolo. |
| [Valore](ui.value) | `ui.value` | Mostra un valore (numero, testo, oggetto) con etichetta e unità. |
| [Indicatore](ui.gauge) | `ui.gauge` | Un numero su un arco, tra un minimo e un massimo. |
| [Spia](ui.lamp) | `ui.lamp` | Un pallino che si accende e si spegne, in quattro colori. |
| [Barra di avanzamento](ui.progress) | `ui.progress` | Una barra da 0 a 100, con la percentuale. |
| [Immagine](ui.image) | `ui.image` | Un'immagine presa dalla cartella del progetto. |
| [Tabella](ui.table) | `ui.table` | Una lista di oggetti in righe e colonne; si può scegliere una riga. |
| [Console](ui.console) | `ui.console` | Una console del programma dentro la finestra. |

### Comandi

| Componente | Tipo | A cosa serve |
|---|---|---|
| [Pulsante](ui.button) | `ui.button` | Manda un impulso quando lo premi; può anche aprire o chiudere una finestra. |
| [Interruttore](ui.toggle) | `ui.toggle` | Acceso o spento: manda sì/no. |
| [Casella di spunta](ui.checkbox) | `ui.checkbox` | Spuntata o no: manda sì/no. |
| [Pulsanti di opzione](ui.radios) | `ui.radios` | Una scelta tra poche opzioni, tutte visibili. |
| [Selezione](ui.select) | `ui.select` | Una scelta da un menu a tendina. |
| [Cursore](ui.slider) | `ui.slider` | Un numero scelto trascinando, tra un minimo e un massimo. |
| [Campo di testo](ui.text) | `ui.text` | Un testo scritto dall'utente, con **invio**. |
| [Campo numerico](ui.number) | `ui.number` | Un numero scritto dall'utente. |
| [Data e ora](ui.datetime) | `ui.datetime` | Una data, un'ora o tutte e due. |
| [Elenco](ui.list) | `ui.list` | Una voce scelta da un elenco sempre aperto. |
| [Scegli file](ui.file) | `ui.file` | Il percorso di un file o di una cartella di lilOS. |
| [Colore](ui.color) | `ui.color` | Un colore scelto tra sette. |

### Contenitori

| Componente | Tipo | A cosa serve |
|---|---|---|
| [Colonna](ui.column) | `ui.column` | Mette le componenti una sotto l'altra. |
| [Riga](ui.row) | `ui.row` | Mette le componenti una accanto all'altra. |
| [Griglia](ui.grid) | `ui.grid` | Mette le componenti in celle, su più colonne. |
| [Riquadro](ui.group) | `ui.group` | Una colonna con un bordo e un titolo. |
| [Schede](ui.tabs) | `ui.tabs` | Più pagine, una visibile alla volta. |
| [Area libera](ui.free) | `ui.free` | Le componenti dove le lasci, alla posizione esatta. |
| [Separatore](ui.separator) | `ui.separator` | Una linea o uno spazio vuoto tra due componenti. |

## Disegnare una finestra

Apri una finestra del progetto nell'IDE e scegli **Progetta** nella barra in alto. Nella scheda **Componenti** a sinistra ci sono i pezzi, divisi in **Testo e valori**, **Comandi** e **Contenitori** (più **Grafici**, se è installato il loro pacchetto).

- **Un clic** su un pezzo lo mette **nel contenitore selezionato**. Se hai selezionato una componente che non è un contenitore, il pezzo va subito dopo di lei, nello stesso contenitore. Se non hai selezionato niente, va in fondo alla finestra.
- **Trascinando** un pezzo lo metti dove mostra la **linea blu**. Il contenitore che lo riceve si colora di blu.
- Per **spostare** una componente che c'è già, trascinala (dopo 5 pixel di movimento parte lo spostamento). Non puoi metterla dentro se stessa.
- **Un clic** su una componente la seleziona; un clic sullo sfondo della finestra toglie la selezione e mostra le proprietà della finestra.
- **Doppio clic** su una componente apre il suo oggetto nello schema, se c'è.
- Con la finestra in primo piano: **Canc** (o **Backspace**) elimina la componente selezionata, **Esc** toglie la selezione. Lo stesso fa **Elimina la componente**, in fondo alle sue Proprietà. Se la componente ha un oggetto in uno schema, prima l'IDE chiede conferma. Eliminare un contenitore elimina anche tutto quello che contiene.

**Anteprima** fa funzionare la finestra come quella vera: puoi premere, scrivere, scegliere. Se una **Prova** è in corso, l'anteprima è collegata al programma: quello che fai arriva agli oggetti negli schemi, e i valori degli schemi arrivano alle componenti. Senza prova, le componenti reagiscono ma non arriva niente a nessuno.

> In Progetta le componenti non reagiscono e i contenitori sono segnati da un bordo tratteggiato, così vedi dove mettere i pezzi. Una componente con **visibile** spento si vede comunque, più chiara; nelle **Schede** si vedono tutte le pagine, una sotto l'altra.

### La finestra

Senza niente di selezionato, la barra **Proprietà** mostra la finestra:

| Proprietà | Valori | Predefinito |
|---|---|---|
| **Titolo** | testo, fino a 120 caratteri | «Finestra» |
| **Larghezza (px)** | da 160 a 4000 | 480 |
| **Altezza (px)** | da 120 a 4000 | 360 |
| **L'utente può ridimensionarla** | sì/no | sì |

Sotto, **Si apre da** dice da dove si apre questa finestra (la finestra main si apre dal menu delle applicazioni; le altre da un pulsante con **Apri una finestra**, o dal punto d'ingresso scelto nelle Opzioni del progetto).

### Contenitori e radice

Ogni finestra ha una **radice**: una [Colonna](ui.column) con 10 px di spazio tra i pezzi e 14 px di margine. La radice non si seleziona e non si cambia: se ti serve un'altra disposizione, metti dentro di lei un altro contenitore.

I contenitori si possono annidare (una Riga dentro una Colonna dentro un Riquadro…), fino a 32 livelli. Come dispongono i pezzi:

- **Colonna** e **Riquadro**: uno sotto l'altro. Con l'allineamento **tutta la larghezza** ogni pezzo occupa tutta la larghezza della colonna.
- **Riga**: uno accanto all'altro, e vanno a capo se non c'è posto (si può spegnere).
- **Griglia**: in celle di uguale larghezza, riempite da sinistra a destra e poi giù.
- **Schede**: **ogni pezzo dentro le Schede è una pagina**. Per avere più pezzi in una pagina, metti nella scheda una Colonna e i pezzi dentro di lei.
- **Area libera**: ogni pezzo sta nel punto esatto in cui lo lasci, misurato in pixel dall'angolo in alto a sinistra dell'area.

### L'Area libera

Nell'[Area libera](ui.free) la posizione di un pezzo è salvata come coordinate (x, y) in pixel. Quando trascini un pezzo dentro l'area, l'angolo in alto a sinistra del pezzo va circa 10 pixel sopra e a sinistra del puntatore. Per spostarlo, trascinalo di nuovo dentro l'area.

- Un pezzo aggiunto con **un clic** (invece che trascinato) non ha una posizione: finisce nell'angolo in alto a sinistra, sopra gli altri. Trascinalo dove vuoi.
- L'IDE non ha comandi per la larghezza e l'altezza di un pezzo: ognuno ha la sua misura naturale.
- L'area ha un'altezza fissa (proprietà **Altezza**): quello che esce dall'area non viene tagliato e può finire sopra le componenti che seguono.

## L'oggetto nello schema

Gli schemi non toccano mai la finestra: ogni componente ha un **oggetto** in uno schema, un blocco **Componente UI** (`core.component`, categoria **Componenti UI**, del pacchetto [Blocchi di base](logicstudio-core)) con le porte della componente. Vedi anche [Oggetto di una componente](ide/components).

**Crearlo.** Seleziona la componente in **Progetta**. Nella barra **Proprietà**, sezione **Oggetto nello schema**, scegli lo schema in **Nello schema** e premi **Crea il suo oggetto**. L'oggetto compare al centro della vista di quello schema, che si apre; prende come etichetta l'**Etichetta** o il **Testo** della componente (al massimo 80 caratteri). Se l'oggetto c'è già, la sezione dice in quale schema e blocco sta, con **Aprilo nello schema**.

**Le porte.** La sezione **Porte** delle Proprietà le elenca con una freccia:

- **←** sono gli **ingressi** dell'oggetto: quello che uno schema **imposta** nella componente (il testo da mostrare, il valore, le opzioni…). Un valore che arriva su un ingresso va alla finestra e resta come ultimo valore di quella porta.
- **→** sono le **uscite**: quello che **fa l'utente** (ha premuto, ha scelto, ha scritto). L'uscita manda il valore solo quando l'utente agisce.
- Alcune componenti hanno una porta con lo stesso nome nei due versi (per esempio **valore** nell'Interruttore). Un valore che arriva sull'ingresso cambia la componente ma **non** esce dall'uscita: esce solo quello che fa l'utente. Così puoi collegare l'uscita a uno schema che poi rimanda un valore all'ingresso, senza creare un giro senza fine.

Ogni oggetto ha anche gli ingressi comuni **abilitato** e **visibile** (vedi sotto) e, come ogni blocco, l'uscita **Eccezione**: per un oggetto di componente oggi non ci passa niente.

**Regole.**

- **Un solo oggetto per componente**, in tutto il progetto. Se ne hai due (per esempio duplicando l'oggetto con Ctrl D), il progetto non parte: «La componente Principale › button1 ha già il suo oggetto in Calcolo/b3».
- Le impostazioni di **lo avvia** non contano per l'oggetto: ogni valore che arriva va sempre alla componente.
- Un **valore iniziale** su un ingresso dell'oggetto imposta la componente all'avvio del programma (per esempio il testo di partenza di un'etichetta).
- Se elimini una componente, l'IDE ti avvisa che il suo oggetto resta nello schema e segna un errore («Il blocco b3 rappresenta la componente «button1», che non c'è») finché non togli anche quello. Il progetto non parte: «Il blocco b3 rappresenta una componente che non c'è (Principale › button1)».
- Nelle Proprietà di un oggetto (nello schema) puoi cambiare **Finestra** e **Componente** a cui corrisponde. Tasto destro sull'oggetto → **Apri la sua finestra**.
- **I contenitori non hanno un oggetto** che si possa creare dall'IDE: la sezione **Oggetto nello schema** non c'è per Colonna, Riga, Griglia, Riquadro, Schede e Area libera. Per questo, oggi, gli ingressi **titolo** del Riquadro, **scheda aperta** delle Schede e **abilitato** e **visibile** dei contenitori non si possono usare dall'IDE.

### Nei nomi degli esempi

Negli schemi di queste pagine, `[Pulsante: Conta]` è l'oggetto nello schema del Pulsante con il testo «Conta»; `[Campo numerico: prezzo]` è l'oggetto del Campo numerico con l'etichetta «prezzo». Le finestre sono disegnate così:

```
Finestra «Contatore» 320 × 200
└ Colonna (radice)
  ├ Valore       value1   Etichetta «Clic:»
  └ Pulsante     button1  Testo «Conta»
```

`value1`, `button1` sono gli id che l'IDE dà alle componenti (il tipo più un numero); li vedi in alto a destra nelle Proprietà.

## Le proprietà comuni

### Etichetta

Molte componenti hanno la proprietà **Etichetta**: un testo piccolo, più chiaro, **sopra** il controllo (sopra il campo, la selezione, il cursore, la tabella…). Vuota, non si vede. Nella [Casella di spunta](ui.checkbox) l'etichetta è invece il testo accanto alla casella; nell'[Interruttore](ui.toggle) oggi non si vede (serve solo ai lettori di schermo); nel [Valore](ui.value) e nella [Spia](ui.lamp) sta accanto, sulla stessa riga; nell'[Indicatore](ui.gauge) sta sotto.

L'etichetta si scrive nell'editor e non cambia mentre il programma gira: non c'è una porta per cambiarla.

### abilitato e visibile

Tutte le componenti hanno questi due ingressi, oltre ai loro:

| Porta | Tipo | Cosa fa |
|---|---|---|
| **abilitato** (`enabled`) | sì/no | `false`: la componente diventa più chiara e non risponde più né al mouse né alla tastiera (il Tab la salta). Qualsiasi altro valore la riabilita. |
| **visibile** (`visible`) | sì/no | `false`: la componente sparisce e non occupa più spazio. Qualsiasi altro valore la fa ricomparire. |

- Conta **solo il valore `false`** (sì/no falso). Il testo `"false"`, il numero 0 o un testo vuoto **non** disabilitano e **non** nascondono niente. Se il valore viene da un calcolo, passalo prima da un blocco [Cast (converti tipo)](core.convert) **In** sì/no.
- Una componente disabilitata o nascosta continua a ricevere i valori dagli schemi: quando torna, mostra l'ultimo.
- All'inizio ogni componente è abilitata e visibile. Per partire con una componente nascosta, dai all'ingresso **visibile** del suo oggetto il **valore iniziale** `false`.

### Testi tradotti

Le proprietà di testo segnate come traducibili (Etichetta, Testo, Suggerimento, Opzioni, Voci, Nomi delle schede, Descrizione di un'immagine, Titolo di un riquadro) vengono cercate nelle traduzioni del progetto per la lingua di chi apre la finestra: se c'è una traduzione per quel testo esatto, si vede quella. Per ora l'IDE non ha un posto dove scrivere le traduzioni. I valori che arrivano dagli schemi non vengono mai tradotti.

## I valori quando la finestra è chiusa e riaperta

Il programma gira anche quando nessuna finestra è aperta: gli schemi continuano a mandare valori agli oggetti delle componenti. Cosa vede chi apre la finestra dipende da due scelte in **Opzioni del progetto → L'app e le sue finestre**:

| Scelta | Acceso (di serie) | Spento |
|---|---|---|
| **Una finestra riaperta mostra subito gli ultimi valori** | Il motore tiene l'ultimo valore mandato a ogni porta di ogni componente (fino a 2000 porte per programma). Chi apre la finestra vede subito quei valori. | La finestra si apre come l'hai disegnata (con i valori delle proprietà) e mostra solo i valori che arrivano da quel momento. |
| **Le copie della stessa finestra restano allineate** | Il motore tiene anche le **scelte dell'utente** (l'interruttore acceso, la voce scelta, il testo scritto…): riaprendo la finestra le ritrovi, anche da un altro dispositivo. | Il motore tiene solo i valori mandati dagli schemi. |

Cose da sapere:

- Quando una finestra si apre, **nessuna componente manda niente** al programma: un pulsante non viene «ripremuto», un interruttore non rimanda il suo stato. Le uscite mandano solo quando l'utente agisce.
- Allo stesso modo, il valore «all'inizio» di una componente (per esempio **Acceso all'inizio** di un Interruttore) è solo quello che si vede: il programma non lo riceve. Se uno schema deve conoscerlo, dagli lo stesso valore con un blocco [Costante · Variabile](core.value).
- Il motore ricorda i valori **per porta**: se a un Valore arrivano 10 numeri mentre la finestra è chiusa, riaprendola vedi solo l'ultimo.
- In lilOS una finestra di un programma si apre **una volta sola**: aprirla di nuovo la porta davanti. Due copie della stessa finestra esistono solo su due dispositivi o due browser.
- Se il programma si ferma, le sue finestre si chiudono. Se chiudi l'ultima finestra di un'app fatta con **Crea app**, il suo programma si ferma.
- Nell'IDE l'**Anteprima** durante una Prova mostra i valori che arrivano mentre la guardi. Ogni volta che la finestra si ridisegna (cambi una proprietà, passi da Progetta ad Anteprima) le componenti ripartono dai valori delle proprietà.
- Il programma accetta al massimo 100 messaggi al secondo dalle finestre e dall'IDE; oltre, il messaggio viene rifiutato («Troppi messaggi al programma»). Un valore mandato da una componente può essere grande al massimo 256 KB.

## Accessibilità e tastiera

- Il **Tab** passa da un controllo all'altro nell'ordine in cui stanno nella finestra; le componenti disabilitate vengono saltate.
- Pulsanti, interruttori e caselle si azionano con **Spazio** o **Invio**; pulsanti di opzione e colori si scelgono con le **frecce**; nell'Elenco le frecce **su** e **giù** cambiano la voce scelta; le righe di una Tabella si scelgono con **Invio** o **Spazio**.
- Ogni pagina dice cosa fa la tastiera per quella componente e cosa annuncia un lettore di schermo.

## Esempi completi

### 1. Un contatore con un pulsante

```
Finestra «Contatore» 320 × 200
└ Colonna (radice)
  ├ Valore       value1   Etichetta «Clic:»   Quando è vuoto «0»
  ├ Riga
  │ ├ Pulsante   button1  Testo «Conta»       Aspetto principale
  │ └ Pulsante   button2  Testo «Azzera»      Aspetto normale
```

Crea gli oggetti di `value1`, `button1` e `button2` nello schema, poi:

```
[Pulsante: Conta]  premuto ──▶ più    [Contatore (++ −−)] conteggio ──▶ valore [Valore: Clic:]
[Pulsante: Azzera] premuto ──▶ azzera
```

Ogni clic su **Conta** fa salire il conteggio di 1 e il Valore lo mostra; **Azzera** lo riporta a 0. All'apertura il Valore mostra «0» (il testo di **Quando è vuoto**) finché non arriva il primo conteggio. Se chiudi e riapri la finestra, vedi l'ultimo conteggio.

### 2. Un modulo con conferma

```
Finestra «Nuovo contatto» 380 × 300
└ Colonna (radice)
  ├ Campo di testo  text1     Etichetta «Nome»
  ├ Campo di testo  text2     Etichetta «Email»
  ├ Casella di spunta checkbox1 Etichetta «Iscrivimi alla newsletter»
  ├ Pulsante        button1   Testo «Salva»
  └ Etichetta       label1    Testo «»   Dimensione piccolo
```

Il pulsante deve salvare i valori del momento, non uno a ogni modifica. Usa un blocco [Oggetto { }](core.compose) con tre campi aggiunti (**nome**, **email**, **newsletter**) a cui **togli «lo avvia»**, e un quarto campo **salva** che lo avvia:

```
[Campo di testo: Nome]       testo  ──▶ nome        [Oggetto { }] oggetto ──▶ contenuto [appendFile]
[Campo di testo: Email]      testo  ──▶ email
[Casella di spunta: Iscrivimi…] valore ──▶ newsletter
[Pulsante: Salva]            premuto ──▶ salva
[appendFile] scritto ──▶ invia [Costante · Variabile «Salvato.»] valore ──▶ testo [Etichetta: label1]
```

Nell'[appendFile](lilos.fileAppend) scegli il **Formato** «JSON, uno per riga».

Il Campo di testo manda **testo** quando l'utente conferma (Invio o uscendo dal campo): quando preme **Salva**, i campi sono già arrivati al blocco Oggetto { }, che parte con **salva** e scrive una riga nel file, per esempio `{"nome":"Anna","email":"anna@esempio.it","newsletter":true,"salva":true}`. Poi l'etichetta piccola mostra «Salvato.».

- Anche **salva** finisce nell'oggetto, perché è uno dei suoi campi.
- Se l'utente non tocca mai la casella, **newsletter** manca dalla riga: la casella manda il suo valore solo quando la cambi.

> Il blocco [Costante · Variabile](core.value) qui ha il suo ingresso **invia** collegato (si mostra con l'occhio accanto alla porta, nelle Proprietà), così «Salvato.» compare solo dopo il primo salvataggio e non all'avvio.

### 3. Una sonda con allarme e due schede

```
Finestra «Serra» 420 × 320
└ Colonna (radice)
  └ Schede   Nomi delle schede «Ora, Impostazioni»
    ├ Colonna                            ← pagina «Ora»
    │ ├ Indicatore  gauge1  Etichetta «Temperatura»  Unità «°C»  Minimo 0  Massimo 50
    │ └ Spia        lamp1   Etichetta «Troppo caldo»  Colore rosso
    └ Colonna                            ← pagina «Impostazioni»
      └ Cursore     slider1 Etichetta «Soglia»  Minimo 20  Massimo 45  All'inizio 30  Unità « °C»
```

Nello schema, un blocco [readFile](lilos.fileRead) legge ogni 10 secondi la temperatura da un file scritto da un altro programma:

```
[Intervallo (setInterval): 10 s] impulso ──▶ leggi [readFile: ~/serra.txt] contenuto ──▶ valore [Cast (converti tipo): numero] risultato ──▶ valore [Indicatore: Temperatura]
                                                                          risultato ──▶ a [Confronto (== ≠ < >): a > b] risultato ──▶ accesa [Spia: Troppo caldo]
[Costante · Variabile: 30] valore ──▶ b [Confronto (== ≠ < >)]
[Cursore: Soglia] valore ──▶ b [Confronto (== ≠ < >)]
```

L'indicatore segue la temperatura; la spia si accende quando supera la soglia. Il blocco [Costante · Variabile](core.value) 30 dà al confronto la stessa soglia che il cursore mostra all'inizio (il cursore non la manda finché l'utente non lo sposta). Il valore della pagina «Impostazioni» arriva al confronto anche se l'utente sta guardando la pagina «Ora».

## Limiti noti

- Al massimo 200 componenti per finestra (contenitori e radice compresi), di serie; un amministratore può cambiarlo nel Pannello di controllo → Logic Studio → Limiti. Oltre: «Troppe componenti nella finestra Principale: al massimo 200».
- I contenitori non hanno un oggetto creabile dall'IDE (vedi sopra).
- Nell'Area libera non si possono dare larghezza e altezza ai pezzi.
- Un pezzo spostato da un'Area libera a un altro contenitore tiene le sue coordinate e appare spostato di quei pixel anche nel nuovo posto: rimettilo in un'Area libera e trascinalo nell'angolo, oppure eliminalo e aggiungilo di nuovo.
- Le etichette sopra i controlli non sono collegate ai controlli per i lettori di schermo (vedi le singole pagine).
- I testi delle finestre non si possono ancora tradurre dall'IDE.

## Vedi anche

- [Oggetto di una componente](ide/components)
- [Finestre](ide/windows)
- [Prova e programmi attivi](ide/run)
- [Come funziona un blocco](ide/blocks)
- [Blocchi di base](logicstudio-core)
