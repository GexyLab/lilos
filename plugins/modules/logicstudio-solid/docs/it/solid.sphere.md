# Sfera

`solid.sphere` · Geometria solida · [Geometria solida](logicstudio-solid) · versione 1

Una sfera: dal raggio calcola volume, superficie, diametro e cerchio massimo.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **raggio** (`r`) | numero | Il raggio. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **volume** (`volume`) | numero | Il volume. |
| **superficie** (`area`) | numero | La superficie. |
| **diametro** (`diameter`) | numero | Il diametro. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **circonferenza massima** (`circumference`) | numero | La lunghezza della circonferenza massima. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **area del cerchio massimo** (`greatCircle`) | numero | L'area del cerchio massimo. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | L'errore, se c'è (vedi **Errori**). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Come funziona

Il blocco **aspetta** che tutte le dimensioni siano arrivate; poi, a ogni nuovo valore, calcola di nuovo tutte le uscite. Ogni dimensione deve essere un numero maggiore di 0 (anche un testo con un numero, come `"2,5"`). Le misure non hanno unità: le lunghezze sono nell'unità che usi, le aree nel suo quadrato, i volumi nel suo cubo. I risultati hanno 15 cifre significative.

Con raggio *r*:

- volume V = 4/3·π·r³
- superficie A = 4π·r²
- diametro = 2r; circonferenza massima = 2π·r; area del cerchio massimo = π·r²

## Esempi

### 1. Una palla di raggio 1

```
[Costante · Variabile: 1] valore ──▶ raggio  [Sfera] volume ──▶ valore [Print (console.log)]
                                                     superficie ──▶ valore [Print (console.log)]
```

Scrive queste righe, una per uscita:

```
4.18879020478639
12.5663706143592
```

### 2. La Terra (raggio medio 6371 km)

```
[Costante · Variabile: 6371] valore ──▶ raggio  [Sfera] superficie ──▶ valore [Print (console.log)]
                                                        circonferenza massima ──▶ valore [Print (console.log)]
```

Scrive queste righe, una per uscita:

```
510064471.909788
40030.1735920411
```

La superficie è in km², la circonferenza in km. La circonferenza è nascosta di serie.

## Errori

| Messaggio | Quando |
|---|---|
| raggio: serve un numero maggiore di 0 (arrivato: …) | Questa dimensione non è un numero maggiore di 0 (o è un testo che non è un numero). |

## Vedi anche

- [Parti della sfera (calotta, settore, zona, spicchio)](solid.spherePart) calotta, settore, zona, fuso e spicchio
- [Dalla misura alla dimensione](solid.fromMeasure) per trovare il raggio dal volume o dalla superficie
- [Ellissoide](solid.ellipsoid) la sfera schiacciata
- [Geometria solida](logicstudio-solid), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
