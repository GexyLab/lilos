# Limiti e quote

`logicstudio-engine` · [Logic Studio Engine](logicstudio-engine)

Il motore fa girare i programmi di tutti gli utenti sullo stesso computer. Perché nessuno possa fermare o rallentare gli altri, ci sono due tipi di regole:

- le **quote**: quanto può usare **ogni utente** (programmi attivi, prove, CPU, memoria, rete, registro);
- i **limiti**: valgono **per tutti** e per ogni progetto (blocchi per schema, durata di una prova, memoria in tutto…).

Vedi i tuoi numeri nel **Pannello di controllo → Logic Studio → Il mio uso** e nella Home dell'IDE, sezione **Quello che uso**. Un amministratore li cambia nelle schede **Limiti** e **Quote** dello stesso pannello.

## Le quote di ogni utente

| Quota | Di serie | Si può mettere | Cosa conta |
|---|---|---|---|
| Programmi attivi | 10 | 0–1000 | I tuoi programmi attivi e le tue app in esecuzione (anche quelli che aspettano un pacchetto) |
| Prove insieme | 2 | 0–100 | Le tue prove in corso nello stesso momento |
| CPU | 25 % | 1–100 | La parte di ogni secondo che i blocchi di un programma possono passare a lavorare. Vale per ogni programma, non per tutti i tuoi programmi insieme, e conta anche il tempo che un blocco passa ad aspettare (un file, la rete) |
| Memoria | 128 MB | 16–8192 | La memoria del tuo worker, cioè di tutti i tuoi programmi insieme |
| Richieste di rete al minuto | 120 | 0–100000 | Le richieste dei blocchi di rete (ogni reindirizzamento conta come una richiesta) |
| Registro | 20 MB | 1–10240 | Il tuo registro, per tutti i tuoi programmi |

C'è anche una regola che non si cambia: puoi tenere al massimo **3 volte** la quota dei programmi attivi tra quelli salvati, contando anche i fermi (30, di serie).

### Cosa succede quando superi una quota

| Quota | Quando | Cosa succede | Messaggio |
|---|---|---|---|
| Programmi attivi | Premi **Attiva** o apri un'app | Il programma non parte | Hai già 10 programmi attivi: al massimo 10 |
| Programmi attivi salvati | Premi **Attiva** | Il programma non parte | Troppi programmi attivi, anche fermi: togline qualcuno |
| Prove | Premi **Prova** | La prova non parte | Hai già 2 prove in corso: al massimo 2 |
| CPU | Mentre gira | Il programma rallenta: ogni 200 esecuzioni di blocchi il motore guarda quanto hanno lavorato nel secondo in corso e, se è più della quota, il blocco che sta lavorando aspetta la fine di quel secondo | Nessuno |
| Memoria | Mentre gira | Il worker si chiude e si fermano **tutti** i tuoi programmi | Memoria finita: i programmi hanno usato più della tua quota di memoria |
| Richieste di rete | Un blocco di rete lavora | La richiesta non parte e il blocco manda il messaggio su **Exception** | Troppe richieste di rete: hai finito la quota di questo minuto |
| Registro | Il motore scrive nel registro | Si butta la metà più vecchia del registro | Nessuno |

Con una quota di programmi attivi a 0, un utente non può attivare programmi né aprire app fatte con Crea app; con le prove a 0, non può provare.

## I limiti per tutti

### Il computer

| Limite | Di serie | Si può mettere | Cosa vuol dire |
|---|---|---|---|
| Programmi attivi di tutti gli utenti | 200 | 1–10000 | I programmi attivi e le app in esecuzione, di tutti, insieme |
| Memoria per tutti gli utenti | 1024 MB | 64–65536 | La somma della memoria dei worker aperti (ogni worker usa la quota di memoria del suo utente) |
| Esecuzioni di blocchi per programma in 10 secondi | 10000 | 100–1000000 | Oltre, il programma si ferma: di solito è un ciclo di collegamenti |
| Tempo massimo di un blocco | 30 s | 1–600 | Oltre, il motore smette di aspettare il blocco e manda un errore sulla sua Exception |
| Durata massima di una prova | 5 minuti | 1–240 | Poi la prova si ferma da sola |
| Gruppi in un thread a parte per utente | 4 | 0–64 | Quanti [gruppi](ide/groups) con **Esegui in un thread a parte** possono girare insieme per ogni utente (tutti i suoi programmi). Oltre, il gruppo gira nel thread del programma, con un avviso nella console principale. Ogni thread ha metà della quota di memoria dell'utente (almeno 16 MB), oltre a quella del suo worker |

### Gli schemi

| Limite | Di serie | Si può mettere |
|---|---|---|
| Blocchi per schema | 200 | 10–5000 |
| Collegamenti per schema | 600 | 10–20000 |
| Porte aggiunte per blocco | 32 | 1–64 |

