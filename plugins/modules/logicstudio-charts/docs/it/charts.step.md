# Gradini

`charts.step` · Grafici · [Grafici](logicstudio-charts) · versione 1

**Stati nel tempo**: una corsia per ogni cosa da seguire (una pompa, una porta, una macchina), e lungo la corsia quando era accesa o spenta, aperta o chiusa, o in quale stato a parole («riempimento», «pausa», «guasto»). Lo stato cambia a gradini: resta uguale fino al valore dopo.

## Proprietà

| Proprietà | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Titolo** | testo (traducibile) | vuoto | Scritto sopra il grafico; dà anche il nome ai file PNG e CSV. |
| **Altezza (px)** | da 20 a 2000 | 200 | L'altezza del disegno. Ogni corsia è alta al massimo 34 pixel. |
| **Legenda** | sì/no | sì | Mostra la legenda (da due corsie in su); un clic nasconde una corsia. |
| **Punti tenuti per serie** | da 10 a 100000 | 1000 | Quanti cambi di stato tiene ogni corsia (vale anche il limite dell'amministratore). |
| **Colori** | `standard`, `blue` | `standard` | I colori delle corsie sì/no. |
| **Pulsanti vista tabella, PNG e CSV** | sì/no | sì | I tre pulsanti in alto a destra. |
| **Tempo mostrato (secondi, 0: tutto)** | da 0 a 604800 | 300 | Quanto tempo indietro mostra il grafico (300 = 5 minuti, 604800 = una settimana). 0: dal primo stato ricevuto ad adesso. |

## Porte del suo oggetto nello schema

### Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **pulisci** (`clear`) | impulso | Toglie tutti gli stati di tutte le corsie. |
| **abilitato** (`enabled`) | sì/no | `false` lo rende più chiaro e lo spegne. |
| **visibile** (`visible`) | sì/no | `false` lo nasconde. |
| *stati aggiunti* | qualsiasi | Uno per corsia: ogni valore che arriva è il nuovo stato di quella corsia, da adesso. |

### Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **punto scelto** (`picked`) | oggetto | Gli stati di tutte le corsie nell'istante scelto con un clic o **Invio**. |
| **Eccezione** (`error`) | oggetto | Come ogni blocco; oggi non ci passa niente. |

## Porte aggiuntive

Una porta per corsia, fino a **8**, di tipo qualsiasi. Si chiamano «stato 1», «stato 2»… e **il nome della porta è il nome della corsia**, scritto a sinistra. Si vedono in corsivo sull'oggetto nello schema.

> Senza porte aggiunte il grafico resta vuoto («Nessun dato»). Attenzione: in questa versione l'editor della finestra non ha ancora un comando per aggiungere porte a una componente, e nemmeno le Proprietà del suo oggetto nello schema lo hanno. Finché non c'è, il grafico Gradini resta senza corsie.

## Come funziona

- **Un valore su una porta = un cambio di stato adesso**, all'istante in cui arriva nella finestra. Lo stato dura fino al valore dopo (o fino ad adesso, se è l'ultimo).
- **Corsie sì/no**: se in una corsia arrivano solo valori che vogliono dire sì o no, la corsia è **sì/no**: dove è «sì» c'è una barra piena del colore della corsia, dove è «no» una linea sottile. Valgono come sì: `true`, `1`, `"true"`, `"on"`, `"1"`, `"yes"`, `"sì"`, `"si"`, `"acceso"`, `"aperto"`; come no: `false`, `0`, `"false"`, `"off"`, `"0"`, `"no"`, `"spento"`, `"chiuso"` (maiuscole e spazi non contano). Nel riquadro si leggono «acceso» e «spento».
- **Corsie a parole**: se nella corsia arriva anche un solo valore diverso (per esempio `"pausa"` o `2`), **tutta la corsia** diventa a parole: ogni stato è un tratto colorato con il suo nome scritto dentro, se c'è spazio. Ogni stato diverso ha un colore suo, dato nell'ordine in cui gli stati compaiono nel grafico (lo stesso stato ha lo stesso colore in tutte le corsie). Questi colori sono sempre quelli `standard`.
- **Oggetti e liste** diventano il loro testo JSON (`{"fase": 2}` è lo stato `{"fase":2}`). **`null`** vuol dire «nessuno stato»: da lì la corsia è vuota fino al valore dopo.
- **Lo scorrimento**: con un **Tempo mostrato** maggiore di 0 il grafico si ridisegna da solo e il bordo destro è sempre adesso; gli stati usciti dal bordo sinistro vanno via (resta l'ultimo prima del bordo, che entra da sinistra). Con 0 il grafico mostra tutto, dal primo stato, e si ridisegna solo quando arriva un valore nuovo.
- **Una finestra chiusa non registra niente**: quando la apri, il programma le manda l'ultimo valore di ogni porta (se l'opzione **Una finestra riaperta mostra subito gli ultimi valori** è accesa), e ogni corsia riparte da quello stato, adesso.

