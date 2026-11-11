# Schemi

Uno **schema** (file `.lsch`) è un foglio di blocchi collegati. Si apre con un clic sul suo nome nell'elenco **Progetto** e si disegna nel suo editor. Questa pagina spiega l'editor; i collegamenti sono in [Collegamenti e tipi delle porte](ide/links), come gira un blocco in [Come funziona un blocco](ide/blocks).

## Com'è fatto un blocco sul foglio

```
┌▌ Σ  Somma ────────────────┐
│  2 · 5                     │   ← le prime impostazioni (se ce ne sono)
│● a                    ○    │
│● b       risultato ●       │
│○ c                         │   ← porta aggiunta: nome in corsivo
│            Exception ○     │   ← sbiadita finché non è collegata
└────────────────────────────┘
```

- La **testa** ha l'icona e il nome: l'**etichetta** che gli hai dato, altrimenti il nome del blocco. La riga colorata a sinistra è la **categoria** (Valori, Costanti matematiche, Costanti fisiche, Costanti astronomiche, Logica, Matematica, Testo, Oggetti, Liste, Matrici, Unità di misura, Geometria, Trigonometria, Funzioni, Integrali, Analisi numerica, Segnali, Tempo, Console, Porte di schema, Componenti UI, lilOS, Rete, Hardware, Database, Eccezioni, Disegno).
- Sotto la testa, in piccolo, le prime due impostazioni che hanno un valore (al massimo 34 caratteri).
- A sinistra gli **ingressi**, a destra le **uscite**. Il pallino ha il colore del **tipo** della porta ed è pieno quando la porta è collegata (vedi [Collegamenti e tipi delle porte](ide/links)).
- Il nome di un ingresso **sottolineato a puntini** vuol dire che quell'ingresso **non avvia** il blocco.
- Le **porte aggiunte** hanno il nome in *corsivo*.
- L'ultima uscita è sempre **Exception**, rossa, sbiadita finché non la colleghi.

Due blocchi sono speciali:

- **Parametro** e **Return** mostrano come titolo il **nome della porta** e, a destra, il tipo di blocco.
- L'**oggetto di una componente** mostra il nome della componente (o la sua etichetta) e sotto «finestra › componente». Vedi [L'oggetto di una componente](ide/components).

### Testi e forme (Disegno)

I blocchi della categoria **Disegno**, [Testo · Commento](core.drawText) e [Forma](core.drawShape), non sono riquadri con porte: sul foglio si vede il testo o la forma, sotto i collegamenti e i blocchi. Il programma non li esegue; servono a spiegare lo schema, come i commenti nel codice.

- Si spostano, si selezionano, si duplicano, si allineano e si cancellano come gli altri blocchi, e possono stare in un [gruppo](ide/groups).
- Selezionato, un disegno ha un **quadratino nell'angolo in basso a destra**: trascinalo per cambiare la grandezza (per un testo, la larghezza). Si muove a passi di 10 px; con **Alt** premuto è libero.
- **Doppio clic** su un disegno (o tasto destro → **Scrivi il testo**) per scriverne il testo lì sul foglio: **Ctrl Invio** o un clic altrove lo tiene, **Esc** lo lascia com'era.
- Una forma **senza riempimento** si prende solo dalla sua linea: dentro, i clic e il rettangolo di selezione arrivano ai blocchi. Puoi quindi racchiudere dei blocchi in un riquadro e continuare a lavorarci.
- Nelle **Proprietà** un disegno ha solo le impostazioni (niente Etichetta, niente porte). I colori si scelgono con il quadratino o si scrivono (`#2f81f7`, `#2f81f733` con trasparenza, `rgb(…)`, `hsl(…)`, un nome come `orange`); vuoto vuol dire il colore del tema.

## Mettere i blocchi

La scheda **Blocchi** a sinistra elenca i blocchi dei pacchetti installati, divisi per categoria, in ordine alfabetico. Passando il mouse su un blocco vedi il suo tipo e il pacchetto (per esempio `core.add · logicstudio-core 1.0.0`).

