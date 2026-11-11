# Funzioni stringa

`core.text` · Testo · [Blocchi di base](logicstudio-core) · versione 1

Fa un'operazione su un testo: lo mette in maiuscolo o minuscolo, toglie gli spazi ai lati, ne conta la lunghezza, controlla se contiene una parola, sostituisce una parola con un'altra.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **testo** (`text`) | testo | Il testo su cui lavorare. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | qualsiasi | Un testo, un numero (per **lunghezza**) o un sì/no (per **contiene**). |
| **Exception** (`error`) | oggetto | In pratica questo blocco non manda mai niente qui. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Operazione** (`op`) | MAIUSCOLO, minuscolo, togli gli spazi ai lati, lunghezza, contiene, sostituisci | MAIUSCOLO | L'operazione da fare (vedi sotto). |
| **Cerca** (`find`) | un testo | vuoto | Il testo da cercare. Si vede solo con **contiene** e **sostituisci**. |
| **Sostituisci con** (`with`) | un testo | vuoto | Il testo da mettere al suo posto. Si vede solo con **sostituisci**. |

Le operazioni:

| Operazione | risultato | Esempio |
|---|---|---|
| **MAIUSCOLO** (`upper`) | testo | `Ciao è` → `CIAO È`; `straße` → `STRASSE` |
| **minuscolo** (`lower`) | testo | `CIAO È` → `ciao è` |
| **togli gli spazi ai lati** (`trim`) | testo | `"  ciao mondo  "` → `"ciao mondo"` (gli spazi in mezzo restano) |
| **lunghezza** (`length`) | numero | `ciao` → 4; `""` → 0 |
| **contiene** (`contains`) | sì/no | con Cerca `mondo`: `Ciao mondo` → sì |
| **sostituisci** (`replace`) | testo | con Cerca `-` e Sostituisci con `/`: `2026-11-11` → `2026/11/11` |

## Come funziona

A ogni valore che arriva, il blocco lo scrive come testo, fa l'operazione e manda il risultato su **risultato**.

Il valore viene prima scritto come testo: un numero con il punto (2,5 → `2.5`, quindi la sua **lunghezza** è 3), sì/no come `true`/`false`, `null` come testo vuoto, oggetti e liste come JSON (la lista `[1,2,3]` diventa `[1,2,3]`, lunga **7**, non 3; per il numero di elementi usa [Length](coll.length)).

Dettagli di ogni operazione:

- **MAIUSCOLO** e **minuscolo** valgono anche per le lettere accentate e di altri alfabeti. Alcune lettere cambiano lunghezza: `ß` diventa `SS`.
- **togli gli spazi ai lati** toglie all'inizio e alla fine spazi, tabulazioni, «a capo» e spazi speciali (come lo spazio non separabile).
- **lunghezza** conta le unità del testo come le conta il computer: le lettere normali, accentate comprese, valgono 1, ma molte emoji valgono **2** (`😀` → 2).
- **contiene** cerca **esattamente** il testo di **Cerca**: le maiuscole contano (`Mondo` non trova `mondo`). Con **Cerca** vuoto il risultato è sempre **sì**.
- **sostituisci** sostituisce **tutte** le volte che **Cerca** compare, esattamente com'è scritto (maiuscole comprese, senza caratteri speciali o «jolly»): con Cerca `.` e Sostituisci con vuoto, `a.b.c` → `abc`.
- **sostituisci** con **Cerca** vuoto mette **Sostituisci con** tra ogni lettera: con Sostituisci con `-`, `abc` → `a-b-c`.
- **Cerca** e **Sostituisci con** si scrivono in un campo di una riga: non puoi cercare un «a capo».

Per non badare alle maiuscole in **contiene** o in un blocco [Confronto (== ≠ < >)](core.compare), metti prima un blocco [Funzioni stringa](core.text) con **minuscolo** e scrivi **Cerca** in minuscolo.

## Esempi

### 1. Ripulire quello che scrive l'utente

```
[Campo di testo: codice] testo ──▶ testo [Funzioni stringa: togli gli spazi ai lati] risultato ──▶ testo [Funzioni stringa: MAIUSCOLO] risultato ──▶ valore [Print (console.log)]
```

`"  ab123 "` → `"ab123"` → `"AB123"`.

### 2. Controllare una parola

Operazione **contiene**, Cerca `errore`:

```
[readFile: registro.txt] contenuto ──▶ testo [Funzioni stringa: contiene] risultato ──▶ condizione [If · Else]
```

Se il file contiene `... errore di rete ...` il risultato è **sì**; se contiene `Errore` (con la maiuscola), è **no**.

### 3. Un numero con la virgola

```
[Funzioni Math: arrotonda, 2 decimali] risultato ──▶ testo [Funzioni stringa: sostituisci] risultato ──▶ testo [Etichetta: prezzo]
```

Cerca `.`, Sostituisci con `,`: il numero 12,75 arriva come `12.75` e diventa `12,75`.

### 4. Lunghezza minima di una password

Operazione **lunghezza**, poi un blocco [Confronto (== ≠ < >)](core.compare) `a ≥ b` con **b** = 8: `segreto` (7) → **no**; `segreto1` (8) → **sì**.

## Errori

Questo blocco non ha errori suoi.

## Vedi anche

- [Template (formatta)](core.format) e [Concat testo](core.concat) per costruire testi
- [Split](coll.split) per spezzare un testo in una lista
- [Switch · Case](core.switch) per riconoscere un testo tra molti
- [Cast (converti tipo)](core.convert) per trasformare un testo in numero
- [Come funziona un blocco](ide/blocks)
