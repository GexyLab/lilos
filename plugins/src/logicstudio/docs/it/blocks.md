# Come funziona un blocco

Questa è la pagina di riferimento su **come gira un blocco**. Vale per tutti i blocchi di tutti i pacchetti: le pagine dei singoli blocchi dicono solo cosa fa ognuno.

In breve: i valori arrivano sugli **ingressi**; quando arriva un valore su un ingresso che **lo avvia**, il blocco lavora con **l'ultimo valore di ogni ingresso** e manda i risultati dalle **uscite** lungo i collegamenti.

## Gli ingressi tengono l'ultimo valore

Ogni ingresso ricorda **l'ultimo valore** che gli è arrivato. Il valore resta lì finché non ne arriva un altro, anche se il blocco nel frattempo ha lavorato.

- Un ingresso che **non ha mai ricevuto niente** non ha valore. Molti blocchi lo ignorano: una **Somma** con solo **a** = 5 dà 5.
- Il valore `null` è un valore come gli altri (sui fogli si vede `∅`).

## «lo avvia»

Nelle **Proprietà**, sotto ogni ingresso, c'è la casella **lo avvia**:

- **spuntata** (di serie): quando arriva un valore su quell'ingresso, il blocco lavora subito;
- **tolta**: il valore viene solo **tenuto**, e sarà usato la prossima volta che il blocco lavora perché è arrivato qualcosa su un altro ingresso.

Sul blocco, il nome di un ingresso che non avvia è **sottolineato a puntini**.

Alcuni blocchi hanno ingressi che **per come sono fatti** non li avviano: per esempio **domanda** di [Input (readline)](core.consoleRead), **titolo** e **testo** di [Notify](lilos.notify), **percorso** di [readFile](lilos.fileRead). La pagina del blocco lo dice.

> In questa versione, per questi ingressi le Proprietà mostrano comunque **lo avvia** spuntato e il nome non è sottolineato, ma il blocco non parte. Attenzione: se a uno di questi ingressi dai un **valore iniziale**, il motore lo considera un ingresso che avvia. Per essere sicuro che non avvii il blocco, togli tu la spunta da **lo avvia** su quell'ingresso.

Gli **impulsi** (ingressi di tipo impulso, come **invia**, **leggi**, **più**) servono proprio ad avviare: conta il momento in cui arrivano. Un impulso è un `true` che dura un istante: l'ingresso vale `true` per il lavoro che fa partire, poi torna `false` senza far ripartire il blocco. Un ingresso impulso non parte con `false`.

### Un esempio

```
[Cursore: prezzo]   valore ──▶ a  [Moltiplicazione (×)] risultato ──▶ valore [Componente Valore: totale]
[Cursore: quantità] valore ──▶ b
```

- Con **lo avvia** su **a** e **b**: muovendo uno dei due cursori, il totale si aggiorna.
- Togliendo **lo avvia** da **a**: muovendo il prezzo non succede niente; il nuovo prezzo verrà usato quando cambi la quantità.

## Il valore iniziale

Ogni ingresso (tranne quelli di tipo impulso) può avere un **valore iniziale**, nel campo **iniziale** delle Proprietà. Quando il programma parte, il valore arriva sull'ingresso **come se fosse arrivato da un collegamento**:

- se l'ingresso **lo avvia**, il blocco lavora subito all'avvio;
- se non lo avvia, il valore resta solo lì, pronto.

Il campo legge il testo come JSON (`5` è un numero, `"5"` un testo, `true` un sì, `[1,2]` una lista, `{"a":1}` un oggetto); quello che non è JSON è un testo (`ciao`). Vuoto vuol dire nessun valore iniziale. Non si può dare `null` come valore iniziale.

Il valore iniziale è comodo per i parametri: la soglia del blocco **Confronto**, il divisore del blocco **Divisione**, il testo fisso del blocco **Print**.

## L'avvio del programma

Quando un programma parte (prova, programma attivo o app), il motore:

1. chiama la partenza di ogni blocco che ne ha una, nell'ordine dei blocchi nel file: per esempio **Costante · Variabile** con niente collegato a **invia** manda il suo valore, **All'avvio** manda un impulso, **Intervallo** con **Parte da solo** accende il suo orologio, **Contatore** si mette al valore **Parte da**;
2. dà a ogni ingresso il suo **valore iniziale**;
3. avvia i blocchi che girano in continuazione (se un pacchetto ne ha).

