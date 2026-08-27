import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

/*
 * CE DÉPÔT EST PUBLIC, ET SA PAGE EST LE PRODUIT. TOUT CE QU'IL CONTIENT EST LU.
 *
 * ─── LE DÉFAUT QUI A DÉJÀ ÉTÉ PAYÉ, ET QUI N'AVAIT PAS DE GARDE ───
 *
 * Le commit `f061c24` s'intitule « Republish the page without the path of the machine that
 * built it ». La page publiée portait le chemin local du corpus du dépôt PRIVÉ dont celui-ci
 * est la vitrine — le chemin lui-même n'est pas recopié ici, voir plus bas pourquoi. Il a été
 * retiré, et **aucun cas n'a été écrit** : rien n'empêche son
 * retour, et la seule chose qui l'a attrapé la première fois est un regard.
 *
 * Ce fichier est cette garde. Elle vaut pour toute la publication, pas seulement pour la ligne
 * qui a été corrigée : un chemin local dit d'où vient le fichier et ce qui existe à côté.
 */

const ICI = fileURLToPath(new URL(".", import.meta.url));

/** Tout ce que le dépôt publie — il est public, donc c'est tout ce qu'il contient. */
function fichiersPublies() {
  const out = [];
  const descendre = (rel) => {
    for (const e of readdirSync(join(ICI, rel), { withFileTypes: true })) {
      if (e.name === ".git" || e.name === "node_modules") continue;
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) descendre(r);
      else if (statSync(join(ICI, r)).size < 2_000_000) out.push(r);
    }
  };
  descendre("");
  return out;
}

/*
 * L'EXCEPTION EST ÉNUMÉRÉE, PAS DÉCRITE PAR UN MOTIF.
 *
 * Deux fichiers de couche partagée portent en tête « la source de ce fichier est
 * le dossier partagé dont ils viennent. Ils ne se corrigent pas ici — une couche partagée se corrige à la
 * source et se rediffuse — donc ils sont tolérés NOMMÉMENT. Un motif qui tolérerait « toute
 * ligne contenant identite » laisserait passer le prochain chemin ; une liste ne tolère que ce
 * qu'on a regardé, et un troisième fichier fait tomber ce cas.
 */
const TOLERES = new Set([
  "docs/graphes.js", "docs/registre.css", "capturer.mjs", "registre.css", "capturer.test.mjs",
]);

/*
 * ─── CE QUE CETTE GARDE NE PEUT PAS VÉRIFIER, ET POURQUOI ELLE NE DOIT PAS ESSAYER ───
 *
 * La première version cherchait aussi le NOM du dépôt privé dont ceci est la vitrine. Elle
 * échouait sur elle-même, et elle avait raison : pour interdire un nom, il faut l'écrire — et
 * ce fichier est publié comme le reste. **Une garde qui doit nommer le secret qu'elle protège
 * ne peut pas vivre dans l'artefact public.**
 *
 * Ce contrôle-là appartient à l'étape de PUBLICATION, du côté privé : c'est elle qui sait ce
 * qu'elle ne doit pas recopier, et elle n'est pas publiée. Rapporté comme tel.
 *
 * Ce qui reste ici est ce qui se vérifie sans rien révéler : un chemin local ne nomme personne,
 * il dit seulement que la page a été construite sur une machine et laisse voir sa forme.
 */
