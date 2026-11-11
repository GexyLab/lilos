# Notify

`lilos.notify` · lilOS · [Blocchi di lilOS](logicstudio-lilos) · versione 1

Ti manda una notifica di lilOS, a nome del programma. La notifica compare nella campanella della barra delle applicazioni, come quelle delle app.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **invia** (`send`) | impulso | Qualsiasi valore che arriva qui manda la notifica. |
| **titolo** (`title`) | testo | Il titolo. Se ha un valore, prende il posto del **Titolo** delle impostazioni. Non avvia il blocco. |
| **testo** (`text`) | testo | Il testo. Se ha un valore, prende il posto del **Testo** delle impostazioni. Non avvia il blocco. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **inviata** (`sent`) | impulso | Manda `true` quando lilOS ha accettato la notifica. |
| **Exception** (`error`) | oggetto | Quando la notifica non parte: niente testo, troppe notifiche, servizio delle notifiche assente. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Titolo** (`title`) | testo | vuoto | Il titolo della notifica, quando l'ingresso **titolo** non ha un valore. Può contenere segnaposto `{nome}`. |
| **Testo ({nome} = un ingresso aggiunto)** (`text`) | testo | vuoto | Il testo della notifica, quando l'ingresso **testo** non ha un valore. Ogni `{nome}` prende il valore dell'ingresso aggiunto che si chiama così. |
| **Tipo** (`level`) | Informazione, Riuscita, Avviso, Errore | Informazione | Il tipo della notifica: cambia l'icona e il colore con cui lilOS la mostra. |

## Porte aggiuntive

Nelle **Proprietà**, sezione **Porte**, con **Aggiungi ingresso** puoi aggiungere fino a 8 ingressi di tipo qualsiasi. Si chiamano **segnaposto 1**, **segnaposto 2**… e puoi **rinominarli**: il nome che dai è quello da scrivere tra graffe nel titolo o nel testo. Il numero di porte aggiuntive ha anche un limite generale del motore (32 di serie, vedi [Limiti](logicstudio-engine/limits)).

Gli ingressi aggiunti **tengono solo il loro valore**: un valore che arriva lì non manda la notifica, anche se l'ingresso «lo avvia». La notifica parte solo con **invia**. Vedi [Come funziona un blocco](ide/blocks).

## Come funziona

Quando arriva un valore su **invia**:

1. Il blocco prende il titolo: il valore di **titolo** se ne ha uno, altrimenti il **Titolo** delle impostazioni. Lo stesso per il testo.
2. Sostituisce ogni `{nome}` con il valore dell'ingresso aggiunto che ha quel nome. Un oggetto o una lista diventa testo JSON (`{"a":1}`); un ingresso aggiunto che non ha ancora ricevuto niente diventa testo vuoto. Un `{nome}` che non corrisponde a nessun ingresso aggiunto resta scritto così com'è. I nomi distinguono maiuscole e minuscole: `{Temp}` non è `{temp}`.
3. Se titolo e testo sono entrambi vuoti (o solo spazi), il blocco si ferma con l'errore «La notifica non ha testo».
4. Chiede a lilOS (nel kernel, a nome tuo) di mandarti la notifica e, se va bene, manda `true` su **inviata**.

Cose da sapere:

- Gli a capo e gli spazi ripetuti diventano **un solo spazio**: la notifica è sempre su una riga.
- Se ci sono titolo e testo, la notifica li mostra uniti così: `Titolo — testo`. Se c'è solo uno dei due, mostra solo quello.
- Il testo della notifica si ferma a **300 caratteri**: il resto viene tagliato senza errore.
- La notifica arriva **a te**, cioè all'utente che possiede il programma, e risulta mandata dal programma: come mittente c'è il nome del programma (al massimo 80 caratteri). Cliccarla non apre niente.
- lilOS tiene solo le ultime notifiche di ogni utente (20 di serie): le più vecchie spariscono.
- **Al massimo 10 notifiche al minuto.** Il limite è per utente e vale per **tutti i tuoi programmi di Logic Studio insieme**, perché per lilOS il mittente è sempre Logic Studio. Oltre il limite il blocco manda su **Exception** «Troppe notifiche in poco tempo: riprova tra N secondi».
- Non collegare **invia** a un blocco che manda valori di continuo (per esempio [Intervallo (setInterval)](core.every) con pochi secondi): metti prima un controllo, come [Al cambio (fronte ↑↓)](core.edge) o [If · Else](core.if), così la notifica parte solo quando qualcosa cambia.
- Il blocco ha bisogno del servizio delle notifiche (`notifications-basic`), che l'AppStore installa insieme a questo pacchetto.

