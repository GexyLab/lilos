# transferIn · transferOut (trasferimento USB)

`hw.usbTransfer` · Hardware · [Hardware](logicstudio-hardware) · versione 1

Parla direttamente con un dispositivo USB, con trasferimenti di **controllo**, **bulk** o **interrupt**, come WebUSB. È un blocco **avanzato**: serve conoscere il protocollo del dispositivo (i numeri delle richieste, gli endpoint). Per i dispositivi seriali usa [SerialPort (porta seriale COM)](hw.serial), per i dispositivi HID [Dispositivo HID (node-hid)](hw.hid).

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **apri** (`open`) | impulso | Apre il dispositivo e ne prende l'**Interfaccia**. |
| **chiudi** (`close`) | impulso | Lascia l'interfaccia e chiude il dispositivo. |
| **trasferisci (dati da mandare)** (`transfer`) | qualsiasi | Fa un trasferimento. Con **Direzione** Out il valore è quello da mandare; con In qualsiasi valore fa leggere. Se il dispositivo non è aperto, lo apre prima. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **dati ricevuti** (`data`) | qualsiasi | (Direzione In) I byte letti, secondo **Dati come**. |
| **risultato** (`result`) | oggetto | `{ status, data, length }` (In) o `{ status, written }` (Out). `status` è `ok` o `stall`. |
| **aperto** (`opened`) | impulso | Il dispositivo si è aperto. |
| **chiuso** (`closed`) | impulso | Il dispositivo si è chiuso con **chiudi**. |
| **Exception** (`error`) | oggetto | Il dispositivo non c'è, non si apre, non è ammesso, il trasferimento non riesce… |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **VID (esadecimale, es. 2341)** (`vendorId`) | 4 cifre esadecimali | vuoto | Il produttore del dispositivo. |
| **PID (esadecimale, es. 2341)** (`productId`) | 4 cifre esadecimali | vuoto | Il prodotto. |
| **Numero di serie (facoltativo)** (`serialNumber`) | testo | vuoto | Per scegliere tra due dispositivi uguali. |
| **Interfaccia** (`interface`) | da 0 a 255 | 0 | L'interfaccia da prendere. |
| **Stacca il driver del sistema (Linux)** (`detachDriver`) | sì/no | no | Su Linux toglie al sistema l'interfaccia (e gliela ridà alla chiusura). |
| **Trasferimento** (`kind`) | Controllo, Bulk, Interrupt | Controllo | |
| **Direzione** (`direction`) | In (dal dispositivo), Out (al dispositivo) | In | |
| **Endpoint** (`endpoint`) | da 1 a 15 | 1 | Il numero dell'endpoint (senza il bit della direzione). Con Bulk e Interrupt. |
| **Tipo di richiesta** (`requestType`) | standard, class, vendor | vendor | Con Controllo. |
| **Destinatario** (`recipient`) | device, interface, endpoint, other | device | Con Controllo. |
| **bRequest** (`request`) | da 0 a 255 | 0 | Con Controllo. |
| **wValue** (`value`) | da 0 a 65535 | 0 | Con Controllo. |
| **wIndex** (`index`) | da 0 a 65535 | 0 | Con Controllo. |
| **Byte da leggere** (`length`) | da 0 a 65536 | 64 | Con Direzione In (al massimo 4096 per il controllo). |
| **Attesa massima (ms)** (`timeoutMs`) | da 1 a 30000 | 1000 | Quanto aspettare il dispositivo. |
| **Dati come** (`encoding`) | Lista di byte, Testo esadecimale, Testo (UTF-8) | Lista di byte | Come arrivano i dati letti e come si legge il valore da mandare. |

## Come funziona

Il dispositivo si apre per VID e PID (e numero di serie): il primo che corrisponde. Resta aperto fino a **chiudi**, o finché il blocco si ferma; un altro programma non lo apre nel frattempo.

**Non si aprono** con questo blocco, per sicurezza: le memorie USB e i dischi (si leggerebbero i file senza i permessi del sistema), gli hub, i dispositivi HID (tastiere, mouse: per gli altri HID c'è [Dispositivo HID (node-hid)](hw.hid)).

**Su Windows** il dispositivo deve usare il driver **WinUSB**. Molti dispositivi fatti per WebUSB lo hanno già; per gli altri si installa con **Zadig** (zadig.akeo.ie). Attenzione: con WinUSB il dispositivo non funziona più con il suo driver di prima.

**Su Linux** l'utente che fa girare lilOS deve poter usare il dispositivo: una regola di udev come `SUBSYSTEM=="usb", ATTR{idVendor}=="2341", MODE="0660", GROUP="plugdev"` in `/etc/udev/rules.d/`, e l'utente nel gruppo `plugdev`. Se il sistema usa già l'interfaccia (un driver del kernel), attiva **Stacca il driver del sistema**.

Si mandano o si leggono al massimo 64 KB per trasferimento (4 KB per il controllo).

## Esempi

### 1. Leggere la versione del firmware

Un dispositivo risponde alla richiesta vendor `0x01` con 4 byte di versione.

```
[All'avvio (main)] impulso ──▶ trasferisci [transferIn · transferOut (trasferimento USB): VID 1209, PID 0001, Controllo, In, vendor, bRequest 1, 4 byte] dati ricevuti ──▶ valore [Print (console.log)]
```

La console scrive per esempio `[1, 2, 0, 7]`.

### 2. Mandare un comando bulk

```
[Pulsante: Avvia] premuto ──▶ invia [Costante · Variabile: JSON [2, 1, 0]] valore ──▶ trasferisci [transferIn · transferOut (trasferimento USB): Bulk, Out, endpoint 2] risultato ──▶ valore [Print (console.log)]
```

Il dispositivo riceve i 3 byte sull'endpoint 2; la console scrive `{ "status": "ok", "written": 3 }`.

## Errori

| Messaggio | Quando |
|---|---|
| Non hai il permesso di usare i dispositivi USB: chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) | Non hai il permesso per i dispositivi USB. |
| Servono VID e PID del dispositivo USB (4 cifre esadecimali, come nell'elenco) | VID o PID mancano. |
| Nessun dispositivo USB con VID 1209 e PID 0001 | Il dispositivo non è collegato. |
| Questo dispositivo USB è di tipo memoria di massa: non si usa con trasferimenti diretti | Memorie USB e dischi, hub, HID. |
| USB 1209:0001 non si apre: … (su Windows serve il driver WinUSB, con Zadig; su Linux i permessi di udev) | Il sistema rifiuta l'apertura. |
| USB 1209:0001: trasferimento non riuscito: … | Il dispositivo non ha risposto, ha rifiutato la richiesta, l'endpoint non esiste… |
| «USB 1209:0001» è già in uso nel programma «Banco»: chiudilo prima di aprirlo di nuovo | Lo tiene un altro tuo programma. |
| «USB 1209:0001» è già in uso da un altro programma | Lo tiene il programma di un altro utente. |
| Endpoint non valido: … (da 1 a 15) | Lo stesso per le altre impostazioni numeriche. |
| La libreria usb non funziona su questo computer: … | La libreria non si carica. |

## Vedi anche

- [usb.getDevices (dispositivi USB)](hw.usbList), per trovare VID e PID
- [Dispositivo HID (node-hid)](hw.hid)
- [Hardware](logicstudio-hardware)
