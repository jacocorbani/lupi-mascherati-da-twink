# Verifiche Spark — 14 novembre 2026

La versione attuale usa soltanto Authentication e Firestore nel piano Spark. Le vecchie verifiche Functions/Storage rimangono nella cronologia Git e non descrivono il rilascio attuale.

| Controllo | Risultato locale |
| --- | --- |
| Unitari e planner | 7/7 |
| Security Rules Spark | 13/13 |
| Flussi Auth e Firestore reali negli emulatori | 5/5 |
| Migrazione Spark e compressione | 1/1 |
| Totale | 26/26 |
| Build Vite | Superata; JS principale 579,04 kB / 174,46 kB gzip; chunk dati separato 4,09 kB |
| Configurazione Authentication cloud | Email/password attivo, policy 12–128, signup/delete client disabilitati, protezione enumerazione e domini configurati |
| Fatturazione | Nessun piano a pagamento attivato |

Ambiente locale: Windows, Node 24.19.0, Java 21, Firebase CLI 14.27.0. La CI usa Node 22. Esito della CI e verifiche del rilascio saranno registrati dopo la pubblicazione.

## Casi coperti
Anonimi, utenti non iscritti, disabilitati e token con versione obsoleta sono esclusi. Profilo pubblico separato dai dati privati. Client impossibilitati a creare account, modificare claim o accessi, falsificare proprietari, scrivere campi extra, superare limiti testo/foto, retrodatare post, votare per altri, cambiare o cancellare un voto e votare dopo la chiusura. Eventi, ruota e punteggi riservati agli admin; partecipazioni legate al chiamante.

Integrazione: provisioning locale, password attuale errata rifiutata, cambio password, invalidazione sessione, cambio nickname senza perdita di proprietà, voto unico, eventi, classifiche, ruota con 12 spicchi e idempotenza, disattivazione/riattivazione e protezione dell'ultimo amministratore.

Migrazione: compressione di un'immagine sintetica oltre limite conservando l'originale, autore storico non attribuito, interruzione simulata, ripresa senza duplicati e rilevazione di modifiche successive.

## Correzioni emerse
La prima validazione della ruota a 12 spicchi superava il limite di espressioni delle regole; è stata semplificata e il caso massimo è ora coperto da test. I punteggi sono documenti separati per evitare validazioni di grandi array. Il test di revoca è stato isolato per usare esplicitamente la sessione del membro disattivato.

## Limiti
Il promemoria di cambio password è UX, non un controllo server sul cambiamento della password. La ruota è locale e non certifica la casualità. Il progetto Spark ha quote finite e non dispone di un rate limit applicativo globale. Le Security Rules sono un prototipo verificato dagli scenari sopra, non una certificazione di assenza di vulnerabilità.

