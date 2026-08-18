const WORLD_KEY = 'evolution-worlds-v1';
const CHUNK_SIZE = 1200;
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const menuScreen = document.getElementById('menuScreen');
const gameScreen = document.getElementById('gameScreen');
const worldForm = document.getElementById('worldForm');
const planetNameInput = document.getElementById('planetName');
const dietSelect = document.getElementById('diet');
const savedWorlds = document.getElementById('savedWorlds');
const planetLabel = document.getElementById('planetLabel');
const dietLabel = document.getElementById('dietLabel');
const worldCounter = document.getElementById('worldCounter');
const messageBox = document.getElementById('messageBox');
const matingCallBtn = document.getElementById('matingCallBtn');
const evolutionHub = document.getElementById('evolutionHub');
const closeHubBtn = document.getElementById('closeHubBtn');
const newWorldBtn = document.getElementById('newWorldBtn');

const DIETS = {
  carnivore: { label: 'Carnivore', accent: '#ff8a65', boost: 1.12, prey: 'meat' },
  herbivore: { label: 'Herbivore', accent: '#8af7a7', boost: 1.0, prey: 'plants' },
  omnivore: { label: 'Omnivore', accent: '#f7d66d', boost: 1.08, prey: 'mixed' },
};

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  if (worldState.player) {
    worldState.player.worldY = Math.max(30, Math.min(canvas.height - 30, worldState.player.worldY));
  }
}

const worldState = {
  active: null,
  worlds: loadWorlds(),
  intro: 0,
  player: null,
  chunks: new Map(),
  cameraX: 0,
  cameraY: 0,
  battleTimer: 0,
  keys: {},
  rafId: null,
};

