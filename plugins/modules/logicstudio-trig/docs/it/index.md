# Trigonometria

`logicstudio-trig` · richiede il motore di Logic Studio ([logicstudio-engine](logicstudio-engine))

I blocchi per la **trigonometria**: seno, coseno, tangente e le altre funzioni con le loro inverse, le funzioni iperboliche, la conversione degli angoli (gradi, radianti, gradi centesimali, giri; anche gradi, primi e secondi), i triangoli (rettangoli e qualsiasi, con i teoremi dei seni e del coseno), le coordinate polari e le onde (sinusoide, quadra, triangolare, dente di sega).

## Come si installa

Il pacchetto non arriva con l'IDE. Un amministratore lo installa dall'**AppStore**, scheda **Kernel**: si chiama `logicstudio-trig` («Logic Studio: i blocchi di trigonometria…»). Se manca il motore, l'AppStore lo installa insieme. Dopo l'installazione i blocchi compaiono nella scheda **Blocchi** dell'IDE, nella categoria **Trigonometria**.

Un progetto che usa questi blocchi su un lilOS dove il pacchetto non c'è mostra i blocchi con **Manca il pacchetto**, e un programma attivo resta in attesa finché il pacchetto torna.

## I blocchi

### Funzioni

| Blocco | Cosa fa |
|---|---|
| [Funzioni trigonometriche (Math.sin, Math.cos…)](trig.fn) | Seno, coseno, tangente, cotangente, secante e cosecante di un angolo. |
| [Funzioni inverse (Math.asin, Math.acos…)](trig.inverse) | Arcoseno, arcocoseno, arcotangente, arcocotangente, arcosecante e arcocosecante: da un valore all'angolo. |
| [Angolo di un punto (Math.atan2)](trig.atan2) | L'angolo di un punto (x, y), nel quadrante giusto. |
| [Funzioni iperboliche (Math.sinh, Math.cosh…)](trig.hyperbolic) | Le 6 funzioni iperboliche e le loro 6 inverse. |

### Angoli

| Blocco | Cosa fa |
|---|---|
| [Converti e normalizza angolo](trig.convert) | Passa da un'unità all'altra e riporta l'angolo tra 0° e 360° o tra −180° e 180°. |
| [Gradi → gradi, primi, secondi](trig.toDms) | Da 45,5042° a `45° 30′ 15″`. |
| [Gradi, primi, secondi → gradi](trig.fromDms) | Il contrario, anche da un testo come `45° 30′ 15″ N`. |

### Triangoli

| Blocco | Cosa fa |
|---|---|
| [Triangolo rettangolo](trig.rightTriangle) | Dati due valori qualsiasi, trova tutto il resto. |
| [Risolvi triangolo (teoremi dei seni e del coseno)](trig.triangle) | Dati 3 valori (con almeno un lato), trova il triangolo, anche nel caso ambiguo a due soluzioni. |

### Coordinate polari

| Blocco | Cosa fa |
|---|---|
| [Cartesiane → polari](trig.toPolar) | Da (x, y) a distanza e angolo. |
| [Polari → cartesiane](trig.fromPolar) | Da distanza e angolo a (x, y). |

### Onde

| Blocco | Cosa fa |
|---|---|
| [Onda (sinusoide, quadra, triangolare, dente di sega)](trig.wave) | Il valore di un'onda nel tempo o a un tempo dato. |

## Le convenzioni

- **L'impostazione Unità.** Ogni blocco che legge o dà un angolo ha l'impostazione **Unità**: **gradi** (di serie), **radianti**, **gradi centesimali** (gon, 100 per un angolo retto) o **giri**. Si sceglie nelle Proprietà. Per cambiare unità mentre il programma gira usa [Converti e normalizza angolo](trig.convert).
- **Gli angoli retti sono esatti.** Per un angolo che è un multiplo di un angolo retto il risultato è esatto: sin 180° dà `0` (non `1.22e-16`), cos 90° dà `0`, e tan 90° è un **errore**, non un numero enorme. Funziona in gradi, gradi centesimali e giri; in radianti solo per 0, perché π non si può scrivere esattamente.
- **15 cifre significative.** I risultati sono arrotondati a 15 cifre, così i piccoli errori dei numeri con la virgola del computer non si vedono.
- **Numeri come testo.** Un testo con un numero (`"30,5"`, `"30.5"`) va bene al posto del numero.
- **Gli errori** (un valore fuori dominio, un triangolo che non esiste…) escono dalla porta **Exception** del blocco, nascosta di serie, o vanno nella console principale se non è collegata. Ogni pagina elenca i messaggi esatti.

## Le funzioni di Math vogliono i radianti

Il blocco [Funzioni Math](core.math) del pacchetto di base calcola seno e coseno di un angolo **in radianti**. I blocchi di questo pacchetto lavorano invece nell'unità che scegli (gradi di serie), con le altre funzioni e gli angoli retti esatti. Anche [Angolo](unit.angle), del pacchetto [Grandezze e unità](logicstudio-units), converte gli angoli (e anche i primi e i secondi d'arco).

## Vedi anche

- [Funzioni Math](core.math) per arrotondare e per seno e coseno in radianti
- [Angolo](unit.angle) per convertire gli angoli (pacchetto [Grandezze e unità](logicstudio-units))
- [Geometria solida](logicstudio-solid) per le figure nello spazio e le coordinate sferiche e cilindriche ([Coordinate](solid.coords))
- [Come funziona un blocco](ide/blocks)
