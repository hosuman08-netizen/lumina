# Lumina — Artistic Collectibles (Web3 demo)

A client-only prototype for a collectible gallery of **fictional, artistic mood pieces**.
Users mint, buy, resell, and reflect on artwork using simulated tokens and wallets.

## What it does
- **Gallery**: browse and buy pieces (primary sales + resale listings).
- **Create**: mint a piece with an optional short mood note (mic) and a co-artist.
- **Drops**: limited editions with persistent, honest stock counts.
- **Collection**: see what you own, its value and living rarity, and list pieces for resale.
- **Journal**: reflect on pieces; reflections nudge a piece's "living rarity".

## Design notes
- **18+ gate**: a real confirmation blocks the app until the visitor confirms they are 18+.
- **Fictional & artistic only**: no real people are depicted; content is mood/atmosphere.
- **Honest numbers**: displayed drop stock equals stored stock — no refresh-to-refill,
  no fake scarcity. Rarity and prices shown match the underlying values.
- **Self-contained**: no external scripts or network calls; everything runs client-side
  with `localStorage`. Wallets and tokens are simulated.

## Tech
- Static HTML/CSS/JS. Deployable to any static host (e.g. GitHub Pages).
- PWA manifest + minimal service worker stub.

## Roadmap (not implemented)
Real wallet connect (WalletConnect), IPFS-hosted media, on-chain drops.
