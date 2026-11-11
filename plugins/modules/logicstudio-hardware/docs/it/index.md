# Hardware

`logicstudio-hardware` · richiede il motore `logicstudio-engine` e i [Blocchi di base](logicstudio-core)

I blocchi che fanno usare a un programma di Logic Studio i dispositivi del **computer dove gira lilOS**: porte seriali (Arduino, strumenti, modem), dispositivi USB e HID, webcam, microfono e altoparlanti, la voce, il MIDI, le informazioni del sistema, le stampanti e, su Linux (per esempio un Raspberry Pi), i pin GPIO e il bus I²C. Nell'elenco dei blocchi dell'IDE sono nella categoria **Hardware**.

## Come si installa

Il pacchetto non arriva con Logic Studio IDE: un amministratore lo installa dall'**AppStore**, scheda **Kernel** («Hardware»). L'AppStore installa insieme anche il motore e i blocchi di base, se mancano. Dopo l'installazione i blocchi compaiono nella scheda **Blocchi** dell'IDE.

Le librerie dei dispositivi (`serialport`, `usb`, `node-hid`, `@julusian/midi`, `systeminformation`) arrivano con il pacchetto, già compilate per Windows, Linux (anche ARM, come il Raspberry Pi) e macOS. Webcam, registrazioni, voce, suoni, GPIO e I²C usano invece i **programmi del sistema**: vedi «Cosa serve sul computer» più sotto.

## I blocchi

