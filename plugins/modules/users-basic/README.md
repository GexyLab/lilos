# users-basic

Modulo del kernel che gestisce **utenti e accesso con password**.

- Tutto è in `users.json`, nella cartella del modulo: niente database.
- Le password sono salvate con scrypt; le sessioni durano `sessionDays` giorni (30) e scadono dopo `idleDays` giorni senza uso (7).
- Gli utenti si creano anche dalla riga di comando:

```
npm run kernel:cli -- users-basic add <nome> [--admin]
```

- La password si cambia dalla riga di comando, in un terminale:

```
npm run kernel:cli -- users-basic passwd <nome>            # chiede la vecchia password, poi la nuova
npm run kernel:cli -- users-basic passwd <nome> --reset    # password dimenticata: serve un amministratore
```

  Con `--reset` il comando chiede nome utente e password di un amministratore e una conferma, poi la nuova password. Dopo **3 password sbagliate** di fila l'utente a cui appartengono è **bloccato per 5 minuti**: non può cambiare la password né accedere a lilOS. Il blocco è salvato in `users.json`, quindi vale anche per il kernel acceso.

Fornisce i servizi `auth` e `users`.

Versione 1.2.0: `passwd` chiede la vecchia password, o con `--reset` l'approvazione di un amministratore; 3 password sbagliate bloccano l'utente per 5 minuti. Il servizio `users` ha in più `verify(id, password)`.

Versione 1.1.0: `users.json` lo legge e lo scrive il kernel (`ctx.jsonStore`, riletto quando qualcuno lo cambia a mano o con `kernel:cli`); niente di diverso per chi lo usa. Richiede lilOS 1.22.0 o successivo.
