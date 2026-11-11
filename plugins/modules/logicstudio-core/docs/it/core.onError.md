# Catch globale (onerror)

`core.onError` · Eccezioni · [Blocchi di base](logicstudio-core) · versione 1

Riceve le eccezioni che **nessuno ha collegato**, come `window.onerror` o `process.on('uncaughtException')`: quelle dei blocchi la cui uscita **Exception** non va da nessuna parte. Senza questo blocco finiscono come righe rosse nella console principale.

## Ingressi

Nessuno: le eccezioni gliele consegna il motore.

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **exception** (`exception`) | oggetto | L'eccezione non gestita: `{ message, block, type, schema, at }`. |
| **messaggio** (`message`) | testo | Il suo messaggio. |

Il blocco non ha l'uscita **Exception**: un suo errore va sempre nella console principale, così non può girare in tondo.

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Cattura le exception di** (`scope`) | schema, programma | schema | **schema**: solo quelle dei blocchi del suo schema. **programma**: quelle di tutti gli schemi del progetto. |
| **Scrivile anche nella console principale** (`console`) | sì / no | no | Se è spuntata, l'eccezione arriva al blocco **e** scrive anche la sua riga rossa nella console principale. |

## Come funziona

- Un'eccezione va qui solo se l'uscita **Exception** del blocco che l'ha lanciata non è collegata. Se è collegata (per esempio a un [Catch (cattura)](core.catch)), il Catch globale non la vede.
- Con più Catch globali che la riguardano (per esempio uno di **schema** e uno di **programma**), l'eccezione arriva a **tutti**.
- La console principale riceve la riga rossa solo se nessun Catch globale riguarda quell'eccezione, oppure se almeno uno ha **Scrivile anche nella console principale** spuntata.
- Le eccezioni rilanciate da un [Throw](core.throw) senza collegamenti arrivano qui come le altre.

## Esempi

### 1. Una spia di errore per tutto il programma

```
[Catch globale (onerror): programma] messaggio ──▶ testo [Etichetta: ultimo errore]
                                     exception ──▶ acceso [Spia: errore]
```

Qualsiasi errore non gestito accende la [Spia](ui.lamp) e mostra il suo messaggio, in qualunque schema succeda.

### 2. Una notifica per gli errori di un programma attivo

```
[Catch globale (onerror): programma, anche in console] messaggio ──▶ testo [Notify: «Errore nel programma»]
```

Mentre il programma gira a lilOS chiuso, ogni errore non gestito ti arriva come notifica e resta anche nella console (e nel registro del progetto).

## Vedi anche

- [Catch (cattura)](core.catch), per le eccezioni di blocchi precisi
- [Dati di Exception (e.message…)](core.errorInfo)
- [Throw (lancia Exception)](core.throw)
- [Come funziona un blocco](ide/blocks)
