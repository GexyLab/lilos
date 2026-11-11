# Tabella

`ui.table` · Testo e valori · [Componenti UI standard](logicstudio-ui) · versione 1

Mostra una lista in righe e colonne: ogni elemento della lista è una riga, ogni campo di un oggetto è una colonna. L'utente può scegliere una riga, e la tabella la manda allo schema.

## Proprietà

| Proprietà | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Etichetta** | testo (traducibile) | vuoto | Scritta sopra la tabella. |
| **Colonne** | nomi di campi separati da virgola | vuoto | Quali campi mostrare, e in che ordine: `nome, prezzo`. Vuoto: tutti i campi che trova (al massimo 12). |

## Porte del suo oggetto nello schema

### Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **righe** (`rows`) | lista | Le righe da mostrare. Sostituisce tutta la tabella. |
| **abilitato** (`enabled`) | sì/no | `false` la rende più chiara e non si può più scegliere una riga. Vedi [Componenti UI standard](logicstudio-ui). |
| **visibile** (`visible`) | sì/no | `false` la nasconde. |

### Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **riga scelta** (`selected`) | oggetto | La riga su cui l'utente fa clic (o preme Invio o Spazio). |
| **Eccezione** (`error`) | oggetto | Come ogni blocco; per questa componente oggi non ci passa niente. |

## Come funziona

All'apertura la tabella è vuota (solo l'intestazione, se hai scritto le **Colonne**). Ogni lista che arriva su **righe** la ridisegna da capo.

**Le colonne.**

- Con **Colonne** scritte, la tabella mostra quei campi, nell'ordine scritto, senza limite di numero. Un campo che una riga non ha resta vuoto.
- Con **Colonne** vuota, la tabella raccoglie i campi di tutte le righe, nell'ordine in cui li incontra, e ne mostra **al massimo 12**.
- L'intestazione mostra il nome del campo così com'è (`prezzo`, non «Prezzo»). Per un'intestazione diversa, rinomina i campi nello schema.

**Le righe.**

| Elemento della lista | Come si vede |
|---|---|
| un oggetto `{ "nome": "Pane", "prezzo": 2.5 }` | un campo per colonna: `Pane` · `2.5` |
| un valore semplice (`"Pane"`, `3`, `true`) | nella colonna **valore** |
| una lista `[1, 2]` | nella colonna **valore**, come JSON: `[1,2]` |
| un campo che è un oggetto o una lista | come JSON su una riga |

- I numeri si vedono come in JSON (`2.5`, non `2,5`), senza formattazione.
- Se la lista mescola oggetti e valori semplici, un valore semplice si ripete in **ogni** colonna della sua riga.
- **Si vedono al massimo 500 righe**: le altre non compaiono e la tabella non lo segnala. La tabella è alta al massimo 260 pixel e scorre.
- Un valore su **righe** che non è una lista svuota la tabella.

**Scegliere una riga.** Un clic su una riga (o **Invio** / **Spazio** quando la riga ha il fuoco) la evidenzia e manda su **riga scelta**:

| Riga | Cosa manda |
|---|---|
| un oggetto | **l'oggetto intero**, con tutti i suoi campi (anche quelli non mostrati nelle colonne) |
| una lista | la lista stessa |
| un valore semplice, o `null` | un oggetto `{ "value": <valore>, "index": <posizione> }`; la posizione parte da 0 |

- Fare clic di nuovo sulla stessa riga la manda di nuovo.
- Per una riga che è un oggetto, la tabella **non** manda la sua posizione: se ti serve, metti nell'oggetto un campo con un codice.
- Quando arrivano nuove righe, la riga evidenziata non lo è più.

## Esempi

### 1. Il contenuto di una cartella

```
Finestra «Documenti»
└ Colonna (radice)
  ├ Pulsante  button1  Testo «Aggiorna»
  ├ Tabella   table1   Etichetta «File»  Colonne «name, size»
  └ Etichetta label1   Testo «»
```

```
[Pulsante: Aggiorna] premuto ──▶ leggi [Elenca cartella: ~/Documenti] elementi ──▶ righe [Tabella: File]
[Tabella: File] riga scelta ──▶ oggetto [Prendi campo: name] valore ──▶ testo [Etichetta: label1]
```

La tabella mostra nome e dimensione (in byte) di ogni elemento della cartella; facendo clic su una riga, l'etichetta sotto mostra il nome scelto. I campi che manda [Elenca cartella](lilos.folderList) sono `name`, `type`, `size`, `modified` e `path`; in generale, se non conosci i campi di una lista, lascia **Colonne** vuota la prima volta e guarda l'intestazione.

### 2. Una lista di parole

```
[Valore: ["rosso","verde","blu"] (JSON)] valore ──▶ righe [Tabella: Colori]
[Tabella: Colori] riga scelta ──▶ valore [Scrivi in console]
```

La tabella ha una sola colonna, **valore**, con tre righe. Un clic su «verde» scrive in console `{"value":"verde","index":1}`.

### 3. Un registro che cresce

```
[Campo di testo: Nota] testo ──▶ nota [Componi oggetto] oggetto ──▶ aggiungi [Accumula: max 50] lista ──▶ righe [Tabella: Note]
[blocco Data e ora] ISO ──▶ ora [Componi oggetto]
[Campo di testo: Nota] invio ──▶ leggi [blocco Data e ora]
```

Il «blocco Data e ora» è il blocco [Data e ora](core.now) dei Blocchi di base, non la componente. Con [Accumula](coll.accumulate) la tabella mostra le ultime 50 note scritte, ognuna con la sua ora. (Nel [Componi oggetto](core.compose), togli «lo avvia» da **nota**: l'oggetto parte quando arriva l'ora.)

## Accessibilità e tastiera

- Ogni riga si raggiunge con **Tab** e si sceglie con **Invio** o **Spazio**. Le frecce non spostano da una riga all'altra.
- La riga scelta si vede dallo sfondo colorato; un lettore di schermo non la annuncia come «selezionata».
- L'**Etichetta** sopra non è collegata alla tabella.
- Con molte righe il Tab passa per tutte: per tabelle lunghe valuta un [Elenco](ui.list).

## Vedi anche

- [Elenco](ui.list), per scegliere da una lista di nomi
- [Estrai campo](coll.pluck), [Ordina](coll.sort), [Filtra](coll.filter) per preparare le righe
- [Componenti UI standard](logicstudio-ui)
