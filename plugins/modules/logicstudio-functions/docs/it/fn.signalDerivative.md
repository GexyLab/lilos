# Derivata di un segnale (d/dt)

`fn.signalDerivative` · Funzioni · [Funzioni e derivate](logicstudio-functions) · versione 1

La velocità di variazione di un segnale nel tempo: la derivata di una misura che arriva a ogni istante (di quanto cambia al secondo, al minuto o all'ora).

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | numero | Il valore del segnale. A ogni valore il blocco calcola la velocità di variazione. |
| **azzera** (`reset`) | impulso | Un impulso (qualsiasi valore) che fa dimenticare il valore precedente e lo smorzamento. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **t (secondi; altrimenti l'orologio)** (`t`) | numero | Il tempo del valore, in secondi. Se non è collegato si usa l'orologio del sistema. Nascosta di serie: si mostra con l'occhio nelle Proprietà. Non avvia il blocco: tiene il valore finché arriva qualcosa dagli altri ingressi. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **velocità di variazione** (`rate`) | numero | La velocità di variazione: di quanto è cambiato il valore per unità di tempo, nell'unità scelta in **Al**. |
| **Exception** (`error`) | oggetto | L'errore del blocco, con uno dei messaggi della sezione **Errori**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Al** (`per`) | `s` secondo; `min` minuto; `h` ora | `s` | L'unità di tempo della velocità. |
| **Smorzamento (0 = nessuno, 0,9 = forte)** (`smoothing`) | numero (da 0 a 0,99) | 0 | Quanto smorzare il risultato (0 niente, 0,9 molto). |

## Come funziona

A ogni nuovo **valore** il blocco confronta il valore con il precedente: velocità = (valore − valore precedente) / (tempo trascorso), con il tempo nell'unità scelta. Il tempo è quello dell'ingresso **t** (in secondi) se è collegato, altrimenti quello dell'orologio al momento in cui arriva il valore.

- Il **primo valore** non produce niente (manca il precedente). Anche dopo **azzera** il primo valore serve solo a ripartire.
- Se il tempo trascorso è 0 o negativo (due valori con lo stesso tempo) il blocco non manda niente.
- **Smorzamento** α: la velocità inviata è α · (velocità precedente inviata) + (1 − α) · (velocità nuova). Con 0 è la velocità grezza; più è alto, più il segnale è liscio e più la risposta è lenta. Il primo valore smorzato è quello grezzo.
- Solo i valori che arrivano su **valore** fanno uscire un risultato: **t** tiene il suo ultimo valore e non avvia il blocco, e **azzera** cancella soltanto.
- La velocità di variazione è la derivata **numerica** di una serie di misure: con segnali rumorosi serve lo smorzamento. Per la derivata di una funzione scritta come formula usa [Derivata (simbolica)](fn.derivative).

## Esempi

### 1. Metri al secondo

Il valore arriva ogni secondo: 0, 10, 30, 30 (con **Al** secondo):

```
[Costante · Variabile: 0] valore ──▶ valore [Derivata di un segnale (d/dt)] velocità di variazione ──▶ valore [Print (console.log)]
```

Il primo valore non scrive niente; poi scrive `10`, `20`, `0`.

### 2. Al minuto

Valori 0, 1, 3 a un secondo di distanza, con **Al** minuto: `60` e `120`.

### 3. Smorzato

Valori 0, 10, 30 a un secondo di distanza, **Smorzamento** 0,5: `10` e poi `15` (0,5 · 10 + 0,5 · 20).

### 4. Con il tempo dall'esterno

Collega **t** a un tempo in secondi (0, poi 2): valori 0 e 10 danno `5`. Un altro valore con lo stesso tempo (2) non manda niente.

### 5. Azzera

Valori 0, 10 (velocità `10`), impulso su **azzera**, poi 50 (niente), 60 (`10`, calcolato da 50 e non da 10).

## Errori

| Messaggio | Quando |
|---|---|
| valore: serve un numero | Il **valore** non è un numero. |
| t: serve un numero | Il tempo **t** non è un numero. |

## Vedi anche

- [Derivata in un punto f'(x)](fn.derivativeAt) per la derivata di una funzione in un punto
- [Derivata (simbolica)](fn.derivative) per la derivata di una funzione scritta come formula
- [Linee](charts.line) per vedere il segnale e la sua velocità
- [Funzioni e derivate](logicstudio-functions), la sintassi delle espressioni e tutti i blocchi
- [Come funziona un blocco](ide/blocks)
