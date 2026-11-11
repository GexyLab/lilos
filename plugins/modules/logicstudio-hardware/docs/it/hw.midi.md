# MIDI ingresso · uscita

`hw.midi` · Hardware · [Hardware](logicstudio-hardware) · versione 1

Collega un programma agli strumenti MIDI del computer dove gira lilOS: riceve note, controlli (manopole, pedali) e cambi di programma da una tastiera o da un controller, e manda messaggi a un sintetizzatore o a un'altra porta.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **apri** (`open`) | impulso | Apre le porte scelte nelle impostazioni (di ingresso, di uscita o tutte e due). |
| **chiudi** (`close`) | impulso | Chiude le porte. |
| **invia** (`send`) | qualsiasi | Manda un messaggio (o una lista di messaggi) alla porta di uscita: vedi sotto. |
| **elenca porte** (`list`) | impulso | Manda su **porte** le porte MIDI del computer. Nascosto. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **messaggio** (`message`) | oggetto | Ogni messaggio ricevuto (vedi sotto). |
| **nota** (`note`) | oggetto | Solo le note (`noteon`, `noteoff`). |
| **controllo (CC)** (`cc`) | oggetto | Solo i controlli. |
| **cambio programma** (`program`) | oggetto | Solo i cambi di programma. Nascosto. |
| **porte** (`ports`) | oggetto | `{ inputs: [nomi], outputs: [nomi] }`. Nascosto. |
| **aperto** (`opened`) | impulso | Le porte si sono aperte. |
| **chiuso** (`closed`) | impulso | Le porte si sono chiuse. |
| **Exception** (`error`) | oggetto | Una porta non c'è, è usata da un altro programma, un messaggio da mandare non va… |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Porta di ingresso (nome; vuoto: nessuna)** (`input`) | testo | vuoto | Il nome esatto della porta da cui ricevere. |
| **Porta di uscita (nome; vuoto: nessuna)** (`output`) | testo | vuoto | Il nome esatto della porta a cui mandare. |
| **Solo il canale (0 = tutti)** (`channel`) | da 0 a 16 | 0 | Riceve solo i messaggi di quel canale; è anche il canale dei messaggi mandati senza canale. |
| **Apri all'avvio** (`atStart`) | sì/no | no | Apre le porte quando parte il programma (o il suo gruppo). |

## Come funziona

I nomi delle porte si leggono con **elenca porte** (per esempio `Microsoft GS Wavetable Synth`, il sintetizzatore di Windows). Una porta di ingresso aperta da un programma non si apre da un altro finché resta aperta.

I messaggi sono oggetti, con il canale da 1 a 16:

| Messaggio | Oggetto |
|---|---|
| Nota premuta | `{ "type": "noteon", "channel": 1, "note": 60, "velocity": 100 }` |
| Nota lasciata | `{ "type": "noteoff", "channel": 1, "note": 60, "velocity": 0 }` (anche una `noteon` con velocity 0) |
| Controllo | `{ "type": "cc", "channel": 1, "controller": 7, "value": 127 }` |
| Cambio di programma | `{ "type": "program", "channel": 1, "program": 5 }` |
| Pitch bend | `{ "type": "pitchbend", "channel": 1, "value": 0 }` (da -8192 a 8191) |
| Aftertouch | `{ "type": "aftertouch", "channel": 1, "value": 64 }`, `{ "type": "polyaftertouch", "channel": 1, "note": 60, "value": 64 }` |

Su **invia** puoi mandare uno di questi oggetti (senza **velocity** una `noteon` ha 100), una lista di oggetti (al massimo 64), o i byte del messaggio (`[144, 60, 100]`). I messaggi System Exclusive, il clock e l'active sensing non si ricevono e non si mandano.

La nota 60 è il Do centrale; ogni numero in più è un semitono.

## Esempi

### 1. Una tastiera MIDI che accende una spia

```
[MIDI ingresso · uscita: ingresso «USB Keyboard», Apri all'avvio] nota ──▶ oggetto [Get proprietà (obj.campo): type] valore ──▶ a [Confronto (== ≠ < >): a == b] risultato ──▶ accesa [Spia: lamp1]
                                                                                                         [Costante · Variabile: "noteon"] valore ──▶ b
```

La [Spia](ui.lamp) resta accesa finché tieni premuto un tasto.

### 2. Suonare una nota con un pulsante

```
[Pulsante: Do] premuto ──▶ invia [Costante · Variabile: JSON {"type": "noteon", "note": 60}] valore ──▶ invia [MIDI ingresso · uscita: uscita «Microsoft GS Wavetable Synth», Apri all'avvio]
```

Per fermare la nota manda poi `{"type": "noteoff", "note": 60}`.

## Errori

| Messaggio | Quando |
|---|---|
| Non hai il permesso di usare i dispositivi MIDI: chiedi a un amministratore (Pannello di controllo → Logic Studio → Hardware) | Non hai il permesso per il MIDI. |
| Scegli una porta MIDI di ingresso o di uscita nelle Proprietà | Nessuna porta nelle impostazioni. |
| La porta MIDI di ingresso «USB Keyboard» non c'è (porte: …) | Il nome non è tra le porte (lo stesso per l'uscita). |
| La porta MIDI «USB Keyboard» non si apre: … | Il sistema rifiuta l'apertura (su Windows una porta di ingresso è usata da un'altra applicazione). |
| «MIDI USB Keyboard» è già in uso da un altro programma | La porta di ingresso è aperta da un altro programma. |
| La porta MIDI di uscita non è aperta: scrivila nelle Proprietà e manda un impulso ad «apri» | Un messaggio su **invia** senza porta di uscita aperta. |
| Messaggio MIDI non valido: serve un oggetto { type, channel, … } o una lista di byte | Il valore su **invia** non è un messaggio. |
| Tipo del messaggio MIDI non valido: … | `type` sconosciuto. |
| Nota non valido: 200 (da 0 a 127) | Un numero fuori dai limiti (lo stesso per gli altri campi). |
| Messaggio MIDI non valido: il primo byte è lo stato (da 128), niente System Exclusive | Byte non validi. |
| Troppi messaggi MIDI in una volta (al massimo 64) | Una lista più lunga. |
| La libreria @julusian/midi non funziona su questo computer: … | La libreria non si carica. |

## Vedi anche

- [Hardware](logicstudio-hardware)
