"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { CATEGORIES, euro } from "../../lib/shared";
import { History, FileText } from "lucide-react";
import NavBar from "../NavBar";

export default function Historique() {
  const [factures, setFactures] = useState([]);
  const [locataires, setLocataires] = useState([]);
  const [preuveVue, setPreuveVue] = useState(null);

  useEffect(() => {
    async function charger() {
      const { data: loc } = await supabase.from("locataires").select("*");
      const { data: fac } = await supabase.from("factures").select("*").order("date", { ascending: false });
      setLocataires(loc || []);
      setFactures(fac || []);
    }
    charger();
  }, []);

  function nomDe(id) {
    return locataires.find((l) => l.id === id)?.nom || "—";
  }

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 76 }}>
      <div style={{ padding: "18px 16px" }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Historique</div>
        <div style={{ background: "#fff", borderRadius: 14, padding: 16, boxShadow: "0 1px 2px rgba(28,38,33,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <History size={16} color="#2F6F63" />
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>Toutes les factures par catégorie</div>
          </div>
          {CATEGORIES.map((cat) => {
            const items = factures.filter((f) => f.categorie === cat.id);
            if (!items.length) return null;
            const sousTotal = items.reduce((s, f) => s + Number(f.montant), 0);
            const Icon = cat.icon;
            return (
              <div key={cat.id} style={{ borderBottom: "1px solid #EEF1EF", paddingBottom: 10, marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <Icon size={14} color="#2F6F63" />
                  <div style={{ fontSize: 13, fontWeight: 700, flex: 1 }}>{cat.label}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>{euro(sousTotal)}</div>
                </div>
                {items.map((f) => (
                  <div key={f.id} style={{ display: "flex", alignItems: "center", fontSize: 11.5, color: "#5B6B62", padding: "3px 0 3px 22px", gap: 8 }}>
                    <div style={{ flex: 1 }}>{f.date} · {nomDe(f.paye_par)}</div>
                    <div>{euro(f.montant)}</div>
                    {f.justificatif_url ? (
                      <button onClick={() => setPreuveVue(f)} style={{ background: "none", border: "none", color: "#2F6F63", padding: 0 }}>
                        <FileText size={13} />
                      </button>
                    ) : <span style={{ width: 13 }} />}
                  </div>
                ))}
              </div>
            );
          })}
          <div style={{ fontSize: 11, color: "#5B6B62" }}>Toutes les factures et justificatifs restent archivés — utile en cas de litige avec le bailleur</div>
        </div>
      </div>

      {preuveVue && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(28,38,33,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, padding: 24 }} onClick={() => setPreuveVue(null)}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 16, width: "100%", maxWidth: 320 }} onClick={(e) => e.stopPropagation()}>
            {preuveVue.justificatif_url?.match(/\.(jpg|jpeg|png|webp)$/i) ? (
              <img src={preuveVue.justificatif_url} alt="justificatif" style={{ width: "100%", borderRadius: 10 }} />
            ) : (
              <a href={preuveVue.justificatif_url} target="_blank" rel="noreferrer" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, background: "#EEF1EF", borderRadius: 10, padding: 30, color: "#2F6F63", textDecoration: "none" }}>
                <FileText size={30} />
                <div style={{ fontSize: 12 }}>Ouvrir le fichier</div>
              </a>
            )}
          </div>
        </div>
      )}
      <NavBar />
    </div>
  );
}
