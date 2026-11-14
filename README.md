# Appart 4B — gestion de colocation (version 3)

Application web installable (PWA) pour une colocation : factures, dettes entre colocataires avec
confirmation, règlement groupé, absences (parts au prorata sur l'eau et l'électricité), ménage en
rotation, tâches, inventaire, budget, chat, notifications — y compris sur le téléphone, application fermée.

**Stack** : Next.js 14 (App Router, TypeScript) · Supabase (base, comptes, fichiers, temps réel) · Vercel (hébergement + tâche planifiée) · web-push.

Cette version reprend les fonctionnalités de la « v2 » (ColocApp, Vite) dans l'apparence d'Appart 4B (vert profond, cartes arrondies, icônes Lucide, barre à 5 onglets : Accueil, Dettes, Factures, Tâches, Plus), avec un schéma de base complet, des règles
d'accès par rôle, des reçus privés et des notifications push.

## Qui voit quoi

| Donnée | Membre | Admin |
|---|---|---|
| Factures de la maison (montant, date, catégorie, payeur) | Toutes | Toutes |
| Dettes et paiements | Seulement les siens (débiteur ou créancier) | Toutes |
| Reçus et photos | Ceux de son appartement | Idem |
| Tâches, inventaire, chat, absences | Tout l'appartement | Idem |
| Budgets | Lecture | Lecture et écriture |
| Notifications, appareils abonnés | Les siens | Les siens |

Ces règles sont appliquées **par la base de données** (RLS, `supabase/migrations/000_base_schema.sql`),
pas seulement par l'écran : la clé « anon » est publique, donc masquer une carte ne protégerait rien.
Les changements sensibles (paiement, confirmation, création de facture, rôles…) passent uniquement par des
fonctions serveur (`001` et `002`) : un débiteur ne peut pas se déclarer lui-même « payé ».

## Installation

```bash
npm install
cp .env.example .env.local   # puis remplis les valeurs
npm run dev                  # http://localhost:3000
npm test                     # tests des calculs (dettes, parts, retard)
npm run typecheck            # contrôle des types
```

### 1. Base de données (Supabase → SQL Editor, dans cet ordre)
1. `supabase/migrations/000_base_schema.sql` — tables, règles d'accès, dossier de reçus privé.
2. `001_coloc_hardening.sql` — fonctions serveur (appartement, paiements, factures).
3. `002_coloc_features.sql` — absences, ménage, règlement groupé.
4. `003_v3_push.sql` — appareils abonnés aux notifications.

Chaque script se termine par un tableau de contrôle : toutes les lignes doivent avoir le rôle `{authenticated}`.
Si tu avais déjà lancé la v2 sur ce projet, vérifie qu'aucune règle d'accès restante n'ouvre l'accès à `anon` ou `public`.

### 2. Comptes (Supabase → Authentication)
- Garde **« Allow new users to sign up » désactivé** et crée les comptes des colocataires à la main
  (Users → Add user, avec leur e-mail). Sinon n'importe qui pourrait s'inscrire.
- URL Configuration : ajoute l'adresse du site (`https://…vercel.app`) dans **Site URL** et **Redirect URLs**,
  sinon le lien de connexion reçu par e-mail renvoie au mauvais endroit.
- La première personne crée l'appartement (elle devient admin) ; les autres le rejoignent avec le code d'invitation.

### 3. Variables d'environnement (Vercel → Settings → Environment Variables)
Voir `.env.example`. `SUPABASE_SERVICE_ROLE_KEY` est secrète : jamais de préfixe `NEXT_PUBLIC_`.

### 4. Notifications instantanées (Supabase → Database → Webhooks)
Crée un webhook : table `notifications`, événement **Insert**, type **HTTP Request**, méthode **POST**,
URL `https://TON-SITE.vercel.app/api/push`, en-tête `x-webhook-secret` = la valeur de `PUSH_WEBHOOK_SECRET`.
Sans lui, les notifications partent quand même, mais seulement aux passages planifiés (11 h et 17 h UTC,
soit 11 h et 17 h au Maroc depuis le retour à l'heure GMT du 20 septembre 2026).
Chaque colocataire active ensuite les notifications dans **Profil** (sur iPhone : installer d'abord l'app sur l'écran d'accueil).

## Contrôle des types (GitHub Actions)
Le build ignore temporairement les erreurs de type (`next.config.js`) : ce code a été converti sans pouvoir
lancer `tsc`. Ajoute `.github/workflows/typecheck.yml` pour le contrôler à chaque envoi :

```yaml
name: Contrôle des types
on: [push, workflow_dispatch]
jobs:
  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm install
      - run: npx tsc --noEmit
      - run: npm test
```
Quand il est vert, supprime les deux lignes `ignoreBuildErrors` / `ignoreDuringBuilds` de `next.config.js`.

## Structure
```
src/app/            pages (routes Next.js) et routes /api (push, tâche planifiée)
src/app/(app)/      pages réservées aux comptes connectés
src/hooks/          lecture et écriture des données
src/lib/router.tsx  compatibilité avec l'ancien React Router (Link, useNavigate…)
src/lib/server/     code serveur : envoi des notifications (clé service_role)
src/utils/          calculs purs (dettes, parts, dates) — testés
supabase/migrations schéma, règles d'accès, fonctions
tests/              tests des calculs
```

## Différences avec la v2 (Vite)
- Le service worker ne met plus aucune donnée en cache (l'ancien cache de l'API pouvait montrer à un compte les
  données du précédent sur un téléphone partagé, et afficher des dettes périmées).
- Chat : charge les 100 messages les plus récents (avant : les 100 plus anciens).
- « En retard » : une échéance du jour n'est en retard qu'à partir du lendemain (date du Maroc).
- Montants : « 450,50 DH ». Profil introuvable : plus d'écran blanc sur la page de paiement.
- Notifications push réelles, reçus privés avec chemin contrôlé par appartement, schéma de base versionné.

## Limites connues / à venir
- Dettes par paire sans compensation automatique ; le règlement groupé et `settleUp` limitent les virements.
- Pas encore : modèles de factures mensuelles, rappels de dette, règle « une recharge de gaz par jour »,
  contestation du ménage sous 48 h, délai de secours quand la rotation est en pause, journal des remboursements.
- Next.js 14.2.35 est la dernière 14.x ; des avis de sécurité ne sont corrigés qu'à partir de la 15.5.28 / 16.4.1.
  Cette migration se fait à part, sur une branche avec l'aperçu Vercel.
