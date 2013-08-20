
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
					fwdsent: 0,
					rspsent: 0,
					totsent: 0,
					logsize: 0,
					flagset: {}
				},
				updateUsrSent = function () {
					sessionStatus.usrsent += 1;
					updateTotSent();
				},
				updateBotSent = function () {
					sessionStatus.botsent += 1;
					updateTotSent();
				},
				updateFwdSent = function () {
					sessionStatus.fwdsent += 1;
					updateBotSent();
				},
				updateRspSent = function () {
					sessionStatus.rspsent += 1;
					updateBotSent();
				},
				updateTotSent = function () {
					sessionStatus.totsent += 1;
				},
				setLogSize = function (logsize) {
					sessionStatus.logsize = logsize;
				},
				setFlag = function (flag) {
					sessionStatus.flagset[flag] = true;
				},
				getUsrSent = function () {
					return sessionStatus.usrsent;
				},
				getBotSent = function () {
					return sessionStatus.botsent;
				},
				getFwdSent = function () {
					return sessionStatus.fwdsent;
				},
				getRspSent = function () {
					return sessionStatus.rspsent;
				},
				getTotSent = function () {
					return sessionStatus.totsent;
				},
				getLogSize = function () {
					return sessionStatus.logsize;
				},
				getFlag = function (flag) {
					return sessionStatus.flagset[flag] || false;
				};
				
			return {
				updateUsrSent: updateUsrSent,
				updateBotSent: updateBotSent,
				updateFwdSent: updateFwdSent,
				updateRspSent: updateRspSent,
				updateTotSent: updateTotSent,
				setLogSize: setLogSize,
				setFlag: setFlag,
				getUsrSent: getUsrSent,
				getBotSent: getBotSent,
				getFwdSent: getFwdSent,
				getRspSent: getRspSent,
				getTotSent: getTotSent,
				getLogSize: getLogSize,
				getFlag: getFlag
			};
			
		})(),
		
		logManager = (function (updateUsrSent, setLogSize, debugFunc) {
		// Set up log for storing inputs, both process and unprocessed.
			var logData = {
					toprocess: [],
					processed: [],
				},
				readlog = function () {
					return (logData.toprocess.length) ? logData.toprocess.shift() : '';
				},
				loginput = function (input) {
					var input_parts,
						input_holder;
					// Break input down into parts.
					if (typeof input === "string") {
						input_parts = input.split(".");
						debugFunc("Input logging.");
						debugFunc(input_parts);
						while (input_parts.length) {
							input_holder = input_parts.shift();
							// Check the part is actually worth responding to!
							if (/\w/.test(input_holder)) {
								// Accepts user's input, puts it on a stack, which is then regularly checked.
								logData.toprocess.push(input_holder);
							} else {
								debugFunc("Part of input discarded: " + input_holder)
							}
						}
					} else {
						// Discard input if not string and print error.
						debugFunc("Input not valid. Discarded:");
						debugFunc(input);
					}
					
					// Update number of items received from user in sessionStats.
					updateUsrSent();
					
					// Record how many messages are waiting in the log to be processed.
					setLogSize(logData.toprocess.length);
					
				};
			return {
				takeUnprocessedMessage: readlog,
				addUnprocessedMessage: loginput
			}
		})(sessionStats.updateUsrSent, sessionStats.setLogSize, debugFunc),
		
		postManager = (function () {
			var postRoom = [],
				dispatchActions = [],
				addToStack = function (msg, callback) {
					postRoom.push(msg);
					dispatchActions.push(callback);
				},
				sendFromStack = function () {
					var callback = dispatchActions.shift();
					// Check if any responses are waiting to go out.
					if (postRoom.length) {
						postMsg(postRoom.shift());
						// Act on dispatch, if callback was provided.
						if (typeof callback === "function") {
							callback();
						}
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
		})(),
		
		// What Beth should use to identify keys for the `lookfor` object.
		// TODO: Work out way to systematise this.
		lookforMarker = '@',
		lookforPattern = /@(\S+)/,
		
		preparePattern = function (rule_key) {
		// Takes a rule string and prepares it as a pattern.
			var pattern,
				wildcardPattern = "\\s*(.*)\\s*";

			// Check to see if object key is merely a wildcard.
			if (/^\s*\*\s*$/.test(rule_key)) {
				pattern = wildcardPattern;
			} else {
				pattern = rule_key;

				// Substitute synonyms.
				pattern = pattern.replace(lookforPattern, function (a0, a1) {
					return "(" + libraryData.lookfor[a1].join("|") + ")" || a1;
					// TODO: throw initialisation error if array not found?
				});

				// Substitute asterisks with appropriate wildcard pattern.
				pattern = pattern.replace(/(\w?)(\s*)\*(\**)(\s*)(\w?)/g, function (m, $1, $2, $3, $4, $5) {
					var rtn = "";
					if ($3) { // Check for extra asterisk which acts as escape character.
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
				pattern = pattern.replace(/^\b/g, "\\b");

				// If the string ends with a word boundary put this in the regex pattern.
				pattern = pattern.replace(/\b$/g, "\\b");
			}

			// Replace multiple spaces with single spaces.
			pattern = pattern.replace(/\s+/g, '\\s+');

			return pattern;
		},

		parseResults = function (results) {
			var result_index = (results) ? (results.length) || 0 : 0,
				clean_results_array = [];
			while (result_index) {
				result_index -= 1;
				if (results[result_index].respond) {
					clean_results_array.push(results[result_index]);
				}
			}
			return clean_results_array;
		},
		
		parseRuleset = function (ruleset) {
		// Take a ruleset and parse it, adding in regular expression patterns for search.
			
			// Create a variable holder for each rule in the set.
			var ruleobj,
				rule_key;
			
			// Loop through all the objects in the set.
			for (rule_key in ruleset) {
				
				// Ensure this object is one we actually want to work on, and not inherited.
				if (ruleset.hasOwnProperty(rule_key)) {
					// Make our holder variable `ruleobj` refer to the current object.
					ruleobj = ruleset[rule_key];
					
					// Produce a search pattern based on the key.
					ruleobj.pattern = preparePattern(rule_key);
					
					// Strip out any results with blank respond values.
					ruleobj.results = parseResults(ruleobj.results);
					
					// If the object itself contains a ruleset, parse this by recursively calling this same function.
					if (typeof ruleobj.ruleset === 'object') {
						parseRuleset(ruleobj.ruleset);
					}
				}
			}
		},

		preprocess = function (input) {
		// Prepare input for processing by dealing with words that can be substituting and any special characters at beginning or end of string.
			
			var rtn,
				sub = libraryData.convert, // local reference to relevant data
				key, // key for data
				arr = [],
				rex;
			
			// For now, create regular expression from `convert` keys.
			for (key in sub) {
				if (sub.hasOwnProperty(key)) {
					arr.push(key);
				}
			}
			rex = new RegExp("\\b(" + arr.join("|") + ")\\b", "gi");
			
			debugFunc("Preprocess: " + input);
			
			// Replace any candidates for conversion with their substitutes.
			rtn = input.replace(rex, function (m, $1) {
				debugFunc($1 + " --> " + sub[$1.toLowerCase()]);
				return sub[$1.toLowerCase()];
			});
			
			// Remove any punctuation, spacing or special characters from beginning or end of string.
			rtn = rtn.replace(/^[\W]*(.*)[\W]*$/g, function (match, $1) {
				return $1;
			});
			
			debugFunc("Result: " + rtn);
			
			return rtn;
		},

		fillTemplate = function (template, input, ioregex, inflections) {
			// TODO: Look at refactoring regex; not all squared brackets necessary?
			var isValid = true;
			template = template.replace(/([(][(]\d+[)][)])|[(](\d+)[)]/g, function (match, $1, $2) {
				var rtn;
				if ($1) {
					// If there's more than one pair of parentheses around the digit, ignore it for now.
					rtn = $1;
				} else {
					// Use number to get relevant part of earlier match with user input.
					rtn = input[parseInt($2, 10)];
					// TODO: Check that this part of the match actually exists!
					if (rtn) {
						// process part of user input and run inflections
						rtn = rtn.replace(ioregex, function (match, $1) {
							debugFunc("Inflection:");
							debugFunc($1 + " --> " + inflections[$1.toLowerCase()]);
							return inflections[$1.toLowerCase()] || $1;
						});
					} else {
						debugFunc("Faulty template. Template is `" + template + "` but there is no: " + $2 + "in wildcard.");
						isValid = false;
					}
				};
				return rtn;
			});
			
			// Remove single pair of outer parentheses from any future substitution markers (i.e. those with more than one pair).
			template = template.replace(/\((\(+\d+\)+)\)/g, function (a0, a1) {
				return a1;
			});
			
			// If response was invalidated at any point, return false, else return the template.
			return isValid && template;
		},
		
		checkTemplate = function (template) {
			// Check if anything needs processing, or if template is ready to go.
			return !(/\(\d+\)/g.test(template));
		},
		
		createDeferObj = function (obj, match, ioregex, inflections) {
			var deferwhere = libraryData,
				deferpath = obj.deferto.shift().reverse(),
				d = deferpath.length,
				rtn_obj;

			while (d) {
				d -= 1;

				// Create the path if it does not already exist.
				if (!(deferwhere.hasOwnProperty("ruleset"))) {
					deferwhere.ruleset = {};
				}

				// Substitute any parentheticals in the defer path.
				deferpath[d] = fillTemplate(deferpath[d], match, ioregex, inflections);

				// Check defer path no longer contains any parentheticals.
				if (checkTemplate(deferpath[d])) {
					if (!(deferwhere.ruleset.hasOwnProperty(deferpath[d]))) {
						deferwhere.ruleset[deferpath[d]] = {};
						// Create pattern based on key.
						deferwhere.ruleset[deferpath[d]].pattern = preparePattern(deferpath[d]);
					}
					deferwhere = deferwhere.ruleset[deferpath[d]];
				} else {
					debugFunc("Too many parentheses in defer path: " + deferpath[d]);
					d = false;
					deferwhere = false;
				}
			}
			
			if (deferwhere) {
				// Record that this item is not part of the original ruleset but deferred.
				obj.deferrd = true;
				debugFunc("Object to be deferred to: ");
				debugFunc(deferwhere);
				
				// If the deferral location does not have a results array create one.
				if (!(deferwhere.hasOwnProperty("results"))) {
					deferwhere.results = [];
				}
				
				rtn_obj = {
					address: deferwhere.results,
					todefer: obj
				}
			}
			
			return rtn_obj;
		},

		process = function (input, rules, ioregex, inflect, order, filter) {
		// Parse input using rulesets, dealing with deference en route and applying filter.
			debugFunc("Starting process level " + order);
		    var i,
				j,
			    regex,
				nested_rtn, // For collecting up returns from recursive calls
				approved_responses,
			    match,
				objcopy,
				deferarray = [], // for storing pointers and objects for final deferral loop
				deferobj,
				rtn = {
					responses: [],
					deferrals: []
				};

			// If `filter` is not a function, define a function which returns true so responses can be passed.
			filter = (typeof filter === "function") ? filter : function () { return true; };
			
			for (i in rules) {
			    regex = new RegExp(rules[i].pattern, 'i');
			    match = (regex).exec(input);
				
			    if (match) {
					debugFunc("Found: " + match[0]);
					// Deal with ruleset within matching object.
					if (rules[i].hasOwnProperty('ruleset')) {
						// Recursively call this function for nested rulesets.
						nested_rtn = process(input, rules[i].ruleset, ioregex, inflect, order + 1, filter);
						rtn.responses = rtn.responses.concat(nested_rtn.responses);
						rtn.deferrals = rtn.deferrals.concat(nested_rtn.deferrals);
					}
					
					// Deal with results within matching object.
					if (typeof rules[i].results === 'object') {
						approved_responses = [];
						
						// Loop through all results.
						for (j = 0; j < rules[i].results.length; j += 1) {

							// Make a copy of the result object.
							objcopy = utils.copyObject(rules[i].results[j]);

							// Make necessary substitutions in the response.
							objcopy.respond = fillTemplate(objcopy.respond, match, ioregex, libraryData.inflect);
							
							// Make sure response is still valid.
							if (objcopy.respond) {
								// Add extra properties based on match data.
								objcopy.pattern = regex;
								objcopy.portion = match[0];
								objcopy.covered = match[0].length;
								objcopy.indexof = match.index;
								objcopy.origobj = rules[i].results[j]; // Include a pointer to the original object.
								objcopy.nesting = order;
							
								if (objcopy.deferto && objcopy.deferto.length) {
									// Set up the deferral for later.
									deferobj = createDeferObj(objcopy, match, ioregex, libraryData.inflect);
									if (deferobj) {
										deferarray.push(deferobj);
									} else {
										debugFunc("Faulty deferral.");
									}
								} else {
									if (checkTemplate(objcopy.respond)) {
										if (filter(objcopy.tagging)) {
										// This result is good to use.
											approved_responses.push(objcopy);
										}
									} else {
										debugFunc("Error: number of parentheses exceeds number of defers.");
										debugFunc(objcopy);
									}
								}
							} else {
								debugFunc("Warning: object `respond` property nullified, most likely by `fillTemplate`.");
								debugFunc(objcopy);
							}
						}
						rtn.responses = rtn.responses.concat(approved_responses);
						rtn.deferrals = rtn.deferrals.concat(deferarray);
					}
			    }
			}
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
					return (noRandomFlag) ? min : Math.floor(Math.random() * (max - min + 1)) + min;
				};
			return {
				convertBethTimeToMS: convertBethTimeToMS,
				copyObject: copyObject,
				selectIndex: selectIndex
			};
		})(),
		
		agendaManager = (function (agendas, exitSession, getUsrSent, getBotSent, getFwdSent, getRspSent, getTotSent, getLogSize, getFlag, debugFunc) {
			var agendaStack = [], // An array to store all the current agenda items.
				redoSnapshot = function (agendaLevel, itemNum) {
					
					// Goes into the bottom level of the stack and resets with the new item number.
					agendaStack[0] = {
						agendaItem: agendaLevel[itemNum], // Pointer to the actual agenda item this snapshot refers to.
						agendaItemNum: itemNum, // Index of agenda item so we don't lose our place.
						agendaIterate: 0, // To be incremented, currently by this function
						agendaUsrSent: getUsrSent(), // Number of messages user sent at start of item.
						agendaBotSent: getBotSent(), // Number of messages user sent at start of item.
						agendaFwdSent: getFwdSent(),
						agendaRspSent: getRspSent(),
						agendaTotSent: getTotSent(),
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
								agendaFwdSent: getFwdSent(),
								agendaRspSent: getRspSent(),
								agendaTotSent: getTotSent(),
								agendaTimeStarted: new Date().getTime() // date and time at start of item
							});
						}
					};
					
					debugFunc("Snapshot retaken!");
					debugFunc(agendaStack);
				},
				getCurrentFilter = function (whichMode) {
					// Takes one argument to determine whether the filter should be in proactive or reactive mode.
					var agendaItem = agendaStack[0].agendaItem, // get most childish item
						mode = agendaItem[whichMode],
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
						agendaItem = agendaSnapshot.agendaItem,
						usr = agendaItem.dountil.usrsent || 0,
						bot = agendaItem.dountil.botsent || 0,
						fwd = agendaItem.dountil.fwdsent || 0,
						rsp = agendaItem.dountil.rspsent || 0,
						tot = agendaItem.dountil.totsent || 0,
						log = agendaItem.dountil.logleft || 0,
						edr = agendaItem.dountil.endured || "0",
						itr = agendaItem.dountil.iterate || 0,
						// if properties are on the agenda, check if conditions are met
						usrComp = (agendaItem.dountil.hasOwnProperty('usrsent'))
							? (getUsrSent() >= agendaSnapshot.agendaUsrSent + usr)
							: false,
						botComp = (agendaItem.dountil.hasOwnProperty('botsent'))
							? (getBotSent() >= agendaSnapshot.agendaBotSent + bot)
							: false,
						fwdComp = (agendaItem.dountil.hasOwnProperty('fwdsent'))
							? (getFwdSent() >= agendaSnapshot.agendaFwdSent + fwd)
							: false,
						rspComp = (agendaItem.dountil.hasOwnProperty('rspsent'))
							? (getRspSent() >= agendaSnapshot.agendaRspSent + rsp)
							: false,
						totComp = (agendaItem.dountil.hasOwnProperty('totsent'))
							? (getTotSent() >= agendaSnapshot.agendaTotSent + tot)
							: false,
						logComp = (agendaItem.dountil.hasOwnProperty('logleft'))
							? (getLogSize() <= log)
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
						
					if (usrComp || botComp || fwdComp || rspComp || totComp || logComp || edrComp || flgComp || itrComp) {
						debugFunc("Agenda item " + agendaSnapshot.agendaItemNum + " complete! Snapshot of completed item below:");
						debugFunc(agendaSnapshot);
						return true;
					}
					return rtn;
				},
				getAgendaLevel = function (address) {
					var a = agendaStack.length,
						rtn = agendas;
					debugFunc("whole agenda Stack");
					debugFunc(agendaStack);
					while (a && a > (address) && rtn[agendaStack[a - 1].agendaItemNum].hasOwnProperty("agendas")) {
						a -= 1;
						debugFunc("agendaStack element:");
						debugFunc(agendaStack[a]);
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
							agendaLevel = getAgendaLevel(0);
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
									deactivate();
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

					debugFunc("*** getCurrentItem function finished this time round. ***");
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
		})(libraryData.agendas, severFn, sessionStats.getUsrSent, sessionStats.getBotSent, sessionStats.getFwdSent, sessionStats.getRspSent, sessionStats.getTotSent, sessionStats.getLogSize, sessionStats.getFlag, debugFunc),
		
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
				ioregex,
				i,
				whichAction,
				whichResponse,
				shards,
				s;
			
			for (i in libraryData.inflect) {
				ioarray.push(i);
			}
			
			// Create a regex from this array to search any input for any of the keys.
			ioregex = new RegExp("\\b(" + ioarray.join("|") + ")\\b", "gi");
			
			// Sort responses to deliver to user via mediator [if staggered, then add to queue].
			if (input) {
				input = preprocess(input);
				results = process(input, libraryData.ruleset, ioregex, libraryData.inflect, 0, filterCallback);
				responses = results.responses;
				deferrals = results.deferrals;
				// Deal with deferrals.
				debugFunc("Deferrals");
				debugFunc(deferrals);
				while (deferrals.length) {
					d = deferrals.shift();
					d.address.unshift(d.todefer);
				}

				if (responses.length) {

					// Sort responses by nesting, so highest nesting comes first (i.e., closer to zero), then deference, then historical usage.
					responses.sort(function (a, b) {
						var rtn = 0,
							a_date = (a.origobj.history) ? (a.origobj.history[0] || 0) : 0,
							b_date = (b.origobj.history) ? (b.origobj.history[0] || 0) : 0;
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

					debugFunc("Responses in: ");
					debugFunc(responses);

					whichResponse = utils.selectIndex(0, (responses.length - 1));
					
					if (responses[whichResponse].respond) {
						// Send only first response (selection will be more varied in future versions).
						postManager.sendWhenReady(responses[whichResponse].respond, sessionStats.updateRspSent);
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
					
					// Split preprocessed input into anything that wasn't matched in process.
					shards = input.split(input.substr(responses[whichResponse].indexof, responses[whichResponse].covered));
					// Return these shards to the log stack for further processing.
					for (s = 0; s < shards.length; s += 1) {
						logManager.addUnprocessedMessage(shards[s]);
					}
					
				}
				
				debugFunc("Current library data...");
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
				postManager.sendWhenReady(mA[whichAction].forward, sessionStats.updateFwdSent);
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
	
	// Set interval to check agenda and log every 3 seconds.
	interval = setInterval(timedcheck, 3000);

	// Finally, expose private variables to public API.
	this.transform = logManager.addUnprocessedMessage;
	this.deactivate = deactivate;
	
},
exports = exports || false;

// Expose the constructor for use by whatever is running in Node JS, assuming there is an exports object.
if (exports) { exports.BotObj = Beth; }

// As with the noRandomFlag argument for the constructor, the only reason Beth is coded as a constructor
// is because I set up eliza-node in this way. This may change (radically affecting the API) soon.
