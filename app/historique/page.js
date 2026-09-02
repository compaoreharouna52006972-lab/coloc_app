"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { CATEGORIES, euro } from "../../lib/shared";
import { History, FileText, Search, Download } from "lucide-react";
import NavBar from "../NavBar";

export default function Historique() {
  const [factures, setFactures] = useState([]);
  const [locataires, setLocataires] = useState([]);
  const [payeursMap, setPayeursMap] = useState({});
  const [preuveVue, setPreuveVue] = useState(null);
  const [recherche, setRecherche] = useState("");
  const [filtreCategorie, setFiltreCategorie] = useState("toutes");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function charger() {
      const { data: loc } = await supabase.from("locataires").select("*");
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
    }
    charger();
  }, []);

  function nomsDe(ids) {
    return (ids || []).map((id) => locataires.find((l) => l.id === id)?.nom).filter(Boolean).join(", ") || "—";
  }

  const facturesFiltrees = factures.filter((f) => {
    const cat = CATEGORIES.find((c) => c.id === f.categorie);
    const payeurIds = payeursMap[f.id] || (f.paye_par ? [f.paye_par] : []);
    const noms = nomsDe(payeurIds).toLowerCase();
    const matchRecherche = !recherche || cat?.label.toLowerCase().includes(recherche.toLowerCase()) || noms.includes(recherche.toLowerCase()) || f.date.includes(recherche);
    const matchCategorie = filtreCategorie === "toutes" || f.categorie === filtreCategorie;
    return matchRecherche && matchCategorie;
  });

  async function exporterPDF() {
    setExporting(true);
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    const marge = 14;
    let y = 20;

    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    doc.text("Appart 4B — Récapitulatif des factures", marge, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont(undefined, "normal");
    doc.setTextColor(100);
    doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")}`, marge, y);
    y += 10;

    const total = facturesFiltrees.reduce((s, f) => s + Number(f.montant), 0);
    doc.setTextColor(0);
    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text(`Total : ${euro(total)} — ${facturesFiltrees.length} facture(s)`, marge, y);
    y += 10;

    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.text("Date", marge, y);
    doc.text("Catégorie", marge + 22, y);
    doc.text("Montant", marge + 68, y);
    doc.text("Payé par", marge + 95, y);
    doc.text("Statut", marge + 140, y);
    doc.text("Justificatif", marge + 165, y);
    y += 2;
    doc.setDrawColor(200);
    doc.line(marge, y, 196, y);
    y += 5;

    doc.setFont(undefined, "normal");
    facturesFiltrees.forEach((f) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      const cat = CATEGORIES.find((c) => c.id === f.categorie);
      const payeurIds = payeursMap[f.id] || (f.paye_par ? [f.paye_par] : []);
      doc.setFontSize(8.5);
      doc.text(f.date, marge, y);
      doc.text(cat?.label || "—", marge + 22, y);
      doc.text(euro(f.montant), marge + 68, y);
      doc.text(nomsDe(payeurIds).slice(0, 22), marge + 95, y);
      doc.text(f.statut === "en_attente" ? "En attente" : "Réglée", marge + 140, y);
      if (f.justificatif_url) {
        doc.setTextColor(47, 111, 99);
        doc.textWithLink("Voir", marge + 165, y, { url: f.justificatif_url });
        doc.setTextColor(0);
      } else {
        doc.setTextColor(150);
        doc.text("—", marge + 165, y);
        doc.setTextColor(0);
      }
      y += 6;
    });

    doc.save(`factures-appart4b-${new Date().toISOString().slice(0, 10)}.pdf`);
    setExporting(false);
  }

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 76 }}>
      <div style={{ padding: "18px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: -0.3, color: "#182521" }}>Historique</div>
          <button
            onClick={exporterPDF}
            disabled={exporting}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "#182521", color: "#fff", border: "none", borderRadius: 10, padding: "8px 12px", fontSize: 12.5, fontWeight: 600 }}
          >
            <Download size={14} /> {exporting ? "..." : "PDF"}
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
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

        <div style={{ background: "#fff", borderRadius: 16, padding: 17, boxShadow: "0 1px 3px rgba(28,38,33,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
            <History size={16} color="#2F6F63" />
            <div style={{ fontSize: 14, fontWeight: 700, color: "#182521" }}>Toutes les factures par catégorie</div>
          </div>
          {facturesFiltrees.length === 0 && (
            <div style={{ textAlign: "center", padding: 20, color: "#9AA6A0", fontSize: 13 }}>Aucune facture trouvée</div>
          )}
          {CATEGORIES.map((cat) => {
            const items = facturesFiltrees.filter((f) => f.categorie === cat.id);
            if (!items.length) return null;
            const sousTotal = items.reduce((s, f) => s + Number(f.montant), 0);
            const Icon = cat.icon;
            return (
              <div key={cat.id} style={{ borderBottom: "1px solid #EEF1EF", paddingBottom: 11, marginBottom: 11 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
                  <Icon size={14} color="#2F6F63" />
                  <div style={{ fontSize: 13, fontWeight: 700, flex: 1, color: "#182521" }}>{cat.label}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: "#182521" }}>{euro(sousTotal)}</div>
                </div>
                {items.map((f) => {
                  const payeurIds = payeursMap[f.id] || (f.paye_par ? [f.paye_par] : []);
                  return (
                    <div key={f.id} style={{ display: "flex", alignItems: "center", fontSize: 11.5, color: "#5B6B62", padding: "4px 0 4px 22px", gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        {f.date} · {nomsDe(payeurIds)}
                        {f.statut === "en_attente" && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: "#B0562F" }}>· en attente</span>}
                      </div>
                      <div>{euro(f.montant)}</div>
                      {f.justificatif_url ? (
                        <button onClick={() => setPreuveVue(f)} style={{ background: "none", border: "none", color: "#2F6F63", padding: 0 }}>
                          <FileText size={13} />
                        </button>
                      ) : <span style={{ width: 13 }} />}
                    </div>
                  );
                })}
              </div>
            );
          })}
          <div style={{ fontSize: 11, color: "#8A968F" }}>Toutes les factures et justificatifs restent archivés — utile en cas de litige avec le bailleur</div>
        </div>
      </div>

      {preuveVue && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(24,37,33,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, padding: 24 }} onClick={() => setPreuveVue(null)}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 18, width: "100%", maxWidth: 320 }} onClick={(e) => e.stopPropagation()}>
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
      <NavBar />
    </div>
  );
}