- **Cerca…** in alto filtra per nome o per tipo (`somma`, `core.add`, `add`). Se non trova niente: **Non c'è niente**.
- **Un clic sul nome di una categoria** la comprime (▸) o la espande di nuovo (▾); accanto c'è quanti blocchi ha. Le categorie compresse restano tali anche alla prossima apertura. **Tasto destro** sul nome: **Comprimi** / **Espandi**, **Comprimi tutte**, **Espandi tutte**. Mentre cerchi, le categorie con risultati sono tutte aperte: quelle che comprimi lì tornano aperte quando cambi la ricerca.
- **Un clic** su un blocco lo mette al centro della vista e lo seleziona. Clic ripetuti mettono i blocchi uno un po' più in basso a destra dell'altro, mai uno sopra l'altro.
- **Trascinando** il blocco sul foglio lo metti dove lo lasci.
- I blocchi della palette sono spenti quando la scheda aperta non è uno schema (Home, Mappa).
- L'oggetto di una componente non è nella palette: si crea dalla finestra (vedi [L'oggetto di una componente](ide/components)).
- I blocchi **obsoleti** non sono nella palette: un pacchetto li tiene perché gli schemi salvati che li usano continuino a funzionare, ma li ha sostituiti con altri blocchi. Se uno schema ne ha uno, le sue **Proprietà** mostrano l'avviso **Blocco obsoleto** e dicono cosa usare al suo posto (per esempio [Cast (converti tipo)](core.convert) è sostituito dai cinque blocchi Cast, uno per conversione).

Un blocco nuovo ha le impostazioni di serie del suo pacchetto e un id fatto dal suo tipo e da un numero (`add1`, `value2`, `consolewrite1`).

Quando lo schema ha già il numero massimo di blocchi (200 di serie) compare **Al massimo 200 blocchi per schema** e il blocco non viene messo.

### Aggiungere dal foglio

- **Tasto destro sul foglio** → **Aggiungi un blocco qui**: un menu con tutti i blocchi divisi per categoria; il blocco va dove hai fatto clic.
- **Lascia un collegamento nel vuoto**: trascini da un'uscita e lasci il tasto sul foglio, lontano da un ingresso. Si apre lo stesso menu, ma con **solo i blocchi che hanno un ingresso adatto** al tipo di quell'uscita; il blocco scelto viene messo lì e il collegamento va sul suo primo ingresso adatto.

In questi menu non c'è il blocco **Parametro** e l'oggetto delle componenti: prendi il blocco Parametro dalla palette.

## Muoversi sul foglio

| Cosa | Come |
|---|---|
| Ingrandire e rimpicciolire | **Rotella** del mouse (con o senza **Ctrl**), intorno al puntatore; nella barra **−** e **+** (di 1,2 volte) intorno al centro. Da 20% a 250%. |
| Tornare al 100% | Clic sulla percentuale nella barra (**Dimensione reale**). |
| Vedere tutto | **Adatta** nella barra o nel menu del foglio: mostra tutti i blocchi, al massimo al 120%. |
| Spostare la vista | Tieni premuto **Spazio** e trascina; oppure trascina con il **tasto centrale**; **Maiusc+rotella** sposta in orizzontale. |

Lo zoom e la posizione della vista si salvano nello schema. Uno schema aperto la prima volta, o vuoto, viene adattato da solo.

La barra di stato in basso dice per lo schema aperto: **Blocchi 12 / 200 · collegamenti 30 / 600 · 100%**.

## Selezionare

- **Clic** su un blocco: lo seleziona (bordo evidenziato) e mostra le sue Proprietà.
- **Maiusc+clic** su un blocco: lo aggiunge o lo toglie dalla selezione.
- **Trascina sul fondo**: seleziona i blocchi toccati dal rettangolo; con **Maiusc** li aggiunge a quelli già scelti. Un clic sul fondo senza trascinare toglie la selezione.
- **Clic su un collegamento**: lo seleziona (più spesso, illuminato); **Maiusc+clic** ne aggiunge altri.
- **Ctrl+A** seleziona tutti i blocchi; **Esc** toglie la selezione.
- **Clic sulla testata di un gruppo** (o su un gruppo compresso): seleziona il gruppo. Vedi [Gruppi](ide/groups).

## Spostare, duplicare, eliminare

