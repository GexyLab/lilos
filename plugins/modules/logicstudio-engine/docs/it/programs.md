# I programmi

`logicstudio-engine` · [Logic Studio Engine](logicstudio-engine)

Un **programma** è un progetto (o uno schema da solo) che il motore sta facendo girare. Questa pagina racconta la sua vita: come parte, in che stato è, cosa scrive, come risponde alle domande, come si ferma e cosa succede quando il kernel riparte.

## I tre tipi

| Tipo | Nel Pannello di controllo | Da dove parte | Si salva? |
|---|---|---|---|
| Prova | **Prova** | **Prova** o **F5** nell'IDE | No |
| Programma attivo | **Attivo** | **Attiva** nell'IDE | Sì: riparte con il kernel |
| App | **App (non installata)** | Il file `.lsapp` di un'app fatta con **Crea app** | No |

## Come parte

Quando premi **Prova** o **Attiva**, l'IDE manda al motore i documenti del progetto: il file `.lsproj`, gli schemi `.lsch` e le finestre `.lsui`. Per una prova sono quelli che hai negli editor (anche non salvati); per un programma attivo sono quelli salvati.

Il motore fa questi passi, in ordine. Se uno non va, il programma non parte e l'IDE mostra il messaggio nella scheda **Problemi**.

1. **Le tue quote.** Controlla che tu abbia posto per un'altra prova o per un altro programma attivo, e che lilOS non abbia già troppi programmi attivi in tutto. Vedi [Limiti e quote](logicstudio-engine/limits).
2. **I documenti.** Ricontrolla tutto il progetto: che ogni blocco venga da un pacchetto installato, che ogni collegamento vada da un'uscita che esiste a un ingresso che esiste, che ogni oggetto di componente punti a una componente della sua finestra, che i limiti (blocchi, collegamenti, schemi, finestre…) siano rispettati. Il messaggio dice dove sta il problema, per esempio «Il blocco b3 (esempio.media) non c'è: manca il suo pacchetto» (al posto di b3 c'è l'etichetta che hai dato al blocco, o il suo id).
3. **Il salvataggio.** Un programma attivo viene salvato nel motore, con una copia del progetto. Al massimo 2 MB di progetto: oltre, «Progetto troppo grande per un programma attivo (al massimo 2 MB)».
4. **Il worker.** Se non hai ancora un worker (il thread dove girano i tuoi programmi), il motore lo apre. Qui conta la memoria di tutti: se non basta, il programma si ferma subito con il messaggio «Logic Studio usa già … MB: al massimo … MB per tutti».
5. **L'avvio dei blocchi.** Nel worker il programma parte così:
   - per ogni blocco che ha qualcosa da fare all'avvio, lo fa (per esempio il [Valore](core.value) con **Invia all'avvio** manda il suo valore);
   - poi ogni ingresso che ha un **valore iniziale** lo riceve;
   - poi partono i blocchi che girano da soli in un ciclo.

Da qui in avanti il programma va avanti da solo: ogni valore che arriva a un ingresso fa lavorare il blocco, e le sue uscite vanno lungo i collegamenti. Vedi [Come funziona un blocco](ide/blocks).

## Gli stati

| Stato | Cosa vuol dire |
|---|---|
| **Si avvia** | Il motore lo sta facendo partire |
| **In esecuzione** | Gira |
| **Fermo** | Si è fermato: l'hai fermato tu (o un amministratore), o è finito il tempo di una prova |
| **Fermo per un errore** | Si è fermato da solo per un problema; il messaggio è sotto il nome |
| **Aspetta un pacchetto** | Un programma attivo che non può ripartire perché manca un pacchetto: riparte da solo quando il pacchetto torna |

Vedi i tuoi programmi in due posti:

- nella **Home** di Logic Studio, sezione **I miei programmi**, con **Apri la finestra**, **Apri il progetto**, **Ferma** e **Togli**;
- nel **Pannello di controllo → Logic Studio → Il mio uso**, con **Ferma** e **Togli**.

## Perché un programma si ferma da solo

