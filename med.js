var express = require('express'),
    app = express(),
	server = require('http').createServer(app),
	fs = require('fs'),
	pathname = '/dat/',
	filename,
	line_break = '\r\n',
    io = require('socket.io').listen(server);

server.listen(8374); // 8374 === BETH || BETA

app.get('/', function (req, res) {
	res.sendfile(__dirname + '/usr-client/ui-proper.html');
});

app.use('/lib', express.static(__dirname + '/usr-client/lib'));

console.log('Routes listed: ', app.routes);

var usernames = {};

io.sockets.on('connection', function (socket) {

	// when the client emits 'sendchat', this listens and executes
	socket.on('sendchat', function (data) {
		console.log(data);
		// we tell the client to execute 'updatechat' with 2 parameters
		io.sockets.emit('updatedisplay', socket.username, data, new Date());

		// Set up new date in parseable format.
		var d = new Date(),
			dt = "[" + d.toLocaleDateString() + " " + d.toTimeString().replace(/\s.*$/, "") + "]",
			save_msg = dt + " " + socket.username + ": " + data + line_break;

		// Save the latest message to the file.
		if (filename) {
			fs.appendFile(filename, save_msg, function (err) {
			if (err) throw err;
				console.log('Saved message to ' + filename + ' successfully.', 'Ready to be read now.');
			});
		}
	});

	// when the client emits 'adduser', this listens and executes
	socket.on('adduser', function(username) {
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

		// If bot has logged in, create file...
		if (username !== "user") {
			filename = __dirname + pathname + username + "_anon_" + (new Date()).toISOString().replace(/\W+/g, "").replace(/T\d+Z$/, "") + ".txt";
		}

	});

	// when the user disconnects.. perform this
	socket.on('disconnect', function(){
		// remove the username from global usernames list
		delete usernames[socket.username];
		// update list of users in chat, client-side
		io.sockets.emit('updateusers', usernames);
		// echo globally that this client has left
		socket.broadcast.emit('updatedisplay', 'SERVER', socket.username + ' has disconnected', new Date());
	});
});
