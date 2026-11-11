# Scrivere un pacchetto

`logicstudio-engine` · [Logic Studio Engine](logicstudio-engine) · per chi scrive codice

Un **pacchetto** porta a Logic Studio blocchi nuovi, Componenti UI nuove per le finestre, le **azioni** che i suoi blocchi chiedono al kernel e la sua documentazione. È un normale modulo del kernel di lilOS che, quando parte, si presenta al motore con `register()`.

Questa pagina è per chi scrive il codice di un pacchetto. Alla fine c'è un pacchetto completo da copiare.

## Come è fatto

```
logicstudio-esempio/
  module.json          il modulo del kernel
  index.js             si registra presso il motore (e definisce le azioni)
  blocks.js            i blocchi: girano nel worker di ogni utente
  components.js        le Componenti UI: girano nel browser
  docs/
    it/
      index.md         la pagina del pacchetto
      esempio.media.md la pagina di un blocco (il nome è il tipo)
      come-iniziare.md un'altra pagina
    en/
      index.md
```

Tutti i file tranne `module.json` e `index.js` sono facoltativi: un pacchetto può avere solo blocchi, solo componenti, solo azioni.

Dove gira ogni parte:

| File | Dove gira | Cosa può usare |
|---|---|---|
| `index.js` e le **azioni** | Nel thread principale del kernel | Tutto il kernel, i servizi (`ctx.service('fs')`…), Node |
| `blocks.js` | Nel **worker** di ogni utente; il thread principale lo importa solo per leggere le definizioni | Solo quello che gli dà il motore (il contesto `b`). Niente variabili d'ambiente |
| `components.js` | Nel **browser** (lilOS e l'IDE); il kernel lo importa solo per leggere le definizioni | Solo quello che gli passa `render(el, c)`: non può importare niente |

## module.json

Il pacchetto **richiede** il servizio `logicstudio` (così parte dopo il motore) e **dipende** dal motore e dai blocchi di base (così l'AppStore li installa insieme):

```json
{
  "name": "logicstudio-esempio",
  "version": "1.0.0",
  "description": "Logic Studio: blocchi di esempio",
  "icon": { "glyph": "chip", "color": "#2da44e" },
  "kernel": "1",
  "provides": ["logicblock.esempio"],
  "requires": ["logicstudio"],
  "dependencies": [
    { "module": "logicstudio-engine", "reason": "Il motore che fa girare i blocchi" },
    { "module": "logicstudio-core", "reason": "I blocchi di base, che servono insieme a questi" }
  ]
}
```

Il nome che comincia con `logicstudio-` è solo un'abitudine: il motore non cerca i moduli per nome. Un modulo che non chiama `register()` non è un pacchetto.

## register()

```js
const handle = await ctx.service('logicstudio').register({
  name, version, label, blocks, components, actions, docs,
});
// …e quando il modulo si ferma:
handle.unregister();
```

| Campo | Obbligatorio | Cosa è |
|---|---|---|
| `name` | Sì | Il nome del pacchetto: `[a-z][a-z0-9-]{0,40}`. Usa `ctx.name`, il nome del modulo: è anche il nome con cui l'IDE apre la sua documentazione |
| `version` | No | La versione, come testo (di serie `0.0.0`). Usa `ctx.version`: il motore importa i file con `?v=<versione>`, quindi una versione nuova carica il codice nuovo |
| `label` | No | Il nome da mostrare: `{ en, it }` (le altre lingue sono ignorate) o un testo. Di serie è `name` |
| `blocks` | No | Il **percorso assoluto** di `blocks.js` |
| `components` | No | Il **percorso assoluto** di `components.js` |
| `actions` | No | Un oggetto `{ 'chiave': async (user, args, tools) => risultato }` |
| `docs` | No | Il **percorso assoluto** della cartella `docs` |

`register()` ritorna `{ unregister() }`: chiamalo nello `stop()` del modulo, così i blocchi spariscono dal catalogo quando il modulo si ferma.

Ogni registrazione fa riprovare, mezzo secondo dopo, i programmi attivi che aspettavano un pacchetto.

### Quando register() rifiuta

`register()` lancia un errore (e il modulo non parte) in questi casi:

| Messaggio | Perché |
|---|---|
| Pacchetto di Logic Studio senza nome valido: … | `name` non va bene |
| logicstudio-esempio: il file dei blocchi deve essere un percorso assoluto | `blocks` è relativo |
| logicstudio-esempio: il file delle componenti deve essere un percorso assoluto | `components` è relativo |
| logicstudio-esempio: la cartella della documentazione deve essere un percorso assoluto | `docs` è relativo |

Lancia anche se `blocks.js` o `components.js` non si importano (un errore di sintassi, un `import` che non c'è).

Un **singolo** blocco o componente che non va bene, invece, è scartato con un avviso nel log del kernel, e gli altri restano:

| Avviso nel log | Perché |
|---|---|
| logicstudio-esempio: blocco esempio.x scartato: non è un oggetto | La voce della lista non è un oggetto |
| … scartato: tipo non valido (pacchetto.nome) | `type` non è `pacchetto.nome` |
| … scartato: versione non valida | `version` non è un intero da 1 in su |
| … scartato: porta non valida: error | Un nome di porta non va bene, o è `error` |
| … scartato: porta ripetuta: a | Due porte con lo stesso nome dalla stessa parte |
| … scartato: tipo non valido: numero | Il tipo di una porta non è uno di quelli elencati sotto |
| … scartato: grow.inputs.max non valido | Vedi **grow** più sotto (anche `grow.lati non valido`, `grow.inputs.type non valido`, `grow.inputs.name non valido`) |
| … scartato: un blocco «loop» deve avere step() | `execution: 'loop'` senza `step` |
| logicstudio-esempio: componente esempio.x scartata: manca render() | Una componente senza `render` |
| logicstudio-esempio: blocco esempio.x già dato da un altro pacchetto: scartato | Il tipo c'è già, in un pacchetto registrato prima |

Quando tutto va bene il log dice: `Logic Studio: pacchetto logicstudio-esempio 1.0.0 (5 blocchi, 1 componenti)`.

## I blocchi: blocks.js

`blocks.js` esporta `blocks`, una lista di definizioni. **Niente deve girare quando il file viene importato**: il thread principale del kernel lo importa solo per leggere le definizioni, poi ogni worker lo importa di nuovo per usarle.

### La definizione di un blocco

| Campo | Cosa è |
|---|---|
| `type` | `pacchetto.nome`: `[a-z][a-z0-9]*\.[a-zA-Z][a-zA-Z0-9]{0,40}`, per esempio `esempio.media`. Unico fra tutti i pacchetti |
| `version` | Un intero da 1. Alzalo quando cambi il comportamento o le impostazioni (vedi **upgrade**) |
| `category` | Dove sta nella scheda **Blocchi**: `value` (Valori), `logic` (Logica), `math` (Matematica), `text` (Testo), `object` (Oggetti), `list` (Liste), `matrix` (Matrici), `units` (Unità di misura), `geometry` (Geometria: piana e solida), `trig` (Trigonometria), `functions` (Funzioni), `integrals` (Integrali), `analysis` (Analisi numerica), `signal` (Segnali), `time` (Tempo), `console` (Console), `schema` (Porte di schema), `ui` (Componenti UI), `lilos` (lilOS), `net` (Rete), `hardware` (Hardware), `db` (Database), `exception` (Eccezioni). Un'altra parola, o niente: **Altro** |
| `icon` | Il nome di un'icona di lilOS (`calculator`, `bell`, `globe`, `clock`, `lamp`…). Di serie `blocks` |
| `label` | Il nome del blocco: `{ en, it }` |
| `description` | Facoltativa: una frase `{ en, it }` |
| `inputs`, `outputs` | Le porte (vedi sotto) |
| `config` | Le impostazioni, mostrate nelle **Proprietà** (vedi sotto) |
| `grow` | Le porte che l'utente può aggiungere (vedi sotto) |
| `execution` | `'run'` (di serie) o `'loop'` (il blocco gira da solo con `step()`) |
| `start(b)` | Facoltativa: all'avvio del programma |
| `run(inputs, b)` | Facoltativa: quando arriva un valore a un ingresso che lo avvia |
| `step(inputs, b)` | Solo per `execution: 'loop'` |
| `stop(b)` | Facoltativa: quando il programma si ferma |
| `upgrade(config, from, added)` | Facoltativa: aggiorna le impostazioni salvate da una versione vecchia del blocco |
| `role` | Riservato ai blocchi di base (`schemaIn`, `schemaOut`, `component`, `catchAll`): non usarlo |
| `showError` | `true`: l'uscita **Exception** si vede nel disegno da subito, invece di essere nascosta di serie (dal motore 1.4.1 e lilOS 1.44.0). Per i blocchi il cui scopo è proprio lanciare eccezioni, come [Throw](core.throw) |
| `obsolete` | Un'etichetta `{ en, it }` (o `true`) per un blocco sostituito da altri. Il motore lo esegue ancora negli schemi già salvati (dal motore 1.8.0), il catalogo lo dà come `obsolete`, l'IDE (dal 1.17.0) non lo mostra nell'elenco **Blocchi** e scrive il testo nel pannello **Proprietà**. Per esempio `core.convert`, sostituito da [Cast in numero (Number())](core.toNumber) e dagli altri quattro Cast |

Un blocco senza `run` tiene i valori che riceve e non fa altro (serve, per esempio, a un blocco `loop` che li legge a ogni giro).

### Le porte

Una porta è `{ name, type, label, trigger }`:

- `name`: `[a-zA-Z][a-zA-Z0-9]{0,30}`, unico dalla sua parte. **Mai `error`**: ogni blocco ha già l'uscita **Exception**, che si chiama così.
- `type`: uno di questi. Il tipo serve all'IDE per segnalare i collegamenti tra tipi che non vanno d'accordo; il motore non converte niente, quindi il blocco deve controllare quello che riceve.

| `type` | Nell'IDE | Valore tipico |
|---|---|---|
| `number` | numero | `12.5` |
| `bool` | sì/no | `true` |
| `text` | testo | `"ciao"` |
| `object` | oggetto | `{ "nome": "Ada" }` |
| `list` | lista | `[1, 2, 3]` |
| `matrix` | matrice | `[[1, 2], [3, 4]]` |
| `any` | qualsiasi | qualunque valore |
| `pulse` | impulso | `true` (conta solo che arrivi) |

- `label`: il nome mostrato, `{ en, it }`. Senza, l'IDE mostra `name`.
- `trigger: false` (solo ingressi): l'ingresso tiene il valore ma **non avvia** il blocco. L'utente può cambiarlo nelle Proprietà (**lo avvia**).
- `hidden: true`: la porta è **nascosta di serie** nel disegno; l'utente la mostra con l'occhio nelle Proprietà (dal motore 1.2.0 e lilOS 1.41.0). Serve alle porte che si usano di rado, come **invia** e **imposta** di [Costante · Variabile](core.value). Una porta collegata si vede sempre.

L'utente può dare a ogni ingresso un **valore iniziale**, che il motore manda all'avvio. Vedi [Come funziona un blocco](ide/blocks).

### Le impostazioni: config

`config` è una lista: `{ key, type, default, label, options, min, max, step, when }`.

| `type` | Nelle Proprietà | Valore in `b.config` |
|---|---|---|
| `text` | Un campo di testo (al massimo 2000 caratteri) | Testo |
| `number` | Un campo numerico | Numero, **o `null`** se l'utente svuota il campo |
| `select` | Una scelta tra `options`: testi, o `{ value, label: { en, it } }` | Il `value` scelto |
| `checkbox` | Una casella | `true` / `false` |
| `console` | La scelta di una console del progetto | L'id della console (`'main'` di serie) |
| `json` | Un campo per un valore JSON | Il valore (o il testo, se non è JSON valido) |
| `code` | Un testo su più righe, a caratteri fissi (una query SQL, un filtro…; al massimo `maxLength`, 20000 di serie) | Testo |
| `secret` | Una password: quello che si scrive non si vede e non torna mai indietro; il motore lo **cifra** per l'utente su questo lilOS (motore 1.7.0) | Il testo cifrato `ls1:…` (o `''`): aprilo nell'azione con `tools.secret(testo)`, mai nel worker |

- `default` è il valore di partenza: `b.config` ha sempre i predefiniti, coperti da quello che l'utente ha scelto.
- `min`, `max` e `step` valgono solo per il campo dell'IDE: il motore **non** li controlla. Controlla tu i valori in `run`.
- `when: { chiave: valore }` (o `{ chiave: [valori] }`) mostra l'impostazione solo quando un'altra ha quel valore.
- Le impostazioni di un blocco salvate in uno schema sono al massimo 64 KB.

### Le porte aggiunte: grow

`grow` dice quante porte l'utente può aggiungere al blocco, dalla barra **Proprietà**:

```js
grow: {
  inputs: { type: 'number', max: 8, name: 'letter' },
  outputs: { type: 'any', max: 4, name: 'user', label: { en: 'output', it: 'uscita' } },
}
```

| Campo | Cosa è |
|---|---|
| `max` | Quante, da 1 a 64. Conta anche il limite **Porte aggiunte per blocco** (32 di serie): vale il più piccolo |
| `type` | Il tipo delle porte aggiunte |
| `name` | Come si chiamano: `'letter'` (la prima lettera libera: **c**, **d**…), `'number'` (il numero che segue le porte del blocco) o `'user'` (`label` più un numero, e l'utente può cambiarlo) |
| `label` | Per `'user'`: la base del nome, `{ en, it }` |

Le porte aggiunte hanno un id fisso (`x1`, `x2`…) e un nome mostrato. Nel codice le trovi così:

- in `inputs`, per id: `inputs.x1`;
- in `b.added.inputs`: `[{ id: 'x1', name: 'c', value: 4 }, …]`, nell'ordine scelto dall'utente;
- in `b.added.outputs`: `[{ id: 'x2', name: 'uscita 1' }, …]`; per mandare un valore usa l'id: `b.send('x2', valore)` o `return { x2: valore }`.

### Come gira un blocco

- **`start(b)`** gira all'avvio del programma, per ogni blocco, prima dei valori iniziali degli ingressi. Può mandare valori con `b.send`.
- **`run(inputs, b)`** gira ogni volta che arriva un valore su un ingresso che avvia il blocco. `inputs` ha l'ultimo valore di ogni ingresso (anche quelli aggiunti, per id); `b.trigger` è il nome dell'ingresso che l'ha avviato. Ritorna un oggetto `{ porta: valore }` con le uscite da mandare, oppure niente. Un valore `undefined` non viene mandato; un impulso è `true`. Può essere `async`.
- Un blocco tratta **un valore alla volta**: finché `run` non finisce, i valori nuovi aspettano in fila. Blocchi diversi vanno avanti ognuno per conto suo.
- Quello che `run` (o `start`, o `step`, o un timer) **lancia** esce dall'uscita **Exception** del blocco come `{ message, block, type, schema, at }`. Se Exception non è collegata, va nella console principale: «Media: Serve un numero». Scrivi messaggi per chi usa il blocco, in italiano semplice.
- Un `run` che dura più di **Tempo massimo di un blocco** (30 secondi di serie) non è più aspettato: su Exception esce «Media ha impiegato più di 30 s» e il blocco passa al valore dopo. Il codice di quel `run` però va avanti fino alla fine: quello che ritorna è ignorato, ma i `b.send` che fa nel frattempo partono ancora. Il tempo comprende le attese (`await b.call(…)`, `await b.console.read(…)`).
- **`stop(b)`** gira quando il programma si ferma, con al massimo 2 secondi. Gli errori sono ignorati. I timer del blocco sono già fermi e `b.send` non manda più niente.
- I valori **non sono copiati** passando da un blocco all'altro: non cambiare mai un oggetto o una lista che ricevi. Fanne una copia: `const lista = [...inputs.lista]`.

### I blocchi «loop»: execution e step()

Un blocco con `execution: 'loop'` gira da solo, senza aspettare valori: il motore chiama `step(inputs, b)` subito dopo l'avvio e poi di nuovo dopo l'attesa che `step` chiede.

`step` ritorna `{ outputs, wait, done }`:

| Campo | Cosa è |
|---|---|
| `outputs` | `{ porta: valore }`: le uscite da mandare a questo giro |
| `wait` | Quanti millisecondi aspettare prima del giro dopo (almeno 10; di serie 10) |
| `done` | `true`: il blocco smette di girare (fino al prossimo avvio del programma) |

- `inputs` ha l'ultimo valore di ogni ingresso; `b.trigger` non c'è.
- Ogni giro conta nelle **esecuzioni in 10 secondi** del programma: un `wait` di 10 ms fa 1000 giri in 10 secondi.
- Se `step` lancia, l'errore esce da **Exception** e il giro dopo parte dopo 10 ms. Se l'errore si ripete, controlla tu e ritorna un `wait` più lungo.
- Il blocco può avere anche `run`, per reagire agli ingressi; senza `run`, gli ingressi tengono solo il valore.

### Le versioni: upgrade()

Ogni blocco in uno schema ricorda la versione con cui è stato salvato. Quando il programma parte e quella versione è più vecchia di `version`, il motore chiama:

```js
upgrade(config, from, added)   // → le impostazioni nuove, o { config: le impostazioni nuove }
```

- `config` è una copia delle impostazioni salvate, `from` la versione con cui sono state salvate, `added` una copia delle porte aggiunte.
- Ritorna le impostazioni per la versione di adesso. Le porte aggiunte non si possono cambiare.
- Gira nel thread principale, quando il programma parte; il file dello schema non viene riscritto.
- Se lancia, il programma non parte: «Il blocco Lampeggia non si aggiorna dalla versione 1: …».

### Il contesto b

`b` è il secondo argomento di `run` e `step`, e l'unico di `start` e `stop`.

| Membro | Cosa è |
|---|---|
| `b.id` | L'id del blocco nello schema |
| `b.schema` | Il nome dello schema |
| `b.config` | Le impostazioni, con i predefiniti |
| `b.lang` | La lingua del programma (quella di chi l'ha fatto partire): `'it'`, `'en'`… |
| `b.trigger` | Solo in `run`: il nome dell'ingresso che ha avviato il blocco |
| `b.added` | Le porte aggiunte: `{ inputs: [{ id, name, value }], outputs: [{ id, name }] }` |
| `b.memory()` | Un oggetto tuo, sempre lo stesso per questo blocco, che dura quanto il programma. Si svuota quando il programma riparte |
| `b.linked(porta)` | `true` se nello schema c'è un collegamento verso quell'ingresso del blocco (dal motore 1.2.0). Per un ingresso facoltativo che cambia il comportamento solo se usato: [Costante · Variabile](core.value) manda il valore all'avvio se **invia** non è collegato. Un valore iniziale dato all'ingresso non conta come collegamento |
| `b.send(porta, valore)` | Manda subito un valore su un'uscita (anche aggiunta, per id), senza aspettare la fine di `run`. Utile nei timer e per mandare più valori di fila. `undefined` non viene mandato; dopo l'arresto non manda niente |
| `b.setTimeout(fn, ms)` | Un timer che chiama `fn` una volta. Ritorna il timer |
| `b.setInterval(fn, ms)` | Un timer che chiama `fn` ogni `ms` (almeno 10). Ritorna il timer |
| `b.clearTimer(timer)` | Ferma un timer del blocco (anche `null`: non fa niente) |
| `b.call(azione, args)` | Chiede al kernel un'azione di un pacchetto, come l'utente. Ritorna una `Promise` con il risultato; se l'azione lancia, rifiuta con un `Error` con lo stesso messaggio |
| `b.console.write(console, testo, livello)` | Scrive una riga. `livello`: `'normal'` (di serie), `'info'`, `'warning'`, `'error'` |
| `b.console.clear(console)` | Svuota una console |
| `b.console.read(console, opzioni)` | Fa una domanda e aspetta: `{ value }` oppure `{ cancelled: true, reason }` |
| `b.ui(porta, valore)`, `b.exportPort(porta, valore)` | Riservati ai blocchi di base (l'oggetto di una componente, l'Uscita di schema) |
| `b.now()` | L'ora, come `Date.now()` |
| `b.limits` | I limiti che un blocco può leggere: `signalSamples`, i campioni al massimo di un segnale (Pannello di controllo → Logic Studio → Limiti; dal motore 1.5.0, prima manca) |
| `b.args` | Gli argomenti del programma, una lista bloccata di testi: quelli scritti dopo il file in `lilos logic run FILE ARGOMENTI…`, o nel pulsante **Argomenti** dell'IDE per le prove; vuota se il programma è partito senza (dal motore 1.6.0, prima manca). Vedi [Argomenti (argv)](core.args) |
| `b.exit(valore)` | Chiude tutto il programma con quel valore (copiato come JSON): il motore lo ferma e il programma ha `result: { value, at }`; conta solo la prima chiamata. Vedi [Exit](core.exit) e [I programmi](logicstudio-engine/programs) (dal motore 1.6.0) |
| `b.signal` | Un `AbortSignal` che scatta quando il programma si ferma |

I timer del motore si fermano da soli quando il programma si ferma. Quello che un timer lancia esce da **Exception**. Non usare `setTimeout` e `setInterval` di Node: non si fermerebbero con il programma.

Le opzioni di `b.console.read`:

| Opzione | Cosa è |
|---|---|
| `prompt` | La domanda (al massimo 500 caratteri) |
| `kind` | `'text'` (di serie), `'number'`, `'bool'`, `'key'` |
| `secret` | `true`: la risposta si vede come pallini |
| `retry` | `false`: una risposta che non va bene annulla la domanda invece di ripeterla |
| `fallback` | Il valore da usare quando le console non si vedono fuori dall'IDE (**Non mostrarle**) |
| `timeoutMs` | Dopo quanti millisecondi annullare la domanda (0: mai) |

`reason` vale `'timeout'`, `'cancel'` (Esc), `'invalid'` (risposta sbagliata senza `retry`) o `'stop'` (il programma si è fermato); può mancare quando le console non si vedono e non c'è `fallback`. Ricorda che anche l'attesa della risposta conta nel **Tempo massimo di un blocco**.

```js
async run(inputs, b) {
  const r = await b.console.read(b.config.console, { prompt: 'Quanti pezzi?', kind: 'number', timeoutMs: 20000 });
  if (r.cancelled) return { cancelled: true };
  await b.console.write(b.config.console, `Ok, ${r.value} pezzi`, 'info');
  return { value: r.value };
}
```

## Le azioni

Il worker di un utente non vede i file e non dovrebbe andare in rete da solo. Quando un blocco ha bisogno di qualcosa di fuori, chiama un'**azione** con `b.call('chiave', args)`. L'azione è una funzione del pacchetto, data a `register()`, che gira nel **thread principale del kernel**:

```js
actions: {
  'esempio.saluta': async (user, args, tools) => ({ text: `Ciao ${user.name}` }),
}
```

| Argomento | Cosa è |
|---|---|
| `user` | `{ kind: 'user', id, username, name, role }`: l'utente proprietario del programma, com'era quando l'ha fatto partire. **Passalo ai servizi del kernel** (`fs`, `notifications`…), che applicano i suoi permessi e le sue quote. Non usare mai il principale del kernel |
| `args` | Quello che il blocco ha passato, copiato come JSON |
| `tools.program` | `{ id, name, kind }` del programma |
| `tools.signal` | Un `AbortSignal` che scatta quando il programma si ferma: passalo a una richiesta lunga |
| `tools.countNet()` | Conta una richiesta di rete nella quota dell'utente; lancia «Troppe richieste di rete: hai finito la quota di questo minuto» se è finita. Chiamalo **prima di ogni** richiesta (anche dei reindirizzamenti) |
| `tools.emit(evento, dati)` | Manda un evento alle pagine di lilOS dell'utente |
| `tools.secret(testo)` | (motore 1.7.0) Apre un'impostazione `secret` del blocco (`ls1:…`) per il proprietario del programma: una promessa con il testo in chiaro. Lancia «Password non leggibile: va inserita di nuovo nelle Proprietà del blocco (…)» se è stata cifrata da un altro utente o su un altro lilOS. Non mettere mai il testo in chiaro in un errore o in un registro |

Regole:

- La chiave è `[a-z][a-z0-9]*\.[a-zA-Z][\w.]{0,60}`; usa il prefisso del tuo pacchetto (`esempio.…`). Se due pacchetti danno la stessa chiave, vince quello registrato prima. Una chiave che non va bene è ignorata senza avviso.
- Un blocco che chiama un'azione che non c'è riceve «Azione sconosciuta: esempio.x».
- Il risultato è copiato come JSON: niente funzioni, le date diventano testi.
- Quello che l'azione lancia arriva al blocco come `Error` con il messaggio (`err.text`, o `err.message`). Lo leggerà l'utente: scrivilo per lui e non metterci segreti.
- Chiedi i servizi quando servono, dentro l'azione (`ctx.service('fs')`), non in `init`: il kernel li avvolge con le sue guardie dopo che tutti i moduli sono partiti.
- Un'azione chiamata quando il programma si è già fermato riceve «Il programma non è in esecuzione».
- Controlla sempre `args`: arrivano da un programma dell'utente, e l'utente può scrivere quello che vuole nelle impostazioni dei blocchi.

## Le componenti: components.js

`components.js` esporta `components`, una lista di definizioni, e se vuoi `styles`, un testo CSS che lilOS mette una volta nella pagina. Il browser lo importa dal motore; **non può importare niente** (né l'SDK né altri file): tutto quello che serve arriva in `c`. Neanche qui deve girare niente all'import: anche il kernel lo importa, e lì non c'è `document`.

### La definizione di una componente

| Campo | Cosa è |
|---|---|
| `type`, `version`, `label` | Come per i blocchi (`esempio.semaforo`) |
| `icon` | Di serie `window` |
| `category` | Nella scheda **Componenti**: `text` (Testo), `values` (Testo e valori), `commands` (Comandi), `containers` (Contenitori), `charts` (Grafici); altro: **Altro** |
| `inputs` | Le porte che **lo schema imposta** (un testo da mostrare, un valore) |
| `outputs` | Le porte che **manda chi usa la finestra** (premuto, il valore scelto) |
| `props` | Le proprietà, nell'editor delle finestre (vedi sotto) |
| `grow` | Come per i blocchi |
| `container` | `true`: ha componenti dentro (`c.children()`) |
| `actionPort` | La porta di uscita che fa scattare l'**Azione al clic** (aprire o chiudere una finestra), se c'è una proprietà `action` |
| `render(el, c)` | Disegna la componente dentro `el` |

Le porte sono **viste dallo schema**: nello schema l'oggetto della componente ha gli `inputs` a sinistra e gli `outputs` a destra. Il motore accetta da una finestra solo valori sulle `outputs` (anche aggiunte).

Ogni componente dovrebbe avere anche gli ingressi **abilitato** (`enabled`) e **visibile** (`visible`), di tipo `bool`: lilOS li gestisce da solo (spegne o nasconde la componente), ma il motore accetta un collegamento solo verso porte dichiarate. Dichiarali tu, come fanno le componenti standard (vedi l'esempio sotto).

### Le proprietà: props

`props` è una lista: `{ key, type, default, label, options, min, max, translate }`.

| `type` | Cosa è |
|---|---|
| `text` | Un testo (al massimo 4000 caratteri). Con `translate: true` è una frase da tradurre: mostrala con `c.t(…)` |
| `number` | Un numero, portato tra `min` e `max` |
| `select` | Una scelta tra `options` |
| `checkbox` | `true` / `false` |
| `icon` | Il nome di un'icona |
| `action` | L'azione al clic: `{ kind: 'none' \| 'open' \| 'close', window }` |
| `console` | Una console del progetto |
| `resource` | Un file della cartella del progetto (un'immagine…): ottieni l'indirizzo con `c.host.resourceUrl(…)` |

### Il contesto c

| Membro | Cosa è |
|---|---|
| `c.id` | L'id della componente nella finestra |
| `c.props` | Le proprietà, con i predefiniti e già controllate |
| `c.lang` | La lingua |
| `c.design` | `true` nell'editor delle finestre: mostra dati finti e non reagire |
| `c.mode` | `'live'` (finestra vera), `'design'` (editor) o `'preview'` (anteprima) |
| `c.t(testo)` | Il testo tradotto con la tabella dei testi del progetto |
| `c.h(tag, attributi, …figli)` | Crea un elemento, come `h` dell'SDK |
| `c.icon(nome)` | Un'icona di lilOS |
| `c.controls` | I controlli dell'SDK (`textField`, `selectField`, `slider`, `actionButton`…) |
| `c.charts.chart` | La libreria dei grafici dell'SDK |
| `c.host` | Quello che offre il posto dove sta la finestra: `openWindow(nome)`, `closeWindow()`, `pickFile({ kind, exts })`, `resourceUrl(percorso)`, `consoleView(console)`, `chartPoints`. Può mancare qualcosa: usa `c.host.x?.(…)` |
| `c.added` | Le porte aggiunte: `{ inputs, outputs }` |
| `c.send(porta, valore)` | Chi usa la finestra ha fatto qualcosa: il valore esce dall'oggetto della componente negli schemi. Nell'editor non fa niente |
| `c.on(porta, fn)` | Ascolta un ingresso: `fn` si chiama subito con l'ultimo valore, se c'è, e poi a ogni valore nuovo. Ritorna la funzione per smettere |
| `c.children(dentro)` | Per i contenitori: disegna i figli dentro `dentro` (o li ritorna, se non lo passi) |

Regole:

- `render` deve funzionare anche se viene chiamata di nuovo (l'editor ridisegna) e non deve toccare niente fuori da `el`.
- Se `render` lancia, al posto della componente compare il tipo con il messaggio.
- Il CSS di `styles` vale per tutta la pagina: usa classi con un prefisso tuo (`esm-…`).
- Un valore che arriva da uno schema è un dato qualsiasi: non metterlo mai in `innerHTML`; usa `textContent` o `c.h`.

## La documentazione: docs/

Se passi `docs` a `register()`, il motore serve all'IDE le pagine della tua cartella `docs`, e l'IDE le mostra nella sua finestra della documentazione (anche con **F1** su un blocco selezionato).

```
docs/
  it/
    index.md              la pagina del pacchetto
    esempio.media.md      la pagina del blocco esempio.media
    esempio.semaforo.md   la pagina della componente esempio.semaforo
    come-iniziare.md      un'altra pagina
  en/
    index.md
    …
```

- Una cartella per lingua (`it`, `en`…). Il motore cerca la pagina nella lingua di chi legge, poi nella lingua senza variante (`pt` per `pt-BR`), poi in inglese, poi in italiano.
- `index.md` è la pagina del pacchetto. La pagina di un blocco o di una componente ha come nome il suo **tipo**. Le altre pagine hanno nomi `[a-z][a-z0-9-]{0,40}`. File con altri nomi sono ignorati.
- Il titolo di una pagina, nell'elenco, è la sua prima riga `# …`.
- Una pagina è al massimo 512 KB.
- L'elenco delle pagine è letto una volta per versione del pacchetto: se aggiungi pagine, alza la versione (o riavvia il kernel).

I collegamenti tra pagine si scrivono così (niente `.md`, niente percorsi):

| Scrivi | Apre |
|---|---|
| `[Media](esempio.media)` | La pagina di un blocco o di una componente, per tipo |
| `[Blocchi di esempio](logicstudio-esempio)` | La pagina `index` di un pacchetto |
| `[Come iniziare](logicstudio-esempio/come-iniziare)` | Un'altra pagina di un pacchetto |
| `[Progetti](ide/projects)` | Una pagina della guida dell'IDE |
| `[sito](https://…)` | Un indirizzo esterno |

Il Markdown che si vede: titoli da `#` a `####`, paragrafi, elenchi, grassetto, corsivo, codice, blocchi di codice, citazioni, righe, tabelle. Niente HTML, niente immagini.

## Un pacchetto completo

Un pacchetto `logicstudio-esempio` con cinque blocchi (una media con porte aggiunte, un saluto e un cambio di valuta con le azioni, un lampeggiatore con i timer e `upgrade`, una rampa `loop`) e una componente (un semaforo). `module.json` è quello sopra.

### index.js

```js
import { join } from 'node:path';

let handle = null;

/** Le azioni: girano nel thread principale del kernel, come l'utente del programma. */
const actions = {
  'esempio.saluta': async (user, args, tools) => {
    const who = String(args?.who ?? '').trim().slice(0, 80) || user.name;
    return { text: `Ciao ${who}, da «${tools.program.name}»` };
  },

  'esempio.cambio': async (user, args, tools) => {
    const to = String(args?.to ?? 'USD').trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(to)) throw new Error(`Valuta non valida: ${to.slice(0, 10)}`);
    tools.countNet();   // conta nella quota di rete dell'utente; lancia se è finita
    const limit = AbortSignal.timeout(15000);
    const signal = tools.signal ? AbortSignal.any([tools.signal, limit]) : limit;
    let res;
    try {
      res = await fetch(`https://api.frankfurter.app/latest?from=EUR&to=${to}`, { signal });
    } catch {
      throw new Error('Il servizio dei cambi non risponde');
    }
    if (!res.ok) throw new Error(`Il servizio dei cambi ha risposto ${res.status}`);
    const data = await res.json();
    const rate = data?.rates?.[to];
    if (typeof rate !== 'number') throw new Error(`Nessun cambio per ${to}`);
    return { rate, date: String(data.date ?? '') };
  },
};

export default {
  async init(ctx) {
    ctx.provide('logicblock.esempio', { api: 1 });
    handle = await ctx.service('logicstudio').register({
      name: ctx.name,          // 'logicstudio-esempio'
      version: ctx.version,    // '1.0.0'
      label: { en: 'Example blocks', it: 'Blocchi di esempio' },
      blocks: join(ctx.dir, 'blocks.js'),
      components: join(ctx.dir, 'components.js'),
      docs: join(ctx.dir, 'docs'),
      actions,
    });
  },
  async stop() {
    handle?.unregister();
  },
};
```

La richiesta di `esempio.cambio` va a un indirizzo fisso. Se un'azione deve andare a un indirizzo scelto dall'utente, deve anche controllare che non sia questo computer o la rete locale, come fa la [HTTP (fetch)](net.request).

### blocks.js

```js
const L = (en, it) => ({ en, it });
const PULSE = true;
const num = v => (typeof v === 'number' ? v : Number(String(v ?? '').replace(',', '.')));

export const blocks = [
  // 1. Un calcolo, con ingressi aggiunti dall'utente
  {
    type: 'esempio.media', version: 1, category: 'math', icon: 'calculator',
    label: L('Average', 'Media'),
    description: L('The average of the inputs that have a value', 'La media degli ingressi che hanno un valore'),
    inputs: [{ name: 'a', type: 'number' }, { name: 'b', type: 'number' }],
    outputs: [{ name: 'result', type: 'number', label: L('result', 'risultato') }],
    config: [{ key: 'decimals', type: 'number', default: 2, min: 0, max: 10, label: L('Decimals', 'Decimali') }],
    grow: { inputs: { type: 'number', max: 8, name: 'letter' } },
    run(inputs, b) {
      const values = [inputs.a, inputs.b, ...b.added.inputs.map(p => p.value)]
        .filter(v => v !== undefined)
        .map(num);
      if (!values.length) return undefined;
      if (values.some(n => Number.isNaN(n))) throw new Error('Serve un numero');
      const d = Number.isInteger(b.config.decimals) ? Math.min(10, Math.max(0, b.config.decimals)) : 2;
      const avg = values.reduce((s, n) => s + n, 0) / values.length;
      return { result: Number(avg.toFixed(d)) };
    },
  },

  // 2. Un'azione del pacchetto, nel kernel
  {
    type: 'esempio.saluto', version: 1, category: 'text', icon: 'bell',
    label: L('Greeting', 'Saluto'),
    inputs: [
      { name: 'send', type: 'pulse', label: L('send', 'invia') },
      { name: 'who', type: 'text', label: L('who', 'chi'), trigger: false },
    ],
    outputs: [{ name: 'text', type: 'text', label: L('text', 'testo') }],
    async run(inputs, b) {
      if (b.trigger !== 'send') return undefined;
      const r = await b.call('esempio.saluta', { who: inputs.who ?? '' });
      return { text: r.text };
    },
  },

  // 3. Un'azione che va in rete, con due uscite
  {
    type: 'esempio.cambio', version: 1, category: 'net', icon: 'globe',
    label: L('Exchange rate', 'Cambio'),
    inputs: [{ name: 'read', type: 'pulse', label: L('read', 'leggi') }],
    outputs: [
      { name: 'rate', type: 'number', label: L('rate', 'cambio') },
      { name: 'date', type: 'text', label: L('date', 'data') },
    ],
    config: [{ key: 'to', type: 'select', default: 'USD', options: ['USD', 'GBP', 'CHF', 'JPY'], label: L('Currency', 'Valuta') }],
    async run(inputs, b) {
      const r = await b.call('esempio.cambio', { to: b.config.to });
      return { rate: r.rate, date: r.date };
    },
  },

  // 4. Timer, memoria, start, stop e upgrade
  {
    type: 'esempio.lampeggia', version: 2, category: 'time', icon: 'lamp',
    label: L('Blink', 'Lampeggia'),
    inputs: [{ name: 'on', type: 'bool', label: L('on', 'acceso') }],
    outputs: [{ name: 'state', type: 'bool', label: L('state', 'stato') }],
    config: [
      { key: 'ms', type: 'number', default: 500, min: 50, max: 60000, label: L('Every (milliseconds)', 'Ogni (millisecondi)') },
      { key: 'atStart', type: 'checkbox', default: false, label: L('Starts on its own', 'Parte da solo') },
    ],
    start(b) {
      b.memory().state = false;
      if (b.config.atStart) accendi(b);
    },
    run({ on }, b) {
      if (on === true || on === 'true' || on === 1) accendi(b);
      else spegni(b);
      return undefined;
    },
    stop(b) {
      // I timer li ferma il motore; qui si lascia in ordine la memoria del blocco
      b.memory().timer = null;
    },
    // La versione 1 aveva l'impostazione «seconds»: la 2 ha «ms»
    upgrade(config, from) {
      if (from < 2 && config.seconds !== undefined) {
        const { seconds, ...rest } = config;
        return { ...rest, ms: Math.round(num(seconds) * 1000) || 500 };
      }
      return config;
    },
  },

  // 5. Un blocco che gira da solo
  {
    type: 'esempio.rampa', version: 1, category: 'time', icon: 'chart',
    label: L('Ramp', 'Rampa'),
    execution: 'loop',
    inputs: [{ name: 'target', type: 'number', label: L('target', 'obiettivo') }],
    outputs: [{ name: 'value', type: 'number', label: L('value', 'valore') }],
    config: [
      { key: 'step', type: 'number', default: 1, label: L('Step', 'Passo') },
      { key: 'ms', type: 'number', default: 100, min: 10, label: L('Every (milliseconds)', 'Ogni (millisecondi)') },
    ],
    start(b) {
      b.memory().value = 0;
    },
    step({ target }, b) {
      const m = b.memory();
      const wait = Math.max(10, num(b.config.ms) || 100);
      if (typeof target !== 'number' || target === m.value) return { wait };   // niente da fare: riguarda più tardi
      const passo = Math.abs(num(b.config.step)) || 1;
      m.value = target > m.value ? Math.min(target, m.value + passo) : Math.max(target, m.value - passo);
      return { outputs: { value: m.value }, wait };
    },
  },
];

function accendi(b) {
  const m = b.memory();
  if (m.timer) return;
  const ms = Math.max(50, num(b.config.ms) || 500);
  m.timer = b.setInterval(() => {
    m.state = !m.state;
    b.send('state', m.state);
  }, ms);
}

function spegni(b) {
  const m = b.memory();
  b.clearTimer(m.timer);
  m.timer = null;
  if (m.state) {
    m.state = false;
    b.send('state', false);
  }
}
```

Cosa mostra:

- **Media**: con **a** = 4, **b** = 6 e un ingresso aggiunto **c** = 11 manda 7 su **risultato**; con **a** = `"ciao"` manda «Serve un numero» su **Exception**. Il campo **Decimali** svuotato vale `null`: il blocco usa 2.
- **Saluto**: **chi** non avvia il blocco (`trigger: false`); quando arriva **invia**, il blocco chiede l'azione e manda «Ciao Ada, da «Serra»».
- **Cambio**: ogni **leggi** fa una richiesta, contata nella quota di rete. Se il servizio non risponde, il messaggio esce da **Exception**.
- **Lampeggia**: `true` su **acceso** fa partire un timer che manda `true`, `false`, `true`… su **stato**; `false` lo ferma e manda `false`. Uno schema salvato con la versione 1 (`{ seconds: 2 }`) parte con `{ ms: 2000 }`.
- **Rampa**: un valore su **obiettivo** fa salire o scendere **valore** di un **passo** ogni 100 ms, fino all'obiettivo; poi il blocco aspetta senza mandare niente.

### components.js

```js
const L = (en, it) => ({ en, it });
const COMMON = [
  { name: 'enabled', type: 'bool', label: L('enabled', 'abilitato') },
  { name: 'visible', type: 'bool', label: L('visible', 'visibile') },
];
const COLORS = ['red', 'yellow', 'green'];

export const styles = `
.esm-sem { display: inline-flex; flex-direction: column; gap: 4px; padding: 6px; border: 0; border-radius: 8px; background: #222; cursor: pointer; }
.esm-sem i { display: block; width: 18px; height: 18px; border-radius: 50%; background: #444; }
.esm-sem i.on.red { background: #e5484d; }
.esm-sem i.on.yellow { background: #f5d90a; }
.esm-sem i.on.green { background: #30a46c; }
.esm-wrap { display: inline-flex; align-items: center; gap: 8px; }
`;

export const components = [
  {
    type: 'esempio.semaforo', version: 1, category: 'values', icon: 'lamp',
    label: L('Traffic light', 'Semaforo'),
    inputs: [{ name: 'color', type: 'text', label: L('color', 'colore') }, ...COMMON],
    outputs: [{ name: 'clicked', type: 'pulse', label: L('clicked', 'cliccato') }],
    props: [
      { key: 'label', type: 'text', default: '', translate: true, label: L('Label', 'Etichetta') },
      { key: 'color', type: 'select', default: 'red', options: COLORS, label: L('Start color', 'Colore iniziale') },
    ],
    render(el, c) {
      const lights = COLORS.map(name => c.h('i', { class: name }));
      const show = color => lights.forEach((light, i) => light.classList.toggle('on', COLORS[i] === color));
      const box = c.h('button', {
        type: 'button', class: 'esm-sem', 'aria-label': c.t(c.props.label) || 'Semaforo',
        onclick: () => c.send('clicked', true),   // nell'editor non fa niente
      }, ...lights);
      el.classList.add('esm-wrap');
      el.append(...[c.props.label ? c.h('span', {}, c.t(c.props.label)) : null, box].filter(Boolean));
      show(c.design ? 'green' : c.props.color);
      c.on('color', v => show(String(v ?? '').toLowerCase()));
    },
  },
];
```

Nello schema il suo oggetto ha a sinistra **colore**, **abilitato** e **visibile**, a destra **cliccato**:

```
[Costante · Variabile: "green"] valore ──▶ colore [Semaforo: sem1] cliccato ──▶ valore [Print (console.log)]
```

### docs/it/esempio.media.md

~~~markdown
# Media

`esempio.media` · Matematica · [Blocchi di esempio](logicstudio-esempio) · versione 1

La media degli ingressi che hanno un valore.

## Ingressi

| Porta | Tipo | Descrizione |
|---|---|---|
| **a** | numero | Il primo valore. |
| **b** | numero | Il secondo valore. |

## Uscite

| Porta | Tipo | Descrizione |
|---|---|---|
| **risultato** (`result`) | numero | La media, con i decimali scelti. |
| **Exception** (`error`) | oggetto | Quando un ingresso non è un numero. |

## Esempi

```
[Costante · Variabile: 4] valore ──▶ a  [Media] risultato ──▶ valore [Print (console.log)]
[Costante · Variabile: 6] valore ──▶ b
```

Scrive 4, poi 5.
~~~

## Provarlo

1. Metti la cartella del modulo tra i moduli del kernel (o installalo dall'AppStore) e riavvia il kernel.
2. Nel log del kernel cerca `Logic Studio: pacchetto logicstudio-esempio 1.0.0 (5 blocchi, 1 componenti)` e gli eventuali avvisi «scartato».
3. Nell'IDE i blocchi sono nella scheda **Blocchi** (Matematica, Testo, Rete, Tempo), la componente nella scheda **Componenti** di una finestra (Testo e valori). Il pacchetto compare anche in **Pannello di controllo → Logic Studio → Pacchetti**.
4. Fai uno schema con i tuoi blocchi, premi **Prova** e guarda i valori sui collegamenti.

## Da sapere

- **Il codice dei blocchi non è isolato.** Gira nel worker con tutte le possibilità di Node, perché i pacchetti li installa un amministratore. Un blocco che usa `node:fs`, `fetch` o altro per conto suo salta i permessi, le quote e le regole di rete dell'utente: usa sempre un'azione.
- **Il motore non interrompe il codice che non si ferma.** Il tempo massimo di un blocco funziona solo se `run` aspetta (`await`). Un ciclo senza fine che non aspetta mai (`while (true) {}`) blocca il worker dell'utente e tutti i suoi programmi. Spezza i lavori lunghi con `await` o con un blocco `loop`.
- **`stop()` non gira sempre.** Non gira quando il kernel si spegne, né quando il worker dell'utente si chiude per un errore o per la memoria. Non affidare a `stop()` niente che debba essere salvato.
- **Un worker tiene i blocchi che ha caricato.** Un worker carica i blocchi dei pacchetti registrati quando parte, e quelli dei pacchetti arrivati dopo quando parte il programma successivo; ma un blocco che conosce già non viene ricaricato finché il worker è aperto. Dopo aver cambiato `blocks.js` alza la versione e riavvia il kernel.
- **La memoria è dell'utente.** Tutti i programmi di un utente stanno nello stesso worker, con la sua quota di memoria (128 MB di serie). Un blocco che tiene liste enormi in `b.memory()` può far fermare tutti i programmi di quell'utente.
- **I valori viaggiano come JSON.** Gli argomenti e i risultati delle azioni, le righe di console e i valori per le finestre lasciano il worker: usa solo valori JSON (numeri, testi, sì/no, liste, oggetti semplici).
- Tieni `en` e `it` in tutte le etichette: i pacchetti di lingua di lilOS non traducono i pacchetti.

## Vedi anche

- [Logic Studio Engine](logicstudio-engine)
- [I programmi](logicstudio-engine/programs)
- [Limiti e quote](logicstudio-engine/limits)
- [Permessi](logicstudio-engine/permissions)
- [Come funziona un blocco](ide/blocks) e [Le componenti nello schema](ide/components)
