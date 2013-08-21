#BETH#

##CODE DOCUMENTATION for v0.4.6##

###NODE JS COMPATIBILITY###

Currently the `beth.js` file consists of one Beth constructor, which takes the form of an anonymous function expression attached to the single global variable Beth. At the bottom of the file, one line of code points to a property of the `exports` object to the constructor so that it can be referred to by Node JS scripts.

###COMPOSITION OF THE BETH CONSTRUCTOR###

Most of the contents of the Beth content constructor are dedicated to local variable declaration.

A few lines towards the end of the constructor are calls to some of the anonymous functions set up in this local variable declaration.

In the final lines, some of the local variables are exposed as part of the "API" by attaching their objects or values to public properties of the constructor (i.e., `this` properties).

###PARAMETERS OF THE BETH CONSTRUCTOR###

The Beth constructor takes five parameters, namely:

- `noRandomFlag`
- `libraryData`
- `postMsg`
- `severFn`
- `debugFn`

Their purposes are as follows:

### `noRandomFlag` ###
Boolean value. Allows random selection of responses, if set to `false`.

### `libraryData` ###
Object. This is the data that Beth should work with, normally imported from another file (.json or .js format), including agenda, rulesets, synonyms, substitions, etc.

### `postMsg` ###
Function. This callback should contain the code necessary for Beth to post a message to the chat interface.

### `severFn` ###
Function. This callback should contain the code necessary for Beth to disconnect from the chat. 

### `debugFn` ###
Function. This callback should contain the code necessary for Beth to log what is happening for debugging and analytical purposes.


###VARIABLES IN THE BETH CONSTRUCTOR###

The variables in the Beth constructor are as follows:

 - `debugFunc`
 - `sessionStats`
 - `logManager`
 - `postManager`
 - `lookforMarker`
 - `lookforPattern`
 - `preparePattern`
 - `parseResults`
 - `parseRuleset`
 - `preprocess`
 - `fillTemplate`
 - `checkTemplate`
 - `createDeferObj`
 - `process`
 - `utils`
 - `agendaManager`
 - `timedcheck`
 - `interval`
 - `agendaInterval`
 - `postInterval`
 - `deactivate`


###`debugFunc`###

*Function.* If `debugFlag` is true then set call `debugFn` or (if `debugFn`) is null log the message in the console.

###`sessionStats`###

*IIFE closure.* The closure returns an object whose properties are references to functions within the closure. This means that the stats themselves are private variables and should not be changeable from the outside. The functions provided can be used to increment the number of messages the user has sent or the bot has sent or the total overall messages sent. There is also a function for setting flags. In addition to these setters, getter properties can be used to retrieve the latest statistics.

###`logManager`###

*IIFE closure.* The closure returns an object whose properties are references to functions within the closure. Enables adding of user's input to the appropriate `logData` stack and calls the method in `sessionStats` (plugged into the closure) for incrementing the number of messages sent by the user. When a user's input first arrives it is chunked into sentences (split by full-stops) before each individual part is checked for worthiness of a response (i.e., it contains letters or digits) and added to the stack. 

###`postManager`###

*IIFE closure.* The closure returns an object whose properties are references to functions within the closure. Enables adding of messages t go out to conversation. Has interval timer which checks if there is anything on the local stack and sends it out.

###`lookforMarker`###

*String.* The symbol for synonyms. Anything following the character included in this string will be considered a key to be replaced by the various search patterns outlined in the `lookfor` property of `libraryData`.

###`lookforPattern`###

*RegExp.* A search for the `lookfor` symbol and any non-space charcters that follow it.

###`preparePattern`###

*Function.* Takes a string as an argument, expecting a key from a `ruleset`. Returns it as a string primed to become a regular expression, with asterisks replaced by wildcard patterns.

###`parseResults`###

*Function.* Takes an array (expecting a `results` array), and checks the `respond` property inside each object to ensure it is not blank. Returns an array cleaned of `respond`-free objects. (This was created so test files could be set up with provisional objects in place but with the `respond`s left to be written at a later date.) 

###`parseRuleset`###

*Function.* Given a ruleset as a parameter, this function will initialise it by changing each `pattern` property into a string that can be used to create a regular expression. Calls `preparePattern` and `parseResults`. Also handles deferrals and filtering.

Calls itself recursively, in that it can then be used to parse rulesets of greater depth (i.e., rulesets within rulesets).

