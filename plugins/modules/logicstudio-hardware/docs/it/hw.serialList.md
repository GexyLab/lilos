# SerialPort.list (porte seriali)

`hw.serialList` · Hardware · [Hardware](logicstudio-hardware) · versione 1

Elenca le porte seriali del computer dove gira lilOS: quelle vere, quelle degli adattatori USB (Arduino, convertitori USB-seriale, modem) e quelle Bluetooth già associate al sistema. Può anche sorvegliarle e avvisare quando cambiano, per esempio quando colleghi un Arduino.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **elenca** (`list`) | impulso | Legge l'elenco adesso e lo manda. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **porte** (`ports`) | lista | Una porta per elemento: `{ path, manufacturer, vendorId, productId, serialNumber, name }` (vedi sotto). |
| **percorsi** (`paths`) | lista | Solo i percorsi, per esempio `["COM3", "COM9"]`: pronti per una [Selezione](ui.select). |
| **quante** (`count`) | numero | Quante porte ci sono. |
| **cambiate** (`changed`) | impulso | (Solo con **Sorveglia**) Le porte sono cambiate dall'ultima volta. |
| **Exception** (`error`) | oggetto | Quando l'elenco non si legge: permesso mancante, libreria che non si carica. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Sorveglia: manda quando cambiano** (`watch`) | sì/no | no | Il blocco legge l'elenco da solo, ogni tanto, e manda le uscite quando cambia (la prima volta subito). |
| **Controlla ogni (secondi)** (`seconds`) | da 1 a 3600 | 5 | Ogni quanto rilegge l'elenco. Si vede solo con **Sorveglia**. |

## Come funziona

Il kernel chiede l'elenco al sistema con la libreria `serialport`. Ogni porta è un oggetto:

| Campo | Esempio | Cosa è |
|---|---|---|
| `path` | `COM3`, `/dev/ttyUSB0`, `/dev/cu.usbmodem1101` | Il percorso, da scrivere nel blocco [SerialPort (porta seriale COM)](hw.serial). |
| `manufacturer` | `Arduino LLC` | Il produttore, quando il sistema lo sa. |
| `vendorId`, `productId` | `2341`, `0043` | VID e PID USB in esadecimale (4 cifre minuscole); vuoti per una porta che non è USB. |
| `serialNumber` | `95735353130351D0E1A1` | Il numero di serie, quando c'è: distingue due dispositivi uguali. |
| `name` | `Arduino Uno (COM3)` | Il nome che dà il sistema (Windows), o un identificativo. |

L'elenco è in ordine di percorso (`COM3` prima di `COM10`).

Con **Sorveglia** l'uscita **cambiate** manda un impulso solo quando l'elenco cambia rispetto alla lettura precedente: una porta in più, una in meno, un dispositivo diverso. La prima lettura manda le uscite ma non **cambiate**.

## Esempi

### 1. Scegliere la porta da una finestra

```
[All'avvio (main)] impulso ──▶ elenca [SerialPort.list (porte seriali)] percorsi ──▶ opzioni [Selezione: select1] valore ──▶ percorso [SerialPort (porta seriale COM)]
```

All'avvio la [Selezione](ui.select) della finestra si riempie con le porte; quella scelta va sull'ingresso **percorso** (nascosto: mostralo nelle Proprietà) della porta seriale, che poi si apre con **apri**.

### 2. Avvisare quando si collega un Arduino

```
[SerialPort.list (porte seriali): Sorveglia, ogni 3 s] cambiate ──▶ invia [Notify: "Le porte seriali sono cambiate"]
                                                        quante  ──▶ valore [Print (console.log)]
```

Ogni volta che colleghi o scolleghi un adattatore USB-seriale ricevi una notifica, e la console scrive quante porte ci sono.

## Errori

| Messaggio | Quando |
|---|---|
| Non hai il permesso di usare le porte seriali: chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) | Non sei amministratore e non hai il permesso per le porte seriali. |
| La libreria serialport non funziona su questo computer: … | La libreria non si carica su questo computer. |
| SerialPort.list (porte seriali) ha impiegato più di 30 s | Il sistema non ha risposto in tempo. |

## Vedi anche

- [SerialPort (porta seriale COM)](hw.serial), per aprire una porta
- [usb.on attach · detach (USB collegato · scollegato)](hw.usbHotplug), per sapere subito quando si collega un dispositivo USB
- [Hardware](logicstudio-hardware)
