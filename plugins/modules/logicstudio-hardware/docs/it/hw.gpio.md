# GPIO (gpioget · gpioset)

`hw.gpio` · Hardware · [Hardware](logicstudio-hardware) · versione 1

Una linea GPIO di una scheda Linux, come un Raspberry Pi: leggere un pulsante o un sensore, accendere un LED o un relè, sentire i fronti di salita e discesa, comandare un'uscita PWM. **Solo su Linux.**

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **leggi** (`read`) | impulso | (Uso Ingresso: leggi) Legge la linea. |
| **scrivi** (`write`) | sì/no | (Uso Uscita: scrivi) `true` accende la linea, `false` la spegne. |
| **PWM duty (0-1)** (`duty`) | numero | (Uso PWM) Il duty cycle, da 0 (spenta) a 1 (sempre accesa). Nascosto. |
| **sorveglia i fronti** (`on`) | sì/no | (Uso Ingresso: fronti) `true` comincia a sorvegliare, `false` smette. Nascosto. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | sì/no | Il valore letto, scritto, o dopo un fronte. |
| **fronte di salita** (`rising`) | impulso | (Fronti) La linea è passata da spenta ad accesa. |
| **fronte di discesa** (`falling`) | impulso | (Fronti) La linea è passata da accesa a spenta. |
| **Exception** (`error`) | oggetto | Non è Linux, mancano i programmi, la linea è usata, mancano i permessi… |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Uso** (`mode`) | Ingresso: leggi, Uscita: scrivi, Ingresso: fronti, PWM (sysfs) | Ingresso: leggi | Cosa fa il blocco con la linea. |
| **Chip** (`chip`) | `gpiochip0`, `gpiochip4`… o il numero | `gpiochip0` | Il chip GPIO. Sul Raspberry Pi 5 i pin della testata sono su `gpiochip4` (o `gpiochip0` con i sistemi recenti). |
| **Linea (offset; numero BCM su un Raspberry Pi)** (`line`) | da 0 a 1023 | 17 | Il numero della linea nel chip: su un Raspberry Pi il numero «GPIO» (BCM), non quello del pin. |
| **Resistenza** (`bias`) | Com'è, Pull-up, Pull-down, Nessuna | Com'è | La resistenza interna per un ingresso (un pulsante verso massa vuole Pull-up). |
| **Fronti** (`edge`) | Entrambi, Salita, Discesa | Entrambi | I fronti da sentire. |
| **Chip PWM** (`pwmChip`) | da 0 a 63 | 0 | Il chip di `/sys/class/pwm/pwmchipN`. |
| **Canale PWM** (`channel`) | da 0 a 63 | 0 | |
| **Frequenza PWM (Hz)** (`frequency`) | da 1 a 1000000 | 1000 | |
| **Parte da solo (fronti)** (`atStart`) | sì/no | sì | Con Ingresso: fronti, comincia a sorvegliare quando parte il programma. |

## Come funziona

Il kernel usa i programmi di **libgpiod** (`sudo apt install gpiod`, versioni 1 e 2), mai una shell: solo numeri controllati.

- **Ingresso: leggi**: `gpioget` legge la linea a ogni **leggi**.
- **Uscita: scrivi**: al primo **scrivi** il kernel prende la linea con `gpioset` e la **tiene** al valore scritto finché il programma non si ferma; ogni nuovo valore la cambia. Quando il blocco si ferma la linea viene lasciata (di solito resta all'ultimo valore, ma dipende dalla scheda).
- **Ingresso: fronti**: `gpiomon` resta in ascolto e ogni fronte arriva subito come impulso (al massimo 1000 in coda, se il programma non fa in tempo).
- **PWM**: scrive in `/sys/class/pwm` (periodo, duty cycle, accensione). Su un Raspberry Pi va attivato nella configurazione (`dtoverlay=pwm` o `pwm-2chan` in `config.txt`); con duty 0 l'uscita si spegne, e si spegne anche quando il blocco si ferma.

Una linea usata da un blocco (uscita o fronti) non si usa da un altro blocco o programma finché resta presa.

L'utente del sistema che fa girare lilOS deve essere nel gruppo `gpio` (per il PWM servono anche i permessi su `/sys/class/pwm`, con una regola di udev).

## Esempi

### 1. Un pulsante che accende un LED

Il pulsante va dalla linea 27 a massa, con la resistenza Pull-up: dà `false` quando è premuto.

```
[GPIO (gpioget · gpioset): Ingresso: fronti, linea 27, Pull-up] valore ──▶ valore [NOT] risultato ──▶ scrivi [GPIO (gpioget · gpioset): Uscita: scrivi, linea 17]
```

Il LED sulla linea 17 è acceso finché tieni premuto il pulsante sulla linea 27.

### 2. Un LED che lampeggia

```
[Intervallo (setInterval): 0,5 s] impulso ──▶ leggi [Memoria (set · get)] valore ──▶ valore [NOT] risultato ──▶ scrivi [GPIO (gpioget · gpioset): Uscita: scrivi, linea 17]
                                                                                   risultato ──▶ imposta [Memoria (set · get)]
```

Ogni mezzo secondo il valore della [Memoria (set · get)](core.store) si inverte con [NOT](core.not) e va al LED: acceso, spento, acceso…

### 3. La luminosità di un LED

```
[Cursore: slider1 (da 0 a 1)] valore ──▶ PWM duty (0-1) [GPIO (gpioget · gpioset): PWM, chip 0, canale 0, 1000 Hz]
```

## Errori

| Messaggio | Quando |
|---|---|
| Non hai il permesso di usare GPIO e I²C: chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) | Non hai il permesso per GPIO e I²C. |
| GPIO e I²C ci sono solo su Linux (per esempio un Raspberry Pi) | Il computer di lilOS non è Linux. |
| Manca il comando gpioget: installa gpiod (sudo apt install gpiod) | libgpiod non c'è (lo stesso per gpioset e gpiomon). |
| Chip GPIO non valido: … (scrivi gpiochip0 oppure 0) | **Chip** sbagliato. |
| Linea GPIO non valido: … (da 0 a 1023) | **Linea** sbagliata. |
| GPIO 17 non si legge: … | `gpioget` ha dato errore (linea usata, permessi…). |
| gpioset non ha impostato la linea 17: … | La linea è usata da un altro programma del sistema, o mancano i permessi. |
| «GPIO gpiochip0/17» è già in uso nel programma «Serra»: chiudilo prima di aprirlo di nuovo | La linea è presa da un altro tuo blocco o programma. |
| gpiomon si è fermato: … | La sorveglianza dei fronti si è interrotta. |
| Non c'è PWM: /sys/class/pwm/pwmchip0 manca (attivalo nella configurazione della scheda, per esempio dtoverlay=pwm) | Il PWM non è attivo. |
| PWM 0/0: permesso negato (gruppo gpio o regole udev per /sys/class/pwm) | Mancano i permessi. |
| L'ingresso «leggi» non serve nell'uso scelto (output): cambia l'uso nelle Proprietà | Un ingresso che non va con l'**Uso** scelto. |

## Vedi anche

- [I²C (i2cget · i2cset)](hw.i2c)
- [Hardware](logicstudio-hardware)
