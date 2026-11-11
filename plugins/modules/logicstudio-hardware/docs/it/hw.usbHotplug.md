# usb.on attach · detach (USB collegato · scollegato)

`hw.usbHotplug` · Hardware · [Hardware](logicstudio-hardware) · versione 1

Avvisa quando un dispositivo USB viene collegato o scollegato dal computer dove gira lilOS: tutti, o solo quelli di un VID e un PID.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **acceso** (`on`) | sì/no | `true` comincia a sorvegliare, `false` smette. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **collegato** (`attached`) | oggetto | Il dispositivo appena collegato, come in [usb.getDevices (dispositivi USB)](hw.usbList). |
| **scollegato** (`detached`) | oggetto | Il dispositivo appena scollegato. |
| **evento** (`event`) | oggetto | Tutti e due: `{ event: "attached" \| "detached", device }`. |
| **Exception** (`error`) | oggetto | Permesso mancante, libreria che non si carica, VID o PID non validi. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Solo VID (esadecimale, es. 2341)** (`vendorId`) | 4 cifre esadecimali | vuoto | Avvisa solo per i dispositivi di quel produttore. |
| **Solo PID (esadecimale, es. 2341)** (`productId`) | 4 cifre esadecimali | vuoto | Avvisa solo per quel prodotto. |
| **Parte da solo** (`atStart`) | sì/no | sì | Comincia a sorvegliare quando parte il programma (o il suo gruppo). |

## Come funziona

Il kernel ascolta il bus USB una volta sola per tutti i programmi che lo sorvegliano, e passa a ogni blocco gli eventi che gli interessano. Il dispositivo scollegato è descritto com'era quando era collegato; se il kernel non l'aveva visto (era collegato prima che qualcuno sorvegliasse e il sistema non lo dice), alcuni campi possono essere vuoti.

Un dispositivo che si riavvia (per esempio un Arduino quando carichi un nuovo programma) manda **scollegato** e poi **collegato**.

## Esempi

### 1. Riaprire la seriale quando l'Arduino torna

```
[usb.on attach · detach (USB collegato · scollegato): solo VID 2341] collegato ──▶ valore [Ritardo (setTimeout): 2 s] valore ──▶ apri [SerialPort (porta seriale COM): COM3]
```

Quando l'Arduino viene ricollegato, dopo due secondi (il tempo che il sistema crei la porta) la porta seriale si riapre.

### 2. Un registro dei dispositivi

```
[usb.on attach · detach (USB collegato · scollegato)] evento ──▶ contenuto [appendFile: ~/usb.log, JSON uno per riga]
```

Ogni collegamento e scollegamento finisce come una riga JSON nel file `~/usb.log` (blocco [appendFile](lilos.fileAppend) dei Blocchi di lilOS).

## Errori

| Messaggio | Quando |
|---|---|
| Non hai il permesso di usare i dispositivi USB: chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) | Non hai il permesso per i dispositivi USB. |
| VID non valido: … (scrivi 4 cifre esadecimali, come 2341) | **Solo VID** non è un numero esadecimale di 4 cifre (lo stesso per il PID). |
| La libreria usb non funziona su questo computer: … | La libreria non si carica. |
| Hai già 16 dispositivi aperti: al massimo 16 (chiudine qualcuno) | Ogni blocco che sorveglia conta come un dispositivo aperto. |

## Vedi anche

- [usb.getDevices (dispositivi USB)](hw.usbList)
- [SerialPort.list (porte seriali)](hw.serialList), che con **Sorveglia** avvisa quando cambiano le porte seriali
- [Hardware](logicstudio-hardware)
