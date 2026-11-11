# logicstudio-solid

I blocchi di Logic Studio per la **geometria solida**.

- **Solidi**: Cubo, Parallelepipedo rettangolo, Prisma retto regolare e con base qualsiasi, Piramide retta regolare e il suo tronco, Cilindro, Cono e il suo tronco, Sfera, Parti della sfera (calotta, settore, zona, fuso e spicchio), Ellissoide, Toro, Poliedri regolari. Le dimensioni entrano dagli ingressi; volume, aree, diagonali, apotemi e raggi escono dalle uscite.
- **Dalla misura alla dimensione**: il lato del cubo o il raggio della sfera dal volume o dall'area, il raggio o l'altezza di cilindro e cono.
- **Massa da volume e materiale**: 28 materiali con la loro densità tipica, o una densità qualsiasi.
- **Geometria analitica nello spazio**: Punto 3D, Coordinate di un punto, Distanza e punto medio, Vettori 3D (somma, prodotto scalare e vettoriale, modulo, versore, angolo, prodotto misto, proiezione), Piano per 3 punti, Distanza punto–piano, Intersezione retta–piano, Coordinate cartesiane, cilindriche e sferiche, Trasforma punti (sposta, scala, ruota).

Un punto o un vettore è una lista `[x, y, z]` (va bene anche un oggetto `{ x, y, z }`), così funziona con i blocchi di Liste e matrici. Le misure non hanno unità: le lunghezze sono nell'unità che usi, le aree nel suo quadrato, i volumi nel suo cubo. Gli angoli sono in gradi di serie (l'unità si cambia nelle Proprietà).

Gli errori (una dimensione negativa, tre punti allineati…) escono dalla porta «Exception» del blocco, o vanno nella console principale se non è collegata.

Richiede il motore `logicstudio-engine`.
