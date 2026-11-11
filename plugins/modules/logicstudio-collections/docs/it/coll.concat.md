# Unisci liste

`coll.concat` · Liste · [Liste e matrici](logicstudio-collections) · versione 1

Mette in fila due o più liste e ne fa una sola.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **a** | lista | La prima lista. |
| **b** | lista | La seconda lista, messa dopo **a**. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | lista | Gli elementi di **a**, poi quelli di **b**, poi quelli degli ingressi aggiunti, nell'ordine. |
| **Eccezione** (`error`) | oggetto | Un ingresso non è una lista, o il risultato è troppo lungo. |

## Porte aggiuntive

Nelle **Proprietà**, sezione **Porte**, puoi aggiungere fino a 16 ingressi in più, di tipo lista, chiamati con le lettere che seguono (**c**, **d**, **e**…). Si vedono in corsivo sul blocco. Le loro liste vanno in fondo, nell'ordine degli ingressi nelle Proprietà. Vedi [Come funziona un blocco](ide/blocks).

## Come funziona

A ogni valore nuovo su un ingresso il blocco rifà l'unione con l'ultimo valore di ogni ingresso.

- **Nessun ingresso è obbligatorio**: gli ingressi che non hanno ancora ricevuto niente vengono saltati. Con solo **a** = `[1, 2]` il risultato è `[1, 2]`; con solo **b** = `[3]` è `[3]`.
- Ogni ingresso che ha un valore deve avere una lista: un testo, un numero o un oggetto danno «Serve una lista» e nessun risultato.
- Le liste vengono unite **di un livello**: `[[1]]` e `[[2]]` danno `[[1], [2]]`, non `[1, 2]`.
- Le liste vuote non aggiungono niente.
- Gli elementi doppi restano: per toglierli usa [Unici](coll.unique).
- Il risultato può avere al massimo 100000 elementi.

## Esempi

### 1. Due liste

```
[Valore (JSON): [1,2]] valore ──▶ a  [Unisci liste] risultato ──▶ valore [Scrivi in console]
[Valore (JSON): [3]]   valore ──▶ b
```

All'avvio il blocco gira due volte: scrive `[1,2]` (c'è solo **a**) e poi `[1,2,3]`.

> Per avere solo il risultato finale togli «lo avvia» dall'ingresso **a**: il blocco gira quando arriva **b**.

### 2. Tre liste con un ingresso aggiunto

Aggiungi l'ingresso **c** nelle Proprietà:

```
[Valore (JSON): ["lun","mar"]]  valore ──▶ a  [Unisci liste] risultato ──▶ voci [Elenco]
[Valore (JSON): ["mer"]]        valore ──▶ b
[Valore (JSON): ["gio","ven"]]  valore ──▶ c
```

L'[Elenco](ui.list) mostra alla fine `lun, mar, mer, gio, ven`.

### 3. Righe di due matrici una sotto l'altra

Una [matrice](logicstudio-collections) è una lista di righe: unendo `[[1,2]]` e `[[3,4],[5,6]]` ottieni `[[1,2],[3,4],[5,6]]`, cioè le righe della seconda sotto quelle della prima. Il collegamento matrice → lista è segnalato dall'IDE, ma funziona. Le righe devono avere la stessa lunghezza perché il risultato sia ancora una matrice.

## Errori

| Messaggio | Quando |
|---|---|
| Serve una lista | Un ingresso ha un valore che non è una lista. |
| Lista troppo grande (massimo 100000 elementi) | L'unione avrebbe più di 100000 elementi. |

## Vedi anche

- [Aggiungi elemento](coll.add), [Porzione](coll.slice), [Unici](coll.unique)
- [Concatena](core.concat) per unire testi
- [Componi lista](core.list) per fare una lista da valori separati
- [Come funziona un blocco](ide/blocks)
