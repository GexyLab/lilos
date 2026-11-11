# Permessi

`logicstudio-engine` · [Logic Studio Engine](logicstudio-engine)

Chi può far girare un programma, chi lo vede, cosa può fare un programma e cosa può fare un'app. In breve: **un programma è tuo e lavora come te**. Non può fare niente che tu non possa fare, e nessun altro utente lo vede, salvo un amministratore.

## Chi usa il motore

Il motore risponde solo a un **utente che ha fatto l'accesso** a lilOS. Senza un utente risponde «Serve un utente».

Ogni utente può:

- far partire prove e programmi attivi (entro le sue [quote](logicstudio-engine/limits));
- vedere, fermare e togliere **i suoi** programmi;
- guardare un suo programma dal vivo: valori, console, finestre;
- rispondere alle domande delle console dei suoi programmi;
- leggere il suo registro;
- vedere il catalogo dei blocchi e delle componenti installati, la documentazione, i limiti per tutti e il proprio uso.

## Chi vede cosa

Un programma appartiene all'utente che l'ha fatto partire.

| Cosa | Tu | Un altro utente | Un amministratore |
|---|---|---|---|
| L'elenco dei tuoi programmi | Sì | No | Sì (scheda **In esecuzione**) |
| Fermare o togliere un tuo programma | Sì | No | Sì |
| I valori sui collegamenti, le console, le finestre | Sì | No | Sì |
| Mandare valori al programma, rispondere alle domande | Sì | No | Sì |
| Il tuo registro | Sì | No | No |
| Il tuo uso (programmi, rete, registro) | Sì | No | Sì |
| Le quote e i limiti | Li vedi | — | Li cambia |

Un utente che prova ad aprire un programma di un altro riceve «Programma sconosciuto», come se il programma non ci fosse: non può sapere che esiste.

## Gli amministratori

Un utente con il ruolo **amministratore** ha in più:

- nel **Pannello di controllo → Logic Studio**, le schede **Limiti**, **Quote** e **In esecuzione**;
- l'elenco dei programmi di tutti gli utenti, con **Ferma** e **Togli**. Un programma fermato da un amministratore riporta «Fermato da un amministratore»;
- per il motore, la possibilità di guardare e usare un programma di un altro utente come se fosse il suo: le sue console (comprese le domande in attesa), le sue finestre, i valori. Oggi lilOS non ha un pulsante per farlo (il Pannello di controllo ha solo **Ferma** e **Togli**), ma il motore lo permette a un'app o a uno script che parla con lui a nome dell'amministratore.

Un amministratore **non** può:

- leggere il registro di un altro utente;
- far partire un programma a nome di un altro utente: quello che fa partire è suo e lavora come lui.

Le richieste riservate agli amministratori, fatte da un altro utente, rispondono «Solo un amministratore».

> Le console di un programma possono contenere dati personali. Ricorda che un amministratore può leggerle. Le risposte nascoste (le password chieste con **Nascondi quello che si scrive**) compaiono come pallini anche per lui.

## Cosa fa un programma: come te

I blocchi non toccano niente da soli. Girano nel tuo worker, che non vede i file e non va in rete. Quando un blocco deve fare qualcosa fuori (leggere un file, mandare una notifica, fare una richiesta web), chiede al kernel un'**azione**, e il kernel la fa **come te**:

- con i tuoi permessi sui file: quello che non puoi aprire tu, il programma non lo apre;
- dentro le tue quote: lo spazio della tua home, le dimensioni dei file, le richieste di rete al minuto;
- con le regole del pacchetto che dà quel blocco.

Per esempio:

| Blocchi | Cosa possono fare, e cosa no |
|---|---|
| [Blocchi di lilOS](logicstudio-lilos) | Solo i file della **tua home** (`~/…`). Mai la cartella `.config`, mai i file il cui contenuto è protetto da un'app (come FileCrypt). Al massimo 5 MB letti o scritti alla volta |
| [HTTP (fetch)](net.request) | Solo indirizzi pubblici di internet. Questo computer e la rete locale solo se un amministratore lo permette nelle impostazioni del modulo `logicstudio-net`. Ogni richiesta conta nella tua quota di rete |
| [Notify](lilos.notify) | Solo a te, a nome del programma |
| [Emit (evento a lilOS)](lilos.event) | Solo alle tue pagine di lilOS |

Un programma attivo lavora come te **anche quando non hai fatto l'accesso**: a lilOS chiuso, dopo che sei uscito, dopo un riavvio. Il motore ricorda chi eri quando l'hai attivato. Se non vuoi più che lavori a tuo nome, fermalo.

> Il codice dei blocchi non è chiuso in una gabbia: i pacchetti li installa un amministratore, e un pacchetto scritto male potrebbe fare più di quanto dice. Installa solo pacchetti di cui ti fidi. Vedi [Scrivere un pacchetto](logicstudio-engine/packages).

## Le app

### Le app installate

