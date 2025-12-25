const setupCanvas = () => {
  const canvas = document.querySelector('canvas') as HTMLCanvasElement;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // --- STATI E VARIABILI ---
  let gameState: 'MENU' | 'INSTRUCTIONS' | 'PLAYING' | 'GAMEOVER' = 'MENU';
  let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;
  const playerY = window.innerHeight - 80;
  let isMouseDown = false, lastShotTime = 0, score = 0, level = 1;
  const pointsPerLevel = 1500;
  let currentPlayerName = "Pilota";

  // --- GESTIONE RECORD (Session Storage: si resetta alla chiusura) ---
  interface HighScore { name: string; score: number; }
  let leaderBoard: HighScore[] = JSON.parse(sessionStorage.getItem('spaceEscapeLeaderboard') || '[]');

  const updateLeaderboard = (name: string, newScore: number) => {
    leaderBoard.push({ name, score: newScore });
    leaderBoard.sort((a, b) => b.score - a.score);
    leaderBoard = leaderBoard.slice(0, 5); // Teniamo i primi 5
    sessionStorage.setItem('spaceEscapeLeaderboard', JSON.stringify(leaderBoard));
  };

  const downloadRecords = () => {
    if (leaderBoard.length === 0) return;
    let content = "--- SPACE ESCAPE: CLASSIFICA SESSIONE ---\n\n";
    leaderBoard.forEach((entry, i) => {
      content += `${i + 1}. ${entry.name.toUpperCase()} - ${entry.score} pt\n`;
    });
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Classifica_Space_Escape.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- CLASSI DI GIOCO ---
  class Particle {
    x: number; y: number; vx: number; vy: number; life: number; color: string;
    constructor(x: number, y: number, color: string) {
      this.x = x; this.y = y;
      this.vx = (Math.random() - 0.5) * 10; this.vy = (Math.random() - 0.5) * 10;
      this.life = 1.0; this.color = color;
    }
    update() { this.x += this.vx; this.y += this.vy; this.life -= 0.02; }
    draw() {
      if (!ctx || this.life <= 0) return;
      ctx.globalAlpha = this.life; ctx.fillStyle = this.color;
      ctx.fillRect(this.x, this.y, 3, 3); ctx.globalAlpha = 1;
    }
  }

  class Enemy {
    x: number; y: number; size: number; speedX: number; speedY: number; isGolden: boolean;
    constructor(lvl: number) {
      this.size = 15 + Math.random() * 10;
      this.x = Math.random() * canvas.width; this.y = -50;
      this.speedX = (Math.random() - 0.5) * (1.5 + lvl * 1.5);
      this.speedY = (Math.random() * 1) + (1.2 + lvl * 0.8);
      this.isGolden = Math.random() < 0.15;
    }
    update() {
      this.x += this.speedX; this.y += this.speedY;
      if (this.x > canvas.width || this.x < 0) this.speedX *= -1;
      if (this.y > canvas.height) { this.y = -50; this.x = Math.random() * canvas.width; this.isGolden = Math.random() < 0.15; }
    }
    draw() {
      if (!ctx) return;
      if (this.isGolden) { ctx.shadowBlur = 15; ctx.shadowColor = '#FFD700'; ctx.fillStyle = '#FFD700'; }
      else { ctx.shadowBlur = 0; ctx.fillStyle = '#ff0055'; }
      ctx.beginPath(); ctx.moveTo(this.x, this.y - this.size);
      ctx.lineTo(this.x + this.size, this.y + this.size);
      ctx.lineTo(this.x - this.size, this.y + this.size);
      ctx.fill(); ctx.shadowBlur = 0;
    }
  }

  class Bullet {
    x: number; y: number; speedY: number;
    constructor(x: number, y: number) { this.x = x; this.y = y; this.speedY = -(8 + level * 1); }
    update() { this.y += this.speedY; }
    draw() { if (ctx) { ctx.fillStyle = '#00f2ff'; ctx.fillRect(this.x - 2, this.y, 4, 18); } }
  }

  let enemies: Enemy[] = [], bullets: Bullet[] = [], particles: Particle[] = [];

  const createExplosion = (x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y, color));
  };

  const resetGame = () => {
    const name = prompt("IDENTIFICAZIONE PILOTA:", currentPlayerName);
    if (name) currentPlayerName = name;
    score = 0; level = 1; enemies = []; bullets = []; particles = [];
    for (let i = 0; i < 5; i++) enemies.push(new Enemy(level));
    gameState = 'PLAYING';
  };

  // --- EVENTI ---
  window.addEventListener('mousemove', (e) => { mouseX = e.clientX; mouseY = e.clientY; });
  window.addEventListener('mousedown', () => {
    if (gameState === 'MENU') {
      if (mouseY > canvas.height / 2 - 40 && mouseY < canvas.height / 2) resetGame();
      else if (mouseY > canvas.height / 2 + 20 && mouseY < canvas.height / 2 + 60) gameState = 'INSTRUCTIONS';
    } else if (gameState !== 'PLAYING') gameState = 'MENU';
    isMouseDown = true;
  });
  window.addEventListener('mouseup', () => isMouseDown = false);
  window.addEventListener('keydown', (e) => { 
    if (e.code === 'ArrowUp' && gameState === 'PLAYING') score = level * pointsPerLevel; 
  });

  const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
  window.addEventListener('resize', resize); resize();

  // --- LOOP ANIMAZIONE ---
  const animate = () => {
    ctx.fillStyle = '#050508'; ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (gameState === 'MENU') {
      ctx.textAlign = 'center'; ctx.fillStyle = '#00f2ff'; ctx.font = 'bold 50px sans-serif';
      ctx.fillText('SPACE ESCAPE', canvas.width / 2, 100);

      // Bottoni
      ctx.font = '25px sans-serif';
      ctx.fillStyle = (mouseY > canvas.height / 2 - 40 && mouseY < canvas.height / 2) ? 'white' : '#00f2ff';
      ctx.fillText('GIOCA ORA', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = (mouseY > canvas.height / 2 + 20 && mouseY < canvas.height / 2 + 60) ? 'white' : '#00f2ff';
      ctx.fillText('ISTRUZIONI', canvas.width / 2, canvas.height / 2 + 50);

      // CLASSIFICA
      ctx.fillStyle = '#FFD700'; ctx.font = 'bold 20px monospace';
      ctx.fillText('--- TOP 5 RECORD ---', canvas.width / 2, canvas.height / 2 + 130);
      leaderBoard.forEach((entry, i) => {
        ctx.fillStyle = i === 0 ? '#FFD700' : 'white';
        ctx.textAlign = 'left'; ctx.fillText(`${i + 1}. ${entry.name.toUpperCase()}`, canvas.width / 2 - 140, canvas.height / 2 + 170 + (i * 25));
        ctx.textAlign = 'right'; ctx.fillText(`${entry.score}`, canvas.width / 2 + 140, canvas.height / 2 + 170 + (i * 25));
      });
    } 
    
    else if (gameState === 'INSTRUCTIONS') {
      ctx.textAlign = 'center'; ctx.fillStyle = '#00f2ff'; ctx.font = 'bold 35px sans-serif';
      ctx.fillText('MANUALE DI VOLO', canvas.width / 2, canvas.height / 2 - 100);
      ctx.fillStyle = 'white'; ctx.font = '18px monospace';
      ctx.fillText('• MUOVI IL MOUSE PER SCHIVARE I NEMICI', canvas.width / 2, canvas.height / 2 - 40);
      ctx.fillText('• CLICK SINISTRO PER SPARARE IL LASER', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#FFD700';
      ctx.fillText('• NEMICI DORATI = PUNTI TRIPLI (300)!', canvas.width / 2, canvas.height / 2 + 30);
      ctx.fillStyle = '#ff0055';
      ctx.fillText('CLICCA PER TORNARE AL MENU', canvas.width / 2, canvas.height / 2 + 100);
    } 
    
    else if (gameState === 'PLAYING') {
      const now = Date.now();
      if (isMouseDown && now - lastShotTime > 150) { bullets.push(new Bullet(mouseX, playerY - 20)); lastShotTime = now; }
      
      if (score >= level * pointsPerLevel) {
        level++; createExplosion(canvas.width / 2, canvas.height / 2, '#fff', 40);
        for (let i = 0; i < 2; i++) enemies.push(new Enemy(level));
      }

      bullets.forEach((b, bi) => {
        b.update(); b.draw();
        enemies.forEach((e, ei) => {
          if (Math.sqrt((b.x - e.x) ** 2 + (b.y - e.y) ** 2) < e.size + 15) {
            createExplosion(e.x, e.y, e.isGolden ? '#FFD700' : '#ff0055', e.isGolden ? 30 : 12);
            score += e.isGolden ? 300 : 100; enemies.splice(ei, 1); bullets.splice(bi, 1); enemies.push(new Enemy(level));
          }
        });
      });

      enemies.forEach(e => {
        e.update(); e.draw();
        if (Math.sqrt((mouseX - e.x) ** 2 + (playerY - e.y) ** 2) < 25 + e.size) {
          updateLeaderboard(currentPlayerName, score);
          downloadRecords(); // Salvataggio automatico file .txt
          gameState = 'GAMEOVER';
        }
      });

      particles.forEach((p, i) => { p.update(); p.draw(); if (p.life <= 0) particles.splice(i, 1); });

      // Astronauta
      ctx.save(); ctx.translate(mouseX, playerY);
      ctx.fillStyle = '#eee'; ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#333'; ctx.beginPath(); ctx.ellipse(0, -5, 10, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      ctx.textAlign = 'left'; ctx.fillStyle = 'white'; ctx.font = 'bold 20px monospace';
      ctx.fillText(`PILOTA: ${currentPlayerName}`, 20, 40);
      ctx.fillText(`SCORE: ${score} | LVL: ${level}`, 20, 70);
    } 
    
    else if (gameState === 'GAMEOVER') {
      ctx.textAlign = 'center'; ctx.fillStyle = '#ff0055'; ctx.font = 'bold 50px sans-serif';
      ctx.fillText('MISSIONE FALLITA', canvas.width / 2, canvas.height / 2 - 20);
      ctx.fillStyle = 'white'; ctx.font = '20px sans-serif';
      ctx.fillText(`PUNTEGGIO FINALE: ${score}`, canvas.width / 2, canvas.height / 2 + 30);
      ctx.fillStyle = '#00f2ff'; ctx.fillText('RECORD SALVATO IN DOWNLOADS', canvas.width / 2, canvas.height / 2 + 70);
      ctx.fillStyle = 'white'; ctx.fillText('CLICCA PER RIGIOCARE', canvas.width / 2, canvas.height / 2 + 120);
    }

    requestAnimationFrame(animate);
  };
  animate();
};
window.addEventListener('DOMContentLoaded', setupCanvas);