function loadWorlds() {
  try {
    const raw = localStorage.getItem(WORLD_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
}

function saveWorlds() {
  localStorage.setItem(WORLD_KEY, JSON.stringify(worldState.worlds));
}

function randomFromSeed(seed) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function generateChunk(chunkX, chunkY) {
  const prey = [];
  const vegetation = [];
  const enemies = [];
  const startX = chunkX * CHUNK_SIZE;
  const startY = chunkY * CHUNK_SIZE;

  for (let i = 0; i < 16; i += 1) {
    const seed = chunkX * 1000 + chunkY * 200 + i;
    const xMin = startX;
    const xMax = startX + CHUNK_SIZE;
    const yMin = startY;
    const yMax = startY + CHUNK_SIZE;
    prey.push({
      x: xMin + 60 + randomFromSeed(seed) * (CHUNK_SIZE - 120),
      y: yMin + 40 + randomFromSeed(seed + 42) * (CHUNK_SIZE - 140),
      radius: 8 + randomFromSeed(seed + 91) * 14,
      color: `hsl(${150 + randomFromSeed(seed + 12) * 60}, 75%, ${55 + randomFromSeed(seed + 30) * 20}%)`,
      vx: (randomFromSeed(seed + 22) - 0.5) * 30,
      vy: (randomFromSeed(seed + 31) - 0.5) * 25,
      kind: randomFromSeed(seed + 50) > 0.5 ? 'fish' : 'shrimp',
      xMin,
      xMax,
      yMin,
      yMax,
    });
  }

  for (let i = 0; i < 18; i += 1) {
    const seed = chunkX * 500 + chunkY * 150 + i + 300;
    const xMin = startX;
    const xMax = startX + CHUNK_SIZE;
    const yMin = startY;
    const yMax = startY + CHUNK_SIZE;
    vegetation.push({
      x: xMin + 30 + randomFromSeed(seed) * (CHUNK_SIZE - 60),
      y: yMin + 50 + randomFromSeed(seed + 14) * (CHUNK_SIZE - 100),
      radius: 8 + randomFromSeed(seed + 20) * 12,
      color: `hsl(${80 + randomFromSeed(seed + 40) * 35}, 75%, ${55 + randomFromSeed(seed + 55) * 12}%)`,
      xMin,
      xMax,
      yMin,
      yMax,
    });
  }

  for (let i = 0; i < 5; i += 1) {
    const seed = chunkX * 800 + chunkY * 300 + i + 600;
    const xMin = startX;
    const xMax = startX + CHUNK_SIZE;
    const yMin = startY;
    const yMax = startY + CHUNK_SIZE;
    enemies.push({
      x: xMin + 180 + randomFromSeed(seed) * (CHUNK_SIZE - 280),
      y: yMin + 80 + randomFromSeed(seed + 18) * (CHUNK_SIZE - 180),
      radius: 20 + randomFromSeed(seed + 25) * 22,
      color: '#f85f6a',
      vx: (randomFromSeed(seed + 40) - 0.5) * 50,
      vy: (randomFromSeed(seed + 57) - 0.5) * 40,
      type: 'hunter',
      xMin,
      xMax,
      yMin,
      yMax,
    });
  }

  const backgroundCreatures = [];
  for (let i = 0; i < 3; i += 1) {
    const seed = chunkX * 2000 + chunkY * 500 + i + 800;
    const xMin = startX;
    const xMax = startX + CHUNK_SIZE;
    const yMin = startY;
    const yMax = startY + CHUNK_SIZE;
    backgroundCreatures.push({
      x: xMin + 100 + randomFromSeed(seed) * (CHUNK_SIZE - 200),
      y: yMin + 100 + randomFromSeed(seed + 33) * (CHUNK_SIZE - 200),
      radius: 50 + randomFromSeed(seed + 44) * 70,
      color: `hsl(${280 + randomFromSeed(seed + 55) * 40}, 55%, ${30 + randomFromSeed(seed + 66) * 15}%)`,
      vx: (randomFromSeed(seed + 77) - 0.5) * 15,
      vy: (randomFromSeed(seed + 88) - 0.5) * 12,
      xMin,
      xMax,
      yMin,
      yMax,
    });
  }

  return { prey, vegetation, enemies, backgroundCreatures };
}

function ensureChunksLoaded() {
  const leftIndex = Math.floor((worldState.cameraX - 300) / CHUNK_SIZE);
  const rightIndex = Math.floor((worldState.cameraX + canvas.width + 300) / CHUNK_SIZE);
  const topIndex = Math.floor((worldState.cameraY - 300) / CHUNK_SIZE);
  const bottomIndex = Math.floor((worldState.cameraY + canvas.height + 300) / CHUNK_SIZE);

  for (let x = leftIndex; x <= rightIndex; x += 1) {
    for (let y = topIndex; y <= bottomIndex; y += 1) {
      const key = `${x},${y}`;
      if (!worldState.chunks.has(key)) {
        const chunk = generateChunk(x, y);
        worldState.chunks.set(key, chunk);
      }
    }
  }

  for (const [key] of worldState.chunks) {
    const [x, y] = key.split(',').map(Number);
    if (x < leftIndex - 1 || x > rightIndex + 1 || y < topIndex - 1 || y > bottomIndex + 1) {
      worldState.chunks.delete(key);
    }
  }
}

function getAllObjectsFromChunks() {
  const prey = [];
  const vegetation = [];
  const enemies = [];
  const backgroundCreatures = [];

  for (const chunk of worldState.chunks.values()) {
    prey.push(...chunk.prey);
    vegetation.push(...chunk.vegetation);
    enemies.push(...chunk.enemies);
    backgroundCreatures.push(...chunk.backgroundCreatures);
  }

  return { prey, vegetation, enemies, backgroundCreatures };
}

function renderWorldList() {
  savedWorlds.innerHTML = '';

  if (!worldState.worlds.length) {
    savedWorlds.innerHTML = '<p>No worlds yet. Build one and begin your species story.</p>';
    return;
  }

  worldState.worlds.forEach((world) => {
    const card = document.createElement('div');
    card.className = 'world-card';
    card.innerHTML = `
      <div>
        <strong>${world.name}</strong>
        <small>${DIETS[world.diet].label} • ${world.age || 'new'} species</small>
      </div>
      <button type="button">Enter</button>
    `;
    card.querySelector('button').addEventListener('click', () => {
      startWorld(world);
    });
    savedWorlds.appendChild(card);
  });
}

function resetForm() {
  planetNameInput.value = '';
  dietSelect.value = 'carnivore';
}

function createWorldFromForm(event) {
  event.preventDefault();
  const name = planetNameInput.value.trim();
  const diet = dietSelect.value;

  if (!name) {
    messageBox.textContent = 'Give your planet a name before you start.';
    return;
  }

  const world = {
    id: Date.now().toString(),
    name,
    diet,
    age: 'young',
    mutations: { speed: 0, strength: 0, tank: 0 },
    createdAt: new Date().toISOString(),
  };

  worldState.worlds.unshift(world);
  saveWorlds();
  renderWorldList();
  startWorld(world);
}

function startWorld(world) {
  worldState.active = world;
  menuScreen.classList.add('hidden');
  menuScreen.classList.remove('visible');
  gameScreen.classList.remove('hidden');
  gameScreen.classList.add('visible');

  planetLabel.textContent = world.name;
  dietLabel.textContent = DIETS[world.diet].label;
  worldCounter.textContent = String(worldState.worlds.length);
  messageBox.textContent = `Welcome to ${world.name}. The ocean is waiting...`;

  initializeWorld(world);
}

function initializeWorld(world) {
  resizeCanvas();
  worldState.intro = 0;
  worldState.battleTimer = 0;
  worldState.chunks.clear();
  worldState.cameraX = 0;
  worldState.cameraY = 0;

  const player = {
    worldX: 500,
    worldY: canvas.height * 0.6,
    radius: 16,
    color: DIETS[world.diet].accent,
    diet: world.diet,
    speed: 230,
    health: 100,
    energy: 100,
    level: 1,
    growth: 0,
    name: world.name,
    targetSize: 16,
  };

  worldState.player = player;
  worldState.cameraX = player.worldX - canvas.width * 0.35;
  worldState.cameraY = player.worldY - canvas.height * 0.45;
  ensureChunksLoaded();

  if (worldState.rafId) {
    cancelAnimationFrame(worldState.rafId);
  }
  worldState.rafId = requestAnimationFrame(gameLoop);
}

function gameLoop() {
  update();
  render();
  worldState.rafId = requestAnimationFrame(gameLoop);
}

function update() {
  if (!worldState.player) {
    return;
  }

  const player = worldState.player;

  if (worldState.intro < 3) {
    worldState.intro += 1 / 60;
    if (worldState.intro < 1.3) {
      messageBox.textContent = 'A tiny asteroid falls from the sky...';
    } else if (worldState.intro < 2.2) {
      messageBox.textContent = 'The rock cracks open and reveals your first cell.';
    } else {
      messageBox.textContent = 'Swim. Eat smaller creatures. Avoid the larger ones.';
    }
  } else {
    updatePlayerMovement(player);
    updateWorldEntities();
    ensureChunksLoaded();
    checkCollisions();
    updateBattleState();
    updateHud();
  }
}

function updateWorldEntities() {
  for (const chunk of worldState.chunks.values()) {
    chunk.prey.forEach((creature) => {
      creature.x += creature.vx * (1 / 60);
      creature.y += creature.vy * (1 / 60);

      if (creature.x < creature.xMin || creature.x > creature.xMax) creature.vx *= -1;
      if (creature.y < creature.yMin || creature.y > creature.yMax) creature.vy *= -1;
    });

    chunk.enemies.forEach((enemy) => {
      enemy.x += enemy.vx * (1 / 60);
      enemy.y += enemy.vy * (1 / 60);

      if (enemy.x < enemy.xMin || enemy.x > enemy.xMax) enemy.vx *= -1;
      if (enemy.y < enemy.yMin || enemy.y > enemy.yMax) enemy.vy *= -1;
    });

    chunk.backgroundCreatures.forEach((bgCreature) => {
      bgCreature.x += bgCreature.vx * (1 / 60);
      bgCreature.y += bgCreature.vy * (1 / 60);

      if (bgCreature.x < bgCreature.xMin || bgCreature.x > bgCreature.xMax) bgCreature.vx *= -1;
      if (bgCreature.y < bgCreature.yMin || bgCreature.y > bgCreature.yMax) bgCreature.vy *= -1;
    });

    chunk.vegetation.forEach((plant) => {
      plant.y += Math.sin((plant.x + plant.y) * 0.04 + Date.now() * 0.002) * 0.22;
    });
  }
}

function updatePlayerMovement(player) {
  const left = worldState.keys.ArrowLeft || worldState.keys.a || worldState.keys.A;
  const right = worldState.keys.ArrowRight || worldState.keys.d || worldState.keys.D;
  const up = worldState.keys.ArrowUp || worldState.keys.w || worldState.keys.W;
  const down = worldState.keys.ArrowDown || worldState.keys.s || worldState.keys.S;

  const dx = (right ? 1 : 0) - (left ? 1 : 0);
  const dy = (down ? 1 : 0) - (up ? 1 : 0);
  const length = Math.hypot(dx, dy) || 1;

  const baseSpeed = player.speed + (worldState.active.mutations.speed || 0) * 22;
  const nx = dx / length;
  const ny = dy / length;

  player.worldX += nx * baseSpeed * (1 / 60);
  player.worldY += ny * baseSpeed * (1 / 60);

  player.worldY = Math.max(-100000, Math.min(100000, player.worldY));
  player.worldX = Math.max(-100000, Math.min(100000, player.worldX));
  worldState.cameraX = player.worldX - canvas.width * 0.35;
  worldState.cameraY = player.worldY - canvas.height * 0.45;
}

function checkCollisions() {
  const player = worldState.player;
  const { prey, vegetation, enemies } = getAllObjectsFromChunks();

  for (let i = prey.length - 1; i >= 0; i -= 1) {
    const creature = prey[i];
    const distance = Math.hypot(player.worldX - creature.x, player.worldY - creature.y);

    if (distance <= player.radius + creature.radius + 2) {
      const canEat = player.radius > creature.radius * 1.2 || player.level > 1;
      if (canEat && (player.diet === 'carnivore' || player.diet === 'omnivore')) {
        player.radius += 0.15;
        player.energy = Math.min(100, player.energy + 10);
        player.growth += 1;
        if (player.growth >= 10) {
          player.level += 1;
          player.growth = 0;
          messageBox.textContent = `${worldState.active.name} evolves to a larger form.`;
        }
        creature.x = -99999;
      }
    }
  }

  for (let i = vegetation.length - 1; i >= 0; i -= 1) {
    const plant = vegetation[i];
    const distance = Math.hypot(player.worldX - plant.x, player.worldY - plant.y);

    if (distance <= player.radius + plant.radius + 4) {
      if (player.diet === 'herbivore' || player.diet === 'omnivore') {
        player.energy = Math.min(100, player.energy + 20);
        messageBox.textContent = 'A patch of floating vegetation is a tasty meal.';
        plant.x = -99999;
      }
    }
  }

  for (const enemy of enemies) {
    const distance = Math.hypot(player.worldX - enemy.x, player.worldY - enemy.y);
    if (distance <= player.radius + enemy.radius) {
      if (player.radius > enemy.radius * 1.15) {
        player.radius += 0.1;
        enemy.x = enemy.x + 300;
        messageBox.textContent = 'You win the battle and grow stronger.';
      } else {
        player.health -= 8 + (worldState.active.mutations.tank || 0) * 0.5;
        player.energy = Math.max(0, player.energy - 12);
        if (player.health <= 0) {
          player.health = 100;
          player.worldX = Math.max(500, player.worldX - 120);
          player.worldY = canvas.height * 0.6;
          messageBox.textContent = 'You were overwhelmed, but the ocean gives you another chance.';
        }
      }
    }
  }
}

function updateBattleState() {
  const player = worldState.player;
  const { enemies } = getAllObjectsFromChunks();
  const nearEnemy = enemies.some((enemy) => {
    const distance = Math.hypot(player.worldX - enemy.x, player.worldY - enemy.y);
    return distance < 220;
  });

  worldState.battleTimer = nearEnemy ? 1 : Math.max(0, worldState.battleTimer - 1 / 60);
  matingCallBtn.disabled = nearEnemy;
  matingCallBtn.style.opacity = nearEnemy ? '0.6' : '1';

  if (nearEnemy) {
    messageBox.textContent = 'A predator is nearby. You can only use the mating call when you are not in battle.';
  }
}

function updateHud() {
  const world = worldState.active;
  if (!world) return;

  const player = worldState.player;
  const label = `${player.level} • ${Math.round(player.health)} HP • ${Math.round(player.energy)} energy`;
  planetLabel.textContent = world.name + ' • ' + label;
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#0d3453');
  gradient.addColorStop(0.5, '#0e708a');
  gradient.addColorStop(1, '#082a3f');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawBackgroundOxygen();

  const { prey, vegetation, enemies, backgroundCreatures } = getAllObjectsFromChunks();
  backgroundCreatures.forEach((bgCreature) => drawBackgroundCreature(bgCreature));
  vegetation.forEach((plant) => drawPlant(plant));
  prey.forEach((creature) => drawPrey(creature));
  enemies.forEach((enemy) => drawEnemy(enemy));
  drawPlayer();

  if (worldState.intro < 3) {
    drawIntroSplash();
  }
}

function drawBackgroundOxygen() {
  for (let i = 0; i < 8; i += 1) {
    const x = ((i * 160) - (worldState.cameraX * 0.4)) % (canvas.width + 200);
    const y = 90 + (i % 2) * 40 - worldState.cameraY * 0.25;
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.arc(x + 80, y, 18 + (i % 3) * 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBackgroundCreature(creature) {
  if (creature.x < worldState.cameraX - 300 || creature.x > worldState.cameraX + canvas.width + 300) {
    return;
  }
  if (creature.y < worldState.cameraY - 300 || creature.y > worldState.cameraY + canvas.height + 300) {
    return;
  }
  const screenX = creature.x - worldState.cameraX;
  const screenY = creature.y - worldState.cameraY;
  ctx.save();
  ctx.filter = 'blur(12px)';
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.fillStyle = creature.color;
  ctx.arc(screenX, screenY, creature.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPlant(plant) {
  const screenX = plant.x - worldState.cameraX;
  const screenY = plant.y - worldState.cameraY;
  ctx.beginPath();
  ctx.fillStyle = plant.color;
  ctx.arc(screenX, screenY, plant.radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawPrey(creature) {
  if (creature.x < worldState.cameraX - 100 || creature.x > worldState.cameraX + canvas.width + 100) {
    return;
  }
  if (creature.y < worldState.cameraY - 100 || creature.y > worldState.cameraY + canvas.height + 100) {
    return;
  }
  const screenX = creature.x - worldState.cameraX;
  const screenY = creature.y - worldState.cameraY;
  ctx.beginPath();
  ctx.fillStyle = creature.color;
  ctx.arc(screenX, screenY, creature.radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawEnemy(enemy) {
  if (enemy.x < worldState.cameraX - 150 || enemy.x > worldState.cameraX + canvas.width + 150) {
    return;
  }
  if (enemy.y < worldState.cameraY - 150 || enemy.y > worldState.cameraY + canvas.height + 150) {
    return;
  }
  const screenX = enemy.x - worldState.cameraX;
  const screenY = enemy.y - worldState.cameraY;
  ctx.beginPath();
  ctx.fillStyle = enemy.color;
  ctx.arc(screenX, screenY, enemy.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.arc(screenX - enemy.radius * 0.3, screenY - enemy.radius * 0.3, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayer() {
  const player = worldState.player;
  if (!player) return;

  const screenX = player.worldX - worldState.cameraX;
  const screenY = player.worldY - worldState.cameraY;

  ctx.beginPath();
  ctx.fillStyle = player.color;
  ctx.arc(screenX, screenY, player.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.arc(screenX - player.radius * 0.35, screenY - player.radius * 0.2, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(screenX + player.radius * 0.7, screenY);
  ctx.lineTo(screenX + player.radius * 1.6, screenY + player.radius * 0.2);
  ctx.stroke();
}

function drawIntroSplash() {
  const alpha = 1 - worldState.intro / 3;
  ctx.fillStyle = `rgba(5, 15, 20, ${0.35 + alpha * 0.5})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Meteor impact!', canvas.width / 2, canvas.height / 2 - 20);

  ctx.font = '18px Arial';
  ctx.fillText('The rock breaks and reveals your first cell.', canvas.width / 2, canvas.height / 2 + 18);
}

function useMatingCall() {
  const player = worldState.player;
  const { enemies } = getAllObjectsFromChunks();
  const nearEnemy = enemies.some((enemy) => {
    const distance = Math.hypot(player.worldX - enemy.x, player.worldY - enemy.y);
    return distance < 220;
  });

  if (nearEnemy) {
    messageBox.textContent = 'You cannot use the mating call while a predator is attacking.';
    return;
  }

  evolutionHub.classList.remove('hidden');
  messageBox.textContent = 'The mating call echoes across the ocean. The Evolution Hub opens.';
}

function closeHub() {
  evolutionHub.classList.add('hidden');
  messageBox.textContent = 'You return to the ocean and continue swimming.';
}

function applyUpgrade(type) {
  const world = worldState.active;
  if (!world) return;

  world.mutations[type] = (world.mutations[type] || 0) + 1;

  if (type === 'speed') {
    worldState.player.speed += 12;
  }
  if (type === 'strength') {
    worldState.player.radius += 0.9;
  }
  if (type === 'tank') {
    worldState.player.health += 16;
  }

  saveWorlds();
  closeHub();
  messageBox.textContent = `${type[0].toUpperCase() + type.slice(1)} mutation unlocked for ${world.name}.`;
}

window.addEventListener('keydown', (event) => {
  worldState.keys[event.key] = true;
  if (event.key === ' ') {
    event.preventDefault();
  }

  if (event.key === 'a' || event.key === 'A') worldState.keys.a = true;
  if (event.key === 'd' || event.key === 'D') worldState.keys.d = true;
  if (event.key === 'w' || event.key === 'W') worldState.keys.w = true;
  if (event.key === 's' || event.key === 'S') worldState.keys.s = true;
});

window.addEventListener('keyup', (event) => {
  worldState.keys[event.key] = false;
  if (event.key === 'a' || event.key === 'A') worldState.keys.a = false;
  if (event.key === 'd' || event.key === 'D') worldState.keys.d = false;
  if (event.key === 'w' || event.key === 'W') worldState.keys.w = false;
  if (event.key === 's' || event.key === 'S') worldState.keys.s = false;
});

window.addEventListener('resize', resizeCanvas);
window.__evolutionState = worldState;

matingCallBtn.addEventListener('click', useMatingCall);
closeHubBtn.addEventListener('click', closeHub);
newWorldBtn.addEventListener('click', () => {
  gameScreen.classList.add('hidden');
  gameScreen.classList.remove('visible');
  menuScreen.classList.remove('hidden');
  menuScreen.classList.add('visible');
  resetForm();
});

document.querySelectorAll('.hub-option').forEach((button) => {
  button.addEventListener('click', () => applyUpgrade(button.dataset.upgrade));
});

worldForm.addEventListener('submit', createWorldFromForm);
renderWorldList();
resetForm();
