var socket;
var gamepads = {};
var gamepadIndex = -1;
var updater;
var turnSensitivity = 0.5; //Value 0-1
var websocketOn = false;
var toastBlocker = false;
var axes = {};

/*//Handle gamepad connections, TODO: Status indicator
function gamepadHandler(event, connecting) {
    var gamepad = event.gamepad;
    // Note:
    // gamepad === navigator.getGamepads()[gamepad.index]

    if (connecting) {
        gamepads[gamepad.index] = gamepad;
    } else {
        delete gamepads[gamepad.index];
    }
}
*/
window.addEventListener("gamepadconnected", function (e) {
    if (toastBlocker)
        M.toast({ html: 'Controller connected.' });
}, false);
window.addEventListener("gamepaddisconnected", function (e) {
    M.toast({ html: 'Controller disconnected.' });
    toastBlocker = true;
}, false);

document.getElementById('ip').value = localStorage.getItem("save-ip");

function init() {
    axes.x = localStorage.getItem("x") ? localStorage.getItem("x") : 0;
    axes.y = localStorage.getItem("y") ? localStorage.getItem("y") : 1;
    axes.turn = localStorage.getItem("turn") ? localStorage.getItem("turn") : 5;
    axes.paddle = localStorage.getItem("paddle") ? localStorage.getItem("paddle") : 0;
    //disable buttons
    document.getElementById("ip").disabled = true;
    document.getElementById("ip-button").classList.add('disabled');
    //Connect to socket
    var uri = document.getElementById('ip').value;
    localStorage.setItem('save-ip', uri);
    try {
        socket = new WebSocket(uri);
    } catch (e) {
        M.toast({ html: 'Connection error. Please check console for more info' });
        document.getElementById("ip").disabled = false;
        document.getElementById("ip-button").classList.remove('disabled');
        return;
    }

    socket.onopen = function (event) {
        document.getElementById("gamepad-init").classList.remove('hide');
        document.getElementById("ip-input").classList.add('hide');
        toggleJoystick();
    }

    socket.onmessage = function (event) {
        if (event.device === "cs1") {
            document.getElementById("amps").textContent = "Total amps: " + event.value;
            document.getElementById("amps-progress").style.width = (event.value / 14) + "%";
        }
        else {
            document.getElementById("amps" + event.channel).style.width = (event.value / 14) + "%";
        }
    }
}

