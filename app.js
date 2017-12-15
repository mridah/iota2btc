/*
	iota2btc
	File: app.js
	Author: Mridul Ahuja
*/

var express = require('express');
var app = express();

var unirest = require('unirest');
var bodyParser = require('body-parser');
var urlencodedParser = bodyParser.urlencoded({ extended: false });
const fs = require('fs');
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const dateTime = require('node-datetime');
const Log = require('log');
var log = new Log('debug', fs.createWriteStream('requests.log'))


app.disable('x-powered-by');


/************************************************************************************
*								MIDDLEWARE STARTS HERE								*
************************************************************************************/



var guard = function(req, res, next){

	res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
	res.header('Expires', '-1');
	res.header('Pragma', 'no-cache');

/*	var requestId = crypto.randomBytes(20).toString('hex');
	res.setHeader('request-id', requestId);
*/

	next();
};



app.use(guard);



app.get('/:cur/:quant', function(req, res) {
    var params = req.params;
	var  cur  = params.cur;
	var quant = parseFloat(params.quant);

	var dt = dateTime.create();
	var formatted = dt.format('Y-m-d H:M:S');

	try {
		var logData = '\nHOST: ' + req.get('Host')
			+ '\nIP ADDRESS: ' + req.connection.remoteAddress
	}
	catch(err) {

	}


	if(isNaN(quant)) {
		logData += '\nRESPONSE: ' + '[BAD REQUEST]\nFAIL REASON: NaN QUANT';
		log.error(logData);
		res.json({ success: false, message: 'Bad request' });
		return;
	}


	unirest.get('https://zebpay-public-data.firebaseio.com/.json?print=pretty')
		.headers({'Accept': 'application/json', 'Content-Type': 'application/json'})
		.send()
		.end(function (response) {
			var curData = response.body['rates'][cur];
			var curMode;

			if(curData)
				curMode = parseFloat(curData['sellRate']);
			else {
				logData += '\nRESPONSE: ' + '[BAD REQUEST]\nFAIL REASON: curData undefined\n-----------------------';
				log.error(logData);
				res.json({ success: false, message: 'Bad request' });
				return;
			}

			unirest.get('https://api.bitfinex.com/v2/tickers?symbols=tIOTBTC')
				.send()
				.end(function (response) {
					var body = response.body;
					body = JSON.stringify(body);

					body = body.split('[').join('');
					body = body.split(']').join('');
					body = body.split(',');
					var valToGet = parseFloat(body[7]);

					if(!isNaN(valToGet)) {
						var finalResult = curMode * quant * valToGet;
						logData += '\nRESPONSE: ' + '[SUCCESS] => ' + finalResult + '\n-----------------------';
						log.info(logData);
	  					res.json({ success: true, response: finalResult});
					}
	  				else {
	  					logData += '\nRESPONSE: ' + '[UNKNOWN ERROR]\nFAIL REASON: NaN valToGet\n-----------------------';
						log.error(logData);
	  					res.json({ success: false, message: 'Unknwn error' });
	  					return;
	  				}
			});


	});


});



app.get('*', function(req, res){
  res.json({error: true, message: 'Endpoint not found'});
});

module.exports = app;



String.prototype.replaceAll = function (find, replace) {
    var str = this;
    return str.replace(new RegExp(find, 'g'), replace);
};