/* for node.js */

var http = require('http'),
	prompt = require('readline').createInterface({
		input: process.stdin,
		output: process.stdout
	});
	
prompt.question("Which library? ", function (whichlib) {
	"use strict"
	var lib = require("./bot-client/lib/" + whichlib),
		rules = lib.data.ruleset,
		parse = function (ruleset, prefix) {
			console.log((typeof prefix === "string") ? "true" : "false");
			var key,
				str = "",
				prefix = prefix || "",
				num = 1;
			for (key in ruleset) {
				str += prefix + " " + num +  ". "  + key + "\n";
				str += (ruleset[key].hasOwnProperty("ruleset"))
					? parse(ruleset[key].ruleset, prefix + "\t")
					: "";
				num += 1;
			}
			return str;
		},
		str = parse(rules, "");
	console.log("Ready to serve page.");
	http.createServer(function (req, res) {
		console.log('Server running at http://127.0.0.1:8124/');
		res.writeHead(200, {'Content-Type': 'text/plain'});
		res.write(str);
		res.end();
	}).listen(8124, "127.0.0.1");
});

