# DAI AI / ضي

Development repository for the DAI AI desktop companion and web app.

## Live web
https://dai-ai-y3325n.v2.appdeploy.ai/

## Layout
- `web/` — React/Vite + AppDeploy backend, auth, chat, research, uploads, settings, and DAI animation.
- `desktop/` — local desktop support/source.
- `shared/` — shared product identity/settings.

## Current UI target
Keep the existing DAI SVG logo centered while the original DaiFace animation remains active. No generated replacement imagery.

## Avatar quality rule
All avatar work follows `docs/DAI_AVATAR_RULEBOOK.md` and the machine-readable contract in `web/src/avatarQualityPolicy.mjs`.

The target is premium AI-companion drawing and animation quality, using products such as Tabi AI only as a quality benchmark while preserving DAI's own identity and avoiding direct copying. Face quality, natural motion, and audio-accurate lip sync take priority over decorative effects.

## Security
Virtual environments, secrets, credentials, model weights, checkpoints, caches, local memory, and logs are intentionally excluded.
