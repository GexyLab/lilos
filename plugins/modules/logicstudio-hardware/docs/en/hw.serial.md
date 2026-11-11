# SerialPort (COM port)

`hw.serial` · Hardware · [Hardware](logicstudio-hardware) · version 1

Opens a serial port of the computer where lilOS runs and talks to it: receives the messages that arrive (split into lines, up to a delimiter, of fixed length, with a regular expression or just as they arrive), sends text or bytes, sets the DTR and RTS lines. It is the block for Arduino, ESP32, measuring instruments, scales, serial barcode readers, modems.

## Inputs

| Port | Type | Description |
|---|---|---|
| **open** (`open`) | pulse | Opens the port with the settings. If it was already open from this block, it closes and reopens it. |
| **close** (`close`) | pulse | Closes the port. |
| **send** (`send`) | any | Sends a value to the port, according to **Data as** (see below). The port must be open. |
| **DTR** (`dtr`) | yes/no | Turns the DTR line on or off. Hidden: show it in the Properties. |
| **RTS** (`rts`) | yes/no | Turns the RTS line on or off. Hidden. |
| **path** (`path`) | text | The path of the port (`COM3`, `/dev/ttyUSB0`): it takes the place of **Port** at the next opening. It does not start the block. Hidden. |

## Outputs

| Port | Type | Description |
|---|---|---|
| **data** (`data`) | any | Every message received: text, hex text or list of bytes, according to **Data as**. |
| **opened** (`opened`) | pulse | The port has opened. |
| **closed** (`closed`) | pulse | The port has closed: with **close**, or by itself (device unplugged). |
| **Exception** (`error`) | object | The port does not open, is not there, is used by another program, closed by itself, the data to send is not right… |

## Settings

| Setting | Values | Default | What it does |
|---|---|---|---|
| **Port (COM3, /dev/ttyUSB0…)** (`path`) | text | empty | The port to open, as given by [SerialPort.list (serial ports)](hw.serialList). |
| **Speed (baud)** (`baudRate`) | from 50 to 4000000 | 9600 | It must be the one of the device (for an Arduino the one of `Serial.begin`). |
| **Data bits** (`dataBits`) | 8, 7, 6, 5 | 8 | |
| **Parity** (`parity`) | None, Even, Odd, Mark, Space | None | |
| **Stop bits** (`stopBits`) | 1, 1.5, 2 | 1 | |
| **Flow control** (`flowControl`) | None, Hardware (RTS/CTS), Software (XON/XOFF) | None | |
| **Messages** (`framing`) | One per line, Up to a delimiter, Fixed length, Split by a regular expression, As they come | One per line | How the bytes that arrive become messages (see below). |
| **Delimiter (\n \r \t \xHH)** (`delimiter`) | text with `\n` `\r` `\t` `\0` `\\` `\xHH` | `\r\n` | With **Up to a delimiter**: from 1 to 16 bytes. |
| **Length (bytes)** (`length`) | from 1 to 65536 | 8 | With **Fixed length**. |
| **Separator (regular expression)** (`regex`) | a JavaScript regular expression | `\r?\n` | With **Split by a regular expression**. |
| **Data as** (`encoding`) | Text (UTF-8), Hex text, List of bytes | Text (UTF-8) | How the messages arrive on **data** and how what arrives on **send** is read. |
| **Added to what is sent** (`newline`) | Nothing, `\n`, `\r\n`, `\r` | Nothing | With **Text**: added at the end of every send (many devices wait for a new line). |
| **Open at start** (`atStart`) | yes/no | no | Opens the port when the program (or its group) starts, without waiting for **open**. |

## How it works

The port opens **only if it is in the list** of the ports of the computer at that moment: write the path as given by [SerialPort.list (serial ports)](hw.serialList) (`COM3` and `com3` are the same port on Windows). A port opened by a program cannot be opened by another one while it stays open.

### The messages received

| Messages | What arrives on **data** |
|---|---|
| **One per line** | The text up to each new line (`\n`), without the new line; a `\r` before the new line goes away too. Fine for the `Serial.println` of Arduino. |
| **Up to a delimiter** | The bytes up to each **Delimiter**, without the delimiter. For example `\x03` (ETX) for many protocols. |
| **Fixed length** | Every group of **Length** bytes. |
| **Split by a regular expression** | The text up to each point where the expression finds something, without that piece. The expression must find at least one character. |
| **As they come** | The bytes in the pieces in which they arrive from the port (with text, never a character cut in half). |

A message that never ends (no new line, no delimiter) comes out anyway when it reaches 4096 bytes. If the program is not in time to take the messages, the kernel keeps at most 2000 (2 MB): the oldest are lost.

With **Data as**:

| Data as | Received | On **send** |
|---|---|---|
| **Text (UTF-8)** | `"T=23.5"` | a text (a number or an object becomes its text, an object as JSON) |
| **Hex text** | `"543d32332e35"` | a hex text, even with spaces or `:` (`"02 41 03"`) |
| **List of bytes** | `[84, 61, 50, 51]` | a list of numbers from 0 to 255 |

With **Split by a regular expression** the data is always text. At most 64 KB are sent at a time.

### When it closes

