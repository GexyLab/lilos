# call-mqtt

Modulo del kernel per **MQTT** in NetTest: una sessione con un broker MQTT (Mosquitto, EMQX, HiveMQ…), per pubblicare messaggi e seguire gli argomenti.

- MQTT 3.1.1 e MQTT 5, su TCP (`mqtt://`, porta 1883) o TLS (`mqtts://`, porta 8883): un certificato non valido per il broker si conferma come nelle altre connessioni, e valgono i file CA, certificato e chiave del client delle impostazioni della richiesta.
- Accesso con nome utente e password (anche nell'indirizzo, `mqtt://utente:password@broker`), identificativo del client (se manca, uno a caso `nettest-…`), sessione pulita o mantenuta, keep alive, messaggio di ultima volontà (testamento).
- Pubblicazione con QoS 0, 1 e 2 e messaggi conservati (retain): con QoS 1 e 2 il messaggio risulta inviato quando il broker lo conferma. Testo, JSON o dati binari.
- Iscrizioni e disiscrizioni agli argomenti, con i caratteri jolly `+` e `#`: la QoS concessa dal broker compare nella barra della sessione, con le iscrizioni attive. I messaggi ricevuti mostrano argomento, QoS e «conservato».
- MQTT 5: proprietà dei messaggi (tipo del contenuto, argomento di risposta, dati di correlazione, proprietà utente, scadenza), opzioni delle iscrizioni (no local, retain as published, retain handling), i motivi dei rifiuti e delle disconnessioni del broker in parole.

Il client MQTT è del modulo stesso: nessuna dipendenza. Non supportati: MQTT su WebSocket e l'autenticazione estesa di MQTT 5 (AUTH).

Ogni connessione va solo agli indirizzi che il kernel permette (con più utenti, niente rete locale se l'amministratore non la apre): il nome del broker si risolve con il kernel stesso.

Senza TLS non è cifrato: password comprese, tutto passa in chiaro.

Fornisce il servizio `call.mqtt`. Richiede lilOS con NetTest.
