# logicstudio-collections

I blocchi di Logic Studio per **liste** e **matrici**.

Una **lista** (o array) è un elenco ordinato di valori; una **matrice** è una lista di righe della stessa lunghezza. Gli indici partono da 0 e un indice negativo conta dalla fine (-1 è l'ultimo). I blocchi non modificano mai la lista in ingresso: danno sempre una copia nuova. Una lista può avere al massimo 100000 elementi.

- **Liste**: lunghezza, elemento, imposta, aggiungi, inserisci, rimuovi, porzione, unisci liste (con porte aggiungibili), contiene, inverti, ordina (anche per un campo degli oggetti), elementi unici, filtra, estrai campo, somma/minimo/massimo/media, intervallo, dividi testo, unisci in testo, per ogni elemento, accumula, elemento a caso.
- **Matrici**: crea, dimensioni, cella, riga, colonna, trasposta, somma, differenza, prodotto, scala, identità, determinante (fino a 10×10), da lista, appiattisci.

Gli errori (indice fuori dalla lista, matrici di misure incompatibili…) escono dalla porta «Eccezione» del blocco, o vanno nella console principale se non è collegata.

Richiede il motore `logicstudio-engine`.
