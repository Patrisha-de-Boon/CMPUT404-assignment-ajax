// Some code was taken from the in class observer example 
// which uses the same apache lisense as this file. The example can be
// found at 
//       
//        https://github.com/uofa-cmput404/cmput404-slides/blob/master/examples/ObserverExampleAJAX/static/observer.js
//        Copyright 2013 Abram Hindle
//        Copyright 2019 Hazel Victoria Campbell
//
// Additionally, the following documentation was referenced to learn how to use XMLHttpRequest 
//        https://javascript.info/xmlhttprequest
//
// Similarily, the following documentation was referenced to learn how to use radial gradients
//        https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/createRadialGradient
//
// Some code from kirilloid's answer (later updated by N3R4ZZuRR0) to the following
// question was used in order to calculate the contrast between two colours
//        https://stackoverflow.com/questions/9733288/how-to-programmatically-calculate-the-contrast-ratio-between-two-colors/9733420#9733420 


var id = "L"+Math.floor(20000000*Math.random());
var canvas = document.getElementById('c');
var host = window.location.host;
var context = canvas.getContext("2d");
var W = canvas.width  = window.innerWidth-6;
var H = canvas.height = window.innerHeight-50;

var drawNext = true;
world = {};
additions = {};
hasAdditions = false;

function sendJSONXMLHTTPRequest(method, url, objects = null, callback = null, errorCallback = null) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState==4) {
            try {
                if (xhr.status==200 && callback) {
                    // No need to parse here since I set xhr.responseType to json 
                    // See https://javascript.info/xmlhttprequest#response-type              
                    callback(xhr.response);
                }
                else if (xhr.status != 200 && errorCallback) {
                    errorCallback(xhr.status);
                }
            } 
            catch(e) {
                alert('Error: ' + e.name);
            }
        }
    };
    xhr.responseType = 'json';
    xhr.open(method, url, true);

    if (method == 'POST') {
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.setRequestHeader('Accept', 'application/json');
    }
    else {
        xhr.setRequestHeader('Accept', 'application/json');
    }

    if (objects){
        xhr.send(JSON.stringify(objects));
    }
    else {
        xhr.send();
    }
}

function drawCircle(context, entity) {
    var radius = (entity["radius"])?entity["radius"]:50;

    var x = entity["x"];
    var y = entity["y"];

    context.beginPath();
    context.lineWidth = entity["strokeWidth"] ? entity["strokeWidth"] : 3;
    context.x = x;
    context.y = y;
    context.strokeStyle = entity["colour"];

    context.arc(x, y, radius, 0, 2.0 * Math.PI, false);

    if (entity["fillColour"]){
        var grd = context.createRadialGradient(x, y, 5, x, y, radius);
        grd.addColorStop(0, entity["fillColour"]);
        grd.addColorStop(1, entity["colour"]);
        context.fillStyle = grd;
        context.fill()
    }
    else {
        context.fillStyle = entity["colour"];
        context.fill()
    }

    context.stroke();     
}

function prepEntity(entity) {
    if (!entity["colour"]) {
        entity["colour"] = "#FF0000";
    }
    if (!entity["radius"]) {
        entity["radius"] = 50;
    }
    return entity;
}

function clearFrame() {
    with(context) {
        moveTo(0,0);
        fillStyle = "#000";
        fillRect(0,0,W,H);
    }
}

// This actually draws the frame
function renderFrame() {
    clearFrame();
    for (var key in world) {
        var entity = world[key];
        drawCircle(context, prepEntity(entity));
    }
}

// Signals that there's something to be drawn
function drawNextFrame() {
    drawNext = true;
}

// This optionally draws the frame, call this if you're not sure if you should update
// the canvas
function drawFrame() {
    if (drawNext) {
        renderFrame();
        drawNext = false;
    }
}

