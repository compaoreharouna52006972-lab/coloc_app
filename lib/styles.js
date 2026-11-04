// Styles partagés : évite de recopier les mêmes objets dans chaque page.
export const S = {
  titrePage: { fontSize: 19, fontWeight: 800, letterSpacing: -0.3, color: "#182521" },
  carte: { background: "#fff", borderRadius: 16, padding: 17, boxShadow: "0 1px 3px rgba(28,38,33,0.07)" },
  carteEntete: { display: "flex", alignItems: "center", gap: 8, marginBottom: 13 },
  carteTitre: { fontSize: 14, fontWeight: 700, color: "#182521" },
  label: { fontSize: 12, color: "#5B6B62", fontWeight: 600 },
  champ: { border: "1px solid #E1E5E2", borderRadius: 10, padding: 11, fontSize: 14 },
  boutonPrimaire: { background: "#2F6F63", color: "#fff", border: "none", borderRadius: 10, padding: 13, fontWeight: 700, fontSize: 14, marginTop: 8, boxShadow: "0 2px 8px rgba(47,111,99,0.25)" },
  boutonDanger: { background: "none", color: "#C0463C", border: "none", padding: 6, fontWeight: 600, fontSize: 13 },
  boutonNu: { background: "none", border: "none", padding: 0 },
  overlayBas: { position: "fixed", inset: 0, background: "rgba(24,37,33,0.5)", display: "flex", alignItems: "flex-end", zIndex: 10 },
  overlayCentre: { position: "fixed", inset: 0, background: "rgba(24,37,33,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, padding: 24 },
  feuilleBas: { background: "#fff", width: "100%", borderRadius: "20px 20px 0 0", padding: 22, maxHeight: "88vh", overflowY: "auto" },
  boite: { background: "#fff", borderRadius: 16, padding: 18, width: "100%" },
  erreur: { background: "#FBE9E7", color: "#C0463C", borderRadius: 10, padding: "10px 12px", fontSize: 12.5, marginBottom: 12 },
  info: { background: "#EEF4F1", color: "#2F6F63", borderRadius: 10, padding: "10px 12px", fontSize: 12.5, marginBottom: 12 },
};
