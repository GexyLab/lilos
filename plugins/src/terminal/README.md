# Terminale

Una shell come **bash** che lavora sui file di lilOS. Si scrivono i comandi come in un terminale Linux: le cartelle e i file sono quelli che vedi nel File Manager, e la home (`~`, cioè `/home/<utente>`) è la radice di lilOS.

`help` elenca i comandi; `help comando` o `comando --help` spiega un comando; `help if`, `help for`, `help case`, `help variabili` e `help redirezioni` spiegano la sintassi.

## La shell

- Pipe `|` e `|&`, liste `;` `&&` `||`, comandi in background con `&` (`jobs`, `wait`, `fg`, `kill`).
- Redirezioni `>`, `>>`, `<`, `2>`, `2>&1`, `&>`, here-document `<<EOF` e `<<-EOF`, here-string `<<<`, `/dev/null`.
- Variabili, array (`a=(x y)`, `${a[@]}`), `export`, `local`, `readonly`, `declare`; espansioni `${v:-x}`, `${v#…}`, `${v%…}`, `${v/…/…}`, `${v:1:3}`, `${#v}`, `${v^^}`; `$(…)`, `` `…` ``, `$((…))`; graffe `{a,b}` e `{1..10}`; `*`, `?`, `[…]`.
- `if`, `while`, `until`, `for … in`, `for ((…))`, `case`, `[[ … ]]` (con `=~`), `(( … ))`, funzioni, `break`/`continue n`, `return`.
- Script: `bash script.sh`, `./script.sh`, `source file`; gli script in `~/bin` si avviano per nome (`$PATH`). All’apertura viene letto `~/.bashrc`, se c’è.
- `set -e`, `set -u`, `set -x`, `set -o pipefail`; `alias`, `history`, completamento con Tab, frecce per la cronologia, Ctrl C, Ctrl D, Ctrl L.

## I comandi

| Gruppo | Comandi |
|---|---|
| File e cartelle | `ls` `cd` `pwd` `cat` `mkdir` `touch` `cp` `mv` `rm` `rmdir` `stat` `find` `tree` `basename` `dirname` `realpath` |
| Testo | `echo` `printf` `head` `tail` `wc` `grep` `sort` `uniq` `tee` `cut` `tr` `sed` `diff` `rev` `nl` `seq` `yes` `xargs` |
| lilOS | `open` (apre con l’app giusta), `trash` (il cestino), `tag`, `apps`, `nettest`, `date`, `whoami` |
| Shell | `read` `test`/`[` `let` `eval` `source` `type` `command` `which` `env` `set` `shift` `sleep` `exit` e gli altri di `help` |

**`rm` sposta nel cestino**: ciò che si elimina per sbaglio torna con `trash restore nome`. Per eliminare davvero: `rm --purge` o `trash empty`.

## Schede e sessioni remote

Ogni shell è una **scheda**: **+** ne apre un'altra nella stessa cartella. Nella stessa finestra si lavora anche su altri computer:

- `ssh utente@server` (anche `-p porta`, `-l utente` e un comando da eseguire), `telnet server [porta]`, `rlogin -l utente server` e `supdup server` aprono la sessione in una **scheda nuova**. Al posto dell'indirizzo va bene il nome di un host salvato: `ssh web-01`.
- Il pannello a sinistra (pulsante accanto alle schede) ha gli **host salvati**, raggruppabili in cartelle, con le password cifrate nel kernel, e le sessioni **ancora attive**. **+** aggiunge un host; il tasto destro lo modifica.
- Le sessioni remote restano nel kernel anche a finestra chiusa: si riprendono dal pannello (**Riprendi**) o con `sessions` e `sessions <n>`. Senza finestra si chiudono dopo 10 minuti.
- Alla prima connessione SSH si conferma l'impronta della chiave del server; se cambia, un avviso. Il pulsante predefinito è **Annulla** (Invio ed Esc annullano): per fidarsi si sceglie Continua. Una password non salvata la chiede il terminale stesso.
- Nella barra in basso: cifrata o no, indirizzo, chiave, dimensione; la ricerca (Ctrl+Maiusc+F, con maiuscole e minuscole, parola intera ed espressioni regolari), la registrazione in un file e il menu **Tasti** per Ctrl+W, Ctrl+T, Ctrl+N e gli altri tasti che il browser tiene per sé. Copia selezionando o con Ctrl+Maiusc+C, incolla con Ctrl+Maiusc+V.
- Nel File Manager, dentro una connessione **SFTP** della cartella Rete, **Apri terminale SSH qui** apre la sessione in quella cartella, con le stesse credenziali.

I protocolli sono moduli del kernel (`term-ssh`, `term-telnet`, `term-rlogin`, `term-supdup`) che un amministratore installa dall'AppStore, scheda Kernel. Telnet, rlogin e SUPDUP non sono cifrati. Vuole lilOS 1.21.0 o successivo.

## Riquadri affiancati e finestre

