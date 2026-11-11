# logicstudio-plane

I blocchi di Logic Studio per la **geometria piana** (solo 2D).

- **Punti**: Punto 2D `[x, y]` e Coordinate di un punto 2D; Distanza (punto-punto, punto-retta, punto-segmento, con il punto più vicino); Punto medio · Lerp.
- **Rette**: Retta per due punti (a, b, c, pendenza, intercetta, equazione), Parallela · Perpendicolare, Asse · Bisettrice e Intersezione (retta-retta, segmento-segmento, retta-cerchio, cerchio-cerchio).
- **Figure**: Cerchio (da centro e raggio o da tre punti), Poligono (area, perimetro, baricentro, convessità), Poligono regolare, Coniche (ellisse, parabola, iperbole), Punto dentro figura, Rettangolo di ingombro e Inviluppo convesso.
- **Trasformazioni**: Trasforma (trasla, ruota, scala, riflette, shear), Matrice di trasformazione 3×3 (anche componendone più d'una) e Applica matrice.
- **Disegno**: Figura → SVG.

Un punto è una lista `[x, y]` (porta di tipo lista, come in `logicstudio-solid`; si accettano anche l'oggetto `{x, y}` e la lista `[x, y, z]`, di cui la z si ignora); una figura è un oggetto (porta di tipo oggetto) con un campo `kind`, e i punti al suo interno sono liste; le matrici sono liste di tre righe, compatibili con i blocchi `coll.mat*`. I risultati sono arrotondati a 12 cifre significative e i confronti usano una tolleranza (ε, 1e-9).

Quello che non è qui sta in altri pacchetti: i solidi, i punti, i vettori e i piani nello spazio 3D, le coordinate cilindriche e sferiche in `logicstudio-solid`; le funzioni trigonometriche, gli angoli, i triangoli e le coordinate polari in `logicstudio-trig`; le conversioni di unità e le costanti in `logicstudio-units` e `logicstudio-constants`.

Gli errori (un valore che non è un punto, due punti uguali per una retta, tre punti allineati dove serve un cerchio…) escono dalla porta «Exception» del blocco, o vanno nella console principale se non è collegata.

Richiede il motore `logicstudio-engine`.
