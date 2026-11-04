"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { CATEGORIES, euro, euroCentimes } from "../../lib/shared";
import { enCentimes } from "../../lib/logique.mjs";
import { chargerFactures } from "../../lib/donnees";
import { estImage, urlSignee, uploaderJustificatif, supprimerJustificatif, cheminJustificatif } from "../../lib/storage";
import { S } from "../../lib/styles";
import { Plus, FileText, Edit2, X, Upload, Check, Search, AlertCircle } from "lucide-react";
import NavBar from "../NavBar";
import ModaleConfirmation from "../ModaleConfirmation";

const TAILLE_MAX = 10 * 1024 * 1024; // 10 Mo

function formVide(locataires) {
  return { categorie: "electricite", montant: "", payeurs: locataires[0] ? [locataires[0].id] : [], statut: "reglee", file: null, justificatif_url: null };
}

export default function Factures() {
  const [locataires, setLocataires] = useState([]);
  const [factures, setFactures] = useState([]);
  const [payeursMap, setPayeursMap] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [preuveVue, setPreuveVue] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const [recherche, setRecherche] = useState("");
  const [filtreCategorie, setFiltreCategorie] = useState("toutes");
  const [form, setForm] = useState(formVide([]));

  async function charger() {
    const res = await chargerFactures();
    setLocataires(res.locataires);
    setFactures(res.factures);
    setPayeursMap(res.payeursMap);
    if (res.erreur) setErreur(res.erreur);
    setForm((f) => (f.payeurs.length === 0 && res.locataires.length ? { ...f, payeurs: [res.locataires[0].id] } : f));
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

  function ouvrirAjout() {
    setForm(formVide(locataires));
    setEditId(null);
    setErreur("");
    setShowAdd(true);
  }

  function ouvrirEdition(f, payeurIds) {
    setForm({ categorie: f.categorie, montant: String(f.montant), payeurs: payeurIds, statut: f.statut || "reglee", file: null, justificatif_url: f.justificatif_url });
    setEditId(f.id);
    setErreur("");
    setShowAdd(true);
  }

  async function ouvrirPreuve(f) {
    const url = await urlSignee(f.justificatif_url);
    if (!url) {
      setErreur("Justificatif introuvable.");
      return;
    }
    setPreuveVue({ url, image: estImage(f.justificatif_url) });
  }

  async function enregistrer() {
    if (enCours) return;
    if (!form.montant || Number(form.montant) <= 0) return setErreur("Saisis un montant supérieur à 0.");
    if (form.payeurs.length === 0) return setErreur("Coche au moins une personne qui a payé.");
    if (form.file && form.file.size > TAILLE_MAX) return setErreur("Fichier trop lourd (10 Mo maximum).");

    setEnCours(true);
    setErreur("");
    try {
      let justificatif = form.justificatif_url;
      const ancien = editId ? factures.find((f) => f.id === editId)?.justificatif_url : null;

      // 1) Envoi du fichier d'abord : s'il échoue, rien n'est enregistré (plus de facture « sans preuve » par accident)
      if (form.file) {
        const { chemin, error } = await uploaderJustificatif(form.file);
        if (error) throw new Error("L'envoi du justificatif a échoué. La facture n'a pas été enregistrée.");
        justificatif = chemin;
      }

      const champs = {
        categorie: form.categorie,
        montant: Number(form.montant),
        paye_par: form.payeurs[0],
        statut: form.statut,
        justificatif_url: justificatif,
      };

      if (editId) {
        const { error } = await supabase.from("factures").update(champs).eq("id", editId);
        if (error) throw new Error("Impossible de modifier la facture.");

        // On ne touche qu'aux payeurs qui changent (avant : suppression de tous puis réinsertion,
        // ce qui laissait la facture sans payeur si la seconde étape échouait).
        const existants = payeursMap[editId] || [];
        const aAjouter = form.payeurs.filter((id) => !existants.includes(id));
        const aRetirer = existants.filter((id) => !form.payeurs.includes(id));
        if (aAjouter.length) {
          const { error: e1 } = await supabase.from("facture_payeurs").insert(aAjouter.map((id) => ({ facture_id: editId, locataire_id: id })));
          if (e1) throw new Error("Facture modifiée, mais les payeurs n'ont pas pu être mis à jour.");
        }
        if (aRetirer.length) {
          const { error: e2 } = await supabase.from("facture_payeurs").delete().eq("facture_id", editId).in("locataire_id", aRetirer);
          if (e2) throw new Error("Facture modifiée, mais les payeurs n'ont pas pu être mis à jour.");
        }
        // Ancien fichier remplacé : on le supprime pour ne pas laisser de fichier orphelin
        if (form.file && ancien && cheminJustificatif(ancien) !== justificatif) supprimerJustificatif(ancien);
      } else {
        const { data, error } = await supabase.from("factures").insert(champs).select().single();
        if (error || !data) throw new Error("Impossible d'enregistrer la facture.");
        const { error: e3 } = await supabase.from("facture_payeurs").insert(form.payeurs.map((id) => ({ facture_id: data.id, locataire_id: id })));
        if (e3) {
          // Annulation manuelle : une facture sans payeur fausserait les soldes
          await supabase.from("factures").delete().eq("id", data.id);
          throw new Error("Impossible d'enregistrer les payeurs : la facture a été annulée.");
        }
      }

      setForm(formVide(locataires));
      setEditId(null);
      setShowAdd(false);
      await charger();
    } catch (e) {
      setErreur(e.message);
    } finally {
      setEnCours(false);
    }
  }

  async function supprimer(f) {
    setConfirmDelete(null);
    const { error } = await supabase.from("factures").delete().eq("id", f.id);
    if (error) {
      setErreur("Impossible de supprimer la facture.");
      return;
    }
    // Le message de confirmation promet la suppression du justificatif : on la fait réellement.
    if (f.justificatif_url) await supprimerJustificatif(f.justificatif_url);
    await charger();
  }

  const facturesFiltrees = factures.filter((f) => {
    const cat = CATEGORIES.find((c) => c.id === f.categorie);
    const payeurIds = payeursMap[f.id] || (f.paye_par ? [f.paye_par] : []);
    const noms = nomsDe(payeurIds).toLowerCase();
    const q = recherche.toLowerCase();
    const matchRecherche = !q || cat?.label.toLowerCase().includes(q) || noms.includes(q) || String(f.date || "").includes(recherche);
    const matchCategorie = filtreCategorie === "toutes" || f.categorie === filtreCategorie;
    return matchRecherche && matchCategorie;
  });

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 76 }}>
      <div style={{ padding: "18px 16px" }}>
        <div style={{ ...S.titrePage, marginBottom: 14 }}>Factures</div>

        {erreur && !showAdd && <div style={S.erreur}>{erreur}</div>}

        <button
          onClick={ouvrirAjout}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "#2F6F63", color: "#fff", border: "none", borderRadius: 12, padding: 13, fontWeight: 600, fontSize: 14, width: "100%", marginBottom: 14, boxShadow: "0 2px 8px rgba(47,111,99,0.25)" }}
        >
          <Plus size={16} /> Ajouter une facture
        </button>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "#fff", borderRadius: 10, padding: "9px 12px", boxShadow: "0 1px 2px rgba(28,38,33,0.06)" }}>
            <Search size={15} color="#9AA6A0" />
            <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher..." style={{ border: "none", outline: "none", fontSize: 13.5, flex: 1, background: "transparent" }} />
          </div>
          <select value={filtreCategorie} onChange={(e) => setFiltreCategorie(e.target.value)} style={{ border: "none", borderRadius: 10, padding: "0 10px", fontSize: 13, background: "#fff", boxShadow: "0 1px 2px rgba(28,38,33,0.06)", color: "#5B6B62" }}>
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
                    <button onClick={() => ouvrirPreuve(f)} style={{ fontSize: 10.5, color: "#2F6F63", background: "none", border: "none", padding: 0, fontWeight: 600 }}>
                      voir preuve
                    </button>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                  <button onClick={() => ouvrirEdition(f, payeurIds)} style={S.boutonNu} aria-label="Modifier">
                    <Edit2 size={14} color="#9AA6A0" />
                  </button>
                  <button onClick={() => setConfirmDelete(f)} style={S.boutonNu} aria-label="Supprimer">
                    <X size={16} color="#C0463C" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showAdd && (
        <div style={S.overlayBas} onClick={() => setShowAdd(false)}>
          <div style={S.feuilleBas} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#182521" }}>{editId ? "Modifier la facture" : "Nouvelle facture"}</div>
              <X size={18} onClick={() => setShowAdd(false)} />
            </div>
            {erreur && <div style={S.erreur}>{erreur}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              <label style={S.label}>Catégorie</label>
              <select value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })} style={S.champ}>
                {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <label style={S.label}>Montant (DH)</label>
              <input type="number" inputMode="decimal" min="0" step="0.01" value={form.montant} onChange={(e) => setForm({ ...form, montant: e.target.value })} placeholder="0" style={S.champ} />
              <label style={S.label}>Statut</label>
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
              <label style={S.label}>Payé par (coche un ou plusieurs)</label>
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
                  Soit environ {euroCentimes(Math.round(enCentimes(form.montant) / form.payeurs.length))} chacun ({form.payeurs.length} personnes)
                </div>
              )}
              <label style={S.label}>Justificatif (image ou PDF, 10 Mo max)</label>
              <div style={{ border: "1.5px dashed #C7CFCA", borderRadius: 10, padding: 10, display: "flex", alignItems: "center", gap: 8 }}>
                {form.file || form.justificatif_url ? <Check size={16} color="#2F6F63" /> : <Upload size={16} color="#5B6B62" />}
                <input type="file" accept="image/*,.pdf" style={{ flex: 1, fontSize: 12 }} onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} />
              </div>
              <button onClick={enregistrer} disabled={enCours} style={{ ...S.boutonPrimaire, opacity: enCours ? 0.7 : 1 }}>
                {enCours ? "Enregistrement..." : "Enregistrer"}
              </button>
              {editId && (
                <button onClick={() => { setConfirmDelete(factures.find((f) => f.id === editId)); setShowAdd(false); }} style={S.boutonDanger}>
                  Supprimer cette facture
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {preuveVue && (
        <div style={S.overlayCentre} onClick={() => setPreuveVue(null)}>
          <div style={{ ...S.boite, maxWidth: 320 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#182521" }}>Justificatif</div>
              <X size={17} onClick={() => setPreuveVue(null)} />
            </div>
            {preuveVue.image ? (
              <img src={preuveVue.url} alt="justificatif" style={{ width: "100%", borderRadius: 10 }} />
            ) : (
              <a href={preuveVue.url} target="_blank" rel="noreferrer" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, background: "#EEF4F1", borderRadius: 10, padding: 30, color: "#2F6F63", textDecoration: "none" }}>
                <FileText size={30} />
                <div style={{ fontSize: 12, fontWeight: 600 }}>Ouvrir le fichier</div>
              </a>
            )}
          </div>
        </div>
      )}

      {confirmDelete && (
        <ModaleConfirmation
          titre="Supprimer cette facture ?"
          texte="Cette action est définitive, y compris pour le justificatif associé."
          onAnnuler={() => setConfirmDelete(null)}
          onConfirmer={() => supprimer(confirmDelete)}
        />
      )}

      <NavBar />
    </div>
  );
}
