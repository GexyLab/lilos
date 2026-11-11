# Random

`coll.random` · Liste · [Liste e matrici](logicstudio-collections) · versione 1

Sceglie a caso un elemento della lista e manda l'elemento e la sua posizione.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **lista** (`list`) | lista | La lista da cui scegliere. |
| **estrai** (`pick`) | impulso | Fa una nuova estrazione dall'ultima lista arrivata. Qualsiasi valore arrivi qui vale come impulso. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **elemento** (`item`) | qualsiasi | L'elemento estratto. |
| **indice** (`index`) | numero | La sua posizione (da 0). |
| **Eccezione** (`error`) | oggetto | Lista non valida o vuota. |

## Come funziona

Il blocco fa un'estrazione **ogni volta che gira**: sia quando arriva un impulso su **estrai**, sia quando arriva una lista nuova su **lista** (tutti e due gli ingressi «lo avviano»).

- Ogni elemento ha la stessa probabilità di uscire. Le estrazioni sono indipendenti: lo stesso elemento può uscire più volte di fila. Per estrarre senza ripetizioni, togli l'elemento estratto con [Rimuovi (splice)](coll.removeAt) usando l'**indice**.
- Un impulso su **estrai** prima che sia arrivata una lista **non fa niente** (nessun errore).
- Una lista vuota dà l'errore «Lista vuota».
- Un elemento `null` può essere estratto: esce `null`.
- Il caso non è adatto a usi di sicurezza (password, codici segreti): va bene per giochi, prove e scelte qualsiasi.

Se vuoi estrarre **solo** con l'impulso, togli «lo avvia» da **lista**: così una lista nuova viene solo ricordata.

## Esempi

### 1. Chi offre il caffè

```
[Costante · Variabile (JSON): ["Anna","Bruno","Carla"]] valore ──▶ lista [Random (lista non avvia)] elemento ──▶ valore [Valore mostrato]
[Pulsante: Estrai]                        premuto ──▶ estrai
```

A ogni clic il [Valore mostrato](ui.value) indica uno dei tre nomi, per esempio «Carla», e **indice** vale 2.

### 2. Un dado

```
[Costante · Variabile: 6] valore ──▶ a [Range (da = 1)] risultato ──▶ lista [Random] elemento ──▶ valore [Print (console.log)]
[Intervallo (setInterval): 2 secondi] impulso ──▶ estrai
```

[Range](coll.range) fa `[1, 2, 3, 4, 5, 6]`; ogni 2 secondi la console scrive un numero da 1 a 6 (e una volta subito, quando arriva la lista, perché **lista** «lo avvia»).

### 3. Lista vuota

Con la lista `[]` ogni estrazione dà, nella console principale, «Random: Lista vuota».

## Errori

| Messaggio | Quando |
|---|---|
| Serve una lista | Il valore su **lista** non è una lista. |
| Lista vuota | La lista non ha elementi. |

## Vedi anche

- [Leggi lista[i]](coll.get), [Rimuovi (splice)](coll.removeAt), [Range](coll.range)
- [Funzioni Math](core.math)
- [Come funziona un blocco](ide/blocks)
