# Parti della sfera (calotta, settore, zona, spicchio)

`solid.spherePart` · Geometria solida · [Geometria solida](logicstudio-solid) · versione 1

Le parti di una sfera: calotta e segmento a una base, settore sferico, zona e segmento a due basi, fuso e spicchio.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **raggio** (`r`) | numero | Il raggio della sfera. |
| **altezza** (`h`) | numero | L'altezza della calotta (da 0 al diametro). Serve con **Calotta** e **Settore**. |
| **piano 1 dal centro** (`d1`) | numero | La distanza dal centro del primo piano (con segno, da −r a r). Serve con **Zona**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **piano 2 dal centro** (`d2`) | numero | La distanza dal centro del secondo piano (da −r a r). Serve con **Zona**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **angolo** (`angle`) | numero | L'angolo del fuso o dello spicchio, nell'unità scelta (al massimo un giro). Serve con **Fuso**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **volume** (`volume`) | numero | Il volume della parte (calotta/segmento, settore, segmento a due basi o spicchio). |
| **area totale** (`area`) | numero | L'area totale della parte (superficie curva più le parti piane). |
| **superficie curva** (`curved`) | numero | L'area della sola superficie curva (della sfera). |
| **raggio di base** (`baseRadius`) | numero | Il raggio della base (della prima base, nella zona). Non c'è con **Fuso**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **raggio della seconda base** (`baseRadius2`) | numero | Il raggio della seconda base. Solo con **Zona**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | L'errore, se c'è (vedi **Errori**). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Parte** (`part`) | Calotta e segmento a una base / Settore sferico / Zona e segmento a due basi / Fuso e spicchio | Calotta e segmento a una base | Quale parte calcolare. Cambia gli ingressi che servono (vedi sotto). |
| **Unità degli angoli** (`unit`) | Gradi / Radianti / Gradi centesimali / Giri | Gradi | In che unità è l'angolo del fuso (le altre parti non hanno angoli). |

## Come funziona

Il blocco aspetta solo gli ingressi della parte scelta, e quelli di una parte diversa vengono ignorati. Con raggio *r* della sfera:

- **Calotta** (*r*, *h*, con *h* ≤ 2r): raggio della base a = √(h·(2r − h)); volume V = π·h²·(3r − h) / 3; superficie curva = 2π·r·h; area totale = curva + π·a²
- **Settore sferico** (*r*, *h* della sua calotta): V = 2π·r²·h / 3; superficie curva = 2π·r·h; area totale = curva + π·r·a (con *a* come sopra: la parte conica)
- **Zona e segmento a due basi** (*r*, *d1*, *d2*): i due piani sono a distanza *d1* e *d2* dal centro, con segno (i due valori si scambiano da soli se sono al contrario); h = d2 − d1; raggi delle basi a₁ = √(r² − d1²), a₂ = √(r² − d2²); V = π·h·(3a₁² + 3a₂² + h²) / 6; superficie curva (la zona) = 2π·r·h; area totale = curva + π·(a₁² + a₂²)
- **Fuso e spicchio** (*r*, *angolo* θ; nelle formule θ è in radianti): volume dello spicchio V = 2r³·θ / 3; area del fuso (curva) = 2r²·θ; area totale dello spicchio = 2r²·θ + π·r². Con θ = 2π (un giro) lo spicchio è l'intera sfera

## Esempi

### 1. Una calotta alta 1 su una sfera di raggio 5

```
[Costante · Variabile: 5] valore ──▶ raggio   [Parti della sfera: Calotta e segmento a una base] volume ──▶ valore [Print (console.log)]
[Costante · Variabile: 1] valore ──▶ altezza                                                     superficie curva ──▶ valore [Print (console.log)]
                                                                                                 raggio di base ──▶ valore [Print (console.log)]
```

Impostazioni: **Parte** = Calotta e segmento a una base (r, h).

Scrive queste righe, una per uscita:

```
14.6607657167524
31.4159265358979
3
```

Il raggio di base è nascosto di serie.

### 2. Una fetta di sfera di raggio 5 tra i piani a distanza −1 e 3 dal centro

```
[Costante · Variabile: 5] valore ──▶ raggio               [Parti della sfera: Zona e segmento a due basi] volume ──▶ valore [Print (console.log)]
[Costante · Variabile: -1] valore ──▶ piano 1 dal centro                                                  superficie curva ──▶ valore [Print (console.log)]
[Costante · Variabile: 3] valore ──▶ piano 2 dal centro                                                   area totale ──▶ valore [Print (console.log)]
```

Impostazioni: **Parte** = Zona e segmento a due basi (r, d1, d2).

Scrive queste righe, una per uscita:

```
284.837733925475
125.663706143592
251.327412287183
```

Gli ingressi **piano 1** e **piano 2** sono nascosti di serie: mostrali con l'occhio nelle Proprietà.

### 3. Uno spicchio di 90° (un quarto di sfera) di raggio 2

```
[Costante · Variabile: 2] valore ──▶ raggio   [Parti della sfera: Fuso e spicchio] volume ──▶ valore [Print (console.log)]
[Costante · Variabile: 90] valore ──▶ angolo                                       superficie curva ──▶ valore [Print (console.log)]
                                                                                   area totale ──▶ valore [Print (console.log)]
```

Impostazioni: **Parte** = Fuso e spicchio (r, angolo).

Scrive queste righe, una per uscita:

```
8.37758040957278
12.5663706143592
25.1327412287183
```

## Errori

| Messaggio | Quando |
|---|---|
| raggio: serve un numero maggiore di 0 (arrivato: …) | Il **raggio** (o l'altezza, o l'angolo) non è un numero maggiore di 0; per l'altezza e l'angolo il messaggio comincia con «altezza:» o «angolo:». |
| L'altezza della calotta non può superare il diametro | Con **Calotta** o **Settore**, *h* è più grande di 2r. |
| piano 1: serve un numero | Con **Zona**, una distanza non è un numero (stesso messaggio con «piano 2:»). |
| I piani devono tagliare la sfera: distanze dal centro tra −r e r | Con **Zona**, una distanza è fuori da −r…r. |
| I due piani coincidono | Con **Zona**, le due distanze sono uguali. |
| L'angolo dello spicchio non può superare un giro | Con **Fuso**, l'angolo è più grande di un giro (360°). |

## Vedi anche

- [Sfera](solid.sphere) la sfera intera
- [Cono](solid.cone) il settore ha un cono per base
- [Geometria solida](logicstudio-solid), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
