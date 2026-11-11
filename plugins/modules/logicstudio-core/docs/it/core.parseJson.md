# Cast da testo JSON (JSON.parse)

`core.parseJson` · Valori · [Blocchi di base](logicstudio-core) · versione 1

Legge un testo JSON e manda il valore che descrive (oggetto, lista, numero, testo o sì/no).

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | qualsiasi | Il valore da convertire. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | qualsiasi | Il valore convertito. |
| **Exception** (`error`) | oggetto | Quando il testo non è JSON valido. |

## Come funziona

A ogni valore che arriva, il blocco lo converte e manda il risultato su **risultato**.

Legge un testo JSON e manda il valore che descrive: `'{"x":[1,2]}'` → l'oggetto con la lista; `'[1,2,3]'` → la lista; `'42'` → il numero 42; `'true'` → sì.

- Se arriva un numero o un sì/no, viene prima scritto come testo: 5 → 5.
- Se arriva un oggetto o una lista, il risultato è una copia uguale.
- Un testo vuoto o `null` danno errore (`Unexpected end of JSON input`).
- Un testo che non è JSON (`abc`, `{a:1}`, `{'a':1}`) dà errore, con il messaggio del lettore JSON in inglese.

Quando la conversione non riesce, il blocco non manda niente su **risultato** e manda il messaggio su **Exception**. Vedi [Come funziona un blocco](ide/blocks).

## Esempi

### 1. Leggere il contenuto di un file JSON

```
[readFile: dati.json] contenuto ──▶ valore [Cast da testo JSON (JSON.parse)] risultato ──▶ oggetto [Get proprietà (obj.campo): utenti.0.nome]
```

Se il file contiene `{"utenti":[{"nome":"Ada"}]}`, [Get proprietà (obj.campo)](core.get) manda `Ada`.

### 2. Gestire un testo che non è JSON

```
[Campo di testo] testo ──▶ valore [Cast da testo JSON (JSON.parse)] risultato ──▶ valore [Print (console.log)]
                                                    Exception ──▶ valore [Print (console.log)]
```

Se l'utente scrive `{"a":1}` esce l'oggetto; se scrive `{a:1}` non esce niente su **risultato** e la console riceve il messaggio d'errore.

## Errori

| Messaggio | Quando |
|---|---|
| Unexpected end of JSON input | Il testo è vuoto (o `null`). |
| Altri messaggi del lettore JSON, in inglese (per esempio `Unexpected token 'a', "abc" is not valid JSON`) | Il testo non è JSON valido. |

## Vedi anche

- [Get proprietà (obj.campo)](core.get)
- [Scomponi](core.decompose)
- [Cast in numero (Number())](core.toNumber)
- [Cast in testo (String())](core.toText)
- [Cast in sì/no (Boolean())](core.toBool)
- [Cast in testo JSON (JSON.stringify)](core.toJson)
- [Come funziona un blocco](ide/blocks)
