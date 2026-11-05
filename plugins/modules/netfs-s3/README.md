# netfs-s3

Modulo del kernel che porta i bucket di **Amazon S3** e dei servizi compatibili nella cartella Rete: Cloudflare R2, Backblaze B2, Wasabi, MinIO, e qualsiasi altro servizio che parla l'API di S3 (Ceph, Garage, SeaweedFS, RustFS…).

- In **Connetti a un server** compare il protocollo **Amazon S3 e compatibili**. Si sceglie il fornitore, si scrivono l'ID della chiave di accesso e la chiave segreta, e il bucket (con **Elenca** si sceglie tra quelli dell'account). Facoltativamente, solo una cartella del bucket. Su AWS la regione si trova da sola.
- Il bucket diventa la cartella `~/Rete/<nome>`. I file si copiano trascinandoli; il kernel li trasferisce anche a File Manager chiuso (finestra **Trasferimento dati**).
- In S3 le cartelle non esistono davvero: sono parti dei nomi degli oggetti. Una cartella vuota è un oggetto vuoto `nome/`, come le fa la console di AWS.
- **Rinominare** copia sul server (senza passare da lilOS) e poi elimina l'originale: per una cartella, oggetto per oggetto.
- I file grandi vanno in **parti** (multipart) da 16 MB o più; una parte che non riesce si ritenta da sola. Un invio annullato viene chiuso sul server (le parti a metà costano: conviene anche una regola di ciclo di vita che le elimina dopo qualche giorno). I download interrotti riprendono.
- Gli oggetti nelle classi d'archivio (Glacier Flexible Retrieval, Deep Archive) hanno l'etichetta **archiviato**: si leggono solo dopo averli ripristinati dalla console del fornitore.
- **Eliminare è definitivo** (salvo il versioning del bucket, che tiene la versione precedente).

## Chiave di accesso

Meglio una chiave che apre solo quel bucket. Su AWS: IAM → Utenti → un utente con una policy su `s3:ListBucket` (il bucket) e `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`, `s3:AbortMultipartUpload` (i suoi oggetti); per **Elenca** anche `s3:ListAllMyBuckets`. Le credenziali temporanee (STS) vanno con il loro **token di sessione**.

Le richieste sono firmate dal modulo (AWS Signature Version 4): nessun SDK. Con **Altro** l'indirizzo è quello del server (con la porta), e il bucket va nel percorso (path style) o nel nome dell'host. Un server https con un certificato proprio va confermato la prima volta, come per WebDAV.

Fornisce il servizio `netfs.s3`. Nessuna dipendenza. Richiede lilOS 1.22.0 o successivo.

Versione 1.1.0: il nome del server si risolve con il kernel, che dà solo gli indirizzi permessi (con più utenti, niente rete locale se l'amministratore non la apre): il nome non può cambiare indirizzo tra il controllo del kernel e la connessione. Un download ripreso controlla che il server mandi la parte giusta del file.

## Soglie dei file grandi

Dalla 1.2.0. Le soglie dei file grandi sono impostazioni del modulo (un amministratore le cambia; valgono subito, anche per i trasferimenti che partono dopo):

| Chiave | Cosa | Predefinito |
|---|---|---|
| `singleMaxMb` | Fino a questa dimensione (MB) un file di cui si conosce il peso va con un solo `PUT`; uno più grande in parti | 16 (da 5 a 5120) |
| `partMb` | Dimensione delle parti (MB) del caricamento multipart. S3 accetta al massimo 10.000 parti: per un file più grande le parti crescono da sole | 16 (da 5 a 5120) |
