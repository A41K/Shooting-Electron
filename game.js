const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  width: 90,
  height: 85,
  speed: 5,
  dx: 0,
  dy: 0,
  health: 100,
  maxHealth: 100,
  baseHealth: 100,
  mana: 0,
  maxMana: 0,
  manaRechargeRate: 2.5,
  coins: 0,
  damage: 1,
  baseDamage: 1,
  exp: 0,
  level: 1,
  skillPoints: 0,
  defense: 0,
  baseDefense: 0,
  class: null,
  inventory: [],
  equipment: { sword: null, chestplate: null, shield: null }
};

const playerImage = new Image();
playerImage.src = './textures/character.png';

const damageCharImage = new Image();
damageCharImage.src = './textures/character.png';

const tankCharImage = new Image();
tankCharImage.src = './textures/character_tank.png';

const mageCharImage = new Image();
mageCharImage.src = './textures/character_mage.png';

const enemyImage = new Image();
enemyImage.src = 'textures/enemy.webp';

const menuBackgroundImage = new Image();
menuBackgroundImage.src = './textures/backdroptypeshit.jpg';

const otherBackgroundImage = new Image();
otherBackgroundImage.src = './textures/menu_background.svg';

const swordImage = new Image();
swordImage.src = './textures/sword.png';

const chestplateImage = new Image();
chestplateImage.src = './textures/chestplate.png';

const shieldImage = new Image();
shieldImage.src = './textures/shield.png';

const magestickImage = new Image();
magestickImage.src = './textures/magestick.png';

const rarities = {
    common: { color: 'gray', chance: 0.7 },
    uncommon: { color: 'green', chance: 0.2 },
    rare: { color: 'blue', chance: 0.07 },
    epic: { color: 'purple', chance: 0.02 },
    legendary: { color: 'orange', chance: 0.01 }
};

const characters = {
    sniper: {
        damage: 2,
        health: 75,
        baseHealth: 75,
        defense: 0,
        image: './textures/character.png'
    },
    mage: {
        damage: 2,
        health: 80,
        baseHealth: 80,
        defense: 2,
        mana: 100,
        manaRechargeRate: 2.5,
        image: './textures/character_mage.png'
    },
    tank: {
        damage: 1,
        health: 150,
        baseHealth: 150,
        defense: 5,
        image: './textures/character_tank.png'
    }
};

const bullets = [];
const bossProjectiles = [];
const enemies = [];
const spawnMarkers = [];
let round = 1;
let enemiesToSpawn = 5;
let spawnInterval = 3000; // Initial spawn interval in ms
let bossActive = false;

let shopOpen = false;
let inventoryOpen = false;
let draggingItem = null;
let dragStartX = 0;
let dragStartY = 0;
let dragItemOriginalSlot = null;
let gameState = 'title'; // title, game, paused, load, controls, characterSelect, levelUp, inventory


let mouse = {
    x: 0,
    y: 0
};

let notifications = [];

let showStats = false;

let saveMessage = {
    text: '',
    visible: false,
    timer: 0
};

// Save game state
function saveGame() {
    const gameData = {
        player: player,
        round: round,
        enemiesToSpawn: enemiesToSpawn,
        spawnInterval: spawnInterval,
        upgrades: player.upgrades,
        level: player.level,
        exp: player.exp,
        skillPoints: player.skillPoints,
        achievements: achievements
    };
    localStorage.setItem('gameData', JSON.stringify(gameData));
}

// Load game state
function loadGame() {
    const savedData = localStorage.getItem('gameData');
    if (savedData) {
        const gameData = JSON.parse(savedData);
        player = gameData.player;
        round = gameData.round;
        enemiesToSpawn = gameData.enemiesToSpawn;
        spawnInterval = gameData.spawnInterval;
        player.level = gameData.level || 1;
        player.exp = gameData.exp || 0;
        player.skillPoints = gameData.skillPoints || 0;
        achievements = gameData.achievements || getAchievements();
        player.upgrades = gameData.upgrades || {
            speed: { cost: 10, increase: 1 },
            health: { cost: 20, increase: 20 },
            damage: { cost: 15, increase: 1 }
        };
        return true;
    }
    return false;
}

const keys = {
  w: false,
  a: false,
  s: false,
  d: false,
  b: false,
  l: false,
  e: false,

};

