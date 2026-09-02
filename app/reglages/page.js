"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { COULEURS } from "../../lib/shared";
import { Users, Edit2, ChevronUp, ChevronDown, X, Smartphone } from "lucide-react";
import NavBar from "../NavBar";

export default function Reglages() {
  const [locataires, setLocataires] = useState([]);
  const [editLoc, setEditLoc] = useState(null);
  const [ajoutLoc, setAjoutLoc] = useState(null);
  const [notifPrefs, setNotifPrefs] = useState({ repas: true, menage: true, factures: true, echeances: true });

  async function charger() {
    const { data } = await supabase.from("locataires").select("*").order("ordre");
    setLocataires(data || []);
  }

  useEffect(() => {
    charger();
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("notifPrefs");
      if (saved) setNotifPrefs(JSON.parse(saved));
    }
  }, []);

  async function deplacer(index, direction) {
    const cible = index + direction;
    if (cible < 0 || cible >= locataires.length) return;
    const copie = [...locataires];
    [copie[index], copie[cible]] = [copie[cible], copie[index]];
    await Promise.all(copie.map((l, i) => supabase.from("locataires").update({ ordre: i + 1 }).eq("id", l.id)));
    charger();
  }

  async function sauvegarder() {
    await supabase.from("locataires").update({
      nom: editLoc.nom, chambre: editLoc.chambre, tel: editLoc.tel, email: editLoc.email,
    }).eq("id", editLoc.id);
    setEditLoc(null);
    charger();
  }

  async function ajouterLocataire() {
    if (!ajoutLoc?.nom) return;
    await supabase.from("locataires").insert({
      nom: ajoutLoc.nom,
      chambre: ajoutLoc.chambre || "",
      tel: ajoutLoc.tel || "",
      email: ajoutLoc.email || "",
      ordre: locataires.length + 1,
    });
    setAjoutLoc(null);
    charger();
  }

  async function supprimerLocataire(id) {
    await supabase.from("locataires").delete().eq("id", id);
    setEditLoc(null);
    charger();
  }

  function toggleNotif(key) {
    const next = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(next);
    if (typeof window !== "undefined") localStorage.setItem("notifPrefs", JSON.stringify(next));
  }

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 76 }}>
      <div style={{ padding: "18px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: -0.3, color: "#182521" }}>Réglages</div>

        <div style={{ background: "#fff", borderRadius: 16, padding: 17, boxShadow: "0 1px 3px rgba(28,38,33,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Users size={16} color="#2F6F63" />
            <div style={{ fontSize: 14, fontWeight: 700, color: "#182521" }}>Locataires</div>
          </div>
          <div style={{ fontSize: 11, color: "#8A968F", marginBottom: 11 }}>L'ordre définit l'ordre de passage pour le grand ménage</div>
          {locataires.map((l, i) => (
            <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 0", borderBottom: i < locataires.length - 1 ? "1px solid #EEF1EF" : "none" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <button disabled={i === 0} onClick={() => deplacer(i, -1)} style={{ background: "none", border: "none", padding: 0, opacity: i === 0 ? 0.25 : 1 }}><ChevronUp size={14} color="#5B6B62" /></button>
                <button disabled={i === locataires.length - 1} onClick={() => deplacer(i, 1)} style={{ background: "none", border: "none", padding: 0, opacity: i === locataires.length - 1 ? 0.25 : 1 }}><ChevronDown size={14} color="#5B6B62" /></button>
              </div>
              <div style={{ width: 34, height: 34, borderRadius: 999, background: COULEURS[i % COULEURS.length], color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, fontWeight: 700 }}>{l.nom[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#182521" }}>{l.nom}</div>
                <div style={{ fontSize: 11, color: "#8A968F" }}>{l.chambre} · {l.tel}</div>
              </div>
              <button onClick={() => setEditLoc(l)} style={{ background: "none", border: "none" }}><Edit2 size={15} color="#9AA6A0" /></button>
            </div>
          ))}
          <button
            onClick={() => setAjoutLoc({ nom: "", chambre: "", tel: "", email: "" })}
            style={{ marginTop: 11, width: "100%", background: "#EEF4F1", border: "none", borderRadius: 10, padding: 11, fontWeight: 700, fontSize: 13, color: "#2F6F63" }}
          >
            + Ajouter un locataire
          </button>
        </div>

        <div style={{ background: "#fff", borderRadius: 16, padding: 17, boxShadow: "0 1px 3px rgba(28,38,33,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <Smartphone size={16} color="#2F6F63" />
            <div style={{ fontSize: 14, fontWeight: 700, color: "#182521" }}>Notifications sur le téléphone</div>
          </div>
          {[
            { key: "repas", label: "Tour de récupération du repas (chaque jour)" },
            { key: "menage", label: "Tour de grand nettoyage (chaque semaine)" },
            { key: "factures", label: "Nouvelle facture / justificatif manquant" },
            { key: "echeances", label: "Échéances de paiement" },
          ].map((n) => (
            <div key={n.key} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 11 }}>
              <div style={{ fontSize: 13, flex: 1, color: "#5B6B62" }}>{n.label}</div>
              <button onClick={() => toggleNotif(n.key)} style={{ width: 40, height: 22, borderRadius: 999, border: "none", background: notifPrefs[n.key] ? "#2F6F63" : "#D7DDD9", position: "relative" }}>
                <div style={{ width: 16, height: 16, borderRadius: 999, background: "#fff", position: "absolute", top: 3, left: notifPrefs[n.key] ? 21 : 3 }} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {editLoc && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(24,37,33,0.5)", display: "flex", alignItems: "flex-end", zIndex: 10 }} onClick={() => setEditLoc(null)}>
          <div style={{ background: "#fff", width: "100%", borderRadius: "20px 20px 0 0", padding: 22 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#182521" }}>Modifier {editLoc.nom}</div>
              <X size={18} onClick={() => setEditLoc(null)} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              <label style={{ fontSize: 12, color: "#5B6B62", fontWeight: 600 }}>Nom</label>
              <input value={editLoc.nom} onChange={(e) => setEditLoc({ ...editLoc, nom: e.target.value })} style={{ border: "1px solid #E1E5E2", borderRadius: 10, padding: 11, fontSize: 14 }} />
              <label style={{ fontSize: 12, color: "#5B6B62", fontWeight: 600 }}>Chambre</label>
              <input value={editLoc.chambre || ""} onChange={(e) => setEditLoc({ ...editLoc, chambre: e.target.value })} style={{ border: "1px solid #E1E5E2", borderRadius: 10, padding: 11, fontSize: 14 }} />
              <label style={{ fontSize: 12, color: "#5B6B62", fontWeight: 600 }}>Téléphone</label>
              <input value={editLoc.tel || ""} onChange={(e) => setEditLoc({ ...editLoc, tel: e.target.value })} style={{ border: "1px solid #E1E5E2", borderRadius: 10, padding: 11, fontSize: 14 }} />
              <label style={{ fontSize: 12, color: "#5B6B62", fontWeight: 600 }}>Email</label>
              <input value={editLoc.email || ""} onChange={(e) => setEditLoc({ ...editLoc, email: e.target.value })} style={{ border: "1px solid #E1E5E2", borderRadius: 10, padding: 11, fontSize: 14 }} />
              <button onClick={sauvegarder} style={{ background: "#2F6F63", color: "#fff", border: "none", borderRadius: 10, padding: 13, fontWeight: 700, fontSize: 14, marginTop: 8, boxShadow: "0 2px 8px rgba(47,111,99,0.25)" }}>Enregistrer</button>
              <button onClick={() => supprimerLocataire(editLoc.id)} style={{ background: "none", color: "#C0463C", border: "none", padding: 6, fontWeight: 600, fontSize: 13 }}>Retirer ce locataire</button>
            </div>
          </div>
        </div>
      )}

      {ajoutLoc && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(24,37,33,0.5)", display: "flex", alignItems: "flex-end", zIndex: 10 }} onClick={() => setAjoutLoc(null)}>
          <div style={{ background: "#fff", width: "100%", borderRadius: "20px 20px 0 0", padding: 22 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#182521" }}>Ajouter un locataire</div>
              <X size={18} onClick={() => setAjoutLoc(null)} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              <label style={{ fontSize: 12, color: "#5B6B62", fontWeight: 600 }}>Nom</label>
              <input value={ajoutLoc.nom} onChange={(e) => setAjoutLoc({ ...ajoutLoc, nom: e.target.value })} style={{ border: "1px solid #E1E5E2", borderRadius: 10, padding: 11, fontSize: 14 }} />
              <label style={{ fontSize: 12, color: "#5B6B62", fontWeight: 600 }}>Chambre</label>
              <input value={ajoutLoc.chambre} onChange={(e) => setAjoutLoc({ ...ajoutLoc, chambre: e.target.value })} style={{ border: "1px solid #E1E5E2", borderRadius: 10, padding: 11, fontSize: 14 }} />
              <label style={{ fontSize: 12, color: "#5B6B62", fontWeight: 600 }}>Téléphone</label>
              <input value={ajoutLoc.tel} onChange={(e) => setAjoutLoc({ ...ajoutLoc, tel: e.target.value })} style={{ border: "1px solid #E1E5E2", borderRadius: 10, padding: 11, fontSize: 14 }} />
              <label style={{ fontSize: 12, color: "#5B6B62", fontWeight: 600 }}>Email</label>
              <input value={ajoutLoc.email} onChange={(e) => setAjoutLoc({ ...ajoutLoc, email: e.target.value })} style={{ border: "1px solid #E1E5E2", borderRadius: 10, padding: 11, fontSize: 14 }} />
              <button onClick={ajouterLocataire} style={{ background: "#2F6F63", color: "#fff", border: "none", borderRadius: 10, padding: 13, fontWeight: 700, fontSize: 14, marginTop: 8, boxShadow: "0 2px 8px rgba(47,111,99,0.25)" }}>Ajouter</button>
            </div>
          </div>
        </div>
      )}
      <NavBar />
    </div>
  );
}