I valori mandati in questa fase viaggiano come tutti gli altri: un blocco che riceve due valori all'avvio lavora due volte.

I blocchi che stanno in un **gruppo** non fanno niente di tutto questo all'avvio del programma: lo fanno quando la porta **Run** del gruppo riceve un impulso, e di nuovo a ogni impulso. Vedi [Gruppi](ide/groups).

## Una cosa alla volta

Ogni blocco ha una **fila** di valori in arrivo e li tratta **uno alla volta, nell'ordine in cui sono arrivati**:

1. prende il primo valore della fila e lo mette sul suo ingresso;
2. se quell'ingresso lo avvia, lavora con l'ultimo valore di ogni ingresso e aspetta di aver finito;
3. manda i risultati dalle uscite;
4. passa al valore successivo.

Conseguenze:

- un blocco lento (un blocco **HTTP**, una domanda in console) **non ferma gli altri**: gli altri blocchi vanno avanti, solo i valori per lui aspettano in fila;
- un blocco non lavora mai due volte insieme;
- quando un blocco manda valori da più uscite, i blocchi che li ricevono cominciano dopo che lui ha finito di mandarli tutti.

Un blocco sa **quale ingresso** l'ha avviato e può comportarsi in modo diverso: il **Contatore** sale con **più**, scende con **meno** e torna all'inizio con **azzera**; **Print** scrive con **valore** e pulisce con **pulisci**.

## Le uscite

Quando un blocco ha finito, manda i suoi risultati dalle uscite, lungo **tutti** i collegamenti di ogni uscita.

