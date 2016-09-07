(function () {
    "use strict";

    var root = this;

    var canvas = document.getElementById("matrix");

    // fullscreen canvas
    if (window.devicePixelRatio && window.devicePixelRatio > 1) {
        // Use higher resolution on retina displays
        var canvasWidth = window.innerWidth;
        var canvasHeight = window.innerHeight;

        canvas.width = canvasWidth * window.devicePixelRatio;
        canvas.height = canvasHeight * window.devicePixelRatio;
        canvas.style.width = canvasWidth + "px";
        canvas.style.height = canvasHeight + "px";
        canvas.getContext('2d').scale(window.devicePixelRatio, window.devicePixelRatio);
    } else {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    var Pool = function (size) {
        var data = [];
        var maxPoolSize = size;

        var fetch = function () {
            var fetchSize = maxPoolSize - data.length;
            if (fetchSize <= 0) {
                return;
            }

            console.log("fetching: %s", fetchSize);

            $.ajax({
                url: 'https://github-matrix.herokuapp.com/fetch',
                cache: false,
                data: {fetchSize: fetchSize}
            }).done(function (result) {
                $.each(result, function (i, drop) {
                    data.push(new Drop(drop));
                });

                if (!Pool.ready && data.length >= (maxPoolSize / 2)) {
                    console.log('pool is ready');
                    Pool.onReady.call(root);
                    Pool.ready = true;
                }
            });
        };

        this.next = function () {
            return data.pop();
        };

        this.hasNext = function () {
            return data.length > 0;
        };

        this.setMaxPoolSize = function (newSize) {
            maxPoolSize = newSize;
        };

        this.schedule = function (onReady) {
            if (Pool.scheduling) {
                return;
            }

            console.log('scheduling pool');

            Pool.ready = false;
            Pool.onReady = onReady;
            Pool.scheduling = true;

            fetch();
            setInterval(fetch, 5000);
        };
    };

    var Drop = function (commit) {
        var text = '@' + commit.user + commit.code;

        this.draw = function (ctx, posX, posY, y) {
            if (y < commit.user.length + 1) {
                ctx.shadowColor = '#FFF';
                ctx.fillStyle = "#FFF";
            } else {
                ctx.fillStyle = "#0F0";
                ctx.shadowColor = '#0F0';
            }

            var char = text[y] || '';
            ctx.fillText(char, posX, posY);
        };
    };

    var Matrix = function (options) {
        var canvas = options.canvas,
            ctx = canvas.getContext("2d"),
            pool = new Pool(200),
            that = this,
            interval,
            numColumns,
            columns,
            drops = [];

        var initialize = function () {
            numColumns = Math.floor(canvas.width / options.fontSize);
            pool.setMaxPoolSize(numColumns * 2);
            columns = [];

            for (var col = 0; col < numColumns; col++) {
                columns[col] = canvas.height;
            }
        };

        var isReset = function (posY) {
            return posY > canvas.height && Math.random() > options.randomFactor;
        };

        var drawBackground = function () {
            ctx.shadowColor = 'black';
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.shadowBlur = 0;
            ctx.fillStyle = "rgba(0, 0, 0, " + options.alphaFading + ")";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        };

        var drawText = function () {
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.shadowBlur = 3;
            ctx.font = options.fontSize + "px 'Courier New'";

            for (var x = 0; x < columns.length; x++) {
                var posX = x * options.fontSize;
                var posY = columns[x] * options.fontSize;
                var y = columns[x] - 1;

                var drop = drops[x];
                if (!drop) {
                    drop = pool.next();
                    drops[x] = drop;
                }

                drop.draw(ctx, posX, posY, y);

                if (isReset(posY)) {
                    columns[x] = 0;
                    if (pool.hasNext()) {
                        drops[x] = null;
                    }
                }

                columns[x]++;
            }
        };

        var draw = function () {
            drawBackground();
            drawText();
        };

        this.start = function () {
            new Intro(options)
                .start()
                .then(function () {
                    pool.schedule(function () {
                        initialize();
                        that.play();
                        $(canvas).css('cursor', 'pointer');
                        $('.controls').show();
                    });
                });
        };

        this.pause = function () {
            if (!interval) return;

            console.log('pause');
            clearInterval(interval);
            interval = null;

            $('.play-toggle')
                .attr('title', 'Play [SPACE]')
                .find('.fa')
                .removeClass('fa-pause')
                .addClass('fa-play');
        };

        this.play = function () {
            if (interval) return;

            console.log('play');
            interval = setInterval(draw, options.intervalTime);

            $('.play-toggle')
                .attr('title', 'Pause [SPACE]')
                .find('.fa')
                .removeClass('fa-play')
                .addClass('fa-pause');
        };

        this.toggle = function () {
            if (interval) {
                this.pause();
            } else {
                this.play();
            }
        };


        $(window).on('resize', _.debounce(function () {
            that.pause();

            console.log('re-initialize after resize');
            canvas.height = window.innerHeight;
            canvas.width = window.innerWidth;
            initialize();

            that.play();
        }, 300));

    };

    var Intro = function (options) {
        var canvas = options.canvas;
        var ctx = canvas.getContext("2d");

        var xMax = Math.floor(canvas.width / options.fontSize);
        var yMax = Math.ceil(canvas.height / options.fontSize);

        var draw = function () {
            drawBackground();
            drawNumbers();
        };

        var drawBackground = function () {
            ctx.shadowColor = 'black';
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.shadowBlur = 0;
            ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        };

        var drawNumbers = function () {
            for (var x = 1; x < xMax; x++) {
                if (x % 16 === 0) continue;

                for (var y = 1; y < yMax; y++) {
                    //if (y % 16 === 0) continue;

                    ctx.shadowOffsetX = 0;
                    ctx.shadowOffsetY = 0;
                    ctx.shadowBlur = 3;
                    ctx.font = options.fontSize + "px 'Courier New'";
                    ctx.fillStyle = "#0F0";
                    ctx.shadowColor = '#0F0';

                    var posX = x * options.fontSize;
                    var posY = y * options.fontSize;

                    var num = Math.ceil(Math.random() * 9);
                    if (Math.random() > 0.99) {
                        num = 'π';
                    }

                    ctx.fillText(String(num), posX, posY);
                }
            }
        };

        this.start = function () {
            console.log('starting intro');
            var that = this;
            var interval = setInterval(draw, 150);
            setTimeout(function () {
                console.log('ending intro');
                clearInterval(interval);
                ctx.fillStyle = "#000";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                that.start.then();
            }, 2000);
            return that;
        };

        this.then = function (fn) {
            this.start.then = fn;
        };
    };

    var matrix = new Matrix({
        canvas: canvas,
        fontSize: 14,
        alphaFading: 0.04,
        randomFactor: 0.995,
        intervalTime: 120
    });
    matrix.start();

})();
