# transferIn · transferOut (USB transfer)

`hw.usbTransfer` · Hardware · [Hardware](logicstudio-hardware) · version 1

Talks directly to a USB device, with **control**, **bulk** or **interrupt** transfers, like WebUSB. It is an **advanced** block: you need to know the protocol of the device (the numbers of the requests, the endpoints). For serial devices use [SerialPort (COM port)](hw.serial), for HID devices [HID device (node-hid)](hw.hid).

## Inputs

| Port | Type | Description |
|---|---|---|
| **open** (`open`) | pulse | Opens the device and takes its **Interface**. |
| **close** (`close`) | pulse | Releases the interface and closes the device. |
| **transfer (data to send)** (`transfer`) | any | Makes a transfer. With **Direction** Out the value is the one to send; with In any value makes it read. If the device is not open, it opens it first. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **data received** (`data`) | any | (Direction In) The bytes read, according to **Data as**. |
| **result** (`result`) | object | `{ status, data, length }` (In) or `{ status, written }` (Out). `status` is `ok` or `stall`. |
| **opened** (`opened`) | pulse | The device has opened. |
| **closed** (`closed`) | pulse | The device has closed with **close**. |
| **Exception** (`error`) | object | The device is not there, does not open, is not allowed, the transfer does not succeed… |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **VID (hex, e.g. 2341)** (`vendorId`) | 4 hex digits | empty | The manufacturer of the device. |
| **PID (hex, e.g. 2341)** (`productId`) | 4 hex digits | empty | The product. |
| **Serial number (optional)** (`serialNumber`) | text | empty | To choose between two equal devices. |
| **Interface** (`interface`) | from 0 to 255 | 0 | The interface to take. |
| **Detach the system driver (Linux)** (`detachDriver`) | yes/no | no | On Linux it takes the interface away from the system (and gives it back on closing). |
| **Transfer** (`kind`) | Control, Bulk, Interrupt | Control | |
| **Direction** (`direction`) | In (from the device), Out (to the device) | In | |
| **Endpoint** (`endpoint`) | from 1 to 15 | 1 | The number of the endpoint (without the direction bit). With Bulk and Interrupt. |
| **Request type** (`requestType`) | standard, class, vendor | vendor | With Control. |
| **Recipient** (`recipient`) | device, interface, endpoint, other | device | With Control. |
| **bRequest** (`request`) | from 0 to 255 | 0 | With Control. |
| **wValue** (`value`) | from 0 to 65535 | 0 | With Control. |
| **wIndex** (`index`) | from 0 to 65535 | 0 | With Control. |
| **Bytes to read** (`length`) | from 0 to 65536 | 64 | With Direction In (at most 4096 for control). |
| **Wait at most (ms)** (`timeoutMs`) | from 1 to 30000 | 1000 | How long to wait for the device. |
| **Data as** (`encoding`) | List of bytes, Hex text, Text (UTF-8) | List of bytes | How the data read arrives and how the value to send is read. |

## How it works

The device is opened by VID and PID (and serial number): the first one that matches. It stays open until **close**, or until the block stops; another program does not open it in the meantime.

**They are not opened** with this block, for safety: USB drives and disks (the files would be read without the permissions of the system), hubs, HID devices (keyboards, mice: for the other HID devices there is [HID device (node-hid)](hw.hid)).

**On Windows** the device must use the **WinUSB** driver. Many devices made for WebUSB already have it; for the others it is installed with **Zadig** (zadig.akeo.ie). Careful: with WinUSB the device no longer works with its previous driver.

**On Linux** the user that runs lilOS must be able to use the device: a udev rule like `SUBSYSTEM=="usb", ATTR{idVendor}=="2341", MODE="0660", GROUP="plugdev"` in `/etc/udev/rules.d/`, and the user in the `plugdev` group. If the system already uses the interface (a kernel driver), turn on **Detach the system driver**.

At most 64 KB are sent or read per transfer (4 KB for control).

## Examples

### 1. Reading the firmware version

A device answers the vendor request `0x01` with 4 bytes of version.

```
[On start (main)] pulse ──▶ transfer (data to send) [transferIn · transferOut (USB transfer): VID 1209, PID 0001, Control, In, vendor, bRequest 1, 4 bytes] data received ──▶ value [Print (console.log)]
```

The console writes for example `[1, 2, 0, 7]`.

### 2. Sending a bulk command

```
[Button: Start] pressed ──▶ send [Constant · Variable: JSON [2, 1, 0]] value ──▶ transfer (data to send) [transferIn · transferOut (USB transfer): Bulk, Out, endpoint 2] result ──▶ value [Print (console.log)]
```

The device receives the 3 bytes on endpoint 2; the console writes `{ "status": "ok", "written": 3 }`.

## Errors

The messages are in Italian, as users see them; the English meaning is in parentheses.

| Message | When |
|---|---|
| Non hai il permesso di usare i dispositivi USB: chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) ("You do not have permission to use the USB devices: ask an administrator (Control Panel → Logic Studio → Hardware)") | You do not have the permission for the USB devices. |
| Servono VID e PID del dispositivo USB (4 cifre esadecimali, come nell'elenco) ("The VID and PID of the USB device are needed (4 hex digits, as in the list)") | VID or PID are missing. |
| Nessun dispositivo USB con VID 1209 e PID 0001 ("No USB device with VID 1209 and PID 0001") | The device is not plugged in. |
| Questo dispositivo USB è di tipo memoria di massa: non si usa con trasferimenti diretti ("This USB device is a mass storage device: it is not used with direct transfers") | USB drives and disks, hubs, HID. |
| USB 1209:0001 non si apre: … (su Windows serve il driver WinUSB, con Zadig; su Linux i permessi di udev) ("USB 1209:0001 does not open: … (on Windows the WinUSB driver is needed, with Zadig; on Linux the udev permissions)") | The system refuses the opening. |
| USB 1209:0001: trasferimento non riuscito: … ("USB 1209:0001: transfer failed: …") | The device did not answer, refused the request, the endpoint does not exist… |
| «USB 1209:0001» è già in uso nel programma «Banco»: chiudilo prima di aprirlo di nuovo ("«USB 1209:0001» is already in use in the program «Banco»: close it before opening it again") | Another program of yours holds it. |
| «USB 1209:0001» è già in uso da un altro programma ("«USB 1209:0001» is already in use by another program") | The program of another user holds it. |
| Endpoint non valido: … (da 1 a 15) ("Endpoint not valid: … (from 1 to 15)") | The same for the other numeric settings. |
| La libreria usb non funziona su questo computer: … ("The usb library does not work on this computer: …") | The library does not load. |

## See also

- [usb.getDevices (USB devices)](hw.usbList), to find VID and PID
- [HID device (node-hid)](hw.hid)
- [Hardware](logicstudio-hardware)
