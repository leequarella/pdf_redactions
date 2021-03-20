import * as crypto from "crypto-js";
export declare type WordArray = crypto.lib.WordArray;
export declare class CryptoUtil {
    static PADDING_STRING: number[];
    /**
     * Transforms a uint8array into a crypto-js word array
     * */
    static convertToWordArray(arr: Uint8Array): WordArray;
    /**
     * Converts a given word array into a uint8 array
     * */
    static convertWordArrayToByteArray(arr: WordArray): Uint8Array;
    /**
     * Converts a number into a little endian byte array
     * */
    static convertNumberToLittleEndianByteArray(nbr: number): Uint8Array;
    /**
     * Returns the MD5 hash
     * */
    static MD5(data: WordArray | Uint8Array): WordArray;
    /**
     * Returns the MD5 hash as byte array
     * */
    static MD5AsByteArray(data: WordArray | Uint8Array): Uint8Array;
    /**
     * Returns the MD5 hash as hex string
     * */
    static MD5Hex(data: WordArray | Uint8Array): string;
    /**
     * Returns the RC4 encrypted data
     * */
    static RC4(data: WordArray | Uint8Array, key: WordArray | Uint8Array): WordArray;
    /**
     * Returns the RC4 encrypted data as hex string
     * */
    static RC4Hex(data: WordArray | Uint8Array, key: WordArray | Uint8Array): string;
    /**
     * Pads the provided password string
     * */
    static padPasswortString(password: Uint8Array | string): Uint8Array;
    /**
     * Xors every byte of the provided _byte_array with the value _k
     * */
    static xorBytes(_byte_array: Uint8Array, _k: number): WordArray;
}
