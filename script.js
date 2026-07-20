// Lumina — artistic collectibles gallery (demo / prototype)
// Fictional, artistic, 18+. Self-contained: no external scripts, client-only.
let wallet = null;
let edenBalance = 120;
let content = JSON.parse(localStorage.getItem('lumina_content') || '[]');
let codex = JSON.parse(localStorage.getItem('lumina_journal') || '[]');
let drops = JSON.parse(localStorage.getItem('lumina_drops') || '[]');

// Persist remaining drop stock so "N remaining" stays TRUE across refreshes.
// Displayed count === stored count — no refresh-to-refill, no fake scarcity.
function saveDrops() { localStorage.setItem('lumina_drops', JSON.stringify(drops)); }

// ── 18+ age gate ──────────────────────────────────────────────────
// A real gate: the app stays hidden until the user confirms 18+.
function confirmAge() {
  try { localStorage.setItem('lumina_age_ok', '1'); } catch (e) {}
  revealApp();
}

function declineAge() {
  document.body.innerHTML =
    '<div style="max-width:420px;margin:80px auto;padding:24px;text-align:center;' +
    'font-family:system-ui,sans-serif;color:#f5f1e6">' +
    '<h1 style="color:#c5a46e">Come back later</h1>' +
    '<p style="color:#8b6f47">This gallery is for visitors 18 and older.</p></div>';
}

function revealApp() {
  const gate = document.getElementById('age-gate');
  const app = document.getElementById('app');
  if (gate) gate.style.display = 'none';
  if (app) app.hidden = false;
  initApp();
}

function claimStarterTokens() {
  edenBalance += 50;
  updateWalletUI();
  alert('50 demo tokens added to your balance.');
}

function mutateLivingRarity(item) {
  if (!item.surprise) item.surprise = 0.3;
  // Reflecting on a piece nudges its "living rarity" upward.
  const beforeRarity = item.rarity || Math.floor((1 - item.surprise) * 10) + 1;
  const beforeTier = rarityTier(beforeRarity).name;
  const acheBoost = (item.ache || 0.2) * 0.4;
  item.surprise = Math.min(0.99, item.surprise * 1.1 + acheBoost);
  item.rarity = item.rarity || Math.floor((1 - item.surprise) * 10) + 1;
  item.rarity = Math.max(1, Math.floor(item.rarity * (1 + (item.surprise - 0.3) * 0.5)));
  // Transient signal so callers can celebrate a tier promotion. Defined
  // non-enumerable so JSON.stringify never persists it into localStorage.
  const promoted = rarityTier(item.rarity).name !== beforeTier
    ? rarityTier(item.rarity).name : null;
  Object.defineProperty(item, '_tierUp', {
    value: promoted, enumerable: false, configurable: true, writable: true
  });
  return item;
}

// ── Generative artwork ────────────────────────────────────────────
// Every piece renders a unique, deterministic image seeded by its id +
// mood. Same piece → same art, always (no random flicker, honest).
// Purely abstract soft colour fields — fictional, artistic, SFW.
function pieceSeed(item) {
  // Stable 32-bit seed from id + mood values.
  let h = 2166136261 >>> 0;
  const str = String(item.id) + '|' + (item.surprise || 0.3) + '|' + (item.intensity || 0.5);
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
}

