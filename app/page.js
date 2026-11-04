"use client";
import { useEffect, useState } from "react";
import { COULEURS, euroCentimes } from "../lib/shared";
import { enCentimes, calculerSoldes, moisCourant, dansLeMois } from "../lib/logique.mjs";
import { chargerFactures } from "../lib/donnees";
import { S } from "../lib/styles";
import { Users } from "lucide-react";
import NavBar from "./NavBar";

export default function Accueil() {
  const [donnees, setDonnees] = useState({ locataires: [], factures: [], payeursMap: {} });
  const [erreur, setErreur] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chargerFactures().then(({ erreur, ...reste }) => {
      setDonnees(reste);
      setErreur(erreur);
      setLoading(false);
    });
  }, []);

  const { locataires, factures, payeursMap } = donnees;

  // « Dépenses du mois » : uniquement les factures réglées du mois en cours.
  const mois = moisCourant();
  const facturesMois = factures.filter((f) => dansLeMois(f, mois) && f.statut !== "en_attente");
  const totalMoisC = facturesMois.reduce((s, f) => s + enCentimes(f.montant), 0);
  const partC = locataires.length ? Math.round(totalMoisC / locataires.length) : 0;

  const enAttente = factures.filter((f) => f.statut === "en_attente");
  const totalAttenteC = enAttente.reduce((s, f) => s + enCentimes(f.montant), 0);
  const sansPreuve = factures.filter((f) => !f.justificatif_url).length;

  // « Qui doit quoi » : solde cumulé depuis le début, factures réglées uniquement.
  const soldesC = calculerSoldes(locataires, factures, payeursMap);
  const soldes = locataires.map((l, i) => ({
    id: l.id,
    nom: l.nom,
    solde: soldesC[l.id] || 0,
    couleur: COULEURS[i % COULEURS.length],
  }));

  if (loading) return <div style={{ padding: 20, color: "#8A968F" }}>Chargement...</div>;

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 76 }}>
      <div style={{ padding: "26px 18px 20px", background: "linear-gradient(160deg, #182521 0%, #1F3229 100%)", color: "#EEF1EF", borderRadius: "0 0 24px 24px" }}>
        <div style={{ fontSize: 11.5, letterSpacing: 1.2, opacity: 0.55, textTransform: "uppercase", fontWeight: 600 }}>Appart 4B</div>
        <div style={{ fontSize: 23, fontWeight: 800, marginTop: 3, letterSpacing: -0.3 }}>Bonjour 👋</div>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <div style={{ flex: 1, background: "rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 13px" }}>
            <div style={{ fontSize: 10.5, opacity: 0.6, fontWeight: 500 }}>Dépenses du mois</div>
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>{euroCentimes(totalMoisC)}</div>
          </div>
          <div style={{ flex: 1, background: "rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 13px" }}>
            <div style={{ fontSize: 10.5, opacity: 0.6, fontWeight: 500 }}>Part / personne</div>
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>{euroCentimes(partC)}</div>
          </div>
        </div>
        {(enAttente.length > 0 || sansPreuve > 0) && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10, fontSize: 11, opacity: 0.75 }}>
            {enAttente.length > 0 && <span>{enAttente.length} en attente ({euroCentimes(totalAttenteC)})</span>}
            {enAttente.length > 0 && sansPreuve > 0 && <span>·</span>}
            {sansPreuve > 0 && <span>{sansPreuve} sans justificatif</span>}
          </div>
        )}
      </div>

      <div style={{ padding: 16 }}>
        {erreur && <div style={S.erreur}>{erreur}</div>}
        <div style={S.carte}>
          <div style={S.carteEntete}>
            <Users size={16} color="#2F6F63" />
            <div style={S.carteTitre}>Qui doit quoi</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {soldes.map((s) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <div style={{ width: 32, height: 32, borderRadius: 999, background: s.couleur, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, fontWeight: 700 }}>
                  {s.nom[0]}
                </div>
                <div style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "#182521" }}>{s.nom}</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: s.solde >= 0 ? "#2F6F63" : "#C0463C" }}>
                  {s.solde > 0 ? "+" : ""}{euroCentimes(s.solde)}
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: "#8A968F", marginTop: 12 }}>
            Solde cumulé, factures réglées uniquement. Positif : on te doit de l'argent.
          </div>
        </div>
      </div>
      <NavBar />
    </div>
  );
}
