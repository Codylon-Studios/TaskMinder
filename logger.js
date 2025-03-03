const logger = {
    StyledTextComponent: class {
        constructor(styles, content) {
            this.styles = styles;
            this.content = logger.convertToString(content);
        }
        apply(styles) {
            function deepMerge(target, source, stack) {
                for (let [key, value] of Object.entries(source)) {
                    let nextStack = (stack != "") ? (`${stack}.${key}`) : key
                    if (! logger.notInheritableStyles.includes(nextStack)) {
                        if (typeof value == "object") {
                            if (!(key in target)) {
                                target[key] = {}
                            }
                            deepMerge(target[key], value, nextStack)
                        }
                        else if (! (key in target)) {
                            target[key] = value;
                        }
                    }
                }
            }
            deepMerge(this.styles, styles, "");
        }
        toString() {
            let startEscapeCodes = logger.findEscapeCodes(this.styles);
            let endEscapeCodes = "\x1b[0m";
            return startEscapeCodes +
                this.content +
                endEscapeCodes;
        }
    },
    StyledText: class {
        constructor(styles, ...texts) {
            this.components = []
            for (let text of texts) {
                if (text instanceof logger.StyledTextComponent) {
                    text.apply(styles)
                    this.components.push({
                        type: "normal", // normal or prefix or padding
                        styledTextComponent: text
                    })
                }
                else if (text instanceof logger.StyledText) {
                    text.apply(styles)
                    for (let component of text.components) {
                        this.components.push({
                            type: component.type,
                            styledTextComponent: component.styledTextComponent
                        })
                    }
                }
                else {
                    this.components.push({
                        type: "normal",
                        styledTextComponent: new logger.StyledTextComponent(styles, text)
                    })
                }
            }
            if (styles.prefix) {
                this.components.splice(0, 0, {
                    type: "prefix",
                    styledTextComponent: new logger.StyledTextComponent(styles.prefix, styles.prefix.text || logger.standardPrefix)
                })
            }
        }
        apply(styles) {
            this.components.forEach((component) => {
                component.styledTextComponent.apply(styles);
            })
        }
        addPaddingTextComponents() {
            let newComponents = []
            for (let component of this.components) {
                let paddingStyles = component.styledTextComponent.styles.padding
                if (paddingStyles) {
                    let paddingLeftCharacters = ""
                    let paddingRightCharacters = ""
                    let remainingCharacters = (paddingStyles.totalWidth || logger.getPrintableLength(component.styledTextComponent.content)) -
                                              logger.getPrintableLength(component.styledTextComponent.content)
                    if (remainingCharacters < 0) remainingCharacters = 0;
                    let alignment = paddingStyles.alignment || "left";
                    let fillCharacter = paddingStyles.fillCharacter || " ";
                    if (alignment == "left") {
                        paddingRightCharacters = fillCharacter.repeat(remainingCharacters)
                    }
                    else if (alignment == "right") {
                        paddingLeftCharacters = fillCharacter.repeat(remainingCharacters)
                    }
                    else if (alignment == "center") {
                        paddingLeftCharacters = fillCharacter.repeat(Math.floor(remainingCharacters / 2))
                        paddingRightCharacters = fillCharacter.repeat(Math.ceil(remainingCharacters / 2))
                    }
                    newComponents.push({
                        type: "padding",
                        styledTextComponent: new logger.StyledTextComponent(component.styledTextComponent.styles, paddingLeftCharacters),
                        position: "left"
                    })
                    newComponents.push(component)
                    newComponents.push({
                        type: "padding",
                        styledTextComponent: new logger.StyledTextComponent(component.styledTextComponent.styles, paddingRightCharacters),
                        position: "right"
                    })
                }
                else {
                    newComponents.push(component)
                }
                this.components = newComponents;
            }
        }
        toString() {
            this.addPaddingTextComponents();
            
            let result = ""
            let previousComponent = {type: null};
            for (let currentComponent of this.components) {
                result += this.getComponentSpacing(previousComponent, currentComponent)
                result += currentComponent.styledTextComponent
                previousComponent = currentComponent;
            }
            return result;
        }
        getComponentSpacing(previousComponent, currentComponent) {
            let previousType = previousComponent.type;
            let currentType = currentComponent.type;
            if (previousType == null) {
                return "";
            }
            else if (["prefix", "normal"].includes(previousType)) {
                if (["prefix", "normal"].includes(currentType)) {
                    return " ";
                }
                else if ([""].includes(currentType)) {
                    return "";
                }
                else if (currentType == "padding") {
                    if (currentComponent.position == "right") {
                        return "";
                    }
                    else {
                        return " ";
                    }
                }
                else {
                    return "?";
                }
            }
            else if (previousType == "padding") {
                if (["prefix", "normal"].includes(currentType)) {
                    if (previousComponent.position == "left") {
                        return "";
                    }
                    else {
                        return " ";
                    }
                }
                else if ([""].includes(currentType)) {
                    return "";
                }
                else if (currentType == "padding") {
                    return " ";
                }
                else {
                    return "?";
                }
            }
            else {
                return "?";
            }
        }
    },
    convertToString(obj) {
        if (typeof obj == "string") {
            return obj.toString();
        }
        else if (typeof obj == "number") {
            return obj.toString()
        }
        else {
            console.log("Unknown Object type: ", obj)
            return "???"
        }
    },

    standardPrefix: "[TaskMinder]",
    consoleWidth: process.stdout.columns || 80,
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
    getPrintableLength(str) {
        const printableStr = str.replace(/\x1b\[[0-9;]*m/g, "");
        return printableStr.length;
    },
    findEscapeCodes(styles) {
        let res = ""
        if (styles.bold) {
            res += "\x1b[1m";
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
    notInheritableStyles: [
        "prefix"
    ],
    write(styles, ...texts) {
        let styledTextsArray = new this.StyledText(styles, ...texts)
        process.stdout.write(styledTextsArray.toString())
        process.stdout.write("\n");
    },
    parse(styles, text) {
        return new this.StyledText(styles, text)
    },
    info(...texts) {
        this.write({ prefix: { color: "cyan" } }, ...texts)
    },
    success(...texts) {
        this.write({ prefix: { color: "green" } }, ...texts)
    },
    warn(...texts) {
        this.write({ prefix: { color: "yellow" } }, ...texts)
    },
    error(...texts) {
        this.write({ prefix: { color: "red" } }, ...texts)
    },
    highlightError(...texts) {
        this.write({ prefix: { background: "red" } }, ...texts)
    },
    highlight(...texts) {
        this.write({ prefix: { background: "blue", bold: true } }, ...texts)
    }
}

module.exports = logger;
