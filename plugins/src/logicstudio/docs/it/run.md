# Prova e programmi attivi

Un progetto (o uno schema da solo) gira nel **motore** di Logic Studio come **programma**. Ci sono tre tipi di programma:

| Tipo | Come parte | Cosa fa girare | Quanto dura |
|---|---|---|---|
| **Prova** | **Prova** nell'IDE (o **F5**) | Il progetto **com'è negli editor**, anche non salvato | Finché premi **Ferma**, chiudi l'IDE o apri un altro progetto, e al massimo **5 minuti** (di serie) |
| **Attivo** | **Attiva** nell'IDE | Il progetto **salvato** | Finché lo fermi: anche con l'IDE chiuso, anche con lilOS chiuso nel browser; riparte quando riparte il computer su cui gira lilOS |
| **App (non installata)** | Aprendo il file `.lsapp` di un'app fatta con **Crea app…** | La copia del progetto dentro l'app | Finché le sue finestre sono aperte |

## Prova

1. Premi **Prova** nella barra, o **F5** (anche mentre scrivi in un campo).
2. Prima di chiamare il motore, l'IDE controlla il progetto. Se trova un problema grave, la prova **non parte** e la scheda **Problemi** si apre con l'elenco.
3. Se va tutto bene, il pulsante diventa **Prova in corso 00:12** (il tempo che passa, anche nella barra di stato) e compare **Ferma**.
4. Per fermarla: **Ferma**, oppure **F5** di nuovo.

La prova usa **tutti** gli schemi e le finestre del progetto: quelli aperti nelle schede così come sono adesso, gli altri come sono salvati. Uno schema da solo fa girare solo se stesso.

Un IDE fa **una prova alla volta**. Di serie puoi avere **2 prove** insieme in tutto (per esempio con due IDE aperti); oltre: «Hai già 2 prove in corso: al massimo 2».

### Cosa vedi durante la prova

- **Sugli schemi aperti**: l'ultimo valore passato su ogni collegamento (un'etichetta a metà, i collegamenti con i valori scorrono), l'ultimo valore accanto a ogni ingresso, il **bordo azzurro** sul blocco che sta lavorando, il **bordo rosso** su un blocco andato in errore. Vedi [Collegamenti e tipi delle porte](ide/links).
- **Nelle console** in basso: le righe e le domande. Vedi [Console](ide/consoles).
- **Nelle finestre**: apri la scheda di una finestra e scegli **Anteprima**: è legata alla prova, e i pulsanti e i campi mandano davvero i loro valori. La prova **non apre** le finestre da sola. Puoi anche aprire la finestra main vera dalla Home, **I miei programmi** → **Apri la finestra**.

Uno schema aperto mentre la prova è già in corso mostra i valori che passano da quel momento in poi.

### Quando la prova finisce

- Premendo **Ferma** o **F5**.
- Dopo **5 minuti** (di serie: «Durata massima di una prova», nei limiti del motore): si ferma da sola, senza messaggi nell'IDE.
- Chiudendo l'IDE, aprendo un altro progetto o creandone uno nuovo.
- Per un errore del programma (troppe esecuzioni, memoria finita…): il messaggio va nei **Problemi**.

Quando finisce, i valori spariscono dagli schemi e i bordi tornano normali; le console restano leggibili fino alla prova successiva.

## Problemi

La scheda **Problemi** nel pannello in basso elenca quello che ha impedito alla prova di partire, o l'ha fermata. Ogni riga ha un'icona (errore o avviso), il messaggio e lo schema o la finestra dove sta. **Un clic** (o **Invio**) su una riga apre lo schema, seleziona il blocco e lo mette in vista, o apre la finestra. Se non ci sono problemi: **Nessun problema**.

### I problemi che trova l'IDE

| Messaggio | Gravità | Quando |
|---|---|---|
| Il blocco add1 (net.request) viene da un pacchetto che non è installato | errore | Un blocco di un pacchetto mancante. |
| Il blocco component1 rappresenta una componente della finestra «Vecchia», che non c'è | errore | L'oggetto punta a una finestra che non c'è. |
| Il blocco component1 rappresenta la componente «button3», che non c'è | errore | L'oggetto punta a una componente che non c'è. |
| Una porta di schema non ha nome | errore | Un Ingresso o un'Uscita di schema con **Nome della porta** vuoto. |
| Il progetto ha finestre ma nessuna finestra main | avviso | La prova parte lo stesso. |
| Manca il file schemi/x.lsch | errore | Un elemento del progetto non si trova. |

### I problemi che trova il motore

Il motore ricontrolla tutto e si ferma al **primo** problema. Alcuni messaggi:

