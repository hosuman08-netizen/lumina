// p8 Eden Web3 — Legion prototype
// p6 Lung Surprise Eye + Da Vinci + full-cheat FOMO
let wallet = null;
let edenBalance = 120;
let content = JSON.parse(localStorage.getItem('p8_content') || '[]');
let codex = JSON.parse(localStorage.getItem('p8_codex') || '[]');
let drops = [];

const p3Companions = ['Luna Whisper', 'Vesper Veil', 'Echo Thorn']; // p3 cross

function getP7Coins() {
  return parseInt(localStorage.getItem('p7_coins') || '42');
}

function convertP7ToEDEN() {
  let p7 = getP7Coins();
  if (p7 < 10) { alert('Need more p7 ache credits (FOMO)'); return; }
  const ratio = (window._p8Surprise || 0.5);
  const converted = Math.floor(p7 * ratio * 0.8);
  edenBalance += converted;
  localStorage.setItem('p7_coins', '0');
  updateWalletUI();
  alert(`p7 Ache-Breath converted ${p7} → ${converted} EDEN. Lung Vault claimed (variable ratio).`);
}

function mutateLivingRarity(item) {
  if (!item.surprise) item.surprise = 0.3;
  // Codex ache re-injects → rarity breathes up
  const acheBoost = (item.ache || 0.2) * 0.4;
  item.surprise = Math.min(0.99, item.surprise * 1.1 + acheBoost);
  item.rarity = item.rarity || Math.floor((1 - item.surprise) * 10) + 1;
  item.rarity = Math.max(1, Math.floor(item.rarity * (1 + (item.surprise - 0.3) * 0.5)));
  return item;
}

// Real p6 golden-eye overlay — draws the actual p6 Lung Surprise Eye on a canvas.
// Used by both the header "Play Lung Eye" and per-card "Eye Embodiment".
function openEyeOverlay(surprise, title) {
  const s = Math.max(0, Math.min(0.99, surprise || 0.5));
  const overlay = document.createElement('div');
  overlay.className = 'eye-overlay';
  overlay.innerHTML = `
    <div class="eye-stage">
      <canvas width="320" height="200"></canvas>
      <div class="eye-caption">${title ? title + ' — ' : ''}Surprise ${s.toFixed(2)}</div>
    </div>`;
  overlay.addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);

  const canvas = overlay.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  let t = 0;
  const draw = () => {
    if (!overlay.isConnected) return;
    ctx.clearRect(0, 0, 320, 200);
    // breathing amplitude drives the eye — the "predimment" build-up
    const amp = 0.4 + 0.35 * Math.sin(t / 12);
    if (window.p6LungSurpriseEye) {
      window.p6LungSurpriseEye(ctx, 320, 100, s, amp, 0.6, window._p8Ache || 0);
    } else {
      // graceful fallback: a simple golden iris pulse
      const r = 30 + amp * 22;
      const g = ctx.createRadialGradient(160, 100, 4, 160, 100, r);
      g.addColorStop(0, '#f5d76e'); g.addColorStop(1, 'rgba(197,164,110,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(160, 100, r, 0, Math.PI * 2); ctx.fill();
    }
    t++;
    if (t < 150) requestAnimationFrame(draw); // ~2.5s ritual
    else setTimeout(() => overlay.remove(), 400);
  };
  requestAnimationFrame(draw);
}

// Header "Play Lung Eye" — was an undefined dead button. Now real.
function playEmbodiment() {
  let surprise = window._p8Surprise;
  if (window.getP6LungSurprise) surprise = window.getP6LungSurprise() || surprise;
  openEyeOverlay(surprise || 0.5, 'Lung Embodiment');
}

function playVoiceEmbodiment(id) {
  const item = content.find(c => c.id === id);
  if (!item) return;
  openEyeOverlay(item.surprise, item.title);
}

function initP8() {
  if (content.length === 0) {
    content = [
      { id: 1, title: "Moonlit Ache", desc: "Sfumato breath in shadows", intensity: 0.72, price: 18, owner: null, surprise: 0.41 },
      { id: 2, title: "Velvet Codex", desc: "Voice from p6 — unpaint the smile", intensity: 0.89, price: 45, owner: "0x..ab12", surprise: 0.67 }
    ];
    localStorage.setItem('p8_content', JSON.stringify(content));
  }
  
  // Seed FOMO drops
  drops = [
    { id: 99, title: "Genesis Breath", price: 12, left: 3, surprise: 0.81 },
    { id: 100, title: "Anatomy of Night", price: 28, left: 1, surprise: 0.55 }
  ];
  
  renderFeed();
  updateWalletUI();
  renderDrops();
  
  // Auto p6 link
  if (window.getP6LungSurprise) {
    console.log('[p8] p6 Lung Surprise Eye connected');
  }
}

