# Cast (converti tipo)

`core.convert` · Valori · [Blocchi di base](logicstudio-core) · versione 1

Cambia il tipo di un valore: in numero, in testo, in sì/no, in testo JSON, oppure da testo JSON a oggetto o lista.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | qualsiasi | Il valore da convertire. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | qualsiasi | Il valore convertito. |
| **Eccezione** (`error`) | oggetto | Quando la conversione non è possibile (in **numero** o **da testo JSON**). |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **In** (`to`) | numero, testo, sì/no, testo JSON, da testo JSON | numero | In cosa convertire (vedi sotto). |

## Come funziona

A ogni valore che arriva, il blocco lo converte e manda il risultato su **risultato**.

### In numero

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

### In testo

| Valore che arriva | Risultato |
|---|---|
| un testo | lo stesso testo |
| un numero | il numero scritto con il punto: 2,5 → `"2.5"`; 1000000 → `"1000000"` |
| sì / no | `"true"` / `"false"` |
| `null` | `""` (testo vuoto) |
| un oggetto o una lista | il JSON compatto: `{"a":1}`, `[1,2]` |

### In sì/no

| Valore che arriva | Risultato |
|---|---|
| un testo | **no** se, tolti gli spazi e senza badare alle maiuscole, è vuoto, `0`, `false`, `no` o `off`; **sì** in tutti gli altri casi (anche `"falso"` e `"0.0"`) |
| un numero | **no** se è 0 (o NaN), **sì** altrimenti |
| `null` | **no** |
| un oggetto o una lista | **sì**, anche se vuoti |

### In testo JSON

Scrive il valore come testo JSON: `"ciao"` → `"\"ciao\""` (con le virgolette), 5 → `"5"`, `{ "a": 1 }` → `"{\"a\":1}"`, `null` → `"null"`. NaN e infinito diventano `"null"`.

### Da testo JSON

Legge un testo JSON e manda il valore che descrive: `'{"x":[1,2]}'` → l'oggetto con la lista; `'[1,2,3]'` → la lista; `'42'` → il numero 42; `'true'` → sì.

- Se arriva un numero o un sì/no, viene prima scritto come testo: 5 → 5.
- Se arriva un oggetto o una lista, il risultato è una copia uguale.
- Un testo vuoto o `null` danno errore (`Unexpected end of JSON input`).
- Un testo che non è JSON (`abc`, `{a:1}`, `{'a':1}`) dà errore, con il messaggio del lettore JSON in inglese.

Quando la conversione non riesce, il blocco non manda niente su **risultato** e manda il messaggio su **Eccezione**. Vedi [Come funziona un blocco](ide/blocks).

## Esempi

### 1. Un numero da un campo di testo

```
[Campo di testo: età] testo ──▶ valore [Cast (converti tipo): In numero] risultato ──▶ a [Confronto (== ≠ < >): a ≥ b]
                                                              Eccezione ──▶ valore [Print (console.log)]
```

Se l'utente scrive `18`, arriva il numero 18 e il confronto funziona come un confronto tra numeri. Se scrive `diciotto`, la console scrive `Non è un numero` (con il nome del blocco).

### 2. Leggere il contenuto di un file JSON

```
[readFile: dati.json] contenuto ──▶ valore [Cast (converti tipo): da testo JSON] risultato ──▶ oggetto [Get proprietà (obj.campo): utenti.0.nome]
```

Se il file contiene `{"utenti":[{"nome":"Ada"}]}`, [Get proprietà (obj.campo)](core.get) manda `Ada`.

### 3. Salvare un oggetto come testo

```
[Oggetto { }] oggetto ──▶ valore [Cast (converti tipo): testo JSON] risultato ──▶ contenuto [writeFile]
```

L'oggetto `{ nome: "Ada", anni: 36 }` diventa il testo `{"nome":"Ada","anni":36}`.

### 4. Un sì/no da un testo

Con **In: sì/no**: `"on"` → sì, `"OFF"` → no, `" no "` → no, `"1"` → sì, `"falso"` → **sì** (la parola italiana non è riconosciuta).

## Errori

| Messaggio | Quando |
|---|---|
| Non è un numero | **In numero** e il valore non si può leggere come numero. |
| Unexpected end of JSON input | **Da testo JSON** e il testo è vuoto (o `null`). |
| Altri messaggi del lettore JSON, in inglese (per esempio `Unexpected token 'a', "abc" is not valid JSON`) | **Da testo JSON** e il testo non è JSON valido. |

## Vedi anche

- [Costante · Variabile](core.value) per un valore fisso di un tipo scelto
- [Template (formatta)](core.format) e [Concat testo](core.concat) per costruire testi
- [Funzioni stringa](core.text)
- [Come funziona un blocco](ide/blocks)
