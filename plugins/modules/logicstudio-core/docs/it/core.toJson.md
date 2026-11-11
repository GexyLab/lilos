# Cast in testo JSON (JSON.stringify)

`core.toJson` · Valori · [Blocchi di base](logicstudio-core) · versione 1

Scrive un valore come testo JSON.

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

Scrive il valore come testo JSON: `"ciao"` → `"\"ciao\""` (con le virgolette), 5 → `"5"`, `{ "a": 1 }` → `"{\"a\":1}"`, `null` → `"null"`. NaN e infinito diventano `"null"`.

## Esempi

### 1. Salvare un oggetto come testo

```
[Oggetto { }] oggetto ──▶ valore [Cast in testo JSON (JSON.stringify)] risultato ──▶ contenuto [writeFile]
```

L'oggetto `{ nome: "Ada", anni: 36 }` diventa il testo `{"nome":"Ada","anni":36}`.

### 2. Un testo con le virgolette

Il testo `ciao` diventa `"ciao"` (con le virgolette): è la forma JSON di un testo.

## Vedi anche

- [Template (formatta)](core.format) per costruire testi
- [Cast in numero (Number())](core.toNumber)
- [Cast in testo (String())](core.toText)
- [Cast in sì/no (Boolean())](core.toBool)
- [Cast da testo JSON (JSON.parse)](core.parseJson)
- [Come funziona un blocco](ide/blocks)