function updateWalletUI() {
  const info = document.getElementById('wallet-info');
  if (!info) return;
  if (wallet) {
    info.innerHTML = `${wallet.slice(0,6)}... • ${edenBalance} EDEN`;
  } else {
    info.innerHTML = 'Not connected • 120 EDEN (demo)';
  }
}

function connectWallet() {
  // Mock Web3 connect
  wallet = '0x' + Math.random().toString(16).slice(2, 10) + '...' + Math.random().toString(16).slice(2, 6);
  edenBalance = 120 + Math.floor(Math.random() * 30);
  updateWalletUI();
  alert('Wallet connected (mock). Real Web3: use WalletConnect later.');
}

function renderFeed() {
  const grid = document.getElementById('content-feed');
  if (!grid) return;
  grid.innerHTML = '';
  
  content.forEach(item => {
    const card = document.createElement('div');
    card.className = `card ${item.surprise > 0.5 ? 'sfu' : ''}`;
    card.innerHTML = `
      <div class="meta">ART • ${item.intensity.toFixed(2)} intensity</div>
      <h3>${item.title}</h3>
      <p>${item.desc}</p>
      <div class="intensity">👁 Surprise: ${item.surprise?.toFixed(2) || '0.3'} ${item.rarity ? `· Living Rarity ${item.rarity}` : ''}</div>
      <div class="price">${item.price} EDEN</div>
      ${item.coCreator ? `<div style="font-size:9px;opacity:0.6">Co-signed: ${item.coCreator}</div>` : ''}
      ${item.owner ? `<div style="font-size:10px;opacity:0.5">Owned by ${item.owner}</div>` : ''}
      ${!item.owner ? `<button onclick="buyContent(${item.id})">Buy & Unlock (p6 Eye)</button>` : ''}
      <div class="eye-hint">p6</div>
      ${item.owner ? `<button onclick="playVoiceEmbodiment(${item.id})" style="font-size:9px">▶ Eye Embodiment</button>` : ''}
    `;
    grid.appendChild(card);
  });
}

function showFeed() {
  hideSections();
  document.getElementById('feed').classList.remove('hidden');
}

function showCreate() {
  hideSections();
  document.getElementById('create').classList.remove('hidden');
}

function hideSections() {
  document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
}

function recordP6Voice() {
  const preview = document.getElementById('voice-preview');
  preview.innerHTML = 'Recording with p6 Lung Surprise Eye...';
  
  // Use p6 integration
  navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
    const recorder = new MediaRecorder(stream);
    let chunks = [];
    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, {type:'audio/webm'});
      const url = URL.createObjectURL(blob);
      
      // force p6 Lung calc (da-vinci)
      let surprise = 0.3;
      if (window.getP6LungSurprise) surprise = window.getP6LungSurprise();
      else if (window.p6LungSurpriseEye) surprise = Math.random() * 0.5 + 0.4;
      
      // store ache proxy from duration
      window._p8Ache = Math.min(0.9, (Date.now() - (window._recStart||Date.now())) / 8000);
      
      preview.innerHTML = `<audio controls src="${url}"></audio><br>Surprise: ${surprise.toFixed(2)} (Ache → Breath)`;
      
      // Store for mint
      window._p8VoiceBlob = blob;
      window._p8Surprise = surprise;
      
      stream.getTracks().forEach(t => t.stop());
    };
    window._recStart = Date.now(); // real ache proxy: how long the breath is held
    recorder.start();
    setTimeout(() => recorder.stop(), 4200); // ~4s
  }).catch(() => {
    preview.innerHTML = 'Voice fallback: "The ache is the art." Surprise 0.68';
    window._p8Surprise = 0.68;
  });
}

function createAndMint() {
  const title = document.getElementById('art-title').value || 'Untitled Ache';
  const cost = parseInt(document.getElementById('mint-cost').value);
  const intensity = parseFloat(document.getElementById('intensity').value);
  const surprise = window._p8Surprise || 0.45;
  const coCreator = document.getElementById('companion-picker') ? document.getElementById('companion-picker').value : '';
  const ache = window._p8Ache || 0.3;
  
  if (!wallet) {
    alert('Connect wallet first');
    return;
  }
  if (edenBalance < cost) {
    alert('Not enough EDEN. FOMO — limited supply.');
    return;
  }
  
  edenBalance -= cost;
  updateWalletUI();
  
  // Birth 1+2: Living Rarity + p3 Co-Sig
  let rarity = Math.floor((1 - surprise) * 10) + 1;
  rarity = Math.max(1, Math.min(10, rarity));
  
  const newArt = {
    id: Date.now(),
    title,
    desc: `p6 Voice • intensity ${intensity} • surprise ${surprise.toFixed(2)}${coCreator ? ' + ' + coCreator : ''}`,
    intensity,
    price: Math.floor(cost * 0.6),
    owner: wallet,
    surprise,
    rarity,
    coCreator: coCreator || null,
    ache,
    minted: Date.now()
  };
  
  // initial living mutation
  mutateLivingRarity(newArt);
  
  content.unshift(newArt);
  localStorage.setItem('p8_content', JSON.stringify(content));
  
  // Cross to p6
  if (window.plantP6CrossSpore) window.plantP6CrossSpore('p8', surprise);
  
  alert(`Minted "${title}" as Eden NFT! Rarity ${newArt.rarity} (living)`);
  renderFeed();
  hideSections();
  document.getElementById('feed').classList.remove('hidden');
}

