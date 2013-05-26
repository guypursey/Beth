/*
  elizabot.js v.2.0 beta - ELIZA JS library (N.Landsteiner 2005, G.Pursey 2013)
  Eliza is a mock Rogerian psychotherapist.
  Original program by Joseph Weizenbaum in MAD-SLIP for "Project MAC" at MIT.
  cf: Weizenbaum, Joseph "ELIZA - A Computer Program For the Study of Natural Language
      Communication Between Man and Machine"
      in: Communications of the ACM; Volume 9 , Issue 1 (January 1966): p 36-45.
  Original JavaScript implementation by Norbert Landsteiner 2005; <http://www.masswerk.at>


  usage: var eliza = new ElizaBot();
         var initial = eliza.getInitial();
         var reply = eliza.transform(inputstring);
         if (eliza.quit) {
             // last user input was a quit phrase
         }

         // method `transform()' returns a final phrase in case of a quit phrase
         // but you can also get a final phrase with:
         var final = eliza.getFinal();

         // other methods: reset memory and internal state
         eliza.reset();

         // to set the internal memory size override property `memSize':
         eliza.memSize = 100; // (default: 20)

         // to reproduce the example conversation given by J. Weizenbaum
         // initialize with the optional random-choice-disable flag
         var originalEliza = new ElizaBot(true);

  `ElizaBot' is also a general chatbot engine that can be supplied with any rule set.
  (for required data structures cf. "elizadata.js" and/or see the documentation.)
  data is parsed and transformed for internal use at the creation time of the
  first instance of the `ElizaBot' constructor.

  vers 1.1: lambda functions in RegExps are currently a problem with too many browsers.
            changed code to work around.
			
  vers 2.0 beta: should now work server side with node (a require of the JS file will mean it can be called up)...
				 further work needed.
*/