// This is unpleasent, canvas clicks are not handled well
// So use this code, it works well on multitouch devices as well.
function getPosition(e) {
	if ( e.targetTouches && e.targetTouches.length > 0) {
		var touch = e.targetTouches[0];
		var x = touch.pageX  - canvas.offsetLeft;
		var y = touch.pageY  - canvas.offsetTop;
		return [x,y];
	} else {
		var rect = e.target.getBoundingClientRect();
		var x = e.offsetX || e.pageX - rect.left - window.scrollX;
		var y = e.offsetY || e.pageY - rect.top  - window.scrollY;
		var x = e.pageX  - canvas.offsetLeft;
		var y = e.pageY  - canvas.offsetTop;
		return [x,y];
	}
}

function addEntity(entity, data) {
    world[entity] = data;
    drawNextFrame(); // (but should we?)
    //XXX: Send a XHTML Request that updates the entity you just  modified!

    // Note: I didn't want to send a seperate request for every entity in case
    // drag events create many at once, so I add them to a dictionary and send 
    // them in bulk as needed. 
    
    // Because of this, there can be a delay between 
    // when an entity is added and when it is returned by a listener, so it is 
    // still best to add it to world and draw the next frame so the user does 
    // not see as much lag behind their mouse
    additions[entity] = data;
    hasAdditions = true;
}

var counter = 0;
function addEntityWithoutName(data) {
    // Each session has it's own counter so it eventually overwrites it's 
    // own entities
    var name = id + ((counter++) % 100);
    addEntity(name, data);
}

// canvas + mouse/touch is complicated 
// I give you this because well the mouse/touch stuff is a total
// pain to get right. This has some out of context bug too.
mouse = (function() {
    // Now this isn't the most popular way of doing OO in 
    // Javascript, but it relies on lexical scope and I like it
    // This isn't 301 so I'm not totally bound to OO :)
    var self;    
    self = {
        clicked: 0,
        // these are listener lists append to them
        mousemovers: [],
        mousedraggers: [],
        mousedowners: [],
        mouseuppers: [],
        callListeners: function(listeners,x,y,clicked,e) {
            for (i in listeners) {
                listeners[i](x,y,clicked,e);
            }
        },
        wasClicked: function(e) {
            var pos = getPosition(e);
            var x = pos[0];
            var y = pos[1];
            if (x >= 0 && x <= W && y >= 0 && y <= H) {
                return 1;
            } else {
                return 0;
            }
        },
        mousedown: function(e) {
            e.preventDefault();
            if (self.wasClicked(e)) {
                var pos = getPosition(e);
                var x = pos[0];
                var y = pos[1];
	        self.clicked = 1;
                self.callListeners(self.mousedowners,x,y,self.clicked,e);
                //addEntityWithoutName({'x':x,'y':y,'colour':'red'});
            }
        },
        mouseup: function(e) {
            e.preventDefault();
            //alert(getPosition(e));
            if (self.wasClicked(e)) {
                var pos = getPosition(e);
                var x = pos[0];
                var y = pos[1];
	        //self.poppin(x,y);
	        self.clicked = 0;
                self.selected = -1;
                self.callListeners(self.mouseuppers,x,y,self.clicked,e);
                //addEntityWithoutName({'x':x,'y':y,'colour':'blue'});
            }
        },
        touchstart: function(e) {
            self.lasttouch = e;                                         
            return self.mousedown(e);
        },
	touchend: function(e) {
            var touch = (self.lasttouch)?self.lasttouch:e;
            return self.mouseup(touch);
	},
	mousemove: function(e) {
            e.preventDefault();
            if (self.wasClicked(e)) {
                var pos = getPosition(e);
                var x = pos[0];
                var y = pos[1];
	        if (self.clicked != 0) {
	            //self.squeakin(x,y);
                    self.callListeners(self.mousedraggers,x,y,self.clicked,e);
	        }
                self.callListeners(self.mousemovers,x,y,self.clicked,e);
            }            
	},
	touchmove: function(e) {
            self.lasttouch = e;                                         
            return self.mousemove(e);
	},
	// Install the mouse listeners
	mouseinstall: function() {
            canvas.addEventListener("mousedown",  self.mousedown, false);
            canvas.addEventListener("mousemove",  self.mousemove, false);
            canvas.addEventListener("mouseup",    self.mouseup, false);
            canvas.addEventListener("mouseout",   self.mouseout, false);
            canvas.addEventListener("touchstart", self.touchstart, false);
            canvas.addEventListener("touchmove",  self.touchmove, false);
            canvas.addEventListener("touchend",   self.touchend, false);
	}
    };
    // Force install!
    self.mouseinstall();
    return self;
})();

