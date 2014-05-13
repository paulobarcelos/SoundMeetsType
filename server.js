var static = require('node-static');
var file = new static.Server('./dist');

var https = require('https');
var fs = require('fs');

var options = {
  key: fs.readFileSync('privatekey.pem'),
  cert: fs.readFileSync('certificate.pem')
};


https.createServer(options, function (request, response) {

	if(request.url == '/'){
		response.writeHead(302,	{Location: '/font-bump/index.html'});
		response.end();
		return;
	}

	request.addListener('end', function () {
		file.serve(request, response);
	});

	request.resume();
	
}).listen(process.env.VCAP_APP_PORT || process.env.PORT || 8686);


var childProcess = require('child_process'); 
childProcess.exec('open -a "/Applications/Google Chrome.app" https://soundmeetstype.dev:8686 --args --kiosk');