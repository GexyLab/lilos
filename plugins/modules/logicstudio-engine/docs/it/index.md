# Logic Studio Engine

`logicstudio-engine` · servizio `logicstudio` · modulo del kernel · serve lilOS 1.37.0 o successivo

Il **motore** di Logic Studio. È lui che fa girare i tuoi schemi e i tuoi progetti: l'IDE li disegna, il motore li esegue. Gira dentro il kernel di lilOS, cioè sul computer dove è installato lilOS, non nella pagina del browser.

Il motore non porta blocchi: i blocchi e le Componenti UI arrivano dai **pacchetti**, altri moduli del kernel che si presentano al motore quando partono.

## Cosa fa

- Fa partire, tiene in vita e ferma i **programmi**: le prove dell'IDE, i programmi attivi e le app fatte con **Crea app**.
- Tiene le **console** dei programmi: le righe scritte dai blocchi e le domande dei blocchi [Leggi da console](core.consoleRead).
- Tiene gli ultimi valori mandati alle **finestre** dei progetti, così una finestra riaperta non è vuota.
- Controlla le **quote** di ogni utente e i **limiti** per tutti.
- Fa nel kernel, **come te**, le cose che i blocchi chiedono e che toccano i tuoi dati o il mondo fuori: leggere un file, mandare una notifica, fare una richiesta web.
- Serve all'IDE il catalogo dei blocchi e delle componenti installati e la documentazione dei pacchetti (queste pagine).

## Un thread per ogni utente

Quando fai partire il tuo primo programma, il motore apre per te un **worker**: un thread tutto tuo, con la sua memoria. Tutti i tuoi programmi (prove, programmi attivi, app) girano lì dentro. Quando si ferma il tuo ultimo programma, il worker si chiude.

Cosa vuol dire per te:

- Un tuo programma che sbaglia, o che usa troppa memoria, non tocca i programmi degli altri utenti.
- Tocca però **gli altri tuoi programmi**: se il tuo worker finisce la memoria, si fermano tutti i tuoi programmi, con il messaggio «Memoria finita: i programmi hanno usato più della tua quota di memoria».
- Il worker non vede i tuoi file e non parla con la rete da solo: quando un blocco ne ha bisogno, chiede al kernel, che lo fa con i tuoi permessi e conta quello che fai nelle tue quote. Vedi [Permessi](logicstudio-engine/permissions).

## Prova e programma attivo

Ci sono tre tipi di programma:

| Tipo | Come parte | Cosa fa girare | Quanto dura |
|---|---|---|---|
| **Prova** | **Prova** (o **F5**) nell'IDE | Il progetto com'è adesso negli editor, anche se non l'hai salvato | Al massimo 5 minuti (di serie), oppure finché premi **Ferma** o chiudi l'IDE |
| **Programma attivo** | **Attiva** nell'IDE | Il progetto **salvato** | Finché non lo fermi: anche con l'IDE chiuso e con lilOS chiuso nel browser |
| **App (non installata)** | Aprendo il file `.lsapp` di un'app fatta con **Crea app** | La copia del progetto che sta nella cartella dell'app | Finché le sue finestre sono aperte |

Una prova serve a vedere cosa succede: sugli schemi vedi i valori che passano sui collegamenti e i blocchi che lavorano. Non lascia niente acceso. Vedi [Provare e attivare](ide/run).

Un programma attivo fa davvero quello che dice, anche quando non guardi: se scrive un file, lo scrive. Provalo prima con **Prova**.

## Programmi che girano a lilOS chiuso

Il motore sta nel kernel, quindi un programma attivo non ha bisogno di una pagina di lilOS aperta. Puoi chiudere il browser, uscire da lilOS o spegnere il tuo portatile: il programma va avanti finché è acceso il computer dove gira lilOS.

Cosa succede mentre nessuno guarda:

- Le righe delle console restano nel motore (le ultime di ogni console). Le vedi quando apri di nuovo una finestra o una console del progetto.
- Se un blocco fa una domanda in console, la domanda **aspetta** la risposta, o il tempo massimo che hai dato al blocco. Gli altri blocchi vanno avanti. Attenzione: oggi il motore non lascia lavorare un blocco più di 30 secondi (di serie), e questo vale anche per un blocco che aspetta una risposta; vedi [Limiti e quote](logicstudio-engine/limits). Se in quel momento hai una pagina di lilOS aperta, ricevi una notifica che apre la console; se lilOS è chiuso, la notifica non arriva più tardi: la domanda la trovi aprendo le finestre o le console del progetto.
- Se il programma si ferma per un errore, ricevi una notifica.

