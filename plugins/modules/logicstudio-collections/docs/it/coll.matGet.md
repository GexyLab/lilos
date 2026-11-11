# Leggi cella

`coll.matGet` · Matrici · [Liste e matrici](logicstudio-collections) · versione 1

Prende il valore di una cella della matrice, data la riga e la colonna.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **matrice** (`matrix`) | matrice | La matrice. |
| **riga** (`row`) | numero | La riga: 0 è la prima, -1 l'ultima. |
| **colonna** (`col`) | numero | La colonna: 0 è la prima, -1 l'ultima. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | qualsiasi | Il contenuto della cella. |
| **Eccezione** (`error`) | oggetto | Matrice non valida, riga o colonna non intere o fuori dalla matrice. |

## Come funziona

Il blocco aspetta di avere **matrice**, **riga** e **colonna**; poi, a ogni valore nuovo, manda il contenuto della cella.

- Righe e colonne si contano **da 0**, come gli indici delle liste. In una matrice 2 × 3 le righe vanno da 0 a 1 e le colonne da 0 a 2.
- I numeri negativi contano dalla fine: riga -1 è l'ultima, colonna -3 (in una matrice di 3 colonne) è la prima.
- Fuori dalla matrice esce «Indice fuori dalla lista» (il messaggio parla di «lista» anche qui).
- Riga e colonna devono essere interi: `0.5` dà «Indice: serve un numero intero». `"1"` vale 1; `""` e `null` valgono 0.
- La matrice deve essere valida (righe tutte della stessa lunghezza): vedi [Dimensioni](coll.matSize).
- Se la cella contiene `null`, esce `null`.

## Esempi

### 1. Una cella

```
[Valore (JSON): [[1,2,3],[4,5,6]]] valore ──▶ matrice [Leggi cella] valore ──▶ valore [Scrivi in console]
[Valore: 1]                        valore ──▶ riga
[Valore: 2]                        valore ──▶ colonna
```

Scrive `6` (seconda riga, terza colonna).

### 2. Dalla fine

Sulla stessa matrice, riga `-1` e colonna `-3` danno `4` (ultima riga, prima colonna). Riga `2` dà «Indice fuori dalla lista».

### 3. Una tabellina

```
[Campo numerico: riga]    valore ──▶ riga    [Leggi cella] valore ──▶ valore [Valore mostrato]
[Campo numerico: colonna] valore ──▶ colonna
[Valore (JSON): [[1,2,3],[2,4,6],[3,6,9]]] valore ──▶ matrice
```

Scrivendo 2 nel campo **riga** e 1 nel campo **colonna** il [Valore mostrato](ui.value) indica `6`. Per contare da 1 nei campi, togli 1 con [Sottrai](core.subtract) prima di **riga** e **colonna**.

## Errori

| Messaggio | Quando |
|---|---|
| Serve una matrice | Il valore su **matrice** non è una matrice. |
| Le righe della matrice devono avere tutte la stessa lunghezza | Le righe hanno lunghezze diverse, o la prima è vuota. |
| Indice: serve un numero intero | Riga o colonna hanno la virgola o non sono numeri. |
| Indice fuori dalla lista | Riga o colonna fuori dalla matrice. |

## Vedi anche

- [Imposta cella](coll.matSet), [Leggi riga](coll.matRow), [Leggi colonna](coll.matCol)
- [Elemento](coll.get) per una lista
- [Come funziona un blocco](ide/blocks)
