class GameRenderer {
    constructor(canvas, gridSize, images) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.gridSize = gridSize;
        this.images = images;

        // 启用图像平滑
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    drawSnake(snake, snakeColors) {
        snake.segments.forEach((segment, index) => {
            const x = segment.x * this.gridSize;
            const y = segment.y * this.gridSize;

            this.ctx.save();
            this.ctx.translate(x + this.gridSize / 2, y + this.gridSize / 2);

            const rotation = this.getSegmentRotation(snake, index);
            this.ctx.rotate(rotation * Math.PI / 180);

            // 设置基础阴影效果
            this.ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
            this.ctx.shadowBlur = 5;
            this.ctx.shadowOffsetX = 2;
            this.ctx.shadowOffsetY = 2;

            let img;
            let scale = 1.0;

            if (index === 0) {
                img = this.images.head;
            } else if (snakeColors[index]) {
                img = this.images[`body_${snakeColors[index]}`] || this.images.body;

                // 为第一节蛇身添加特效
                if (index === 1 || (index === 2 && snakeColors[1] === snakeColors[2])) {
                    // scale = 1.2;
                    // const strokeColor = snakeColors[index] === 'red' ? '#ffa8a8' : snakeColors[index] === 'blue' ? '#a6e0ff' : '#fbffa5';
                    const strokeColor = "#55555";
                    // 绘制描边
                    this.ctx.strokeStyle = strokeColor;
                    this.ctx.lineWidth = 4;
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, this.gridSize / 2, 0, Math.PI * 2);
                    this.ctx.stroke();

                }
            } else {
                img = this.images.body;
            }
            // 添加发光效果
            this.ctx.shadowColor = "#333333"
            this.ctx.shadowBlur = 5;

            // 应用缩放
            this.ctx.scale(scale, scale);

            this.ctx.drawImage(img,
                -this.gridSize / 2, -this.gridSize / 2,
                this.gridSize, this.gridSize
            );

            this.ctx.restore();
        });
    }

    drawGems(gems) {
        gems.forEach(gem => {
            const gemX = gem.x * this.gridSize;
            const gemY = gem.y * this.gridSize;
            const strokeColor = gem.type === 'red' ? '#9e0000' : gem.type === 'blue' ? '#00559e' : '#a27900';
            this.ctx.shadowColor = strokeColor;
            this.ctx.shadowBlur = 5;
            this.ctx.drawImage(this.images[gem.type],
                gemX, gemY,
                this.gridSize, this.gridSize
            );
            this.ctx.restore();
        });
    }

    drawParticles(particles) {
        if (particles && particles.length > 0) {
            particles.forEach(p => {
                this.ctx.save();
                this.ctx.globalAlpha = p.alpha || 1.0;
                this.ctx.fillStyle = p.color || 'rgba(255, 87, 34, 0.6)';
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size || 2, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.restore();
            });
        }
    }

    drawVictoryScreen(score, victoryParticles) {
        this.clearCanvas();

        // 绘制渐变背景
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        gradient.addColorStop(0, '#4A148C');
        gradient.addColorStop(1, '#311B92');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制粒子
        this.drawVictoryParticles(victoryParticles);

        // 绘制文本和按钮
        this.drawVictoryText(score);
    }

    drawGameOverScreen(score, targetScore, gameOverParticles) {
        this.clearCanvas();

        // 绘制渐变背景
        const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
        gradient.addColorStop(0, '#B71C1C');
        gradient.addColorStop(1, '#880E4F');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制粒子
        this.drawGameOverParticles(gameOverParticles);

        // 绘制文本和按钮
        this.drawGameOverText(score, targetScore);
    }

    getSegmentRotation(snake, index) {
        const segments = snake.segments;
        const current = segments[index];
        let angle = 0;

        if (index === 0) {
            switch (snake.direction) {
                case 'right': angle = 0; break;
                case 'down': angle = 90; break;
                case 'left': angle = 180; break;
                case 'up': angle = 270; break;
            }
        } else if (index === segments.length - 1) {
            const prev = segments[segments.length - 2];
            const dx = prev.x - current.x;
            const dy = prev.y - current.y;

            if (Math.abs(dx) > Math.abs(dy)) {
                angle = dx > 0 ? 0 : 180;
            } else {
                angle = dy > 0 ? 90 : 270;
            }
        } else {
            const prev = segments[index - 1];
            const next = segments[index + 1];

            if (prev && next) {
                const dx = next.x - prev.x;
                const dy = next.y - prev.y;

                if (Math.abs(dx) < 0.1) {
                    angle = 90;
                } else if (Math.abs(dy) < 0.1) {
                    angle = 0;
                } else {
                    const prevToCurrent = {
                        x: current.x - prev.x,
                        y: current.y - prev.y
                    };
                    const currentToNext = {
                        x: next.x - current.x,
                        y: next.y - current.y
                    };

                    if (prevToCurrent.x > 0 && currentToNext.y > 0 ||
                        prevToCurrent.y > 0 && currentToNext.x < 0) {
                        angle = 90;
                    } else if (prevToCurrent.x > 0 && currentToNext.y < 0 ||
                        prevToCurrent.y < 0 && currentToNext.x < 0) {
                        angle = 180;
                    } else if (prevToCurrent.x < 0 && currentToNext.y < 0 ||
                        prevToCurrent.y < 0 && currentToNext.x > 0) {
                        angle = 270;
                    } else {
                        angle = 0;
                    }
                }
            }
        }

        return angle;
    }

    drawVictoryParticles(particles) {
        particles.forEach(p => {
            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.rotation * Math.PI / 180);
            this.ctx.scale(p.scale, p.scale);

            const img = this.images[p.imageType];
            this.ctx.drawImage(img, -this.gridSize / 2, -this.gridSize / 2, this.gridSize, this.gridSize);

            this.ctx.restore();
        });
    }

    drawVictoryText(score) {
        const time = Date.now() * 0.001;
        const glowIntensity = (Math.sin(time * 2) + 1) * 0.5;
        this.ctx.shadowColor = `rgba(255, 215, 0, ${glowIntensity})`;
        this.ctx.shadowBlur = 20;

        this.ctx.font = 'bold 64px "Segoe UI", Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        const textGradient = this.createTextGradient('#FFD700', '#FFF176', '#FFD700');
        this.ctx.fillStyle = textGradient;
        this.ctx.fillText('胜利！', this.canvas.width / 2, this.canvas.height / 2 - 50);

        this.ctx.font = 'bold 32px "Segoe UI", Arial';
        this.ctx.fillStyle = '#FFF176';
        this.ctx.fillText(`最终得分: ${score}`, this.canvas.width / 2, this.canvas.height / 2 + 20);

        this.drawRestartButton('再来一局', '#4CAF50', '#388E3C');
    }

    drawGameOverParticles(particles) {
        particles.forEach(p => {
            this.ctx.save();
            this.ctx.globalAlpha = p.opacity;
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.rotation * Math.PI / 180);
            this.ctx.scale(p.scale, p.scale);

            const img = this.images[p.imageType];
            this.ctx.drawImage(img, -this.gridSize / 2, -this.gridSize / 2, this.gridSize, this.gridSize);

            this.ctx.restore();
        });
    }

    drawGameOverText(score, targetScore) {
        const time = Date.now() * 0.001;
        const glowIntensity = (Math.sin(time * 2) + 1) * 0.5;
        this.ctx.shadowColor = `rgba(255, 0, 0, ${glowIntensity})`;
        this.ctx.shadowBlur = 20;

        this.ctx.font = 'bold 64px "Segoe UI", Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';

        const textGradient = this.createTextGradient('#FF5252', '#FFCDD2', '#FF5252');
        this.ctx.fillStyle = textGradient;
        this.ctx.fillText('游戏结束', this.canvas.width / 2, this.canvas.height / 2 - 50);

        this.ctx.font = 'bold 32px "Segoe UI", Arial';
        this.ctx.fillStyle = '#FFCDD2';
        this.ctx.fillText(`得分: ${score} / ${targetScore}`, this.canvas.width / 2, this.canvas.height / 2 + 20);

        this.drawRestartButton('重试', '#D32F2F', '#B71C1C');
    }

    drawRestartButton(text, gradientStart, gradientEnd) {
        const buttonWidth = 220;
        const buttonHeight = 60;
        const buttonX = (this.canvas.width - buttonWidth) / 2;
        const buttonY = this.canvas.height / 2 + 80;
        const cornerRadius = 30;

        // 绘制按钮阴影
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;

        // 绘制按钮背景
        this.roundRect(buttonX, buttonY, buttonWidth, buttonHeight, cornerRadius);
        const buttonGradient = this.ctx.createLinearGradient(buttonX, buttonY, buttonX, buttonY + buttonHeight);
        buttonGradient.addColorStop(0, gradientStart);
        buttonGradient.addColorStop(1, gradientEnd);
        this.ctx.fillStyle = buttonGradient;
        this.ctx.fill();

        // 重置阴影
        this.ctx.shadowColor = 'transparent';
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;

        // 绘制按钮文字
        this.ctx.font = 'bold 24px "Segoe UI", Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.fillText(text, this.canvas.width / 2, buttonY + buttonHeight / 2);
    }

    createTextGradient(color1, color2, color3) {
        const textGradient = this.ctx.createLinearGradient(
            this.canvas.width / 2 - 100,
            this.canvas.height / 2 - 50,
            this.canvas.width / 2 + 100,
            this.canvas.height / 2 + 50
        );
        textGradient.addColorStop(0, color1);
        textGradient.addColorStop(0.5, color2);
        textGradient.addColorStop(1, color3);
        return textGradient;
    }

    roundRect(x, y, width, height, radius) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
    }
}

export default GameRenderer;