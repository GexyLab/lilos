# Moltiplicazione (×)

`core.multiply` · Matematica · [Blocchi di base](logicstudio-core) · versione 1

Moltiplica due o più numeri e manda il prodotto.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **a** | numero | Il primo fattore. |
| **b** | numero | Il secondo fattore. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | numero | Il prodotto degli ingressi che hanno un valore. |
| **Eccezione** (`error`) | oggetto | Quando un ingresso non è un numero. |

## Porte aggiuntive

Nelle **Proprietà**, sezione **Porte**, puoi aggiungere fino a 16 ingressi in più (meno, se un amministratore ha abbassato il limite delle porte aggiunte), di tipo numero, chiamati con le lettere che seguono: **c**, **d**, **e**… fino a **r**. Si vedono in corsivo sul blocco. Vedi [Come funziona un blocco](ide/blocks).

## Come funziona

Ogni volta che arriva un valore su un ingresso, il blocco moltiplica l'ultimo valore di ogni ingresso e manda il prodotto su **risultato**.

- Gli ingressi che non hanno ancora ricevuto niente non contano: con solo **a** = 4 il risultato è 4 (non 0).
- I valori vengono convertiti in numero con le stesse regole del blocco [Somma (+)](core.add): `"2,5"` vale 2,5; `true` vale 1 e `false` 0; un testo vuoto e `null` valgono **0** (quindi azzerano il prodotto).
- Se un valore non si può convertire (per esempio `"ciao"` o un oggetto), il blocco non manda niente su **risultato** e manda su **Eccezione** «Serve un numero».
- I numeri decimali del computer possono dare piccoli scarti: 1,1 × 3 = 3,3000000000000003. Arrotonda con il blocco [Funzioni Math](core.math) prima di mostrarli.

## Esempi

### 1. Prezzo per quantità

```
[Campo numerico: prezzo]   valore ──▶ a  [Moltiplicazione (×)] risultato ──▶ valore [Valore: totale]
[Campo numerico: quantità] valore ──▶ b
```

Prezzo 4,50 e quantità 3: totale 13,5. Finché l'utente non scrive la quantità, il totale mostrato è il prezzo stesso (4,50): se non lo vuoi, dai a **b** il valore iniziale `0`.

### 2. Un fattore fisso

Dai a **b** il valore iniziale `1.22` e togli «lo avvia» da **b**. Ogni prezzo che arriva su **a** esce aumentato del 22%: 100 → 122; `"50"` → 61.

### 3. Tre fattori

Aggiungi l'ingresso **c**: lunghezza 2, larghezza 3, altezza `"1,5"` → volume 9.

## Errori

| Messaggio | Quando |
|---|---|
| Serve un numero | Un ingresso ha un valore che non si può convertire in numero. |

## Vedi anche

- [Somma (+)](core.add), [Sottrazione (−)](core.subtract), [Divisione (÷ %)](core.divide)
- [Funzioni Math](core.math) per arrotondare e altre operazioni su un numero
- [Scala (k·A)](coll.matScale) per moltiplicare una matrice per un numero
- [Come funziona un blocco](ide/blocks)
