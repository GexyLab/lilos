# AppStore

Installa, aggiorna e rimuove app e moduli del kernel dai repository.

## Come si usa

- **Installati**: le app e i moduli che hai.
- **Aggiornamenti**: quello che ha una versione più nuova; *Aggiorna tutto* li aggiorna insieme.
- Le altre schede sono le **categorie** (Sistema, Produttività, Multimedia, Sviluppo, Kernel…), con quello che offrono tutti i repository.
- La casella in alto cerca nella scheda che stai guardando.
- Fai clic su una card per vederne i dettagli, i permessi e il README.
- **Opzioni**, in basso a destra, gestisce i repository e le preferenze dell'AppStore. Ogni repository, anche quello ufficiale, ha un interruttore: spento, l'AppStore non lo legge e non ne elenca né le app né gli aggiornamenti (vale per l'utente che lo spegne). Quello che hai già installato da lì resta in *Installati*.
- **lilOS** stesso è in *Installati* e, quando il repository ufficiale ne ha una versione nuova, in *Aggiornamenti*. La nuova versione si mette accanto a quella in uso e parte al riavvio del kernel: se non parte, lilOS torna da solo alla versione di prima e lo dice agli amministratori; se parte, chiede se eliminare quella di prima. Nei dettagli ci sono il changelog e le versioni conservate sul disco, con *Usa questa versione* ed *Elimina*. Un lilOS che gira da una copia del suo repository (sviluppo) si aggiorna con git.
- **Lingue** (con lilOS che ha i pacchetti di lingua): i pacchetti di lingua dei testi di lilOS offerti dal repository ufficiale, con versione, stato e chi li ha installati. Ogni utente può installarne o aggiornarne uno, e vale per tutti; lo rimuove chi l'ha installato o un amministratore (chi lo usa torna all'inglese). Dopo l'installazione l'AppStore propone *Usa questa lingua*. Gli aggiornamenti delle lingue sono anche in *Aggiornamenti*. Pannello di controllo → Lingua → *Altre lingue* apre questa scheda.
- **Dipendenze** (con lilOS 1.21.0 o successivo): se un'app ha bisogno di moduli del kernel o di altre app, prima di installarla o aggiornarla l'AppStore mostra cosa si installa insieme; i pacchetti facoltativi hanno una casella. Dopo aver installato o rimosso moduli chiede se riavviare il kernel adesso o più tardi. Un pacchetto che serve a un altro non si rimuove; disinstallando un'app, l'AppStore propone di togliere anche quello che era stato installato solo per lei.

Installare, aggiornare e rimuovere app e moduli è riservato agli amministratori (le lingue no). I moduli del kernel si vedono solo da amministratore.

> Un repository non ufficiale può contenere qualsiasi codice: l'AppStore lo segnala e chiede conferma prima di installare.
