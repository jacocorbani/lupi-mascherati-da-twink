export class ValidationError extends Error {}
export function text(value, max = 200, min = 1) {
  if (
    typeof value !== "string" ||
    value.trim().length < min ||
    value.trim().length > max
  )
    throw new ValidationError("Testo non valido.");
  return value.trim();
}
export function username(value) {
  const result = text(value, 30, 3).toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{2,29}$/.test(result))
    throw new ValidationError(
      "Username: usa 3–30 lettere, numeri, punti o trattini.",
    );
  return result;
}
export const emailFor = (value) =>
  `${username(value)}@members.combriccola.invalid`;
export function password(value) {
  if (typeof value !== "string" || value.length < 12 || value.length > 128)
    throw new ValidationError(
      "La password deve contenere da 12 a 128 caratteri.",
    );
  return value;
}
export function id(value) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(value))
    throw new ValidationError("Identificativo non valido.");
  return value;
}
export function options(value) {
  if (!Array.isArray(value) || value.length < 2 || value.length > 12)
    throw new ValidationError("Servono da 2 a 12 opzioni.");
  const result = value.map((v) => text(v, 120));
  if (new Set(result).size !== result.length)
    throw new ValidationError("Le opzioni devono essere diverse.");
  return result;
}
export function segments(value) {
  if (!Array.isArray(value) || value.length < 2 || value.length > 12)
    throw new ValidationError("Servono da 2 a 12 spicchi.");
  return value.map((s) => {
    if (!Number.isInteger(s.weight) || s.weight < 1 || s.weight > 10000)
      throw new ValidationError("Peso non valido.");
    return { label: text(s.label, 80), weight: s.weight };
  });
}
export function pick(items, ticket) {
  let sum = 0;
  for (let i = 0; i < items.length; i++) {
    sum += items[i].weight;
    if (ticket < sum) return i;
  }
  throw new ValidationError("Estrazione fuori intervallo.");
}
export function timestamp(value) {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) throw new ValidationError("Data non valida.");
  return ms;
}
