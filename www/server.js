#!/usr/bin/env node

var sys = require("sys"),
 http = require("http"),
 request = require("request"),
 url = require("url"),
 cache = require('memory-cache'),
 auth_config = require('./auth.js'),
 static = require('node-static'),
 file = new static.Server('.'),
 cache_static = false;

http.createServer(function(http_request,response){
	var url_parts = url.parse(http_request.url, true);
   	response.setHeader("Access-Control-Allow-Origin", "*");
    request_url = url_parts.query.url
    if(request_url) {
    	if(resp = cache.get(request_url) && cache_static) {
    		sys.puts("From cache");
    		response.write(resp)
    		response.end()
    	} else {
    		resp = ""
    		sys.puts("Calling " + request_url);
	    	request(request_url, function (jiraerror, jiraresponse, body) {
				if (!jiraerror && jiraresponse.statusCode == 200) {
					cache.put(request_url, body, 15*60*1000)
					resp = body
				} else {
					resp = jiraerror
				}
			})	.auth(auth_config.user, auth_config.pass, auth_config.sendImmediately)
				.pipe(response)
    	}
    } else {
		http_request.addListener('end', function () {
	        file.serve(http_request, response, function(err, result) {
	        	if (err) { // There was an error serving the file
	                sys.error("Error serving " + http_request.url + " - " + err.message);
	                response.writeHead(err.status, err.headers);
	                response.end();
	            }
	        });
	    }).resume();    	
    }

}).listen(8080);

sys.puts("Server running on 8080");
