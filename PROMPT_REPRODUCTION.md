# Prompt de reproduction — Site PromptHQ

> Copie le contenu du bloc ci-dessous et donne-le à un LLM codeur (Claude Code, Cursor, etc.). Aucun asset externe n'est nécessaire — tout est généré procéduralement ou chargé via CDN.

---

```
Crée un site web single-page hébergeable sur GitHub Pages. Un seul fichier `index.html` avec tout inline (CSS + JS). Aucun framework, aucun bundler, aucun npm. Vanilla JS + ES6 modules uniquement.

Le site est une landing page immersive WebGL pour "PromptHQ", une communauté francophone de vibecoding. Il y a un logo 3D en verre qui flotte au centre (texte 3D "HQ" généré procéduralement via Three.js TextGeometry), un fond cylindrique de tuiles animées, une simulation de fluide GPU interactive, du bloom en post-processing, et un widget Discord.

IMPORTANT : le site doit être servi via un serveur HTTP local (ex: `python3 -m http.server 8080`) car les ES modules ne fonctionnent pas en `file://`. Après avoir créé le fichier, lance automatiquement un serveur local.

## Assets — Tout est généré ou chargé via CDN

- **Logo 3D** : généré procéduralement avec `TextGeometry` de Three.js + police chargée via `FontLoader` depuis le CDN Three.js (utiliser `helvetiker_bold.typeface.json`). Le texte est "HQ", extrudé avec `depth: 0.5, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.03`.
- **Police UI** : `Inter` chargée via Google Fonts CDN (`<link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap" rel="stylesheet">`)
- **Favicon** : inline SVG data URI dans le `<link rel="icon">` — un carré arrondi orange `#F82F02` avec "HQ" en blanc
- **Pas de fichier externe** sauf Three.js + Google Fonts via CDN

## Stack technique

- **Three.js r170** chargé via import map depuis jsDelivr CDN :
  ```html
  <script type="importmap">
  { "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/"
  }}
  </script>
  ```
- Imports : `THREE`, `RoomEnvironment`, `FontLoader`, `TextGeometry`
- Tout le code dans un `<script type="module">`

## Couleurs

- Couleur primaire (brand) : `#F82F02` (orange-rouge vif)
- Accent scarlet : `#FF9054`
- Accent jaffa : `#FFC0A4`
- Background : `#000000` pur
- Texte : blanc avec différentes opacités

## Structure HTML

### 1. Loader (écran de chargement)

Un écran noir plein écran (`position: fixed; inset: 0; z-index: 100`) avec :
- **Texte glitch "PromptHQ"** : chaque caractère est un `<span class="char">`. Les caractères non-résolus affichent des symboles aléatoires (`!@#$%^&*()_+-=[]{}|;:<>?/~0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ`) en orange `#F82F02` avec glow, mis à jour toutes les 50ms. Un par un, dans un ordre aléatoire, les caractères se "résolvent" vers la vraie lettre (deviennent blancs). L'intervalle accélère progressivement (départ ~200ms, minimum 40ms). Un curseur clignotant rouge à droite du texte (animation `blink` step-end 0.6s).
- **Scanlines** : un overlay plein écran avec `repeating-linear-gradient` (bandes transparentes/semi-noires de 2px chacune), fade in au début, fade out quand le loader disparaît.
- **Sous-texte** : "initializing" en petit, uppercase, letter-spacing 3px, blanc 25% opacité, fade in après 200ms.
- Le loader se cache quand le modèle 3D est prêt (ou fallback après 5s). Transition `opacity 0.6s ease`.

### 2. Widget Discord

Position fixe, côté droit, à 33% du bas sur desktop. Contient :
- **Lien "Join Discord"** : avec icône SVG Discord (path du logo officiel) et texte avec **effet glitch CSS** (pseudo-elements `::before` et `::after` avec `clip-path: polygon(...)` et animations de décalage/skew).
- **Description** : "Rejoins la plus grosse communauté de vibecoding francophone"
- **Stats live** : fetch `https://discord.com/api/v10/invites/xaBr8E235f?with_counts=true` pour afficher "X online" (dot verte `#23a55a`) et "X members" (dot grise). Initialement `display: none`, apparaissent si le fetch réussit.
- **Hover** : la couleur passe à `#F82F02`
- **Responsive** : sur mobile (<768px), le widget est centré horizontalement, placé à `top: 72%`, scale 1.25, stats en row au lieu de column, bouton avec border.
- **Responsive** : sur écrans <1400px, `bottom: 24px; right: 24px`.

