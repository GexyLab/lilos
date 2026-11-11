# Torta · Ciambella

`charts.pie` · Grafici · [Grafici](logicstudio-charts) · versione 1

Un cerchio diviso in fette, una per ogni parte di un totale: per vedere quanto pesa ogni parte (le voci di una spesa, i tipi di file in una cartella). Come **ciambella** ha un buco al centro con il totale scritto dentro. Mostra al massimo **6 fette**: le più piccole si uniscono in «Altro».

## Proprietà

| Proprietà | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Titolo** | testo (traducibile) | vuoto | Scritto sopra il grafico; dà anche il nome ai file PNG e CSV. |
| **Altezza (px)** | da 20 a 2000 | 200 | L'altezza del disegno; il cerchio sta nel quadrato più grande che ci entra. |
| **Legenda** | sì/no | sì | La legenda con il nome di ogni fetta (da due fette in su). |
| **Unità** | testo | vuoto | Dopo i valori nel riquadro e nel totale della ciambella. |
| **Decimali** | da 0 a 10 | vuoto | Cifre dopo la virgola dei valori (le percentuali sulle fette sono sempre intere). |
| **Colori** | `standard`, `blue` | `standard` | 8 colori diversi, oppure 6 toni di blu. «Altro» è sempre grigio. |
| **Pulsanti vista tabella, PNG e CSV** | sì/no | sì | I tre pulsanti in alto a destra. |
| **Ciambella** | sì/no | no | Un buco al centro, con il totale e la parola «totale». |

## Porte del suo oggetto nello schema

### Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **dati (nome → valore)** (`data`) | qualsiasi | Le fette. Sostituisce tutto quello che c'era. |
| **abilitato** (`enabled`) | sì/no | `false` lo rende più chiaro e lo spegne. |
| **visibile** (`visible`) | sì/no | `false` lo nasconde. |

La Torta non ha **aggiungi punto** né **pulisci**: per cambiarla manda dati nuovi; per svuotarla manda un oggetto vuoto `{}`.

### Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **fetta scelta** (`picked`) | oggetto | La fetta su cui chi guarda fa clic o preme **Invio**. |
| **Eccezione** (`error`) | oggetto | Come ogni blocco; oggi non ci passa niente. |

## Come funziona

**Le forme di dati**:

| Dati | Fette |
|---|---|
| `{"Acqua": 45, "Concime": 25, "Energia": 18}` | una fetta per chiave (la forma più semplice) |
| `[{"x": "Acqua", "y": 45}, {"x": "Concime", "y": 25}]` o `[["Acqua", 45], ["Concime", 25]]` | uguale |
| `[{"tipo": "Acqua", "euro": 45}, {"tipo": "Concime", "euro": 25}]` | uguale, come righe di tabella (il testo dà il nome, il numero il valore) |
| `[45, 25, 18]` | tre fette chiamate «0», «1», «2» |
| più serie con **un valore ciascuna**, per esempio `{"Acqua": [45], "Concime": [25]}` | una fetta per serie |

Con più serie di più valori la Torta usa **solo la prima serie**.

**Quali fette si vedono**:

- solo i valori **maggiori di zero**: 0, negativi, vuoti e testi che non sono numeri sono lasciati fuori (anche dal totale);
- le fette partono in alto e girano in senso orario, **nell'ordine dei dati** (non sono ordinate per grandezza);
- se le fette sono **più di 6**, restano le 5 più grandi e le altre si uniscono in una fetta grigia **«Altro»**, alla fine; il suo riquadro elenca i nomi che contiene (i primi 6, poi «…»);
- la percentuale è scritta sulle fette che valgono almeno il 6% del totale, quando il cerchio non è troppo piccolo;
- la legenda spegne e riaccende una fetta: le altre si dividono il cerchio e le percentuali si ricalcolano sul totale delle fette accese.

**Il riquadro** di una fetta mostra il nome, il valore (con unità e decimali) e la parte del totale con un decimale, per esempio «45 €» e «45,0%».

**Fetta scelta** manda:

| Campo | Contenuto |
|---|---|
| `name` | il nome della fetta (per «Altro»: la parola «Altro») |
| `value` | il valore (per «Altro»: la somma delle fette che contiene) |
| `share` | la parte del totale delle fette accese, da 0 a 1 (0,45 = 45%) |
| `index` | la posizione della fetta tra quelle accese, da 0 |

**Mostra come tabella** e il CSV elencano **tutte** le fette, anche quelle unite in «Altro», con Nome, Valore e Quota (%).

## Esempi

### 1. Dove vanno i soldi

```
Finestra «Spese»
└ Colonna (radice)
  └ Torta · Ciambella  pie1  Titolo «Spese di ottobre»  Unità «€»  Ciambella sì
```

```
[Valore (JSON): {"Acqua": 45, "Concime": 25, "Energia": 18, "Altro": 12}] valore ──▶ dati [Torta · Ciambella: Spese di ottobre]
```

Quattro fette (45%, 25%, 18%, 12%) e al centro «100 €» con sotto «totale». Un clic sulla fetta dell'energia manda `{"name": "Energia", "value": 18, "share": 0.18, "index": 2}`.

### 2. Più di sei voci

```
[Valore (JSON): {"Foto": 120, "Video": 300, "Musica": 80, "Documenti": 40, "Archivi": 25, "Programmi": 60, "Varie": 10, "Temporanei": 5}] valore ──▶ dati [Torta · Ciambella: Disco]
```

Otto voci, quindi restano le 5 più grandi (Video 300, Foto 120, Musica 80, Programmi 60, Documenti 40), disegnate nell'ordine dei dati: Foto, Video, Musica, Documenti, Programmi. Archivi, Varie e Temporanei diventano l'ultima fetta, grigia, «Altro», da 40. Il riquadro di quella fetta elenca «Archivi, Varie, Temporanei».

### 3. Dalla scelta a un dettaglio

```
[Torta · Ciambella: Spese di ottobre] fetta scelta ──▶ oggetto [Prendi campo: name] valore ──▶ testo [Etichetta: Voce]
```

L'[Etichetta](ui.label) mostra il nome della fetta scelta; con [Formatta testo](core.format) e il campo `share` puoi scrivere «Energia: 18% della spesa».

## Accessibilità e tastiera

**Tab** per raggiungerlo; le frecce passano da una fetta all'altra (la fetta si evidenzia e compare il riquadro), **Invio** la manda su **fetta scelta**, **Esc** toglie la scelta. Un lettore di schermo legge il riassunto e annuncia ogni fetta con valore e percentuale.

## Vedi anche

- [Barre](charts.bar): meglio della torta quando le voci sono tante o simili tra loro
- [Aree](charts.area) al 100% per le parti di un totale che cambiano nel tempo
- [Prendi campo](core.get), [Formatta testo](core.format)
- [Grafici](logicstudio-charts): le forme dei dati, i limiti, la tastiera
