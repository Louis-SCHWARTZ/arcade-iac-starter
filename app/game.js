
(function () {
  "use strict";

  var canvas = document.getElementById("jeu");
  var ctx = canvas.getContext("2d");
  var L = canvas.width;
  var H = canvas.height;

  var elScore = document.getElementById("score");
  var elRecord = document.getElementById("record");
  var elNiveau = document.getElementById("niveau");
  var elVies = document.getElementById("vies");
  var elMessage = document.getElementById("message");

  var COULEURS = ["#ff3ea5", "#ff8a3d", "#ffe14d", "#5dff8f", "#39e6ff", "#a86bff"];
  var COLONNES = 10;
  var BRIQUE_H = 14;
  var MARGE_HAUT = 40;
  var ECART = 4;
  var CLE_RECORD = "pixel-retro-record";

  var etat = "attente"; // attente | jeu | pause | fin
  var score = 0;
  var vies = 3;
  var niveau = 1;
  var record = lireRecord();
  var touches = { gauche: false, droite: false };

  var raquette = { l: 72, h: 10, x: (L - 72) / 2, y: H - 24, vitesse: 6 };
  var balle = { r: 5, x: 0, y: 0, vx: 0, vy: 0 };
  var briques = [];

  // Le record vit dans le navigateur (localStorage), pas sur le serveur.
  function lireRecord() {
    try {
      return parseInt(window.localStorage.getItem(CLE_RECORD), 10) || 0;
    } catch (e) {
      return 0;
    }
  }

  function ecrireRecord(valeur) {
    try {
      window.localStorage.setItem(CLE_RECORD, String(valeur));
    } catch (e) {
      /* stockage indisponible : on garde le record en mémoire seulement */
    }
  }

  function construireNiveau() {
    briques = [];
    var lignes = Math.min(3 + niveau, 6);
    var largeur = (L - ECART * (COLONNES + 1)) / COLONNES;
    for (var ligne = 0; ligne < lignes; ligne++) {
      for (var col = 0; col < COLONNES; col++) {
        briques.push({
          x: ECART + col * (largeur + ECART),
          y: MARGE_HAUT + ligne * (BRIQUE_H + ECART),
          l: largeur,
          h: BRIQUE_H,
          couleur: COULEURS[ligne % COULEURS.length],
          points: (lignes - ligne) * 10,
          vivante: true
        });
      }
    }
  }

  function poserBalle() {
    balle.x = raquette.x + raquette.l / 2;
    balle.y = raquette.y - balle.r - 1;
    balle.vx = 0;
    balle.vy = 0;
  }

  function lancerBalle() {
    var vitesse = 3.2 + niveau * 0.4;
    var angle = (Math.random() * 0.8 - 0.4) - Math.PI / 2;
    balle.vx = Math.cos(angle) * vitesse;
    balle.vy = Math.sin(angle) * vitesse;
  }

  function nouvellePartie() {
    score = 0;
    vies = 3;
    niveau = 1;
    construireNiveau();
    poserBalle();
    majTableau();
  }

  function majTableau() {
    elScore.textContent = score;
    elRecord.textContent = record;
    elNiveau.textContent = niveau;
    elVies.textContent = vies;
  }

  function afficherMessage(titre, aide) {
    elMessage.innerHTML =
      '<p class="clignote">' + titre + "</p>" +
      (aide ? '<p class="aide">' + aide + "</p>" : "");
    elMessage.classList.remove("cache");
  }

  function cacherMessage() {
    elMessage.classList.add("cache");
  }

  function demarrerOuReprendre() {
    if (etat === "fin") {
      nouvellePartie();
      etat = "attente";
    }
    if (etat === "attente") {
      lancerBalle();
      etat = "jeu";
      cacherMessage();
    } else if (etat === "pause") {
      etat = "jeu";
      cacherMessage();
    }
  }

  function basculerPause() {
    if (etat === "jeu") {
      etat = "pause";
      afficherMessage("PAUSE", "P ou ESPACE pour reprendre");
    } else if (etat === "pause") {
      demarrerOuReprendre();
    }
  }

  function perdreVie() {
    vies -= 1;
    if (vies <= 0) {
      etat = "fin";
      if (score > record) {
        record = score;
        ecrireRecord(record);
        afficherMessage("NOUVEAU RECORD : " + score, "ESPACE pour rejouer");
      } else {
        afficherMessage("GAME OVER", "ESPACE pour rejouer");
      }
    } else {
      etat = "attente";
      poserBalle();
      afficherMessage("BALLE PERDUE", "ESPACE pour relancer");
    }
    majTableau();
  }

  function niveauSuivant() {
    niveau += 1;
    construireNiveau();
    etat = "attente";
    poserBalle();
    afficherMessage("NIVEAU " + niveau, "ESPACE pour lancer");
    majTableau();
  }

  function collisionBriques() {
    for (var i = 0; i < briques.length; i++) {
      var b = briques[i];
      if (!b.vivante) continue;
      var dedansX = balle.x + balle.r > b.x && balle.x - balle.r < b.x + b.l;
      var dedansY = balle.y + balle.r > b.y && balle.y - balle.r < b.y + b.h;
      if (dedansX && dedansY) {
        b.vivante = false;
        score += b.points;
        // Rebond sur le côté le moins enfoncé
        var dx = Math.min(balle.x + balle.r - b.x, b.x + b.l - (balle.x - balle.r));
        var dy = Math.min(balle.y + balle.r - b.y, b.y + b.h - (balle.y - balle.r));
        if (dx < dy) {
          balle.vx = -balle.vx;
        } else {
          balle.vy = -balle.vy;
        }
        majTableau();
        return;
      }
    }
  }

  function mettreAJour() {
    if (touches.gauche) raquette.x -= raquette.vitesse;
    if (touches.droite) raquette.x += raquette.vitesse;
    raquette.x = Math.max(0, Math.min(L - raquette.l, raquette.x));

    if (etat === "attente") {
      poserBalle();
      return;
    }
    if (etat !== "jeu") return;

    balle.x += balle.vx;
    balle.y += balle.vy;

    // Murs
    if (balle.x - balle.r < 0) { balle.x = balle.r; balle.vx = Math.abs(balle.vx); }
    if (balle.x + balle.r > L) { balle.x = L - balle.r; balle.vx = -Math.abs(balle.vx); }
    if (balle.y - balle.r < 0) { balle.y = balle.r; balle.vy = Math.abs(balle.vy); }

    // Raquette : l'angle dépend du point d'impact
    if (
      balle.vy > 0 &&
      balle.y + balle.r >= raquette.y &&
      balle.y + balle.r <= raquette.y + raquette.h + 6 &&
      balle.x >= raquette.x - balle.r &&
      balle.x <= raquette.x + raquette.l + balle.r
    ) {
      var impact = (balle.x - (raquette.x + raquette.l / 2)) / (raquette.l / 2);
      var vitesse = Math.sqrt(balle.vx * balle.vx + balle.vy * balle.vy);
      var angle = impact * (Math.PI / 3);
      balle.vx = vitesse * Math.sin(angle);
      balle.vy = -vitesse * Math.cos(angle);
      balle.y = raquette.y - balle.r;
    }

    collisionBriques();

    if (balle.y - balle.r > H) {
      perdreVie();
      return;
    }

    var restantes = 0;
    for (var i = 0; i < briques.length; i++) {
      if (briques[i].vivante) restantes++;
    }
    if (restantes === 0) niveauSuivant();
  }

  function dessiner() {
    ctx.fillStyle = "#05030f";
    ctx.fillRect(0, 0, L, H);

    // Lignes de balayage façon écran cathodique
    ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
    for (var y = 0; y < H; y += 3) ctx.fillRect(0, y, L, 1);

    for (var i = 0; i < briques.length; i++) {
      var b = briques[i];
      if (!b.vivante) continue;
      ctx.fillStyle = b.couleur;
      ctx.fillRect(b.x, b.y, b.l, b.h);
      ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
      ctx.fillRect(b.x, b.y + b.h - 3, b.l, 3);
    }

    ctx.fillStyle = "#39e6ff";
    ctx.fillRect(raquette.x, raquette.y, raquette.l, raquette.h);

    ctx.fillStyle = "#ffe14d";
    ctx.fillRect(balle.x - balle.r, balle.y - balle.r, balle.r * 2, balle.r * 2);
  }

  function boucle() {
    mettreAJour();
    dessiner();
    window.requestAnimationFrame(boucle);
  }

  // --- Commandes ---------------------------------------------------------
  document.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft" || e.key === "q" || e.key === "a") touches.gauche = true;
    if (e.key === "ArrowRight" || e.key === "d") touches.droite = true;
    if (e.key === " ") { e.preventDefault(); demarrerOuReprendre(); }
    if (e.key === "p" || e.key === "P") basculerPause();
  });

  document.addEventListener("keyup", function (e) {
    if (e.key === "ArrowLeft" || e.key === "q" || e.key === "a") touches.gauche = false;
    if (e.key === "ArrowRight" || e.key === "d") touches.droite = false;
  });

  function suivrePointeur(clientX) {
    var rect = canvas.getBoundingClientRect();
    var x = (clientX - rect.left) * (L / rect.width);
    raquette.x = Math.max(0, Math.min(L - raquette.l, x - raquette.l / 2));
  }

  canvas.addEventListener("mousemove", function (e) { suivrePointeur(e.clientX); });
  canvas.addEventListener("touchmove", function (e) {
    e.preventDefault();
    suivrePointeur(e.touches[0].clientX);
  }, { passive: false });
  elMessage.addEventListener("click", demarrerOuReprendre);
  canvas.addEventListener("click", demarrerOuReprendre);

  nouvellePartie();
  boucle();
})();