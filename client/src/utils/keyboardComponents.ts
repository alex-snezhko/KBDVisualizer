export const SPECIAL_NUM_UNITS = {
    "Backspace": 2,
    "Tab": 1.5,
    "Backslash": 1.5,
    "Caps": 1.75,
    "ANSIEnter": 2.25,
    "LShift": 2.25,
    "RShift1_75": 1.75,
    "RShift2_75": 2.75,
    "LCtrl1_25": 1.25,
    "LWin1_25": 1.25,
    "LAlt1_25": 1.25,
    "LCtrl1_5": 1.5,
    "LWin1_5": 1.5,
    "LAlt1_5": 1.5,
    "RCtrl1_25": 1.25,
    "RWin1_25": 1.25,
    "RAlt1_25": 1.25,
    "RCtrl1_5": 1.5,
    "RWin1_5": 1.5,
    "RAlt1_5": 1.5,
    "Fn1_25": 1.25,
    "Fn1_5": 1.5,
    "Space6": 6,
    "Space6_25": 6.25,
    "Space7": 7,
    "Num0": 2
};

export const SPECIAL_KEYCAP_IDENTIFIERS = new Set([
    "Space6_25", "Space6", "Space7", "NumEnter", "NumPlus", "ISOEnter"
]);

// , "Minus",
//     "Equals", "Backspace", "OSqr", "CSqr", "Backspace", "Semicolon", "Apostrophe",
//     "Comma", "Period", "Forwardslash"

export const ALPHAS = new Set([
    "F1", "F2", "F3", "F4", "F9", "F10", "F11", "F12",
    "Tilde", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "Minus", "Equals",
    "Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "OSqr", "CSqr", "Backslash",
    "A", "S", "D", "F", "G", "H", "J", "K", "L", "Semicolon", "Apostrophe",
    "Z", "X", "C", "V", "B", "N", "M", "Comma", "Period", "Forwardslash", "Space6", "Space6_25", "Space7",
    "Num0", "Num1", "Num2", "Num3", "Num4", "Num5", "Num6", "Num7", "Num8", "Num9", "NumPoint"
]);

export const ACCENTS = new Set(["Esc", "ANSIEnter", "ISOEnter", "NumEnter"]);
