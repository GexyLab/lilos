# Trasforma punti (sposta, scala, ruota)

`solid.transform` · Geometria solida · [Geometria solida](logicstudio-solid) · versione 1

Sposta, scala o ruota un punto o una lista di punti.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **punto o lista di punti** (`point`) | lista | Un punto `[x, y, z]` o una lista di punti `[[x, y, z], …]` (fino a 10000). Anche gli oggetti `{x, y, z}` vanno bene. |
| **vettore (spostamento, fattori, asse)** (`vector`) | lista | Dipende dalla trasformazione: lo spostamento (**Trasla**), i fattori `[kx, ky, kz]` (**Scala**) o l'asse di rotazione (**Ruota attorno al vettore**). Non serve per le rotazioni attorno agli assi x, y, z. |
| **angolo** (`angle`) | numero | L'angolo di rotazione, nell'unità scelta. Non serve per **Trasla** e **Scala**. |
| **centro** (`centre`) | lista | Il centro della scala o della rotazione. Se non è collegato è l'origine (0, 0, 0). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **punto o lista di punti** (`point`) | lista | Il punto trasformato, o la lista dei punti trasformati (nello stesso ordine). |
| **Exception** (`error`) | oggetto | L'errore, se c'è (vedi **Errori**). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Trasformazione** (`op`) | vedi la tabella sotto | Ruota attorno all'asse z per il centro | Quale trasformazione (tabella sotto). |
| **Unità degli angoli** (`unit`) | Gradi / Radianti / Gradi centesimali / Giri | Gradi | In che unità è l'angolo di rotazione. |

Le opzioni di **Trasformazione**:

| Opzione | Nome interno |
|---|---|
| Trasla del vettore | `translate` |
| Scala dei fattori [kx, ky, kz] dal centro | `scale` |
| Ruota attorno all'asse x per il centro | `rotateX` |
| Ruota attorno all'asse y per il centro | `rotateY` |
| Ruota attorno all'asse z per il centro | `rotateZ` |
| Ruota attorno al vettore per il centro | `rotateAxis` |

## Come funziona

Il blocco aspetta gli ingressi che servono alla trasformazione scelta (**punto** e **vettore** per Trasla, Scala e Ruota attorno al vettore; **punto** e **angolo** per le rotazioni attorno agli assi e per Ruota attorno al vettore). Se **centro** è collegato, aspetta anche quello. Con centro *c*:

- **Trasla**: p + v (il centro non conta)
- **Scala**: c + (p − c) · (kx, ky, kz), componente per componente
- **Ruota attorno all'asse x, y o z**: ruota p attorno all'asse parallelo a quello scelto che passa per c, di un angolo θ (positivo in senso antiorario guardando dall'asse verso l'origine, la regola della mano destra)
- **Ruota attorno al vettore**: come sopra, con asse la direzione di v (rotazione di Rodrigues): p′ = c + r·cos θ + (k × r)·sin θ + k·(k·r)·(1 − cos θ), con r = p − c e k = v / |v|

Un punto con due valori `[x, y]` vale `[x, y, 0]`: per **Scala** due fattori `[2, 3]` valgono `[2, 3, 1]`: z resta com'è. Le coordinate sotto 10⁻¹⁴ in valore assoluto escono 0 (niente `6.1e-17` per un seno).

## Esempi

### 1. Ruotare un punto di 90° attorno a z

```
[Costante · Variabile: [1,0,0]] valore ──▶ punto o lista di punti  [Trasforma punti: Ruota attorno all'asse z per il centro] punto o lista di punti ──▶ valore [Print (console.log)]
[Costante · Variabile: 90] valore ──▶ angolo
```

Impostazioni: **Trasformazione** = Ruota attorno all'asse z per il centro.

Scrive `[0,1,0]`.

### 2. Spostare tre punti insieme

```
[Costante · Variabile: [[0,0,0],[1,0,0],[1,1,0]]] valore ──▶ punto o lista di punti  [Trasforma punti: Trasla del vettore] punto o lista di punti ──▶ valore [Print (console.log)]
[Costante · Variabile: [10,20,30]] valore ──▶ vettore (spostamento, fattori, asse)
```

Impostazioni: **Trasformazione** = Trasla del vettore.

Scrive `[[10,20,30],[11,20,30],[11,21,30]]`.

Una lista di punti esce come una lista di punti.

### 3. Raddoppiare un punto rispetto a un centro

```
[Costante · Variabile: [3,3,3]] valore ──▶ punto o lista di punti                [Trasforma punti: Scala dei fattori [kx, ky, kz] dal centro] punto o lista di punti ──▶ valore [Print (console.log)]
[Costante · Variabile: [2,2,2]] valore ──▶ vettore (spostamento, fattori, asse)
[Costante · Variabile: [1,1,1]] valore ──▶ centro
```

Impostazioni: **Trasformazione** = Scala dei fattori [kx, ky, kz] dal centro.

Scrive `[5,5,5]`.

L'ingresso **centro** è nascosto di serie. Il punto (3, 3, 3) è a (2, 2, 2) dal centro; raddoppiato diventa (4, 4, 4) dal centro, cioè (5, 5, 5).

## Errori

| Messaggio | Quando |
|---|---|
| punto: serve un punto o un vettore [x, y, z] | Un punto non è una lista di 3 (o 2) elementi né un oggetto (stessa cosa per «vettore:» e «centro:»). |
| angolo: serve un numero | L'angolo non è un numero. |
| asse: il vettore nullo non ha una direzione | Con **Ruota attorno al vettore**, il vettore è (0, 0, 0). |
| Al massimo 10000 punti | La lista ha più di 10000 punti. |

## Vedi anche

- [Coordinate cartesiane, cilindriche, sferiche](solid.coords) per cambiare sistema di coordinate
- [Punto 3D [x, y, z]](solid.point) per costruire un punto
- [A × B](coll.matMultiply) per le trasformazioni con le matrici
- [Geometria solida](logicstudio-solid), tutti i blocchi
- [Come funziona un blocco](ide/blocks)
