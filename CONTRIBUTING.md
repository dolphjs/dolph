# Contributing

Thank you for your interest in contributing to the DolphJs Docs!

## Code of Conduct

DolphJs has adopted a code of conduct that we expect contributors to adhere to.
Please read the instructions in the [CODE_OF_CONDUCT](CODE_OF_CONDUCT) so
you can understand our ethics.

**Try to follow your own instructions.**

When writing step-by-step instructions (e.g. how to install something), try to forget everything you know about the topic, and actually follow the instructions you wrote, a single step at time. Often you will discover that there is implicit knowledge that you forgot to mention, or that there are missing or out-of-order steps in the instructions. Bonus points for getting _somebody else_ to follow the steps and watching what they struggle with. Often it would be something very simple that you have not anticipated.

## Guidelines for Code Examples

### Syntax

#### Prefer OOP to Functional Programming

DolphJS is strictly built with the OOP approach.

#### Use `const` where possible, otherwise `let`. Don't use `var`

#### Don't use ES5 features when equivalent ES6 features have no downsides

#### Don't forget to remove console.log's when finished with them

#### Ensure that your code is scalable and uses the best implementation e.g prefer code with 0(n) to 0(logn)

In particular, you should prefer arrow functions `const myFunction = () => ...` to named `functions` for top-level functions.

### Package Manager

- Use only yarn

### Style

- Use semicolons.
- No space between function names and parenthesis (`method() {}` not `method () {}`).
- When in doubt, use the default style favored by [Prettier](https://prettier.io/playground/).

### Highlighting

Use `typescript` as the highlighting language in Markdown code blocks:

````
```typescript
// code
```
````

Sometimes you'll see blocks with numbers.  
They tell the website to highlight specific lines.

You can highlight a single line:

````
```javascipt {2}
function hello() {
  // this line will get highlighted
}
```
````

A range of lines:

````
```typescript {2-4}
function hello() {
  // these lines
  // will get
  // highlighted
}
```
````

Or even multiple ranges:

````
```typescript {2-4,6}
function hello() {
  // these lines
  // will get
  // highlighted
  console.log('hello');
  // also this one
  console.log('there');
}
```
````

Be mindful that if you move some code in an example with highlighting, you also need to update the highlighting.

Don't be afraid to often use highlighting! It is very valuable when you need to focus the reader's attention on a particular detail that's easy to miss.
