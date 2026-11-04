"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import { COULEURS } from "../../lib/shared";
import { S } from "../../lib/styles";
import { Users, Edit2, ChevronUp, ChevronDown, X, Smartphone, LogOut, Bell, Check } from "lucide-react";
import NavBar from "../NavBar";
import ModaleConfirmation from "../ModaleConfirmation";

const PREFS_PAR_DEFAUT = { repas: true, menage: true, factures: true };

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function lireLocal(cle, defaut) {
  try {
    const brut = localStorage.getItem(cle);
    return brut ? JSON.parse(brut) : defaut;
  } catch {
    return defaut;
  }
}

async function abonnementCourant() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

// Pourquoi ces réglages sont en base et pas seulement dans le téléphone : c'est le serveur
// (le cron) qui décide d'envoyer ou non une notification. Il ne peut pas lire le localStorage
// de ton téléphone.
async function majAbonnement(patch) {
  const sub = await abonnementCourant();
  if (!sub) return;
  await supabase.from("push_subscriptions").update(patch).eq("endpoint", sub.endpoint);
}

async function aUnHistorique(id) {
  const res = await Promise.all([
    supabase.from("factures").select("*", { count: "exact", head: true }).eq("paye_par", id),
    supabase.from("facture_payeurs").select("*", { count: "exact", head: true }).eq("locataire_id", id),
    supabase.from("gaz_recharges").select("*", { count: "exact", head: true }).eq("locataire_id", id),
    supabase.from("repas").select("*", { count: "exact", head: true }).eq("responsable_id", id),
    supabase.from("menage_overrides").select("*", { count: "exact", head: true }).eq("responsable_id", id),
  ]);
  if (res.some((r) => r.error)) return null;
  return res.some((r) => (r.count || 0) > 0);
}

