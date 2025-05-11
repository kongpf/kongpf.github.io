function openAd(handle) {
    handle()
    return
    window.h5api.playAd(callback);

    /**
     * 此callback回调函数的形式
     *
     * @param obj  广告状态
     */
    function callback(obj) {
        console.log("代码:" + obj.code + ",消息:" + obj.message);
        if (obj.code === 10000) {
            console.log("开始播放");
        } else if (obj.code === 10001) {
            console.log("播放结束");
            handle()
            // SceneManger.getInstance().openScene(SceneManger.GAME);
        } else {
            console.log("广告异常");
        }
    }
}
function moreGame() {
    window.h5api.showRecommend();
}
function saveToRank(score){
    window.h5api.submitRankScore(1070,score,function(){
        setTimeout(function(){
            window.h5api.showRankList();
        },1000);
    });
}
function showRank() {
    window.h5api.showRankList();
}
var gameName = "泡泡排序";
function loadSound() {
    createjs.Sound.alternateExtensions = ["mp3"];
    createjs.Sound.registerSound("up.mp3", "up");
    createjs.Sound.registerSound("down.mp3", "down");
    createjs.Sound.registerSound("back.mp3", "back");
}
