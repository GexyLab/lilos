# Filter

`coll.filter` · Liste · [Liste e matrici](logicstudio-collections) · versione 1

Divide una lista in due: gli elementi che rispettano una condizione e quelli che non la rispettano.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **lista** (`list`) | lista | La lista da filtrare. Non viene cambiata. |
| **valore (facoltativo)** (`value`) | qualsiasi | Il valore con cui confrontare gli elementi. Se arriva, vale più dell'impostazione **Valore**. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | lista | Gli elementi che rispettano la condizione, nell'ordine di partenza. |
| **scartati** (`rest`) | lista | Tutti gli altri, nell'ordine di partenza. |
| **Exception** (`error`) | oggetto | Quando il valore su **lista** non è una lista. |

## Impostazioni

| Impostazione | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Tieni gli elementi** (`op`) | `a = b` (`eq`), `a ≠ b` (`ne`), `a > b` (`gt`), `a ≥ b` (`ge`), `a < b` (`lt`), `a ≤ b` (`le`), contiene (`contains`) | `a = b` | La condizione. **a** è l'elemento (o il suo campo), **b** è il valore. |
| **Valore** (`value`) | un testo | vuoto | Il valore **b**, se non arriva niente sull'ingresso **valore**. È sempre un testo: `5` scritto qui è il testo `"5"`. |
| **Campo (facoltativo, es. a.b)** (`field`) | un testo | vuoto | Se la lista ha oggetti, il campo da confrontare (`prezzo`, `indirizzo.città`, `0` per il primo valore di una lista). Vuoto: si confronta l'elemento intero. |

## Come funziona

Basta la **lista** perché il blocco giri. A ogni valore nuovo (lista o valore) il blocco prova la condizione su ogni elemento e manda tutte e due le uscite, anche quando una è vuota (`[]`).

**Il valore b** è l'ultimo arrivato sull'ingresso **valore**; se non è mai arrivato niente, è il testo dell'impostazione **Valore**. Attenzione: con le impostazioni predefinite (a = b, Valore vuoto) il blocco tiene solo gli elementi uguali al testo vuoto.

**Come si confronta (=, ≠, >, ≥, <, ≤).**

1. Se **a** e **b** sono tutti e due numeri, o testi con un numero (`"5"`, `"4,5"`, `" 10 "`), si confrontano come numeri: `5 = "5"` è vero, `10 > "4,5"` è vero.
2. Altrimenti si confrontano come testi. `null` e i campi mancanti valgono testo vuoto; `true`/`false` valgono `"true"`/`"false"`; liste e oggetti valgono il loro JSON. Il confronto tra testi va **carattere per carattere secondo il codice**: maiuscole prima delle minuscole (`"B" < "a"` è vero), lettere accentate dopo la z. Basta che uno dei due non sia un numero perché anche le cifre si confrontino come lettere: `"10"` viene prima di `"9a"`.
3. Per **=** e **≠**, se **a** e **b** sono tutti e due liste o oggetti, sono uguali quando hanno lo stesso contenuto (con i campi nello stesso ordine).

Casi da sapere:

- Un elemento senza il **Campo** vale testo vuoto: con «a < b» e b = `10`, l'elemento `{"q": 1}` (senza `prezzo`) **passa**, perché il testo vuoto viene prima di `"10"`. Con «a > b» invece finisce tra gli scartati.
- `null` è uguale al testo vuoto: con «a = b» e Valore vuoto passano sia `""` sia `null`.
- Il testo `"null"` non è uguale a `null`.

**contiene.**

- Se **a** è una lista, è vero quando uno dei suoi elementi è **identico** a b (tipo compreso, come in [Includes · IndexOf](coll.contains)). Dato che l'impostazione **Valore** è sempre un testo, `[1, 2]` non «contiene» il Valore `2`: per cercare un numero mandalo sull'ingresso **valore**.
- Altrimenti **a** e **b** diventano testi ed è vero se b è un pezzo di a. Distingue maiuscole e minuscole: `"Mela"` non contiene `"mel"`.
- Un b vuoto è contenuto in ogni testo: con «contiene» e Valore vuoto passano tutti gli elementi che non sono liste.

## Esempi

### 1. Numeri sopra una soglia

```
[Costante · Variabile (JSON): [1,5,10,"5",null]] valore ──▶ lista [Filter: a > b, Valore 4] risultato ──▶ valore [Print (console.log)]
                                                                     scartati  ──▶ valore [Print (console.log)]
```

Le due console scrivono `[5,10,"5"]` e `[1,null]`.

### 2. Prodotti economici

```
[Costante · Variabile (JSON): [{"nome":"Penna","prezzo":2.5},{"nome":"Zaino","prezzo":35},{"nome":"Quaderno","prezzo":4}]] valore ──▶ lista [Filter] risultato ──▶ righe [Tabella]
[Campo numerico: prezzo massimo] valore ──▶ valore (facoltativo)
```

Con **Tieni gli elementi** «a ≤ b» e **Campo** `prezzo`: scrivendo 5 nel campo numerico la [Tabella](ui.table) mostra Penna e Quaderno; scrivendo 40, tutti e tre. Prima che l'utente scriva, b è il testo dell'impostazione **Valore** (vuoto): nessun prezzo è ≤ di un testo vuoto e la tabella resta vuota. Metti `10` in **Valore** per partire con un limite.

### 3. Cercare un pezzo di testo

```
[Costante · Variabile (JSON): ["mela","pera","melone","Melagrana"]] valore ──▶ lista [Filter: contiene] risultato ──▶ voci [Elenco]
[Campo di testo: cerca]                                testo  ──▶ valore (facoltativo)
```

Scrivendo `mel` l'[Elenco](ui.list) mostra `mela` e `melone` (non `Melagrana`, che ha la M maiuscola).

### 4. Togliere un valore

Con «a ≠ b» e Valore `rosso`, la lista `["rosso","verde","rosso","blu"]` dà `["verde","blu"]` su **risultato** e `["rosso","rosso"]` su **scartati**.

## Errori

| Messaggio | Quando |
|---|---|
| Serve una lista | Il valore su **lista** non è una lista. |

## Vedi anche

- [Map campo](coll.pluck), [Sort](coll.sort), [Distinct](coll.unique), [Includes · IndexOf](coll.contains)
- [Confronto (== ≠ < >)](core.compare) per confrontare due valori soli
- [Come funziona un blocco](ide/blocks)
