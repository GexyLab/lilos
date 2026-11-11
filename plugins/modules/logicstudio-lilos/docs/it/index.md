# Blocchi di lilOS

`logicstudio-lilos` · richiede il motore `logicstudio-engine`, i [Blocchi di base](logicstudio-core) e il servizio delle notifiche `notifications-basic`

I blocchi che fanno parlare un programma di Logic Studio con lilOS: ti mandano notifiche, leggono e scrivono i file della tua home, elencano le cartelle, mandano eventi alle tue pagine di lilOS. Nell'elenco dei blocchi dell'IDE sono nella categoria **lilOS**.

## Come si installa

Il pacchetto non arriva con Logic Studio IDE: un amministratore lo installa dall'**AppStore**, scheda **Kernel** («Blocchi di lilOS»). L'AppStore installa insieme anche quello che gli serve (il motore, i blocchi di base e il servizio delle notifiche, se mancano). Dopo l'installazione i blocchi compaiono nella scheda **Blocchi** dell'IDE.

Un progetto che usa questi blocchi, su un lilOS che non ha il pacchetto, li mostra con **Manca il pacchetto**; un programma attivo resta in attesa (**Aspetta un pacchetto**) finché il pacchetto torna.

## I blocchi

| Blocco | Tipo | Cosa fa |
|---|---|---|
| [Notifica](lilos.notify) | `lilos.notify` | Ti manda una notifica di lilOS a nome del programma, con segnaposto `{nome}` nel testo. |
| [Leggi file](lilos.fileRead) | `lilos.fileRead` | Legge un file della tua home, come testo o come JSON (al massimo 5 MB). |
| [Scrivi file](lilos.fileWrite) | `lilos.fileWrite` | Scrive (sostituisce) un file della tua home, come testo o come JSON. |
| [Aggiungi a file](lilos.fileAppend) | `lilos.fileAppend` | Aggiunge in fondo a un file: un registro, una riga alla volta (fino a 64 MB). |
| [Elenca cartella](lilos.folderList) | `lilos.folderList` | Gli elementi di una cartella: nome, tipo, dimensione, data, percorso. |
| [Esiste](lilos.exists) | `lilos.exists` | Dice se un file o una cartella c'è, di che tipo è e quanto è grande. |
| [Evento a lilOS](lilos.event) | `lilos.event` | Manda l'evento `logicstudio.event` alle tue pagine di lilOS aperte. |

## Da sapere per tutti i blocchi

### Lavorano nel kernel, come te

I blocchi non toccano lilOS da soli: chiedono al kernel (il computer su cui gira lilOS) di fare l'operazione **come l'utente che possiede il programma**. Quindi:

- vedono e cambiano solo quello che puoi vedere e cambiare tu: quello che non puoi fare tu, non lo fa il programma;
- lo spazio che usano conta nella **quota della tua home**;
- funzionano anche quando lilOS è chiuso nel browser, se il programma è attivo;
- un programma attivo fa davvero quello che dice: un **Scrivi file** sostituisce davvero il file, anche quando non guardi. Provalo prima con **Prova**, su file di prova.

### I percorsi

| Scrivi | Vuol dire |
|---|---|
| `~` | La tua home. |
| `~/dati.txt` | Il file `dati.txt` nella tua home. |
| `~/serra/log.txt` | Il file `log.txt` nella cartella `serra` della home. |
| `/home/anna/dati.txt` | Lo stesso di `~/dati.txt`, se sei l'utente `anna`. |

- Solo la tua home: niente cartelle di sistema, niente home di altri utenti.
- Mai la cartella `~/.config`: sono le tue impostazioni di lilOS.
- Mai i file il cui contenuto è protetto da un'app (per esempio cifrati con FileCrypt): non si leggono né si cambiano.
- Niente `.` e `..`, niente `\`, al massimo 32 livelli e 255 caratteri per nome.
- Un ingresso **percorso** collegato prende il posto del percorso scritto nelle impostazioni. In tutti i blocchi, tranne [Esiste](lilos.exists), **percorso** non avvia il blocco: tiene il valore fino al prossimo comando.

### I limiti

| Cosa | Limite |
|---|---|
| Un file letto da [Leggi file](lilos.fileRead) | 5 MB |
| Dati scritti o aggiunti in una volta | 5 MB |
| Un file fatto crescere da [Aggiungi a file](lilos.fileAppend) | 64 MB |
| Elementi dati da [Elenca cartella](lilos.folderList) | 2000 (il conteggio dice comunque quanti sono) |
| Notifiche | 10 al minuto per utente, per tutti i programmi di Logic Studio insieme; testo tagliato a 300 caratteri |
| Dati di un [Evento a lilOS](lilos.event) | 64 KB (come JSON) |
| Eventi a lilOS | 20 al secondo per programma |
| Tempo di un'operazione | Il tempo massimo di un blocco del motore (30 secondi di serie) |

Valgono anche la quota della tua home, la dimensione massima dei file di lilOS e i limiti del motore di Logic Studio (programmi attivi, esecuzioni, CPU, memoria): vedi [Limiti](logicstudio-engine/limits).

Se un'operazione supera il tempo massimo di un blocco, il blocco manda su **Eccezione** «*Nome del blocco* ha impiegato più di 30 s». L'operazione nel kernel però non viene annullata: per esempio una scrittura lenta può finire lo stesso poco dopo.

### Gli errori

Ogni blocco ha l'uscita **Eccezione**. I messaggi sono in italiano e dicono il percorso nella forma `~/…`, per esempio «Il file «~/dati.txt» non esiste». Se non colleghi **Eccezione**, il messaggio va nella console principale. Ogni pagina elenca i messaggi del suo blocco.

### Le app fatte con Crea app

Un'app fatta con **Crea app** gira con i permessi di chi la apre. Se contiene questi blocchi, prima di partire lilOS apre una finestra «Eseguire «nome»?» che elenca cosa potrà fare:

| Blocchi nell'app | Riga della finestra |
|---|---|
| Leggi file, Scrivi file, Aggiungi a file, Elenca cartella, Esiste | leggere e cambiare i tuoi file |
| Notifica | mandarti notifiche |
| Evento a lilOS | mandare eventi al tuo lilOS |

Con **Esegui** l'app parte e lilOS se lo ricorda per quell'app così com'è, in quella cartella: non te lo chiede più finché l'app non cambia (lilOS ricorda le ultime 200 app permesse). Con **Annulla** l'app non parte. Le prove e i programmi attivi dei tuoi progetti non chiedono niente: sono tuoi. Vedi [Permessi](logicstudio-engine/permissions) e [Fare un'app](ide/create-app).

## Esempi completi

### 1. Un registro con allarme

Ogni minuto il programma legge una temperatura da un file, la aggiunge a un registro e, se supera la soglia, ti avvisa.

```
[Ogni… 60 s] impulso ──▶ leggi [Leggi file: ~/sensori/temp.txt]
             impulso ──▶ leggi [Data e ora]

