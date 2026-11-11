# Sort

`coll.sort` · Liste · [Liste e matrici](logicstudio-collections) · versione 1

Mette in ordine gli elementi di una lista: numeri dal più piccolo al più grande, testi in ordine alfabetico, oggetti secondo un loro campo.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **lista** (`list`) | lista | La lista da ordinare. Non viene cambiata: il blocco ne fa una copia. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | lista | Gli stessi elementi, in ordine. |
| **Eccezione** (`error`) | oggetto | Lista non valida, o un elemento non numerico quando confronti come numeri. |

## Impostazioni

| Impostazione | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Ordine** (`order`) | crescente (`asc`), decrescente (`desc`) | crescente | Crescente: dal più piccolo (o da A). Decrescente: dal più grande (o da Z). |
| **Confronta come** (`kind`) | `auto`, numero (`number`), testo (`text`) | `auto` | Come confrontare gli elementi (vedi sotto). Nell'elenco la prima scelta si vede come «auto». |
| **Campo (facoltativo, es. a.b)** (`field`) | un testo | vuoto | Se la lista ha oggetti, il campo secondo cui ordinarli. Vuoto: si confrontano gli elementi interi. |

## Come funziona

A ogni lista che arriva il blocco manda la copia ordinata.

**Che cosa si confronta.** Con **Campo** vuoto, gli elementi stessi. Con un campo, per ogni elemento il valore di quel campo: `prezzo` prende `elemento.prezzo`, `a.b` prende il campo `b` dentro il campo `a`, un numero prende un elemento di una lista (`0` è il primo: con `[[3,"x"],[1,"y"]]` e campo `0` si ordina per il primo valore di ogni riga). Se un elemento non ha quel campo, il suo valore è «niente».

**Confronta come:**

| Scelta | Cosa fa |
|---|---|
| numero | Ogni valore deve essere un numero, o un testo che contiene un numero (`"10"`, `"2,5"`, `" 3 "`). Se uno non lo è (`"abc"`, `true`, `null`, un oggetto, un campo che manca) esce «Serve un numero in ogni elemento» e nessun risultato. |
| testo | Ogni valore diventa testo (oggetti e liste come JSON, `null` e campi mancanti come testo vuoto) e si ordina alfabeticamente, come in un dizionario: maiuscole e minuscole vicine, le lettere accentate accanto a quelle senza accento (`a`, `à`, `b`, `C`). Le cifre sono lettere come le altre: `"10"` viene prima di `"9"`. |
| auto | Se **tutti** i valori sono numeri o testi con un numero, ordina come numeri; altrimenti come testo. Basta un elemento non numerico per far ordinare tutta la lista come testo. |

Altri casi:

- Una lista vuota dà `[]`, con qualsiasi scelta.
- I valori `true` e `false` non sono numeri: in `auto` la lista va ordinata come testo (`false` prima di `true`).
- Come testo, un elemento `null` o un campo mancante vale testo vuoto e va **per primo** (in ordine crescente).
- Gli elementi uguali restano nell'ordine in cui erano con **Ordine** crescente; con decrescente finiscono **in ordine inverso** rispetto a quello di partenza (il blocco ordina in crescente e poi capovolge).
- Il blocco non modifica la lista: se va anche ad altri blocchi, loro la vedono com'era.

## Esempi

### 1. Numeri

```
[Costante · Variabile (JSON): [10,9,100,1]] valore ──▶ lista [Sort] risultato ──▶ valore [Print (console.log)]
```

Scrive `[1,9,10,100]`. Con **Ordine** decrescente: `[100,10,9,1]`. Con **Confronta come** testo: `[1,10,100,9]`.

### 2. Testi che sembrano numeri

La lista `["10","9","100","1"]` con `auto` dà `["1","9","10","100"]` (sono tutti numeri scritti come testo); la lista `[3,"a",1]` con `auto` dà `[1,3,"a"]` (c'è un testo, quindi tutto come testo); la stessa con **numero** dà l'errore «Serve un numero in ogni elemento».

### 3. Prodotti per prezzo

```
[Costante · Variabile (JSON): [{"nome":"Zaino","prezzo":35},{"nome":"Penna","prezzo":2.5},{"nome":"Quaderno","prezzo":4}]] valore ──▶ lista [Sort] risultato ──▶ righe [Tabella]
```

Con **Campo** `prezzo` e **Ordine** crescente la [Tabella](ui.table) mostra Penna, Quaderno, Zaino. Con **Campo** `nome` e decrescente: Zaino, Quaderno, Penna.

### 4. La classifica

```
[Accumula (push con limite)] lista ──▶ lista [Sort: punti, decrescente] risultato ──▶ lista [Slice: a = 3] risultato ──▶ righe [Tabella]
```

Ogni risultato `{"nome": …, "punti": …}` raccolto da [Accumula (push con limite)](coll.accumulate) entra in classifica e la tabella mostra i primi tre.

## Errori

| Messaggio | Quando |
|---|---|
| Serve una lista | Il valore su **lista** non è una lista. |
| Serve un numero in ogni elemento | **Confronta come** è numero e un valore non è un numero. |

## Vedi anche

- [Reverse](coll.reverse), [Distinct](coll.unique), [Filter](coll.filter)
- [Sum · Min · Max · Avg](coll.stat) per avere solo il più piccolo o il più grande
- [Come funziona un blocco](ide/blocks)
