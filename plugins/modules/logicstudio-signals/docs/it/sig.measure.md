# Misure (RMS, picco, media)

`sig.measure` · Segnali · [Segnali](logicstudio-signals) · versione 1

Misura un segnale nel tempo: valore efficace (RMS), picco, media (continua), minimo, massimo, picco-picco, deviazione standard, fattore di cresta, potenza media, energia e RMS in dB.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **segnale** (`signal`) | qualsiasi | Il segnale: un segnale vero `{ fs, t0, samples }` o una lista di numeri. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **efficace (RMS)** (`rms`) | numero | Il valore efficace. |
| **picco** (`peak`) | numero | Il valore assoluto più grande dei campioni. |
| **media (continua)** (`mean`) | numero | La media dei campioni (la componente continua). |
| **minimo** (`min`) | numero | Il campione più basso. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **massimo** (`max`) | numero | Il campione più alto. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **picco-picco** (`peakToPeak`) | numero | Massimo meno minimo. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **deviazione standard** (`std`) | numero | La deviazione standard dei campioni. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **fattore di cresta** (`crest`) | numero | Picco diviso RMS. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **potenza media** (`power`) | numero | La media dei quadrati dei campioni. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **energia** (`energy`) | numero | La somma dei quadrati divisa per la fs. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **RMS in dB** (`db`) | numero | L'RMS in decibel rispetto a **Riferimento dei dB**. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **tutte le misure** (`all`) | oggetto | Tutte le misure insieme, più `n` (quanti campioni) e `duration` (durata in secondi). Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **Exception** (`error`) | oggetto | Un segnale vuoto, un ingresso che non è un segnale, o un segnale troppo lungo. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Riferimento dei dB (0 dB)** (`ref`) | numero maggiore di 0 | 1 | Il valore che corrisponde a 0 dB per l'uscita **RMS in dB**. |
| **fs delle liste semplici (Hz)** (`listFs`) | numero maggiore di 0 | 1000 | La frequenza di campionamento data a una lista semplice di numeri in ingresso (serve per l'energia e la durata). Un segnale vero porta già la sua fs. |

## Come funziona

A ogni segnale che arriva, il blocco calcola tutte le misure sull'intero segnale (non si aggiorna campione per campione) e le manda: si collegano solo le uscite che servono.

| Misura | Formula |
|---|---|
| RMS | `√( Σx² / N )` |
| picco | il più grande tra `abs(minimo)` e `abs(massimo)` |
| media | `Σx / N` |
| picco-picco | `massimo − minimo` |
| deviazione standard | `√( potenza − media² )` (calcolata su `N`, non su `N − 1`) |
| fattore di cresta | `picco / RMS` (0 se l'RMS è 0) |
| potenza media | `Σx² / N` |
| energia | `Σx² / fs` |
| RMS in dB | `20·log₁₀( RMS / riferimento )`, mai sotto −300 dB |

Il blocco misura *tutti* i campioni che arrivano insieme in un segnale: un segnale di 1000 campioni dà una misura sola. Per misure scorrevoli, taglia il flusso in finestre con [Buffer (campioni → finestre)](sig.buffer).

Con un seno di ampiezza 1 e frequenza 50 Hz per 1 s a 1000 Hz: RMS 0,7071, picco 1, media circa 0, picco-picco 2, fattore di cresta 1,4142, potenza 0,5, energia 0,5 (1000 campioni · 0,5 / 1000 Hz), **RMS in dB** −3,01. Con `[1, 2, 3, 4]` a 10 Hz: RMS 2,7386, picco 4, media 2,5, deviazione standard 1,118, potenza 7,5, energia 3, durata 0,4 s.

## Un po' di teoria

- **RMS.** È il valore efficace: quello di una tensione continua che scalderebbe una resistenza come il segnale. Per un seno di ampiezza `A` è `A / √2 ≈ 0,707·A`; per un'onda quadra è `A`; per un triangolo `A / √3`.
- **Media, deviazione e RMS.** Valgono sempre `RMS² = media² + deviazione²`: la potenza è la somma della parte continua (media²) e di quella che oscilla (deviazione²). Per un segnale senza continua, deviazione standard e RMS sono uguali.
- **Fattore di cresta** `= picco / RMS`: 1 per un'onda quadra, 1,414 (3,01 dB) per un seno, 1,73 per un triangolo, 3–4 per il rumore gaussiano. Dice quanto "spigolosa" è l'onda e quanto margine serve prima di saturare un convertitore.
- **Potenza ed energia.** La potenza media è `Σx²/N`; l'energia `Σx²/fs` è l'integrale di `x(t)²` sul tempo: per il teorema di Parseval è la stessa che si ottiene sommando lo spettro.
- **Misurare bene.** RMS e media di un segnale periodico sono precisi se la finestra contiene periodi **interi**; altrimenti il resto di un periodo li sporca (un errore che scende con più periodi). La media di un seno su un periodo intero è zero.
- **dB.** Un RMS di 1 rispetto a un riferimento di 1 vale 0 dB; 0,1 vale −20 dB. Vedi [dB ↔ lineare](sig.db).

## Esempi

### 1. Il livello di un segnale

```
[Generatore (oscillatore)] segnale ──▶ segnale [Misure (RMS, picco, media)] efficace (RMS) ──▶ valore [Etichetta]
```

Con il seno predefinito (ampiezza 1) l'etichetta mostra circa `0,707`.

### 2. Togliere la continua e misurare quanto oscilla

```
[Segnale da lista] segnale ──▶ segnale [Misure (RMS, picco, media)] deviazione standard ──▶ valore [Print (console.log)]
```

L'uscita **deviazione standard** è nascosta di serie: si mostra con l'occhio nelle Proprietà. Se vuoi invece il segnale senza continua, usa [Guadagno · Offset](sig.gain) con **Togli prima la media**.

### 3. Un'unica uscita con tutto

Collega **tutte le misure** a un [Per grafico](sig.toChart) o a un blocco che legge oggetti: l'oggetto ha `rms`, `peak`, `mean`, `min`, `max`, `peakToPeak`, `std`, `crest`, `power`, `energy`, `db`, `n` e `duration`.

## Errori

| Messaggio | Quando |
|---|---|
| Il segnale è vuoto | Il segnale non ha campioni (lista `[]`). |
| Il segnale manca | Il blocco parte senza segnale in ingresso. |
| Il segnale deve essere una lista di numeri o un oggetto { fs, samples } | L'ingresso è un numero, un testo o un oggetto che non è un segnale. |
| Il segnale: il valore … non è un numero | Una lista o un segnale contiene qualcosa che non è un numero. |
| Il segnale ha una frequenza di campionamento (fs) non valida | Un segnale con fs 0, negativa o non numerica. |
| Il segnale ha samples e im di lunghezze diverse | Un segnale complesso con parte reale e immaginaria di lunghezza diversa. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) | Più campioni del limite (vedi [Limiti del motore](logicstudio-engine/limits)). |

## Vedi anche

- [Distorsione (THD, SNR, SINAD)](sig.distortion) per misurare armoniche e rumore
- [Frequenza · Periodo](sig.frequency) per misurare la frequenza di un segnale
- [dB ↔ lineare](sig.db) per convertire le misure in dB
- [Guadagno · Offset](sig.gain) per togliere la media o normalizzare a un picco o RMS
- [Segnali](logicstudio-signals), tutti i blocchi del pacchetto
- [Come funziona un blocco](ide/blocks)
