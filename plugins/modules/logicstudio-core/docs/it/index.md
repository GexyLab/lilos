# Blocchi di base

`logicstudio-core` · richiede il motore [Logic Studio Engine](logicstudio-engine) e lilOS dalla 1.37.0

I blocchi che servono in quasi ogni schema di Logic Studio: valori fissi e memorie, logica e confronti, calcoli, testo, oggetti, tempo (intervalli e attese), le console per scrivere righe e fare domande, le porte per collegare gli schemi di un progetto e l'oggetto che collega uno schema a una componente di una finestra.

## Come si installa

Il pacchetto si installa **da solo** insieme all'app **Logic Studio IDE**: l'AppStore lo porta con sé, insieme al motore, perché l'IDE ne ha bisogno. Se manca (per esempio perché è stato tolto), un amministratore lo installa dall'**AppStore**, scheda **Kernel**, cercando «logicstudio-core». Il pacchetto non chiede permessi: i suoi blocchi non toccano file, rete o notifiche.

Gli altri blocchi arrivano con altri pacchetti: [Liste e matrici](logicstudio-collections), [Blocchi di lilOS](logicstudio-lilos) (notifiche, file, eventi), [Blocchi di rete](logicstudio-net), le [Componenti UI standard](logicstudio-ui) e i [Grafici](logicstudio-charts).

## I blocchi

### Valori

| Blocco | Cosa fa |
|---|---|
| [Costante · Variabile](core.value) | Manda un valore fisso (numero, testo, sì/no o JSON): una volta all'avvio dello schema, oppure a ogni impulso se colleghi **invia**. Se colleghi **imposta**, il valore può cambiare e diventa una variabile. |
| [Memoria (set · get)](core.store) | Tiene da parte un valore: lo scrivi con **imposta**, lo leggi con **leggi**, lo svuoti con **svuota**. |
| [Cast (converti tipo)](core.convert) | Cambia il tipo di un valore: in numero, testo, sì/no, testo JSON, o da testo JSON a oggetto o lista. |

### Logica

| Blocco | Cosa fa |
|---|---|
| [AND](core.and) | Sì solo se tutti gli ingressi che hanno un valore sono sì. |
| [OR](core.or) | Sì se almeno un ingresso è sì. |
| [XOR](core.xor) | Sì se gli ingressi che valgono sì sono in numero dispari. |
| [NOT](core.not) | Rovescia un sì/no. |
| [Confronto (== ≠ < >)](core.compare) | Confronta due valori (=, ≠, >, ≥, <, ≤): manda un sì/no e un impulso su **se vero** o **se falso**. |
| [If · Else](core.if) | Manda un valore su **allora** o su **altrimenti**, secondo una condizione. |
| [Switch · Case](core.switch) | Manda un impulso sull'uscita del caso uguale al valore, o su **altrimenti**. |
| [Scegli per indice (MUX)](core.select) | Fa passare uno solo dei suoi ingressi, quello indicato da **quale**. |
| [Instrada per indice (DEMUX)](core.route) | Manda il valore su una delle sue uscite, quella indicata da **quale**. |
| [Merge (unisci flussi)](core.merge) | Riunisce più ingressi in un'uscita: ogni valore che arriva passa. |
| [Attendi tutti (join)](core.join) | Un impulso su **pronto** quando è arrivato qualcosa su tutti gli ingressi aggiunti. |
| [Sequenza (then)](core.sequence) | A ogni impulso su **avvia**, un impulso su ogni uscita, dall'alto in basso. |
| [Al cambio (fronte ↑↓)](core.edge) | Un impulso quando un sì/no cambia: **diventa vero** o **diventa falso**. |

### Matematica

