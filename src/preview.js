// Fictional data, never a production fallback and never written to Firebase.
const tomorrow = new Date(Date.now() + 86400000).toISOString();
export const preview = {
  uid: "sample-1",
  admin: false,
  members: [
    { id: "sample-1", nickname: "Viaggiatore" },
    { id: "sample-2", nickname: "La Bussola" },
    { id: "sample-3", nickname: "Luna" },
    { id: "sample-4", nickname: "Il Capitano" },
  ],
  diary: [
    {
      id: "sample-memory",
      authorUid: "sample-2",
      text: "Ci siamo persi tre volte. Abbiamo trovato il posto giusto quattro volte. Direi che è andata bene.",
      createdAt: new Date().toISOString(),
    },
  ],
  events: [
    {
      id: "sample-event",
      title: "Una sera, senza fretta",
      description: "Cena e chiacchiere fino a tardi.",
      location: "Il nostro posto del cuore",
      date: tomorrow,
    },
  ],
  polls: [
    {
      id: "sample-poll",
      question: "La prossima fuga dal solito?",
      options: [
        "Un weekend in montagna",
        "Una giornata al mare",
        "Ci basta stare insieme",
      ],
      counts: [2, 1, 1],
      closed: false,
    },
  ],
  wheel: [
    {
      segments: [
        { label: "Scegli la musica", weight: 1 },
        { label: "Porti il dolce", weight: 1 },
        { label: "Organizzi la prossima", weight: 1 },
        { label: "Giro di fortuna", weight: 1 },
      ],
    },
  ],
  wheelSpins: [],
  rankings: [],
};
