/*jslint browser: true, white: true, undef: true, nomen: true, eqeqeq: true, plusplus: true, bitwise: true, newcap: true, immed: true, indent: 4, onevar: false */
/*global window, _ */

/**
 * This class provides functions for textmerging. Most typically you can insert two texts
 * and an original text and the TextMerger-object returns the merged text with all
 * inserts and replacements.
 *
 *     $merged_text = TextMerger.get().merge(original, my_altered_text, their_altered_text);
 *
 * Easy as that.
 *
 * Usually TextMerger focusses on returning a text. But what happens if there
 * is any conflict? For example could both texts have replaced the same part
 * of the original. In this case TextMerger examines the replacements and takes
 * only that replacement which is larger. For example
 *
 *     TextMerger.get().merge("Hi there!", "Hi Master!", "Hello Dark Lord!")
 *
 * would return the string "Hello Dark Lord!", as the replacement "ello Dark Lord"
 * from the second text is larger as "Master", which would be the replacement of
 * the first text.
 *
 * But you can also tell TextMerger to throw an exception on a conflict by calling
 *
 *     TextMerger.get({exceptionOnConflict: true}).merge(original, my_altered_text, their_altered_text);
 *
 * That is also why TextMerger is an object and not a function. #get calls a contrsuctor and returns
 * and object of TextMerger-class. With the parameter of the constructor you alter the behaviour
 * of TextMerger.
 */

//Namespace of Textmerger
Textmerger = function (params) {
    this.conflictBehaviour = params && typeof params.conflictBehaviour !== "undefined"
        ? params.conflictBehaviour
        : "select_larger_difference";
    this.levenshteinDelimiter = params && typeof params['levenshteinDelimiter'] !== "undefined"
        ? params['levenshteinDelimiter']
        : ["\n", " ", ""];
};

/**
 * Constructor for object of type TextMerger.Exception. This kind
 * of exception is used when TextMerger has some conflicts in merging
 * and is configured to throw exceptions on conflicts.
 * @param message : string that indicates what caused this exception
 * @param data : a plain object
 * @constructor
 */
Textmerger.Exception = function (message, data) {
    this.message = message;
    this.data    = data || {};
};

Textmerger.Replacement = function (start, end, text, origin) {
    this.start = start;
    this.end = end;
    this.text = text;
    this.origin = origin;
};

Textmerger.Replacement.prototype.changeIndexesBy = function (add) {
    this.start += add;
    this.end += add;
};

Textmerger.Replacement.prototype.applyTo = function (text) {
    return text.substr(0, this.start) + this.text + text.substr(this.end);
};

Textmerger.Replacement.prototype.isConflictingWith = function (replacement) {
    return (this.start < replacement.end && this.start > replacement.start)
        || (this.end < replacement.end && this.end > replacement.start)
        || (this.start < replacement.end && this.end > replacement.end)
        || (this.start < replacement.start && this.end > replacement.end)
        || (this.start === replacement.start && (this.end === replacement.end) && (this.end - this.start > 0));
};

