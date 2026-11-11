# Geometria solida

`logicstudio-solid` · richiede il motore di Logic Studio ([logicstudio-engine](logicstudio-engine))

I blocchi per la **geometria solida**: i solidi (cubo, prismi, piramidi, cilindro, cono, sfera e le sue parti, ellissoide, toro, poliedri regolari) con volume, aree, diagonali e raggi; i blocchi che dalla misura (un volume, un'area) trovano la dimensione; la **massa** di un volume di un materiale; e la **geometria analitica nello spazio** (punti, vettori, piani, coordinate, trasformazioni).

## Come si installa

Il pacchetto non arriva con l'IDE. Un amministratore lo installa dall'**AppStore**, scheda **Kernel**: si chiama `logicstudio-solid` («Logic Studio: i blocchi di geometria solida…»). Se manca il motore, l'AppStore lo installa insieme. Dopo l'installazione i blocchi compaiono nella scheda **Blocchi** dell'IDE, nella categoria **Geometria solida**.

Un progetto che usa questi blocchi su un lilOS dove il pacchetto non c'è mostra i blocchi con **Manca il pacchetto**, e un programma attivo resta in attesa finché il pacchetto torna.

## I blocchi

### Solidi

| Blocco | Cosa fa |
|---|---|
| [Cubo](solid.cube) | Un cubo: dal lato calcola volume, aree, diagonali e i raggi delle sfere inscritta e circoscritta. |
| [Parallelepipedo rettangolo](solid.cuboid) | Un parallelepipedo rettangolo (una scatola): da lunghezza, larghezza e altezza calcola volume, aree e diagonale. |
| [Prisma retto regolare](solid.prism) | Un prisma retto con per base un poligono regolare: dal numero di lati, dal lato e dall'altezza calcola volume, aree e apotema di base. |
| [Prisma retto (base qualsiasi)](solid.prismGeneric) | Un prisma retto con una base qualsiasi: dall'area e dal perimetro di base e dall'altezza calcola volume e aree. |
| [Piramide retta regolare](solid.pyramid) | Una piramide retta con per base un poligono regolare: dal numero di lati, dal lato e dall'altezza calcola volume, aree, apotema e spigolo laterale. |
| [Tronco di piramide regolare](solid.frustumPyramid) | Il tronco di una piramide regolare (tagliata parallelamente alla base): da lati delle due basi e altezza calcola volume, aree, apotema e spigolo. |
| [Cilindro](solid.cylinder) | Un cilindro retto: da raggio e altezza calcola volume e aree. |
| [Cono](solid.cone) | Un cono retto: da raggio e altezza calcola volume, aree, apotema e angolo di apertura. |
| [Tronco di cono](solid.frustum) | Il tronco di un cono (tagliato parallelamente alla base): da raggi e altezza calcola volume, aree e apotema. |
| [Sfera](solid.sphere) | Una sfera: dal raggio calcola volume, superficie, diametro e cerchio massimo. |
| [Parti della sfera (calotta, settore, zona, spicchio)](solid.spherePart) | Le parti di una sfera: calotta e segmento a una base, settore sferico, zona e segmento a due basi, fuso e spicchio. |
| [Ellissoide](solid.ellipsoid) | Un ellissoide (una sfera schiacciata): dai tre semiassi calcola volume e superficie (approssimata). |
| [Toro](solid.torus) | Un toro (una ciambella): dal raggio maggiore e dal raggio del tubo calcola volume e superficie. |
| [Poliedri regolari](solid.polyhedron) | Uno dei cinque poliedri regolari (tetraedro, cubo, ottaedro, dodecaedro, icosaedro): dallo spigolo calcola volume, area, raggi delle sfere, angolo diedro e numero di facce, spigoli e vertici. |

### Dalla misura

| Blocco | Cosa fa |
|---|---|
| [Dalla misura alla dimensione](solid.fromMeasure) | Il contrario degli altri blocchi: da un volume o da un'area trova la dimensione (il lato di un cubo, il raggio di una sfera, il raggio o l'altezza di un cilindro o di un cono). |

### Massa

| Blocco | Cosa fa |
|---|---|
| [Massa da volume e materiale](solid.mass) | Calcola la massa e il peso di un volume di un materiale: 28 materiali con la densità tipica, oppure una densità tua. |

### Geometria analitica nello spazio

| Blocco | Cosa fa |
|---|---|
| [Punto 3D [x, y, z]](solid.point) | Mette insieme tre numeri in un punto (o vettore) 3D, una lista `[x, y, z]`. |
| [Coordinate di un punto](solid.pointXYZ) | Divide un punto o un vettore 3D nelle sue tre coordinate. |
| [Distanza e punto medio](solid.distance) | La distanza tra due punti, il loro punto medio e il vettore da uno all'altro. |
| [Vettori 3D (scalare, vettoriale…)](solid.vector) | Un'operazione sui vettori 3D: somma, differenza, per un numero, prodotto scalare, prodotto vettoriale, modulo, versore, angolo, prodotto misto, proiezione. |
| [Piano per 3 punti](solid.plane) | Il piano che passa per tre punti: coefficienti, normale, equazione e area del triangolo. |
| [Distanza punto–piano](solid.planeDistance) | La distanza di un punto da un piano, con il segno, e la proiezione del punto sul piano. |
| [Intersezione retta–piano](solid.linePlane) | Dove una retta incontra un piano: il punto di intersezione, il parametro t e se la retta è parallela al piano. |
| [Coordinate cartesiane, cilindriche, sferiche](solid.coords) | Cambia le coordinate di un punto: cartesiane, cilindriche o sferiche. |
| [Trasforma punti (sposta, scala, ruota)](solid.transform) | Sposta, scala o ruota un punto o una lista di punti. |

## Come si usano

- **Nessuna unità.** Le lunghezze sono nell'unità che usi (metri, centimetri…), le aree nel suo quadrato, i volumi nel suo cubo. Per cambiare unità usa il pacchetto [Grandezze e unità](logicstudio-units). Fa eccezione la **massa** (densità in kg/m³): vedi [Massa da volume e materiale](solid.mass).
- **Punti e vettori sono liste** `[x, y, z]`, così funzionano con i blocchi di [Liste e matrici](logicstudio-collections). Va bene anche un oggetto `{ x, y, z }`; con due valori `[x, y]` la z vale 0.
- **Gli angoli** sono in gradi di serie. Dove un blocco ha un angolo (entra o esce) c'è l'impostazione **Unità degli angoli**: gradi, radianti, gradi centesimali o giri. Per altre conversioni vedi [Converti e normalizza angolo](trig.convert) e il pacchetto [Trigonometria](logicstudio-trig).
- **I risultati** hanno 15 cifre significative, così i piccoli errori dei numeri con la virgola del computer non si vedono.
- **Un blocco aspetta** che tutte le sue dimensioni siano arrivate; poi, a ogni nuovo valore, calcola di nuovo tutte le uscite.
- **Le uscite nascoste** (diagonali, raggi, apotemi…) si mostrano con l'occhio accanto alla porta nelle Proprietà.

## Errori

Gli errori (una dimensione negativa o 0, tre punti allineati…) escono dalla porta **Exception** del blocco, o vanno nella console principale se non è collegata. Ogni pagina elenca i messaggi esatti. Per i limiti dei programmi vedi [I limiti](logicstudio-engine/limits).

## Vedi anche

- [Liste e matrici](logicstudio-collections) per lavorare con elenchi di punti
- [Grandezze e unità](logicstudio-units) per convertire lunghezze, aree, volumi e masse
- [Come funziona un blocco](ide/blocks)
