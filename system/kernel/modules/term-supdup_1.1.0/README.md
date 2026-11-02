# term-supdup

Modulo del kernel che aggiunge il protocollo **SUPDUP** alle sessioni remote del Terminale: lo schermo dei sistemi
**ITS** del MIT (e di chi parla lo stesso protocollo), sulla porta TCP 95.

- Il server parla SUPDUP, la pagina parla xterm: il modulo traduce nei due sensi. I codici di
  schermo del server (%TD: spostamento del cursore, cancellazioni, inserimento e cancellazione di
  righe e caratteri, scorrimento di una zona, campanello, video inverso) diventano sequenze xterm;
  i tasti diventano caratteri SUPDUP, con Meta (Alt), Control e Super come "bucky bit" (`034`).
- Tasti senza equivalente su ITS: frecce → `^P ^N ^F ^B`, Inizio/Fine → `^A`/`^E`, Canc → `^D`,
  Pag↑ → `M-v`, Pag↓ → `^V` (come in EMACS), F1 → [HELP]. Esc da solo è ALTMODE; Backspace è
  RUBOUT. Gli altri tasti funzione e i caratteri non ASCII non vengono inviati.
- Niente accesso nel modulo: ci si collega e si entra sullo schermo del server (su ITS
  `:login nome`). Chiudendo la sessione il modulo chiede al server di chiudere il lavoro (logout).
- Fornisce il servizio `term.supdup`. Nessuna dipendenza.

## Limiti

- **Non cifrato**: tutto passa in chiaro.
- La dimensione dello schermo si comunica solo all'inizio: SUPDUP non ha un messaggio per cambiarla.
  Ridimensionando la finestra il server continua a usare quella di partenza (al massimo 128 × 127).
- Niente grafica SUPDUP (RFC 746) né set di caratteri SAIL in uscita (%TOSAI): ITS mostra Altmode
  come `$` e i caratteri di controllo come `^X`.
- Hyper non esiste in SUPDUP e viene ignorato.
- ITS su TCP non manda il `%TDORS` dopo un reset dell'uscita (`^S`, `^G`) ma aspetta la posizione del
  cursore: dopo questi tasti, quando il server tace, il modulo la manda da solo.

## Riferimenti

- [RFC 734 – SUPDUP Protocol](https://www.rfc-editor.org/rfc/rfc734.txt) e
  [RFC 747 – Recent Extensions to the SUPDUP Protocol](https://www.rfc-editor.org/rfc/rfc747.txt)
- ITS TTY (`.INFO.;ITS TTY`): protocollo del terminale intelligente e codici %TD
- Client di riferimento: [PDP-10/supdup](https://github.com/PDP-10/supdup) (`supdup.c`, `charmap.c`)
- Provato con KA ITS 1652 del progetto [PDP-10/its](https://github.com/PDP-10/its)

Versione 1.1.0: il nome del server si risolve con il kernel, che dà solo gli indirizzi permessi (con più utenti, niente rete locale se l'amministratore non la apre): il nome non può cambiare indirizzo tra il controllo del kernel e la connessione. Con lilOS 1.22.0 quello che il server manda va al terminale appena arriva (`ctx.output`), anche prima che la connessione sia pronta. Richiede lilOS 1.22.0 o successivo.
