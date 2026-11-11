# Data e ora

`core.now` · Tempo · [Blocchi di base](logicstudio-core) · versione 1

Legge la data e l'ora di adesso e le manda in tre forme: come testo ISO, come numero di millisecondi e come oggetto con anno, mese, giorno, ora…

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **leggi** (`read`) | impulso | Qualsiasi valore che arriva qui fa leggere l'ora. Quello che arriva non conta. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **ISO** (`iso`) | testo | La data e l'ora nel formato ISO, **in tempo universale** (UTC): per esempio `2026-11-11T14:05:01.003Z`. |
| **millisecondi** (`ms`) | numero | I millisecondi passati dal 1° gennaio 1970 alle 00:00 UTC: per esempio `1794405901003`. |
| **parti** (`parts`) | oggetto | La data e l'ora divise in campi, **nell'ora locale** (vedi sotto). |
| **Eccezione** (`error`) | oggetto | In pratica non succede. |

## Come funziona

Ogni volta che arriva qualcosa su **leggi**, il blocco legge l'orologio e manda, in quest'ordine, **ISO**, **millisecondi** e **parti**. Le tre uscite descrivono lo stesso istante.

L'oggetto **parti** ha questi campi, tutti numeri:

| Campo | Cosa contiene | Valori |
|---|---|---|
| `year` | l'anno | per esempio 2026 |
| `month` | il mese | da 1 (gennaio) a 12 (dicembre) |
| `day` | il giorno del mese | da 1 a 31 |
| `hour` | l'ora | da 0 a 23 |
| `minute` | i minuti | da 0 a 59 |
| `second` | i secondi | da 0 a 59 |
| `weekday` | il giorno della settimana | da 0 (**domenica**) a 6 (sabato): lunedì è 1 |

Da sapere:

- L'orologio è quello del **computer su cui gira lilOS**, non quello del tuo browser. Anche l'ora **locale** di **parti** è quella del fuso orario di quel computer: se lilOS gira su un server in un altro paese, **parti** ha l'ora di là.
- **ISO** è sempre in tempo universale (finisce con `Z`): in Italia d'inverno è un'ora indietro rispetto a **parti**, d'estate due.
- I numeri di **parti** non hanno lo zero davanti: le 9:05 sono `hour` 9 e `minute` 5.
- Non ci sono i millisecondi in **parti**: usa **millisecondi** o **ISO**.
- **millisecondi** serve per misurare quanto tempo passa: la differenza tra due letture, con [Sottrai](core.subtract), è la durata in millisecondi.

Per le regole generali vedi [Come funziona un blocco](ide/blocks).

## Esempi

### 1. Le tre uscite

Letto l'11 novembre 2026 alle 15:05:01 in Italia (ora solare, UTC+1):

| Uscita | Valore |
|---|---|
| **ISO** | `"2026-11-11T14:05:01.003Z"` |
| **millisecondi** | `1794405901003` |
| **parti** | `{"year": 2026, "month": 11, "day": 11, "hour": 15, "minute": 5, "second": 1, "weekday": 3}` (mercoledì) |

### 2. Una riga con l'ora a ogni clic

```
[Pulsante: Timbra] premuto ──▶ leggi [Data e ora] parti ──▶ oggetto [Scomponi oggetto] hour   ──▶ h [Formatta testo: "Entrata alle {h}:{m}"] testo ──▶ valore [Scrivi in console]
                                                                                       minute ──▶ m
```

Su [Formatta testo](core.format) aggiungi due ingressi, rinominali **h** e **m**, e togli **lo avvia** da **h**, così scrive una riga sola per clic: `Entrata alle 15:5`.

### 3. Quanto ci ha messo

```
[Pulsante: Via]  premuto ──▶ leggi [Data e ora A] millisecondi ──▶ b [Sottrai] risultato ──▶ a [Dividi: b = 1000] risultato ──▶ valore [Scrivi in console]
[Pulsante: Stop] premuto ──▶ leggi [Data e ora B] millisecondi ──▶ a
```

Su [Sottrai](core.subtract) togli **lo avvia** da **b**: al clic su **Stop** la console scrive i secondi passati dal clic su **Via**, per esempio `12.48`. Su [Dividi](core.divide) l'ingresso **b** ha il valore iniziale 1000 e **lo avvia tolto** (altrimenti all'avvio Dividi girerebbe con **a** vuoto e la console scriverebbe `0`).

### 4. Solo nei giorni feriali

```
[Ogni… 3600 s] impulso ──▶ leggi [Data e ora] parti ──▶ oggetto [Prendi campo: weekday] valore ──▶ a [Confronta: a ≥ b, b = 1] …
```

Con un secondo Confronta (`a ≤ b`, **b** = 5) e un [E](core.and) sai se oggi è un giorno da lunedì a venerdì. Sui due Confronta togli **lo avvia** da **b**, che ha solo il valore iniziale.

## Vedi anche

- [Ogni…](core.every) per leggere l'ora a intervalli
- [Scomponi oggetto](core.decompose) e [Prendi campo](core.get) per usare i campi di **parti**
- [Formatta testo](core.format)
- [Come funziona un blocco](ide/blocks)
