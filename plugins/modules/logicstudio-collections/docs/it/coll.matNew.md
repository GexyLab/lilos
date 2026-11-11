# Crea matrice

`coll.matNew` · Matrici · [Liste e matrici](logicstudio-collections) · versione 1

Crea una matrice di righe e colonne, con tutte le celle uguali.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **righe** (`rows`) | numero | Quante righe: un intero da 1 in su. |
| **colonne** (`cols`) | numero | Quante colonne: un intero da 1 in su. |
| **riempimento** (`fill`) | qualsiasi | Il valore di ogni cella. Facoltativo: se non arriva niente vale l'impostazione **Valore di riempimento**. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **matrice** (`matrix`) | matrice | La matrice nuova: una lista di **righe** liste, ognuna di **colonne** valori. |
| **Eccezione** (`error`) | oggetto | Righe o colonne non valide, matrice troppo grande. |

## Impostazioni

| Impostazione | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Valore di riempimento** (`fill`) | un numero | 0 | Il valore delle celle quando sull'ingresso **riempimento** non è arrivato niente. Una casella vuota vale 0. |

## Come funziona

Il blocco aspetta di avere **righe** e **colonne**; poi, a ogni valore nuovo su uno dei tre ingressi, manda una matrice nuova.

- **righe** e **colonne** devono essere interi: `2.5` dà «Righe: serve un numero intero» (o «Colonne: …»). `"3"` vale 3, `true` vale 1, `""` e `null` valgono 0 (e quindi danno l'errore sotto).
- Devono essere almeno 1: 0 o un negativo danno «Righe e colonne devono essere interi maggiori di zero».
- Le celle sono al massimo 100000 (righe × colonne): 1000 × 101 dà «Matrice troppo grande (massimo 100000 celle)»; 1000 × 100 va bene.
- Il **riempimento** che arriva sull'ingresso può essere qualsiasi valore: un testo, `null`, perfino una lista (allora ogni cella contiene quella lista). L'impostazione invece è sempre un numero.
- Una matrice con celle non numeriche va bene per leggere e scrivere celle, ma non per i calcoli (Somma matrici, Moltiplica matrici, Scala, Determinante), che vogliono solo numeri.

## Esempi

### 1. Una matrice di zeri

```
[Valore: 2] valore ──▶ righe   [Crea matrice] matrice ──▶ valore [Scrivi in console]
[Valore: 3] valore ──▶ colonne
```

Scrive `[[0,0,0],[0,0,0]]`.

### 2. Una griglia di gioco vuota

Con **righe** 3, **colonne** 3 e sull'ingresso **riempimento** il testo `-` (dato come valore iniziale) il risultato è `[["-","-","-"],["-","-","-"],["-","-","-"]]`. Le mosse si scrivono con [Imposta cella](coll.matSet).

### 3. Riempimento con l'impostazione

Con **Valore di riempimento** 7 e 2 × 2: `[[7,7],[7,7]]`. Se poi arriva `null` sull'ingresso **riempimento**, la matrice successiva è `[[null,null],[null,null]]`: l'ingresso vale più dell'impostazione, anche quando porta `null`.

## Errori

| Messaggio | Quando |
|---|---|
| Righe: serve un numero intero | **righe** ha la virgola o non è un numero. |
| Colonne: serve un numero intero | **colonne** ha la virgola o non è un numero. |
| Righe e colonne devono essere interi maggiori di zero | **righe** o **colonne** è 0 o negativo. |
| Matrice troppo grande (massimo 100000 celle) | righe × colonne supera 100000. |

## Vedi anche

- [Identità](coll.matIdentity), [Matrice da lista](coll.matFromList), [Imposta cella](coll.matSet), [Dimensioni](coll.matSize)
- [Liste e matrici](logicstudio-collections) per il formato delle matrici
- [Come funziona un blocco](ide/blocks)
