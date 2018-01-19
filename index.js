"use strict";

const WebSocket = require('ws');
const fs 			  = require('fs');
const redis = require("redis");
const {promisify, inspect} = require('util');
const configFilename = 'config';

const commandList = [
  "account_currencies",
  "account_info",
  "account_lines",
  "account_offers",
  "account_objects",
  "account_tx",
  "ledger",
  "ledger_closed",
  "ledger_current",
  "ledger_data",
  "ledger_entry",
  "ledger_request",
  "ledger_accept",
  "tx",
  "transaction_entry",
  "tx_history",
  "path_find",
  "ripple_path_find",
  "submit",
  "sign",
  //    "submit_multisigned", // this cannot work with sign and submit mode
  "book_offers",
  "subscribe",
  "unsubscribe"
  ];

const transactionList = [
  "OfferCreate",
	"OfferCancel",
	"Payment"
  ];

const fakeCommand = JSON.stringify({
	command : ""
})

var sinkHost;
var sourceWs;
var allowedPaymentDestinations;
var isFilterOnly;
var redisCli;
var hgetallAsync;

function config(filename){
  return new Promise(function (resolve, reject){
    fs.readFile(filename, 'utf8', function (err, res){
      if (err) reject(err);
      try {
        let obj = JSON.parse(res);
        resolve (obj);
      } catch (e){
      	  reject(e);
      }
    });
  });
}

/*
  {
  "id": 2,
  "command": "sign",
  "tx_json" : {
      "TransactionType" : "OfferCreate",
      "Account" : "rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn",
      "Destination" : "ra5nK24KXen9AHvsdFTKHSANinZseWnPcX",
      "Amount" : {
         "currency" : "USD",
         "value" : "1",
         "issuer" : "rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn"
      }
   },
   "secret" : "sgsss",
   "offline": false,
   "fee_mult_max": 1000
}

{"command": "tx"}
 
 
 */

//redis entry
//save HSET
//get HGETALL
//fields : 
//secret-key = "secretKey"
//api-key = "apiKey"
//
//
//def getSecretKey(in: JsValue): Option[String] = {
//    val apiKey = (in \ "secret").as[String]
//    val address = ((in \ "tx_json") \ "Account").as[String]
//    val entry = jedis.hgetAll(address)
//    if (!entry.isEmpty() && entry.containsKey(nameApiKey) && entry.get(nameApiKey) == apiKey) {
//      Option(entry.get(nameApiKey))
//    } else {
//      Option("sXXX")
//    }
//}

//function getSecretKey(json) {
//	let 
//	
//}

function jsonify(raw){
 return	new Promise(function(resolve, reject) {
		try {
			resolve(JSON.parse(raw));
		}catch (e){
			reject(e);
		} 
	});
}

/**
 * 
 * @param request
 * @returns {isValid : boolean, isTx : boolean}
 */
function validate(json) {
  return new Promise(function (resolve, reject){
	  	var validCommand = false;
	  	var validTransaction = false;
	  	var noTxBlob = false;
	  	try {
	  		if (commandList.indexOf(json.command) >= 0) {
	  			validCommand = true;
	  		}			
	  		if (transactionList.indexOf(json.tx_json.TransactionType) >= 0){
	  			if (json.tx_json.TransactionType === "Payment"){
	  				if (	allowedPaymentDestinations.indexOf(json.tx_json.Destination) >= 0){			
	  					validTransaction = true;
	  				} 
	  			} else {
	  				validTransaction = true;
	  			}
	  		}
	  		if (json.tx_blob === undefined) {
	  			noTxBlob = true;			
	  		}

	  		var res = {
	  				isValid : isFilterOnly ? (validCommand || validTransaction) : ((validCommand || validTransaction) && noTxBlob),
	  				isTx	 : validTransaction
	  		};	
	  		resolve({json: json, valid: res});	
	  	} catch (e){
	  		reject(e);
	  	}
  });
}

