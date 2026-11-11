# Push · Unshift

`coll.add` · Liste · [Liste e matrici](logicstudio-collections) · versione 1

Aggiunge un valore in fondo (o all'inizio) di una lista e manda la lista nuova.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **lista** (`list`) | lista | La lista di partenza. Non viene cambiata: il blocco ne fa una copia. |
| **valore** (`value`) | qualsiasi | Il valore da aggiungere. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | lista | La lista con un elemento in più. |
| **Eccezione** (`error`) | oggetto | Lista non valida o lista troppo lunga. |

## Impostazioni

| Impostazione | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Dove** (`where`) | `end`, `start` | `end` | `end`: il valore va in fondo, dopo l'ultimo elemento. `start`: il valore va all'inizio, prima del primo. Nell'elenco delle Proprietà le due scelte si vedono con questi nomi interni. |

## Come funziona

Il blocco aspetta di avere **lista** e **valore**. Poi, a ogni valore nuovo su uno dei due, manda una lista nuova: quella arrivata più il valore.

- Il valore viene aggiunto **come un elemento solo**: aggiungere `[3, 4]` a `[1, 2]` dà `[1, 2, [3, 4]]`, non `[1, 2, 3, 4]`. Per unire due liste usa [Concat liste](coll.concat).
- Anche `null` è un valore: aggiunto a `[]` dà `[null]`.
- La lista in ingresso resta com'era. **Il blocco non ricorda niente**: se gli mandi 1, poi 2, poi 3 con la stessa lista `[]`, ottieni `[1]`, poi `[2]`, poi `[3]`. Per raccogliere valori uno dopo l'altro usa [Accumula (push con limite)](coll.accumulate), oppure rimanda il risultato in un blocco [Memoria (set · get)](core.store).
- Il risultato può avere al massimo 100000 elementi: se la lista ne ha già 100000, esce «Lista troppo grande (massimo 100000 elementi)».

## Esempi

### 1. In fondo

```
[Costante · Variabile (JSON): ["mele","pere"]] valore ──▶ lista  [Push · Unshift] risultato ──▶ valore [Print (console.log)]
[Costante · Variabile (testo): uva]            valore ──▶ valore
```

Scrive `["mele","pere","uva"]`. Con **Dove** = `start` scriverebbe `["uva","mele","pere"]`.

### 2. Una lista della spesa che cresce

```
[Memoria (set · get): Invia quando cambia] valore ──▶ lista  [Push · Unshift] risultato ──▶ imposta [Memoria (set · get)]
                                                                    risultato ──▶ righe [Tabella]
[Campo di testo] testo ──▶ valore
```

Dai all'ingresso **imposta** del blocco Memoria (set · get) il valore iniziale `[]` e togli «lo avvia» dall'ingresso **lista** del blocco Push · Unshift. Ogni volta che l'utente scrive nel campo, la voce va in fondo alla lista e la [Tabella](ui.table) si aggiorna. Senza togliere «lo avvia», la lista che torna dal blocco Memoria farebbe girare di nuovo il blocco con lo stesso testo, e la voce si ripeterebbe all'infinito (finché il programma si ferma per «Troppe esecuzioni»).

> Il [Campo di testo](ui.text) manda il testo quando l'utente preme Invio o esce dal campo, e solo se è cambiato: per aggiungere due volte la stessa voce bisogna cambiarla e rimetterla.

## Errori

| Messaggio | Quando |
|---|---|
| Serve una lista | Il valore su **lista** non è una lista. |
| Lista troppo grande (massimo 100000 elementi) | Il risultato avrebbe più di 100000 elementi. |

## Vedi anche

- [Inserisci (splice)](coll.insert), [Concat liste](coll.concat), [Accumula (push con limite)](coll.accumulate)
- [Lista [ ]](core.list) per fare una lista da valori separati
- [Come funziona un blocco](ide/blocks)
