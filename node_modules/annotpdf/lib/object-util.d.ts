import { ObjectLookupTable, XRef } from './document-history';
/**
 * While the general Util class holds low level methods to navigate through the pdf data, the ObjectUtil
 * is purposefully build to extract complete objects. It returns those as json dictionaries.
 * */
export declare class ObjectUtil {
    static extractDictKeyRec(data: Uint8Array, ptr: number, dict: any): number;
    private static i;
    static extractDictValueRec(data: Uint8Array, ptr: number, dict: any, current_key?: string | undefined): number;
    /**
     * Locates the object start in case the ptr does not point correctly
     * */
    static locateObjectStart(data: Uint8Array, ptr: number): number;
    /**
     * Parses a PDF object and returns a dictionary containing its fields
     * */
    static extractObject(data: Uint8Array, xref: XRef | number, objectLookupTable?: ObjectLookupTable | undefined): any;
    private static extractStreamObject;
    private static translateDecodeParams;
    private static extractStreamObjectTable;
    private static extractStreamData;
}
