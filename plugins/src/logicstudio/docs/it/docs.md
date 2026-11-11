# La documentazione

La documentazione di Logic Studio si legge dentro l'IDE, nella finestra **Documentazione di Logic Studio**. Ha tre parti:

- la **guida dell'IDE** (questa), che parte dalla [panoramica](ide/index);
- una pagina per ogni **pacchetto**, con l'elenco dei suoi blocchi o delle sue componenti (per esempio [Blocchi di base](logicstudio-core)), e le pagine del [motore](logicstudio-engine);
- una pagina per ogni **blocco** e ogni **componente**, con porte, impostazioni, come funziona ed esempi (per esempio [Somma](core.add) o [Pulsante](ui.button)).

## Come si apre

| Da dove | Come | Cosa mostra |
|---|---|---|
| Un blocco sullo schema | Tasto destro sul blocco → **Documentazione** | La pagina del blocco. Per l'oggetto di una componente, la pagina della componente. |
| Un collegamento sullo schema | Tasto destro sul collegamento → **Documentazione** | [Collegamenti e tipi delle porte](ide/links). |
| Il foglio dello schema | Tasto destro su un punto vuoto → **Documentazione dell'editor degli schemi** | [Schemi](ide/schemas). |
| Una componente nell'editor delle finestre | Tasto destro sulla componente → **Documentazione** | La pagina della componente. |
| La finestra nell'editor delle finestre | Tasto destro su un punto vuoto → **Documentazione dell'editor delle finestre** | [Finestre](ide/windows). |
| La palette (Blocchi o Componenti) | Tasto destro sulla voce → **Documentazione**, oppure **F1** sulla voce | La pagina di quel blocco o di quella componente. |
| L'elenco **Progetto** | Tasto destro su un gruppo, una cartella o un elemento → **Documentazione** | Schemi, Finestre o [Progetti](ide/projects). |
| Le **Proprietà** | Il pulsante **?** accanto al nome del blocco o della componente | La pagina di ciò che è selezionato. |
| Ovunque nell'IDE | **F1**, oppure il pulsante **?** a destra nella barra degli strumenti | La pagina di ciò che è selezionato; senza selezione, la pagina dell'editor aperto (Schemi, Finestre, la Mappa porta a Progetti, la Home a questa guida). |

La finestra è una sola: se è già aperta, va in primo piano e mostra la pagina nuova.

## Come si usa

- A sinistra c'è l'**indice**: la guida dell'IDE, poi un gruppo per ogni pacchetto installato, con la **Panoramica** del pacchetto e i suoi blocchi o componenti divisi per categoria, come nella palette. La pagina aperta è evidenziata.
- I **collegamenti** nel testo portano ad altre pagine: un blocco, un pacchetto, una pagina di questa guida. Quelli che vanno fuori da lilOS si aprono in una nuova scheda del browser.
- **Indietro** e **Avanti** (le frecce in alto a sinistra, oppure **Alt+←** e **Alt+→**) ripercorrono le pagine viste; la casetta torna alla **Pagina iniziale** (la panoramica della guida).
- La **ricerca** (casella sopra l'indice, oppure **Ctrl+F**) filtra l'indice per titolo e per tipo: scrivi il nome di un blocco (`somma`) o il suo tipo (`core.add`). **Invio** apre la prima pagina trovata.
- Le pagine sono nella lingua di lilOS; se una pagina non c'è nella tua lingua si vede in inglese, e se non c'è nemmeno in inglese in italiano.
- Ci sono le pagine dei **pacchetti installati**: un pacchetto che non hai non ha pagine. Le pagine arrivano con il pacchetto e si aggiornano con lui. Un blocco senza pagina mostra «Pagina non trovata», con il suo nome, la sua descrizione e un collegamento alla pagina del pacchetto.
- La documentazione non si modifica dall'IDE. Per scrivere quella di un tuo pacchetto vedi [Scrivere un pacchetto](logicstudio-engine/packages).

## Vedi anche

- [Logic Studio IDE](ide/index)
- [Come funziona un blocco](ide/blocks)
- [Scorciatoie da tastiera](ide/shortcuts)
