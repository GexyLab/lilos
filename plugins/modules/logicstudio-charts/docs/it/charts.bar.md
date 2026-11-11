# Barre

`charts.bar` · Grafici · [Grafici](logicstudio-charts) · versione 1

Barre orizzontali, una riga per categoria: come [Colonne](charts.column), ma girate. Vanno bene quando i nomi delle categorie sono lunghi o quando vuoi una classifica, perché le barre si possono **ordinare** dalla più lunga alla più corta. Con una sola serie il valore è scritto in fondo a ogni barra.

## Proprietà

| Proprietà | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Titolo** | testo (traducibile) | vuoto | Scritto sopra il grafico; dà anche il nome ai file PNG e CSV. |
| **Altezza (px)** | da 20 a 2000 | 200 | L'altezza del disegno: le righe se la dividono. |
| **Legenda** | sì/no | sì | Mostra la legenda (da due serie in su). |
| **Unità** | testo | vuoto | In alto a destra sopra l'asse e dopo ogni valore. |
| **Decimali** | da 0 a 10 | vuoto | Cifre dopo la virgola nei valori scritti, nel riquadro e nella tabella. |
| **Minimo (vuoto: automatico)** | numero | vuoto | Il valore all'inizio (a sinistra) dell'asse. |
| **Massimo (vuoto: automatico)** | numero | vuoto | Il valore alla fine (a destra) dell'asse. |
| **Punti tenuti per serie** | da 10 a 100000 | 1000 | Quanti valori tiene ogni serie (vale anche il limite dell'amministratore). |
| **Colori** | `standard`, `blue` | `standard` | 8 colori diversi, oppure 6 toni di blu. |
| **Pulsanti vista tabella, PNG e CSV** | sì/no | sì | I tre pulsanti in alto a destra. |
| **Impilate** | sì/no | no | Le barre delle serie una dopo l'altra sulla stessa riga invece che una sotto l'altra. |
| **Ordine** | `none`, `asc`, `desc` | `none` | `none`: l'ordine dei dati; `asc`: dal totale più piccolo (in alto) al più grande; `desc`: dal più grande al più piccolo. |

## Porte del suo oggetto nello schema

### Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **dati (lista o oggetto)** (`data`) | qualsiasi | Sostituisce tutti i dati. Le forme sono quelle di [Colonne](charts.column). |
| **aggiungi punto** (`add`) | qualsiasi | Aggiunge (o cambia) il valore di una categoria. |
| **pulisci** (`clear`) | impulso | Toglie tutti i valori e tutte le categorie. |
| **abilitato** (`enabled`) | sì/no | `false` lo rende più chiaro e lo spegne. |
| **visibile** (`visible`) | sì/no | `false` lo nasconde. |

### Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **barra scelta** (`picked`) | oggetto | La categoria su cui chi guarda fa clic o preme **Invio**: `{ category, values, index }` (più `series` e `y` con un clic su una barra). |
| **Eccezione** (`error`) | oggetto | Come ogni blocco; oggi non ci passa niente. |

## Come funziona

Dati, **aggiungi punto** e **barra scelta** funzionano come in [Colonne](charts.column): le categorie sono a sinistra, l'asse dei valori in basso e comprende sempre lo **zero**; i valori negativi vanno a sinistra dello zero.

- **Ordine**: le righe si ordinano per il **totale** di ogni categoria (la somma delle serie, i valori vuoti contano 0). L'ordine si ricalcola a ogni dato nuovo. Con `none` le categorie restano nell'ordine in cui sono arrivate, dalla prima in alto.
- **Il valore scritto in fondo alla barra** c'è solo con **una serie** e quando la barra è alta almeno 10 pixel (con molte righe in poca altezza sparisce: alza **Altezza**). Usa **Unità** e **Decimali**.
- **I nomi delle categorie** occupano al massimo poco più di un terzo della larghezza; quelli più lunghi sono accorciati con «…».
- **Impilate**: per ogni riga le parti positive si mettono in fila verso destra, quelle negative verso sinistra.
- In **barra scelta** `index` è la posizione della categoria nei dati (non la riga in cui la vedi dopo l'ordinamento).

## Esempi

### 1. Classifica delle città

```
Finestra «Classifica»
└ Colonna (radice)
  └ Barre  bar1  Titolo «Abbonati»  Ordine desc  Decimali 0
```

```
[Costante · Variabile (JSON): {"Napoli": 18, "Roma": 42, "Milano": 31, "Torino": 12}] valore ──▶ dati [Barre: Abbonati]
```

Le righe sono Roma (42), Milano (31), Napoli (18), Torino (12), con il numero in fondo a ogni barra. Un clic su Milano manda `{"category": "Milano", "values": {"Valore": 31}, "index": 2, "series": "", "y": 31}`: `index` è 2 perché nei dati Milano è la terza.

### 2. Tempo passato per attività, da un file

Il file `~/attivita.json` contiene righe di tabella:

```
[{"attività": "Riunioni", "ore": 6.5}, {"attività": "Programmazione", "ore": 21}, {"attività": "Posta", "ore": 4}]
```

```
[Intervallo (setInterval): 300 s] impulso ──▶ leggi [readFile: ~/attivita.json, JSON] contenuto ──▶ dati [Barre: Settimana]
```

Il campo di testo `attività` dà le categorie, il campo numerico `ore` la serie. Con **Unità** `h` e **Decimali** 1 la barra di Riunioni dice «6,5 h». Ogni cinque minuti il file viene riletto e le barre si aggiornano.

### 3. Due serie impilate

Con **Impilate** acceso e dati `{"Anna": {"Fatto": 7, "Da fare": 3}, "Luca": {"Fatto": 4, "Da fare": 6}}` ogni persona ha una sola barra lunga 10, divisa in due colori; la legenda dice «Fatto» e «Da fare». Con due serie i valori non sono scritti in fondo alle barre: si leggono nel riquadro.

## Accessibilità e tastiera

**Tab** per raggiungerlo; le frecce passano da una riga all'altra nell'ordine in cui le vedi, **Inizio** e **Fine** vanno alla prima e all'ultima, **Invio** manda la categoria su **barra scelta**, **Esc** toglie la scelta. **Mostra come tabella**: una riga per categoria nell'ordine dei dati, una colonna per serie.

## Vedi anche

- [Colonne](charts.column), [Torta · Ciambella](charts.pie)
- [readFile](lilos.fileRead), [Intervallo (setInterval)](core.every)
- [Grafici](logicstudio-charts): le forme dei dati, i limiti, la tastiera
