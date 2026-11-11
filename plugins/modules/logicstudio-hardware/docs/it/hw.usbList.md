# usb.getDevices (dispositivi USB)

`hw.usbList` · Hardware · [Hardware](logicstudio-hardware) · versione 1

Elenca i dispositivi USB collegati al computer dove gira lilOS, con VID, PID, nome, produttore e classe. Serve per sapere se un dispositivo c'è e per trovare i numeri da scrivere negli altri blocchi USB e HID.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **elenca** (`list`) | impulso | Legge l'elenco adesso e lo manda. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **dispositivi** (`devices`) | lista | Un dispositivo per elemento (vedi sotto). |
| **quanti** (`count`) | numero | Quanti sono (dopo il filtro). |
| **Exception** (`error`) | oggetto | Permesso mancante, libreria che non si carica. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Solo VID (esadecimale, es. 2341)** (`vendorId`) | 4 cifre esadecimali | vuoto | Tiene solo i dispositivi di quel produttore. |
| **Solo PID (esadecimale, es. 2341)** (`productId`) | 4 cifre esadecimali | vuoto | Tiene solo quel prodotto. |

## Come funziona

Ogni dispositivo è un oggetto:

| Campo | Esempio | Cosa è |
|---|---|---|
| `vendorId`, `productId` | `2341`, `0043` | VID e PID in esadecimale, 4 cifre minuscole. |
| `name`, `manufacturer` | `Arduino Uno`, `Arduino LLC` | Nome e produttore, quando il sistema li dà (vuoti altrimenti). |
| `serialNumber` | `95735353` | Il numero di serie, quando c'è. |
| `class`, `className` | `2`, `comunicazione (CDC)` | La classe USB (quella della prima interfaccia, se il dispositivo la lascia alle interfacce). |
| `interfaces` | `[2, 10]` | Le classi delle sue interfacce. |
| `bus`, `address`, `speed` | `1`, `5`, `full` | Dove è collegato e a che velocità. |

Alcuni campi possono restare vuoti: su Windows il sistema non dà sempre nomi e numeri di serie dei dispositivi che usa (hub, webcam, Bluetooth).

## Esempi

### 1. C'è l'Arduino?

```
[All'avvio (main)] impulso ──▶ elenca [usb.getDevices (dispositivi USB): solo VID 2341] quanti ──▶ a [Confronto (== ≠ < >): a > b] risultato ──▶ accesa [Spia: lamp1]
                                                                                   [Costante · Variabile: 0] valore ──▶ b
```

La [Spia](ui.lamp) si accende se all'avvio c'è almeno un dispositivo Arduino (VID `2341`).

### 2. Una tabella dei dispositivi

```
[Pulsante: Aggiorna] premuto ──▶ elenca [usb.getDevices (dispositivi USB)] dispositivi ──▶ righe [Tabella: table1]
```

Con le **Colonne** della [Tabella](ui.table) `vendorId, productId, name, className` la finestra mostra cosa è collegato.

## Errori

| Messaggio | Quando |
|---|---|
| Non hai il permesso di usare i dispositivi USB: chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) | Non hai il permesso per i dispositivi USB. |
| La libreria usb non funziona su questo computer: … | La libreria non si carica. |

## Vedi anche

- [usb.on attach · detach (USB collegato · scollegato)](hw.usbHotplug), [transferIn · transferOut (trasferimento USB)](hw.usbTransfer), [Dispositivo HID (node-hid)](hw.hid)
- [SerialPort.list (porte seriali)](hw.serialList), per gli adattatori USB-seriale
- [Hardware](logicstudio-hardware)
