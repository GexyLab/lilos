# logicstudio-core

I **blocchi di base** di Logic Studio: valori (Costante · Variabile, Memoria, Cast), logica (AND, OR, Confronto, If · Else, Switch · Case…), matematica, testo, oggetti e liste, tempo (Intervallo, Ritardo, Debounce, Throttle…), le due **console** (Print, Input), le **eccezioni** (Throw, Catch, Dati di Exception, Catch globale), le **porte di schema** (Parametro e Return, per collegare schemi diversi di un progetto) e l'oggetto delle **Componenti UI** in uno schema. I nomi richiamano le funzioni equivalenti dei linguaggi di programmazione (dalla 1.1.0).

**Costante · Variabile** (ex «Valore») ha due ingressi nascosti di serie, che si mostrano con l'occhio nelle Proprietà: **invia** (se non è collegato, il valore esce all'avvio dello schema; se è collegato, esce solo a ogni impulso) e **imposta** (se è collegato il blocco è una variabile: il valore che arriva, convertito nel «Tipo», diventa il nuovo valore; altrimenti è una costante).

Dalla 1.4.0 c'è la categoria **Disegno**: i blocchi **Testo · Commento** e **Forma** scrivono testi e disegnano rettangoli, ellissi, rombi, triangoli, linee e frecce sul foglio dello schema (non hanno porte e il programma non li esegue; per vederli disegnati serve lilOS 1.48.0), e il pacchetto porta le sue prime **Componenti UI**, **Testo formattato** e **Forma**, per fare lo stesso nelle finestre.

Alcuni blocchi permettono di aggiungere porte (per esempio AND, Somma, Template, Switch · Case): si aggiungono e si tolgono nella barra delle proprietà dell'IDE.

Richiede il motore `logicstudio-engine`.
