# Checklist di rilascio — approvazione richiesta

Il 13 novembre 2026 il proprietario ha autorizzato migrazione, merge e pubblicazione. L'autorizzazione non sostituisce i prerequisiti tecnici: completare servizi, staging, checkpoint e verifica degli accessi prima del passaggio. Stato attuale: fatturazione disattivata, nessun conto accessibile all'operatore, Auth non inizializzato, nessun bucket Storage. L'attivazione della fatturazione richiede il proprietario.

1. Rivedere commit, test e `docs/INVENTARIO.md`; verificare il piano Firebase e approvare eventuali costi di Cloud Functions e Storage. Non attivare automaticamente Blaze.
2. Verificare backup dati e regole esistenti, conservare gli hash e una copia separata protetta. La sostituzione delle regole interrompe il vecchio client: pianificare una finestra di passaggio, senza distribuire prima le nuove regole sulla vecchia app.
3. Creare e validare un ambiente Firebase di staging separato, con gli stessi provider e la stessa regione scelta per la produzione. I test locali non equivalgono a un collaudo cloud.
4. Abilitare Email/Password, configurare la policy delle password (minimo 12 caratteri) e la protezione contro l'enumerazione degli account. Se il progetto supporta Identity Platform, disabilitare la creazione account dai client. Verificare con una richiesta diretta che l'API di registrazione rifiuti le nuove iscrizioni. Non basta l'assenza di un modulo di registrazione.
5. Registrare il dominio GitHub Pages nei domini autorizzati Auth. Configurare App Check con reCAPTCHA Enterprise sul dominio previsto, inserire la site key pubblica e collaudare token validi, scaduti e assenti. Valutare l'enforcement anche su Firestore e Storage dopo il collaudo.
6. Configurare il parametro backend `AUTH_WEB_API_KEY` con la chiave Web pubblica del progetto. Non lasciare `demo-key` in produzione. Gli emulatori usano `functions/.env.local` escluso da Git.
7. Verificare esistenza e regione del bucket. Per lettura Blob dal browser configurare CORS esclusivamente per il dominio del sito e localhost nello staging. Le regole Storage usano Firestore `(default)`: concedere le autorizzazioni di servizio richieste al deploy.
8. Configurare la build con le variabili `.env.example` per il progetto reale e `VITE_USE_EMULATORS=false`. Verificare che `VITE_APPCHECK_SITE_KEY` sia valorizzata.
9. Dopo approvazione esplicita, distribuire Functions e regole selezionate con CLI e `--project lupimacheratidatwink`; rivedere l'eventuale richiesta di abilitazione API/IAM/costi. Non distribuire servizi estranei.
10. Creare il primo admin da un ambiente fidato con credenziali operatore ADC, lo script `functions/bootstrap-admin.js` e `APPROVE_ADMIN_BOOTSTRAP` uguale al project ID. Non pubblicare endpoint di bootstrap; comunicare la password temporanea privatamente. Lo script non assegna ruoli ad account preesistenti e fallisce se lo username esiste.
11. Conservare inizialmente i contenuti come storico senza associazioni personali implicite. Eseguire la prova in staging; seguire `docs/MIGRAZIONE.md` per l'importatore di produzione e il checkpoint. L'autorizzazione del proprietario è acquisita; restano necessari backup fresco, accessi funzionanti e ambiente protetto prima dell'importazione.
12. Ottenere approvazione al merge. Pubblicare l'output `dist/` tramite un workflow Pages manuale o il processo approvato; non servire i sorgenti Vite direttamente dalla radice del repository. Aggiornare la configurazione Pages solo con approvazione.
13. Collaudare login, password, account disabilitato, foto private, sondaggio concorrente, eventi, ruota e gestione mobile sul dominio finale. Conservare il piano di ripristino.

## Limiti da chiudere prima del rilascio

- Auth e App Check devono essere collaudati su un progetto cloud reale di staging.
- L'interfaccia carica inizialmente le ultime 100 voci per diario, sondaggi ed estrazioni; «Carica contenuti precedenti» amplia progressivamente la finestra. Verificare costi e prestazioni prima di archivi molto grandi.
- Le foto rimosse dal diario non vengono eliminate automaticamente da Storage: serve una procedura di pulizia degli oggetti orfani, con controllo dei riferimenti, prima di crescita significativa del volume.
- Il tipo MIME è controllato, ma non viene eseguita una transcodifica server delle immagini. Valutare la normalizzazione prima di un utilizzo più ampio.
- In caso di guasto tra Auth e Firestore, provisioning e reset falliscono mantenendo l'accesso chiuso; il recupero richiede un operatore fidato.
- Sono necessari controlli sull'ultimo amministratore prima di consentire la gestione ordinaria di più amministratori. L'interfaccia impedisce l'autodisattivazione, ma non gestisce quorum amministrativi.
