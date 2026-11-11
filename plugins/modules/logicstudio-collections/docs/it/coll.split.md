# Dividi testo

`coll.split` · Liste · [Liste e matrici](logicstudio-collections) · versione 1

Taglia un testo in pezzi a ogni separatore e manda la lista dei pezzi.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **testo** (`text`) | testo | Il testo da dividere. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | lista | I pezzi, come testi, nell'ordine in cui stanno nel testo. |
| **Eccezione** (`error`) | oggetto | Quando i pezzi sarebbero più di 100000. |

## Impostazioni

| Impostazione | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Separatore (\n = a capo)** (`separator`) | un testo | `,` | Dove tagliare. `\n` vuol dire «a capo», `\t` una tabulazione, `\r` il ritorno a capo. Vuoto: un pezzo per ogni carattere. |
| **Togli gli spazi ai lati** (`trim`) | acceso, spento | acceso | Acceso: toglie spazi, tabulazioni e a capo all'inizio e alla fine di ogni pezzo. |

## Come funziona

A ogni testo che arriva il blocco lo taglia dove trova il separatore e manda la lista dei pezzi.

- Il separatore è un **testo esatto**, non un modello: `;` taglia solo ai punti e virgola, `, ` (virgola e spazio) solo dove ci sono tutti e due. Maiuscole e minuscole contano: `x` non taglia alla `X`.
- Il separatore non resta nei pezzi.
- Due separatori di fila danno un pezzo **vuoto**: `"a,,b,"` dà `["a", "", "b", ""]` (anche l'ultimo, dopo la virgola finale). Per toglierli usa [Filtra](coll.filter) con «a ≠ b» e Valore vuoto.
- Un testo vuoto dà `[""]`, una lista con un testo vuoto (lunghezza 1), non `[]`.
- Un testo senza il separatore dà una lista di un pezzo: `"abc"` con `,` dà `["abc"]`.
- Con **separatore vuoto** ogni carattere è un pezzo: `"abc"` dà `["a", "b", "c"]`. Alcuni simboli, come molte emoji, sono fatti di due caratteri e vengono spezzati.
- Si possono scrivere `\n`, `\t`, `\r` anche insieme ad altro (per esempio `;\n`). Non c'è modo di indicare il testo `\n` alla lettera.
- Un testo con a capo «di Windows» (`\r\n`) tagliato con `\n` lascia un `\r` alla fine di ogni pezzo: con **Togli gli spazi ai lati** acceso sparisce, spento resta.
- Se arriva un valore che non è un testo, viene prima scritto come testo: un numero `12.5` con separatore `.` dà `["12", "5"]`; una lista o un oggetto diventano il loro JSON (`[1,2]` con `,` dà `["[1", "2]"]`); `null` è un testo vuoto.
- I pezzi sono **sempre testi**: `"1,2,3"` dà `["1", "2", "3"]`, non numeri. I blocchi come [Somma · Minimo · Massimo · Media](coll.stat) e [Ordina](coll.sort) li leggono comunque come numeri.

## Esempi

### 1. Una lista scritta con le virgole

```
[Valore (testo): mele, pere ,uva] valore ──▶ testo [Dividi testo] risultato ──▶ valore [Scrivi in console]
```

Scrive `["mele","pere","uva"]`. Con **Togli gli spazi ai lati** spento: `["mele"," pere ","uva"]`.

### 2. Una riga per voce

```
[Campo di testo] testo ──▶ testo [Dividi testo: \n] risultato ──▶ voci [Elenco]
```

Con il **Separatore** `\n` ogni riga del testo diventa una voce dell'[Elenco](ui.list).

### 3. Voti con la virgola decimale

I voti `7,5; 8; 6` non si possono dividere con la virgola (è anche nei numeri). Usa il separatore `;`:

```
[Valore (testo): 7,5; 8; 6] valore ──▶ testo [Dividi testo: ;] risultato ──▶ lista [Somma · Minimo · Massimo · Media: media] risultato ──▶ valore [Scrivi in console]
```

I pezzi sono `["7,5", "8", "6"]` e la media è 7,1666…

## Errori

| Messaggio | Quando |
|---|---|
| Lista troppo grande (massimo 100000 elementi) | Il testo si dividerebbe in più di 100000 pezzi. |

## Vedi anche

- [Unisci in testo](coll.join), il contrario di questo blocco
- [Operazione sul testo](core.text), [Formatta testo](core.format)
- [Come funziona un blocco](ide/blocks)
