# Stato e roadmap

Aggiornato al 28 ottobre 2026.

## Cosa c'è

| Area | Stato |
| --- | --- |
| Scrivania infinita | Fatta: spostamento, zoom al cursore, animazioni, "Mostra tutto", camera salvata |
| Minimappa e controlli zoom | Fatti |
| Elementi del desktop | Fatti: cartella, file, app; selezione multipla, trascinamento con griglia, rinomina, elimina, riordina, menu contestuali, salvataggio |
| Barra in basso | Fatta: logo, area finestre (vuota), utente, data e ora |
| Menu di avvio | Fatto: ricerca, tastiera, piè di pagina con utente |
| Menu contestuale | Componente riutilizzabile fatto |
| SDK `@lilos/sdk` | Fatto (0.2.1): basi, controlli, `Window`, `SettingsView`, `SettingsWindow`, `settings`, `shortcuts`, `fs`, `selectionGesture` |
| File system | Fatto: cartelle, file con contenuto (IndexedDB) e collegamenti, cartelle di sistema, migrazione della vecchia scrivania |
| Associazioni dei tipi di file | Fatte: predefinite dal registro, modificabili in Impostazioni → Usabilità → Tipi di file, finestra "Apri con" |
| Selezione sulla scrivania | Fatta: clic, Ctrl/Shift, rettangolo, percorso libero (Alt + trascina, modificabile) |
| Scorciatoie da tastiera | Fatte: registro unico, 12 comandi, modificabili in Impostazioni → Usabilità → Scorciatoie, con controllo di conflitti e combinazioni non valide |
| Gestore delle finestre | Fatto, versione di base: apertura, focus, trascinamento, ridimensionamento da tutti i bordi e gli angoli, ingrandisci, riduci, chiudi, pulsanti nella barra; controlli e bordi attivabili uno per uno |
| Finestra base delle impostazioni | Fatta (`SettingsWindow`), dal render approvato `design/settings-window.html` |
| App | File (File Manager), Editor e Impostazioni fatte. Le altre 6 del registro **da fare** |
| Apertura di cartelle e file | Fatta: cartelle nell'app File, file con l'app associata o "Apri con" |
| Utenti | **Da fare.** Nome fisso in `sdk/core/session.js` |
| Test automatici | **Da fare.** Vedi [Processo](processo.md) |

## Limiti noti

### Funzionali

- **Eliminazione definitiva.** Niente cestino, conferma o annulla.
- **Niente navigazione da tastiera tra gli elementi.** Non si possono scegliere gli elementi con le frecce.
- **Più schede aperte si sovrascrivono.** Ogni scheda salva l'intero desktop: l'ultima che salva vince e cancella le modifiche fatte nelle altre. Non c'è sincronizzazione tra schede (si potrebbe usare l'evento `storage`).
- **Finestre non ricordate.** Al ricaricamento le finestre aperte sono chiuse.
- **Il bordo inferiore di una finestra può finire sotto la barra in basso**: per ridimensionarlo bisogna prima spostare la finestra o la vista.
- **Ridimensionamento solo con il mouse**: niente tasti per cambiare le dimensioni.
- **Esc non si può assegnare a un comando nuovo**: durante la registrazione annulla. Resta assegnato a "Togli la selezione" finché non lo togli, e torna con Ripristina.
- **Le combinazioni riservate dal browser** sono un elenco fisso (Ctrl W, Ctrl T, Ctrl N…): altre combinazioni intercettate dal browser o dal sistema operativo si possono assegnare ma potrebbero non arrivare a lilOS.
- **Scorciatoie uguali in contesti diversi** non sono ammesse: una combinazione appartiene a un solo comando, anche se i due comandi non sono mai attivi insieme.
- **Editor semplice**: un documento per finestra, niente cerca e sostituisci, niente a capo automatico, niente "Salva come" (i documenti nuovi vanno in Documenti), evidenziazione approssimata; oltre 300 000 caratteri il testo non è colorato.
- **Solo l'Editor apre file**: le immagini e gli altri tipi non hanno ancora un'app.
- **Contenuto solo testo**: niente file binari (immagini vere, PDF), niente importazione dal computer.
- **Niente spostamento tra cartelle**: non si possono trascinare elementi dentro una cartella né copiarli o spostarli.
- **Nell'app File manca il rettangolo di selezione** (c'è sulla scrivania).
- **Il rettangolo di selezione non fa scorrere la vista** quando si arriva al bordo dello schermo.
- **Spazio di `localStorage`**: tutto il file system sta in una chiave; con molte migliaia di nodi si potrebbe arrivare al limite del browser (di solito 5 MB).
- **Schermi touch.** Un dito sposta la vista, ma lo zoom con due dita non è gestito (funziona solo il pizzico del trackpad, che il browser trasmette come Ctrl + rotella). Non c'è un'alternativa al tasto destro.

### Tecnici

- **Distruzione dei componenti solo per le finestre.** `Window` ha `destroy()` e un `signal` (`AbortController`) per i listener del contenuto. I componenti del sistema (Canvas, Desktop, Taskbar…) non hanno `destroy()`: va bene finché vengono creati una sola volta.
- **La minimappa ricrea tutti i blocchi a ogni cambiamento.** Va bene fino a qualche centinaio di oggetti; oltre conviene disegnare su un `<canvas>`.
- **I font arrivano da Google Fonts.** Senza rete si usano i font di sistema. Per l'uso offline andranno inclusi nel progetto.

## Roadmap

In ordine di priorità.

### 1. Gestore delle finestre: completamento

Fatto: vedi la tabella sopra (compreso il ridimensionamento da tutti i bordi). Resta:

- decidere se ricordare le finestre aperte al ricaricamento;
- finestre di dialogo (conferme) nell'SDK, al posto del pulsante "a due clic" usato nell'app Impostazioni.

### 2. Struttura delle app

Fatto: caricamento al primo avvio (`load` nel registro) ed export predefinito `({ args }) → Window`. Resta da definire il contesto passato alle app (accesso ai file, comunicazione con altre app).

Prossime app: visualizzatore di Immagini (dipende dai contenuti binari), Terminale.

### 3. File system: contenuti e spostamenti

Fatto: albero di cartelle, file con contenuto e collegamenti, scrivania come cartella, app File, Editor, associazioni dei tipi di file, migrazione (vedi [D15](decisioni.md#d15-file-system-virtuale-la-scrivania-è-una-cartella)). Resta:

- importare ed esportare file dal computer (trascinamento, download), contenuti binari;
- spostare e copiare: trascinare elementi su una cartella, tra scrivania e File, taglia/copia/incolla;
- rettangolo di selezione anche nell'app File.

### 4. Cestino e annulla

Eliminare sposta nel cestino. Ctrl Z annulla l'ultima azione sugli elementi (spostamento, rinomina, eliminazione).

### 5. Miglioramenti della scrivania

Selezione a rettangolo, navigazione con le frecce, copia e incolla, trascinamento di file dal sistema operativo sulla scrivania.

### 6. Impostazioni e utente

Nome utente, sfondo e colore principale, poi un vero accesso.

### 7. Qualità

Test automatici nel repository (vedi [Processo](processo.md#test-automatici)), validazione dei dati salvati, gestione delle schede multiple.
