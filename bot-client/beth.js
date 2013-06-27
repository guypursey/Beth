
// Create the constructor.
var Beth = function (noRandomFlag, libraryData, postMsg, severFn, debugFn) {
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
			// Every so often, the arrays could be shifted so that repetition is allowed over time and memory saved.
		},
		
		// Set up object for storing responses to be sent out.
		postRoom = [],
		
		// Localise post message callback function.
		postMsg = postMsg,
		
		// Localise connection severance function.
		severFn = severFn,
		
		// Set up a wildcard regex pattern, to look for anything.
		wildcardPattern = '(.*)',
		
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
						
						// If the string begins with a word boundary put this in the regex pattern.
						ruleobj.pattern = ruleobj.pattern.replace(/^\b/g, "\\b");
						
						// If the string ends with a word boundary put this in the regex pattern.
						ruleobj.pattern = ruleobj.pattern.replace(/\b$/g, "\\b");
						
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
		
		// A variable to hold the regular expression combining all the keys.
		ioregex,
		
		parseIo = function (intoout) {
			var i,
				
				// An array to store all the keys.
				ioarray = [];				
				
			// Loop through keys in object an push to array.
			for (i in intoout) {
				ioarray.push(i);
			}
			
			// Create a regex from this array to search any input for any of the keys.
			// Variable declared at higher level.
			ioregex = new RegExp("\\b(" + ioarray.join("|") + ")\\b");
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
			    rtn = [],	// for storing results
				results,
			    m,		// matching string
			    goto,		// for goto
			    order = order || 0,
			    tabbing = '',	// for debugging	
				deferwhere,
				deferpath,
				d,
				origobj, // reference to the original object
				objcopy, // copy of the object
				copyObj = function (obj) {
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
						rtn = rtn.concat(process(input, rules[i].ruleset, order + 1, filter));
					}
					if (typeof rules[i].results === 'object') {
						// Take a copy of all the results in the array.
						results = [];
						console.log(tabbing, (results.length) ? "Results found." : "No direct results found.");
						for (j = 0; j < rules[i].results.length; j += 1) {
							var origobj = rules[i].results[j],
								objcopy = {
									"respond": origobj.respond,
									"tagging": origobj.tagging,
									"setflag": origobj.setflag,
									"deferto": copyObj(origobj.deferto),
									"covered": m[0].length,
									// need a percentage?
									"indexof": m.index,
									"origobj": origobj
								}; // could be a loop through obj properties
							if (objcopy.respond.search('^goto ', 'i') === 0) {					// If the reply contains a `^goto` tag,
								
								goto = objcopy.respond.substring(5);     // get the key we should go to,
								if (libraryData.ruleset["*"].ruleset.hasOwnProperty(goto)) {										// and assuming the key exists in the keyword array,
									console.log(tabbing, 'Going to ruleset ' + goto + ':', objcopy.substring(5));
									rtn = rtn.concat(process(input, libraryData.ruleset["*"].ruleset[goto], order + 1, filter));
								}
								
							} else {
								// Check that the results conform to the filter.
								if (filter(objcopy.tagging)) {
									// If the tags in this result match the ones specified, use it.
									objcopy.refined = order;
									
									// Make necessary substitutions in the response.
									objcopy.respond = objcopy.respond.replace(/([^\(])\(([0-9]+)\)([^\)])/g, function (a0, a1, a2, a3) {
										var rtn = m[parseInt(a2, 10)];
										rtn = rtn.replace(ioregex, function (a0, a1) {
											return libraryData.intoout[a1];
										});
										// restore surrounding characters
										rtn = a1 + rtn + a3;
										return rtn;
									});
									
									// remove single pair of outer parentheses from any future substitution markers
									objcopy.respond = objcopy.respond.replace(/\((\(+[0-9]+\)+)\)/g, function (a0, a1) {
										return a1;
									});
									
									// Sift out deferred options first.
									if (objcopy.deferto) {
									// TODO: could also check for nested parentheses as a condition of deferral?
									// TODO: check not just that deferto exists but that is also an array and not empty
										deferwhere = libraryData;
										// Set up deferwhere to start looking at libraryData.
										
										// Take just the first element of deferto.
										deferpath = objcopy.deferto.shift();
										//TODO: check this is also an array
										
										// If array is empty, change value to false, so that this item is not eternally deferred.
										if (objcopy.deferto.length === 0) {
											objcopy.deferto = false;
										}
										// TODO: could refactor this so the emptiness of the array is checked upfront
										
										if (deferpath) {
										// TODO: need a better check that this is an array -- this whole section to be refactored
											d = 0;
											while (d < deferpath.length && typeof deferpath[d] === "string") {
											// Check the element in the array can be a valid key value.
												
												// If the path does not current exist, create it.
												if (!(deferwhere.hasOwnProperty("ruleset"))) {
													deferwhere.ruleset = {};
												}
												if (!(deferwhere.ruleset.hasOwnProperty(deferpath[d]))) {
													deferwhere.ruleset[deferpath[d]] = {};
												}
												
												deferwhere = deferwhere.ruleset[deferpath[d]];
												debugFunc("defer loc: " + d);
												debugFunc(deferwhere);
												d += 1;
											}							
										}
										
										// Record that this item is not part of the original ruleset but deferred.
										objcopy.deferrd = true;
										
										// If the deferral location does not have a results array create one.
										if (!(deferwhere.hasOwnProperty("results"))) {
											deferwhere.results = [];
										}
										
										// Push the response into the specified deferral location.
										deferwhere.results.unshift(objcopy);
										
									} else {
										// This result is good to use.
										results.push(objcopy);
									
									}
								}
							}
						}
						rtn = rtn.concat(results);
					}
			    }
			}
						
			//console.log(tabbing, "Returning result:", rtn);
			return rtn;

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
					totsent: 0,
					flagset: {}
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
				setFlag = function (flag) {
					sessionStatus.flagset[flag] = true;
				},
				getUsrSent = function (){
					return sessionStatus.usrsent;
				},
				getBotSent = function (){
					return sessionStatus.botsent;
				},
				getTotSent = function (){
					return sessionStatus.totsent;
				},
				getFlag = function (flag) {
					return sessionStatus.flagset[flag] || false;
				};
				
			return {
				updateUsrSent: updateUsrSent,
				updateBotSent: updateBotSent,
				updateTotSent: updateTotSent,
				setFlag: setFlag,
				getUsrSent: getUsrSent,
				getBotSent: getBotSent,
				getTotSent: getTotSent,
				getFlag: getFlag
			};
			
		})();

		
		agendaManager = (function (agendas, exitSession, getUsrSent, getBotSent, getFlag) {
			var agendaItem = agendas[0],
				// TODO: this object's name should be prefixed atStart
				// TODO: ItemNum will also need to be sep'd out for semantic and functional reasons...
				agendaStatus = {
					agendaItemNum: 0,
					agendaUsrSent: getUsrSent(),
					agendaBotSent: getBotSent(),
					agendaTimeStarted: new Date().getTime()
				},
				resetStatus = function (itemNum) {
					agendaStatus.agendaItemNum = itemNum;
					agendaStatus.agendaUsrSent = getUsrSent();
					agendaStatus.agendaBotSent = getBotSent();
					agendaStatus.agendaTimeStarted = new Date().getTime();
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
							? (getUsrSent() >= agendaStatus.agendaUsrSent + usr)
							: false,
						botComp = (agendaItem.dountil.hasOwnProperty('botsent'))
							? (getBotSent() >= agendaStatus.agendaBotSent + bot)
							: false,
						edrComp = (agendaItem.dountil.hasOwnProperty('endured'))
							? (new Date().getTime() >= agendaStatus.agendaTimeStarted + convertTime(edr))
							: false,
						flgComp = (agendaItem.dountil.hasOwnProperty('flagset'))
							?
								(function () {
									var rtn = true,
										f = agendaItem.dountil.flagset.length;
									while (f && rtn) {
										f -= 1;
										rtn = getFlag(agendaItem.dountil.flagset[f]);
									}
									return rtn;
								})()
							: false
						;
					
					debugFunc(usrComp);
					debugFunc(botComp);
					debugFunc(edrComp);
					debugFunc(flgComp);
						
					if (usrComp || botComp || edrComp || flgComp) {
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
						debugFunc("updated agenda item to #" + agendaStatus.agendaItemNum);
						debugFunc(agendaItem);
					}

					if (!agendaItem) {
						debugFunc("no further agenda items found; should disconnect now");
						// If no agenda item exists, disconnect Beth.
						exitSession();
					}

					return agendaItem;
				};
			// update time every second	
			setInterval(function () { debugFunc(getCurrentItem()); }, 1000);
			return {
				getCurrentFilter: getCurrentFilter
			};
		})(libraryData.agendas, severFn, sessionStats.getUsrSent, sessionStats.getBotSent, sessionStats.getFlag);
		
		timedcheck = function () {
			
			// Check if the user has said anything recently and process it. [REACTIVE]
			var input = readlog(),
				// Get filter to pass to process() as callback to prevent duplication of loops.
				filterCallback = agendaManager.getCurrentFilter("reactive"),
				responses,
				r, // counter
				datetime = new Date(),
				f; // flag counter
				
			// Sort responses to deliver to user via mediator [if staggered, then add to queue].
			if (input) {
				responses = process(input, libraryData.ruleset, 0, filterCallback);

				
				if (responses.length) {
					
					if (responses[0].respond) {
						// Send only first response (selection will be more varied in future versions).
						postRoom.push(responses[0].respond);
					}
					
					// Record use of this object on the original database if possible.
					if (responses[0].origobj) {
						responses[0].origobj.history = responses[0].origobj.history || [];
						responses[0].origobj.history.push(datetime);
					}
					
					// Set any flags mentioned to true.
					// TODO; Should these be set regardless of which response is returned?
					if (typeof responses[0].setflag === 'object') {
						debugFunc("setting flags");
						f = responses[0].setflag.length;
						while (f) {
							f -= 1;
							sessionStats.setFlag(responses[0].setflag[f]);
							debugFunc("set flag " + responses[0].setflag[f]);
						}
					}
				}
				
				debugFunc(responses);
				debugFunc(libraryData);
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
	
	// Io in this case refering to the object of how certain input words should be treated.
	parseIo(libraryData.intoout);
	
	console.log("debug:", debugFn);
	debugFunc(libraryData.ruleset);
	
	// Set interval to check agenda and log every 2 seconds.
	setInterval(timedcheck, 2000);

	
	// Finally, expose private variables to public API.
	this.getInitial = getInitial;
	this.transform = loginput;
	
};

// Expose the constructor for use by whatever is running in Node JS.
exports.BotObj = Beth;

// As with the noRandomFlag argument for the constructor, the only reason Beth is coded as a constructor
// is because I set up eliza-node in this way. This may change (radically affecting the API) soon.
