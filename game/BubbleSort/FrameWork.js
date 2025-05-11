var Design = {
    width: 720,
    height: 1280
}
var W = 720;//设备尺寸
var H = 1280;

class Menu extends lib.Menu {
    constructor() {
        super();
        console.log("menu is create");
        //Widget.apply(this)
        this.width = 720;
        this.height = 1280;
        console.log(this)
        this.play_btn.on('click', function () {
            console.log("menu")
            SceneManger.getInstance().openScene(SceneManger.LEVELPANEL);
        });
        this.how_btn.on('click', function () {
            SceneManger.getInstance().openScene(SceneManger.HOWPANEL);
        });
        this.more_btn.on('click', function () {
            //更多接口
            moreGame()
        });
        this.rank_btn.on('click', function () {
            //排行榜接口
            saveToRank(Data.getInstance().getTotalScore())
           // showRank()
        });
        if (GameConfig.debug) {
            this.rest_btn.visible = true
        } else {
            this.rest_btn.visible = false
        }
        this.rest_btn.on('click', function () {
            Data.getInstance().rest();
        });
        Data.getInstance().getDataFromBrower();
        this.init()
    }
    init() {
        this.mouseEnabled = true;
        stage.addChild(this);
        /* var a=new Laya.Text();
        a.text=Laya.stage.width+"----"+Laya.stage.height+";"+Laya.Browser.width+"=="+Laya.Browser.height
        Laya.stage.addChild(a) */
    }
}
class HowPanel extends lib.How {
    constructor() {
        super();
        this.back_btn.on("click", () => {
            this.stop()
            SceneManger.getInstance().openScene(SceneManger.MENU);
        })
        this.init()
    }
    init() {
        this.mouseEnabled = true;
        this.gotoAndPlay(0)
        stage.addChild(this);

    }
}
class GamePanel extends lib.Game {//游戏场景背景
    constructor() {
        super();
        // console.log("game is create");
        if (GameConfig.debug) {
            this.debug.visible = true
        } else {
            this.debug.visible = false
        }
        this.debug.on("click", () => {
            SceneManger.getInstance().openScene(SceneManger.LEVELUP);
        })
        //    Widget.apply(this)
        var container = this.container;
        container.width = W;
        container.height = H;
        container.regX = Design.width / 2;
        container.regY = Design.height / 2;
        container.y = H / 2;
        container.x = W / 2;
        this.time_bar = this.time_bar;
        this.game = new GameMain(this);
        this.init();

    }
    init() {
        this.mouseEnabled = true;
        this.time = 500 + (Data.getInstance().level / 5) * 50;
        this.current_time = 0;
        this.time_bar.gotoAndStop(0);
        this.level_text.text = Data.getInstance().level;
        this.score_text.text = Data.getInstance().score = 0;
        this.game.init();
        stage.addChild(this);

        SceneManger.PAUSED = false;
    }
    onUpdate() {
        // console.log("onupdate")
        if (SceneManger.PAUSED) return
        if (this.time_bar.currentFrame < 99) {
            this.current_time++;
            this.time_bar.gotoAndStop((this.current_time / this.time).toFixed(2) * 100);
        } else {
            SceneManger.PAUSED = true;
            SceneManger.getInstance().openScene(SceneManger.LEVELFAIL);
        }
        this.game.onUpdate()
    }

}
var GameConfig = {
    debug: false,
    levelData: [[0, 0, 0, 1, 2, 0, 1, 2, 2, 1, 2, 1], [0, 0, 0, 4, 0, 3, 3, 4, 4, 3, 3, 4], [0, 0, 0, 1, 0, 2, 2, 2, 1, 1, 1, 2], [8, 4, 0, 0, 5, 8, 0, 0, 5, 4, 8, 4, 5, 5, 8, 4], [7, 0, 0, 9, 8, 0, 0, 8, 9, 7, 9, 8, 7, 7, 9, 8], [0, 0, 2, 2, 0, 1, 1, 3, 0, 2, 3, 3, 1, 2, 1, 3], [4, 6, 0, 0, 6, 5, 4, 0, 4, 5, 6, 0, 5, 5, 6, 4], [0, 7, 0, 0, 8, 9, 0, 8, 7, 9, 8, 9, 7, 9, 8, 7], [1, 0, 2, 0, 1, 1, 3, 0, 2, 3, 2, 0, 3, 3, 2, 1], [6, 0, 0, 0, 6, 5, 5, 0, 4, 4, 4, 5, 6, 6, 4, 5], [8, 0, 8, 7, 7, 0, 9, 7, 9, 0, 9, 8, 7, 0, 9, 8], [2, 0, 3, 0, 1, 0, 2, 3, 1, 0, 2, 3, 1, 3, 2, 1], [5, 0, 0, 0, 4, 0, 5, 5, 4, 6, 6, 6, 4, 5, 4, 6], [7, 9, 9, 0, 9, 8, 9, 0, 8, 7, 8, 0, 7, 7, 8, 0], [2, 0, 2, 3, 0, 1, 2, 4, 4, 0, 1, 3, 3, 4, 0, 1, 3, 1, 4, 2], [6, 0, 7, 0, 8, 5, 7, 7, 0, 6, 5, 8, 8, 0, 6, 5, 5, 8, 7, 6],//16
    [9, 1, 2, 0, 0, 2, 9, 3, 9, 0, 1, 3, 3, 2, 0, 1, 1, 3, 2, 9], [4, 5, 0, 7, 5, 6, 4, 0, 6, 5, 5, 7, 0, 6, 4, 7, 7, 0, 6, 4], [8, 1, 0, 4, 0, 9, 1, 0, 8, 1, 9, 4, 0, 8, 4, 9, 4, 1, 8, 9], [0, 3, 7, 0, 0, 0, 5, 3, 7, 6, 6, 5, 3, 6, 7, 5, 5, 3, 6, 7], [8, 1, 0, 2, 1, 9, 8, 0, 1, 1, 9, 8, 0, 2, 2, 9, 8, 0, 9, 2], [4, 6, 0, 0, 5, 3, 5, 0, 6, 4, 3, 6, 0, 5, 4, 3, 3, 6, 5, 4], [8, 1, 9, 0, 0, 7, 1, 8, 1, 0, 7, 9, 8, 9, 0, 7, 9, 8, 7, 1], [3, 4, 5, 0, 0, 2, 3, 4, 0, 0, 2, 3, 4, 5, 5, 2, 3, 4, 5, 2], [7, 8, 0, 8, 7, 6, 9, 0, 8, 9, 6, 8, 0, 7, 9, 6, 6, 0, 7, 9], [0, 3, 1, 0, 3, 0, 2, 4, 1, 4, 0, 2, 4, 3, 2, 1, 2, 4, 3, 1], [8, 7, 0, 8, 8, 8, 5, 0, 6, 7, 6, 5, 0, 6, 7, 5, 5, 0, 6, 7], [2, 9, 1, 2, 0, 9, 9, 3, 3, 0, 1, 2, 3, 9, 0, 1, 2, 3, 1, 0], [0, 0, 0, 6, 7, 7, 7, 0, 5, 6, 4, 4, 4, 5, 6, 4, 7, 5, 5, 6], [9, 0, 1, 0, 9, 8, 9, 2, 0, 1, 8, 1, 2, 0, 2, 8, 1, 2, 9, 8], [5, 5, 0, 3, 0, 6, 4, 5, 6, 0, 3, 4, 3, 6, 0, 4, 4, 3, 6, 5], [7, 9, 8, 0, 0, 1, 8, 7, 0, 8, 1, 9, 9, 0, 7, 1, 1, 9, 8, 7],//32
    [1, 1, 3, 0, 0, 2, 4, 3, 3, 0, 2, 4, 4, 1, 0, 2, 4, 2, 1, 3], [7, 5, 8, 0, 0, 6, 8, 7, 0, 5, 6, 5, 7, 0, 8, 6, 6, 7, 5, 8], [0, 1, 1, 2, 1, 0, 1, 3, 9, 9, 0, 2, 3, 9, 3, 0, 2, 3, 9, 2], [5, 4, 5, 5, 0, 6, 7, 5, 4, 0, 6, 7, 4, 7, 0, 6, 7, 4, 6, 0], [0, 9, 2, 9, 1, 0, 8, 1, 9, 2, 0, 8, 8, 1, 2, 0, 8, 9, 1, 2], [3, 0, 6, 0, 0, 5, 0, 3, 4, 6, 5, 6, 3, 6, 4, 5, 4, 3, 5, 4], [7, 9, 7, 0, 0, 1, 8, 9, 0, 9, 1, 8, 8, 0, 7, 1, 8, 1, 9, 7], [5, 3, 0, 4, 3, 2, 4, 0, 3, 5, 2, 3, 0, 4, 5, 2, 2, 0, 4, 5], [0, 7, 9, 7, 9, 0, 6, 8, 7, 6, 0, 8, 8, 9, 6, 0, 7, 8, 9, 6], [4, 4, 1, 0, 0, 3, 2, 2, 4, 0, 3, 1, 1, 2, 0, 3, 1, 3, 2, 4], [5, 7, 0, 0, 8, 6, 5, 8, 0, 8, 6, 5, 7, 0, 7, 6, 5, 7, 8, 6], [2, 9, 2, 2, 0, 1, 3, 2, 9, 0, 1, 3, 9, 3, 0, 1, 3, 9, 1, 0], [0, 6, 4, 0, 7, 4, 4, 5, 0, 6, 5, 5, 7, 0, 6, 5, 7, 7, 4, 6], [2, 2, 1, 0, 0, 1, 8, 9, 0, 2, 9, 8, 9, 0, 1, 8, 8, 9, 2, 1], [3, 0, 5, 6, 0, 4, 6, 3, 6, 0, 4, 5, 3, 5, 0, 4, 4, 3, 5, 6], [8, 9, 0, 9, 0, 7, 1, 0, 1, 0, 7, 9, 8, 1, 8, 7, 7, 9, 1, 8],//48
    [1, 2, 0, 5, 2, 0, 4, 3, 2, 1, 5, 0, 4, 3, 5, 1, 3, 0, 4, 3, 5, 1, 4, 2], [1, 7, 0, 0, 0, 0, 9, 6, 8, 1, 8, 7, 9, 6, 6, 8, 7, 1, 9, 6, 9, 8, 7, 1], [4, 0, 4, 0, 0, 0, 2, 6, 3, 5, 5, 6, 2, 4, 3, 6, 3, 5, 2, 4, 3, 6, 2, 5], [7, 7, 0, 2, 7, 2, 9, 8, 0, 1, 7, 8, 9, 1, 0, 1, 2, 8, 9, 9, 0, 1, 2, 8], [5, 4, 5, 5, 5, 0, 6, 3, 7, 4, 7, 0, 6, 3, 3, 7, 4, 0, 6, 3, 6, 7, 4, 0], [7, 7, 8, 9, 0, 0, 1, 8, 2, 2, 0, 7, 1, 9, 9, 2, 0, 8, 1, 9, 1, 2, 7, 8], [3, 5, 0, 6, 5, 0, 4, 7, 6, 6, 3, 0, 4, 7, 7, 5, 3, 0, 4, 7, 4, 5, 3, 6], [9, 3, 3, 1, 3, 0, 8, 2, 3, 9, 1, 0, 8, 2, 1, 9, 2, 0, 8, 2, 1, 9, 8, 0], [4, 4, 7, 7, 4, 0, 8, 6, 5, 8, 4, 0, 6, 7, 5, 8, 6, 0, 5, 7, 5, 8, 6, 0], [1, 8, 0, 9, 0, 0, 8, 2, 0, 1, 3, 9, 8, 2, 3, 1, 9, 3, 8, 2, 9, 1, 2, 3], [4, 8, 5, 7, 0, 0, 6, 4, 8, 5, 0, 8, 6, 4, 7, 7, 0, 5, 6, 4, 7, 6, 8, 5], [4, 9, 0, 0, 0, 0, 1, 3, 2, 9, 2, 4, 1, 3, 3, 2, 4, 9, 1, 3, 1, 2, 4, 9], [6, 5, 6, 0, 0, 5, 7, 8, 4, 0, 6, 4, 7, 8, 8, 0, 5, 4, 7, 8, 7, 6, 5, 4], [1, 4, 0, 4, 0, 0, 9, 1, 2, 3, 0, 2, 9, 1, 4, 3, 2, 3, 9, 1, 4, 3, 2, 9], [8, 5, 0, 9, 6, 0, 9, 7, 0, 8, 5, 8, 6, 7, 0, 7, 5, 9, 6, 7, 8, 6, 5, 9], [5, 3, 4, 4, 4, 0, 2, 1, 5, 3, 4, 0, 2, 1, 5, 1, 3, 0, 2, 1, 5, 2, 3, 0]]
}//64}
class SceneManger {
    constructor() {
        //  this.current_scene = SceneManger.LOADING;
        
        createjs.Ticker.addEventListener("tick", this.onUpdate.bind(this))
    }
    openScene(name) {
        this.current_scene && (this.current_scene.mouseEnabled = false)
        switch (name) {
            case SceneManger.LOADING:
                if (!this.loadingScene) {
                    this.loadingScene = new Loading();
                } else {
                    this.loadingScene.init()
                }
                break;
            case SceneManger.MENU:
                if (!this.menuScene) {
                    this.menuScene = new Menu();
                } else {
                    this.menuScene.init()
                }
                break;
            case SceneManger.GAME:
                if (!this.gameScene) {
                    this.gameScene = new GamePanel();
                } else {
                    this.gameScene.init()
                }
                break;
            case SceneManger.LEVELFAIL:
                if (this.current_scene == this.levelUpScene && this.current_scene.parent) return
                if (!this.levelFailScene) {
                    this.levelFailScene = new LevelFail();
                } else {
                    this.levelFailScene.init()
                }
                break;
            case SceneManger.LEVELUP:
                if (this.current_scene == this.levelFailScene && this.current_scene.parent) return
                if (!this.levelUpScene) {
                    this.levelUpScene = new LevelUp();
                } else {
                    this.levelUpScene.init()
                }
                break;
            case SceneManger.OVER:
                if (!this.overScene) {
                    this.overScene = new Over();
                } else {
                    this.overScene.init()
                }
                break;
            case SceneManger.LEVELPANEL:
                if (!this.levelPanelScene) {
                    this.levelPanelScene = new LevelPanel();
                } else {
                    this.levelPanelScene.init()
                }
                break;
            case SceneManger.HOWPANEL:
                if (!this.howPanelScene) {
                    this.howPanelScene = new HowPanel();
                } else {
                    this.howPanelScene.init()
                }
                break;
        }
        this.current_scene = this.getScene(name);
    }
    getScene(name) {
        switch (name) {
            case SceneManger.LOADING:
                return this.loadingScene;
            case SceneManger.MENU:
                return this.menuScene;
            case SceneManger.GAME:
                return this.gameScene;
            case SceneManger.LEVELFAIL:
                return this.levelFailScene;
            case SceneManger.LEVELUP:
                return this.levelUpScene;
            case SceneManger.OVER:
                return this.overScene;
            case SceneManger.LEVELPANEL:
                return this.levelPanelScene;
            case SceneManger.HOWPANEL:
                return this.howPanelScene;

        }
    }
    onUpdate() {
        this.current_scene.onUpdate && this.current_scene.onUpdate()
    }
    static getInstance() {
        if (!SceneManger.instance) {
            SceneManger.instance = new SceneManger();
        }
        return SceneManger.instance;
    }

}
SceneManger.LOADING = "LOADING";
SceneManger.MENU = "MENU";
SceneManger.GAME = "GAME";
SceneManger.LEVELFAIL = "LEVELFAIL";
SceneManger.LEVELUP = "LEVELUP";
SceneManger.OVER = "OVER";
SceneManger.LEVELPANEL = "LEVELPANEL";
SceneManger.HOWPANEL = "HOWPANEL";
SceneManger.PAUSED = false;
class Data {
    constructor() {
        
        this.rest();
    }
    rest() {
        this.level = 1//当前在玩的等级
        this.score = 0//当前关卡的分数
        this.localData = { max_level: 1, skip_arr: [] };
        for (var i = 0; i < GameConfig.levelData.length; i++) {
            this.localData["level" + (i + 1)] = 0;
        }
    }
    saveDataToBrower() {
        //保存localData,localData中保存所有关卡的分数、最高等级
        //闯关失败或成功时调用
        this.localData["level" + this.level] = Math.max(this.score, this.localData["level" + this.level] || 0);
        this.localData.max_level = Math.max(this.localData.max_level, this.level)
        localStorage.setItem(gameName, JSON.stringify(this.localData))
        console.log(this.localData)
        
    }
    getDataFromBrower() {
        //把本地数据读到localData中，menu界面调用
        var data = localStorage.getItem(gameName);
        if (data) {
            this.localData = JSON.parse(data);
        } else {
            this.localData = { max_level: 1,skip_arr:[] };
            for (var i = 0; i < GameConfig.levelData.length; i++) {
                this.localData["level" + (i + 1)] = 0;
            }
        }
    }
    addScore(score) {
        this.score += score;
        SceneManger.getInstance().getScene(SceneManger.GAME).getChildByName("score_text").value = this.score;
    }
    getMaxLevel() {
        return this.localData.max_level;
    }
    getLastLevel() {
        for (var i = 0; i < GameConfig.levelData.length; i++) {
            if (this.localData["level" + (i + 1)] == 0) {
                return (i + 1);
            }
        }
        return 1
    }
    getScore(l) {
        return this.localData["level" + l];
    }
    getTotalScore() {
        var total = 0
        for (var i = 0; i < this.localData.max_level; i++) {
            total += this.localData["level" + (i + 1)];
        }
        return total
    }
    canSkip(l) {
        return this.localData.skip_arr.indexOf(l) > -1;
    }
    skipLevel(l) {
        this.localData.skip_arr.push(l);
        this.saveDataToBrower()
    }
    static getInstance() {
        if (!Data.instance) {
            Data.instance = new Data();
        }
        return Data.instance;
    }
}
Data.instance=false
class LevelFail extends lib.LevelFail {
    constructor() {
        super();
        this.regX = Design.width / 2;
        this.regY = Design.height / 2;
        this.x = W / 2;
        this.y = H / 2;
        this.scaleX = 0.5;
        this.scaleY = 0.5;
        this.back.on("click", () => {
            this.efffectClose(function () {
                this.parent.removeChild(this)
                SceneManger.getInstance().openScene(SceneManger.MENU);
            }.bind(this))

        });
        this.play_again.on("click", () => {
            this.efffectClose(function () {
                this.parent.removeChild(this)
                SceneManger.getInstance().openScene(SceneManger.GAME);
            }.bind(this));
        });
        this.vedio.on("click", () => {
            //调用广告
            //结束后跳过本关
            //保存分数
            var self = this;
            openAd(function () {
                self.efffectClose(function () {
                    self.parent.removeChild(self)
                    SceneManger.getInstance().openScene(SceneManger.LEVELUP);
                });
            })
        })
        this.init();

    }
    init() {
        this.mouseEnabled = true;
        this.scaleX = 0.5;
        this.scaleY = 0.5;
        this.lock = true;
        this.time = 0;
        stage.addChild(this);
        this.efffectOpen();
    }
    efffectOpen() {
        // this.play_again.mouseEnabled = false;
        createjs.Tween.get(this).to({ scaleX: 1, scaleY: 1 }, 500, createjs.Ease.backOut).call(() => {
            //  SceneManger.PAUSED = true;
        })
    }
    efffectClose(fn) {
        createjs.Tween.get(this).to({ scaleX: 0.5, scaleY: 0.5 }, 500, createjs.Ease.cubicIn).call(() => {
            fn()
        })
    }
    onUpdate() {
        /*  if (!this.lock) return
         if (this.time > 60 * 8) {
             this.lock = false;
             this.play_again.text.text = "再玩一遍"
             this.play_again.mouseEnabled = true
         } else {
             this.time++;
             this.play_again.text.text = "再玩一遍" + Math.floor(8 - this.time / 60) + "s";
         } */
    }
}
class LevelUp extends lib.LevelUp {
    constructor() {
        super();
        this.regX = Design.width / 2;
        this.regY = Design.height / 2;
        this.x = W / 2;
        this.y = H / 2;
        this.scaleX = 0.5;
        this.scaleY = 0.5;
        this.next_level.on("click", () => {
            this.efffectClose(function () {
                this.parent.removeChild(this);
                if (Data.getInstance().level > GameConfig.levelData.length) {
                    SceneManger.getInstance().openScene(SceneManger.OVER)
                } else {
                    SceneManger.getInstance().openScene(SceneManger.GAME)
                }
            }.bind(this))
        })
        this.back.on("click", () => {
            this.efffectClose(function () {
                this.parent.removeChild(this);
                SceneManger.getInstance().openScene(SceneManger.LEVELPANEL);
            }.bind(this))
        })
        this.init();
    }
    init() {
        this.mouseEnabled = true;
        this.scaleX = 0.5;
        this.scaleY = 0.5;
        if (Data.getInstance().level >= GameConfig.levelData.length) {
            this.next_level.text.text = "游戏结束";
        } else {
            this.next_level.text.text = "下一关";
        }
        var game_panel = SceneManger.getInstance().getScene(SceneManger.GAME);
        var bonus = Math.floor(100 - game_panel.time_bar.currentFrame);
        this.bonus.text = bonus;
        Data.getInstance().addScore(bonus);
        Data.getInstance().saveDataToBrower();
        Data.getInstance().level++;
        stage.addChild(this);
        this.efffectOpen();
        LevelEffect.getInstence().showParticle(stage);
    }
    efffectOpen() {
        createjs.Tween.get(this).to({ scaleX: 1, scaleY: 1 }, 500, createjs.Ease.backOut).call(() => {
            SceneManger.PAUSED = true;
        })
    }
    efffectClose(fn) {
        createjs.Tween.get(this).to({ scaleX: 0.5, scaleY: 0.5 }, 500, createjs.Ease.backIn).call(() => {
            fn()
        })
    }
}
class LevelPanel extends lib.Level {
    constructor() {
        super();
        this.panel = new createjs.Container()//.addTo(this);
        this.panel.index = Math.floor((Data.getInstance().getMaxLevel() - 1) / 20);
        this.panel.mouseEnabled = true
        this.addChild(this.panel);
        this.arr = [];
        var total_score = 0;
        //    var prefab = JSON.parse(Laya.loader.getRes("level_btn.prefab"));
        for (var i = 0; i < GameConfig.levelData.length; i++) {
            var el = new lib.levelnum();
            el.mouseChildren = false;
            // el.createView(prefab);
            el.name = "level";
            //  console.log(i,Data.getInstance());
            if (i < Data.getInstance().getLastLevel() || Data.getInstance().canSkip(i + 1)) {
                el.lock.visible = false;
                // el.mouseEnabled = true;
            } else {
                //    el.text.visible = false;
                // el.mouseEnabled = false;
            }
            el.x = Math.floor(i / 20) * Design.width + 64 + (i % 4) * 160;
            el.y = Math.floor(i / 4) % 5 * 177 + 100;
            el.text.text = i + 1
            el.index = i + 1;
            total_score += Data.getInstance().localData["level" + (i + 1)] || 0;
            this.panel.addChild(el);
            this.arr.push(el)
        }
        this.total_score.text = total_score;
        console.log(total_score)
        this.panel.x = -Design.width * this.panel.index;
        if (this.panel.index == 0) {
            this.left.visible = false;
        }
        if (this.panel.index == Math.floor((GameConfig.levelData.length - 1) / 20) - 1) {
            this.right.visible = false;
        }
        console.log(this.panel)
        this.on("click", (e) => {
            //跳转到指定关卡；
            console.log(e.target)
            if (e.target.name == "level") {
                if (e.target.lock.visible) {
                    //播放广告
                    //结束后跳转
                    openAd(function () {
                        Data.getInstance().skipLevel(e.target.index);
                        Data.getInstance().level = e.target.index;
                        SceneManger.getInstance().openScene(SceneManger.GAME);
                    })
                }else{
                    Data.getInstance().level = e.target.index;
                    SceneManger.getInstance().openScene(SceneManger.GAME);
                }

            } else if (e.target == this.left) {
                this.panel.index--;
                this.right.visible = true;
                if (this.panel.index == 0) e.target.visible = false;
                createjs.Tween.removeAllTweens();
                createjs.Tween.get(this.panel).to({ x: -Design.width * this.panel.index }, 300);
            } else if (e.target == this.right) {
                this.left.visible = true;
                this.panel.index++;
                if (this.panel.index == Math.floor((GameConfig.levelData.length - 1) / 20)) e.target.visible = false;
                //   Laya.Tween.clearAll();
                createjs.Tween.removeAllTweens();
                // Laya.Tween.to(panel, { x: -Design.width * panel.index }, 300)
                createjs.Tween.get(this.panel).to({ x: -Design.width * this.panel.index }, 300)

                /* 

                console.log(panel.index)
                Xiao.Tween.to(panel, { x: -800 * panel.index }, { duration: 300 }) */
            } else if (e.target == this.back_btn) {
                console.log("open menu")
                SceneManger.getInstance().openScene(SceneManger.MENU);
            }
        })
        this.init()
    }
    init() {
        this.mouseEnabled = true;
        for (var i = 0; i < GameConfig.levelData.length; i++) {
            var el = this.arr[i];
            if (i < Data.getInstance().getLastLevel() || Data.getInstance().canSkip(i + 1)) {
                el.lock.visible = false;
                el.text.visible = true;
                // el.mouseEnabled = true;
            } else {
                el.lock.visible = true;
                //    el.text.visible = false;
                //   el.mouseEnabled = false;
            }
        }
        //  console.log("levelpanel");
        this.total_score.text = Data.getInstance().getTotalScore();
        this.panel.index = Math.floor((Data.getInstance().getMaxLevel() - 1) / 20);
        this.panel.x = -Design.width * this.panel.index;
        this.left.visible = this.right.visible = true
        if (this.panel.index == 0) {
            this.left.visible = false;
        }
        if (this.panel.index == Math.floor((GameConfig.levelData.length - 1) / 20) - 1) {
            this.right.visible = false;
        }
        stage.addChild(this);

    }

}
class Over extends lib.GameOver {
    constructor() {
        super();
        this.rank.on("click", () => {
           // showRank()
           saveToRank(Data.getInstance().getTotalScore())
        })
        this.more.on("click", () => {
            moreGame()
        })
        this.play_again.on("click", () => {
            Data.getInstance().rest();
            Data.getInstance().saveDataToBrower()
            SceneManger.getInstance().openScene(SceneManger.MENU);
        })
        this.init();
    }
    init() {
        this.mouseEnabled = true;
        this.total_score.text = Data.getInstance().getTotalScore()
        stage.addChild(this)
    }
}
class LevelEffect extends createjs.Container {
    constructor() {
        super();
        this.p_arr = [];
        for (var i = 0; i < 30; i++) {
            var p = new lib.particle();
            p.x = 360;
            p.y = 1100;
            p.vx = 15 - Math.random() * 30;
            p.vy = -100 + Math.random() * 40;
            p.vr = Math.random() * 5;
            p.gotoAndStop(Math.floor(Math.random() * 12));
            this.addChild(p);
            this.p_arr.push(p)
        }

    }
    onUpdate() {
        for (var i = 0; i < this.copy_arr.length; i++) {
            var el = this.copy_arr[i];
            if (el.parent) {
                el.x += el.vx;
                el.y += el.vy;
                el.rotation += el.vr;
                el.vy += 6;
                if (el.y > 1280) {
                    this.removeChild(el);
                    this.copy_arr.splice(i, 1);
                    if (this.copy_arr.length == 0) {
                        this.container.removeChild(this)
                    }
                    i--;
                }
            }
        }
    }
    showParticle(container) {
        this.copy_arr = this.p_arr.concat();
        this.container = container;
        for (var i = 0; i < this.copy_arr.length; i++) {
            var p = this.copy_arr[i];
            p.x = 360;
            p.y = 900;
            p.vx = 15 - Math.random() * 30;
            p.vy = -100 + Math.random() * 40;
            p.vr = Math.random() * 5;
            p.gotoAndStop(Math.floor(Math.random() * 12));
            this.addChild(p);
        }
        this.container.addChild(this)
    }
    static getInstence() {
        if (!LevelEffect.instence) {
            LevelEffect.instence = new LevelEffect()
        }
        return LevelEffect.instence
    }
}
