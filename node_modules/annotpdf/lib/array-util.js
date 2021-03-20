"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
const object_util_1 = require("./object-util");
/**
 * Holds the logic for extracting arrays
 * */
class ArrayUtil {
    /**
     * Extracts array of numbers and arrays of references
     *
     * The function supports arbitrarily nesting of arrays and multiple types.
     * */
    static extractArray(data, ptr) {
        ptr = util_1.Util.skipSpaces(data, ptr);
        let start_index = ptr;
        if (data[ptr] !== util_1.Util.ARRAY_START[0])
            throw Error("Invalid array sequence -- does not start with '['");
        ptr += 1;
        let next = util_1.Util.readNextWord(data, ptr);
        let next_string = next.result;
        ptr = next.start_index;
        let ret_list = [];
        while (next_string) {
            if (next_string[0] === util_1.Util.ARRAY_START[0]) {
                let sub_array = ArrayUtil.extractArray(data, ptr);
                ptr = sub_array.end_index;
                ret_list.push(sub_array.result);
            }
            else if (util_1.Util.areArraysEqual(next_string, util_1.Util.NULL)) {
                ret_list.push("null");
                ptr += next_string.length - 1;
            }
            else if (next_string[0] === util_1.Util.LITERAL_STRING_END[0]) {
                return { result: ret_list, start_index: start_index, end_index: next.end_index };
            }
            else if (next_string[0] === util_1.Util.LITERAL_STRING_START[0]) {
                let extracted_string = util_1.Util.extractString(data, ptr);
                ret_list.push(extracted_string.result);
                ptr = extracted_string.end_index;
            }
            else if (next_string[0] === util_1.Util.DICT_START[0]) { // <
                let lookup_word = util_1.Util.readNextWord(data, next.end_index + 1);
                if (lookup_word.result && lookup_word.result[0] === util_1.Util.DICT_START[0]) {
                    let dict = {};
                    ptr = object_util_1.ObjectUtil.extractDictValueRec(data, ptr, dict);
                    ret_list.push(dict);
                }
                else {
                    let hex_string = util_1.Util.extractHexString(data, ptr);
                    ret_list.push(hex_string.result);
                    ptr = hex_string.end_index;
                }
            }
            else if (next_string[0] === 47) { // /
                let opt_value = util_1.Util.extractOptionValue(data, ptr);
                ret_list.push("/" + opt_value.result);
                ptr = opt_value.end_index;
            }
            else if (next_string[0] === util_1.Util.R[0]) { // Reference pointer
                let obj = ret_list[ret_list.length - 2];
                let generation = ret_list[ret_list.length - 1];
                ret_list = ret_list.slice(0, ret_list.length - 2);
                ret_list.push({ obj: obj, generation: generation });
                ptr = next.end_index;
            }
            else if (next_string[0] === util_1.Util.ARRAY_END[0]) {
                break;
            }
            else {
                let nbr = util_1.Util.extractNumber(data, ptr);
                ret_list.push(nbr.result);
                ptr = nbr.end_index;
            }
            ++ptr;
            ptr = util_1.Util.skipSpaces(data, ptr);
            next = util_1.Util.readNextWord(data, ptr);
            next_string = next.result;
            ptr = next.start_index;
        }
        return { result: ret_list, start_index: start_index, end_index: next.end_index };
    }
}
exports.ArrayUtil = ArrayUtil;
//# sourceMappingURL=array-util.js.map