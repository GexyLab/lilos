# services-isolate

Modulo del kernel che fa girare i **servizi delle app**: i punti d'ingresso `kind: 'service'` del manifesto, che lavorano nel kernel anche quando lilOS è chiuso.

- Ogni servizio ha un suo processo Node, avviato con il modello di permessi di Node: legge solo la cartella del modulo e non avvia programmi.
- Il codice dell'app gira in un isolato V8 ([isolated-vm](https://github.com/laverdet/isolated-vm)), con un limite di memoria (128 MB) e di tempo per ogni esecuzione (10 secondi). Non ha `require`, `process`, rete né file: solo `lilos`, le cui richieste passano dal kernel, che le controlla con i permessi dell'app.
- Un crash, un ciclo infinito o la memoria esaurita fermano solo quel servizio; il kernel lo fa ripartire (dopo 1, 5 e 30 secondi) e dopo tre volte in cinque minuti lo lascia spento.

Fornisce il servizio `runtime`. Senza questo modulo lilOS funziona lo stesso, ma senza servizi.

Richiede Node da 22 a 25 (isolated-vm 6.2, con i binari già compilati per Windows, macOS e Linux).
