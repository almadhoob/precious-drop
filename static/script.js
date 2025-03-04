const waterFacts = [
  "The average American uses about 88 gallons of water per day at home.",
  "A running tap wastes 6 liters of water per minute.",
  "A leaky faucet that drips once per second can waste over 3,000 gallons per year.",
  "Taking a 5-minute shower uses 10 to 25 gallons of water.",
  "It takes 713 gallons of water to produce one cotton t-shirt.",
  "About 95% of the water entering our homes goes down the drain.",
  "Saving water reduces carbon pollution too because it takes a lot of energy to treat and pump water.",
  "More than 2 billion people lack access to safe drinking water.",
  "About 70% of the Earth's surface is covered in water, but only 3% is freshwater.",
];

const player = {
  element: document.getElementById("player"),
  speed: 16,
  x: 50,
  width: 100,
};

let gameStarted = false;
let score = 0;
let lives = 15;
let drops = [];
let isMovingLeft = false;
let isMovingRight = false;
let lastTime = 0;
const dropInterval = 500;
let gameActive = true;
let isPaused = false;
let animationFrameId = null;

let baseDropInterval = 500; // Starting interval between drops (ms)
let baseDropSpeed = 3; // Starting drop speed
let maxExtraDropSpeed = 3; // Random additional speed at start
let difficultyLevel = 1; // Starting difficulty level
let scoreThreshold = 100; // Points needed for difficulty increase
let lastDifficultyUpdateScore = 0; // Track when we last calculated difficulty
let dropPool = []; // Object pool for water drops
let frameCount = 0;
let lastFpsUpdate = 0;
let currentFps = 60;
let debugMode = false; // Set to true to show FPS counter

let lastDropTime = 0; // Track the last drop creation time
const minDropInterval = 1000; // Minimum time interval between drops in milliseconds

function setRandomWaterFact() {
  const factElement = document.getElementById("waterFact");
  const randomIndex = Math.floor(Math.random() * waterFacts.length);
  factElement.textContent = waterFacts[randomIndex];
}

function updatePlayerPosition() {
  player.element.style.left = `${player.x - player.width / 2}px`;
}

function initGame() {
  initializeDropPool(50); // Pre-create 50 drop elements
  if (debugMode) initDebugMode();
  updatePlayerPosition();
  showStartScreen();
}

function initializeDropPool(size) {
  // Pre-create a pool of drop elements to reuse
  for (let i = 0; i < size; i++) {
    const drop = document.createElement("div");
    drop.className = "water-drop";
    drop.style.display = "none"; // Hide initially
    document.getElementById("gameContainer").appendChild(drop);
    dropPool.push(drop);
  }
}

function getDropFromPool() {
  // Try to get an existing drop from the pool
  let dropElement = dropPool.find((drop) => drop.style.display === "none");

  // If no drops available, create a new one and add to pool
  if (!dropElement) {
    dropElement = document.createElement("div");
    dropElement.className = "water-drop";
    document.getElementById("gameContainer").appendChild(dropElement);
    dropPool.push(dropElement);
  }

  // Reset and show the drop
  dropElement.style.display = "block";
  return dropElement;
}

// Recycle a drop back to the pool instead of removing from DOM
function recycleDropToPool(dropElement) {
  dropElement.style.display = "none";
}

function updateDifficulty() {
  // Only recalculate if score has changed enough
  if (score <= lastDifficultyUpdateScore) {
    return difficultyLevel;
  }

  // Calculate difficulty level (1 is base level)
  let newLevel = Math.floor(score / scoreThreshold) + 1;

  // If difficulty has increased, show a notification
  if (newLevel > difficultyLevel) {
    difficultyLevel = newLevel;

    // Use requestAnimationFrame to ensure notifications don't cause frame drops
    requestAnimationFrame(() => {
      showDifficultyNotification();
    });
  }

  lastDifficultyUpdateScore = score;

  document.getElementById("difficulty").textContent = difficultyLevel;
  return difficultyLevel;
}

function showDifficultyNotification() {
  const notification = document.createElement("div");
  notification.className = "difficulty-notification";
  notification.textContent = `Promoted to Level ${difficultyLevel}!`;
  document.getElementById("gameContainer").appendChild(notification);

  // Remove notification after animation
  setTimeout(() => {
    notification.remove();
  }, 2000);
}

function createDrop() {
  const dropElement = getDropFromPool();
  const containerWidth = document.getElementById("gameContainer").clientWidth;
  const dropX = Math.random() * (containerWidth - 20);
  dropElement.style.transform = `translateX(${dropX}px) translateY(-20px)`;

  const speedMultiplier = 1 + (difficultyLevel - 1) * 0.2; // Increase speed by 20% per level
  const baseSpeed = baseDropSpeed * speedMultiplier;
  const extraSpeed = Math.random() * maxExtraDropSpeed;

  return {
    element: dropElement,
    y: -20,
    speed: baseSpeed + extraSpeed,
    x: dropX,
  };
}

function checkCollision(drop) {
  const playerRect = player.element.getBoundingClientRect();
  const dropRect = drop.element.getBoundingClientRect();

  return (
    dropRect.bottom >= playerRect.top &&
    dropRect.right >= playerRect.left &&
    dropRect.left <= playerRect.right
  );
}

