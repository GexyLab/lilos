# Template (formatta)

`core.format` · Testo · [Blocchi di base](logicstudio-core) · versione 1

Costruisce un testo da un modello con dei segnaposto tra graffe, come `Ciao {nome}, hai {anni} anni`: ogni segnaposto viene sostituito dal valore dell'ingresso con lo stesso nome.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| (gli ingressi aggiunti) | qualsiasi | I valori dei segnaposto: ogni ingresso riempie il segnaposto con il suo nome. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **testo** (`text`) | testo | Il modello con i segnaposto sostituiti. |
| **Eccezione** (`error`) | oggetto | In pratica questo blocco non manda mai niente qui. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Modello** (`template`) | un testo (fino a 2000 caratteri) | `{a}` | Il testo da produrre, con i segnaposto tra graffe: `{nome}`. |

## Porte aggiuntive

Il blocco nasce **senza ingressi**: aggiungi un ingresso per ogni segnaposto nelle **Proprietà**, sezione **Porte**, con **Aggiungi ingresso**. Puoi averne fino a 16 (meno, se un amministratore ha abbassato il limite delle porte aggiunte), di tipo qualsiasi. Si chiamano all'inizio **segnaposto 1**, **segnaposto 2**… (in un IDE in inglese **placeholder 1**…): **rinominali** nelle Proprietà con il nome che usi nel modello, per esempio `nome` e `anni`. Il nome può essere lungo fino a 60 caratteri; gli spazi all'inizio e alla fine vengono tolti. Si vedono in corsivo sul blocco. Vedi [Come funziona un blocco](ide/blocks).

Nota: il modello predefinito è `{a}`, ma il primo ingresso aggiunto si chiama **segnaposto 1**. Rinomina l'ingresso in `a`, oppure cambia il modello in `{segnaposto 1}`; altrimenti esce il testo `{a}` così com'è.

## Come funziona

Ogni volta che arriva un valore su un ingresso, il blocco riparte dal **Modello** e sostituisce ogni segnaposto:

- Un **segnaposto** è un testo tra `{` e `}` che non contiene altre graffe: `{nome}`, `{segnaposto 1}`, `{prezzo €}`.
- Se c'è un ingresso con **esattamente** quel nome (maiuscole e spazi compresi: `{ nome }` non è `{nome}`), il segnaposto viene sostituito dal suo ultimo valore, scritto come testo.
- Se non c'è nessun ingresso con quel nome, il segnaposto **resta com'è**, graffe comprese: `{x}` resta `{x}`. Anche `{}` resta com'è.
- Lo stesso segnaposto può comparire più volte: viene sostituito ogni volta.
- Un ingresso che non ha ancora ricevuto niente vale **testo vuoto**: con `Ciao {nome}, hai {anni} anni` e solo **nome** = Ada, esce `Ciao Ada, hai  anni` (con due spazi).

Come vengono scritti i valori:

| Valore | Scritto come |
|---|---|
| un testo | così com'è |
| un numero | con il punto e tutti i decimali: 36,5 → `36.5`; 0,1 + 0,2 → `0.30000000000000004` |
| sì / no | `true` / `false` |
| `null` | testo vuoto |
| un oggetto o una lista | JSON compatto: `{"a":[1]}`, `[1,2]` |

Altre cose da sapere:

- Senza ingressi aggiunti il blocco **non parte mai**, quindi non manda niente (nemmeno un modello senza segnaposto). Per un testo fisso usa il blocco [Costante · Variabile](core.value) con tipo testo.
- Non c'è modo di scrivere una graffa «vera» al posto di un segnaposto che ha un ingresso con quel nome.
- Il modello si scrive in un campo di una riga: non puoi andare a capo.
- Per scrivere un numero con la virgola o con un certo numero di decimali, preparalo prima: arrotondalo con il blocco [Funzioni Math](core.math) e, se ti serve la virgola, passalo dal blocco [Funzioni stringa](core.text) con **sostituisci** `.` con `,`.

## Esempi

### 1. Un saluto

Modello `Ciao {nome}, hai {anni} anni`; due ingressi rinominati `nome` e `anni`:

```
[Campo di testo: nome]  testo  ──▶ nome [Template (formatta)] testo ──▶ testo [Etichetta: saluto]
[Campo numerico: anni]  valore ──▶ anni
```

Con nome `Ada` e anni 36 l'[Etichetta](ui.label) mostra `Ciao Ada, hai 36 anni`. Ogni modifica a uno dei due campi aggiorna il testo.

### 2. Una riga di registro

Modello `[{ora}] {livello}: {messaggio}`; tre ingressi. Dai a **livello** il valore iniziale `INFO` e togli «lo avvia» da **ora** e **livello**: il blocco parte solo quando arriva un **messaggio**.

Con ora `10:30`, livello `INFO` e messaggio `avviato`, esce `[10:30] INFO: avviato`.

### 3. Valori strani

Modello `Totale: {t} {unità} {nota}`, ingressi **t** e **unità** (nessun ingresso **nota**):

- **t** = 12,5, **unità** = `€` → `Totale: 12.5 € {nota}`;
- **t** = `null` → `Totale:  € {nota}`;
- **t** = una lista `[1,2]` → `Totale: [1,2] € {nota}`.

## Errori

Questo blocco non ha errori suoi.

## Vedi anche

- [Concat testo](core.concat) per unire testi uno dopo l'altro, con un separatore
- [Funzioni stringa](core.text) per maiuscole, spazi, sostituzioni
- [Cast (converti tipo)](core.convert) per trasformare un valore in testo o in testo JSON
- [Join](coll.join) per gli elementi di una lista
- [Come funziona un blocco](ide/blocks)
