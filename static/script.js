const player = {
  element: document.getElementById("player"),
  speed: 8,
  x: 50,
  width: 100,
};

let score = 0;
let lives = 10;
let drops = [];
let isMovingLeft = false;
let isMovingRight = false;
let lastTime = 0;
const dropInterval = 500;
let gameActive = true;
let isPaused = false;
let animationFrameId = null;

function updatePlayerPosition() {
  player.element.style.left = `${player.x - player.width / 2}px`;
}

function createDrop() {
  const drop = document.createElement("div");
  drop.className = "water-drop";
  const containerWidth = document.getElementById("gameContainer").clientWidth;
  drop.style.left = `${Math.random() * (containerWidth - 20)}px`;
  drop.style.top = "-20px";
  document.getElementById("gameContainer").appendChild(drop);
  return {
    element: drop,
    y: 0,
    speed: 3 + Math.random() * 3,
    x: parseFloat(drop.style.left),
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

  animationFrameId = requestAnimationFrame(updateGame);

  const deltaTime = time - lastTime;
  lastTime = time;

  if (isMovingLeft)
    player.x = Math.max(player.width / 2, player.x - player.speed);
  if (isMovingRight)
    player.x = Math.min(
      window.innerWidth - player.width / 2,
      player.x + player.speed
    );
  updatePlayerPosition();

  if (Math.random() < deltaTime / dropInterval) {
    drops.push(createDrop());
  }

  drops = drops.filter((drop) => {
    drop.y += drop.speed;
    drop.element.style.top = `${drop.y}px`;

    if (drop.y > window.innerHeight) {
      drop.element.remove();
      lives--;
      document.getElementById("lives").textContent = lives;
      if (lives <= 0) gameOver();
      return false;
    }

    if (checkCollision(drop)) {
      drop.element.remove();
      score += 10;
      document.getElementById("score").textContent = score;
      return false;
    }

    return true;
  });
}

function gameOver() {
  gameActive = false;
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  document.getElementById("gameOver").style.display = "block";
  document.getElementById("finalScore").textContent = score;
}

function togglePause() {
  isPaused = !isPaused;
  document.getElementById("pauseMenu").style.display = isPaused ? "block" : "none";
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

  drops.forEach((drop) => drop.element.remove());
  drops = [];

  score = 0;
  lives = 10;
  player.x = window.innerWidth / 2;
  updatePlayerPosition();
  document.getElementById("score").textContent = "0";
  document.getElementById("lives").textContent = "10";
  document.getElementById("gameOver").style.display = "none";
  gameActive = true;
  lastTime = 0;
  animationFrameId = requestAnimationFrame(updateGame);
}

document.getElementById("continueButton").addEventListener("click", continueGame);
document.getElementById("restartButtonPause").addEventListener("click", function() {
  continueGame(); // First unpause
  restartGame();  // Then restart
});

window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft" || e.key === "a") isMovingLeft = true;
  if (e.key === "ArrowRight" || e.key === "d") isMovingRight = true;
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
updatePlayerPosition();
requestAnimationFrame(updateGame);
