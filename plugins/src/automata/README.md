# Automata

Registra quello che fai in lilOS e lo rifà quando vuoi, anche su altri file.

## Cosa fa

- **Registra** le tue operazioni come passi: spostare, rinominare, copiare, eliminare file, i tag, aprire e chiudere finestre, cambiare un'impostazione, riordinare le icone, e quello che fanno le app che si lasciano registrare (vedi sotto). Il **Registratore** sta sempre sopra le altre finestre e non prende mai la tastiera; nella barra delle applicazioni compare **REC** con il numero dei passi. **Pausa** lascia fuori quello che fai, **Ctrl Z** toglie l'ultimo passo, **Fine** crea l'automazione.
- **Modifica** i passi: li accendi e li spegni, li sposti (Alt con le frecce), li togli. Ogni passo può **chiedere conferma** prima di girare e **chiedere i suoi valori** (con la proposta registrata); un campo di testo può essere un **modello** (`{nome}`, `{est}`, `{data}`, `{ora}`, `{n}`, `{cartella}`). Si può scegliere cosa fare se un passo non riesce: fermare, saltare o chiedere.
- **Esegue** l'automazione su uno o più file (i passi si ripetono per ciascuno) o su una cartella, nella finestra **In esecuzione**: con Pausa, Ferma, domande e conferme. **Esegui da qui** e **Solo questo passo** per provare.
- **Si avvia** dal pulsante, dal menu **Automazioni** del tasto destro su file e cartelle (anche solo per certe estensioni), da una scorciatoia con Ctrl o Alt (agisce sulla selezione della finestra davanti, per esempio quella del File Manager, o della scrivania), o dal Terminale: `automata list` e `automata run <nome> [file…] [--campo=valore…] [--yes]`.
- **A un'ora**: da **Opzioni di avvio… → A un'ora → Pianifica…** si apre l'editor di **Pianificazione** già pronto sull'automazione (ogni giorno, certi giorni, ogni tot minuti, cron…). La fa partire il kernel, anche se lilOS era chiuso a quell'ora (appena si apre, se l'operazione lo dice); le operazioni che la eseguono compaiono nelle opzioni di avvio e tra le etichette in alto (un clic le apre in Pianificazione). Vuole «Su cosa lavora: niente». I vecchi «a un'ora» e «ogni tot minuti» delle versioni precedenti passano da soli in Pianificazione (all'accesso, o quando apri Automata), una volta, con una notifica.
- **Parte da sola**, da **Opzioni di avvio… → Quando parte da sola** (fino a 10 motivi): **quando entri**, **quando arrivano file in una cartella** (creati, spostati o copiati lì; sono i file su cui lavora). Vale solo mentre lilOS è aperto, in una scheda sola. Quelle che chiedono qualcosa si aprono nella finestra «In esecuzione»; le altre girano in silenzio e una notifica dice com'è andata. All'accesso vuole «Su cosa lavora: niente».
- Quando un passo chiede **più file**, la finestra «In esecuzione» mostra l'elenco con **Aggiungi un file**, **Aggiungi una cartella** e **Togli**.
- Le password **non si registrano mai**: il passo le chiede ogni volta.

Le automazioni sono file `.automata` (testo) nella cartella **Automazioni** della home, o dove li metti.

## Cosa si può registrare

lilOS stesso: Crea, Rinomina, Sposta, Copia, Sposta nel Cestino, Ripristina, Elimina definitivamente, Svuota il Cestino, Tag, Apri, Apri l'app, Chiudi la finestra, Vai al workspace, Impostazione, Sposta sulla scrivania, Riordina le icone. Poi le azioni delle app: Photo (ridimensiona, ritaglia, converti e salva una copia, salva), Editor (salva, sostituisci tutto, salva con nome), File Manager (vai a una cartella, cerca, ordina, vista), Terminale (esegui un comando), Zip (comprimi, estrai) e FileCrypt (cifra, togli la cifratura, blocca). Quello che un'app non sa registrare (il pennello e il testo di Photo, la scrittura nell'Editor) compare barrato nel Registratore e non entra nell'automazione.

## Da sapere

- Vuole **lilOS 1.21.0** o successivo (la 1.1.0 dell'app, 1.17.0; la 1.0.0, 1.15.0): con una versione precedente la finestra lo dice.
- È un'app di sistema e chiede di leggere e modificare i file della home (`fs.write:~`).
- Un'automazione eseguita cambia davvero file e impostazioni; **Elimina definitivamente** e **Svuota il Cestino** chiedono conferma di serie. Prova prima su copie.
- La registrazione vive nella pagina: ricaricarla la perde.
- Se lilOS è chiuso partono solo le automazioni pianificate (in Pianificazione), appena si apre; la registrazione di quello che si disegna in Photo e di quello che si scrive nell'Editor non c'è ancora.
- Per rendere registrabile un'app vedi la ricetta «Rendere registrabile un'azione della tua app» nella documentazione di lilOS.