###`preprocess`###

*Function.* Checks user's input for any substitutions that need to be made and makes them. Returns amended input.

###`fillTemplate`###

*Function.* Takes a reassembly template, a match object from the user's input, a regex containing all the inflect keys and the inflections object. Replaces all singly parenthesised numerals with relevant part of user's input and takes care of inflections. Returns processed string if successful, or false if the string is nullified by faulty reference.

###`checkTemplate`###

*Function.* Takes reassembly template as argument and checks to see if it is ready to go or if it needs further processing by looking for numerals in parentheses. If ready, returns true. If not, returns false.

###`createDeferObj`###

*Function.* Takes a result object, match object from user's input, a regex of inflect keys and the inflections object. Processes the respond property of the result object with `fillTemplate`. Finds location in libraryData to which the zeroth defer path refers and packages that as an address with the result object itself to be processed later. Returns package or false.
 
###`process`###

*Function.* The main function for forming responses to the user. Receives input from user, a ruleset, a regular expression for `lookfor` keys, the `lookfor` object, the order of depth (beginning at zero) and a filter within which to sift results. Returns an object containing `responses` and `deferrals` properties, based on the reassembly rules of the provided ruleset.

If the ruleset has a ruleset, this function is called recursively and the returned results are then concatenated.

Results are copied from the `libraryData` with a local `copyObj` function that ensures the originals are not changed accidentally. References to the original result object is included in the copy for the purposes of logging use of a particular result.

The filter provided as a parameter is used to ensure that only results with the necessary tags are processed.

The response of each result is filled out with the required part of the user's input.

Since the introduction of a memory convention, results with `deferto` values are put aside so that they can be actually placed back into the `libraryData` for later use. Some variables within the reassembly rule (`respond`) may be further deferred according to the convention.

Results are then concatenated to any previous results (i.e. from successful recursive calls) and returned.

###`utils`###

*IIFE closure.* Contains generally useful functions, like:

 - `convertBethTimeToMS`
 - `copyObject`
 - `selectIndex`

Maybe more to come.

###`agendaManager`###

*IIFE closure.* Currently the closure returns an object whose only property is an exposed function for getting the current filter. The current filter is composed within the closure based on the particular agenda item Beth is on and the conditions set therein.

Has interval timer which checks what the current item should be. If any current agenda item is complete (including any parent items), it finds the next one. In the event that the item is the last one on the agenda, the parent item is iterated and checked for completion.

###`timedcheck`###

*Function.* Currently the main function. Reads the log, gets the current filter from the `agendaManager`. If there is an input from the log to process, then it will be sent first to `preprocess` and then with other appropriate parameters to `process`. One of the parameters is `ioregex` which is created here based on `libraryData.inflect`.

Results returned by `process` feature `responses` and `deferrals`. `Deferrals` are looped through and each object is placed back in the listed place of `libraryData`.

Some sorting then happens so that responses with higher `nesting` value are put first (i.e. closer to zero) in the array. Those with a true `deferrd` status are prioritised over those of the same nesting value without. 

Currently, only the top response (zero) is used and the `respond` property is pushed to the `postRoom` array.

If an original object reference is listed, this is used to modify the appropriate history property in `libraryData`. [Some thought required as to how multiple deferrals are recorded.]

Any flags found in the zeroth response are set as instructed. [Should flags be set on all responses or just those selected... Or perhaps flags should also be settable at the pattern level?]

Using the filter, any statement found in the moveset is pushed out to `postRoom`.

Finally, if `postRoom` has anything in it, the zeroth element is shifted out and posted via the `postMsg` callback. `sessionStats` bot stats are incremented accordingly.

Called by a regular timed interval.

###`interval`###

A variable for holding the time interval.

###`deactivate`###

A function for deactivating Beth by clearing the time interval set as `interval`.

###INITIALISATION###

After all variable declarations, the `ruleset` in `libraryData` is parsed with `parseRuleset()` (see above). This basically involves going through each ruleset and turning keys into pattern values that can be used as regular expressions.

Finally the function `timedCheck` is set to be called every two seconds with an interval timer set to `interval`. 

###API EXPOSURE###

The `process` function is exposed with `this.transform`, the public name being a legacy of the old Eliza code. [this may be changed]

The function `deactivate` is exposed with `this.deactivate` to allow the server to stop Beth processing, particularly on a disconnect or a page refresh.