# netfs-onedrive

Modulo del kernel che porta **OneDrive** nella cartella Rete: il OneDrive personale (outlook.com, hotmail.com…) o quello di lavoro o dell'istituto, attraverso Microsoft Graph.

- In **Connetti a un server** compare il protocollo OneDrive. Con **Accedi con Microsoft** si apre la pagina di Microsoft in una finestra; finito l'accesso, il OneDrive diventa la cartella `~/Rete/<nome>`, tutto o solo una sua cartella. I file si copiano trascinandoli, e il kernel li trasferisce anche a File Manager chiuso (finestra **Trasferimento dati**).
- Sui documenti Word, Excel e PowerPoint il File Manager offre **Apri in Office online**: il documento si apre in Office per il web, in una nuova scheda del browser. Sugli altri elementi c'è **Apri nel browser**.
- Sui documenti Office della Home c'è **Carica su OneDrive e apri**: il file va nella cartella scelta nel Pannello di controllo e si apre in Office online.
- Eliminare manda nel **cestino di OneDrive**: si recupera da onedrive.com.
- Con l'opzione **Apri le cartelle condivise con me** si aprono anche le cartelle che altri hanno condiviso e che l'utente ha aggiunto a «I miei file» su onedrive.com (**Aggiungi collegamento**). L'elenco «Condivisi con me» di Microsoft Graph smette di funzionare a novembre 2026, quindi il modulo non lo usa.
- Nella barra della connessione c'è lo spazio usato (con lilOS 1.13.0 o successivo).
- I token restano nel kernel, cifrati come le password: la pagina non li riceve mai.

## Impostazioni

Ogni installazione di lilOS usa la propria app registrata su Azure, una sola per OneDrive e Azure Blob Storage. Un amministratore la imposta in **Pannello di controllo → App Microsoft**: l'ID dell'applicazione (client) e gli account ammessi (personali e di lavoro, solo di lavoro, solo personali, o una sola organizzazione con il suo ID o dominio). L'accesso a Microsoft lo fa il kernel.

In **Pannello di controllo → OneDrive** resta solo **Apri le cartelle condivise con me**: le cartelle condivise aggiunte come collegamento; chiede il permesso `Files.ReadWrite.All`.

## Registrare l'app su Azure

Serve un account Azure (gratuito).

1. [portal.azure.com](https://portal.azure.com) → **Registrazioni app** → **Nuova registrazione**.
2. Nome: per esempio `lilOS`. Tipi di account: **Account in qualsiasi directory organizzativa e account Microsoft personali** (o quello che si vuole ammettere: deve corrispondere ad «Account ammessi»).
3. URI di reindirizzamento: piattaforma **Client pubblico/nativo (dispositivi mobili e desktop)**, indirizzo `<indirizzo di lilOS>/api/net/signin/callback`, per esempio `http://localhost:8790/api/net/signin/callback` o `https://lilos.example.com/api/net/signin/callback`. Il Pannello di controllo mostra quello giusto da copiare. Non usare «Web» né «Applicazione a pagina singola»: il kernel scambia il codice da sé, senza segreto.
4. **Autenticazione** → **Consenti flussi client pubblici**: **Sì**.
5. **Autorizzazioni API** → Microsoft Graph → autorizzazioni delegate: `Files.ReadWrite`, `User.Read`, `offline_access` (e `Files.ReadWrite.All` per le cartelle condivise).
6. Copia l'**ID dell'applicazione (client)** in Pannello di controllo → App Microsoft.

L'accesso funziona con lilOS su `https://`, o su `http://` solo da questo computer (`localhost`): Microsoft non accetta altri indirizzi di ritorno.

Fornisce il servizio `netfs.onedrive`. Nessuna dipendenza. Richiede lilOS 1.22.0 o successivo.

Versione 1.2.0: l'accesso a Microsoft lo fa il kernel, con l'app di **Pannello di controllo → App Microsoft** (le impostazioni dell'app passano lì da sole; le connessioni restano come sono); codice in comune con gli altri moduli di rete.

## Soglie dei file grandi

Dalla 1.3.0. La dimensione dei pezzi con cui un file va su OneDrive è un'impostazione del modulo (un amministratore la cambia; vale subito, anche per i trasferimenti che partono dopo):

| Chiave | Cosa | Predefinito |
|---|---|---|
| `chunkMb` | Dimensione dei pezzi (MB) per i file oltre 4 MB; il modulo la arrotonda per difetto a un multiplo di 320 KB, come chiede Microsoft | 10 (da 1 a 60) |
