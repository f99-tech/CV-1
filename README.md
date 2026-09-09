# SIGNLOCK

Webcam **rock · paper · scissors** versus a bot. Built for phones.

Play: [https://f99-tech.github.io/CV-1/](https://f99-tech.github.io/CV-1/)

Repo: [f99-tech/CV-1](https://github.com/f99-tech/CV-1)

## GitHub Pages (the playable link)

Use **branch `main` + folder `/docs`**. Do **not** pick `/ (root)`.

1. Open the repo → **Settings** → **Pages**
2. **Source:** Deploy from a branch
3. **Branch:** `main`
4. **Folder:** `/docs`
5. Save

The live URL is:

`https://f99-tech.github.io/CV-1/`

Open it on your phone over HTTPS and allow the camera.

## Play

1. Tap to enter (unlocks audio).
2. Pick best of 3 / 5 / 7 / 9.
3. Allow the camera, palm facing the lens.
4. Tap **Lock in**. On **SHOOT**, hold rock (fist), paper (open palm), or scissors (V).
5. No camera? Use the three throw buttons.

## Vision stack

1. MediaPipe Gesture Recognizer (HaGRID): fist → rock, palm → paper, V → scissors
2. 21-point 3D landmark geometry
3. Temporal majority lock

Video never leaves the device.

## Rebuild Pages files

```bash
npm install
npm run build
```

That writes the static site into `docs/`.
