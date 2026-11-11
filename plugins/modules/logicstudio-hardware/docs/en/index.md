# Hardware

`logicstudio-hardware` · needs the engine `logicstudio-engine` and the [Basic blocks](logicstudio-core)

The blocks that let a Logic Studio program use the devices of the **computer lilOS runs on**: serial ports (Arduino, instruments, modems), USB and HID devices, webcam, microphone and speakers, the voice, MIDI, the system information, the printers and, on Linux (for example a Raspberry Pi), the GPIO pins and the I²C bus. In the block list of the IDE they are in the **Hardware** category.

## How to install

The package does not come with Logic Studio IDE: an administrator installs it from the **AppStore**, **Kernel** tab ("Hardware"). The AppStore also installs the engine and the basic blocks, if they are missing. After the installation the blocks appear in the **Blocks** tab of the IDE.

The device libraries (`serialport`, `usb`, `node-hid`, `@julusian/midi`, `systeminformation`) come with the package, already built for Windows, Linux (ARM too, like the Raspberry Pi) and macOS. Webcam, recordings, voice, sounds, GPIO and I²C use instead the **programs of the system**: see "What you need on the computer" below.

## The blocks

| Block | Type | What it does |
|---|---|---|
| **Serial** | | |
| [SerialPort.list (serial ports)](hw.serialList) | `hw.serialList` | The serial ports of the computer: path, manufacturer, VID, PID, serial number; it can warn when they change. |
| [SerialPort (COM port)](hw.serial) | `hw.serial` | Opens a serial port: receives the messages (one per line, up to a delimiter, fixed length, split by a regular expression, as they come), sends data, sets DTR and RTS. |
| **USB** | | |
| [usb.getDevices (USB devices)](hw.usbList) | `hw.usbList` | The USB devices that are plugged in: VID, PID, name, manufacturer, class. |
| [usb.on attach · detach (USB plugged · unplugged)](hw.usbHotplug) | `hw.usbHotplug` | Warns when a USB device is plugged or unplugged, even only for one VID and PID. |
| [transferIn · transferOut (USB transfer)](hw.usbTransfer) | `hw.usbTransfer` | Direct transfers (control, bulk, interrupt) with a USB device. Advanced. |
| [HID device (node-hid)](hw.hid) | `hw.hid` | Lists and opens HID devices (not keyboards): reports received, reports to write, feature reports. |
| **Webcam** | | |
| [enumerateDevices (webcams)](hw.webcamList) | `hw.webcamList` | The webcams of the computer. |
| [takePhoto (snapshot)](hw.photo) | `hw.photo` | Takes a photo: in a file of your home and/or as an image for a window. |
| [Webcam frames (stream)](hw.webcamStream) | `hw.webcamStream` | A few images a second from the webcam, for an [Image](ui.image) of a window. |
| [MediaRecorder video (record video)](hw.videoRecord) | `hw.videoRecord` | Records a video (with the sound too) in a file of your home. |
| **Audio** | | |
| [enumerateDevices (audio devices)](hw.audioDevices) | `hw.audioDevices` | Microphones, speakers and voices of the speech synthesis. |
| [play() (play a sound)](hw.play) | `hw.play` | Plays a file of your home (.wav, .mp3…). |
| [Tone · Beep](hw.tone) | `hw.tone` | A beep: frequency, length, volume. |
| [speechSynthesis.speak (text to speech)](hw.speak) | `hw.speak` | Reads a text aloud. |
| [MediaRecorder audio (record audio)](hw.audioRecord) | `hw.audioRecord` | Records from the microphone in a file of your home. |
| [Microphone level (dB)](hw.micLevel) | `hw.micLevel` | How loud the sound that reaches the microphone is, with a threshold. |
| [System volume (get · set · mute)](hw.volume) | `hw.volume` | Reads and changes the volume of the computer, mutes it. |
| **MIDI** | | |
| [MIDI in · out](hw.midi) | `hw.midi` | Receives notes, controls and program changes from a MIDI keyboard and sends them to another port. |
| **System** | | |
| [os (system info)](hw.systemInfo) | `hw.systemInfo` | CPU, load, memory, how long it has been on, temperatures. |
| [getBattery (battery)](hw.battery) | `hw.battery` | The battery: charge, whether it is charging, whether it is plugged in; warns when it runs low. |
| [fsSize (disks)](hw.disks) | `hw.disks` | The disks: total, used, free space. |
| [networkInterfaces (network)](hw.network) | `hw.network` | The network interfaces: IP and MAC addresses; warns when they change. |
| [Printers · Print (lp)](hw.printers) | `hw.printers` | The printers, and the printing of a file of your home. |
| **Linux, Raspberry Pi** | | |
| [GPIO (gpioget · gpioset)](hw.gpio) | `hw.gpio` | A GPIO line: read, write, rising and falling edges, PWM. |
| [I²C (i2cget · i2cset)](hw.i2c) | `hw.i2c` | Reads and writes the registers of an I²C device; looks for the devices on the bus. |

## To know for all the blocks

### The computer is the one of lilOS

