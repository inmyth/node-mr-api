# Mr Filter and API Key Provider in Node

## Mr Filter 
Mr Filter filters forbidden command and transaction from rippled request. 
- If request contains forbidden command, the program will pass `{command : }` to rippled.
- Payment to other users is forbidden but payment to issuer is allowed. Issuer addresses have to be put in config. 

### Setup
![MrFilter](https://ibb.co/g7VLbw)

- Deploy in a server and set where rippled endpoint and listening port for incoming request are. 
- Define all issuer addresses in `allowedPaymentDestinations`
- Set `isFilterOnly:true`

Typical config :
```
{
 "rippled" : "wss://r1.mr.exchange",
 "listeningPort" : 8080,
 "allowedPaymentDestinations" : [
 	"rqwertyuiopasdfghjkETC",
 	"rpoiuytrewqlkhggfdsJPY"
  ],
	"isFilterOnly" : true
}
```

## API Provider 
API Provider replaces user api key with his secret key then passes his request to rippled. 
Clients will send transactions with [sign and submit method](https://ripple.com/build/rippled-apis/#sign-and-submit-mode) like this. 
```
{
  "id": 1,
  "command": "submit",
  "tx_json": {
    "TransactionType": "OfferCreate",
    "Account": "rHMjZANhquizS74FutV3CNoWfQcoVkBxf",
    "TakerPays": "1",
    "TakerGets": {
       "currency": "JPY",
       "value" : "10",
       "issuer": "rB3gZey7VWHYRqJHLoHDEJXJ2pEPNieKiS"        
    }
  },
  "secret": "aAPIKEY",
  "offline": false,
  "fee_mult_max": 1000
}
```

### Setup
![APIProvider](https://ibb.co/fZbUKG)


- Deploy one Redis master. Restrict inbound access to Mr.ID server. Mr.ID will write (or delete) user's api key on it. 

Redis data has to be structured with 
```
HMSET address apikey "userapikey" secret "susersecret"
```  

- Deploy one Redis as slave of the previous master. Slave syncs the data with master and has read only access.  API Provider should also be deployed in the same server to reduce latency.

- Set `isFilterOnly:false ` in config


Typical config :
```
{
 "rippled" : "wss://r1.mr.exchange",
 "listeningPort" : 8080,
 "allowedPaymentDestinations" : [
 	"rqwertyuiopasdfghjkETC",
 	"rpoiuytrewqlkhggfdsJPY"
  ],
	"isFilterOnly" : false,
	"redis" : {
		"host" : "54.205.99.208",
		"port" : 6379,
		"password" : ""
	}
}
```

## Config
All configuration should be put in `config` file. It can be renamed from `config-template`. 

For MrFilter set `isFilterOnly:false`.

## Running
1. Install dependencies
```
npm install
```

2. Daemonize with forever
```
npm install forever -g
forever start -o out.log -e err.log index.js
```




##### Version Logs
03 merged

03
- API matcher
- updated config
- stopgap variable isFilterOnly introduced, will be removed after api backend is ready

#### apimatch
50
- tx_blob blocked, all tx will use unsafe methog with secret replaced with api key

#### mrfilter
20
- basic mr filter
- commands in whitelist allowed
- tx_blob allowed, payment to specific destinations allowed (issuer address for withdrawal) 

#### master
02
- allowed payment for specified destinations only (for user to withdraw or transfer)
- unblocked tx_blob for now

01. Mr Filter 