export default function Reglages() {
  const router = useRouter();
  const [locataires, setLocataires] = useState([]);
  const [editLoc, setEditLoc] = useState(null);
  const [ajoutLoc, setAjoutLoc] = useState(null);
  const [notifPrefs, setNotifPrefs] = useState(PREFS_PAR_DEFAUT);
  const [notifStatus, setNotifStatus] = useState("inconnu");
  const [moiId, setMoiId] = useState("");
  const [message, setMessage] = useState(null); // { type: "erreur" | "info", texte }
  const [aRetirer, setARetirer] = useState(null);

  const erreur = (texte) => setMessage({ type: "erreur", texte });
  const info = (texte) => setMessage({ type: "info", texte });

  async function charger() {
    const { data, error } = await supabase.from("locataires").select("*").order("ordre");
    if (error) erreur("Impossible de charger les locataires.");
    setLocataires(data || []);
  }

  useEffect(() => {
    charger();
    setNotifPrefs({ ...PREFS_PAR_DEFAUT, ...lireLocal("notifPrefs", {}) });
    setMoiId(lireLocal("moiId", ""));
    if (typeof window !== "undefined" && "Notification" in window) setNotifStatus(Notification.permission);
  }, []);

  async function deplacer(index, direction) {
    const cible = index + direction;
    if (cible < 0 || cible >= locataires.length) return;
    const copie = [...locataires];
    [copie[index], copie[cible]] = [copie[cible], copie[index]];
    const res = await Promise.all(copie.map((l, i) => supabase.from("locataires").update({ ordre: i + 1 }).eq("id", l.id)));
    if (res.some((r) => r.error)) erreur("Impossible de changer l'ordre.");
    charger();
  }

  async function sauvegarder() {
    if (!editLoc.nom?.trim()) return erreur("Le nom est obligatoire.");
    const { error } = await supabase.from("locataires").update({
      nom: editLoc.nom.trim(), chambre: editLoc.chambre, tel: editLoc.tel, email: editLoc.email,
    }).eq("id", editLoc.id);
    if (error) return erreur("Impossible d'enregistrer les modifications.");
    setEditLoc(null);
    charger();
  }

  async function ajouterLocataire() {
    if (!ajoutLoc?.nom?.trim()) return erreur("Le nom est obligatoire.");
    // max + 1 (et non « nombre de locataires + 1 ») : évite deux locataires au même rang après une suppression
    const prochainOrdre = locataires.reduce((m, l) => Math.max(m, l.ordre || 0), 0) + 1;
    const { error } = await supabase.from("locataires").insert({
      nom: ajoutLoc.nom.trim(),
      chambre: ajoutLoc.chambre || "",
      tel: ajoutLoc.tel || "",
      email: ajoutLoc.email || "",
      ordre: prochainOrdre,
    });
    if (error) return erreur("Impossible d'ajouter le locataire.");
    setAjoutLoc(null);
    charger();
  }

  // Retirer un locataire qui apparaît dans l'historique fausserait les soldes (ses factures
  // disparaîtraient ou deviendraient anonymes). On bloque, et on explique pourquoi.
  async function demanderRetrait(l) {
    const historique = await aUnHistorique(l.id);
    if (historique === null) return erreur("Vérification impossible pour l'instant. Réessaie.");
    if (historique) {
      setEditLoc(null);
      return erreur(`${l.nom} apparaît dans l'historique (factures, repas, ménage ou gaz). Le retirer fausserait les comptes de tout le monde.`);
    }
    setARetirer(l);
  }

  async function supprimerLocataire(l) {
    setARetirer(null);
    await supabase.from("push_subscriptions").delete().eq("locataire_id", l.id);
    const { error } = await supabase.from("locataires").delete().eq("id", l.id);
    if (error) return erreur("Impossible de retirer ce locataire.");
    // Renumérotation sans trou
    const restants = locataires.filter((x) => x.id !== l.id);
    await Promise.all(restants.map((x, i) => supabase.from("locataires").update({ ordre: i + 1 }).eq("id", x.id)));
    setEditLoc(null);
    if (moiId === l.id) choisirMoi("");
    charger();
  }

  function choisirMoi(id) {
    setMoiId(id);
    localStorage.setItem("moiId", JSON.stringify(id));
    majAbonnement({ locataire_id: id || null });
  }

  function toggleNotif(key) {
    const next = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(next);
    localStorage.setItem("notifPrefs", JSON.stringify(next));
    majAbonnement({ prefs: next });
  }

  async function activerNotifications() {
    setMessage(null);
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return erreur("Les notifications ne sont pas supportées sur ce navigateur.");
    }
    if (!moiId) return erreur("Choisis d'abord qui tu es sur cet appareil : les notifications sont envoyées à la personne concernée.");
    if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return erreur("Clé VAPID manquante dans la configuration.");

    const permission = await Notification.requestPermission();
    setNotifStatus(permission);
    if (permission !== "granted") return erreur("Permission refusée : autorise les notifications dans les réglages du navigateur.");

    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
      });
    }

    const sub = subscription.toJSON();
    const { error } = await supabase.from("push_subscriptions").upsert(
      { endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, locataire_id: moiId, prefs: notifPrefs },
      { onConflict: "endpoint" }
    );
    if (error) return erreur("Impossible d'enregistrer cet appareil. Le script SQL 001 a-t-il été exécuté ?");
    info("Notifications activées sur cet appareil !");
  }

  async function deconnecter() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const NOTIFS = [
    { key: "repas", label: "Quand c'est mon tour de récupérer le repas" },
    { key: "menage", label: "Quand c'est mon tour de grand nettoyage (le lundi)" },
    { key: "factures", label: "Rappel hebdo des justificatifs manquants" },
  ];

  return (
    <div style={{ minHeight: "100vh", paddingBottom: 76 }}>
      <div style={{ padding: "18px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={S.titrePage}>Réglages</div>

        {message && <div style={{ ...(message.type === "erreur" ? S.erreur : S.info), marginBottom: 0 }}>{message.texte}</div>}

        <div style={S.carte}>
          <div style={{ ...S.carteEntete, marginBottom: 6 }}>
            <Users size={16} color="#2F6F63" />
            <div style={S.carteTitre}>Locataires</div>
          </div>
          <div style={{ fontSize: 11, color: "#8A968F", marginBottom: 11 }}>L'ordre définit l'ordre de passage pour le grand ménage</div>
          {locataires.map((l, i) => (
            <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "9px 0", borderBottom: i < locataires.length - 1 ? "1px solid #EEF1EF" : "none" }}>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <button disabled={i === 0} onClick={() => deplacer(i, -1)} style={{ ...S.boutonNu, opacity: i === 0 ? 0.25 : 1 }} aria-label="Monter"><ChevronUp size={14} color="#5B6B62" /></button>
                <button disabled={i === locataires.length - 1} onClick={() => deplacer(i, 1)} style={{ ...S.boutonNu, opacity: i === locataires.length - 1 ? 0.25 : 1 }} aria-label="Descendre"><ChevronDown size={14} color="#5B6B62" /></button>
              </div>
              <div style={{ width: 34, height: 34, borderRadius: 999, background: COULEURS[i % COULEURS.length], color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, fontWeight: 700 }}>{l.nom[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#182521" }}>{l.nom}</div>
                <div style={{ fontSize: 11, color: "#8A968F" }}>{l.chambre} · {l.tel}</div>
              </div>
              <button onClick={() => setEditLoc(l)} style={{ background: "none", border: "none" }} aria-label="Modifier"><Edit2 size={15} color="#9AA6A0" /></button>
            </div>
          ))}
          <button
            onClick={() => setAjoutLoc({ nom: "", chambre: "", tel: "", email: "" })}
            style={{ marginTop: 11, width: "100%", background: "#EEF4F1", border: "none", borderRadius: 10, padding: 11, fontWeight: 700, fontSize: 13, color: "#2F6F63" }}
          >
            + Ajouter un locataire
          </button>
        </div>

        <div style={S.carte}>
          <div style={{ ...S.carteEntete, marginBottom: 6 }}>
            <Smartphone size={16} color="#2F6F63" />
            <div style={S.carteTitre}>Notifications sur ce téléphone</div>
          </div>

          <div style={{ fontSize: 12, color: "#5B6B62", marginTop: 8, marginBottom: 6 }}>Qui es-tu sur cet appareil ?</div>
          <select value={moiId} onChange={(e) => choisirMoi(e.target.value)} style={{ ...S.champ, width: "100%", padding: 10 }}>
            <option value="">— Choisir —</option>
            {locataires.map((l) => <option key={l.id} value={l.id}>{l.nom}</option>)}
          </select>

          {NOTIFS.map((n) => (
            <div key={n.key} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 11 }}>
              <div style={{ fontSize: 13, flex: 1, color: "#5B6B62" }}>{n.label}</div>
              <button onClick={() => toggleNotif(n.key)} aria-label={n.label} style={{ width: 40, height: 22, borderRadius: 999, border: "none", background: notifPrefs[n.key] ? "#2F6F63" : "#D7DDD9", position: "relative" }}>
                <div style={{ width: 16, height: 16, borderRadius: 999, background: "#fff", position: "absolute", top: 3, left: notifPrefs[n.key] ? 21 : 3 }} />
              </button>
            </div>
          ))}

          <button
            onClick={activerNotifications}
            style={{
              width: "100%", marginTop: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              background: notifStatus === "granted" ? "#EEF4F1" : "#2F6F63",
              color: notifStatus === "granted" ? "#2F6F63" : "#fff",
              border: "none", borderRadius: 10, padding: 12, fontWeight: 700, fontSize: 13.5,
            }}
          >
            {notifStatus === "granted" ? <Check size={15} /> : <Bell size={15} />}
            {notifStatus === "granted" ? "Enregistrer cet appareil" : "Activer les notifications"}
          </button>
        </div>

        <button
          onClick={deconnecter}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "#fff", color: "#C0463C", border: "1px solid #F0D0CC", borderRadius: 12, padding: 12, fontWeight: 600, fontSize: 13.5 }}
        >
          <LogOut size={15} /> Se déconnecter
        </button>
      </div>

      {editLoc && (
        <div style={S.overlayBas} onClick={() => setEditLoc(null)}>
          <div style={S.feuilleBas} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#182521" }}>Modifier {editLoc.nom}</div>
              <X size={18} onClick={() => setEditLoc(null)} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              <label style={S.label}>Nom</label>
              <input value={editLoc.nom} onChange={(e) => setEditLoc({ ...editLoc, nom: e.target.value })} style={S.champ} />
              <label style={S.label}>Chambre</label>
              <input value={editLoc.chambre || ""} onChange={(e) => setEditLoc({ ...editLoc, chambre: e.target.value })} style={S.champ} />
              <label style={S.label}>Téléphone</label>
              <input type="tel" value={editLoc.tel || ""} onChange={(e) => setEditLoc({ ...editLoc, tel: e.target.value })} style={S.champ} />
              <label style={S.label}>Email</label>
              <input type="email" value={editLoc.email || ""} onChange={(e) => setEditLoc({ ...editLoc, email: e.target.value })} style={S.champ} />
              <button onClick={sauvegarder} style={S.boutonPrimaire}>Enregistrer</button>
              <button onClick={() => demanderRetrait(editLoc)} style={S.boutonDanger}>Retirer ce locataire</button>
            </div>
          </div>
        </div>
      )}

      {ajoutLoc && (
        <div style={S.overlayBas} onClick={() => setAjoutLoc(null)}>
          <div style={S.feuilleBas} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#182521" }}>Ajouter un locataire</div>
              <X size={18} onClick={() => setAjoutLoc(null)} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              <label style={S.label}>Nom</label>
              <input value={ajoutLoc.nom} onChange={(e) => setAjoutLoc({ ...ajoutLoc, nom: e.target.value })} style={S.champ} />
              <label style={S.label}>Chambre</label>
              <input value={ajoutLoc.chambre} onChange={(e) => setAjoutLoc({ ...ajoutLoc, chambre: e.target.value })} style={S.champ} />
              <label style={S.label}>Téléphone</label>
              <input type="tel" value={ajoutLoc.tel} onChange={(e) => setAjoutLoc({ ...ajoutLoc, tel: e.target.value })} style={S.champ} />
              <label style={S.label}>Email</label>
              <input type="email" value={ajoutLoc.email} onChange={(e) => setAjoutLoc({ ...ajoutLoc, email: e.target.value })} style={S.champ} />
              <button onClick={ajouterLocataire} style={S.boutonPrimaire}>Ajouter</button>
            </div>
          </div>
        </div>
      )}

      {aRetirer && (
        <ModaleConfirmation
          titre={`Retirer ${aRetirer.nom} ?`}
          texte="Ce locataire n'apparaît dans aucun historique. Il sera retiré définitivement."
          libelle="Retirer"
          onAnnuler={() => setARetirer(null)}
          onConfirmer={() => supprimerLocataire(aRetirer)}
        />
      )}
      <NavBar />
    </div>
  );
}
