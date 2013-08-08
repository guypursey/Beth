#BETH#

##v0.3.9##

LATEST: Fixed problem with refresh pages served from `sgl.js` and `tst.js` and enabled dates and messages to be parsed in a [Skype-parser](https://github.com/guypursey/Skype-parser) compatible way. Issues-wise, fixes [#33](https://github.com/guypursey/Beth/issues/33) and closes [#30](https://github.com/guypursey/Beth/issues/30).

This is all very much a work in progress.


###USING BETH###

There are two ways to run Beth.

The simplest (though still experimental) way is to open up a Node JS terminal and run `sgl.js` with the command `node sgl` if you are located in the Beth folder.

Then visit `localhost:8347` and give a name when asked.

Currently `sgl.js` is set to use `beth.js` as its model and `beth-eliza-orig.json` as its data library.

You can also run Beth with two Node JS terminals, treating the bot as if it were another user logging into the chat interface. Run 'node med' in one terminal and 'node bot' in the Beth folder. The first terminal will act as a mediator and will serve the interface which you can access by visiting `localhost:8374` with a browser. When you visit this site you will be asked for your name. This will then be logged in the simple chat interface.

The second terminal will act as a bot (being a client to the mediator) and also serve a console for the bot. You will be prompted for three pieces of information.

1. It will ask which library you want to run. In this version, there are two options:
   - `beth`
   - `eliza-node`

   You can type either of these options and hit the return key.

2. You will be asked to give the name of the bot which you can choose all by yourself.
 
3. Finally you'll be asked to load a library. In this version, there are a few libraries to choose from;
   - `beth-eliza-orig`	(only works with `beth`)
   - `beth-agendas-test` (only works with `beth`)
   - `eliza-orig`		(only works with `eliza-node`)
	
Once you have answered these questions, you are almost ready to go. Visit (in a separate tab, window, or browser) `localhost:8375` and this will trigger the bot into action.

Back in the tab on which you have loaded `localhost:8374`, the bot will greet you, perhaps with a 'Hello World!' statement. From here on you can respond to Beth.

###HOW BETH WORKS###

In the case of the two terminals, each statement you enter is passed through the mediator (`med`) and fed to Beth (running in `bot`), which logs the input. In the case of `sgl.js`, all the logging and processing takes place on a single server.

Beth does a periodic check to see if anything is in the log. If it finds something it hasn't yet processed and searches for appropriate responses according to a ruleset provided to it. These responses are filtered according to an agenda that comes with the ruleset, which may change how Beth reacts at various points in the conversation. Some responses are completed but deferred for a later point in the conversation, giving Beth a crude sort of memory. It sends replies through the mediator to appear in the chat interface.

The main Beth library available at this moment in time is a Beth-formatted version of Eliza's original keywords, decomposition rules and reassembly patterns (see [ElizaBeth-Converter](https://github.com/guypursey/ElizaBeth-Converter) for more details on the conversion to Beth format rulesets). With this library, Beth can say hello, send one response to each input from a user, and end the conversation when the user says bye, almost just like Eliza.

The Beth library `beth-agendas-test` is to test out sub-agendas so that it's possible to say how Beth can be programmed to move through phases of reactions.

###ELIZA###

Eliza is the earliest known chatbot programme. It was developed by Joseph Weizenbaum in the 1960s. The code used for Eliza here is a version adapted from the open source code [here](http://www.masswerk.at/elizabot/eliza.html) provided by Norbert Landsteiner, dated 2005. Landsteiner's code is object-oriented JavaScript. I hope to release fuller documentation regarding this and the changes I have made as this project continues.

You can also interact with Eliza as an IRC bot using the code at [this repository](https://github.com/isaacs/node-eliza), created by Isaac Z. Schlueter, also using Landsteiner's code. Searching for 'Eliza' on GitHub will return many other variants of Weizenbaum's original experiment.

###CHAT INTERFACE###

The simple chat interface which `med.js` serves when run from Node JS is taken/adapted from a [Socket IO chatroom tutorial](http://psitsmike.com/2011/09/node-js-and-socket-io-chat-tutorial/) written by Michael Mukhin. The file `med.js` is also adapted from this tutorial.

###DEPENDENCIES###

Dependencies are listed in `package.json`, so you can import what is needed to run this with a simple `npm install` command, assuming that you have NPM.

###FILE STRUCTURE###

Ignoring the folder `node-modules` which will need importing and maintaing via NPM, and putting aside hidden, trivial, and/or experimental files, the following crucial files/folders reside within Beth:

	./
	|___ bot-client/
		|___ lib/
			|___ beth-eliza-orig.json
			|___ eliza-orig.json
			|___ beth-agendas-test01.json
			|___ beth-agendas-test02.json
			|___ beth-agendas-test03.json
			|___ beth-agendas-test04.json
        |___ beth.js
		|___ eliza-node.js
		|___ ui-console.html
		|___ README.md
	|___ usr-client/
		|___ lib/
			|___ jquery-1.9.1.js
		|___ ui-simple.html
		|___ ui-proper.html
	|___ bot.js
	|___ med.js
	|___ sgl.js
	|___ tst.js
	|___ package.json
	|___ README.md


###TESTING###

If a library file has a `test` property in its main object, it can be tested by launching `node tst` which will automate the conversation and show a pass or fail. 


###FREQUENTLY ASKED QUESTIONS###

> **What is this anyway?**

It's an experiment. It's a piece of research I'm doing for academic purposes.

> **Why 'Beth'?**

It's a long-ish story.