- **Trascina** un blocco: si spostano tutti i blocchi selezionati. Si allineano a una griglia di 10 pixel; tenendo **Alt** si mettono dove lasci, senza griglia.
- **Frecce**: spostano la selezione di 1 pixel; con **Maiusc** di 20.
- **Ctrl+D**: duplica i blocchi selezionati 24 pixel più in basso a destra, con le loro impostazioni, etichette, porte aggiunte e i collegamenti **tra di loro**; seleziona le copie.
- **Canc** (o **Backspace**): elimina i blocchi selezionati e i loro collegamenti; se non ci sono blocchi selezionati, elimina i collegamenti selezionati.

Ogni spostamento, duplicazione o eliminazione si annulla con **Ctrl+Z**.

> **Ctrl+D** non controlla il numero massimo di blocchi: oltre il limite te ne accorgi alla prova. Duplicando un **oggetto di componente** ottieni due oggetti per la stessa componente, e la prova lo rifiuta («La componente … ha già il suo oggetto in …»): cambia la componente della copia o eliminala.

I tasti valgono quando il foglio è in primo piano (dopo un clic sul foglio).

## I menu (tasto destro)

Su un **blocco** (se non era selezionato, diventa la selezione):

| Voce | Cosa fa |
|---|---|
| **Duplica** (Ctrl+D) | Duplica i blocchi selezionati. |
| **Etichetta…** | Chiede «Un nome per questo blocco, che si vede al posto del suo tipo.» (al massimo 80 caratteri; vuoto la toglie). |
| **Raggruppa** (Ctrl+G) | Fa un gruppo dei blocchi selezionati che non sono in un gruppo. |
| **Aggiungi al gruppo** › | Mette i blocchi selezionati in un gruppo che c'è già. |
| **Togli dal gruppo** | Toglie i blocchi selezionati dal loro gruppo. |
| **Apri la sua finestra** | Solo per l'oggetto di una componente: apre la finestra della componente. |
| **Elimina il blocco** / **Elimina 3 blocchi** (Canc) | Elimina la selezione. |

Su un **gruppo**: vedi [Il menu di un gruppo](ide/groups).

Su un **collegamento**: **Elimina il collegamento** (Canc).

Sul **foglio**: **Aggiungi un blocco qui**, **Seleziona tutto** (Ctrl+A), **Adatta**.

Un **doppio clic** sull'oggetto di una componente apre la sua finestra.

## Le Proprietà

Il pannello a destra mostra quello che hai selezionato.

### Niente selezionato: lo schema

- **Schema**: **Nome** (il nome dello schema nel progetto) e **Blocchi** (quanti sono).
- **Porte di schema**: gli **Ingressi** e le **Uscite di schema** di questo schema, con nome e tipo. Se non ce ne sono: «Nessuna porta: aggiungi un blocco Ingresso o Uscita di schema per collegare questo schema agli altri del progetto.»
- In fondo: «Gli schemi di un progetto si collegano solo con le loro porte di schema, nella mappa.»

### Più blocchi o collegamenti

**3 blocchi selezionati** con i pulsanti **Raggruppa** (se qualcuno non è in un gruppo) ed **Elimina 3 blocchi**; oppure **2 collegamenti selezionati** con **Elimina il collegamento**. Le Proprietà di un gruppo sono in [Gruppi](ide/groups).

### Un blocco

Dall'alto:

1. **La testa**: icona e nome del blocco, e la sua descrizione se il pacchetto ne ha una.
2. **Etichetta**: un nome tuo, al massimo 80 caratteri; vuoto vuol dire il nome del blocco. Non c'è per le porte di schema (il loro titolo è il nome della porta) né per l'oggetto di una componente (puoi comunque usare **Etichetta…** dal menu).
3. **Componente UI**: solo per l'oggetto di una componente (**Finestra** e **Componente**). Vedi [L'oggetto di una componente](ide/components).
4. **Impostazioni**: quelle del blocco. Alcune compaiono solo con certe scelte (per esempio **Decimali (arrotonda)** di **Funzioni Math** solo con **arrotonda**). I tipi di controllo:

