"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { COULEURS, euro } from "../lib/shared";
import { Users } from "lucide-react";
import NavBar from "./NavBar";

export default function Accueil() {
  const [locataires, setLocataires] = useState([]);
  const [factures, setFactures] = useState([]);
  const [payeursMap, setPayeursMap] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function charger() {
      const { data: loc } = await supabase.from("locataires").select("*").order("ordre");
      const { data: fac } = await supabase.from("factures").select("*");
      const { data: fp } = await supabase.from("facture_payeurs").select("*");
      setLocataires(loc || []);
      setFactures(fac || []);
      const map = {};
      (fp || []).forEach((r) => {
        if (!map[r.facture_id]) map[r.facture_id] = [];
        map[r.facture_id].push(r.locataire_id);
      });
      setPayeursMap(map);
      setLoading(false);
    }
    charger();
  }, []);

  const total = factures.reduce((s, f) => s + Number(f.montant), 0);
  const parPersonne = locataires.length ? total / locataires.length : 0;
  const enAttente = factures.filter((f) => f.statut === "en_attente").length;
  const sansPreuve = factures.filter((f) => !f.justificatif_url).length;

  const soldes = locataires.map((l, i) => {
    const paye = factures.reduce((s, f) => {
      const payeurIds = payeursMap[f.id] || (f.paye_par ? [f.paye_par] : []);
      if (!payeurIds.includes(l.id)) return s;
      return s + Number(f.montant) / payeurIds.length;
    }, 0);
    return { nom: l.nom, solde: paye - parPersonne, couleur: COULEURS[i % COULEURS.length] };
  });

  if (loading) return <div style={{ padding: 20, color: "#8A968F" }}>Chargement...</div>;

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 76 }}>
      <div style={{ padding: "26px 18px 20px", background: "linear-gradient(160deg, #182521 0%, #1F3229 100%)", color: "#EEF1EF", borderRadius: "0 0 24px 24px" }}>
        <div style={{ fontSize: 11.5, letterSpacing: 1.2, opacity: 0.55, textTransform: "uppercase", fontWeight: 600 }}>Appart 4B</div>
        <div style={{ fontSize: 23, fontWeight: 800, marginTop: 3, letterSpacing: -0.3 }}>Bonjour 👋</div>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <div style={{ flex: 1, background: "rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 13px" }}>
            <div style={{ fontSize: 10.5, opacity: 0.6, fontWeight: 500 }}>Dépenses du mois</div>
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>{euro(total)}</div>
          </div>
          <div style={{ flex: 1, background: "rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 13px" }}>
            <div style={{ fontSize: 10.5, opacity: 0.6, fontWeight: 500 }}>Part / personne</div>
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>{euro(Math.round(parPersonne))}</div>
          </div>
        </div>
        {(enAttente > 0 || sansPreuve > 0) && (
          <div style={{ display: "flex", gap: 8, marginTop: 10, fontSize: 11, opacity: 0.75 }}>
            {enAttente > 0 && <span>{enAttente} en attente</span>}
            {enAttente > 0 && sansPreuve > 0 && <span>·</span>}
            {sansPreuve > 0 && <span>{sansPreuve} sans justificatif</span>}
          </div>
        )}
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 17, boxShadow: "0 1px 3px rgba(28,38,33,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 13 }}>
            <Users size={16} color="#2F6F63" />
            <div style={{ fontSize: 14, fontWeight: 700, color: "#182521" }}>Qui doit quoi</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {soldes.map((s) => (
              <div key={s.nom} style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <div style={{ width: 32, height: 32, borderRadius: 999, background: s.couleur, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, fontWeight: 700 }}>
                  {s.nom[0]}
                </div>
                <div style={{ flex: 1, fontSize: 14, fontWeight: 500, color: "#182521" }}>{s.nom}</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: s.solde >= 0 ? "#2F6F63" : "#C0463C" }}>
                  {s.solde >= 0 ? "+" : ""}{Math.round(s.solde)} DH
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <NavBar />
    </div>
  );
}
