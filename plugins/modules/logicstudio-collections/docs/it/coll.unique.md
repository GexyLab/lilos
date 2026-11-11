# Unici

`coll.unique` · Liste · [Liste e matrici](logicstudio-collections) · versione 1

Toglie i doppioni: di ogni valore tiene solo il primo.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **lista** (`list`) | lista | La lista da cui togliere i doppioni. Non viene cambiata. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | lista | La lista senza doppioni, nell'ordine di partenza. |
| **Eccezione** (`error`) | oggetto | Quando il valore su **lista** non è una lista. |

## Impostazioni

| Impostazione | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Campo (facoltativo, es. a.b)** (`field`) | un testo | vuoto | Se la lista ha oggetti, due elementi sono doppioni quando hanno **questo campo** uguale. Vuoto: devono essere uguali per intero. |

## Come funziona

A ogni lista che arriva il blocco la scorre dall'inizio: un elemento resta se il suo valore non era già comparso prima, altrimenti viene tolto. L'ordine non cambia e di ogni valore resta **il primo**.

Quando due valori sono uguali:

- devono avere lo **stesso tipo**: `1` e `"1"` sono diversi, e restano tutti e due; `null` e `"null"` sono diversi;
- liste e oggetti sono uguali se hanno lo stesso contenuto (scritto come JSON): `{"a":1}` e `{"a":1}` sono doppioni, ma `{"a":1,"b":2}` e `{"b":2,"a":1}` no, perché i campi sono in un altro ordine;
- maiuscole e minuscole contano: `"Roma"` e `"roma"` restano tutti e due.

Con un **Campo**:

- conta solo il valore del campo; l'elemento che resta è il primo intero con quel valore: `[{"n":"x","c":1},{"n":"y","c":1},{"n":"z","c":2}]` con campo `c` dà `[{"n":"x","c":1},{"n":"z","c":2}]`;
- **gli elementi senza quel campo sono tutti doppioni tra loro**: ne resta solo il primo. Con campo `a`, `[{"a":1},{"b":1},{"c":1}]` dà `[{"a":1},{"b":1}]` (`{"c":1}` sparisce perché, come `{"b":1}`, non ha `a`).

Una lista vuota dà `[]`.

## Esempi

### 1. Numeri e testi

```
[Valore (JSON): [1,"1",1,2,2]] valore ──▶ lista [Unici] risultato ──▶ valore [Scrivi in console]
```

Scrive `[1,"1",2]`.

### 2. Le città dei clienti

```
[Valore (JSON): [{"nome":"Anna","città":"Roma"},{"nome":"Bruno","città":"Milano"},{"nome":"Carla","città":"Roma"}]] valore ──▶ lista [Estrai campo: città] risultato ──▶ lista [Unici] risultato ──▶ valore [Scrivi in console]
```

Scrive `["Roma","Milano"]`. Senza [Estrai campo](coll.pluck), con **Campo** `città` sull'Unici, avresti invece i clienti (Anna e Bruno), uno per città.

### 3. Valori nuovi da una lettura continua

```
[Accumula (massimo 1000)] lista ──▶ lista [Unici] risultato ──▶ lista [Lunghezza] lunghezza ──▶ valore [Valore mostrato: valori diversi]
```

Mostra quanti valori diversi sono arrivati finora (fra gli ultimi 1000).

## Errori

| Messaggio | Quando |
|---|---|
| Serve una lista | Il valore su **lista** non è una lista. |

## Vedi anche

- [Contiene · Posizione](coll.contains), [Filtra](coll.filter), [Ordina](coll.sort), [Estrai campo](coll.pluck)
- [Come funziona un blocco](ide/blocks)
