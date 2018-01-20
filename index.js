"use strict";

const WebSocket = require('ws');
const {promisify, inspect} = require('util');
const {config, jsonify, filterConfig, redisConfig, process} = require('./main.js');
const configFilename = 'config';

function run(confs) {
	const rippled  = confs.mrf.rippled;
	const sourceWs = confs.mrf.sourceWs;
		
	sourceWs.on('connection', function connection(ws0) {
		const ws1 = new WebSocket(rippled);
		
		ws1.on('open', function open() {
			ws0.send('connected to ' + rippled);
			ws0.on('message', function incoming(message) {				
				process(message, ws1, confs);
			});
		});
		
		ws1.on('message', function incoming(message){
			ws0.send(message);
		});
		
		ws1.on('error', function error(r){
			ws0.send("Cannot connect to " + rippled);
			ws0.close();
		})
		
		ws0.on('close', function close() {
			ws1.close();
		});
			
	});
}

config(configFilename)
.then(o => {
	return filterConfig(o);
})
.then(mrfConfig => {
	let redisConfig = null;
	if (!mrfConfig.isFilterOnly){
		redisConfig = redisConfig(o);
	}	
	return {mrf : mrfConfig, redis : redisConfig};
})
.then((confs) => {
	run(confs);
})
.catch (e => {
	console.log("Cannot read config : " + e);
	process.exit(1);
});