function updateGame(time) {
  if (!gameActive) return;

  if (isPaused) {
    animationFrameId = requestAnimationFrame(updateGame);
    return;
  }
  if (debugMode) {
    frameCount++;
    if (time - lastFpsUpdate >= 1000) {
      currentFps = Math.round((frameCount * 1000) / (time - lastFpsUpdate));
      frameCount = 0;
      lastFpsUpdate = time;
      document.getElementById("fpsCounter").textContent = `FPS: ${currentFps}`;
    }
  }

  animationFrameId = requestAnimationFrame(updateGame);
  const currentDifficulty = updateDifficulty();
  const deltaTime = time - lastTime;
  const intervalMultiplier = Math.max(0.3, 1 - (currentDifficulty - 1) * 0.1);
  const currentDropInterval = baseDropInterval * intervalMultiplier;
  lastTime = time;

  if (isMovingLeft)
    player.x = Math.max(player.width / 2, player.x - player.speed);
  if (isMovingRight)
    player.x = Math.min(window.innerWidth, player.x + player.speed);

  updatePlayerPosition();

  // Only create a new drop if the minimum interval has passed
  if (
    time - lastDropTime >= minDropInterval &&
    Math.random() < deltaTime / currentDropInterval
  ) {
    drops.push(createDrop());
    lastDropTime = time; // Update the last drop creation time
  }

  drops = drops.filter((drop) => {
    drop.y += drop.speed;

    // Use transform for better performance
    drop.element.style.transform = `translateX(${drop.x}px) translateY(${drop.y}px)`;

    if (drop.y > window.innerHeight) {
      recycleDropToPool(drop.element); // Recycle instead of removing
      lives--;
      document.getElementById("lives").textContent = lives;
      if (lives <= 0) gameOver();
      return false;
    }

    if (checkCollision(drop)) {
      recycleDropToPool(drop.element); // Recycle instead of removing
      score += 10;
      document.getElementById("score").textContent = score;
      return false;
    }

    return true;
  });
}

function initDebugMode() {
  if (debugMode) {
    const fpsCounter = document.createElement("div");
    fpsCounter.id = "fpsCounter";
    fpsCounter.style.position = "fixed";
    fpsCounter.style.top = "50px";
    fpsCounter.style.left = "20px";
    fpsCounter.style.color = "red";
    fpsCounter.style.fontWeight = "bold";
    fpsCounter.textContent = "FPS: 60";
    document.body.appendChild(fpsCounter);
  }
}

function startGame() {
  gameStarted = true;
  document.getElementById("startScreen").style.display = "none";

  // Reset/initialize game state
  score = 0;
  lives = 15;
  difficultyLevel = 1;
  lastDifficultyUpdateScore = 0;

  // Update UI
  document.getElementById("score").textContent = "0";
  document.getElementById("lives").textContent = "15";

  // Hide any menus that might be showing
  document.getElementById("gameOver").style.display = "none";
  document.getElementById("pauseMenu").style.display = "none";

  // Start game
  gameActive = true;
  isPaused = false;
  lastTime = performance.now();

  // Start the game loop
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  animationFrameId = requestAnimationFrame(updateGame);
}

function showStartScreen() {
  // Hide game over and pause menus
  document.getElementById("gameOver").style.display = "none";
  document.getElementById("pauseMenu").style.display = "none";

  // Reset game objects
  drops.forEach((drop) => {
    recycleDropToPool(drop.element);
  });
  drops = [];

  // Show start screen with a new random fact
  setRandomWaterFact();
  document.getElementById("startScreen").style.display = "flex";
}

document.getElementById("startButton").addEventListener("click", startGame);
setRandomWaterFact();

function gameOver() {
  gameActive = false;
  gameStarted = false;

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  document.getElementById("gameOver").style.display = "block";
  document.getElementById("finalScore").textContent = score;

  if (!document.getElementById("backToMenuButton")) {
    const backButton = document.createElement("button");
    backButton.id = "backToMenuButton";
    backButton.textContent = "Back to Menu";
    backButton.addEventListener("click", showStartScreen);
    document.getElementById("gameOver").appendChild(backButton);
  }
}

function togglePause() {
  isPaused = !isPaused;
  document.getElementById("pauseMenu").style.display = isPaused
    ? "block"
    : "none";
}

function continueGame() {
  isPaused = false;
  document.getElementById("pauseMenu").style.display = "none";
  lastTime = performance.now();
}

function restartGame() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  isMovingLeft = false;
  isMovingRight = false;

  drops.forEach((drop) => {
    recycleDropToPool(drop.element);
  });
  drops = [];

  score = 0;
  lives = 15;
  difficultyLevel = 1;
  lastDifficultyUpdateScore = 0;
  player.x = window.innerWidth / 2;
  updatePlayerPosition();
  document.getElementById("score").textContent = "0";
  document.getElementById("lives").textContent = "15";
  document.getElementById("gameOver").style.display = "none";
  document.getElementById("pauseMenu").style.display = "none";
  isPaused = false;
  gameActive = true;
  lastTime = 0;
  gameStarted = true;
  animationFrameId = requestAnimationFrame(updateGame);
}

document
  .getElementById("continueButton")
  .addEventListener("click", continueGame);
document
  .getElementById("restartButtonPause")
  .addEventListener("click", function () {
    continueGame(); // First unpause
    restartGame(); // Then restart
  });

window.addEventListener("keyup", (e) => {
  if (e.key === "ArrowLeft" || e.key === "a") isMovingLeft = false;
  if (e.key === "ArrowRight" || e.key === "d") isMovingRight = false;
});

window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft" || e.key === "a") isMovingLeft = true;
  if (e.key === "ArrowRight" || e.key === "d") isMovingRight = true;

  // Pause/unpause with Escape or P key
  if ((e.key === "Escape" || e.key === "p" || e.key === "P") && gameActive) {
    togglePause();
  }
});

window.addEventListener("resize", () => {
  player.x = Math.min(
    Math.max(player.x, player.width / 2),
    window.innerWidth - player.width / 2
  );
  updatePlayerPosition();
});

// Start game
initGame();