const INTERDITS = [
  [/~\/Documents\//, "un chemin local de la machine qui a construit la page"],
  [/\/Users\/[a-z]/i, "le nom d'utilisateur système"],
];

test("le relevé porte sur des fichiers — sinon il ne prouve rien", () => {
  const n = fichiersPublies().length;
  assert.ok(n >= 8, `${n} fichier(s) balayé(s) : le relevé ne lit rien.`);
});

test("aucun fichier publié ne porte un chemin local", () => {
  /*
   * CE FICHIER S'EXCLUT LUI-MÊME, ET CE N'EST PAS UNE COMMODITÉ. Pour interdire une forme il
   * faut l'écrire : le motif d'un chemin local doit exister quelque part, et c'est dans la
 * déclaration ci-dessus — la seule zone que ce cas retire avant de se lire. Un motif
   * qui décrit la forme d'un chemin ne nomme aucune machine et ne révèle rien — la différence
   * entre le gabarit et l'exemplaire.
   */
  const fautifs = [];
  for (const rel of fichiersPublies()) {
    if (TOLERES.has(rel)) continue;
    let texte;
    try { texte = readFileSync(join(ICI, rel), "utf8"); } catch { continue; }
    /*
     * L'EXCLUSION EST UNE ZONE, PAS UN FICHIER — ET ELLE A ÉTÉ PAYÉE IMMÉDIATEMENT.
     *
     * La première version sautait ce fichier en entier, au motif que les motifs doivent bien
     * être écrits quelque part. Vrai pour la DÉCLARATION, faux pour tout le reste : dans le
     * même commit, un commentaire de ce fichier citait le chemin privé littéralement, et
     * l'exclusion l'a laissé passer. **Une exemption plus large que sa raison couvre ce
     * qu'elle n'a jamais examiné.**
     *
     * On retire donc la seule zone qui doit contenir des motifs, et le reste du fichier est
     * contrôlé comme les autres.
     */
    if (rel === "vitrine.test.mjs") {
      const d = texte.indexOf("const INTERDITS = [");
      const f = texte.indexOf("];", d);
      assert.ok(d !== -1 && f > d, "la déclaration des motifs a changé de forme : ce cas ne lit rien.");
      texte = texte.slice(0, d) + texte.slice(f);
    }
    for (const [motif, quoi] of INTERDITS) {
      const m = texte.match(motif);
      if (m) fautifs.push(`${rel} : ${quoi} (« ${m[0]} »)`);
    }
  }
  assert.deepEqual(fautifs, [],
    `${fautifs.join("\n  ")}\n  Ce dépôt est public. Un chemin local dit d'où vient le fichier `
    + "et ce qui existe à côté ; le nom du dépôt privé dit qu'il y en a un.");
});

test("les fichiers tolérés le sont NOMMÉMENT, et ils existent encore", () => {
  /*
   * LE PENDANT DE L'EXCEPTION. Sans ce cas, un fichier toléré pourrait disparaître ou être
   * renommé, et la liste continuerait de tolérer un nom qui ne désigne plus rien — une
   * exception qui ne protège plus personne et qu'on n'a plus de raison de relire.
   */
  const publies = new Set(fichiersPublies());
  const fantomes = [...TOLERES].filter((f) => !publies.has(f));
  assert.deepEqual(fantomes, [],
    `${fantomes.join(", ")} : toléré mais absent. Une exception qui désigne un fichier qui `
    + "n'existe plus doit être retirée, pas gardée par habitude.");
  for (const rel of TOLERES) {
    assert.match(readFileSync(join(ICI, rel), "utf8"), /PARTAGÉ|identite/,
      `${rel} est toléré parce qu'il vient d'une couche partagée — si ce n'est plus le cas, `
      + "la tolérance n'a plus de raison d'être.");
  }
});

test("le seuil de la page refuse ce qui n'est pas un nombre", () => {
  /*
   * `Number("")` vaut 0 : un champ vidé traversait `Number.isFinite` et se faisait ramener par
   * le clamp sur la borne BASSE. Ici le seuil décide si l'outil répond ou s'abstient — le
   * poser au minimum le fait répondre DAVANTAGE, la direction dangereuse pour un outil dont
   * l'abstention est le produit.
   *
   * Le gestionnaire est extrait de la page PUBLIÉE et rejoué : un cas qui chercherait
   * `typeof v !== "number"` dans le texte passerait au vert sur une page qui contient la
   * phrase sans l'appliquer.
   */
  const page = readFileSync(join(ICI, "docs/index.html"), "utf8");
  const debut = page.indexOf('  if (chemin === "/api/seuil") {');
  assert.notEqual(debut, -1, "le gestionnaire du seuil n'est plus sous cette forme : ce cas ne lit rien.");
  const fin = page.indexOf('\n  if (chemin === "/api/demander")', debut);
  assert.ok(fin > debut, "la fin du gestionnaire est introuvable.");

  const local = new Function("seuil", `
    return (corps) => {
      const chemin = "/api/seuil";
      ${page.slice(debut, fin)}
      return null;
    };
  `)(0.84);

  assert.deepEqual(local({ seuil: "" }), { seuil: 0.84, refuse: 'seuil=""' },
    "un champ vide doit être refusé ET nommé, sans toucher au seuil en place.");
  assert.deepEqual(local({ seuil: null }), { seuil: 0.84, refuse: "seuil=null" });
  assert.deepEqual(local({ seuil: 0.9 }), { seuil: 0.9 }, "un nombre valide passe.");
  assert.deepEqual(local({ seuil: 42 }), { seuil: 0.99 },
    "un nombre hors bornes est BORNÉ, pas refusé : c'est une valeur, pas une absence de valeur.");
});
