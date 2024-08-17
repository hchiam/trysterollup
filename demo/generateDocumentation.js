import { GameController } from "./trysterollup";
const $ = (s) => document.querySelector(s);

class DocumentationGenerator {
  constructor(input = { classRef: null, print: false }) {
    this.print = input.print;
    this.classRef = input.classRef;
  }

  getMethods(yourClassHere = this.classRef) {
    const methods = Object.getOwnPropertyNames(yourClassHere.prototype)
      .filter((m) => typeof yourClassHere.prototype[m] === "function")
      .map((m) => {
        const method = yourClassHere.prototype[m];
        const methodString = method.toString();
        const params = methodString.slice(
          methodString.indexOf("(") + 1,
          methodString.indexOf(")")
        );
        return `\`${m}(${params.trim()})\``;
      });

    if (this.print) {
      console.log(`${yourClassHere.name} methods:`, methods);
    }

    return methods;
  }

  getProperties(yourClassHere = this.classRef) {
    const properties = Object.entries(
      new yourClassHere({ generatingDocumentation: true }) // because must call new () instance to get "this." variables
    ).map((entry) => {
      const [key, value] = entry;
      return `\`${key}\`: ${typeof value}`;
    });

    if (this.print) {
      console.log(`${yourClassHere.name} properties:`, properties);
    }

    return properties;
  }

  generateDocumentation(yourClassHere = this.classRef) {
    const content = `# ${yourClassHere.name} Documentation:

## Methods:

${this.getMethods(yourClassHere).join("\n\n")}

## Properties:

${this.getProperties(yourClassHere).join("\n\n")}
`;

    if (this.print) {
      console.log(`${yourClassHere.name} Documentation:`, content);
    }

    return content;
  }
}

const docGenerator = new DocumentationGenerator({ classRef: GameController });
const documentation = docGenerator.generateDocumentation();
// console.log(documentation);

// window.copyDoc = function () {
//   copy(documentation);
// };
$("#copyDoc").addEventListener("click", () => {
  copy(documentation);
});

function copy(text) {
  var textarea = document.createElement("textarea");
  //   selection = document.getSelection();
  textarea.textContent = text;
  document.body.appendChild(textarea);
  //   selection.removeAllRanges();
  textarea.select();
  document.execCommand("copy");
  //   selection.removeAllRanges();
  document.body.removeChild(textarea);
  alert(`Copied to clipboard:\n\n${text}`);
}
