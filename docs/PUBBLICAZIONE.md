# Rilascio gratuito Spark
Rilascio completato il 14 novembre 2026. Sito: https://jacocorbani.github.io/lupi-mascherati-da-twink/ . Esiti e identificativi in `VERIFICHE.md`. La sequenza seguente documenta la procedura eseguita e va adattata con un nuovo backup prima di futuri interventi.
Il proprietario ha autorizzato migrazione, merge e pubblicazione, poi ha imposto il vincolo **tutto gratuito** e accettato la gestione locale degli account. Non collegare conti di fatturazione e non attivare Blaze.

## Sequenza di passaggio
1. Verificare test, build e CI su Node 22; preparare la pubblicazione GitHub Pages tramite Actions.
2. Verificare Authentication: email/password, iscrizioni autonome disabilitate, policy di almeno 12 caratteri, protezione enumerazione e dominio GitHub Pages.
3. Conservare backup recente, SHA-256 e regole precedenti in `reports/private` / `backups`. Sono dati privati, esclusi dal repository.
4. Nella finestra di passaggio distribuire solo regole e indici Firestore. Le regole chiudono i percorsi legacy: il vecchio frontend smette di accedere ai dati.
5. Con le scritture legacy bloccate, rinnovare il backup e verificare numero documenti/hash. Eseguire dry-run Spark e impostare il checkpoint associato a quel backup.
6. Creare l'admin tramite lo strumento locale. Importare con journal, senza cancellare o sovrascrivere gli originali. Rileggere e verificare i contenuti trasferiti.
7. Pubblicare la build configurata su GitHub Pages; verificare accesso pubblico limitato alla pagina di login, accesso del membro, foto e privacy. Consegnare le credenziali iniziali tramite file locale privato.
8. Conservare il commit di rilascio, journal e backup. Non ripristinare regole aperte come soluzione ordinaria a un errore.

## Prerequisiti verificati
Authentication email/password inizializzato il 13 novembre 2026. Configurati via API: blocco signup/delete client, policy 12–128 caratteri, protezione enumerazione, dominio `jacocorbani.github.io`.
Nessun bucket Storage e fatturazione disattivata nell'ultima lettura. La versione Spark non usa App Check/Functions/Storage. La protezione dei dati dipende da Authentication e Security Rules.

## Limiti espliciti
Le regole sono state testate negli emulatori, ma richiedono revisione prima di un uso più ampio. Non esiste un limite globale antispam applicativo: un membro può consumare le quote gratuite; in quel caso disabilitarlo dallo strumento locale. Le classifiche vengono salvate voce per voce: un'interruzione può lasciare un aggiornamento parziale, ripetibile dalla UI. La casualità della ruota e il promemoria di cambio password non sono verificati da un server applicativo.

