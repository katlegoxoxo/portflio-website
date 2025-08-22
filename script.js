const canvas = document.getElementById('bgCanvas');
const ctx = canvas.getContext('2d');
let w = canvas.width = innerWidth;
let h = canvas.height = innerHeight;

const PARTICLE_COUNT = Math.max(100, Math.floor(w / 15)); // star count
const particles = []; // all stars + shooting stars + meteors + explosion particles

let mouse = { x: null, y: null };

// Utility
function rand(min, max) { return Math.random() * (max - min) + min }

// Mouse tracking
/*window.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;

    // Shooting star trail
    for (let i = 0; i < 2; i++) {
        particles.push(new ShootingStar(mouse.x, mouse.y));
    }
});*/

// ----- Particle Classes ----- //
class Star {
    constructor() {
        this.x = rand(0, w);
        this.y = rand(0, h);
        this.baseRadius = rand(0.5, 1.8);
        this.radius = this.baseRadius;
        this.twinkleSpeed = rand(0.01, 0.03);
        this.alpha = rand(0.5, 1);
        this.alphaPhase = rand(0, Math.PI * 2);
        this.isSparkle = Math.random() < 0.05;
        this.sparkleRadius = rand(2.5, 4);
        this.sparkleAlphaPhase = rand(0, Math.PI * 2);
    }
    update() {
        this.alphaPhase += this.twinkleSpeed;
        this.alpha = 0.5 + 0.5 * Math.sin(this.alphaPhase);
        if (this.isSparkle) this.sparkleAlphaPhase += this.twinkleSpeed / 2;
    }
    draw() {
        ctx.save();
        ctx.beginPath();
        if (this.isSparkle) {
            const sparkleAlpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(this.sparkleAlphaPhase));
            ctx.shadowColor = `rgba(255,255,255,${sparkleAlpha})`;
            ctx.shadowBlur = 15;
            ctx.fillStyle = `rgba(255,255,255,${sparkleAlpha})`;
            ctx.arc(this.x, this.y, this.sparkleRadius, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.shadowColor = `rgba(255,255,255,${this.alpha})`;
            ctx.shadowBlur = 6;
            ctx.fillStyle = `rgba(255,255,255,${this.alpha})`;
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

class ShootingStar extends Star {
    constructor(x, y) {
        super();
        this.x = x;
        this.y = y;
        this.vx = rand(-3, 3);
        this.vy = rand(-3, 3);
        this.radius = rand(1, 2.5);
        this.life = 60;
        this.alpha = 1;
        this.alphaDecay = 1 / this.life;
        this.isSparkle = false;
        this.twinkleSpeed = rand(0.05, 0.1);
        this.alphaPhase = rand(0, Math.PI * 2);
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alphaPhase += this.twinkleSpeed;
        this.alpha = Math.max(0, this.alpha - this.alphaDecay);
        this.radius = this.radius * this.alpha;
        this.life--;
    }
    draw() {
        if (this.alpha <= 0) return;
        ctx.save();
        ctx.beginPath();
        ctx.shadowColor = `rgba(255,255,255,${this.alpha})`;
        ctx.shadowBlur = 12;
        ctx.fillStyle = `rgba(255,255,255,${this.alpha})`;
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    isDead() {
        return this.life <= 0 || this.alpha <= 0;
    }
}

class Meteor {
    constructor() {
        const edge = Math.floor(rand(0, 3)); // 0=top,1=left,2=right
        if (edge === 0) { this.x = rand(0, w); this.y = -20; this.vx = rand(-4, 4); this.vy = rand(6, 10); }
        else if (edge === 1) { this.x = -20; this.y = rand(0, h); this.vx = rand(6, 10); this.vy = rand(-2, 2); }
        else { this.x = w + 20; this.y = rand(0, h); this.vx = rand(-10, -6); this.vy = rand(-2, 2); }

        this.radius = rand(2.5, 4);
        this.alpha = 1;
        this.tailLength = rand(30, 60);
        this.history = [];
        this.dead = false;
    }
    update() {
        if (this.dead) return;
        this.x += this.vx;
        this.y += this.vy;
        this.history.push({ x: this.x, y: this.y });
        if (this.history.length > this.tailLength) this.history.shift();
        if (this.x < -50 || this.x > w + 50 || this.y > h + 50 || this.y < -50) {
            this.dead = true;
            spawnExplosion(this.x, this.y);
        }
    }
    draw() {
        if (this.dead) return;
        ctx.save();
        ctx.lineCap = 'round';
        for (let i = this.history.length - 1; i > 0; i--) {
            const pos = this.history[i];
            const prev = this.history[i - 1];
            const alpha = i / this.history.length * 0.5;
            ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
        }
        ctx.restore();

        ctx.save();
        ctx.beginPath();
        ctx.shadowColor = `rgba(255,255,255,1)`;
        ctx.shadowBlur = 15;
        ctx.fillStyle = `rgba(255,255,255,${this.alpha})`;
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    isDead() { return this.dead; }
}

class ExplosionParticle {
    constructor(x, y) {
        this.x = x; this.y = y;
        this.vx = rand(-3, 3); this.vy = rand(-3, 3);
        this.radius = rand(0.5, 1.2); this.life = 30;
        this.alpha = 1; this.alphaDecay = 1 / this.life;
    }
    update() { this.x += this.vx; this.y += this.vy; this.alpha -= this.alphaDecay; this.life--; }
    draw() { 
        if (this.alpha <= 0) return;
        ctx.save();
        ctx.beginPath();
        ctx.shadowColor = `rgba(255,255,255,${this.alpha})`;
        ctx.shadowBlur = 8;
        ctx.fillStyle = `rgba(255,255,255,${this.alpha})`;
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    isDead() { return this.life <= 0 || this.alpha <= 0; }
}

function spawnExplosion(x, y) {
    for (let i = 0; i < 20; i++) particles.push(new ExplosionParticle(x, y));
}

// ----- Draw lines between nearby particles & mouse ----- //
function drawLines() {
    const maxDistance = 120;
    for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
            const p2 = particles[j];
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < maxDistance) {
                const alpha = 1 - dist / maxDistance;
                ctx.save();
                ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.3})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
                ctx.restore();
            }
        }

        /*if (mouse.x !== null && mouse.y !== null) {
            const dx = p1.x - mouse.x;
            const dy = p1.y - mouse.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < maxDistance) {
                const alpha = 1 - dist / maxDistance;
                ctx.save();
                ctx.strokeStyle = `rgba(255,255,255,${alpha * 0.4})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(mouse.x, mouse.y);
                ctx.stroke();
                ctx.restore();
            }
        }*/
    }
}

// ----- Initialize & Animate ----- //
function init() {
    particles.length = 0;
    for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Star());
}