function update() {
    //update gamepads
    gamepads = navigator.getGamepads();

    //only run if there is a joystick
    if (gamepadIndex >= 0) {
        if (!gamepads[gamepadIndex]) {
            return;
        }
        var gp = gamepads[gamepadIndex];

        var html = "";
        html += "id: " + gp.id + "<br/>Index: " + gamepadIndex + "<br/>";

        for (var i = 0; i < gp.buttons.length; i++) {
            html += "Button " + (i + 1) + ": ";
            if (gp.buttons[i].pressed) html += " pressed";
            html += "<br/>";
        }

        for (var i = 0; i < gp.axes.length; i += 1) {
            html += "Stick " + i + ": " + gp.axes[i] + "<br/>";
        }

        document.getElementById("joystick-values").innerHTML = html;

        document.getElementById("websocket-toggle").textContent = websocketOn ? "Websocket enabled" : "Websocket disabled";

        //process motors
        var motors = {};
        //Get initial values
        /*var z = -gp.axes[1];
        var turn = gp.axes[5];
        var roll = gp.axes[0];*/
        var z = -gp.axes[axes.y];
        var turn = gp.axes[axes.turn];
        var roll = gp.axes[axes.x];
        var paddle = (1-gp.axes[axes.paddle])/2;
        var up;
        if (gp.buttons[5].pressed || gp.buttons[4].pressed) {
            up = 1;
        }
        else if (gp.buttons[2].pressed || gp.buttons[3].pressed) {
            up = -1;
        }
        else {
            up = 0;
        }
        //adjust them based on turn
        //Edit "turnSensitivity" at the top to adjust the sensitivity of turns
        motors.lhTarget = turn < 0 ? -1 : 1;
        motors.lhDistanceFromTarget = turnSensitivity * parseFloat(Math.abs(turn)) * (parseFloat(z) - parseFloat(motors.lhTarget));
        motors.lh = parseInt(paddle * 100 * (z - motors.lhDistanceFromTarget));

        motors.rhTarget = turn < 0 ? 1 : -1;
        motors.rhDistanceFromTarget = turnSensitivity * parseFloat(Math.abs(turn)) * (parseFloat(z) - parseFloat(motors.rhTarget));
        motors.rh = parseInt(paddle * 100 * (z - motors.rhDistanceFromTarget));
        console.log("Horizontal: " + motors.lh + ", " + motors.rh);

        motors.lvTarget = roll < 0 ? -1 : 1;
        motors.lvDistanceFromTarget = turnSensitivity * parseFloat(Math.abs(roll)) * (parseFloat(up) - parseFloat(motors.lvTarget));
        motors.lv = parseInt(paddle * 100 * (up - motors.lvDistanceFromTarget));

        motors.rvTarget = roll < 0 ? 1 : -1;
        motors.rvDistanceFromTarget = turnSensitivity * parseFloat(Math.abs(roll)) * (parseFloat(up) - parseFloat(motors.rvTarget));
        motors.rv = parseInt(paddle * 100 * (up - motors.rvDistanceFromTarget));
        console.log("Vertical: " + motors.lv + ", " + motors.rv);

        var jsonTemplate = {
            "op": "set",
            "device": "motorblock0",
            "register": "speed_fancy",
        }

        jsonTemplate.value = motors.lh;
        jsonTemplate.channel = 0;
        //console.log(JSON.stringify(jsonTemplate));
        if (websocketOn)
            socket.send(JSON.stringify(jsonTemplate));
        jsonTemplate.value = motors.rh;
        jsonTemplate.channel = 1;
        //console.log(JSON.stringify(jsonTemplate));
        if (websocketOn)
            socket.send(JSON.stringify(jsonTemplate));
        jsonTemplate.value = motors.lv;
        jsonTemplate.channel = 2;
        //console.log(JSON.stringify(jsonTemplate));
        if (websocketOn)
            socket.send(JSON.stringify(jsonTemplate));
        jsonTemplate.value = motors.rv;
        jsonTemplate.channel = 3;
        //console.log(JSON.stringify(jsonTemplate));
        if (websocketOn)
            socket.send(JSON.stringify(jsonTemplate));

        //request amps
        jsonTemplate = {
            "op": "get",
            "device": "cs0",
            "channel": 0,
            "register": "current"
        }

        if (websocketOn) {
            for (i = 0; i < 4; i++) {
                jsonTemplate.channel = i;
                socket.send(JSON.stringify(jsonTemplate));
            }
            jsonTemplate.channel = 0;
            jsonTemplate.device = "cs1";
            socket.send(JSON.stringify(jsonTemplate));
        }
        //socket.send("Test");
    } else {
        //Look for joystick
        for (i = 0; i < gamepads.length; i++) {
            if (gamepads[i].buttons.length > 0) {
                if (gamepads[i].buttons[0].pressed) {
                    gamepadIndex = i;
                    document.getElementById("info").classList.remove('hide');
                    document.getElementById("gamepad-init").classList.add('hide');

                    document.getElementById("xDropdown-trigger").textContent = "X axis: " + axes.x;
                    var xDropdown = document.getElementById("xDropdown");
                    for (j = 0; j < gamepads[i].axes.length; j++) {
                        var li = document.createElement("li");
                        var a = document.createElement("a");
                        a.textContent = j;
                        a.setAttribute("data-index", j);
                        a.setAttribute("data-axes", "x");
                        a.addEventListener("click", (click) => {
                            dropdown(click.srcElement.dataset.axes, click.srcElement.dataset.index);
                        });
                        li.appendChild(a);
                        xDropdown.appendChild(li);
                    }

                    document.getElementById("yDropdown-trigger").textContent = "Y axis: " + axes.y;
                    var yDropdown = document.getElementById("yDropdown");
                    for (j = 0; j < gamepads[i].axes.length; j++) {
                        var li = document.createElement("li");
                        var a = document.createElement("a");
                        a.textContent = j;
                        a.setAttribute("data-index", j);
                        a.setAttribute("data-axes", "y");
                        a.addEventListener("click", (click) => {
                            dropdown(click.srcElement.dataset.axes, click.srcElement.dataset.index);
                        });
                        li.appendChild(a);
                        yDropdown.appendChild(li);
                    }

                    document.getElementById("turnDropdown-trigger").textContent = "Twist axis: " + axes.turn;
                    var yDropdown = document.getElementById("turnDropdown");
                    for (j = 0; j < gamepads[i].axes.length; j++) {
                        var li = document.createElement("li");
                        var a = document.createElement("a");
                        a.textContent = j;
                        a.setAttribute("data-index", j);
                        a.setAttribute("data-axes", "turn");
                        a.addEventListener("click", (click) => {
                            dropdown(click.srcElement.dataset.axes, click.srcElement.dataset.index);
                        });
                        li.appendChild(a);
                        yDropdown.appendChild(li);
                    }

                    document.getElementById("paddleDropdown-trigger").textContent = "Paddle axis: " + axes.paddle;
                    var yDropdown = document.getElementById("paddleDropdown");
                    for (j = 0; j < gamepads[i].axes.length; j++) {
                        var li = document.createElement("li");
                        var a = document.createElement("a");
                        a.textContent = j;
                        a.setAttribute("data-index", j);
                        a.setAttribute("data-axes", "paddle");
                        a.addEventListener("click", (click) => {
                            dropdown(click.srcElement.dataset.axes, click.srcElement.dataset.index);
                        });
                        li.appendChild(a);
                        yDropdown.appendChild(li);
                    }
                    M.Dropdown.init(document.querySelectorAll('.dropdown-trigger'));
                }
            }
        }
    }
}

function toggleJoystick() {
    if (updater) {
        clearInterval(updater);
        updater = null;
        document.getElementById("joystick-toggle").classList.add("red");
    } else {
        document.getElementById("joystick-toggle").classList.remove("red");
        updater = window.setInterval(() => {
            update()
        }, 200);
    }
}

function toggleWebsocket() {
    if (websocketOn) {
        document.getElementById("websocket-toggle").classList.add("red");
        websocketOn = false;
    } else {
        document.getElementById("websocket-toggle").classList.remove("red");
        websocketOn = true;
    }
}

function dropdown(setAxis, value) {
    axes[setAxis] = value;
    document.getElementById(setAxis + "Dropdown-trigger").textContent = setAxis + " axis: " + value;
    console.log(axes.x);
    localStorage.setItem(setAxis, value);
}