Textmerger.Replacement.prototype.breakApart = function (delimiter, original) {
    var original_snippet = original.substr(this.start, this.end - this.start + 1);
    if ((this.start === this.end && this.text === "") || (original_snippet === this.text)) {
        return [this];
    }

    var parts = this.text.split(delimiter);
    var original_parts = original_snippet.split(delimiter);
    if (parts.length === 1 || original_parts.length === 1) {
        return [this];
    }

    //levensthein-algorithm (maybe implement hirschberg later)
    var backtrace = Textmerger.Replacement.getLevenshteinBacktrace(original_parts, parts);

    if (backtrace.indexOf("=") === -1) {
        //Merging can be interesting, but still pointless. So just:
        return [this];
    }

    //use backtrace to break this replacement into multiple smaller replacements:

    var replacements = [];
    var replacement = null;

    var originaltext_index = this.start;
    var originalpartsindex = 0;

    var replacetext_index = 0;
    var replacetext_start = 0;
    var replacetext_end = 0;


    for (var key in backtrace) {
        var operation = backtrace[key];
        if (key > 0) {
            replacetext_end += delimiter.length;
            originaltext_index += delimiter.length;
        }
        if (operation === "=") {
            if (replacement !== null) {
                replacement.end = originaltext_index - delimiter.length;
                replacement.text = this.text.substr(
                    replacetext_start,
                    replacetext_end - delimiter.length - replacetext_start
                );
                replacements.push(replacement);
                replacement = null;
            }
        } else {
            if (replacement === null) {
                replacement = new Textmerger.Replacement();
                replacement.origin = this.origin;
                replacement.start = originaltext_index;
                replacetext_start = replacetext_end;
            }
        }
        switch (operation) {
            case "=":
                originaltext_index += original_parts[originalpartsindex].length;
                originalpartsindex++;
                break;
            case "r":
                originaltext_index += original_parts[originalpartsindex].length;
                originalpartsindex++;
                break;
            case "i":
                break;
            case "d":
                originaltext_index += original_parts[originalpartsindex].length;
                originalpartsindex++;
                break;
        }

        switch (operation) {
            case "=":
                replacetext_end += parts[replacetext_index].length;
                replacetext_index++;
                break;
            case "r":
                replacetext_end += parts[replacetext_index].length;
                replacetext_index++;
                break;
            case "i":
                replacetext_end += parts[replacetext_index].length;
                replacetext_index++;
                break;
            case "d":
                break;
        }
    }
    if (replacement !== null) {
        replacement.end = originaltext_index;
        replacement.text = this.text.substr(
            replacetext_start,
            replacetext_end - delimiter.length - replacetext_start + 1 //TODO: why +1 ??
        );
        replacements.push(replacement);
    }
    return replacements;
};

Textmerger.Replacement.getLevenshteinBacktrace = function (original, newtext) {
    //create levenshtein-matrix:
    var matrix = [];
    for (var k = 0; k <= original.length; k++) {
        matrix.push([]);
        for (var i = 0; i <= newtext.length; i++) {
            matrix[k].push(-1);
        }
    }
    matrix[0][0] = 0;

    //   ? m i n e
    // ? 0 1 2 3 4
    // o 1 .
    // r 2   .
    // i 3     .
    // g 4       .
    // i 5       .
    // n 6       .
    // a 7       .
    // l 8       .

    for (var k = 0; k <= original.length; k++) {
        for (var i = 0; i <= newtext.length; i++) {
            if (k + i > 0) {
                matrix[k][i] = Math.min(
                    (k >= 1) && (i >= 1) && (newtext[i - 1] === original[k - 1])
                        ? matrix[k - 1][i - 1] : 100000,                                               //identity
                    (k >= 1) && (i >= 1) ? matrix[k - 1][i - 1] + 1 : 100000,   //replace
                    i >= 1 ? matrix[k][i - 1] + 1 : 100000,           //insert
                    k >= 1 ? matrix[k - 1][i] + 1 : 100000            //delete
                );
            }
        }
    }

    //now create the backtrace to the matrix:
    k = original.length;
    i = newtext.length;
    var backtrace = [];
    while (k > 0 || i > 0) {
        if (k > 0 && (matrix[k - 1][i] + 1 == matrix[k][i])) {
            backtrace.unshift("d");
            k--;
        }
        if (i > 0 && (matrix[k][i - 1] + 1 == matrix[k][i])) {
            backtrace.unshift("i");
            i--;
        }
        if (i > 0 && k > 0 && (matrix[k - 1][i - 1] + 1 == matrix[k][i])) {
            backtrace.unshift("r");
            i--;
            k--;
        }
        if (i > 0 && k > 0 && (matrix[k - 1][i - 1] == matrix[k][i])) {
            backtrace.unshift("=");
            i--;
            k--;
        }
    }
    return backtrace;
};

