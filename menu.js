const readline = require("readline");
const { spawn } = require("child_process");
const kill = require('tree-kill');
const logger = require("./logger");

function getOptionTexts() {
    topTexts = []

    topTexts.push({padding: {totalWidth: logger.consoleWidth, alignment: "center"}, bold: true, color: "cyan", text: "Welcome to menu.js !"})
    topTexts.push({padding: {totalWidth: logger.consoleWidth, alignment: "center"}, bold: true, color: "cyan", text: `Command Selection`, dim: true})

    mainTexts = []

    mainTexts.push([{color: "cyan", text: "[menu.js]"}, "Select an option and press", {bold: true, space: false, text: "Enter"}, "!"])
    mainTexts.push("")

    options.forEach((option, index) => {
        let name = [option.name]
        if (option.state == "running") name.push({text: "[Running]", bold: true})
        if (index == selectedOption) {
            mainTexts.push({color: "cyan", text: ["⮞", name]})
        } else {
            mainTexts.push([" ", name])
        }
    });

    bottomTexts = []

    bottomTexts = [[
        {text: "up", background: "white", color: "black"}, "/", {text: "down", background: "white", color: "black", space: false}, ": select an option",
        "   ",
        {text: "Enter", background: "white", color: "black", space: false}, ": execute the command for the selected option",
        "   ",
        {text: "i", background: "white", color: "black", space: false}, ": more information about an option",
    ]]
}

function getInformationTexts() {
    topTexts = []

    topTexts.push({padding: {totalWidth: logger.consoleWidth, alignment: "center"}, bold: true, color: "cyan", text: "Welcome to menu.js !"})
    topTexts.push({padding: {totalWidth: logger.consoleWidth, alignment: "center"}, bold: true, color: "cyan", text: "Command Information", dim: true})

    mainTexts = []

    mainTexts.push([{color: "cyan", text: "[menu.js]"}, "Information on", {color: "cyan", text: options[selectedOption].name, space: false}, ":"],
        ["   ", options[selectedOption].information])

    if (options[selectedOption].commands.length == 1) {
        mainTexts.push([{color: "cyan", text: "[menu.js]"}, "Command executed for", {color: "cyan", text: options[selectedOption].name, space: false}, ":"],
            ["   ", options[selectedOption].commands[0]])
    }
    else {
        mainTexts.push([{color: "cyan", text: "[menu.js]"}, "Commands executed for", {color: "cyan", text: options[selectedOption].name, space: false}, ":"],
            ...options[selectedOption].commands.map((c) => {return ["   ", c]}))
    }

    bottomTexts = [[
        {text: "Escape", background: "white", color: "black"}, "/", {text: "left", background: "white", color: "black", space: false}, ": back to selection",
        "   ",
        {text: "Enter", background: "white", color: "black", space: false}, ": execute the command for the selected option",
    ]]
}

function getCommandTexts() {
    topTexts = []

    topTexts.push({padding: {totalWidth: logger.consoleWidth, alignment: "center"}, bold: true, color: "cyan", text: "Welcome to menu.js !"})
    
    let subtitle = " ".repeat(loadingDotsNumber) + "Command Execution" +  ".".repeat(loadingDotsNumber) + "   "
    topTexts.push({padding: {totalWidth: logger.consoleWidth, alignment: "center"}, bold: true, color: "cyan", text: subtitle, dim: true})

    mainTexts = options[selectedOption].logs

    bottomTexts = [[
        {text: "Escape", background: "white", color: "black"}, "/", {text: "left", background: "white", color: "black"},
            "/", {text: "q", background: "white", color: "black", space: false}, ": back to selection",
        "   ",
        {text: "c", background: "white", color: "black", space: false}, ": cancel the execution",
        "   ",
        {text: "up", background: "white", color: "black"}, "/", {text: "down", background: "white", color: "black", space: false}, ": scroll through the logs",
    ]]
}

function getCommandExecutedTexts() {
    topTexts = []

    topTexts.push({padding: {totalWidth: logger.consoleWidth, alignment: "center"}, bold: true, color: "cyan", text: "Welcome to menu.js !"})

    topTexts.push({padding: {totalWidth: logger.consoleWidth, alignment: "center"}, bold: true, color: "cyan", text: "Command executed", dim: true})

    mainTexts = options[selectedOption].logs

    bottomTexts = [[
        {text: "r", background: "white", color: "black", space: false}, ": restart the command",
        "   ",
        {text: "up", background: "white", color: "black"}, "/", {text: "down", background: "white", color: "black", space: false}, ": scroll through the logs",
        "   ",
        {text: "any key", background: "white", color: "black"}, ": back to selection",
    ]]
}

