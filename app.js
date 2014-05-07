var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    swig = require('swig'),
    path = require('path'),
    address = require('network-address'),
    io = require('socket.io').listen(server),
    readTorrent = require('read-torrent'),
    peerflix = require('peerflix'),
    spawn = require('child_process').spawn;

app.engine('html', swig.renderFile);

app.set('port', process.env.TEST_PORT || 3000);
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));

app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function(req, res) {
    res.render('index', {
        socket_address: 'http://' + address() + ':' + app.get('port')
    });
});

app.get('/remote', function(req, res) {
    res.render('remote', {
        socket_address: 'http://' + address() + ':' + app.get('port')
    });
});

server.listen(app.get('port'), function() {
    console.log("Express server started at http://" + address() + ':' + app.get('port'));
});

var engine;
var interval;
var swarm;

var status = {
    torrent: {
        address: null,
        streaming: false
    },
    video: {
        stream_address: null,
        playing: false
    }
};

io.set('log level', 1);

io.sockets.on('connection', function(socket) {
    socket.emit('StatusUpdate', status);

    socket.on('RequestStatusUpdate', function() {
        socket.emit('StatusUpdate', status);
    });

    socket.on('remote-LoadTorrent', function(torrent_address) {
        console.log("Loading torrent file " + torrent_address);

        readTorrent(torrent_address, function(err, torrent) {
            if (err) throw err;

            engine = peerflix(torrent, {
                connections: 100,
                path: '/tmp/flixtor'
            });

            engine.server.listen(8888);

            status.torrent.address = torrent_address;
            status.torrent.streaming = true;
            io.sockets.emit('StatusUpdate', status);

            console.log("Torrent streaming at http://" + address() + ':' + engine.server.address().port);

        });
    });

    socket.on('remote-loading', function() {
        swarm = engine.swarm;
        interval = setInterval (RepeatCall, 2000 );

        function RepeatCall() {
            var tmpProgress = swarm.downloaded/2097152;
            var progress = tmpProgress*100;
            io.sockets.emit('UpdateProgress', progress);

            console.log(swarm.downloaded);
            if( swarm.downloaded >= 2097152 ) {
                io.sockets.emit('UpdateProgress', 100);

                var href = "http://" + address() + ":" + engine.server.address().port;

                var html = '<video class="video-js vjs-default-skin"'+
                           'controls autoplay preload="auto" width="100%" height="100%"'+
                           'data-setup=\'{"example_option":true}\'>'+
                           '<source src="'+href+'" type="video/mp4" />'+
                           '</video>';

                io.sockets.emit('Html', html);
                clearInterval(interval);

            }
        }
    });

});