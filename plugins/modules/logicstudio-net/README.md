# logicstudio-net

I **blocchi di rete** di Logic Studio:

- **Richiesta web**: una richiesta HTTP o HTTPS (GET, POST, PUT, PATCH, DELETE). L'indirizzo viene dalle impostazioni o dall'ingresso **indirizzo**; le intestazioni sono un oggetto JSON nelle impostazioni; il **corpo** è mandato com'è se è testo, come JSON altrimenti. Ogni ingresso aggiunto (fino a 16) è un **parametro** dell'indirizzo, con il nome della porta. Escono la risposta (JSON se il server dice che è JSON, oppure testo o JSON a scelta), lo stato e le intestazioni; un errore di rete va nell'uscita Eccezione. Gli ingressi aggiunti tengono solo il loro valore: la richiesta parte con **invia**.

Per chiedere un JSON ogni tanto basta collegare **Ogni…** a **invia** di Richiesta web.

Sicurezza:

- le richieste verso questo computer, la rete locale e gli altri indirizzi non pubblici sono **bloccate**, a meno che l'amministratore non le permetta nelle impostazioni del modulo («Permetti le richieste a questo computer e alla rete locale»); gli indirizzi link-local (i metadati dei cloud), multicast e «questa rete» non sono permessi mai;
- il nome viene risolto e ogni indirizzo controllato prima di collegarsi, e la connessione va proprio all'indirizzo controllato (niente DNS rebinding);
- al massimo 5 reindirizzamenti, ognuno controllato di nuovo; le intestazioni Authorization e Cookie non passano a un altro sito;
- un tempo massimo e una dimensione massima della risposta (impostazioni del modulo, predefiniti 20 secondi e 1024 KB);
- ogni richiesta, reindirizzamenti compresi, conta nella quota di rete al minuto dell'utente (motore di Logic Studio);
- le intestazioni non vengono mai scritte nei registri né negli errori.

MQTT non c'è ancora.

Richiede il motore `logicstudio-engine`.
