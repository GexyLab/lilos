# Dispositivo HID (node-hid)

`hw.hid` · Hardware · [Hardware](logicstudio-hardware) · versione 1

Elenca e apre i dispositivi HID del computer dove gira lilOS: joystick e gamepad, pulsantiere, pedali, schede con firmware HID (Arduino Leonardo, Pico), sensori, alimentatori e strumenti che parlano HID. Riceve i report che il dispositivo manda, scrive report e feature report. **Le tastiere non si aprono e non compaiono nell'elenco**: un programma non deve poter leggere quello che qualcuno scrive.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **elenca** (`list`) | impulso | Manda l'elenco dei dispositivi HID su **dispositivi**. |
| **apri** (`open`) | impulso | Apre il dispositivo scelto nelle impostazioni. |
| **chiudi** (`close`) | impulso | Chiude il dispositivo. |
| **scrivi report** (`write`) | qualsiasi | Manda un report al dispositivo: una lista di byte o un testo esadecimale. |
| **manda feature report** (`sendFeature`) | qualsiasi | Manda un feature report (lista di byte o testo esadecimale). Nascosto. |
| **leggi feature report** (`getFeature`) | impulso | Chiede al dispositivo il feature report **Feature report: numero**. Nascosto. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **report ricevuto** (`data`) | qualsiasi | Ogni report mandato dal dispositivo, secondo **Report come**. |
| **feature report** (`feature`) | qualsiasi | Il feature report letto. Nascosto. |
| **dispositivi** (`devices`) | lista | L'elenco (vedi sotto). |
| **aperto** (`opened`) | impulso | Il dispositivo si è aperto. |
| **chiuso** (`closed`) | impulso | Il dispositivo si è chiuso da solo (scollegato). |
| **Exception** (`error`) | oggetto | Il dispositivo non c'è, non si apre, è usato da un altro programma, si è scollegato… |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **VID (esadecimale, es. 2341)** (`vendorId`) | 4 cifre esadecimali | vuoto | Il produttore. |
| **PID (esadecimale, es. 2341)** (`productId`) | 4 cifre esadecimali | vuoto | Il prodotto. |
| **Usage page (facoltativa, es. 0xff00)** (`usagePage`) | un numero | vuoto | Per scegliere una delle parti (collezioni) di un dispositivo che ne ha più di una. |
| **Percorso (dall'elenco; prende il posto di VID e PID)** (`path`) | testo | vuoto | Il campo `path` di un dispositivo dell'elenco. |
| **Report come** (`encoding`) | Lista di byte, Testo esadecimale | Lista di byte | Come arrivano i report. |
| **Feature report: numero** (`reportId`) | da 0 a 255 | 0 | Il report da leggere con **leggi feature report**. |
| **Feature report: lunghezza (byte)** (`featureLength`) | da 1 a 4096 | 64 | Quanti byte leggere. |

## Come funziona

Ogni dispositivo dell'elenco è un oggetto `{ path, vendorId, productId, manufacturer, product, serialNumber, usagePage, usage, interface, release }`. Un dispositivo con più funzioni compare più volte, una per collezione (su Windows ognuna con il suo percorso).

Con **apri** il blocco apre il dispositivo con quel **Percorso**, oppure il primo con quel VID e PID (e usage page). I report che manda arrivano su **report ricevuto**; se il programma non fa in tempo, il kernel ne tiene al massimo 1000 e i più vecchi si perdono.

Per scrivere: il **primo byte è il numero del report** (`0` se il dispositivo non usa numeri di report), poi i dati. Per esempio `[0, 1, 255]` o `"00 01 ff"`. Al massimo 4096 byte.

Le tastiere (usage page 1, usage 6 o 7) sono escluse del tutto: su Linux anche gli altri tasti dello stesso dispositivo (i tasti multimediali), perché passano dalla stessa porta.

Su Linux l'utente che fa girare lilOS deve poter leggere `/dev/hidraw*`: una regola di udev come `KERNEL=="hidraw*", ATTRS{idVendor}=="2341", MODE="0660", GROUP="plugdev"` e l'utente nel gruppo `plugdev`.

## Esempi

### 1. Una pulsantiera

```
[All'avvio (main)] impulso ──▶ apri [Dispositivo HID (node-hid): VID 1209, PID 2201] report ricevuto ──▶ oggetto [Get proprietà (obj.campo): 1] valore ──▶ valore [Print (console.log)]
```

Ogni volta che premi un tasto della pulsantiera, la console scrive il secondo byte del report (quale tasto).

### 2. Accendere un LED

```
[Interruttore: toggle1] valore ──▶ condizione [If · Else] allora     ──▶ invia [Costante · Variabile: JSON [0, 1]] valore ──▶ scrivi report [Dispositivo HID (node-hid): VID 1209, PID 2201]
                                                    altrimenti ──▶ invia [Costante · Variabile: JSON [0, 0]] valore ──▶ scrivi report
```

## Errori

| Messaggio | Quando |
|---|---|
| Non hai il permesso di usare i dispositivi HID: chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) | Non hai il permesso per i dispositivi HID. |
| Servono VID e PID del dispositivo HID, oppure il suo percorso dall'elenco | Né percorso né VID e PID. |
| Nessun dispositivo HID con VID 1209 e PID 2201 (le tastiere non si aprono) | Non è collegato, o è una tastiera. |
| Il dispositivo HID scelto non c'è (o è una tastiera, che non si apre) | Il percorso non è nell'elenco. |
| HID 1209:2201 (Pulsantiera) non si apre: … (su Linux servono i permessi di udev su hidraw) | Il sistema rifiuta l'apertura. |
| HID 1209:2201 (Pulsantiera) si è chiuso: scollegato? | Il dispositivo è stato scollegato. |
| Il dispositivo HID non è aperto: manda prima un impulso ad «apri» | Un report da scrivere senza dispositivo aperto. |
| Il report da mandare è vuoto (il primo byte è il numero del report, 0 se il dispositivo non li usa) | Una lista vuota. |
| «HID 1209:2201 (Pulsantiera)» è già in uso da un altro programma | Lo tiene il programma di un altro utente. |
| La libreria node-hid non funziona su questo computer: … | La libreria non si carica. |

## Vedi anche

- [usb.getDevices (dispositivi USB)](hw.usbList), per trovare VID e PID
- [transferIn · transferOut (trasferimento USB)](hw.usbTransfer)
- [Hardware](logicstudio-hardware)