| Messaggio | Cosa è successo |
|---|---|
| Fine della prova: è durata il tempo massimo | Una prova è arrivata alla durata massima (5 minuti, di serie). Lo stato è **Fermo**, non un errore |
| Troppe esecuzioni: più di 10000 in 10 secondi (un ciclo di collegamenti?) | I blocchi hanno lavorato troppe volte: di solito un collegamento che torna indietro e fa girare i blocchi senza fine |
| Memoria finita: i programmi hanno usato più della tua quota di memoria | Il tuo worker ha finito la memoria. Si fermano **tutti** i tuoi programmi, non solo quello che l'ha consumata |
| Il motore si è fermato: … | Il tuo worker si è chiuso per un altro motivo. Anche qui si fermano tutti i tuoi programmi |
| Il motore non risponde | Il worker non ha risposto in tempo mentre caricava i blocchi |
| Logic Studio usa già … MB: al massimo … MB per tutti | Non c'era memoria per aprire il tuo worker |
| Blocco sconosciuto: … | Il worker non conosce un blocco del progetto (un pacchetto arrivato a metà) |

Quando un **programma attivo** si ferma per un errore, ricevi una notifica di lilOS con il nome del programma e il messaggio (se in quel momento hai una pagina di lilOS aperta).

Un errore dentro un blocco **non** ferma il programma: esce dall'uscita **Eccezione** di quel blocco e, se non è collegata, va nella console principale come una riga rossa. Per esempio «Somma: Serve un numero».

## Fermare e togliere

- **Ferma** ferma il programma. Il motore ferma i timer, annulla le domande in console, dà a ogni blocco 2 secondi per chiudere quello che stava facendo (per esempio una richiesta web in corso viene interrotta) e aspetta al massimo 3 secondi.
- Un programma attivo fermato **resta nell'elenco** come **Fermo** e **non riparte** quando riparte il kernel. Per farlo ripartire aprilo nell'IDE e premi **Attiva**.
- **Togli** lo toglie dall'elenco (e un programma attivo anche dai programmi salvati). Nella Home e nel Pannello di controllo **Togli** compare solo per i programmi che non sono in esecuzione.
- Le prove e le app fermate spariscono da sole dall'elenco dopo un minuto.

Un amministratore può fermare i programmi di tutti dal **Pannello di controllo → Logic Studio → In esecuzione**. Il motivo che resta è «Fermato da un amministratore».

### Sostituire un programma attivo

Se premi **Attiva** su un progetto che ha già un programma attivo (anche fermo), l'IDE chiede «… è già attivo». **Sostituisci** toglie il programma vecchio e fa partire quello nuovo, con il progetto com'è adesso. Il programma nuovo riparte da capo.

> Se il programma nuovo non può partire (per esempio per un problema nel progetto), quello vecchio è già stato tolto: correggi il problema e premi di nuovo **Attiva**.

## Quando il kernel riparte

Il motore salva i programmi attivi. Pochi secondi dopo che il kernel è ripartito (e ogni volta che arriva un pacchetto nuovo):

- i programmi attivi che erano **in esecuzione** ripartono, con lo stesso nome;
- quelli **fermi** (anche quelli fermati da un errore) restano fermi;
- quelli a cui manca un pacchetto vanno in **Aspetta un pacchetto**, con il messaggio del problema, e riprovano ogni volta che si presenta un pacchetto.

Le quote non si ricontrollano quando un programma riparte; i limiti (blocchi, collegamenti…) invece sì: se un amministratore li ha abbassati e il progetto non ci sta più, il programma resta in attesa con il messaggio del limite.

Un programma che riparte comincia da capo: quello che i blocchi ricordavano, le righe delle console e gli ultimi valori delle finestre sono persi.

Le prove e le app non si salvano: con il kernel finiscono.

## Le console

