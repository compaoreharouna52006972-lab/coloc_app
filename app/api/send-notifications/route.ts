import { pushNote, safeEqual, setup } from '../../../lib/server/push'

export const dynamic = 'force-dynamic'

// Passage planifié (11 h et 17 h UTC, voir vercel.json) : filet de sécurité qui envoie les
// notifications que le webhook n'aurait pas pu pousser (panne, secret absent, téléphone éteint
// trop longtemps). Plus tard, c'est ici que se brancheront les rappels de dette.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization') ?? ''
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) return new Response('Non autorisé', { status: 401 })

  const conf = setup()
  if ('error' in conf) return Response.json({ ok: false, erreur: conf.error }, { status: 500 })

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  const { data, error } = await conf.admin
    .from('notifications')
    .select('id, user_id, title, body, link')
    .is('pushed_at', null)
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(200)
  if (error) return Response.json({ ok: false, erreur: error.message }, { status: 500 })

  let sent = 0
  let failed = 0
  let removed = 0
  for (const n of data ?? []) {
    const r = await pushNote(conf.admin, n)
    sent += r.sent
    failed += r.failed
    removed += r.removed
  }
  return Response.json({ ok: true, traitees: data?.length ?? 0, envoyes: sent, echecs: failed, abonnementsSupprimes: removed })
}
