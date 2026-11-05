# terminal-cli

Il comando **`lilos`**: il Terminale di lilOS in un terminale del tuo computer. Funziona con un lilOS senza UI (dove è l'unico modo di usarlo) e con uno con la UI, anche su un altro computer. Richiede lilOS 1.34.0 o successivo.

Non è un secondo kernel: è un **client** del kernel acceso, che parla con la sua API come la pagina. Ha quindi gli stessi permessi dell'utente che accede, passa dal Cestino e dagli stessi eventi (le pagine aperte vedono subito ciò che fai da qui), e può parlare con un server lontano. Non fornisce servizi e non ha rotte: il kernel lo carica e basta; il codice parte dalla riga di comando.

## Per chi usa lilOS

```
lilos                      la shell di lilOS (Tab, frecce, storia dei comandi, Ctrl+C, exit o Ctrl+D)
lilos ls Documenti         un comando e si torna al terminale, con il suo codice di uscita
lilos -c "ls | wc -l"      una riga intera (pipe, ;, &&: di lilOS, non del computer)
lilos --server lilos.azienda.it:8790 --user mario     un altro lilOS
```

| Opzione | Cosa fa |
| --- | --- |
| `--server INDIRIZZO` | Un altro lilOS (predefinito: quello di questa installazione). |
| `--user NOME` | Accede come NOME. |
| `--cwd CARTELLA` | Cartella di lilOS da cui partire (predefinita: la home). |
| `--no-color` | Niente colori (anche `NO_COLOR`). |
| `--logout` | Esce e dimentica la sessione salvata. |
| `-c RIGA`, `--version`, `--help` | Una riga, versione, aiuto. |

- **Accesso.** Con un solo utente nessuno; altrimenti ti chiede utente e password, poi se restare connesso su questo computer. Senza un terminale (uno script) servono `--user` e la variabile `LILOS_PASSWORD`, oppure una sessione già salvata.
- **Variabili.** `LILOS_SERVER`, `LILOS_USER`, `LILOS_PASSWORD`, `NO_COLOR`, `LILOS_CLI_DIR`.
- **Dati sul computer.** La sessione salvata (`cli.json`, leggibile solo da te) e la storia dei comandi (`history`) stanno in `%APPDATA%\lilos-cli` su Windows, in `$XDG_CONFIG_HOME/lilos-cli` o `~/.config/lilos-cli` altrove. `LILOS_CLI_DIR` cambia la cartella.
- **Codici di uscita.** Quello del comando (130 dopo Ctrl+C); `2` uso sbagliato; `3` il kernel non risponde; `4` accesso non riuscito.
- **Cosa non c'è** (serve la pagina): `open` e `xdg-open`, i comandi che aggiungono le app, le sessioni remote (`ssh`, `telnet`, …), `nettest`, il cambio dei tag.

### Comandi in più

**`appstore`**: moduli del kernel e lingue, non app.

```
appstore list [--installed | --updates] [--modules | --languages] [--repo ID]
appstore search TESTO        appstore info NOME
appstore install [-y] [--allow-unsigned] [--repo ID] NOME…
appstore remove [-y] NOME…   appstore update [-y] [NOME…]
appstore repo list | add URL|community [--name N] | remove ID
appstore system [update | use VERSIONE | remove VERSIONE]
appstore restart
```

Una lingua si scrive `lang:de`, `lang:pt-BR`. Moduli, repository e `system` sono per gli amministratori; le lingue per tutti (valgono per tutti). Prima di installare mostra il piano con le dipendenze e chiede conferma (`-y` la dà); un modulo non firmato si conferma a parte, o con `--allow-unsigned`. I moduli nuovi partono al riavvio del kernel, che il comando propone e aspetta. L'ultimo modulo dei file non si può togliere. `appstore system` aggiorna lilOS stesso; se la versione nuova non parte, lilOS torna da solo alla precedente.

**`license`**: `license` mostra il testo e se è accettata; `license status` esce con 1 se non lo è; `license accept [-y]` la accetta (amministratori).

## Per chi amministra

- Con lilOS senza UI il modulo viene installato da `tools/install.js --no-ui` (insieme al repository community). Con la UI si installa dall'AppStore come gli altri moduli.
- Il comando è il lanciatore `lilos.mjs` accanto a `run.js`, con `lilos.cmd` (Windows) o `lilos` (`sh`). Trova il `cli.js` della versione in uso e lancia `terminal-cli sh -- <argomenti>`. Da una copia del repository: `npm run lilos -- …`.
- Il modulo non apre il database né `users.json`: due processi sugli stessi file sono un rischio. Per questo funziona solo con un kernel acceso.
- Il programma lilOS (0.4.0) mette il comando nel PATH dell'utente se la casella è accesa, e apre un terminale con `lilos` già avviato.
- Non provato su macOS e Linux.

## Per chi scrive codice

- `index.js`: `init()` vuoto e il comando `sh`, che importa `cli.js` solo quando gira (il kernel non carica la shell).
- `cli.js`: argomenti, accesso, shell interattiva o riga; `lib/` ha il client HTTP (`client.js`), l'accesso (`login.js`), la riga interattiva (`repl.js`), la shell (`shell.js`, `commands.js`, `home.js`), `appstore.js`, `eula.js`, `io.js`, `ask.js` e i testi (`strings.js`; `locales.json`, `en` e `it`).
- La shell è quella del Terminale (`plugins/src/terminal`). `build.json` sostituisce i suoi `@lilos/sdk` e `@lilos/system` con `lib/sdk.js` e `lib/system.js`: la home e i file passano per l'API. Con `build.json` (non copiato nel pacchetto) `plugins/scripts/build.mjs` impacchetta tutto in un file.
- Riferimento: [API](../../../doc/sviluppatore/api.md#terminal-cli). Decisione: [D86](../../../doc/interna/decisioni.md#d86-lilos-senza-ui-e-il-comando-lilos).
