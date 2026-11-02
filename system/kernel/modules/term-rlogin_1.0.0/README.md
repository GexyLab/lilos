# term-rlogin

Modulo del kernel per i terminali remoti **rlogin** (RFC 1282, sessioni remote del Terminale): i vecchi sistemi Unix.

- Il server chiede la password nel terminale, a meno che non si fidi del client (`.rhosts`).
- La dimensione della finestra va al server dopo l'accesso e a ogni cambio (Node non vede i dati urgenti con cui il server la chiede).
- Molti `rlogind` accettano solo client su una porta privilegiata (512-1023): il kernel la usa quando il sistema lo permette (Windows, o il kernel eseguito come root); altrimenti il server di solito chiude subito e il terminale lo spiega.

Non è cifrato: password comprese, tutto passa in chiaro.

Fornisce il servizio `term.rlogin`. Nessuna dipendenza.
