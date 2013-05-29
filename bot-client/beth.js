// Create the constructor.
var Beth = function (noRandomFlag, libraryData, postMsg, debugFn) {
	// Currently the constructor takes three arguments because that's what I built eliza-node to do to be backward compatible.
	// I am preparing the two for use in tandem.
	// For now, the first argument is defunct. I will ignore it.
	
	var debugFlag = true,
		debugFn = debugFn,
		debugFunc = function (msg) {
			if (debugFlag) {
				if (debugFn) {
					debugFn(msg);
				} else {
					console.log(msg);
				}
			}
		},
		
		// Declare imported library data locally.
		libraryData = libraryData,
		
		// Set up log for storing inputs, both process and unprocessed.
		// Should also log what Beth herself has said, so as not to get too repetitive.
		logData = {
			toprocess: [],
			processed: [],
			autograph: []
			// Autograph may in fact need to be an object, whose keys are statements put to the user.
			// Each property would be an array logging all the times the statement has been said.
			// Every so after, the arrays could shifted so that repetition is allowed over time and memory saved.
		},
		
		// Set up object for storing responses to be sent out.
		postRoom = [],
		
		// Localise post message callback function.
		postMsg = postMsg,
		
		// Set up a wildcard regex pattern, to look for anything.
		wildcardPattern = '\\s*(.*)\\s*',
		
		// Variables for identifying synonyms. Other markers will be used.
		// TODO: Work out way to systematise this.
		synonymMarker = '@',
		synonymPattern = /@(\S+)/,

		parseRuleset = function (ruleset) {
		// Take a ruleset and parse it, adding in regular expression patterns for search.
			
			// Create a variable holder for each rule in the set.
			var ruleobj;
			
			// Loop through all the objects in the set.
			for (r in ruleset) {
				
				// Ensure this object is one we actually want to work on, and not inherited.
				if (ruleset.hasOwnProperty(r)) {
					console.log(r);
					// Make our holder variable `ruleobj` refer to the current object.
					ruleobj = ruleset[r];
					
					// Check to see if object key is merely a wildcard.
					if (/^\s*\*\s*$/.test(r)) {
						ruleobj.pattern = wildcardPattern;
					} else {
						ruleobj.pattern = r;
						
						// Substitute synonyms.
						ruleobj.pattern = ruleobj.pattern.replace(synonymPattern, function (a0, a1) {
							return libraryData.substitutions[a1] || a1; 
						});
						
						// Substitute wildcards.
						ruleobj.pattern = ruleobj.pattern.replace(/(\S)\s*\*\s*(\S)/g, function (a0, a1, a2) {
							var rtn = a1;
							rtn += (a1 !== ')') ? '\\b' : '';
							rtn += wildcardPattern;
							rtn += ((a2 !== '(') && (a2 !== '\\')) ? '\\b' : '';
							rtn += a2;
							return rtn;
						});

						// Substitute wildcards at beginning of string.
						ruleobj.pattern = ruleobj.pattern.replace(/^\s*\*\s*(\S)/g, function (a0, a1) {
							var rtn = wildcardPattern;
							rtn += ((a0 !== ')') && (a1 !== '\\')) ? '\\b' : '';
							rtn += a1;
							return rtn;
						});
						
						// Substitute wildcards at end of string.
						ruleobj.pattern = ruleobj.pattern.replace(/(\S)\s*\*\s*$/g, function (a0, a1) {
							var rtn = a1;
							rtn += (a1 !== '(') ? '\\b' : '';
							rtn += wildcardPattern;
							return rtn;
						});
					}
					
					// Replace multiple spaces with single spaces.
					ruleobj.pattern = ruleobj.pattern.replace(/\s+/g, '\\s+');
					
					// If the object itself contains a ruleset, parse this by recursively calling this same function.
					if (typeof ruleobj.ruleset === 'object') {
						parseRuleset(ruleobj.ruleset);
						// TODO: Consider depth markers at this initialisation stage.
					}
				}
			}
		},
		getInitial = function () {
			// Return the first statement of the conversation.
			return "Hello World!";
		},
		loginput = function (input) {
		// Accepts user's input, puts it on a stack which is then regularly checked.
		// Do we here check who the input is from and whether it needs responding to?
			logData.toprocess.push(input);
			
		// Update number of items received from user in sessionStats.
		// TODO: There may be a more efficient/elegant way to do this than just calling the stats method directly.
			sessionStats.updateUsrSent();
		},
		preprocess = function (input) {
		// Take the user's input and substitute words as defined in the ruleset. (e.g. contractions)
		// Maintain a history of these substitutions.
		
		},
		process = function (input, rules, order, filter) {
		// Parse input using rulesets, dealing with deference en route.
		// Order indicates, for now, the level of depth -- though this might happen at initialisation rather than dynamically.
		// Filter can cut down on loops we run later by pre-emptively removing certain responses from the returned results.
			debugFunc('starting process', order);
			debugFunc('received input', input);
			debugFunc('received rules', rules);
		    var input = input,
				rules = rules,
				filter = (typeof filter === "function")
					? filter
					: function () { console.log("No filter found."); return true },
				i,
				j,
			    rex,	// for storing regular expression
			    rst = [],	// for storing results
				results,
			    m,		// matching string
			    ki,		// for goto
			    order = order || 0,
			    tabbing = '';	// for debugging	
				
			for (i = 0; i < order; i += 1) {
				tabbing += '\t';
			}
			
			tabbing += order + ':';
			
			for (i in rules) {
			    rex = new RegExp(rules[i].pattern, 'i');
			    m = (rex).exec(input);
				
				// If a match is found.
			    if (m) {
					(tabbing, "Examined:", rex);
					console.log(tabbing, "Found:", m[0]);
					if (rules[i].hasOwnProperty('ruleset')) {
						console.log(tabbing, "Exploring further...");
						// Recursively call this function for nested rulesets.
						rst = rst.concat(process(input, rules[i].ruleset, order + 1, filter));
					}
					if (typeof rules[i].results === 'object') {
						// Take a copy of all the results in the array.
						results = rules[i].results.slice(0);
						console.log(tabbing, (results.length) ? "Results found." : "No direct results found.");
						for (j = 0; j < results.length; j += 1) {
							debugFunc(rules[i].pattern);
							debugFunc("loop: " + j);
							debugFunc(results);
							
							if (results[j].respond.search('^goto ', 'i') === 0) {					// If the reply contains a `^goto` tag,
								
								ki = this._getRuleIndexByKey(results[j].respond.substring(5));     // get the key we should go to,
								if (ki >= 0) {										// and assuming the key exists in the keyword array,
									console.log(tabbing, 'Going to ruleset ' + ki + ':', results[j].respond.substring(5));
									rst = rst.concat(process(input, libraryData[ki].ruleset, order + 1, filter));
								}
								
								// Remove object.
								results.splice(j, 1);
								// Set the marker back now that the result has been spliced.
								j -= 1;
								
							} else {
								// Check that the results conform to the filter.
								if (filter(results[j].tagging)) {
									// If the tags in this result match the ones specified, use it.									results[j].refined = order;
									results[j].respond = results[j].respond.replace(/\(([0-9]+)\)/, (function(context) {
										return function (a0, a1) {
											var rtn = m[parseInt(a1, 10)];
											results[j].respond = results[j].respond.replace(context.postExp, function () {
												return context.posts[a1];
											});
											return rtn;
										};
									})(this)); // iife temporary fix for use of `this` within lambda function
								} else {
									// If the result does not survive the filter, get rid of it.
									results.splice(j, 1);
									debugFunc("spliced result due to filter");
									debugFunc(results);
									// Set the marker back now that the result has been spliced.
									j -= 1;
								}
							}
						}
						rst = rst.concat(results);
					}
			    }
			}
						
			//console.log(tabbing, "Returning result:", rst);
			return rst;

		},
		readlog = function () {
			var rtn;
			if (logData.toprocess.length) {
				rtn = logData.toprocess.shift();
			} else {
				rtn = '';
				// Currently just dealing with strings, though objects may be required.
			}
			return rtn;
		},
		
		sessionStats = (function () {
			var sessionStatus = {
					usrsent: 0,
					botsent: 0,
					totsent: 0
				},
				updateUsrSent = function () {
					sessionStatus.usrsent += 1;
				},
				updateBotSent = function () {
					sessionStatus.botsent += 1;
				},
				updateTotSent = function () {
					sessionStatus.totsent += 1;
				},
				getUsrSent = function (){
					return sessionStatus.usrsent;
				},
				getBotSent = function (){
					return sessionStatus.botsent;
				},
				getTotSent = function (){
					return sessionStatus.totsent;
				};
				
			return {
				updateUsrSent: updateUsrSent,
				updateBotSent: updateBotSent,
				updateTotSent: updateTotSent,
				getUsrSent: getUsrSent,
				getBotSent: getBotSent,
				getTotSent: getTotSent
			};
			
		})();

		
		agendaManager = (function (agendas) {
			var agendaItem = agendas[0],
				// TODO: this object's name should be prefixed atStart
				// TODO: ItemNum will also need to be sep'd out for semantic and functional reasons...
				agendaStatus = {
					agendaItemNum: 0,
					agendaUsrSent: sessionStats.getUsrSent(),
					agendaBotSent: sessionStats.getBotSent(),
					agendaTimeStarted: new Date().getTime()
				},
				resetStatus = function (itemNum) {
					agendaStatus = {
						agendaItemNum: itemNum,
						agendaUsrSent: sessionStats.getUsrSent(),
						agendaBotSent: sessionStats.getBotSent(),
						agendaTimeStarted: new Date().getTime()
					};
				},
				convertTime = function (itemTime) {
					// expects one string argument "hh:mm:ss"
					var timeArr = itemTime.split(":"),
						timeMsc = 0,
						timeUnits = [3600, 60, 1];
					while (timeArr.length) {
						timeMsc += timeUnits.pop() * +timeArr.pop() * 1000;
					}
					// returns argument provided as number of milliseconds
					return timeMsc;
				},
				getCurrentFilter = function (whichMode) {
					// Takes one argument to determine whether the filter should be in proactive or reactive mode.
					var whichMode = whichMode,
						mode = agendaItem[whichMode];
						rtn = (mode)
							? function(tagging) {
									var	has = mode.filters.HAS || [],
										not = mode.filters.NOT || [],
										h = has.length,
										n = not.length,
										t,
										r = false;
									while (h && !r) {
										h -= 1;
										t = tagging.length;
										debugFunc("filtering for has " + has[h]);
										while (t) {
											t -= 1;
											if (tagging[t] === has[h]) {
												debugFunc("tag " + has[h] + " found!");
												r = true;
											}
										}
									}
									while (n && r) {
										n -= 1;
										t = tagging.length;
										debugFunc("filtering for not " + not[h]);
										while (t) {
											t -= 1;
											if (tagging[t] === not[h]) {
												r = false;
											}
										}
									}
									return r;
								}
							: function () {
								return false;
							};
					return rtn;
				},
				isComplete = function () {
					var rtn = false,
						usr = agendaItem.dountil.usrsent || 0,
						bot = agendaItem.dountil.botsent || 0,
						edr = agendaItem.dountil.endured || "0",
				   
						// if properties are on the agenda, check if conditions are met
						usrComp = (agendaItem.dountil.hasOwnProperty('usrsent'))
							? (sessionStats.getUsrSent() >= agendaStatus.agendaUsrSent + usr)
							: false,
						botComp = (agendaItem.dountil.hasOwnProperty('botsent'))
							? (sessionStats.getBotSent() >= agendaStatus.agendaBotSent + bot)
							: false,
						edrComp = (agendaItem.dountil.hasOwnProperty('endured'))
							? (new Date().getTime() >= agendaStatus.agendaTimeStarted + convertTime(edr))
							: false
						;
						
					debugFunc("current:  " + new Date().getTime());
					debugFunc("deadline: " + (agendaStatus.agendaTimeStarted + convertTime(edr)));
					debugFunc("current usr:  " + sessionStats.getUsrSent());
					debugFunc("deadline usr: " + (agendaStatus.agendaUsrSent + usr));
					debugFunc("current bot:  " + sessionStats.getBotSent());
					debugFunc("deadline bot: " + (agendaStatus.agendaBotSent + bot));
					
					if (usrComp || botComp || edrComp) {
						debugFunc("agenda item " + agendaStatus.agendaItemNum + " complete");
						return true;
					}
					return rtn;
				},
				// TODO: see if this method can be removed or if it can be used for recursion
				getCurrentItem = function () {
					if (isComplete()) {
						resetStatus(agendaStatus.agendaItemNum + 1);
						agendaItem = agendas[agendaStatus.agendaItemNum] || null;
						debugFunc("updated agenda item");
					}
					debugFunc("returning agenda item " + agendaStatus.agendaItemNum);
					debugFunc(agendaItem);
					return agendaItem;
				};
			// update time every second	
			setInterval(function () { debugFunc(getCurrentItem()); }, 1000);
			return {
				getCurrentItem: getCurrentItem, // TODO: may not need to expose this anymore
				getCurrentFilter: getCurrentFilter
			};
		})(libraryData.agendas);
		
		timedcheck = function () {
			
			// Check if the user has said anything recently and process it. [REACTIVE]
			var input = readlog(),
				// Get filter to pass to process() as callback to prevent duplication of loops.
				filterCallback = agendaManager.getCurrentFilter("reactive"),
				responses;
				
			// Sort responses to deliver to user via mediator [if staggered, then add to queue].
			if (input) {
				responses = process(input, libraryData.ruleset, 0, filterCallback);
				debugFunc(responses);
				
				// Send only first response (selection will be more varied in future versions).
				postRoom.push(responses[0].respond);
				
			}
			
			// Proactive selection...
			var m = libraryData.moveset.length,
				fC = agendaManager.getCurrentFilter("proactive");
			debugFunc("filter proactive");
			debugFunc(fC);
			while (m) {
				m -= 1;
				if (fC(libraryData.moveset[m].tagging)) {
					postRoom.push(libraryData.moveset[m].forward);
				}
			}
				
			// Check if any responses are waiting to go out.
			if (postRoom.length) {
				postMsg(postRoom.shift());
				// TODO: Must be way to bundle this in with postMsg, so it doesn't have to appear everywhere (or so it don't have to forget to put it where it's needed.)
				sessionStats.updateBotSent();
			}
				
			
		}
		; //eof variable declarations
		
	// Ruleset needs to be parsed, checked and amended before anything else can happen.
	parseRuleset(libraryData.ruleset);
	
	console.log("debug:", debugFn);
	debugFunc(libraryData.ruleset);
	
	// Finally, expose private variables to public API.
	this.getInitial = getInitial;
	this.transform = loginput;
	
	// Set interval to check agenda and log every 2 seconds.
	setInterval(timedcheck, 2000);
	
};

// Expose the constructor for use by whatever is running in Node JS.
exports.BotObj = Beth;

// As with the noRandomFlag argument for the constructor, the only reason Beth is coded as a constructor
// is because I set up eliza-node in this way. This may change (radically affecting the API) soon.
