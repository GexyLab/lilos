# logicstudio-engine

Modulo del kernel **Logic Studio Engine**: fa girare gli schemi e i progetti di Logic Studio (blocchi logici collegati tra loro, come in OpenBack) per ogni utente.

- Ogni utente con programmi in esecuzione ha un suo thread (worker), con la sua memoria: un programma che sbaglia non tocca quelli degli altri.
- Un programma è una **prova**, lanciata dall'IDE e fermata da sola dopo qualche minuto, oppure un **programma attivo**, che gira finché non lo si ferma, anche con lilOS chiuso, e riparte con il kernel.
- Le **console** dei progetti stanno qui: le righe scritte dai blocchi e le domande dei blocchi «Leggi da console», a cui si risponde dall'IDE o dalle finestre che apre lilOS.
- **Quote per utente** (programmi attivi, prove, CPU, memoria, richieste di rete al minuto, registro) e **limiti globali** (blocchi e collegamenti per schema, schemi e finestre per progetto, esecuzioni al secondo…): si scelgono nel Pannello di controllo → Logic Studio. Un amministratore può dare a un utente quote diverse.
- I blocchi e le Componenti UI arrivano da altri moduli, i **pacchetti** (`logicstudio-core` è quello di base): si registrano presso il motore quando partono.

Fornisce il servizio `logicstudio`. I dati (programmi attivi salvati, quote degli utenti, registri) stanno nella cartella dati del modulo e restano dopo un aggiornamento.
