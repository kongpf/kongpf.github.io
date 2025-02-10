import Snake from './snake.js';
import GameRenderer from './renderer.js';
import AudioManager from './audio.js';
import GameState from './state.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.setupCanvas();

        // 初始化游戏组件
        this.snake = new Snake();
        this.audioManager = new AudioManager();
        this.gameState = new GameState(this.canvas, this.gridSize, this.snake);
        this.renderer = new GameRenderer(this.canvas, this.gridSize, this.loadImages());

        // 设置控制
        this.setupControls();
    }

    setupCanvas() {
        // 检测是否为移动设备
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        if (this.isMobile) {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.setupMobileDisplay();
            this.gridSize = Math.min(this.canvas.width, this.canvas.height) / 20;
        } else {
            this.canvas.width = 600;
            this.canvas.height = 400;
            this.gridSize = 20;
        }
    }

    setupMobileDisplay() {
        document.documentElement.style.overflow = 'hidden';
        document.body.style.overflow = 'hidden';
        document.body.style.margin = '0';
        document.body.style.padding = '0';

        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.gridSize = Math.min(this.canvas.width, this.canvas.height) / 20;
        });
    }

    loadImages() {
        const images = {
            head: new Image(),
            body: new Image(),
            tail: new Image(),
            red: new Image(),
            blue: new Image(),
            green: new Image(),
            body_red: new Image(),
            body_blue: new Image(),
            body_green: new Image()
        };

        // 设置图片源
        images.head.src = 'images/head1.png';
        images.body.src = 'images/body1.png';
        images.tail.src = 'images/tail1.png';
        images.red.src = 'images/红宝石.png';
        images.blue.src = 'images/蓝宝石.png';
        images.green.src = 'images/黄宝石.png';
        images.body_red.src = 'images/body-r.png';
        images.body_blue.src = 'images/body-b.png';
        images.body_green.src = 'images/body-y.png';

        // 等待所有图片加载完成
        Promise.all(Object.values(images).map(img => {
            return new Promise((resolve) => {
                img.onload = resolve;
            });
        })).then(() => {
            this.imagesLoaded = true;
        });

        return images;
    }

    setupControls() {
        // 键盘控制
        document.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'ArrowUp':
                case 'ArrowDown':
                case 'ArrowLeft':
                case 'ArrowRight':
                    e.preventDefault(); // 阻止方向键的默认滚动行为
                    this.snake.nextDirection = e.key.toLowerCase().replace('arrow', ''); 
                    break;
            }
        });

        // 鼠标和触摸控制
        this.setupPointerControls();
    }

    setupPointerControls() {
        this.isMouseDown = false;

        // 鼠标控制
        this.canvas.addEventListener('mousedown', (e) => {
            this.isMouseDown = true;
            this.handlePointerMove(e.clientX, e.clientY);
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isMouseDown) {
                this.handlePointerMove(e.clientX, e.clientY);
            }
        });

        this.canvas.addEventListener('mouseup', () => this.isMouseDown = false);
        this.canvas.addEventListener('mouseleave', () => this.isMouseDown = false);

        // 触摸控制
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
        });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
        });
    }

    handlePointerMove(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;

        const head = this.snake.segments[0];
        const deltaX = x - head.x * this.gridSize;
        const deltaY = y - head.y * this.gridSize;

        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            this.snake.nextDirection = deltaX > 0 ? 'right' : 'left';
        } else {
            this.snake.nextDirection = deltaY > 0 ? 'down' : 'up';
        }
    }

    update() {
        if (this.gameState.isGameOver) return;

        this.snake.update();
        this.audioManager.playMove();

        // 检查宝石碰撞
        const eatenGemIndex = this.gameState.checkGemCollision(this.snake);
        if (eatenGemIndex !== -1) {
            this.handleGemCollision(eatenGemIndex);
        }

        // 更新游戏状态
        this.gameState.updateInvincibleTime();
        this.gameState.updateParticles();

        // 检查分数是否达到目标
        if (this.gameState.score >= this.gameState.targetScore) {
            this.victory();
            return;
        }

        // 检查碰撞
        if (this.gameState.invincibleTime <= 0 && this.gameState.checkCollision(this.snake)) {
            this.audioManager.playGameOver();
            this.gameOver();
        }
    }

    handleGemCollision(eatenGemIndex) {
        const eatenGem = this.gameState.activeGems[eatenGemIndex];
        this.audioManager.playEat();

        // 增加蛇的长度
        this.gameState.addSnakeSegment(this.snake, eatenGem);

        // 检查并消除三个相同颜色的相邻节
        if (this.gameState.checkAndRemoveMatches()) {
            this.audioManager.playMatch();
        }

        // 更新宝石
        this.gameState.activeGems.splice(eatenGemIndex, 1);
        this.gameState.activeGems.push(this.gameState.generateGem());

        // 添加特效
        this.gameState.invincibleTime = 0.5;
        this.gameState.particles = this.gameState.createParticles(eatenGem.x, eatenGem.y);

    }

    createScorePopup(head) {
        const scorePopup = document.createElement('div');
        scorePopup.className = 'score-popup';
        scorePopup.textContent = '+10';
        scorePopup.style.left = `${head.x * this.gridSize}px`;
        scorePopup.style.top = `${head.y * this.gridSize}px`;
        document.getElementById('gameContainer').appendChild(scorePopup);

        setTimeout(() => scorePopup.remove(), 1000);
    }

    victory() {
        this.gameState.isGameOver = true;
        clearInterval(this.gameLoop);
        this.audioManager.playVictory();

        let opacity = 1;
        const fadeOut = () => {
            opacity -= 0.02;
            this.renderer.clearCanvas();
            this.renderer.ctx.fillStyle = `rgba(255, 255, 255, ${1 - opacity})`;
            this.renderer.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            if (opacity > 0) {
                requestAnimationFrame(fadeOut);
            } else {
                const victoryParticles = this.gameState.createVictoryParticles();
                const drawVictory = () => {
                    this.renderer.drawVictoryScreen(this.gameState.score, victoryParticles);
                    this.updateVictoryParticles(victoryParticles);
                    this.victoryAnimation = requestAnimationFrame(drawVictory);
                };
                drawVictory();

                // 添加按钮点击事件监听器
                const handleClick = (e) => {
                    const rect = this.canvas.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    const buttonY = this.canvas.height / 2 + 80;

                    if (y >= buttonY && y <= buttonY + 60 &&
                        x >= (this.canvas.width - 220) / 2 &&
                        x <= (this.canvas.width + 220) / 2) {
                        // 清理动画和事件监听器
                        cancelAnimationFrame(this.victoryAnimation);
                        this.canvas.removeEventListener('click', handleClick);
                        // 重置游戏
                        location.reload();
                    }
                };
                this.canvas.addEventListener('click', handleClick);
            }
        };
        fadeOut();
    }

    gameOver() {
        this.gameState.isGameOver = true;
        clearInterval(this.gameLoop);
        this.audioManager.stopBGM(); // 停止背景音乐

        let opacity = 1;
        const fadeOut = () => {
            opacity -= 0.02;
            this.renderer.clearCanvas();
            this.renderer.ctx.fillStyle = `rgba(255, 255, 255, ${1 - opacity})`;
            this.renderer.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            if (opacity > 0) {
                requestAnimationFrame(fadeOut);
            } else {
                const gameOverParticles = this.gameState.createGameOverParticles();
                const drawGameOver = () => {
                    this.renderer.drawGameOverScreen(
                        this.gameState.score,
                        this.gameState.targetScore,
                        gameOverParticles
                    );
                    this.updateGameOverParticles(gameOverParticles);
                    this.gameOverAnimation = requestAnimationFrame(drawGameOver);
                };
                drawGameOver();

                // 添加按钮点击事件监听器
                const handleClick = (e) => {
                    const rect = this.canvas.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    const buttonY = this.canvas.height / 2 + 80;

                    if (y >= buttonY && y <= buttonY + 60 &&
                        x >= (this.canvas.width - 220) / 2 &&
                        x <= (this.canvas.width + 220) / 2) {
                        // 清理动画和事件监听器
                        cancelAnimationFrame(this.gameOverAnimation);
                        this.canvas.removeEventListener('click', handleClick);
                        // 重置游戏
                        location.reload();
                    }
                };
                this.canvas.addEventListener('click', handleClick);
            }
        };
        fadeOut();
    }

    updateVictoryParticles(particles) {
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.rotation += p.rotationSpeed;

            if (p.x < 0 || p.x > this.canvas.width) p.vx *= -1;
            if (p.y < 0 || p.y > this.canvas.height) p.vy *= -1;
        });
    }

    updateGameOverParticles(particles) {
        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.rotation += p.rotationSpeed;

            if (p.x < 0 || p.x > this.canvas.width) p.vx *= -1;
            if (p.y < 0 || p.y > this.canvas.height) p.vy *= -1;
        });
    }

    draw() {
        if (!this.imagesLoaded) return;

        this.renderer.clearCanvas();
        this.renderer.drawSnake(this.snake, this.gameState.snakeColors);
        this.renderer.drawGems(this.gameState.activeGems);
        this.renderer.drawParticles(this.gameState.particles);
    }

    start() {
        if (!this.imagesLoaded) {
            // 等待图片加载完成
            requestAnimationFrame(() => this.start());
            return;
        }

        // 开始播放背景音乐
        this.audioManager.startBGM();
        this.startGameLoop();
    }

    startGameLoop() {
        this.gameLoop = setInterval(() => {
            this.update();
            this.draw();
        }, 1000 / 60); // 60 FPS
    }
}

// 游戏初始化
window.onload = () => {
    const game = new Game();
    document.getElementById('startButton').onclick = () => {
        document.getElementById('startScreen').style.display = 'none';
        game.start();
    };
};