"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { COULEURS, euro } from "../lib/shared";
import { Users, Bell } from "lucide-react";
import NavBar from "./NavBar";

export default function Accueil() {
  const [locataires, setLocataires] = useState([]);
  const [factures, setFactures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function charger() {
      const { data: loc } = await supabase.from("locataires").select("*").order("ordre");
      const { data: fac } = await supabase.from("factures").select("*");
      setLocataires(loc || []);
      setFactures(fac || []);
      setLoading(false);
    }
    charger();
  }, []);

  const total = factures.reduce((s, f) => s + Number(f.montant), 0);
  const parPersonne = locataires.length ? total / locataires.length : 0;

  const soldes = locataires.map((l, i) => {
    const paye = factures.filter((f) => f.paye_par === l.id).reduce((s, f) => s + Number(f.montant), 0);
    return { nom: l.nom, solde: paye - parPersonne, couleur: COULEURS[i % COULEURS.length] };
  });

  if (loading) return <div style={{ padding: 20 }}>Chargement...</div>;

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 76 }}>
      <div style={{ padding: "22px 18px 16px", background: "#1C2621", color: "#EEF1EF", borderRadius: "0 0 20px 20px" }}>
        <div style={{ fontSize: 12, letterSpacing: 1, opacity: 0.6, textTransform: "uppercase" }}>Appart 4B</div>
        <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>Bonjour 👋</div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <div style={{ flex: 1, background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, opacity: 0.6 }}>Dépenses du mois</div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{euro(total)}</div>
          </div>
          <div style={{ flex: 1, background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 12px" }}>
            <div style={{ fontSize: 11, opacity: 0.6 }}>Part / personne</div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>{euro(Math.round(parPersonne))}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 1px 2px rgba(28,38,33,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Users size={16} color="#2F6F63" />
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>Qui doit quoi</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {soldes.map((s) => (
              <div key={s.nom} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: 999, background: s.couleur, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>
                  {s.nom[0]}
                </div>
                <div style={{ flex: 1, fontSize: 14 }}>{s.nom}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: s.solde >= 0 ? "#2F6F63" : "#C0463C" }}>
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
