# Vettori 3D (scalare, vettoriale…)

`solid.vector` · Geometria solida · [Geometria solida](logicstudio-solid) · versione 1

Un'operazione sui vettori 3D: somma, differenza, per un numero, prodotto scalare, prodotto vettoriale, modulo, versore, angolo, prodotto misto, proiezione.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **u** (`u`) | lista | Il primo vettore: lista `[x, y, z]` (o `[x, y]`, con z = 0) o oggetto `{x, y, z}`. |
| **v** (`v`) | lista | Il secondo vettore. Serve per le operazioni a due vettori. |
| **w (prodotto misto)** (`w`) | lista | Il terzo vettore. Serve solo per il prodotto misto. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **k (numero)** (`k`) | numero | Il numero per cui moltiplicare. Serve solo per **k · u**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | qualsiasi | Il risultato: un vettore (lista) o un numero, secondo l'operazione. |
| **Exception** (`error`) | oggetto | L'errore, se c'è (vedi **Errori**). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Operazione** (`op`) | vedi la tabella sotto | u · v | Quale operazione fare (tabella sotto). |
| **Unità degli angoli** (`unit`) | Gradi / Radianti / Gradi centesimali / Giri | Gradi | In che unità esce l'angolo (solo per **Angolo tra u e v**). |

Le opzioni di **Operazione**:

| Opzione | Nome interno |
|---|---|
| u + v (somma) | `add` |
| u − v (differenza) | `sub` |
| k · u (per un numero) | `scale` |
| u · v (prodotto scalare) | `dot` |
| u × v (prodotto vettoriale) | `cross` |
| |u| (modulo) | `norm` |
| u / |u| (versore) | `normalize` |
| Angolo tra u e v | `angle` |
| u · (v × w) (prodotto misto) | `triple` |
| Proiezione di u su v | `project` |

## Come funziona

Il blocco aspetta gli ingressi che servono all'operazione scelta (quelli nascosti **v**, **w**, **k** si mostrano con l'occhio nelle Proprietà); gli altri ingressi sono ignorati. Con u = (u₁, u₂, u₃), v, w:

- **somma** u + v e **differenza** u − v: componente per componente; risultato un vettore
- **per un numero** k·u: ogni componente moltiplicata per k; vettore
- **prodotto scalare** u·v = u₁v₁ + u₂v₂ + u₃v₃; numero (0 se i vettori sono perpendicolari)
- **prodotto vettoriale** u × v = (u₂v₃ − u₃v₂, u₃v₁ − u₁v₃, u₁v₂ − u₂v₁); vettore perpendicolare a tutti e due
- **modulo** |u| = √(u₁² + u₂² + u₃²); numero
- **versore** u / |u|: il vettore di lunghezza 1 nella stessa direzione
- **angolo** tra u e v = arccos(u·v / (|u|·|v|)), tra 0 e 180° (nell'unità scelta)
- **prodotto misto** u·(v × w); numero (il volume con segno del parallelepipedo costruito sui tre vettori)
- **proiezione** di u su v = (u·v / v·v)·v; vettore

## Esempi

### 1. Il prodotto vettoriale di due versori

```
[Costante · Variabile: [1,0,0]] valore ──▶ u  [Vettori 3D: u × v] risultato ──▶ valore [Print (console.log)]
[Costante · Variabile: [0,1,0]] valore ──▶ v
```

Impostazioni: **Operazione** = u × v (prodotto vettoriale).

Scrive `[0,0,1]`.

### 2. L'angolo tra due vettori

```
[Costante · Variabile: [1,0,0]] valore ──▶ u  [Vettori 3D: Angolo tra u e v] risultato ──▶ valore [Print (console.log)]
[Costante · Variabile: [1,1,0]] valore ──▶ v
```

Impostazioni: **Operazione** = Angolo tra u e v.

Scrive `45`.

Con **Unità degli angoli** in gradi (di serie).

### 3. Il modulo di un vettore

```
[Costante · Variabile: [2,3,6]] valore ──▶ u  [Vettori 3D: |u|] risultato ──▶ valore [Print (console.log)]
```

Impostazioni: **Operazione** = |u| (modulo).

Scrive `7`.

### 4. Il prodotto misto

```
[Costante · Variabile: [1,0,0]] valore ──▶ u                   [Vettori 3D: u · (v × w)] risultato ──▶ valore [Print (console.log)]
[Costante · Variabile: [0,2,0]] valore ──▶ v
[Costante · Variabile: [0,0,3]] valore ──▶ w (prodotto misto)
```

Impostazioni: **Operazione** = u · (v × w) (prodotto misto).

Scrive `6`.

Il volume del parallelepipedo 1 × 2 × 3.

## Errori

| Messaggio | Quando |
|---|---|
| u: serve un punto o un vettore [x, y, z] | Un ingresso non è una lista di 3 (o 2) elementi né un oggetto (e lo stesso per «v:» e «w:»). |
| u: le coordinate devono essere numeri | Una coordinata non è un numero. |
| k: serve un numero | Con **k · u**, k non è un numero. |
| u: il vettore nullo non ha una direzione | Con **versore**, u è (0, 0, 0). |
| L'angolo con il vettore nullo non è definito | Con **angolo**, u o v è (0, 0, 0). |
| v: il vettore nullo non ha una direzione | Con **proiezione**, v è (0, 0, 0). |

## Vedi anche

- [Distanza e punto medio](solid.distance) distanza e punto medio
- [Piano per 3 punti](solid.plane) il piano per tre punti usa il prodotto vettoriale
- [Converti e normalizza angolo](trig.convert) per cambiare unità a un angolo
- [Geometria solida](logicstudio-solid), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
