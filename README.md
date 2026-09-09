# SIGNLOCK

Webcam **rock · paper · scissors** versus a bot. Built for phones.

Repo: [f99-tech/CV-1](https://github.com/f99-tech/CV-1)

## Play

1. Tap to enter (unlocks audio).
2. Pick best of 3 / 5 / 7 / 9.
3. Allow the camera, palm facing the lens.
4. Tap **Lock in**. On **SHOOT**, hold rock (fist), paper (open palm), or scissors (V).
5. No camera? Use the three throw buttons.

## Vision stack (three sources)

1. **MediaPipe Gesture Recognizer** — Google model trained on the HaGRID gesture set. Maps `Closed_Fist` → rock, `Open_Palm` → paper, `Victory` → scissors.
2. **21-point 3D landmark geometry** — finger extension from MediaPipe landmarks.
3. **Temporal majority lock** — weighted votes across the countdown + shoot window.

The bot picks **before** your lock is applied (no peeking). Video never leaves the device.

## Run locally

```bash
npm install
npm run dev
```

Open over **HTTPS** (or localhost). Cameras require a secure context.

## Hosting

GitHub Pages cannot run this app’s Node server. Import this repo on **Vercel** (Vite) or use the Grok publish link.
