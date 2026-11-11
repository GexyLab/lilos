# Cast in testo (String())

`core.toText` · Valori · [Blocchi di base](logicstudio-core) · versione 1

Trasforma un valore in testo.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | qualsiasi | Il valore da convertire. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | testo | Il valore convertito. |
| **Exception** (`error`) | oggetto | Non esce mai errore: ogni valore si può convertire. |

## Come funziona

A ogni valore che arriva, il blocco lo converte e manda il risultato su **risultato**.

| Valore che arriva | Risultato |
|---|---|
| un testo | lo stesso testo |
| un numero | il numero scritto con il punto: 2,5 → `"2.5"`; 1000000 → `"1000000"` |
| sì / no | `"true"` / `"false"` |
| `null` | `""` (testo vuoto) |
| un oggetto o una lista | il JSON compatto: `{"a":1}`, `[1,2]` |

## Esempi

### 1. Un numero dentro una frase

```
[Campo numerico: quantità] valore ──▶ valore [Cast in testo (String())] risultato ──▶ b [Concat testo]
```

Con la quantità 2,5 il blocco manda il testo `2.5` (con il punto), pronto da unire ad altri testi.

### 2. Un oggetto da guardare

```
[Oggetto { }] oggetto ──▶ valore [Cast in testo (String())] risultato ──▶ valore [Print (console.log)]
```

L'oggetto `{ nome: "Ada" }` diventa il testo `{"nome":"Ada"}`.

## Vedi anche

- [Template (formatta)](core.format) e [Concat testo](core.concat) per costruire testi
- [Funzioni stringa](core.text)
- [Cast in numero (Number())](core.toNumber)
- [Cast in sì/no (Boolean())](core.toBool)
- [Cast in testo JSON (JSON.stringify)](core.toJson)
- [Cast da testo JSON (JSON.parse)](core.parseJson)
- [Come funziona un blocco](ide/blocks)
