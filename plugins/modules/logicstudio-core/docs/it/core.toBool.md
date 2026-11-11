# Cast in sì/no (Boolean())

`core.toBool` · Valori · [Blocchi di base](logicstudio-core) · versione 1

Trasforma un valore in sì/no.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | qualsiasi | Il valore da convertire. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | sì/no | Il valore convertito. |
| **Exception** (`error`) | oggetto | Non esce mai errore: ogni valore si può convertire. |

## Come funziona

A ogni valore che arriva, il blocco lo converte e manda il risultato su **risultato**.

| Valore che arriva | Risultato |
|---|---|
| un testo | **no** se, tolti gli spazi e senza badare alle maiuscole, è vuoto, `0`, `false`, `no` o `off`; **sì** in tutti gli altri casi (anche `"falso"` e `"0.0"`) |
| un numero | **no** se è 0 (o NaN), **sì** altrimenti |
| `null` | **no** |
| un oggetto o una lista | **sì**, anche se vuoti |

## Esempi

### 1. Un sì/no da un testo

`"on"` → sì, `"OFF"` → no, `" no "` → no, `"1"` → sì, `"falso"` → **sì** (la parola italiana non è riconosciuta).

### 2. Nascondere una componente da un file

```
[readFile: stato.txt] contenuto ──▶ valore [Cast in sì/no (Boolean())] risultato ──▶ visibile [Componente]
```

Se il file contiene `false`, il testo diventa **no** e la componente si nasconde; senza il cast il testo `"false"` non la nasconderebbe.

## Vedi anche

- [NOT](core.not) per rovesciare un sì/no
- [Costante · Variabile](core.value) per un valore fisso di un tipo scelto
- [Cast in numero (Number())](core.toNumber)
- [Cast in testo (String())](core.toText)
- [Cast in testo JSON (JSON.stringify)](core.toJson)
- [Cast da testo JSON (JSON.parse)](core.parseJson)
- [Come funziona un blocco](ide/blocks)
