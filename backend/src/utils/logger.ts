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
    this.content = convertToString(content, this.styles.disableParsing ?? false);
  }
  apply(styles: Styles): void {
    function deepMerge(target: Styles, source: Styles) {
      for (const [key, value] of Object.entries(source) as [keyof Styles, Styles[keyof Styles]][]) {
        if (Array.isArray(value)) {
          if (!(key in target)) {
            target[key] = [] as unknown as undefined;
          }
          deepMerge(target[key] as Styles, value as Styles);
        }
        else if (typeof value == "object") {
          if (!(key in target)) {
            target[key] = {} as unknown as undefined;
          }
          deepMerge(target[key] as Styles, value as Styles);
        }
        else if (!(key in target)) {
          target[key] = value as unknown as undefined;
        }
      }
    }
    deepMerge(this.styles, styles);
  }
  toString(): string {
    let paddingLeftCharacters = "";
    let paddingRightCharacters = "";

    if (this.styles.padding) {
      const { padding: paddingStyles, ...otherStyles } = this.styles;

      const fillStyledText = new StyledText(paddingStyles.fillCharacter ?? " ");
      fillStyledText.apply(otherStyles);

      let remainingCharacters = (paddingStyles.totalWidth ?? 0) - printableLength(this.content);
      if (remainingCharacters < 0) remainingCharacters = 0;

      const alignment = paddingStyles.alignment ?? "left";

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

    const startEscapeCodes = findEscapeCodes(this.styles);
    const endEscapeCodes = startEscapeCodes != "" ? "\x1b[0m" : "";
    return paddingLeftCharacters + startEscapeCodes + this.content + endEscapeCodes + paddingRightCharacters;
  }
}
export class StyledText {
  components: StyledTextComponent[];
  constructor(texts: unknown) {
    this.components = [];
    if (texts instanceof Array) {
      for (const text of texts) {
        const styledText = new StyledText(text);
        for (const styledTextComponent of styledText.components) {
          this.components.push(styledTextComponent);
        }
      }
    }
    else if (
      Object.prototype.toString.call(texts) == "[object Object]" &&
      typeof texts == "object" &&
      texts !== null &&
      texts !== undefined &&
      "text" in texts
    ) {
      if ("disableParsing" in texts && typeof texts.disableParsing == "boolean" && texts.disableParsing) {
        const { text, ...styles } = texts as {
          text: unknown;
          disableParsing: true;
        } & Styles;
        this.components.push(new StyledTextComponent(styles, convertToString(text, true)));
      }
      else {
        const { text, ...styles } = texts;
        const styledText = new StyledText(text);
        styledText.apply(styles);
        for (const styledTextComponent of styledText.components) {
          this.components.push(styledTextComponent);
        }
      }
    }
    else {
      this.components.push(new StyledTextComponent({}, convertToString(texts, false)));
    }
  }
  apply(styles: Styles): void {
    this.components.forEach(component => {
      component.apply(styles);
    });
  }
  toString(): string {
    let result = "";
    for (const [styledTextComponentId, styledTextComponent] of Object.entries(this.components)) {
      result += styledTextComponent.toString();
      let space = true;
      if (parseInt(styledTextComponentId) == this.components.length - 1) space = false;
      if (styledTextComponent.styles.space != undefined) space = styledTextComponent.styles.space;
      if (space) result += " ";
    }
    return result;
  }
}
export function convertToString(obj: unknown, disableParsing: boolean, depth: number = 0): string {
  function parseError(err: Error): string {
    const errArray = (err.stack ?? "").split("\n");
    errArray[0] = colors.red.fg + "\x1b[1m" + err.name + "\x1b[0m: " + colors.red.fg + err.message + "\x1b[0m";
    return errArray.join("\n");
  }

  if (depth == 3) depth = 0;
  const color = [colors.blue.fg, colors.magenta.fg, colors.yellow.fg][depth];

  if (disableParsing) {
    let res;
    if (obj === null) {
      return colors.green.fg + "\x1b[1m" + "null" + "\x1b[0m";
    }
    if (obj === undefined) {
      return colors.green.fg + "\x1b[1m" + "undefined" + "\x1b[0m";
    }
    if (typeof obj === "string") {
      return colors.gray.fg + JSON.stringify(obj) + "\x1b[0m";
    }
    if (typeof obj === "boolean") {
      return colors.green.fg + "\x1b[1m" + obj.toString() + "\x1b[0m";
    }
    if (typeof obj === "number") {
      if (isNaN(obj) || !isFinite(obj)) return colors.green.fg + "\x1b[1m" + obj.toString() + "\x1b[0m";
      return colors.cyan.fg + obj.toString() + "\x1b[0m";
    }
    if (obj instanceof Array) {
      res = "";
      res += color + "\x1b[1m" + "[ " + "\x1b[0m";
      res += obj
        .map((entry: unknown) => {
          return convertToString(entry, true, depth + 1);
        })
        .join(", ");
      res += color + "\x1b[1m" + " ]" + "\x1b[0m";
      return res;
    }
    if (Object.prototype.toString.call(obj) == "[object Object]") {
      res = "";
      res += color + "\x1b[1m" + "{ " + "\x1b[0m";
      res += Object.entries(obj)
        .map(([key, val]) => {
          return key.toString() + ": " + convertToString(val, true, depth + 1);
        })
        .join(", ");
      res += color + "\x1b[1m" + " }" + "\x1b[0m";
      return res;
    }
    console.error("Unknown Object type:", obj);
    return colors.red.fg + "???" + "\x1b[0m";
  }
  else {
    try {
      if (obj == undefined) {
        return "undefined";
      }
      if (obj == null) {
        return "null";
      }
      if (obj instanceof Error) {
        return parseError(obj);
      }
      return obj.toString();
    }
    catch {
      console.error("Unknown Object type:", obj);
      return colors.red.fg + "???" + "\x1b[0m";
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
  gray: { fg: "\x1b[90m", bg: "\x1b[100m" }
};
export function printableLength(str: string): number {
  // eslint-disable-next-line no-control-regex
  const printableStr = str.replace(/\x1b\[[0-9;]*m/g, "");
  return printableStr.length;
}
export function printableSubstring(str: string, start: number, end?: number): string {
  const length = printableLength(str);
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
    }
    // eslint-disable-next-line no-control-regex
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
    type ColorKey = keyof typeof colors;
    res += colors[styles.color as ColorKey]?.fg;
  }
  if (styles.background) {
    type ColorKey = keyof typeof colors;
    res += colors[styles.background as ColorKey]?.bg;
  }
  return res;
}
export function write(...data: unknown[]): void {
  const styledText = new StyledText(data);
  process.stdout.write(styledText.toString());
  process.stdout.write("\n");
}
export function writeError(...data: unknown[]): void {
  const styledTextsArray = new StyledText(data);
  process.stderr.write(styledTextsArray.toString());
  process.stderr.write("\n");
}
export function toString(...data: unknown[]): string {
  const styledText = new StyledText(data);
  return styledText.toString();
}

type PrefixType = "info" | "success" | "warn" | "error" | "highlightError" | "highlight";
export function prefixedWrite(level: PrefixType, ...texts: unknown[]): void {
  const prefixColors: {
    [key in PrefixType]: {
      color?: keyof typeof colors;
      background?: keyof typeof colors;
    };
  } = {
    info: { color: "cyan" },
    success: { color: "green" },
    warn: { color: "yellow" },
    error: { color: "red" },
    highlightError: { background: "red" },
    highlight: { background: "blue" }
  };

  const { color, background } = prefixColors[level];
  write({ color, background, text: getStandardPrefix() }, ...texts);
}
export function info(...texts: unknown[]): void {
  prefixedWrite("info", ...texts);
}
export function success(...texts: unknown[]): void {
  prefixedWrite("success", ...texts);
}
export function warn(...texts: unknown[]): void {
  prefixedWrite("warn", ...texts);
}
export function error(...texts: unknown[]): void {
  prefixedWrite("error", ...texts);
}
export function highlightError(...texts: unknown[]): void {
  prefixedWrite("highlightError", ...texts);
}
export function highlight(...texts: unknown[]): void {
  prefixedWrite("highlight", ...texts);
}

process.stdout.on("resize", () => {
  consoleWidth = process.stdout.columns ?? 80;
  consoleHeight = process.stdout.rows ?? 24;
});

const logger = {
  StyledTextComponent,
  StyledText,
  convertToString,
  setStandardPrefix,
  getStandardPrefix,
  getConsoleDimensions,
  colors,
  printableLength,
  printableSubstring,
  findEscapeCodes,
  write,
  writeError,
  toString,
  prefixedWrite,
  info,
  success,
  warn,
  error,
  highlightError,
  highlight
};

export default logger;
