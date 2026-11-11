# Length

`coll.length` · Liste · [Liste e matrici](logicstudio-collections) · versione 1

Conta gli elementi di una lista e manda il numero.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **lista** (`list`) | lista | La lista da contare. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **lunghezza** (`length`) | numero | Quanti elementi ha la lista: 0 se è vuota. |
| **Exception** (`error`) | oggetto | Quando il valore arrivato non è una lista. |

## Come funziona

Ogni volta che arriva una lista su **lista**, il blocco manda su **lunghezza** quanti elementi ha.

- Conta solo il primo livello: `[[1, 2], [3, 4, 5]]` ha lunghezza 2 (due elementi, che sono a loro volta liste).
- Una lista vuota `[]` dà 0.
- Gli elementi `null` contano: `[null, null]` ha lunghezza 2.
- Un testo non è una lista: `"ciao"` non dà 4, ma l'errore «Serve una lista». Per la lunghezza di un testo usa [Funzioni stringa](core.text).
- Anche un oggetto (`{"a": 1}`) o `null` danno «Serve una lista».
- Una [matrice](logicstudio-collections) è una lista di righe: collegata qui dà il numero di **righe**. L'IDE segnala il collegamento matrice → lista, ma funziona. Per righe e colonne insieme usa [Shape](coll.matSize).

## Esempi

### 1. Quanti nomi ci sono

```
[Costante · Variabile (JSON): ["Anna","Bruno","Carla"]] valore ──▶ lista [Length] lunghezza ──▶ valore [Print (console.log)]
```

Scrive `3`.

### 2. Lista vuota

```
[Costante · Variabile (JSON): []] valore ──▶ lista [Length] lunghezza ──▶ valore [Print (console.log)]
```

Scrive `0`. Nessun errore.

### 3. Righe lette da un testo

```
[Campo di testo] testo ──▶ testo [Split: separatore \n] risultato ──▶ lista [Length] lunghezza ──▶ valore [Valore mostrato]
```

Con il testo `uno` a capo `due` a capo `tre` il [Valore mostrato](ui.value) indica `3`. Attenzione: un campo vuoto dà 1, non 0, perché [Split](coll.split) di un testo vuoto dà `[""]` (una lista con un testo vuoto).

## Errori

| Messaggio | Quando |
|---|---|
| Serve una lista | Il valore su **lista** non è una lista (testo, numero, oggetto, `null`…). |

## Vedi anche

- [Shape](coll.matSize) per righe e colonne di una matrice
- [Includes · IndexOf](coll.contains), [Leggi lista[i]](coll.get)
- [Come funziona un blocco](ide/blocks)
