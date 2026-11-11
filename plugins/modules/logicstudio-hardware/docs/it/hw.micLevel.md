# Livello microfono (dB)

`hw.micLevel` · Hardware · [Hardware](logicstudio-hardware) · versione 1

Misura quanto è forte il suono che arriva al microfono del computer dove gira lilOS, alcune volte al secondo, in decibel; avvisa quando passa una soglia. Non registra niente.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **acceso** (`on`) | sì/no | `true` comincia a misurare, `false` smette. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **livello (dB)** (`db`) | numero | Il livello medio (RMS) di ogni misura, da -120 (silenzio) a 0 (il massimo). |
| **picco (dB)** (`peak`) | numero | Il picco di ogni misura. Nascosto. |
| **sopra la soglia** (`over`) | sì/no | Cambia quando il livello passa sopra o sotto la **Soglia**. |
| **diventato forte** (`loud`) | impulso | Il livello è appena passato sopra la soglia. |
| **Exception** (`error`) | oggetto | Il microfono non c'è, ffmpeg manca, la misura si è fermata… |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Microfono (nome; vuoto: quello predefinito)** (`mic`) | testo | vuoto | Il microfono. |
| **Misure al secondo** (`hz`) | da 0,5 a 20 | 5 | Quante volte al secondo arriva il livello. |
| **Soglia (dB)** (`threshold`) | da -120 a 0 | -30 | |
| **Parte da solo** (`atStart`) | sì/no | no | Comincia a misurare quando parte il programma (o il suo gruppo). |

## Come funziona

Il kernel ascolta il microfono con **ffmpeg** e ne calcola il livello (filtro astats): il suono non viene salvato né mandato al programma, solo i numeri. I decibel sono «dBFS»: 0 è il suono più forte che il microfono registra, -120 il silenzio. Una stanza tranquilla sta di solito tra -60 e -45, una voce vicina tra -30 e -15; la soglia giusta dipende dal microfono: prova prima guardando **livello (dB)**.

Se il programma non fa in tempo, si tengono le ultime 50 misure.

## Esempi

### 1. Un indicatore del rumore

```
[Livello microfono (dB): Parte da solo, 5 al secondo] livello (dB) ──▶ valore [Indicatore: gauge1]
```

Con l'[Indicatore](ui.gauge) da -90 a 0.

### 2. Avvisare quando il bambino piange

```
[Livello microfono (dB): Parte da solo, soglia -25] diventato forte ──▶ valore [Debounce: 10 s] valore ──▶ invia [Notify: "Rumore nella cameretta"]
```

Il [Debounce](core.debounce) manda una notifica sola anche se il rumore continua.

## Errori

| Messaggio | Quando |
|---|---|
| Non hai il permesso di usare l'audio (microfono, altoparlanti, voce): chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) | Non hai il permesso per l'audio. |
| Manca ffmpeg: installalo sul computer dove gira lilOS (…), poi riavvia lilOS | ffmpeg non c'è. |
| Non c'è nessun microfono | Nessun microfono. |
| Il microfono «USB Mic» non c'è (microfoni presenti: …) | Il nome non è nell'elenco. |
| Il microfono «Microfono (Realtek(R) Audio)» si è fermato: … | ffmpeg si è fermato (microfono scollegato…). |
| Misure al secondo non valido: … (da 0.5 a 20) | Fuori dai limiti. |

## Vedi anche

- [MediaRecorder audio (registra audio)](hw.audioRecord), [enumerateDevices (dispositivi audio)](hw.audioDevices)
- [Hardware](logicstudio-hardware)
