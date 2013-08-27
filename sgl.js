var express = require('express'),
    app = express(),
	server = require('http').createServer(app),
    io = require('socket.io').listen(server), // 
	ioc = require('socket.io-client');

	
 // 8374 === BETH || BETA
server.listen(8374);

// On call, serve simple user interface file.
app.get('/', function (req, res) {
	res.sendfile(__dirname + '/usr-client/ui-proper.html');
});

// Use the libraries folder.
app.use('/lib', express.static(__dirname + '/usr-client/lib'));

// Set up Beth using the constructor provided by the model and the data from the library.


var usernames = {};

io.sockets.on('connection', function (socket) {
	
	var bot, // load Beth file
		lib, // load the library
		nme = 'Beth', // name of Beth in chat
		lgi = false, // a flag to say whether or not Beth is logged in
		debugFn = function (msg) {
			io.sockets.emit("report", msg);
		},
		postMsg = function (input) {
			io.sockets.emit('updatedisplay', nme, input, new Date());
		},
		severFn = function () {
			delete usernames[nme];
			lgi = false;
			//process.exit();
			// update list of users in chat, client-side
			io.sockets.emit('updateusers', usernames);
			// echo globally that this client has left
			socket.emit('updatedisplay', 'SERVER', nme + ' has disconnected', new Date());
		},
		botobj; // variable declaration for Beth model
	
	// when the client emits 'sendchat', this listens and executes
	socket.on('sendchat', function (data) {
		console.log(data);
		// we tell the client to execute 'updatechat' with 2 parameters
		io.sockets.emit('updatedisplay', socket.username, data, new Date());
		if (socket.username !== nme && socket.username !== 'SERVER') {
			// is there a better model than this conditional to stop eliza from looping?
			if (lgi) {
				botobj.transform(data);
			};
			//setTimeout(function () { clientsocket.emit('sendchat', botobj.transform(data)) }, 2000);
		}
	});

	// when the client emits 'adduser', this listens and executes
	socket.on('adduser', function(username){
		var datetime = new Date(),
			datetimeStr = '[' + datetime.getDate() + '/' + (+datetime.getMonth() + 1) + '/' +
			datetime.getFullYear() + ' ' + datetime.toLocaleTimeString() + ']';
		// we store the username in the socket session for this client
		socket.username = username;
		// add the client's username to the global list
		usernames[username] = username;
		// echo to client they've connected
		socket.emit('updatedisplay', 'SERVER', 'you have connected', datetimeStr);
		// echo globally (all clients) that a person has connected
		socket.broadcast.emit('updatedisplay', 'SERVER', username + ' has connected', datetimeStr);
		// update the list of users in chat, client-side
		io.sockets.emit('updateusers', usernames);
		if (!lgi) {
				usernames[nme] = nme;
				socket.broadcast.emit('updatedisplay', 'SERVER', nme + ' has connected', datetimeStr);
				io.sockets.emit('updateusers', usernames);
				bot = require('./bot-client/beth.js');
				lib = require('./bot-client/lib/beth-agenda-imcdv5.json');
				botobj = new bot.BotObj(true, lib.data, postMsg, severFn, debugFn);
				lgi = true;
		}
	});

	// when the user disconnects.. perform this
	socket.on('disconnect', function(){
		// remove the username from global usernames list
		delete usernames[socket.username];
		botobj.deactivate();
		// update list of users in chat, client-side
		io.sockets.emit('updateusers', usernames);
		// echo globally that this client has left
		socket.broadcast.emit('updatedisplay', 'SERVER', socket.username + ' has disconnected', new Date());
	});
});
