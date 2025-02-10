class AudioManager {
    constructor() {
        this.sounds = {
            move: new Audio('resource/sounds/move.mp3'),
            eat: new Audio('resource/sounds/eat.mp3'),
            collision: new Audio('resource/sounds/collision.mp3'),
            gameOver: new Audio('resource/sounds/gameover.mp3'),
            victory: new Audio('resource/sounds/victory.mp3')
        };

        // 加载背景音乐
        this.bgm = new Audio('resource/sounds/bgm.mp3');
        this.bgm.loop = true; // 设置循环播放
        this.bgm.volume = 0.2; // 设置背景音乐音量

        // 设置默认音量
        this.setVolume(0.5);

        // 移动音效节流控制
        this.lastMoveSoundTime = 0;
        this.moveThrottleTime = 100; // 100ms的节流时间
    }

    setVolume(volume) {
        Object.values(this.sounds).forEach(sound => {
            sound.volume = volume;
        });
    }

    playMove() {
        const currentTime = Date.now();
        if (currentTime - this.lastMoveSoundTime > this.moveThrottleTime) {
            this.sounds.move.play().catch(e => { });
            this.lastMoveSoundTime = currentTime;
        }
    }

    playEat() {
        this.sounds.eat.volume = 0.3; // 吃到食物的音效音量稍微调小
        this.sounds.eat.play().catch(e => console.log('音效播放失败:', e));
    }

    playMatch() {
        const matchSound = new Audio(this.sounds.eat);
        matchSound.volume = 0.3;
        matchSound.play().catch(e => console.log('音效播放失败:', e));
    }

    playCollision() {
        this.sounds.collision.play().catch(e => console.log('音效播放失败:', e));
    }

    playGameOver() {
        // 先播放碰撞音效，然后延迟播放游戏结束音效
        this.playCollision();
        setTimeout(() => {
            this.sounds.gameOver.play().catch(e => console.log('音效播放失败:', e));
        }, 500);
    }

    playVictory() {
        this.bgm.pause(); // 停止背景音乐
        this.sounds.victory.play().catch(e => console.log('音效播放失败:', e));
    }

    startBGM() {
        this.bgm.play().catch(e => console.log('背景音乐播放失败:', e));
    }

    stopBGM() {
        this.bgm.pause();
        this.bgm.currentTime = 0;
    }
}

export default AudioManager;