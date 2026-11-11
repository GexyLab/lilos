# speechSynthesis.speak (sintesi vocale)

`hw.speak` · Hardware · [Hardware](logicstudio-hardware) · versione 1

Legge un testo ad alta voce dagli altoparlanti del computer dove gira lilOS, con una delle voci del sistema.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **testo** (`text`) | testo | Il testo da leggere: ogni valore lo legge. |
| **parla** (`speak`) | impulso | Legge di nuovo l'ultimo **testo** (o il **Testo** delle impostazioni). Nascosto. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **finito** (`ended`) | impulso | La lettura è finita. |
| **Exception** (`error`) | oggetto | Testo vuoto o troppo lungo, voce che non c'è, manca un programma per la voce… |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Testo (quando «testo» non ne ha)** (`text`) | testo | vuoto | Il testo da leggere con **parla**. |
| **Voce (nome o lingua; vuoto: quella predefinita)** (`voice`) | testo | vuoto | Il nome di una voce, come lo dà [enumerateDevices (dispositivi audio)](hw.audioDevices), o una lingua (`it-IT`). |
| **Velocità (-10 … 10)** (`rate`) | da -10 a 10 | 0 | 0 è normale; negativa più lenta, positiva più veloce. |

## Come funziona

| Sistema | Voci | Con che cosa |
|---|---|---|
| Windows | quelle installate in Windows (Impostazioni → Ora e lingua → Voce) | System.Speech, da PowerShell |
| Linux | quelle di espeak-ng (`sudo apt install espeak-ng`); altrimenti Speech Dispatcher (`spd-say`) | espeak-ng |
| macOS | quelle del sistema | `say` |

Il testo arriva al programma della voce come dato (mai come comando): qualsiasi carattere va bene. Al massimo **2000 caratteri**. Il blocco non aspetta: **finito** arriva quando la lettura è finita. Al massimo 2 suoni o voci alla volta per utente.

## Esempi

### 1. Dire la temperatura

```
[SerialPort (porta seriale COM)] dati ──▶ temp [Template (formatta): "La temperatura è {temp} gradi"] testo ──▶ testo [speechSynthesis.speak (sintesi vocale): Microsoft Elsa Desktop]
```

### 2. Un promemoria

```
[Intervallo (setInterval): 3600 s] impulso ──▶ parla [speechSynthesis.speak (sintesi vocale): Testo «È ora di fare una pausa»]
```

Con l'ingresso **parla** mostrato nelle Proprietà, ogni ora il computer ti ricorda la pausa.

## Errori

| Messaggio | Quando |
|---|---|
| Non hai il permesso di usare l'audio (microfono, altoparlanti, voce): chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) | Non hai il permesso per l'audio. |
| Non c'è testo da leggere | Il testo è vuoto. |
| Testo troppo lungo da leggere: al massimo 2000 caratteri | Oltre 2000 caratteri. |
| La voce «Alice» non c'è (voci: Microsoft Elsa Desktop, Microsoft Zira Desktop) | Né il nome né la lingua sono tra le voci. |
| Velocità (da -10 a 10) non valido: … | Velocità fuori dai limiti. |
| Manca un programma per la voce: installa espeak-ng (sudo apt install espeak-ng) | Linux senza espeak-ng né spd-say. |
| Troppi suoni insieme: al massimo 2 alla volta | Suonano già 2 suoni o voci dei tuoi programmi. |
| La voce non parte: … | Il programma della voce ha dato errore. |

## Vedi anche

- [enumerateDevices (dispositivi audio)](hw.audioDevices), per le voci
- [play() (riproduci suono)](hw.play), [Tono · Beep](hw.tone)
- [Hardware](logicstudio-hardware)
