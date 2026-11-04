import { Zap, Droplet, Flame, Wifi, Home, Building2, Wrench } from "lucide-react";

// Les fonctions de calcul vivent dans logique.mjs (testées, utilisables côté serveur).
export { numeroSemaine, lundiDeSemaine, cleSemaine } from "./logique.mjs";

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

// Montant en dirhams (ex. 450 ou 450.5)
export function euro(n) {
  return Number(n || 0).toLocaleString("fr-FR", { maximumFractionDigits: 2 }) + " DH";
}

// Montant exprimé en centimes (ex. 45050)
export function euroCentimes(c) {
  return euro((Number(c) || 0) / 100);
}

export function formatPeriode(lundi) {
  const dimanche = new Date(lundi);
  dimanche.setDate(lundi.getDate() + 6);
  const opts = { day: "numeric", month: "short" };
  return `${lundi.toLocaleDateString("fr-FR", opts)} – ${dimanche.toLocaleDateString("fr-FR", opts)}`;
}
