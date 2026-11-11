# Input (readline)

`core.consoleRead` · Console · [Blocchi di base](logicstudio-core) · versione 1

Fa una domanda in una console del progetto, aspetta la risposta di chi usa il programma e la manda, già convertita nel tipo che scegli: testo, numero, sì/no o un tasto.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **chiedi** (`ask`) | impulso | Qualsiasi valore che arriva qui fa fare la domanda. Ogni arrivo è una domanda. |
| **domanda** (`question`) | testo | Il testo della domanda, se vuoi cambiarlo mentre il programma gira. **Non fa partire il blocco**: tiene il testo per la prossima domanda. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | qualsiasi | La risposta valida, nel **Tipo di dato** scelto: testo, numero o sì/no (un tasto è un testo di un carattere). |
| **annullato** (`cancelled`) | impulso | Un impulso quando la domanda finisce senza una risposta valida: **Esc**, tempo scaduto, risposta non valida senza **Richiedi**, console nascoste senza valore predefinito. |
| **Exception** (`error`) | oggetto | Quando il blocco aspetta più del tempo massimo di un blocco (vedi **Attenzione** sotto). |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Console** (`console`) | le console del progetto (la principale ha la stella ★) | la principale | Dove fare la domanda. |
| **Domanda** (`question`) | un testo | vuoto | Il testo della domanda, quando l'ingresso **domanda** non ha un valore. |
| **Tipo di dato** (`kind`) | testo, numero, sì/no, un tasto | testo | Che risposta serve, e in che tipo esce su **valore**. |
| **Valore predefinito** (`fallback`) | un testo | vuoto | La risposta da usare quando **nessuno può rispondere** (console nascoste); nella console si vede in grigio nel campo della risposta. Vedi sotto. |
| **Tempo massimo (secondi, 0 = nessuno)** (`timeout`) | da 0 a 86400 | 0 | Dopo quanti secondi la domanda si annulla da sola. 0 vuol dire mai. |
| **Richiedi se il dato non va bene** (`retry`) | sì / no | sì | Con una risposta non valida: se è spuntata la domanda si ripete; se è tolta la domanda finisce con **annullato**. |
| **Nascondi quello che si scrive** (`secret`) | sì / no | no | Per le password: mentre scrivi si vedono dei pallini e nella console resta una riga di pallini. |

## Come funziona

### La domanda

Quando arriva qualcosa su **chiedi**, il blocco mostra la domanda nella console scelta e aspetta.

- Il testo è quello dell'ingresso **domanda**, se ha ricevuto un valore (anche un testo vuoto), altrimenti quello dell'impostazione **Domanda**. Viene tagliato a 500 caratteri.
- Nella console compare una riga con la domanda (evidenziata) e, in basso, il campo dove rispondere, con il tipo di dato richiesto e il suggerimento «Invio manda · Esc annulla». Se la domanda è vuota, compare solo il campo.
- Si risponde da **qualsiasi copia** della console: il pannello in basso nell'IDE, la finestra della console di un programma attivo, la console dentro una finestra del progetto. Vale la prima risposta che arriva.
- Mentre il blocco aspetta, **il resto del programma va avanti**.

Fuori dall'IDE, se il programma fa una domanda e nessuna finestra del progetto è aperta, ricevi una **notifica** che apre la console (al massimo una ogni 30 secondi per console; si spegne nelle Opzioni del progetto). Vedi [Le console](ide/consoles).

### La risposta

Quando premi **Invio**, nella console resta una riga con quello che hai scritto (o dei pallini, al massimo 12, con **Nascondi quello che si scrive**). Poi la risposta viene controllata secondo il **Tipo di dato**:

| Tipo di dato | Risposte valide | Cosa esce su **valore** | Messaggio se non va bene |
|---|---|---|---|
| **testo** | tutto, anche niente | il testo **così com'è**, spazi compresi (al massimo 4000 caratteri) | — (è sempre valida) |
| **numero** | cifre con un segno `+` o `-` davanti se vuoi, la virgola **o** il punto per i decimali, l'esponente: `12`, `-3`, `2,5`, `2.5`, `,5`, `12,`, `1e3`, `1,5E-2`. Spazi ai lati ammessi | il numero | Serve un numero. Riprova. |
| **sì/no** | per sì: `sì`, `si`, `s`, `yes`, `y`, `true`, `1`, `vero`, `on`; per no: `no`, `n`, `false`, `0`, `falso`, `off`. Maiuscole e spazi ai lati non contano | sì o no | Serve sì o no. Riprova. |
| **un tasto** | un tasto qualsiasi che scrive un carattere | il carattere (un testo) | Serve un tasto. Riprova. |

