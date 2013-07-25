#BETH#

##CODE DOCUMENTATION for v0.3.7##

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
Boolean value. A legacy from Eliza, on which Beth is based. This can be set to whatever and will have no effect.

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

 - `debugFlag`
 - `debugFn`
 - `debugFunc`
 - `libraryData`
 - `logData`
 - `postRoom`
 - `postMsg`
 - `severFn`
 - `wildcardPattern`
 - `synonymMarker`
 - `synonymPattern`
 - `parseRuleset`
 - `ioregex`
 - `parseIo`
 - `getInitial`
 - `loginput`
 - `preprocess`
 - `process`
 - `readlog`
 - `sessionStats`
 - `agendaManager`
 - `timedcheck`


###`debugFlag`###

*Boolean value.* An internally set variable that enables/disables the debugging that Beth produces. [May not actually be required as the callback parameter can be provided as empty or false to produce the same effect.]

###`debugFn`###

*Parameter. (Should be a function.)* Simply inherits whatever callback is provided as a parameter to Beth.

###`debugFunc`###

*Function.* If `debugFlag` is true then set call `debugFn` or (if `debugFn`) is null log the message in the console.

*API Documentation:*

    /**
     * Do something with a single message, ideally logging.
     *
     * @param {String} input String to log.
     * @return Nothing?
     */

###`libraryData`###

*Parameter. (Should be an object.)* Contains the rulesets, movesets and other data that Beth should follow in a conversation.
 
###`logData`###

*Object.* A collection of arrays to store what the user has said which needs processing, what has already been processed, and what Beth has said. [Encapsulation may be required.]

###`postRoom`###

*Array.* A storing array for responses to be sent out by Beth at certain intervals.

###`postMsg`###

*Parameter. (Should be a function.)* A localisation of the `postMsg` argument which should be a callback function.

###`severFn`###

*Parameter. (Should be a function.)* A localisation of the `severFn` argument which should be a callback function.

###`wildcardPattern`###

*String.* To be used as a regular expression later for searching for any characters.

###`synonymMarker`###

*String.* The symbol for synonyms. Anything following the character included in this string will be considered a synonym to be replaced by the various search patterns outlined in the synonyms property of `libraryData`.

###`synonymPattern`###

*RegExp.* A search for the synonym symbol and any non-space charcters that follow it.

###`parseRuleset`###

*Function.* Given a ruleset as a parameter, this function will initialise it by changing each `pattern` property into a string that can be used to create a regular expression.

Calls itself recursively, in that it can then be used to parse rulesets of greater depth (i.e., rulesets within rulesets).

###`ioregex`###

*Variable. (Holding for RegExp.)* See `parseIo`.

###`parseIo`###

*Function.* Stores in `ioregex` a Regular Expression to search for all the words in reassembled parts of the user's input that need to be substituted in order to maintain sense in the conversation.

###`getInitial`###

*Function.* Returns the string "Hello World!" [May now be redundant with the agenda and appropriate data in place.]

###`loginput`###

*Function.* Adds user's input to the appropriate `logData` property and calls the method in sessionStats for incrementing the number of messages sent by the user.

[Might also fit within a closure.]

###`preprocess`###

*Function.* Checks user's input for any substitutions that need to be made and makes them. Returns amended input.
 
###`process`###

*Function.* The main function for forming responses to the user. Receives input from user, a ruleset, the order of depth (beginning at zero) and a filter within which to sift results. Returns an object containing `responses` and `deferrals` properties, based on the reassembly rules of the provided ruleset.

If the ruleset has a ruleset, this function is called recursively and the returned results are then concatenated.

Results are copied from the `libraryData` with a local `copyObj` function that ensures the originals are not changed accidentally. References to the original result object is included in the copy for the purposes of logging use of a particular result.

The filter provided as a parameter is used to ensure that only results with the necessary tags are processed.

The response of each result is filled out with the required part of the user's input.

Since the introduction of a memory convention, results with `deferto` values are put aside so that they can be actually placed back into the `libraryData` for later use. Some variables within the reassembly rule (`respond`) may be further deferred according to the convention.

Results are then concatenated to any previous results (i.e. from successful recursive calls) and returned.

###`readlog`###

*Function.* Removes the input at the beginning of the `logData` and returns it.

###`sessionStats`###

*IIFE closure.* The closure returns an object whose properties are references to functions within the closure. This means that the stats themselves are private variables and should not be changeable from the outside. The functions provided can be used to increment the number of messages the user has sent or the bot has sent or the total overall messages sent. There is also a function for setting flags. In addition to these setters, getter properties can be used to retrieve the latest statistics.

###`utilities`###

*IIFE closure.* Contains generally useful functions, like:

 - `convertBethTimeToMS`

Maybe more to come.

###`agendaManager`###

*IIFE closure.* Currently the closure returns an object whose only property is an exposed function for getting the current filter. The current filter is composed within the closure based on the particular agenda item Beth is on and the conditions set therein.

Has interval timer which checks what the current item should be. If any current agenda item is complete (including any parent items), it finds the next one. In the event that the item is the last one on the agenda, the parent item is iterated and checked for completion.

[This code needs refactoring, as it is not particularly elegant at the moment; efficiencies could be made.]

###`timedcheck`###

*Function.* Currently the main function. Reads the log, gets the current filter from the `agendaManager`. If there is an input from the log to process, then it will be sent first to `preprocess` and then with other appropriate parameters to `process`.

Results returned by `process` feature `responses` and `deferrals`. `Deferrals` are looped through and each object is placed back in the listed place of `libraryData`.

Some sorting then happens so that responses with higher `nesting` value are put first (i.e. closer to zero) in the array. Those with a true `deferrd` status are prioritised over those of the same nesting value without. 

Currently, only the top response (zero) is used and the `respond` property is pushed to the `postRoom` array.

If an original object reference is listed, this is used to modify the appropriate history property in `libraryData`. [Some thought required as to how multiple deferrals are recorded.]

Any flags found in the zeroth response are set as instructed. [Should flags be set on all responses or just those selected... Or perhaps flags should also be settable at the pattern level?]

Using the filter, any statement found in the moveset is pushed out to `postRoom`.

Finally, if `postRoom` has anything in it, the zeroth element is shifted out and posted via the `postMsg` callback. `sessionStats` bot stats are incremented accordingly.

Called by a regular timed interval.

###INITIALISATION###

After all variable declarations, the `ruleset` in `libraryData` is parsed with `parseRuleset()` (see above). This basically involves going through each ruleset and turning keys into pattern values that can be used as regular expressions.

The `intoout` values are parsed with `parseIo()`.

Finally the function `timedCheck` is set to be called every two seconds with an interval timer. 

###API EXPOSURE###

Currently, the function `getInitial` is exposed with `this.getInitial`. [no longer required]

Most importantly, the `process` function is exposed with `this.transform`, the public name being a legacy of the old Eliza code. [this may be changed]