### 3. Animations CSS glitch

3 keyframes :
- `glitch` : petits translate(±2px) et skew(5deg) à 2-4% et 60-64%, reste statique sinon
- `glitchTop` : clip sur le tiers supérieur, translate + skew(-13deg) plus agressif à 62%
- `glitchBottom` : clip sur le tiers inférieur, translate(-22px,5px) skew(21deg) à 62%

## Scène Three.js

### Setup de base

- Détection mobile via regex userAgent + `innerWidth < 768`
- DPR max : 1.5 mobile, 2 desktop
- Background : noir
- FOV : 55 si aspect < 0.8 (portrait), sinon 40
- Camera à z=7
- Renderer avec antialiasing

### Simulation de fluide GPU (Navier-Stokes)

Grille 128×128, textures `HalfFloatType`. 6 passes par frame via des `ShaderMaterial` sur un quad plein écran rendu dans une scène orthographique séparée. **IMPORTANT** : utiliser 3 render targets — `fluidA`, `fluidB` pour le ping-pong, plus un `curlRT` dédié pour le résultat du curl (sinon la passe Velocity lirait et écrirait le même RT, causant des erreurs `GL_INVALID_OPERATION` en boucle) :

1. **Curl** : calcule la vorticité depuis le champ de vélocité (échantillons voisins L/R/T/B). **Écrit dans `curlRT`** (pas dans fluidB)
2. **Velocity** : lit fluidA (vélocité) + **`curlRT`** (curl). Confinement de vorticité (force proportionnelle au gradient de curl × curl × 0.15 × dt) + injection souris (splat gaussien `exp(-dist²/radius²)`, rayon adaptatif `0.03 + 0.15 * min(1, vitesse_pointeur)`, force `pointerVec * splat * 80 * dt`). Écrit dans fluidB, puis swap
3. **Divergence** : `-0.5 * (R-L + T-B)`, stockée dans le canal `.w`
4. **Pressure** : 4 itérations de Jacobi (`(pL+pR+pT+pB+div)*0.25`), stockée dans `.z`
5. **Gradient Subtract** : `vel -= 0.5 * vec2(pR-pL, pT-pB)`
6. **Advect** : semi-lagrangien (`prevUv = (fc - vel*dt*size) / size`), dissipation `*= 0.995`

Le tracking du pointeur utilise une accumulation non-linéaire : `pow(rawLen + 1.0, 1.6) - 1.0` avec decay `*= 0.7` par frame.

### Background — Tuiles instanciées sur cylindre (Quad-Tree)

**Génération quad-tree** : grille de base 8×6, subdivision récursive (profondeur max 2). Probabilité de split : `[0.5, 0.3, 0.15]` par profondeur. Chaque feuille = une tuile.

**Géométrie** : `InstancedBufferGeometry` basée sur `BoxGeometry(1,1,1)`. Attributs par instance :
- `aPos` (vec2) : centre de la tuile en UV 0..1
- `aScale` (vec2) : taille en UV 0..1
- `aRand` (vec4) : 4 valeurs aléatoires par instance

**Vertex shader** : les tuiles sont mappées sur un demi-cylindre **concave** — la caméra est **à l'intérieur** du cylindre, les tuiles enveloppent le spectateur. **Centrage** : `theta = (uvX - 0.5) * PI` (range -PI/2 à +PI/2, centré sur l'axe de la caméra). `radius = 7` (= camera.z). Position : `x = sin(theta) * (radius - p.z)`, `z = radius - cos(theta) * (radius - p.z) - 4.0` (le `-4.0` recule le cylindre pour ne pas empiéter sur le logo/titre). Le `radius - cos(theta) * R` (et non `-radius + cos(theta) * R`) fait que le centre du cylindre est à z=0 (devant la caméra), et les bords s'incurvent vers z=7 (sur les côtés de la caméra). Le `-p.z` (au lieu de `+p.z`) inverse la profondeur pour que les faces avant des BoxGeometry pointent vers l'intérieur. Résultat immersif : centre à (0, y, 0), bords à (±7, y, 7). Les UVs des faces avant sont orientés correctement (pas besoin de flip). Gap entre tuiles : factor 0.92. Profondeur proportionnelle à `min(w,h) * 0.8`.

