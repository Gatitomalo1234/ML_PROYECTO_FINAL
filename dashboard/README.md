# Aerospace Intelligence Dashboard (Cinematic)

This folder contains the Next.js + R3F cinematic experience + tactical dashboard front-end.

## Run

```bash
cd dashboard
npm install
npm run dev
```

## Data inputs

Place pipeline exports in `dashboard/public/data/`:

- `model_results.json`
- `master_table.json`

## Optional Earth texture pack (recommended)

If you add Earth texture files, the Earth switches from procedural shading to textured rendering automatically.

Currently supported (what you already added):
- `dashboard/public/textures/earth/Solarsystemscope_texture_8k_earth_daymap (1).jpg`
- `dashboard/public/textures/earth/Solarsystemscope_texture_8k_earth_nightmap.jpg`
- `dashboard/public/textures/earth/Solarsystemscope_texture_8k_earth_clouds.jpg`
- `dashboard/public/textures/earth/earthbump1k.jpg`
- `dashboard/public/textures/earth/earthspec1k.jpg`
- `dashboard/public/textures/earth/Solarsystemscope_texture_8k_stars.jpg`