function drawSpawnMarkers() {
    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
    for (const marker of spawnMarkers) {
        ctx.beginPath();
        ctx.arc(marker.x, marker.y, marker.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawEnemies() {
    for (const enemy of enemies) {
        ctx.drawImage(enemyImage, enemy.x, enemy.y, enemy.width, enemy.height);
        if (enemy.isBoss) {
            // Draw boss health bar at top of screen
            const barWidth = canvas.width / 2;
            const barHeight = 20;
            const barX = canvas.width / 4;
            const barY = 20;
            ctx.fillStyle = 'red';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            ctx.fillStyle = 'green';
            ctx.fillRect(barX, barY, barWidth * (enemy.health / enemy.maxHealth), barHeight);
            ctx.strokeStyle = 'white';
            ctx.strokeRect(barX, barY, barWidth, barHeight);
            ctx.fillStyle = 'white';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('BOSS', barX + barWidth / 2, barY + barHeight - 4);
        } else {
            // Draw regular enemy health bar
            const healthBarWidth = enemy.width;
            const healthBarHeight = 5;
            const healthBarX = enemy.x;
            const healthBarY = enemy.y - 10;

            ctx.fillStyle = 'red';
            ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
            ctx.fillStyle = 'green';
            ctx.fillRect(healthBarX, healthBarY, healthBarWidth * (enemy.health / enemy.maxHealth), healthBarHeight);
            ctx.strokeStyle = 'white';
            ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
        }
    }
}

function drawNotifications() {
    for (let i = notifications.length - 1; i >= 0; i--) {
        const notification = notifications[i];
        const popupWidth = 300;
        const popupHeight = 80;
        const popupX = canvas.width - popupWidth - 20;
        const popupY = 20 + (i * (popupHeight + 10));

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(popupX, popupY, popupWidth, popupHeight);

        const icon = new Image();
        icon.src = notification.icon;
        ctx.drawImage(icon, popupX + 10, popupY + 10, 60, 60);

        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(notification.name, popupX + 80, popupY + 35);

        ctx.fillStyle = '#ccc';
        ctx.font = '14px Arial';
        ctx.fillText(notification.description, popupX + 80, popupY + 60);

        notification.timer--;
        if (notification.timer <= 0) {
            notifications.splice(i, 1);
        }
    }
            
            // Draw regular enemy health bar
            ctx.fillStyle = 'red';
            ctx.fillRect(enemy.x, enemy.y - 10, enemy.width, 5);
            ctx.fillStyle = 'green';
            ctx.fillRect(enemy.x, enemy.y - 10, enemy.width * (enemy.health / enemy.maxHealth), 5);
        }


function drawPlayer() {
// Draw Mana bar
  if (player.maxMana > 0) {
      ctx.fillStyle = 'gray';
      ctx.fillRect(player.x, player.y - 10, player.width, 5);
      ctx.fillStyle = 'blue';
      ctx.fillRect(player.x, player.y - 10, player.width * (player.mana / player.maxMana), 5);
  }

  ctx.drawImage(playerImage, player.x, player.y, player.width, player.height);
  // Draw health bar
  const healthBarMaxWidth = player.width; // Or a fixed value like 50
  ctx.fillStyle = 'red';
  ctx.fillRect(player.x, player.y - 17, healthBarMaxWidth, 5);
  ctx.fillStyle = 'green';
  ctx.fillRect(player.x, player.y - 17, Math.min(healthBarMaxWidth, healthBarMaxWidth * (player.health / player.maxHealth)), 5);

  // Draw EXP bar
  const expNeeded = getExpNeededForLevel(player.level);
  ctx.fillStyle = 'gray';
  ctx.fillRect(player.x, player.y - 24, player.width, 5);
  ctx.fillStyle = 'gold';
  ctx.fillRect(player.x, player.y - 24, player.width * (player.exp / expNeeded), 5);
}

function drawBullets() {
    for (let i = 0; i < bullets.length; i++) {
        const bullet = bullets[i];
        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

function clear() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function newPos() {
  player.x += player.dx;
  player.y += player.dy;

  detectWalls();
}

function detectWalls() {
  // Left wall
  if (player.x < 0) {
    player.x = 0;
  }

  // Right wall
  if (player.x + player.width > canvas.width) {
    player.x = canvas.width - player.width;
  }

  // Top wall
  if (player.y < 0) {
    player.y = 0;
  }

  // Bottom wall
  if (player.y + player.height > canvas.height) {
    player.y = canvas.height - player.height;
  }
}

function checkAchievements() {
    // Damage achievement
    if (player.damage >= 25 && !achievements.damage_1.unlocked) {
        achievements.damage_1.unlocked = true;
        showAchievementPopup(achievements.damage_1);
    }

    // Round achievements
    if (round > 5 && !achievements.round_5.unlocked) {
        achievements.round_5.unlocked = true;
        showAchievementPopup(achievements.round_5);
    }
    if (round > 10 && !achievements.round_10.unlocked) {
        achievements.round_10.unlocked = true;
        showAchievementPopup(achievements.round_10);
    }
    if (round > 15 && !achievements.round_15.unlocked) {
        achievements.round_15.unlocked = true;
        showAchievementPopup(achievements.round_15);
    }
    if (round > 20 && !achievements.round_20.unlocked) {
        achievements.round_20.unlocked = true;
        showAchievementPopup(achievements.round_20);
    }
}

function showAchievementPopup(achievement) {
    notifications.push({
        type: 'achievement',
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        timer: 300 // 5 seconds
    });
}

function drawAchievementsScreen() {
    const pattern = ctx.createPattern(otherBackgroundImage, 'repeat');
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#eee';
    ctx.font = '45px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Achievements', canvas.width / 2, 80);

    const achievementKeys = Object.keys(achievements);
    const achievementWidth = 300;
    const achievementHeight = 100;
    const achievementMargin = 20;
    const achievementsPerRow = Math.floor((canvas.width - achievementMargin) / (achievementWidth + achievementMargin));
    const startX = (canvas.width - (achievementsPerRow * (achievementWidth + achievementMargin) - achievementMargin)) / 2;
    let currentX = startX;
    let currentY = 150;

    for (let i = 0; i < achievementKeys.length; i++) {
        const key = achievementKeys[i];
        const achievement = achievements[key];

        ctx.fillStyle = achievement.unlocked ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(currentX, currentY, achievementWidth, achievementHeight);

        const icon = new Image();
        icon.src = achievement.icon;
        ctx.drawImage(icon, currentX + 10, currentY + 10, 80, 80);

        ctx.fillStyle = achievement.unlocked ? '#fff' : '#888';
        ctx.font = '20px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(achievement.name, currentX + 100, currentY + 35);

        ctx.fillStyle = achievement.unlocked ? '#ccc' : '#666';
        ctx.font = '14px Arial';
        ctx.fillText(achievement.description, currentX + 100, currentY + 65);

        currentX += achievementWidth + achievementMargin;
        if ((i + 1) % achievementsPerRow === 0) {
            currentX = startX;
            currentY += achievementHeight + achievementMargin;
        }
    }
}

function update() {
    checkAchievements();
  if (player.maxMana > 0 && player.mana < player.maxMana) {
      player.mana += player.manaRechargeRate / 60; // per frame, so divide by 60 for per second
      if (player.mana > player.maxMana) {
          player.mana = player.maxMana;
      }
  }

  if (gameState === 'paused') {
    drawPauseScreen();
    requestAnimationFrame(update);
    return;
  }

  if (gameState === 'achievements') {
    drawAchievementsScreen();
    requestAnimationFrame(update);
    return;
  }

  // Check for hover over player
  if (mouse.x > player.x && mouse.x < player.x + player.width &&
      mouse.y > player.y && mouse.y < player.y + player.height) {
      showStats = true;
  } else {
      showStats = false;
  }



  if (gameState === 'title') {
    drawTitleScreen();
    requestAnimationFrame(update);
    return;
  }

  if (gameState === 'controls') {
    drawControlsScreen();
    requestAnimationFrame(update);
    return;
  }

  if (gameState === 'characterSelect') {
    drawCharacterSelectScreen();
    requestAnimationFrame(update);
    return;
  }

  if (gameState === 'levelUp') {
    drawLevelUpScreen();
    requestAnimationFrame(update);
    return;
  }

  if (gameState === 'inventory') {
    drawInventory();
    requestAnimationFrame(update);
    return;
  }

  if (gameState === 'paused') {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Back to Title button
    if (mouseY > canvas.height / 2 + 30 && mouseY < canvas.height / 2 + 70 &&
        mouseX > canvas.width / 2 - 100 && mouseX < canvas.width / 2 + 100) {
        gameState = 'title';
        return;
    }
  } else if (gameState === 'characterSelect') {
    // Damage character selected
    // Damage character selected
    const damageCharX = canvas.width / 4 - 50;
    const damageCharY = 200;
    const charWidth = 100;
    const charHeight = 65;
    if (mouseY > damageCharY && mouseY < damageCharY + charHeight && mouseX > damageCharX && mouseX < damageCharX + charWidth) {
        const charData = characters.sniper;
        player.baseDamage = charData.damage;
        player.damage = charData.damage;
        player.health = charData.health;
        player.maxHealth = charData.health;
        player.baseDefense = charData.defense;
        player.defense = charData.defense;
        playerImage.src = charData.image;
        startNewGame();
    }

    // Tank character selected
    const tankCharX = canvas.width * 3 / 4 - 50;
    const tankCharY = 200;
    if (mouseY > tankCharY && mouseY < tankCharY + charHeight && mouseX > tankCharX && mouseX < tankCharX + charWidth) {
        const charData = characters.tank;
        player.baseDamage = charData.damage;
        player.damage = charData.damage;
        player.health = charData.health;
        player.maxHealth = charData.health;
        player.baseDefense = charData.defense;
        player.defense = charData.defense;
        playerImage.src = charData.image;
        startNewGame();
    }

    return;
  }

  if (shopOpen) {
    drawShop();
    requestAnimationFrame(update);
    return;
  }
  if (player.health <= 0) {
    alert('Game Over! Restarting...');
    startNewGame();
    round = 1;
    enemiesToSpawn = 5;
    spawnInterval = 3000;
    enemies.length = 0;
    bullets.length = 0;
    bossProjectiles.length = 0;
    saveGame();
    spawnEnemies();
    player.equipment = { sword: null, chestplate: null, shield: null, magestick: null };
  }
  clear();
  movePlayer();
  newPos();
  updateBullets();
  updateBossProjectiles();
  updateEnemies();
  drawPlayer();
  drawEnemies();
  drawNotifications();
  drawBullets();
  drawBossProjectiles();
  drawSpawnMarkers();
  if (gameState !== 'inventory') {
    drawSaveMessage();
  }
  drawNotifications();
  if (showStats) {
      drawStats();
  }

  ctx.fillStyle = 'black';
  ctx.font = '24px Arial';
  ctx.textAlign = 'start';
  ctx.fillText(`Round: ${round} | Enemies: ${enemies.length} | Coins: ${player.coins} | Level: ${player.level}`, 10, 30);

  if (enemies.length === 0 && spawnMarkers.length === 0 && !bossActive) {
    round++;
    if (round % 5 === 0) {
        spawnBoss();
    } else {
        enemiesToSpawn += 2;
        spawnInterval = Math.max(100, spawnInterval - 50); // Decrease interval, with a minimum of 100ms
        spawnEnemies();
    }
    saveGame();
  }

  requestAnimationFrame(update);
}

function drawSaveMessage() {
    if (saveMessage.visible) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(canvas.width / 2 - 150, canvas.height - 70, 300, 50);
        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(saveMessage.text, canvas.width / 2, canvas.height - 35);

        if (Date.now() - saveMessage.timer > 2000) {
            saveMessage.visible = false;
        }
    }
}

function movePlayer() {
    player.dx = 0;
    player.dy = 0;

    if (keys.w) {
        player.dy = -player.speed;
    }
    if (keys.s) {
        player.dy = player.speed;
    }
    if (keys.a) {
        player.dx = -player.speed;
    }
    if (keys.d) {
        player.dx = player.speed;
    }
}

function drawPauseScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.font = '50px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Paused', canvas.width / 2, canvas.height / 2 - 50);

    ctx.font = '30px Arial';
    ctx.fillText('Back to Title', canvas.width / 2, canvas.height / 2 + 50);
}

function keyDown(e) {
  if (e.key === 'w' || e.key === 'W') {
    keys.w = true;
  }
  if (e.key === 'a' || e.key === 'A') {
    keys.a = true;
  }
  if (e.key === 's' || e.key === 'S') {
    keys.s = true;
  }
  if (e.key === 'x' || e.key === 'X') {
    saveGame();
    saveMessage.text = 'Game Saved!';
    saveMessage.visible = true;
    saveMessage.timer = Date.now();
  }
  if (e.key === 'd' || e.key === 'D') {
    keys.d = true;
  }
  if (e.key === 'Escape') {
    if (gameState === 'game') {
        gameState = 'paused';
    } else if (gameState === 'paused' || gameState === 'inventory') {
        gameState = 'game';
        inventoryOpen = false;
    }
  }
  if (e.key === 'e' || e.key === 'E') {
      if (gameState === 'game') {
          gameState = 'inventory';
          inventoryOpen = true;
      } else if (gameState === 'inventory') {
          gameState = 'game';
          inventoryOpen = false;
      }
  }
}

let upgrades = {
  speed: { cost: 10, increase: 1 },
  health: { cost: 20, increase: 20 },
  damage: { cost: 15, increase: 1 }
};

function drawTitleScreen() {
  // Draw the background pattern
  ctx.drawImage(menuBackgroundImage, 0, 0, canvas.width, canvas.height);
  
  // Add a semi-transparent overlay for better text readability
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'white';
  ctx.font = '80px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('KillJoy', canvas.width / 2, canvas.height / 2 - 100);

  const hasSaveData = localStorage.getItem('gameData') !== null;

  ctx.font = '30px Arial';
  ctx.fillText('New Game', canvas.width / 2, canvas.height / 2);
  
  if (hasSaveData) {
      ctx.fillText('Continue', canvas.width / 2, canvas.height / 2 + 50);
  }

  ctx.font = '16px Arial';
  ctx.fillText('(v0.6 Beta)', canvas.width / 2, canvas.height / 2 + 100);

  ctx.textAlign = 'right';
  ctx.font = '30px Arial';
  ctx.fillText('Controls', canvas.width / 1.05, canvas.height - 50);

}

function drawShop() {
    // Draw the background pattern
    const pattern = ctx.createPattern(otherBackgroundImage, 'repeat');
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add a semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Title
    ctx.fillStyle = '#eee';
    ctx.font = '45px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Upgrades', canvas.width / 2, 80);

    // Coins
    ctx.font = '25px Arial';
    ctx.color = 'blue';
    ctx.fillText(`Coins: ${player.coins}`, canvas.width / 2, 130);

    const itemYStart = 220;
    const itemYGap = 100;

    // Upgrade Items
    drawShopItem(`Increase Speed`, `Cost: ${upgrades.speed.cost}`, itemYStart);
    drawShopItem(`Increase Max Health`, `Cost: ${upgrades.health.cost}`, itemYStart + itemYGap);
    drawShopItem(`Increase Damage`, `Cost: ${upgrades.damage.cost}`, itemYStart + itemYGap * 2);

    // Instructions
    ctx.font = '20px Arial';
    ctx.fillText('Press B to close', canvas.width / 2, canvas.height - 20);
}