Note sui tipi:

- **numero**: non vanno bene i separatori delle migliaia (`1.000,50`, `1 000`), le lettere (`12 euro`), i numeri esadecimali.
- **un tasto**: basta **premere il tasto**, senza Invio: la risposta parte subito. Se invece scrivi più caratteri (per esempio incollandoli) e premi Invio, vale il primo. Invio con il campo vuoto non va bene. Le frecce, Tab e gli altri tasti che non scrivono un carattere non rispondono.
- Con **Nascondi quello che si scrive** la risposta è nascosta solo sullo schermo: su **valore** esce in chiaro. Non scriverla in una console e non salvarla in un file.

Se la risposta **non va bene**:

- con **Richiedi se il dato non va bene** spuntata (di serie), la console scrive l'avviso (per esempio «Serve un numero. Riprova.») e ripete la domanda, senza limite di tentativi;
- se è tolta, la domanda finisce e il blocco manda **annullato**.

### Quando la domanda finisce senza risposta

Il blocco manda **annullato** quando:

- chi risponde preme **Esc**;
- passano i secondi di **Tempo massimo** (se non è 0). Il tempo si conta **da quando il blocco ha fatto la domanda**, anche se la domanda stava ancora aspettando in fila dietro un'altra (vedi sotto): una domanda in fila può scadere prima di essere vista;
- la risposta non va bene e **Richiedi** è tolta;
- le console sono nascoste e il valore predefinito manca o non va bene (vedi sotto).

Quando il programma si ferma, le domande aperte spariscono e il blocco non manda niente.

### Il valore predefinito

Il **Valore predefinito** viene usato **solo quando nessuno può rispondere**: in un programma attivo o in un'app il cui progetto ha, in **Opzioni del progetto → Console**, la scelta **Non mostrarle**. Allora la domanda non viene mostrata e il blocco risponde subito da solo:

- con il Valore predefinito, letto secondo il **Tipo di dato** (per esempio `42` con il tipo numero esce come numero 42);
- con **annullato**, se il Valore predefinito è vuoto o non è valido per il tipo (per esempio `abc` con il tipo numero).

In una **Prova** le console si vedono sempre, quindi il valore predefinito non viene mai usato da solo.

Con la console visibile il valore predefinito **si vede solo come suggerimento** in grigio nel campo della risposta: **Invio con il campo vuoto non lo usa**. Con il tipo testo esce un testo vuoto; con gli altri tipi la risposta vuota non è valida. Allo scadere del **Tempo massimo** esce **annullato**, non il valore predefinito.

### Più domande insieme

- **Una console fa una domanda alla volta.** Se più blocchi chiedono nella stessa console, le domande aspettano in fila e compaiono una dopo l'altra, nell'ordine in cui sono state fatte. In console diverse le domande sono indipendenti.
- **Lo stesso blocco** fa una domanda alla volta: un altro **chiedi** che arriva mentre aspetta la risposta resta in attesa, e la domanda viene fatta di nuovo subito dopo la risposta (o l'annullamento) della prima. Con tre **chiedi** di fila, la domanda viene fatta tre volte.
- Un testo che arriva su **domanda** mentre il blocco aspetta vale per la domanda **dopo**, non cambia quella mostrata.

### Attenzione: il tempo massimo di un blocco

Il motore non lascia lavorare un blocco più di un certo tempo: **30 secondi** di serie (**Tempo massimo di un blocco**, nel Pannello di controllo → Logic Studio → Limiti; vedi [Limiti](logicstudio-engine/limits)). Il blocco Input (readline) conta come al lavoro **finché aspetta la risposta**. Per questo oggi, se nessuno risponde entro quel tempo:

- il blocco manda su **Exception** il messaggio «Input (readline) ha impiegato più di 30 s» (con il numero di secondi del limite);
- la domanda **resta nella console**, ma la risposta data dopo **non esce** più su **valore** (va persa);
- finché quella domanda non riceve una risposta o non viene annullata (Esc), gli altri **chiedi** che arrivano a quel blocco **vengono ignorati**.

Per evitarlo, imposta un **Tempo massimo** più breve del tempo massimo di un blocco (per esempio 25 secondi): la domanda finisce con **annullato** prima che scatti l'errore. Se servono attese più lunghe, chiedi a un amministratore di alzare **Tempo massimo di un blocco** (fino a 600 secondi).

### L'ingresso domanda e il valore iniziale

L'ingresso **domanda** di serie **non fa partire** il blocco. Ma se gli dai un **valore iniziale** nelle Proprietà, il motore lo tratta come un ingresso che **lo avvia**: all'avvio del programma il blocco fa subito la domanda. Nelle Proprietà la casella **lo avvia** di **domanda** appare spuntata anche quando l'ingresso non avvia il blocco. Se vuoi solo un testo fisso, scrivilo nell'impostazione **Domanda** invece che nel valore iniziale; se ti serve proprio il valore iniziale, **togli la spunta** a **lo avvia** di **domanda**: così il blocco non chiede niente all'avvio.

Per le regole generali vedi [Come funziona un blocco](ide/blocks).

## Esempi

### 1. Chiedere l'età e rispondere

```
[All'avvio (main)] impulso ──▶ chiedi [Input (readline): "Quanti anni hai?", numero] valore    ──▶ a [Confronto (== ≠ < >): a ≥ b]
                                                                             annullato ──▶ invia [Costante · Variabile: "Nessuna risposta"] valore ──▶ valore [Print (console.log)]

[Confronto (== ≠ < >)] se vero  ──▶ invia [Costante · Variabile: "Puoi entrare"]           valore ──▶ valore [Print (console.log)]
[Confronto (== ≠ < >)] se falso ──▶ invia [Costante · Variabile: "Torna fra qualche anno"] valore ──▶ valore [Print (console.log)]
```

Su [Confronto (== ≠ < >)](core.compare) **b** ha il valore iniziale 18 e **lo avvia** tolto. I tre [Costante · Variabile](core.value) sono di tipo testo e hanno collegato l'ingresso **invia**, così parlano solo quando ricevono un impulso (e non all'avvio). Cosa succede con alcune risposte:

| Scritto nella console | Risultato |
|---|---|
| `20` | esce 20 → «Puoi entrare» |
| `17,5` | esce 17,5 → «Torna fra qualche anno» |
| `venti` | «Serve un numero. Riprova.» e la domanda si ripete |
| Esc | **annullato** → «Nessuna risposta» |

Se nessuno risponde per più di 30 secondi scatta l'errore descritto in **Attenzione**: per questo conviene dare al blocco un **Tempo massimo** di 25 secondi, così dopo 25 secondi esce **annullato** → «Nessuna risposta».

### 2. Una conferma con un tasto e un tempo massimo

**Tipo di dato** un tasto, **Domanda** `Cancello il file? (s/n)`, **Tempo massimo** 20.

```
[Input (readline)] valore    ──▶ a [Confronto (== ≠ < >): a = b] se vero ──▶ … [writeFile]
                   annullato ──▶ …
```

Su Confronto (== ≠ < >) **b** ha il valore iniziale `s` e **lo avvia** tolto.

Premendo `s` il file viene scritto; premendo `n` (o qualsiasi altro tasto) no. Dopo 20 secondi senza risposta esce **annullato**. Attenzione: `S` maiuscola è un altro carattere; per accettarle tutte e due usa il tipo **sì/no**, che accetta `s`, `S`, `sì`, `yes`…

### 3. Una password

**Tipo di dato** testo, **Domanda** `Password del server:`, **Nascondi quello che si scrive** spuntata. Scrivendo `segreto1` la console mostra `••••••••` e su **valore** esce `"segreto1"`, da collegare dove serve (per esempio a una [HTTP (fetch)](net.request)), senza mai scriverlo in console.

### 4. Un programma senza console visibili

Progetto con **Opzioni del progetto → Console → Non mostrarle**, attivato. Un blocco Input (readline) con tipo numero e **Valore predefinito** `5` manda subito 5 su **valore**, senza mostrare niente. Con **Valore predefinito** vuoto manda subito **annullato**.

## Errori

| Messaggio | Quando |
|---|---|
| Input (readline) ha impiegato più di *N* s | Nessuna risposta entro il **Tempo massimo di un blocco** del motore (30 secondi di serie). Vedi **Attenzione** sopra. |

Gli avvisi «Serve un numero. Riprova.», «Serve sì o no. Riprova.» e «Serve un tasto. Riprova.» compaiono nella console, non sull'Exception.

## Vedi anche

- [Print (console.log)](core.consoleWrite)
- [Le console](ide/consoles)
- [Confronto (== ≠ < >)](core.compare) e [Switch · Case](core.switch) per decidere cosa fare con la risposta
- [Limiti](logicstudio-engine/limits)
- [Come funziona un blocco](ide/blocks)