function render() {
    if (displayed == "options") {
        getOptionTexts();
    }
    else if (displayed == "information") {
        getInformationTexts();
    }
    else if (displayed == "command") {
        getCommandTexts()
    }
    else if (displayed == "commandExecuted") {
        getCommandExecutedTexts()
    }

    console.clear()

    // TOP
    for (let topText of topTexts) {
        logger.write(topText)
    }

    //MAIN
    let mainTextsStrings = mainTexts.map((l) => {
        return logger.toString(l)
    })

    let mainTextsStringsLength = mainTextsStrings.map((textString) => {
        let length = Math.ceil(logger.printableLength(textString) / logger.consoleWidth)
        if (length == 0) return 1
        else return length
    })

    let mainTextsStringsTotalLength = mainTextsStringsLength.reduce((sum, added) => sum + added, 0)

    let skips = 0 // Number of ignored "away scrolled" lines
    let fixedLines = topTexts.length + bottomTexts.length
    let linesPrinted = topTexts.length

    maxScrollOffset = mainTextsStringsTotalLength - logger.consoleHeight + fixedLines

    for (let mainTextId in mainTexts) {
        let mainTextString = mainTextsStrings[mainTextId]
        let length = mainTextsStringsLength[mainTextId]
        if (length > logger.consoleHeight - linesPrinted - bottomTexts.length) {
            // If the string is too long, only take the first lines
            length = logger.consoleHeight - linesPrinted - bottomTexts.length;
            mainTextString = logger.printableSubstring(mainTextString, 0, length * logger.consoleWidth)
        }

        let skipsLeft = mainTextsStringsTotalLength - logger.consoleHeight - scrollOffset + fixedLines

        if (skips < skipsLeft) {
            if (skips + length <= skipsLeft) {
                skips += length;
                continue
            }
            else {
                // If the string is too long, only skip the first lines
                mainTextString = logger.printableSubstring(mainTextString, (skipsLeft - skips) * logger.consoleWidth)
                length = skipsLeft - skips
                skips += length;
            }
        }
        if (linesPrinted + bottomTexts.length == logger.consoleHeight) {
            break
        }
        linesPrinted += length
        process.stdout.write(mainTextString)
        process.stdout.write("\n");
    }

    // BOTTOM
    for (let emptyLine = 0; emptyLine < logger.consoleHeight - linesPrinted - bottomTexts.length; emptyLine++) {
        process.stdout.write("\n");
    }

    for (let [bottomTextId, bottomText] of Object.entries(bottomTexts)) {
        if (bottomTextId == bottomTexts.length - 1) process.stdout.write(logger.toString(bottomText)) // Write without newline at the end
        else logger.write(bottomText)
    }
}

function executeCommand(forceRestart, command, args) {
    let optionId = selectedOption
    
    scrollOffset = 0

    if (options[optionId].state != "nothing" && ! forceRestart) {
        displayed = "commandExecuted";
        return
    }

    displayed = "command";

    options[optionId].state = "running";

    let logs = options[optionId].logs;

    logs = []

    logs.push([{color: "cyan", text: "[menu.js]"},{text: `Executing command "`, space: false},
        {bold: true, space: false, text: options[optionId].commands[0]}, `"`])

    logs.push("")

    options[optionId].logs = logs;

    let stdoutBuffer = ""
    let stderrBuffer = ""
    
    let commandProcess = spawn(command, args, {env: {}})
    
    options[optionId].commandProcess = commandProcess;
    commandProcess.stdout.on("data", (data) => {
        stdoutBuffer += data.toString()
        let lines = stdoutBuffer.split("\n")
        stdoutBuffer = lines.pop()

        logs = logs.concat(lines)
        options[optionId].logs = logs;

        if (scrollOffset != 0) scrollOffset += lines.length

        render()
    })
    commandProcess.stderr.on("data", (data) => {
        stderrBuffer += data.toString()
        let lines = stderrBuffer.split("\n")
        stderrBuffer = lines.pop()

        logs = logs.concat(lines)
        options[optionId].logs = logs;

        if (scrollOffset != 0) scrollOffset += lines.length
        
        render()
    })
    commandProcess.on("close", (code, signal) => {
        logs.push("");
        if (scrollOffset != 0) scrollOffset += 1
        if (signal != null) {
            logs.push([{color: "yellow", text: "[menu.js]"}, "Command execution canceled!"])
            if (scrollOffset != 0) scrollOffset += 1
        }
        else if (code == 0) {
            logs.push([{color: "green", text: "[menu.js]"}, "Command executed successfully!"])
            if (scrollOffset != 0) scrollOffset += 1
        }
        else {
            logs.push([{color: "red", text: "[menu.js]"}, "Couldn't execute command successfully!"])
            if (scrollOffset != 0) scrollOffset += 1
        }
        if (displayed == "command" && selectedOption == optionId)
        displayed = "commandExecuted"

        options[optionId].logs = logs;

        if (scrollOffset != 0) scrollOffset += 1

        options[optionId].state = "ran";

        render()
    })
}

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

