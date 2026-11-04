// Lancer avec : npm test   (aucune installation nécessaire, Node 20+)
import test from "node:test";
import assert from "node:assert/strict";
import {
  numeroSemaine, anneeISO, cleSemaine, lundiDeSemaine,
  responsableMenageAuto, responsableRepas,
  enCentimes, repartir, calculerSoldes, moisCourant, dansLeMois, maintenantCasablanca,
} from "../lib/logique.mjs";

const L = (...noms) => noms.map((nom, i) => ({ id: `id-${nom}`, nom, ordre: i + 1 }));

test("repartir ne perd aucun centime", () => {
  for (const total of [10000, 10001, 10002, 9999, 1, 0, 123457]) {
    for (const n of [1, 2, 3, 4, 5, 7]) {
      const ids = Array.from({ length: n }, (_, i) => `p${i}`);
      for (const decalage of [0, 1, 5, 99]) {
        const parts = repartir(total, ids, decalage);
        const somme = Object.values(parts).reduce((a, b) => a + b, 0);
        assert.equal(somme, total, `total=${total} n=${n} decalage=${decalage}`);
        const vals = Object.values(parts);
        assert.ok(Math.max(...vals) - Math.min(...vals) <= 1);
      }
    }
  }
});

test("enCentimes évite les erreurs de virgule flottante", () => {
  assert.equal(enCentimes(0.1 + 0.2), 30);
  assert.equal(enCentimes("450.50"), 45050);
  assert.equal(enCentimes(null), 0);
});

test("la somme des soldes est toujours nulle", () => {
  const locs = L("A", "B", "C");
  const factures = [
    { id: 1, montant: 100, paye_par: "id-A", statut: "reglee" },
    { id: 2, montant: 33.33, paye_par: "id-B", statut: "reglee" },
    { id: 3, montant: 450, paye_par: "id-C", statut: "reglee" },
    { id: 4, montant: 77.77, paye_par: "id-A", statut: "reglee" },
  ];
  const payeursMap = { 4: ["id-A", "id-B"] };
  const soldes = calculerSoldes(locs, factures, payeursMap);
  assert.equal(Object.values(soldes).reduce((a, b) => a + b, 0), 0);
});

test("cas simple : A paie 300 pour 3 → B et C lui doivent 100 chacun", () => {
  const locs = L("A", "B", "C");
  const s = calculerSoldes(locs, [{ id: 1, montant: 300, paye_par: "id-A", statut: "reglee" }], {});
  assert.equal(s["id-A"], 20000);
  assert.equal(s["id-B"], -10000);
  assert.equal(s["id-C"], -10000);
});

test("les factures en attente ne comptent pas dans les soldes", () => {
  const locs = L("A", "B");
  const s = calculerSoldes(locs, [{ id: 1, montant: 200, paye_par: "id-A", statut: "en_attente" }], {});
  assert.equal(s["id-A"], 0);
  assert.equal(s["id-B"], 0);
});

test("payeurs multiples : chacun est crédité de sa part", () => {
  const locs = L("A", "B", "C", "D");
  const s = calculerSoldes(locs, [{ id: 1, montant: 400, paye_par: "id-A", statut: "reglee" }], { 1: ["id-A", "id-B"] });
  assert.equal(s["id-A"], 10000);
  assert.equal(s["id-B"], 10000);
  assert.equal(s["id-C"], -10000);
  assert.equal(s["id-D"], -10000);
});

test("numéro et année ISO autour du 1er janvier", () => {
  const lundi = new Date(2025, 11, 29); // lundi 29/12/2025
  assert.equal(numeroSemaine(lundi), 1);
  assert.equal(anneeISO(lundi), 2026);
  assert.equal(cleSemaine(lundi), "2026-1");
  assert.equal(cleSemaine(new Date(2026, 0, 1)), "2026-1"); // jeudi 01/01/2026, même semaine
  assert.equal(cleSemaine(new Date(2027, 0, 1)), "2026-53"); // vendredi 01/01/2027
});

test("lundiDeSemaine renvoie bien un lundi", () => {
  for (let j = 0; j < 14; j++) {
    const base = new Date(2026, 10, 1 + j);
    assert.equal(lundiDeSemaine(0, base).getDay(), 1);
  }
  assert.equal(lundiDeSemaine(0, new Date(2026, 10, 8)).getDate(), 2); // dimanche 08/11 → lundi 02/11
  assert.equal(lundiDeSemaine(1, new Date(2026, 10, 4)).getDate(), 9);
});

test("la rotation du ménage avance bien chaque semaine et boucle", () => {
  const locs = L("A", "B", "C");
  const base = new Date(2026, 10, 4);
  const suite = [0, 1, 2, 3, 4, 5].map((o) => responsableMenageAuto(locs, lundiDeSemaine(o, base)));
  assert.equal(new Set(suite.slice(0, 3)).size, 3, "3 semaines de suite = 3 personnes différentes");
  assert.deepEqual(suite.slice(0, 3), suite.slice(3, 6), "la rotation boucle");
  // Aucune personne deux semaines d'affilée
  for (let i = 1; i < suite.length; i++) assert.notEqual(suite[i], suite[i - 1]);
});

test("la rotation ne dépend pas du jour de la semaine choisi dans la semaine", () => {
  const locs = L("A", "B", "C", "D");
  const lundi = responsableMenageAuto(locs, lundiDeSemaine(0, new Date(2026, 10, 2)));
  for (let j = 2; j <= 8; j++) {
    assert.equal(responsableMenageAuto(locs, lundiDeSemaine(0, new Date(2026, 10, j))), lundi);
  }
});

test("pas de locataires : pas de plantage", () => {
  assert.equal(responsableMenageAuto([], new Date()), null);
  assert.equal(responsableRepas([], [], 0, "midi"), null);
  assert.deepEqual(repartir(100, []), {});
});

test("repas : valeur enregistrée prioritaire, sinon rotation par défaut", () => {
  const locs = L("A", "B", "C");
  const repas = [{ jour_semaine: 1, moment: "midi", responsable_id: "id-C" }];
  assert.equal(responsableRepas(repas, locs, 1, "midi"), "id-C");
  assert.equal(responsableRepas(repas, locs, 1, "soir"), "id-B"); // défaut = locataires[1]
  assert.equal(responsableRepas(repas, locs, 4, "midi"), "id-B"); // 4 % 3 = 1
});

test("mois courant et filtrage", () => {
  assert.equal(moisCourant(new Date(2026, 10, 4)), "2026-11");
  assert.ok(dansLeMois({ date: "2026-11-02" }, "2026-11"));
  assert.ok(!dansLeMois({ date: "2026-10-31" }, "2026-11"));
  assert.ok(!dansLeMois({}, "2026-11"));
});

test("heure au Maroc, quel que soit le fuseau du serveur", () => {
  // Mercredi 4 novembre 2026, 11:00 UTC → 12:00 à Casablanca (UTC+1)
  const r = maintenantCasablanca(new Date(Date.UTC(2026, 10, 4, 11, 0)));
  assert.equal(r.jour, 2); // mercredi
  assert.equal(r.heure, 12);
  // Dimanche 8 novembre, 23:30 UTC → dimanche 00:30 le lundi à Casablanca
  const s = maintenantCasablanca(new Date(Date.UTC(2026, 10, 8, 23, 30)));
  assert.equal(s.jour, 0);
  assert.equal(s.heure, 0);
});
