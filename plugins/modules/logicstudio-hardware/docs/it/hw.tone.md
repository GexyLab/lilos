# Tono · Beep

`hw.tone` · Hardware · [Hardware](logicstudio-hardware) · versione 1

Fa un beep dagli altoparlanti del computer dove gira lilOS: un tono puro di una frequenza, una durata e un volume.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **suona** (`play`) | impulso | Suona il tono. |
| **frequenza (Hz)** (`hz`) | numero | Prende il posto di **Frequenza (Hz)**. Non avvia il blocco. Nascosto. |
| **secondi** (`seconds`) | numero | Prende il posto di **Durata (secondi)**. Non avvia il blocco. Nascosto. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **finito** (`ended`) | impulso | Il tono è finito. |
| **Exception** (`error`) | oggetto | Valori fuori dai limiti, nessuna uscita audio… |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Frequenza (Hz)** (`hz`) | da 20 a 20000 | 880 | 440 è il La; più alta, più acuto. |
| **Durata (secondi)** (`seconds`) | da 0,01 a 10 | 0,2 | |
| **Volume (0-1)** (`volume`) | da 0 a 1 | 0,5 | Rispetto al volume del sistema. |

## Come funziona

Il kernel prepara un file WAV con il tono (con un attacco e una chiusura di 5 millisecondi, per non fare «clic») e lo suona come [play() (riproduci suono)](hw.play), sull'uscita audio predefinita. Il blocco non aspetta: **finito** arriva quando il tono è finito. Al massimo 2 suoni alla volta per utente.

## Esempi

### 1. Un beep quando arriva un messaggio

```
[SerialPort (porta seriale COM)] dati ──▶ suona [Tono · Beep: 1000 Hz, 0,1 s]
```

### 2. Un allarme a due toni

```
[Pulsante: Allarme] premuto ──▶ suona [Tono · Beep: 880 Hz, 0,3 s] finito ──▶ suona [Tono · Beep: 660 Hz, 0,3 s]
```

Il secondo tono parte quando il primo è finito: «di-do».

## Errori

| Messaggio | Quando |
|---|---|
| Non hai il permesso di usare l'audio (microfono, altoparlanti, voce): chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) | Non hai il permesso per l'audio. |
| Frequenza (Hz) non valido: 5 (da 20 a 20000) | Lo stesso per **Durata (secondi)** (da 0.01 a 10) e **Volume (da 0 a 1)**. |
| Troppi suoni insieme: al massimo 2 alla volta | Suonano già 2 suoni o voci dei tuoi programmi. |
| Il suono non si sente: … | Il programma del sistema ha dato errore (nessuna uscita audio…). |

## Vedi anche

- [play() (riproduci suono)](hw.play), [speechSynthesis.speak (sintesi vocale)](hw.speak)
- [Hardware](logicstudio-hardware)
