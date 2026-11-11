# logicstudio-db

I **blocchi dei database SQL** di Logic Studio, nella categoria **Database**.

Database: **PostgreSQL**, **MySQL e MariaDB**, **Microsoft SQL Server** (anche Azure SQL), **SQLite** (un file della propria home, oppure in memoria), **Oracle** (12c o successivo) e **ClickHouse**.

## Blocchi

- **Connessione** (uno per database: PostgreSQL, MySQL · MariaDB, SQL Server, SQLite, Oracle, ClickHouse): apre la connessione all'avvio del programma (o con **connetti**) e manda dall'uscita **connessione** il riferimento che va collegato all'ingresso **connessione** degli altri blocchi. La password si scrive nelle Proprietà: lo schema la tiene **cifrata** dal motore, legata all'utente e a questo lilOS (su un altro lilOS o per un altro utente va scritta di nuovo); può anche arrivare dall'ingresso nascosto **password**.
- **Query SQL (query)**: esegue l'SQL delle impostazioni; `:nome` è un parametro, e ogni ingresso aggiunto con quel nome ne dà il valore. I valori passano **sempre come parametri**, mai dentro il testo SQL. Escono le righe, la prima riga, il primo valore, le righe modificate e l'ultimo id.
- **Leggi tabella (SELECT)**, **Inserisci (INSERT)**, **Aggiorna (UPDATE)**, **Elimina (DELETE)**: senza scrivere SQL; ogni ingresso aggiunto è una condizione colonna = valore (una lista diventa IN). Aggiorna ed Elimina senza condizioni funzionano solo con «Tutte le righe».
- **Transazione (BEGIN · COMMIT · ROLLBACK)**: la sua uscita **transazione** si collega alla **connessione** dei blocchi che devono stare dentro; poi **conferma** o **annulla**. Livello di isolamento a scelta; annullata da sola dopo un tempo (60 secondi di serie), quando il programma si ferma o quando il blocco riparte.
- **Scorri righe (cursor)**: le righe di una query una alla volta (o a gruppi), a ogni **prossima** o da sole quando **prossima** non è collegato; per le tabelle grandi.
- **Tabelle e colonne (schema)**: le tabelle e le viste del database, o le colonne di una tabella.
- **Ascolta (LISTEN)** e **Notifica (NOTIFY)**: le notifiche di PostgreSQL.

## Sicurezza e limiti

- Le connessioni sono fatte dal kernel, non dal programma: il programma tiene solo un riferimento che vale per lui, e tutte si chiudono quando si ferma.
- Il nome del server viene risolto e ogni indirizzo controllato; la connessione va proprio all'indirizzo controllato. Questo computer e la rete locale sono **bloccati** a meno che l'amministratore non li permetta («Permetti i database su questo computer e sulla rete locale»); gli indirizzi link-local, multicast e «questa rete» mai.
- **I database usati da lilOS stesso** (gli indirizzi nella configurazione del kernel, come quello di `fs-postgres`) non sono raggiungibili, neanche con la rete locale permessa.
- SQLite usa solo i file della propria home (mai `.config`, mai un file protetto da un'app), letti e scritti come l'utente; il file si salva un secondo dopo l'ultima modifica, a ogni conferma e alla chiusura. Un file aperto in scrittura appartiene a un solo programma alla volta. SQLite gira in un thread a parte: una query troppo lunga viene fermata senza bloccare lilOS.
- Impostazioni del modulo (amministratore): tempo massimo di un'operazione (30 s), righe massime (10.000), dimensione massima di un risultato (4096 KB), connessioni aperte per utente (10), operazioni al minuto per utente (600), dimensione massima di un file SQLite (1024 MB), e quali database permettere.
- Gli errori dei driver arrivano all'uscita Exception su una riga, senza la password.

## Librerie

`pg` (MIT), `mysql2` (MIT), `tedious` (MIT), `sql.js` (MIT), `oracledb` (Apache-2.0 o UPL-1.0, modalità thin, senza Oracle Client). ClickHouse usa la sua interfaccia HTTP, senza librerie.

Richiede il motore `logicstudio-engine` 1.7.0 o successivo (per le password cifrate).
