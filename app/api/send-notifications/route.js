import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import {
  cleSemaine,
  lundiDeSemaine,
  maintenantCasablanca,
  responsableMenageAuto,
  responsableRepas,
} from "../../../lib/logique.mjs";

export const dynamic = "force-dynamic";

const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

function configurer() {
  const requis = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
    "VAPID_PRIVATE_KEY",
    "VAPID_EMAIL",
    "CRON_SECRET",
  ];
  const manquantes = requis.filter((k) => !process.env[k]);
  if (manquantes.length) return { erreur: `Variables manquantes : ${manquantes.join(", ")}` };

  // web-push exige un sujet au format mailto: ou https:
  const sujet = /^(mailto:|https?:)/.test(process.env.VAPID_EMAIL)
    ? process.env.VAPID_EMAIL
    : `mailto:${process.env.VAPID_EMAIL}`;
  webpush.setVapidDetails(sujet, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

  // Clé « service_role » : réservée au serveur, elle contourne la RLS.
  // C'est voulu ici : le cron n'a pas de session utilisateur. Ne JAMAIS la préfixer par NEXT_PUBLIC_.
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  return { supabase };
}

export async function GET(request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}` || !process.env.CRON_SECRET) {
    return new Response("Non autorisé", { status: 401 });
  }

  const { supabase, erreur } = configurer();
  if (erreur) return Response.json({ ok: false, erreur }, { status: 500 });

  const [loc, rep, fac, ovr, sub] = await Promise.all([
    supabase.from("locataires").select("*").order("ordre"),
    supabase.from("repas").select("*"),
    supabase.from("factures").select("id, justificatif_url"),
    supabase.from("menage_overrides").select("*"),
    supabase.from("push_subscriptions").select("*"),
  ]);
  const echec = [loc, rep, fac, ovr, sub].find((r) => r.error);
  if (echec) return Response.json({ ok: false, erreur: echec.error.message }, { status: 500 });

  const locataires = loc.data;
  const abonnements = sub.data;
  const nomDe = (id) => locataires.find((l) => l.id === id)?.nom || "quelqu'un";
  const veut = (abo, cle) => abo.prefs?.[cle] !== false;

  // Heure du Maroc (le serveur est en UTC). Deux passages par jour : midi et soir.
  const { jour, heure } = maintenantCasablanca();
  const estMidi = heure < 15;

  // file d'attente : { abonnement, message }
  const envois = [];
  const pour = (locataireId, cle, message) => {
    abonnements
      .filter((a) => a.locataire_id === locataireId && veut(a, cle))
      .forEach((a) => envois.push({ abo: a, message }));
  };

  // 1) Repas : seulement la personne concernée (le dimanche : un seul créneau, au passage de midi)
  if (!(jour === 6 && !estMidi)) {
    const moment = jour === 6 ? "jour" : estMidi ? "midi" : "soir";
    const responsableId = responsableRepas(rep.data, locataires, jour, moment);
    if (responsableId) {
      const quand = moment === "midi" ? " ce midi" : moment === "soir" ? " ce soir" : "";
      pour(responsableId, "repas", {
        title: "🍽️ Repas du jour",
        body: `${nomDe(responsableId)}, c'est ton tour de récupérer le repas${quand} (${JOURS[jour]}).`,
      });
    }
  }

  // 2) Le lundi midi : grand nettoyage de la semaine + justificatifs manquants
  if (jour === 0 && estMidi) {
    const lundi = lundiDeSemaine(0);
    const override = ovr.data.find((o) => o.cle_semaine === cleSemaine(lundi))?.responsable_id;
    const menageId = override || responsableMenageAuto(locataires, lundi);
    if (menageId) {
      pour(menageId, "menage", {
        title: "🧹 Grand nettoyage",
        body: `${nomDe(menageId)}, c'est ton tour pour le grand nettoyage cette semaine.`,
      });
    }

    const manquants = fac.data.filter((f) => !f.justificatif_url).length;
    if (manquants > 0) {
      abonnements
        .filter((a) => veut(a, "factures"))
        .forEach((a) =>
          envois.push({
            abo: a,
            message: { title: "📄 Justificatifs manquants", body: `${manquants} facture(s) sans justificatif à compléter.` },
          })
        );
    }
  }

  let envoyes = 0;
  let supprimes = 0;
  for (const { abo, message } of envois) {
    try {
      await webpush.sendNotification(
        { endpoint: abo.endpoint, keys: { p256dh: abo.p256dh, auth: abo.auth } },
        JSON.stringify(message)
      );
      envoyes++;
    } catch (err) {
      // 404 / 410 : l'abonnement n'existe plus (app désinstallée, permission retirée) → on le supprime
      if (err.statusCode === 404 || err.statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", abo.endpoint);
        supprimes++;
      }
    }
  }

  return Response.json({ ok: true, jour, heure, prevus: envois.length, envoyes, abonnementsSupprimes: supprimes });
}
