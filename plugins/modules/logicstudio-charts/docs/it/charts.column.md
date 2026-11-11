# Colonne

`charts.column` · Grafici · [Grafici](logicstudio-charts) · versione 1

Colonne verticali, una per categoria e per serie: per confrontare quantità tra categorie (zone, mesi, prodotti). Con più serie le colonne di una categoria stanno affiancate, oppure **impilate** una sull'altra.

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
| **Punti tenuti per serie** | da 10 a 100000 | 1000 | Quanti valori tiene ogni serie (vale anche il limite dell'amministratore). |
| **Colori** | `standard`, `blue` | `standard` | 8 colori diversi, oppure 6 toni di blu. |
| **Pulsanti vista tabella, PNG e CSV** | sì/no | sì | I tre pulsanti in alto a destra. |
| **Impilate** | sì/no | no | Le colonne delle serie una sopra l'altra invece che affiancate. |

## Porte del suo oggetto nello schema

### Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **dati (lista o oggetto)** (`data`) | qualsiasi | Sostituisce tutti i dati. |
| **aggiungi punto** (`add`) | qualsiasi | Aggiunge (o cambia) il valore di una categoria. |
| **pulisci** (`clear`) | impulso | Toglie tutti i valori e tutte le categorie. |
| **abilitato** (`enabled`) | sì/no | `false` lo rende più chiaro e lo spegne. |
| **visibile** (`visible`) | sì/no | `false` lo nasconde. |

### Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **colonna scelta** (`picked`) | oggetto | La categoria su cui chi guarda fa clic o preme **Invio**. |
| **Exception** (`error`) | oggetto | Come ogni blocco; oggi non ci passa niente. |

## Come funziona

L'asse in basso ha sempre **categorie**, nell'ordine in cui arrivano; l'asse dei valori comprende sempre lo **zero**: le colonne partono da lì, verso l'alto se il valore è positivo e verso il basso se è negativo.

**Le forme di dati più comode**:

| Dati | Risultato |
|---|---|
| `{"Nord": 12, "Sud": 9, "Est": 14}` | una serie, tre colonne |
| `{"Nord": {"2025": 12, "2026": 15}, "Sud": {"2025": 9, "2026": 11}}` | due categorie, due serie (2025 e 2026) affiancate |
| `[{"zona": "Nord", "2025": 12, "2026": 15}, {"zona": "Sud", "2025": 9, "2026": 11}]` | uguale, scritto come righe di tabella |
| `[{"name": "2025", "data": {"Nord": 12, "Sud": 9}}, {"name": "2026", "data": {"Nord": 15, "Sud": 11}}]` | uguale, scritto come lista di serie |
| `[5, 8, 3]` | una serie con le categorie «0», «1», «2» |

Altre regole:

- **Una categoria che manca in una serie** lascia vuoto il suo posto.
- **Un valore 0** non ha colonna (ha altezza zero), ma il riquadro dei valori lo mostra; un valore piccolissimo ma non zero ha almeno 1 pixel. Un valore vuoto non si vede e non è nel riquadro.
- **Impilate**: per ogni categoria le parti positive si sommano verso l'alto, quelle negative verso il basso; l'asse va dal totale negativo più basso al totale positivo più alto.
- **I nomi lunghi** delle categorie sono accorciati con «…»; quelli che si sovrapporrebbero non sono scritti (il riquadro dei valori li mostra interi).

**Aggiungi punto**:

- `{"x": "Ovest", "y": 7}` aggiunge la categoria «Ovest» con 7 alla prima serie. Se la categoria c'è già, **il valore nuovo prende il posto** di quello vecchio (la colonna cambia altezza).
- `{"x": "Ovest", "2025": 7, "2026": 9}` dà un valore a più serie nella stessa categoria.
- Un numero da solo crea una categoria nuova chiamata con un numero: il numero dopo quello delle categorie che ci sono (con 3 categorie, la nuova si chiama «4»).

> Ogni valore aggiunto conta tra i **Punti tenuti per serie** anche quando cambia una colonna che c'era già.

**Colonna scelta** manda:

| Campo | Contenuto |
|---|---|
| `category` | il nome della categoria, per esempio `"Nord"` |
| `values` | i valori delle serie visibili: `{"2025": 12, "2026": 15}` (una serie senza nome si chiama «Valore») |
| `index` | la posizione della categoria, da 0 |
| `series`, `y` | solo con un clic del mouse su una colonna: la serie di quella colonna e il suo valore |

## Esempi

### 1. Due anni a confronto

```
Finestra «Zone»
└ Colonna (radice)
  └ Colonne  col1  Titolo «Ordini»  Unità «pz»
```

```
[Costante · Variabile (JSON): {"Nord": {"2025": 12, "2026": 15}, "Sud": {"2025": 9, "2026": 11}, "Est": {"2025": 14, "2026": 13}}] valore ──▶ dati [Colonne: Ordini]
```

Tre gruppi di due colonne, con la legenda «2025» e «2026». Un clic sulla colonna 2026 di «Sud» manda `{"category": "Sud", "values": {"2025": 9, "2026": 11}, "index": 1, "series": "2026", "y": 11}`.

### 2. Voti da un sondaggio, che si aggiornano

```
[Pulsante: Rosso] premuto ──▶ più [Contatore (++ −−): rosso] conteggio ──▶ y   [Oggetto { }] oggetto ──▶ aggiungi punto [Colonne: Voti]
[Costante · Variabile (testo): Rosso]  valore ──────────────────────────────▶ x
```

[Oggetto { }](core.compose) ha due ingressi aggiunti, chiamati **x** e **y**. A ogni voto manda `{"x": "Rosso", "y": 4}`: la prima volta la colonna «Rosso» compare, le volte dopo cresce. Ripeti per gli altri colori.

### 3. Entrate e uscite, impilate

Con **Impilate** acceso e dati `{"Gen": {"Entrate": 50, "Uscite": -30}, "Feb": {"Entrate": 40, "Uscite": -45}}` le entrate salgono sopra lo zero e le uscite scendono sotto; l'asse va da −45 a 50 (arrotondati a numeri tondi).

## Accessibilità e tastiera

**Tab** per raggiungerlo; le frecce passano da una categoria all'altra (una fascia evidenzia la categoria e il riquadro mostra tutte le serie), **Inizio** e **Fine** vanno alla prima e all'ultima, **Invio** manda la categoria su **colonna scelta** (senza `series` e `y`), **Esc** toglie la scelta. **Mostra come tabella**: una riga per categoria, una colonna per serie.

## Vedi anche

- [Barre](charts.bar): le stesse cose in orizzontale, ordinabili
- [Istogramma](charts.histogram) per contare quanti valori cadono in ogni classe
- [Oggetto { }](core.compose), [Contatore (++ −−)](core.counter)
- [Grafici](logicstudio-charts): le forme dei dati, i limiti, la tastiera
