# SerialPort (porta seriale COM)

`hw.serial` · Hardware · [Hardware](logicstudio-hardware) · versione 1

Apre una porta seriale del computer dove gira lilOS e ci parla: riceve i messaggi che arrivano (divisi in righe, fino a un delimitatore, a lunghezza fissa, con un'espressione regolare o così come arrivano), manda testo o byte, imposta le linee DTR e RTS. È il blocco per Arduino, ESP32, strumenti di misura, bilance, lettori di codici a barre seriali, modem.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **apri** (`open`) | impulso | Apre la porta con le impostazioni. Se era già aperta da questo blocco, la chiude e la riapre. |
| **chiudi** (`close`) | impulso | Chiude la porta. |
| **invia** (`send`) | qualsiasi | Manda un valore alla porta, secondo **Dati come** (vedi sotto). La porta deve essere aperta. |
| **DTR** (`dtr`) | sì/no | Accende o spegne la linea DTR. Nascosto: mostralo nelle Proprietà. |
| **RTS** (`rts`) | sì/no | Accende o spegne la linea RTS. Nascosto. |
| **percorso** (`path`) | testo | Il percorso della porta (`COM3`, `/dev/ttyUSB0`): prende il posto di **Porta** alla prossima apertura. Non avvia il blocco. Nascosto. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **dati** (`data`) | qualsiasi | Ogni messaggio ricevuto: testo, testo esadecimale o lista di byte, secondo **Dati come**. |
| **aperta** (`opened`) | impulso | La porta si è aperta. |
| **chiusa** (`closed`) | impulso | La porta si è chiusa: con **chiudi**, o da sola (dispositivo scollegato). |
| **Exception** (`error`) | oggetto | La porta non si apre, non c'è, è usata da un altro programma, si è chiusa da sola, i dati da mandare non vanno bene… |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Porta (COM3, /dev/ttyUSB0…)** (`path`) | testo | vuoto | La porta da aprire, come la dà [SerialPort.list (porte seriali)](hw.serialList). |
| **Velocità (baud)** (`baudRate`) | da 50 a 4000000 | 9600 | Deve essere quella del dispositivo (per un Arduino quella di `Serial.begin`). |
| **Bit di dati** (`dataBits`) | 8, 7, 6, 5 | 8 | |
| **Parità** (`parity`) | Nessuna, Pari, Dispari, Mark, Space | Nessuna | |
| **Bit di stop** (`stopBits`) | 1, 1.5, 2 | 1 | |
| **Controllo di flusso** (`flowControl`) | Nessuno, Hardware (RTS/CTS), Software (XON/XOFF) | Nessuno | |
| **Messaggi** (`framing`) | Uno per riga, Fino a un delimitatore, Lunghezza fissa, Divisi da un'espressione regolare, Come arrivano | Uno per riga | Come i byte che arrivano diventano messaggi (vedi sotto). |
| **Delimitatore** (`delimiter`) | testo con `\n` `\r` `\t` `\0` `\\` `\xHH` | `\r\n` | Con **Fino a un delimitatore**: da 1 a 16 byte. |
| **Lunghezza (byte)** (`length`) | da 1 a 65536 | 8 | Con **Lunghezza fissa**. |
| **Separatore (espressione regolare)** (`regex`) | un'espressione regolare JavaScript | `\r?\n` | Con **Divisi da un'espressione regolare**. |
| **Dati come** (`encoding`) | Testo (UTF-8), Testo esadecimale, Lista di byte | Testo (UTF-8) | Come arrivano i messaggi su **dati** e come si legge quello che arriva su **invia**. |
| **Aggiunto a quello che si invia** (`newline`) | Niente, `\n`, `\r\n`, `\r` | Niente | Con **Testo**: aggiunto in fondo a ogni invio (molti dispositivi aspettano un a capo). |
| **Apri all'avvio** (`atStart`) | sì/no | no | Apre la porta quando parte il programma (o il suo gruppo), senza aspettare **apri**. |

## Come funziona

La porta si apre **solo se è nell'elenco** delle porte del computer in quel momento: scrivi il percorso come lo dà [SerialPort.list (porte seriali)](hw.serialList) (`COM3` e `com3` sono la stessa porta su Windows). Una porta aperta da un programma non si apre da un altro finché resta aperta.

### I messaggi ricevuti

| Messaggi | Cosa arriva su **dati** |
|---|---|
| **Uno per riga** | Il testo fino a ogni a capo (`\n`), senza l'a capo; un `\r` prima dell'a capo se ne va anche lui. Va bene per `Serial.println` di Arduino. |
| **Fino a un delimitatore** | I byte fino a ogni **Delimitatore**, senza il delimitatore. Per esempio `\x03` (ETX) per molti protocolli. |
| **Lunghezza fissa** | Ogni gruppo di **Lunghezza** byte. |
| **Divisi da un'espressione regolare** | Il testo fino a ogni punto in cui l'espressione trova qualcosa, senza quel pezzo. L'espressione deve trovare almeno un carattere. |
| **Come arrivano** | I byte nei pezzi in cui arrivano dalla porta (con il testo, mai un carattere spezzato a metà). |

Un messaggio che non finisce mai (niente a capo, niente delimitatore) esce comunque quando arriva a 4096 byte. Se il programma non fa in tempo a prendere i messaggi, il kernel ne tiene al massimo 2000 (2 MB): i più vecchi si perdono.

Con **Dati come**:

| Dati come | Ricevuto | Su **invia** |
|---|---|---|
| **Testo (UTF-8)** | `"T=23.5"` | un testo (un numero o un oggetto diventano il loro testo, un oggetto come JSON) |
| **Testo esadecimale** | `"543d32332e35"` | un testo esadecimale, anche con spazi o `:` (`"02 41 03"`) |
| **Lista di byte** | `[84, 61, 50, 51]` | una lista di numeri da 0 a 255 |

Con **Divisi da un'espressione regolare** i dati sono sempre testo. Si mandano al massimo 64 KB per volta.

### Quando si chiude

La porta si chiude con **chiudi**, quando il blocco si ferma (il programma o il suo gruppo si fermano) e quando il dispositivo viene scollegato: in quel caso il blocco manda **chiusa** e su **Exception** «La porta COM3 si è chiusa: dispositivo scollegato». Non si riapre da sola: manda di nuovo **apri** (per esempio dopo un [Ritardo (setTimeout)](core.delay)).

## Esempi

### 1. Leggere un Arduino

Sull'Arduino: `Serial.begin(9600); … Serial.println(analogRead(A0));`

```
[SerialPort (porta seriale COM): COM3, 9600, uno per riga, Apri all'avvio] dati ──▶ valore [Cast (converti tipo): number] risultato ──▶ valore [Indicatore: gauge1]
```

L'[Indicatore](ui.gauge) della finestra si muove con il valore letto dall'Arduino.

### 2. Mandare comandi con un pulsante

```
[Pulsante: Accendi] premuto ──▶ invia [Costante · Variabile: "LED ON"] valore ──▶ invia [SerialPort (porta seriale COM): COM3, aggiunto \n] dati ──▶ valore [Print (console.log)]
[Pulsante: Spegni]  premuto ──▶ invia [Costante · Variabile: "LED OFF"] valore ──▶ invia
[All'avvio (main)]  impulso ──▶ apri
```

Ogni pulsante manda il suo comando seguito da un a capo; le risposte del dispositivo vanno nella console.

### 3. Un protocollo binario

Un dispositivo manda pacchetti di 6 byte. Con **Messaggi** Lunghezza fissa, **Lunghezza** 6 e **Dati come** Lista di byte:

```
[SerialPort (porta seriale COM): /dev/ttyUSB0, 115200, lunghezza 6, lista di byte] dati ──▶ oggetto [Get proprietà (obj.campo): 2] valore ──▶ valore [Print (console.log)]
```

Ogni pacchetto arriva come `[2, 17, 0, 200, 13, 10]`; il blocco [Get proprietà (obj.campo)](core.get) con il campo `2` prende il terzo byte.

## Errori

| Messaggio | Quando |
|---|---|
| Non hai il permesso di usare le porte seriali: chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) | Non hai il permesso per le porte seriali. |
| Manca la porta: scrivi il percorso (COM3, /dev/ttyUSB0…) oppure VID e PID | **Porta** è vuota. |
| La porta «COM7» non c'è (porte presenti: COM3, COM5) | Il percorso non è tra le porte del computer. |
| «COM3» è già in uso nel programma «Serra»: chiudilo prima di aprirlo di nuovo | La porta è aperta da un altro tuo programma (o da un altro blocco). |
| «COM3» è già in uso da un altro programma | La porta è aperta dal programma di un altro utente. |
| La porta COM3 non si apre: … | Il sistema rifiuta l'apertura (su Linux spesso servono i permessi del gruppo `dialout`). |
| Velocità (baud) non valido: … (da 50 a 4000000) | Lo stesso per **Bit di dati**, **Parità**, **Bit di stop**, **Controllo di flusso**, **Dati come**. |
| Delimitatore non valido: «\q» (usa \n, \r, \t, \0, \\ o \xHH) | Il delimitatore ha una sequenza sconosciuta. |
| Il delimitatore deve avere da 1 a 16 byte | Il delimitatore è vuoto o troppo lungo. |
| Espressione regolare non valida: … | Il **Separatore** non è un'espressione regolare. |
| L'espressione regolare trova un separatore vuoto: scrivine una che trovi almeno un carattere | Per esempio `x*`. |
| La porta non è aperta: manda prima un impulso ad «apri» | Un valore su **invia** con la porta chiusa. |
| Dati esadecimali non validi: servono coppie di cifre 0-9 a-f (per esempio «0a 1b ff») | **Testo esadecimale** con un valore sbagliato su **invia**. |
| Servono dei byte: una lista di numeri da 0 a 255 | **Lista di byte** con un valore che non è una lista. |
| Troppi dati da mandare in una volta: … byte (al massimo 65536) | Oltre 64 KB. |
| La porta COM3 non riceve i dati (controllo di flusso?) | Il dispositivo non ha preso i dati entro 10 secondi. |
| La porta COM3 si è chiusa: dispositivo scollegato | Il dispositivo è stato scollegato. |
| La libreria serialport non funziona su questo computer: … | La libreria non si carica. |
| Hai già 16 dispositivi aperti: al massimo 16 (chiudine qualcuno) | Troppi dispositivi aperti dai tuoi programmi. |

## Vedi anche

- [SerialPort.list (porte seriali)](hw.serialList)
- [Funzioni stringa](core.text), [Cast (converti tipo)](core.convert), per lavorare sui messaggi
- [Hardware](logicstudio-hardware)
