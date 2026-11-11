# logicstudio-trig

I blocchi di Logic Studio per la **trigonometria**.

- **Funzioni trigonometriche** (sin, cos, tan, cot, sec, csc), **funzioni inverse** (asin, acos, atan, acot, asec, acsc), **funzioni iperboliche** e le loro inverse, **Angolo di un punto** (atan2).
- **Angoli**: Converti e normalizza angolo (gradi, radianti, gradi centesimali, giri; da 0° a 360° o da −180° a 180°), Gradi → gradi, primi, secondi e il contrario (anche da un testo come `45° 30′ 15″ N`).
- **Triangoli**: Triangolo rettangolo (da due valori qualsiasi), Risolvi triangolo (con i teoremi dei seni e del coseno, compreso il caso ambiguo a due soluzioni).
- **Coordinate polari**: Cartesiane → polari e Polari → cartesiane.
- **Onda**: sinusoide, quadra, triangolare, dente di sega, nel tempo o a un tempo dato.

Ogni blocco con angoli ha l'impostazione **Unità** (gradi di serie). Gli angoli retti sono esatti: sin(180°) = 0 e tan(90°) è un errore, non un numero enorme.

Gli errori (un valore fuori dominio, un triangolo che non esiste…) escono dalla porta «Exception» del blocco, o vanno nella console principale se non è collegata.

Richiede il motore `logicstudio-engine`.
