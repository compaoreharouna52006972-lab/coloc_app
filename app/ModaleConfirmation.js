"use client";
import { S } from "../lib/styles";

export default function ModaleConfirmation({ titre, texte, libelle = "Supprimer", onAnnuler, onConfirmer }) {
  return (
    <div style={S.overlayCentre} onClick={onAnnuler}>
      <div style={{ ...S.boite, maxWidth: 300 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6, color: "#182521" }}>{titre}</div>
        <div style={{ fontSize: 12.5, color: "#5B6B62", marginBottom: 16 }}>{texte}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onAnnuler} style={{ flex: 1, background: "#EEF1EF", border: "none", borderRadius: 10, padding: 11, fontWeight: 600, fontSize: 13 }}>Annuler</button>
          <button onClick={onConfirmer} style={{ flex: 1, background: "#C0463C", color: "#fff", border: "none", borderRadius: 10, padding: 11, fontWeight: 600, fontSize: 13 }}>{libelle}</button>
        </div>
      </div>
    </div>
  );
}
