"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { CATEGORIES, euro } from "../../lib/shared";
import { Plus, FileText, Edit2, X, Upload, Check } from "lucide-react";
import NavBar from "../NavBar";

export default function Factures() {
  const [locataires, setLocataires] = useState([]);
  const [factures, setFactures] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [preuveVue, setPreuveVue] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ categorie: "electricite", montant: "", paye_par: "", file: null, justificatif_url: null });

  async function charger() {
    const { data: loc } = await supabase.from("locataires").select("*").order("ordre");
    const { data: fac } = await supabase.from("factures").select("*").order("date", { ascending: false });
    setLocataires(loc || []);
    setFactures(fac || []);
    if (loc && loc.length && !form.paye_par) setForm((f) => ({ ...f, paye_par: loc[0].id }));
  }

  useEffect(() => {
    charger();
  }, []);

  function nomDe(id) {
    return locataires.find((l) => l.id === id)?.nom || "—";
  }

  async function enregistrer() {
    if (!form.montant || !form.paye_par) return;
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

    if (editId) {
      await supabase.from("factures").update({
        categorie: form.categorie,
        montant: Number(form.montant),
        paye_par: form.paye_par,
        ...(justificatif_url ? { justificatif_url } : {}),
      }).eq("id", editId);
    } else {
      await supabase.from("factures").insert({
        categorie: form.categorie,
        montant: Number(form.montant),
        paye_par: form.paye_par,
        justificatif_url,
      });
    }

    setForm({ categorie: "electricite", montant: "", paye_par: locataires[0]?.id, file: null, justificatif_url: null });
    setEditId(null);
    setShowAdd(false);
    charger();
  }

  async function supprimer(id) {
    await supabase.from("factures").delete().eq("id", id);
    setConfirmDelete(null);
    charger();
  }

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 76 }}>
      <div style={{ padding: "18px 16px" }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Factures</div>
        <button
          onClick={() => {
            setForm({ categorie: "electricite", montant: "", paye_par: locataires[0]?.id, file: null, justificatif_url: null });
            setEditId(null);
            setShowAdd(true);
          }}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "#2F6F63", color: "#fff", border: "none", borderRadius: 12, padding: 12, fontWeight: 600, fontSize: 14, width: "100%", marginBottom: 12 }}
        >
          <Plus size={16} /> Ajouter une facture
        </button>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {factures.map((f) => {
            const cat = CATEGORIES.find((c) => c.id === f.categorie);
            const Icon = cat?.icon;
            return (
              <div key={f.id} style={{ background: "#fff", borderRadius: 14, padding: 16, display: "flex", alignItems: "center", gap: 12, boxShadow: "0 1px 2px rgba(28,38,33,0.06)" }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "#EEF1EF", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {Icon && <Icon size={17} color="#2F6F63" />}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{cat?.label}</div>
                  <div style={{ fontSize: 11.5, color: "#5B6B62" }}>{f.date} · payé par {nomDe(f.paye_par)}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{euro(f.montant)}</div>
                  {f.justificatif_url ? (
                    <button onClick={() => setPreuveVue(f)} style={{ fontSize: 10.5, color: "#2F6F63", background: "none", border: "none", padding: 0 }}>
                      voir preuve
                    </button>
                  ) : (
                    <div style={{ fontSize: 10.5, color: "#C97A3D" }}>sans preuve</div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <button
                    onClick={() => {
                      setForm({ categorie: f.categorie, montant: String(f.montant), paye_par: f.paye_par, file: null, justificatif_url: f.justificatif_url });
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(28,38,33,0.5)", display: "flex", alignItems: "flex-end", zIndex: 10 }} onClick={() => setShowAdd(false)}>
          <div style={{ background: "#fff", width: "100%", borderRadius: "18px 18px 0 0", padding: 20 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{editId ? "Modifier la facture" : "Nouvelle facture"}</div>
              <X size={18} onClick={() => setShowAdd(false)} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <label style={{ fontSize: 12, color: "#5B6B62" }}>Catégorie</label>
              <select value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })} style={{ border: "1px solid #E1E5E2", borderRadius: 10, padding: 10, fontSize: 14 }}>
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <label style={{ fontSize: 12, color: "#5B6B62" }}>Montant (DH)</label>
              <input type="number" value={form.montant} onChange={(e) => setForm({ ...form, montant: e.target.value })} placeholder="0" style={{ border: "1px solid #E1E5E2", borderRadius: 10, padding: 10, fontSize: 14 }} />
              <label style={{ fontSize: 12, color: "#5B6B62" }}>Payé par</label>
              <select value={form.paye_par || ""} onChange={(e) => setForm({ ...form, paye_par: e.target.value })} style={{ border: "1px solid #E1E5E2", borderRadius: 10, padding: 10, fontSize: 14 }}>
                {locataires.map((l) => <option key={l.id} value={l.id}>{l.nom}</option>)}
              </select>
              <label style={{ fontSize: 12, color: "#5B6B62" }}>Justificatif</label>
              <div style={{ border: "1.5px dashed #C7CFCA", borderRadius: 10, padding: 10, display: "flex", alignItems: "center", gap: 8 }}>
                {form.file || form.justificatif_url ? <Check size={16} color="#2F6F63" /> : <Upload size={16} color="#5B6B62" />}
                <input type="file" accept="image/*,.pdf" style={{ flex: 1, fontSize: 12 }} onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} />
              </div>
              <button onClick={enregistrer} disabled={uploading} style={{ background: "#2F6F63", color: "#fff", border: "none", borderRadius: 10, padding: 12, fontWeight: 600, fontSize: 14, marginTop: 6 }}>
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
        <div style={{ position: "fixed", inset: 0, background: "rgba(28,38,33,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, padding: 24 }} onClick={() => setPreuveVue(null)}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 16, width: "100%", maxWidth: 320 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Justificatif</div>
              <X size={17} onClick={() => setPreuveVue(null)} />
            </div>
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

      {confirmDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(28,38,33,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, padding: 24 }} onClick={() => setConfirmDelete(null)}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 16, width: "100%", maxWidth: 300 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Supprimer cette facture ?</div>
            <div style={{ fontSize: 12.5, color: "#5B6B62", marginBottom: 16 }}>Cette action est définitive, y compris pour le justificatif associé.</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, background: "#EEF1EF", border: "none", borderRadius: 10, padding: 10, fontWeight: 600, fontSize: 13 }}>Annuler</button>
              <button onClick={() => supprimer(confirmDelete.id)} style={{ flex: 1, background: "#C0463C", color: "#fff", border: "none", borderRadius: 10, padding: 10, fontWeight: 600, fontSize: 13 }}>Supprimer</button>
            </div>
          </div>
        </div>
      )}

      <NavBar />
    </div>
  );
}
