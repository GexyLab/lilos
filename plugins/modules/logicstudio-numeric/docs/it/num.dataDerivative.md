# Derivata di dati

`num.dataDerivative` · Analisi numerica · [Analisi numerica](logicstudio-numeric) · versione 1

Calcola la **derivata di dati misurati**: la pendenza `dy/dx` in ogni punto, anche con le x a distanze diverse.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **lista delle x** (`x`) | lista | La lista delle x, in ordine crescente. Se manca, le x sono 0, 1, 2… moltiplicate per la **Distanza**. |
| **lista delle y** (`y`) | lista | La lista delle y, oppure una lista di punti `{x, y}` o `[x, y]`. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **dy/dx** (`derivative`) | lista | La pendenza in ogni punto, con la stessa lunghezza dei dati. |
| **lista delle x** (`x`) | lista | Le x usate (utili se sono state ricavate dai punti o dalla distanza). |
| **Exception** (`error`) | oggetto | L'errore del blocco, con uno dei messaggi della sezione **Errori**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Metodo** (`method`) | Centrale / In avanti / All'indietro | Centrale | **Centrale** usa i due vicini (formula esatta anche con x a distanze diverse); **In avanti** il punto dopo; **All'indietro** il punto prima. |
| **Distanza (se non c'è la lista x)** (`dx`) | numero | `1` | La distanza tra due dati consecutivi quando non c'è la lista x. |

## Come funziona

Il blocco aspetta di avere un valore su tutti gli ingressi collegati e calcola a ogni nuovo valore; non parte da solo all'avvio.

- Ai due estremi, dove un lato manca, si usa il solo lato che c'è.
- Le misure rumorose danno derivate molto rumorose: conviene prima lisciarle (vedi [Lisciatura](sig.smooth) nel pacchetto dei segnali).
- Per i dati di una funzione liscia scritta come formula è meglio la derivata simbolica ([Derivata](fn.derivative)).
- Le x devono crescere: due x uguali o in ordine inverso sono un errore.

## Esempi

### 1. La velocità da una posizione

Posizioni misurate ogni secondo: `[0, 1, 4, 9]`:

```
[Costante · Variabile (JSON): [0, 1, 4, 9]] valore ──▶ y [Derivata di dati] derivata ──▶ valore [Print (console.log)]
```

Scrive `[1,2,4,5]`.

### 2. Con x irregolari

La parabola `y = x²` misurata in 0, 0.5 e 2:

```
[Costante · Variabile (JSON): [0, 0.5, 2]] valore ──▶ x [Derivata di dati]
[Costante · Variabile (JSON): [0, 0.25, 4]] valore ──▶ y
```

La derivata al centro è esatta (1).

### 3. Da una funzione

```
[Campiona f: x^2, 0 → 3, 4 punti] x ──▶ x [Derivata di dati]
[Campiona f]                      y ──▶ y
```

Esce `[1,2,4,5]`: la derivata di `x²` in 0, 1, 2 e 3 (esatta solo in mezzo, ai due estremi è la pendenza del primo tratto).

## Errori

| Messaggio | Quando |
|---|---|
| Servono dei dati: una lista di numeri o di punti | L'ingresso non è una lista. |
| Le liste x e y hanno lunghezze diverse (… e …) | Le due liste non hanno lo stesso numero di elementi. |
| Serve una lista di numeri per le x | L'ingresso **x** non è una lista. |
| Troppi dati (più di 1000000) | La lista ha più di un milione di elementi. |
| Servono almeno 2 punti | I dati hanno meno di 2 punti. |
| Le x devono essere in ordine crescente, senza ripetizioni | La lista delle x non è crescente o ha due valori uguali di seguito. |
| Distanza: serve un numero | L'impostazione **Distanza** non è un numero. |
| Distanza: deve essere diversa da zero | L'impostazione **Distanza** è 0. |

## Vedi anche

- [Derivata di un segnale (d/dt)](fn.signalDerivative) per la derivata di un segnale mentre arriva
- [Integrale di dati campionati](int.data) il contrario: l'integrale dei dati
- [Derivata in un punto f'(x)](fn.derivativeAt) per la derivata di una funzione scritta come formula
- [Campiona f](num.sample) per ottenere i dati da una funzione
- [Analisi numerica](logicstudio-numeric), tutti i blocchi del pacchetto
- [Funzioni e derivate](logicstudio-functions), la sintassi delle funzioni
- [Come funziona un blocco](ide/blocks)
