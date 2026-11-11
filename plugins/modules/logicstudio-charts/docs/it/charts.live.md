# Tempo reale

`charts.live` · Grafici · [Grafici](logicstudio-charts) · versione 1

Linee che **scorrono**: mostrano gli ultimi secondi (o minuti) dei valori che arrivano, con il presente sul bordo destro. Ogni serie ha la sua porta: colleghi a ognuna la misura da seguire (temperatura, umidità, carico…). Va bene per sorvegliare qualcosa mentre succede.

## Proprietà

| Proprietà | Valori | Predefinito | Descrizione |
|---|---|---|---|
| **Titolo** | testo (traducibile) | vuoto | Scritto sopra il grafico; dà anche il nome ai file PNG e CSV. |
| **Altezza (px)** | da 20 a 2000 | 200 | L'altezza del disegno. |
| **Legenda** | sì/no | sì | Mostra la legenda (da due serie in su). |
| **Unità** | testo | vuoto | Sopra l'asse e dopo ogni valore. |
| **Decimali** | da 0 a 10 | vuoto | Cifre dopo la virgola nel riquadro e nella tabella. |
| **Minimo (vuoto: automatico)** | numero | vuoto | Il valore in fondo all'asse. Utile per non far «ballare» l'asse. |
| **Massimo (vuoto: automatico)** | numero | vuoto | Il valore in cima all'asse. |
| **Punti tenuti per serie** | da 10 a 100000 | 1000 | Al massimo quanti punti per serie (vale anche il limite dell'amministratore). |
| **Colori** | `standard`, `blue` | `standard` | 8 colori diversi, oppure 6 toni di blu. |
| **Pulsanti vista tabella, PNG e CSV** | sì/no | sì | I tre pulsanti in alto a destra. |
| **Tempo mostrato (secondi)** | da 1 a 86400 | 60 | Quanto tempo indietro mostra il grafico: 60 = l'ultimo minuto, 3600 = l'ultima ora. |

## Porte del suo oggetto nello schema

### Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **pulisci** (`clear`) | impulso | Toglie tutti i punti di tutte le serie. |
| **abilitato** (`enabled`) | sì/no | `false` lo rende più chiaro e lo spegne. |
| **visibile** (`visible`) | sì/no | `false` lo nasconde. |
| *serie aggiunte* | numero | Una per serie: ogni numero che arriva è un punto di quella serie, adesso. |

### Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **punto scelto** (`picked`) | oggetto | L'istante su cui chi guarda fa clic o preme **Invio**. |
| **Eccezione** (`error`) | oggetto | Come ogni blocco; oggi non ci passa niente. |

## Porte aggiuntive

Il grafico **non ha un ingresso dati**: ha un ingresso per ogni serie, fino a **8**, di tipo numero. Si chiamano «serie 1», «serie 2»… e **il nome della porta è il nome della serie** (nella legenda, nel riquadro, nella tabella, in **punto scelto**). Si vedono in corsivo sull'oggetto nello schema.

> Senza porte aggiunte il grafico non ha serie e resta vuoto («Nessun dato»). Attenzione: in questa versione l'editor della finestra non ha ancora un comando per aggiungere porte a una componente, e nemmeno le Proprietà del suo oggetto nello schema lo hanno. Finché non c'è, il grafico Tempo reale resta senza serie: per seguire valori nel tempo usa [Linee](charts.line) con date ISO.

## Come funziona

- **Un numero su una porta = un punto adesso**: il punto prende come tempo **l'istante in cui arriva nella finestra** (l'orologio del computer di chi guarda), non quello in cui il programma l'ha calcolato. I numeri scritti come testo valgono (`"21,5"`); tutto il resto (testi, `true`, oggetti, liste) è **ignorato**.
- **Lo scorrimento**: il grafico si ridisegna da solo, da una volta ogni decimo di secondo a una al secondo secondo la larghezza e il **Tempo mostrato**; il bordo destro è sempre «adesso», quello sinistro è «adesso meno il tempo mostrato». Quando la scheda del browser è nascosta o è aperta la vista tabella, il grafico non si ridisegna (riprende quando torni).
- **Quanti punti**: i punti usciti dal bordo sinistro vanno via (ne resta uno, perché la linea entri dal bordo). In più ogni serie tiene al massimo **Punti tenuti per serie** punti: con un valore ogni 100 ms e **Tempo mostrato** 300 servirebbero 3000 punti, ma con il limite di 1000 vedi solo gli ultimi 100 secondi.
- **L'asse dei valori** si adatta ai soli punti visibili: quando un valore alto esce a sinistra, l'asse si riabbassa. Fissa **Minimo** e **Massimo** per tenerlo fermo.
- **Le etichette del tempo** sono ore locali («10:42:30»), con un passo tondo (5 s, 10 s, 1 min…).
- **pulisci** svuota tutte le serie; i punti dopo ricominciano da adesso.
- **Una finestra chiusa non registra niente**: i valori arrivati mentre era chiusa non ci sono. Quando la apri, il programma le manda l'ultimo valore di ogni porta (se l'opzione del progetto **Una finestra riaperta mostra subito gli ultimi valori** è accesa): vedi un punto per serie, «adesso», e da lì il grafico riparte. Per una storia che resti, usa [Linee](charts.line) con date ISO e [Accumula (push con limite)](coll.accumulate).
- Nell'editor della finestra il grafico mostra un minuto di dati inventati, fermi.

