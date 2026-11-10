# logicstudio-charts

I **grafici** di Logic Studio, come Componenti UI per le finestre (`.lsui`) dei progetti:

- **nel tempo**: linee, aree (anche impilate o al 100%), tempo reale (gli ultimi secondi o minuti, una serie per ogni porta aggiunta), gradini (stati sì/no o testo nel tempo, una porta per stato), mini linea (sta in una riga di testo);
- **confronti**: colonne (affiancate o impilate), barre orizzontali (ordinabili), torta e ciambella (al massimo 6 fette), radar (da 3 a 12 assi);
- **distribuzioni**: dispersione (punti x, y), istogramma (classi automatiche o fisse), mappa di calore (una griglia).

Tutti hanno un solo asse dei valori, la legenda da due serie in su (un clic accende e spegne una serie), i colori delle serie sempre nello stesso ordine, il tema chiaro e scuro di lilOS, un riquadro con i valori al passaggio del mouse, la vista tabella con gli stessi dati, l'esportazione in PNG e CSV e l'uso da tastiera (frecce e Invio). Un clic su un punto, una barra, una fetta o una cella lo manda all'uscita «punto scelto».

Ogni componente ha il suo oggetto in uno schema: gli altri blocchi si collegano a quello. Tutte hanno anche gli ingressi «abilitato» e «visibile». Il disegno lo fa la libreria dei grafici dell'SDK (`sdk/ui/charts.js`), che possono usare anche le altre app.

Richiede `logicstudio-engine` e `logicstudio-ui`.
