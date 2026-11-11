# Riga m[r]

`coll.matRow` · Matrici · [Liste e matrici](logicstudio-collections) · versione 1

Prende una riga intera di una matrice, come lista.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **matrice** (`matrix`) | matrice | La matrice. |
| **riga** (`row`) | numero | La riga da prendere: 0 è la prima, -1 l'ultima. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **riga** (`row`) | lista | Una copia della riga: tanti valori quante sono le colonne. |
| **Exception** (`error`) | oggetto | Matrice non valida, riga non intera o fuori dalla matrice. |

## Come funziona

Il blocco aspetta di avere **matrice** e **riga**; poi, a ogni valore nuovo, manda la riga scelta.

- Le righe si contano da 0; i negativi contano dalla fine (-1 è l'ultima).
- Fuori dalla matrice esce «Indice fuori dalla lista».
- La riga deve essere un intero: `1.5` dà «Indice: serve un numero intero». `"1"` vale 1; `""` e `null` valgono 0.
- L'uscita è una lista normale: puoi usarla con tutti i blocchi delle liste (per esempio [Sum · Min · Max · Avg](coll.stat) per il totale della riga).

## Esempi

### 1. La seconda riga

```
[Costante · Variabile (JSON): [[1,2,3],[4,5,6]]] valore ──▶ matrice [Riga m[r]] riga ──▶ valore [Print (console.log)]
[Costante · Variabile: 1]                        valore ──▶ riga
```

Scrive `[4,5,6]`. Con riga `-2` scrive `[1,2,3]`; con riga `2` esce «Indice fuori dalla lista».

### 2. Il totale di una riga

```
[Riga m[r]] riga ──▶ lista [Sum · Min · Max · Avg: somma] risultato ──▶ valore [Valore mostrato]
```

Sulla matrice di prima, con riga 0, mostra `6`.

## Errori

| Messaggio | Quando |
|---|---|
| Serve una matrice | Il valore su **matrice** non è una matrice. |
| Le righe della matrice devono avere tutte la stessa lunghezza | Le righe hanno lunghezze diverse, o la prima è vuota. |
| Indice: serve un numero intero | La riga ha la virgola o non è un numero. |
| Indice fuori dalla lista | La riga è fuori dalla matrice. |

## Vedi anche

- [Colonna m[][c]](coll.matCol), [Leggi m[r][c]](coll.matGet), [Flatten](coll.matFlatten)
- [Leggi lista[i]](coll.get): su una matrice dà anche lui la riga, ma senza controllare che la matrice sia valida
- [Come funziona un blocco](ide/blocks)