Vedi [I programmi](logicstudio-engine/programs).

## Quando il kernel riparte

Quando il computer di lilOS si riavvia, o un amministratore riavvia il kernel:

1. Tutti i programmi si fermano di colpo. Le prove e le app non ripartono.
2. Pochi secondi dopo la partenza del kernel, il motore fa ripartire **i programmi attivi che erano in esecuzione**, con lo stesso nome e lo stesso progetto.
3. I programmi attivi che avevi fermato (o che si erano fermati per un errore) **non** ripartono: restano nell'elenco come fermi, finché non li attivi di nuovo o li togli.

Un programma che riparte comincia **da capo**: i blocchi ripartono dall'inizio, i valori iniziali vengono mandati di nuovo, le console sono vuote, le finestre non hanno più gli ultimi valori. Quello che un blocco ricordava (per esempio il conteggio del blocco [Contatore](core.counter)) è perso.

Se a un programma attivo manca un pacchetto (per esempio è stato disinstallato), il programma resta **Aspetta un pacchetto** e riparte da solo appena il pacchetto torna.

## I pacchetti installati

I blocchi e le componenti che vedi nell'IDE sono quelli dei pacchetti installati in questo lilOS. L'elenco è nel **Pannello di controllo → Logic Studio → Pacchetti**, con quanti blocchi e componenti porta ognuno.

| Pacchetto | Cosa porta |
|---|---|
| [Blocchi di base](logicstudio-core) | Valori, logica, matematica, testo, oggetti, tempo, console, porte di schema, l'oggetto delle Componenti UI |
| [Liste e matrici](logicstudio-collections) | Blocchi per liste e matrici |
| [Blocchi di lilOS](logicstudio-lilos) | Notifiche, file della tua home, eventi a lilOS |
| [Blocchi di rete](logicstudio-net) | La Richiesta web |
| [Componenti UI standard](logicstudio-ui) | Etichette, pulsanti, campi, contenitori… per le finestre |
| [Grafici](logicstudio-charts) | I grafici come Componenti UI |

Un amministratore installa i pacchetti dall'**AppStore**, scheda **Kernel**. Il motore e i blocchi di base arrivano da soli quando si installa Logic Studio IDE. Chiunque può scrivere un pacchetto nuovo: vedi [Scrivere un pacchetto](logicstudio-engine/packages).

## Dove tiene i dati

Nella cartella dati del modulo, che resta quando il motore si aggiorna:

- i programmi attivi, con una copia del progetto che stavano facendo girare (anche quelli fermi);
- le quote che un amministratore ha dato a singoli utenti;
- il **registro** di ogni utente: le righe di console che i progetti copiano lì (di serie, solo avvisi ed errori).

Per questo un programma attivo non cambia se modifichi il progetto dopo averlo attivato: per usare il progetto nuovo premi di nuovo **Attiva** e scegli **Sostituisci**.

## Esempi

### 1. Un promemoria che gira anche a lilOS chiuso

```
[Ogni…: 3600 s] impulso ──▶ invia [Notifica: testo «Alzati e cammina»]
```

Il testo della [Notifica](lilos.notify) è nelle sue Proprietà. Per provarlo, metti 10 secondi nel blocco [Ogni…](core.every) e premi **Prova**: arriva una notifica ogni 10 secondi, finché la prova finisce. Poi rimetti 3600 secondi, salva e premi **Attiva**: il programma manda una notifica ogni ora, anche con il browser chiuso. Le notifiche arrivate mentre lilOS era chiuso le trovi quando lo riapri.

### 2. Cosa succede a un riavvio

Hai due programmi attivi: «Promemoria» (in esecuzione) e «Backup» (che avevi fermato). Il computer di lilOS si riavvia:

- «Promemoria» riparte da solo, da capo;
- «Backup» resta **Fermo**: per farlo ripartire aprilo nell'IDE e premi **Attiva**.

## Pagine collegate

- [I programmi](logicstudio-engine/programs): avvio, stati, console, domande, registro, arresto.
- [Limiti e quote](logicstudio-engine/limits): tutti i valori, i messaggi, come si cambiano.
- [Permessi](logicstudio-engine/permissions): chi vede cosa, gli amministratori, le app.
- [Scrivere un pacchetto](logicstudio-engine/packages): blocchi e componenti nuovi.
- [Provare e attivare](ide/run) e [Le console](ide/consoles) nella guida dell'IDE.
