# Argomenti (argv)

`core.args` · Programma · [Blocchi di base](logicstudio-core) · versione 1

Gli **argomenti della riga di comando** con cui è partito il programma: quelli scritti dopo il file in `lilos logic run FILE ARGOMENTI…`, o nel pulsante **Argomenti** dell'IDE per le prove. È come `process.argv` o `sys.argv`: tutti, così come sono arrivati, più una prima lettura delle opzioni con `-` e `--`.

Per leggere **una** opzione con precisione (con il suo nome corto e lungo, se vuole un valore, il tipo, se è obbligatoria) usa [Opzione (-x · --nome)](core.option).

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **invia** (`send`) | impulso | Nascosto di serie (si mostra con l'occhio nelle Proprietà). Se non è collegato, il blocco manda tutto **una volta, all'avvio**; se è collegato, manda a ogni impulso. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **tutti** (`all`) | lista | Gli argomenti così come sono arrivati, tutti testi: `["report.csv", "--verbose", "--port=8080"]`. |
| **opzioni** (`options`) | oggetto | Le opzioni lette (vedi sotto): `{"verbose": true, "port": 8080}`. |
| **posizionali** (`positional`) | lista | Gli argomenti che non sono opzioni né valori di opzioni: `["report.csv"]`. |
| **quanti** (`count`) | numero | Quanti sono gli argomenti. Nascosta di serie. |
| **Exception** (`error`) | oggetto | Come ogni blocco; qui non ci passa niente. |

## Impostazioni

| Impostazione | Valori | Predefinito | Cosa fa |
|---|---|---|---|
| **Opzioni senza valore** (`flags`) | nomi separati da virgola, senza trattini | vuoto | Le opzioni che sono solo interruttori: dopo di loro l'argomento seguente **non** è il loro valore. Per esempio `v, verbose`. |
| **I numeri come numeri** (`numbers`) | sì/no | sì | Un valore che è un numero (`8080`, `-3`, `2.5`, `1e3`) esce come numero; spento, tutto resta testo. Vale per le opzioni e per i posizionali, mai per **tutti**. |

## Come legge le opzioni

| Scritto così | Diventa |
|---|---|
| `--port=8080` | `port: 8080` |
| `--port 8080` | `port: 8080` (l'argomento dopo è il suo valore, se non comincia con `-`) |
| `--verbose` seguito da un'altra opzione o da niente | `verbose: true` |
| `--verbose report.csv`, con `verbose` tra le **Opzioni senza valore** | `verbose: true` e `report.csv` tra i posizionali |
| `--no-color` | `color: false` |
| `-v` | `v: true` (o il valore dopo, come per `--`) |
| `-abc` | `a: true, b: true` e `c` come `-c` (true, o il valore dopo) |
| `-n5`, `-n=5` | `n: 5` |
| `--tag a --tag b` | `tag: ["a", "b"]` (un'opzione data più volte diventa una lista) |
| `-3` | un posizionale (un numero negativo non è un'opzione) |
| `--` | tutto quello che segue è posizionale, anche se comincia con `-` |

Senza le **Opzioni senza valore**, `--verbose report.csv` legge `report.csv` come valore di `verbose`: è il modo in cui lo fanno quasi tutti i programmi che non sanno quali opzioni esistono. Elencale, oppure usa [Opzione](core.option), che lo sa.

I nomi `__proto__`, `constructor` e `prototype` non diventano mai opzioni.

## Come funziona

- Gli argomenti non cambiano mentre il programma gira: il blocco manda sempre gli stessi valori.
- Senza argomenti (il programma è partito dall'IDE senza **Argomenti**, da un'app o come programma attivo senza argomenti) esce una lista vuota, un oggetto vuoto e 0.
- Arrivano solo ai programmi avviati con degli argomenti: `lilos logic run` dalla riga di comando, `lilos logic run --active` per un programma attivo che li tiene anche dopo un riavvio, e le prove dell'IDE. Le app fatte con [Crea app](ide/create-app) e i programmi attivati dall'IDE partono senza.

## Esempi

### 1. Un file da elaborare e un'opzione

```
lilos logic run Documenti/report.lsch vendite.csv --separatore=";"

[Argomenti (argv)] posizionali ──▶ oggetto [Get proprietà (obj.campo): 0] valore ──▶ valore [Print (console.log)]
[Argomenti (argv)] opzioni     ──▶ oggetto [Get proprietà (obj.campo): separatore] valore ──▶ valore [Print (console.log)]
```

La console scrive `vendite.csv` e `;`.

### 2. Tutto quello che è arrivato

```
[Argomenti (argv)] tutti ──▶ valore [Print (console.log)]
```

Con `lilos logic run prova.lsch -v "un testo con spazi"` la console scrive `["-v","un testo con spazi"]`: le virgolette le toglie la shell, gli spazi restano dentro l'argomento.

## Errori

Nessuno: il blocco legge sempre qualcosa. Per le opzioni obbligatorie e i valori che devono essere numeri usa [Opzione](core.option), che dà un'Exception.

## Vedi anche

- [Opzione (-x · --nome)](core.option)
- [Exit (chiudi il programma · return)](core.exit)
- [Prova e programmi attivi](ide/run), per il pulsante **Argomenti**
- [I programmi](logicstudio-engine/programs), per `lilos logic run`