process.stdout.write("\x1b[?25l"); // Hide the cursor

logger.setStandardPrefix("[menu.js]")

let loadingDotsNumber = 3

setInterval(() => {
    if (loadingDotsNumber == 3) loadingDotsNumber = -1
    loadingDotsNumber++
    render()
}, 300)

const options = [
    {
        name: `Start Server`,
        information: `Start the TaskMinder server (server.js) using nodemon. Only watches for changes in the src folder.`,
        commands: ["nodemon --watch src server.js"],
        function: (restart) => { executeCommand(restart, "node_modules/.bin/nodemon", ["--watch", "src", "server.js"]) },
        state: "nothing",
        commandProcess: null,
        logs: []
    },
    {
        name: `Init Table "team"`,
        information: `Clear the table "src/models/team" and fill it with the standard teams ("Französisch", ` +
            `"Profilfach", "Ethik", "Evangelisch", "Katholisch", "Sport (m)", "Sport (w)").`,
        commands: ["node src/initTable/team.js"],
        function: (forceRestart) => { executeCommand(forceRestart, "node", [`src/initTable/team.js`]) },
        state: "nothing",
        commandProcess: null,
        logs: []
    },
    {
        name: `Init Table "eventType"`,
        information: `Clear the table "src/models/eventType" and fill it with the standard event types ("Prüfung" (blue), ` +
            `"Ausflug" (orange), "Geburtstag" (pink), "Schulfrei" (green), "Sonstiges" (gray)).`,
        commands: ["node src/initTable/eventType.js"],
        function: (forceRestart) => { executeCommand(forceRestart, "node", [`src/initTable/eventType.js`]) },
        state: "nothing",
        commandProcess: null,
        logs: []
    },
    {
        name: `Sass Compiler`,
        information: `Start a sass compiler watching for changes in main.scss, events.scss and homework.scss. Source maps are deactivated.`,
        commands: ["sass --watch --no-source-map src/sass/main.scss:public/main/main.css src/sass/events.scss:public/events/events.css" +
            "src/sass/homework.scss:public/homework/homework.css"],
        function: (restart) => { executeCommand(restart, "node_modules/.bin/sass", ["--watch", "--no-source-map", "src/sass/main.scss:public/main/main.css",
            "src/sass/events.scss:public/events/events.css", "src/sass/homework.scss:public/homework/homework.css"
        ]) },
        state: "nothing",
        commandProcess: null,
        logs: []
    },
];

let selectedOption = 0;

let displayed = "options";

let scrollOffset = 0;
let maxScrollOffset = 0;

let topTexts = []
let mainTexts = []
let bottomTexts = []

process.stdin.on("keypress", (str, key) => {
    if (displayed == "options") {
        if (key.name === "up" || key.name === "w") {
            selectedOption = (selectedOption - 1 + options.length) % options.length;
        }
        else if (key.name === "down" || key.name === "s") {
            selectedOption = (selectedOption + 1) % options.length;
        }
        else if (key.name === "i") {
            displayed = "information";
        }
        else if (key.name === "return") {
            options[selectedOption].function(false)
        }
    }
    else if (displayed == "information") {
        if (key.name === "return") {
            options[selectedOption].function(false)
        }
        else if (key.name == "escape" || key.name == "left") {
            displayed = "options";
        }
    }
    else if (displayed == "command") {
        if (key.name === "up") {
            if (scrollOffset < maxScrollOffset) {
                scrollOffset++
            }
        }
        else if (key.name == "down") {
            if (scrollOffset > 0) {
                scrollOffset--
            }
        }
        else if (key.name == "c") {
            if (options[selectedOption].commandProcess != null) {
                kill(options[selectedOption].commandProcess.pid, "SIGKILL")
            }
        }
        else if (key.name == "escape" || key.name == "left"|| key.name == "q") {
            displayed = "options";
        }
    }
    else if (displayed == "commandExecuted") {
        if (key.name == "up") {
            if (scrollOffset < maxScrollOffset) {
                scrollOffset++
            }
        }
        else if (key.name == "down") {
            if (scrollOffset > 0) {
                scrollOffset--
            }
        }
        else if (key.name === "r") {
            if (options[selectedOption].commandProcess != null) {
                kill(options[selectedOption].commandProcess.pid, "SIGKILL")
            }
            options[selectedOption].function(true)
        }
        else {
            displayed = "options";
        }
    }

    if (key.ctrl && key.name === "c") {
        (async () => {
            // Kill all processes
            for (let option of options) {
                if (option.commandProcess) {
                    await new Promise((resolve) => {
                        kill(option.commandProcess.pid, "SIGKILL", () => {
                            resolve()
                        })
                    })
                }
            }

            process.stdout.write("\n\x1b[?25h"); // Show the cursor
            process.exit();
        })()
    }

    render();
});

render()
