# Cast in numero (Number())

`core.toNumber` · Valori · [Blocchi di base](logicstudio-core) · versione 1

Trasforma un valore in numero.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | qualsiasi | Il valore da convertire. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | numero | Il valore convertito. |
| **Exception** (`error`) | oggetto | Quando il valore non si può leggere come numero. |

## Come funziona

A ogni valore che arriva, il blocco lo converte e manda il risultato su **risultato**.

| Valore che arriva | Risultato |
|---|---|
| un numero | lo stesso numero |
| sì / no | 1 / 0 |
| un testo con un numero | il numero; gli spazi ai lati non contano e la **prima** virgola vale come punto: `" 7 "` → 7, `"2,5"` → 2,5, `"1e3"` → 1000, `"0x10"` → 16, `"Infinity"` → infinito |
| un testo vuoto o di soli spazi | 0 |
| `null` | 0 |
| una lista | i suoi elementi uniti da virgole e letti come testo: `[]` → 0, `[5]` → 5, ma `[1,2]` → 1,2 |
| un testo che non è un numero (`"abc"`, `"1.234,5"`, `"12 kg"`) | errore «Non è un numero» |
| un oggetto | errore «Non è un numero» |

Quando la conversione non riesce, il blocco non manda niente su **risultato** e manda il messaggio su **Exception**. Vedi [Come funziona un blocco](ide/blocks).

## Esempi

### 1. Un numero da un campo di testo

```
[Campo di testo: età] testo ──▶ valore [Cast in numero (Number())] risultato ──▶ a [Confronto (== ≠ < >): a ≥ b]
                                                     Exception ──▶ valore [Print (console.log)]
```

Se l'utente scrive `18`, arriva il numero 18 e il confronto funziona come un confronto tra numeri. Se scrive `diciotto`, la console scrive `Non è un numero` (con il nome del blocco).

### 2. Un numero da Redis

```
[Redis get: visite] valore ──▶ valore [Cast in numero (Number())] risultato ──▶ valore [Valore]
```

Redis manda il testo `1204`: dopo il cast arriva il numero 1204.

## Errori

| Messaggio | Quando |
|---|---|
| Non è un numero | Il valore non si può leggere come numero. |

## Vedi anche

- [Costante · Variabile](core.value) per un valore fisso di un tipo scelto
- [Confronto (== ≠ < >)](core.compare)
- [Cast in testo (String())](core.toText)
- [Cast in sì/no (Boolean())](core.toBool)
- [Cast in testo JSON (JSON.stringify)](core.toJson)
- [Cast da testo JSON (JSON.parse)](core.parseJson)
- [Come funziona un blocco](ide/blocks)
