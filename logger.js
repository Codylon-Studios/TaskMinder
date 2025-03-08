const logger = {
    StyledTextComponent: class {
        constructor(styles, content) {
            this.styles = styles;
            this.content = logger.convertToString(content, styles.disableParsing);
        }
        apply(styles) {
            function deepMerge(target, source) {
                for (let [key, value] of Object.entries(source)) {
                    //let nextStack = (stack != "") ? (`${stack}.${key}`) : key
                    if (Array.isArray(value)) {
                        if (!(key in target)) {
                            target[key] = []
                        }
                        deepMerge(target[key], value)
                    }
                    else if (typeof value == "object") {
                        if (!(key in target)) {
                            target[key] = {}
                        }
                        deepMerge(target[key], value)
                    }
                    else if (! (key in target)) {
                        target[key] = value;
                    }
                }
            }
            deepMerge(this.styles, styles);
        }
        toString() {
            let paddingLeftCharacters = ""
            let paddingRightCharacters = ""

            if (this.styles.padding) {
                let paddingStyles = this.styles.padding

                let fillStyledText = new logger.StyledText(paddingStyles.fillCharacter || " ")
                let { padding, ...otherStyles } = this.styles
                fillStyledText.apply(otherStyles)

                let remainingCharacters = (paddingStyles.totalWidth || 0) - logger.printableLength(this.content)
                if (remainingCharacters < 0) remainingCharacters = 0;

                let alignment = paddingStyles.alignment || "left";

                if (alignment == "left") {
                    paddingRightCharacters = fillStyledText.toString().repeat(remainingCharacters)
                }
                else if (alignment == "right") {
                    paddingLeftCharacters = fillStyledText.toString().repeat(remainingCharacters)
                }
                else if (alignment == "center") {
                    paddingLeftCharacters = fillStyledText.toString().repeat(Math.floor(remainingCharacters / 2))
                    paddingRightCharacters = fillStyledText.toString().repeat(Math.ceil(remainingCharacters / 2))
                }
            }

            let startEscapeCodes = logger.findEscapeCodes(this.styles);
            let endEscapeCodes = (startEscapeCodes != "") ? "\x1b[0m" : "";
            return paddingLeftCharacters + startEscapeCodes + this.content + endEscapeCodes + paddingRightCharacters;
        }
    },
    StyledText: class {
        constructor(texts) {
            this.components = []
            if (Array.isArray(texts)) {
                for (let text of texts) {
                    let styledText = new logger.StyledText(text)
                    for (let styledTextComponent of styledText.components) {
                        this.components.push(styledTextComponent)
                    }
                }
            }
            else if (typeof texts == "object") {
                if (texts.disableParsing) {
                    let { text, ...styles } = texts
                    this.components.push(new logger.StyledTextComponent(styles, text))
                }
                else {
                    let { text, ...styles } = texts
                    let styledText = new logger.StyledText(text)
                    styledText.apply(styles)
                    for (let styledTextComponent of styledText.components) {
                        this.components.push(styledTextComponent)
                    }
                }
            }
            else {
                this.components.push(new logger.StyledTextComponent({}, texts))
            }
        }
        apply(styles) {
            this.components.forEach((component) => {
                component.apply(styles);
            })
        }
        toString() {
            let result = ""
            for (let [ styledTextComponentId, styledTextComponent ] of Object.entries(this.components)) {
                result += styledTextComponent.toString()
                let space = true
                if (styledTextComponentId == this.components.length - 1) space = false
                if (styledTextComponent.styles.space != undefined) space = styledTextComponent.styles.space
                if (space) result += " "
            }
            return result;
        }
    },
    convertToString(obj, disableParsing, depth) {
        if (! depth || depth == 3) depth = 0
        let color = [logger.colors.blue.fg, logger.colors.magenta.fg, logger.colors.yellow.fg][depth]

        if (typeof obj == "string") {
            return logger.colors.gray.fg + JSON.stringify(obj) + "\x1b[0m";
        }
        else if (typeof obj == "number") {
            if (isNaN(obj) || ! isFinite(obj)) return logger.colors.green.fg + "\x1b[1m" + obj.toString() + "\x1b[0m"
            return logger.colors.cyan.fg + obj.toString() + "\x1b[0m"
        }
        else if (typeof obj == "boolean") {
            return logger.colors.green.fg + "\x1b[1m" + obj.toString() + "\x1b[0m"
        }
        else if (typeof obj == "undefined") {
            return logger.colors.green.fg + "\x1b[1m" + "undefined" + "\x1b[0m"
        }
        else if (obj == null) {
            return logger.colors.green.fg + "\x1b[1m" + "null" + "\x1b[0m"
        }

        if (disableParsing) {
            if (Array.isArray(obj)) {
                let res = ""
                res += color + "\x1b[1m"  + "[ " + "\x1b[0m"
                res += obj.map((entry) => {
                    return this.convertToString(entry, true, depth + 1)
                }).join(", ")
                res += color + "\x1b[1m"  + " ]" + "\x1b[0m"
                return res
            }
            else if (typeof obj == "object"){
                let res = ""
                res += color + "\x1b[1m"  + "{ " + "\x1b[0m"
                res += Object.entries(obj).map(([key, val]) => {
                    return key.toString() + ": " + this.convertToString(val, true, depth + 1)
                }).join(", ")
                res += color + "\x1b[1m"  + " }" + "\x1b[0m"
                return res
            }
            else {
                console.error("Unknown Object type:", obj)
                return logger.colors.red.fg + "???" + "\x1b[0m"
            }
        }
        else {
            try {
                return obj.toString()
            }
            catch {
                console.error("Unknown Object type:", obj)
                return logger.colors.red.fg + "???" + "\x1b[0m"
            }
        }
    },

    standardPrefix: "[TaskMinder]",
    consoleWidth: process.stdout.columns || 80,
    consoleHeight: process.stdout.rows || 24,
    colors: {
        black: { fg: "\x1b[30m", bg: "\x1b[40m" },
        red: { fg: "\x1b[31m", bg: "\x1b[41m" },
        green: { fg: "\x1b[32m", bg: "\x1b[42m" },
        yellow: { fg: "\x1b[33m", bg: "\x1b[43m" },
        blue: { fg: "\x1b[34m", bg: "\x1b[44m" },
        magenta: {fg: "\x1b[35m", bg: "\x1b[45m" },
        cyan: { fg: "\x1b[36m", bg: "\x1b[46m" },
        white: { fg: "\x1b[37m", bg: "\x1b[47m" },
        gray: { fg: "\x1b[90m", bg: "\x1b[100m" },
    },
    printableLength(str) {
        const printableStr = str.replace(/\x1b\[[0-9;]*m/g, "");
        return printableStr.length;
    },
    printableSubstring(str, start, end) {
        let length = this.printableLength(str)
        if (end == undefined) end = length
        let charsFound = 0;
        let charsAdded = 0;
        let escapeSequenceFound = false
        let res = ""
        for (const char of str) {
            if (escapeSequenceFound) {
                if (char == "m") {
                    escapeSequenceFound = false
                }
                res += char
            }
            else  if (/\x1b/.test(char)) {
                escapeSequenceFound = true
                res += char
            }
            else {
                if (charsAdded >= end - start) {
                    break
                }
                if (charsFound >= start) {
                    res += char
                    charsAdded++
                }
                charsFound++
            }
        }
        res += "\x1b[0m"
        return res
    },
    findEscapeCodes(styles) {
        let res = ""
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
            res += this.colors[styles.color].fg || "";
        }
        if (styles.background) {
            res += this.colors[styles.background].bg || "";
        }
        return res
    },
    write(...data) {
        let styledText = new this.StyledText(data)
        process.stdout.write(styledText.toString())
        process.stdout.write("\n");
    },
    writeError(...data) {
        let styledTextsArray = new this.StyledText(data)
        process.stderr.write(styledTextsArray.toString())
        process.stderr.write("\n");
    },
    toString(...data) {
        let styledText = new this.StyledText(data)
        return styledText.toString()
    },
    info(...texts) {
        this.write({color: "cyan", text: this.standardPrefix}, ...texts)
    },
    success(...texts) {
        this.write({color: "green", text: this.standardPrefix}, ...texts)
    },
    warn(...texts) {
        this.write({color: "yellow", text: this.standardPrefix}, ...texts)
    },
    error(...texts) {
        this.write({color: "red", text: this.standardPrefix}, ...texts)
    },
    highlightError(...texts) {
        this.write({background: "red", text: this.standardPrefix}, ...texts)
    },
    highlight(...texts) {
        this.write({background: "blue", text: this.standardPrefix}, ...texts)
    },
    setStandardPrefix(text) {
        this.standardPrefix = text;
    }
}

module.exports = logger;

process.stdout.on("resize", () => {
    logger.consoleWidth = process.stdout.columns || 80
    logger.consoleHeight = process.stdout.rows || 24
})

logger.write({disableParsing: true, text: {true: true, b: null,  a: "124", geheim: [1, NaN, 7, {"HJEI": 12}]}})
