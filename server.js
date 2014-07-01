var static = require('node-static');
var file = new static.Server('./dist');

var http = require('http');
var fs = require('fs');

http.createServer(function (request, response) {

	if(request.url == '/'){
		response.writeHead(302,	{Location: '/font-bump/index.html'});
		response.end();
		return;
	}

	request.addListener('end', function () {
		file.serve(request, response);
	});

	request.resume();
	
}).listen(process.env.VCAP_APP_PORT || process.env.PORT || 7474);


var childProcess = require('child_process'); 
childProcess.exec('open -a "/Applications/Google Chrome.app" http://localhost:7474/ --args --kiosk');
