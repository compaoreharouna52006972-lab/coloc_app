"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { COULEURS, lundiDeSemaine, formatPeriode, numeroSemaine, cleSemaine } from "../../lib/shared";
import { Sparkles, Home } from "lucide-react";
import NavBar from "../NavBar";

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default function Menage() {
  const [locataires, setLocataires] = useState([]);
  const [overrides, setOverrides] = useState({});
  const [repas, setRepas] = useState([]);

  async function charger() {
    const { data: loc } = await supabase.from("locataires").select("*").order("ordre");
    const { data: ov } = await supabase.from("menage_overrides").select("*");
    const { data: rep } = await supabase.from("repas").select("*").order("jour_semaine");
    setLocataires(loc || []);
    const map = {};
    (ov || []).forEach((o) => (map[o.cle_semaine] = o.responsable_id));
    setOverrides(map);
    setRepas(rep || []);
  }

  useEffect(() => {
    charger();
  }, []);

  function nomDe(id) {
    return locataires.find((l) => l.id === id)?.nom || "—";
  }

  const semaines = [0, 1, 2, 3].map((offset) => {
    const lundi = lundiDeSemaine(offset);
    const cle = cleSemaine(lundi);
    const indexAuto = locataires.length ? offset % locataires.length : 0;
    const responsableId = overrides[cle] || locataires[indexAuto]?.id;
    return { cle, semaine: `Sem. ${numeroSemaine(lundi)} (${formatPeriode(lundi)})`, responsableId };
  });

  async function reassigner(cle, responsableId) {
    await supabase.from("menage_overrides").upsert({ cle_semaine: cle, responsable_id: responsableId }, { onConflict: "cle_semaine" });
    charger();
  }

  async function changerRepas(jour, responsableId) {
    const existant = repas.find((r) => r.jour_semaine === jour);
    if (existant) {
      await supabase.from("repas").update({ responsable_id: responsableId }).eq("id", existant.id);
    } else {
      await supabase.from("repas").insert({ jour_semaine: jour, responsable_id: responsableId });
    }
    charger();
  }

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 76 }}>
      <div style={{ padding: "18px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: -0.3, color: "#182521" }}>Ménage</div>

        <div style={{ background: "#fff", borderRadius: 16, padding: 17, boxShadow: "0 1px 3px rgba(28,38,33,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 13 }}>
            <Sparkles size={16} color="#2F6F63" />
            <div style={{ fontSize: 14, fontWeight: 700, color: "#182521" }}>Grand nettoyage — rotation hebdo</div>
          </div>
          {semaines.map((s, i) => (
            <div key={s.cle} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 0", borderBottom: i < semaines.length - 1 ? "1px solid #EEF1EF" : "none" }}>
              <div style={{ width: 30, height: 30, borderRadius: 999, background: COULEURS[locataires.findIndex((l) => l.id === s.responsableId) % COULEURS.length] || "#2F6F63", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                {nomDe(s.responsableId)[0]}
              </div>
              <div style={{ flex: 1 }}>
                <select value={s.responsableId || ""} onChange={(e) => reassigner(s.cle, e.target.value)} style={{ border: "none", background: "none", fontSize: 14, fontWeight: 600, padding: 0, color: "#182521" }}>
                  {locataires.map((l) => <option key={l.id} value={l.id}>{l.nom}</option>)}
                </select>
                <div style={{ fontSize: 11, color: "#8A968F" }}>{s.semaine}</div>
              </div>
            </div>
          ))}
          <div style={{ fontSize: 11, color: "#8A968F", marginTop: 9 }}>Rotation automatique selon l'ordre défini dans Réglages — réassignable ici</div>
        </div>

        <div style={{ background: "#fff", borderRadius: 16, padding: 17, boxShadow: "0 1px 3px rgba(28,38,33,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 13 }}>
            <Home size={16} color="#2F6F63" />
            <div style={{ fontSize: 14, fontWeight: 700, color: "#182521" }}>Récupération du repas — cette semaine</div>
          </div>
          {JOURS.map((j, i) => {
            const responsableId = repas.find((r) => r.jour_semaine === i)?.responsable_id || locataires[i % (locataires.length || 1)]?.id;
            return (
              <div key={j} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
                <div style={{ width: 30, fontSize: 12, color: "#8A968F", fontWeight: 500 }}>{j}</div>
                <select value={responsableId || ""} onChange={(e) => changerRepas(i, e.target.value)} style={{ flex: 1, border: "1px solid #E1E5E2", borderRadius: 9, padding: "7px 9px", fontSize: 13 }}>
                  {locataires.map((l) => <option key={l.id} value={l.id}>{l.nom}</option>)}
                </select>
              </div>
            );
          })}
        </div>
      </div>
      <NavBar />
    </div>
  );
}
