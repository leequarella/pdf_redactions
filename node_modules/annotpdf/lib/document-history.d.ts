import { ReferencePointer } from './parser';
import { Stream } from './stream';
export interface XRef {
    id: number;
    pointer: number;
    generation: number;
    free: boolean;
    update: boolean;
    compressed?: boolean;
}
interface SubSectionHeader {
    id: number;
    count: number;
    end_ptr: number;
}
interface Trailer {
    size: number;
    root: ReferencePointer;
    prev?: number;
    is_encrypted: boolean;
    encrypt?: ReferencePointer;
    id?: Uint8Array[];
}
export interface ObjectLookupTable {
    [id: number]: XRef;
}
export interface UpdateSection {
    start_pointer: number;
    size: number;
    refs: XRef[];
    prev?: number;
    root?: ReferencePointer;
    is_encrypted: boolean;
    encrypt?: ReferencePointer;
    id?: Uint8Array[];
}
/**
 * Holds the complete information of one update section in the Cross-Reference-Stream Object format.
 *
 * */
export declare class CrossReferenceStreamObject {
    private data;
    refs: XRef[];
    constructor(data: Uint8Array);
    trailer: Trailer;
    streamLength: number;
    w: number[];
    index: number[];
    private start_pointer;
    /**
     * Extracts a cross reference section that is a continuous definition of cross reference entries
     * */
    extractCrossReferenceSection(first_object_id: number, object_count: number, stream: Stream): void;
    /**
     * Extracts the cross-reference-table from the stream
     * */
    extractStream(stream: Stream): void;
    /**
     * Parses the Cross-Reference-Stream-Object at the given index
     * */
    extract(xref: XRef): void;
    /**
     * Returs the update section representing this CrossReferenceStreamObject
     * */
    getUpdateSection(): UpdateSection;
}
/**
 * Holds the complete information of one update section in the Cross-Reference-Table format. That comprises:
 * - the body update
 * - the crossiste reference table
 * - the trailer
 * */
export declare class CrossReferenceTable {
    private data;
    refs: XRef[];
    start_pointer: number;
    trailer: Trailer;
    constructor(data: Uint8Array);
    /**
     * Returns the reference with the given id
     * */
    getReference(id: number): XRef | undefined;
    /**
     * Returs the update section representing this CrossReferenceTable
     * */
    getUpdateSection(): UpdateSection;
    /**
     * Extracts the header of a sub section. For instance
     *
     * 0 1 // <--
     * ...
     *
     * So the obejct id 0 and the number of sub section entries 1
     * */
    extractSubSectionHeader(index: number): SubSectionHeader;
    /**
     * Extracts the references of a sub section. The index points to the start of
     * the first reference and count represents the number of references that are
     * contained in the subsection.
     *
     * The first_object_id is the id provided in the sub section header
     *
     * By definition of the PDF standard one entry is 20 bytes long, but since the standard is rarely respected we better make it failsafe
     * */
    extractReferences(index: number, count: number, first_object_id: number): {
        refs: XRef[];
        end_index: number;
    };
    /**
     * Extracts the trailer of the subsection that means the part stating with the 'trailer' keyword and
     * in particular the trailer dictionary
     * */
    extractTrailer(index: number): Trailer;
    /**
     * Parses the Cross Reference Table at the given index
     * */
    extract(index: number, skipXREFString?: boolean): void;
}
/**
 * Represents the complete PDF document history and therefore holds the
 * updated body parts, the crosssite references and the document trailers
 * */
export declare class DocumentHistory {
    private data;
    updates: UpdateSection[];
    trailerSize: number;
    /**
     * Holds object ids that were formerly freed and are now 'already' reused.
     * This is used to prevent a freed object a second time */
    private already_reused_ids;
    constructor(data: Uint8Array);
    /**
     * Extracts the cross reference table starting at the given index
     * */
    extractCrossReferenceTable(index: number, skipXREFString?: boolean): CrossReferenceTable;
    /**
     * Extracts the cross reference stream object starting at the given index
     * */
    extractCrossReferenceStreamObject(xref: XRef): CrossReferenceStreamObject;
    /**
     * Extracts the last update section of a document (that means
     * the most recent update locating at the end of the file)
     *
     * Handles missing or wrong pointers
     * and also decides, whether the cross reference table is provided as stream object or regular
     * */
    extractDocumentEntry(): {
        pointer: number;
        sectionType: string;
    };
    /**
     * Extracts the entire update sections
     *
     * Needs to adapt depending whether the document uses a cross-reference table or a cross-reference stream object
     * */
    extractDocumentHistory(): void;
    /**
     * Extracts the cross reference tables of the entire document
     * */
    extractCrossReferenceTables(document_entry: {
        pointer: number;
        sectionType: string;
    }, xref: XRef): void;
    /**
     * Counts the number of specified objects
     * */
    extractReferenceNumberCount(): number;
    /**
     * Primarily for clarification. The first element is the most recent. We parsed backwards.
     * */
    getRecentUpdate(): UpdateSection;
    /**
     * Indicates whether the PDF document is encrypted
     * */
    isEncrypted(): boolean;
    /**
     * By running through the PDf history we can for every object id determine the pointer address to the most recent version, and
     * whether the object id is still in used.
     *
     * So the object lookup table has an entry for every existing object id, a pointer to the the most recent object definition, as long
     * as the object exists, or an according indication otherwise.
     * */
    createObjectLookupTable(): ObjectLookupTable;
    /**
     * Returns the new object id. It primarily tries to reuse an existing id, but if no such exists it will return a
     * new one
     * */
    getFreeObjectId(): ReferencePointer;
}
export {};
