# Editor

Editor di testo e di codice.

## Cosa fa

- Evidenzia la sintassi dei linguaggi più comuni.
- Suggerisce mentre scrivi e controlla **JSON**, **CSS** e **HTML**, segnalando gli errori.
- Va a capo da solo: niente scorrimento orizzontale.
- Prepara le **anteprime** dei file di testo (punto d'ingresso `filePreview`): un foglio con le prime righe colorate, per le miniature del File Manager e della scrivania.
- Ha l'albero dei file della cartella aperta, per passare da un file all'altro.
- **Trova e sostituisci** (Ctrl+F, Ctrl+H) in una barra sopra il testo: maiuscole e minuscole, parola intera, espressioni regolari; i risultati sono evidenziati nel testo con il conteggio («3 di 12»). «Sostituisci tutto» si annulla con un solo Ctrl+Z.
- **Salva con nome** (Ctrl+Maiusc+S): nome e cartella nella barra sopra il testo; se c'è già un file con quel nome chiede prima di sostituirlo. Dopo, la scheda mostra il nuovo file. Un documento nuovo lo chiede al primo salvataggio.

Si apre facendo doppio clic su un file di testo, oppure dal menu Start.
Si può nascondere o rimuovere: lilOS funziona anche senza.

## Automazioni

Con **Automata** (lilOS 1.15.0 o successivo) l'Editor rende registrabili:

- **Salva il file**: rifatto, salva la scheda di quel file senza chiedere niente.
- **Sostituisci tutto nel testo**: si registra quando premi «Sostituisci tutto» (non le sostituzioni una alla volta), con il testo cercato, quello nuovo e le opzioni. Rifatto, sostituisce tutto nella scheda di quel file; un'espressione regolare non valida ferma il passo con un errore.
- **Salva con nome**: cartella e nome; il risultato è il nuovo file, che i passi dopo possono usare. Rifatto non chiede niente: se nella cartella c'è già un file con quel nome, ci scrive sopra.

Scrivere non si registra (il Registratore lo mostra barrato).
