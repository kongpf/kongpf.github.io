class Snake {
    constructor() {
        // 计算场地中心位置（假设场地大小为30x20）
        const centerX = 15;
        const centerY = 10;
        const startSegmentsLength = 5;
        
        // 初始化蛇头在中心位置
        this.segments = [{ x: centerX, y: centerY }];
        
        // 生成初始10节蛇身
        for (let i = 0; i < startSegmentsLength; i++) { // 已经有一个头部，所以只需要再加9节
            this.segments.push({ x: centerX - (i + 1), y: centerY }); // 向左延伸蛇身
        }

        this.direction = 'right';
        this.nextDirection = 'right';
        this.targetPosition = null;
        this.segmentSpacing = 2.5;
        this.pathPoints = [];
        this.pathMaxLength = 500;
        this.updateInterval = 2;
        this.frameCount = 0;
    }

    update() {
        // 检查是否为反向移动
        if ((this.direction === 'right' && this.nextDirection === 'left') ||
            (this.direction === 'left' && this.nextDirection === 'right') ||
            (this.direction === 'up' && this.nextDirection === 'down') ||
            (this.direction === 'down' && this.nextDirection === 'up')) {
            // 如果是反向移动，保持当前方向
            this.nextDirection = this.direction;
        }

        const head = this.segments[0];

        if (!this.targetPosition) {
            const newHead = { ...head };
            // 在转向时增加一个小的偏移量，避免误碰到身体
            const turnOffset = 0.2;
            switch (this.direction) {
                case 'up': 
                    newHead.y--; 
                    if (this.nextDirection === 'left') newHead.x += turnOffset;
                    if (this.nextDirection === 'right') newHead.x -= turnOffset;
                    break;
                case 'down': 
                    newHead.y++; 
                    if (this.nextDirection === 'left') newHead.x += turnOffset;
                    if (this.nextDirection === 'right') newHead.x -= turnOffset;
                    break;
                case 'left': 
                    newHead.x--; 
                    if (this.nextDirection === 'up') newHead.y += turnOffset;
                    if (this.nextDirection === 'down') newHead.y -= turnOffset;
                    break;
                case 'right': 
                    newHead.x++; 
                    if (this.nextDirection === 'up') newHead.y += turnOffset;
                    if (this.nextDirection === 'down') newHead.y -= turnOffset;
                    break;
            }
            this.targetPosition = newHead;
            return; // 添加return语句，确保在设置targetPosition后立即返回
        }

        const speed = 0.1; // 降低移动速度
        const dx = this.targetPosition.x - head.x;
        const dy = this.targetPosition.y - head.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            head.x += (dx / distance) * speed;
            head.y += (dy / distance) * speed;

            // 优化路径点更新逻辑
            this.frameCount++;
            if (this.frameCount >= this.updateInterval) {
                this.frameCount = 0;
                // 只在移动距离足够时添加路径点
                if (this.pathPoints.length === 0 ||
                    Math.abs(head.x - this.pathPoints[0].x) > 0.1 ||
                    Math.abs(head.y - this.pathPoints[0].y) > 0.1) {
                    this.pathPoints.unshift({ x: head.x, y: head.y });
                    if (this.pathPoints.length > this.pathMaxLength) {
                        this.pathPoints.pop();
                    }
                }
            }
        }

        // 优化蛇身跟随逻辑
        for (let i = 1; i < this.segments.length; i++) {
            const segment = this.segments[i];
            const pathIndex = Math.floor(i * this.segmentSpacing * 2); // 减小间距系数

            if (pathIndex < this.pathPoints.length) {
                const targetPoint = this.pathPoints[pathIndex];
                const segmentSpeed = speed * 3; // 调整跟随速度

                // 使用线性插值让片段移向目标位置
                segment.x += (targetPoint.x - segment.x) * segmentSpeed;
                segment.y += (targetPoint.y - segment.y) * segmentSpeed;
            }
        }

        // 优化目标位置到达判定
        if (Math.abs(head.x - this.targetPosition.x) < 0.05 &&
            Math.abs(head.y - this.targetPosition.y) < 0.05) {
            head.x = this.targetPosition.x;
            head.y = this.targetPosition.y;
            this.targetPosition = null;
            this.direction = this.nextDirection;
        }
    }
}

export default Snake;