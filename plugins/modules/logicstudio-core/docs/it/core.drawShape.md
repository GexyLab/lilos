# Forma

`core.drawShape` · Disegno · [Blocchi di base](logicstudio-core) · versione 1

Una forma disegnata sul foglio dello schema: un rettangolo per racchiudere una zona, un cerchio, un rombo, un triangolo, una linea o una freccia per indicare qualcosa. Come un [Testo](core.drawText), **il programma non la esegue**: serve solo a rendere lo schema più chiaro.

## Ingressi e uscite

Nessuno. Una forma non ha porte, nemmeno l'**Exception**, e non si collega a niente.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Forma** (`shape`) | Rettangolo, Rettangolo arrotondato, Ellisse · cerchio, Rombo, Triangolo, Linea · freccia | Rettangolo | Che cosa si disegna. Un'ellisse larga e alta uguale è un cerchio. |
| **Larghezza (px)** (`w`) | da 4 a 4000 | 200 | |
| **Altezza (px)** (`h`) | da 4 a 4000 | 120 | |
| **Direzione** (`direction`) | Orizzontale, Verticale, Diagonale ↘, Diagonale ↗ | Orizzontale | Solo per **Linea · freccia**: come va la linea nel riquadro largo **Larghezza** e alto **Altezza**. Orizzontale va da sinistra a destra a metà altezza; Verticale dall'alto in basso; ↘ dall'angolo in alto a sinistra a quello in basso a destra; ↗ dal basso a sinistra all'alto a destra. |
| **Frecce** (`arrows`) | Nessuna, Alla fine, All'inizio, A entrambi i capi | Nessuna | Solo per **Linea · freccia**: le punte. La fine è a destra (o in basso, per Verticale). |
| **Raggio degli angoli (px)** (`radius`) | da 0 a 400 | 12 | Solo per **Rettangolo arrotondato**. |
| **Colore della linea** (`stroke`) | un colore, o vuoto | vuoto | Vuoto: un grigio del tema. |
| **Spessore della linea (px)** (`strokeWidth`) | da 0 a 40 | 2 | 0: senza linea (ha senso con un riempimento). |
| **Linea** (`dash`) | Continua, Tratteggiata, Punteggiata | Continua | |
| **Riempimento** (`fill`) | un colore, o vuoto | vuoto | Non per la linea. Vuoto: la forma è vuota dentro. Un colore con trasparenza (`#2f81f733`) lascia vedere la griglia e i blocchi. |
| **Testo dentro** (`text`) | testo su più righe | vuoto | Scritto al centro della forma. |
| **Dimensione del testo (px)** (`textSize`) | da 8 a 96 | 13 | |

I colori si scelgono e si scrivono come per il [Testo](core.drawText): `#rrggbb`, `#rrggbbaa`, `rgb()`, `hsl()` o un nome.

## Come funziona

- Si prende dalla scheda **Blocchi**, categoria **Disegno**.
- Selezionata, ha un quadratino nell'angolo in basso a destra: trascinandolo cambiano **Larghezza** e **Altezza** (a passi di 10 px; con **Alt** premuto, liberi). **Ctrl Z** le riporta com'erano.
- **Doppio clic** sulla forma per scrivere il **Testo dentro** lì sul foglio (**Ctrl Invio** o un clic altrove lo tiene, **Esc** no).
- Una forma **senza riempimento** si prende solo dalla sua linea: dentro, il clic e il rettangolo di selezione arrivano ai blocchi e al foglio. Così si può disegnare un riquadro intorno a dei blocchi e continuare a lavorarci dentro. Una forma **con riempimento** si prende in tutta la sua area.
- Sta **sotto** i collegamenti e i blocchi; si sposta, si duplica, si allinea e si cancella come un blocco, e può stare in un [gruppo](ide/groups).
- Conta come un blocco per il limite **Blocchi per schema** del motore; il programma la salta.

## Esempi

### 1. Una zona colorata

```
Forma: Rettangolo arrotondato, 420 × 220, Colore della linea #2f81f7, Riempimento #2f81f733
Testo: "Allarmi" (Grassetto) nell'angolo in alto a sinistra

dentro: [Confronto (== ≠ < >)] se vero ──▶ … [Notifica]
```

I blocchi dentro il riquadro restano selezionabili e collegabili: il riquadro si prende dal bordo.

### 2. Una freccia che spiega

```
Forma: Linea · freccia, Orizzontale, Frecce Alla fine, 160 × 30, Spessore 3
Testo dentro: "va alla finestra"
```

Mettila tra un blocco e l'[oggetto di una componente](core.component) per ricordare dove finisce il valore. Per una freccia che scende in diagonale usa **Diagonale ↘**.

## Errori

Nessuno: la forma non fa niente mentre il programma gira.

## Vedi anche

- [Testo · Commento](core.drawText)
- [Forma](core.uiShape) per le finestre: la stessa forma, che uno schema può colorare mentre il programma gira
- [Gli schemi](ide/schemas)
