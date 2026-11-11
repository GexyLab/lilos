# Cono

`solid.cone` · Geometria solida · [Geometria solida](logicstudio-solid) · versione 1

Un cono retto: da raggio e altezza calcola volume, aree, apotema e angolo di apertura.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **raggio** (`r`) | numero | Il raggio della base. |
| **altezza** (`h`) | numero | L'altezza (dal vertice al centro della base). |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **volume** (`volume`) | numero | Il volume. |
| **area totale** (`area`) | numero | L'area totale (tutte le facce). |
| **area laterale** (`lateral`) | numero | L'area laterale (senza le basi). |
| **area di base** (`base`) | numero | L'area di base. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **apotema** (`slant`) | numero | L'apotema: l'altezza di una faccia laterale (nei coni, la generatrice). |
| **angolo di apertura** (`angle`) | numero | L'angolo di apertura del cono (l'angolo al vertice, tra due generatrici opposte), nell'unità scelta. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | L'errore, se c'è (vedi **Errori**). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Unità degli angoli** (`unit`) | Gradi / Radianti / Gradi centesimali / Giri | Gradi | In che unità sono gli angoli: gradi, radianti, gradi centesimali (gon) o giri. Vale per ogni angolo che entra o esce da questo blocco. |

## Come funziona

Il blocco **aspetta** che tutte le dimensioni siano arrivate; poi, a ogni nuovo valore, calcola di nuovo tutte le uscite. Ogni dimensione deve essere un numero maggiore di 0 (anche un testo con un numero, come `"2,5"`). Le misure non hanno unità: le lunghezze sono nell'unità che usi, le aree nel suo quadrato, i volumi nel suo cubo. I risultati hanno 15 cifre significative.

Con raggio *r* e altezza *h*:

- apotema (generatrice) s = √(r² + h²)
- volume V = π·r²·h / 3
- area di base = π·r²; area laterale = π·r·s; area totale = π·r·(r + s)
- angolo di apertura = 2·arctan(r / h)

L'angolo esce nell'unità dell'impostazione **Unità degli angoli**.

## Esempi

### 1. Un cono con raggio 3 e altezza 4

```
[Costante · Variabile: 3] valore ──▶ raggio   [Cono] volume ──▶ valore [Print (console.log)]
[Costante · Variabile: 4] valore ──▶ altezza         apotema ──▶ valore [Print (console.log)]
                                                     area totale ──▶ valore [Print (console.log)]
```

Scrive queste righe, una per uscita:

```
37.6991118430775
5
75.398223686155
```

L'apotema è 5: il triangolo 3-4-5.

### 2. L'angolo di apertura, in gradi e in radianti

```
[Costante · Variabile: 1] valore ──▶ raggio   [Cono] angolo di apertura ──▶ valore [Print (console.log)]
[Costante · Variabile: 1] valore ──▶ altezza
```

Scrive `90`.

Con raggio e altezza uguali l'angolo è 90°. Con **Unità degli angoli** = radianti esce `1.5707963267949` (π/2).

## Errori

| Messaggio | Quando |
|---|---|
| raggio: serve un numero maggiore di 0 (arrivato: …) | Questa dimensione non è un numero maggiore di 0 (o è un testo che non è un numero). |
| altezza: serve un numero maggiore di 0 (arrivato: …) | Questa dimensione non è un numero maggiore di 0 (o è un testo che non è un numero). |

## Vedi anche

- [Tronco di cono](solid.frustum) il cono tagliato
- [Cilindro](solid.cylinder) il cilindro con la stessa base
- [Converti e normalizza angolo](trig.convert) per cambiare unità a un angolo
- [Geometria solida](logicstudio-solid), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
