# Verifiche effettivamente eseguite

Test completi: 16 ottobre 2026. Ricontrollo unitari (7/7) e build finale: 22 ottobre 2026. Ambiente Windows locale; Node 24.19.0, Firebase CLI 14.27.0, Java Temurin 21. Emulatori isolati `demo-combriccola`. Runtime Cloud Functions configurato Node 22. Anche la CI GitHub su Ubuntu/Node 22 ha superato tutte le suite e la build il 22 ottobre 2026 (run 39817131479). Il collaudo cloud resta necessario.

| Verifica                                | Risultato                                                                                               |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Build Vite                              | Superata; bundle JS finale 596,20 kB / 180,67 kB gzip (avviso dimensione >500 kB)                                  |
| Test unitari e planner migrazione       | 7/7 superati                                                                                            |
| Regole Firestore e Storage              | 11/11 superati, anche dopo aggiornamento lettura stato account admin                                    |
| Integrazione Auth/Functions/Firestore   | 8/8 superati                                                                                            |
| Importazione migrazione negli emulatori | 1/1 superato: immagini, autore ignoto, seconda esecuzione e conflitto                                   |
| Backup reale                            | 96 documenti, hash SHA-256 verificato dopo rilettura                                                    |
| Dry-run sul backup reale                | 109 scritture pianificate; 6 segnalazioni; 13 membri senza mapping verificato; nessuna scrittura remota |
| Dashboard desktop                       | Verificata nel browser, screenshot 1440×1000                                                            |
| Dashboard smartphone                    | Verificata a 390×844, screenshot; nessun overflow orizzontale del documento                             |
| Navigazione mobile diario/sondaggi      | Verificata nel browser                                                                                  |
| Login UI contro emulatori               | Account admin fittizio autenticato; menu amministrazione presente                                       |
| XSS nella UI                            | Stringa `<img src=x onerror=alert(1)>` visualizzata come testo; nessun elemento img inserito            |

## Casi di sicurezza coperti

Anonimi esclusi da dati e foto; nome reale leggibile solo dal proprietario e dagli admin; scritture dirette sempre negate, anche agli admin; modifica di ruoli, punteggi e voti da client negata; accesso negato a account disabilitati, sessioni obsolete, utenti temporanei e account non iscritti al gruppo; cancellazione altrui negata; vecchi percorsi negati; Storage limita proprietario, MIME, dimensione e sovrascrittura.

Le callable sono state testate attraverso HTTP negli emulatori: creazione account admin, primo accesso, verifica password attuale, cambio password, revoca token precedente, proprietà dei post dopo cambio nickname, voto singolo, indice non valido, sondaggio chiuso, partecipazione legata al chiamante, classifica riservata agli admin, estrazione server idempotente e disattivazione immediata.

## Problemi individuati e corretti

- Il primo test Storage ha rilevato una sovrascrittura consentita: aggiunto `resource == null`, suite rieseguita con successo.
- L'anteprima poteva essere rimpiazzata dal callback Auth: separata l'inizializzazione della fixture locale da quella della sessione reale.
- La prima esecuzione dell'emulatore Functions attendeva il parametro API key: configurazione locale esplicita e avvio non interattivo.
- Migrazione: i conflitti non vengono più saltati silenziosamente; sono verificati tramite hash e bloccano l'importazione.

## Non eseguito / da non considerare superato

Deploy Firebase o Pages, test cloud di App Check, test provider Auth in produzione, migrazione reale, associazione delle identità, prova su staging cloud separato, rollback in produzione, stress test, audit indipendente completo e collaudo esaustivo di ogni browser. Non è stato simulato un distacco di rete reale nel browser: è presente il controllo offline, ma quel caso richiede ancora collaudo manuale.

Le nuove regole sono una proposta verificata negli emulatori e pronta per revisione; nessun insieme finito di test certifica l'assenza di ogni vulnerabilità. La loro applicazione deve essere coordinata con il nuovo frontend e i nuovi account.