- **Dividi a destra** e **Dividi in basso** (menu della scheda, o Alt+Maiusc+D e Alt+Maiusc+S) mettono la scheda in un **riquadro** nuovo accanto; se è sola nel suo riquadro, se ne apre una nuova. I riquadri formano una griglia senza limite, ognuno con le sue schede e il suo **+**. Il separatore si trascina (o si sposta con le frecce), il doppio clic rende uguali le misure.
- Una scheda si **trascina**: su un'altra barra entra lì, dove c'è la linea blu; sul bordo di un terminale apre un riquadro nuovo da quel lato; **fuori dalla finestra** diventa una finestra sua. Esc annulla.
- Con la tastiera, sulla barra delle schede: le frecce, Home e Fine scelgono la scheda, Canc la chiude, il clic centrale pure.
- Il **menu della scheda** (tasto destro, Maiusc+F10 o tasto Menu) ha anche Rinomina, Duplica, Sposta nel riquadro, **Stacca in una nuova finestra**, **Sposta nella finestra** (le altre finestre di Terminale), Chiudi le altre, Chiudi quelle a destra.
- Staccare o spostare una scheda **non la riavvia**: la shell tiene output, cronologia e il comando che sta girando, la sessione SSH resta la stessa. Le finestre staccate tornano con lilOS insieme ai loro riquadri; le sessioni remote ancora aperte si riagganciano.
- **Invia l'input a tutti i riquadri** (Alt+Maiusc+B): quello che scrivi va alla scheda mostrata in ogni riquadro, per esempio lo stesso comando su più server. I riquadri si colorano di arancione finché è acceso.
- Scorciatoie (si cambiano nel Pannello di controllo → Scorciatoie): Alt+Maiusc+T nuova shell, Alt+Maiusc+W stacca, Alt+Maiusc+frecce riquadro accanto, Alt+Maiusc+PagSu/PagGiù scheda precedente/successiva del riquadro, Ctrl+Alt+Maiusc+frecce sposta la scheda.

## Collegamenti .term

Un file **.term** apre una connessione con un doppio clic, dalla scrivania o dal File Manager.

- **Salva come collegamento (.term)…** (menu della scheda, o di un host nel pannello) chiede nome, cartella, cartella iniziale, un comando da eseguire e dove aprirlo; **Aggiungi alla scrivania** lo crea subito sulla scrivania.
- **Salva la password nel file**: la password viene cifrata da lilOS e vale **solo per te, su questo lilOS, per lo stesso server e utente**. A chiunque altro viene chiesta come al solito. Senza password nel file, Terminale usa quella di un host salvato con lo stesso indirizzo.
- Il doppio clic apre il collegamento in una **finestra nuova**; si cambia in Menu di Terminale → **Opzioni…** (oppure lo dice il file stesso).
- Un collegamento che esegue un comando e non l'hai salvato tu chiede conferma la prima volta.
- Il file è JSON leggibile, si apre anche con l'Editor:

```json
{ "type": "lilos.term", "version": 1, "name": "web-01", "protocol": "ssh",
  "values": { "host": "web-01.example.com", "port": 22, "user": "deploy" },
  "cwd": "/var/www", "open": "tab" }
```

`protocol` è `local` per una shell di lilOS (`cwd` come `~/Documenti`, `command` eseguito all'avvio).

## Comandi delle altre app

Un’app installata può aggiungere i suoi comandi al Terminale nel manifesto:

```json
"contributes": {
  "shell": [{ "name": "converti", "entry": "cli", "summary": "Converte immagini", "usage": "converti file formato" }]
}
```

`entry` è un punto d’ingresso `background` dell’app (manifesto con `sdk` `"2"`). Viene chiamato con `{ command, args, stdin, cwd, env }` (`stdin` è il testo in ingresso, o `null` se è la tastiera) e risponde con una stringa (l’output) o con `{ stdout, stderr, code }`. I comandi del Terminale hanno la precedenza su quelli delle app con lo stesso nome.

## Differenze da bash

Non ci sono processi né programmi esterni: i comandi sono quelli del Terminale e delle app. Mancano gli array associativi, `trap`, `getopts`, `select` e i permessi dei file (in lilOS non esistono); i nomi dei file non distinguono maiuscole e minuscole, come nel resto di lilOS.

## Automazioni

Con **Automata** (lilOS 1.15.0 o successivo) il Terminale rende registrabile **Esegui un comando**: la riga eseguita e la cartella in cui l'hai eseguita. Si registrano solo le righe finite con successo, non quelle che iniziano con `automata` né quelle più lunghe di 4000 caratteri. La riga gira senza registrare quello che fa ai file, che è già dentro la riga. Rifatto, il comando si scrive nel Terminale (nella cartella registrata) e il passo riesce solo se l'uscita è 0, altrimenti mostra l'ultima riga d'errore.

Il Terminale ha anche il comando di Automata: `automata list` e `automata run <nome> [file…] [--campo=valore…] [--yes]` (vedi Automata).

## NetTest

Con **NetTest** (lilOS 1.25.0 o successivo) il Terminale ha il comando `nettest`, che manda le richieste di una collezione `.nettest` con lo stesso motore del pulsante **Esegui** di NetTest (le fa il kernel):

- `nettest run FILE [-e AMBIENTE] [-f CARTELLA] [-n GIRI] [-d DATI.csv|json] [--bail] [-v]`: tutte le richieste (o quelle di una cartella), una riga ciascuna con ✓, ✗ o ·, stato, tempo e cosa non è andato. Esce con 0 se tutte sono riuscite, con 1 altrimenti.
- `nettest send FILE RICHIESTA [-e AMBIENTE] [-i]`: una richiesta, per nome; il corpo della risposta va sull'uscita (con `-i` prima ci sono stato e intestazioni).
- `nettest list FILE`: cartelle e richieste, con il loro protocollo.

L'ambiente è uno di quelli del file, per nome; i suoi valori segreti sono quelli del file (sigillati per te, su questo lilOS).

## Riconoscimenti

- [xterm.js](https://xtermjs.org) 6.0.0 e gli addon fit, search e unicode11, per le schede delle sessioni remote: licenza MIT, © The xterm.js authors, © SourceLair Private Company, © Christopher Jeffrey.
- [ssh2](https://github.com/mscdex/ssh2) 1.17.0 nel modulo del kernel `term-ssh`: licenza MIT, © Brian White.
- Telnet: RFC 854, 856, 858, 1073, 1091, 1572. rlogin: RFC 1282. SUPDUP: RFC 734 e il protocollo SUPDUP di ITS.
