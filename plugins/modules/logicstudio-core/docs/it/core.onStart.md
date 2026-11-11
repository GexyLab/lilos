# All'avvio (main)

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

Quindi in un programma attivo l'impulso può arrivare **più volte nella vita del programma**: una a ogni ripartenza. Se il blocco serve a fare qualcosa una volta sola per sempre (per esempio creare un file), controlla prima se è già stato fatto, per esempio con [exists](lilos.exists).

### Prima dei valori iniziali

L'impulso parte **prima** che gli ingressi dei blocchi ricevano i loro **valori iniziali**. Un blocco collegato direttamente al blocco All'avvio (main) può quindi girare una prima volta senza i suoi valori iniziali, e poi un'altra volta quando arriva il valore iniziale (se quell'ingresso **lo avvia**).

Per esempio, con [Concat testo](core.concat) che ha il valore iniziale `"X"` su **a** e il blocco All'avvio (main) collegato a **b**, la console scrive prima `true` e poi `Xtrue`.

Per farlo girare una volta sola con tutti i valori iniziali:

1. metti un blocco [Ritardo (setTimeout)](core.delay) con **Secondi** = 0 tra il blocco All'avvio (main) e il blocco: l'impulso arriva subito dopo i valori iniziali;
2. togli **lo avvia** dagli ingressi che hanno il valore iniziale.

Con queste due cose l'esempio di prima scrive solo `Xtrue`.

### Più blocchi All'avvio (main)

Puoi mettere più blocchi All'avvio (main), anche in schemi diversi: ognuno manda il suo impulso. L'ordine tra loro non è garantito: se più cose devono succedere in un ordine preciso, usa un solo blocco All'avvio (main) e un blocco [Sequenza (then)](core.sequence).

Per le regole generali vedi [Come funziona un blocco](ide/blocks).

## Esempi

### 1. Un messaggio alla partenza

```
[All'avvio (main)] impulso ──▶ invia [Costante · Variabile: testo "Programma partito"] valore ──▶ valore [Print (console.log): informazione]
```

A ogni partenza la console scrive `Programma partito`. Lo stesso si ottiene con il solo blocco [Costante · Variabile](core.value), senza niente collegato a **invia** (così manda il valore una volta all'avvio dello schema); All'avvio (main) serve quando lo stesso blocco deve partire anche per altri motivi: con un collegamento su **invia**, il blocco manda solo a ogni impulso, e l'impulso di All'avvio (main) gli dà anche la partenza.

### 2. Una domanda all'utente appena parte

```
[All'avvio (main)] impulso ──▶ chiedi [Input (readline): "Come ti chiami?"] valore ──▶ … 
```

Appena il programma parte, la console fa la domanda.

### 3. Tre cose in ordine

```
[All'avvio (main)] impulso ──▶ avvia [Sequenza (then)] 1 ──▶ pulisci [Print (console.log)]
                                         2 ──▶ leggi   [Now (data e ora)] ISO ──▶ valore [Print (console.log)]
                                         3 ──▶ acceso  [Intervallo (setInterval): 10 s]
```

Il blocco [Sequenza (then)](core.sequence) ha tre uscite aggiunte, **1**, **2** e **3**. All'avvio la console viene pulita, poi scrive la data e l'ora, poi parte un blocco [Intervallo (setInterval)](core.every) che aveva **Parte da solo** tolta (l'impulso vale sì, quindi lo accende).

## Vedi anche

- [Intervallo (setInterval)](core.every) per impulsi che si ripetono
- [Costante · Variabile](core.value), che manda da solo all'avvio se **invia** non è collegato
- [Sequenza (then)](core.sequence)
- [Prova e programmi attivi](ide/run)
- [Come funziona un blocco](ide/blocks)
