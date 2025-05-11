(function (lib, img, cjs, ss) {

var p; // shortcut to reference prototypes

// library properties:
lib.properties = {
	width: 720,
	height: 1280,
	fps: 24,
	color: "#FFFFFF",
	manifest: []
};



// symbols:



(lib.progressBar = function() {
	this.initialize();

	// 图层 1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FEADAD").s().rr(-308.5,-8.5,617,17,8.5);
	this.shape.setTransform(308.5,8.5);

	this.addChild(this.shape);
}).prototype = p = new cjs.Container();
p.nominalBounds = new cjs.Rectangle(0,0,617,17);


(lib.logo = function() {
	this.initialize();

	// 图层 2 (mask)
	var mask = new cjs.Shape();
	mask._off = true;
	mask.graphics.p("AtCvYIaFAAQAZAAAWAIQAXAHATAOQASAOAOASQAOATAHAXQAIAWAAAZIAAaFQAAAZgIAWQgHAXgOATQgOASgSAOQgTAOgXAHQgWAIgZAAI6FAAQhAgCgqgqQgqgqgChAIAA6FQAAgZAIgWQAHgXAOgTQAOgSASgOQATgOAXgHQAWgIAZAAg");

	// 图层 1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#FEADAD").s().p("AzNLGIeT+TIIIIII+TeTg");
	this.shape.setTransform(78,76.9);

	this.shape_1 = new cjs.Shape();
	this.shape_1.graphics.f("#ADFEAD").s().p("AzNLHIeT+UIIIIII+TeTg");
	this.shape_1.setTransform(26,24.9);

	this.shape_2 = new cjs.Shape();
	this.shape_2.graphics.f("#ADF4FE").s().p("AzNLGIeT+TIIIIHI+TeUg");
	this.shape_2.setTransform(-77.9,-79);

	this.shape_3 = new cjs.Shape();
	this.shape_3.graphics.f("#ECFEAD").s().p("AzNLGIeT+TIIIIHI+TeUg");
	this.shape_3.setTransform(-26,-27);

	this.shape.mask = this.shape_1.mask = this.shape_2.mask = this.shape_3.mask = mask;

	this.addChild(this.shape_3,this.shape_2,this.shape_1,this.shape);
}).prototype = p = new cjs.Container();
p.nominalBounds = new cjs.Rectangle(-98.5,-98.5,197.1,197.1);


(lib.bar1 = function() {
	this.initialize();

	// 图层 3 (mask)
	var mask = new cjs.Shape();
	mask._off = true;
	mask.graphics.p("Egt1gBUMBbrAAAQAgAAAbACQAbACAUAIQAVAIALARQAMASAAAdQAAAegMASQgLARgVAIQgUAIgbACQgbACggAAMhbrAAAQggAAgbgCQgbgCgUgIQgVgIgLgRQgMgSAAgeQAAgdAMgSQALgRAVgIQAUgIAbgCQAbgCAgAAg");
	mask.setTransform(308.5,0);

	// 图层 2
	this.progress = new lib.progressBar();
	this.progress.setTransform(-618,-8.5);

	this.progress.mask = mask;

	// 图层 1
	this.shape = new cjs.Shape();
	this.shape.graphics.f("#ADF4FE").s().rr(-308.5,-8.5,617,17,8.5);
	this.shape.setTransform(308.5,0);

	this.addChild(this.shape,this.progress);
}).prototype = p = new cjs.Container();
p.nominalBounds = new cjs.Rectangle(0,-8.5,617,17);


// stage content:
(lib.Loading = function() {
	this.initialize();

	// 图层 1
	this.progress_bar = new lib.bar1();
	this.progress_bar.setTransform(360,1097.5,1,1,0,0,0,308.4,0);

	this.instance = new lib.logo();
	this.instance.setTransform(360,578.3,1,1,0,0,0,0,-1.1);

	this.addChild(this.instance,this.progress_bar);
}).prototype = p = new cjs.Container();
p.nominalBounds = new cjs.Rectangle(-206.5,1017.4,1235,728.7);

})(lib = lib||{}, images = images||{}, createjs = createjs||{}, ss = ss||{});
var lib, images, createjs, ss;