Non c'è un permesso `logic`. Un'app installata che vuole usare il motore (far partire programmi, leggere le console, il catalogo…) chiede nel suo manifesto il permesso **`kernel:logicstudio-engine`**, che l'amministratore concede quando la installa. L'app parla allora con il motore **come l'utente che la usa**: vede solo i suoi programmi, e può fare solo quello che può fare lui (se l'utente è un amministratore, anche quello che può fare un amministratore).

Nel `lilos.json` dell'app (qui solo i campi che contano):

```json
{
  "id": "serra-pannello",
  "name": "Pannello della serra",
  "permissions": ["kernel:logicstudio-engine"]
}
```

```js
// I miei programmi attivi che girano
const programmi = await lilos.kernel.request('logicstudio-engine', 'GET', '/programs');
const accesi = programmi.filter(p => p.kind === 'active' && p.status === 'running');

// Ferma il programma «Serra»
const serra = accesi.find(p => p.name === 'Serra');
if (serra) await lilos.kernel.request('logicstudio-engine', 'DELETE', `/programs/${serra.id}`);
```

Senza il permesso, la richiesta fallisce con «Permesso negato: kernel:logicstudio-engine».

> Questo permesso è potente: un'app che lo ha può anche **attivare** programmi, che poi lavorano come l'utente anche a lilOS chiuso. Concedilo solo ad app di cui ti fidi.

Logic Studio IDE e il Pannello di controllo sono parte di lilOS e usano il motore senza questo permesso.

### Le app fatte con Crea app

Un'app fatta con **Crea app** non si installa: parte quando apri il suo file `.lsapp`, gira **come l'utente che la apre**, e si ferma quando chiudi la sua ultima finestra. Vedi [Crea app](ide/create-app).

Prima di farla partire lilOS guarda i blocchi del progetto. Se ci sono blocchi che usano:

| Blocchi | lilOS ti dice che l'app potrà |
|---|---|
| file e cartelle ([readFile](lilos.fileRead), [writeFile](lilos.fileWrite), [appendFile](lilos.fileAppend), [readdir (elenca cartella)](lilos.folderList), [exists](lilos.exists)) | leggere e cambiare i tuoi file |
| la rete ([HTTP (fetch)](net.request)) | fare richieste su internet |
| le notifiche ([Notify](lilos.notify)) | mandarti notifiche |
| gli eventi ([Emit (evento a lilOS)](lilos.event)) | mandare eventi a lilOS |

…apre una finestra con l'elenco, la cartella da cui viene l'app e i pulsanti **Esegui** e **Annulla**. Esegui l'app solo se ti fidi di chi l'ha fatta.

- Se premi **Esegui**, lilOS se lo ricorda per **quell'app così com'è**: la stessa cartella e lo stesso progetto. Se l'app cambia (anche solo un blocco), te lo chiede di nuovo.
- lilOS ricorda al massimo 200 consensi per utente; i più vecchi vanno via.
- Se l'app non usa nessuno di questi blocchi, parte senza chiedere.
- Le prove e i programmi attivi che fai partire tu dall'IDE non chiedono niente: il progetto è tuo.

Anche un'app fatta con Crea app conta nella tua quota di programmi attivi mentre è aperta.

## Esempi

### 1. Due utenti, due programmi

Luca e Sara hanno ognuno un programma attivo «Backup». Luca vede nella Home solo il suo; Sara solo il suo. L'amministratore, nel **Pannello di controllo → Logic Studio → In esecuzione**, li vede tutti e due, con il nome dell'utente accanto. Il «Backup» di Luca scrive in `~/Documenti/backup.txt`, cioè nella home di Luca: non può scrivere nella home di Sara, nemmeno con il percorso `/home/sara/…` («Puoi usare solo i file della tua home…»).

### 2. Un'app ricevuta da un collega

Un collega ti passa la cartella di un'app fatta con Crea app, «Report vendite». Apri il suo `.lsapp`: lilOS ti dice che l'app potrà leggere e cambiare i tuoi file e fare richieste su internet. Se premi **Esegui**, l'app lavora sui **tuoi** file, con i tuoi permessi. Se il collega ti manda una versione nuova e la metti al posto della vecchia, lilOS te lo chiede di nuovo.

### 3. Un amministratore e una domanda in sospeso

Il programma attivo «Serra» di Marta chiede in console «Accendo l'irrigazione?» e Marta è in ferie. L'amministratore apre **Pannello di controllo → Logic Studio → In esecuzione**, vede «Serra» di Marta in esecuzione e può fermarlo con **Ferma**. Il programma resta fermo finché Marta non lo attiva di nuovo. Se invece l'amministratore risponde alla domanda (con un'app che ha il permesso `kernel:logicstudio-engine`), quello che il programma fa dopo lo fa sempre come Marta, non come l'amministratore.

## Vedi anche

- [Limiti e quote](logicstudio-engine/limits)
- [I programmi](logicstudio-engine/programs)
- [Crea app](ide/create-app)
- [Blocchi di lilOS](logicstudio-lilos) e [Blocchi di rete](logicstudio-net)
