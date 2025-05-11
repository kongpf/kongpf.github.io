function GameMain(panel) {
    var Stage = panel.container;
    var card_w = 91;
    var card_h = 90;
    var startX;
    var startY = 560;
    var intervalX = 120;
    var intervalY = 90;
    var map = []
    var level;
    var up_card;
    var grid_w = 5;
    var grid_h = 4;
    var level_arr = [
        [1, 2],//1-2
        [3, 6],//3-8
        [9, 9],//9-16
        [18, 9],
        [27, 9],
        [36, 9],//36-44
        [45, 9],//45-53
        [54, 9],
        [63, 9],
        [72, 9]
    ]
    var level;
    console.log(startX, startY)
    this.init = function () {
        Stage.removeAllChildren();
        Stage.removeAllEventListeners()
        createjs.Tween.removeAllTweens();
        Stage.on("mousedown", (e) => { onMouseDown(e) });
        Stage.on("mousemove", (e) => { onMouseMove(e) });
        Stage.on("mouseup", (e) => { onMouseUp(e) });
        level = Data.getInstance().level;
        map = [];
       // level = level_arr[l - 1][0] + Math.floor(Math.random() * level_arr[l - 1][1]);
        up_card = false;
        grid_w = GameConfig.levelData[level - 1].length / grid_h;
        startX = (720 - (grid_w - 1) * intervalX) / 2
        for (var yy = 0; yy < grid_h; yy++) {
            map[yy] = [];
            for (var xx = 0; xx < grid_w; xx++) {
                var data = GameConfig.levelData[level - 1][yy * grid_w + xx]
                if (data) {
                    var c = new Card()
                    c.x = startX + xx * intervalX;
                    c.y = startY + yy * intervalY;
                    c.xx = xx;
                    c.yy = yy;
                    c.type = data;
                    map[yy][xx] = c;
                    Stage.addChild(c)
                } else {
                    map[yy][xx] = false;
                }
            }
        }
        //创建5个试管
        for (var xx = 0; xx < grid_w; xx++) {
            var b = new createjs.Bitmap("images/card10.png");
            b.x = startX + xx * intervalX;
            b.y = startY + grid_h * intervalY;
            b.regX = 50;
            b.regY = 410;
            b.name = xx + 1;
            Stage.addChild(b)
            //     { name: xx + 1, useHandCursor: true, width: 110, height: 426, pivotX: 55, pivotY: 110, x: startX + xx * intervalX, y: startY, image: "./img/card/card10.png" }).addTo(Stage)

        }

    }
    function checkLevelFail() {
        for (var xx = 0; xx < grid_w; xx++) {
            var obj1 = getFirstOne(xx)
            for (var xxx = 0; xxx < grid_w; xxx++) {
                if (xx == xxx) continue
                var obj2 = getFirstOne(xxx)
                if (!obj1 || !obj2 || obj1.type == obj2.type
                    && (obj2.yy != 0 || obj1.yy != 0)
                    && !(obj1.yy == 0 && obj2.yy == 1 && getSecondtOne(xx).type == obj1.type)
                    && !(obj1.yy == 0 && obj2.yy == 2 && getThriedtOne(xx).type == obj1.type)) {
                    checkLevelUp()
                    //还要加一个条件
                    return
                }
            }
        }

        SceneManger.getInstance().openScene(SceneManger.LEVELFAIL)
    }
    function onMouseDown(e) {
        var index = e.target.name;
        if (index == "stage" || !index) return;
        
        var first = getFirstOne(index - 1)
        if (!up_card) {
            if (first) {
                //     GameSound.playSound("Sclick")
                up_card = first;
                createjs.Tween.get(first).to({ y: startY - 200 }, 200)
                //  Hilo.Tween.to(first, { y: startY - 200 }, { duration: 200 })
                playSound("up")
            }
        } else {
            //点击的地方可以放
            if (!first || up_card.type == first.type && first != up_card && first.yy != 0) {
                map[up_card.yy][up_card.xx] = false;
                if (up_card.xx == index - 1) {
                    //  setFirst(index - 1, up_card);
                    //   GameSound.playSound("Srem")
                    createjs.Tween.get(up_card).to({ y: startY + intervalY * up_card.yy }, 200)
                    // Hilo.Tween.to(up_card, { y: startY + intervalY * up_card.yy }, { duration: 200 })
                    playSound("back")
                } else {

                    setFirst(index - 1, up_card);     
                    createjs.Tween.get(up_card).to({ x: startX + intervalX * up_card.xx }, 200).to({ y: startY + intervalY * up_card.yy }, 200).call(() => {
                        playSound("down")
                        checkLevelFail()
                    })

                }
                up_card = false;
                //  GameSound.playSound("Sclick")
            } else {
                // Hilo.Tween.to(up_card, { y: startY + intervalY * up_card.yy }, { duration: 200 })
                createjs.Tween.get(up_card).to({ y: startY + intervalY * up_card.yy }, 200);
                up_card = false;
                playSound("back")
                //  GameSound.playSound("Sno");
                checkLevelFail()
            }
            //不可以放
        }
        console.log(map)
    }
    function checkLevelUp() {
        for (var xx = 0; xx < grid_w; xx++) {
            for (var yy = 0; yy < grid_h - 1; yy++) {
                if (map[yy][xx]) {
                    if (map[yy][xx].type != map[yy + 1][xx].type || map[yy - 1] && !map[yy - 1][xx]) {
                        return
                    }
                }
            }
        }
        SceneManger.getInstance().openScene(SceneManger.LEVELUP)
    }
    function getFirstOne(xx) {
        for (var yy = 0; yy < grid_h; yy++) {
            if (map[yy][xx]) {
                return map[yy][xx]
            }
        }
        return false
    }
    function getSecondtOne(xx) {
        for (var yy = 0; yy < grid_h; yy++) {
            if (map[yy][xx]) {
                return map[yy + 1] && map[yy + 1][xx]
            }
        }
        return false
    }
    function getThriedtOne(xx) {
        for (var yy = 0; yy < grid_h; yy++) {
            if (map[yy][xx]) {
                return map[yy + 2] && map[yy + 2][xx]
            }
        }
        return false
    }
    function setFirst(xx, card) {
        for (var yy = grid_h - 1; yy >= 0; yy--) {
            if (!map[yy][xx]) {
                card.xx = xx;
                card.yy = yy;
                map[yy][xx] = card;
                break;
            }
        }
    }

    function onMouseMove(e) {
        console.log("move")

    }
    function onMouseUp(e) {

    }
    this.onUpdate = function () {

    }
    class Card extends createjs.Container {
        constructor() {
            super();
            this.pointerEnabled = false;
            this.width = card_w;
            this.height = card_h;
            this.regX = card_w / 2;
            this.regY = card_h / 2;
            this.bg = new createjs.Bitmap();
            this.bg.mouseEnabled = false;
            this.addChild(this.bg);
            //  new Hilo.Bitmap({ pointerEnabled: false, width: card_w, height: card_h, pivotX: card_w / 2, pivotY: card_h / 2, x: card_w / 2, y: card_h / 2 }).addTo(this);
        }
        set type(a) {
            this.bg.image = Queue.getResult("card" + a)
            this._type = a
        }
        get type() {
            return this._type
        }
    }
}