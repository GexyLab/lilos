# Includes · IndexOf

`coll.contains` · Liste · [Liste e matrici](logicstudio-collections) · versione 1

Dice se un valore è nella lista e in quale posizione si trova la prima volta.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **lista** (`list`) | lista | La lista in cui cercare. |
| **valore** (`value`) | qualsiasi | Il valore da cercare. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **trovato** (`found`) | sì/no | `true` se il valore è nella lista, altrimenti `false`. |
| **posizione (-1 se manca)** (`index`) | numero | La posizione (da 0) del primo elemento uguale; -1 se non c'è. |
| **Exception** (`error`) | oggetto | Quando il valore su **lista** non è una lista. |

## Come funziona

Il blocco aspetta di avere **lista** e **valore**; poi, a ogni valore nuovo, manda sempre tutte e due le uscite.

Quando un elemento è «uguale» al valore cercato:

- **Numeri, testi, sì/no, `null`: devono essere identici**, tipo compreso. `2` e `"2"` sono diversi; `"Ciao"` e `"ciao"` sono diversi; `true` e `"true"` sono diversi. Non ci sono conversioni.
- **Liste e oggetti**: sono uguali se hanno lo stesso contenuto. `[1, 2]` trova l'elemento `[1, 2]`. Per gli oggetti conta anche l'**ordine dei campi**: `{"a":1,"b":2}` e `{"b":2,"a":1}` risultano diversi.
- Se il valore compare più volte, **posizione** è quella della prima volta: cercando `"a"` in `["a","b","a"]` esce 0.
- Su una lista vuota escono `false` e -1.
- Il blocco cerca solo tra gli elementi della lista, non dentro di loro: cercando `2` in `[[1, 2], 3]` non trova niente. Per cercare un pezzo di testo usa [Filter](coll.filter) con «contiene».

## Esempi

### 1. Un nome nell'elenco degli invitati

```
[Costante · Variabile (JSON): ["Anna","Bruno","Carla"]] valore ──▶ lista  [Includes · IndexOf] trovato   ──▶ accesa [Spia]
[Campo di testo: nome]                    testo  ──▶ valore                       posizione ──▶ valore [Valore mostrato]
```

Scrivendo `Bruno` la [Spia](ui.lamp) si accende e il [Valore mostrato](ui.value) indica 1. Scrivendo `bruno` (minuscolo) la spia si spegne e si vede -1.

### 2. Numeri e testi

Sulla lista `[1, 2, 3]`:

- valore `2` (numero) → **trovato** `true`, **posizione** 1;
- valore `"2"` (testo) → `false`, -1;
- valore `5` → `false`, -1.

Se il valore arriva da un campo di testo e la lista ha numeri, convertilo prima con [Cast in numero (Number())](core.toNumber).

### 3. Un oggetto

Sulla lista `[{"id":7,"nome":"Penna"}]` il valore `{"id":7,"nome":"Penna"}` è trovato in posizione 0; il valore `{"nome":"Penna","id":7}` no (campi in un altro ordine). Per cercare per un campo, è più sicuro usare [Filter](coll.filter) con il **Campo** `id`.

## Errori

| Messaggio | Quando |
|---|---|
| Serve una lista | Il valore su **lista** non è una lista. |

## Vedi anche

- [Filter](coll.filter), [Distinct](coll.unique), [Leggi lista[i]](coll.get), [Rimuovi (splice)](coll.removeAt)
- [Confronto (== ≠ < >)](core.compare)
- [Come funziona un blocco](ide/blocks)
