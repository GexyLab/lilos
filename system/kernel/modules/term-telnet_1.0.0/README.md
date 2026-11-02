# term-telnet

Modulo del kernel per i terminali remoti **Telnet** (sessioni remote del Terminale): router, switch e sistemi senza SSH.

- Opzioni del terminale: binario (UTF-8), eco del server, tipo di terminale (RFC 1091), dimensione della finestra (NAWS, RFC 1073), nome dell'utente (NEW-ENVIRON, RFC 1572: molti server chiedono poi solo la password).
- Se il server non fa l'eco, quello che scrivi si vede lo stesso.
- Break, Interrupt e «Ci sei?» dal menu Tasti.
- Telnet su TLS (porta 992): un certificato non valido per il server si conferma come le chiavi SSH.

Senza TLS non è cifrato: password comprese, tutto passa in chiaro.

Fornisce il servizio `term.telnet`. Nessuna dipendenza.
