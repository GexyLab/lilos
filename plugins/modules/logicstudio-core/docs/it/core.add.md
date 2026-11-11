# Somma (+)

`core.add` · Matematica · [Blocchi di base](logicstudio-core) · versione 1

Somma due o più numeri e manda il totale.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **a** | numero | Il primo addendo. |
| **b** | numero | Il secondo addendo. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | numero | La somma degli ingressi che hanno un valore. |
| **Exception** (`error`) | oggetto | Quando un ingresso non è un numero. |

## Porte aggiuntive

Nelle **Proprietà**, sezione **Porte**, puoi aggiungere fino a 16 ingressi in più (meno, se un amministratore ha abbassato il limite delle porte aggiunte), di tipo numero, chiamati con le lettere che seguono: **c**, **d**, **e**… fino a **r**. Si vedono in corsivo sul blocco. Vedi [Come funziona un blocco](ide/blocks).

## Come funziona

Ogni volta che arriva un valore su un ingresso, il blocco Somma ricalcola il totale con l'ultimo valore di ogni ingresso e lo manda su **risultato**.

- Gli ingressi che non hanno ancora ricevuto niente non contano: con solo **a** = 5 il risultato è 5.
- I valori vengono convertiti in numero:

| Valore | Vale |
|---|---|
| un numero | sé stesso |
| `true` / `false` (anche un impulso) | 1 / 0 |
| `"2,5"`, `"2.5"`, `" 2.5 "` | 2,5 (la **prima** virgola vale come punto; gli spazi ai lati non contano) |
| `"1e3"` / `"0x10"` | 1000 / 16 |
| `""` (testo vuoto o solo spazi) | 0 |
| `null` | 0 |
| `[]` / `[5]` | 0 / 5 |
| `[1,2]` | 1,2 (una lista viene letta come testo, con gli elementi separati da virgole) |
| `"ciao"`, `"12 kg"`, `"1.234,5"`, un oggetto | non è un numero: errore |

- Se anche un solo valore non si può convertire, il blocco non manda niente su **risultato** e manda su **Exception** il messaggio «Serve un numero».
- I calcoli usano i numeri decimali del computer, che a volte danno risultati come 0,1 + 0,2 = 0,30000000000000004. Per mostrarli, arrotondali con [Funzioni Math](core.math).
- `"Infinity"` vale infinito, e infinito più qualsiasi numero resta infinito.

## Esempi

### 1. Due numeri fissi

```
[Costante · Variabile: 2] valore ──▶ a  [Somma (+)] risultato ──▶ valore [Print (console.log)]
[Costante · Variabile: 3] valore ──▶ b
```

All'avvio del programma i due [Costante · Variabile](core.value) mandano 2 e 3. Il blocco Somma gira due volte: prima scrive 2 (solo **a**), poi 5.

> Se vuoi solo il totale finale, togli «lo avvia» dall'ingresso **a**: il blocco Somma girerà solo quando arriva **b**. Funziona se **a** arriva prima di **b**; se arrivasse prima **b**, il blocco Somma girerebbe con il solo **b** (3). In alternativa dai ad **a** il valore iniziale `2` invece di usare un blocco [Costante · Variabile](core.value).

### 2. Un totale da tre campi di una finestra

Aggiungi l'ingresso **c** nelle Proprietà e collega gli oggetti di tre componenti [Campo numerico](ui.number):

```
[Campo numerico: primo trimestre]   valore ──▶ a  [Somma (+)] risultato ──▶ valore [Valore: totale]
[Campo numerico: secondo trimestre] valore ──▶ b
[Campo numerico: terzo trimestre]   valore ──▶ c
```

Ogni volta che l'utente cambia un campo, il totale mostrato dalla componente [Valore](ui.value) si aggiorna. Con 100, 250 e 80 il totale è 430. Se l'utente ha compilato solo i primi due, il totale è 350.

### 3. Valori misti

**a** = `"2,5"` (testo), **b** = `true` → risultato 3,5. **a** = `"2,5"`, **b** = `"tre"` → nessun risultato, e l'Exception riceve «Serve un numero».

## Errori

| Messaggio | Quando |
|---|---|
| Serve un numero | Un ingresso ha un valore che non si può convertire in numero. |

## Vedi anche

- [Sottrazione (−)](core.subtract), [Moltiplicazione (×)](core.multiply), [Divisione (÷ %)](core.divide)
- [Min · Max · Avg](core.stat) per media, minimo e massimo
- [Contatore (++ −−)](core.counter) per un totale che sale di un passo alla volta
- [Sum · Min · Max · Avg](coll.stat) per sommare gli elementi di una lista
- [Come funziona un blocco](ide/blocks)
