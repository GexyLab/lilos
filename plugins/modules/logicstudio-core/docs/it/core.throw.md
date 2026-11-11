# Throw (lancia Exception)

`core.throw` · Eccezioni · [Blocchi di base](logicstudio-core) · versione 1

Lancia un'eccezione, come `throw` nei linguaggi di programmazione: quando arriva un valore, il blocco esce dalla sua porta **Exception** con un messaggio scelto da te. Se arriva un'eccezione, la **rilancia** così com'è.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **lancia** (`value`) | qualsiasi | Ogni valore che arriva fa lanciare l'eccezione. Il valore può entrare nel messaggio con `{value}`. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **Exception** (`error`) | oggetto | L'eccezione lanciata: `{ message, block, type, schema, at }`. È l'unica uscita del blocco. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Messaggio** (`message`) | un testo | vuoto | Il messaggio dell'eccezione. `{value}` è sostituito da ciò che arriva (per un'eccezione, dal suo messaggio). Vuoto: il messaggio è il valore stesso. |

## Come funziona

| Cosa arriva | Messaggio vuoto | Messaggio scritto |
|---|---|---|
| un valore qualsiasi (`42`, `"ciao"`, un oggetto) | nuova eccezione con il valore come testo (`42`, `ciao`, il JSON dell'oggetto) | nuova eccezione con il messaggio, `{value}` sostituito |
| un'eccezione (un oggetto con `message`) | la **stessa** eccezione, rilanciata così com'è: `block`, `type` e `schema` restano quelli del blocco che l'aveva lanciata per primo | nuova eccezione con il messaggio, `{value}` = il messaggio di quella arrivata |
| un valore vuoto (`""`) con messaggio vuoto | nuova eccezione con il messaggio `Errore` | — |

Una nuova eccezione ha `block` e `type` di questo blocco (`core.throw`). Come per ogni blocco, se a **Exception** non è collegato niente l'eccezione va al [Catch globale (onerror)](core.onError) dello schema, se c'è, altrimenti nella console principale. La porta **Exception** è nascosta di serie: mostrala con l'occhio nelle Proprietà per collegarla.

## Esempi

### 1. Un controllo che lancia un'eccezione

```
[Intervallo (setInterval): 60 s] impulso ──▶ leggi [readFile: ~/sensore.txt] contenuto ──▶ a [Confronto (== ≠ < >): a > b, b = 60] se vero ──▶ lancia [Throw: «Temperatura oltre 60 °C»]
```

Quando la temperatura supera 60, il Throw lancia `Temperatura oltre 60 °C`. Con un [Catch globale (onerror)](core.onError) nello schema la ricevi in un posto solo, insieme agli altri errori.

### 2. Rilanciare quello che un Catch non gestisce

```
[HTTP (fetch)] Exception ──▶ exception [Catch (cattura): contiene «timeout»] catturata     ──▶ … riprova
                                                                    non catturata ──▶ lancia [Throw]
```

Il [Catch (cattura)](core.catch) gestisce solo i tempi scaduti; tutte le altre eccezioni passano al Throw, che con il messaggio vuoto le rilancia così come sono.

## Errori

| Messaggio | Quando |
|---|---|
| quello scritto nelle impostazioni, o il valore arrivato | Sempre: è lo scopo del blocco. |

## Vedi anche

- [Catch (cattura)](core.catch) per gestire le eccezioni
- [Dati di Exception (e.message…)](core.errorInfo) per leggerne i campi
- [Catch globale (onerror)](core.onError) per le eccezioni che nessuno ha collegato
- [Come funziona un blocco](ide/blocks)