function drawShopItem(name, cost, y) {
    const itemHeight = 80;
    const itemWidth = 400;
    const x = canvas.width / 2 - itemWidth / 2;

    // Item Box
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(x, y - 50, itemWidth, itemHeight);
    ctx.strokeStyle = '#eee';
    ctx.strokeRect(x, y - 50, itemWidth, itemHeight);

    // Item Name
    ctx.fillStyle = '#eee';
    ctx.font = '28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(name, canvas.width / 2, y - 10);

    // Item Cost
    ctx.font = '22px Arial';
    ctx.fillText(cost, canvas.width / 2, y + 20);
}

function drawStats() {
    const statBoxX = player.x + player.width + 10;
    const statBoxY = player.y;
    const statBoxWidth = 200;
    const statBoxHeight = 145;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(statBoxX, statBoxY, statBoxWidth, statBoxHeight);

    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Health: ${player.health}/${player.maxHealth}`, statBoxX + 10, statBoxY + 25);
    ctx.fillText(`Damage: ${player.damage}`, statBoxX + 10, statBoxY + 50);
    ctx.fillText(`Speed: ${player.speed}`, statBoxX + 10, statBoxY + 75);
    ctx.fillText(`Coins: ${player.coins}`, statBoxX + 10, statBoxY + 100);
    ctx.fillText(`Defense: ${player.defense}`, statBoxX + 10, statBoxY + 125);
}

function drawCharacterSelectScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    ctx.font = '50px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Choose Your Character', canvas.width / 2, 100);
    // Damage Character
    const charKeys = Object.keys(characters);
    const totalWidth = charKeys.length * 150 + (charKeys.length - 1) * 50;
    let startX = canvas.width / 2 - totalWidth / 2;

    charKeys.forEach(key => {
        const char = characters[key];
        const charImg = new Image();
        charImg.src = char.image;

        ctx.drawImage(charImg, startX, 200, 100, 95);
        ctx.font = '30px Arial';
        ctx.fillText(key.charAt(0).toUpperCase() + key.slice(1), startX + 50, 310);
        ctx.font = '20px Arial';
        let yOffset = 350;
        ctx.fillText(`Damage: ${char.damage}`, startX + 50, yOffset);
        yOffset += 30;
        ctx.fillText(`Health: ${char.health}`, startX + 50, yOffset);
        yOffset += 30;
        if (char.defense) {
            ctx.fillText(`Defense: ${char.defense}`, startX + 50, yOffset);
            yOffset += 30;
        }
        if (char.mana) {
            ctx.fillText(`Mana: ${char.mana}`, startX + 50, yOffset);
        }

        startX += 200;
    });
}

function drawControlsScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    ctx.font = '35px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Controls', canvas.width / 2, 80);

    ctx.font = '30px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('W, A, S, D: Move', canvas.width / 2 - 150, 140);
    ctx.fillText('Mouse Click: Shoot', canvas.width / 2 - 150, 190);
    ctx.fillText('B: Open Shop', canvas.width / 2 - 150, 240);
    ctx.fillText('Esc: Pause Game', canvas.width / 2 - 150, 290);
    ctx.fillText('X: Save Game', canvas.width / 2 - 150, 340);
    ctx.fillText('E: Inventory', canvas.width / 2 - 150, 390);
    ctx.fillText('L: Achievements', canvas.width / 2 - 150, 440);


    ctx.font = '30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Back', canvas.width / 2, canvas.height - 35);
}

function shoot(event) {
  const rect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;

  if (gameState === 'title') {
    // New Game button
    if (mouseY > canvas.height / 2 - 20 && mouseY < canvas.height / 2 + 20 &&
        mouseX > canvas.width / 2 - 100 && mouseX < canvas.width / 2 + 100) {
        gameState = 'characterSelect';
        return;
    }
    
    // Continue button (if save exists)
    if (localStorage.getItem('gameData') !== null) {
        if (mouseY > canvas.height / 2 + 30 && mouseY < canvas.height / 2 + 70 &&
            mouseX > canvas.width / 2 - 100 && mouseX < canvas.width / 2 + 100) {
            if (loadGame()) {
                gameState = 'game';
                spawnEnemies();
            }
            return;
        }
    }

    // Controls button
    // The text alignment was causing issues, so we'll use fixed coordinates for click detection
    const controlsTextWidth = ctx.measureText('Controls').width; // Measure text width for accurate click area
    const controlsX = canvas.width / 1.05 - controlsTextWidth; // Adjust X based on right alignment
    const controlsY = canvas.height - 50; // Y position of the text
    const controlsHeight = 30; // Approximate height of the text

    if (mouseY > controlsY - controlsHeight && mouseY < controlsY &&
        mouseX > controlsX && mouseX < canvas.width / 1.05) {
        gameState = 'controls';
        return;
    }

  } else if (gameState === 'paused') {
    // Back to Title button
    if (mouseY > canvas.height / 2 + 30 && mouseY < canvas.height / 2 + 70 &&
        mouseX > canvas.width / 2 - 100 && mouseX < canvas.width / 2 + 100) {
        gameState = 'title';
        return;
    }
  } else if (gameState === 'controls') {
    // Back button
    if (mouseY > canvas.height - 70 && mouseY < canvas.height - 30 &&
        mouseX > canvas.width / 2 - 50 && mouseX < canvas.width / 2 + 50) {
        gameState = 'title';
        return;
    }
  } else if (gameState === 'characterSelect') {
    const charKeys = Object.keys(characters);
    const totalWidth = charKeys.length * 150 + (charKeys.length - 1) * 50;
    let startX = canvas.width / 2 - totalWidth / 2;
    const charY = 200;
    const charWidth = 100;
    const charHeight = 65;

    charKeys.forEach(key => {
        if (mouse.y > charY && mouse.y < charY + charHeight && mouse.x > startX && mouse.x < startX + charWidth) {
            const charData = characters[key];
            player.baseDamage = charData.damage;
            player.damage = charData.damage;
            player.health = charData.health;
            player.maxHealth = charData.health;
            player.baseHealth = charData.health;
            player.baseDefense = charData.defense;
            player.defense = charData.defense;
            player.speed = charData.speed;
            player.class = key;
            if (charData.mana) {
                player.mana = charData.mana;
                player.maxMana = charData.mana;
            } else {
                player.mana = 0;
                player.maxMana = 0;
            }
            playerImage.src = charData.image;
            startNewGame();
        }
        startX += 200;
    });

  } else if (gameState === 'levelUp') {
    handleLevelUpClicks(mouseX, mouseY);
  } else if (gameState === 'game') {
    if (shopOpen) {
      const itemHeight = 80;
      const itemWidth = 400;
      const itemX = canvas.width / 2 - itemWidth / 2;
      const itemYStart = 220;
      const itemYGap = 100;

      // Speed upgrade purchase
      if (mouseY > itemYStart - 50 && mouseY < itemYStart - 50 + itemHeight && mouseX > itemX && mouseX < itemX + itemWidth) {
        if (player.coins >= upgrades.speed.cost) {
          player.coins -= upgrades.speed.cost;
          player.speed += upgrades.speed.increase;
          upgrades.speed.cost = Math.ceil(upgrades.speed.cost * 1.5);
        }
      }

      // Health upgrade purchase
      if (mouseY > itemYStart + itemYGap - 50 && mouseY < itemYStart + itemYGap - 50 + itemHeight && mouseX > itemX && mouseX < itemX + itemWidth) {
        if (player.coins >= upgrades.health.cost) {
          player.coins -= upgrades.health.cost;
          player.maxHealth += upgrades.health.increase;
          player.health = player.maxHealth;
          upgrades.health.cost = Math.ceil(upgrades.health.cost * 1.5);
        }
      }

      // Damage upgrade purchase
      if (mouseY > itemYStart + itemYGap * 2 - 50 && mouseY < itemYStart + itemYGap * 2 - 50 + itemHeight && mouseX > itemX && mouseX < itemX + itemWidth) {
          if (player.coins >= upgrades.damage.cost) {
              player.coins -= upgrades.damage.cost;
              player.damage += upgrades.damage.increase;
              upgrades.damage.cost = Math.ceil(upgrades.damage.cost * 1.5);
          }
      }
    } else {
      if (player.maxMana > 0) {
          if (player.mana >= 5) {
              player.mana -= 5;
          } else {
              addNotification("Not enough mana!", "error");
              return;
          }
      }
      // Bullet shooting logic
      const angle = Math.atan2(mouseY - (player.y + player.height / 2), mouseX - (player.x + player.width / 2));

      const bullet = {
          x: player.x + player.width / 2,
          y: player.y + player.height / 2,
          radius: 5,
          speed: 10,
          dx: Math.cos(angle) * 10,
          dy: Math.sin(angle) * 10
      };

      bullets.push(bullet);
    }
  }
}

function spawnEnemies() {
    let spawnedCount = 0;

    function spawnSingleEnemy() {
        if (spawnedCount >= enemiesToSpawn) {
            return;
        }

        const size = Math.random() * 30 + 20;
        const spawnX = Math.random() * (canvas.width - size);
        const spawnY = Math.random() * (canvas.height - size);

        const marker = {
            x: spawnX + size / 2,
            y: spawnY + size / 2,
            radius: size / 2,
            alpha: 1,
            creationTime: Date.now()
        };
        spawnMarkers.push(marker);

        setTimeout(() => {
            const index = spawnMarkers.indexOf(marker);
            if (index > -1) {
                spawnMarkers.splice(index, 1);
            }

            const enemy = {
                x: spawnX,
                y: spawnY,
                width: size,
                height: size,
                health: 5 * round,
                maxHealth: 5 * round
            };
            enemies.push(enemy);
        }, 3000); // 2 second delay before enemy appears

        spawnedCount++;
        setTimeout(spawnSingleEnemy, spawnInterval);
    }

    spawnSingleEnemy();
}

function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];

        if (!enemy.isBoss) {
            // Regular enemy movement
            const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
            enemy.x += Math.cos(angle) * 1;
            enemy.y += Math.sin(angle) * 1;
        } else if (Date.now() - enemy.lastShot > 1000) { // Boss shoots every second
            // Boss shooting logic
            const angle = Math.atan2(
                player.y + player.height/2 - (enemy.y + enemy.height/2),
                player.x + player.width/2 - (enemy.x + enemy.width/2)
            );
            const projectile = {
                x: enemy.x + enemy.width/2,
                y: enemy.y + enemy.height/2,
                radius: 8,
                dx: Math.cos(angle) * 5,
                dy: Math.sin(angle) * 5
            };
            bossProjectiles.push(projectile);
            enemy.lastShot = Date.now();
        }

        // Check for collision with player
        if (
            player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y
        ) {
            if (enemy.isBoss) {
                player.health = 0; // Instant death on boss collision
            } else {
                const damageTaken = Math.max(1, 25 - player.defense);
                player.health -= damageTaken;
                enemies.splice(i, 1);
            }
        }
    }
}

function drawBossProjectiles() {
    ctx.fillStyle = 'purple';
    for (const projectile of bossProjectiles) {
        ctx.beginPath();
        ctx.arc(projectile.x, projectile.y, projectile.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

function updateBossProjectiles() {
    for (let i = bossProjectiles.length - 1; i >= 0; i--) {
        const projectile = bossProjectiles[i];
        projectile.x += projectile.dx;
        projectile.y += projectile.dy;

        // Remove projectiles that are off screen
        if (projectile.x < 0 || projectile.x > canvas.width ||
            projectile.y < 0 || projectile.y > canvas.height) {
            bossProjectiles.splice(i, 1);
            continue;
        }

        // Check for collision with player
        const dist = Math.hypot(
            projectile.x - (player.x + player.width/2),
            projectile.y - (player.y + player.height/2)
        );
        if (dist < projectile.radius + player.width/3) {
            player.health = 0; // Instant death on projectile hit
            bossProjectiles.splice(i, 1);
        }
    }
}

function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.x += bullet.dx;
        bullet.y += bullet.dy;

        if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
            bullets.splice(i, 1);
            continue;
        }

        for (let j = enemies.length - 1; j >= 0; j--) {
            const enemy = enemies[j];
            const dist = Math.hypot(bullet.x - (enemy.x + enemy.width / 2), bullet.y - (enemy.y + enemy.height / 2));
            if (dist - enemy.width / 2 - bullet.radius < 1) {
                bullets.splice(i, 1);
                enemy.health -= player.damage;
                if (enemy.health <= 0) {
                    const deadEnemy = enemies.splice(j, 1)[0];
                    if (deadEnemy.isBoss) {
                        player.coins += 50;
                        gainExp(100);
                        bossActive = false;
                        dropItem(true); // Boss always drops an item
                    } else {
                        player.coins++;
                        gainExp(10);
                        dropItem(false); // Regular enemies have a chance to drop
                    }
                }
                break;
            }
        }
    }
}

function getExpNeededForLevel(level) {
    return Math.floor(100 * Math.pow(1.5, level - 1));
}

function gainExp(amount) {
    player.exp += amount;
    const expNeeded = getExpNeededForLevel(player.level);
    if (player.exp >= expNeeded) {
        player.level++;
        player.exp -= expNeeded;
        player.skillPoints++;
        gameState = 'levelUp';
    }
}

function spawnBoss() {
    bossActive = true;
    const size = 200;
    const boss = {
        x: canvas.width / 2 - size / 2,
        y: 100,
        width: size,
        height: size,
        health: 50 * round,
        maxHealth: 50 * round,
        isBoss: true,
        lastShot: Date.now()
    };
    enemies.push(boss);
}

function drawLevelUpScreen() {
    // Draw the background pattern
    const pattern = ctx.createPattern(otherBackgroundImage, 'repeat');
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add a semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#eee';
    ctx.font = '45px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Level Up!', canvas.width / 2, 80);

    ctx.font = '25px Arial';
    ctx.fillText(`You have ${player.skillPoints} skill point(s).`, canvas.width / 2, 130);

    const itemYStart = 220;
    const itemYGap = 100;

    drawShopItem('Increase Max Health (+20)', '1 Skill Point', itemYStart);
    drawShopItem('Increase Damage (+0.2)', '1 Skill Point', itemYStart + itemYGap);
    drawShopItem('Increase Speed (+0.5)', '1 Skill Point', itemYStart + itemYGap * 2);
}

function handleLevelUpClicks(mouseX, mouseY) {
    if (player.skillPoints <= 0) return;

    const itemHeight = 80;
    const itemWidth = 400;
    const itemX = canvas.width / 2 - itemWidth / 2;
    const itemYStart = 220;
    const itemYGap = 100;

    // Health upgrade
    if (mouseY > itemYStart - 50 && mouseY < itemYStart - 50 + itemHeight && mouseX > itemX && mouseX < itemX + itemWidth) {
        player.maxHealth += 20;
        player.health = player.maxHealth;
        player.skillPoints--;
    }

    // Damage upgrade
    if (mouseY > itemYStart + itemYGap - 50 && mouseY < itemYStart + itemYGap - 50 + itemHeight && mouseX > itemX && mouseX < itemX + itemWidth) {
        player.damage += 0.2;
        player.skillPoints--;
    }

    // Speed upgrade
    if (mouseY > itemYStart + itemYGap * 2 - 50 && mouseY < itemYStart + itemYGap * 2 - 50 + itemHeight && mouseX > itemX && mouseX < itemX + itemWidth) {
        player.speed += 0.5;
        player.skillPoints--;
    }

    if (player.skillPoints === 0) {
        gameState = 'game';
    }
}

function keyUp(e) {
  if (e.key === 'w' || e.key === 'W') {
    keys.w = false;
  }
  if (e.key === 'a' || e.key === 'A') {
    keys.a = false;
  }
  if (e.key === 's' || e.key === 'S') {
    keys.s = false;
  }
  if (e.key === 'd' || e.key === 'D') {
    keys.d = false;
  }
  if (e.key === 'b' || e.key === 'B') {
    if (gameState === 'game') shopOpen = !shopOpen;
  }
  if (e.key === 'l' || e.key === 'L') {
    if (gameState === 'game') {
        gameState = 'achievements';
    } else if (gameState === 'achievements') {
        gameState = 'game';
    }
  }

}

function drawInventory() {
    const pattern = ctx.createPattern(otherBackgroundImage, 'repeat');
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#eee';
    ctx.font = '45px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Inventory', canvas.width / 2, 80);

    const slotSize = 60;
    const slotMargin = 10;

    // Equipment Slots
    const equipmentStartX = canvas.width / 2 - (slotSize * 3 + slotMargin * 2) / 2;
    const equipmentY = 150;
    ctx.font = '20px Arial';
    ctx.fillStyle = 'white';
    ctx.fillText('Equipment', canvas.width/2, equipmentY - 20);
    
    // Sword Slot
    ctx.strokeStyle = '#555';
    if (mouse.x > equipmentStartX && mouse.x < equipmentStartX + slotSize && mouse.y > equipmentY && mouse.y < equipmentY + slotSize) {
        ctx.strokeStyle = '#fff';
    }
    ctx.strokeRect(equipmentStartX, equipmentY, slotSize, slotSize);
    if (player.equipment.sword) {
        const item = player.equipment.sword;
        ctx.fillStyle = rarities[item.rarity].color;
        ctx.fillRect(equipmentStartX, equipmentY, slotSize, slotSize);
        const image = item.type === 'magestick' ? magestickImage : swordImage;
        ctx.drawImage(image, equipmentStartX + 5, equipmentY + 5, slotSize - 10, slotSize - 10);
    }

    // Chestplate Slot
    const chestplateX = equipmentStartX + slotSize + slotMargin;
    ctx.strokeStyle = '#555';
    if (mouse.x > chestplateX && mouse.x < chestplateX + slotSize && mouse.y > equipmentY && mouse.y < equipmentY + slotSize) {
        ctx.strokeStyle = '#fff';
    }
    ctx.strokeRect(chestplateX, equipmentY, slotSize, slotSize);
    if (player.equipment.chestplate) {
        const item = player.equipment.chestplate;
        ctx.fillStyle = rarities[item.rarity].color;
        ctx.fillRect(chestplateX, equipmentY, slotSize, slotSize);
        ctx.drawImage(chestplateImage, chestplateX + 5, equipmentY + 5, slotSize - 10, slotSize - 10);
    }

    // Shield Slot
    const shieldX = chestplateX + slotSize + slotMargin;
    ctx.strokeStyle = '#555';
    if (mouse.x > shieldX && mouse.x < shieldX + slotSize && mouse.y > equipmentY && mouse.y < equipmentY + slotSize) {
        ctx.strokeStyle = '#fff';
    }
    ctx.strokeRect(shieldX, equipmentY, slotSize, slotSize);
    if (player.equipment.shield) {
        const item = player.equipment.shield;
        ctx.fillStyle = rarities[item.rarity].color;
        ctx.fillRect(shieldX, equipmentY, slotSize, slotSize);
        ctx.drawImage(shieldImage, shieldX + 5, equipmentY + 5, slotSize - 10, slotSize - 10);
    }

    // Inventory Slots
    const inventorySlots = 10;
    const inventoryWidth = (slotSize + slotMargin) * 5 - slotMargin;
    const startX = canvas.width / 2 - inventoryWidth / 2;
    const startY = equipmentY + slotSize + 50;
    ctx.fillText('Bags', canvas.width/2, startY - 20);


    for (let i = 0; i < inventorySlots; i++) {
        const row = Math.floor(i / 5);
        const col = i % 5;
        const x = startX + col * (slotSize + slotMargin);
        const y = startY + row * (slotSize + slotMargin);

        ctx.strokeStyle = '#555';
        if (mouse.x > x && mouse.x < x + slotSize && mouse.y > y && mouse.y < y + slotSize) {
            ctx.strokeStyle = '#fff';
        }
        ctx.strokeRect(x, y, slotSize, slotSize);

        if (player.inventory[i]) {
            const item = player.inventory[i];
            ctx.fillStyle = rarities[item.rarity].color;
            ctx.fillRect(x, y, slotSize, slotSize);
            let image;
            if (item.type === 'sword') {
                image = swordImage;
            } else if (item.type === 'chestplate') {
                image = chestplateImage;
            } else if (item.type === 'shield') {
                image = shieldImage;
            } else if (item.type === 'magestick') {
                image = magestickImage;
            }
            ctx.drawImage(image, x + 5, y + 5, slotSize - 10, slotSize - 10);
        }
    }

    // Draw dragging item
    if (draggingItem) {
        ctx.fillStyle = rarities[draggingItem.rarity].color;
        ctx.fillRect(mouse.x - slotSize / 2, mouse.y - slotSize / 2, slotSize, slotSize);
        let image;
        if (draggingItem.type === 'sword') {
            image = swordImage;
        } else if (draggingItem.type === 'chestplate') {
            image = chestplateImage;
        } else if (draggingItem.type === 'shield') {
            image = shieldImage;
        } else if (draggingItem.type === 'magestick') {
            image = magestickImage;
        }
        ctx.drawImage(image, mouse.x - slotSize / 2 + 5, mouse.y - slotSize / 2 + 5, slotSize - 10, slotSize - 10);
    }

    // Tooltip
    drawTooltip();

    // Salvage button
    const salvageButtonWidth = 50;
    const salvageButtonHeight = 20;
    for (let i = 0; i < player.inventory.length; i++) {
        if (!player.inventory[i]) continue;
        const row = Math.floor(i / 5);
        const col = i % 5;
        const x = startX + col * (slotSize + slotMargin) + (slotSize - salvageButtonWidth) / 2;
        const y = startY + row * (slotSize + slotMargin) + slotSize + 2;

        ctx.fillStyle = 'darkred';
        ctx.fillRect(x, y, salvageButtonWidth, salvageButtonHeight);
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Salvage', x + salvageButtonWidth / 2, y + salvageButtonHeight / 2);
    }

    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Press E to close', canvas.width / 2, canvas.height - 50);
}

function getSlots() {
    const slots = [];
    const slotSize = 60;
    const slotMargin = 10;

    // Equipment Slots
    const equipmentStartX = canvas.width / 2 - (slotSize * 3 + slotMargin * 2) / 2;
    const equipmentY = 150;
    slots.push({ x: equipmentStartX, y: equipmentY, type: 'equipment', slot: 'sword', item: player.equipment.sword });
    slots.push({ x: equipmentStartX + slotSize + slotMargin, y: equipmentY, type: 'equipment', slot: 'chestplate', item: player.equipment.chestplate });
    slots.push({ x: equipmentStartX + 2 * (slotSize + slotMargin), y: equipmentY, type: 'equipment', slot: 'shield', item: player.equipment.shield });

    // Inventory Slots
    const inventorySlots = 10;
    const inventoryWidth = (slotSize + slotMargin) * 5 - slotMargin;
    const startX = canvas.width / 2 - inventoryWidth / 2;
    const startY = equipmentY + slotSize + 50;
    for (let i = 0; i < inventorySlots; i++) {
        const row = Math.floor(i / 5);
        const col = i % 5;
        const x = startX + col * (slotSize + slotMargin);
        const y = startY + row * (slotSize + slotMargin);
        slots.push({ x: x, y: y, type: 'inventory', slot: i, item: player.inventory[i] });
    }

    return slots;
}

function isValidDrop(item, slot) {
    if (slot.type === 'equipment') {
        if (item.type === 'sword' || item.type === 'magestick') {
            return slot.slot === 'sword';
        } else if (item.type === 'chestplate') {
            return slot.slot === 'chestplate';
        } else if (item.type === 'shield') {
            return slot.slot === 'shield';
        }
    }
    return true;
}

function dropItem(isBoss) {
    let dropChance = Math.random();
    if (!isBoss && dropChance > 0.3) return; // 30% drop chance for normal mobs

    let rarityRoll = Math.random();
    let currentRarity = 'common';
    let cumulativeChance = 0;
    for (const rarity in rarities) {
        cumulativeChance += rarities[rarity].chance;
        if (rarityRoll < cumulativeChance) {
            currentRarity = rarity;
            break;
        }
    }

    let itemType;
    const itemRoll = Math.random();
    if (player.class === 'mage' && itemRoll < 0.33) {
        itemType = 'magestick';
    } else if (itemRoll < 0.66) {
        itemType = 'sword';
    } else {
        itemType = 'chestplate';
    }

    if (itemType === 'chestplate' && Math.random() < 0.3) { // 30% chance to be a shield instead of chestplate
        itemType = 'shield';
    }

    let baseStat = 0;
    let secondaryStat = 0; // For magestick mana regen
    if (itemType === 'magestick') {
        if (currentRarity === 'common') { baseStat = 1; secondaryStat = 0.1; }
        if (currentRarity === 'uncommon') { baseStat = 2; secondaryStat = 0.2; }
        if (currentRarity === 'rare') { baseStat = 4; secondaryStat = 0.4; }
        if (currentRarity === 'epic') { baseStat = 8; secondaryStat = 0.8; }
        if (currentRarity === 'legendary') { baseStat = 16; secondaryStat = 1.6; }
    } else if (itemType === 'sword') {
        if (currentRarity === 'common') baseStat = 1;
        if (currentRarity === 'uncommon') baseStat = 2;
        if (currentRarity === 'rare') baseStat = 4;
        if (currentRarity === 'epic') baseStat = 8;
        if (currentRarity === 'legendary') baseStat = 16;
    } else if (itemType === 'chestplate') {
        if (currentRarity === 'common') baseStat = 10;
        if (currentRarity === 'uncommon') baseStat = 20;
        if (currentRarity === 'rare') baseStat = 40;
        if (currentRarity === 'epic') baseStat = 80;
        if (currentRarity === 'legendary') baseStat = 160;
    } else { // shield
        if (currentRarity === 'common') baseStat = 5;
        if (currentRarity === 'uncommon') baseStat = 10;
        if (currentRarity === 'rare') baseStat = 20;
        if (currentRarity === 'epic') baseStat = 40;
        if (currentRarity === 'legendary') baseStat = 80;
    }

    const newItem = {
        type: itemType,
        rarity: currentRarity,
        stat: baseStat,
        ...(itemType === 'magestick' && { manaRegen: secondaryStat })
    };

    if (player.inventory.length < 10) {
        player.inventory.push(newItem);
        addNotification(`Picked up ${currentRarity} ${itemType}`);
        updatePlayerStatsFromItems();
    } else {
        addNotification('Inventory full!', 'error');
    }
}

function updatePlayerStatsFromItems() {
    // Reset stats to base stats before recalculating
    player.damage = player.baseDamage + (player.level > 1 ? (player.level - 1) * 0.2 : 0);
    player.defense = player.baseDefense;
    player.maxHealth = player.baseHealth;
    player.manaRechargeRate = characters[player.class]?.manaRechargeRate || 0;

    if (player.equipment.sword) {
        player.damage += player.equipment.sword.stat;
        if (player.equipment.sword.type === 'magestick') {
            player.manaRechargeRate += player.equipment.sword.manaRegen;
        }
    }
    if (player.equipment.chestplate) {
        player.maxHealth += player.equipment.chestplate.stat;
    }
    if (player.equipment.shield) {
        player.defense += player.equipment.shield.stat;
    }
}

function startNewGame() {
    // Reset game state but keep level and skill points
    const currentLevel = player.level;
    const currentExp = player.exp;
    const currentSkillPoints = player.skillPoints;

    player = {
        ...player,
        x: canvas.width / 2,
        y: canvas.height / 2,
        dx: 0,
        dy: 0,
        health: player.maxHealth, // Start with full health based on upgrades
        coins: 0,
        speed: 5, // Reset speed, can be upgraded again
        damage: player.baseDamage, // Reset to base damage
        defense: player.baseDefense, // Reset to base defense
        level: currentLevel,
        exp: currentExp,
        skillPoints: currentSkillPoints,
        inventory: [],
        equipment: { sword: null, chestplate: null, shield: null, magestick: null }
    };
    // Reset player.upgrades to initial state
    player.upgrades = {
        speed: { cost: 10, increase: 1 },
        health: { cost: 20, increase: 20 },
        damage: { cost: 15, increase: 1 }

    };
    updatePlayerStatsFromItems();

    round = 1;
    enemiesToSpawn = 5;
    spawnInterval = 3000;
    bossActive = false;
    enemies.length = 0;
    bullets.length = 0;
    bossProjectiles.length = [];
    saveGame();
    gameState = 'game';
    spawnEnemies();
}

Promise.all([
    new Promise(resolve => playerImage.onload = resolve),
    new Promise(resolve => enemyImage.onload = resolve)
]).then(() => {
    update();
});


function addNotification(message, type = 'info') {
    notifications.push({ message, type, timer: 180 }); // 3 seconds at 60fps
}

function drawNotifications() {
    ctx.textAlign = 'left';
    ctx.font = '16px Arial';
    const notificationHeight = 25;
    for (let i = notifications.length - 1; i >= 0; i--) {
        const notif = notifications[i];
        const y = canvas.height - (notifications.length - i) * notificationHeight - 20;
        if (notif.type === 'error') {
            ctx.fillStyle = 'rgba(255, 100, 100, 0.8)';
        } else {
            ctx.fillStyle = 'rgba(100, 100, 255, 0.8)';
        }
        ctx.fillRect(10, y, ctx.measureText(notif.message).width + 20, notificationHeight);
        ctx.fillStyle = 'white';
        ctx.fillText(notif.message, 20, y + 18);

        notif.timer--;
        if (notif.timer <= 0) {
            notifications.splice(i, 1);
        }
    }
}

function drawButton(x, y, width, height, text, normalColor, hoverColor, textColor) {
    let isHovered = false;
    if (mouse.x > x && mouse.x < x + width && mouse.y > y && mouse.y < y + height) {
        isHovered = true;
        ctx.fillStyle = hoverColor;
    } else {
        ctx.fillStyle = normalColor;
    }
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = textColor;
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text, x + width / 2, y + height / 2 + 4);
    return isHovered;
}

function drawTooltip() {
    if (gameState !== 'inventory') return;
    let hoveredItem = null;
    const slotSize = 60;
    const slotMargin = 10;

    // Check equipment slots
    const equipmentStartX = canvas.width / 2 - (slotSize * 2 + slotMargin) / 2;
    const equipmentY = 150;
    if (mouse.x > equipmentStartX && mouse.x < equipmentStartX + slotSize && mouse.y > equipmentY && mouse.y < equipmentY + slotSize) {
        hoveredItem = player.equipment.sword;
    }
    const chestplateX = equipmentStartX + slotSize + slotMargin;
    if (mouse.x > chestplateX && mouse.x < chestplateX + slotSize && mouse.y > equipmentY && mouse.y < equipmentY + slotSize) {
        hoveredItem = player.equipment.chestplate;
    }
    const shieldX = chestplateX + slotSize + slotMargin;
    if (mouse.x > shieldX && mouse.x < shieldX + slotSize && mouse.y > equipmentY && mouse.y < equipmentY + slotSize) {
        hoveredItem = player.equipment.shield;
    }

    // Check for salvage button clicks
    const salvageButtonWidth = 50;
    const salvageButtonHeight = 20;
    const inventorySlots = 10;
    const inventoryWidth = (slotSize + slotMargin) * 5 - slotMargin;
    const startX = canvas.width / 2 - inventoryWidth / 2;
    const startY = equipmentY + slotSize + 50;

    for (let i = 0; i < player.inventory.length; i++) {
        if (!player.inventory[i]) continue;
        const row = Math.floor(i / 5);
        const col = i % 5;
        const buttonX = startX + col * (slotSize + slotMargin) + (slotSize - salvageButtonWidth) / 2;
        const buttonY = startY + row * (slotSize + slotMargin) + slotSize + 2;

        if (drawButton(buttonX, buttonY, salvageButtonWidth, salvageButtonHeight, 'Salvage', 'red', 'darkred', 'white')) {
            const item = player.inventory[i];
            let coinsGained = 1;
            if (item.rarity === 'uncommon') coinsGained = 5;
            if (item.rarity === 'rare') coinsGained = 10;
            if (item.rarity === 'epic') coinsGained = 25;
            if (item.rarity === 'legendary') coinsGained = 50;
            player.coins += coinsGained;
            player.inventory.splice(i, 1);
            addNotification(`Salvaged for ${coinsGained} coins.`);
            return; // Exit to prevent starting a drag
        }
    }

    for (let i = 0; i < inventorySlots; i++) {
        const row = Math.floor(i / 5);
        const col = i % 5;
        const x = startX + col * (slotSize + slotMargin);
        const y = startY + row * (slotSize + slotMargin);
        if (mouse.x > x && mouse.x < x + slotSize && mouse.y > y && mouse.y < y + slotSize) {
            hoveredItem = player.inventory[i];
            break;
        }
    }

    if (hoveredItem) {
        const tooltipWidth = 200;
        const tooltipHeight = 100;
        const tooltipX = mouse.x + 15;
        const tooltipY = mouse.y + 15;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);
        ctx.strokeStyle = '#eee';
        ctx.strokeRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

        ctx.fillStyle = rarities[hoveredItem.rarity].color;
        ctx.font = '20px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(hoveredItem.rarity.charAt(0).toUpperCase() + hoveredItem.rarity.slice(1), tooltipX + 10, tooltipY + 25);

        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.fillText(`Type: ${hoveredItem.type}`, tooltipX + 10, tooltipY + 50);
        let statName = 'Stat';
        if (hoveredItem.type === 'sword' || hoveredItem.type === 'magestick') {
            statName = 'Damage';
        } else if (hoveredItem.type === 'chestplate') {
            statName = 'Health';
        } else if (hoveredItem.type === 'shield') {
            statName = 'Defense';
        }

        ctx.fillText(`${statName}: +${hoveredItem.stat}`, tooltipX + 10, tooltipY + 75);
        if (hoveredItem.type === 'magestick') {
            ctx.fillText(`Mana Regen: +${hoveredItem.manaRegen}/s`, tooltipX + 10, tooltipY + 95);
        }
    }
    }


document.addEventListener('keydown', keyDown);
document.addEventListener('keyup', keyUp);
document.addEventListener('click', (e) => {
    if (gameState === 'inventory') {
        const rect = canvas.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;

        const slotSize = 60;
        const slotMargin = 10;
        const equipmentStartX = canvas.width / 2 - (slotSize * 2 + slotMargin) / 2;
        const equipmentY = 150;
        const inventorySlots = 10;
        const inventoryWidth = (slotSize + slotMargin) * 5 - slotMargin;
        const startX = canvas.width / 2 - inventoryWidth / 2;
        const startY = equipmentY + slotSize + 50;
        const salvageButtonWidth = 50;
        const salvageButtonHeight = 20;

        for (let i = 0; i < player.inventory.length; i++) {
            if (!player.inventory[i]) continue;
            const row = Math.floor(i / 5);
            const col = i % 5;
            const buttonX = startX + col * (slotSize + slotMargin) + (slotSize - salvageButtonWidth) / 2;
            const buttonY = startY + row * (slotSize + slotMargin) + slotSize + 2;

            // Check for salvage button clicks
            if (mouse.x > buttonX && mouse.x < buttonX + salvageButtonWidth && mouse.y > buttonY && mouse.y < buttonY + salvageButtonHeight) {
                const item = player.inventory[i];
                let coinsGained = 1;
                if (item.rarity === 'uncommon') coinsGained = 5;
                if (item.rarity === 'rare') coinsGained = 10;
                if (item.rarity === 'epic') coinsGained = 25;
                if (item.rarity === 'legendary') coinsGained = 50;
                player.coins += coinsGained;
                player.inventory.splice(i, 1);
                addNotification(`Salvaged for ${coinsGained} coins.`);
                return; // Exit to prevent other actions
            }
        }
    } else {
        shoot(e);
    }
});

document.addEventListener('mousedown', (e) => {
    if (gameState !== 'inventory') return;

    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;

    const slotSize = 60;
    const slotMargin = 10;

    const slots = getSlots();

    for (const slot of slots) {
        if (mouse.x > slot.x && mouse.x < slot.x + slotSize && mouse.y > slot.y && mouse.y < slot.y + slotSize) {
            if (slot.item) {
                draggingItem = slot.item;
                if (slot.type === 'equipment') {
                    player.equipment[slot.slot] = null;
                } else {
                    player.inventory[slot.slot] = null;
                }
                dragItemOriginalSlot = slot;
                break;
            }
        }
    }
});

document.addEventListener('mouseup', (e) => {
    if (gameState !== 'inventory' || !draggingItem) return;

    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;

    const slotSize = 60;
    const slots = getSlots();
    let itemDropped = false;

    for (const slot of slots) {
        if (mouse.x > slot.x && mouse.x < slot.x + slotSize && mouse.y > slot.y && mouse.y < slot.y + slotSize) {
            if (isValidDrop(draggingItem, slot)) {
                const tempItem = slot.item;
                if (slot.type === 'equipment') {
                    player.equipment[slot.slot] = draggingItem;
                } else {
                    player.inventory[slot.slot] = draggingItem;
                }

                if (dragItemOriginalSlot.type === 'equipment') {
                    player.equipment[dragItemOriginalSlot.slot] = tempItem;
                } else {
                    player.inventory[dragItemOriginalSlot.slot] = tempItem;
                }
                itemDropped = true;
                break;
            }
        }
    }

    // If not dropped in a valid slot, return to original slot
    if (!itemDropped) {
        if (dragItemOriginalSlot.type === 'equipment') {
            player.equipment[dragItemOriginalSlot.slot] = draggingItem;
        } else {
            player.inventory[dragItemOriginalSlot.slot] = draggingItem;
        }
    }

    draggingItem = null;
    dragItemOriginalSlot = null;
    updatePlayerStatsFromItems();
    updatePlayerStatsFromItems();

    // Clean up empty slots in inventory
    player.inventory = player.inventory.filter(item => item !== null);
});

document.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
});

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});