// Small seeded PRNG (mulberry32) — deterministic per seed.
function seededRand(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Rarity tier name + class from a numeric rarity (higher = rarer).
// Tiers are honest: derived straight from the piece's stored rarity.
function rarityTier(rarity) {
  const r = rarity || 1;
  if (r >= 12) return { name: 'Mythic', cls: 't-mythic' };
  if (r >= 8)  return { name: 'Radiant', cls: 't-radiant' };
  if (r >= 5)  return { name: 'Rare', cls: '' };
  if (r >= 3)  return { name: 'Fine', cls: '' };
  return { name: 'Study', cls: '' };
}

// Paint a piece into a canvas: layered soft radial fields + a drifting
// horizon line. Warmer/brighter as mood (surprise) rises.
function paintPiece(canvas, item) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const rnd = seededRand(pieceSeed(item));
  const mood = Math.max(0, Math.min(0.99, item.surprise || 0.3));
  const intensity = Math.max(0, Math.min(1, item.intensity || 0.5));

  // Base wash — deep warm ground, hue shifts subtly with mood.
  const baseHue = 24 + rnd() * 26;            // amber → rose range
  const g0 = ctx.createLinearGradient(0, 0, 0, H);
  g0.addColorStop(0, `hsl(${baseHue}, ${18 + mood * 22}%, ${5 + mood * 4}%)`);
  g0.addColorStop(1, `hsl(${baseHue + 8}, ${14 + mood * 16}%, ${3 + mood * 2}%)`);
  ctx.fillStyle = g0;
  ctx.fillRect(0, 0, W, H);

  // Soft light pools — count/warmth scale with mood.
  const pools = 2 + Math.floor(mood * 3);
  for (let i = 0; i < pools; i++) {
    const x = rnd() * W, y = rnd() * H * 0.9;
    const r = (0.18 + rnd() * 0.4) * W * (0.7 + intensity * 0.5);
    const hue = baseHue + (rnd() - 0.5) * 30;
    const light = 45 + mood * 28;
    const alpha = 0.10 + mood * 0.22;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `hsla(${hue}, 70%, ${light}%, ${alpha})`);
    g.addColorStop(1, `hsla(${hue}, 70%, ${light}%, 0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // A single drifting horizon — the "one novel element", gives each
  // piece a spine without clutter.
  const hy = H * (0.42 + rnd() * 0.28);
  const lg = ctx.createLinearGradient(0, hy - 2, 0, hy + 2);
  const glow = `hsla(45, 90%, ${60 + mood * 20}%, ${0.25 + mood * 0.4})`;
  lg.addColorStop(0, 'hsla(45,90%,70%,0)');
  lg.addColorStop(0.5, glow);
  lg.addColorStop(1, 'hsla(45,90%,70%,0)');
  ctx.fillStyle = lg;
  ctx.save();
  ctx.translate(0, (rnd() - 0.5) * 6);
  ctx.fillRect(0, hy - 3, W, 6);
  ctx.restore();

  // Fine grain so it reads as a crafted image, not a flat gradient.
  const grains = 90 + Math.floor(intensity * 90);
  for (let i = 0; i < grains; i++) {
    ctx.fillStyle = `hsla(${baseHue}, 60%, ${70 + rnd() * 20}%, ${0.02 + rnd() * 0.05})`;
    ctx.fillRect(rnd() * W, rnd() * H, 1.2, 1.2);
  }

  // Vignette to frame the eye toward centre.
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}

// Build an <div.art-frame> with a painted canvas + tier ribbon for a piece.
function artFrameHTML(item) {
  const tier = rarityTier(item.rarity);
  return `<div class="art-frame" data-art="${item.id}">
      <canvas width="300" height="200"></canvas>
      <div class="art-tier ${tier.cls}">${tier.name}${item.rarity ? ' · Lv ' + item.rarity : ''}</div>
    </div>`;
}

// After a grid renders, paint every art-frame canvas from its piece.
function paintAllFrames(scope) {
  (scope || document).querySelectorAll('.art-frame[data-art]').forEach(frame => {
    const id = frame.getAttribute('data-art');
    const item = content.find(c => String(c.id) === id)
      || drops.find(d => String(d.id) === id);
    const canvas = frame.querySelector('canvas');
    if (item && canvas) paintPiece(canvas, item);
  });
}

// Self-contained ambient overlay — a soft golden pulse tied to the piece's
// mood value. Tap anywhere to dismiss.
function openEyeOverlay(surprise, title) {
  const s = Math.max(0, Math.min(0.99, surprise || 0.5));
  const overlay = document.createElement('div');
  overlay.className = 'eye-overlay';
  overlay.innerHTML = `
    <div class="eye-stage">
      <canvas width="320" height="200"></canvas>
      <div class="eye-caption">${title ? title + ' — ' : ''}Mood ${s.toFixed(2)}</div>
    </div>`;
  overlay.addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);

  const canvas = overlay.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  let t = 0;
  const draw = () => {
    if (!overlay.isConnected) return;
    ctx.clearRect(0, 0, 320, 200);
    const amp = 0.4 + 0.35 * Math.sin(t / 12);
    const r = 30 + amp * 22 * (0.6 + s * 0.6);
    const g = ctx.createRadialGradient(160, 100, 4, 160, 100, r);
    g.addColorStop(0, '#f5d76e');
    g.addColorStop(1, 'rgba(197,164,110,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(160, 100, r, 0, Math.PI * 2);
    ctx.fill();
    t++;
    if (t < 150) requestAnimationFrame(draw);
    else setTimeout(() => overlay.remove(), 400);
  };
  requestAnimationFrame(draw);
}

function playVoiceEmbodiment(id) {
  const item = content.find(c => c.id === id);
  if (!item) return;
  openEyeOverlay(item.surprise, item.title);
}

function initApp() {
  if (content.length === 0) {
    content = [
      { id: 1, title: "Moonlit Study", desc: "Soft shadows, a quiet mood", intensity: 0.72, price: 18, owner: null, surprise: 0.41 },
      { id: 2, title: "Velvet Evening", desc: "A study in warmth and stillness", intensity: 0.89, price: 45, owner: "0x..ab12", surprise: 0.67 }
    ];
    localStorage.setItem('lumina_content', JSON.stringify(content));
  }

  // Seed limited drops ONCE, then persist remaining stock (no refill exploit).
  if (drops.length === 0) {
    drops = [
      { id: 99, title: "First Light", price: 12, left: 3, total: 3, surprise: 0.81 },
      { id: 100, title: "Nightfall", price: 28, left: 1, total: 1, surprise: 0.55 }
    ];
    saveDrops();
  }

  renderFeed();
  updateWalletUI();
  renderDrops();
}

function updateWalletUI() {
  const info = document.getElementById('wallet-info');
  if (!info) return;
  if (wallet) {
    info.innerHTML = `${wallet.slice(0,6)}... • ${edenBalance} tokens`;
  } else {
    info.innerHTML = `Not connected • ${edenBalance} tokens (demo)`;
  }
}

function connectWallet() {
  // Simulated wallet connect (demo only — no real Web3 calls).
  wallet = '0x' + Math.random().toString(16).slice(2, 10) + '...' + Math.random().toString(16).slice(2, 6);
  updateWalletUI();
  alert('Wallet connected (demo). A real build would use WalletConnect.');
}

function renderFeed() {
  const grid = document.getElementById('content-feed');
  if (!grid) return;
  grid.innerHTML = '';

  // Primary (unowned) first, then resale listings; owned-and-not-listed
  // pieces live in your Collection, not the market feed.
  const marketItems = content.filter(item => !item.owner || item.forSale);

  if (marketItems.length === 0) {
    grid.innerHTML = '<p style="color:var(--dim)">Nothing on the market. Mint in Create, or check Drops.</p>';
    return;
  }

  marketItems.forEach(item => {
    const isResale = !!item.forSale;
    const mine = item.owner === wallet;
    const price = isResale ? item.listPrice : item.price;
    const card = document.createElement('div');
    card.className = `card ${item.surprise > 0.5 ? 'sfu' : ''}`;
    card.innerHTML = `
      ${artFrameHTML(item)}
      <div class="meta">${isResale ? 'RESALE' : 'ART'} • ${item.intensity.toFixed(2)} intensity</div>
      <h3>${item.title}</h3>
      <p>${item.desc}</p>
      <div class="intensity">Mood: ${item.surprise?.toFixed(2) || '0.30'} ${item.rarity ? `· Living Rarity ${item.rarity}` : ''}</div>
      <div class="price">${price} tokens</div>
      ${item.coCreator ? `<div style="font-size:9px;opacity:0.6">Co-artist: ${item.coCreator}</div>` : ''}
      ${isResale ? `<div style="font-size:10px;opacity:0.5">Listed by ${mine ? 'you' : item.seller}</div>` : ''}
      ${mine
        ? `<button class="ghost" disabled style="opacity:0.5;cursor:not-allowed">Your listing</button>`
        : `<button onclick="buyContent(${item.id})" class="primary">${isResale ? 'Buy Resale' : 'Buy'}</button>`}
    `;
    grid.appendChild(card);
  });

  paintAllFrames(grid);
}

function showFeed() {
  hideSections();
  document.getElementById('feed').classList.remove('hidden');
  setActiveNav(0);
}

function showCreate() {
  hideSections();
  document.getElementById('create').classList.remove('hidden');
  setActiveNav(1);
}

function hideSections() {
  document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
}

// Reflect the current view on the nav (consistency + live feedback).
function setActiveNav(index) {
  document.querySelectorAll('.nav-btn').forEach((b, i) => {
    b.classList.toggle('active', i === index);
  });
}

function recordVoice() {
  const preview = document.getElementById('voice-preview');
  preview.innerHTML = 'Recording a short mood note...';

  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    const recorder = new MediaRecorder(stream);
    let chunks = [];
    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);

      // Derive a mood value from recording length (longer = warmer).
      const held = Date.now() - (window._recStart || Date.now());
      let surprise = Math.min(0.9, 0.35 + held / 8000);
      window._p8Ache = Math.min(0.9, held / 8000);

      preview.innerHTML = `<audio controls src="${url}"></audio><br>Mood: ${surprise.toFixed(2)}`;

      window._p8VoiceBlob = blob;
      window._p8Surprise = surprise;

      stream.getTracks().forEach(t => t.stop());
    };
    window._recStart = Date.now();
    recorder.start();
    setTimeout(() => recorder.stop(), 4200); // ~4s
  }).catch(() => {
    preview.innerHTML = 'Mic unavailable — using a default mood note. Mood 0.68';
    window._p8Surprise = 0.68;
  });
}

function createAndMint() {
  const title = document.getElementById('art-title').value || 'Untitled Study';
  const cost = parseInt(document.getElementById('mint-cost').value);
  const intensity = parseFloat(document.getElementById('intensity').value);
  const surprise = window._p8Surprise || 0.45;
  const coCreator = document.getElementById('companion-picker') ? document.getElementById('companion-picker').value : '';
  const ache = window._p8Ache || 0.3;

  if (!wallet) {
    alert('Connect a wallet first.');
    return;
  }
  if (!Number.isFinite(cost) || cost <= 0) {
    alert('Enter a positive token cost.');
    return;
  }
  if (edenBalance < cost) {
    alert('Not enough tokens. Claim demo tokens or sell a piece.');
    return;
  }

  edenBalance -= cost;
  updateWalletUI();

  let rarity = Math.floor((1 - surprise) * 10) + 1;
  rarity = Math.max(1, Math.min(10, rarity));

  const newArt = {
    id: Date.now(),
    title,
    desc: `Mood note • intensity ${intensity.toFixed(2)} • mood ${surprise.toFixed(2)}${coCreator ? ' + ' + coCreator : ''}`,
    intensity,
    price: Math.floor(cost * 0.6),
    owner: wallet,
    surprise,
    rarity,
    coCreator: coCreator || null,
    ache,
    minted: Date.now()
  };

  mutateLivingRarity(newArt);

  content.unshift(newArt);
  localStorage.setItem('lumina_content', JSON.stringify(content));

  alert(`Minted "${title}"! Living Rarity ${newArt.rarity}.`);
  renderFeed();
  hideSections();
  document.getElementById('feed').classList.remove('hidden');
  setActiveNav(0);
}

function buyContent(id) {
  const item = content.find(c => c.id === id);
  if (!item) return;

  const isResale = !!item.forSale;
  if (!isResale && item.owner) return;
  if (isResale && item.owner === wallet) return;

  if (!wallet) {
    alert('Connect a wallet.');
    return;
  }

  const cost = isResale ? item.listPrice : item.price;
  if (edenBalance < cost) {
    alert('Not enough tokens for this piece.');
    return;
  }

  edenBalance -= cost;

  if (isResale) {
    // Resale transfer: buyer takes ownership, seller's proceeds are recorded.
    const paidTitle = item.title;
    const seller = item.seller;
    delete item.forSale;
    delete item.seller;
    item.price = item.listPrice; // last-traded price becomes the new floor
    delete item.listPrice;
    item.owner = wallet;
    recordSellerProceeds(seller, cost, paidTitle);
  } else {
    item.owner = wallet;
  }

  mutateLivingRarity(item);
  const boughtTierUp = item._tierUp;
  localStorage.setItem('lumina_content', JSON.stringify(content));

  updateWalletUI();
  renderFeed();

  setTimeout(() => {
    const tier = rarityTier(item.rarity).name;
    const promo = boughtTierUp ? `It rose to ${boughtTierUp}. ` : '';
    const wantsNote = confirm(
      `Added "${item.title}" to your collection — ${tier} · Lv ${item.rarity}. ${promo}` +
      `Reflecting on a piece in your Journal deepens its living rarity. Add a note now?`);
    if (wantsNote) {
      const note = prompt('Your reflection:', 'The soft light stayed with me.');
      if (note) {
        codex.unshift({ title: item.title, note, surprise: item.surprise, ache: item.ache, time: Date.now() });
        localStorage.setItem('lumina_journal', JSON.stringify(codex));
        mutateLivingRarity(item);
        const reflectTierUp = item._tierUp;
        localStorage.setItem('lumina_content', JSON.stringify(content));
        renderFeed();
        if (reflectTierUp) {
          setTimeout(() => alert(`Your reflection deepened "${item.title}" to ${reflectTierUp}.`), 300);
        }
      }
    }
  }, 800);
}

function renderDrops() {
  const container = document.getElementById('drop-list');
  if (!container) return;
  container.innerHTML = '';

  drops.forEach(drop => {
    const el = document.createElement('div');
    el.className = 'card';
    const soldOut = drop.left <= 0;
    const claimed = (drop.total || 0) - drop.left;
    el.innerHTML = `
      ${artFrameHTML(drop)}
      <div class="meta">LIMITED DROP${drop.total ? ` • ${claimed}/${drop.total} minted` : ''}</div>
      <h3>${drop.title}</h3>
      <div class="price">${drop.price} tokens</div>
      <div class="fomo">${soldOut ? 'SOLD OUT' : `${drop.left} of ${drop.total} remaining`}</div>
      ${soldOut
        ? `<button class="ghost" disabled style="opacity:0.5;cursor:not-allowed">Sold Out</button>`
        : `<button onclick="claimDrop(${drop.id})" class="primary">Claim</button>`}
      <div class="eye-hint">Mood ${drop.surprise}</div>
    `;
    container.appendChild(el);
  });

  paintAllFrames(container);
}

function showDrops() {
  hideSections();
  document.getElementById('drops').classList.remove('hidden');
  setActiveNav(2);
}

function claimDrop(id) {
  const drop = drops.find(d => d.id === id);
  if (!drop) return;
  if (!wallet) { alert('Connect a wallet.'); return; }
  if (drop.left <= 0) { alert('This drop is sold out.'); return; }

  if (edenBalance < drop.price) {
    alert('Not enough tokens for this drop.');
    return;
  }

  edenBalance -= drop.price;
  drop.left--;
  saveDrops();
  updateWalletUI();

  const newNFT = {
    id: Date.now(),
    title: drop.title,
    desc: `Limited drop • mood ${drop.surprise}`,
    intensity: drop.surprise,
    price: Math.round(drop.price * 1.5),
    owner: wallet,
    surprise: drop.surprise,
    minted: Date.now()
  };
  content.unshift(newNFT);
  localStorage.setItem('lumina_content', JSON.stringify(content));

  alert(`Claimed "${drop.title}"!`);
  renderFeed();
  renderDrops();
}

// ── Collection: owned pieces + resale market loop ──────────────────
// Owning means a portfolio you can see, value, and re-list for sale.

function ownedByMe() {
  if (!wallet) return [];
  return content.filter(c => c.owner === wallet);
}

// Seller proceeds ledger (per wallet address). On a single device the seller
// is usually offline, so tokens are escrowed to their address and claimable
// when that wallet reconnects — an honest transfer, not a fake number.
let proceeds = JSON.parse(localStorage.getItem('lumina_proceeds') || '{}');

function recordSellerProceeds(seller, amount, title) {
  if (!seller || !amount) return;
  proceeds[seller] = (proceeds[seller] || 0) + amount;
  localStorage.setItem('lumina_proceeds', JSON.stringify(proceeds));
  if (seller === wallet) claimProceeds(true);
}

function claimProceeds(silent) {
  if (!wallet) return;
  const owed = proceeds[wallet] || 0;
  if (owed <= 0) { if (!silent) alert('No resale proceeds to claim.'); return; }
  edenBalance += owed;
  proceeds[wallet] = 0;
  localStorage.setItem('lumina_proceeds', JSON.stringify(proceeds));
  updateWalletUI();
  renderVault();
  if (!silent) alert(`Claimed ${owed} tokens in resale proceeds.`);
}

function showVault() {
  hideSections();
  document.getElementById('vault').classList.remove('hidden');
  setActiveNav(3);
  renderVault();
}

function renderVault() {
  const summary = document.getElementById('vault-summary');
  const list = document.getElementById('vault-list');
  if (!summary || !list) return;

  if (!wallet) {
    summary.innerHTML = '<p style="color:var(--dim)">Connect your wallet to see the pieces you own.</p>';
    list.innerHTML = '';
    return;
  }

  const mine = ownedByMe();
  const totalValue = mine.reduce((s, c) => s + (c.price || 0), 0);
  const totalRarity = mine.reduce((s, c) => s + (c.rarity || 0), 0);
  const listedCount = mine.filter(c => c.forSale).length;
  const owed = proceeds[wallet] || 0;

  summary.innerHTML = `
    <div class="vault-stat"><span>${mine.length}</span><label>owned</label></div>
    <div class="vault-stat"><span>${totalValue}</span><label>token value</label></div>
    <div class="vault-stat"><span>${totalRarity}</span><label>living rarity</label></div>
    <div class="vault-stat"><span>${listedCount}</span><label>listed</label></div>
    ${owed > 0 ? `<button onclick="claimProceeds(false)" class="primary" style="grid-column:1/-1;margin-top:8px">Claim ${owed} tokens resale proceeds</button>` : ''}`;

  if (mine.length === 0) {
    list.innerHTML = '<p style="color:var(--dim)">You own nothing yet. Buy from the Gallery or claim a Drop.</p>';
    return;
  }

  list.innerHTML = '<p class="vault-hint">Add a reflection in your Journal to deepen a piece’s living rarity.</p>';
  mine.forEach(item => {
    const card = document.createElement('div');
    card.className = `card ${item.surprise > 0.5 ? 'sfu' : ''}`;
    card.innerHTML = `
      ${artFrameHTML(item)}
      <div class="meta">OWNED${item.coCreator ? ' • co-artist ' + item.coCreator : ''}</div>
      <h3>${item.title}</h3>
      <div class="intensity">Mood ${item.surprise?.toFixed(2) || '0.30'}${item.rarity ? ` · Living Rarity ${item.rarity}` : ''}</div>
      <div class="price">${item.price} tokens${item.forSale ? ` · LISTED @ ${item.listPrice}` : ''}</div>
      <button onclick="playVoiceEmbodiment(${item.id})" class="ghost">View Ambient</button>
      ${item.forSale
        ? `<button onclick="delistContent(${item.id})" class="ghost">Cancel Listing</button>`
        : `<button onclick="listContent(${item.id})" class="primary">List for Resale</button>`}
    `;
    list.appendChild(card);
  });

  paintAllFrames(list);
}

function listContent(id) {
  const item = content.find(c => c.id === id);
  if (!item || item.owner !== wallet) return;
  const suggested = Math.max(1, Math.round((item.price || item.listPrice || 10) * 1.3));
  const raw = prompt(`List "${item.title}" for resale.\nAsking price in tokens:`, String(suggested));
  if (raw === null) return;
  const ask = parseInt(raw, 10);
  if (!Number.isFinite(ask) || ask <= 0) { alert('Enter a positive token price.'); return; }
  item.forSale = true;
  item.listPrice = ask;
  item.seller = wallet;
  localStorage.setItem('lumina_content', JSON.stringify(content));
  renderVault();
  renderFeed();
  alert(`"${item.title}" is now on the market for ${ask} tokens.`);
}

function delistContent(id) {
  const item = content.find(c => c.id === id);
  if (!item || item.owner !== wallet) return;
  delete item.forSale;
  delete item.listPrice;
  delete item.seller;
  localStorage.setItem('lumina_content', JSON.stringify(content));
  renderVault();
  renderFeed();
}

function showCodex() {
  hideSections();
  const sec = document.getElementById('codex');
  sec.classList.remove('hidden');
  setActiveNav(4);

  const list = document.getElementById('codex-list');
  list.innerHTML = '';

  if (codex.length === 0) {
    list.innerHTML = '<p>Collect a piece and add a reflection. Your notes live here.</p>';
    return;
  }

  codex.forEach(entry => {
    const el = document.createElement('div');
    el.className = 'codex-entry';
    el.innerHTML = `<strong>${entry.title}</strong><br>${entry.note}<br><small>mood ${entry.surprise} • ${new Date(entry.time).toLocaleDateString()}</small>`;
    list.appendChild(el);
  });
}

function reflect() {
  const note = prompt('What did this piece bring up for you?');
  if (note) {
    const last = codex[0];
    codex.unshift({ title: 'Reflection', note, surprise: 0.5, time: Date.now() });
    localStorage.setItem('lumina_journal', JSON.stringify(codex));
    const owned = content.find(c => c.owner && c.title === (last && last.title));
    if (owned) mutateLivingRarity(owned);
    showCodex();
    renderFeed();
  }
}

// On load: show the age gate, or skip straight to the app if already confirmed.
window.onload = function () {
  let ok = false;
  try { ok = localStorage.getItem('lumina_age_ok') === '1'; } catch (e) {}
  if (ok) revealApp();
  // Otherwise the age gate stays visible (default markup) until confirmed.
};
