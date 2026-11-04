-- ============================================================================
-- 002 — Justificatifs privés
-- À exécuter APRÈS avoir déployé le nouveau code (qui génère des liens temporaires).
-- Effet : les anciens liens publics (y compris dans d'anciens PDF exportés) cessent de fonctionner.
-- C'est voulu : un bucket public reste lisible par n'importe qui connaissant l'URL.
-- ============================================================================

-- Si la création de la politique ci-dessous échoue (« must be owner »), fais-la depuis
-- Supabase > Storage > Policies : nouvelle politique sur le bucket « justificatifs »,
-- rôle « authenticated », toutes les opérations.

update storage.buckets set public = false where id = 'justificatifs';

drop policy if exists "justificatifs_connectes" on storage.objects;
create policy "justificatifs_connectes" on storage.objects
  for all to authenticated
  using (bucket_id = 'justificatifs')
  with check (bucket_id = 'justificatifs');

-- Vérification : repère toute politique qui autoriserait le rôle anon ou public sur ce bucket,
-- puis supprime-la depuis Supabase > Storage > Policies.
select policyname, roles, cmd, qual
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;
