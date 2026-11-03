# NetTest

Prova API e servizi di rete da lilOS, come Postman. Le richieste le manda il **kernel** di lilOS, non il browser: niente limiti CORS, e arrivano ai server che il kernel raggiunge (con più utenti, dentro le regole che un amministratore decide nel Pannello di controllo → Rete).

## Cosa fa

- **HTTP e REST** con metodo, parametri, intestazioni e corpo (JSON, testo, XML, HTML, form, multipart, file). La risposta mostra stato, tempi passo per passo (DNS, connessione, TLS, attesa, scaricamento), dimensione, intestazioni, cookie e il certificato del server. HTTP/2, reindirizzamenti, certificato e CA del client (mTLS) sono nelle impostazioni della richiesta.
- **GraphQL**: query e variabili, con lo schema letto dal server (introspezione).
- **Ambienti** (Sviluppo, Produzione…), variabili della collezione e variabili globali. Una variabile **segreta** (il lucchetto) viene sigillata da lilOS: nel file resta cifrata, la apre solo chi l'ha scritta su questo lilOS, la mette nella richiesta il kernel e si vede sempre come `••••`, anche se il server la rimanda indietro.
- **Autorizzazione**: Basic, Bearer, chiave API, Digest, firma AWS v4 e OAuth 2.0 (un token che hai, accesso con codice e PKCE, credenziali del client, utente e password). I token si rinnovano da soli.
- **Script** JavaScript prima della richiesta e dopo la risposta (`nt`, o `pm` per gli script scritti per Postman), **verifiche** senza codice e **Salva in variabile** per tenere un valore della risposta (un token, un id) per le richieste dopo. Gli script girano in un ambiente isolato, senza rete né file, al massimo 5 secondi.
- **Cookie** tenuti come in un browser, e **conferma del certificato** quando non è valido (la stessa conferma vale per la cartella Rete e per il Terminale).
- **Sessioni**: WebSocket, SSE, TCP, TLS, UDP e MQTT, e gRPC (con la reflection del server o un file `.proto`). La connessione la tiene il kernel e resta aperta **10 minuti senza la finestra**; al massimo 10 sessioni aperte per utente.
- **Collezioni** in file `.nettest` (cartelle, richieste, ambienti, script), più «Le mie richieste», sempre pronta e tenuta da NetTest. **Esegui** fa partire una cartella o tutta la collezione: ambiente, giri, file di dati (CSV o JSON, un giro per riga), pausa tra le richieste, stop al primo errore, variabili da tenere, risultati da esportare.
- **Importa** da Postman (v2 e ambienti), Insomnia (v4 e v5), OpenAPI 3 e Swagger 2 (JSON o YAML), HAR e comandi cURL. **Esporta per Postman**.
- **Copia come codice** in 12 modi: cURL (anche per il cmd di Windows), HTTPie, PowerShell, JavaScript (fetch), Node.js, Python, Go, Java, C#, PHP e HTTP grezzo.
- **Pianifica**: la collezione parte da sola con la Pianificazione, anche a lilOS chiuso. Dal **Terminale** (1.9.0) si può anche usare `nettest run`, `nettest send` e `nettest list`.
- Le collezioni `.nettest` hanno la loro anteprima sulla scrivania e nel File Manager.

## Tasti

| Tasti | Azione |
| --- | --- |
| Ctrl Invio | Invia la richiesta (o collega la sessione) |
| Ctrl S | Salva la collezione |
| Ctrl Alt N | Nuova richiesta HTTP |
| Ctrl Alt W | Chiudi la scheda |

## Da sapere

- Serve lilOS 1.25.0 o successivo. L'app chiede di fare richieste di rete dal kernel (permesso `calls`) e di scrivere i file della tua home (per le collezioni).
- Gli script chiedono il modulo **services-isolate** 1.2.0 o successivo; gRPC e MQTT chiedono i moduli **call-grpc** e **call-mqtt**. Sono facoltativi: l'AppStore li propone quando installi NetTest.
- Con più utenti il kernel non va a questo computer né alla rete locale, a meno che un amministratore le apra nel Pannello di controllo → Rete.
- Le password e i token vanno nelle variabili segrete: scritti nei campi dell'autorizzazione restano in chiaro nel file della collezione.
- MQTT senza TLS, TCP e UDP non sono cifrati.
