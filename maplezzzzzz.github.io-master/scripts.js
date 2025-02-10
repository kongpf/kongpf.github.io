document.addEventListener('DOMContentLoaded', function () {
    // 游戏弹窗相关功能
    const modal = document.querySelector('.game-modal');
    const iframe = document.querySelector('.game-iframe');
    const closeBtn = document.querySelector('.close-game');
    const playButtons = document.querySelectorAll('.play-button');

    // 打开游戏
    playButtons.forEach(button => {
        button.addEventListener('click', function (e) {
            e.preventDefault();
            const gameUrl = this.getAttribute('data-game-url');
            if (gameUrl) {
                iframe.src = gameUrl;
                modal.classList.add('active');
                document.body.classList.add('modal-open');
            }
        });
    });

    // 关闭游戏
    function closeModal() {
        modal.classList.remove('active');
        iframe.src = '';
        document.body.classList.remove('modal-open');
    }

    closeBtn.addEventListener('click', closeModal);

    // 点击外部关闭
    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            closeModal();
        }
    });

    // ESC键关闭
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });
}); 