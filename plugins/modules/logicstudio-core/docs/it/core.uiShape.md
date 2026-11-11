# Forma

`core.uiShape` · Disegno · [Blocchi di base](logicstudio-core) · versione 1

Una forma in una finestra: un rettangolo, un cerchio, un rombo, un triangolo, una linea o una freccia. Serve per disegnare: lo schema di un impianto con i serbatoi e i tubi, un riquadro che separa due parti, una spia grande. Uno schema può cambiarne il riempimento, il colore della linea e il testo mentre il programma gira.

Va bene in ogni contenitore; nell'[Area libera](ui.free) la metti esattamente dove vuoi, anche sopra o sotto altre componenti.

## Proprietà

| Proprietà | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Forma** | Rettangolo, Rettangolo arrotondato, Ellisse · cerchio, Rombo, Triangolo, Linea · freccia | Rettangolo | |
| **Larghezza (px)**, **Altezza (px)** | da 4 a 4000 | 120 × 80 | La grandezza della forma. |
| **Direzione (linea)** | Orizzontale, Verticale, Diagonale ↘, Diagonale ↗ | Orizzontale | Solo per **Linea · freccia**, come nella [Forma degli schemi](core.drawShape). |
| **Frecce (linea)** | Nessuna, Alla fine, All'inizio, A entrambi i capi | Nessuna | Solo per **Linea · freccia**. |
| **Raggio degli angoli (px)** | da 0 a 400 | 12 | Solo per **Rettangolo arrotondato**. |
| **Colore della linea** | un colore, o vuoto | vuoto | Vuoto: il colore del testo del tema. |
| **Spessore della linea (px)** | da 0 a 40 | 2 | 0: senza linea. |
| **Linea** | Continua, Tratteggiata, Punteggiata | Continua | |
| **Riempimento** | un colore, o vuoto | vuoto | Non per la linea. Vuoto: vuota dentro. |
| **Testo dentro** | testo su più righe (traducibile) | vuoto | Al centro della forma. |
| **Dimensione del testo (px)** | da 8 a 96 | 13 | |

I colori si scrivono `#rrggbb`, `#rrggbbaa`, `rgb()`, `hsl()` o con un nome; quello che non è un colore viene ignorato.

## Porte del suo oggetto nello schema

### Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **riempimento** (`fill`) | testo | Un colore nuovo per l'interno (non per la linea). |
| **colore della linea** (`stroke`) | testo | Un colore nuovo per la linea e le punte delle frecce. |
| **testo** (`text`) | testo | Il testo al centro; un testo vuoto lo toglie. |
| **abilitato** (`enabled`) | sì/no | `false` la rende più chiara. |
| **visibile** (`visible`) | sì/no | `false` la nasconde. |

### Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **Exception** (`error`) | oggetto | Come ogni blocco; per questa componente non ci passa niente. |

## Esempi

### 1. Un serbatoio che cambia colore

Area libera con una **Forma** Rettangolo arrotondato 80 × 140 (il serbatoio) e una Linea · freccia orizzontale (il tubo).

```
[Confronto (== ≠ < >): a < b] se vero  ──▶ invia [Costante · Variabile: "#e5484d"] valore ──▶ riempimento [Forma: serbatoio]
[Confronto (== ≠ < >): a < b] se falso ──▶ invia [Costante · Variabile: "#2da44e"] valore ──▶ riempimento [Forma: serbatoio]
[Template (formatta): "{livello} %"] testo ──▶ testo [Forma: serbatoio]
```

Sul [Confronto](core.compare) arriva il livello su **a** e la soglia su **b**; i due blocchi [Costante · Variabile](core.value) sono di tipo testo, con **invia** collegato. Sotto la soglia il serbatoio diventa rosso, sopra torna verde; dentro si legge il livello.

### 2. Un separatore con una freccia

Una **Forma** Linea · freccia, Frecce Alla fine, 300 × 24, Linea Tratteggiata, tra due gruppi di campi: indica l'ordine in cui compilarli. Non serve un oggetto nello schema.

## Vedi anche

- [Testo formattato](core.uiText)
- [Spia](ui.lamp) e [Indicatore](ui.gauge) delle [Componenti UI standard](logicstudio-ui)
- [Forma](core.drawShape), per disegnare sugli schemi
- [L'oggetto di una componente](ide/components)
