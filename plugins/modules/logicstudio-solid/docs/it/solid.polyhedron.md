# Poliedri regolari

`solid.polyhedron` · Geometria solida · [Geometria solida](logicstudio-solid) · versione 1

Uno dei cinque poliedri regolari (tetraedro, cubo, ottaedro, dodecaedro, icosaedro): dallo spigolo calcola volume, area, raggi delle sfere, angolo diedro e numero di facce, spigoli e vertici.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **spigolo** (`edge`) | numero | La lunghezza dello spigolo. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **volume** (`volume`) | numero | Il volume. |
| **area totale** (`area`) | numero | L'area totale (tutte le facce). |
| **raggio della sfera inscritta** (`inradius`) | numero | Il raggio della sfera inscritta (tocca le facce). |
| **raggio della sfera tangente agli spigoli** (`midradius`) | numero | Il raggio della sfera che tocca gli spigoli nel loro punto medio. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **raggio della sfera circoscritta** (`circumradius`) | numero | Il raggio della sfera circoscritta (passa per i vertici). |
| **angolo diedro** (`dihedral`) | numero | L'angolo diedro, tra due facce che si incontrano su uno spigolo, nell'unità scelta. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **facce** (`faces`) | numero | Il numero di facce. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **spigoli** (`edges`) | numero | Il numero di spigoli. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **vertici** (`vertices`) | numero | Il numero di vertici. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | L'errore, se c'è (vedi **Errori**). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Poliedro** (`kind`) | vedi la tabella sotto | Tetraedro | Quale poliedro. |
| **Unità degli angoli** (`unit`) | Gradi / Radianti / Gradi centesimali / Giri | Gradi | In che unità esce l'angolo diedro. |

Le opzioni di **Poliedro**:

| Opzione | Nome interno |
|---|---|
| Tetraedro (4 facce) | `tetrahedron` |
| Cubo (6 facce) | `cube` |
| Ottaedro (8 facce) | `octahedron` |
| Dodecaedro (12 facce) | `dodecahedron` |
| Icosaedro (20 facce) | `icosahedron` |

## Come funziona

Il blocco **aspetta** che tutte le dimensioni siano arrivate; poi, a ogni nuovo valore, calcola di nuovo tutte le uscite. Ogni dimensione deve essere un numero maggiore di 0 (anche un testo con un numero, come `"2,5"`). Le misure non hanno unità: le lunghezze sono nell'unità che usi, le aree nel suo quadrato, i volumi nel suo cubo. I risultati hanno 15 cifre significative.

Ogni misura è un fattore per lo spigolo *a* (al quadrato per l'area, al cubo per il volume). Con spigolo *a*:

- **Tetraedro**: V = a³·√2/12; A = √3·a²; r = a·√6/12; sfera sugli spigoli = a·√2/4; R = a·√6/4; diedro = arccos(1/3) ≈ 70,5288°; 4 facce, 6 spigoli, 4 vertici
- **Cubo**: V = a³; A = 6a²; r = a/2; sfera sugli spigoli = a·√2/2; R = a·√3/2; diedro 90°; 6 facce, 12 spigoli, 8 vertici
- **Ottaedro**: V = a³·√2/3; A = 2√3·a²; r = a·√6/6; sfera sugli spigoli = a/2; R = a·√2/2; diedro = arccos(−1/3) ≈ 109,4712°; 8 facce, 12 spigoli, 6 vertici
- **Dodecaedro**: V = a³·(15 + 7√5)/4; A = 3·√(25 + 10√5)·a²; r = a·√((25 + 11√5)/10)/2; sfera sugli spigoli = a·(3 + √5)/4; R = a·√3·(1 + √5)/4; diedro = arccos(−1/√5) ≈ 116,5651°; 12 facce, 30 spigoli, 20 vertici
- **Icosaedro**: V = a³·5(3 + √5)/12; A = 5√3·a²; r = a·√3·(3 + √5)/12; sfera sugli spigoli = a·(1 + √5)/4; R = a·√(10 + 2√5)/4; diedro = arccos(−√5/3) ≈ 138,1897°; 20 facce, 30 spigoli, 12 vertici

Numero di facce, spigoli e vertici seguono la formula di Eulero: vertici − spigoli + facce = 2.

## Esempi

### 1. Un dodecaedro con spigolo 1

```
[Costante · Variabile: 1] valore ──▶ spigolo  [Poliedri regolari: Dodecaedro] volume ──▶ valore [Print (console.log)]
                                                                              area totale ──▶ valore [Print (console.log)]
                                                                              raggio della sfera circoscritta ──▶ valore [Print (console.log)]
```

Impostazioni: **Poliedro** = Dodecaedro (12 facce).

Scrive queste righe, una per uscita:

```
7.66311896062463
20.6457288070676
1.40125853844407
```

### 2. Un tetraedro con spigolo 3: gli angoli e i conteggi

```
[Costante · Variabile: 3] valore ──▶ spigolo  [Poliedri regolari: Tetraedro] angolo diedro ──▶ valore [Print (console.log)]
                                                                             facce ──▶ valore [Print (console.log)]
                                                                             spigoli ──▶ valore [Print (console.log)]
                                                                             vertici ──▶ valore [Print (console.log)]
```

Impostazioni: **Poliedro** = Tetraedro (4 facce).

Scrive queste righe, una per uscita:

```
70.5287793655093
4
6
4
```

Queste uscite sono nascoste di serie.

## Errori

| Messaggio | Quando |
|---|---|
| spigolo: serve un numero maggiore di 0 (arrivato: …) | Lo spigolo non è un numero maggiore di 0. |

## Vedi anche

- [Cubo](solid.cube) il cubo con tutte le sue misure
- [Sfera](solid.sphere) le sfere inscritta e circoscritta
- [Geometria solida](logicstudio-solid), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
