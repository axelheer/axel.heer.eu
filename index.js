(function (window) {
    var centerX = 0,
        centerY = 0,

        afar = [],
        comm = [],
        near = [],

        doc = window.document,

        scale = (function () {
            if (window.innerWidth) {
                return function () {
                    centerX = window.innerWidth / 2;
                    centerY = window.innerHeight / 2;
                };
            }
            return function () {
                centerX = doc.documentElement.clientWidth / 2;
                centerY = doc.documentElement.clientHeight / 2;
            };
        }()),

        frame = (function () {
            var request = window.requestAnimationFrame ||
                          window.msRequestAnimationFrame ||
                          window.mozRequestAnimationFrame ||
                          window.webkitRequestAnimationFrame,
                timeout = window.setTimeout;
            if (request) {
                return function (callback) {
                    timeout(request, 25, callback);
                };
            }
            return function (callback) {
                timeout(callback, 50);
            };
        }()),

        rand = (function () {
            var next = Math.random;
            return function () {
                return next() < 0.5 ? -1 * next() : next();
            };
        }()),

        step = function (item, speed) {
            item.x *= speed;
            item.y *= speed;
            if (item.x < -1 || 1 < item.x || item.y < -1 || 1 < item.y) {
                item.x = rand();
                item.y = rand();
            }
            item.e.style.left = centerX * (1 + item.x) + "px";
            item.e.style.top = centerY * (1 + item.y) + "px";
        },

        move = function () {
            var i = 0;
            scale();
            for (i = 0; i < afar.length; i++) {
                step(afar[i], 1.002);
            }
            for (i = 0; i < comm.length; i++) {
                step(comm[i], 1.004);
            }
            for (i = 0; i < near.length; i++) {
                step(near[i], 1.008);
            }
            frame(move);
        },

        star = function (container) {
            var item = {
                e: doc.createElement("SPAN"),
                x: rand(),
                y: rand()
            };
            item.e.className = "star";
            container.appendChild(item.e);
            return item;
        },

        init = function (count) {
            var i = 0,
                c = doc.getElementById("stars");
            if (!c) {
                c = doc.createElement("DIV");
                c.id = "stars";
                for (i = 0; i < count / 2; i++) {
                    afar.push(star(c));
                }
                for (i = 0; i < count / 3; i++) {
                    comm.push(star(c));
                }
                for (i = 0; i < count / 6; i++) {
                    near.push(star(c));
                }
                doc.body.insertBefore(c, doc.body.firstChild);
                frame(move);
            }
        };

    window.stars = {
        init: init
    };
}(window));

window.stars.init(60);
