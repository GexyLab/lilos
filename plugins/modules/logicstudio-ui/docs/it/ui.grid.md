# Griglia

`ui.grid` · Contenitori · [Componenti UI standard](logicstudio-ui) · versione 1

Un contenitore che mette le componenti in celle di uguale larghezza, su più colonne: riempie la prima riga da sinistra a destra, poi la seconda, e così via. Va bene per moduli ordinati e per pannelli di indicatori.

## Proprietà

| Proprietà | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Colonne (0: automatiche)** | da 0 a 12 | 2 | Quante colonne. **0**: tante colonne quante ne entrano, larghe almeno 140 pixel; se la finestra si allarga, le colonne aumentano. |
| **Spazio tra (px)** | da 0 a 64 | 10 | Lo spazio tra le celle, in orizzontale e in verticale. |
| **Margine (px)** | da 0 a 64 | 0 | Lo spazio vuoto tutto intorno. |

## Porte del suo oggetto nello schema

Una Griglia, come tutti i contenitori, oggi **non ha un oggetto** che si possa creare dall'IDE: i suoi ingressi **abilitato** e **visibile** non si possono usare. Vedi [Componenti UI standard](logicstudio-ui).

## Come funziona

- Le colonne dividono la larghezza della griglia in parti uguali. Ogni componente occupa una cella e si allarga a tutta la larghezza della cella.
- Le celle di una stessa riga sono alte come la più alta.
- Una componente non può occupare due celle. Per un pezzo più largo, chiudi la griglia e mettilo sotto, in una [Colonna](ui.column), oppure metti nella cella una [Riga](ui.row) con più pezzi.
- Con **Colonne** a 0, una finestra stretta può avere una colonna sola: le componenti finiscono una sotto l'altra.
- In **Progetta**, quando trascini un pezzo nella griglia, il posto lo decide **l'altezza** a cui lo lasci (prima della prima componente la cui metà è più in basso del puntatore), non la colonna: per metterlo in una cella precisa può servire qualche tentativo, oppure trascinalo e poi sposta le altre.

## Esempi

### 1. Un modulo a due colonne

```
Finestra «Indirizzo»
└ Colonna (radice)
  └ Griglia  Colonne 2
    ├ Campo di testo  text1  Etichetta «Nome»
    ├ Campo di testo  text2  Etichetta «Cognome»
    ├ Campo di testo  text3  Etichetta «Città»
    └ Campo numerico  number1 Etichetta «CAP»
```

Nome e Cognome stanno sulla prima riga, Città e CAP sulla seconda, ognuno largo metà della finestra.

### 2. Un pannello di indicatori

```
Finestra «Impianto»
└ Colonna (radice)
  └ Griglia  Colonne 0  Spazio tra 16
    ├ Indicatore  gauge1  Etichetta «Temperatura»  Unità «°C»
    ├ Indicatore  gauge2  Etichetta «Pressione»    Unità «bar»  Massimo 10
    ├ Indicatore  gauge3  Etichetta «Umidità»      Unità «%»
    └ Spia        lamp1   Etichetta «Allarme»      Colore rosso
```

In una finestra larga 700 pixel stanno quattro celle per riga; a 600 pixel tre (la spia va sotto). Stringendo la finestra gli indicatori vanno a capo da soli.

## Vedi anche

- [Colonna](ui.column), [Riga](ui.row)
- [Componenti UI standard](logicstudio-ui)
