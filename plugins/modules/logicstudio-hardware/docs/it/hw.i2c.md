# I²C (i2cget · i2cset)

`hw.i2c` · Hardware · [Hardware](logicstudio-hardware) · versione 1

Legge e scrive i registri di un dispositivo I²C collegato a una scheda Linux, come un Raspberry Pi: sensori di temperatura, pressione e luce, convertitori analogico-digitali, espansioni di porte, display. Cerca anche i dispositivi presenti sul bus. **Solo su Linux.**

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **leggi** (`read`) | impulso | Legge il registro (o cerca sul bus, con **«leggi» cerca sul bus**). |
| **scrivi** (`write`) | qualsiasi | Scrive nel registro: un numero (byte o word) o una lista di byte (blocco). |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **valore** (`value`) | numero | Il byte o la word letti (con un blocco, il primo byte). |
| **byte** (`data`) | lista | I byte letti (una word: prima il byte basso). |
| **fatto** (`done`) | impulso | L'operazione è riuscita. |
| **indirizzi trovati** (`addresses`) | lista | (Cerca sul bus) Gli indirizzi che rispondono, come numeri. Nascosto. |
| **Exception** (`error`) | oggetto | Non è Linux, mancano i programmi, il dispositivo non risponde… |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Bus (/dev/i2c-N)** (`bus`) | da 0 a 255 | 1 | Il bus: sul Raspberry Pi i pin 3 e 5 sono il bus 1. |
| **Indirizzo del dispositivo (0x03-0x77)** (`address`) | `0x48` o `72` | `0x48` | L'indirizzo a 7 bit. |
| **Registro** (`register`) | `0x00`…`0xff` | `0x00` | |
| **Dimensione** (`size`) | Byte, Word (16 bit), Blocco (byte) | Byte | |
| **Byte da leggere** (`length`) | da 1 a 32 | 2 | Con Blocco. |
| **«leggi» cerca sul bus (i2cdetect)** (`scan`) | sì/no | no | **leggi** cerca i dispositivi invece di leggere un registro. |

## Come funziona

Il kernel usa i programmi di **i2c-tools** (`sudo apt install i2c-tools`): `i2cget` e `i2cset` per byte e word, `i2ctransfer` per i blocchi (prima scrive il registro, poi legge), `i2cdetect` per cercare. Mai una shell: solo numeri controllati.

- Una **word** si legge e si scrive come la dà il dispositivo SMBus (byte basso prima): alcuni sensori la vogliono girata.
- Un **blocco** si scrive mandando su **scrivi** una lista da 1 a 32 byte; si legge con **Byte da leggere**.
- **Cerca sul bus** prova tutti gli indirizzi: alcuni dispositivi non gradiscono essere «toccati» così. Gli indirizzi usati da un driver del sistema compaiono anche loro.

**Attenzione:** scrivere nel registro sbagliato può cambiare la configurazione di un dispositivo o rovinare una memoria EEPROM. Prova prima con **Prova**, leggendo.

Su un Raspberry Pi l'I²C va attivato (`sudo raspi-config` → Interface Options → I2C) e l'utente che fa girare lilOS deve essere nel gruppo `i2c`.

## Esempi

### 1. La temperatura di un TMP102

Il TMP102 all'indirizzo `0x48` tiene la temperatura nel registro `0x00`, in 2 byte (12 bit, 0,0625 °C per passo).

```
[Intervallo (setInterval): 5 s] impulso ──▶ leggi [I²C (i2cget · i2cset): bus 1, 0x48, registro 0x00, Blocco, 2 byte] byte ──▶ valore [Print (console.log)]
```

La console scrive per esempio `[23, 64]`: (23 × 16 + 64 / 16) × 0,0625 = 23,25 °C (con i blocchi di [Funzioni Math](core.math) per il calcolo).

### 2. Cosa c'è sul bus

```
[All'avvio (main)] impulso ──▶ leggi [I²C (i2cget · i2cset): bus 1, «leggi» cerca sul bus] indirizzi trovati ──▶ valore [Print (console.log)]
```

La console scrive per esempio `[72, 118]` (cioè `0x48` e `0x76`).

## Errori

| Messaggio | Quando |
|---|---|
| Non hai il permesso di usare GPIO e I²C: chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) | Non hai il permesso per GPIO e I²C. |
| GPIO e I²C ci sono solo su Linux (per esempio un Raspberry Pi) | Il computer di lilOS non è Linux. |
| Manca il comando i2cget: installa i2c-tools (sudo apt install i2c-tools) | i2c-tools non c'è (lo stesso per gli altri comandi). |
| Indirizzo I²C non valido: … (da 3 a 119) | L'indirizzo è fuori da 0x03-0x77. |
| Registro non valido: … (da 0 a 255) | Lo stesso per **Bus** e i valori da scrivere. |
| I²C 0x48 non risponde: … | Il dispositivo non c'è o non risponde a quell'indirizzo. |
| I²C 0x48 non accetta la scrittura: … | La scrittura non è riuscita. |
| Dati I²C non validi: da 1 a 32 byte (numeri da 0 a 255) | La lista da scrivere non va. |
| Risposta di i2c non capita: … | Il programma ha risposto in un modo inatteso. |

## Vedi anche

- [GPIO (gpioget · gpioset)](hw.gpio)
- [Hardware](logicstudio-hardware)
