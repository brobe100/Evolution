const WORLD_KEY = 'evolution-worlds-v1';
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

const worldState = {
  active: null,
  worlds: loadWorlds(),
  intro: 0,
  player: null,
  prey: [],
  vegetation: [],
  particles: [],
  enemies: [],
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
  worldState.intro = 0;
  worldState.battleTimer = 0;
  worldState.particles = [];
  worldState.vegetation = [];
  worldState.prey = [];
  worldState.enemies = [];

  const player = {
    x: canvas.width * 0.5,
    y: canvas.height * 0.7,
    radius: 16,
    color: DIETS[world.diet].accent,
    diet: world.diet,
    speed: 150,
    health: 100,
    energy: 100,
    level: 1,
    growth: 0,
    name: world.name,
    targetSize: 16,
  };

  worldState.player = player;
  for (let i = 0; i < 18; i += 1) {
    worldState.prey.push(makePrey());
  }
  for (let i = 0; i < 20; i += 1) {
    worldState.vegetation.push(makeVegetation());
  }
  for (let i = 0; i < 5; i += 1) {
    worldState.enemies.push(makeEnemy());
  }

  if (worldState.rafId) {
    cancelAnimationFrame(worldState.rafId);
  }
  worldState.rafId = requestAnimationFrame(gameLoop);
}

function makePrey() {
  const radius = 7 + Math.random() * 18;
  return {
    x: Math.random() * (canvas.width - 80) + 40,
    y: Math.random() * (canvas.height - 80) + 40,
    radius,
    color: `hsl(${Math.random() * 40 + 160}, 80%, ${50 + Math.random() * 20}%)`,
    vx: (Math.random() - 0.5) * 40,
    vy: (Math.random() - 0.5) * 40,
    kind: Math.random() > 0.5 ? 'fish' : 'shrimp',
  };
}

function makeVegetation() {
  return {
    x: Math.random() * (canvas.width - 20),
    y: Math.random() * (canvas.height - 20),
    radius: 8 + Math.random() * 14,
    color: `hsl(${Math.random() * 30 + 90}, 70%, ${55 + Math.random() * 18}%)`,
  };
}

function makeEnemy() {
  const radius = 22 + Math.random() * 24;
  return {
    x: Math.random() * (canvas.width - 100) + 50,
    y: Math.random() * (canvas.height - 100) + 50,
    radius,
    color: '#f85f6a',
    vx: (Math.random() - 0.5) * 50,
    vy: (Math.random() - 0.5) * 50,
    type: 'hunter',
  };
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
  const world = worldState.active;

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
    updateEntities();
    checkCollisions();
    updateBattleState();
    updateHud();
  }
}

function updatePlayerMovement(player) {
  const dx = (worldState.keys.ArrowRight || worldState.keys.d ? 1 : 0) - (worldState.keys.ArrowLeft || worldState.keys.a ? 1 : 0);
  const dy = (worldState.keys.ArrowDown || worldState.keys.s ? 1 : 0) - (worldState.keys.ArrowUp || worldState.keys.w ? 1 : 0);
  const length = Math.hypot(dx, dy) || 1;

  const baseSpeed = player.speed + (worldState.active.mutations.speed || 0) * 22;
  const nx = dx / length;
  const ny = dy / length;

  player.x += nx * baseSpeed * (1 / 60);
  player.y += ny * baseSpeed * (1 / 60);

  player.x = Math.max(player.radius, Math.min(canvas.width - player.radius, player.x));
  player.y = Math.max(player.radius, Math.min(canvas.height - player.radius, player.y));
}

function updateEntities() {
  worldState.prey.forEach((creature) => {
    creature.x += creature.vx * (1 / 60);
    creature.y += creature.vy * (1 / 60);

    if (creature.x < 0 || creature.x > canvas.width) creature.vx *= -1;
    if (creature.y < 0 || creature.y > canvas.height) creature.vy *= -1;
  });

  worldState.enemies.forEach((enemy) => {
    enemy.x += enemy.vx * (1 / 60);
    enemy.y += enemy.vy * (1 / 60);

    if (enemy.x < 10 || enemy.x > canvas.width - 10) enemy.vx *= -1;
    if (enemy.y < 10 || enemy.y > canvas.height - 10) enemy.vy *= -1;
  });

  worldState.vegetation.forEach((plant) => {
    plant.y += Math.sin((plant.x + plant.y) * 0.04 + Date.now() * 0.002) * 0.2;
  });
}

