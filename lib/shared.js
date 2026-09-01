import { Zap, Droplet, Flame, Wifi, Home, Building2, Wrench } from "lucide-react";

export const COULEURS = ["#2F6F63", "#C97A3D", "#4A6FA5", "#8C5E9C", "#3D8B7D", "#B0562F"];

export const CATEGORIES = [
  { id: "electricite", label: "Électricité", icon: Zap },
  { id: "eau", label: "Eau", icon: Droplet },
  { id: "gaz", label: "Gaz", icon: Flame },
  { id: "wifi", label: "WiFi", icon: Wifi },
  { id: "loyer", label: "Loyer", icon: Home },
  { id: "syndic", label: "Syndic", icon: Building2 },
  { id: "reparation", label: "Réparation", icon: Wrench },
];

export function euro(n) {
  return Number(n || 0).toLocaleString("fr-FR") + " DH";
}

export function numeroSemaine(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const jour = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - jour);
  const debutAnnee = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - debutAnnee) / 86400000 + 1) / 7);
}

export function lundiDeSemaine(offset) {
  const now = new Date();
  const jour = now.getDay() || 7;
  const lundi = new Date(now);
  lundi.setDate(now.getDate() - jour + 1 + offset * 7);
  return lundi;
}

export function formatPeriode(lundi) {
  const dimanche = new Date(lundi);
  dimanche.setDate(lundi.getDate() + 6);
  const opts = { day: "numeric", month: "short" };
  return `${lundi.toLocaleDateString("fr-FR", opts)} – ${dimanche.toLocaleDateString("fr-FR", opts)}`;
}

export function cleSemaine(lundi) {
  return `${lundi.getFullYear()}-${numeroSemaine(lundi)}`;
}