**Punto scelto** manda:

| Campo | Contenuto |
|---|---|
| `x` | l'istante, in millisecondi |
| `time` | lo stesso istante come data ISO, per esempio `"2026-11-11T09:42:30.120Z"` |
| `values` | il valore di ogni serie in quell'istante, se ce n'è uno vicino: `{"temperatura": 21.4, "umidità": 63}` |
| `index` | la posizione dell'istante tra quelli con un valore visibili, da 0 |
| `series`, `y` | solo con un clic del mouse e più serie: la serie più vicina al clic e il suo valore |

## Esempi

### 1. Temperatura e umidità della serra

Aggiungi due porte e chiamale **temperatura** e **umidità**.

```
Finestra «Serra»
└ Colonna (radice)
  └ Tempo reale  live1  Titolo «Serra adesso»  Tempo mostrato 300
```

```
[Intervallo (setInterval): 2 s] impulso ──▶ leggi [readFile: ~/serra.json, JSON] contenuto ──▶ oggetto [Destruttura oggetto] temp ──▶ temperatura [Tempo reale: Serra adesso]
                                                                                              umid ──▶ umidità
```

Ogni 2 secondi arrivano due numeri e le due linee avanzano; si vedono gli ultimi 5 minuti. Con temperature attorno a 20 e umidità attorno a 60 le due linee stanno sullo stesso asse: se ti serve più dettaglio, fai due grafici.

### 2. Il carico di un servizio, con l'asse fermo

```
[Intervallo (setInterval): 1 s] impulso ──▶ invia [HTTP (fetch): https://esempio.it/stato] risposta ──▶ oggetto [Get proprietà (obj.campo): cpu] valore ──▶ cpu [Tempo reale: Carico]
```

Con **Minimo** 0, **Massimo** 100 e **Unità** `%` l'asse resta da 0 a 100 anche quando il carico è basso. [HTTP (fetch)](net.request) è del pacchetto [Blocchi di rete](logicstudio-net): ricorda che conta nelle richieste di rete al minuto (120 di serie), quindi una richiesta al secondo le supera.

### 3. Pulire quando si riparte

```
[Pulsante: Azzera] premuto ──▶ pulisci [Tempo reale: Carico]
```

Le linee spariscono e ripartono dal prossimo valore.

## Accessibilità e tastiera

**Tab** per raggiungerlo; le frecce passano da un istante all'altro tra quelli visibili, **Invio** manda l'istante su **punto scelto**, **Esc** toglie la scelta. Il riquadro mostra l'ora con i secondi. **Mostra come tabella**: una riga per istante (Tempo) e una colonna per serie; mentre la tabella è aperta il grafico non scorre.

## Vedi anche

- [Linee](charts.line) per dati con le loro date, che restano
- [Gradini](charts.step) per stati (acceso/spento) invece che numeri
- [Mini linea](charts.spark) per un andamento piccolo in una riga
- [Intervallo (setInterval)](core.every), [Destruttura oggetto](core.decompose)
- [Grafici](logicstudio-charts): le forme dei dati, i limiti, la tastiera
