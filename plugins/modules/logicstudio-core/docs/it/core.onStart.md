# All'avvio

`core.onStart` · Tempo · [Blocchi di base](logicstudio-core) · versione 1

Manda un impulso, una volta sola, quando il programma parte.

## Ingressi

Nessuno.

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **impulso** (`pulse`) | impulso | Un impulso (il valore sì) appena il programma parte. |
| **Eccezione** (`error`) | oggetto | In pratica non succede. |

## Come funziona

Il blocco manda **un solo impulso** per ogni partenza del programma, e poi non fa più niente. Il programma «parte» quando:

- premi **Prova** (o **F5**) nell'IDE;
- premi **Attiva**, oppure **Sostituisci** un programma attivo;
- un programma attivo riparte da solo perché è ripartito il computer su cui gira lilOS;
- si apre un'app fatta con **Crea app**.

Quindi in un programma attivo l'impulso può arrivare **più volte nella vita del programma**: una a ogni ripartenza. Se il blocco serve a fare qualcosa una volta sola per sempre (per esempio creare un file), controlla prima se è già stato fatto, per esempio con [Esiste](lilos.exists).

### Prima dei valori iniziali

L'impulso parte **prima** che gli ingressi dei blocchi ricevano i loro **valori iniziali**. Un blocco collegato direttamente ad All'avvio può quindi girare una prima volta senza i suoi valori iniziali, e poi un'altra volta quando arriva il valore iniziale (se quell'ingresso **lo avvia**).

Per esempio, con [Concatena](core.concat) che ha il valore iniziale `"X"` su **a** e All'avvio collegato a **b**, la console scrive prima `true` e poi `Xtrue`.

Per farlo girare una volta sola con tutti i valori iniziali:

1. metti un blocco [Aspetta](core.delay) con **Secondi** = 0 tra All'avvio e il blocco: l'impulso arriva subito dopo i valori iniziali;
2. togli **lo avvia** dagli ingressi che hanno il valore iniziale.

Con queste due cose l'esempio di prima scrive solo `Xtrue`.

### Più blocchi All'avvio

Puoi mettere più blocchi All'avvio, anche in schemi diversi: ognuno manda il suo impulso. L'ordine tra loro non è garantito: se più cose devono succedere in un ordine preciso, usa un All'avvio solo e una [Sequenza](core.sequence).

Per le regole generali vedi [Come funziona un blocco](ide/blocks).

## Esempi

### 1. Un messaggio alla partenza

```
[All'avvio] impulso ──▶ invia [Valore: testo "Programma partito"] valore ──▶ valore [Scrivi in console: informazione]
```

A ogni partenza la console scrive `Programma partito`. Lo stesso si ottiene con il solo [Valore](core.value) e **Invia all'avvio** spuntata; All'avvio serve quando lo stesso blocco deve partire anche per altri motivi (con **Invia all'avvio** tolta e altri collegamenti su **invia**).

### 2. Una domanda all'utente appena parte

```
[All'avvio] impulso ──▶ chiedi [Leggi da console: "Come ti chiami?"] valore ──▶ … 
```

Appena il programma parte, la console fa la domanda.

### 3. Tre cose in ordine

```
[All'avvio] impulso ──▶ avvia [Sequenza] 1 ──▶ pulisci [Scrivi in console]
                                         2 ──▶ leggi   [Data e ora] ISO ──▶ valore [Scrivi in console]
                                         3 ──▶ acceso  [Ogni… 10 s]
```

La [Sequenza](core.sequence) ha tre uscite aggiunte, **1**, **2** e **3**. All'avvio la console viene pulita, poi scrive la data e l'ora, poi parte un [Ogni…](core.every) che aveva **Parte da solo** tolta (l'impulso vale sì, quindi lo accende).

## Vedi anche

- [Ogni…](core.every) per impulsi che si ripetono
- [Valore](core.value) con **Invia all'avvio**
- [Sequenza](core.sequence)
- [Prova e programmi attivi](ide/run)
- [Come funziona un blocco](ide/blocks)
