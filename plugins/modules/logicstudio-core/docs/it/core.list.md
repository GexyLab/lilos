# Lista [ ]

`core.list` · Oggetti · [Blocchi di base](logicstudio-core) · versione 1

Mette insieme più valori in una lista, nell'ordine dei suoi ingressi.

## Ingressi

Il blocco nasce **senza ingressi**: aggiungi un ingresso per ogni elemento della lista (vedi **Porte aggiuntive**).

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **lista** (`list`) | lista | Una lista con un elemento per ogni ingresso, nello stesso ordine. |
| **Eccezione** (`error`) | oggetto | In pratica non succede: il blocco non ha errori suoi. |

## Porte aggiuntive

Nelle **Proprietà**, sezione **Porte**, con **Aggiungi ingresso** aggiungi fino a 32 ingressi (o meno, se un amministratore ha abbassato il limite **Porte aggiunte per blocco**). Sono di tipo qualsiasi e si chiamano con un numero: **1**, **2**, **3**… Il nome non si cambia; conta la **posizione**: il primo ingresso dell'elenco è il primo elemento della lista. Con le frecce ↑ ↓ cambi l'ordine degli elementi. Vedi [Come funziona un blocco](ide/blocks).

> Se togli un ingresso in mezzo e poi ne aggiungi un altro, il nuovo può avere lo stesso numero di uno che c'è già (per esempio due **3**). Non cambia niente nella lista, che segue l'ordine delle porte, ma per non confonderti puoi togliere e rifare gli ingressi.

## Come funziona

Ogni volta che arriva un valore su uno degli ingressi, il blocco manda su **lista** una lista nuova con **l'ultimo valore di ogni ingresso**.

- La lista ha **sempre tanti elementi quanti sono gli ingressi**. Un ingresso che non ha ancora ricevuto niente vale `null`: con tre ingressi e solo il secondo arrivato (`"b"`) esce `[null, "b", null]`.
- I valori restano: dopo l'invio gli ingressi tengono il loro valore.
- Gli elementi possono essere di qualsiasi tipo, anche oggetti e altre liste.
- Il blocco gira **a ogni valore**: se ti serve una lista sola, togli **lo avvia** a tutti gli ingressi tranne quello che arriva per ultimo, oppure usa il blocco [Attendi tutti (join)](core.join).

Questo blocco sta nella categoria **Oggetti**. Per lavorare sulle liste (aggiungere, ordinare, filtrare, contare…) c'è il pacchetto [Liste e matrici](logicstudio-collections).

## Esempi

### 1. Tre valori in ordine

```
[Costante · Variabile: testo "a"] valore ──▶ 1  [Lista [ ]] lista ──▶ valore [Print (console.log)]
[Costante · Variabile: testo "b"] valore ──▶ 2
[Costante · Variabile: JSON {"z":1}] valore ──▶ 3
```

All'avvio i tre valori arrivano uno dopo l'altro e la console scrive:

```
["a",null,null]
["a","b",null]
["a","b",{"z":1}]
```

### 2. Le opzioni di una Selezione

```
[Costante · Variabile: testo "Rosso"] valore ──▶ 1  [Lista [ ]] lista ──▶ opzioni [Selezione: colore]
[Costante · Variabile: testo "Verde"] valore ──▶ 2
[Costante · Variabile: testo "Blu"]   valore ──▶ 3
```

L'ultima lista che arriva, `["Rosso", "Verde", "Blu"]`, diventa l'elenco delle scelte della [Selezione](ui.select) (l'oggetto della componente nello schema).

### 3. Una riga di una tabella

Collega a **1**, **2** e **3** il nome, la quantità e il prezzo di un articolo, togli **lo avvia** da **1** e **2**: quando arriva il prezzo esce una sola lista, per esempio `["Penne", 3, 1.5]`, da aggiungere a una lista più grande con [Push · Unshift](coll.add).

## Vedi anche

- [Oggetto { }](core.compose) per valori con un nome
- [Push · Unshift](coll.add), [Length](coll.length), [Join](coll.join)
- [Attendi tutti (join)](core.join)
- [Come funziona un blocco](ide/blocks)
