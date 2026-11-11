# Elemento

`coll.get` · Liste · [Liste e matrici](logicstudio-collections) · versione 1

Prende l'elemento che sta in una posizione della lista.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **lista** (`list`) | lista | La lista da cui prendere l'elemento. |
| **indice** (`index`) | numero | La posizione: 0 è il primo, 1 il secondo… Un numero negativo conta dalla fine: -1 è l'ultimo. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **elemento** (`item`) | qualsiasi | L'elemento in quella posizione, così com'è (numero, testo, oggetto, lista, `null`…). |
| **Eccezione** (`error`) | oggetto | Quando la lista non è una lista, l'indice non è un intero o è fuori dalla lista. |

## Come funziona

Il blocco aspetta di avere sia **lista** sia **indice**: finché ne manca uno non fa niente (e non segnala errori). Poi, a ogni valore nuovo su uno dei due, manda l'elemento con l'ultima lista e l'ultimo indice.

**Gli indici partono da 0.** Con una lista di lunghezza N:

| Indice | Elemento |
|---|---|
| 0 … N-1 | dal primo all'ultimo |
| -1 … -N | dall'ultimo al primo (-1 è l'ultimo, -N il primo) |
| N o più, -N-1 o meno | errore «Indice fuori dalla lista» |

Come viene letto l'indice:

- Un numero intero va bene così: `2`.
- Un testo che contiene un numero va bene: `"2"`; anche con la virgola decimale, `"1,0"` vale 1.
- `true` vale 1, `false` vale 0.
- Un testo vuoto `""` e `null` valgono **0** (il primo elemento), non sono un errore.
- Un numero con la virgola (`1.5`) o un testo che non è un numero (`"due"`) danno «Indice: serve un numero intero».

Altri casi:

- Su una lista vuota ogni indice dà «Indice fuori dalla lista».
- Se l'elemento è `null`, su **elemento** esce `null`.
- Se cambia la lista e l'ultimo indice è troppo grande per la lista nuova, esce l'errore: l'indice non si adatta da solo.

## Esempi

### 1. Il secondo elemento

```
[Valore (JSON): [10,20,30]] valore ──▶ lista  [Elemento] elemento ──▶ valore [Scrivi in console]
[Valore: 1]                 valore ──▶ indice
```

Scrive `20` (l'indice 1 è il secondo elemento). Se nel Valore metti `3` invece di `1`, nella console principale compare «Elemento: Indice fuori dalla lista».

### 2. L'ultimo elemento, qualunque sia la lunghezza

Dai all'ingresso **indice** il valore iniziale `-1` (nelle Proprietà del blocco):

```
[Accumula] lista ──▶ lista [Elemento (indice iniziale -1)] elemento ──▶ valore [Valore mostrato: ultima lettura]
```

Ogni volta che [Accumula](coll.accumulate) manda la lista aggiornata, il blocco manda l'ultimo valore aggiunto.

### 3. Una voce scelta da un elenco

```
[Valore (JSON): ["Lunedì","Martedì","Mercoledì"]] valore ──▶ lista  [Elemento] elemento ──▶ valore [Valore mostrato]
[Campo numerico: giorno]                          valore ──▶ indice
```

Con 0 nel [Campo numerico](ui.number) si vede «Lunedì», con 2 «Mercoledì», con -1 di nuovo «Mercoledì», con 3 non cambia niente e l'errore va nella console principale (o sull'**Eccezione**, se è collegata).

## Errori

| Messaggio | Quando |
|---|---|
| Serve una lista | Il valore su **lista** non è una lista. |
| Indice: serve un numero intero | L'indice ha la virgola (`1.5`) o non è un numero. |
| Indice fuori dalla lista | L'indice è ≥ della lunghezza, o < di -lunghezza, o la lista è vuota. |

## Vedi anche

- [Imposta elemento](coll.set), [Rimuovi in posizione](coll.removeAt), [Porzione](coll.slice)
- [Contiene · Posizione](coll.contains) per trovare l'indice di un valore
- [Prendi campo](core.get) per un campo di un oggetto
- [Leggi cella](coll.matGet) per una matrice
- [Come funziona un blocco](ide/blocks)
