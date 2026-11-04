// Fonctions pures : pas de React, pas de Supabase.
// Utilisables dans le navigateur ET sur le serveur (route des notifications),
// et testables avec `npm test` sans rien installer.

const JOUR_MS = 86400000;
// Lundi 1er janvier 2024 : point de départ fixe de la rotation du ménage.
// Une rotation calculée depuis une date fixe avance toute seule, semaine après semaine.
const DEBUT_ROTATION = Date.UTC(2024, 0, 1);

export function modulo(a, n) {
  return ((a % n) + n) % n;
}

// ---------- Semaines ISO ----------

function jeudiDeLaSemaine(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const jour = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - jour);
  return d;
}

export function numeroSemaine(date) {
  const jeudi = jeudiDeLaSemaine(date);
  const debutAnnee = new Date(Date.UTC(jeudi.getUTCFullYear(), 0, 1));
  return Math.ceil(((jeudi - debutAnnee) / JOUR_MS + 1) / 7);
}

// L'année ISO peut différer de l'année civile autour du 1er janvier
// (ex. le lundi 29/12/2025 appartient à la semaine 1 de 2026).
export function anneeISO(date) {
  return jeudiDeLaSemaine(date).getUTCFullYear();
}

export function lundiDeSemaine(offset = 0, base = new Date()) {
  const jour = base.getDay() || 7;
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() - jour + 1 + offset * 7);
}

export function cleSemaine(lundi) {
  return `${anneeISO(lundi)}-${numeroSemaine(lundi)}`;
}

function rangSemaine(lundi) {
  const ms = Date.UTC(lundi.getFullYear(), lundi.getMonth(), lundi.getDate());
  return Math.round((ms - DEBUT_ROTATION) / (7 * JOUR_MS));
}

// ---------- Rotations ----------

export function responsableMenageAuto(locataires, lundi) {
  if (!locataires.length) return null;
  return locataires[modulo(rangSemaine(lundi), locataires.length)].id;
}

// jour : 0 = lundi ... 6 = dimanche. moment : "midi" | "soir" | "jour" (dimanche).
export function responsableRepas(repas, locataires, jour, moment) {
  const ligne = (repas || []).find((r) => r.jour_semaine === jour && r.moment === moment);
  if (ligne?.responsable_id) return ligne.responsable_id;
  if (!locataires.length) return null;
  return locataires[jour % locataires.length].id;
}

// ---------- Argent (calculs en centimes entiers) ----------
// Pourquoi : en nombres décimaux, 0,1 + 0,2 vaut 0,30000000000000004. Sur des dizaines de
// factures, ces écarts s'accumulent et les soldes ne tombent plus juste. En centimes entiers,
// les additions sont exactes.

export function enCentimes(montant) {
  return Math.round(Number(montant || 0) * 100);
}

function decalageStable(id) {
  const s = String(id);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Répartit un total entre des personnes sans perdre ni créer un centime.
// Le(s) centime(s) restant(s) tournent selon `decalage` pour ne pas toujours pénaliser la même personne.
export function repartir(totalCentimes, ids, decalage = 0) {
  const n = ids.length;
  const resultat = {};
  if (!n) return resultat;
  const base = Math.trunc(totalCentimes / n);
  const reste = totalCentimes - base * n;
  const signe = reste < 0 ? -1 : 1;
  const nbExtra = Math.abs(reste);
  ids.forEach((id, i) => {
    const rang = modulo(i - decalage, n);
    resultat[id] = base + (rang < nbExtra ? signe : 0);
  });
  return resultat;
}

// Solde de chacun, en centimes : ce qu'il a payé moins sa part des dépenses.
// Chaque facture réglée est partagée à parts égales entre tous les locataires.
// Les factures « en attente » ne sont pas encore payées : elles ne comptent pas dans les soldes.
export function calculerSoldes(locataires, factures, payeursMap) {
  const ids = locataires.map((l) => l.id);
  const soldes = {};
  ids.forEach((id) => (soldes[id] = 0));

  for (const f of factures) {
    if (f.statut === "en_attente") continue;
    const total = enCentimes(f.montant);
    const brut = payeursMap[f.id] || (f.paye_par ? [f.paye_par] : []);
    const payeurs = brut.filter((id) => ids.includes(id));
    if (!payeurs.length) continue;
    const decalage = decalageStable(f.id);
    const dus = repartir(total, ids, decalage);
    const payes = repartir(total, payeurs, decalage);
    ids.forEach((id) => {
      soldes[id] += (payes[id] || 0) - (dus[id] || 0);
    });
  }
  return soldes;
}

// ---------- Dates ----------

export function moisCourant(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function dansLeMois(facture, mois) {
  return String(facture.date || "").slice(0, 7) === mois;
}

// Jour (0 = lundi) et heure au Maroc, quel que soit le fuseau du serveur (Vercel tourne en UTC).
export function maintenantCasablanca(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Casablanca",
    weekday: "short",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);
  const jours = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  const valeur = (type) => parts.find((p) => p.type === type)?.value;
  return { jour: jours[valeur("weekday")], heure: Number(valeur("hour")) };
}