| Blocco | Cosa fa |
|---|---|
| [Somma (+)](core.add) | Somma due o più numeri. |
| [Sottrazione (−)](core.subtract) | a − b. |
| [Moltiplicazione (×)](core.multiply) | Moltiplica due o più numeri. |
| [Divisione (÷ %)](core.divide) | a ÷ b, con il resto. |
| [Min · Max · Avg](core.stat) | Il più piccolo, il più grande o la media di due o più numeri. |
| [Funzioni Math](core.math) | Arrotonda, valore assoluto, radice, cambia segno, seno, coseno, logaritmo, esponenziale. |
| [Clamp (limita)](core.clamp) | Tiene un numero tra un minimo e un massimo. |
| [Contatore (++ −−)](core.counter) | Un numero che sale, scende e si azzera a impulsi. |

### Testo

| Blocco | Cosa fa |
|---|---|
| [Template (formatta)](core.format) | Un testo da un modello con segnaposto tra graffe, come `Ciao {nome}`. |
| [Concat testo](core.concat) | Unisce due o più testi, con un separatore. |
| [Funzioni stringa](core.text) | Maiuscolo, minuscolo, togli spazi, lunghezza, contiene, sostituisci. |

### Oggetti

| Blocco | Cosa fa |
|---|---|
| [Get proprietà (obj.campo)](core.get) | Prende un campo da un oggetto o un elemento da una lista, con un percorso come `a.b.0`. |
| [Oggetto { }](core.compose) | Mette insieme più valori in un oggetto, un campo per ingresso. |
| [Destruttura oggetto](core.decompose) | Divide un oggetto nei suoi campi, un'uscita per campo. |
| [Lista [ ]](core.list) | Mette insieme più valori in una lista, nell'ordine degli ingressi. |

### Tempo

