import { supabase } from "./supabaseClient";

// Charge locataires + factures + payeurs. Utilisé par l'accueil, les factures et l'historique
// (ce code était recopié trois fois).
export async function chargerFactures() {
  const [loc, fac, fp] = await Promise.all([
    supabase.from("locataires").select("*").order("ordre"),
    supabase.from("factures").select("*").order("date", { ascending: false }),
    supabase.from("facture_payeurs").select("*"),
  ]);

  const payeursMap = {};
  (fp.data || []).forEach((r) => {
    if (!payeursMap[r.facture_id]) payeursMap[r.facture_id] = [];
    payeursMap[r.facture_id].push(r.locataire_id);
  });

  return {
    locataires: loc.data || [],
    factures: fac.data || [],
    payeursMap,
    erreur: loc.error || fac.error || fp.error ? "Impossible de charger les données. Vérifie ta connexion." : "",
  };
}