function checkCollisions() {
  const player = worldState.player;

  worldState.prey = worldState.prey.filter((creature) => {
    const distance = Math.hypot(player.x - creature.x, player.y - creature.y);
    const safeDistance = player.radius + creature.radius + 2;

    if (distance <= safeDistance) {
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
        return false;
      }
    }
    return true;
  });

  worldState.vegetation = worldState.vegetation.filter((plant) => {
    const distance = Math.hypot(player.x - plant.x, player.y - plant.y);
     if (distance <= player.radius + plant.radius + 4) {
      if (player.diet === 'herbivore' || player.diet === 'omnivore') {
        player.energy = Math.min(100, player.energy + 20);
        messageBox.textContent = 'A patch of floating vegetation is a tasty meal.';
        return false;
      }
    }
    return true;
  });

  worldState.enemies = worldState.enemies.filter((enemy) => {
    const distance = Math.hypot(player.x - enemy.x, player.y - enemy.y);
    if (distance <= player.radius + enemy.radius) {
      if (player.radius > enemy.radius * 1.15) {
        player.radius += 0.1;
        enemy.x = Math.random() * (canvas.width - 100) + 50;
        enemy.y = Math.random() * (canvas.height - 100) + 50;
        messageBox.textContent = 'You win the battle and grow stronger.';
      } else {
        player.health -= 8 + (worldState.active.mutations.tank || 0) * 0.5;
        player.energy = Math.max(0, player.energy - 12);
        if (player.health <= 0) {
          player.health = 100;
          player.x = canvas.width * 0.5;
          player.y = canvas.height * 0.7;
          messageBox.textContent = 'You were overwhelmed, but the ocean gives you another chance.';
        }
      }
    }
    return true;
  });

  if (worldState.vegetation.length < 12) {
    worldState.vegetation.push(makeVegetation());
  }

  if (worldState.prey.length < 14) {
    worldState.prey.push(makePrey());
  }

  if (worldState.enemies.length < 5) {
    worldState.enemies.push(makeEnemy());
  }
}

function updateBattleState() {
  const player = worldState.player;
  const nearEnemy = worldState.enemies.some((enemy) => {
    const distance = Math.hypot(player.x - enemy.x, player.y - enemy.y);
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

  worldState.vegetation.forEach(drawPlant);
  worldState.prey.forEach(drawPrey);
  worldState.enemies.forEach(drawEnemy);
  drawPlayer();

  if (worldState.intro < 3) {
    drawIntroSplash();
  }
}

function drawBackgroundOxygen() {
  for (let i = 0; i < 8; i += 1) {
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.arc(80 + i * 120, 90 + (i % 2) * 40, 18 + (i % 3) * 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlant(plant) {
  ctx.beginPath();
  ctx.fillStyle = plant.color;
  ctx.arc(plant.x, plant.y, plant.radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawPrey(creature) {
  ctx.beginPath();
  ctx.fillStyle = creature.color;
  ctx.arc(creature.x, creature.y, creature.radius, 0, Math.PI * 2);
  ctx.fill();
}

function drawEnemy(enemy) {
  ctx.beginPath();
  ctx.fillStyle = enemy.color;
  ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.arc(enemy.x - enemy.radius * 0.3, enemy.y - enemy.radius * 0.3, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayer() {
  const player = worldState.player;
  if (!player) return;

  ctx.beginPath();
  ctx.fillStyle = player.color;
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.arc(player.x - player.radius * 0.35, player.y - player.radius * 0.2, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(player.x + player.radius * 0.7, player.y);
  ctx.lineTo(player.x + player.radius * 1.6, player.y + player.radius * 0.2);
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
  const nearEnemy = worldState.enemies.some((enemy) => {
    const distance = Math.hypot(player.x - enemy.x, player.y - enemy.y);
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
});

window.addEventListener('keyup', (event) => {
  worldState.keys[event.key] = false;
});

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
