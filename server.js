var static = require('node-static');
var file = new static.Server('./dist');

var https = require('https');
var fs = require('fs');

var options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};

https.createServer(options, function (request, response) {

	if(request.url == '/'){
		response.writeHead(302,	{Location: '/font-bump'});
		response.end();
		return;
	}

	request.addListener('end', function () {
		file.serve(request, response);
	});

	request.resume();
	
}).listen(process.env.VCAP_APP_PORT || process.env.PORT || 8686);