import { ExtractionResult } from './util';
/**
 * Holds the logic for extracting arrays
 * */
export declare class ArrayUtil {
    /**
     * Extracts array of numbers and arrays of references
     *
     * The function supports arbitrarily nesting of arrays and multiple types.
     * */
    static extractArray(data: Uint8Array, ptr: number): ExtractionResult;
}
