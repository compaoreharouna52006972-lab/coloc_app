import { pushNote, safeEqual, setup, type NoteRow } from '../../../lib/server/push'

export const dynamic = 'force-dynamic'

// Appelée par un webhook Supabase à chaque nouvelle ligne de la table « notifications » :
// la notification arrive sur le téléphone tout de suite, sans attendre le passage planifié.
export async function POST(request: Request) {
  const secret = process.env.PUSH_WEBHOOK_SECRET
  const given = request.headers.get('x-webhook-secret') ?? ''
  if (!secret || !safeEqual(given, secret)) return new Response('Non autorisé', { status: 401 })

  const body = (await request.json().catch(() => null)) as { type?: string; record?: Partial<NoteRow> } | null
  const r = body?.record
  if (body?.type !== 'INSERT' || !r?.id || !r.user_id || !r.title) {
    return Response.json({ ok: false, erreur: 'Charge invalide' }, { status: 400 })
  }

  const conf = setup()
  if ('error' in conf) return Response.json({ ok: false, erreur: conf.error }, { status: 500 })

  const res = await pushNote(conf.admin, {
    id: r.id,
    user_id: r.user_id,
    title: r.title,
    body: r.body ?? null,
    link: r.link ?? null,
  })
  return Response.json({ ok: true, ...res })
}
