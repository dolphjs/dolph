const strOne = Date.now().toString(36);
const strTwo = Math.random().toString(36).substring(2);

function generateRandomCode(digits: number, str: string) {
    let code = '';
    while (code.length < digits) {
        code += str[Math.floor(Math.random() * str.length)];
    }
    return code;
}

/**
 * generates a random 5 digits string
 *
 * can be used for email validation e.t.c
 */
const uniqueFiveDigitsCode = generateRandomCode(5, strOne + strTwo);

/**
 * generates a random 6 digits string
 *
 * can be used for email validation e.t.c
 */
const uniqueSixDigitsCode = generateRandomCode(6, strOne + strTwo);

/**
 * generates a random 7 digits string
 *
 * can be used for email validation e.t.c
 */
const uniqueSevenDigitsCode = generateRandomCode(7, strOne + strTwo);

export { uniqueFiveDigitsCode, uniqueSevenDigitsCode, uniqueSixDigitsCode };