The port closes with **close**, when the block stops (the program or its group stop) and when the device is unplugged: in that case the block sends **closed** and on **Exception** «La porta COM3 si è chiusa: dispositivo scollegato» ("The port COM3 has closed: device unplugged"). It does not reopen by itself: send **open** again (for example after a [Delay (setTimeout)](core.delay)).

## Examples

### 1. Reading an Arduino

On the Arduino: `Serial.begin(9600); … Serial.println(analogRead(A0));`

```
[SerialPort (COM port): COM3, 9600, one per line, Open at start] data ──▶ value [Type cast: number] result ──▶ value [Gauge: gauge1]
```

The [Gauge](ui.gauge) of the window moves with the value read from the Arduino.

### 2. Sending commands with a button

```
[Button: Turn on]  pressed ──▶ send [Constant · Variable: "LED ON"] value ──▶ send [SerialPort (COM port): COM3, added \n] data ──▶ value [Print (console.log)]
[Button: Turn off] pressed ──▶ send [Constant · Variable: "LED OFF"] value ──▶ send
[On start (main)]  pulse ──▶ open
```

Each button sends its command followed by a new line; the answers of the device go to the console.

### 3. A binary protocol

A device sends packets of 6 bytes. With **Messages** Fixed length, **Length** 6 and **Data as** List of bytes:

```
[SerialPort (COM port): /dev/ttyUSB0, 115200, length 6, list of bytes] data ──▶ object [Get property: 2] value ──▶ value [Print (console.log)]
```

Every packet arrives as `[2, 17, 0, 200, 13, 10]`; the [Get property](core.get) block with the field `2` takes the third byte.

## Errors

The messages are in Italian, as users see them; the English meaning is in parentheses.

| Message | When |
|---|---|
| Non hai il permesso di usare le porte seriali: chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) ("You do not have permission to use the serial ports: ask an administrator (Control Panel → Logic Studio → Hardware)") | You do not have the permission for the serial ports. |
| Manca la porta: scrivi il percorso (COM3, /dev/ttyUSB0…) oppure VID e PID ("The port is missing: write the path (COM3, /dev/ttyUSB0…) or VID and PID") | **Port** is empty. |
| La porta «COM7» non c'è (porte presenti: COM3, COM5) ("The port «COM7» is not there (ports present: COM3, COM5)") | The path is not among the ports of the computer. |
| «COM3» è già in uso nel programma «Serra»: chiudilo prima di aprirlo di nuovo ("«COM3» is already in use in the program «Serra»: close it before opening it again") | The port is open in another program of yours (or in another block). |
| «COM3» è già in uso da un altro programma ("«COM3» is already in use by another program") | The port is open in the program of another user. |
| La porta COM3 non si apre: … ("The port COM3 does not open: …") | The system refuses the opening (on Linux the permissions of the `dialout` group are often needed). |
| Velocità (baud) non valido: … (da 50 a 4000000) ("Speed (baud) not valid: … (from 50 to 4000000)") | The same for **Data bits**, **Parity**, **Stop bits**, **Flow control**, **Data as**. |
| Delimitatore non valido: «\q» (usa \n, \r, \t, \0, \\ o \xHH) ("Delimiter not valid: «\q» (use \n, \r, \t, \0, \\ or \xHH)") | The delimiter has an unknown sequence. |
| Il delimitatore deve avere da 1 a 16 byte ("The delimiter must have from 1 to 16 bytes") | The delimiter is empty or too long. |
| Espressione regolare non valida: … ("Regular expression not valid: …") | The **Separator** is not a regular expression. |
| L'espressione regolare trova un separatore vuoto: scrivine una che trovi almeno un carattere ("The regular expression finds an empty separator: write one that finds at least one character") | For example `x*`. |
| La porta non è aperta: manda prima un impulso ad «apri» ("The port is not open: send a pulse to «open» first") | A value on **send** with the port closed. |
| Dati esadecimali non validi: servono coppie di cifre 0-9 a-f (per esempio «0a 1b ff») ("Hex data not valid: pairs of digits 0-9 a-f are needed (for example «0a 1b ff»)") | **Hex text** with a wrong value on **send**. |
| Servono dei byte: una lista di numeri da 0 a 255 ("Bytes are needed: a list of numbers from 0 to 255") | **List of bytes** with a value that is not a list. |
| Troppi dati da mandare in una volta: … byte (al massimo 65536) ("Too much data to send at once: … bytes (at most 65536)") | Over 64 KB. |
| La porta COM3 non riceve i dati (controllo di flusso?) ("The port COM3 is not receiving the data (flow control?)") | The device did not take the data within 10 seconds. |
| La porta COM3 si è chiusa: dispositivo scollegato ("The port COM3 has closed: device unplugged") | The device was unplugged. |
| La libreria serialport non funziona su questo computer: … ("The serialport library does not work on this computer: …") | The library does not load. |
| Hai già 16 dispositivi aperti: al massimo 16 (chiudine qualcuno) ("You already have 16 open devices: at most 16 (close some)") | Too many devices open from your programs. |

## See also

- [SerialPort.list (serial ports)](hw.serialList)
- [String functions](core.text), [Cast to number (Number())](core.toNumber), [Cast from JSON text (JSON.parse)](core.parseJson), to work on the messages
- [Hardware](logicstudio-hardware)
