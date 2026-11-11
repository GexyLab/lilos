# Rimuovi (splice)

`coll.removeAt` · Liste · [Liste e matrici](logicstudio-collections) · versione 1

Toglie l'elemento in una posizione: manda la lista senza quell'elemento e, a parte, l'elemento tolto.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **lista** (`list`) | lista | La lista di partenza. Non viene cambiata: il blocco ne fa una copia. |
| **indice** (`index`) | numero | La posizione da togliere: 0 è il primo, -1 l'ultimo. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | lista | La lista con un elemento in meno. |
| **rimosso** (`removed`) | qualsiasi | L'elemento tolto. |
| **Eccezione** (`error`) | oggetto | Lista non valida, indice non intero o fuori dalla lista. |

## Come funziona

Il blocco aspetta di avere **lista** e **indice**, poi a ogni valore nuovo manda su **risultato** la lista senza l'elemento e su **rimosso** l'elemento tolto. Gli elementi che seguono si spostano indietro di uno.

- Gli indici validi sono come in [Leggi lista[i]](coll.get): da 0 a lunghezza-1, o da -1 a -lunghezza.
- Su una lista vuota ogni indice dà «Indice fuori dalla lista».
- Togliere l'unico elemento dà la lista vuota `[]`.
- Se l'elemento tolto è `null`, su **rimosso** esce `null`.
- Il blocco toglie **per posizione**. Per togliere tutti gli elementi uguali a un valore usa [Filter](coll.filter) con «a ≠ b».

## Esempi

### 1. Togliere l'ultimo

```
[Costante · Variabile (JSON): [1,2,3]] valore ──▶ lista  [Rimuovi (splice)] risultato ──▶ valore [Print (console.log)]
[Costante · Variabile: -1]             valore ──▶ indice                         rimosso   ──▶ valore [Print (console.log)]
```

Le due console scrivono `[1,2]` e `3`.

### 2. Una coda: il primo che arriva è il primo servito

```
[Memoria (set · get): Invia quando cambia] valore ──▶ lista  [Rimuovi (splice)] risultato ──▶ imposta [Memoria (set · get)]
[Pulsante: Avanti] premuto ──▶ invia [Costante · Variabile: 0] valore ──▶ indice    rimosso ──▶ valore [Print (console.log)]
```

Dai all'ingresso **imposta** del blocco Memoria (set · get) il valore iniziale `["Anna","Bruno","Carla"]`, togli «lo avvia» dall'ingresso **lista** e, nelle Proprietà, mostra con l'occhio l'ingresso **invia** del blocco [Costante · Variabile](core.value) e collegaci il Pulsante: così il blocco manda il valore solo all'impulso, non all'avvio. A ogni clic sul [Pulsante](ui.button) il blocco Costante · Variabile manda 0 su **indice**: la console scrive `Anna`, poi `Bruno`, poi `Carla`, e il blocco Memoria tiene chi resta. Al quarto clic la coda è vuota ed esce «Indice fuori dalla lista».

### 3. Togliere un valore cercandolo

```
[Costante · Variabile (JSON): ["a","b","c"]] valore ──▶ lista  [Includes · IndexOf] posizione ──▶ indice [Rimuovi (splice)] risultato ──▶ valore [Print (console.log)]
[Costante · Variabile (testo): b]            valore ──▶ valore
[Costante · Variabile (JSON): ["a","b","c"]] valore ──▶ lista [Rimuovi (splice)]
```

(Lo stesso blocco Costante · Variabile collegato a due blocchi.) [Includes · IndexOf](coll.contains) trova `b` in posizione 1 e la console scrive `["a","c"]`. Attenzione: se cerchi un valore che non c'è (`z`), la posizione è -1 e il blocco toglie **l'ultimo** elemento (`["a","b"]`). Controlla prima **trovato**, per esempio con [If · Else](core.if), oppure usa [Filter](coll.filter) con «a ≠ b», che toglie tutti gli elementi uguali e non sbaglia se il valore manca.

## Errori

| Messaggio | Quando |
|---|---|
| Serve una lista | Il valore su **lista** non è una lista. |
| Indice: serve un numero intero | L'indice ha la virgola o non è un numero. |
| Indice fuori dalla lista | L'indice non corrisponde a un elemento che c'è. |

## Vedi anche

- [Inserisci (splice)](coll.insert), [Scrivi lista[i]](coll.set), [Filter](coll.filter), [Slice](coll.slice)
- [Come funziona un blocco](ide/blocks)
