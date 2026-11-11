# Estrai campo

`coll.pluck` · Liste · [Liste e matrici](logicstudio-collections) · versione 1

Da una lista di oggetti fa la lista dei valori di un loro campo.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **lista** (`list`) | lista | La lista, di solito di oggetti. Non viene cambiata. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | lista | Per ogni elemento, il valore del campo; `null` se l'elemento non ce l'ha. Ha la stessa lunghezza della lista. |
| **Eccezione** (`error`) | oggetto | Lista non valida o campo non indicato. |

## Impostazioni

| Impostazione | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Campo (es. a.b)** (`field`) | un testo | vuoto | Il campo da prendere. Obbligatorio. |

## Come funziona

A ogni lista che arriva il blocco prende da ogni elemento il valore del **Campo** e manda la lista di questi valori, nello stesso ordine.

Come si scrive il campo:

- `nome` prende il campo `nome` dell'oggetto;
- `indirizzo.città` prende il campo `città` dentro il campo `indirizzo` (ogni punto scende di un livello);
- un numero prende un elemento di una lista: `1` sulla lista di righe `[[1,2],[3,4]]` dà `[2,4]` (la seconda colonna). Per le matrici c'è anche [Leggi colonna](coll.matCol);
- non c'è modo di indicare un campo che ha un punto nel nome.

Casi da sapere:

- Se un elemento non ha il campo, o non è un oggetto (un numero, un testo, `null`), al suo posto c'è `null`: il risultato ha **sempre la stessa lunghezza** della lista.
- I valori «vuoti» restano come sono: `0`, `false`, `""` non diventano `null`.
- Se il campo è un oggetto o una lista, va nel risultato intero.
- Con **Campo** vuoto esce «Indica il campo da estrarre», anche se la lista è vuota.

## Esempi

### 1. I nomi

```
[Valore (JSON): [{"nome":"Anna","età":31},{"nome":"Bruno","età":27}]] valore ──▶ lista [Estrai campo: nome] risultato ──▶ valore [Scrivi in console]
```

Scrive `["Anna","Bruno"]`. Con **Campo** `età`: `[31,27]`.

### 2. Un campo che manca e un campo annidato

Sulla lista `[{"a":{"c":3}}, 5, null, {"a":{}}]` il campo `a.c` dà `[3, null, null, null]`.

### 3. La media dei prezzi

```
[Valore (JSON): [{"p":2},{"p":4},{"p":9}]] valore ──▶ lista [Estrai campo: p] risultato ──▶ lista [Somma · Minimo · Massimo · Media: media] risultato ──▶ valore [Valore mostrato]
```

Mostra 5. Lo stesso risultato si ha anche senza Estrai campo, mettendo **Campo** `p` direttamente nel blocco [Somma · Minimo · Massimo · Media](coll.stat).

### 4. Testo da una lista di oggetti

```
[Filtra] risultato ──▶ lista [Estrai campo: nome] risultato ──▶ lista [Unisci in testo] testo ──▶ testo [Pulsante]
```

Il [Pulsante](ui.button) mostra per esempio «Penna, Quaderno».

## Errori

| Messaggio | Quando |
|---|---|
| Serve una lista | Il valore su **lista** non è una lista. |
| Indica il campo da estrarre | L'impostazione **Campo** è vuota. |

## Vedi anche

- [Prendi campo](core.get) per un campo di un oggetto solo
- [Filtra](coll.filter), [Ordina](coll.sort), [Unici](coll.unique) (hanno anche loro un **Campo**)
- [Leggi colonna](coll.matCol)
- [Come funziona un blocco](ide/blocks)
