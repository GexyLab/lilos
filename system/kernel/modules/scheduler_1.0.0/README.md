# scheduler

Modulo **obbligatorio** del kernel: la **Pianificazione**, cioè le operazioni che lilOS fa a una data e ora o ripetute, anche a lilOS chiuso. Il kernel non parte senza: lo rimette quando manca (viene con lilOS stesso) e non lo lascia rimuovere. Si aggiorna come gli altri moduli.

- Fornisce il servizio `scheduler`. Tiene le operazioni in `scheduler.json` e le loro corse in `history.json`, nella cartella del modulo: restano dopo un riavvio e dopo un aggiornamento.
- Un solo timer per la prossima corsa, e ogni 30 secondi un controllo sull'ora vera (il computer sospeso, l'ora cambiata).
- Una volta persa a kernel spento si recupera **una sola volta** quando riparte, entro `catchUpHours` ore (12), a meno che l'operazione dica di saltarla.
- Un utente vede e cambia solo le sue operazioni; un amministratore quelle di tutti e quelle del sistema.
- Cosa fa un'operazione (un promemoria, la copia di una cartella, una richiesta web, un comando, il servizio di un'app, aprire un'app o un file, un'automazione) lo decide e lo fa il kernel: il modulo conserva, tiene l'orologio, gestisce sovrapposizioni, tentativi e storico.

Impostazioni (Pannello di controllo → Kernel): operazioni per utente al massimo (`maxTasksPerUser`, 100), tempo minimo tra due volte (`minIntervalMinutes`, 1 minuto), operazioni in corso insieme (`maxParallel`, 4), corse conservate per operazione (`historyPerTask`, 50), ore entro cui si recupera (`catchUpHours`, 12), output conservato di ogni corsa (`outputKb`, 16 KB).
