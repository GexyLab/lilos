# Costanti astronomiche e della Terra

`const.astro` · Valori · [Costanti](logicstudio-constants) · versione 1

> **Blocco obsoleto** dalla versione 1.1.0 del pacchetto: gli schemi salvati che lo usano funzionano come prima, ma non è più nell'elenco dei blocchi. Ogni costante ha ora il suo blocco, nella categoria **Costanti astronomiche**: vedi l'elenco nella [panoramica del pacchetto](logicstudio-constants). Questa pagina descrive il blocco vecchio.

Dà il valore di una costante astronomica o della Terra, scelta nelle impostazioni, con il suo simbolo, la sua unità SI e la sua incertezza: l'unità astronomica, l'anno luce, il parsec, i valori nominali del Sole e della Terra e l'accelerazione di gravità standard.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **invia** (`send`) | impulso | Nascosto di serie: per collegarlo, mostralo con l'**occhio** accanto alla porta nelle **Proprietà**. Se è collegato, il valore esce **solo** a ogni impulso che arriva qui (quello che arriva non conta, anche `false` o `0`). Se non è collegato, il valore esce una volta all'avvio dello schema. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | numero | Il valore della costante scelta. |
| **simbolo** (`symbol`) | testo | Nascosta di serie. Il simbolo della costante, come nella tabella sotto (per esempio `π`). |
| **unità** (`unit`) | testo | Nascosta di serie. L'unità di misura SI del valore, come nella tabella sotto (per esempio `m/s`); testo vuoto per un numero puro. |
| **incertezza** (`uncertainty`) | numero | Nascosta di serie. L'incertezza standard del valore, nella stessa unità; `0` per una costante esatta. |
| **Exception** (`error`) | oggetto | Quando la costante scelta non esiste in questa versione del pacchetto (vedi **Errori**). |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Costante** (`constant`) | una delle costanti della tabella sotto | au · Unità astronomica (`au`) | Quale costante mandare. Nel menu ogni voce mostra il simbolo e il nome. |

## Come funziona

### Quando manda il valore

| invia | Cosa fa |
|---|---|
| non collegato | Manda il valore una volta, all'avvio dello schema, su tutte le uscite. |
| collegato | Manda il valore a ogni impulso su **invia**, mai all'avvio. |

All'avvio il blocco manda prima di tutto **valore**, poi le altre uscite. Le uscite nascoste mandano lo stesso il loro valore: mostrale con l'**occhio** nelle **Proprietà** per collegarle. Sotto il nome del blocco, nel disegno, compare la **chiave** della costante scelta (per esempio `au`): la trovi nell'ultima colonna delle tabelle.

I valori sono numeri a doppia precisione, come tutti i numeri di Logic Studio e di JavaScript: hanno 15-17 cifre significative. Un calcolo può quindi dare un risultato leggermente diverso da quello esatto: per esempio il seno di 30° esce `0.49999999999999994` e non `0.5`. Per mostrarlo arrotondato usa [Funzioni Math](core.math) (`round`) dopo una moltiplicazione, o [Template (formatta)](core.format).

Per un numero qualsiasi che non è in elenco usa [Costante · Variabile](core.value).

### Note sulle costanti

- **Unità astronomica**, **anno luce**, **parsec** e **anno giuliano** sono esatti per definizione (IAU 2012 e 2015): l'anno luce è la distanza percorsa dalla luce in un anno giuliano (365,25 giorni), il parsec è 648000/π unità astronomiche.
- I valori del **Sole** e della **Terra** con incertezza `esatta` sono i **valori nominali** della IAU (Risoluzione B3 del 2015): numeri fissati per convenzione, da usare come unità, vicini ai valori misurati ma non uguali (il raggio del Sole misurato, per esempio, cambia un poco con il metodo).
- Le **masse** del Sole e della Terra si ricavano da GM diviso G: la loro incertezza viene da quella di G, che è molto più grande di quella di GM. Per i calcoli delle orbite usa il **parametro gravitazionale** (GM☉, GM⊕), che è più preciso.
- Il **raggio medio** della Terra è quello del modello WGS 84 (R₁); la **velocità angolare** è quella del modello GRS 80.
- L'**accelerazione di gravità standard** gₙ è un valore convenzionale (esatto) vicino alla gravità al livello del mare; la gravità vera cambia con la latitudine e l'altitudine.