[Data e ora] ISO       ──▶ ora  [Formatta testo: "{ora};{temp}"] testo ──▶ contenuto [Aggiungi a file: ~/sensori/registro.csv]
[Leggi file] contenuto ──▶ temp

[Leggi file] contenuto ──▶ a [Confronta: a > b] risultato ──▶ valore [Fronte] diventa vero ──▶ invia [Notifica]
[Valore: 30]    valore ──▶ b
[Leggi file] contenuto ──▶ temp [Notifica]
```

- C'è un solo blocco Leggi file: dalla sua uscita **contenuto** partono tre collegamenti.
- [Formatta testo](core.format) ha gli ingressi aggiunti **ora** e **temp**; togli «lo avvia» da **temp**, così scrive una riga sola al minuto.
- La [Notifica](lilos.notify) ha **Titolo** `Serra`, **Testo** `Temperatura: {temp} °C`, **Tipo** Avviso, e un ingresso aggiunto **temp**.
- [Fronte](core.edge) fa partire la notifica solo quando la temperatura **supera** 30, non a ogni minuto.

### 2. Impostazioni che restano

I valori di un programma si perdono quando si ferma. Per tenerli, salvali in un file JSON e rileggili all'avvio:

```
[All'avvio] impulso ──▶ controlla [Esiste: ~/serra/impostazioni.json] se esiste     ──▶ leggi [Leggi file: JSON] contenuto ──▶ oggetto [Prendi campo: soglia] valore ──▶ valore [Campo numerico: soglia]
                                                                     se non esiste ──▶ invia [Valore: JSON {"soglia": 30}] valore ──▶ contenuto [Scrivi file: JSON]

[Campo numerico: soglia] valore ──▶ soglia [Componi oggetto] oggetto ──▶ contenuto [Scrivi file: JSON]
```

All'avvio il programma legge le impostazioni (o le crea la prima volta) e mette la soglia nel [Campo numerico](ui.number) della finestra; ogni volta che l'utente la cambia, [Componi oggetto](core.compose) prepara `{ "soglia": 28 }` e [Scrivi file](lilos.fileWrite) la salva. Tutti i blocchi di file usano lo stesso percorso `~/serra/impostazioni.json` e il formato JSON.

### 3. Una cartella sorvegliata

```
[Ogni… 30 s] impulso ──▶ leggi [Elenca cartella: ~/In arrivo, Solo file] quanti ──▶ a [Confronta: a > b] risultato ──▶ valore [Fronte] diventa vero ──▶ invia [Notifica: "Ci sono file nuovi in In arrivo"]
                                                          [Valore: 0] valore ──▶ b
                                       [Elenca cartella] nomi ──▶ contenuto [Aggiungi a file: ~/In arrivo.log, JSON uno per riga]
```

Ogni 30 secondi il programma conta i file di `~/In arrivo`: quando passano da nessuno ad almeno uno ricevi una notifica, e ogni giro scrive la lista dei nomi come una riga JSON nel registro.

## Limiti noti

- I blocchi lavorano solo sulla tua home: per i file condivisi con te, chiedi a chi li possiede di metterli nella tua home.
- Non c'è un blocco per creare cartelle, rinominare, spostare o eliminare file.
- I file si leggono interi (al massimo 5 MB): non si legge un pezzo di un file grande.
- L'[Evento a lilOS](lilos.event) per ora non è ascoltato da nessuna parte di lilOS.
- Le notifiche sono limitate a 10 al minuto per tutti i tuoi programmi di Logic Studio insieme.

## Vedi anche

- [Blocchi di base](logicstudio-core)
- [Blocchi di rete](logicstudio-net)
- [Il motore](logicstudio-engine), [Limiti](logicstudio-engine/limits), [Permessi](logicstudio-engine/permissions)
- [Come funziona un blocco](ide/blocks)
