# enumerateDevices (dispositivi audio)

`hw.audioDevices` · Hardware · [Hardware](logicstudio-hardware) · versione 1

Elenca i microfoni, gli altoparlanti e le voci della sintesi vocale del computer dove gira lilOS: i nomi da scrivere negli altri blocchi dell'audio.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **elenca** (`list`) | impulso | Legge gli elenchi adesso e li manda. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **microfoni** (`inputs`) | lista | `{ id, name }` per ogni microfono. |
| **altoparlanti** (`outputs`) | lista | `{ name }` per ogni uscita audio. |
| **voci** (`voices`) | lista | `{ name, lang }` per ogni voce, per esempio `{ "name": "Microsoft Elsa Desktop", "lang": "it-IT" }`. |
| **Exception** (`error`) | oggetto | Permesso mancante; un elenco che non si legge (per esempio i microfoni senza ffmpeg: gli altri elenchi arrivano lo stesso). |

## Come funziona

| | Windows | Linux | macOS |
|---|---|---|---|
| Microfoni | ffmpeg (DirectShow) | ffmpeg (PulseAudio, altrimenti ALSA) | ffmpeg (AVFoundation) |
| Altoparlanti | le schede audio del sistema | PulseAudio (`pactl`) o ALSA (`aplay -l`) | `system_profiler` |
| Voci | le voci di Windows (Impostazioni → Ora e lingua → Voce) | espeak-ng | `say` |

Gli altoparlanti sono solo informativi: i suoni vanno sempre all'**uscita predefinita** del sistema. I microfoni di Linux hanno un `id` come `pulse:alsa_input.pci-0000_00_1f.3.analog-stereo`; negli altri blocchi puoi scrivere l'`id` o il nome.

Senza ffmpeg l'elenco dei microfoni resta vuoto e su **Exception** arriva il messaggio con come installarlo; altoparlanti e voci arrivano comunque.

## Esempi

### 1. Le voci in una selezione

```
[All'avvio (main)] impulso ──▶ elenca [enumerateDevices (dispositivi audio)] voci ──▶ valore [Print (console.log)]
```

La console scrive le voci installate, con la lingua: scegline una per [speechSynthesis.speak (sintesi vocale)](hw.speak).

### 2. Una tabella dei microfoni

```
[Pulsante: Aggiorna] premuto ──▶ elenca [enumerateDevices (dispositivi audio)] microfoni ──▶ righe [Tabella: table1]
```

## Errori

| Messaggio | Quando |
|---|---|
| Non hai il permesso di usare l'audio (microfono, altoparlanti, voce): chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) | Non hai il permesso per l'audio. |
| Manca ffmpeg: installalo sul computer dove gira lilOS (…), poi riavvia lilOS | Solo i microfoni non si elencano. |

## Vedi anche

- [MediaRecorder audio (registra audio)](hw.audioRecord), [Livello microfono (dB)](hw.micLevel), [speechSynthesis.speak (sintesi vocale)](hw.speak)
- [Hardware](logicstudio-hardware)
