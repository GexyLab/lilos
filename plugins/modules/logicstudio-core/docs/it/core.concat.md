# Concat testo

`core.concat` · Testo · [Blocchi di base](logicstudio-core) · versione 1

Unisce due o più testi uno dopo l'altro, con un separatore a scelta tra uno e l'altro.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **a** | testo | Il primo pezzo. |
| **b** | testo | Il secondo pezzo. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **testo** (`text`) | testo | I pezzi uniti. |
| **Eccezione** (`error`) | oggetto | In pratica questo blocco non manda mai niente qui. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Separatore** (`separator`) | un testo (fino a 2000 caratteri) | vuoto | Il testo messo **tra** un pezzo e l'altro (non all'inizio né alla fine). Vuoto: i pezzi vengono attaccati. |

## Porte aggiuntive

Nelle **Proprietà**, sezione **Porte**, puoi aggiungere fino a 16 ingressi in più (meno, se un amministratore ha abbassato il limite delle porte aggiunte), di tipo testo, chiamati con le lettere che seguono: **c**, **d**, **e**… fino a **r**. Si vedono in corsivo sul blocco. I pezzi vengono uniti nell'ordine **a**, **b**, poi gli ingressi aggiunti dall'alto. Vedi [Come funziona un blocco](ide/blocks).

## Come funziona

Ogni volta che arriva un valore su un ingresso, il blocco prende l'ultimo valore di ogni ingresso, li scrive come testo e li unisce con il **Separatore**. Manda il risultato su **testo**.

- Gli ingressi che non hanno ancora ricevuto niente vengono **saltati**, separatore compreso: con il separatore `, `, solo **a** = `uno` e **c** = 3 danno `uno, 3`.
- Un ingresso che ha ricevuto `null` **non** viene saltato: vale testo vuoto, e il separatore compare lo stesso: `uno, , 3`.
- Come vengono scritti i valori:

| Valore | Scritto come |
|---|---|
| un testo | così com'è (spazi compresi) |
| un numero | con il punto: 2,5 → `2.5` |
| sì / no | `true` / `false` |
| `null` | testo vuoto |
| un oggetto o una lista | JSON compatto: `[1,"x"]` |

- Il separatore si scrive in un campo di una riga: puoi usare spazi, virgole, trattini, ma non un «a capo» o una tabulazione.

## Esempi

### 1. Nome e cognome

Separatore: uno spazio.

```
[Campo di testo: nome]    testo ──▶ a [Concat testo] testo ──▶ testo [Etichetta: nome completo]
[Campo di testo: cognome] testo ──▶ b
```

`Ada` e `Lovelace` → `Ada Lovelace`. Finché l'utente non scrive il cognome, l'[Etichetta](ui.label) mostra solo `Ada`.

### 2. Un percorso di file

Separatore `/`, valori `~`, `Documenti`, `note.txt` (con l'ingresso **c**) → `~/Documenti/note.txt`.

### 3. Una riga CSV

Separatore `;`, ingressi **c** e **d** aggiunti: `Rossi`, 42, `true`, 3,5 → `Rossi;42;true;3.5`. Attenzione: i numeri escono con il punto, e un testo che contiene `;` non viene messo tra virgolette.

## Errori

Questo blocco non ha errori suoi.

## Vedi anche

- [Template (formatta)](core.format) per un testo con i valori dentro un modello
- [Join](coll.join) per unire gli elementi di una lista
- [Split](coll.split) per l'operazione opposta
- [Funzioni stringa](core.text)
- [Come funziona un blocco](ide/blocks)
