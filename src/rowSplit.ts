import { CSVParseParam } from "./Parameters";
import { Converter } from "./Converter";
import { Fileline } from "./fileline";

const defaulDelimiters = [",", "|", "\t", ";", ":"];
export class RowSplit {
  private quote: string;
  private trim: boolean;
  private escape: string;
  private delimiter: string | string[];
  private cachedRegExp: { [key: string]: RegExp } = {};
  constructor(private conv: Converter) {
    this.quote = conv.parseParam.quote;
    this.trim = conv.parseParam.trim;
    this.escape = conv.parseParam.escape;
    this.delimiter = conv.parseParam.delimiter;
  }
  parse(fileline: Fileline): RowSplitResult {
    if (fileline === "") {
      return { cells: [], closed: true };
    }
    const quote = this.quote;
    const trim = this.trim;
    const escape = this.escape;
    if (this.delimiter instanceof Array || this.delimiter.toLowerCase() === "auto") {
      this.delimiter = this.getDelimiter(fileline);
    }
    const delimiter = this.delimiter;
    const rowArr = fileline.split(delimiter);
    if (quote === "off") {
      return { cells: rowArr, closed: true };
    }
    const row: string[] = [];
    let inquote = false;
    let quoteBuff = '';
    for (let i = 0, rowLen = rowArr.length; i < rowLen; i++) {
      let e = rowArr[i];
      if (!inquote && trim) {
        e = e.trim();
      }
      const len = e.length;
      if (!inquote) {
        if (this.isQuoteOpen(e)) { //quote open
          e = e.substr(1);
          if (this.isQuoteClose(e)) { //quote close
            e = e.substring(0, e.length - 1);
            e = this.escapeQuote(e);
            row.push(e);
            continue;
          } else {
            inquote = true;
            quoteBuff += e;
            continue;
          }
        } else {
          row.push(e);
          continue;
        }
      } else { //previous quote not closed
        if (this.isQuoteClose(e)) { //close double quote
          inquote = false;
          e = e.substr(0, len - 1);
          quoteBuff += delimiter + e;
          quoteBuff = this.escapeQuote(quoteBuff);
          if (trim) {
            quoteBuff = quoteBuff.trimRight();
          }
          row.push(quoteBuff);
          quoteBuff = "";
        } else {
          quoteBuff += delimiter + e;
        }
      }
    }

    // if (!inquote && param._needFilterRow) {
    //   row = filterRow(row, param);
    // }

    return { cells: row, closed: !inquote };
  }
  private getDelimiter(fileline: Fileline): string {
    let checker;
    if (this.conv.parseParam.delimiter === "auto") {
      checker = defaulDelimiters;
    } else if (this.conv.parseParam.delimiter instanceof Array) {
      checker = this.conv.parseParam.delimiter;
    } else {
      return this.conv.parseParam.delimiter;
    }
    let count = 0;
    let rtn = ",";
    checker.forEach(function (delim) {
      const delimCount = fileline.split(delim).length;
      if (delimCount > count) {
        rtn = delim;
        count = delimCount;
      }
    });
    return rtn;
  }
  private isQuoteOpen(str: string): boolean {
    const quote = this.quote;
    const escape = this.escape;
    return str[0] === quote && (
      str[1] !== quote ||
      str[1] === escape && (str[2] === quote || str.length === 2));
  }
  private isQuoteClose(str: string): boolean {
    const quote = this.quote;
    const escape = this.escape;
    let count = 0;
    let idx = str.length - 1;
    while (str[idx] === quote || str[idx] === escape) {
      idx--;
      count++;
    }
    return count % 2 !== 0;
  }

  private twoDoubleQuote(str: string): string {
    var twoQuote = this.quote + this.quote;
    var curIndex = -1;
    while ((curIndex = str.indexOf(twoQuote, curIndex)) > -1) {
      str = str.substring(0, curIndex) + str.substring(++curIndex);
    }
    return str;
  }


  private escapeQuote(segment: string): string {
    const quote = this.quote;
    const key = "es|" + quote + "|" + escape;
    if (this.cachedRegExp[key] === undefined) {
      this.cachedRegExp[key] = new RegExp('\\' + escape + '\\' + quote, 'g');
    }
    const regExp = this.cachedRegExp[key];
    // console.log(regExp,segment);
    return segment.replace(regExp, quote);
  }

}

export interface RowSplitResult {
  /**
   * csv row array. ["a","b","c"]
   */
  cells: string[],
  /**
   * if the passed fileline is a complete row
   */
  closed: boolean
}
