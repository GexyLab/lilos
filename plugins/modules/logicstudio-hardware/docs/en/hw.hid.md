# HID device (node-hid)

`hw.hid` · Hardware · [Hardware](logicstudio-hardware) · version 1

Lists and opens the HID devices of the computer where lilOS runs: joysticks and gamepads, button boxes, pedals, boards with HID firmware (Arduino Leonardo, Pico), sensors, power supplies and instruments that speak HID. It receives the reports the device sends, writes reports and feature reports. **Keyboards are not opened and do not appear in the list**: a program must not be able to read what somebody types.

## Inputs

| Port | Type | Description |
|---|---|---|
| **list** (`list`) | pulse | Sends the list of the HID devices on **devices**. |
| **open** (`open`) | pulse | Opens the device chosen in the settings. |
| **close** (`close`) | pulse | Closes the device. |
| **write report** (`write`) | any | Sends a report to the device: a list of bytes or a hex text. |
| **send feature report** (`sendFeature`) | any | Sends a feature report (list of bytes or hex text). Hidden. |
| **read feature report** (`getFeature`) | pulse | Asks the device for the feature report **Feature report: number**. Hidden. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **report received** (`data`) | any | Every report sent by the device, according to **Reports as**. |
| **feature report** (`feature`) | any | The feature report read. Hidden. |
| **devices** (`devices`) | list | The list (see below). |
| **opened** (`opened`) | pulse | The device has opened. |
| **closed** (`closed`) | pulse | The device has closed by itself (unplugged). |
| **Exception** (`error`) | object | The device is not there, does not open, is used by another program, was unplugged… |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **VID (hex, e.g. 2341)** (`vendorId`) | 4 hex digits | empty | The manufacturer. |
| **PID (hex, e.g. 2341)** (`productId`) | 4 hex digits | empty | The product. |
| **Usage page (optional, e.g. 0xff00)** (`usagePage`) | a number | empty | To choose one of the parts (collections) of a device that has more than one. |
| **Path (from the list; takes the place of VID and PID)** (`path`) | text | empty | The `path` field of a device of the list. |
| **Reports as** (`encoding`) | List of bytes, Hex text | List of bytes | How the reports arrive. |
| **Feature report: number** (`reportId`) | from 0 to 255 | 0 | The report to read with **read feature report**. |
| **Feature report: length (bytes)** (`featureLength`) | from 1 to 4096 | 64 | How many bytes to read. |

## How it works

Each device of the list is an object `{ path, vendorId, productId, manufacturer, product, serialNumber, usagePage, usage, interface, release }`. A device with more functions appears more than once, one per collection (on Windows each with its own path).

With **open** the block opens the device with that **Path**, or the first one with that VID and PID (and usage page). The reports it sends arrive on **report received**; if the program is not in time, the kernel keeps at most 1000 and the oldest are lost.

To write: the **first byte is the number of the report** (`0` if the device does not use report numbers), then the data. For example `[0, 1, 255]` or `"00 01 ff"`. At most 4096 bytes.

Keyboards (usage page 1, usage 6 or 7) are left out completely: on Linux also the other keys of the same device (the media keys), because they go through the same port.

On Linux the user that runs lilOS must be able to read `/dev/hidraw*`: a udev rule like `KERNEL=="hidraw*", ATTRS{idVendor}=="2341", MODE="0660", GROUP="plugdev"` and the user in the `plugdev` group.

## Examples

### 1. A button box

```
[On start (main)] pulse ──▶ open [HID device (node-hid): VID 1209, PID 2201] report received ──▶ object [Get property: 1] value ──▶ value [Print (console.log)]
```

Every time you press a key of the button box, the console writes the second byte of the report (which key).

### 2. Turning on an LED

```
[Switch: toggle1] value ──▶ condition [If · Else] then ──▶ send [Constant · Variable: JSON [0, 1]] value ──▶ write report [HID device (node-hid): VID 1209, PID 2201]
                                                   else ──▶ send [Constant · Variable: JSON [0, 0]] value ──▶ write report
```

## Errors

The messages are in Italian, as users see them; the English meaning is in parentheses.

| Message | When |
|---|---|
| Non hai il permesso di usare i dispositivi HID: chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) ("You do not have permission to use the HID devices: ask an administrator (Control Panel → Logic Studio → Hardware)") | You do not have the permission for the HID devices. |
| Servono VID e PID del dispositivo HID, oppure il suo percorso dall'elenco ("The VID and PID of the HID device are needed, or its path from the list") | Neither path nor VID and PID. |
| Nessun dispositivo HID con VID 1209 e PID 2201 (le tastiere non si aprono) ("No HID device with VID 1209 and PID 2201 (keyboards are not opened)") | It is not plugged in, or it is a keyboard. |
| Il dispositivo HID scelto non c'è (o è una tastiera, che non si apre) ("The chosen HID device is not there (or it is a keyboard, which is not opened)") | The path is not in the list. |
| HID 1209:2201 (Pulsantiera) non si apre: … (su Linux servono i permessi di udev su hidraw) ("HID 1209:2201 (Pulsantiera) does not open: … (on Linux the udev permissions on hidraw are needed)") | The system refuses the opening. |
| HID 1209:2201 (Pulsantiera) si è chiuso: scollegato? ("HID 1209:2201 (Pulsantiera) has closed: unplugged?") | The device was unplugged. |
| Il dispositivo HID non è aperto: manda prima un impulso ad «apri» ("The HID device is not open: send a pulse to «open» first") | A report to write with no device open. |
| Il report da mandare è vuoto (il primo byte è il numero del report, 0 se il dispositivo non li usa) ("The report to send is empty (the first byte is the report number, 0 if the device does not use them)") | An empty list. |
| «HID 1209:2201 (Pulsantiera)» è già in uso da un altro programma ("«HID 1209:2201 (Pulsantiera)» is already in use by another program") | The program of another user holds it. |
| La libreria node-hid non funziona su questo computer: … ("The node-hid library does not work on this computer: …") | The library does not load. |

## See also

- [usb.getDevices (USB devices)](hw.usbList), to find VID and PID
- [transferIn · transferOut (USB transfer)](hw.usbTransfer)
- [Hardware](logicstudio-hardware)
