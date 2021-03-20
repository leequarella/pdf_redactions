export interface DecodeParameters {
    predictor: number;
    columns: number;
}
export declare class Stream {
    protected data: Uint8Array;
    private _ptr;
    constructor(data: Uint8Array);
    getData(): Uint8Array;
    getLength(): number;
    peekNBytes(n?: number, ptr?: number): Uint8Array;
    peekNBytesAsNumber(n?: number, ptr?: number): number;
    /**
     * reads the next 'n' bytes of position 'ptr' and returns its content as a number
     * */
    getNBytesAsNumber(n?: number): number;
    /**
     * Reads the next byte from the stream
     * */
    getByte(): number;
    /**
     * Skips spaces and than adds as many bytes to the number until another space is reached
     * */
    getNumber(): number;
}
export declare class FlateStream extends Stream {
    protected data: Uint8Array;
    private decodeParameters;
    constructor(data: Uint8Array, decodeParameters?: DecodeParameters | undefined);
    private applyFilter;
    applyPNGFilter(data: Uint8Array, decodeParameters: DecodeParameters): Uint8Array;
    /**
     * Computes the path predictor of the given byets
     * */
    private paethPredictor;
}