**Punto scelto** manda gli stati nell'istante del clic (o, con le frecce, nell'istante di un cambio):

| Campo | Contenuto |
|---|---|
| `time` | l'istante come data ISO |
| `x` | lo stesso istante in millisecondi |
| `values` | lo stato di ogni corsia visibile in quell'istante: `true`/`false` per le corsie sì/no, il valore per le altre, per esempio `{"pompa": true, "fase": "riempimento"}` |

## Esempi

### 1. Una pompa e la sua fase

Aggiungi due porte e chiamale **pompa** e **fase**.

```
Finestra «Impianto»
└ Colonna (radice)
  └ Gradini  step1  Titolo «Impianto»  Tempo mostrato 600
```

```
[Interruttore: Pompa] valore ──▶ pompa [Gradini: Impianto]
[Selezione: Fase]     valore ──▶ fase
```

Ogni volta che qualcuno accende o spegne l'[Interruttore](ui.toggle), la corsia «pompa» cambia: barra piena quando è acceso, linea sottile quando è spento. La corsia «fase» mostra a parole la fase scelta nella [Selezione](ui.select) («riempimento», «svuotamento»), ognuna con il suo colore. Si vedono gli ultimi 10 minuti.

### 2. Una porta letta da un file

```
[Intervallo (setInterval): 5 s] impulso ──▶ leggi [readFile: ~/porta.txt] contenuto ──▶ porta [Gradini: Ingresso]
```

Il file contiene `aperto` o `chiuso`: la corsia è sì/no. Ogni 5 secondi arriva lo stato anche se non è cambiato: il disegno non cambia (lo stato continua), ma ogni lettura conta tra i **Punti tenuti per serie** (con 1000 punti e una lettura ogni 5 secondi, la corsia tiene circa 83 minuti: più del **Tempo mostrato** di serie, quindi va bene). Con letture molto fitte e un **Tempo mostrato** lungo, conviene mandare solo i cambi: per esempio [Al cambio (fronte ↑↓)](core.edge) manda un impulso solo quando un sì/no cambia.

### 3. Cosa succedeva alle 10:15?

```
[Gradini: Impianto] punto scelto ──▶ valore [Print (console.log)]
```

Un clic sul grafico all'altezza delle 10:15 scrive `{"time": "2026-11-11T09:15:00.000Z", "x": 1794388500000, "values": {"pompa": true, "fase": "riempimento"}}` (l'ora ISO è in UTC: le 10:15 in Italia d'inverno sono le 09:15 UTC).

## Accessibilità e tastiera

**Tab** per raggiungerlo; le frecce passano da un cambio di stato all'altro (di qualsiasi corsia), **Invio** manda gli stati di quell'istante su **punto scelto**, **Esc** toglie la scelta. Il riquadro elenca ogni corsia con il suo stato. **Mostra come tabella**: una riga per ogni cambio (Tempo) e una colonna per corsia, con «acceso»/«spento» per le corsie sì/no; una corsia senza un cambio in quell'istante ha la cella vuota.

## Vedi anche

- [Tempo reale](charts.live) per numeri che cambiano
- [Spia](ui.lamp) per mostrare solo lo stato di adesso
- [Interruttore](ui.toggle), [Selezione](ui.select), [Al cambio (fronte ↑↓)](core.edge)
- [Grafici](logicstudio-charts): le forme dei dati, i limiti, la tastiera