The devices are those of the **computer where the lilOS kernel runs**: with the lilos-desktop program it is your PC; with lilOS on a server it is the server, not the computer you are looking from. The blocks work in the kernel, as the user who owns the program, and they also work when lilOS is closed in the browser, if the program is active.

> An active program really uses the devices, even when you are not looking: a photo is a photo, a message on the serial port really reaches the connected machine. Try it first with **Test**.

### The permissions

By default **only administrators** can use these blocks. An administrator can give the permission, for each class of devices, to all users or only to some, in **Control Panel → Logic Studio → Hardware**. The classes are:

| Class | Blocks |
|---|---|
| Serial ports | [SerialPort.list (serial ports)](hw.serialList), [SerialPort (COM port)](hw.serial) |
| USB devices | [usb.getDevices (USB devices)](hw.usbList), [usb.on attach · detach (USB plugged · unplugged)](hw.usbHotplug), [transferIn · transferOut (USB transfer)](hw.usbTransfer) |
| HID devices | [HID device (node-hid)](hw.hid) |
| Webcam | [enumerateDevices (webcams)](hw.webcamList), [takePhoto (snapshot)](hw.photo), [Webcam frames (stream)](hw.webcamStream), [MediaRecorder video (record video)](hw.videoRecord) |
| Audio (microphone, speakers, voice) | [enumerateDevices (audio devices)](hw.audioDevices), [play() (play a sound)](hw.play), [Tone · Beep](hw.tone), [speechSynthesis.speak (text to speech)](hw.speak), [MediaRecorder audio (record audio)](hw.audioRecord), [Microphone level (dB)](hw.micLevel), [System volume (get · set · mute)](hw.volume); also the sound of a video |
| MIDI | [MIDI in · out](hw.midi) |
| System information and printers | [os (system info)](hw.systemInfo), [getBattery (battery)](hw.battery), [fsSize (disks)](hw.disks), [networkInterfaces (network)](hw.network), [Printers · Print (lp)](hw.printers) |
| GPIO and I²C | [GPIO (gpioget · gpioset)](hw.gpio), [I²C (i2cget · i2cset)](hw.i2c) |

A permission given to a user counts more than the one given to all, both ways: you can give the webcam to everybody except one. Without the permission the block sends on **Exception** «Non hai il permesso di usare la webcam: chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware)» ("You do not have permission to use the webcam: ask an administrator (Control Panel → Logic Studio → Hardware)") (with the name of the class). If the permission is taken away while a device is open, the device closes at the next reading.

An app made with **Make app** that contains Hardware blocks, before starting, asks whoever opens it for the permission to use the hardware of the computer; and whoever opens it must have the permissions of the classes it uses anyway. See [Permissions](logicstudio-engine/permissions).

### One device, one program

A serial port, a USB or HID device, a webcam, a MIDI input port, a GPIO line opened by a program **cannot be opened** by another one until the first one closes it. The error tells which program holds it only to whoever owns it (and to administrators); to the others it says "is already in use by another program".

Open devices close by themselves when the block stops, when the program stops (also when the test ends, or because of an error) and when the module stops. Each user keeps at most **16** devices open together.

### The data that arrives by itself

What a device sends by itself (the lines of a serial port, the HID reports, the frames of the webcam, the MIDI notes, the GPIO edges, the USB devices that are plugged in) waits in a queue in the kernel, and the block keeps going to take it. If the program is not in time, the oldest data is lost: at most 2000 messages (2 MB) for a serial port, 1000 for HID and GPIO, 2000 for MIDI, the last 3 frames for the webcam.

### The files

[takePhoto (snapshot)](hw.photo), the recordings, [play() (play a sound)](hw.play) and [Printers · Print (lp)](hw.printers) use the files of **your home**, with the same rules as the [lilOS blocks](logicstudio-lilos): `~/…` or `/home/<user>/…`, never `~/.config`, never the files protected by an app (FileCrypt), no `.` and `..`. The space counts in the quota of your home. In the paths of the files to create `{now}` becomes the date and time, for example `~/foto-2026-11-11_14-30-05.jpg`.

### The limits

| What | Limit |
|---|---|
| Devices open together | 16 per user |
| Data sent at once (serial, USB bulk) | 64 KB |
| Live webcam | 10 frames a second, 1280 × 720, 384 KB per frame (the bigger ones are skipped) |
| Photo sent to the program | 1 MB |
| Recordings | 30 minutes, 500 MB |
| Sound from a file | 50 MB, 10 minutes |
| Text read aloud | 2000 characters |
| Sounds and voices together | 2 per user |
| A file to print | 20 MB |

The limits of the Logic Studio engine also apply: see [Limits](logicstudio-engine/limits).

## What you need on the computer

