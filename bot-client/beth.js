
// Create the constructor.
var Beth = function (noRandomFlag, libraryData, postMsg, severFn, debugFn) {
	// Currently the constructor takes three arguments because that's what I built eliza-node to do to be backward compatible.
	// I am preparing the two for use in tandem.
	// For now, the first argument is defunct. I will ignore it.
	
	var debugFunc = function (msg) {
			if (debugFn) {
				debugFn(msg);
			} else {
				console.log(msg);
			}
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
			
		})(),
		
		logManager = (function (updateUsrSent) {
		// Set up log for storing inputs, both process and unprocessed.
			var logData = {
					toprocess: [],
					processed: [],
				},
				readlog = function () {
					return (logData.toprocess.length) ? logData.toprocess.shift() : '';
				},
				loginput = function (input) {
					// Accepts user's input, puts it on a stack, which is then regularly checked.
					logData.toprocess.push(input);
					// Update number of items received from user in sessionStats.
					updateUsrSent();
				};
			return {
				takeUnprocessedMessage: readlog,
				addUnprocessedMessage: loginput
			}
		})(sessionStats.updateUsrSent),
		
		postManager = (function (updateBotSent) {
			var postRoom = [],
				addToStack = function (msg) {
					postRoom.push(msg);
				},
				sendFromStack = function () {
					// Check if any responses are waiting to go out.
					if (postRoom.length) {
						postMsg(postRoom.shift());
						// Update number of items sent out.
						updateBotSent();
					}
				},
				postInterval,
				activate = function (interval) {
					postInterval = setInterval(sendFromStack, interval);
				},
				deactivate = function () {
					clearInterval(postInterval);
				};
			return {
				sendWhenReady: addToStack,
				activate: activate,
				deactivate: deactivate
			}
		})(sessionStats.updateBotSent),
		
		// Set up a wildcard regex pattern, to look for anything, surrounded by zero or more spaces.
		wildcardPattern = '\\s*(.*)\\s*',
		
		// What Beth should use to identify keys for the `lookfor` object.
		// TODO: Work out way to systematise this.
		lookforMarker = '@',
		lookforPattern = /@(\S+)/,
		
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
						ruleobj.pattern = ruleobj.pattern.replace(lookforPattern, function (a0, a1) {
							return "(" + libraryData.lookfor[a1].join("|") + ")" || a1;
							// TODO: throw initialisation error if array not found?
						});
						
						ruleobj.pattern = ruleobj.pattern.replace(/(\w?)(\s*)\*(\**)(\s*)(\w?)/g, function (m, $1, $2, $3, $4, $5) {
							var rtn = "";
							if ($3) { // escape character check
								rtn = $1 + $2 + $3 + $4 + $5;
							} else {
								if ($1) {
									rtn += $1;
									if ($2) {
										rtn += "\\b";
									}
								}
								if ($2 && !$4 && $5) {
									rtn += "\\s+";
								}
								rtn += (($1 && !$2) || (!$4 && $5)) ? "\\S*" : "\\s*(.*)\\s*";
								if ($4 && !$2 && $1) {
									rtn += "\\s+";
								}
								if ($5) {
									if ($4) {
										rtn += "\\b";
									}
									rtn += $5;
								}
							}
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
		preprocess = function (input) {
		// Take the user's input and substitute words as defined in the ruleset. (e.g. contractions)
		// Maintain a history of these substitutions.
			
			var rtn,
				sub = libraryData.convert, // local reference to relevant data
				key, // key for data
				arr = [],
				rex;
			
			// For now, create substitution regular expression on the fly rather than as part of initialisation, so it can be dynamic.
			for (key in sub) {
				arr.push(key);
			}
			rex = new RegExp("\\b(" + arr.join("|") + ")\\b", "g");
			
			debugFunc("preprocess: " + input);
			
			rtn = input.replace(rex, function (m, $1) {
				return sub[$1];
			});
			
			debugFunc("result: " + rtn);
			
			return rtn;
		},
		process = function (input, rules, ioregex, inflect, order, filter) {
		// Parse input using rulesets, dealing with deference en route.
		// Order indicates, for now, the level of depth -- though this might happen at initialisation rather than dynamically.
		// Filter can cut down on loops we run later by pre-emptively removing certain responses from the returned results.
			debugFunc('Starting process function ', order);
			debugFunc('Received input: ', input);
			debugFunc('Received rules: ', rules);
		    var input = input,
				rules = rules,
				ioregex = ioregex,
				inflect = inflect,
				filter = (typeof filter === "function")
					? filter
					: function () { debugFunc("No filter found."); return true },
				i,
				j,
			    rex,	// for storing regular expression
			    rtn = {
					responses: [],
					deferrals: []
				},	// for storing results
				recursive, // for collecting up returns from recursive calls
				results,
			    m,		// matching string
			    goto,		// for goto
			    order = order || 0,
			    tabbing = '',	// for debugging	
				deferwhere,
				deferpath,
				d,
				deferarray = [], // for storing pointers and objects for final deferral loop
				origobj, // reference to the original object
				objcopy;
				
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
						recursive = process(input, rules[i].ruleset, ioregex, inflect, order + 1, filter);
						rtn.responses = rtn.responses.concat(recursive.responses);
						rtn.deferrals = rtn.deferrals.concat(recursive.deferrals);
					}
					if (typeof rules[i].results === 'object') {
						// Take a copy of all the results in the array.
						results = [];
						console.log(tabbing, (results.length) ? "Results found." : "No direct results found.");
						for (j = 0; j < rules[i].results.length; j += 1) {
							var objcopy = utils.copyObject(rules[i].results[j]); // Make a copy of the result object.
							objcopy.covered = m[0].length; // Add properties.
							objcopy.indexof = m.index;
							objcopy.origobj = rules[i].results[j]; // Include a pointer to the original object.
							// Check that the results conform to the filter.
							if (filter(objcopy.tagging)) {
								// If the tags in this result match the ones specified, use it.
								objcopy.nesting = order;
								
								// Make necessary substitutions in the response.
								objcopy.respond = objcopy.respond.replace(/([(][(]\d+[)][)])|[(](\d+)[)]/g, function (match, $1, $2) {
									var rtn;
									if ($1) {
										// if first capture found, ignore--surrounded my more than one pair of parentheses
										rtn = $1;
									} else {
										// use number to get relevant part of earlier match with user input
										rtn = m[parseInt($2, 10)];
										debugFunc("Return, pre-inflection");
										debugFunc(rtn);
										// process part of user input and run inflections
										rtn = rtn.replace(ioregex, function (match, $1) {
											debugFunc("Inflection");
											debugFunc(libraryData.inflect[$1]);
											return libraryData.inflect[$1.toLowerCase()];
										});
									};
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
									
									// Set up the deferral for later.
									deferarray.push({
										"address": deferwhere.results,
										"todefer": objcopy
									});
									
								} else {
									// This result is good to use.
									results.push(objcopy);
								
								}
							}
						}
						rtn.responses = rtn.responses.concat(results);
						rtn.deferrals = rtn.deferrals.concat(deferarray);
					}
			    }
			}
						
			//console.log(tabbing, "Returning result:", rtn);
			return rtn;

		},

		utils = (function () {
			var convertBethTimeToMS = function (itemTime) {
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
				copyObject = function (obj) {
					var i,
						copy = (typeof obj === "object") ? ((obj instanceof Array) ? [] : {}) : obj;
					for (i in obj) {
						copy[i] = (typeof obj[i] === "object") ? copyObject(obj[i]) : obj[i]
					}
					return copy;
				},
				selectIndex = function (min, max) {
					return (noRandomFlag) ? 0 : Math.floor(Math.random() * (max - min + 1)) + min;
				};
			return {
				convertBethTimeToMS: convertBethTimeToMS,
				copyObject: copyObject,
				selectIndex: selectIndex
			};
		})(),
		
		agendaManager = (function (agendas, exitSession, getUsrSent, getBotSent, getFlag, debugFunc) {
			var agendaStack = [], // An array to store all the current agenda items.
				redoSnapshot = function (agendaLevel, itemNum) {
					
					// Goes into the bottom level of the stack and resets with the new item number.
					agendaStack[0] = {
						agendaItem: agendaLevel[itemNum], // Pointer to the actual agenda item this snapshot refers to.
						agendaItemNum: itemNum, // Index of agenda item so we don't lose our place.
						agendaIterate: 0, // To be incremented, currently by this function
						agendaUsrSent: getUsrSent(), // Number of messages user sent at start of item.
						agendaBotSent: getBotSent(), // Number of messages user sent at start of item.
						agendaTimeStarted: new Date().getTime() // Date and time at start of item.
					};
					
					// Find any children for new item and inserting snapshots for those into the bottom of the stack too.
					if (agendaStack[0].agendaItem) {
						while (agendaStack[0].agendaItem.agendas) {
							agendaLevel = agendaStack[0].agendaItem.agendas;
							agendaStack.unshift({ // Add status object to bottom of the stack, so that next loop round we always access the newest.
								agendaItem: agendaLevel[0],
								agendaItemNum: 0,
								agendaIterate: 0, // To be incremented, currently by this function
								agendaUsrSent: getUsrSent(), // number of messages user sent at start of item
								agendaBotSent: getBotSent(), // number of messages user sent at start of item
								agendaTimeStarted: new Date().getTime() // date and time at start of item
							});
						}
					};
					
					debugFunc("Snapshot retaken!");
					debugFunc(agendaStack);
				},
				getCurrentFilter = function (whichMode) {
					// Takes one argument to determine whether the filter should be in proactive or reactive mode.
					var whichMode = whichMode,
						agendaItem = agendaStack[0].agendaItem, // get most childish item
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
				isComplete = function (agendaSnapshot) {
					var rtn = false,
						agendaSnapshot = agendaSnapshot, // localisation
						agendaItem = agendaSnapshot.agendaItem,
						usr = agendaItem.dountil.usrsent || 0,
						bot = agendaItem.dountil.botsent || 0,
						edr = agendaItem.dountil.endured || "0",
						itr = agendaItem.dountil.iterate || 0,
						// if properties are on the agenda, check if conditions are met
						usrComp = (agendaItem.dountil.hasOwnProperty('usrsent'))
							? (getUsrSent() >= agendaSnapshot.agendaUsrSent + usr)
							: false,
						botComp = (agendaItem.dountil.hasOwnProperty('botsent'))
							? (getBotSent() >= agendaSnapshot.agendaBotSent + bot)
							: false,
						edrComp = (agendaItem.dountil.hasOwnProperty('endured'))
							? (new Date().getTime() >= agendaSnapshot.agendaTimeStarted + utils.convertBethTimeToMS(edr))
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
							: false,
						itrComp = (agendaItem.dountil.hasOwnProperty('iterate'))
							? (agendaSnapshot.agendaIterate >= itr)
							// This check is different in that it compares an internally created property of agendaSnapshot with the condition, rather than using a method imported from sessionStats.
							: false
						;
					
					debugFunc("Snapshot being checked:");
					debugFunc(agendaSnapshot);
					debugFunc("Met quota of user messages?: " + usrComp);
					debugFunc("Met quota of bot messages?: " + botComp);
					debugFunc("Reached end of time limit?: " + edrComp);
					debugFunc("Flags completed?: " + flgComp);
					debugFunc("Number of iterations completed?: " + itrComp);
						
					if (usrComp || botComp || edrComp || flgComp || itrComp) {
						debugFunc("Agenda item " + agendaSnapshot.agendaItemNum + " complete! Snapshot of completed item below:");
						debugFunc(agendaSnapshot);
						return true;
					}
					return rtn;
				},
				getAgendaLevel = function (address) {
					var a = agendaStack.length,
						rtn = agendas;
					while (a && a > (address) && rtn[agendaStack[a - 1].agendaItemNum].hasOwnProperty("agendas")) {
						a -= 1;
						rtn = rtn[agendaStack[a].agendaItemNum].agendas;
					}
					debugFunc("Agenda Level returned...");
					debugFunc(rtn);
					return rtn;
				},
				getCurrentItem = function () {
					var a = agendaStack.length,
						agendaLevel = agendas,
						itemNum,
						redo = false;
					while (a) {
						a -= 1;
						if (isComplete(agendaStack[a])) {
							itemNum = agendaStack[a].agendaItemNum + 1;
							agendaStack = agendaStack.slice(a);
							agendaLevel = getAgendaLevel(a);
							if (agendaLevel.hasOwnProperty(itemNum)) {
								redoSnapshot(agendaLevel, itemNum);
								a = 0;
							} else {
								if (agendaStack.length > 1) {
									agendaStack[1].agendaIterate += 1;
										// TODO: should be moved to session Stats
										debugFunc("Stack item iterated!");
										debugFunc(agendaStack[1]);
									itemNum = 0;
									a = 2;
									redo = true;
								} else {
									a = 0;
									clearInterval(agendaInterval);
									exitSession();
								}
							}
						} else {
							if (redo) {
								redoSnapshot(agendaLevel, itemNum);
								a = 0;
							}
						}
					}

					return agendaStack[0].agendaItem;
				},
				agendaInterval,
				activate = function (interval) {
					agendaInterval = setInterval(function () { getCurrentItem(); }, interval);
				},
				deactivate = function () {
					clearInterval(agendaInterval);
				};
				
			redoSnapshot(agendas, 0); // Important for initialisation
			
			return {
				getCurrentFilter: getCurrentFilter,
				activate: activate,
				deactivate: deactivate
			};
		})(libraryData.agendas, severFn, sessionStats.getUsrSent, sessionStats.getBotSent, sessionStats.getFlag, function () {}),
		
		timedcheck = function () {
			
			// Check if the user has said anything recently and process it. [REACTIVE]
			var input = logManager.takeUnprocessedMessage(),
				// Get filter to pass to process() as callback to prevent duplication of loops.
				filterCallback = agendaManager.getCurrentFilter("reactive"),
				results,
				responses,
				deferrals,
				d,
				r, // counter
				datetime = new Date(),
				f, // flag counter
				ioarray = [],
				ioregex;
			
			for (i in libraryData.inflect) {
				ioarray.push(i);
			}
			
			// Create a regex from this array to search any input for any of the keys.
			ioregex = new RegExp("\\b(" + ioarray.join("|") + ")\\b", "gi");
			
			// Sort responses to deliver to user via mediator [if staggered, then add to queue].
			if (input) {
				input = preprocess(input);
				results = process(input, libraryData.ruleset, ioregex, libraryData.inflect, 0, filterCallback);
				debugFunc("Results are in:");
				debugFunc(results);
				responses = results.responses;
				deferrals = results.deferrals;
				//deal with deferrals
				while (deferrals.length) {
					d = deferrals.shift();
					d.address.unshift(d.todefer);
				}
				
				// Sort responses by nesting, so highest nesting comes first (i.e, closer to zero), then deference, then historical usage.
				responses.sort(function (a, b) {
					var rtn = 0,
						a_date = (a.history) ? (a.history[0] || 0) : 0,
						b_date = (b.history) ? (b.history[0] || 0) : 0;
					if (b.nesting > a.nesting) {
						rtn = 1;
					} else if (b.nesting < a.nesting) {
						rtn = -1;
					} else if (b.deferrd > a.deferrd) {
						rtn = 1;
					} else if (b.deferrd < a.deferrd) {
						rtn = -1;
					} else {
						rtn = a_date - b_date;
					}
					return rtn;
				});

				if (responses.length) {

					var whichResponse = utils.selectIndex(0, (responses.length - 1));
					
					if (responses[whichResponse].respond) {
						// Send only first response (selection will be more varied in future versions).
						postManager.sendWhenReady(responses[whichResponse].respond);
					}
					
					// Record use of this object on the original database if possible.
					if (responses[whichResponse].origobj) {
						responses[whichResponse].origobj.history = responses[whichResponse].origobj.history || [];
						responses[whichResponse].origobj.history.unshift(datetime);
					}
					
					// Set any flags mentioned to true.
					if (typeof responses[whichResponse].setflag === 'object') {
						debugFunc("setting flags");
						f = responses[whichResponse].setflag.length;
						while (f) {
							f -= 1;
							sessionStats.setFlag(responses[whichResponse].setflag[f]);
							debugFunc("set flag " + responses[whichResponse].setflag[f]);
						}
					}
				}
				
				debugFunc(libraryData);
			}
			
			// Proactive selection...
			var m = libraryData.moveset.length,
				fC = agendaManager.getCurrentFilter("proactive"),
				mA = [];
			debugFunc("filter proactive");
			debugFunc(fC);
			while (m) {
				m -= 1;
				if (fC(libraryData.moveset[m].tagging)) {
					mA.push(libraryData.moveset[m]);
				}
			}
			
			// Sort so array in order of most recently used (with least recent or never used at bottom).
			mA.reverse().sort(function (a, b) {
				var a_date = (a.history) ? (a.history[0] || 0) : 0,
					b_date = (b.history) ? (b.history[0] || 0) : 0;
				return a_date - b_date;
			});

			debugFunc("filtered moveSet array");
			debugFunc(mA);
			
			if (mA.length) {
				whichAction = utils.selectIndex(0, (mA.length - 1));
				postManager.sendWhenReady(mA[whichAction].forward);
				mA[whichAction].history = mA[whichAction].history || [];
				mA[whichAction].history.unshift(datetime);
			}
		},
		interval,
		agendaInterval = agendaManager.activate(1000),
		postInterval = postManager.activate(1000),
		deactivate = function () {
			clearInterval(interval);
			clearInterval(postInterval);
			clearInterval(agendaInterval);
		}; //eof variable declarations

	// Ruleset needs to be parsed, checked and amended before anything else can happen.
	parseRuleset(libraryData.ruleset);

	console.log("debug:", debugFn);
	debugFunc(libraryData.ruleset);
	
	// Set interval to check agenda and log every 2 seconds.
	interval = setInterval(timedcheck, 2000);

	// Finally, expose private variables to public API.
	this.transform = logManager.addUnprocessedMessage;
	this.deactivate = deactivate;
	
},
exports = exports || false;

// Expose the constructor for use by whatever is running in Node JS, assuming there is an exports object.
if (exports) { exports.BotObj = Beth; }

// As with the noRandomFlag argument for the constructor, the only reason Beth is coded as a constructor
// is because I set up eliza-node in this way. This may change (radically affecting the API) soon.
