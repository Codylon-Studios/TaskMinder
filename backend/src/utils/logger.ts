namespace logger {
  export type Styles = {
    bold?: boolean;
    space?: boolean;
    dim?: boolean;
    italic?: boolean;
    underline?: boolean;
    stroked?: boolean;
    color?: string;
    background?: string;
    padding?: {
      totalWidth?: number;
      alignment?: "left" | "right" | "center";
      fillCharacter?: string;
    };
    disableParsing?: boolean;
  };
  export class StyledTextComponent {
    styles: Styles;
    content: string;
    constructor(styles: Styles, content: string) {
      this.styles = styles;
      this.content = logger.convertToString(
        content,
        this.styles.disableParsing ?? false
      );
    }
    apply(styles: Styles): void {
      function deepMerge(target: Styles, source: Styles) {
        for (const [key, value] of Object.entries(source) as [
          keyof Styles,
          any,
        ][]) {
          if (Array.isArray(value)) {
            if (!(key in target)) {
              target[key] = [] as any;
            }
            deepMerge(target[key] as Styles, value as Styles);
          } else if (typeof value == "object") {
            if (!(key in target)) {
              target[key] = {} as any;
            }
            deepMerge(target[key] as Styles, value as Styles);
          } else if (!(key in target)) {
            target[key] = value;
          }
        }
      }
      deepMerge(this.styles, styles);
    }
    toString(): string {
      let paddingLeftCharacters = "";
      let paddingRightCharacters = "";

      if (this.styles.padding) {
        const paddingStyles = this.styles.padding;

        const fillStyledText = new logger.StyledText(
          paddingStyles.fillCharacter ?? " "
        );
        const { padding, ...otherStyles } = this.styles;
        fillStyledText.apply(otherStyles);

        let remainingCharacters =
          (paddingStyles.totalWidth ?? 0) -
          logger.printableLength(this.content);
        if (remainingCharacters < 0) remainingCharacters = 0;

        const alignment = paddingStyles.alignment ?? "left";

        if (alignment == "left") {
          paddingRightCharacters = fillStyledText
            .toString()
            .repeat(remainingCharacters);
        } else if (alignment == "right") {
          paddingLeftCharacters = fillStyledText
            .toString()
            .repeat(remainingCharacters);
        } else if (alignment == "center") {
          paddingLeftCharacters = fillStyledText
            .toString()
            .repeat(Math.floor(remainingCharacters / 2));
          paddingRightCharacters = fillStyledText
            .toString()
            .repeat(Math.ceil(remainingCharacters / 2));
        }
      }

      const startEscapeCodes = logger.findEscapeCodes(this.styles);
      const endEscapeCodes = startEscapeCodes != "" ? "\x1b[0m" : "";
      return (
        paddingLeftCharacters +
        startEscapeCodes +
        this.content +
        endEscapeCodes +
        paddingRightCharacters
      );
    }
  }
  export class StyledText {
    components: StyledTextComponent[];
    constructor(texts: any) {
      this.components = [];
      if (Object.prototype.toString.call(texts) == "[object Array]") {
        for (const text of texts) {
          const styledText = new logger.StyledText(text);
          for (const styledTextComponent of styledText.components) {
            this.components.push(styledTextComponent);
          }
        }
      } else if (Object.prototype.toString.call(texts) == "[object Object]") {
        if (texts.disableParsing) {
          const { text, ...styles } = texts;
          this.components.push(new logger.StyledTextComponent(styles, text));
        } else {
          const { text, ...styles } = texts;
          const styledText = new logger.StyledText(text);
          styledText.apply(styles);
          for (const styledTextComponent of styledText.components) {
            this.components.push(styledTextComponent);
          }
        }
      } else {
        this.components.push(new logger.StyledTextComponent({}, texts));
      }
    }
    apply(styles: Styles): void {
      this.components.forEach(component => {
        component.apply(styles);
      });
    }
    toString(): string {
      let result = "";
      for (const [styledTextComponentId, styledTextComponent] of Object.entries(
        this.components
      )) {
        result += styledTextComponent.toString();
        let space = true;
        if (parseInt(styledTextComponentId) == this.components.length - 1)
          space = false;
        if (styledTextComponent.styles.space != undefined)
          space = styledTextComponent.styles.space;
        if (space) result += " ";
      }
      return result;
    }
  }
  export function convertToString(
    obj: any,
    disableParsing: boolean,
    depth: number = 0
  ): string {
    function parseError(err: Error): string {
      const errArray = (err.stack ?? "").split("\n");
      errArray[0] =
        logger.colors.red.fg +
        "\x1b[1m" +
        err.name +
        "\x1b[0m: " +
        logger.colors.red.fg +
        err.message +
        "\x1b[0m";
      return errArray.join("\n");
    }

    if (depth == 3) depth = 0;
    const color = [
      logger.colors.blue.fg,
      logger.colors.magenta.fg,
      logger.colors.yellow.fg,
    ][depth];

    if (disableParsing) {
      let res;
      switch (Object.prototype.toString.call(obj)) {
        case "[object Boolean]":
          return (
            logger.colors.green.fg + "\x1b[1m" + obj.toString() + "\x1b[0m"
          );
        case "[object Undefined]":
          return logger.colors.green.fg + "\x1b[1m" + "undefined" + "\x1b[0m";
        case "[object Null]":
          return logger.colors.green.fg + "\x1b[1m" + "null" + "\x1b[0m";
        case "[object Number]":
          if (isNaN(obj) || !isFinite(obj))
            return (
              logger.colors.green.fg + "\x1b[1m" + obj.toString() + "\x1b[0m"
            );
          return logger.colors.cyan.fg + obj.toString() + "\x1b[0m";
        case "[object String]":
          return logger.colors.gray.fg + JSON.stringify(obj) + "\x1b[0m";
        case "[object Array]":
          res = "";
          res += color + "\x1b[1m" + "[ " + "\x1b[0m";
          res += obj
            .map((entry: any) => {
              return logger.convertToString(entry, true, depth + 1);
            })
            .join(", ");
          res += color + "\x1b[1m" + " ]" + "\x1b[0m";
          return res;
        case "[object Object]":
          res = "";
          res += color + "\x1b[1m" + "{ " + "\x1b[0m";
          res += Object.entries(obj)
            .map(([key, val]) => {
              return (
                key.toString() +
                ": " +
                logger.convertToString(val, true, depth + 1)
              );
            })
            .join(", ");
          res += color + "\x1b[1m" + " }" + "\x1b[0m";
          return res;
        default:
          console.error("Unknown Object type:", obj);
          return logger.colors.red.fg + "???" + "\x1b[0m";
      }
    } else {
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
      } catch {
        console.error("Unknown Object type:", obj);
        return logger.colors.red.fg + "???" + "\x1b[0m";
      }
    }
  }

  let standardPrefix: string = "[TaskMinder]";
  export function setStandardPrefix(text: string): void {
    standardPrefix = text;
  }
  export function getStandardPrefix(): string {
    return standardPrefix;
  }
  let consoleWidth = process.stdout.columns ?? 80;
  let consoleHeight = process.stdout.rows ?? 24;
  export function getConsoleDimensions(): { width: number; height: number } {
    return { width: consoleWidth, height: consoleHeight };
  }
  export const colors = {
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
  export function printableLength(str: string): number {
    const printableStr = str.replace(/\x1b\[[0-9;]*m/g, "");
    return printableStr.length;
  }
  export function printableSubstring(
    str: string,
    start: number,
    end?: number
  ): string {
    const length = logger.printableLength(str);
    end ??= length;
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
      } else if (/\x1b/.test(char)) {
        escapeSequenceFound = true;
        res += char;
      } else {
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
  export function findEscapeCodes(styles: Styles): string {
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
      type ColorKey = keyof typeof logger.colors;
      res += logger.colors[styles.color as ColorKey]?.fg;
    }
    if (styles.background) {
      type ColorKey = keyof typeof logger.colors;
      res += logger.colors[styles.background as ColorKey]?.bg;
    }
    return res;
  }
  export function write(...data: any[]): void {
    const styledText = new logger.StyledText(data);
    process.stdout.write(styledText.toString());
    process.stdout.write("\n");
  }
  export function writeError(...data: any[]): void {
    const styledTextsArray = new logger.StyledText(data);
    process.stderr.write(styledTextsArray.toString());
    process.stderr.write("\n");
  }
  export function toString(...data: any[]): string {
    const styledText = new logger.StyledText(data);
    return styledText.toString();
  }

  type PrefixType =
    | "info"
    | "success"
    | "warn"
    | "error"
    | "highlightError"
    | "highlight";
  export function prefixedWrite(level: PrefixType, ...texts: any[]): void {
    const prefixColors: {
      [key in PrefixType]: {
        color?: keyof typeof logger.colors;
        background?: keyof typeof logger.colors;
      };
    } = {
      info: { color: "cyan" },
      success: { color: "green" },
      warn: { color: "yellow" },
      error: { color: "red" },
      highlightError: { background: "red" },
      highlight: { background: "blue" },
    };

    const { color, background } = prefixColors[level];
    logger.write(
      { color, background, text: logger.getStandardPrefix() },
      ...texts
    );
  }
  export function info(...texts: any[]): void {
    prefixedWrite("info", ...texts);
  }
  export function success(...texts: any[]): void {
    prefixedWrite("success", ...texts);
  }
  export function warn(...texts: any[]): void {
    prefixedWrite("warn", ...texts);
  }
  export function error(...texts: any[]): void {
    prefixedWrite("error", ...texts);
  }
  export function highlightError(...texts: any[]): void {
    prefixedWrite("highlightError", ...texts);
  }
  export function highlight(...texts: any[]): void {
    prefixedWrite("highlight", ...texts);
  }

  process.stdout.on("resize", () => {
    consoleWidth = process.stdout.columns ?? 80;
    consoleHeight = process.stdout.rows ?? 24;
  });
}

export default logger;
