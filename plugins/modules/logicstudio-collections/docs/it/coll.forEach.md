# For each

`coll.forEach` · Liste · [Liste e matrici](logicstudio-collections) · versione 1

Manda gli elementi di una lista uno alla volta, con la loro posizione, e alla fine un impulso **fatto**.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **lista** (`list`) | lista | La lista da scorrere. Arrivando, viene solo tenuta: non fa partire il giro. |
| **avvia** (`start`) | impulso | Fa partire il giro sull'ultima lista arrivata. Qualsiasi valore arrivi qui vale come impulso. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **elemento** (`item`) | qualsiasi | Ogni elemento della lista, uno dopo l'altro. |
| **indice** (`index`) | numero | La posizione dell'elemento appena mandato: 0, 1, 2… |
| **fatto** (`done`) | impulso | Un impulso quando tutti gli elementi sono stati mandati. |
| **Eccezione** (`error`) | oggetto | Manca la lista, o non è una lista. |

## Come funziona

Il blocco **parte solo con un impulso su avvia**. Un valore su **lista** viene ricordato, ma non fa niente da solo (anche se nelle Proprietà l'ingresso «lo avvia»).

Quando arriva l'impulso:

1. se non è ancora arrivata nessuna lista, esce «Manca la lista»; se il valore non è una lista, «Serve una lista»;
2. per ogni elemento, nell'ordine, il blocco manda prima l'**elemento** e subito dopo il suo **indice**;
3. dopo l'ultimo manda **fatto**.

Tutto questo succede **in un colpo solo**: il blocco non aspetta che i blocchi collegati abbiano finito con un elemento prima di mandare il successivo. Ogni blocco collegato riceve i valori in coda e li tratta uno alla volta, nell'ordine giusto.

- Con una lista vuota non esce niente su **elemento** e **indice**, ma esce subito **fatto**.
- Gli elementi `null` vengono mandati come tutti gli altri.
- Un secondo impulso fa un altro giro completo, sull'ultima lista arrivata.
- Il giro usa la lista com'era al momento dell'impulso.

### Elemento e indice nello stesso blocco

Se colleghi **elemento** e **indice** a due ingressi dello stesso blocco, attento all'ordine: **elemento arriva prima di indice**. Se tutti e due gli ingressi «lo avviano», il blocco gira due volte per elemento, e la prima volta con l'indice **dell'elemento precedente**.

Togli «lo avvia» dall'ingresso che riceve **elemento** e lascialo su quello che riceve **indice**: il blocco gira una volta per elemento, con la coppia giusta. Esempio verificato con la lista `[10, 20, 30]`, **elemento** su **a** e **indice** su **b** di un blocco [Somma (+)](core.add):

| «lo avvia» | Risultati |
|---|---|
| su **a** e **b** | 10, 10, 20, 21, 31, 32 |
| solo su **b** | 10, 21, 32 |

**Non mettere blocchi in mezzo su una sola delle due strade.** Gli elementi partono tutti insieme: se l'**indice** passa prima da un altro blocco (per esempio un blocco Somma (+) per contare da 1) e l'**elemento** no, quando arriva il primo indice il blocco di destinazione ha già ricevuto **tutti** gli elementi e usa l'ultimo. Con `["Anna","Bruno","Carla"]` otterresti `1. Carla`, `2. Carla`, `3. Carla`. Se devi trasformare l'indice o l'elemento, fallo dopo il blocco che li riunisce, sul suo risultato.

### Quando arriva «fatto»

**fatto** parte dopo che tutti gli elementi sono stati **mandati**, non dopo che i blocchi collegati li hanno **trattati**. Un blocco che riceve gli elementi e anche **fatto** (sullo stesso ingresso o su un altro) li riceve in ordine, con **fatto** per ultimo. Ma se **fatto** va a un blocco diverso, quel blocco può lavorare prima che gli altri abbiano finito: per esempio, un blocco [Print (console.log)](core.consoleWrite) collegato a **fatto** può scrivere prima di un'altra che scrive gli elementi.

Se ti serve un risultato su tutta la lista (somma, filtro, valori estratti…), è più semplice e sicuro usare i blocchi che lavorano sulla lista intera: [Sum · Min · Max · Avg](coll.stat), [Filter](coll.filter), [Map campo](coll.pluck).

### Lista e impulso all'avvio

Se **lista** e **avvia** arrivano tutti e due quando parte il programma (per esempio da un blocco [Costante · Variabile](core.value) e da un blocco [All'avvio (main)](core.onStart)), **l'ordine non è garantito**: dipende dall'ordine in cui i blocchi sono stati messi nello schema. Se arriva prima l'impulso, esce «Manca la lista». Per essere sicuro:

- collega lo **stesso** blocco Costante · Variabile sia a **lista** sia ad **avvia**, facendo prima il collegamento verso **lista**: il blocco manda la lista ai due ingressi nell'ordine in cui hai fatto i collegamenti;
- oppure fai partire il giro da un'azione successiva (un [Pulsante](ui.button)), o passa l'impulso da un blocco [Ritardo (setTimeout)](core.delay).

### Limiti

Ogni elemento fa lavorare i blocchi collegati: con liste lunghe si raggiunge in fretta il limite di esecuzioni del programma (di serie 10000 ogni 10 secondi, vedi [Limiti](logicstudio-engine/limits)). Per esempio, 6000 elementi mandati a due blocchi fanno almeno 12000 esecuzioni e il programma si ferma con «Troppe esecuzioni: più di 10000 in 10 secondi (un ciclo di collegamenti?)». Per liste lunghe usa i blocchi che lavorano sulla lista intera.

## Esempi

### 1. Scrivere ogni elemento

```
[Costante · Variabile (JSON): ["Anna","Bruno","Carla"]] valore ──▶ lista [For each] elemento ──▶ valore [Print (console.log)]
                                          valore ──▶ avvia
```

Fai prima il collegamento verso **lista**, poi quello verso **avvia**. La console scrive `Anna`, `Bruno`, `Carla`, una per riga.

### 2. Numerare le righe

```
[For each] elemento ──▶ nome [Template (formatta): {i}: {nome}] testo ──▶ valore [Print (console.log)]
                    indice   ──▶ i
```

In [Template (formatta)](core.format) aggiungi i segnaposto **nome** e **i**, e togli «lo avvia» da **nome**. Con `["Anna","Bruno","Carla"]` la console scrive `0: Anna`, `1: Bruno`, `2: Carla`. Gli indici partono da 0. Non provare a contare da 1 mettendo un blocco [Somma (+)](core.add) solo sulla strada dell'indice: per l'avvertenza in «Elemento e indice nello stesso blocco», usciresti con il nome sbagliato.

### 3. Lista vuota

Con la lista `[]` e un impulso su **avvia**, non esce niente su **elemento** e **indice**; **fatto** esce subito.

### 4. Senza lista

Un impulso su **avvia** prima che sia arrivata una lista dà, nella console principale, «For each: Manca la lista».

## Errori

| Messaggio | Quando |
|---|---|
| Manca la lista | È arrivato l'impulso su **avvia** ma su **lista** non è mai arrivato niente. |
| Serve una lista | Il valore su **lista** non è una lista. |

## Vedi anche

- [Range](coll.range) per ripetere qualcosa N volte
- [Accumula (push con limite)](coll.accumulate) per raccogliere di nuovo i valori in una lista
- [Sum · Min · Max · Avg](coll.stat), [Filter](coll.filter), [Map campo](coll.pluck)
- [Sequenza (then)](core.sequence), [Ritardo (setTimeout)](core.delay)
- [Come funziona un blocco](ide/blocks), [Limiti](logicstudio-engine/limits)
