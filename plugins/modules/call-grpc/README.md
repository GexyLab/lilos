# call-grpc

Modulo del kernel per **gRPC** in NetTest: chiamate a un server gRPC, con i messaggi scritti in JSON.

- Chiamate unarie: la risposta, lo stato gRPC (OK, NOT_FOUND…) con il suo messaggio, le intestazioni e i trailer. Si fanno anche nelle esecuzioni di una collezione.
- Flussi del server, del client e bidirezionali come sessioni: ogni messaggio inviato e ricevuto compare nella sessione; «Fine» chiude l'invio, il server risponde e chiude con il suo stato.
- I servizi e i metodi si leggono dalla **reflection** del server (`grpc.reflection.v1`, oppure `v1alpha` per i server più vecchi) o dal file **.proto** incollato nella richiesta (con gli import dei tipi standard di Google: `timestamp`, `duration`, `any`, `struct`, `wrappers`…). Per ogni metodo c'è un messaggio d'esempio con tutti i campi.
- I messaggi sono in ProtoJSON, come in grpcurl: nomi dei campi in lowerCamelCase, numeri a 64 bit come stringhe, byte in base64, enum per nome.
- Metadati della richiesta (le chiavi che finiscono in `-bin` vanno scritte in base64), scadenza della chiamata (`grpc-timeout`), risposte compresse con gzip o deflate.
- `grpc://` (HTTP/2 senza TLS) e `grpcs://` (TLS): un certificato non valido per il server si conferma come nelle altre connessioni, e valgono i file CA, certificato e chiave del client delle impostazioni della richiesta.

Ogni connessione va solo agli indirizzi che il kernel permette (con più utenti, niente rete locale se l'amministratore non la apre): il nome del server si risolve con il kernel stesso.

Fornisce il servizio `call.grpc`. Dipendenza: `protobufjs` 8.8.1 (licenza BSD-3-Clause, © Daniel Wirtz), con `long` 5.3.2 (licenza Apache-2.0). Richiede lilOS con NetTest.
