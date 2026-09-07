import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const JOURS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Non autorisé", { status: 401 });
  }

  const now = new Date();
  const jourIndex = now.getDay();
  const jourIndexLundiZero = jourIndex === 0 ? 6 : jourIndex - 1;
  const heure = now.getHours();

  const { data: locataires } = await supabase.from("locataires").select("*").order("ordre");
  const { data: repas } = await supabase.from("repas").select("*").eq("jour_semaine", jourIndexLundiZero);
  const { data: factures } = await supabase.from("factures").select("*");
  const { data: subs } = await supabase.from("push_subscriptions").select("*");

  function nomDe(id) {
    return locataires?.find((l) => l.id === id)?.nom || "quelqu'un";
  }

  const messages = [];

  const momentActuel = heure < 14 ? "midi" : "soir";
  const repasAujourdhui = repas?.find((r) => r.moment === momentActuel || r.moment === "jour");
  if (repasAujourdhui) {
    messages.push({
      title: "🍽️ Repas du jour",
      body: `${nomDe(repasAujourdhui.responsable_id)}, c'est ton tour de récupérer le repas (${JOURS[jourIndex]}) !`,
    });
  }

  const sansJustificatif = factures?.filter((f) => !f.justificatif_url).length || 0;
  if (sansJustificatif > 0 && heure === 9) {
    messages.push({
      title: "📄 Justificatifs manquants",
      body: `${sansJustificatif} facture(s) sans justificatif à compléter.`,
    });
  }

  let envoyes = 0;
  for (const sub of subs || []) {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    };
    for (const msg of messages) {
      try {
        await webpush.sendNotification(pushSubscription, JSON.stringify(msg));
        envoyes++;
      } catch (err) {
        if (err.statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        }
      }
    }
  }

  return Response.json({ ok: true, messages: messages.length, envoyes });
}
