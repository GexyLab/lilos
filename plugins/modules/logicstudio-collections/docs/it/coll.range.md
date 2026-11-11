# Range

`coll.range` · Liste · [Liste e matrici](logicstudio-collections) · versione 1

Fa una lista di numeri da un valore a un altro, con un passo: per esempio 0, 1, 2, 3, 4, 5.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **da** (`from`) | numero | Il primo numero. Facoltativo: se non arriva niente vale 0. |
| **a** (`to`) | numero | Dove fermarsi. Obbligatorio. |
| **passo** (`step`) | numero | Quanto aggiungere ogni volta. Facoltativo: se non arriva niente vale 1. Può essere negativo o con la virgola, ma non zero. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | lista | I numeri da **da** verso **a**, a distanza di **passo**. |
| **Eccezione** (`error`) | oggetto | Un ingresso non è un numero, passo zero, lista troppo lunga. |

## Impostazioni

| Impostazione | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Includi l'ultimo valore** (`inclusive`) | acceso, spento | acceso | Acceso: se **a** si raggiunge esattamente, è nella lista. Spento: **a** resta fuori. |

## Come funziona

Il blocco aspetta di avere **a**; **da** e **passo** sono facoltativi. A ogni valore nuovo su uno dei tre ingressi rifà la lista.

La lista parte da **da** e aggiunge **passo** finché non supera **a**:

- se si arriva **esattamente** su **a**, **a** c'è solo con **Includi l'ultimo valore** acceso: `da 1, a 10, passo 3` dà `[1, 4, 7, 10]` (acceso) o `[1, 4, 7]` (spento);
- se non ci si arriva esattamente, l'ultimo numero è quello prima di superare **a**, con l'impostazione accesa o spenta: `da 0, a 1, passo 0.3` dà `[0, 0.3, 0.6, 0.9]`;
- se **a** è dalla parte sbagliata rispetto al passo, la lista è **vuota** (senza errore): `da 5, a 1` con passo 1 dà `[]`. Per contare all'indietro usa un passo negativo: `da 5, a 1, passo -1` dà `[5, 4, 3, 2, 1]`. Anche `a -2` con da e passo predefiniti dà `[]`;
- con **da** uguale ad **a** la lista è `[da]` (impostazione accesa) o `[]` (spenta).

Altri dettagli:

- I numeri con la virgola vengono puliti dagli errori di calcolo: `da 0, a 1, passo 0.1` dà `[0, 0.1, 0.2, …, 0.9, 1]` e non `0.30000000000000004`. Per farlo ogni numero è arrotondato a 12 cifre significative: con numeri molto grandi (più di 12 cifre, per esempio 1234567890123) i valori risultano arrotondati e sbagliati.
- I valori vengono convertiti in numero: `"1,5"` vale 1,5, `true` vale 1, `""` e `null` valgono 0. Un testo come `"dieci"` dà «Serve un numero».
- La lista può avere al massimo 100000 numeri: `a 100000` (da 0, passo 1, impostazione accesa) farebbe 100001 numeri e dà «Lista troppo grande (massimo 100000 elementi)»; `a 99999`, o `a 100000` con l'impostazione spenta, va bene.

## Esempi

### 1. Da 0 a 5

```
[Costante · Variabile: 5] valore ──▶ a [Range] risultato ──▶ valore [Print (console.log)]
```

Scrive `[0,1,2,3,4,5]`. Con **Includi l'ultimo valore** spento: `[0,1,2,3,4]`.

### 2. Ripetere qualcosa N volte

```
[Campo numerico: quante volte] valore ──▶ a [Range (da = 1)] risultato ──▶ lista [For each] elemento ──▶ valore [Print (console.log)]
[Pulsante: Vai]                premuto ──▶ avvia [For each]
```

Dai a **da** il valore iniziale 1. Con 3 nel [Campo numerico](ui.number) e un clic sul [Pulsante](ui.button), [For each](coll.forEach) manda 1, 2, 3 e la console li scrive uno per riga.

### 3. Un asse di valori per un grafico

`da 0, a 2, passo 0.25` dà `[0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]`: nove punti per disegnare una funzione.

## Errori

| Messaggio | Quando |
|---|---|
| Serve un numero | **da**, **a** o **passo** non si possono convertire in numero. |
| Il passo non può essere zero | **passo** vale 0. |
| Lista troppo grande (massimo 100000 elementi) | La lista avrebbe più di 100000 numeri. |

## Vedi anche

- [For each](coll.forEach), [Sum · Min · Max · Avg](coll.stat)
- [Contatore (++ −−)](core.counter) per contare un numero alla volta
- [Come funziona un blocco](ide/blocks)
