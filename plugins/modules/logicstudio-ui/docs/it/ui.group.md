# Riquadro

`ui.group` · Contenitori · [Componenti UI standard](logicstudio-ui) · versione 1

Una [Colonna](ui.column) con un bordo arrotondato e un titolo sul bordo in alto: per raccogliere le componenti che vanno insieme (per esempio «Spedizione» e «Pagamento» in un modulo).

## Proprietà

| Proprietà | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Titolo** | testo (traducibile) | «Riquadro» | Il titolo sul bordo. Vuoto: il bordo senza titolo. |
| **Spazio tra (px)** | da 0 a 64 | 8 | Lo spazio verticale tra le componenti dentro il riquadro. |

Il margine interno è fisso (circa 10 pixel sopra, 12 ai lati e sotto). Le componenti dentro occupano tutta la larghezza del riquadro.

## Porte del suo oggetto nello schema

| Porta | Verso | Tipo | Descrizione |
|---|---|---|---|
| **titolo** (`title`) | ingresso | testo | Sostituisce il titolo. |
| **abilitato** (`enabled`) | ingresso | sì/no | `false` disabilita il riquadro **e tutto quello che contiene**. |
| **visibile** (`visible`) | ingresso | sì/no | `false` nasconde il riquadro con tutto il contenuto. |

> **Oggi queste porte non si possono usare dall'IDE.** Il Riquadro è un contenitore, e per i contenitori le Proprietà non mostrano la sezione **Oggetti negli schemi**: non c'è modo di creare il suo oggetto. Il titolo resta quello delle proprietà, e per nascondere o disabilitare il contenuto devi farlo componente per componente. Vedi [Componenti UI standard](logicstudio-ui).

## Come funziona

- Le componenti dentro il riquadro stanno una sotto l'altra, a tutta larghezza, come in una Colonna con allineamento **tutta la larghezza**.
- Per affiancarle, metti nel riquadro una [Riga](ui.row) o una [Griglia](ui.grid).
- In **Progetta** si aggiunge un pezzo nel riquadro selezionando il riquadro e facendo clic sul pezzo nella tavolozza, oppure trascinandolo dentro il bordo.

## Esempi

### 1. Un modulo in due parti

```
Finestra «Ordine»
└ Colonna (radice)
  ├ Riquadro  Titolo «Spedizione»
  │ ├ Campo di testo  text1  Etichetta «Indirizzo»
  │ └ Campo di testo  text2  Etichetta «Città»
  └ Riquadro  Titolo «Pagamento»
    ├ Pulsanti di opzione  radios1  Opzioni «Carta, Bonifico, Contrassegno»
    └ Pulsante             button1  Testo «Conferma»
```

Due riquadri con il loro titolo separano le due parti del modulo.

### 2. Un riquadro di stato con griglia

```
Finestra «Server»
└ Colonna (radice)
  └ Riquadro  Titolo «Stato»  Spazio tra 12
    ├ Griglia  Colonne 3
    │ ├ Spia  lamp1  Etichetta «Rete»
    │ ├ Spia  lamp2  Etichetta «Disco»
    │ └ Spia  lamp3  Etichetta «Backup»
    └ Etichetta  label1  Testo «Ultimo controllo: —»  Dimensione piccolo
```

Le tre spie stanno in fila dentro il riquadro, con la nota piccola sotto.

## Accessibilità

Il riquadro è un gruppo con un nome (il suo titolo): un lettore di schermo, entrando in un campo del riquadro, può annunciare «Spedizione». Per questo vale la pena dargli sempre un titolo.

## Vedi anche

- [Colonna](ui.column), [Schede](ui.tabs)
- [Componenti UI standard](logicstudio-ui)