/**
 * 
 * @param raw request from ws0
 * @returns not null string
 */
 function process(raw, ws1){
	jsonify(raw)
	.then(json => {
		return validate(json);
	})
	.then(o => {
		let res = null;
		if (!o.valid.isValid){
			res = Promise.resolve(null);
		} else {
			if (o.valid.isTx && isFilterOnly){
				res = apiMatch(o.json);
			} else {
				res = Promise.resolve(o.json);
			}
		}
		return res;
	})
	.then(j =>{
		ws1.send(JSON.stringify(j));		
	})
	.catch(e => {	
		console.log("process caught : " + e);
		ws1.send(fakeCommand);
	});
	
}

function apiMatch(json){
	let account = json.tx_json.Account;
	let secret  = json.secret;
	let res;
	if (account === undefined || secret === undefined){
		return Promise.reject("Request has no Account or secret");
	} else {
		return hgetallAsync(account).then(o => {
			if (o === null){
				return Promise.reject(new Error("Account not found in db"));
			} else {
				json.secret = o.secret;
				return Promise.resolve(json);
			}		
		});	
	}
}

function run() {
	sourceWs.on('connection', function connection(ws0) {
		const ws1 = new WebSocket(sinkHost);
		
		ws1.on('open', function open() {
			ws0.send('connected to ' + sinkHost);
			ws0.on('message', function incoming(message) {				
				process(message, ws1);
			});
		});
		
		ws1.on('message', function incoming(message){
			ws0.send(message);
		});
		
		ws1.on('error', function error(r){
			ws0.send("Cannot connect to " + sinkHost);
			ws0.close();
		})
		
		ws0.on('close', function close() {
			ws1.close();
		});
			
	});
}

function filterConfig(o){
	sinkHost = o.rippled;
	sourceWs = new WebSocket.Server({
		port : o.listeningPort
	});
	allowedPaymentDestinations = o.allowedPaymentDestinations;
	isFilterOnly = o.isFilterOnly;
	return;
}

function redisConfig(o){
	let config = {
			host:o.redis.host, 
			port:o.redis.port
	};
	if (o.redis.password !== ""){
		config.password = o.redis.password;
	}
	redisCli = redis.createClient(config);
  hgetallAsync = promisify(redisCli.hgetall).bind(redisCli);
	return;
}

config(configFilename)
.then(o => {
	filterConfig(o);
	return o;
})
.then(o => {
	if (!isFilterOnly){
		redisConfig(o);
	}	
	return;
})
.then(() => {
//	let a1 = '{\r\n  \"id\": 2,\r\n  \"command\": \"aaa\",\r\n  \"tx_json\" : {\r\n\"TransactionType\" : \"OfferCreate\",\r\n \"Account\" : \"rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn\",\r\n      \"Destination\" : \"ra5nK24KXen9AHvsdFTKHSANinZseWnPcX\",\r\n      \"Amount\" : {\r\n         \"currency\" : \"USD\",\r\n         \"value\" : \"1\",\r\n         \"issuer\" : \"rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn\"\r\n      }\r\n   },\r\n   \"secret\" : \"sgsss\",\r\n   \"offline\": false,\r\n   \"fee_mult_max\": 1000\r\n}'
//	let a2 = '{\"command\": \"aa\"}';
//	let c1 = '{\r\n  \"id\": 2,\r\n  \"command\": \"sign\",\r\n  \"tx_json\" : {\r\n\"TransactionType\" : \"OfferCreate\",\r\n \"Account\" : \"wallet1\",\r\n      \"Destination\" : \"ra5nK24KXen9AHvsdFTKHSANinZseWnPcX\",\r\n      \"Amount\" : {\r\n         \"currency\" : \"USD\",\r\n         \"value\" : \"1\",\r\n         \"issuer\" : \"rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn\"\r\n      }\r\n   },\r\n   \"secret\" : \"wallet1api\",\r\n   \"offline\": false,\r\n   \"fee_mult_max\": 1000\r\n}'
//		
//	process(c1);
	
//	hgetallAsync("wallet1").then(a => console.log(a.apikey));
//	console.log('a');
	run();
})
.catch (e => {
	console.log("Cannot read config : " + e);
	process.exit(1);
});