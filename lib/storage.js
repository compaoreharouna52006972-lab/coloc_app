import { supabase } from "./supabaseClient";

const BUCKET = "justificatifs";

// Les anciennes factures stockent l'URL publique complète ; les nouvelles stockent seulement
// le chemin du fichier. Cette fonction sait lire les deux.
export function cheminJustificatif(valeur) {
  if (!valeur) return null;
  const marqueurs = [`/object/public/${BUCKET}/`, `/object/sign/${BUCKET}/`, `/object/${BUCKET}/`];
  for (const m of marqueurs) {
    const i = valeur.indexOf(m);
    if (i !== -1) return decodeURIComponent(valeur.slice(i + m.length).split("?")[0]);
  }
  return valeur.startsWith("http") ? null : valeur;
}

export function estImage(valeur) {
  return /\.(jpg|jpeg|png|webp|gif)$/i.test(cheminJustificatif(valeur) || valeur || "");
}

// Lien temporaire : même si quelqu'un le copie, il expire. Un bucket public, lui, reste ouvert pour toujours.
export async function urlSignee(valeur, secondes = 3600) {
  const chemin = cheminJustificatif(valeur);
  if (!chemin) return valeur || null;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(chemin, secondes);
  return error ? null : data.signedUrl;
}

// Version groupée (export PDF) : renvoie { valeurOriginale: urlSignée }.
export async function urlsSignees(valeurs, secondes) {
  const resultat = {};
  const chemins = [];
  valeurs.forEach((v) => {
    const c = cheminJustificatif(v);
    if (c) chemins.push({ v, c });
    else resultat[v] = v;
  });
  if (!chemins.length) return resultat;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(chemins.map((x) => x.c), secondes);
  (data || []).forEach((item, i) => {
    resultat[chemins[i].v] = item.error ? null : item.signedUrl;
  });
  return resultat;
}

// Nom de fichier imprévisible (l'ancien `Date.now()` pouvait être deviné).
export function nouveauChemin(fichier) {
  const ext = (fichier.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "bin";
  const id =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${id}.${ext}`;
}

export async function uploaderJustificatif(fichier) {
  const chemin = nouveauChemin(fichier);
  const { error } = await supabase.storage.from(BUCKET).upload(chemin, fichier, { contentType: fichier.type || undefined });
  return error ? { error } : { chemin };
}

export async function supprimerJustificatif(valeur) {
  const chemin = cheminJustificatif(valeur);
  if (chemin) await supabase.storage.from(BUCKET).remove([chemin]);
}
