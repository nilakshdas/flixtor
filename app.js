var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    swig = require('swig'),
    path = require('path'),
    address = require('network-address'),
    io = require('socket.io').listen(server),
    readTorrent = require('read-torrent'),
    peerflix = require('peerflix'),
    vlc = require('vlc-api')(),
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
var vlc_process;

var status = {
    torrent: {
        address: null,
        streaming: false
    },
    vlc: {
        running: false
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

    socket.on('remote-Play', function() {
        console.log("Play button pressed");

        if (status.vlc.running) {
            vlc.status.resume();

            status.video.playing = true;
            io.sockets.emit('StatusUpdate', status);
        } else {
            status.video.stream_address = 'http://' + address() + ':' + engine.server.address().port;

            vlc_process = spawn('vlc', [
                status.video.stream_address, '--fullscreen',
                '--video-on-top', '--no-video-title-show'
            ]);

            vlc_process.on('exit', function(code) {
                status.vlc.running = false;
                status.video.playing = false;
                io.sockets.emit('StatusUpdate', status);
            });

            status.vlc.running = true;
            status.video.playing = true;
            io.sockets.emit('StatusUpdate', status);
        }
    });

    socket.on('remote-Pause', function() {
        console.log("Pause button pressed");

        if (status.vlc.running) {
            vlc.status.pause();

            status.video.playing = false;
            io.sockets.emit('StatusUpdate', status);
        }
    });

    socket.on('remote-Stop', function() {
        console.log("Stop button pressed");

        if (status.vlc.running) {
            vlc.status.stop();

            vlc_process.kill();

            status.vlc.running = false;
            status.video.playing = false;
            io.sockets.emit('StatusUpdate', status);
        }
    });

    socket.on('remote-Forward', function() {
        console.log("Forward button pressed");

        if (status.vlc.running) vlc.status.seek('+2', null);
    });

    socket.on('remote-Backward', function() {
        console.log("Backward button pressed");

        if (status.vlc.running) vlc.status.seek('-2', null);
    });
});