class GameState {
    constructor(canvas, gridSize, snake) {
        this.canvas = canvas;
        this.gridSize = gridSize;
        this.snake = snake;
        this.isGameOver = false;
        this.invincibleTime = 0;
        this.score = 0;
        this.targetScore = 100;

        // 初始化宝石系统
        this.initialGemCount = 30;
        this.activeGems = [];
        for (let i = 0; i < this.initialGemCount; i++) {
            this.activeGems.push(this.generateGem());
        }
        this.generateScorePanel();

        // 初始化蛇身颜色数组，确保不会有三个相邻的同色节点
        this.snakeColors = ['green']; // 蛇头为绿色
        const colors = ['red', 'blue', 'green'];
        for (let i = 0; i < 9; i++) { // 为剩余9节身体设置颜色
            let availableColors = [...colors];
            // 如果已经有两个相邻的同色节点，则移除该颜色选项
            if (i >= 1 && this.snakeColors[i] === this.snakeColors[i - 1]) {
                availableColors = availableColors.filter(color => color !== this.snakeColors[i]);
            }
            const randomColor = availableColors[Math.floor(Math.random() * availableColors.length)];
            this.snakeColors.push(randomColor);
        }

        // 粒子效果
        this.particles = null;
    }

    generateScorePanel(){
        document.getElementById('targetScore').textContent = `目标: ${this.targetScore}`;
    }

    generateGem() {
        const gem = {
            x: Math.floor(Math.random() * (this.canvas.width / this.gridSize)),
            y: Math.floor(Math.random() * (this.canvas.height / this.gridSize)),
            type: ['red', 'blue', 'green'][Math.floor(Math.random() * 3)]
        };

        // 确保宝石不会出现在蛇身上或其他宝石上
        const isOverlapping = this.snake.segments.some(segment =>
            segment.x === gem.x && segment.y === gem.y
        ) || this.activeGems.some(existingGem =>
            existingGem.x === gem.x && existingGem.y === gem.y
        );

        return isOverlapping ? this.generateGem() : gem;
    }

    checkCollision(snake) {
        const head = snake.segments[0];

        // 检查是否撞墙
        if (head.x < 0 || head.x >= (this.canvas.width / this.gridSize) ||
            head.y < 0 || head.y >= (this.canvas.height / this.gridSize)) {
            return true;
        }

        // 检查是否撞到自己
        for (let i = 1; i < snake.segments.length; i++) {
            const segment = snake.segments[i];
            const collisionTolerance = 0.2;
            if (Math.abs(head.x - segment.x) < collisionTolerance &&
                Math.abs(head.y - segment.y) < collisionTolerance) {
                return true;
            }
        }

        return false;
    }

    /**
     * 检查并移除匹配的节点
     * @returns 
     */
    checkAndRemoveMatches() {
        const colors = this.snakeColors;
        let matches = [];

        // 从第二个节点开始查找三个相同颜色的相邻节，确保不会消除蛇头
        for (let i = 1; i < colors.length - 2; i++) {
            if (colors[i] === colors[i + 1] && colors[i] === colors[i + 2]) {
                matches.push(i);
            }
        }

        if (matches.length > 0) {
            // 从蛇身和颜色数组中移除匹配的节
            matches.reverse().forEach(startIndex => {
                // 修正：从startIndex开始删除3个节点
                const segments = this.snake.segments.slice(startIndex, startIndex + 3);
                
                // 为每个被消除的节点创建独立的粒子效果
                segments.forEach((segment, index) => {
                    const matchParticles = this.createMatchParticles(segment.x, segment.y, this.snakeColors[startIndex + index]);
                    if (!this.particles) {
                        this.particles = [];
                    }
                    this.particles.push(...matchParticles);
                });

                // 删除节点和更新颜色数组
                this.snake.segments.splice(startIndex, 3);
                this.snakeColors.splice(startIndex, 3);
                this.score += 10; // 每次三消增加10分

                // 创建得分特效
                const scorePopup = document.createElement('div');
                scorePopup.className = 'score-popup';
                scorePopup.textContent = '+10';
                scorePopup.style.left = `${segments[0].x * this.gridSize}px`;
                scorePopup.style.top = `${segments[0].y * this.gridSize}px`;
                document.getElementById('gameContainer').appendChild(scorePopup);

                // 更新状态栏得分
                document.getElementById('currentScore').textContent = `得分: ${this.score}`;
                const progressBar = document.getElementById('progressBar');
                progressBar.style.width = `${(this.score / this.targetScore) * 100}%`;

                // 移除得分特效
                setTimeout(() => scorePopup.remove(), 1000);
            });

            return true;
        }

        return false;
    }

