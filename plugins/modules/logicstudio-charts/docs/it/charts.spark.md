# Mini linea

`charts.spark` · Grafici · [Grafici](logicstudio-charts) · versione 1

Una **linea piccola**, senza assi né griglia, con accanto l'**ultimo valore** scritto: sta in una riga di testo, vicino a un'etichetta. Serve a far vedere l'andamento recente di un numero (sale, scende, è stabile) senza occupare spazio. In inglese si chiama *sparkline*.

## Proprietà

| Proprietà | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Titolo** | testo (traducibile) | vuoto | Scritto **prima** della linea, come un'etichetta. |
| **Unità** | testo | vuoto | Dopo il valore scritto, per esempio «21,4 °C». |
| **Decimali** | da 0 a 10 | vuoto | Le cifre dopo la virgola del valore scritto. Vuoto: fino a 2, quante servono. |
| **Minimo (vuoto: automatico)** | numero | vuoto | Il valore del fondo della linea. Vuoto: il valore più basso tra quelli tenuti. |
| **Massimo (vuoto: automatico)** | numero | vuoto | Il valore della cima. Vuoto: il valore più alto tra quelli tenuti. |
| **Colori** | `standard`, `blue` | `standard` | Il colore della linea: il primo dei colori standard, o il primo blu. |
| **Valori tenuti** | da 2 a 1000 | 50 | Quanti valori disegna: oltre, va via il più vecchio. |
| **Altezza (px)** | da 12 a 200 | 28 | L'altezza della linea. |

La Mini linea non ha legenda, strumenti (tabella, PNG, CSV) né il limite di punti dell'amministratore: vale solo **Valori tenuti**.

## Porte del suo oggetto nello schema

### Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | numero | Un valore nuovo: si aggiunge in fondo alla linea e diventa il valore scritto. |
| **pulisci** (`clear`) | impulso | Toglie tutti i valori; il valore scritto torna «—». |
| **abilitato** (`enabled`) | sì/no | `false` la rende più chiara. |
| **visibile** (`visible`) | sì/no | `false` la nasconde. |

### Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **Eccezione** (`error`) | oggetto | Come ogni blocco; oggi non ci passa niente. |

La Mini linea non ha **punto scelto**: un clic non manda niente.

## Come funziona

- All'inizio non c'è la linea e il valore scritto è **«—»**.
- Ogni numero su **valore** si aggiunge a destra; la linea si allarga sempre su tutta la larghezza, qualunque sia il numero di valori (con un solo valore c'è solo il pallino). L'ultimo valore ha un pallino e viene scritto a destra della linea, formattato nella lingua di chi guarda: 21,456 senza **Decimali** diventa «21,46», con **Decimali** 1 «21,5».
- I numeri scritti come testo valgono (`"21,5"`). Un valore che non è un numero (un testo, `null`, un oggetto) è **ignorato**: la linea e il valore scritto restano come sono.
- **La scala**: senza Minimo e Massimo la linea va dal valore più basso al più alto tra quelli tenuti, quindi anche piccole variazioni si vedono bene. Se tutti i valori sono uguali, la linea è piatta a metà altezza. Con Minimo e Massimo la scala resta fissa.
- Sotto la linea c'è un'area leggera dello stesso colore.
- Passando con il mouse compare il riquadro con il valore del punto più vicino.
- **Una finestra chiusa non registra niente**: quando la apri vedi solo l'ultimo valore (se l'opzione del progetto **Una finestra riaperta mostra subito gli ultimi valori** è accesa), e la linea ricomincia da lì.
- Nell'editor della finestra la Mini linea mostra 30 valori inventati.

## Esempi

### 1. Temperatura in una riga

```
Finestra «Cruscotto»
└ Colonna (radice)
  └ Riga
    ├ Mini linea  sp1  Titolo «Serra»   Unità «°C»  Decimali 1
    └ Mini linea  sp2  Titolo «Esterno» Unità «°C»  Decimali 1
```

```
[Intervallo (setInterval): 30 s] impulso ──▶ leggi [readFile: ~/serra.txt]   contenuto ──▶ valore [Mini linea: Serra]
[Intervallo (setInterval): 30 s] impulso ──▶ leggi [readFile: ~/esterno.txt] contenuto ──▶ valore [Mini linea: Esterno]
```

Due righe compatte: «Serra», la linea delle ultime 50 letture (25 minuti) e «22,4 °C»; sotto lo stesso per l'esterno. Con file che contengono `22.4` o `22,4` il risultato è uguale.

### 2. Il prezzo di un servizio, con scala fissa

```
[Intervallo (setInterval): 300 s] impulso ──▶ invia [HTTP (fetch): https://esempio.it/prezzo] risposta ──▶ oggetto [Get proprietà (obj.campo): eur] valore ──▶ valore [Mini linea: Prezzo]
```

Con **Minimo** 0 e **Massimo** 200 la linea si muove poco se il prezzo cambia di pochi euro; lasciandoli vuoti, anche una variazione di 1 euro occupa tutta l'altezza. Scegli in base a cosa vuoi notare. [HTTP (fetch)](net.request) è del pacchetto [Blocchi di rete](logicstudio-net).

### 3. Ricominciare ogni giorno

```
[Pulsante: Nuovo giorno] premuto ──▶ pulisci [Mini linea: Serra]
```

La linea sparisce e il valore torna «—» fino al prossimo numero.

## Accessibilità e tastiera

Il titolo e il valore scritto sono testo, letto dai lettori di schermo. La linea si raggiunge con **Tab** e le frecce passano da un valore all'altro mostrando il riquadro.

## Vedi anche

- [Linee](charts.line) e [Tempo reale](charts.live) per un grafico con assi
- [Valore](ui.value) per il solo numero
- [Grafici](logicstudio-charts): le forme dei dati, i limiti, la tastiera
