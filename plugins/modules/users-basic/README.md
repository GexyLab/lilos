# users-basic

Modulo del kernel che gestisce **utenti e accesso con password**.

- Tutto è in `users.json`, nella cartella del modulo: niente database.
- Le password sono salvate con scrypt; le sessioni durano `sessionDays` giorni (30) e scadono dopo `idleDays` giorni senza uso (7).
- Gli utenti si creano anche dalla riga di comando:

```
npm run kernel:cli -- users-basic add <nome> [--admin]
```

Fornisce i servizi `auth` e `users`.

Versione 1.1.0: `users.json` lo legge e lo scrive il kernel (`ctx.jsonStore`, riletto quando qualcuno lo cambia a mano o con `kernel:cli`); niente di diverso per chi lo usa. Richiede lilOS 1.22.0 o successivo.