| Blocco | Cosa fa |
|---|---|
| [All'avvio (main)](core.onStart) | Un impulso quando il programma parte. |
| [Intervallo (setInterval)](core.every) | Un impulso a intervalli regolari; si accende e si spegne con **acceso**. |
| [Ritardo (setTimeout)](core.delay) | Fa uscire ogni valore dopo un certo numero di secondi; nessun valore va perso. |
| [Debounce](core.debounce) | Manda solo l'ultimo valore, quando smettono di arrivare per un po'. |
| [Throttle](core.throttle) | Lascia passare al massimo un valore ogni tanti secondi; scarta gli altri. |
| [Now (data e ora)](core.now) | La data e l'ora di adesso: ISO, millisecondi e parti (anno, mese, giorno…). |

### Console

| Blocco | Cosa fa |
|---|---|
| [Print (console.log)](core.consoleWrite) | Scrive una riga in una console, con un livello (normale, informazione, avviso, errore); può pulirla. |
| [Input (readline)](core.consoleRead) | Fa una domanda e manda la risposta come testo, numero, sì/no o un tasto. |

### Eccezioni

| Blocco | Cosa fa |
|---|---|
| [Throw (lancia Exception)](core.throw) | Lancia un'eccezione con un messaggio tuo, o rilancia quella che arriva. |
| [Catch (cattura)](core.catch) | Riceve le eccezioni e separa quelle da gestire (per testo, espressione, blocco o tipo) dalle altre. |
| [Dati di Exception (e.message…)](core.errorInfo) | Scompone un'eccezione: messaggio, blocco, tipo di blocco, schema, momento. |
| [Catch globale (onerror)](core.onError) | Riceve le eccezioni che nessuno ha collegato, dello schema o di tutto il programma. |

### Porte di schema

| Blocco | Cosa fa |
|---|---|
| [Parametro (ingresso di schema)](core.schemaIn) | Una porta d'ingresso dello schema: riceve i valori dagli altri schemi del progetto. |
| [Return (uscita di schema)](core.schemaOut) | Una porta d'uscita dello schema: manda i valori agli altri schemi del progetto. |

### Componenti UI

| Blocco | Cosa fa |
|---|---|
| [Componente UI](core.component) | L'oggetto di una componente di una finestra in uno schema: ha le porte della componente. Si crea dalla finestra, non dalla scheda Blocchi. |

## Da sapere per tutti i blocchi

### Come gira un blocco

Un valore che arriva su un ingresso resta come valore di quell'ingresso; se l'ingresso **lo avvia**, il blocco lavora con l'ultimo valore di ogni ingresso. Un blocco tratta i valori uno alla volta, nell'ordine in cui arrivano, e i blocchi vanno avanti indipendenti tra loro: uno che aspetta (una domanda, un'attesa) non ferma gli altri. Tutto questo è spiegato in [Come funziona un blocco](ide/blocks).

### Come vengono letti i valori

Molti blocchi convertono quello che ricevono. Le regole sono le stesse in tutto il pacchetto:

| Serve | Come viene letto |
|---|---|
| **un numero** | Un numero resta com'è; sì vale 1 e no 0. Un testo viene letto dopo aver cambiato la **prima** virgola in punto: `"2,5"` → 2,5, `" 42 "` → 42, `"1e3"` → 1000, `""` → 0. `"1.234,5"` e `"ciao"` non sono numeri. Un valore che manca vale 0. |
| **un sì/no** | Un testo è **no** se, tolti gli spazi e senza badare alle maiuscole, è vuoto, `0`, `false`, `no` o `off`; ogni altro testo è **sì** (anche `falso`). Gli altri valori: 0, `null` e un valore che manca sono no; ogni oggetto e ogni lista, anche vuoti, sono sì. |
| **un testo** | Un testo resta com'è; un numero o un sì/no diventa il suo testo (`21.5`, `true`); `null` diventa un testo vuoto; un oggetto o una lista diventano JSON su una riga (`{"a":1}`). |

### L'Exception

Ogni blocco (tranne le porte di schema) ha l'uscita **Exception**. Quando un blocco non riesce a fare il suo lavoro, lì esce un oggetto:

```
{"message": "Il campo «sconto» non esiste", "block": "get1", "type": "core.get", "schema": "main", "at": 1794405901003}
```

`message` è il messaggio, `block` l'id del blocco, `type` il suo tipo (dal motore 1.3.0), `schema` lo schema, `at` il momento in millisecondi. Nello schema la porta **Exception** è rossa; è nascosta di serie e si mostra con l'occhio nelle Proprietà. Se l'Exception non è collegata, l'oggetto va al [Catch globale (onerror)](core.onError) dello schema (o del programma), se c'è; altrimenti la console principale scrive una riga rossa con il nome del blocco e il messaggio, per esempio `Get proprietà (obj.campo): Il campo «sconto» non esiste`. Per gestire le eccezioni ci sono i blocchi della categoria **Eccezioni**: [Catch (cattura)](core.catch), [Throw](core.throw), [Dati di Exception](core.errorInfo) e [Catch globale](core.onError).

### Le porte aggiunte

Alcuni blocchi permettono di aggiungere porte nelle **Proprietà** (mai sul blocco). I nomi delle porte nuove dipendono dal blocco:

| Nomi | Blocchi | Si rinominano? |
|---|---|---|
| lettere: **c**, **d**, **e**… (o **a**, **b**… se il blocco non ne ha) | AND, OR, XOR, Somma (+), Moltiplicazione (×), Min · Max · Avg, Concat testo, Merge (unisci flussi), Attendi tutti (join) | no |
| numeri: **1**, **2**, **3**… (in Scegli per indice partono da **2**: vedi la sua pagina) | Lista [ ], Instrada per indice (DEMUX), Sequenza (then), Scegli per indice (MUX) | no |
| un nome tuo (nasce come **campo 1**, **segnaposto 1**, **caso 1**, **ingresso 1**…) | Oggetto { }, Destruttura oggetto, Template (formatta), Switch · Case, Print (console.log) | sì, fino a 60 caratteri |

Un blocco può avere al massimo il numero di porte aggiunte che dice la sua pagina, e comunque non più del limite **Porte aggiunte per blocco** del motore (32 di serie).

### Il tempo e la partenza

- I blocchi All'avvio (main), Costante · Variabile (se **invia** non è collegato) e Intervallo (setInterval) (con **Parte da solo**) partono quando parte il programma. All'avvio (main) e Costante · Variabile mandano **prima** che arrivino i **valori iniziali** degli ingressi: vedi [All'avvio (main)](core.onStart).
- I tempi di Intervallo (setInterval), Ritardo (setTimeout), Debounce e Throttle contano dal computer su cui gira lilOS. Quando il programma si ferma, i valori che stavano aspettando vanno persi.
- Tutti i blocchi hanno un **tempo massimo** per fare il loro lavoro (30 secondi di serie): conta per [Input (readline)](core.consoleRead), che aspetta una persona. Le attese di Ritardo (setTimeout) e Debounce invece non contano: il blocco ha già finito, è il valore che aspetta.
- Un programma che fa più di 10000 esecuzioni di blocchi in 10 secondi (di serie) viene fermato, perché sembra un ciclo senza fine. Vedi [Limiti](logicstudio-engine/limits).

## Esempi

### 1. Indovina il numero

Uno schema solo, che gioca in console.

```
[All'avvio (main)] impulso ──▶ chiedi [Input (readline): "Indovina un numero da 1 a 10", numero] valore    ──▶ a [Confronto (== ≠ < >): a = b]
                                                                                     annullato ──▶ invia [Costante · Variabile: "Alla prossima!"] valore ──▶ valore [Print (console.log)]

[Confronto (== ≠ < >)] se vero  ──▶ invia [Costante · Variabile: "Bravo, era 7!"] valore ──▶ valore [Print (console.log): informazione]
[Confronto (== ≠ < >)] se falso ──▶ invia [Costante · Variabile: "No, riprova"]   valore ──▶ valore [Print (console.log): avviso]
[Confronto (== ≠ < >)] se falso ──▶ chiedi [Input (readline)]
```

Impostazioni:

- [Confronto (== ≠ < >)](core.compare): operazione **a = b**; su **b** il valore iniziale 7 e **lo avvia** tolto.
- I tre blocchi [Costante · Variabile](core.value): tipo testo, con **invia** collegato (in Proprietà mostralo con l'occhio); così mandano solo quando arriva l'impulso.
- [Input (readline)](core.consoleRead): **Tempo massimo** 25 secondi.

Una partita:

| Nella console | Cosa succede |
|---|---|
| domanda «Indovina un numero da 1 a 10» | |
| scrivi `3` | «No, riprova» (avviso) e la domanda torna |
| scrivi `sette` | «Serve un numero. Riprova.» e la domanda torna |
| scrivi `7` | «Bravo, era 7!» e il gioco finisce |
| oppure non scrivi niente per 25 secondi | «Alla prossima!» |

Il collegamento da **se falso** a **chiedi** torna indietro: è un ciclo, ma ogni giro aspetta la risposta di una persona, quindi non corre. Il Tempo massimo di 25 secondi evita l'errore del tempo massimo di un blocco (30 secondi).

### 2. Un registro dei giri con una finestra

Un progetto con una finestra **main** che ha un [Pulsante](ui.button) **Azzera**; l'oggetto del pulsante sta nello schema.

```
[Intervallo (setInterval): 10 s] impulso ──▶ più [Contatore (++ −−)] conteggio ──▶ giri  [Oggetto { }] oggetto ──▶ valore [Print (console.log)]
                                         conteggio ──▶ leggi [Now (data e ora)] ISO ──▶ quando
[Pulsante: Azzera] premuto ──▶ azzera [Contatore (++ −−)]
```

Impostazioni:

- [Oggetto { }](core.compose): due ingressi aggiunti, rinominati **quando** e **giri**; su **giri** togli **lo avvia**. Il conteggio arriva a **giri** e resta lì; poco dopo arriva l'ora su **quando**, che fa uscire l'oggetto completo.
- [Print (console.log)](core.consoleWrite): **Formato** testo.

Ogni 10 secondi la console scrive una riga come:

```
{"quando":"2026-11-11T14:05:10.004Z","giri":1}
{"quando":"2026-11-11T14:05:20.006Z","giri":2}
```

Un clic su **Azzera** riporta il blocco [Contatore (++ −−)](core.counter) a 0 e manda 0 su **conteggio**: esce subito una riga con `"giri":0`, e il giro dopo riparte da 1.

### 3. Due schemi che si parlano

Un progetto con due schemi, **interfaccia** e **testi**, e una finestra con un [Campo di testo](ui.text) **cerca** e un [Valore](ui.value) **anteprima**. Gli oggetti delle due componenti stanno nello schema **interfaccia**.

Schema **interfaccia**:

```
[Campo di testo: cerca] testo ──▶ valore [Debounce: 0,5 s] valore ──▶ valore [Return (uscita di schema): domanda, testo]
[Parametro (ingresso di schema): risposta, testo] valore ──▶ valore [Valore: anteprima]
```

Schema **testi**:

```
[Parametro (ingresso di schema): domanda, testo] valore ──▶ testo [Funzioni stringa: MAIUSCOLO] risultato ──▶ valore [Return (uscita di schema): risposta, testo]
```

Nella **Mappa** collega **interfaccia › domanda** a **testi › domanda** e **testi › risposta** a **interfaccia › risposta**.

Mentre l'utente scrive «ciao mondo», il campo manda un valore a ogni tasto; l'[Debounce](core.debounce) aspetta che si fermi per mezzo secondo e manda solo `ciao mondo`; lo schema **testi** lo trasforma e la finestra mostra `CIAO MONDO`.

### 4. Gli errori raccolti in una console

Aggiungi nel progetto una console **Errori**. In ogni schema, collega le uscite **Exception** dei blocchi che possono sbagliare a un solo blocco:

```
[Get proprietà (obj.campo): prezzo] Exception ──▶ oggetto [Get proprietà (obj.campo): message] valore ──▶ valore [Print (console.log): Errori, errore]
[Divisione (÷ %)]               Exception ──▶ oggetto
```

Quando un oggetto senza prezzo arriva a [Get proprietà (obj.campo)](core.get), la console **Errori** scrive in rosso `Il campo «prezzo» non esiste`; con un divisore 0, `Divisione per zero`. Nei programmi attivi le righe di livello errore finiscono anche nel registro del progetto (di serie).

## Limiti noti

- [Input (readline)](core.consoleRead) che aspetta una risposta più del **tempo massimo di un blocco** (30 secondi di serie) dà un'eccezione e la risposta data dopo va persa: imposta un **Tempo massimo** più breve.
- Il **Valore predefinito** di Input (readline) vale solo con le console nascoste; non riempie una risposta vuota e non sostituisce l'annullamento per tempo scaduto.
- [All'avvio (main)](core.onStart) e [Costante · Variabile](core.value) mandano prima dei valori iniziali degli ingressi.
- [Now (data e ora)](core.now) usa l'ora del computer su cui gira lilOS, non quella del tuo browser.
- Due blocchi [Parametro (ingresso di schema)](core.schemaIn) con lo stesso nome nello stesso schema: riceve solo uno dei due.
- Il **Tipo** delle porte di schema non viene controllato mentre il programma gira.
- Gli ingressi **abilitato** e **visibile** delle componenti reagiscono solo al valore no vero e proprio, non al testo `"no"`.
- [Get proprietà (obj.campo)](core.get) e [Destruttura oggetto](core.decompose) non sanno leggere un nome di campo che contiene un punto.

## Vedi anche

- [Panoramica dell'IDE](ide/index)
- [Come funziona un blocco](ide/blocks), [I collegamenti](ide/links), [Le console](ide/consoles)
- [Il motore](logicstudio-engine) e i suoi [Limiti](logicstudio-engine/limits)
