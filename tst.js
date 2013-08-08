var express = require('express'),
    app = express(),
	server = require('http').createServer(app),
    io = require('socket.io').listen(server),
	usernames = {},
	copyobj = function (obj) {
			var i,
				copy = (typeof obj === "object") ? ((obj instanceof Array) ? [] : {}) : obj;
			for (i in obj) {
				if (typeof obj[i] === "object") {
					copy[i] = copyObj(obj[i]);
				} else {
					copy[i] = obj[i];
				}
			}
			return copy;
		};
	
 // 8374 === BETH || BETA
server.listen(8374);

// On call, serve simple user interface file.
app.get('/', function (req, res) {
	res.sendfile(__dirname + '/usr-client/ui-proper.html');
});

// Use the libraries folder.
app.use('/lib', express.static(__dirname + '/usr-client/lib'));



io.sockets.on('connection', function (socket) {
	
	var bot = require('./bot-client/beth.js'), // load Beth file
		lib = require('./bot-client/lib/beth-agendas-test03.json'), // load the library
		nme = 'Beth', // name of Beth in chat
		lgi = false, // a flag to say whether or not Beth is logged in
		debugFn = function (msg) {
			io.sockets.emit("report", msg);
		},
		postMsg = function (input) {
			var debug;
			io.sockets.emit('updatedisplay', nme, input, new Date());
			if (input === (debug = expectation.shift())) {
				io.sockets.emit('updatedisplay', "SERVER", "*** Test " + results.tested + " PASSED!", new Date());
				results.passed += 1;
			} else {
				io.sockets.emit('updatedisplay', "SERVER", "*** Test " + results.tested + " FAILED: Expected -- " + debug, new Date());
				results.failed += 1;
			}
			results.tested += 1;
			if (!(expectation.length)) {
				i += 1
				if (i < lib.test.length) {
					expectation = copyobj(lib.test[i].o);
					io.sockets.emit('updatedisplay', "user", lib.test[i].i, new Date());
					if (lgi) {
						botobj.transform(lib.test[i].i);
					}
				} else {
					delete usernames[nme];
					io.sockets.emit('updateusers', usernames);
					socket.emit('updatedisplay', 'SERVER', 'user has disconnected', new Date());
					socket.emit('updatedisplay', 'SERVER', (function () {
						var rtn = "",
							percentage = (100 / results.tested) * results.passed;
						rtn += "Test unit completed. "
						rtn += percentage + "%";
						rtn += " " + results.passed + '/' + results.tested + ' passed.';
						return rtn;
					})(), new Date());
				}
			}
		},
		severFn = function () {
			delete usernames[nme];
			lgi = false;
			// update list of users in chat, client-side
			io.sockets.emit('updateusers', usernames);
			// echo globally that this client has left
			socket.emit('updatedisplay', 'SERVER', nme + ' has disconnected', new Date());
		},
		botobj, // variable declaration for Beth model
		i = 0,
		expectation = copyobj(lib.test[i].o),
		results = {
			passed: 0,
			failed: 0,
			tested: 0
		};
	
	usernames["user"] = "user";
	socket.emit('updatedisplay', 'SERVER', 'user has connected', new Date());
	io.sockets.emit('updateusers', usernames);
	
	usernames[nme] = nme;
	socket.emit('updatedisplay', 'SERVER', nme + ' has connected', new Date());
	io.sockets.emit('updateusers', usernames);
	// Set up Beth using the constructor provided by the model and the data from the library.
	botobj = new bot.BotObj(true, lib.data, postMsg, severFn, debugFn);
	lgi = true;	
	
	// when the user disconnects.. perform this
	socket.on('disconnect', function() {
		// remove the username from global usernames list
		delete usernames[socket.username];
		botobj.deactivate(); // Deactivate existing version of bot, allowing for refresh of page
		
		// update list of users in chat, client-side
		io.sockets.emit('updateusers', usernames);
		// echo globally that this client has left
		socket.broadcast.emit('updatedisplay', 'SERVER', socket.username + ' has disconnected', new Date());
		lgi = false;
	});
	
});