| Blocco | Tipo | Cosa fa |
|---|---|---|
| **Seriale** | | |
| [SerialPort.list (porte seriali)](hw.serialList) | `hw.serialList` | Le porte seriali del computer: percorso, produttore, VID, PID, numero di serie; può avvisare quando cambiano. |
| [SerialPort (porta seriale COM)](hw.serial) | `hw.serial` | Apre una porta seriale: riceve i messaggi (una riga, fino a un delimitatore, a lunghezza fissa, divisi da un'espressione regolare, come arrivano), manda dati, imposta DTR e RTS. |
| **USB** | | |
| [usb.getDevices (dispositivi USB)](hw.usbList) | `hw.usbList` | I dispositivi USB collegati: VID, PID, nome, produttore, classe. |
| [usb.on attach · detach (USB collegato · scollegato)](hw.usbHotplug) | `hw.usbHotplug` | Avvisa quando un dispositivo USB viene collegato o scollegato, anche solo di un VID e PID. |
| [transferIn · transferOut (trasferimento USB)](hw.usbTransfer) | `hw.usbTransfer` | Trasferimenti diretti (controllo, bulk, interrupt) con un dispositivo USB. Avanzato. |
| [Dispositivo HID (node-hid)](hw.hid) | `hw.hid` | Elenca e apre dispositivi HID (non le tastiere): report ricevuti, report da scrivere, feature report. |
| **Webcam** | | |
| [enumerateDevices (webcam)](hw.webcamList) | `hw.webcamList` | Le webcam del computer. |
| [takePhoto (scatta foto)](hw.photo) | `hw.photo` | Scatta una foto: in un file della tua home e/o come immagine per una finestra. |
| [Fotogrammi webcam (stream)](hw.webcamStream) | `hw.webcamStream` | Poche immagini al secondo dalla webcam, per un'[Immagine](ui.image) di una finestra. |
| [MediaRecorder video (registra video)](hw.videoRecord) | `hw.videoRecord` | Registra un video (anche con l'audio) in un file della tua home. |
| **Audio** | | |
| [enumerateDevices (dispositivi audio)](hw.audioDevices) | `hw.audioDevices` | Microfoni, altoparlanti e voci della sintesi vocale. |
| [play() (riproduci suono)](hw.play) | `hw.play` | Suona un file della tua home (.wav, .mp3…). |
| [Tono · Beep](hw.tone) | `hw.tone` | Un beep: frequenza, durata, volume. |
| [speechSynthesis.speak (sintesi vocale)](hw.speak) | `hw.speak` | Legge un testo ad alta voce. |
| [MediaRecorder audio (registra audio)](hw.audioRecord) | `hw.audioRecord` | Registra dal microfono in un file della tua home. |
| [Livello microfono (dB)](hw.micLevel) | `hw.micLevel` | Quanto è forte il suono che arriva al microfono, con una soglia. |
| [Volume di sistema (get · set · mute)](hw.volume) | `hw.volume` | Legge e cambia il volume del computer, lo mette muto. |
| **MIDI** | | |
| [MIDI ingresso · uscita](hw.midi) | `hw.midi` | Riceve note, controlli e cambi di programma da una tastiera MIDI e li manda a un'altra porta. |
| **Sistema** | | |
| [os (info di sistema)](hw.systemInfo) | `hw.systemInfo` | CPU, carico, memoria, da quanto è acceso, temperature. |
| [getBattery (batteria)](hw.battery) | `hw.battery` | La batteria: carica, se è in carica, se è alimentato; avvisa quando si scarica. |
| [fsSize (dischi)](hw.disks) | `hw.disks` | I dischi: spazio totale, usato, libero. |
| [networkInterfaces (interfacce di rete)](hw.network) | `hw.network` | Le interfacce di rete: indirizzi IP e MAC; avvisa quando cambiano. |
| [Stampanti · Stampa (lp)](hw.printers) | `hw.printers` | Le stampanti, e la stampa di un file della tua home. |
| **Linux, Raspberry Pi** | | |
| [GPIO (gpioget · gpioset)](hw.gpio) | `hw.gpio` | Una linea GPIO: leggere, scrivere, fronti di salita e discesa, PWM. |
| [I²C (i2cget · i2cset)](hw.i2c) | `hw.i2c` | Legge e scrive i registri di un dispositivo I²C; cerca i dispositivi sul bus. |

## Da sapere per tutti i blocchi

### Il computer è quello di lilOS

I dispositivi sono quelli del **computer dove gira il kernel di lilOS**: con il programma lilos-desktop è il tuo PC; con lilOS su un server è il server, non il computer da cui guardi. I blocchi lavorano nel kernel, come l'utente che possiede il programma, e funzionano anche quando lilOS è chiuso nel browser, se il programma è attivo.

> Un programma attivo usa davvero i dispositivi, anche quando non guardi: una foto è una foto, un messaggio sulla seriale arriva davvero alla macchina collegata. Provalo prima con **Prova**.

### I permessi

Di serie **solo gli amministratori** possono usare questi blocchi. Un amministratore può dare il permesso, per ogni classe di dispositivi, a tutti gli utenti o solo ad alcuni, in **Pannello di controllo → Logic Studio → Hardware**. Le classi sono:

| Classe | Blocchi |
|---|---|
| Porte seriali | [SerialPort.list (porte seriali)](hw.serialList), [SerialPort (porta seriale COM)](hw.serial) |
| Dispositivi USB | [usb.getDevices (dispositivi USB)](hw.usbList), [usb.on attach · detach (USB collegato · scollegato)](hw.usbHotplug), [transferIn · transferOut (trasferimento USB)](hw.usbTransfer) |
| Dispositivi HID | [Dispositivo HID (node-hid)](hw.hid) |
| Webcam | [enumerateDevices (webcam)](hw.webcamList), [takePhoto (scatta foto)](hw.photo), [Fotogrammi webcam (stream)](hw.webcamStream), [MediaRecorder video (registra video)](hw.videoRecord) |
| Audio (microfono, altoparlanti, voce) | [enumerateDevices (dispositivi audio)](hw.audioDevices), [play() (riproduci suono)](hw.play), [Tono · Beep](hw.tone), [speechSynthesis.speak (sintesi vocale)](hw.speak), [MediaRecorder audio (registra audio)](hw.audioRecord), [Livello microfono (dB)](hw.micLevel), [Volume di sistema (get · set · mute)](hw.volume); anche il suono di un video |
| MIDI | [MIDI ingresso · uscita](hw.midi) |
| Informazioni di sistema e stampanti | [os (info di sistema)](hw.systemInfo), [getBattery (batteria)](hw.battery), [fsSize (dischi)](hw.disks), [networkInterfaces (interfacce di rete)](hw.network), [Stampanti · Stampa (lp)](hw.printers) |
| GPIO e I²C | [GPIO (gpioget · gpioset)](hw.gpio), [I²C (i2cget · i2cset)](hw.i2c) |

Un permesso dato a un utente vale più di quello dato a tutti, in tutti e due i sensi: si può dare la webcam a tutti tranne a uno. Senza permesso il blocco manda su **Exception** «Non hai il permesso di usare la webcam: chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware)» (con il nome della classe). Se il permesso viene tolto mentre un dispositivo è aperto, il dispositivo si chiude alla lettura successiva.

Un'app fatta con **Crea app** che contiene blocchi Hardware, prima di partire, chiede a chi la apre il permesso di usare l'hardware del computer; e chi la apre deve comunque avere i permessi delle classi che usa. Vedi [Permessi](logicstudio-engine/permissions).

### Un dispositivo, un programma

Una porta seriale, un dispositivo USB o HID, una webcam, una porta MIDI di ingresso, una linea GPIO aperti da un programma **non si aprono** da un altro finché il primo non li chiude. L'errore dice quale programma la tiene solo a chi lo possiede (e agli amministratori); agli altri dice «è già in uso da un altro programma».

I dispositivi aperti si chiudono da soli quando il blocco si ferma, quando il programma si ferma (anche se finisce la prova, o per un errore) e quando il modulo si ferma. Ogni utente tiene aperti al massimo **16** dispositivi insieme.

### I dati che arrivano da soli

Quello che un dispositivo manda da solo (le righe di una seriale, i report HID, i fotogrammi della webcam, le note MIDI, i fronti GPIO, i dispositivi USB collegati) aspetta nel kernel in una coda, e il blocco lo va a prendere continuamente. Se il programma non fa in tempo, i dati più vecchi si perdono: al massimo 2000 messaggi (2 MB) per una seriale, 1000 per HID e GPIO, 2000 per il MIDI, gli ultimi 3 fotogrammi per la webcam.

### I file

[takePhoto (scatta foto)](hw.photo), le registrazioni, [play() (riproduci suono)](hw.play) e [Stampanti · Stampa (lp)](hw.printers) usano i file della **tua home**, con le stesse regole dei [Blocchi di lilOS](logicstudio-lilos): `~/…` oppure `/home/<utente>/…`, mai `~/.config`, mai i file protetti da un'app (FileCrypt), niente `.` e `..`. Lo spazio conta nella quota della tua home. Nei percorsi dei file da creare `{now}` diventa la data e l'ora, per esempio `~/foto-2026-11-11_14-30-05.jpg`.

### I limiti

| Cosa | Limite |
|---|---|
| Dispositivi aperti insieme | 16 per utente |
| Dati mandati in una volta (seriale, USB bulk) | 64 KB |
| Webcam in diretta | 10 fotogrammi al secondo, 1280 × 720, 384 KB a fotogramma (i più grandi si saltano) |
| Foto mandata al programma | 1 MB |
| Registrazioni | 30 minuti, 500 MB |
| Suono da un file | 50 MB, 10 minuti |
| Testo letto ad alta voce | 2000 caratteri |
| Suoni e voci insieme | 2 per utente |
| Un file da stampare | 20 MB |

Valgono anche i limiti del motore di Logic Studio: vedi [Limiti](logicstudio-engine/limits).

## Cosa serve sul computer

| | Windows | Linux (Debian, Ubuntu, Raspberry Pi OS) | macOS |
|---|---|---|---|
| Seriale, USB, HID, MIDI, sistema | niente (le librerie arrivano con il pacchetto) | i permessi (vedi sotto) | niente |
| Webcam, registrazioni, livello del microfono | ffmpeg (`winget install ffmpeg`) | `sudo apt install ffmpeg` | `brew install ffmpeg` |
| Suoni, tono | niente (PowerShell) | `pulseaudio-utils` (paplay) o `alsa-utils` (aplay); per .mp3 e .m4a anche ffmpeg | niente (afplay) |
| Voce | niente (voci di Windows) | `sudo apt install espeak-ng` | niente (say) |
| Volume | niente | `pulseaudio-utils` (pactl) o `alsa-utils` (amixer) | niente |
| Stampa | niente | CUPS (`cups-client`, comando lp) | niente (CUPS) |
| GPIO | — | `sudo apt install gpiod` | — |
| I²C | — | `sudo apt install i2c-tools` (e I²C attivo, `raspi-config` su un Raspberry Pi) | — |

Un programma appena installato si vede dopo il riavvio di lilOS (il kernel cerca i programmi nel suo PATH). Chi amministra lilOS vede cosa c'è e cosa manca in **Pannello di controllo → Logic Studio → Hardware**.

Su Linux l'utente del sistema che fa girare lilOS deve avere i permessi dei dispositivi: i gruppi `dialout` (seriali), `plugdev` (USB e HID, con le regole di udev del dispositivo), `video` (webcam), `audio`, `gpio` e `i2c`. Su Windows i trasferimenti USB diretti richiedono il driver **WinUSB** sul dispositivo (si installa con Zadig).

## Cosa non c'è

- **SPI**: serve un accesso al kernel di Linux che i programmi del sistema non danno; arriverà più avanti.
- **Bluetooth** (anche Bluetooth Low Energy): più avanti. Le porte seriali Bluetooth già associate al sistema compaiono però tra le porte seriali.
- **I dispositivi del browser** (la webcam o il microfono del computer da cui guardi, quando lilOS gira su un altro computer): più avanti.
- Le tastiere: per sicurezza non si leggono, né come HID né come USB.
- Le memorie USB, gli hub e i dispositivi HID non si usano con i trasferimenti USB diretti.
- Lo schermo non è una webcam: non si registra.

## Gli errori

Ogni blocco ha l'uscita **Exception**. I messaggi sono in italiano; ogni pagina elenca quelli del suo blocco. Questi possono arrivare da tutti:

| Messaggio | Quando |
|---|---|
| Non hai il permesso di usare … : chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) | Non sei amministratore e nessuno ti ha dato il permesso per quella classe. |
| La libreria serialport non funziona su questo computer: … | La libreria non si carica su questo computer (lo stesso per `usb`, `node-hid`, `@julusian/midi`, `systeminformation`). Gli altri blocchi funzionano. |
| Manca ffmpeg: installalo sul computer dove gira lilOS (…), poi riavvia lilOS | Un blocco della webcam o del microfono, senza ffmpeg. |
| Hai già 16 dispositivi aperti: al massimo 16 (chiudine qualcuno) | I tuoi programmi tengono aperti già 16 dispositivi. |
| «COM3» è già in uso nel programma «Serra»: chiudilo prima di aprirlo di nuovo | Un altro tuo programma (o questo stesso, da un altro blocco) tiene il dispositivo. |
| «COM3» è già in uso da un altro programma | Lo tiene il programma di un altro utente. |
| Il dispositivo non è aperto (o è già stato chiuso) | Il dispositivo si è chiuso mentre il blocco lo usava. |
| Il programma non è in esecuzione | Il programma si stava fermando. |
| … ha impiegato più di 30 s | Un'operazione ha superato il tempo massimo di un blocco. |