Textmerger.ReplacementGroup = function () {
    this.replacements = [];
};
Textmerger.ReplacementGroup.prototype.breakApart = function (delimiter, original) {
    var replacements = Array();
    var repl = Array();
    for (var i in this.replacements) {
        repl = this.replacements[i].breakApart(delimiter, original);
        for (var j in repl) {
            replacements.push(repl[j]);
        }
    }
    this.replacements = replacements;
    this.sort();
};

Textmerger.ReplacementGroup.prototype.haveConflicts = function () {
    for (var index = 0; index < this.replacements.length; index++) {
        if (index == this.replacements.length - 1) {
            break;
        }
        if (this.replacements[index].isConflictingWith(this.replacements[index + 1])) {
            return true;
        }
    }
    return false;
};

Textmerger.ReplacementGroup.prototype.resolveConflicts = function (conflictBehaviour) {
    for (var index = 0; index < this.replacements.length; index++) {
        if (index === this.replacements.length - 1) {
            break;
        }
        if (this.replacements[index].isConflictingWith(this.replacements[index + 1])) {
            switch (conflictBehaviour) {
                case "throw_exception":
                    throw new Textmerger.Exception("Texts have a conflict.", {
                        "original": original,
                        "text1": text1,
                        "text2": text2,
                        "replacement1": this.replacements[index],
                        "replacement2": this.replacements[index + 1]
                    });
                    break;
                case "select_text1":
                    if (this.replacements[index].origin === "text1") {
                        //delete this.replacements[index];
                        this.replacements = this.replacements.splice(index, 1);
                    } else {
                        //delete this.replacements[index + 1];
                        this.replacements = this.replacements.splice(index + 1, 1);
                    }
                    break;
                case "select_text2":
                    if (this.replacements[index].origin === "text2") {
                        //delete this.replacements[index];
                        this.replacements = this.replacements.splice(index, 1);
                    } else {
                        //delete this.replacements[index + 1];
                        this.replacements = this.replacements.splice(index + 1, 1);
                    }
                    break;
                case "select_larger_difference":
                default:
                    if (this.replacements[index].end - this.replacements[index].start > this.replacements[index + 1].end - this.replacements[index + 1].start) {
                        //delete this.replacements[index + 1];
                        this.replacements = this.replacements.splice(index + 1, 1);
                    } else {
                        //delete this.replacements[index];
                        this.replacements = this.replacements.splice(index, 1);
                    }
                    break;
            }
            this.resolveConflicts(conflictBehaviour);
            return;
        }
    }
};

Textmerger.ReplacementGroup.prototype.applyTo = function (text) {
    var index_alteration = 0;
    for (var index = 0; index < this.replacements.length; index++) {
        this.replacements[index].changeIndexesBy(index_alteration);
        text = this.replacements[index].applyTo(text);
        this.replacements[index].changeIndexesBy(- index_alteration);
        var alteration = this.replacements[index].text.length - (this.replacements[index].end - this.replacements[index].start);
        index_alteration += alteration;
    }
    return text;
};

Textmerger.ReplacementGroup.prototype.sort = function () {
    this.replacements.sort(function (a, b) {
        return a.start > b.start ? 1 : -1;
    });
};



Textmerger.get = function (params) {
    return new Textmerger(params);
};

