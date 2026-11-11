# Reverse

`coll.reverse` · Liste · [Liste e matrici](logicstudio-collections) · versione 1

Manda la lista al contrario: l'ultimo elemento diventa il primo.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **lista** (`list`) | lista | La lista da invertire. Non viene cambiata: il blocco ne fa una copia. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | lista | Gli stessi elementi in ordine inverso. |
| **Eccezione** (`error`) | oggetto | Quando il valore su **lista** non è una lista. |

## Come funziona

A ogni lista che arriva, il blocco manda la sua copia al contrario.

- Inverte solo il primo livello: `[[1, 2], [3, 4]]` diventa `[[3, 4], [1, 2]]` (le liste interne restano come sono).
- Una lista vuota dà `[]`, una lista di un elemento dà la stessa lista.
- Non ordina: per avere gli elementi dal più grande al più piccolo usa [Sort](coll.sort) con **Ordine** decrescente.
- Un testo non è una lista: `"ciao"` dà «Serve una lista». Per invertire le lettere, dividi il testo con [Split](coll.split) con separatore vuoto, inverti e riunisci con [Join](coll.join) con separatore vuoto.

## Esempi

### 1. Una lista di numeri

```
[Costante · Variabile (JSON): [1,2,3]] valore ──▶ lista [Reverse] risultato ──▶ valore [Print (console.log)]
```

Scrive `[3,2,1]`.

### 2. Le letture più recenti in cima

```
[Accumula (push con limite)] lista ──▶ lista [Reverse] risultato ──▶ righe [Tabella]
```

[Accumula (push con limite)](coll.accumulate) aggiunge in fondo; invertendo, la [Tabella](ui.table) mostra l'ultima lettura nella prima riga.

### 3. Una parola al contrario

```
[Costante · Variabile (testo): roma] valore ──▶ testo [Split (separatore vuoto)] risultato ──▶ lista [Reverse] risultato ──▶ lista [Join (separatore vuoto)] testo ──▶ valore [Print (console.log)]
```

Scrive `amor`. Nel separatore delle due impostazioni cancella il testo predefinito, lasciando la casella vuota.

## Errori

| Messaggio | Quando |
|---|---|
| Serve una lista | Il valore su **lista** non è una lista. |

## Vedi anche

- [Sort](coll.sort), [Slice](coll.slice)
- [Come funziona un blocco](ide/blocks)
