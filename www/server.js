#!/usr/bin/env node

var sys = require("sys"),
 http = require("http"),
 url = require("url"),
 cache = require('memory-cache'),
 auth_config = require('./auth.js'),
 static = require('node-static');

proxyRequest = function(url, r) {
	if(resp = cache.get(url)) {
		sys.puts("From cache");
		r.setHeader("Access-Control-Allow-Origin", "*");
		r.write(resp)
		r.end();
		return
	}

	sys.puts("Calling "  + url);
		var request = require("request")
		var resp = ""
		request(url, function (error, response, body) {
			if (!error && response.statusCode == 200) {

				resp = cache.put(url, body, 15*60*1000)
			} else {
				resp = response.statusCode
			}
			r.setHeader("Access-Control-Allow-Origin", "*")
			r.write(cache.get(url))
			r.end();
		}).auth(auth_config.user, auth_config.pass, auth_config.sendImmediately);
}
http.createServer(function(request,response){
	var url_parts = url.parse(request.url, true);
    //response.writeHeader(200, {"Content-Type": "text/json"});
    if(url_parts.query.url) {
    	proxyRequest(url_parts.query.url, response)
    }

}).listen(8081);

sys.puts("Proxy running on 8081");

var file = new static.Server('.');

http.createServer(function (request, response) {
    request.addListener('end', function () {
        file.serve(request, response, function(err, result) {
        	if (err) { // There was an error serving the file
                sys.error("Error serving " + request.url + " - " + err.message);

                // Respond to the client
                response.writeHead(err.status, err.headers);
                response.end();
            }
        });
    }).resume();
}).listen(8080);
sys.puts("Server running on 8080");