**Fragment shader** :
- 3 patterns sélectionnés par `floor(aRand.x * 3)` :
  - Pattern 0 : bruit orange avec seuils RGB différents
  - Pattern 1 : grille binaire rouge/noir
  - Pattern 2 : gradient woodsmoke → scarlet
- **Overlay logo** : texture "PromptHQ" (1024×256 canvas, blanc sur transparent) avec 3 modes d'affichage par `floor(aRand.y * 3)` : tuilage scrollant avec sin(), scroll horizontal unique, scroll vertical par instance. Flicker sinusoïdal par tuile. Les UVs sont naturellement correctes car la formule `radius - p.z` oriente les faces avant vers l'intérieur du cylindre (pas de flip nécessaire).
- **Vignette par tuile** : `smoothstep(1.9, 0.1, length((vUv-0.5)*2))`
- **Faces latérales** : couleur sombre `(0.08, 0.09, 0.12)` + émission proportionnelle à `length(fluids.xy) * 3.0`
- **Halftone** : points CRT `step(length(fract(vGlobalUv * 414) - 0.5), 0.35)` mélangé à 50%
- **Vignette globale** : `smoothstep(0.55, 0.05, length(vGlobalUv - 0.5))`

### Crosshairs aux intersections des tuiles

Collecte des coins uniques du quad-tree. `InstancedBufferGeometry` avec `PlaneGeometry`. Le vertex shader place chaque croix sur le cylindre avec la **même formule** : `theta = (uvX - 0.5) * PI`, `x = sin(theta) * radius`, `z = radius - cos(theta) * radius - 4.0`. Orientée tangentiellement. Le fragment shader dessine une croix (bras horizontal + vertical) avec `discard` pour le reste. Couleur blanche à 25% opacité. Transparent, pas de depth write.

### Logo 3D en verre (TextGeometry procédurale)

Le texte "HQ" est généré via `TextGeometry` avec la police `helvetiker_bold` chargée depuis le CDN Three.js (`three/addons/fonts/helvetiker_bold.typeface.json`). Paramètres d'extrusion : `size: 1.5, depth: 0.5, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.03, bevelSegments: 4, curveSegments: 12`. Le mesh est scalé à 1.5 (1.08 mobile) sur sa plus grande dimension, centré sur l'origine. Le groupe du logo est positionné à **z=3** (poussé vers la caméra pour bien se détacher du fond et du titre). Il reçoit un `ShaderMaterial` custom (glass shader).

### Shader Glass

**Vertex** : passe UV, normal (transformée par normalMatrix), et position en view space.

**Fragment** — réfraction multi-sample avec aberration chromatique :
- Coordonnées de réfraction : `gl_FragCoord.xy / uTrnsWinRes` + micro-distortion fluide (`fluids.xy * 0.008`)
- Boost interactif : `mouseProximity = smoothstep(0.4, 0.0, distance(uv, mousePos))`, combiné avec `mouseVelocity`
- Roughness variable via bruit : `smoothstep(0.3, 0.8, noise2.y) * uRoughness` (0.1 desktop, 0 mobile)
- **8 samples** de réfraction : pour chaque sample, offset aléatoire + roughness direction. Séparation R/G/B avec slide croissant (1x, 2x, 4x) pour l'aberration chromatique. `refractPower = 0.15 * (1 + totalBoost * 2)`
- **GGX specular** : 2 lumières (position `(4,4,5)` force 0.6 et `(-5,-1,4)` force 0.3), roughness `0.003 + roughness * 0.4`
- **Fresnel** : Schlick approximation (f0 = 0.1), mélange avec reflection cubemap environment (`F * 0.5`) + auto-illumination (`F * 0.15`)
- **Boost fluide** : `*= 1.0 + fluidsLength * 2.0`

La texture de réfraction vient d'un render target "backgroundRT" : la scène est rendue sans le logo d'abord, puis avec.

### Environment cubemap

`PMREMGenerator` pour l'environment map initiale (utilisée pour le lighting PBR). Un `CubeCamera(256)` capture la scène une seule fois (sans le logo visible) pour les reflections du shader glass.

### Texte "PromptHQ" derrière le logo

Canvas 2D (4096×1024 desktop, moitié mobile). Police Inter 700 (via Google Fonts), taille auto-calculée pour remplir 55% de la largeur. Rendu en 2 passes : d'abord avec `shadowBlur: 100` et `shadowColor: rgba(255,255,255,0.4)` à 15% opacité (glow), puis par-dessus à 80% opacité. Placé sur un `PlaneGeometry` à **z=0.3** (juste devant le centre du cylindre de tuiles qui est à z=0, pour rester visible et non occluté par les tuiles). Largeur calculée depuis le FOV pour occuper ~85% (desktop) ou ~97.75% (mobile) de la vue.

