import { ReferencePointer } from './parser';
export declare const RC4_40_BIT: boolean;
export interface CryptoConfiguration {
    version: number | undefined;
    revision: number | undefined;
    filter: string | undefined;
    user_pwd_c: Uint8Array | undefined;
    owner_pwd_c: Uint8Array | undefined;
    length: number | undefined;
    permissions: number | undefined;
    user_pwd: string;
    owner_pwd: string;
}
export interface CryptoEngine {
    encrypt(data: Uint8Array, reference: ReferencePointer | undefined): Uint8Array;
    decrypt(data: Uint8Array, reference: ReferencePointer | undefined): Uint8Array;
    isUserPasswordCorrect(): boolean;
    isOwnerPasswordCorrect(): boolean;
}
export declare class IdentityEngine implements CryptoEngine {
    encrypt(data: Uint8Array, reference: ReferencePointer | undefined): Uint8Array;
    decrypt(data: Uint8Array, reference: ReferencePointer | undefined): Uint8Array;
    isUserPasswordCorrect(): boolean;
    isOwnerPasswordCorrect(): boolean;
}
export declare class RC4CryptoEngine implements CryptoEngine {
    private cryptoConfiguration;
    private file_id;
    private rc4_40_bit;
    private encryptionKey;
    private computed_user_password;
    private computed_owner_password;
    constructor(cryptoConfiguration: CryptoConfiguration, file_id: Uint8Array[] | undefined, rc4_40_bit?: boolean);
    encrypt(data: Uint8Array, reference: ReferencePointer | undefined): Uint8Array;
    decrypt(data: Uint8Array, reference: ReferencePointer | undefined): Uint8Array;
    /**
     * Computes the RC4 encryption key
     * */
    computeEncryptionKey(): Uint8Array;
    /**
     * Derives the user password (/U) value
     * */
    computeUserPassword(): Uint8Array;
    /**
     * Computes the user password for security handlers of revision 2
     * */
    computeUserPasswordRevision2(): Uint8Array;
    /**
     * Computes the user password for security handlers of revision 3 or higher
     * */
    computeUserPasswordRevision3OrGreater(): Uint8Array;
    /**
     * Derives the owner password (/O) value
     **/
    computeOwnerPassword(): Uint8Array;
    /**
     * Returns true if the provided password corresponds to the defined /U value
     * */
    isUserPasswordCorrect(): boolean;
    /**
     * Returns true if the provided password corresponds to the defined /O value
     * */
    isOwnerPasswordCorrect(): boolean;
}
