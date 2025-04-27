"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var logger;
(function (logger) {
    class StyledTextComponent {
        constructor(styles, content) {
            this.styles = styles;
            this.content = logger.convertToString(content, this.styles.disableParsing ?? false);
        }
        apply(styles) {
            function deepMerge(target, source) {
                for (let [key, value] of Object.entries(source)) {
                    if (Array.isArray(value)) {
                        if (!(key in target)) {
                            target[key] = [];
                        }
                        deepMerge(target[key], value);
                    }
                    else if (typeof value == "object") {
                        if (!(key in target)) {
                            target[key] = {};
                        }
                        deepMerge(target[key], value);
                    }
                    else if (!(key in target)) {
                        target[key] = value;
                    }
                }
            }
            deepMerge(this.styles, styles);
        }
        toString() {
            let paddingLeftCharacters = "";
            let paddingRightCharacters = "";
            if (this.styles.padding) {
                let paddingStyles = this.styles.padding;
                let fillStyledText = new logger.StyledText(paddingStyles.fillCharacter ?? " ");
                let { padding, ...otherStyles } = this.styles;
                fillStyledText.apply(otherStyles);
                let remainingCharacters = (paddingStyles.totalWidth ?? 0) - logger.printableLength(this.content);
                if (remainingCharacters < 0)
                    remainingCharacters = 0;
                let alignment = paddingStyles.alignment || "left";
                if (alignment == "left") {
                    paddingRightCharacters = fillStyledText.toString().repeat(remainingCharacters);
                }
                else if (alignment == "right") {
                    paddingLeftCharacters = fillStyledText.toString().repeat(remainingCharacters);
                }
                else if (alignment == "center") {
                    paddingLeftCharacters = fillStyledText.toString().repeat(Math.floor(remainingCharacters / 2));
                    paddingRightCharacters = fillStyledText.toString().repeat(Math.ceil(remainingCharacters / 2));
                }
            }
            let startEscapeCodes = logger.findEscapeCodes(this.styles);
            let endEscapeCodes = (startEscapeCodes != "") ? "\x1b[0m" : "";
            return paddingLeftCharacters + startEscapeCodes + this.content + endEscapeCodes + paddingRightCharacters;
        }
    }
    logger.StyledTextComponent = StyledTextComponent;
    class StyledText {
        constructor(texts) {
            this.components = [];
            if (Object.prototype.toString.call(texts) == "[object Array]") {
                for (let text of texts) {
                    let styledText = new logger.StyledText(text);
                    for (let styledTextComponent of styledText.components) {
                        this.components.push(styledTextComponent);
                    }
                }
            }
            else if (Object.prototype.toString.call(texts) == "[object Object]") {
                if (texts.disableParsing) {
                    let { text, ...styles } = texts;
                    this.components.push(new logger.StyledTextComponent(styles, text));
                }
                else {
                    let { text, ...styles } = texts;
                    let styledText = new logger.StyledText(text);
                    styledText.apply(styles);
                    for (let styledTextComponent of styledText.components) {
                        this.components.push(styledTextComponent);
                    }
                }
            }
            else {
                this.components.push(new logger.StyledTextComponent({}, texts));
            }
        }
        apply(styles) {
            this.components.forEach((component) => {
                component.apply(styles);
            });
        }
        toString() {
            let result = "";
            for (let [styledTextComponentId, styledTextComponent] of Object.entries(this.components)) {
                result += styledTextComponent.toString();
                let space = true;
                if (parseInt(styledTextComponentId) == this.components.length - 1)
                    space = false;
                if (styledTextComponent.styles.space != undefined)
                    space = styledTextComponent.styles.space;
                if (space)
                    result += " ";
            }
            return result;
        }
    }
    logger.StyledText = StyledText;
    function convertToString(obj, disableParsing, depth) {
        function parseError(err) {
            let errArray = (err.stack ?? "").split("\n");
            errArray[0] = logger.colors.red.fg + "\x1b[1m" + err.name + "\x1b[0m: " + logger.colors.red.fg + err.message + "\x1b[0m";
            return errArray.join("\n");
        }
        if (!depth || depth == 3)
            depth = 0;
        let color = [logger.colors.blue.fg, logger.colors.magenta.fg, logger.colors.yellow.fg][depth];
        if (disableParsing) {
            let res;
            switch (Object.prototype.toString.call(obj)) {
                case "[object Boolean]":
                    return logger.colors.green.fg + "\x1b[1m" + obj.toString() + "\x1b[0m";
                case "[object Undefined]":
                    return logger.colors.green.fg + "\x1b[1m" + "undefined" + "\x1b[0m";
                case "[object Null]":
                    return logger.colors.green.fg + "\x1b[1m" + "null" + "\x1b[0m";
                case "[object Number]":
                    if (isNaN(obj) || !isFinite(obj))
                        return logger.colors.green.fg + "\x1b[1m" + obj.toString() + "\x1b[0m";
                    return logger.colors.cyan.fg + obj.toString() + "\x1b[0m";
                case "[object String]":
                    return logger.colors.gray.fg + JSON.stringify(obj) + "\x1b[0m";
                case "[object Array]":
                    res = "";
                    res += color + "\x1b[1m" + "[ " + "\x1b[0m";
                    res += obj.map((entry) => {
                        return logger.convertToString(entry, true, depth + 1);
                    }).join(", ");
                    res += color + "\x1b[1m" + " ]" + "\x1b[0m";
                    return res;
                case "[object Object]":
                    res = "";
                    res += color + "\x1b[1m" + "{ " + "\x1b[0m";
                    res += Object.entries(obj).map(([key, val]) => {
                        return key.toString() + ": " + logger.convertToString(val, true, depth + 1);
                    }).join(", ");
                    res += color + "\x1b[1m" + " }" + "\x1b[0m";
                    return res;
                default:
                    console.error("Unknown Object type:", obj);
                    return logger.colors.red.fg + "???" + "\x1b[0m";
            }
        }
        else {
            try {
                switch (Object.prototype.toString.call(obj)) {
                    case "[object Undefined]":
                        return "undefined";
                    case "[object Null]":
                        return "null";
                    case "[object Error]":
                        return parseError(obj);
                    default:
                        return obj.toString();
                }
            }
            catch {
                console.error("Unknown Object type:", obj);
                return logger.colors.red.fg + "???" + "\x1b[0m";
            }
        }
    }
    logger.convertToString = convertToString;
    let standardPrefix = "[TaskMinder]";
    function setStandardPrefix(text) {
        standardPrefix = text;
    }
    logger.setStandardPrefix = setStandardPrefix;
    function getStandardPrefix() {
        return standardPrefix;
    }
    logger.getStandardPrefix = getStandardPrefix;
    let consoleWidth = process.stdout.columns ?? 80;
    let consoleHeight = process.stdout.rows ?? 24;
    function getConsoleDimensions() {
        return { width: consoleWidth, height: consoleHeight };
    }
    logger.getConsoleDimensions = getConsoleDimensions;
    logger.colors = {
        black: { fg: "\x1b[30m", bg: "\x1b[40m" },
        red: { fg: "\x1b[31m", bg: "\x1b[41m" },
        green: { fg: "\x1b[32m", bg: "\x1b[42m" },
        yellow: { fg: "\x1b[33m", bg: "\x1b[43m" },
        blue: { fg: "\x1b[34m", bg: "\x1b[44m" },
        magenta: { fg: "\x1b[35m", bg: "\x1b[45m" },
        cyan: { fg: "\x1b[36m", bg: "\x1b[46m" },
        white: { fg: "\x1b[37m", bg: "\x1b[47m" },
        gray: { fg: "\x1b[90m", bg: "\x1b[100m" },
    };
    function printableLength(str) {
        const printableStr = str.replace(/\x1b\[[0-9;]*m/g, "");
        return printableStr.length;
    }
    logger.printableLength = printableLength;
    function printableSubstring(str, start, end) {
        let length = logger.printableLength(str);
        if (end == undefined)
            end = length;
        let charsFound = 0;
        let charsAdded = 0;
        let escapeSequenceFound = false;
        let res = "";
        for (const char of str) {
            if (escapeSequenceFound) {
                if (char == "m") {
                    escapeSequenceFound = false;
                }
                res += char;
            }
            else if (/\x1b/.test(char)) {
                escapeSequenceFound = true;
                res += char;
            }
            else {
                if (charsAdded >= end - start) {
                    break;
                }
                if (charsFound >= start) {
                    res += char;
                    charsAdded++;
                }
                charsFound++;
            }
        }
        res += "\x1b[0m";
        return res;
    }
    logger.printableSubstring = printableSubstring;
    function findEscapeCodes(styles) {
        let res = "";
        if (styles.bold) {
            res += "\x1b[1m";
        }
        if (styles.dim) {
            res += "\x1b[2m";
        }
        if (styles.italic) {
            res += "\x1b[3m";
        }
        if (styles.underline) {
            res += "\x1b[4m";
        }
        if (styles.stroked) {
            res += "\x1b[9m";
        }
        if (styles.color) {
            res += logger.colors[styles.color]?.fg;
        }
        if (styles.background) {
            res += logger.colors[styles.background]?.bg;
        }
        return res;
    }
    logger.findEscapeCodes = findEscapeCodes;
    function write(...data) {
        let styledText = new logger.StyledText(data);
        process.stdout.write(styledText.toString());
        process.stdout.write("\n");
    }
    logger.write = write;
    function writeError(...data) {
        let styledTextsArray = new logger.StyledText(data);
        process.stderr.write(styledTextsArray.toString());
        process.stderr.write("\n");
    }
    logger.writeError = writeError;
    function toString(...data) {
        let styledText = new logger.StyledText(data);
        return styledText.toString();
    }
    logger.toString = toString;
    function prefixedWrite(level, ...texts) {
        const prefixColors = {
            info: { color: "cyan" },
            success: { color: "green" },
            warn: { color: "cyan" },
            error: { color: "red" },
            highlightError: { background: "red" },
            highlight: { background: "blue" },
        };
        let { color, background } = prefixColors[level];
        logger.write({ color, background, text: logger.getStandardPrefix() }, ...texts);
    }
    logger.prefixedWrite = prefixedWrite;
    function info(...texts) {
        prefixedWrite("info", ...texts);
    }
    logger.info = info;
    function success(...texts) {
        prefixedWrite("success", ...texts);
    }
    logger.success = success;
    function warn(...texts) {
        prefixedWrite("warn", ...texts);
    }
    logger.warn = warn;
    function error(...texts) {
        prefixedWrite("error", ...texts);
    }
    logger.error = error;
    function highlightError(...texts) {
        prefixedWrite("highlightError", ...texts);
    }
    logger.highlightError = highlightError;
    function highlight(...texts) {
        prefixedWrite("highlight", ...texts);
    }
    logger.highlight = highlight;
    process.stdout.on("resize", () => {
        consoleWidth = process.stdout.columns ?? 80;
        consoleHeight = process.stdout.rows ?? 24;
    });
})(logger || (logger = {}));
exports.default = logger;