function animate() {
    ctx.fillStyle = 'rgba(10,10,20,1)';
    ctx.fillRect(0, 0, w, h);

    if (Math.random() < 0.008) particles.push(new Meteor());

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.update();
        if (p.isDead && p.isDead()) particles.splice(i, 1);
        else p.draw();
    }

    drawLines();
    requestAnimationFrame(animate);
}

function resize() {
    w = canvas.width = innerWidth;
    h = canvas.height = innerHeight;
    init();
}

window.addEventListener('resize', resize);

init();
animate();

// ----- GSAP Animations ----- //
document.addEventListener("DOMContentLoaded", () => {
  gsap.from(".hero-left", { opacity: 0, x: -50, duration: 1.2, ease: "power3.out" });
  gsap.from(".profile-card", { opacity: 0, x: 50, duration: 1.2, delay: 0.3, ease: "power3.out" });

  gsap.utils.toArray(".section-title").forEach((title, i) => {
    gsap.from(title, { scrollTrigger: { trigger: title, start: "top 80%" }, opacity: 0, y: 30, duration: 0.8, delay: i * 0.1 });
  });

  gsap.utils.toArray(".project-card").forEach((card, i) => {
    gsap.from(card, { scrollTrigger: { trigger: card, start: "top 85%" }, opacity: 0, y: 50, duration: 0.8, delay: i * 0.15 });
  });
});
