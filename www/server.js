var sys = require("sys"),  
 http = require("http"),
 url = require("url"),
 cache = require('memory-cache'),
 auth_config = require('./auth.js');

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
		sys.puts(auth_config.user)
		request(url, function (error, response, body) {
			if (!error && response.statusCode == 200) {

				resp = cache.put(url, body, 60000)
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
sys.puts("Server Running on 8081");   