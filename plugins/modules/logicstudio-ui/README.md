# logicstudio-ui

Le **Componenti UI** standard di Logic Studio, per costruire le finestre (`.lsui`) dei progetti:

- **testo e valori**: etichetta, valore, indicatore, spia, barra di avanzamento, immagine, tabella, console;
- **comandi**: pulsante (anche «apri una finestra»), interruttore, casella di spunta, pulsanti di opzione, selezione, cursore, campo di testo, campo numerico, data e ora, elenco, scegli file, colore;
- **contenitori**: colonna, riga, griglia, riquadro, schede, area libera, separatore.

Ogni componente ha il suo oggetto in uno schema: gli altri blocchi si collegano a quello. Tutte hanno anche gli ingressi «abilitato» e «visibile». I grafici sono nel pacchetto `logicstudio-charts`.

Richiede `logicstudio-engine` e `logicstudio-core`.