Textmerger.hash = function (text) {
    var hash = 0;
    if (this.length == 0) return hash;
    for (i = 0; i < this.length; i++) {
        char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
};

Textmerger.prototype.merge = function (original, text1, text2) {
    replacements = this.getReplacements(original, text1, text2);
    return replacements.applyTo(original);
}

Textmerger.prototype.calculateCursor = function (cursor_position, original, text1, text2) {
    var replacements = this.getReplacements(original, text1, text2);

    var index_alteration = 0;
    for (var index in replacements) {
        replacements[index].changeIndexesBy(index_alteration);
        if (replacements[index].start <= cursor_position) {
            cursor_position += replacements[index].text.length - replacements[index].end + replacements[index].start;
            index_alteration += replacements[index].text.length - replacements[index].end + replacements[index].start;
        } else {
            break;
        }
    }
    return cursor_position;
};

Textmerger.prototype.getReplacements = function(original, text1, text2) {
    var hash_id = Textmerger.hash(original + "___".text1 + "___" + text2);
    if (Textmerger.replacement_hash && typeof Textmerger.replacement_hash[hash_id] !== "undefined") {
        //return Textmerger.replacement_hash[hash_id];
    }
    //Make texts smaller
    for(var offset = 0; offset < original.length; offset++) {
        if ((original[offset] !== text1[offset]) || (original[offset] !== text2[offset])) {
            if (offset > 0) {
                //offset--;
            }
            break;
        }
    }

    for(var backoffset = 0; backoffset <= original.length; backoffset++) {
        if ((original[original.length - backoffset - 1] !== text1[text1.length - backoffset - 1])
            || (original[original.length - backoffset - 1] !== text2[text2.length - backoffset - 1])
            || (original.length - backoffset <= offset)
            || (text1.length - backoffset <= offset)
            || (text2.length - backoffset <= offset)) {
            break;
        }
    }
    var original_trimmed = original.substr(offset, original.length - offset - backoffset);
    var text1_trimmed = text1.substr(offset, text1.length - offset - backoffset);
    var text2_trimmed = text2.substr(offset, text2.length - offset - backoffset);

    //collect the two major replacements:
    var replacements = new Textmerger.ReplacementGroup();
    replacements.replacements[0] = this.getSimpleReplacement(original_trimmed, text1_trimmed, "text1");
    replacements.replacements[1] = this.getSimpleReplacement(original_trimmed, text2_trimmed, "text2");

    if (!replacements.haveConflicts()) {
        for (var i in replacements.replacements) {
            replacements.replacements[i].start += offset;
            replacements.replacements[i].end += offset;
        }
        if (!Textmerger.replacement_hash) {
            Textmerger.replacement_hash = {};
        }
        replacements.sort();
        Textmerger.replacement_hash[hash_id] = replacements;
        return replacements;
    }

    //Now if this didn't work we try it with levenshtein. The old simple replacements won't help us, wo we create
    //a new pair of replacements:
    replacements.replacements[0] = new Textmerger.Replacement(0, original_trimmed.length - 1, text1_trimmed, "text1");
    replacements.replacements[1] = new Textmerger.Replacement(0, original_trimmed.length - 1, text2_trimmed, "text2");

    for (i in this.levenshteinDelimiter) {
        if (replacements.haveConflicts() !== false) {
            replacements.breakApart(this.levenshteinDelimiter[i], original_trimmed);
        } else {
            break;
        }
    }

    var have_conflicts = replacements.haveConflicts();
    if (have_conflicts !== false) {
        replacements.resolveConflicts(this.conflictBehaviour);
    }

    for (i in replacements.replacements) {
        replacements.replacements[i].start += offset;
        replacements.replacements[i].end += offset;
    }

    if (!Textmerger.replacement_hash) {
        Textmerger.replacement_hash = {};
    }
    replacements.sort();
    Textmerger.replacement_hash[hash_id] = replacements;
    return replacements;
};

Textmerger.prototype.getSimpleReplacement = function (original, text, origin) {
    replacement = new Textmerger.Replacement(0, 0, "", origin);
    replacement.origin = origin;
    var text_start = 0;
    var text_end = text.length;
    for(var i = 0; i <= Math.max(original.length, text.length); i++) {
        if (original[i] !== text[i]) {
            replacement.start = i;
            text_start = i;
            break;
        } else if (i === original.length - 1) {
            replacement.start = original.length;
            text_start = original.length;
            break;
        }
    }

    for(i = 0; i < Math.max(original.length, text.length); i++) {
        if ((original[original.length - 1 - i] !== text[text.length - 1 - i])
            || (original.length - i === replacement.start)) {
            replacement.end = original.length - i;
            text_end = text.length - i;
            break;
        }
    }

    if (text_end - text_start < 0) {
        replacement.end++;
        length = 0;
    } else {
        length = text_end - text_start;
    }
    replacement.text = text.substr(text_start, length);
    return replacement;
};