- Un blocco che su un'uscita **non dà niente** non manda niente su quella uscita: **Confronto** manda un impulso su **se vero** oppure su **se falso**, mai su tutte e due.
- Un'uscita non collegata non fa niente (tranne **Exception**, vedi sotto).
- Alcuni blocchi mandano valori **più tardi**, da soli: **Ritardo** dopo i secondi scelti, **Intervallo** a ogni scatto, **Debounce** quando l'ingresso si ferma.
- I valori sono quelli che si scrivono in JSON: numeri, testi, sì/no, liste, oggetti e `null`. Tra il motore e le finestre (o l'IDE) viaggiano come copie; un valore che arriva da una finestra può essere al massimo di 256 KB.

## L'uscita «Exception»

Ogni blocco ha, come ultima uscita, **Exception** (nome interno `error`). Quando qualcosa va storto mentre il blocco lavora (un numero che non è un numero, una divisione per zero, un file che non c'è, una rete che non risponde), il blocco **non manda niente sulle sue uscite normali** e manda su **Exception** un oggetto:

```json
{
  "message": "Divisione per zero",
  "block": "divide1",
  "schema": "main",
  "at": 1762790400000
}
```

| Campo | Cosa contiene |
|---|---|
| `message` | Il messaggio dell'errore. |
| `block` | L'id del blocco nello schema (per esempio `divide1`). |
| `type` | Il tipo del blocco (per esempio `core.divide`; dal motore 1.3.0). |
| `schema` | Il nome dello schema. |
| `at` | Quando è successo, in millisecondi dal 1° gennaio 1970. |

- Se **Exception è collegata**, l'oggetto va lungo i suoi collegamenti come un valore qualsiasi. Puoi scriverlo in una console, mandare una notifica, contare gli errori…
- Se **non è collegata**, l'oggetto va al blocco [Catch globale (onerror)](core.onError) dello schema (o di tutto il programma), se c'è. Altrimenti nella **console principale** compare una riga di livello errore con il nome del blocco e il messaggio, per esempio `Divisione (÷ %): Divisione per zero`. Il nome è quello del tipo di blocco, non l'etichetta che gli hai dato.
- Per **gestire** le eccezioni ci sono i blocchi della categoria **Eccezioni**: [Catch (cattura)](core.catch) sceglie quali gestire, [Dati di Exception (e.message…)](core.errorInfo) ne legge i campi, [Throw (lancia Exception)](core.throw) ne lancia una tua o rilancia quella che arriva.

Nello schema la porta **Exception** è **rossa** (anche il suo collegamento), così si distingue dalle altre.

Durante la prova un blocco andato in errore ha il **bordo rosso**, finché non lavora di nuovo senza errori; l'etichetta sul collegamento di un'Exception è rossa con `⚠`.

### Un blocco troppo lento

Un blocco che impiega più di **30 secondi** (di serie: «Tempo massimo di un blocco», nei limiti del motore) viene considerato fallito: su **Exception** arriva «Divisione (÷ %) ha impiegato più di 30 s» (con il nome del blocco) e quello che il blocco darà dopo viene buttato via.

> Questo vale anche per **Input**: in questa versione una domanda a cui nessuno risponde entro 30 secondi manda «Input (readline) ha impiegato più di 30 s» sull'Exception, e la risposta data dopo va persa. Vedi [Console](ide/consoles).

## Le porte aggiuntive

Alcuni blocchi permettono di **aggiungere porte**: il blocco **Somma** altri addendi, **AND** e **OR** altre condizioni, **Template** altri segnaposto, **Switch · Case** altri casi, **Print** altri valori da scrivere sulla stessa riga. La pagina di ogni blocco dice quante e di che tipo.

- Si aggiungono **solo** nelle **Proprietà**, sezione **Porte**, con **Aggiungi ingresso** o **Aggiungi uscita**. Accanto c'è il conto: **Aggiunte: 2 di 16**. Al massimo il numero che dice il blocco, e comunque non più di **32** per blocco (limite del motore).
- Sul blocco le porte aggiunte hanno il nome in ***corsivo***.
- Il **nome** dipende dal blocco:

| Il blocco dà | Nomi | Esempio |
|---|---|---|
| lettere | la prima lettera libera | **Somma**: **c**, **d**, **e**… |
| numeri | il numero che segue le porte di base | **Scegli per indice**: **2**, **3**… |
| un nome tuo | un nome proposto, che puoi cambiare | **Template**: «segnaposto 1», poi lo rinomini in `nome` |

- Con **↑** e **↓** cambi l'ordine delle porte aggiunte (per esempio l'ordine dei passi di una **Sequenza**).
- Con **Togli** togli una porta aggiunta: se ha collegamenti, l'IDE chiede conferma e li toglie; **Ctrl+Z** rimette tutto.
- Le **porte di base** (quelle che il blocco ha sempre) hanno il lucchetto: non si tolgono.
- Rinominare una porta non tocca i suoi collegamenti: dentro, ogni porta aggiunta ha un id fisso (`x1`, `x2`…).

Per molti blocchi le porte aggiunte **tengono solo il loro valore**: non avviano il blocco, che parte con un ingresso di base. Per esempio nel blocco **Print** si scrive solo quando arriva **valore**, e gli ingressi aggiunti si aggiungono alla riga come `nome=valore`. La pagina del blocco lo dice.

## Cicli

Puoi fare un **ciclo**: l'uscita di un blocco torna, attraverso altri blocchi, a un suo ingresso. È utile, ma un ciclo senza pause gira all'infinito.

Il motore conta le **esecuzioni** dei blocchi di ogni programma: oltre **10000 in 10 secondi** (di serie) il programma si ferma con «Troppe esecuzioni: più di 10000 in 10 secondi (un ciclo di collegamenti?)». Nella prova lo vedi nei **Problemi**; per un programma attivo ricevi una notifica.

Per un ciclo che deve durare, metti un **Ritardo** nel giro:

```
[All'avvio (main)] impulso ──▶ più [Contatore (++ −−)] conteggio ──▶ valore [Ritardo (setTimeout): 1 s] valore ──▶ più [Contatore (++ −−)]
                                conteggio ──▶ valore [Print (console.log)]
```

Ogni secondo il contatore sale di 1 e lo scrive, per sempre (o fino alla fine della prova).

Gli altri limiti che valgono mentre il programma gira:

| Limite | Di serie | Cosa succede |
|---|---|---|
| Esecuzioni in 10 secondi | 10000 | Il programma si ferma. |
| Tempo di un blocco | 30 s | Errore sull'**Exception** del blocco. |
| CPU | 25% per utente | I blocchi rallentano: dopo aver usato la loro parte di un secondo, aspettano il secondo dopo. |
| Memoria | 128 MB per utente | Si fermano **tutti** i tuoi programmi: «Memoria finita: i programmi hanno usato più della tua quota di memoria». |
| Righe di console | 50 al secondo per console | Le righe in più non si scrivono: «… 12 righe non mostrate (troppe al secondo)». |

Vedi [Limiti](logicstudio-engine/limits).

## Password e testi lunghi

Alcune impostazioni nelle **Proprietà** sono campi speciali:

- **Password** (per esempio quella di un blocco database): quello che scrivi non si vede e non torna indietro. Il motore lo **cifra** per te su questo lilOS e lo schema tiene solo il testo cifrato; sotto il campo c'è scritto «Salvata, cifrata: scrivi per cambiarla» o «Non impostata», e **Cancella** la toglie. Uno schema copiato da un altro utente, o aperto su un altro lilOS, non può usarla: il blocco manda all'uscita Exception «Password non leggibile: va inserita di nuovo nelle Proprietà del blocco» e basta riscriverla.
- **Testi su più righe** (per esempio una query SQL): un riquadro a caratteri fissi che si allarga trascinando l'angolo. Il testo vale quando esci dal campo.

## Blocchi speciali

- **Parametro**: non lavora; manda dalla sua uscita **valore** quello che arriva alla sua porta dagli altri schemi.
- **Return**: quando le arriva un valore su **valore**, lo manda ai blocchi **Parametro** collegati nella Mappa.
- **Oggetto di una componente**: i valori che arrivano ai suoi ingressi vanno alla componente nella finestra (il testo di un'etichetta, il valore di un indicatore); quello che fa l'utente nella finestra esce dalle sue uscite (**premuto**, **valore**). Non lavora come un blocco normale e non ha **lo avvia** né valori iniziali. Vedi [L'oggetto di una componente](ide/components).

## Esempi

### 1. Ricalcolare a ogni valore

```
[Costante · Variabile: 2] valore ──▶ a  [Somma (+)] risultato ──▶ valore [Print (console.log)]
[Costante · Variabile: 3] valore ──▶ b
```

All'avvio i due blocchi Costante · Variabile mandano 2 e 3. Il blocco Somma lavora due volte: la console scrive `2` (solo **a** ha un valore) e poi `5`.

### 2. Solo il risultato finale, con «lo avvia»

Stesso schema, ma nelle Proprietà del blocco Somma togli **lo avvia** da **a**. All'avvio arriva 2 su **a** (tenuto), poi 3 su **b** (avvia): la console scrive solo `5`.

### 3. Una soglia con il valore iniziale

```
[Campo numerico] valore ──▶ a [Confronto (== ≠ < >): a > b, b = 30] se vero ──▶ invia [Costante · Variabile: Troppo caldo] valore ──▶ valore [Print (console.log)]
```

1. Su **Confronto**: **Operazione** = **a > b**; su **b** valore iniziale `30` e **lo avvia** tolto.
2. Su **Costante · Variabile**: **Tipo** = **testo**, **Valore** = `Troppo caldo`. Poi, nelle Proprietà, accendi l'**occhio** accanto alla porta **invia**, che di serie è nascosta.
3. Collega **se vero** a **invia** del blocco Costante · Variabile (con **invia** collegata, manda il valore solo a ogni impulso e non all'avvio; non direttamente a **Print**: l'impulso porterebbe `true`, e la console scriverebbe `true`).

Ogni numero sopra 30 scritto nel campo fa scrivere «Troppo caldo».

### 4. Gestire un errore

```
[Campo numerico: divisore] valore ──▶ b [Divisione (÷ %)] risultato ──▶ valore [Componente Valore: risultato]
                                              Exception ──▶ oggetto [Get proprietà (obj.campo): message] valore ──▶ valore [Print (console.log): avviso]
```

Su **Divisione**, **a** ha valore iniziale `100` e **lo avvia** tolto. Scrivendo `4` nella finestra si vede 25. Scrivendo `0`, **Divisione** manda l'oggetto dell'errore su **Exception**; **Get proprietà** (impostazione **Campo (a.b.0)** = `message`) ne prende il messaggio e la console scrive `Divisione per zero` come avviso, invece della riga d'errore `Divisione (÷ %): Divisione per zero` nella console principale.

### 5. Una porta aggiunta che tiene un valore

```
[Campo di testo: nome]      testo ──▶ nome   [Print (console.log)]
[Campo di testo: messaggio] testo ──▶ valore
```

Su **Print** premi **Aggiungi ingresso** e rinomina la porta in `nome`. Scrivere nel campo **nome** non scrive niente (la porta tiene solo il valore); scrivere `ciao` nel campo **messaggio** scrive la riga `ciao  nome=Ada`.

## Vedi anche

- [Collegamenti e tipi delle porte](ide/links)
- [Schemi](ide/schemas)
- [Console](ide/consoles)
- [Programmi](logicstudio-engine/programs)
- [Limiti](logicstudio-engine/limits)
