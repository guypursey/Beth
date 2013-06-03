// v0.0.2
// Hotfix for undefined substitutions.

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
				i,
				j,
			    rex,	// for storing regular expression
			    rst = [],	// for storing results
				results,
			    m,		// matching string
			    goto,		// for goto
			    order = order || 0,
			    tabbing = '';	// for debugging
			
			for (i = 0; i < order; i += 1) {
				tabbing += '\t';
			}
			
			tabbing += order + ':';
			
			for (i in rules) {
				debugFunc("looping through rules");
			    rex = new RegExp(rules[i].pattern, 'i');
			    m = (rex).exec(input);
			    if (m) {
					(tabbing, "Examined:", rex);
					console.log(tabbing, "Found:", m[0]);
					if (rules[i].hasOwnProperty('ruleset')) {
						console.log(tabbing, "Exploring further...");
						rst = rst.concat(process(input, rules[i].ruleset, order + 1));
					}
					if (typeof rules[i].results === 'object') {
						results = rules[i].results.slice(0);
						console.log(tabbing, "Obtaining results...");
						if (results.length) {
							console.log(tabbing, "Results found.");
						}
						for (j = 0; j < results.length; j += 1) {
							
							if (results[j].respond.search('^goto ', 'i') === 0) {					// If the reply contains a `^goto` tag,
								
								goto = results[j].respond.substring(5);     // get the key we should go to,
								if (libraryData.ruleset["*"].ruleset.hasOwnProperty(goto)) {										// and assuming the key exists in the keyword array,
									console.log(tabbing, 'Going to ruleset ' + goto + ':', results[j].respond.substring(5));
									rst = rst.concat(process(input, libraryData.ruleset["*"].ruleset[goto], order + 1));
								}
								results.splice(j);
								
							} else {
								results[j].refined = order;
							
								results[j].respond = results[j].respond.replace(/\(([0-9]+)\)/, (function(context) {
									return function (a0, a1) {
										var rtn = m[parseInt(a1, 10)];
										results[j].respond = results[j].respond.replace(context.postExp, function () {
											return context.posts[a1];
										});
										return rtn;
									};
								})(this)); // iife temporary fix for use of `this` within lambda function
								
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
		timedcheck = function () {
		// Check if anything on the agenda needs doing. [PROACTIVE]
		// Check if any responses are waiting to go out.
		// Check if the user has said anything recently and process it. [REACTIVE]
			var input = readlog(),
				responses;
		// Sort responses to deliver to user via mediator [if staggered, then add to queue].
			if (input) { 
				responses = process(input, libraryData.ruleset, 0);
				debugFunc(responses);
				postMsg(responses[0].respond)
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
