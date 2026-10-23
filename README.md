# Vivid developer studio

Editable Blender studio with saturated violet, cobalt and pink accents, warm oak flooring, and local coloured desk lighting. The original orthographic composition and wall lettering are preserved.

- `pastel_developer_studio.blend` — editable scene, camera, procedural materials, lighting and packed font.
- `pastel_developer_studio.png` — 1536 × 1536 Cycles render, 256 samples with denoising.
- `preview.png` — reduced-resolution composition check.
- `build_studio.py` — reproducible scene construction for Blender 5.2.

## Geometry and materials

The chair has paired casters with axles and swivel stems. Wheel contact is derived from the rug surface at Z = 0.060 m. The desk surface is at Z = 0.800 m; the seat surface is at approximately Z = 0.521 m. Floorboards finish at Z = 0.0255 m.

The rug uses a dedicated procedural weave, raised floral medallions, a bound perimeter and individual edge stitches. Chair mesh uses UV-based woven shading to avoid the previous generated-coordinate interference. Books, cabinet pulls, keyboard layout, PC details and desk cable routing are editable geometry.

Objects are grouped into Architecture, Furniture, Chair, Equipment, Decorations, Lighting and Cameras. Open the `.blend` file and press F12 to render. The static diorama is composed for its reference camera; small hidden surfaces remain simplified.

## Rebuild

```sh
blender --background --python build_studio.py -- --render
```

Use `--preview` instead of `--render` for a 768 × 768, 32-sample preview. Omitting both flags builds and saves the scene without rendering. The script starts a fresh scene and writes files beside itself; use a separate Blender session to preserve unrelated work.

On machines where background Blender fails during Metal initialization, run the script in an interactive Blender session. The script checks evaluated caster/rug contact, desk-leg/floor contact, desk height and seat height before saving.

## Interactive web edition — Vite + Three.js

The browser version loads the actual Blender room as a self-contained, Meshopt-compressed GLB. Source artwork and the `.blend` file are retained. The export groups static geometry by material and interaction, replaces subpixel rug threads with a portable texture, and preserves separate pivots for the chair and door. Dynamic web lighting approximates the render; it is not the offline Cycles lighting.

### Run locally

Requires Node.js 20.19 or newer.

```sh
npm install
npm run dev
```

Open the Local URL printed by Vite (normally `http://127.0.0.1:5173`). For production:

```sh
npm run build
npm run preview
```

`dist/` is a complete static website. Assets use a relative base so the build can also be hosted under a subdirectory. Serve it over HTTP; opening `index.html` directly as a local file does not enable normal module and model loading.

### Interactions

- Drag to orbit; scroll or pinch to zoom. The home button restores the original camera.
- Select a mesh, a purple hotspot, or an item in the object list. The list also provides keyboard access.
- Lamp and neon sign: toggle their light. Header: switch daylight/night lighting.
- Chair: spin around its own base. Door: open around its hinge into a real doorway.
- Rug: choose lavender, rose, or ocean. Artwork: cycle three palettes.
- Monitors and desk: edit notes and show them on the 3D monitor, or switch back to the landscape.
- Computer: turn the displays on/off without deleting notes.
- Coffee mug: use a 25-minute focus timer or 5-minute break. The timer uses a wall-clock deadline and keeps time across background tabs and reloads.
- Books: open learning resources and mark them as read.

Notes, room preferences and timer state are saved in this browser's local storage. No account, backend, analytics, or external API is required. If browser storage is unavailable, controls still work for the current session. No private note content is sent anywhere.

Keyboard: **H** home, **L** lamp, **N** day/night, **Space** timer, **Escape** close. Shortcuts do not intercept typing in the note editor. The interface respects reduced-motion preferences, supports touch, handles viewport resizing, and shows the original room image if WebGL or model loading fails.

### Files and asset export

- `src/main.js`, `src/style.css`: accessible DOM interface and responsive layout.
- `src/state/store.js`: validated persistence and timer logic, separate from Three.js.
- `src/render/studio.js`: GLB loader, lighting, camera, raycasting, display textures and animation.
- `scripts/export_web_scene.py`: reproducible Blender export; creates a temporary scene and restores the original without saving changes to the `.blend` file.
- `public/models/studio.glb`: about 5.7 MB, 79 mesh batches, 11 interactive object categories plus the room shell. Uses the bundled Meshopt decoder; no CDN requests.

To re-export, open `pastel_developer_studio.blend` in Blender 5.2 and run this in its Python Console:

```python
path = '/absolute/path/to/isometric_room/scripts/export_web_scene.py'
exec(compile(open(path).read(), path, 'exec'), {'__file__': path, '__name__': '__main__'})
```

### Verification

```sh
npm test
npm run build
npm run test:browser
```

Unit/asset checks cover corrupt or blocked storage, note persistence, pause/resume/background timer behaviour, embedded assets, interaction pivots and decoding every Meshopt buffer with the same decoder used by the site.

The browser acceptance script uses an installed Google Chrome and Puppeteer with an in-process request interceptor serving `dist/`; it does not open an HTTP port. It checks interactions, raycasting, saved notes after reload, timer controls, desktop/mobile layout and console errors. Screenshots go to ignored `artifacts/`. Set `CHROME_PATH` if Chrome is installed elsewhere.

In this execution environment, production builds and all 8 unit/asset tests pass. Live browser verification and a Vite preview could not run because the sandbox rejects launching the test browser and binding local ports. Run the browser command in a normal local terminal to complete visual QA.
