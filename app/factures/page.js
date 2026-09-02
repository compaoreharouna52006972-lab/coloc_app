"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { CATEGORIES, euro } from "../../lib/shared";
import { Plus, FileText, Edit2, X, Upload, Check, Search, AlertCircle } from "lucide-react";
import NavBar from "../NavBar";

export default function Factures() {
  const [locataires, setLocataires] = useState([]);
  const [factures, setFactures] = useState([]);
  const [payeursMap, setPayeursMap] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [preuveVue, setPreuveVue] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [filtreCategorie, setFiltreCategorie] = useState("toutes");
  const [form, setForm] = useState({ categorie: "electricite", montant: "", payeurs: [], statut: "reglee", file: null, justificatif_url: null });

  async function charger() {
    const { data: loc } = await supabase.from("locataires").select("*").order("ordre");
    const { data: fac } = await supabase.from("factures").select("*").order("date", { ascending: false });
    const { data: fp } = await supabase.from("facture_payeurs").select("*");
    setLocataires(loc || []);
    setFactures(fac || []);
    const map = {};
    (fp || []).forEach((r) => {
      if (!map[r.facture_id]) map[r.facture_id] = [];
      map[r.facture_id].push(r.locataire_id);
    });
    setPayeursMap(map);
    if (loc && loc.length && form.payeurs.length === 0) setForm((f) => ({ ...f, payeurs: [loc[0].id] }));
  }

  useEffect(() => {
    charger();
  }, []);

  function nomsDe(ids) {
    return (ids || []).map((id) => locataires.find((l) => l.id === id)?.nom).filter(Boolean).join(", ") || "—";
  }

  function togglePayeur(id) {
    setForm((f) => ({
      ...f,
      payeurs: f.payeurs.includes(id) ? f.payeurs.filter((p) => p !== id) : [...f.payeurs, id],
    }));
  }

  async function enregistrer() {
    if (!form.montant || form.payeurs.length === 0) return;
    let justificatif_url = form.justificatif_url;

    if (form.file) {
      setUploading(true);
      const ext = form.file.name.split(".").pop();
      const path = `${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("justificatifs").upload(path, form.file);
      if (!uploadError) {
        const { data } = supabase.storage.from("justificatifs").getPublicUrl(path);
        justificatif_url = data.publicUrl;
      }
      setUploading(false);
    }

    let factureId = editId;
    if (editId) {
      await supabase.from("factures").update({
        categorie: form.categorie,
        montant: Number(form.montant),
        paye_par: form.payeurs[0],
        statut: form.statut,
        ...(justificatif_url ? { justificatif_url } : {}),
      }).eq("id", editId);
      await supabase.from("facture_payeurs").delete().eq("facture_id", editId);
    } else {
      const { data } = await supabase.from("factures").insert({
        categorie: form.categorie,
        montant: Number(form.montant),
        paye_par: form.payeurs[0],
        statut: form.statut,
        justificatif_url,
      }).select().single();
      factureId = data.id;
    }

    await supabase.from("facture_payeurs").insert(form.payeurs.map((id) => ({ facture_id: factureId, locataire_id: id })));

    setForm({ categorie: "electricite", montant: "", payeurs: locataires[0] ? [locataires[0].id] : [], statut: "reglee", file: null, justificatif_url: null });
    setEditId(null);
    setShowAdd(false);
    charger();
  }

  async function supprimer(id) {
    await supabase.from("factures").delete().eq("id", id);
    setConfirmDelete(null);
    charger();
  }

  const facturesFiltrees = factures.filter((f) => {
    const cat = CATEGORIES.find((c) => c.id === f.categorie);
    const payeurIds = payeursMap[f.id] || (f.paye_par ? [f.paye_par] : []);
    const noms = nomsDe(payeurIds).toLowerCase();
    const matchRecherche = !recherche || cat?.label.toLowerCase().includes(recherche.toLowerCase()) || noms.includes(recherche.toLowerCase()) || f.date.includes(recherche);
    const matchCategorie = filtreCategorie === "toutes" || f.categorie === filtreCategorie;
    return matchRecherche && matchCategorie;
  });

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 76 }}>
      <div style={{ padding: "18px 16px" }}>
        <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: -0.3, marginBottom: 14, color: "#182521" }}>Factures</div>

        <button
          onClick={() => {
            setForm({ categorie: "electricite", montant: "", payeurs: locataires[0] ? [locataires[0].id] : [], statut: "reglee", file: null, justificatif_url: null });
            setEditId(null);
            setShowAdd(true);
          }}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "#2F6F63", color: "#fff", border: "none", borderRadius: 12, padding: 13, fontWeight: 600, fontSize: 14, width: "100%", marginBottom: 14, boxShadow: "0 2px 8px rgba(47,111,99,0.25)" }}
        >
          <Plus size={16} /> Ajouter une facture
        </button>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "#fff", borderRadius: 10, padding: "9px 12px", boxShadow: "0 1px 2px rgba(28,38,33,0.06)" }}>
            <Search size={15} color="#9AA6A0" />
            <input
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Rechercher..."
              style={{ border: "none", outline: "none", fontSize: 13.5, flex: 1, background: "transparent" }}
            />
          </div>
          <select
            value={filtreCategorie}
            onChange={(e) => setFiltreCategorie(e.target.value)}
            style={{ border: "none", borderRadius: 10, padding: "0 10px", fontSize: 13, background: "#fff", boxShadow: "0 1px 2px rgba(28,38,33,0.06)", color: "#5B6B62" }}
          >
            <option value="toutes">Toutes</option>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {facturesFiltrees.length === 0 && (
            <div style={{ textAlign: "center", padding: 30, color: "#9AA6A0", fontSize: 13 }}>Aucune facture trouvée</div>
          )}
          {facturesFiltrees.map((f) => {
            const cat = CATEGORIES.find((c) => c.id === f.categorie);
            const Icon = cat?.icon;
            const payeurIds = payeursMap[f.id] || (f.paye_par ? [f.paye_par] : []);
            const enAttente = f.statut === "en_attente";
            return (
              <div key={f.id} style={{ background: "#fff", borderRadius: 14, padding: 15, display: "flex", alignItems: "center", gap: 12, boxShadow: "0 1px 3px rgba(28,38,33,0.07)", border: enAttente ? "1px solid #F0C48A" : "1px solid transparent" }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: "#EEF4F1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {Icon && <Icon size={18} color="#2F6F63" />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#182521" }}>{cat?.label}</div>
                    {enAttente && (
                      <span style={{ fontSize: 9.5, fontWeight: 700, color: "#B0562F", background: "#FBEADD", borderRadius: 6, padding: "2px 6px" }}>EN ATTENTE</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11.5, color: "#8A968F", marginTop: 1 }}>{f.date} · payé par {nomsDe(payeurIds)}</div>
                  {!f.justificatif_url && (
                    <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10.5, color: "#C97A3D", marginTop: 3 }}>
                      <AlertCircle size={11} /> Sans justificatif
                    </div>
                  )}
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: "#182521" }}>{euro(f.montant)}</div>
                  {f.justificatif_url && (
                    <button onClick={() => setPreuveVue(f)} style={{ fontSize: 10.5, color: "#2F6F63", background: "none", border: "none", padding: 0, fontWeight: 600 }}>
                      voir preuve
                    </button>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => {
                      setForm({ categorie: f.categorie, montant: String(f.montant), payeurs: payeurIds, statut: f.statut || "reglee", file: null, justificatif_url: f.justificatif_url });
                      setEditId(f.id);
                      setShowAdd(true);
                    }}
                    style={{ background: "none", border: "none", padding: 0 }}
                  >
                    <Edit2 size={14} color="#9AA6A0" />
                  </button>
                  <button onClick={() => setConfirmDelete(f)} style={{ background: "none", border: "none", padding: 0 }}>
                    <X size={16} color="#C0463C" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(24,37,33,0.5)", display: "flex", alignItems: "flex-end", zIndex: 10 }} onClick={() => setShowAdd(false)}>
          <div style={{ background: "#fff", width: "100%", borderRadius: "20px 20px 0 0", padding: 22, maxHeight: "88vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#182521" }}>{editId ? "Modifier la facture" : "Nouvelle facture"}</div>
              <X size={18} onClick={() => setShowAdd(false)} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              <label style={{ fontSize: 12, color: "#5B6B62", fontWeight: 600 }}>Catégorie</label>
              <select value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })} style={{ border: "1px solid #E1E5E2", borderRadius: 10, padding: 11, fontSize: 14 }}>
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <label style={{ fontSize: 12, color: "#5B6B62", fontWeight: 600 }}>Montant (DH)</label>
              <input type="number" value={form.montant} onChange={(e) => setForm({ ...form, montant: e.target.value })} placeholder="0" style={{ border: "1px solid #E1E5E2", borderRadius: 10, padding: 11, fontSize: 14 }} />
              <label style={{ fontSize: 12, color: "#5B6B62", fontWeight: 600 }}>Statut</label>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setForm({ ...form, statut: "reglee" })}
                  style={{ flex: 1, padding: 10, borderRadius: 10, border: form.statut === "reglee" ? "1.5px solid #2F6F63" : "1px solid #E1E5E2", background: form.statut === "reglee" ? "#EEF4F1" : "#fff", color: form.statut === "reglee" ? "#2F6F63" : "#8A968F", fontWeight: 600, fontSize: 13 }}
                >
                  Réglée
                </button>
                <button
                  onClick={() => setForm({ ...form, statut: "en_attente" })}
                  style={{ flex: 1, padding: 10, borderRadius: 10, border: form.statut === "en_attente" ? "1.5px solid #C97A3D" : "1px solid #E1E5E2", background: form.statut === "en_attente" ? "#FBEADD" : "#fff", color: form.statut === "en_attente" ? "#B0562F" : "#8A968F", fontWeight: 600, fontSize: 13 }}
                >
                  En attente
                </button>
              </div>
              <label style={{ fontSize: 12, color: "#5B6B62", fontWeight: 600 }}>Payé par (coche un ou plusieurs)</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, border: "1px solid #E1E5E2", borderRadius: 10, padding: 10 }}>
                {locataires.map((l) => (
                  <label key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
                    <input type="checkbox" checked={form.payeurs.includes(l.id)} onChange={() => togglePayeur(l.id)} />
                    {l.nom}
                  </label>
                ))}
              </div>
              {form.payeurs.length > 1 && form.montant && (
                <div style={{ fontSize: 11.5, color: "#5B6B62" }}>
                  Soit {euro(Number(form.montant) / form.payeurs.length)} chacun ({form.payeurs.length} personnes)
                </div>
              )}
              <label style={{ fontSize: 12, color: "#5B6B62", fontWeight: 600 }}>Justificatif</label>
              <div style={{ border: "1.5px dashed #C7CFCA", borderRadius: 10, padding: 10, display: "flex", alignItems: "center", gap: 8 }}>
                {form.file || form.justificatif_url ? <Check size={16} color="#2F6F63" /> : <Upload size={16} color="#5B6B62" />}
                <input type="file" accept="image/*,.pdf" style={{ flex: 1, fontSize: 12 }} onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} />
              </div>
              <button onClick={enregistrer} disabled={uploading} style={{ background: "#2F6F63", color: "#fff", border: "none", borderRadius: 10, padding: 13, fontWeight: 700, fontSize: 14, marginTop: 8, boxShadow: "0 2px 8px rgba(47,111,99,0.25)" }}>
                {uploading ? "Envoi en cours..." : "Enregistrer"}
              </button>
              {editId && (
                <button onClick={() => { setConfirmDelete(factures.find((f) => f.id === editId)); setShowAdd(false); }} style={{ background: "none", color: "#C0463C", border: "none", padding: 6, fontWeight: 600, fontSize: 13 }}>
                  Supprimer cette facture
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {preuveVue && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(24,37,33,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, padding: 24 }} onClick={() => setPreuveVue(null)}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 18, width: "100%", maxWidth: 320 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#182521" }}>Justificatif</div>
              <X size={17} onClick={() => setPreuveVue(null)} />
            </div>
            {preuveVue.justificatif_url?.match(/\.(jpg|jpeg|png|webp)$/i) ? (
              <img src={preuveVue.justificatif_url} alt="justificatif" style={{ width: "100%", borderRadius: 10 }} />
            ) : (
              <a href={preuveVue.justificatif_url} target="_blank" rel="noreferrer" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, background: "#EEF4F1", borderRadius: 10, padding: 30, color: "#2F6F63", textDecoration: "none" }}>
                <FileText size={30} />
                <div style={{ fontSize: 12, fontWeight: 600 }}>Ouvrir le fichier</div>
              </a>
            )}
          </div>
        </div>
      )}

      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(24,37,33,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, padding: 24 }} onClick={() => setConfirmDelete(null)}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 18, width: "100%", maxWidth: 300 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: "#182521" }}>Supprimer cette facture ?</div>
            <div style={{ fontSize: 12.5, color: "#5B6B62", marginBottom: 16 }}>Cette action est définitive, y compris pour le justificatif associé.</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, background: "#EEF1EF", border: "none", borderRadius: 10, padding: 11, fontWeight: 600, fontSize: 13 }}>Annuler</button>
              <button onClick={() => supprimer(confirmDelete.id)} style={{ flex: 1, background: "#C0463C", color: "#fff", border: "none", borderRadius: 10, padding: 11, fontWeight: 600, fontSize: 13 }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      <NavBar />
    </div>
  );
}
