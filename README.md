# Appart 4B — gestion de colocation

Application web (PWA) pour gérer une colocation : factures partagées avec justificatifs, soldes
« qui doit quoi », rotation du grand ménage, tours de repas, recharge du gaz, export PDF et
notifications push ciblées.

**Stack** : Next.js 14 (App Router) · Supabase (base, authentification, stockage) · Vercel (hébergement + cron) · jsPDF · web-push.

## Installation locale

```bash
npm install
cp .env.example .env.local   # puis remplis les valeurs
npm run dev                  # http://localhost:3000
npm test                     # tests des calculs (argent, rotation, dates)
```

## Variables d'environnement

Voir `.env.example`. À renseigner en local (`.env.local`) **et** dans Vercel (Settings > Environment Variables).

| Variable | Rôle | Secrète ? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Connexion Supabase depuis le navigateur | Non (publiques par conception, protégées par la RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Accès serveur du cron (contourne la RLS) | **Oui** — jamais de préfixe `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL` | Notifications push (`npx web-push generate-vapid-keys`) | La clé privée : oui. `VAPID_EMAIL` au format `mailto:...` |
| `CRON_SECRET` | Protège `/api/send-notifications` | Oui |

## Base de données (Supabase)

Les scripts sont dans `supabase/` et s'exécutent dans **SQL Editor**, dans l'ordre :

1. `001_securite_et_notifications.sql` — RLS (accès réservé aux comptes connectés), contraintes d'unicité, colonne `prefs`.
2. Déployer le code, puis `002_bucket_prive.sql` — passe le bucket `justificatifs` en privé.

Réglage à faire à la main : **Authentication > Sign In / Providers > désactiver « Allow new users to sign up »**,
puis créer les comptes des colocs depuis Authentication > Users. Sans cela, n'importe qui pourrait s'inscrire
et lire toutes les données (la RLS autorise « tout compte connecté »).

## Notifications

Le cron (`vercel.json`) appelle `/api/send-notifications` à 11h et 17h UTC (≈ 12h et 18h au Maroc). L'heure
exacte est recalculée en `Africa/Casablanca` par la route.

- Repas : la personne concernée, midi et soir (le dimanche : une fois, à midi).
- Lundi midi : le responsable du grand nettoyage + rappel des justificatifs manquants.
- Chaque colocataire doit ouvrir **Réglages**, choisir « Qui es-tu ? » puis « Activer les notifications » sur son téléphone.

Le plan gratuit de Vercel limite les crons à un passage par jour et par tâche : vérifie ton plan si le second horaire ne se déclenche pas.

## Règles de calcul

- Tous les montants sont calculés en **centimes entiers** (pas d'erreur d'arrondi).
- Chaque facture **réglée** est partagée à parts égales entre tous les locataires ; les factures « en attente » ne comptent pas encore.
- La rotation du ménage est calculée depuis une date fixe : elle avance toute seule chaque semaine.

## Structure

```
app/            pages (accueil, factures, ménage, historique, réglages, login) + API du cron
lib/logique.mjs calculs purs (soldes, rotation, fuseau) — testés
lib/storage.js  justificatifs (liens temporaires)
supabase/       scripts SQL
tests/          tests unitaires (npm test)
```
