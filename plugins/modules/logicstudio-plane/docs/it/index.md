# Geometria piana

`logicstudio-plane` · richiede il motore di Logic Studio ([logicstudio-engine](logicstudio-engine))

I blocchi per la **geometria piana**: punti 2D, distanze, rette e le loro intersezioni, cerchi, poligoni, coniche, trasformazioni del piano con le matrici 3×3 e il disegno in SVG.

## Cosa c'è e cosa no

Qui si lavora **solo nel piano** (x, y). Il resto della geometria sta in altri pacchetti:

- [Geometria solida](logicstudio-solid): i solidi (cubo, prismi, piramidi, cilindro, cono, sfera…), i punti, i vettori e i piani nello spazio 3D, le coordinate cilindriche e sferiche e lo spostamento, la scala e la rotazione di punti 3D ([Punto 2D [x, y]](plane.point) ↔ [Punto 3D](solid.point)).
- [Trigonometria](logicstudio-trig): seno, coseno e le altre funzioni, la conversione e la normalizzazione degli angoli, i triangoli (rettangolo e qualsiasi, con le leggi dei seni e del coseno) e le coordinate polari ([Cartesiane → polari](trig.toPolar), [Polari → cartesiane](trig.fromPolar)).

## Come si installa

Il pacchetto non arriva con l'IDE. Un amministratore lo installa dall'**AppStore**, scheda **Kernel**: si chiama `logicstudio-plane` («Logic Studio: i blocchi di geometria piana…»). Se manca il motore, l'AppStore lo installa insieme. Dopo l'installazione i blocchi compaiono nella scheda **Blocchi** dell'IDE, nella categoria **Geometria**.

Un progetto che usa questi blocchi su un lilOS dove il pacchetto non c'è mostra i blocchi con **Manca il pacchetto**, e un programma attivo resta in attesa finché il pacchetto torna.

## I valori

Un **punto** è una **lista** `[x, y]`, come in [Geometria solida](logicstudio-solid), e la porta è di tipo *lista*: così funziona con i blocchi di [Liste e matrici](logicstudio-collections). I blocchi accettano anche un oggetto `{x, y}` e una lista `[x, y, z]` (la z si ignora), ma quello che esce è sempre la lista `[x, y]`. Si compone e si scompone con [Punto 2D [x, y]](plane.point) e [Coordinate di un punto 2D](plane.split).

Una **figura** è un **oggetto** con un campo `kind`: `circle`, `ellipse`, `polygon`, `rect`, `line`, `parabola` o `hyperbola`; i punti dentro la figura sono liste `[x, y]`. Le figure escono dai blocchi che le costruiscono ([Cerchio](plane.circle), [Poligono (area · perimetro)](plane.polygon), [Coniche (ellisse · parabola · iperbole)](plane.conic)…) e si danno ad altri blocchi ([Trasforma](plane.transform), [Punto dentro figura](plane.inside), [Figura → SVG](plane.svg)…).

Una **matrice di trasformazione** è una lista di tre righe (3×3, coordinate omogenee), come quelle dei blocchi per matrici di [Liste e matrici](logicstudio-collections).

Gli **angoli** sono in gradi per impostazione predefinita; i blocchi che li usano hanno l'impostazione **Unità degli angoli** (gradi, radianti o gradi centesimali). Le conversioni tra unità di misura (metri, piedi…) e le costanti come π sono in [Grandezze e unità](logicstudio-units) e [Costanti](logicstudio-constants), non qui.

## I blocchi

### Punti

| Blocco | Cosa fa |
|---|---|
| [Punto 2D [x, y]](plane.point) | Compone un punto 2D [x, y] da x e y. |
| [Coordinate di un punto 2D](plane.split) | Scompone un punto 2D in x e y. |
| [Distanza (Math.hypot)](plane.distance) | Distanza di un punto da un punto, una retta o un segmento, con il punto più vicino. |
| [Punto medio · Lerp (t)](plane.midpoint) | Il punto medio o un punto qualsiasi tra due punti (lerp). |

### Rette

| Blocco | Cosa fa |
|---|---|
| [Retta per due punti](plane.line) | La retta per due punti: a, b, c, pendenza, intercetta ed equazione. |
| [Parallela · Perpendicolare](plane.parallel) | La parallela o la perpendicolare a una retta per un punto. |
| [Asse · Bisettrice](plane.bisector) | L'asse di un segmento o la bisettrice di un angolo. |
| [Intersezione](plane.intersect) | Dove si incontrano due rette, due segmenti, retta e cerchio, due cerchi. |

### Figure

| Blocco | Cosa fa |
|---|---|
| [Cerchio](plane.circle) | Un cerchio da centro e raggio o da tre punti: area e circonferenza. |
| [Poligono (area · perimetro)](plane.polygon) | Area, perimetro, baricentro, convessità e verso di un poligono. |
| [Poligono regolare](plane.regular) | Un poligono regolare: vertici, area, apotema e lato. |
| [Coniche (ellisse · parabola · iperbole)](plane.conic) | Ellisse, parabola o iperbole: fuochi, vertici, eccentricità ed equazione. |
| [Punto dentro figura](plane.inside) | Dice se un punto è dentro, sul bordo o fuori da una figura. |
| [Rettangolo di ingombro](plane.bounds) | Il rettangolo di ingombro di punti o figure. |
| [Inviluppo convesso](plane.hull) | L'inviluppo convesso di una nuvola di punti. |

### Trasformazioni

| Blocco | Cosa fa |
|---|---|
| [Trasforma (trasla · ruota · scala · rifletti · taglia)](plane.transform) | Trasla, ruota, scala, riflette o deforma un punto, una lista di punti o una figura. |
| [Matrice di trasformazione (3×3)](plane.matrix) | La matrice di trasformazione 3×3, anche componendone più d'una. |
| [Applica matrice](plane.apply) | Applica una matrice a punti o figure. |

### Disegno

| Blocco | Cosa fa |
|---|---|
| [Figura → SVG](plane.svg) | Trasforma figure e punti in testo SVG. |

## La precisione

I numeri che escono sono arrotondati a **12 cifre significative** e quelli sotto 1e-12 diventano 0, così i piccoli errori dei numeri con la virgola del computer non si vedono: il coseno di 90 gradi è `0`, non `6.1e-17`, e la somma di `0.1` e `0.2` è `0.3`. I confronti (rette parallele, punti allineati, punto sul bordo…) usano una piccola **tolleranza** (ε, `1e-9`), che dove serve si cambia nelle Proprietà.

## Errori

Gli errori (un valore che non è un punto, due punti uguali per una retta, tre punti allineati dove serve un cerchio…) escono dalla porta **Exception** del blocco, o vanno nella console principale se non è collegata. Ogni pagina elenca i messaggi esatti.

## Vedi anche

- [Funzioni Math](core.math) per radici, potenze e arrotondamenti
- [Geometria solida](logicstudio-solid) per i solidi e la geometria nello spazio
- [Trigonometria](logicstudio-trig) per le funzioni trigonometriche, gli angoli e i triangoli
- [Grandezze e unità](logicstudio-units) per cambiare le unità di misura
- [Liste e matrici](logicstudio-collections) per le liste di punti e le matrici
- [Come funziona un blocco](ide/blocks)
