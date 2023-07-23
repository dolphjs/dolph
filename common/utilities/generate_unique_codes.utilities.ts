const strOne = Date.now().toString(36);
const strTwo = Math.random().toString(36).substring(2);

function generateRandomCode(digits: number, str: string) {
  let code = '';
  while (code.length < digits) {
    code += str[Math.floor(Math.random() * str.length)];
  }
  return code;
}

const uniqueFiveDigitsCode = generateRandomCode(5, strOne + strTwo);
const uniqueSixDigitsCode = generateRandomCode(6, strOne + strTwo);
const uniqueSevenDigitsCode = generateRandomCode(7, strOne + strTwo);

export { uniqueFiveDigitsCode, uniqueSevenDigitsCode, uniqueSixDigitsCode };