Per le regole generali (ingressi nascosti, Exception) vedi [Come funziona un blocco](ide/blocks).

## Le costanti

### Distanze e tempi

| Simbolo | Costante | Valore | Incertezza | Unità | Chiave |
|---|---|---|---|---|---|
| au | Unità astronomica | `149597870700` | esatta | m | `au` |
| ly | Anno luce | `9460730472580800` | esatta | m | `ly` |
| pc | Parsec | `30856775814913670` | esatta | m | `pc` |
| a | Anno giuliano | `31557600` | esatta | s | `year` |

### Il Sole

| Simbolo | Costante | Valore | Incertezza | Unità | Chiave |
|---|---|---|---|---|---|
| GM☉ | Parametro gravitazionale del Sole | `132712440000000000000` | esatta | m³/s² | `GMsun` |
| M☉ | Massa del Sole | `1.98841e+30` | `4.5e+25` | kg | `Msun` |
| R☉ | Raggio del Sole | `695700000` | esatta | m | `Rsun` |
| L☉ | Luminosità del Sole | `3.828e+26` | esatta | W | `Lsun` |
| T☉ | Temperatura efficace del Sole | `5772` | esatta | K | `Tsun` |
| S☉ | Costante solare (irraggiamento a 1 au) | `1361` | esatta | W/m² | `S` |

### La Terra

| Simbolo | Costante | Valore | Incertezza | Unità | Chiave |
|---|---|---|---|---|---|
| GM⊕ | Parametro gravitazionale della Terra | `398600400000000` | esatta | m³/s² | `GMearth` |
| M⊕ | Massa della Terra | `5.97217e+24` | `130000000000000000000` | kg | `Mearth` |
| Rₑ⊕ | Raggio equatoriale della Terra | `6378100` | esatta | m | `ReEarth` |
| Rₚ⊕ | Raggio polare della Terra | `6356800` | esatta | m | `RpEarth` |
| R⊕ | Raggio medio della Terra | `6371008.7714` | esatta | m | `RmEarth` |
| ω⊕ | Velocità angolare della Terra | `0.00007292115` | esatta | rad/s | `omegaEarth` |
| gₙ | Accelerazione di gravità standard | `9.80665` | esatta | m/s² | `gn` |

## Esempi

### 1. Quanto ci mette la luce del Sole ad arrivare

```
[Costanti astronomiche e della Terra: au] valore ──▶ a [Divisione (÷ %)] risultato ──▶ valore [Print (console.log)]
[Costanti fisiche: c]                     valore ──▶ b
```

Dai a **b** della [Divisione (÷ %)](core.divide) il valore iniziale `1` nelle Proprietà: se **au** arriva prima di **c**, un **b** mancante vale 0 e la Divisione darebbe «Divisione per zero». L'ultima riga della console è `499.00478383615643`: circa 499 secondi, cioè 8 minuti e 19 secondi.

### 2. Il peso di una massa

```
[Campo numerico: massa (kg)] valore ──▶ a [Moltiplicazione (×)] risultato ──▶ valore [Valore: peso (N)]
[Costanti astronomiche e della Terra: gn] valore ──▶ b
```

Togli «lo avvia» dall'ingresso **b**, così all'avvio non esce la sola gₙ. Con 70 kg il peso è 686,4655 newton: il [Valore](ui.value) riceve `686.4654999999999` per l'arrotondamento dei numeri, quindi imposta i suoi **Decimali** (per esempio 2) per vederlo arrotondato.

## Errori

| Messaggio | Quando |
|---|---|
| Costante sconosciuta: `chiave` (Unknown constant) | La chiave salvata nello schema non è una di quelle di questa versione del pacchetto: lo schema è stato fatto con una versione più nuova, o il file `.lsch` è stato cambiato a mano. Scegli di nuovo la costante nelle **Proprietà**. |

## Vedi anche

- [Costanti fisiche (CODATA)](const.physics), [Costanti matematiche (Math.PI, Math.E…)](const.math)
- [Costante · Variabile](core.value), [Divisione (÷ %)](core.divide)
- [Come funziona un blocco](ide/blocks)