Ogni programma ha le sue console: la **principale** (c'è sempre) e quelle che hai aggiunto nelle **Opzioni del progetto → Console**. Le console stanno nel motore, non nell'IDE: per questo un programma attivo può scrivere e chiedere anche quando l'IDE è chiuso. Vedi [Le console](ide/consoles).

### Le righe

- I blocchi scrivono righe con un livello: normale, informazione, avviso, errore. La domanda di un blocco e la risposta che dai sono righe anche loro.
- Una riga è tagliata a 1000 caratteri.
- Ogni console tiene le ultime righe (da 100 a 2000, 1000 di serie, si sceglie nelle opzioni) e al massimo 400000 caratteri: le righe più vecchie vanno via.
- Una console accetta al massimo 50 righe al secondo (di serie). Le altre non si vedono; alla prima riga scritta in un secondo successivo compare prima un avviso: «… 37 righe non mostrate (troppe al secondo)».
- Una riga scritta in una console che non esiste più nel progetto va nella principale.

### Le domande

Il blocco [Leggi da console](core.consoleRead) fa una domanda e aspetta la risposta.

- In ogni console c'è **una domanda alla volta**: se due blocchi chiedono insieme nella stessa console, il secondo aspetta in fila che il primo abbia la risposta.
- La risposta si scrive nella console dell'IDE, o nella finestra della console che apre lilOS. Se la stessa console è aperta in due posti, vale la prima risposta che arriva.
- La risposta deve essere del tipo che il blocco chiede:

| Tipo | Cosa va bene | Se non va bene |
|---|---|---|
| testo | Qualsiasi testo (al massimo 4000 caratteri) | — |
| numero | `12`, `-3`, `2,5`, `2.5`, `1e3` | «Serve un numero. Riprova.» |
| sì/no | sì, si, s, yes, y, true, 1, vero, on · no, n, false, 0, falso, off (maiuscole o minuscole) | «Serve sì o no. Riprova.» |
| tasto | Il primo carattere di quello che scrivi | «Serve un tasto. Riprova.» |

- Se la risposta non va bene, la domanda si ripete. Se nel blocco hai tolto **Richiedi se il dato non va bene**, il blocco manda invece **annullato**.
- **Esc** annulla la domanda: il blocco manda **annullato**.
- Se il blocco ha un **Tempo massimo** e nessuno risponde in tempo, manda **annullato**.
- Quando il programma si ferma, le domande in attesa sono annullate.
- Una risposta nascosta (per le password) compare nella console come pallini.

> **Il tempo massimo di un blocco vale anche per le domande.** Oggi il motore interrompe un blocco che lavora più di 30 secondi (di serie, vedi [Limiti e quote](logicstudio-engine/limits)), e un blocco che aspetta una risposta conta come un blocco che lavora. Dopo 30 secondi senza risposta, **Leggi da console** manda su **Eccezione** «Leggi da console ha impiegato più di 30 s». La domanda resta nella console, ma la risposta che dai dopo non arriva più al blocco, e finché non rispondi il blocco ignora le nuove richieste **chiedi**. Se ti serve più tempo, un amministratore può alzare il limite.

### Le console fuori dall'IDE

Quando il programma gira senza l'IDE (un programma attivo con le sue finestre aperte, o un'app), le console si comportano come dice l'opzione **Fuori dall'IDE** del progetto:

| Scelta | Cosa succede |
|---|---|
| Mostrale tutte | Ogni console si apre in una finestra quando si apre la prima finestra del progetto |
| Solo quando chiedono un dato (di serie) | Una console si apre quando un blocco fa una domanda e si chiude dopo la risposta (se non hai tolto la spunta) |
| Non mostrarle | Le console non si vedono. Una domanda riceve subito il valore predefinito del blocco, o è annullata se non ce l'ha |
| Tutte nella console principale | Una finestra sola con le righe di tutte le console |

Nella **prova** le console sono sempre in basso nell'IDE, qualunque sia la scelta: anche con **Non mostrarle** le domande aspettano la tua risposta.

### Una domanda quando non guardi

Se un programma che non è una prova fa una domanda e nessuno lo sta guardando (nessuna finestra del progetto, nessun IDE collegato), il motore lo dice alle tue pagine di lilOS aperte: ricevi una notifica, e un clic apre la console. Al massimo una notifica ogni 30 secondi per console. Niente notifica se la scelta è **Non mostrarle** o se hai spento le notifiche nelle opzioni del progetto.

## Il registro

Per i programmi attivi e le app, il motore può copiare le righe delle console nel tuo **registro**, come dice l'opzione del progetto:

| Scelta | Cosa va nel registro |
|---|---|
| Niente | Nessuna riga |
| Solo avvisi ed errori (di serie) | Le righe di livello avviso ed errore, comprese le eccezioni non collegate |
| Tutte | Tutte le righe |