| Messaggio | Quando |
|---|---|
| Non c'è nessuno schema da far girare | Il progetto non ha schemi. |
| Troppi schemi: al massimo 20 per progetto | Più schemi del limite. |
| Troppe finestre: al massimo 10 per progetto | Più finestre del limite. |
| Troppi blocchi nello schema main: al massimo 200 | Più blocchi del limite. |
| Troppi collegamenti nello schema main: al massimo 600 | Più collegamenti del limite. |
| Troppe componenti nella finestra Principale: al massimo 200 | Più componenti del limite (contenitori compresi). |
| Troppi collegamenti tra gli schemi: al massimo 200 | Più collegamenti nella mappa del limite. |
| Troppe console: al massimo 10 | Più console del limite. |
| Il blocco … (…) non c'è: manca il suo pacchetto | Un blocco di un pacchetto mancante. |
| Due blocchi con lo stesso id (add1) nello schema main | Un file modificato a mano. |
| Lo schema main: il blocco add1 non ha l'ingresso c | Un collegamento verso una porta che non c'è più. |
| Lo schema main ha un collegamento verso un blocco che non c'è | Un file modificato a mano. |
| La componente Principale › button1 ha già il suo oggetto in main/component1 | Due oggetti per la stessa componente. |
| Il blocco component1 rappresenta una componente che non c'è (Principale › button9) | L'oggetto punta a una componente che non c'è. |
| Collegamento del progetto: lo schema sensori non ha l'uscita «temp» | Un collegamento della mappa verso una porta che non c'è più. |
| Collegamento del progetto: lo schema allarmi non ha l'ingresso «temp» | Come sopra, dal lato dell'ingresso. |
| main/add1: troppe porte aggiunte (al massimo 16) | Un file modificato a mano. |
| Le impostazioni del blocco value1 sono troppo grandi | Impostazioni oltre 64 KB. |
| Il gruppo Calcolo gira in un thread a parte: non può contenere Ingressi o Uscite di schema né oggetti della UI (…) | Un gruppo con **Esegui in un thread a parte** che contiene una porta di schema o l'oggetto di una componente. Vedi [Gruppi](ide/groups). |
| Lo schema main: la porta Run del gruppo grp1 va solo ai blocchi dentro il gruppo | Un file modificato a mano. |
| Nome di schema non valido: … | Un nome con `/`, `\`, `:` o caratteri di controllo, o più lungo di 80. |

Mentre il programma gira:

| Messaggio | Cosa succede |
|---|---|
| Troppe esecuzioni: più di 10000 in 10 secondi (un ciclo di collegamenti?) | Il programma si ferma. Vedi [Come funziona un blocco](ide/blocks). |
| Memoria finita: i programmi hanno usato più della tua quota di memoria | Si fermano tutti i tuoi programmi. |
| Il motore si è fermato: … | Si fermano tutti i tuoi programmi. |
| Il motore non risponde | Il motore non ha risposto in tempo. |
| Gruppo 1: nessun thread libero, il gruppo gira nel thread del programma | (avviso in console) Hai già tutti i thread a parte che puoi avere: il gruppo gira lo stesso, insieme al resto. |
| Gruppo 1: memoria finita nel thread del gruppo | Il thread del gruppo ha usato più della sua memoria (metà della tua quota): il programma si ferma. |

I messaggi del motore sono in italiano qualunque sia la lingua di lilOS.

## Attiva

**Attiva** fa girare il progetto come **programma attivo**: va avanti con l'IDE chiuso e con lilOS chiuso nel browser, perché gira sul computer di lilOS. È il modo per un programma che deve lavorare sempre (accendere qualcosa ogni mattina, controllare un sito ogni ora, contare gli eventi della giornata).

1. Premi **Attiva** («Fa girare il progetto salvato come programma attivo: va avanti anche a lilOS chiuso»).
2. Se ci sono modifiche non salvate: **Salvare prima di attivare?** — «Un programma attivo fa girare il progetto salvato.» con **Annulla** e **Salva tutto**.
3. Se lo stesso progetto (lo stesso file) è già attivo: **«Nome» è già attivo** — «Il programma attivo si ferma e riparte con il progetto com'è adesso.» con **Annulla** e **Sostituisci**. **Sostituisci** ferma e toglie il vecchio.
4. Se va bene: **«Nome» è attivo** — «Gira in lilOS anche con questa finestra e lilOS chiusi, finché non lo fermi dalla Home.»
5. Se il motore rifiuta, il motivo va nei **Problemi**.

Il programma attivo usa **una copia** del progetto presa al momento dell'attivazione: se poi cambi il progetto, il programma attivo non cambia finché non lo attivi di nuovo (**Sostituisci**).

**Attiva** non fa i controlli dell'IDE della prova: provalo prima. Un programma attivo fa davvero quello che dice (scrive file, manda notifiche, chiama siti) anche quando non guardi.

Limiti per l'attivazione (di serie):

| Limite | Valore | Messaggio |
|---|---|---|
| Programmi attivi per utente (le app contano) | 10 | Hai già 10 programmi attivi: al massimo 10 |
| Programmi attivi di tutti gli utenti | 200 | lilOS ha già 200 programmi attivi: al massimo 200 |
| Programmi attivi tenuti, anche fermi | 3 volte il tuo massimo | Troppi programmi attivi, anche fermi: togline qualcuno |
| Dimensione del progetto | 2 MB | Progetto troppo grande per un programma attivo (al massimo 2 MB) |

### I programmi attivi nel menu delle applicazioni

I programmi attivi **in esecuzione** che hanno finestre compaiono nella scheda **Progetti** del menu delle applicazioni. Un clic apre la loro **finestra main**, senza aprire l'IDE. Le console si aprono come dice **Fuori dall'IDE** (vedi [Console](ide/consoles)). Se il programma si ferma, le sue finestre si chiudono.

## La Home: i miei programmi

La sezione **I miei programmi** della Home elenca le tue prove, i programmi attivi e le app in esecuzione. Si aggiorna quando torni sulla Home. Se non c'è niente: «Niente in esecuzione: prova un progetto, o attivalo».

| Colonna | Cosa dice |
|---|---|
| **Programma** | Il nome, sotto il file da cui viene e, se si è fermato per un errore, l'errore. |
| **Tipo** | **Prova**, **Attivo** o **App (non installata)**. |
| **Stato** | **Si avvia**, **In esecuzione**, **Fermo**, **Fermo per un errore**, **Aspetta un pacchetto**. |
| **Da** | Data e ora di partenza. |

E i pulsanti:

| Pulsante | Quando c'è | Cosa fa |
|---|---|---|
| **Apri la finestra** | In esecuzione, con finestre | Apre la finestra main del programma. |
| **Apri il progetto** | Il file del progetto esiste | Apre il progetto nell'IDE. |
| **Ferma** | In esecuzione o si avvia | Ferma il programma. Per un programma attivo chiede **Fermare «Nome»?** — «Non riparte con lilOS finché non lo attivi di nuovo.» |
| **Togli** | Fermo, fermo per un errore o in attesa di un pacchetto | Lo toglie dall'elenco (un programma attivo tolto viene dimenticato e non riparte più). |

Un programma attivo fermato resta nell'elenco come **Fermo**, anche dopo un riavvio, finché non lo togli. Prove e app finite spariscono da sole dopo un minuto.

**Aspetta un pacchetto** vuol dire che il programma usa un blocco di un pacchetto che non è (più) installato: riparte da solo quando il pacchetto torna.

Se un programma attivo si ferma per un errore, ricevi una **notifica** con il motivo.

## La Home: quello che uso

**Quello che uso** mostra, con una barra, quanto usi delle tue quote:

| Riga | Quota di serie |
|---|---|
| **Programmi attivi** | 10 |
| **Prove** | 2 |
| **Richieste di rete in questo minuto** | 120 |
| **Registro** | 20 MB |

E sotto: «Al massimo il 25% della CPU e 128 MB di memoria per tutti i miei programmi.» Le quote le può cambiare un amministratore, anche per un solo utente (Pannello di controllo → Logic Studio → Quote). Vedi [Limiti](logicstudio-engine/limits).

## Esempi

### 1. Provare una parte alla volta

1. Scrivi lo schema e premi **F5**.
2. Se la prova non parte, la scheda **Problemi** si apre da sola: fai clic su una riga e l'IDE apre lo schema e seleziona il blocco che ha il problema.
3. Correggi e premi di nuovo **F5**: non serve salvare.

### 2. Dalla prova al programma attivo

1. Prova il progetto finché fa quello che vuoi.
2. **Salva**, poi **Attiva**.
3. Chiudi l'IDE. Il programma continua: lo vedi nel menu delle applicazioni, scheda **Progetti**, se ha finestre.
4. Per cambiarlo: apri il progetto, modifica, prova, salva e premi **Attiva** → **Sostituisci**.

### 3. Fermare un programma attivo

1. Apri l'IDE: nella Home, in **I miei programmi**, trova il programma (Tipo **Attivo**).
2. **Ferma** → conferma. Lo stato diventa **Fermo** e non riparte con lilOS.
3. Per toglierlo dall'elenco: **Togli**.

## Vedi anche

- [Come funziona un blocco](ide/blocks)
- [Console](ide/consoles)
- [Programmi](logicstudio-engine/programs)
- [Limiti](logicstudio-engine/limits)
- [Fare un'app](ide/create-app)
