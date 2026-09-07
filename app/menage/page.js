"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { COULEURS, lundiDeSemaine, formatPeriode, numeroSemaine, cleSemaine } from "../../lib/shared";
import { Sparkles, Home, Flame } from "lucide-react";
import NavBar from "../NavBar";

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const JOURS_AVEC_CRENEAUX = [0, 1, 2, 3, 4]; // Lun-Ven

export default function Menage() {
  const [locataires, setLocataires] = useState([]);
  const [overrides, setOverrides] = useState({});
  const [repas, setRepas] = useState([]);
  const [rechargesGaz, setRechargesGaz] = useState([]);

  async function charger() {
    const { data: loc } = await supabase.from("locataires").select("*").order("ordre");
    const { data: ov } = await supabase.from("menage_overrides").select("*");
    const { data: rep } = await supabase.from("repas").select("*");
    const { data: gaz } = await supabase.from("gaz_recharges").select("*").order("date", { ascending: false });
    setLocataires(loc || []);
    const map = {};
    (ov || []).forEach((o) => (map[o.cle_semaine] = o.responsable_id));
    setOverrides(map);
    setRepas(rep || []);
    setRechargesGaz(gaz || []);
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

  function repasDe(jour, moment) {
    return repas.find((r) => r.jour_semaine === jour && r.moment === moment);
  }

  async function changerRepas(jour, moment, responsableId) {
    const existant = repasDe(jour, moment);
    if (existant) {
      await supabase.from("repas").update({ responsable_id: responsableId }).eq("id", existant.id);
    } else {
      await supabase.from("repas").insert({ jour_semaine: jour, moment, responsable_id: responsableId });
    }
    charger();
  }

  // Rotation gaz : dernière recharge -> le suivant dans l'ordre des locataires
  const derniereRecharge = rechargesGaz[0];
  const dernierIndex = derniereRecharge ? locataires.findIndex((l) => l.id === derniereRecharge.locataire_id) : -1;
  const prochainIndex = locataires.length ? (dernierIndex + 1) % locataires.length : 0;
  const prochainResponsable = locataires[prochainIndex];

  async function enregistrerRecharge() {
    if (!prochainResponsable) return;
    await supabase.from("gaz_recharges").insert({ locataire_id: prochainResponsable.id });
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
            if (JOURS_AVEC_CRENEAUX.includes(i)) {
              return (
                <div key={j} style={{ marginBottom: 9 }}>
                  <div style={{ fontSize: 11.5, color: "#8A968F", fontWeight: 600, marginBottom: 4 }}>{j}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {["midi", "soir"].map((moment) => {
                      const responsableId = repasDe(i, moment)?.responsable_id || locataires[i % (locataires.length || 1)]?.id;
                      return (
                        <div key={moment} style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 10, color: "#9AA6A0", width: 28, flexShrink: 0 }}>{moment === "midi" ? "☀️" : "🌙"}</span>
                          <select
                            value={responsableId || ""}
                            onChange={(e) => changerRepas(i, moment, e.target.value)}
                            style={{ flex: 1, border: "1px solid #E1E5E2", borderRadius: 9, padding: "7px 6px", fontSize: 12.5 }}
                          >
                            {locataires.map((l) => <option key={l.id} value={l.id}>{l.nom}</option>)}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }
            // Weekend : un seul créneau (moment = "jour")
            const responsableId = repasDe(i, "jour")?.responsable_id || locataires[i % (locataires.length || 1)]?.id;
            return (
              <div key={j} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
                <div style={{ width: 30, fontSize: 12, color: "#8A968F", fontWeight: 500 }}>{j}</div>
                <select value={responsableId || ""} onChange={(e) => changerRepas(i, "jour", e.target.value)} style={{ flex: 1, border: "1px solid #E1E5E2", borderRadius: 9, padding: "7px 9px", fontSize: 13 }}>
                  {locataires.map((l) => <option key={l.id} value={l.id}>{l.nom}</option>)}
                </select>
              </div>
            );
          })}
        </div>

        <div style={{ background: "#fff", borderRadius: 16, padding: 17, boxShadow: "0 1px 3px rgba(28,38,33,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 13 }}>
            <Flame size={16} color="#2F6F63" />
            <div style={{ fontSize: 14, fontWeight: 700, color: "#182521" }}>Recharge du gaz</div>
          </div>

          {derniereRecharge ? (
            <div style={{ fontSize: 12.5, color: "#5B6B62", marginBottom: 10 }}>
              Dernière recharge par <strong style={{ color: "#182521" }}>{nomDe(derniereRecharge.locataire_id)}</strong> le {derniereRecharge.date}
            </div>
          ) : (
            <div style={{ fontSize: 12.5, color: "#8A968F", marginBottom: 10 }}>Aucune recharge enregistrée pour l'instant</div>
          )}

          {prochainResponsable && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#EEF4F1", borderRadius: 10, padding: 12, marginBottom: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 999, background: COULEURS[prochainIndex % COULEURS.length], color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                {prochainResponsable.nom[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#5B6B62" }}>Prochain tour</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#182521" }}>{prochainResponsable.nom}</div>
              </div>
            </div>
          )}

          <button
            onClick={enregistrerRecharge}
            style={{ width: "100%", background: "#2F6F63", color: "#fff", border: "none", borderRadius: 10, padding: 12, fontWeight: 700, fontSize: 13.5 }}
          >
            J'ai rechargé le gaz aujourd'hui
          </button>

          {rechargesGaz.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, color: "#8A968F", fontWeight: 600, marginBottom: 6 }}>Historique</div>
              {rechargesGaz.slice(0, 5).map((r) => (
                <div key={r.id} style={{ fontSize: 11.5, color: "#5B6B62", padding: "3px 0" }}>
                  {r.date} · {nomDe(r.locataire_id)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <NavBar />
    </div>
  );
}