Le prove non scrivono mai nel registro. Il registro è uno per utente, per tutti i tuoi programmi; quando supera la tua quota (20 MB di serie) il motore butta la metà più vecchia. Quanto ne usi è in **Il mio uso** e nella Home dell'IDE (**Quello che uso**).

## I valori delle componenti

Un programma con finestre parla con le sue componenti attraverso i loro **oggetti** negli schemi. Vedi [Le componenti nello schema](ide/components).

- Quando uno schema manda un valore a un ingresso dell'oggetto di una componente (per esempio il testo di un'[Etichetta](ui.label)), il motore lo manda a tutte le finestre aperte di quel progetto.
- Quando qualcuno usa una componente (preme un [Pulsante](ui.button), sposta un cursore), la finestra lo manda al motore, che lo fa uscire dall'oggetto della componente nello schema. Il motore accetta solo le porte che la componente manda davvero (le sue uscite), e al massimo 100 messaggi al secondo per programma.
- Un valore che arriva da una finestra è al massimo 256 KB.
- Con l'opzione **Una finestra riaperta mostra subito gli ultimi valori** (accesa di serie), il motore ricorda l'ultimo valore di ogni porta (fino a 2000 porte per programma) e lo dà alla finestra quando si apre.
- Quando una finestra si apre, nessun pulsante viene «ripremuto»: al programma arriva solo quello che fa chi usa la finestra.
- Se il programma si ferma, le sue finestre si chiudono.

I programmi attivi con finestre compaiono nel menu delle applicazioni, scheda **Progetti**: un clic apre la finestra main, senza aprire l'IDE.

## Esempi

### 1. Una prova che si ferma da sola

```
[Ogni…: 1 s] impulso ──▶ più [Contatore] conteggio ──▶ valore [Scrivi in console]
```

Premi **Prova**: nella console principale compaiono 1, 2, 3… una riga al secondo. Dopo 5 minuti (di serie) la prova si ferma con «Fine della prova: è durata il tempo massimo». Se premi **Attiva** invece, il conteggio va avanti finché non premi **Ferma** nella Home.

### 2. Un ciclo di collegamenti

```
[Valore: 1] valore ──▶ a [Somma] risultato ──▶ b [la stessa Somma]
```

Il **risultato** della [Somma](core.add) torna al suo ingresso **b**: ogni risultato la fa lavorare di nuovo, e la Somma non si ferma mai (1, 2, 3, 4…). Dopo 10000 esecuzioni in 10 secondi il motore ferma il programma con «Troppe esecuzioni: più di 10000 in 10 secondi (un ciclo di collegamenti?)». Per contare davvero usa il [Contatore](core.counter), o togli **lo avvia** dall'ingresso che chiude il giro.

### 3. Una domanda a un programma attivo

```
[All'avvio] impulso ──▶ chiedi [Leggi da console: «Quanti litri?», numero] valore ──▶ valore [Scrivi in console]
```

Attivi il progetto e chiudi l'IDE. Il blocco [All'avvio](core.onStart) fa partire subito la domanda: se hai lilOS aperto, ricevi una notifica che dice che la console del progetto chiede qualcosa. Un clic apre la console; scrivi `12,5` e premi Invio: nella console compare 12.5 (come numero). Se scrivi `tanti`, la console risponde «Serve un numero. Riprova.» e la domanda resta.

### 4. Un programma attivo dopo un riavvio

Hai attivato «Serra» (in esecuzione) e il computer di lilOS si riavvia. Dopo qualche secondo «Serra» è di nuovo **In esecuzione**, ma il suo [Contatore](core.counter) riparte dal valore iniziale e la console è vuota. Se vuoi che un valore sopravviva ai riavvii, scrivilo in un file con [Scrivi file](lilos.fileWrite) e rileggilo all'avvio con [Leggi file](lilos.fileRead).

## Vedi anche

- [Provare e attivare](ide/run) e [Le console](ide/consoles) nella guida dell'IDE
- [Limiti e quote](logicstudio-engine/limits)
- [Permessi](logicstudio-engine/permissions)