// The following two functions are from kirilloid's answer (later updated by N3R4ZZuRR0) to this question 
// https://stackoverflow.com/questions/9733288/how-to-programmatically-calculate-the-contrast-ratio-between-two-colors/9733420#9733420
// about calculating the contrast between two colors
function get_luminance(r, g, b) {
    var a = [r, g, b].map(function (v) {
        v /= 255;
        return v <= 0.03928
            ? v / 12.92
            : Math.pow( (v + 0.055) / 1.055, 2.4 );
    });
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function get_contrast(rgb1, rgb2) {
    var lum1 = get_luminance(rgb1[0], rgb1[1], rgb1[2]);
    var lum2 = get_luminance(rgb2[0], rgb2[1], rgb2[2]);
    var brightest = Math.max(lum1, lum2);
    var darkest = Math.min(lum1, lum2);
    return (brightest + 0.05)
         / (darkest + 0.05);
}

// Generate a random colour for each session. Make sure it contrasts
// with the dark background
function generateColour(){
    const background = [0, 0, 0];
    var newColour = [0, 0, 0];
    var contrast = 0;
    while(contrast < 0.1) {
        newColour = [Math.floor(Math.random()*255), Math.floor(Math.random()*255), Math.floor(Math.random()*255)];
        contrast = get_contrast(newColour, background);
    }

    return "rgb(" + newColour[0] + "," + newColour[1] + "," +newColour[2] + ")";
}

var myColor = generateColour();

// Add the application specific mouse listeners!
//XXX: TODO Make these prettier!
mouse.mousedowners.push(function(x,y,clicked,e) {
    addEntityWithoutName({'x':x, 'y':y, 'colour': myColor, 'fillColour': 'black', 'strokeWidth': 5});
});

mouse.mouseuppers.push(function(x,y,clicked,e) {
    addEntityWithoutName({'x':x, 'y':y, 'colour': myColor, 'fillColour': 'white', 'strokeWidth': 5});
});

mouse.mousedraggers.push(function(x,y,clicked,e) {
    addEntityWithoutName({'x':x, 'y':y, 'colour':myColor, 'radius':10});
});

////////
// The following 3 functions are adapted from https://github.com/uofa-cmput404/cmput404-slides/blob/master/examples/ObserverExampleAJAX/static/observer.js
////////

function updateWorldWith(objs) {
    for (var key in objs) {
        world[key] = objs[key];
    }
    drawNextFrame();
}

var isInitialized = false;

function update() {
    if (isInitialized) {
        if (additions && hasAdditions){
            hasAdditions = false;
            sendJSONXMLHTTPRequest('POST', "/entities", JSON.stringify(additions), null)
            additions = {};
        }
    
        sendJSONXMLHTTPRequest('GET', "/listener/" + id, null, function(response) {
            if (response) {
                updateWorldWith(response);
            }
        }, function(status) {
            if (status == 404) {
                // This means the world has been cleared so we need to reinitialize
                isInitialized = false;
                initialize_world();
                drawNextFrame();
            }
        })

        drawFrame();
    }
}

function initialize_world(){
    // Get the current state of the world
    sendJSONXMLHTTPRequest('GET', "/world", JSON.stringify({}), function(res) {
        if (res){
            world = res;
        }
    });

    // Register listener
    sendJSONXMLHTTPRequest('PUT', "/listener/" + id, JSON.stringify({}), function() {
        isInitialized = true;
    });
}

// Get the initial state of the world
initialize_world();

// 30 frames per second
setInterval(update, 1000/30.0);