# Catch (cattura)

`core.catch` · Eccezioni · [Blocchi di base](logicstudio-core) · versione 1

Riceve le eccezioni dei blocchi e decide quali gestire, come `catch` nei linguaggi di programmazione. Quelle che corrispondono alla regola escono da **catturata** (con il loro messaggio); le altre da **non catturata**, per mandarle a un altro Catch o rilanciarle con [Throw](core.throw).

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **exception** (`exception`) | oggetto | Un'eccezione: collegaci l'uscita **Exception** di un blocco. Va bene anche un testo, che diventa un'eccezione con quel messaggio. |
| **a**, **b**, … (aggiunte) | oggetto | Altri ingressi come **exception**, da aggiungere nelle Proprietà (fino a 16) per raccogliere le eccezioni di più blocchi in un solo Catch. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **catturata** (`caught`) | oggetto | L'eccezione, se corrisponde alla regola: `{ message, block, type, schema, at }`. |
| **messaggio** (`message`) | testo | Il messaggio dell'eccezione catturata. |
| **non catturata** (`else`) | oggetto | L'eccezione, così com'è, se non corrisponde alla regola. |
| **Exception** (`error`) | oggetto | Un errore del Catch stesso: un'espressione regolare non valida. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Cattura** (`match`) | tutte, contiene, espressione, blocco, tipo | tutte | La regola (vedi sotto). |
| **Testo, espressione, id o tipo del blocco** (`pattern`) | un testo | vuoto | Cosa cercare; non c'è con **tutte**. |

## Come funziona

| Cattura | Corrisponde quando | Esempio di testo |
|---|---|---|
| **tutte** | sempre | — |
| **contiene** | il messaggio contiene il testo, senza badare alle maiuscole | `zero` cattura «Divisione per zero» |
| **espressione** | il messaggio corrisponde all'espressione regolare (senza badare alle maiuscole) | `^Il campo «.*» non esiste$` |
| **blocco** | l'eccezione viene dal blocco con quell'id | `b3` (l'id è nelle Proprietà del blocco) |
| **tipo** | l'eccezione viene da un blocco di quel tipo | `coll.get`, `net.request` |

Ogni eccezione che arriva, su qualsiasi ingresso, esce su **catturata** e **messaggio** oppure su **non catturata**: mai su tutte e due. Un'eccezione rilanciata da un [Throw](core.throw) con il messaggio vuoto tiene `block` e `type` del blocco che l'aveva lanciata per primo.

## Esempi

### 1. Un messaggio all'utente per un errore preciso

```
[Divisione (÷ %)] Exception ──▶ exception [Catch (cattura): contiene «zero»] messaggio ──▶ testo [Etichetta: avviso]
```

Con un divisore 0 l'etichetta mostra `Divisione per zero`; gli altri errori della divisione non toccano l'etichetta.

### 2. Una catena di Catch

```
[HTTP (fetch)] Exception ──▶ exception [Catch: contiene «timeout»] catturata ──▶ … riprova tra 10 s
                                                  non catturata ──▶ exception [Catch: tutte] messaggio ──▶ valore [Print (console.log): errore]
```

I tempi scaduti si riprovano; ogni altro errore finisce nella console.

## Errori

| Messaggio | Quando |
|---|---|
| Espressione non valida: … | **Cattura** = espressione e il testo non è un'espressione regolare valida (per esempio `(`). |

## Vedi anche

- [Throw (lancia Exception)](core.throw)
- [Dati di Exception (e.message…)](core.errorInfo)
- [Catch globale (onerror)](core.onError)
