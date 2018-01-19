# Mr Filter and API Matcher in Node

## Usage
All the configuration should be put in `config` file. 

1. Install dependencies
```
npm install
```

2. Daemonize with forever
```
npm install forever -g
forever start -o out.log -e err.log index.js
```

## Redis Data
Redis data has to be structured with
```
HMSET address apikey "userapikey" secret "susersecret"
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