| | Windows | Linux (Debian, Ubuntu, Raspberry Pi OS) | macOS |
|---|---|---|---|
| Serial, USB, HID, MIDI, system | nothing (the libraries come with the package) | the permissions (see below) | nothing |
| Webcam, recordings, microphone level | ffmpeg (`winget install ffmpeg`) | `sudo apt install ffmpeg` | `brew install ffmpeg` |
| Sounds, tone | nothing (PowerShell) | `pulseaudio-utils` (paplay) or `alsa-utils` (aplay); for .mp3 and .m4a also ffmpeg | nothing (afplay) |
| Voice | nothing (Windows voices) | `sudo apt install espeak-ng` | nothing (say) |
| Volume | nothing | `pulseaudio-utils` (pactl) or `alsa-utils` (amixer) | nothing |
| Print | nothing | CUPS (`cups-client`, lp command) | nothing (CUPS) |
| GPIO | — | `sudo apt install gpiod` | — |
| I²C | — | `sudo apt install i2c-tools` (and I²C on, `raspi-config` on a Raspberry Pi) | — |

A program just installed is seen after lilOS restarts (the kernel looks for programs in its PATH). Whoever administers lilOS sees what is there and what is missing in **Control Panel → Logic Studio → Hardware**.

On Linux the user of the system that runs lilOS must have the permissions of the devices: the groups `dialout` (serial ports), `plugdev` (USB and HID, with the udev rules of the device), `video` (webcam), `audio`, `gpio` and `i2c`. On Windows the direct USB transfers need the **WinUSB** driver on the device (installed with Zadig).

## What is not there

- **SPI**: it needs an access to the Linux kernel that the programs of the system do not give; it will come later.
- **Bluetooth** (Bluetooth Low Energy too): later. The Bluetooth serial ports already paired with the system do appear among the serial ports, though.
- **The devices of the browser** (the webcam or the microphone of the computer you are looking from, when lilOS runs on another computer): later.
- Keyboards: for safety they are not read, neither as HID nor as USB.
- USB drives, hubs and HID devices are not used with the direct USB transfers.
- The screen is not a webcam: it is not recorded.

## The errors

Every block has the **Exception** output. The messages are in Italian, as users see them; the English meaning is in parentheses. Each page lists those of its block. These can come from all of them:

| Message | When |
|---|---|
| Non hai il permesso di usare … : chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) ("You do not have permission to use …: ask an administrator (Control Panel → Logic Studio → Hardware)") | You are not an administrator and nobody gave you the permission for that class. |
| La libreria serialport non funziona su questo computer: … ("The serialport library does not work on this computer: …") | The library does not load on this computer (the same for `usb`, `node-hid`, `@julusian/midi`, `systeminformation`). The other blocks work. |
| Manca ffmpeg: installalo sul computer dove gira lilOS (…), poi riavvia lilOS ("ffmpeg is missing: install it on the computer where lilOS runs (…), then restart lilOS") | A webcam or microphone block, without ffmpeg. |
| Hai già 16 dispositivi aperti: al massimo 16 (chiudine qualcuno) ("You already have 16 open devices: at most 16 (close some)") | Your programs already keep 16 devices open. |
| «COM3» è già in uso nel programma «Serra»: chiudilo prima di aprirlo di nuovo ("«COM3» is already in use in the program «Serra»: close it before opening it again") | Another program of yours (or this same one, from another block) holds the device. |
| «COM3» è già in uso da un altro programma ("«COM3» is already in use by another program") | The program of another user holds it. |
| Il dispositivo non è aperto (o è già stato chiuso) ("The device is not open (or has already been closed)") | The device closed while the block was using it. |
| Il programma non è in esecuzione ("The program is not running") | The program was stopping. |
| … ha impiegato più di 30 s ("… took more than 30 s") | An operation went over the maximum time of a block. |

## Complete examples

### 1. An Arduino that measures the temperature

The Arduino sends a line a second like `T=23.5`.

```
[SerialPort (COM port): COM3, 9600, one per line, open at start] data ──▶ text [String functions: replace "T=" with ""] result ──▶ value [Type cast: number] result ──▶ value [Value: temp1]
```

The [Value](ui.value) of the window shows the temperature as soon as it arrives. To send a command to the Arduino, link a [Button](ui.button) to a [Constant · Variable](core.value) with the text of the command and that one to the **send** input.

### 2. A photo when somebody comes near

```
[GPIO (gpioget · gpioset): input, rising edges, line 17] rising edge ──▶ take [takePhoto (snapshot): save it in ~/ingresso/{now}.jpg] image (data URL) ──▶ source [Image: image1]
                                                         rising edge ──▶ play [Tone · Beep: 880 Hz, 0.2 s]
```

A motion sensor on pin 17 of a Raspberry Pi: at every passage a photo saved in the home, shown in the window, and a beep.

### 3. A warning when the disk fills up

```
[fsSize (disks): every 600 s] fullest (%) ──▶ a [Compare (== != < >): a > b] result ──▶ value [On change (edge)] becomes true ──▶ send [Notify: "Disk almost full"]
[Constant · Variable: 90]       value ──▶ b
```

## See also

- [Basic blocks](logicstudio-core), [lilOS blocks](logicstudio-lilos), [Network blocks](logicstudio-net)
- [Image](ui.image), to show the photos and the webcam in a window
- [The engine](logicstudio-engine), [Limits](logicstudio-engine/limits), [Permissions](logicstudio-engine/permissions)
- [How a block works](ide/blocks)
