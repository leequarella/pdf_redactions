"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
const array_util_1 = require("./array-util");
const stream_1 = require("./stream");
/**
 * While the general Util class holds low level methods to navigate through the pdf data, the ObjectUtil
 * is purposefully build to extract complete objects. It returns those as json dictionaries.
 * */
class ObjectUtil {
    static extractDictKeyRec(data, ptr, dict) {
        let next = util_1.Util.readNextWord(data, ptr);
        let next_string = next.result;
        if (!next_string)
            return ptr;
        let _ptr = util_1.Util.skipDelimiter(next_string, 0);
        if (next_string[0] && util_1.Util.DICT_END[0] === next_string[0]) {
            let wordLookup = util_1.Util.readNextWord(data, next.end_index + 1);
            if (wordLookup.result && util_1.Util.DICT_END[0] === wordLookup.result[0]) {
                return wordLookup.end_index;
            }
        }
        return ObjectUtil.extractDictValueRec(data, next.end_index + 1, dict, util_1.Util.convertAsciiToString(next_string));
    }
    static extractDictValueRec(data, ptr, dict, current_key = undefined) {
        let next = util_1.Util.readNextWord(data, ptr);
        let next_string = next.result || new Uint8Array([]);
        ptr = next.end_index - next_string.length + 1;
        if (next_string[0] === util_1.Util.ARRAY_START[0]) {
            if (!current_key)
                throw Error("Invalid anonymous array definition");
            // handle array
            let extracted_array = array_util_1.ArrayUtil.extractArray(data, ptr);
            dict[current_key] = extracted_array.result;
            return ObjectUtil.extractDictKeyRec(data, extracted_array.end_index + 1, dict);
        }
        else if (next_string[0] === util_1.Util.DICT_START[0] && data[next.end_index + 1] === util_1.Util.DICT_START[0]) {
            if (current_key) {
                let sup_dict = {};
                let end_sub_dict = ObjectUtil.extractDictKeyRec(data, next.end_index + 2, sup_dict);
                dict[current_key] = sup_dict;
                return ObjectUtil.extractDictKeyRec(data, end_sub_dict + 1, dict);
            }
            else {
                return ObjectUtil.extractDictKeyRec(data, next.end_index + 2, dict);
            }
        }
        else if (next_string[0] === util_1.Util.HEX_STRING_START[0]) {
            if (!current_key)
                throw Error("Invalid anonymous string definition");
            let extracted_string = util_1.Util.extractHexString(data, ptr);
            dict[current_key] = extracted_string.result;
            return ObjectUtil.extractDictKeyRec(data, extracted_string.end_index + 1, dict);
        }
        else if (next_string[0] === util_1.Util.LITERAL_STRING_START[0]) {
            if (!current_key)
                throw Error("Invalid anonymous string definition");
            let extracted_string = util_1.Util.extractString(data, ptr);
            dict[current_key] = extracted_string.result;
            return ObjectUtil.extractDictKeyRec(data, extracted_string.end_index + 1, dict);
        }
        else if (next_string[0] === 47) { // /
            if (!current_key)
                throw Error("Invalid anonymous property definition");
            let opt_value = util_1.Util.extractOptionValue(data, ptr);
            dict[current_key] = "/" + opt_value.result;
            return ObjectUtil.extractDictKeyRec(data, opt_value.end_index + 1, dict);
        }
        else { // It is a number, but this number might be part of a Reference
            let lookupNext = util_1.Util.readNextWord(data, next.end_index + 1);
            let lookupNextWord = lookupNext.result || new Uint8Array([]);
            if (!current_key)
                throw Error("Invalid anonymous reference/number definition");
            let value_end_ptr = next.end_index + 1;
            if (lookupNextWord[0] === 47 || lookupNextWord[0] === util_1.Util.DICT_END[0]) { // is a number
                dict[current_key] = util_1.Util.extractNumber(data, ptr).result;
            }
            else { // is a rereference
                let extracted_reference = util_1.Util.extractReferenceTyped(data, ptr);
                dict[current_key] = extracted_reference.result;
                value_end_ptr = extracted_reference.end_index + 1;
            }
            // handle Reference
            return ObjectUtil.extractDictKeyRec(data, value_end_ptr, dict);
        }
        throw Error(`Could not interpret: ${util_1.Util.convertAsciiToString(next_string)}`);
    }
    /**
     * Locates the object start in case the ptr does not point correctly
     * */
    static locateObjectStart(data, ptr) {
        let obj_ptr = util_1.Util.locateSequence(util_1.Util.OBJ, data, ptr);
        let endobj_ptr = util_1.Util.locateSequence(util_1.Util.ENDOBJ, data, ptr);
        let consumeGenerationAndNumberRevere = (ptr) => {
            // <id> <generation> obj ... endobj
            //                   ^
            // being somewhere here
            let new_ptr = util_1.Util.skipSpacesReverse(data, ptr - 1);
            // <id> <generation> obj ... endobj
            //                 ^
            // being somewhere here
            while (new_ptr > 0 && !util_1.Util.isDelimiter(data[new_ptr]))
                --new_ptr;
            // <id> <generation> obj ... endobj
            //      ^
            // being somewhere here
            new_ptr = util_1.Util.skipSpacesReverse(data, new_ptr - 1);
            // <id> <generation> obj ... endobj
            // ^
            // being somewhere here
            while (new_ptr > 0 && !util_1.Util.isDelimiter(data[new_ptr]))
                --new_ptr;
            return new_ptr;
        };
        if (obj_ptr !== -1 && obj_ptr < endobj_ptr) {
            return consumeGenerationAndNumberRevere(obj_ptr);
        }
        else if (obj_ptr > endobj_ptr || (obj_ptr === -1 && endobj_ptr > -1)) {
            // <id> <generation> obj ... endobj
            //                        ^
            // being somewhere here
            let new_ptr = util_1.Util.locateSequenceReversed(util_1.Util.OBJ, data, ptr);
            return consumeGenerationAndNumberRevere(new_ptr);
        }
        else {
            throw Error("Could not correct object start");
        }
    }
    /**
     * Parses a PDF object and returns a dictionary containing its fields
     * */
    static extractObject(data, xref, objectLookupTable = undefined) {
        if (typeof xref !== 'number' && xref.compressed) {
            if (!objectLookupTable)
                throw Error("Provide ObjectLookupTable to extract stream object");
            return ObjectUtil.extractStreamObject(data, xref.id, xref.generation, objectLookupTable[xref.pointer]);
        }
        let ret_obj = {};
        let ptr = typeof xref === 'number' ? xref : xref.pointer;
        let object_id = util_1.Util.extractObjectId(data, ptr);
        if (isNaN(object_id.obj) || isNaN(object_id.generation)) {
            return ObjectUtil.extractObject(data, ObjectUtil.locateObjectStart(data, ptr), objectLookupTable);
        }
        ret_obj.id = object_id;
        ptr = util_1.Util.locateSequence(util_1.Util.OBJ, data, ptr);
        if (ptr === -1)
            throw { message: "Object missing 'obj' sequence", name: "MissingObjSequenceError" };
        ptr += util_1.Util.OBJ.length;
        let ptr_obj_end = util_1.Util.locateSequence(util_1.Util.ENDOBJ, data, ptr);
        data = data.slice(ptr, ptr_obj_end);
        // determine the type of the object:
        let next = util_1.Util.readNextWord(data, 0);
        if (next.result && next.result[0] === util_1.Util.DICT_START[0]) { // object contains a dict
            let result_dict = {};
            ObjectUtil.extractDictValueRec(data, 0, result_dict);
            ret_obj.value = result_dict;
        }
        else if (next.result && next.result[0] === util_1.Util.ARRAY_START[0]) { // object contains an array
            let lst = array_util_1.ArrayUtil.extractArray(data, 0);
            ret_obj.value = lst.result;
        }
        else {
            throw Error(`Invalid object type - starting with: ${next.result}`);
        }
        // check if the object has a stream part
        ptr = util_1.Util.locateSequence(util_1.Util.STREAM, data, 0);
        if (-1 !== ptr) {
            // extract stream part
            let ptr_stream_data_start = ptr + util_1.Util.STREAM.length;
            ptr_stream_data_start = util_1.Util.skipDelimiter(data, ptr_stream_data_start);
            let ptr_stream_data_end = ptr_stream_data_start + ret_obj.value["/Length"];
            ret_obj.stream = ObjectUtil.extractStreamData(data.slice(ptr_stream_data_start, ptr_stream_data_end), ret_obj.value["/Filter"], ObjectUtil.translateDecodeParams(ret_obj));
        }
        return ret_obj;
    }
    static extractStreamObject(data, object_id_to_extract, offset, streamObj_xref) {
        let ptr = streamObj_xref.pointer;
        let ret_obj = {};
        // extract object id
        let object_id = util_1.Util.extractObjectId(data, ptr);
        ret_obj.id = object_id;
        ptr = util_1.Util.locateSequence(util_1.Util.OBJ, data, ptr) + util_1.Util.OBJ.length;
        let ptr_obj_end = util_1.Util.locateSequence(util_1.Util.ENDOBJ, data, ptr);
        data = data.slice(ptr, ptr_obj_end);
        // extract dict part
        let next = util_1.Util.readNextWord(data, 0);
        if (!next.result || next.result[0] !== util_1.Util.DICT_START[0]) {
            throw Error("Invalid stream object -- no dict");
        }
        let result_dict = {};
        ObjectUtil.extractDictValueRec(data, 0, result_dict);
        ret_obj.value = result_dict;
        if (result_dict["/Filter"] && Array.isArray(result_dict["/Filter"]) && result_dict["/Filter"].length > 0)
            result_dict["/Filter"] = result_dict["/Filter"][0];
        // check if filter is supported
        if (!result_dict["/Filter"] || result_dict["/Filter"] !== "/FlateDecode")
            throw Error(`Unsupported stream filter: ${result_dict["/Filter"]} - Only supported filter is FlateDecode`);
        if (!result_dict["/Type"] || result_dict["/Type"] !== "/ObjStm")
            throw Error(`Invalid stream object type: ${result_dict["/Type"]}`);
        // extract the stream length
        let streamLength = result_dict["/Length"];
        // extract stream part
        let ptr_stream_data_start = util_1.Util.locateSequence(util_1.Util.STREAM, data) + util_1.Util.STREAM.length;
        ptr_stream_data_start = util_1.Util.skipDelimiter(data, ptr_stream_data_start);
        let ptr_stream_data_end = ptr_stream_data_start + streamLength;
        let stream = ObjectUtil.extractStreamData(data.slice(ptr_stream_data_start, ptr_stream_data_end), result_dict["/Filter"], ObjectUtil.translateDecodeParams(result_dict));
        if (!result_dict["/N"])
            throw Error("Invalid stream object -- no number of objects specified");
        if (!result_dict["/First"])
            throw Error("Invalid stream object -- no offset to the first objct specified");
        let streamReferences = ObjectUtil.extractStreamObjectTable(stream, result_dict["/N"], result_dict["/First"]);
        if (!streamReferences[object_id_to_extract])
            throw Error(`Object ${object_id_to_extract} not in stream object`);
        let result_obj = { id: { obj: object_id_to_extract, generation: 0 } };
        let stream_data = stream.getData();
        next = util_1.Util.readNextWord(stream_data, streamReferences[object_id_to_extract]);
        if (next.result && next.result[0] === util_1.Util.DICT_START[0]) { // object contains a dict
            let value = {};
            result_obj.pointer_stream_end = ObjectUtil.extractDictValueRec(stream_data, streamReferences[object_id_to_extract], value);
            result_obj.value = value;
            result_obj.stream = stream;
            result_obj.pointer_stream_start = streamReferences[object_id_to_extract];
        }
        else if (next.result && next.result[0] === util_1.Util.ARRAY_START[0]) { // object contains an array
            let lst = array_util_1.ArrayUtil.extractArray(stream_data, streamReferences[object_id_to_extract]);
            result_obj.value = lst.result;
            result_obj.stream = stream;
            result_obj.pointer_stream_start = streamReferences[object_id_to_extract];
        }
        else {
            throw Error(`Invalid stream object type - starting with: ${next.result}`);
        }
        return result_obj;
    }
    static translateDecodeParams(dict) {
        if (!dict.value)
            return undefined;
        if (!dict.value["/DecodeParms"])
            return undefined;
        if (!dict.value["/DecodeParms"]["/Columns"])
            return undefined;
        if (!dict.value["/DecodeParms"]["/Predictor"])
            return undefined;
        return { columns: dict.value["/DecodeParms"]["/Columns"], predictor: dict.value["/DecodeParms"]["/Predictor"] };
    }
    static extractStreamObjectTable(stream, number_of_obj, offset_first_obj) {
        let references = {};
        for (let i = 0; i < number_of_obj; ++i) {
            let obj_id = stream.getNumber();
            let pointer = stream.getNumber() + offset_first_obj;
            references[obj_id] = pointer;
        }
        return references;
    }
    static extractStreamData(streamData, compression, decodeParameters = undefined) {
        let stream = undefined;
        if (compression === '/FlateDecode') {
            stream = new stream_1.FlateStream(streamData, decodeParameters);
        }
        else {
            throw Error(`Unsupported stream filter: ${compression} - Only supported filter is FlateDecode (right now)`);
        }
        if (!stream)
            throw Error("Could not derive stream");
        return stream;
    }
}
exports.ObjectUtil = ObjectUtil;
ObjectUtil.i = 0;
//# sourceMappingURL=object-util.js.map