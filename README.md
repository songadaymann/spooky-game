# Spooky (working title)

A first-pass prototype: one ghost from the Mintborn collection, wearing a sheet that behaves like real cloth, floating around an isometric night-time country club. The look follows four reference paintings: flat vermilion, indigo and forest green fields, thin pale lines, long near-black shadows, flocked edges and heavy grain. There is no game yet. This is a sketch to find one.

**Live:** not deployed yet.

## Run it locally

```bash
npm install
npm run dev
```

Open the printed URL. `?ghost=1234` loads any of the 10,000 collection ghosts.

| Input | Does |
| --- | --- |
| WASD / arrows, or click (touch) and hold | Float |
| Shift | Dash |
| Space, double-click, or Twirl | Twirl: the sheet winds up and unwinds |
| N / B, R | Next / previous / random ghost |
| G | Cloth and print tuning panel |
| H | Hide the HUD |
| Scroll or pinch | Zoom |

## How it's built

Three.js r170 and Vite, no other runtime dependencies.

- `src/ghost/cloth.js`: position-based cloth sim of the collection's sheet-01 body. The crown is held by an invisible head; the rest has stretch, shear and weak bend constraints, collides with the head and a body core, and feels air drag along its normal. A soft pull toward the rest pose, strong at the shoulders and nearly gone at the hem, keeps the collection silhouette when the ghost is still.
- `src/ghost/sheet-print.js`: paints a recipe onto the sheet as one 2D print: color pattern, rare fabric, marking, then the face. The face is ink on the cloth rather than 3D geometry, so it creases with the fabric.
- `src/ghost/mintborn/`: copied from the Mintborn ghost workshop (body, trait catalog, markings, fabrics, hats and eyewear), with only import paths changed.
- `src/style/flock-material.js`: one shader for everything: flat color, stippled terminator, near-black cast shadows with grainy penumbras, drawn tile grids, gouache mottling, glow.
- `src/style/post.js`: furry edges (jittered sampling), film grain and colored speckle at 12 fps, red halation, vignette.
- `src/world/world.js`: the court, the tiled pool with its ladder and two things in the water, the red lounge and armchair, hedges and jack-o'-lanterns.

## Keeping the ghosts on-chain-renderable

Every ghost here can be rebuilt from a few bytes, using code alone:

1. **A ghost is a recipe.** `generateCollectionV4()` derives all 10,000 recipes from the collection seed and token number, the same way the workshop does. Nothing is looked up from a server.
2. **No bitmaps, models or fonts.** The body is a parametric surface, the cloth is a simulation, the print and markings are canvas drawing, the hats are procedural geometry, and the world is procedural shaders.
3. **The face and print are plain 2D drawing.** That code maps directly to SVG, so a static token image (sheet silhouette, print, face, long shadow, `feTurbulence` grain) can come from the same recipe.
4. **The only large dependency is Three.js.** Builds of Three.js are already published to on-chain file stores, so a fully on-chain version would pin one of those builds and inline this repo's code.

## License

Code: [MIT](LICENSE). Art, music, and other media: see [ASSETS.md](ASSETS.md).

Made by [Jonathan Mann](https://jonathanmann.net) (Song A Day).
