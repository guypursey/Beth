var ioc = require('socket.io-client'),
	bot,
	lib,
	botobj,
	prompt = require('readline').createInterface({
		input: process.stdin,
		output: process.stdout,
		botname: '',
		library: ''
	}),
	express = require('express'),
    app = express(),
	server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    postMsg,
	severFn,
	debugFn,
	settings = ["beth", "beth", "beth-eliza-orig"];

prompt.question("Which bot model do you want to load? ", function (botfile) {
	
	bot = require('./bot-client/' + botfile + '.js');
	console.log("The bot model chosen is " + botfile);
	
	prompt.question("What should the bot's name be? ", function (botname) {
			
			console.log("The bot's name is " + botname);
			prompt.botname = botname;
			
			prompt.question("Which library of rules should " + botname + " use? ", function (botlib) {
			
				// Load requested library/ruleset.
				console.log("Deploying library: ", botlib);
				lib = require('./bot-client/lib/' + botlib);
				
				// Serve console.
				server.listen(8375);
				app.get('/', function (req, res) {
					res.sendfile(__dirname + '/bot-client/ui-console.html');
				});
				
				//Because this is a user interface to see what the bot is up to, use the usr-client library.
				app.use('/ui-lib', express.static(__dirname + '/usr-client/lib'));
				
				// Send hello report to ui-console signify successful connection to server.
				io.sockets.on('connection', function (serversocket) {
					serversocket.emit("report", "Hello.");
					
					//Create callback to pass to Beth.
					debugFn = function (msg) {
						serversocket.emit("report", msg);
					};
				
					console.log("debugFn-bot.js", debugFn);
					
					// Create instance of Beth object as actor in conversation.
					console.log("data:", lib.data);

					var clientsocket = ioc.connect('http://localhost:8374');
					console.log('Connecting to mediator...');
					
					// prepare callback for use within bot
					postMsg = function (input) {
						clientsocket.emit('sendchat', input);
					};
					
					severFn = function () {
						clientsocket.emit('disconnect');
						process.exit();
					};
					
					botobj = new bot.BotObj(true, lib.data, postMsg, severFn, debugFn);

					
					// on connection to server, ask for user's name with an anonymous callback			
					clientsocket.on('connect', function(){
						console.log('Connected!');
						// call the server-side function 'adduser' and send one parameter (value of prompt)
						clientsocket.emit('adduser', prompt.botname);
					});
					
					clientsocket.on('updatedisplay', function (username, data, datetime) {
						console.log("updating chat");
						if (username !== prompt.botname && username !== 'SERVER') {
							// is there a better model than this conditional to stop eliza from looping?
							botobj.transform(data);
							//setTimeout(function () { clientsocket.emit('sendchat', botobj.transform(data)) }, 2000);
						}
						// TODO: Compare with the user end. A similar model is required.
					});
				});
			});
		});
});
