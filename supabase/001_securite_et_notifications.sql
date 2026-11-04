-- ============================================================================
-- 001 — Sécurité (RLS), contraintes et préférences de notification
-- À exécuter dans Supabase > SQL Editor, AVANT de déployer le nouveau code.
-- Le script est « rejouable » : tu peux le relancer sans risque.
-- ============================================================================

-- 1) Préférences de notification par appareil (lues par le cron côté serveur)
alter table public.push_subscriptions
  add column if not exists prefs jsonb not null
  default '{"repas": true, "menage": true, "factures": true}'::jsonb;

-- 2) Doublons éventuels : on les retire avant de poser les contraintes d'unicité
delete from public.facture_payeurs a
  using public.facture_payeurs b
  where a.ctid > b.ctid
    and a.facture_id = b.facture_id
    and a.locataire_id = b.locataire_id;

delete from public.menage_overrides a
  using public.menage_overrides b
  where a.ctid > b.ctid
    and a.cle_semaine = b.cle_semaine;

delete from public.repas a
  using public.repas b
  where a.ctid > b.ctid
    and a.jour_semaine = b.jour_semaine
    and a.moment = b.moment;

-- 3) Unicité : pourquoi ? Sans elle, la base accepte deux fois la même personne sur une
--    facture (elle serait comptée deux fois dans les soldes) ou deux responsables pour
--    le même repas.
create unique index if not exists facture_payeurs_unique on public.facture_payeurs (facture_id, locataire_id);
create unique index if not exists menage_overrides_cle_unique on public.menage_overrides (cle_semaine);
create unique index if not exists repas_jour_moment_unique on public.repas (jour_semaine, moment);

-- 4) Contrôles de validité (NOT VALID : ne bloque pas les anciennes lignes, vérifie les nouvelles)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'factures_montant_positif') then
    alter table public.factures add constraint factures_montant_positif check (montant > 0) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'factures_statut_valide') then
    alter table public.factures add constraint factures_statut_valide
      check (statut is null or statut in ('reglee', 'en_attente')) not valid;
  end if;
end $$;

-- 5) Index pour les tris utilisés par l'application
create index if not exists factures_date_idx on public.factures (date desc);
create index if not exists gaz_recharges_date_idx on public.gaz_recharges (date desc);

-- 6) RLS : seules les personnes CONNECTÉES accèdent aux données.
--    Pourquoi : la clé « anon » est publique (elle est dans le code envoyé au navigateur).
--    Sans RLS, n'importe qui qui la récupère peut lire et modifier tes tables.
--    Ce bloc supprime toutes les politiques existantes sur ces tables (notamment celles qui
--    ouvriraient l'accès aux visiteurs non connectés) et pose une seule règle : « connecté ».
do $$
declare
  t text;
  p record;
begin
  foreach t in array array[
    'locataires', 'factures', 'facture_payeurs', 'repas',
    'menage_overrides', 'gaz_recharges', 'push_subscriptions'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
    execute format(
      'create policy "acces_connectes" on public.%I for all to authenticated using (true) with check (true)', t
    );
  end loop;
end $$;

-- 7) Vérification : chaque table doit apparaître avec le rôle {authenticated} uniquement
select tablename, policyname, roles from pg_policies where schemaname = 'public' order by tablename;