ElizaBot = (function () {
	"use strict";
	var ElizaBot = function (noRandomFlag, elizaData) {
		var flag = true;
		this.noRandom = (noRandomFlag) ? true : false;
		this.capitalizeFirstLetter = true;
		this.debug = true;
		this.memSize = 20;
		this.version = "1.1 (original)";
		this._dataParsed = false;
		var global = elizaData; //require('./eliza-data-exp.js').elizaData; 
		this.dataVers = (elizaData.hasOwnProperty('elizaVers')) ? elizaData.elizaVers : 1.1;

		
		this.reset = function () {
			var k, i, rules; 		// Counters and holders.
			this.quit = false;		// Ensures continued use of Eliza.
			this.mem = [];			// 
			this.lastchoice = [];	// Array for storing last reply given by Eliza, used in execRule().
			
			for (k = 0; k < global.elizaKeywords.length; k += 1) { 	// For each of the keywords in Eliza,
				this.lastchoice[k] = []; 							// create an array within the lastchoice array,
				rules = global.elizaKeywords[k][2];					// and then look at the rulesets for each keyword
				for (i = 0; i < rules.length; i += 1) {				// and for each ruleset
					this.lastchoice[k][i] = -1;						// create a subarray within the just created array of the lastchoice array!
				}
			}
		}
		
		
		
		this._init = function () {
			console.log("Initialising...");
			// VARIABLE DECLARATIONS
			var synPatterns = {}, 			// object for storing synonym lists as one string
				i,							// loop counter
				k, 							// loop counter
				sre = /@(\S+)/, 			// SYNONYM REGEXP: look for an 'at' sign followed by one or more non-space characters
				are = /(\S)\s*\*\s*(\S)/, 	// ASTERISK REGEXP: look for WILDCARD characters -- captured single non-space followed by optional spaces (note Kleene star), asterisk, optional spaces, captured single non-space
				are1 = /^\s*\*\s*(\S)/, 	// ASTERISK REGEXP 1: look for asterisk at beginning of string, optionally preceded and followed by spaces and followed by a captured single non-space character
				are2 = /(\S)\s*\*\s*$/, 	// ASTERISK REGEXP 2: look for captured single non-space followed by optional spaces, one asterisk, optional spaces at the very end of the string
				are3 = /^\s*\*\s*$/, 		// ASTERISK REGEXP 3: match a string containing nothing but an asterisk (though the asterisk can be surrounded by zero to infinite spaces)
				wsre = /\s+/g, 				// WHITESPACE REGEXP: look for one or more space characters
				rules,						// to contain decompostion and reassembly rulesets for a given word
				r,							// a given ruleset
				m,							// to contain matches from a RegExp execution
				ofs,						// an integer incremented by number of spaces following a dollar sign
				sp,							// for holding a relevant string of synonym patterns
				lp, 						// left part?
				rp, 						// right part?
				a; 							// GISP: an array for storing keys from elizaPres and elizaPosts, then joined to make a regexp

			if ((global.elizaSynons) && (typeof global.elizaSynons === 'object')) {
				for (i in global.elizaSynons) {
					if (typeof global.elizaSynons[i] === 'object') { // this if statement is here purely to comply with JSLint rules
						synPatterns[i] = '(' + i + '|' + global.elizaSynons[i].join('|') + ')';
					}
				}
			}
			
			// check for keywords or install empty structure to prevent any errors
			if ((!global.elizaKeywords) || (typeof global.elizaKeywords.length === 'undefined')) {
				global.elizaKeywords = [['###', 0, [['###', []]]]];
			}

			// 1st convert rules to regexps
			// expand synonyms and insert asterisk expressions for backtracking

			for (k = 0; k < global.elizaKeywords.length; k += 1) {
				rules = global.elizaKeywords[k][2];
				global.elizaKeywords[k][3] = k; 	// Append index to a particular keyword array for sorting.
				
				for (i = 0; i < rules.length; i += 1) {
					r = rules[i]; 					// Get given ruleset.
					console.log("Initialising...", r[0]);
					
					// Check for memory flag in decomposition rule and store boolean result as decomposition's second element.
					if (r[0].charAt(0) === '$') {
						ofs = 1;
						while (/\s/.test(r[0].charAt(ofs))) { // Test for whitespace following the dollar sign
							ofs += 1;
						}
						r[0] = r[0].substring(ofs); // Remove dollar sign and any whitespace following it.
						console.log("Will save an answer upon encountering the pattern", r[0]);
						r[2] = true; 				// Set memory flag to true.
					} else {
						r[2] = false; 				// Set memory flag to false.
					}
					
					// expand synonyms (v.1.1: work around lambda function)
					m = sre.exec(r[0]); 			// Capture a word preceded by an `@` sign.
					while (m) { 					// As long as we find a match...
						console.log("Synonym match: " + m);
						sp = synPatterns[m[1]] || m[1]; 
							// Use the capture as a key and fetch the value from the synonyms object, else use the capture itself.
						console.log(m[0], "replaced with", sp);
						r[0] = r[0].substring(0, m.index) + sp + r[0].substring(m.index + m[0].length);
							// Re-assign the decomposition rule so that it includes all synonyms.
						m = sre.exec(r[0]); // Try matching again.
					}
					
					// expand asterisk expressions (v.1.1: work around lambda function)
					if (are3.test(r[0])) {   		// If the decomposition rule contains nothing but an asterisk,
						r[0] = '\\s*(.*)\\s*'; 		// rewrite the decompostion rule so it can match anything,
					} else { 						// otherwise what needs doing is more complicated...
						m = are.exec(r[0]); 		// Check decompositon rule for a wildcard (asterisk) between some words.
						if (m) { 					// If a match is found
							lp = '';   				// while `lp` is an empty string,
							rp = r[0]; 				// `rp` should now be the decomposition rule.
							while (m) { 			// As long as we finding matches with the decomposition rule,
								lp += rp.substring(0, m.index + 1); 	// add to `lp` the part of the decomposition rule up until the match (plus 1 so it includes the captured non-space character),
								if (m[1] !== ')') { 					// and so long as the first capture is not a closing parenthesis,
									lp += '\\b'; 						// add a word boundary rule to `lp` too.
								}
								lp += '\\s*(.*)\\s*'; 					// Then add to `lp` the wildcard matching regular expression (any asterisk surrounded by any amount of whitespace).
								if ((m[2] !== '(') && (m[2] !== '\\')) { 	// So long as the second capture is not a closing parenthesis or two backslashes,
									lp += '\\b'; 							// add a word boundary to `lp`.
								}
								lp += m[2]; 								// Add the second capture to `lp`.
								rp = rp.substring(m.index + m[0].length); 	// `rp` should be everything past the current match (asterisk)
								m = are.exec(rp); 							// Repeat the search on the latest version of `rp`.
							}
							r[0] = lp + rp; 		// Finally, concatenate the left and right parts so anything after the last asterisk is included.
						}
						console.log("Are processed", r[0]);
						
						m = are1.exec(r[0]);
						if (m) {
							lp = '\\s*(.*)\\s*'; 		// Standard wildcard search.
							if ((m[1] !== ')') && (m[1] !== '\\')) {
								lp += '\\b';
							}
							r[0] = lp + r[0].substring(m.index - 1 + m[0].length);
						}
						console.log("Are1 processed", r[0]);
						m = are2.exec(r[0]);
						if (m) {
							lp = r[0].substring(0, m.index + 1);
							if (m[1] !== '(') {
								lp += '\\b';
							}
							r[0] = lp + '\\s*(.*)\\s*'; // Standard wildcard search.
						}
						console.log("Are2 processed", r[0]);
						
					}
					
					// expand white space
					r[0] = r[0].replace(wsre, '\\s+');
					wsre.lastIndex = 0;
					console.log("Initialised as", r[0]);
				}
			}
			
			// now sort keywords by rank (highest first)
			global.elizaKeywords.sort(this._sortKeywords);
			
			// Compose regexps and refs for pres.
			this.pres = {};
			
			if ((global.elizaPres) && (global.elizaPres.length)) {  			// Assuming that elizaPres exists and has at least one element,
				a = [];															// set up an empty array called `a`.
				for (i = 0; i < global.elizaPres.length; i += 2) { 					// For every pair of elements in elizaPres,
					a.push(global.elizaPres[i]);								// add the first element in the pair to the array, `a`,
					this.pres[global.elizaPres[i]] = global.elizaPres[i + 1]; 	// and create property in the `pres` object with the first element as the key, the second as the value.
				}
				this.preExp = new RegExp('\\b(' + a.join('|') + ')\\b'); 		// The array `a` is joined to create a regular expression, `preExp`, which can be used to search a statement for any of the keys.
			} else {															// If there is no elizaPres array or it is empty,
				this.preExp = /####/; 											// set the preExp to something which cannot be found,
				this.pres['####'] = '####';										// and provide a transformation for this just in case.
			}
			
			// Compose regexps and refs for posts.
			this.posts = {};			
			if ((global.elizaPosts) && (global.elizaPosts.length)) {			// Assuming that elizaPosts exists and has at least one element,
				a = [];															// set up an empty array called `a`.
				for (i = 0; i < global.elizaPosts.length; i += 2) { 			// For every pair of elements in elizaPosts,
					a.push(global.elizaPosts[i]);								// add the first element in the pair to the array, `a`,
					this.posts[global.elizaPosts[i]] = global.elizaPosts[i + 1];// and create property in the `pres` object with the first element as the key, the second as the value.
				}
				this.postExp = new RegExp('\\b(' + a.join('|') + ')\\b'); 		// The array `a` is joined to create a regular expression, `postExp`, which can be used to search a statement for any of the keys.
			} else {															// If there is no elizaPosts array or it is empty,
				this.postExp = /####/; 											// set the postExp to something which cannot be found,
				this.posts['####'] = '####';									// and provide a transformation for this just in case.
			}
			
			// If there is no elizaQuits array the create an empty one.
			if ((!global.elizaQuits) || (typeof global.elizaQuits.length === 'undefined')) {
				global.elizaQuits = [];
			}
			
			// Done: set initialisation as complete by setting _dataParsed flag to true.
			this._dataParsed = true;
		};

		this._sortKeywords = function (a, b) {
			var rtn;
			// sort by rank
			if (a[1] > b[1]) {
				rtn = -1;
			} else if (a[1] < b[1]) {
				rtn = 1; // or original index
			} else if (a[3] > b[3]) {
				rtn = 1;
			} else if (a[3] < b[3]) {
				rtn = -1;
			} else {
				rtn = 0;
			}
			return rtn;
		};
	
		this.transform = function (text) {
			var rpl = '',
				rtn = '',
				parts,	// an array for storing
				part,	// for storing the element in the array currently being examined
				i,		// to be used as a counter
				q,		// to be used as a counter
				k,		// to be used as a counter and value fetched
				m,		// to be used as an array of regExp matches
				lp,		// to be used to hold left-part of string (I think)
				rp;		// to be used to hold right-part of string (I think)

			this.quit = false;
			// unify text string
			text = text.toLowerCase();
			text = text.replace(/@|#|\$|%|\^|&|\*|\(|\)|_|\+|=|~|`|\{|\[|\}|\]|\||:|;|<|>|\/|\\|\t/g, ' ');
				// NOTE: this had to be corrected from Landsteiner's original script, which did not feature pipes
			text = text.replace(/\s+-+\s+/g, '.'); 			// Replace a hyphen (or several) surrounded by spaces with a period.
			text = text.replace(/\s*[,\.\?!;]+\s*/g, '.'); 	// Replace a number of punctuation marks with a period.
			text = text.replace(/\s*\bbut\b\s*/g, '.'); 	// Replace the word 'but' with period.
			text = text.replace(/\s{2,}/g, ' '); 			// Replace multiple spaces with a single space.
			
			parts = text.split('.');						// Split user's input up into a collection of statements wherever there is a period.
			
			for (i = 0; i < parts.length; i += 1) { 					// Loop through each 'part' of the user's input,
				part = parts[i];										// assigning each to a local variable temporarily,
				if (part) {												// and, assuming the part is not 'empty',
					for (q = 0; q < global.elizaQuits.length; q += 1) { // check if it's a quit word.
						// NOTE: currently this only seems to work if a quit word is the first in the user's entry.
						if (global.elizaQuits[q] === part) { // check for quit expression
							this.quit = true;
							rtn = this.getFinal();						// If it is, get Eliza's final response.
						}
					}
					
					if (!rtn) {
						// preprocess (v.1.1: work around lambda function)
						m = this.preExp.exec(part);
						  // searches the part for any match with the values in the ElizaPres array
						console.log("match with pre-processing, m:", m);
						if (m) {
							lp = '';
							rp = part;
							while (m) {
								console.log("match with pre-processing, m:", m);
								lp += rp.substring(0, m.index) + this.pres[m[1]];
								rp = rp.substring(m.index + m[0].length);
								m = this.preExp.exec(rp);
							}
							part = lp + rp;
						}
						
						
						this.sentence = part;	// The part is saved to a property of the Eliza object so that it can be referenced by `_execRule()` later.
						console.log("sentence being examined: ", this.sentence);
						// loop trough keywords
						for (k = 0; k < global.elizaKeywords.length && !rtn; k += 1) {
							if (part.search(new RegExp('\\b' + global.elizaKeywords[k][0] + '\\b', 'i')) >= 0) {
								// if we find a keyword in the part, call the execRule.
								rpl = this._execRule(k);
							}
							if (rpl) {
								rtn = rpl;		// As long as the executive rule does not return empty, this is the reply Eliza gives the user.
							}
						}
					}
				}
			}

			if (!rtn) {
				rpl = this._memGet();							// If nothing is matched, retrieve a response from Eliza's memory.
				if (rpl === '') { 			    				// If there is nothing is returned from Eliza's memory,
					this.sentence = ' ';						// forget whatever sentence was being worked on before, replace it with a space,
					k = this._getRuleIndexByKey('xnone');		// and retrieve the ruleset for 'xnone'.
					if (k >= 0) {								// Assuming a match can be found with whatever's in the 'xnone' ruleset,
						rpl = this._execRule(k);				// run the executive rule on it.
					}
				}
			}
			
			// return reply or default string
			rtn = (rpl !== '') ? rpl : "I'm sorry but I don't understand. Could you rephrase what you were saying?";
				// TODO: the default string should be pulled from a selection
			return rtn;
		};
	
		this._execRule = function (k) { 		// The executive rule takes as its argument the index of the ruleset which requires processing.
		
			var rule = global.elizaKeywords[k], // Using the index provided by the argument, get the appropriate ruleset(s).
				decomps = rule[2],				// The rulesets.
				paramre = /\(([0-9]+)\)/, 		// A RegExp for capturing any parenthesised numerals within the reply which Eliza constructs.
				i = 0,							// Counter, used to loop the length of `decomps`.
				decompsLen = decomps.length,	// Length of the decomps array.
				m, 								// A variable for storing matches.
				reasmbs,						// For holding the array of reassembly patterns.
				memflag,						// For storing the memory flag set up in the keywords array earlier.
				ri,								// Stands for 'random integer' but will be increment counter if `noRandom` is true.
				rpl,							// For holding the reply that will be returned to the user.
				ki,								// For the key index of a goto event.
				lp,								// For holding anything left of the match in the reply template.
				rp,								// For holding anything right of the match in the reply template.
				param,							// For holding the capture of a particular wildcard position.
				m2,								// A second variable for storing matches in the nested post-transform loop.
				lp2,							// For holding anything left of the capture in the input during the post-transform loop.
				rp2,							// For holding anything right of the capture in the input during the post-transform loop.
				m1,								// For holding any matched numerals within parentheses.
				rtn = '';						// String to be returned at the end of this method.
				
			for (i = 0; (i < decompsLen && (!rtn)); i += 1) {			// Loop through each ruleset for a given keyword.
				console.log("Beginning loop:", i, "Current return value:", rtn);
				console.log("Examining decomp rule", decomps[i]);
				m = this.sentence.match(decomps[i][0]);																// Look for a match in user's input with a given decomposition rule,
				if (m !== null) { 																					// and if such a match is found...
					console.log("Match found!", m);
					reasmbs = decomps[i][1]; 																		// Get the array of reassembly patterns,
					memflag = decomps[i][2]; 																		// determine whether this is something that needs remembering or not
					ri = (this.noRandom) ? 0 : Math.floor(Math.random() * reasmbs.length); 							// and, if `noRandom` is set to true, work through each response in order (otherwise select randomly).
					
					if (((this.noRandom) && (this.lastchoice[k][i] > ri)) || (this.lastchoice[k][i] === ri)) {		// Assuming we're not selecting random replies,
						ri = ++this.lastchoice[k][i]; 																// increment both this.lastchoice[k][i] and ri
						if (ri === reasmbs.length) { 																// If the random integer is the same as the length of the `reasmbs` array (and therefore not usable) [NOTE: Should this be an assignment? It was originally but I've made it a non-coercive check now...]
							ri = 0;																					// reset the random integer to zero.
							this.lastchoice[k][i] = -1;																// and [for reasons I don't understand] set the lastchoice to one below zero.
						}
					} else {
						this.lastchoice[k][i] = ri;																	// If ri is actually random then we only need set the lastchoice to `ri`, for the records.
					}
					rpl = reasmbs[ri];																				// The reply should be the `ri`th element of `reasmbs`.
					
					if (this.debug) {
						console.log('match:\nkey: ' + global.elizaKeywords[k][0] +
							'\nrank: ' + global.elizaKeywords[k][1] +
							'\ndecomp: ' + decomps[i][0] +
							'\nreasmb: ' + rpl +
							'\nmemflag: ' + memflag);
					}
					
					if (rpl.search('^goto ', 'i') === 0) {					// If the reply contains a `^goto` tag,
						ki = this._getRuleIndexByKey(rpl.substring(5));     // get the key we should go to,
						if (ki >= 0) {										// and assuming the key exists in the keyword array,
							console.log('Going to another ruleset.');
							rtn = this._execRule(ki);						// recursively call this method with the new index.
						}
					}
					
					if (!rtn) {
						// substitute positional params (v.1.1: work around lambda function)
						m1 = paramre.exec(rpl); // Match numerals within parentheses,
						console.log("m1:", m1);
						if (m1) {				// and if any are found,
							lp = '';			// set up an empty string for the left,
							rp = rpl;			// and assign the reply to the right for now.
							while (m1) {		// Whilst matches are still being found,
								console.log("m1:", m1);
								param = m[parseInt(m1[1], 10)]; //get the capture at the location given by the parenthetical match.
								// postprocess param
								m2 = this.postExp.exec(param); // Check the captured section for a match with any of the post-transform values.
								console.log("m2", m2);
								if (m2) { // If a match is found, loop through until all post-transform values within it are replaced.
									console.log("m2", m2);
									lp2 = ''; // Nothing parsed yet, so set left part 2 as empty.
									rp2 = param; // Set right part as whole string to be parsed.
									while (m2) { // Keep looping as we find matches.
										lp2 += rp2.substring(0, m2.index) + this.posts[m2[1]]; // Consider everything left of the match parsed and add in the post-transform substitution.
										rp2 = rp2.substring(m2.index + m2[0].length); // Set the string to be parsed as everything left over after the match.
										m2 = this.postExp.exec(rp2); // Check the remainder of the string for matches.
									}
									param = lp2 + rp2;
								}
								lp += rp.substring(0, m1.index) + param;
								rp = rp.substring(m1.index + m1[0].length);
								m1 = paramre.exec(rp);
							}
							rpl = lp + rp;
						}
						rpl = this._postTransform(rpl);
						if (memflag) {
							this._memSave(rpl);
						} else {
							rtn = rpl;
							console.log("Response found:", rtn);
						}
					}
				}
			}
			return rtn;
		};
		
		this._postTransform = function (s) {
			var i,
				re,
				m;
			// final cleanings
			s = s.replace(/\s{2,}/g, ' ');
			s = s.replace(/\s+\./g, '.');
			if ((global.elizaPostTransforms) && (global.elizaPostTransforms.length)) {
				for (i = 0; i < global.elizaPostTransforms.length; i += 2) {
					s = s.replace(global.elizaPostTransforms[i], global.elizaPostTransforms[i + 1]);
					global.elizaPostTransforms[i].lastIndex = 0;
				}
			}
			// capitalize first char (v.1.1: work around lambda function)
			if (this.capitalizeFirstLetter) {
				re = /^([a-z])/;
				m = re.exec(s);
				if (m) {
					s = m[0].toUpperCase() + s.substring(1);
				}
			}
			return s;
		};
	
		this._getRuleIndexByKey = function (key) {
			var k,
				rtn = -1;
			for (k = 0; k < global.elizaKeywords.length; k += 1) {
				if (global.elizaKeywords[k][0] === key) {
					rtn = k;
				}
			}
			return rtn;
		};

		this._memSave = function (t) {
			console.log("Saving to memory:", t);
			this.mem.push(t);
			if (this.mem.length > this.memSize) {
				this.mem.shift();
			}
		};
		
		this._memGet = function () {
			var rtn; // variable to return
			if (this.mem.length) {
				rtn = (this.noRandom) ? this.mem.shift() : this.mem.splice(Math.floor(Math.random() * this.mem.length), 1)[0];
			} else {
				rtn = '';
			}
			console.log("Retrieving from memory:", rtn);
			return rtn;
		};
	
		this.getFinal = function () {
			return (!global.elizaFinals) ? '' : global.elizaFinals[Math.floor(Math.random() * global.elizaFinals.length)];
		};

		this.getInitial = function () {
			return (!global.elizaInitials) ? '' : global.elizaInitials[Math.floor(Math.random() * global.elizaInitials.length)];
		};
	
		if (!this._dataParsed) {
			this._init();
		}
		this.reset();
	
	}


	// fix array.prototype methods (push, shift) if not implemented (MSIE shim)
	if (typeof Array.prototype.push === 'undefined') {
		Array.prototype.push = function (v) {
			this[this.length] = v;
			return this[this.length - 1];
		};
	}
	if (typeof Array.prototype.shift === 'undefined') {
		var e0,
			i,
			rtn;
		Array.prototype.shift = function () {
			if (this.length === 0) {
				rtn = null;
			}
			e0 = this[0];
			for (i = 1; i < this.length; i += 1) {
				this[i - 1] = this[i];
			}
			this.length -= 1;
			rtn = e0;
			return rtn;
		};
	}

	// console.log(ElizaBot);
	return ElizaBot; // return constructor...

}());

ElizaBot.prototype.getFlag = function () {
	alert(flag);
}

if (typeof exports !== 'undefined') { // if we are using node js or common js, or something that has an exposure pattern...
	exports.BotObj = ElizaBot; // expose constructor
}

