# Aree

`charts.area` · Grafici · [Grafici](logicstudio-charts) · versione 1

Come [Linee](charts.line), con lo spazio tra la linea e lo zero colorato. Le aree si possono anche **impilare** (ogni serie sopra la precedente, per vedere il totale) o mostrare **al 100%** (ogni serie come parte del totale di quel punto).

## Proprietà

| Proprietà | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Titolo** | testo (traducibile) | vuoto | Scritto sopra il grafico; dà anche il nome ai file PNG e CSV. |
| **Altezza (px)** | da 20 a 2000 | 200 | L'altezza del disegno. |
| **Legenda** | sì/no | sì | Mostra la legenda (da due serie in su). |
| **Unità** | testo | vuoto | Sopra l'asse e dopo ogni valore. |
| **Decimali** | da 0 a 10 | vuoto | Cifre dopo la virgola nel riquadro e nella tabella. |
| **Minimo (vuoto: automatico)** | numero | vuoto | Il valore in fondo all'asse. |
| **Massimo (vuoto: automatico)** | numero | vuoto | Il valore in cima all'asse. |
| **Punti tenuti per serie** | da 10 a 100000 | 1000 | Oltre, va via il punto più vecchio (vale anche il limite dell'amministratore). |
| **Colori** | `standard`, `blue` | `standard` | 8 colori diversi, oppure 6 toni di blu. |
| **Pulsanti vista tabella, PNG e CSV** | sì/no | sì | I tre pulsanti in alto a destra. |
| **Impilate** | `none`, `stacked`, `percent` | `none` | `none`: aree una davanti all'altra; `stacked`: impilate; `percent`: impilate e portate al 100%. |

## Porte del suo oggetto nello schema

### Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **dati (lista o oggetto)** (`data`) | qualsiasi | Sostituisce tutti i dati. Le forme sono quelle di [Linee](charts.line). |
| **aggiungi punto** (`add`) | qualsiasi | Aggiunge un punto (o un punto per serie). |
| **pulisci** (`clear`) | impulso | Toglie tutti i punti. |
| **abilitato** (`enabled`) | sì/no | `false` lo rende più chiaro e lo spegne. |
| **visibile** (`visible`) | sì/no | `false` lo nasconde. |

### Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **punto scelto** (`picked`) | oggetto | La x scelta con un clic o **Invio**: `{ x, time?, values, index }`, come in [Linee](charts.line). |
| **Exception** (`error`) | oggetto | Come ogni blocco; oggi non ci passa niente. |

## Come funziona

I dati, l'asse x (numeri, date ISO o categorie), **aggiungi punto**, il numero di punti tenuti e **punto scelto** funzionano come in [Linee](charts.line). Le differenze:

- **L'asse dei valori comprende sempre lo zero**: le aree partono da lì. Con valori tra 50 e 60 l'asse va da 0 a 60 (a meno di un **Minimo** che scegli tu).
- **Senza impilare** (`none`) ogni serie è un'area trasparente sopra lo zero, con la sua linea. Un punto senza valore interrompe l'area.
- **Impilate** (`stacked`): ogni serie sta sopra la precedente, nell'ordine delle serie; la cima dell'ultima è il totale. Per ogni x si sommano solo i valori **positivi**: un valore negativo conta come 0. Una serie che non ha un valore a una x conta 0 a quella x.
- **Al 100%** (`percent`): come impilate, ma a ogni x i valori diventano la loro parte del totale; l'asse va da 0 a 100. Se a una x il totale è 0, tutte le serie valgono 0 lì.
- Con le aree impilate il riquadro dei valori e **punto scelto** danno i **valori veri** di ogni serie (non quelli sommati, né le percentuali).
- Le serie spente con la legenda escono anche dalla pila: le altre si riabbassano.

## Esempi

### 1. Consumi della serra, impilati

```
Finestra «Consumi»
└ Colonna (radice)
  └ Aree  area1  Titolo «Consumi»  Unità «€»  Impilate stacked
```

```
[Costante · Variabile (JSON): {"Gen": {"Acqua": 30, "Concime": 10, "Energia": 25}, "Feb": {"Acqua": 28, "Concime": 12, "Energia": 22}, "Mar": {"Acqua": 35, "Concime": 15, "Energia": 18}}] valore ──▶ dati [Aree: Consumi]
```

Tre fasce una sopra l'altra; la cima a gennaio è 65 €, a febbraio 62 €, a marzo 68 €. Il riquadro su «Feb» dice «Acqua 28 €», «Concime 12 €», «Energia 22 €».

### 2. La stessa cosa in percentuale

Cambia **Impilate** in `percent`: ogni mese arriva a 100. A gennaio l'acqua occupa il 46% circa (30 su 65), il concime il 15%, l'energia il 38%. Il riquadro mostra sempre i valori in euro.

### 3. Due misure che crescono, un punto per volta

```
[Intervallo (setInterval): 60 s] impulso ──▶ leggi [readFile: ~/contatori.json, JSON] contenuto ──▶ aggiungi punto [Aree: Litri]
```

Il file contiene ogni volta un oggetto come `{"Pozzo": 120, "Acquedotto": 45}`: a ogni lettura le due serie ricevono un punto ciascuna, alla x successiva (0, 1, 2…). Per avere l'ora sull'asse, scrivi nel file anche la data: `{"x": "2026-11-11T10:00:00Z", "Pozzo": 120, "Acquedotto": 45}`.

## Accessibilità e tastiera

Come in [Linee](charts.line): **Tab** per raggiungerlo, frecce per passare da una x all'altra, **Invio** per mandare il punto, **Esc** per togliere la scelta. **Mostra come tabella** ha una riga per x e una colonna per serie, con i valori veri.

## Vedi anche

- [Linee](charts.line), [Colonne](charts.column) (anche loro impilabili)
- [Torta · Ciambella](charts.pie) per le parti di un totale in un solo momento
- [Grafici](logicstudio-charts): le forme dei dati, i limiti, la tastiera
