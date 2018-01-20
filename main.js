"use strict";
module.exports = {
  jsonify : jsonify,
	config : config,
	filterConfig : filterConfig,
	redisConfig : redisConfig,
	validate : validate,
	process : process
}

const WebSocket = require('ws');
const fs 			  = require('fs');
const redis 		= require("redis");

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
  "submit", // only for MrFilter
  // "sign", // disabled, Mr Filter does offline sign, API Provider doesn't use it
  // "submit_multisigned", // this cannot work with sign and submit mode
  "book_offers",
  "subscribe",
  "unsubscribe"
  ];

// these txs will be used in API Provider
const transactionList = [
  "OfferCreate",
	"OfferCancel",
	"Payment"
  ];

const fakeCommand = JSON.stringify({
	command : ""
});

/**
 * @param raw request from ws0
 */
function process(raw, ws1, confs){
	let isFilterOnly = confs.mrf.isFilterOnly;
	jsonify(raw)
	.then(json => {
		return {json : json, valid :validate(json, isFilterOnly)};
	})
	.then(o => {
		let res = null;
		if (!o.valid.isValid){
			res = Promise.resolve(null);
		} else {
			if (o.valid.isTx && !isFilterOnly){
				res = apiMatch(o.json, confs.redis.hgetall);
			} else {
				res = Promise.resolve(o.json);
			}
		}
		return res;
	})
	.then(j =>{
		ws1.send(j !== null ? JSON.stringify(j) : fakeCommand);		
	})
	.catch(e => {	
		console.log("process caught : " + e);
		ws1.send(fakeCommand);
	});
	
}

/**
 * @param request
 * @returns {isValid : boolean, isTx : boolean}
 */
function validate(json, isFilterOnly) {
  return new Promise(function (resolve, reject){
	  	var validCommand = false;
	  	var validTransaction = false;
	  	try {
	  		if (commandList.indexOf(json.command) >= 0) {
	  			validCommand = true;
	  		}			
				if (json.tx_json !== undefined && json.tx_json.TransactionType !== undefined && transactionList.indexOf(json.tx_json.TransactionType) >= 0){
					if (isFilterOnly){
						reject(e); // Mr Filter doesn't allow raw tx
					} else {
						if (json.tx_json.TransactionType === "Payment"){
							if (allowedPaymentDestinations.indexOf(json.tx_json.Destination) >= 0){			
								validTransaction = true;
							} 
						} else {
							validTransaction = true;
						}
					}
				}				


	  		if (json.tx_blob !== undefined && !isFilterOnly) {
	  			reject(e); // API Provider doesn't allow tx_blob		
	  		}

	  		var res = {
	  				isValid : validCommand || validTransaction,
	  				isTx	 : validTransaction
	  		};	
	  		resolve(res);	
	  	} catch (e){
	  		reject(e);
	  	}
  });
}


function apiMatch(json, hgetall){
	let account = json.tx_json.Account;
	let secret  = json.secret;
	let res;
	if (account === undefined || secret === undefined){
		return Promise.reject("Request has no Account or secret");
	} else {
		return hgetall(account).then(o => {
			if (o === null){
				return Promise.reject(new Error("Account not found in db"));
			} else {
				json.secret = o.secret;
				return Promise.resolve(json);
			}		
		});	
	}
}


function filterConfig(o){
	let sinkHost = o.rippled;
	let sourceWs = new WebSocket.Server({
		port : o.listeningPort
	});
	let mrf = {
		rippled  :  sinkHost,
		sourceWs :  sourceWs,
		allowedPaymentDestinations : o.allowedPaymentDestinations,
		isFilterOnly : o.isFilterOnly
	}
	return mrf;
}


function redisConfig(o){
	let config = {
			host:o.redis.host, 
			port:o.redis.port
	};
	if (o.redis.password !== ""){
		config.password = o.redis.password;
	}	
	let redisCli = redis.createClient(config);
  let hgetallAsync = promisify(redisCli.hgetall).bind(redisCli);
	let redis = {
		client  : redisCli,
		hgetall : hgetallAsync
	}
	return redis;
}

function jsonify(raw){
 return	new Promise(function(resolve, reject) {
		try {
			resolve(JSON.parse(raw));
		}catch (e){
			reject(e);
		} 
	});

}

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
    })
  });
}