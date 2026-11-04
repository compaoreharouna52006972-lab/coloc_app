"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { COULEURS, formatPeriode } from "../../lib/shared";
import { lundiDeSemaine, numeroSemaine, cleSemaine, responsableMenageAuto, responsableRepas } from "../../lib/logique.mjs";
import { S } from "../../lib/styles";
import { Sparkles, Home, Flame, X } from "lucide-react";
import NavBar from "../NavBar";
import ModaleConfirmation from "../ModaleConfirmation";

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const JOURS_AVEC_CRENEAUX = [0, 1, 2, 3, 4, 5]; // le dimanche : un seul créneau « jour »

export default function Menage() {
  const [locataires, setLocataires] = useState([]);
  const [overrides, setOverrides] = useState({});
  const [repas, setRepas] = useState([]);
  const [rechargesGaz, setRechargesGaz] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [rechargeurId, setRechargeurId] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  async function charger() {
    const [loc, ov, rep, gaz] = await Promise.all([
      supabase.from("locataires").select("*").order("ordre"),
      supabase.from("menage_overrides").select("*"),
      supabase.from("repas").select("*"),
      supabase.from("gaz_recharges").select("*").order("date", { ascending: false }),
    ]);
    if (loc.error || ov.error || rep.error || gaz.error) setErreur("Impossible de charger les données. Vérifie ta connexion.");
    setLocataires(loc.data || []);
    const map = {};
    (ov.data || []).forEach((o) => (map[o.cle_semaine] = o.responsable_id));
    setOverrides(map);
    setRepas(rep.data || []);
    setRechargesGaz(gaz.data || []);
  }

  useEffect(() => {
    charger();
  }, []);

  function nomDe(id) {
    return locataires.find((l) => l.id === id)?.nom || "—";
  }

  function couleurDe(id) {
    const i = locataires.findIndex((l) => l.id === id);
    return COULEURS[Math.max(i, 0) % COULEURS.length];
  }

  // Rotation : calculée depuis une date fixe (voir lib/logique.mjs), donc elle avance chaque semaine.
  // Avant, la semaine en cours tombait toujours sur le premier locataire.
  const semaines = [0, 1, 2, 3].map((offset) => {
    const lundi = lundiDeSemaine(offset);
    const cle = cleSemaine(lundi);
    const responsableId = overrides[cle] || responsableMenageAuto(locataires, lundi);
    return { cle, semaine: `Sem. ${numeroSemaine(lundi)} (${formatPeriode(lundi)})`, responsableId };
  });

  async function reassigner(cle, responsableId) {
    const { error } = await supabase.from("menage_overrides").upsert({ cle_semaine: cle, responsable_id: responsableId }, { onConflict: "cle_semaine" });
    if (error) setErreur("Impossible de réassigner cette semaine.");
    charger();
  }

  function repasDe(jour, moment) {
    return repas.find((r) => r.jour_semaine === jour && r.moment === moment);
  }

  async function changerRepas(jour, moment, responsableId) {
    const existant = repasDe(jour, moment);
    const { error } = existant
      ? await supabase.from("repas").update({ responsable_id: responsableId }).eq("id", existant.id)
      : await supabase.from("repas").insert({ jour_semaine: jour, moment, responsable_id: responsableId });
    if (error) setErreur("Impossible de modifier le repas.");
    charger();
  }

  const derniereRecharge = rechargesGaz[0];
  const dernierIndex = derniereRecharge ? locataires.findIndex((l) => l.id === derniereRecharge.locataire_id) : -1;
  const prochainIndex = locataires.length ? (dernierIndex + 1) % locataires.length : 0;
  const prochainResponsable = locataires[prochainIndex];
  const rechargeurEffectif = rechargeurId || prochainResponsable?.id || "";

  async function enregistrerRecharge() {
    if (!rechargeurEffectif || enCours) return;
    setEnCours(true);
    const { error } = await supabase.from("gaz_recharges").insert({ locataire_id: rechargeurEffectif });
    if (error) setErreur("Impossible d'enregistrer la recharge.");
    setRechargeurId("");
    await charger();
    setEnCours(false);
  }

  async function supprimerRecharge(id) {
    setConfirmDelete(null);
    const { error } = await supabase.from("gaz_recharges").delete().eq("id", id);
    if (error) setErreur("Impossible de supprimer la recharge.");
    charger();
  }

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 76 }}>
      <div style={{ padding: "18px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={S.titrePage}>Ménage</div>
        {erreur && <div style={{ ...S.erreur, marginBottom: 0 }}>{erreur}</div>}

        <div style={S.carte}>
          <div style={S.carteEntete}>
            <Sparkles size={16} color="#2F6F63" />
            <div style={S.carteTitre}>Grand nettoyage — rotation hebdo</div>
          </div>
          {semaines.map((s, i) => (
            <div key={s.cle} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 0", borderBottom: i < semaines.length - 1 ? "1px solid #EEF1EF" : "none" }}>
              <div style={{ width: 30, height: 30, borderRadius: 999, background: couleurDe(s.responsableId), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
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

        <div style={S.carte}>
          <div style={S.carteEntete}>
            <Home size={16} color="#2F6F63" />
            <div style={S.carteTitre}>Récupération du repas — chaque semaine</div>
          </div>
          {JOURS.map((j, i) => {
            if (JOURS_AVEC_CRENEAUX.includes(i)) {
              return (
                <div key={j} style={{ marginBottom: 9 }}>
                  <div style={{ fontSize: 11.5, color: "#8A968F", fontWeight: 600, marginBottom: 4 }}>{j}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {["midi", "soir"].map((moment) => (
                      <div key={moment} style={{ flex: 1, display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 10, color: "#9AA6A0", width: 28, flexShrink: 0 }}>{moment === "midi" ? "☀️" : "🌙"}</span>
                        <select
                          value={responsableRepas(repas, locataires, i, moment) || ""}
                          onChange={(e) => changerRepas(i, moment, e.target.value)}
                          style={{ flex: 1, border: "1px solid #E1E5E2", borderRadius: 9, padding: "7px 6px", fontSize: 12.5 }}
                        >
                          {locataires.map((l) => <option key={l.id} value={l.id}>{l.nom}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }
            return (
              <div key={j} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 9 }}>
                <div style={{ width: 30, fontSize: 12, color: "#8A968F", fontWeight: 500 }}>{j}</div>
                <select value={responsableRepas(repas, locataires, i, "jour") || ""} onChange={(e) => changerRepas(i, "jour", e.target.value)} style={{ flex: 1, border: "1px solid #E1E5E2", borderRadius: 9, padding: "7px 9px", fontSize: 13 }}>
                  {locataires.map((l) => <option key={l.id} value={l.id}>{l.nom}</option>)}
                </select>
              </div>
            );
          })}
        </div>

        <div style={S.carte}>
          <div style={S.carteEntete}>
            <Flame size={16} color="#2F6F63" />
            <div style={S.carteTitre}>Recharge du gaz</div>
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
              <div style={{ width: 30, height: 30, borderRadius: 999, background: couleurDe(prochainResponsable.id), color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                {prochainResponsable.nom[0]}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#5B6B62" }}>Prochain tour</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#182521" }}>{prochainResponsable.nom}</div>
              </div>
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: "#5B6B62" }}>Rechargé par</div>
            <select value={rechargeurEffectif} onChange={(e) => setRechargeurId(e.target.value)} style={{ flex: 1, border: "1px solid #E1E5E2", borderRadius: 9, padding: "7px 9px", fontSize: 13 }}>
              {locataires.map((l) => <option key={l.id} value={l.id}>{l.nom}</option>)}
            </select>
          </div>
          <button
            onClick={enregistrerRecharge}
            disabled={enCours}
            style={{ width: "100%", background: "#2F6F63", color: "#fff", border: "none", borderRadius: 10, padding: 12, fontWeight: 700, fontSize: 13.5, opacity: enCours ? 0.7 : 1 }}
          >
            Enregistrer la recharge d'aujourd'hui
          </button>

          {rechargesGaz.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, color: "#8A968F", fontWeight: 600, marginBottom: 6 }}>Historique</div>
              {rechargesGaz.slice(0, 5).map((r) => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", fontSize: 11.5, color: "#5B6B62", padding: "4px 0" }}>
                  <div style={{ flex: 1 }}>{r.date} · {nomDe(r.locataire_id)}</div>
                  <button onClick={() => setConfirmDelete(r)} style={S.boutonNu} aria-label="Supprimer la recharge">
                    <X size={13} color="#C0463C" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {confirmDelete && (
        <ModaleConfirmation
          titre="Supprimer cette recharge ?"
          texte={`Recharge du ${confirmDelete.date} par ${nomDe(confirmDelete.locataire_id)}. Le calcul du prochain tour sera recalculé automatiquement.`}
          onAnnuler={() => setConfirmDelete(null)}
          onConfirmer={() => supprimerRecharge(confirmDelete.id)}
        />
      )}
      <NavBar />
    </div>
  );
}
