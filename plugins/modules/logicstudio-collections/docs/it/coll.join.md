# Unisci in testo

`coll.join` · Liste · [Liste e matrici](logicstudio-collections) · versione 1

Fa un testo solo con gli elementi di una lista, mettendo un separatore tra l'uno e l'altro.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **lista** (`list`) | lista | La lista da unire. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **testo** (`text`) | testo | Gli elementi scritti uno dopo l'altro, con il separatore in mezzo. |
| **Eccezione** (`error`) | oggetto | Quando il valore su **lista** non è una lista. |

## Impostazioni

| Impostazione | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Separatore (\n = a capo)** (`separator`) | un testo | `, ` (virgola e spazio) | Che cosa mettere tra due elementi. `\n` vuol dire «a capo», `\t` una tabulazione, `\r` il ritorno a capo. Vuoto: gli elementi attaccati. |

## Come funziona

A ogni lista che arriva il blocco scrive ogni elemento come testo e li unisce con il separatore.

Come diventano testo gli elementi:

| Elemento | Testo |
|---|---|
| un testo | così com'è |
| un numero | `12.5` (con il punto) |
| `true`, `false` | `true`, `false` |
| `null` | testo vuoto |
| un oggetto o una lista | il suo JSON, per esempio `{"a":1}` o `[2,3]` |

- Il separatore va solo **tra** gli elementi, non prima del primo né dopo l'ultimo.
- Una lista vuota dà il testo vuoto `""`; una lista di un elemento dà quell'elemento come testo, senza separatore.
- Un testo non è una lista: `"ab"` dà «Serve una lista».

## Esempi

### 1. Con il separatore predefinito

```
[Valore (JSON): ["Anna","Bruno","Carla"]] valore ──▶ lista [Unisci in testo] testo ──▶ valore [Scrivi in console]
```

Scrive `Anna, Bruno, Carla`.

### 2. Tipi diversi

La lista `[1, null, true, {"a":1}, [2,3]]` dà `1, , true, {"a":1}, [2,3]` (il `null` lascia un posto vuoto tra due separatori).

### 3. Una riga per elemento

Con il **Separatore** `\n`:

```
[Filtra] risultato ──▶ lista [Unisci in testo: \n] testo ──▶ valore [Scrivi in console]
```

La console scrive un elemento per riga, in una sola scrittura.

## Errori

| Messaggio | Quando |
|---|---|
| Serve una lista | Il valore su **lista** non è una lista. |

## Vedi anche

- [Dividi testo](coll.split), il contrario di questo blocco
- [Concatena](core.concat), [Formatta testo](core.format)
- [Estrai campo](coll.pluck) per unire solo un campo di ogni oggetto
- [Come funziona un blocco](ide/blocks)
