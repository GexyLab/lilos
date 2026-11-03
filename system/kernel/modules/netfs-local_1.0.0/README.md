# netfs-local

Modulo del kernel che porta le **cartelle del computer su cui gira il kernel** nella cartella Rete. Con il programma lilOS (lilOS installato sul proprio computer) quel computer è il tuo: Documenti, Download, le chiavette USB compaiono in **Rete › Questo computer** e si leggono e scrivono dove sono, senza copie.

- In **Connetti a un server** compare **Questo computer (cartella)**: si scrive il percorso completo (`C:\Users\Mario\Documents`, `/home/mario/Documenti`), con **Sola lettura** se serve. Nel programma lilOS il Pannello di controllo → Computer le aggiunge anche con il dialogo del computer, e le chiavette USB si collegano da sole quando le inserisci.
- I percorsi non escono mai dalla cartella scelta: `..` è rifiutato e i collegamenti simbolici che puntano fuori non si vedono e non si seguono.
- Si legge e si scrive con i permessi dell'utente del computer che fa girare il kernel. **Eliminare è definitivo** (niente cestino del computer). In alto c'è lo spazio del disco.

## Chi può collegare cosa

- Con un solo utente, e per gli **amministratori**, qualsiasi cartella del computer.
- Gli altri utenti solo le cartelle che un amministratore elenca in **Pannello di controllo → Cartelle del computer** (una per riga), o cartelle dentro di esse. Su un server con più utenti questo evita che chiunque legga le cartelle del server.

Fornisce il servizio `netfs.local`. Nessuna dipendenza. Richiede lilOS 1.22.0 o successivo.