### Éclairage

- Ambient : blanc, intensité 0.6
- Point 1 : blanc, intensité 5, range 20, position (4, 4, 5)
- Point 2 : `#ffe0cc`, intensité 3, range 20, position (-5, -1, 4)
- Point 3 : blanc, intensité 4, range 15, position (0, 2, -3)
- Directionnel : blanc, intensité 1, position (0, 5, 5)

### Pipeline Bloom (post-processing)

3 étapes :

1. **Bright extraction** : `max(0, rgb - 0.35)` puis multiplié par `rgb` (soft knee)
2. **Gaussian blur séparable** : 5-tap (poids 0.227, 0.195, 0.122, 0.054, 0.016), offsets ×2 pour spread large. 3 niveaux de résolution : 1/4, 1/8, 1/16 (2 niveaux seulement sur mobile)
3. **Composite** : `scène + bloom0 * 0.3 + bloom1 * 0.5 + bloom2 * 0.8`, boost global 1.15 desktop / 1.5 mobile

### Animation du logo — Rotation quaternion

- **Auto-spin** : axe Z, angle qui s'accumule à `+= 0.085 * dt` par frame (jamais reset)
- **Impulsion initiale** : pendant les 0.8 premières secondes, `hoverVelY += 0.25 * dt`
- **Souris → moment angulaire** : `hoverVelX -= dy * sensibilité`, `hoverVelY += dx * sensibilité` (sensibilité 0.024 desktop, 0.09 mobile)
- **Friction** : `pow(0.35, dt)` — forte inertie
- **Application** : euler → quaternion, `premultiply` sur le groupe
- **Retour** : slerp vers la target auto-spin avec force `min(0.15 * dt, 1.0)`
- **Click** : ajoute `+0.167` à `hoverVelY` (impulsion latérale)
- **Float vertical** : `sin(elapsed * 0.4) * 0.06`
- **Entrance** : scale de 0 à 1 avec easing cubique sur 2 secondes

### Rendering pipeline (par frame)

1. Smooth mouse + calcul vélocité
2. Update uniforms glass (mousePos, mouseVelocity)
3. Tracking pointeur fluide (accumulation non-linéaire + decay)
4. 6 passes fluide (ping-pong entre RT_A et RT_B)
5. Rotation quaternion du logo
6. Capture cubemap (une seule fois)
7. Render background sans logo → backgroundRT
8. Render scène complète → sceneRT
9. Bloom : extraction → 3 niveaux de blur → composite → écran

### Resize handler

Met à jour : camera aspect + FOV, renderer size, tous les render targets (background, scene, bloom aux 3 résolutions), uniforms de résolution du glass shader.

## Meta / SEO

- Titre : "PromptHQ"
- og:image et twitter:image vers `https://prompthq.fr/og_image.jpeg`
- og:type : website
- twitter:card : summary_large_image
- Favicon : inline SVG data URI (carré arrondi `#F82F02` avec "HQ" blanc)

## Points critiques à ne pas oublier

1. Le quad de fluid/bloom utilise la MÊME scène et caméra orthographique — on change juste le material du mesh
2. Les render targets fluide font du ping-pong (swap A↔B après chaque passe). **Le curl doit utiliser un RT dédié `curlRT`** pour éviter que la passe Velocity ne lise et écrive le même RT (erreur WebGL sinon)
3. Le logo est rendu INVISIBLE pour le backgroundRT (pour que le glass puisse sampler ce qui est derrière)
4. Le cubemap environment est capturé UNE SEULE fois
5. La texture logo pour les tuiles est générée via Canvas2D (pas un fichier image)
6. La texture de bruit est aussi générée via Canvas2D (256×256 random RGBA)
7. Touch events : `preventDefault()` sauf sur les liens/boutons
8. Le loader attend que TOUS les caractères soient résolus avant de se cacher
9. Les scanlines sont un z-index AU-DESSUS du loader (101 vs 100)
10. Le font Google doit être chargé (`document.fonts.ready`) avant de render le texte canvas
11. Le site DOIT être servi via HTTP (pas `file://`) — lancer `python3 -m http.server 8080` après création
12. TOUT est dans un seul `index.html` — aucun fichier externe, aucun asset à fournir
```
