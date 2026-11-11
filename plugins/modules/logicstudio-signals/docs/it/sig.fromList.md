# Segnale da lista

`sig.fromList` · Segnali · [Segnali](logicstudio-signals) · versione 1

Trasforma una lista di numeri in un **segnale**, dandole la frequenza di campionamento e il tempo del primo campione. Serve per portare nei blocchi dei segnali dei dati che vengono da fuori: un file, una tabella, la lettura di una macchina.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **campioni** (`samples`) | lista | I valori, in ordine di tempo. Ogni elemento deve essere un numero (anche un testo con un numero, come `"2,5"`). |
| **parte immaginaria** (`im`) | lista | La parte immaginaria, per un segnale complesso: deve avere tanti valori quanti i campioni. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |
| **fs** (`fs`) | numero | La frequenza di campionamento in Hz; se è maggiore di 0 prende il posto di quella delle Proprietà. Nascosta di serie: si mostra con l'occhio nelle Proprietà. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **segnale** (`signal`) | oggetto | Il segnale: `{ fs, t0, samples }`, con `im` se è stata data la parte immaginaria. |
| **Exception** (`error`) | oggetto | Campioni che non sono una lista di numeri, parte immaginaria sbagliata, fs non valida, segnale troppo lungo. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Frequenza di campionamento fs (Hz)** (`fs`) | più di 0 | 1000 | La frequenza di campionamento, quando non arriva dalla porta **fs**. |
| **Tempo del primo campione t₀ (s)** (`t0`) | numero | 0 | Il tempo del primo campione: i campioni sono a `t₀ + i/fs`. |

## Come funziona

Il blocco non fa niente finché non arrivano i **campioni**. Poi, a ogni nuovo valore su **campioni**, **parte immaginaria** o **fs**, manda il segnale con gli ultimi valori ricevuti.

- **fs** viene dalla porta se questa ha un numero maggiore di 0, altrimenti dalle Proprietà.
- I campioni devono essere una **lista**: un testo o un numero singolo non vanno bene (per un valore alla volta c'è il [Buffer](sig.buffer)).
- Gli altri blocchi di questo pacchetto accettano anche una lista semplice come segnale, con la loro «fs delle liste semplici». Questo blocco serve quando la fs deve essere diversa da quella (o la lista deve avere un `t0`, o una parte immaginaria).
- Per tornare da un segnale a una lista di numeri c'è [Scomponi segnale](sig.info).

## Un po' di teoria

Un segnale digitale è una **sequenza di numeri** `x[n]` che hanno senso solo insieme a una **frequenza di campionamento** `fs`: i campioni sono presi ogni `Ts = 1/fs` secondi, quindi il campione `n` corrisponde al tempo `t = t₀ + n/fs`. La stessa lista di 1000 numeri è un secondo di segnale a 1000 Hz o dieci secondi a 100 Hz: cambia tutto, a partire dalle frequenze che si leggono in uno spettro (che arrivano fino a `fs/2`).

Un segnale **complesso** ha una parte reale e una immaginaria: `z[n] = x[n] + j·y[n]`. Si usa per i segnali I/Q delle radio e per gli spettri; con un segnale complesso lo spettro non è simmetrico, e va visto da `−fs/2` a `fs/2`.

## Esempi

### 1. Una lista da una tabella

Una lista di 8 letture prese ogni 0,5 secondi (fs = 2 Hz) diventa un segnale:

```
[Costante · Variabile: [1, 2, 3, 4, 5, 6, 7, 8]] valore ──▶ campioni [Segnale da lista] segnale ──▶ segnale [Misure (RMS, picco, media)]
```

Con **fs** 2 e **t₀** 0 i campioni sono ai tempi `0; 0,5; 1; 1,5…`. La lista `[1, 2, 3]` con fs 2 dà `{ "fs": 2, "t0": 0, "samples": [1, 2, 3] }`.

### 2. Un segnale complesso

Due liste, parte reale e parte immaginaria, di uguale lunghezza:

```
[Costante · Variabile: reale]       valore ──▶ campioni         [Segnale da lista] segnale ──▶ segnale [FFT (np.fft.fft)]
[Costante · Variabile: immaginaria] valore ──▶ parte immaginaria
```

Con `[1, 2, 3]` e `[0, 1, 0]` esce `{ "samples": [1, 2, 3], "im": [0, 1, 0], … }`.

## Errori

| Messaggio | Quando |
|---|---|
| La frequenza di campionamento deve essere più di 0 | La **fs** delle Proprietà è 0 o negativa e nessun numero maggiore di 0 arriva dalla porta **fs**. |
| I campioni devono essere una lista di numeri | **campioni** non è una lista (un testo, un numero, un oggetto). |
| I campioni: il valore N non è un numero | L'elemento N della lista non è un numero. |
| Segnale troppo lungo: … campioni, al massimo … (Pannello di controllo → Logic Studio → Limiti) | La lista ha più elementi del limite del motore (65536 di serie). Vedi [Limiti](logicstudio-engine/limits). |
| La parte immaginaria deve essere una lista di numeri | **parte immaginaria** non è una lista. |
| La parte immaginaria: il valore N non è un numero | L'elemento N della parte immaginaria non è un numero. |
| La parte immaginaria deve avere tanti valori quanti i campioni | Le due liste hanno lunghezze diverse. |

## Vedi anche

- [Scomponi segnale](sig.info) per l'operazione inversa
- [Buffer (campioni → finestre)](sig.buffer) per costruire un segnale da valori che arrivano uno alla volta
- [Per grafico](sig.toChart) per disegnarlo
- [Segnali](logicstudio-signals), tutti i blocchi del pacchetto
- [Come funziona un blocco](ide/blocks)
