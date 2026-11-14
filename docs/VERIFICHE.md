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

Ambiente locale: Windows, Node 24.19.0, Java 21, Firebase CLI 14.27.0. Anche la CI su Node 22 è superata: run 43582385432 e 43582382437, commit `feb49aae5b979061ca57bfed857d527bceb059a4`.

## Rilascio verificato il 14 novembre 2026
Regole e indici Firestore distribuiti. Backup definitivo di 99 documenti, hash SHA-256 `7fc07b18a00cc4334e89ddcc88788e6c116507e8ca469142fb6bae4c99b0a353`. Importazione completata con 113 documenti creati e riletti per confronto integrale: 99 originali nell'archivio amministrativo e 14 ricordi nel diario, con 7 foto. Nessun originale cancellato o sovrascritto.

Smoke test cloud con SDK client: letture anonime legacy e membri negate; account amministratore attivo, profilo privato accessibile, 14 ricordi e 99 record storici leggibili con autorizzazione. Accesso e scrittura del diario verificati anche nell'interfaccia con dati fittizi negli emulatori.

PR #1 unita al ramo principale (`f134810369fbe3dc0032582f3dd02bc78f0012c3`). Pubblicazione GitHub Pages riuscita nel run 43582696538; pagina di accesso verificata sul sito pubblico. Ultima lettura cloud: `billingEnabled: false`, nessun bucket Storage. Credenziali, backup e journal restano esclusi dal repository.

## Casi coperti
Anonimi, utenti non iscritti, disabilitati e token con versione obsoleta sono esclusi. Profilo pubblico separato dai dati privati. Client impossibilitati a creare account, modificare claim o accessi, falsificare proprietari, scrivere campi extra, superare limiti testo/foto, retrodatare post, votare per altri, cambiare o cancellare un voto e votare dopo la chiusura. Eventi, ruota e punteggi riservati agli admin; partecipazioni legate al chiamante.

Integrazione: provisioning locale, password attuale errata rifiutata, cambio password, invalidazione sessione, cambio nickname senza perdita di proprietà, voto unico, eventi, classifiche, ruota con 12 spicchi e idempotenza, disattivazione/riattivazione e protezione dell'ultimo amministratore.

Migrazione: compressione di un'immagine sintetica oltre limite conservando l'originale, autore storico non attribuito, interruzione simulata, ripresa senza duplicati e rilevazione di modifiche successive.

## Correzioni emerse
La prima validazione della ruota a 12 spicchi superava il limite di espressioni delle regole; è stata semplificata e il caso massimo è ora coperto da test. I punteggi sono documenti separati per evitare validazioni di grandi array. Il test di revoca è stato isolato per usare esplicitamente la sessione del membro disattivato.

## Limiti
Il promemoria di cambio password è UX, non un controllo server sul cambiamento della password. La ruota è locale e non certifica la casualità. Il progetto Spark ha quote finite e non dispone di un rate limit applicativo globale. Le Security Rules sono un prototipo verificato dagli scenari sopra, non una certificazione di assenza di vulnerabilità.

