const {jsonify, validate} = require('./main.js');
var chai = require('chai');
var expect = chai.expect;
var assert = require('assert');




var bad01 = 'yayaya';
/* bad02 
{
	"command" : "bla"
}
*/
var bad02 = '{\"command\" : \"bla\"}';
/* bad03
{
	"command" : "account_info"
}
*/
var bad03 = '{\"command\" : \"account_info\"}';
/* offerCreate01
{
  "id": 2,
  "command": "submit",
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
   "secret" : "wallet1api",
   "offline": false,
   "fee_mult_max": 1000
}
*/
var offerCreate01 = '{\r\n  \"id\": 2,\r\n  \"command\": \"sign\",\r\n  \"tx_json\" : {\r\n      \"TransactionType\" : \"OfferCreate\",\r\n      \"Account\" : \"rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn\",\r\n      \"Destination\" : \"ra5nK24KXen9AHvsdFTKHSANinZseWnPcX\",\r\n      \"Amount\" : {\r\n         \"currency\" : \"USD\",\r\n         \"value\" : \"1\",\r\n         \"issuer\" : \"rf1BiGeXwwQoi8Z2ueFYTEXSwuJYfV2Jpn\"\r\n      }\r\n   },\r\n   \"secret\" : \"sgsss\",\r\n   \"offline\": false,\r\n   \"fee_mult_max\": 1000\r\n}';

/*
{
  "id": 1,
  "command": "account_info",
  "account": "r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59"
}
*/
var accountInfo01 = '{\r\n  \"id\": 1,\r\n  \"command\": \"account_info\",\r\n  \"account\": \"r9cZA1mLK5R5Am25ArfXFmqgNwjZgnfk59\"\r\n}';

/* txBlob01
{
	"id": 3,
	"command": "submit",
	"tx_blob": "1200002280000000240000001E61D4838D7EA4C6800000000000000000000000000055534400000000004B4E9C06F24296074F7BC48F92A97916C6DC5EA968400000000000000B732103AB40A0490F9B7ED8DF29D246BF2D6269820A0EE7742ACDD457BEA7C7D0931EDB7447304502210095D23D8AF107DF50651F266259CC7139D0CD0C64ABBA3A958156352A0D95A21E02207FCF9B77D7510380E49FF250C21B57169E14E9B4ACFD314CEDC79DDD0A38B8A681144B4E9C06F24296074F7BC48F92A97916C6DC5EA983143E9D4A2B8AA0780F682D136F7A56D6724EF53754"
}
*/
var txBlob01 = '{\r\n\t\"id\": 3,\r\n\t\"command\": \"submit\",\r\n\t\"tx_blob\": \"1200002280000000240000001E61D4838D7EA4C6800000000000000000000000000055534400000000004B4E9C06F24296074F7BC48F92A97916C6DC5EA968400000000000000B732103AB40A0490F9B7ED8DF29D246BF2D6269820A0EE7742ACDD457BEA7C7D0931EDB7447304502210095D23D8AF107DF50651F266259CC7139D0CD0C64ABBA3A958156352A0D95A21E02207FCF9B77D7510380E49FF250C21B57169E14E9B4ACFD314CEDC79DDD0A38B8A681144B4E9C06F24296074F7BC48F92A97916C6DC5EA983143E9D4A2B8AA0780F682D136F7A56D6724EF53754\"\r\n}';

describe('#validate test isFilterOnly = true, all isTx is false', function() {	
	var isFilterOnly = true;
	
	it('bad02 is has command but doesnt have whitelisted value so its not valid', async () => {
		const result = await jsonify(bad02).then(j => validate(j, isFilterOnly));
		expect(result).to.include({ isValid: false, isTx: false })
	});
	
	
	it('bad03 passes validation although the missing fields will return error response from rippled', async () => {
		const result = await jsonify(bad03).then(j => validate(j, isFilterOnly));
		expect(result).to.include({ isValid: true, isTx: false })
	});
	
	
	it('accountInfo01 should be valid', async () => {
		const result = await jsonify(accountInfo01).then(j => validate(j, isFilterOnly));
		expect(result).to.include({ isValid: true, isTx: false })
	});

	it('offerCreate01 and any tx should throw error. In MrFilter tx is signed offline and turned into tx_blob', async () => {	
		let result = undefined;
		try {
			result = await jsonify(offerCreate01).then(j => validate(j, isFilterOnly));;
		}catch(e){}
		expect(result).to.equal(undefined);
	});
	
	it('txBlob01 should be both valid and tx, it is well formed', async () => {
		const result = await jsonify(txBlob01).then(j => validate(j, isFilterOnly));
		expect(result).to.include({ isValid: true, isTx: false })
	});
	

});

describe('#validate test isFilterOnly = false', function() {	
	var isFilterOnly = false;
	
	it('bad02 is has command but doesnt have whitelisted value so its not valid', async () => {
		const result = await jsonify(bad02).then(j => validate(j, isFilterOnly));
		expect(result).to.include({ isValid: false, isTx: false })
	});
	
	
	it('bad03 passes validation although the missing fields will return error response from rippled', async () => {
		const result = await jsonify(bad03).then(j => validate(j, isFilterOnly));
		expect(result).to.include({ isValid: true, isTx: false })
	});
	
	
	it('accountInfo01 should be valid', async () => {
		const result = await jsonify(accountInfo01).then(j => validate(j, isFilterOnly));
		expect(result).to.include({ isValid: true, isTx: false })
	});

	it('offerCreate01 and any tx should pass. API provider uses unsafe method where secret is replaces with apikey', async () => {	
		const result = await jsonify(offerCreate01).then(j => validate(j, isFilterOnly));
		expect(result).to.include({ isValid: true, isTx: true })
	});
	
	it('txBlob01 should be blocked', async () => {
		let result = undefined;
		try {
			result = await jsonify(txBlob01).then(j => validate(j, isFilterOnly));
		}catch(e){}
		expect(result).to.equal(undefined);
	});
	

});


describe('#jsonify test', function() {
	it('bad02 parses and should have key command', async () => {
		const result = await jsonify(bad02);
		expect(result).to.have.property("command");
	});
	
	it('bad01 wont parse because its not json', async () => {
		let result = undefined;
		try {
			result = await jsonify(bad01);
		}catch(e){}
		expect(result).to.equal(undefined);
	});
	

});


describe('Array', function() {
  describe('#indexOf()', function() {
    it('should return -1 when the value is not present', function() {
      assert.equal([1,2,3].indexOf(4), -1);
    });
  });
});
