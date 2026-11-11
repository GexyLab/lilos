# Sum · Min · Max · Avg

`coll.stat` · Liste · [Liste e matrici](logicstudio-collections) · versione 1

Calcola la somma, il minimo, il massimo o la media dei numeri di una lista.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **lista** (`list`) | lista | La lista di numeri (o di oggetti, con **Campo**). |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | numero | Il risultato dell'operazione scelta. |
| **Eccezione** (`error`) | oggetto | Lista non valida, un elemento non numerico, lista vuota (salvo per la somma). |

## Impostazioni

| Impostazione | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Operazione** (`op`) | somma (`sum`), minimo (`min`), massimo (`max`), media (`avg`) | somma | Che cosa calcolare. |
| **Campo (facoltativo, es. a.b)** (`field`) | un testo | vuoto | Se la lista ha oggetti, il campo con il numero (`prezzo`, `misura.valore`, `0` per il primo valore di una lista). Vuoto: gli elementi stessi. |

## Come funziona

A ogni lista che arriva il blocco calcola il risultato e lo manda su **risultato**.

| Operazione | Risultato | Con la lista vuota |
|---|---|---|
| somma | tutti i numeri sommati | 0 |
| minimo | il più piccolo | errore «Lista vuota» |
| massimo | il più grande | errore «Lista vuota» |
| media | la somma divisa per quanti sono | errore «Lista vuota» |

**Quali valori sono numeri.** Ogni elemento (o il suo campo) deve essere:

- un numero: `4`, `-2.5`;
- oppure un testo con un numero: `"7"`, `" 3 "` (gli spazi ai lati non contano), `"2,5"` (la virgola vale come punto decimale), `"1e3"` (1000), `"0x10"` (16).

Se anche un solo elemento non lo è, esce «Serve un numero in ogni elemento» e nessun risultato. Non sono numeri: `true`, `false`, `null`, `""`, `"abc"`, oggetti, liste, un campo che manca, e i testi `"Infinity"`.

Attenzione ai testi con le migliaia: solo la **prima** virgola diventa un punto. `"1,000"` vale 1 (non mille) e `"1.000,5"` non è un numero.

Il risultato non viene arrotondato: `[0.1, 0.2]` sommati danno `0.30000000000000004`, come in ogni calcolo con la virgola sul computer. Arrotonda con [Funzioni Math](core.math) se serve. Numeri enormi possono dare `Infinity`.

## Esempi

### 1. Somma e media

```
[Costante · Variabile (JSON): [4,8,9]] valore ──▶ lista [Sum · Min · Max · Avg] risultato ──▶ valore [Print (console.log)]
```

Con **Operazione** somma scrive `21`; con media `7`; con minimo `4`; con massimo `9`.

### 2. Il totale di un carrello

```
[Costante · Variabile (JSON): [{"articolo":"Penna","prezzo":"2,50"},{"articolo":"Zaino","prezzo":35}]] valore ──▶ lista [Sum · Min · Max · Avg: somma, Campo prezzo] risultato ──▶ valore [Valore mostrato: totale]
```

Il totale è 37,5: il testo `"2,50"` vale 2,5. Se un articolo non avesse il campo `prezzo`, il totale non si aggiornerebbe e uscirebbe «Serve un numero in ogni elemento».

### 3. La media mobile delle ultime 5 letture

```
[Campo numerico: lettura] valore ──▶ aggiungi [Accumula (push con limite): massimo 5] lista ──▶ lista [Sum · Min · Max · Avg: media] risultato ──▶ valore [Valore mostrato]
```

Con le letture 10, 20, 30 il Valore mostrato indica 10, poi 15, poi 20. Dopo la sesta lettura la più vecchia esce dal conto.

## Errori

| Messaggio | Quando |
|---|---|
| Serve una lista | Il valore su **lista** non è una lista. |
| Serve un numero in ogni elemento | Un elemento (o il suo campo) non è un numero. |
| Lista vuota | La lista è vuota e l'operazione è minimo, massimo o media. |

## Vedi anche

- [Min · Max · Avg](core.stat) per numeri su ingressi separati
- [Map campo](coll.pluck), [Accumula (push con limite)](coll.accumulate), [Sort](coll.sort)
- [Come funziona un blocco](ide/blocks)
