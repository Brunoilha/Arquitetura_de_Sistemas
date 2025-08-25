function isIntNonNegative(v) {
    return Number.isInteger(v) && v >= 0;
}

function isNumber(v){
    return typeof v === "number" && !Number.isNaN(v);
}

module.exports = {
    isIntNonNegative,
    isNumber
};