# Componi oggetto

`core.compose` · Oggetti · [Blocchi di base](logicstudio-core) · versione 1

Mette insieme più valori in un oggetto: ogni ingresso che aggiungi è un campo, con il nome che gli dai.

## Ingressi

Il blocco nasce **senza ingressi**: aggiungi un ingresso per ogni campo dell'oggetto (vedi **Porte aggiuntive**).

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **oggetto** (`object`) | oggetto | L'oggetto con un campo per ogni ingresso che ha già ricevuto un valore. |
| **Eccezione** (`error`) | oggetto | In pratica non succede: il blocco non ha errori suoi. |

## Porte aggiuntive

Nelle **Proprietà**, sezione **Porte**, con **Aggiungi ingresso** aggiungi fino a 32 campi (o meno, se un amministratore ha abbassato il limite **Porte aggiunte per blocco**). Ogni ingresso aggiunto è di tipo qualsiasi e nasce con il nome **campo 1**, **campo 2**…: **rinominalo** con il nome del campo che vuoi nell'oggetto (fino a 60 caratteri; gli spazi ai lati vengono tolti; un nome vuoto non viene accettato e resta quello di prima). Le frecce ↑ ↓ cambiano l'ordine dei campi. Vedi [Come funziona un blocco](ide/blocks).

## Come funziona

Ogni volta che arriva un valore su uno dei campi, il blocco manda su **oggetto** un oggetto nuovo con **l'ultimo valore di ogni campo**.

- I campi che non hanno ancora ricevuto niente **non ci sono** nell'oggetto. Con i campi `nome` ed `età`, se è arrivato solo `nome` = `"Ada"` esce `{"nome": "Ada"}`.
- Un campo che riceve `null` c'è, e vale `null`.
- I valori restano: dopo l'invio i campi tengono il loro valore e la volta dopo l'oggetto li contiene ancora. Per ricominciare da capo bisogna fermare il programma.
- Il nome è usato **così com'è** come nome del campo: un nome con un punto, come `a.b`, fa un campo che si chiama proprio `a.b` (non un oggetto dentro un altro). Per oggetti dentro oggetti usa due blocchi Componi oggetto, uno collegato a un campo dell'altro.
- Se due campi hanno lo **stesso nome**, nell'oggetto vince quello più in basso nell'elenco delle porte.
- L'ordine dei campi nell'oggetto è quello delle porte.
- Il blocco gira **a ogni valore**: con tre campi che arrivano uno dopo l'altro, escono tre oggetti, sempre più completi. Se vuoi un oggetto solo, togli **lo avvia** a tutti i campi tranne quello che arriva per ultimo, oppure usa [Aspetta tutti](core.join).

Per le regole generali (ingressi, «lo avvia», valore iniziale, Eccezione) vedi [Come funziona un blocco](ide/blocks).

## Esempi

### 1. Un oggetto da tre valori

Aggiungi tre ingressi e chiamali `nome`, `età` e `città`:

```
[Valore: testo "Ada"] valore ──▶ nome  [Componi oggetto] oggetto ──▶ valore [Scrivi in console]
[Valore: numero 36]   valore ──▶ età
[Valore: testo "Roma"] valore ──▶ città
```

All'avvio la console scrive tre righe, una per ogni valore che arriva:

```
{"nome":"Ada"}
{"nome":"Ada","età":36}
{"nome":"Ada","età":36,"città":"Roma"}
```

Togli **lo avvia** da `nome` ed `età`: resta solo l'ultima riga.

### 2. Un campo fisso con il valore iniziale

Chiama i campi `sensore` e `gradi`. Su `sensore` togli **lo avvia** e scrivi il valore iniziale `"cucina"`; collega a `gradi` le letture:

```
[letture] ──▶ gradi [Componi oggetto] oggetto ──▶ … 
```

Ogni lettura, per esempio 21,5, fa uscire `{"sensore": "cucina", "gradi": 21.5}`.

### 3. Un oggetto dentro un oggetto

```
[Componi oggetto: via, città] oggetto ──▶ indirizzo [Componi oggetto: nome, indirizzo] oggetto ──▶ …
```

Con via `"Corso Italia 1"`, città `"Roma"` e nome `"Ada"` esce `{"nome": "Ada", "indirizzo": {"via": "Corso Italia 1", "città": "Roma"}}`.

## Vedi anche

- [Scomponi oggetto](core.decompose) e [Prendi campo](core.get) per leggere i campi
- [Componi lista](core.list) per mettere insieme valori in una lista
- [Aspetta tutti](core.join) per aspettare che siano arrivati tutti
- [Come funziona un blocco](ide/blocks)
