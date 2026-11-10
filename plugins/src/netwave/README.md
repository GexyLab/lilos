# NetWave Browser

Un browser per lilOS: pagine web in schede, in quante finestre vuoi. Ogni finestra si può salvare come **sessione**, un file con tutte le sue schede, e la cronologia ricorda sia le pagine sia le sessioni aperte. Le pagine non girano dentro lilOS: le mostra il **programma lilOS**, ognuna in un processo e con dati suoi, separati da lilOS.

## Cosa fa

- **Schede e finestre.** Tutte le finestre che vuoi, ognuna con le sue schede. Le schede si possono fissare, silenziare, duplicare e spostare in una nuova finestra.
- **Finestra privata** (Ctrl Shift N). Cookie e dati dei siti restano in memoria e spariscono alla chiusura. Le pagine non entrano nella cronologia e la finestra non si salva come sessione.
- **Sessioni** in file `.nwsession`: tutte le schede di una finestra. Si salvano in **Documenti › Sessioni NetWave** (puoi scegliere un'altra cartella) e si riaprono con un doppio clic. Nel file ci sono solo indirizzi e titoli: mai cookie, password, dati dei moduli o permessi dei siti. Una sessione può salvarsi da sola a ogni modifica.
- **Cronologia** (Ctrl H), per utente: le **pagine**, ognuna con la sessione in cui è stata aperta; le **sessioni** aperte, salvate e chiuse, con una foto delle loro schede, così si riaprono anche se il file non c'è più; le **schede e finestre chiuse di recente**. Si può cercare e cancellare per periodo.
- **Permessi dei siti.** Quando un sito vuole la tua posizione, la fotocamera, il microfono, le notifiche e simili, NetWave lo chiede con una barra sopra la pagina: **Non consentire** o **Consenti**, con la casella **Ricorda per questo sito**. Fotocamera e microfono si chiedono e si ricordano a parte. Senza risposta in 2 minuti vale no e la barra sparisce. Lo scudo nella barra degli indirizzi mostra cosa hai deciso e lascia cambiarlo (anche per le schede già aperte). Nelle finestre private la risposta non viene ricordata.
- **Nuove schede chieste da una pagina** (popup, collegamenti a una nuova finestra): NetWave chiede prima, con la stessa barra e la stessa casella (la risposta ricordata è il permesso `tabs`). Non chiede per la scheda in background scelta da te (Ctrl o clic centrale). Il programma ne lascia passare al massimo 5 ogni 10 secondi per pagina.
- **Download** in **Download** della tua home, con una notifica a fine scaricamento (Ctrl J per l'elenco). Fino a 1 GB e al massimo 4 alla volta per finestra di lilOS; sono letti a pezzi da 8 MB e salvati uno alla volta; i nomi sono accorciati a 150 caratteri. Un avviso dice se un download è troppo grande, troppi insieme o interrotto.
- **Trova nella pagina** (Ctrl F), **zoom** per ogni scheda e menu del tasto destro sulla pagina.
- **Opzioni**: pagina iniziale, motore di ricerca (DuckDuckGo, Startpage, Bing, Google, Ecosia), giorni di cronologia (7, 30, 90, 365 o per sempre; di serie 90), permessi ricordati e, in **Siti**, **Chiedi prima che una pagina apra nuove schede** (attivo di serie; spento, le schede si aprono subito).
- Le sessioni `.nwsession` hanno la loro anteprima sulla scrivania e nel File Manager, e un collegamento a una pagina web sulla scrivania si apre in NetWave.

## Tasti

| Tasti | Azione |
| --- | --- |
| Ctrl T | Nuova scheda |
| Ctrl W, Ctrl F4 | Chiudi la scheda |
| Ctrl Shift T | Riapri la scheda chiusa |
| Ctrl N | Nuova finestra |
| Ctrl Shift N | Nuova finestra privata |
| Ctrl L, Alt D, F6 | Vai all'indirizzo |
| F5, Ctrl R | Ricarica |
| Ctrl Shift R, Ctrl F5 | Ricarica senza usare la copia salvata |
| Alt ←, Alt → | Indietro, avanti |
| Alt Home | Pagina iniziale |
| Ctrl Tab, Ctrl Pag giù | Scheda successiva |
| Ctrl Shift Tab, Ctrl Pag su | Scheda precedente |
| Ctrl 1 … Ctrl 8 | Va alla scheda 1 … 8 |
| Ctrl 9 | Va all'ultima scheda |
| Ctrl H | Cronologia |
| Ctrl J | Download |
| Ctrl S | Salva la sessione |
| Ctrl Shift S | Salva come nuova sessione |
| Ctrl O | Apri una sessione |
| Ctrl F, F3 | Trova nella pagina, cerca ancora |
| Ctrl +, Ctrl − , Ctrl 0 | Ingrandisci, riduci, dimensione reale |

## Da sapere

- Serve lilOS 1.38.0 o successivo; con la 1.38.1 (SDK 0.23.1) i download si leggono a pezzi. L'app chiede di scrivere i file della tua home (per le sessioni e i download).
- **Le pagine web si vedono solo nel programma lilOS** (versione 0.5.1 o successiva; con la 0.5.0 funziona, ma senza i limiti nuovi di indirizzi del computer, popup e download) collegato a questo lilOS come il suo o come server di fiducia. In un browser NetWave mostra un avviso e offre **Apri nel browser**; sessioni e cronologia funzionano comunque.
- Gli indirizzi di lilOS (con ogni nome di questo computer: `localhost`, `127.0.0.1`, gli IP delle schede di rete, nomi che portano al computer) e i file del computer (`file:`) non si aprono da NetWave. Si aprono solo indirizzi `http:` e `https:`. Nella barra degli indirizzi `file:`, `javascript:`, `mailto:`, `chrome:` e `about:` (tranne `about:blank`) mostrano la pagina «NetWave non apre questo indirizzo» e non diventano una ricerca.
- Il titolo della finestra mostra il sito, non il titolo della pagina. Il ripristino di una finestra dopo un ricaricamento di lilOS riapre solo indirizzi `http(s)` e `about:blank`; una finestra privata non si riapre.
- I dati dei siti (cookie, accessi) sono quelli dell'utente di lilOS e sono condivisi tra le sue finestre normali. Un altro utente, o una finestra privata, ne ha di propri.
- Le scorciatoie di lilOS non arrivano mentre sei dentro una pagina: lì valgono quelle di NetWave. Lo schermo intero chiesto da una pagina e gli strumenti per sviluppatori sono disattivati.
- Una notifica o un menu di lilOS sopra la pagina la trasformano per qualche secondo in un'immagine: il resto della pagina non si può usare finché sono lì.
- La cronologia riconosce una sessione dal suo codice, scritto nel file: se sposti o rinomini il file, resta la stessa sessione. Se il file non c'è più, la sessione si riapre dalla cronologia, com'era quando l'hai aperta o salvata.