    createMatchParticles(x, y, color) {
        const particles = [];
        const particleCount = 20; // 增加粒子数量
        const colorMap = {
            'red': '#FF4444',
            'blue': '#4444FF',
            'green': '#44FF44'
        };

        // 创建爆炸效果的粒子
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = 3 + Math.random() * 4; // 增加粒子速度
            const size = Math.random() * 4 + 3; // 增加粒子大小
            particles.push({
                x: x * this.gridSize + this.gridSize / 2,
                y: y * this.gridSize + this.gridSize / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                color: colorMap[color] || '#FFFFFF',
                size: size,
                alpha: 1.0,
                decay: 0.02 + Math.random() * 0.02 // 添加衰减速率
            });
        }

        // 添加一些较小的闪光粒子
        for (let i = 0; i < particleCount / 2; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 2;
            particles.push({
                x: x * this.gridSize + this.gridSize / 2,
                y: y * this.gridSize + this.gridSize / 2,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.8,
                color: '#FFFFFF',
                size: Math.random() * 2 + 1,
                alpha: 0.8,
                decay: 0.04 + Math.random() * 0.02
            });
        }

        return particles;
    }

    createParticles(x, y) {
        const particles = [];
        for (let i = 0; i < 5; i++) {
            particles.push({
                x: x * this.gridSize + this.gridSize / 2,
                y: y * this.gridSize + this.gridSize / 2,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                life: 0.8
            });
        }
        return particles;
    }

    updateParticles() {
        if (this.particles) {
            this.particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                p.life -= p.decay || 0.05;
                if (p.alpha) {
                    p.alpha = Math.max(0, p.alpha - (p.decay || 0.05));
                }
            });
            this.particles = this.particles.filter(p => p.life > 0);
        }
    }

    updateInvincibleTime() {
        if (this.invincibleTime > 0) {
            this.invincibleTime -= 1 / 60; // 60 FPS下每帧减少的时间
        }
    }

    checkGemCollision(snake) {
        const head = snake.segments[0];
        const eatenGemIndex = this.activeGems.findIndex(gem =>
            Math.abs(head.x - gem.x) < 0.8 && Math.abs(head.y - gem.y) < 0.8
        );

        return eatenGemIndex;
    }

    addSnakeSegment(snake, eatenGem) {
        const head = snake.segments[0];
        const newSegment = { ...head };

        // 将新节点插入到蛇头后面（索引1的位置）
        snake.segments.splice(1, 0, newSegment);
        this.snakeColors.splice(1, 0, eatenGem.type);
    }

    createVictoryParticles() {
        const particles = [];
        const imageTypes = ['head', 'body', 'tail', 'green'];
        for (let i = 0; i < 50; i++) {
            particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 5,
                vy: (Math.random() - 0.5) * 5,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 4,
                imageType: imageTypes[Math.floor(Math.random() * imageTypes.length)],
                scale: Math.random() * 0.5 + 0.5
            });
        }
        return particles;
    }

    createGameOverParticles() {
        const particles = [];
        const imageTypes = ['head', 'body', 'tail', 'green'];
        for (let i = 0; i < 30; i++) {
            particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 3,
                vy: (Math.random() - 0.5) * 3,
                rotation: Math.random() * 360,
                rotationSpeed: (Math.random() - 0.5) * 2,
                imageType: imageTypes[Math.floor(Math.random() * imageTypes.length)],
                scale: Math.random() * 0.3 + 0.3,
                opacity: 1
            });
        }
        return particles;
    }
}

export default GameState;