## Esempi

### 1. Una notifica fissa all'avvio

```
[All'avvio (main)] impulso ──▶ invia [Notify]
```

Nelle impostazioni del blocco Notify: **Titolo** `Irrigazione`, **Testo** `Il programma è partito`, **Tipo** Riuscita. Appena il programma parte ricevi la notifica «Irrigazione — Il programma è partito».

### 2. Un valore dentro il testo

Aggiungi un ingresso al blocco Notify e rinominalo `temp`. Nelle impostazioni: **Titolo** `Serra`, **Testo** `Temperatura alta: {temp} °C`, **Tipo** Avviso.

```
[Costante · Variabile: 31,5]  valore ──▶ temp  [Notify]
[Pulsante: avvisa] premuto ──▶ invia
```

Quando premi il [Pulsante](ui.button) ricevi «Serra — Temperatura alta: 31,5 °C». La costante arriva su **temp** all'avvio, ma da solo non manda niente: serve **invia**.

### 3. Avvisare solo quando si supera una soglia

```
[Intervallo (setInterval): 60 s] impulso ──▶ leggi [readFile: ~/serra/temp.txt] contenuto ──▶ a [Confronto (== ≠ < >): a > b] risultato ──▶ valore [Al cambio (fronte ↑↓)] diventa vero ──▶ invia [Notify]
                                                                 contenuto ──▶ temp
[Costante · Variabile: 30]                                                    valore ──▶ b
```

Ogni minuto il programma legge la temperatura da un file (per esempio `31,5`) e la confronta con 30. Il blocco [Al cambio (fronte ↑↓)](core.edge) manda **diventa vero** solo quando il confronto passa da falso a vero: ricevi una notifica quando la temperatura supera 30, non una al minuto. L'ingresso aggiunto **temp** del blocco Notify riceve il contenuto del file, per scriverlo nel testo `{temp} °C`.

> Il blocco Al cambio non manda niente al primo valore che riceve: se la temperatura è già sopra 30 quando il programma parte, la prima notifica arriva solo dopo che è scesa e risalita.

### 4. Titolo e testo da altri blocchi

```
[Template (formatta): "Ordine {numero} arrivato"] testo ──▶ testo [Notify]
[Costante · Variabile: "Negozio"]                          valore ──▶ titolo
[HTTP (fetch)]                               stato ──▶ invia
```

Gli ingressi **titolo** e **testo** non avviano il blocco: tengono il valore finché arriva **invia**. Qui la notifica parte quando il blocco [HTTP (fetch)](net.request) risponde, con il testo preparato da [Template (formatta)](core.format) (che ha un suo ingresso aggiunto **numero**).

## Errori

| Messaggio | Quando |
|---|---|
| La notifica non ha testo | Titolo e testo sono entrambi vuoti. |
| Troppe notifiche in poco tempo: riprova tra N secondi | Hai superato le 10 notifiche al minuto (N sono i secondi che mancano). |
| Troppe notifiche in poco tempo: riprova tra un minuto | Come sopra, quando lilOS non dice quanto aspettare. |
| Notifica non valida: … | lilOS ha rifiutato la notifica (per esempio un tipo non valido). |
| Il servizio delle notifiche non c'è | Il modulo delle notifiche non è installato o non è partito. |
| Il programma non è in esecuzione | Il programma si stava fermando mentre il blocco lavorava. |
| Notify ha impiegato più di 30 s | lilOS non ha risposto entro il tempo massimo di un blocco (30 secondi di serie). |

## Permessi

Il blocco lavora come l'utente che possiede il programma e manda notifiche solo a lui. Un'app fatta con **Crea app** che contiene un blocco Notify, prima di partire, ti chiede il permesso di «mandarti notifiche». Vedi [Permessi](logicstudio-engine/permissions) e [Fare un'app](ide/create-app).

## Vedi anche

- [Emit (evento a lilOS)](lilos.event), per avvisare le pagine di lilOS senza una notifica
- [Print (console.log)](core.consoleWrite), per messaggi che restano nella console del programma
- [Al cambio (fronte ↑↓)](core.edge) e [If · Else](core.if), per mandare la notifica solo quando serve
- [Come funziona un blocco](ide/blocks)