### I progetti

| Limite | Di serie | Si può mettere |
|---|---|---|
| Schemi per progetto | 20 | 1–200 |
| Finestre per progetto | 10 | 1–100 |
| Componenti UI per finestra | 200 | 10–2000 |
| Collegamenti tra schemi per progetto | 200 | 10–5000 |
| Console per progetto | 10 | 1–50 |
| Righe al secondo per console | 50 | 1–10000 |
| Punti tenuti per serie dei grafici | 1000 | 10–100000 |

### Cosa succede quando superi un limite

I limiti dei progetti si controllano **quando il programma parte**: se il progetto non ci sta, non parte, e l'IDE mostra il messaggio nella scheda **Problemi**. Gli altri si controllano mentre il programma gira.

| Limite | Messaggio | Cosa succede |
|---|---|---|
| Programmi attivi di tutti | lilOS ha già 200 programmi attivi: al massimo 200 | Il programma non parte |
| Memoria per tutti | Logic Studio usa già 960 MB: al massimo 1024 MB per tutti | Il programma parte e si ferma subito, **Fermo per un errore**. Succede solo quando il tuo worker deve aprirsi (non hai altri programmi in esecuzione) |
| Esecuzioni in 10 secondi | Troppe esecuzioni: più di 10000 in 10 secondi (un ciclo di collegamenti?) | Il programma si ferma, **Fermo per un errore** |
| Tempo massimo di un blocco | readFile ha impiegato più di 30 s | Il messaggio esce dall'uscita **Exception** del blocco (il nome è quello del blocco); il programma va avanti |
| Durata di una prova | Fine della prova: è durata il tempo massimo | La prova si ferma (**Fermo**) |
| Blocchi per schema | Troppi blocchi nello schema principale: al massimo 200 | Il programma non parte |
| Collegamenti per schema | Troppi collegamenti nello schema principale: al massimo 600 | Il programma non parte |
| Porte aggiunte | principale/b7: troppe porte aggiunte (al massimo 16) | Il programma non parte. Il massimo è il più piccolo tra questo limite e quello del blocco (per esempio 16 per il blocco Somma (+)) |
| Schemi | Troppi schemi: al massimo 20 per progetto | Il programma non parte |
| Finestre | Troppe finestre: al massimo 10 per progetto | Il programma non parte |
| Componenti | Troppe componenti nella finestra main: al massimo 200 | Il programma non parte. Contano tutte le componenti, anche i contenitori |
| Collegamenti tra schemi | Troppi collegamenti tra gli schemi: al massimo 200 | Il programma non parte |
| Console | Troppe console: al massimo 10 | Il programma non parte. La principale conta |
| Righe al secondo | … 37 righe non mostrate (troppe al secondo) | Le righe in più non si vedono; alla prima riga scritta in un secondo successivo, un avviso dice quante erano |
| Punti dei grafici | Nessuno | Un grafico tiene al massimo questi punti per serie (o meno, se la proprietà del grafico ne chiede meno): i più vecchi vanno via |

Nei messaggi, al posto di «principale», «b7» e «main» c'è il nome del tuo schema, l'id del tuo blocco e il nome della tua finestra.

### Il tempo massimo di un blocco, da vicino

- Conta il tempo dall'inizio alla fine del lavoro del blocco, **comprese le attese**: una [HTTP (fetch)](net.request) lenta, un file grande, una domanda in console.
- Per questo vale anche per [Input (readline)](core.consoleRead): oggi, se nessuno risponde entro 30 secondi (di serie), il blocco manda «Input (readline) ha impiegato più di 30 s» su **Exception** e la risposta data dopo non gli arriva più.
- Vale anche per quello che un blocco fa all'avvio del programma.
- Non vale per l'attesa dei blocchi del tempo come [Ritardo (setTimeout)](core.delay) o [Intervallo (setInterval)](core.every): quelli non lavorano mentre aspettano.

## Altri limiti fissi

Questi non si cambiano dal Pannello di controllo.

| Cosa | Limite | Messaggio |
|---|---|---|
| Un progetto mandato al motore | 8 MB | — |
| Un progetto per un programma attivo | 2 MB | Progetto troppo grande per un programma attivo (al massimo 2 MB) |
| Le impostazioni di un blocco | 64 KB | Le impostazioni del blocco b7 sono troppo grandi |
| Contenitori uno dentro l'altro in una finestra | 32 livelli | La finestra main ha contenitori troppo annidati |
| Un valore mandato da una finestra o dall'IDE | 256 KB | Valore troppo grande (al massimo 256 KB) |
| Messaggi da finestre e IDE a un programma | 100 al secondo | Troppi messaggi al programma |
| Una risposta in console | 4000 caratteri | (il resto è tagliato) |
| Una domanda in console | 500 caratteri | (il resto è tagliato) |
| Una riga di console | 1000 caratteri | (il resto è tagliato) |
| Righe tenute da una console | da 100 a 2000 (1000 di serie), al massimo 400000 caratteri | (le più vecchie vanno via) |
| Ultimi valori tenuti per le finestre | 2000 porte per programma | (le porte nuove oltre le 2000 non sono ricordate) |
| Una domanda senza nessuno che guarda | Al massimo una notifica ogni 30 secondi per console | — |
| Il registro letto dall'API | Le ultime 500 righe | — |