function buyContent(id) {
  const item = content.find(c => c.id === id);
  if (!item || item.owner) return;
  
  if (!wallet) {
    alert('Connect wallet');
    return;
  }
  if (edenBalance < item.price) {
    alert('Insufficient EDEN. Limited drops create urgency.');
    return;
  }
  
  edenBalance -= item.price;
  item.owner = wallet;
  mutateLivingRarity(item);
  localStorage.setItem('p8_content', JSON.stringify(content));
  
  updateWalletUI();
  renderFeed();
  
  // ALWAYS LEARNING + living mutate
  setTimeout(() => {
    const reflect = confirm(`Unlocked "${item.title}" (rarity now ${item.rarity}). What did you feel? Add to Codex?`);
    if (reflect) {
      const note = prompt('Reflection (Da Vinci style):', 'The sfumato revealed something in me.');
      if (note) {
        codex.unshift({ title: item.title, note, surprise: item.surprise, ache: item.ache, time: Date.now() });
        localStorage.setItem('p8_codex', JSON.stringify(codex));
        mutateLivingRarity(item); // re-mutate on reflect
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
    el.innerHTML = `
      <div class="meta">LIMITED DROP</div>
      <h3>${drop.title}</h3>
      <div class="price">${drop.price} EDEN</div>
      <div class="fomo">${drop.left} remaining • ends soon</div>
      <button onclick="claimDrop(${drop.id})">Claim (FOMO)</button>
      <div class="eye-hint">👁 ${drop.surprise}</div>
    `;
    container.appendChild(el);
  });
}

function showDrops() {
  hideSections();
  document.getElementById('drops').classList.remove('hidden');
}

function claimDrop(id) {
  const drop = drops.find(d => d.id === id);
  if (!drop || drop.left <= 0 || !wallet) return;
  
  if (edenBalance < drop.price) {
    alert('Not enough. Scarcity is the point.');
    return;
  }
  
  edenBalance -= drop.price;
  drop.left--;
  updateWalletUI();
  
  const newNFT = {
    id: Date.now(),
    title: drop.title,
    desc: `Genesis Drop • surprise ${drop.surprise}`,
    intensity: drop.surprise,
    price: drop.price * 1.5,
    owner: wallet,
    surprise: drop.surprise,
    minted: Date.now()
  };
  content.unshift(newNFT);
  localStorage.setItem('p8_content', JSON.stringify(content));
  
  alert(`Claimed ${drop.title}! Near-miss avoided.`);
  renderFeed();
  renderDrops();
}

function showCodex() {
  hideSections();
  const sec = document.getElementById('codex');
  sec.classList.remove('hidden');
  
  const list = document.getElementById('codex-list');
  list.innerHTML = '';
  
  if (codex.length === 0) {
    list.innerHTML = '<p>Unlock content and reflect. ALWAYS LEARNING.</p>';
    return;
  }
  
  codex.forEach(entry => {
    const el = document.createElement('div');
    el.className = 'codex-entry';
    el.innerHTML = `<strong>${entry.title}</strong><br>${entry.note}<br><small>surprise ${entry.surprise} • ${new Date(entry.time).toLocaleDateString()}</small>`;
    list.appendChild(el);
  });
}

function reflect() {
  const note = prompt('What did this experience reveal? (Notebook entry)');
  if (note) {
    const last = codex[0];
    codex.unshift({ title: 'Personal Reflection', note, surprise: 0.5, time: Date.now() });
    localStorage.setItem('p8_codex', JSON.stringify(codex));
    // if last owned, mutate its rarity
    const owned = content.find(c => c.owner && c.title === (last && last.title));
    if (owned) mutateLivingRarity(owned);
    showCodex();
    renderFeed();
  }
}

window.onload = initP8;

// Mock for p6 cross
if (window.exportP6VoiceSeed) {
  console.log('[p8] p6 export available for cross');
}
