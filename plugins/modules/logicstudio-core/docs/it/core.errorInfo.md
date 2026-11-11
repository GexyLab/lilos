# Dati di Exception (e.message…)

`core.errorInfo` · Eccezioni · [Blocchi di base](logicstudio-core) · versione 1

Scompone un'eccezione nei suoi campi, come `e.message` in un `catch`: il messaggio, il blocco che l'ha lanciata, il suo tipo, lo schema e il momento.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **exception** (`exception`) | oggetto | L'eccezione: dall'uscita **Exception** di un blocco, da un [Catch (cattura)](core.catch) o da un [Catch globale (onerror)](core.onError). Un testo vale come un'eccezione con quel messaggio. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **messaggio** (`message`) | testo | Il messaggio, per esempio `Divisione per zero`. |
| **blocco** (`block`) | testo | L'id del blocco che l'ha lanciata, per esempio `b7` (vuoto se non si sa). |
| **tipo di blocco** (`type`) | testo | Il tipo di quel blocco, per esempio `core.divide` (vuoto se non si sa). |
| **schema** (`schema`) | testo | Lo schema in cui è successo (vuoto se non si sa). |
| **quando (ms)** (`at`) | numero | Il momento, in millisecondi dal 1970 (non esce se l'eccezione non lo ha). |
| **quando (ISO)** (`time`) | testo | Lo stesso momento come testo ISO, per esempio `2026-11-11T09:30:00.000Z`. |
| **Exception** (`error`) | oggetto | In pratica questo blocco non manda mai niente qui. |

## Come funziona

Il motore descrive ogni eccezione come `{ message, block, type, schema, at }` (il campo `type` dal motore 1.3.0). A ogni eccezione che arriva il blocco manda ogni campo sulla sua uscita. Un valore che non è un oggetto con `message` (un testo, un numero) diventa un'eccezione con solo il messaggio: le altre uscite mandano un testo vuoto, **quando** non esce.

## Esempi

### 1. Un registro degli errori in un file

```
[Catch globale (onerror): programma] exception ──▶ exception [Dati di Exception] quando (ISO) ──▶ ora     [Template (formatta): "{ora};{schema};{tipo};{msg}"] testo ──▶ contenuto [appendFile: ~/errori.csv]
                                                                                schema       ──▶ schema
                                                                                tipo di blocco ──▶ tipo
                                                                                messaggio    ──▶ msg
```

Ogni eccezione del programma che nessuno gestisce diventa una riga di `errori.csv`, per esempio `2026-11-11T09:30:00.000Z;principale;core.divide;Divisione per zero`. Le uscite partono nell'ordine della tabella, e **quando (ISO)** per ultima: sul [Template (formatta)](core.format) lascia «lo avvia» solo a **ora** (toglilo agli altri), così la riga parte una volta sola, con tutti i campi.

## Vedi anche

- [Catch (cattura)](core.catch)
- [Catch globale (onerror)](core.onError)
- [Get proprietà (obj.campo)](core.get), per leggere un solo campo
