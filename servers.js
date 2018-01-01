const logger = require('./logger');

const express = require('express');
const router = express.Router();

const config = require('config').query;

if (!config) {
	logger.error('No query configuration found.');
	process.exit(1);
}

var servers = {};

const dgram = require('dgram');

function ipToStr(ipInt) {
    var ipStr = ((ipInt >> 24) & 0xFF).toString() + '.';
    ipStr += ((ipInt >> 16) & 0xFF).toString() + '.';
    ipStr += ((ipInt >> 8) & 0xFF).toString() + '.';
    ipStr += ((ipInt >> 0) & 0xFF).toString();

    return ipStr;
}

function queryServer(address, cb) {
	const client = dgram.createSocket('udp4');

	client.on('error', (err) => {
		console.error(err);
		client.close();
	});

	client.on('message', (msg, rinfo) => {
		client.close();

		var str = msg.slice(4).toString('utf8');
        var data = str.split('\n')[1].split('\\');

        var fields = {};

        for (var i = 1; i < data.length; i += 2) {
            fields[data[i]] = data[i + 1];
        }

        cb({
        	hostName: fields['hostname'],
        	gameType: fields['gametype'],
        	mapName: fields['mapname'],
        	players: parseInt(fields['clients']),
        	maxPlayers: parseInt(fields['sv_maxclients']),
			lastSeen: (new Date()).toISOString()
        });
	});

	var query = new Buffer('\xFF\xFF\xFF\xFFgetinfo xxx', 'ascii');

	var ip = address.split(':')[0];
	var port = address.split(':')[1];

	client.send(query, port, ip, (err) => {
		if (err) {
			console.log(err);
		}
	});
}

function queryMaster(cb) {
	const client = dgram.createSocket('udp4');

	client.on('error', (err) => {
		console.log(err);
		client.close();
	});

	client.on('message', (message, rinfo) => {
		message = message.slice(22);

        for (var i = 0; i < message.length; i += 7) {
            var ip = message.readUInt32BE(i + 1);
            var port = message.readUInt16BE(i + 5);

            var ipStr = ipToStr(ip);

            // Skip on "EOT\0\0\0" (0x454f5400)
            if (ip !== 0x454f5400) {
                cb(ipStr + ":" + port);
            }
        }

        client.close();
	});

	// todo: use array for keywords
	var query = new Buffer(`\xFF\xFF\xFF\xFFgetservers ${config.game} ${config.protocol} ${config.keywords}`, 'ascii');

	client.send(query, config.port, config.host, (err) => {
		if (err) {
			console.log(err);
		}
	});
}

setInterval(() => {
	queryMaster((address) => {
		queryServer(address, (data) => {
			servers[address] = data;
		});
	});

	for (var address in servers) {
		var server = servers[address];

		if (((new Date()).getTime() - (new Date(server.lastSeen)).getTime()) > 5000) {
			logger.debug(`Removing server ${address}...`);
			delete servers[address];
		}
	}
}, 2000);

function getServers(req, res) {
    res.json(servers);
}

function getStats(req, res) {
	var playerCount = 0;
	var serverCount = 0;

	for (var address in servers) {
		var server = servers[address];
		playerCount += server.players;

		serverCount++;
	}

    res.json({
    	players: playerCount,
    	servers: serverCount
    });
}

router.get('/servers', getServers);
router.get('/stats', getStats);

module.exports = router;
