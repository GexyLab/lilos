# logicstudio-hardware

I blocchi **Hardware** di Logic Studio: i dispositivi del computer dove gira il kernel di lilOS (con il programma lilos-desktop è il PC dell'utente). Funzionano anche senza finestre aperte, in un programma attivo.

- **Seriale**: elenco delle porte (anche sorvegliato), una porta aperta con velocità, bit, parità, stop, controllo di flusso, messaggi per riga / delimitatore / lunghezza / espressione regolare / grezzi, testo, esadecimale o byte, DTR e RTS.
- **USB**: elenco, collegato · scollegato (con filtro VID/PID), trasferimenti diretti (controllo, bulk, interrupt).
- **HID**: elenco e apertura (mai le tastiere), report in ingresso, in uscita e feature.
- **Webcam** (ffmpeg del sistema): elenco, foto (in un file della home e/o come data URL per l'Immagine di logicstudio-ui ≥ 1.2.0), fotogrammi (al massimo 10 al secondo, 1280 × 720, 384 KB), registrazione video.
- **Audio**: dispositivi e voci, suono da un file della home, tono, sintesi vocale, registrazione (ffmpeg), livello del microfono (ffmpeg), volume di sistema.
- **MIDI**: porte, messaggi ricevuti come oggetti, messaggi mandati.
- **Sistema**: CPU, carico, memoria, uptime, temperature, batteria, dischi, interfacce di rete, stampanti e stampa.
- **Linux**: GPIO (lettura, scrittura tenuta, fronti, PWM via sysfs) e I²C (byte, word, blocchi, ricerca sul bus).

## Permessi

Classi: `serial`, `usb`, `hid`, `camera`, `audio`, `midi`, `system` (anche le stampanti), `gpio` (GPIO e I²C). Di serie solo gli **amministratori** (`role === 'admin'`) le usano. Un amministratore le dà a tutti (`defaultAllow`) o a singoli utenti (`users[id]`, che vince sul predefinito in tutti e due i sensi). Ogni azione controlla la classe; un permesso tolto chiude i dispositivi aperti alla lettura successiva. La politica è in `<dataDir>/policy.json` (`modules-data/logicstudio-hardware`), che resta tra le versioni.

Errore per chi non ha il permesso: «Non hai il permesso di usare <classe>: chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware)».

## API (`/api/modules/logicstudio-hardware…`, utenti con l'accesso)

| | | |
|---|---|---|
| `GET /status[?refresh=1]` | tutti | `{ admin, classes: { serial: bool, … } (cosa posso usare io), platform, gpio (true su Linux), tools: { ffmpeg: bool, powershell…, espeak-ng…, gpioget…, i2cget…, lp… }, libraries: { serialport: 'ok' \| 'non caricata' \| 'errore: …', usb, node-hid, @julusian/midi, systeminformation }, open: dispositivi aperti dai miei programmi }`. `refresh=1` cerca di nuovo i programmi del sistema e prova a caricare tutte le librerie. |
| `GET /admin/policy` | amministratori | `{ defaultAllow: { serial: false, … }, users: { <id>: { camera: true, … } }, classes: [...] }` |
| `PUT /admin/policy` | amministratori | lo stesso oggetto (senza `classes`): sostituisce la politica; una chiave o un valore non validi → 400 `invalid` |

Pensata per la scheda **Pannello di controllo → Logic Studio → Hardware**: una riga per classe con «tutti» e le eccezioni per utente, e lo stato dei programmi del sistema e delle librerie (da `/status`).

## Sicurezza

- I dispositivi aperti sono **handle** di (utente, programma): un altro programma non li vede; una porta, un dispositivo USB o HID, una webcam, una porta MIDI di ingresso, una linea GPIO sono di un programma alla volta (l'errore nomina il programma che la tiene solo al suo utente e agli amministratori). Al massimo 16 handle per utente. Si chiudono con il blocco, con la fine del programma (segnale di abort, più una pulizia ogni 30 s), con lo stop del modulo.
- Dati in arrivo: long poll (`hw.read`, al massimo 20 s), code limitate (si perdono i più vecchi, contati).
- Argomenti sempre controllati: porte solo dall'elenco del sistema, dispositivi solo dagli elenchi, numeri nei loro intervalli. Mai una shell: `spawn(percorso assoluto, [argomenti])`; su Windows PowerShell con `-EncodedCommand` e uno script fisso, i valori in variabili d'ambiente `LS_*`; i testi della voce su stdin.
- Le espressioni regolari della seriale girano nel worker dell'utente, non nel kernel.
- Mai aperti: le tastiere HID (su Linux anche gli altri tasti dello stesso hidraw); per i trasferimenti USB le memorie di massa, gli hub e gli HID. Gli schermi non sono webcam. Si stampano solo testi, PDF (non su Windows) e immagini.
- File: solo la home dell'utente, **come l'utente** attraverso il servizio fs (`lib/shared/logic-files.js`, copia di `modules/_shared/logic-files.js`: le stesse regole di logicstudio-lilos).
- Le librerie native si caricano solo quando un blocco le usa: se una non va, il modulo parte lo stesso e `/status` lo dice.

## Cosa serve sul computer

| | Windows | Linux | macOS |
|---|---|---|---|
| Seriale, USB, HID, MIDI, sistema | — (binari precompilati nei pacchetti npm) | permessi | — |
| Webcam, registrazioni, livello del microfono | `ffmpeg` (winget install ffmpeg) | `ffmpeg` | `ffmpeg` (brew) |
| Suoni | PowerShell | `paplay` o `aplay`; `ffplay` per mp3/m4a | `afplay` |
| Voce | PowerShell (System.Speech) | `espeak-ng` (o `espeak`, `spd-say`) | `say` |
| Volume | PowerShell (Core Audio) | `pactl` o `amixer` | `osascript` |
| Stampa | PowerShell | `lp` (CUPS) | `lp` |
| GPIO / I²C | — | `gpiod` (v1 e v2) / `i2c-tools` | — |

Il kernel cerca i programmi nel suo PATH (e in /usr/sbin, /sbin…): uno installato dopo l'avvio si vede con `/status?refresh=1` o al riavvio.

**Linux**: l'utente che fa girare lilOS nei gruppi `dialout` (seriali), `plugdev` (USB, HID), `video` (webcam), `audio`, `gpio`, `i2c`. Regole di udev per USB e HID, per esempio in `/etc/udev/rules.d/50-lilos.rules`:

```
SUBSYSTEM=="usb", ATTR{idVendor}=="2341", MODE="0660", GROUP="plugdev"
KERNEL=="hidraw*", ATTRS{idVendor}=="2341", MODE="0660", GROUP="plugdev"
```

poi `sudo udevadm control --reload-rules && sudo udevadm trigger`. Per il PWM servono i permessi su `/sys/class/pwm`.

**Windows**: i trasferimenti USB diretti vogliono il driver **WinUSB** sul dispositivo (Zadig).

## Librerie

`serialport` 13.0.0, `usb` 3.2.1, `node-hid` 3.4.0, `@julusian/midi` 3.8.1, `systeminformation` 5.33.16 (versioni esatte, `package-lock.json`). Il kernel le installa con `npm ci --omit=dev --ignore-scripts`: tutte portano i binari precompilati (Windows x64/arm64, Linux x64/arm64/arm, macOS x64/arm64; `usb` con un pacchetto opzionale per piattaforma).

## Non c'è

SPI (serve un ioctl), Bluetooth, i dispositivi del browser (la webcam del computer da cui si guarda lilOS): più avanti.

Richiede `logicstudio-engine` (e `logicstudio-core`) e il servizio `fs`.
