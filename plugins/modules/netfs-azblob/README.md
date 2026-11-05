# netfs-azblob

Modulo del kernel che porta i contenitori di **Azure Blob Storage** nella cartella Rete, anche quelli degli account con spazio dei nomi gerarchico (**Data Lake Storage Gen2**).

- In **Connetti a un server** compare **Azure Blob Storage**. Si scrive il nome dell'account di archiviazione e si sceglie come entrare:
  - **Chiave dell'account** (portale di Azure → l'account → Chiavi di accesso): apre tutto l'account;
  - **Token SAS**: apre quello che dice il token (con elenco, lettura, scrittura ed eliminazione per usarlo come cartella);
  - **Microsoft Entra**: l'accesso con l'account di lavoro o dell'istituto, nella pagina di Microsoft. L'utente deve avere un ruolo sui dati, per esempio **Collaboratore ai dati dei BLOB di archiviazione**; senza, l'errore lo dice.
- Il contenitore (con **Elenca** si sceglie tra quelli dell'account) diventa la cartella `~/Rete/<nome>`; facoltativamente, solo una sua cartella. Con **Indirizzo personalizzato** si usano Azurite, i cloud nazionali o un dominio proprio.
- Senza spazio dei nomi gerarchico le cartelle sono parti dei nomi dei blob; una cartella vuota è un blob vuoto con il metadato `hdi_isfolder=true` (come le fanno Data Lake e Hadoop), e rinominare copia sul server e poi elimina. Con lo spazio dei nomi gerarchico (il modulo lo riconosce da solo) le cartelle sono vere: crearle, rinominarle ed eliminarle è una sola richiesta all'endpoint `dfs`.
- I file grandi vanno a **blocchi** da 8 MB, ognuno ritentato da solo se non riesce. I download interrotti riprendono.
- I blob nel livello **Archivio** hanno l'etichetta **archiviato**: si leggono dopo averli riattivati dal portale.
- **Eliminare è definitivo**, salvo l'eliminazione temporanea attiva sull'account.

## Microsoft Entra

Serve solo per l'accesso con un account Microsoft, che fa il kernel con l'app di **Pannello di controllo → App Microsoft** (la stessa di OneDrive): l'ID dell'app registrata su Azure e gli account ammessi (qui solo di lavoro o dell'istituto: con «solo personali» l'accesso Entra non si può usare). Chiave e token SAS non chiedono niente.

1. [portal.azure.com](https://portal.azure.com) → **Registrazioni app**.
2. **Autenticazione** → piattaforma **Applicazioni per dispositivi mobili e desktop**: l'indirizzo `<indirizzo di lilOS>/api/net/signin/callback` e, per l'accesso incollando l'indirizzo, `http://127.0.0.1:53682/`. **Consenti flussi client pubblici**: Sì.
3. **Autorizzazioni API** → **Azure Storage** → `user_impersonation` (delegata).
4. Sull'account di archiviazione: **Controllo di accesso (IAM)** → ruolo **Collaboratore ai dati dei BLOB di archiviazione** agli utenti.

Le richieste con la chiave sono firmate dal modulo (Shared Key): nessun SDK. Fornisce il servizio `netfs.azblob`. Nessuna dipendenza. Richiede lilOS 1.22.0 o successivo.

Versione 1.1.0: il nome del server si risolve con il kernel, che dà solo gli indirizzi permessi (con più utenti, niente rete locale se l'amministratore non la apre): il nome non può cambiare indirizzo tra il controllo del kernel e la connessione. Un download ripreso controlla che il servizio mandi la parte giusta del file. L'accesso con Microsoft Entra lo fa il kernel, con l'app di Pannello di controllo → App Microsoft (ID e directory passano lì da soli).

## Soglie dei file grandi

Dalla 1.2.0. Le soglie dei file grandi sono impostazioni del modulo (un amministratore le cambia; valgono subito, anche per i trasferimenti che partono dopo):

| Chiave | Cosa | Predefinito |
|---|---|---|
| `singleMaxMb` | Fino a questa dimensione (MB) un file di cui si conosce il peso va con un solo `Put Blob`; uno più grande a blocchi | 32 (da 1 a 5000) |
| `blockMb` | Dimensione dei blocchi (MB). Azure accetta al massimo 50.000 blocchi: per un file più grande i blocchi crescono da soli | 8 (da 1 a 4000) |