## Esempi completi

### 1. Un Arduino che misura la temperatura

L'Arduino manda una riga al secondo come `T=23.5`.

```
[SerialPort (porta seriale COM): COM3, 9600, uno per riga, apri all'avvio] dati ──▶ testo [Funzioni stringa: sostituisci "T=" con ""] risultato ──▶ valore [Cast (converti tipo): number] risultato ──▶ valore [Valore: temp1]
```

Il [Valore](ui.value) della finestra mostra la temperatura appena arriva. Per mandare un comando all'Arduino, collega un [Pulsante](ui.button) a un [Costante · Variabile](core.value) con il testo del comando e quella all'ingresso **invia**.

### 2. Una foto quando qualcuno si avvicina

```
[GPIO (gpioget · gpioset): ingresso, fronti di salita, linea 17] fronte di salita ──▶ scatta [takePhoto (scatta foto): salvala in ~/ingresso/{now}.jpg] immagine ──▶ sorgente [Immagine: image1]
                                                                    fronte di salita ──▶ suona [Tono · Beep: 880 Hz, 0,2 s]
```

Un sensore di movimento sul pin 17 di un Raspberry Pi: a ogni passaggio una foto salvata nella home, mostrata nella finestra, e un beep.

### 3. Un avviso quando il disco si riempie

```
[fsSize (dischi): ogni 600 s] il più pieno ──▶ a [Confronto (== ≠ < >): a > b] risultato ──▶ valore [Al cambio (fronte ↑↓)] diventa vero ──▶ invia [Notify: "Disco quasi pieno"]
[Costante · Variabile: 90]                  valore ──▶ b
```

## Vedi anche

- [Blocchi di base](logicstudio-core), [Blocchi di lilOS](logicstudio-lilos), [Blocchi di rete](logicstudio-net)
- [Immagine](ui.image), per mostrare le foto e la webcam in una finestra
- [Il motore](logicstudio-engine), [Limiti](logicstudio-engine/limits), [Permessi](logicstudio-engine/permissions)
- [Come funziona un blocco](ide/blocks)
