#BETH DATA CONVENTIONS#

##v0.4.9##

###ABOUT###

Beth accepts a JSON file containing the data it needs to operate. This document details how this data should be structured so that Beth can understand it.

###STRUCTURE###

Within the JSON file should be a single object containing a single property called `data`. There is an option for a `test` property as well for use with testing units.

`data` itself should be an object containing six of different properties needed by Beth to perform:

 - `agendas`
 - `convert`
 - `inflect`
 - `lookfor`
 - `moveset`
 - `ruleset`

Below are the particulars of each of the above properties.

###`agendas`###

Array. Each element of the array is an object, acting as an item on the agenda. Each object must contain a `dountil` property which describes the points at which the item can be considered complete. Only one of the conditions need be fulfilled for the item to be complete. There is a convention that one can include `proactive` and `reactive` behaviours for each item.

Each agenda can also contain another agenda, with its own items.

Here are the properties each agenda item can contain:

####`dountil`####

Object. This can contain several properties each of which set the conditions for when an item is considered complete or covered.

#####`usersent`#####

Number. When the user has sent this number of messages during this item on the agenda, the item is considered complete.

#####`botsent`#####

Number. When Beth has sent this number of messages during this item on the agenda, the item is considered complete.

#####`flagset`#####
 
String. When the flag named has been set to true by a certain of Beth's responses, the item is considered complete.

#####`iterate`#####

Number. When any sub-agendas have been gone over a certain number of times, the item is considered complete.

####`proactive`#####

Object. Currently to contain just one property, `filters` which is itself an object that can contain a `HAS` and `NOT` property. These correspond to which tags Beth should look for in the statements Beth could send out. For this `proactive` object, the filters are applied to `moveset` `forward` properties.
 
####`reactive`####

Object. As with `proactive` but applied to `ruleset` `respond` properties.

####`agendas`####

Array. See all the properties listed above. Sub-agendas are looped over according to the `iterate` property of `dountil` in their parents.

###`convert`###

Object. Words that we can consider safe to replace within a user's input. Includes contractions (e.g., replace `dont` with `don't`) and synonyms. It is important not to confuse this with the `synonyms` object however, which specifies a search range and does not alter the user's input. (Should be `standardisations` in future minor release.)

###`inflect`###

Object. The keys are words that should be changed for any part of the user's input that is used to form a response. The values are what they should be changed to. For example, if using `because I am hungry` from the user's input, Beth would use this object to change the `I` to `you` and the `am` to `are`.

###`lookfor`###

Object. Each property of the object has an array. Within the `ruleset` keys if Beth finds an `@` symbol directly followed by a word it will ensure that the pattern for that the key's object searches for all the words specified under the relevant array in the `variables` object.

For example, `@bye` in a ruleset key indicates the pattern should search for any words in the array that forms the value for that key. With `"bye": ["bye", "quit", "done", "goodbye", "exit"]` for instance, Beth will look for `bye` (because it is in the array), `quit`, `done`, `goodbye` and `exit` by replacing `@be` with the regular expression `\b(bye|quit|done|goodbye|exit)\b` in the initialised pattern.

###`moveset`###

Array. Contains objects for when Beth is being proactive. Each object has a `forward` property--for what Beth should say--and a `tagging` property, so that certain kinds of responses can be filtered out.

###`ruleset`###

Object. Contains objects, the key for each being a plain-string version of what should be searched for. Each of these objects contains the following properties (although those marked with an asterisk are optional):

 - `pattern`*
 - `comment`*
 - `results`
 - `ruleset` 
 
Details below. 
 
####`pattern`####

String. The string used to form the regular expression. This is initialised when Beth begins. Before initialisation it should be the same as the key of the parent object, to prevent confusion, but it is not required as the property will be overwritten at this stage anyway.

Wildcards take the form of asterisks `*`. A `*` surrounded by space, or at the beginning or end of the string with no words proximal to it, will match any number of words until it matches the proximal parts of the string. A `*` directly joined to a word, or in the middle of it, will match only letters adjoining to that word. For example, `"I am so *"` will match `"I am so tired."` whereas `"I am so*"` where the asterisk adjoins a word directly will match `"I am soaked"` (and, as it happens, `"I am so"` in the first sentence but not the `tired` bit). 

####`comment`####

String. A field for description, in case any notes need to be made about the pattern or its purpose.

####`ruleset`####

Object. Rulesets can themselves contain rulesets and Beth will parse these recursively. In theory this is done to organise patterns of greater complexity, but the more nested a pattern is the greater depth it has--and Beth will take this to be indication of the patterns specificity given the associated results a higher priority.

####`results`####

Array. Contains a series of objects, each of which can be considered a possible response to what a user has said. Results at a greater depth (i.e. which are nested within more rulesets, and therefore have higher `nesting`) are given higher priority and are therefore considered more appropriate than those at lower depths (i.e. with less `nesting`). If a result has been deferred, it will have higher priority than results of the same nesting with no deferral.

Each object in the array should consist of at least two properties (extra optional properties are asterisked):

 - `respond`
 - `tagging`
 - `ranking`*
 - `deferto`
 - `setflag`
 
Details below.

#####`respond`#####

String. The response Beth should give to a user's input. Parts of the user's input can be echoed back to them by using numerals surrounded in parentheses. The numeral corresponds to the nth wildcard in the search pattern.

Numerals contained within more than one pair of parentheses are to be deferred.

#####`tagging`#####

Array. A collection of words or phrases that Beth can use to filter results as it moves through agenda items. An agenda item might specify for example that results must have the `mirror` tag. Therefore, only these results will form part of the collection of possible responses that Beth can give.

#####`ranking`#####

Number. [Legacy from Eliza; not sure how this dovetails with other factors yet--does `ranking` trump results at greater depth, or just those of a same/similar depth?] A way of manually prioritising some results over others.

#####`deferto`#####

Array. Contains arrays. Each of these subarrays contains strings. The strings indicate directions for where the response should go.

This property generally indicates that a result should not be used straight away. Instead it should be processed, with parts of user's input being substituted where appropriate, and then deferred for a later part of the conversation. Each sub-array of strings indicates a place within the ruleset where the processed result should go, so that Beth knows when to pull up the result next.

The number of sub-arrays indicates the number of deferrals Beth should perform, meaning that a user may have to say a number of things before the deferred result comes up.

#####`setflag`#####

Array. Contains a list of which should be set to `true` in the session Beth is running. Every flag starts at `false` at the beginning of a session. So if a `results` object has `setflag` of "quit" then the quit flag will be created if it does not already exist and then set to `true`.
