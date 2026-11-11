# Fare un'app

**Crea app…** trasforma il progetto in un'**app di lilOS**: un pacchetto con le finestre del progetto, che si apre con un doppio clic e gira con il motore di questo lilOS. Serve un progetto (non uno schema da solo) e lilOS dalla 1.37.0.

> Per ora l'app **non si installa**: gira dalla sua cartella, **solo per te**, e solo **finché le sue finestre sono aperte**. Non compare nel menu delle applicazioni né nell'AppStore.

## Passo passo

1. Apri il progetto e premi **Crea app…** nella barra («Fa un'app di lilOS dal progetto, e la esegue»).
2. Se ci sono modifiche non salvate, l'IDE **salva tutto** senza chiedere.
3. Si apre **Crea un'app da «Nome»**: «L'app ha le finestre del progetto e usa il motore di questo lilOS. Per ora non si installa: gira dalla sua cartella, solo per te, mentre le sue finestre sono aperte.» In alto vedi l'icona come sarà, e «Il pacchetto va in `~/App create/<id>`: apri il suo file .lsapp per eseguirla di nuovo.»
4. Compila i campi:

| Campo | Regole | Proposto |
|---|---|---|
| **Nome dell'app** | Obbligatorio, al massimo 60 caratteri. | Il nome del progetto. |
| **Id** | Lettere minuscole, cifre e `-`, iniziando con una lettera, da 2 a 41 caratteri («Lettere minuscole, cifre e -, iniziando con una lettera»). | L'id usato l'ultima volta, o uno fatto dal nome: `Orto di casa` → `orto-di-casa`, `Città` → `citta`, `3D` → `app-3d`. |
| **Versione** | Tre numeri: `1.0.0`. | La versione del progetto. |
| **Descrizione** | Al massimo 200 caratteri. | La descrizione del progetto. |
| **Icona** | blocks, window, chart, bolt, bell, calculator, clock, gauge, lamp, home, globe, terminal. | Quella usata l'ultima volta, o blocks. |
| **Colore** | **verde**, **blu**, **viola**, **verde acqua**, **arancione**, **rosso**. | Quello usato l'ultima volta, o verde. |

5. Premi:
   - **Crea**: prepara l'app. Alla fine: **«Nome» è pronta** — «Il pacchetto è in /home/…/App create/orto-di-casa. Apri il suo file .lsapp per eseguirla.»
   - **Crea ed esegui**: prepara l'app e la fa partire subito.
   - **Annulla**: non fa niente.

L'id, l'icona e il colore restano nel progetto per la volta successiva; versione e descrizione aggiornano quelle del progetto (Opzioni → Generale). Il progetto viene salvato.

Se qualcosa va storto: **Non si è potuta creare l'app** con il motivo. Con un lilOS più vecchio di 1.37.0, **Crea ed esegui** dice «Eseguire le app fatte dai progetti richiede lilOS 1.37.0 o successivo».

## Cosa c'è nel pacchetto

```
~/App create/
  orto-di-casa/
    lilos.json          il manifesto dell'app
    index.js            il codice dell'app (chiede a lilOS di far girare il progetto)
    locales.json        il nome, la descrizione e le traduzioni dei testi delle finestre
    project/            una copia del progetto
      Orto di casa.lsproj
      schemi/ …
      ui/ …
      risorse/ …
    orto-di-casa.lsapp  il file che fa partire l'app
```

- La cartella **App create** si crea nella tua home se non c'è.
- **Rifacendo** l'app con lo stesso id, la cartella vecchia va nel **Cestino** e ne viene scritta una nuova: non metterci file tuoi.
- Il manifesto `lilos.json` elenca come dipendenze il motore e i **pacchetti** dei blocchi e delle componenti che il progetto usa (con la versione installata adesso come minima), le finestre con un punto d'ingresso e i tipi di file che aprono. Vedi [Formati dei file](ide/formats).

## Far partire l'app

- **Doppio clic** sul file `.lsapp` (nel File Manager o sulla scrivania): lilOS la fa partire. Se apri il `.lsapp` con Logic Studio IDE, l'IDE non si apre e l'app parte lo stesso.
- Oppure **Crea ed esegui** dall'IDE.

L'app parte come programma di tipo **App (non installata)**: la trovi nella Home dell'IDE, in **I miei programmi**, e conta tra i tuoi programmi attivi. Si apre la sua **finestra main**. Quando chiudi **l'ultima** finestra dell'app, il programma si ferma, le sue console si chiudono e dopo un minuto sparisce dall'elenco.

### Il consenso

L'app gira **con i tuoi permessi**. Se i suoi schemi usano blocchi che toccano i tuoi dati o il mondo fuori, prima di partire lilOS apre una finestra che chiede se eseguirla, dice che l'app è stata fatta con Logic Studio e gira come te, ed elenca cosa potrà fare:

| Se usa | lilOS dice che potrà |
|---|---|
| **readFile**, **writeFile**, **appendFile**, **readdir**, **exists** | leggere e cambiare i tuoi file |
| un blocco di **Rete** | fare richieste su internet |
| **Notify** | mandarti notifiche |
| **Emit** | mandare eventi al tuo lilOS |

Sotto c'è il percorso del file `.lsapp`, con il consiglio di eseguirla solo se ti fidi di chi l'ha fatta, e i pulsanti per annullare o eseguire. I testi di questa finestra sono di lilOS: la loro forma originale è in inglese («Run «Nome»?», «This app was made with Logic Studio and runs as you. It can:», **Cancel**, **Run**) e li vedi tradotti se lilOS ha il pacchetto della tua lingua.

- **Esegui** (**Run**) vale per **quel pacchetto così com'è**: lilOS non lo chiede più finché il pacchetto non cambia (un altro percorso, uno schema o una finestra diversi). Se rifai l'app con **Crea app…** e qualcosa è cambiato, lo chiede di nuovo. lilOS ricorda al massimo 200 consensi.
- Un'app che non usa questi blocchi parte senza chiedere.
- Se l'app non parte: una notifica «Nome did not start: …»; se il `.lsapp` non è di Logic Studio o mancano i suoi file: «This is not an app made by Logic Studio, or its files are missing».

## Le finestre e le console dell'app

- Le finestre si comportano come quelle dei programmi attivi: una finestra già aperta non si apre due volte; i pulsanti con **Apri una finestra** e **Chiudi questa finestra** funzionano.
- Le console si aprono secondo **Opzioni del progetto → Console → Fuori dall'IDE** (vedi [Console](ide/consoles)).
- Le opzioni **L'app e le sue finestre** valgono anche qui.
- Le immagini delle componenti vengono dalla cartella `risorse/` della copia del progetto.

## Cosa non c'è ancora

- L'app non si **installa**: niente voce nel menu delle applicazioni, niente aggiornamenti dall'AppStore, niente uso da parte di altri utenti.
- I **punti d'ingresso** delle finestre (aprire un tipo di file, voce nel menu dei file, chiamata da altre app, all'ingresso dell'utente) vengono scritti nel manifesto ma, finché l'app non si installa, **non fanno niente**.
- L'app usa il motore e i pacchetti di **questo** lilOS: su un altro lilOS funziona solo se lì sono installati gli stessi pacchetti.

## Esempi

### 1. Un'app per il contatore

1. Apri il progetto **Contatore** (vedi la [panoramica](ide/index)) e aggiungi alla finestra **Principale** un **Valore** e un **Pulsante** con i loro oggetti.
2. **Crea app…** → **Nome dell'app** `Contatore`, **Id** `contatore`, **Icona** `calculator`, **Colore** **blu** → **Crea ed esegui**.
3. Si apre la finestra **Contatore**. Chiudendola, il programma si ferma.
4. La prossima volta: doppio clic su `~/App create/contatore/contatore.lsapp`.

### 2. Un'app che scrive un file

Il progetto ha un **writeFile** su `~/note.txt`. Al primo avvio dell'app compare **Eseguire «Note»?** con «leggere e cambiare i tuoi file». Premi **Esegui**: la volta dopo non te lo chiede più. Se cambi il progetto e rifai l'app, te lo chiede di nuovo.

### 3. Aggiornare l'app

1. Cambia il progetto nell'IDE e provalo.
2. **Crea app…**: i campi sono già compilati con l'id di prima; alza la **Versione** (per esempio `1.1.0`) e premi **Crea**.
3. La cartella vecchia va nel Cestino e il `.lsapp` nuovo è allo stesso posto.

## Vedi anche

- [Finestre](ide/windows)
- [Prova e programmi attivi](ide/run)
- [Formati dei file](ide/formats)
- [Permessi](logicstudio-engine/permissions)
