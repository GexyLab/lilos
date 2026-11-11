# Area libera

`ui.free` · Contenitori · [Componenti UI standard](logicstudio-ui) · versione 1

Un'area di altezza fissa dove ogni componente sta nel punto esatto in cui la lasci, misurato in pixel. Serve per i pannelli in cui la posizione conta: lo schema di un impianto con le spie sopra, un cruscotto disegnato.

## Proprietà

| Proprietà | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Altezza (px)** | da 40 a 2000 | 240 | L'altezza dell'area. La larghezza è quella del contenitore in cui sta (di solito tutta la finestra). |

## Porte del suo oggetto nello schema

L'Area libera, come tutti i contenitori, oggi **non ha un oggetto** che si possa creare dall'IDE: i suoi ingressi **abilitato** e **visibile** non si possono usare. Vedi [Componenti UI standard](logicstudio-ui).

## Come funziona

**Mettere un pezzo.** In **Progetta**, trascina un pezzo dalla tavolozza dentro l'area: l'area si colora di blu e il pezzo va dove lo lasci. L'angolo in alto a sinistra del pezzo va circa 10 pixel sopra e a sinistra del puntatore. La posizione si salva come due numeri, **x** (dal bordo sinistro) e **y** (dal bordo in alto).

**Spostarlo.** Trascina il pezzo in un altro punto dell'area: cambiano solo x e y.

**Cose da sapere.**

- Un pezzo aggiunto con **un clic** sulla tavolozza (con l'area selezionata) non ha una posizione: finisce nell'**angolo in alto a sinistra**, sopra gli altri pezzi aggiunti allo stesso modo. Trascinalo dove vuoi.
- Ogni pezzo ha la sua **misura naturale**: l'IDE non permette di cambiarne larghezza e altezza.
- I pezzi si possono sovrapporre: quello che viene dopo nell'ordine sta sopra.
- L'area **non taglia** quello che esce: un pezzo più in basso dell'altezza dell'area finisce sopra le componenti che seguono l'area. Tieni i pezzi dentro, o aumenta l'**Altezza**.
- L'area non si adatta alla finestra: le posizioni sono in pixel. Se la finestra si stringe, i pezzi a destra possono uscire dal bordo. Per una finestra che l'utente può ridimensionare, preferisci [Colonna](ui.column), [Riga](ui.row) e [Griglia](ui.grid).
- Se **sposti** un pezzo da un'Area libera a un altro contenitore, tiene le sue coordinate e appare **spostato** di quei pixel anche nel nuovo posto. Per rimediare, eliminalo e aggiungilo di nuovo nel contenitore giusto.
- Le coordinate vanno da 0 a 10000 pixel.

## Esempi

### 1. Le spie su uno schema d'impianto

```
Finestra «Impianto»  600 × 340
└ Colonna (radice)
  └ Area libera  Altezza 300
    ├ Immagine  image1  Immagine «risorse/impianto.png»   x 0    y 0
    ├ Spia      lamp1   Etichetta «Pompa 1»               x 80   y 190
    ├ Spia      lamp2   Etichetta «Pompa 2»               x 300  y 190
    └ Valore    value1  Etichetta «Livello:»  Unità «%»   x 420  y 40
```

Prima trascina l'immagine (il disegno dell'impianto, largo circa 570 pixel e alto 300) nell'angolo, poi le spie e il valore sopra il disegno, nei punti giusti. Gli schemi accendono le spie e aggiornano il livello come al solito, con gli oggetti delle componenti.

### 2. Un cruscotto con le posizioni fisse

```
Finestra «Auto»  480 × 260
└ Colonna (radice)
  └ Area libera  Altezza 220
    ├ Indicatore  gauge1  Etichetta «Velocità»  Unità «km/h»  Massimo 200  x 20   y 20
    ├ Indicatore  gauge2  Etichetta «Giri»      Unità «×1000»  Massimo 8   x 260  y 20
    └ Spia        lamp1   Etichetta «Benzina»   Colore giallo              x 190  y 170
```

I due indicatori stanno affiancati in alto, la spia sotto, al centro. In una finestra di larghezza fissa (togli **L'utente può ridimensionarla** nelle proprietà della finestra) il cruscotto resta sempre uguale.

## Accessibilità

Per la tastiera e i lettori di schermo l'ordine dei pezzi è quello in cui li hai aggiunti, non quello in cui si vedono. Se un pannello ha molti comandi, aggiungili nell'ordine in cui l'utente dovrebbe usarli.

## Vedi anche

- [Colonna](ui.column), [Riga](ui.row), [Griglia](ui.grid)
- [Immagine](ui.image)
- [Componenti UI standard](logicstudio-ui)