## Come li cambia un amministratore

Solo un amministratore vede le schede **Limiti** e **Quote** nel **Pannello di controllo → Logic Studio**.

### I limiti per tutti

Scheda **Limiti**, in tre gruppi: **Per tutti gli utenti**, **Schemi**, **Progetti**. Scrivi il numero e il pannello lo salva subito. Un numero fuori dall'intervallo viene portato al minimo o al massimo; un numero con la virgola viene arrotondato.

### Le quote

Scheda **Quote**:

- **Quote di ogni utente**: le quote di serie, per tutti gli utenti che non ne hanno di loro.
- **Le quote di un utente**: una tabella con una riga per utente e una colonna per quota (**Attivi**, **Prove**, **CPU %**, **Memoria MB**, **Richieste/min**, **Registro MB**). Una casella vuota vuol dire «la quota di tutti» (la vedi in grigio); un numero è la quota di quell'utente. **Predefinita** toglie tutte le quote di quell'utente.

### Quando contano

| Cosa cambi | Da quando conta |
|---|---|
| Programmi attivi, prove, programmi attivi di tutti | Dal prossimo programma che parte (quelli già in esecuzione non si fermano) |
| Blocchi, collegamenti, schemi, finestre, componenti, porte aggiunte, console | Dal prossimo programma che parte, **e** dal prossimo riavvio dei programmi attivi: un programma attivo che non ci sta più resta **Aspetta un pacchetto** con il messaggio del limite |
| Esecuzioni in 10 secondi, tempo di un blocco, durata della prova, righe al secondo, CPU | Dal prossimo programma che parte |
| Memoria di un utente | Dalla prossima volta che si apre il suo worker (cioè dopo che si sono fermati tutti i suoi programmi) |
| Memoria per tutti | Dal prossimo worker che si apre |
| Richieste di rete al minuto, registro | Subito, anche per i programmi in esecuzione |
| Punti dei grafici | Dalle finestre aperte dopo che la pagina di lilOS è stata ricaricata |

## Esempi

### 1. Un utente che ha bisogno di più programmi attivi

Marta tiene sei progetti di domotica sempre accesi e ne vuole dieci in più. L'amministratore apre **Pannello di controllo → Logic Studio → Quote**, nella riga di Marta scrive `20` nella colonna **Attivi** e lascia vuote le altre. Da quel momento Marta può avere 20 programmi attivi (e tenerne 60 salvati); gli altri utenti restano a 10.

### 2. Un blocco che chiama un servizio lento

Un progetto fa una [HTTP (fetch)](net.request) a un servizio che a volte impiega 45 secondi. Ci sono due tempi massimi, e vale il più corto:

- quello della richiesta, nelle impostazioni del modulo `logicstudio-net` (**Tempo massimo di una richiesta**, 20 secondi di serie): dopo 20 secondi il blocco manda su **Exception** «Nessuna risposta da … in 20 secondi»;
- quello di ogni blocco, qui (**Tempo massimo di un blocco**, 30 secondi di serie): «HTTP (fetch) ha impiegato più di 30 s».

Per aspettare 45 secondi, l'amministratore porta il primo a 60 secondi (nelle impostazioni del modulo) e il secondo a 60 secondi (scheda **Limiti**); poi tu attivi di nuovo il progetto, perché il tempo di un blocco vale per i programmi che partono dopo. Oppure colleghi **Exception** a un blocco che riprova più tardi.

### 3. Una console troppo chiacchierona

```
[Range: da 1 a 200] risultato ──▶ lista  [For each] elemento ──▶ valore [Print (console.log)]
[Intervallo (setInterval): 5 s]             impulso   ──▶ avvia
```

Dai a **da** e **a** del blocco [Range](coll.range) i valori iniziali 1 e 200. Ogni 5 secondi [For each](coll.forEach) manda 200 valori di fila, ma la console ne mostra solo i primi 50 di quel secondo. Alla riga scritta 5 secondi dopo compare prima l'avviso «… 150 righe non mostrate (troppe al secondo)». Il programma non si ferma. Se ti servono tutti i valori, scrivili in un file con [appendFile](lilos.fileAppend), oppure mostra solo uno ogni tanto con [Throttle](core.throttle).

## Vedi anche

- [I programmi](logicstudio-engine/programs)
- [Permessi](logicstudio-engine/permissions)
- [Provare e attivare](ide/run)
