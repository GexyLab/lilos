# Dispersione

`charts.scatter` · Grafici · [Grafici](logicstudio-charts) · versione 1

Un punto per ogni coppia di valori (x, y), senza linee: per vedere se due misure vanno insieme (più sole, più crescita; più ore, più errori). Ogni serie ha il suo colore.

## Proprietà

| Proprietà | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Titolo** | testo (traducibile) | vuoto | Scritto sopra il grafico; dà anche il nome ai file PNG e CSV. |
| **Altezza (px)** | da 20 a 2000 | 200 | L'altezza del disegno. |
| **Legenda** | sì/no | sì | Mostra la legenda (da due serie in su). |
| **Unità** | testo | vuoto | L'unità della **y**: sopra l'asse verticale e dopo i valori y. |
| **Decimali** | da 0 a 10 | vuoto | Cifre dopo la virgola della y nel riquadro e nella tabella. |
| **Minimo (vuoto: automatico)** | numero | vuoto | Il valore in fondo all'asse verticale (y). |
| **Massimo (vuoto: automatico)** | numero | vuoto | Il valore in cima all'asse verticale (y). |
| **Punti tenuti per serie** | da 10 a 100000 | 1000 | Oltre, va via il punto arrivato per primo (vale anche il limite dell'amministratore). |
| **Colori** | `standard`, `blue` | `standard` | 8 colori diversi, oppure 6 toni di blu. |
| **Pulsanti vista tabella, PNG e CSV** | sì/no | sì | I tre pulsanti in alto a destra. |

**Minimo** e **Massimo** valgono solo per la y: l'asse x si adatta sempre ai punti.

## Porte del suo oggetto nello schema

### Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **punti {x, y}** (`data`) | qualsiasi | Tutti i punti. Sostituisce quelli che c'erano. |
| **aggiungi punto** (`add`) | qualsiasi | Aggiunge un punto. |
| **pulisci** (`clear`) | impulso | Toglie tutti i punti. |
| **abilitato** (`enabled`) | sì/no | `false` lo rende più chiaro e lo spegne. |
| **visibile** (`visible`) | sì/no | `false` lo nasconde. |

### Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **punto scelto** (`picked`) | oggetto | Il punto più vicino al clic (entro 24 pixel), o quello raggiunto con le frecce e **Invio**. |
| **Eccezione** (`error`) | oggetto | Come ogni blocco; oggi non ci passa niente. |

## Come funziona

**Le forme di dati**:

| Dati | Risultato |
|---|---|
| `[{"x": 10, "y": 21}, {"x": 12, "y": 24.5}]` | una serie di punti |
| `[[10, 21], [12, 24.5]]` | uguale, come coppie |
| `{"Serra 1": [[10, 21], [12, 24.5]], "Serra 2": [[11, 18], [14, 20]]}` | una serie per serra |
| `[{"name": "Serra 1", "data": [[10, 21]]}, {"name": "Serra 2", "data": [[11, 18]]}]` | uguale, come lista di serie |
| `[21, 24.5, 19]` | x = posizione (0, 1, 2) |

Regole:

- **La x deve essere un numero o una data** (una data ISO come `"2026-11-11T08:00:00Z"`, e allora l'asse x è il tempo). Le x a parole (`"Nord"`) non hanno un posto sull'asse: quei punti non si vedono e, se sono tutti così, il grafico dice «Nessun dato».
- Un punto senza x o senza y valida non si vede (ma resta nella tabella se ha la y).
- I numeri scritti come testo valgono: `["10", "21,5"]` è il punto (10; 21,5).
- Gli assi lasciano un po' di spazio attorno ai punti, così nessun punto sta su un bordo. L'asse y non comprende per forza lo zero.
- I punti non sono uniti e non sono ordinati: l'ordine conta solo per **Punti tenuti per serie** (va via il punto arrivato per primo).

**Aggiungi punto**: `{"x": 15, "y": 30}` o `[15, 30]` aggiunge alla prima serie; `{"x": 15, "y": 30, "series": "Serra 2"}` alla serie «Serra 2» (creata se non c'è). Un numero da solo usa come x quella dopo l'ultimo punto della serie.

**Punto scelto** manda:

| Campo | Contenuto |
|---|---|
| `series` | il nome della serie (vuoto se la serie non ha nome) |
| `x`, `y` | i valori del punto (sull'asse del tempo, x in millisecondi) |
| `index` | la posizione del punto tra tutti quelli visibili, ordinati per x, da 0 |

Il riquadro mostra il nome della serie (o «Punto»), la x e la y con unità e decimali.

## Esempi

### 1. Ore di sole e crescita

```
Finestra «Crescita»
└ Colonna (radice)
  └ Dispersione  sc1  Titolo «Sole e crescita»  Unità «cm»
```

```
[Costante · Variabile (JSON): [[4, 1.2], [6, 1.9], [7, 2.4], [9, 3.1], [5, 1.5]]] valore ──▶ punti {x, y} [Dispersione: Sole e crescita]
```

Cinque punti che salgono da sinistra a destra: più ore di sole (x), più centimetri (y). Il riquadro sul punto più a destra dice «x 9», «y 3,1 cm».

### 2. Un punto a ogni misura

```
[Intervallo (setInterval): 60 s] impulso ──▶ leggi [readFile: ~/umidita.json, JSON] contenuto ──▶ aggiungi punto [Dispersione: Umidità e temperatura]
```

Il file contiene ogni volta un oggetto come `{"x": 22.5, "y": 61}` (temperatura e umidità di adesso). A ogni lettura si aggiunge un punto; dopo **Punti tenuti per serie** letture, i più vecchi spariscono.

### 3. Il punto scelto in una tabella

```
[Dispersione: Sole e crescita] punto scelto ──▶ aggiungi [Accumula (push con limite): max 10] lista ──▶ righe [Tabella: Punti scelti]
```

Ogni clic su un punto aggiunge una riga alla [Tabella](ui.table) con `series`, `x`, `y` e `index` di quel punto.

## Accessibilità e tastiera

**Tab** per raggiungerlo; le frecce passano da un punto all'altro in ordine di x (il punto si ingrandisce e compare il riquadro), **Inizio** e **Fine** vanno al primo e all'ultimo, **Invio** manda il punto su **punto scelto**, **Esc** toglie la scelta. **Mostra come tabella**: una riga per punto con Serie, x e y.

## Vedi anche

- [Linee](charts.line) per punti uniti in ordine di x
- [Istogramma](charts.histogram) per una misura sola
- [Accumula (push con limite)](coll.accumulate), [Tabella](ui.table)
- [Grafici](logicstudio-charts): le forme dei dati, i limiti, la tastiera
