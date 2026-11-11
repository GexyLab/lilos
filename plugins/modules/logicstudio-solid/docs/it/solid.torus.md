# Toro

`solid.torus` · Geometria solida · [Geometria solida](logicstudio-solid) · versione 1

Un toro (una ciambella): dal raggio maggiore e dal raggio del tubo calcola volume e superficie.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **raggio maggiore (centro–tubo)** (`R`) | numero | La distanza dal centro del toro al centro del tubo. |
| **raggio del tubo** (`r`) | numero | Il raggio del tubo (non più grande di R). |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **volume** (`volume`) | numero | Il volume. |
| **superficie** (`area`) | numero | La superficie. |
| **Exception** (`error`) | oggetto | L'errore, se c'è (vedi **Errori**). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Come funziona

Il blocco **aspetta** che tutte le dimensioni siano arrivate; poi, a ogni nuovo valore, calcola di nuovo tutte le uscite. Ogni dimensione deve essere un numero maggiore di 0 (anche un testo con un numero, come `"2,5"`). Le misure non hanno unità: le lunghezze sono nell'unità che usi, le aree nel suo quadrato, i volumi nel suo cubo. I risultati hanno 15 cifre significative.

Con raggio maggiore *R* e raggio del tubo *r*:

- volume V = 2π²·R·r²
- superficie A = 4π²·R·r

## Esempi

### 1. Una ciambella: R = 3, r = 1

```
[Costante · Variabile: 3] valore ──▶ raggio maggiore (centro–tubo)  [Toro] volume ──▶ valore [Print (console.log)]
[Costante · Variabile: 1] valore ──▶ raggio del tubo                       superficie ──▶ valore [Print (console.log)]
```

Scrive queste righe, una per uscita:

```
59.2176264065361
118.435252813072
```

### 2. Un anello di gomma: R = 10, r = 0,5

```
[Costante · Variabile: 10] valore ──▶ raggio maggiore (centro–tubo)  [Toro] volume ──▶ valore [Print (console.log)]
[Costante · Variabile: 0.5] valore ──▶ raggio del tubo                      superficie ──▶ valore [Print (console.log)]
```

Scrive queste righe, una per uscita:

```
49.3480220054468
197.392088021787
```

## Errori

| Messaggio | Quando |
|---|---|
| raggio maggiore (centro–tubo): serve un numero maggiore di 0 (arrivato: …) | Questa dimensione non è un numero maggiore di 0 (o è un testo che non è un numero). |
| raggio del tubo: serve un numero maggiore di 0 (arrivato: …) | Questa dimensione non è un numero maggiore di 0 (o è un testo che non è un numero). |
| Il raggio del tubo non può superare il raggio maggiore | Il raggio del tubo **r** è più grande di **R**. |

## Vedi anche

- [Cilindro](solid.cylinder) un tubo dritto
- [Geometria solida](logicstudio-solid), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