| Controllo | Come si usa |
|---|---|
| Casella | Sì o no. |
| Scelta | Un elenco: le operazioni hanno nomi leggibili (**a ≥ b**, **arrotonda**, **MAIUSCOLO**…). |
| Numero | Un numero, nei limiti del blocco; vuoto vuol dire il valore di serie. |
| Console | Le console del progetto; la principale ha ★. |
| JSON | Un valore JSON (`{"a": 1}`, `[1, 2]`); se non è JSON valido viene tenuto come testo. |
| Testo | Al massimo 2000 caratteri. |

5. Per **Parametro** e **Return**, dopo le impostazioni: **Collegamenti nel progetto** con gli schemi collegati a questa porta, ognuno con **Scollega**, e il pulsante **Nella mappa**. Se non è collegata: «Non ancora collegata: collegala nella mappa.» In uno schema da solo: «In un progetto, questa porta si collega agli altri schemi nella mappa.»
6. **Porte**: la tabella di **Ingressi** e **Uscite**, con il tipo di ognuna:
   - una porta di base ha il lucchetto, «Porta di base: non si toglie»;
   - una porta aggiunta ha **↑** (Sposta su), **↓** (Sposta giù) e **Togli**, e un campo per il nome se il blocco lascia sceglierlo;
   - sotto ogni ingresso: **lo avvia** e il campo **iniziale** (non c'è per gli ingressi di tipo impulso). Vedi [Come funziona un blocco](ide/blocks);
   - **Aggiungi ingresso** / **Aggiungi uscita** e **Aggiunte: 2 di 16**, solo per i blocchi che lo permettono.
7. **Blocco**: tipo, versione e pacchetto, per esempio `core.add v1 · logicstudio-core 1.0.0`.

Le porte si aggiungono e si tolgono **solo qui**, mai sul blocco. Togliere una porta collegata chiede **Togliere la porta «c»?** — «Ha 2 collegamenti, che vengono tolti. Ctrl+Z li rimette.»

Il campo **iniziale** legge quello che scrivi come JSON, e se non è JSON lo tiene come testo:

| Scrivi | Valore iniziale |
|---|---|
| `5` | il numero 5 |
| `2.5` | il numero 2,5 (con il punto) |
| `"5"` | il testo «5» |
| `ciao` | il testo «ciao» |
| `true` | sì |
| `[1, 2, 3]` | una lista |
| `{"nome": "Ada"}` | un oggetto |
| (vuoto) | nessun valore iniziale |

## Blocchi di pacchetti che non ci sono

Un blocco il cui pacchetto non è installato resta nello schema ma è **tratteggiato**, senza porte, con il suo tipo come titolo e **Manca il pacchetto** sotto. I suoi collegamenti restano nel file ma non si vedono. Le Proprietà dicono: «Questo blocco (net.request) viene da un pacchetto che non è installato. Installalo dall'AppStore, o togli il blocco.» con **Elimina il blocco**. Finché c'è, la prova non parte: nei Problemi compare «Il blocco … (net.request) viene da un pacchetto che non è installato».

Quando il pacchetto viene installato, riapri l'IDE: il blocco torna normale con le sue impostazioni.

## Porte di schema

Un progetto può avere più schemi. Si parlano **solo** attraverso le porte di schema:

- **Return** (categoria Porte di schema): ha l'ingresso **valore**. Ogni valore che le arriva esce dallo schema con il nome della porta.
- **Parametro**: ha l'uscita **valore**. Manda nello schema i valori che arrivano alla porta con quel nome dagli altri schemi.

Nelle Impostazioni: **Nome della porta** (di serie `uscita` e `ingresso`), **Tipo** (qualsiasi, numero, sì/no, testo, oggetto, lista, impulso) e **Descrizione**. Il tipo è quello della porta del blocco e dei riquadri della Mappa.

Quando cambi il nome di una porta, i collegamenti della mappa che la usano lo seguono. Una porta senza nome ferma la prova con «Una porta di schema non ha nome». Dai nomi diversi alle porte dello stesso schema: due Ingressi con lo stesso nome ricevono i valori solo uno dei due.

## La Mappa

Il pulsante **Mappa** (nella barra o accanto al nome del progetto) apre la scheda **«Progetto» · Mappa**, sempre seconda dopo la Home:

- ogni **schema** è un riquadro con il suo nome, i suoi **Ingressi di schema** a sinistra e le **Uscite di schema** a destra;
- ogni **finestra** è un riquadro con il nome (★ se è la main) e una riga che dice quante componenti ha e in quali schemi stanno i loro oggetti: «6 componenti · oggetti in comandi, nord» o «6 componenti · nessun oggetto negli schemi»;
- le righe tra i riquadri sono i **collegamenti tra schemi**.

Cosa puoi fare:

1. **Collegare due schemi**: trascina da un'uscita di uno schema a un ingresso di un altro. Uno schema non si collega con se stesso; lo stesso collegamento non si fa due volte.
2. **Togliere un collegamento**: selezionalo e premi **Canc**, oppure nelle Proprietà premi **Scollega**.
3. **Spostare i riquadri**: trascinali. La loro posizione si salva nel progetto.
4. **Aprire** uno schema o una finestra: doppio clic sul riquadro, oppure selezionalo e premi **Apri** nelle Proprietà (che mostrano anche il suo percorso).

Senza niente di selezionato, le Proprietà della mappa mostrano **Progetto** (**Nome**, **Finestra main**) e **Collegamenti tra schemi**, ognuno con **Scollega**, o **Nessun collegamento**. In fondo: «Trascina da un'uscita di uno schema a un ingresso di un altro per collegarli. Le finestre si raggiungono con gli oggetti delle loro componenti negli schemi.»

La barra ha **Adatta**; la barra di stato dice «4 schemi · 2 finestre · 3 collegamenti tra schemi». Nella mappa non si creano né si eliminano elementi: si fa dall'elenco **Progetto**. Annulla e Ripeti, con la mappa in primo piano, agiscono sul progetto.

## Esempi

### 1. Media di tre numeri

```
[Costante · Variabile: 4] valore ──▶ a  [Min · Max · Avg] risultato ──▶ valore [Print (console.log)]
[Costante · Variabile: 8] valore ──▶ b
[Costante · Variabile: 9] valore ──▶ c
```

1. Metti tre blocchi **Costante · Variabile** (impostazione **Valore** = `4`, `8`, `9`) e un **Min · Max · Avg** con **Operazione** = **media**.
2. Seleziona **Min · Max · Avg** e nelle Proprietà premi **Aggiungi ingresso**: compare **c** in corsivo.
3. Collega i tre blocchi Costante · Variabile ad **a**, **b**, **c** e **risultato** a **Print**.
4. **Prova**: la console scrive `4`, poi `6`, poi `7` (il blocco ricalcola a ogni valore che arriva). Se vuoi solo `7`, togli **lo avvia** da **a** e **b**.

### 2. Due schemi che si parlano

Nello schema **sensori**:

```
[Intervallo (setInterval): 5 s] impulso ──▶ leggi [Now (data e ora)] parti ──▶ oggetto [Get proprietà (obj.campo): second] valore ──▶ valore [Return (uscita di schema): secondi]
```

Nello schema **display**:

```
[Parametro (ingresso di schema): secondi] valore ──▶ valore [Print (console.log)]
```

1. Crea i due schemi e i blocchi; nelle Impostazioni delle porte scrivi `secondi` come **Nome della porta** e **numero** come **Tipo**.
2. Apri la **Mappa**: il riquadro **sensori** ha l'uscita **secondi**, il riquadro **display** l'ingresso **secondi**. Trascina dall'una all'altro.
3. **Prova**: ogni 5 secondi la console scrive i secondi dell'ora attuale.

### 3. Rimettere in ordine un foglio

1. **Ctrl+A** per selezionare tutto, poi trascina un blocco qualsiasi: si sposta tutto insieme.
2. Seleziona un gruppo di blocchi con un rettangolo e premi **Ctrl+D** per copiarli; trascina le copie dove servono.
3. **Adatta** per rivedere l'intero schema.

## Vedi anche

- [Collegamenti e tipi delle porte](ide/links)
- [Come funziona un blocco](ide/blocks)
- [Blocchi di base](logicstudio-core)
- [Scorciatoie da tastiera](ide/shortcuts)
