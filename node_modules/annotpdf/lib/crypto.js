"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
const crypto_util_1 = require("./crypto-util");
exports.RC4_40_BIT = true;
class IdentityEngine {
    encrypt(data, reference) {
        return data;
    }
    decrypt(data, reference) {
        return data;
    }
    isUserPasswordCorrect() {
        return true;
    }
    isOwnerPasswordCorrect() {
        return true;
    }
}
exports.IdentityEngine = IdentityEngine;
class RC4CryptoEngine {
    constructor(cryptoConfiguration, file_id, rc4_40_bit = false) {
        this.cryptoConfiguration = cryptoConfiguration;
        this.file_id = file_id;
        this.rc4_40_bit = rc4_40_bit;
        this.encryptionKey = undefined;
        this.computed_user_password = undefined;
        this.computed_owner_password = undefined;
    }
    encrypt(data, reference) {
        if (!reference)
            throw Error("Undefined reference pointer of encrypted object");
        let encryptionKey = this.computeEncryptionKey();
        let adapted_key = new Uint8Array(encryptionKey.length + 5);
        adapted_key.set(encryptionKey, 0);
        let obj = crypto_util_1.CryptoUtil.convertNumberToLittleEndianByteArray(reference.obj);
        adapted_key.set(obj.slice(0, 3), encryptionKey.length);
        let gen = crypto_util_1.CryptoUtil.convertNumberToLittleEndianByteArray(reference.generation);
        adapted_key.set(gen.slice(0, 2), encryptionKey.length + 3);
        let key_hash = crypto_util_1.CryptoUtil.MD5AsByteArray(adapted_key);
        let encrypted = crypto_util_1.CryptoUtil.RC4(data, key_hash.slice(0, Math.min(encryptionKey.length + 5, 16)));
        return crypto_util_1.CryptoUtil.convertWordArrayToByteArray(encrypted);
    }
    decrypt(data, reference) {
        return this.encrypt(data, reference);
    }
    /**
     * Computes the RC4 encryption key
     * */
    computeEncryptionKey() {
        if (this.encryptionKey)
            return this.encryptionKey;
        let userpwd = crypto_util_1.CryptoUtil.padPasswortString(this.cryptoConfiguration.user_pwd);
        if (!this.cryptoConfiguration.owner_pwd_c)
            throw Error("Invalid /O value (owner password)");
        let oValue = this.cryptoConfiguration.owner_pwd_c;
        if (oValue.length !== 32)
            throw Error(`Invalid length of owner value. Is ${oValue.length} but must be 32.`);
        if (!this.cryptoConfiguration.permissions)
            throw Error("Permissions not set");
        let permissions = crypto_util_1.CryptoUtil.convertNumberToLittleEndianByteArray(this.cryptoConfiguration.permissions);
        if (!this.file_id || this.file_id.length === 0)
            throw Error("File ID not set");
        let keylength = 40;
        if (this.cryptoConfiguration.length)
            keylength = this.cryptoConfiguration.length;
        let file_id = this.file_id[0];
        let stuff = new Uint8Array(userpwd.length + oValue.length + permissions.length + file_id.length);
        stuff.set(userpwd, 0);
        stuff.set(oValue, userpwd.length);
        stuff.set(permissions, userpwd.length + oValue.length);
        stuff.set(file_id, userpwd.length + oValue.length + permissions.length);
        let h = crypto_util_1.CryptoUtil.MD5AsByteArray(stuff);
        keylength = keylength >> 3;
        if (this.cryptoConfiguration.revision && this.cryptoConfiguration.revision >= 3) {
            for (let i = 0; i < 50; ++i) {
                h = crypto_util_1.CryptoUtil.MD5AsByteArray(h.slice(0, keylength));
            }
        }
        if (this.rc4_40_bit) {
            this.encryptionKey = h.slice(0, 5);
        }
        else {
            this.encryptionKey = h;
        }
        return this.encryptionKey;
    }
    /**
     * Derives the user password (/U) value
     * */
    computeUserPassword() {
        if (this.computed_user_password)
            return this.computed_user_password;
        if (this.cryptoConfiguration.revision && this.cryptoConfiguration.revision >= 3) {
            return this.computeUserPasswordRevision3OrGreater();
        }
        else if (this.cryptoConfiguration.revision === 2) {
            return this.computeUserPasswordRevision2();
        }
        return new Uint8Array([]);
    }
    /**
     * Computes the user password for security handlers of revision 2
     * */
    computeUserPasswordRevision2() {
        let padding_str = new Uint8Array(crypto_util_1.CryptoUtil.PADDING_STRING);
        let enc_key = this.computeEncryptionKey();
        let x = crypto_util_1.CryptoUtil.RC4(padding_str, enc_key);
        this.computed_user_password = crypto_util_1.CryptoUtil.convertWordArrayToByteArray(x);
        return this.computed_user_password;
    }
    /**
     * Computes the user password for security handlers of revision 3 or higher
     * */
    computeUserPasswordRevision3OrGreater() {
        if (!this.file_id)
            throw Error("No file id");
        let id_str_array = this.file_id[0];
        let new_val = new Uint8Array(crypto_util_1.CryptoUtil.PADDING_STRING.length + id_str_array.length);
        new_val.set(crypto_util_1.CryptoUtil.PADDING_STRING, 0);
        new_val.set(id_str_array, crypto_util_1.CryptoUtil.PADDING_STRING.length);
        let x = crypto_util_1.CryptoUtil.MD5(new_val);
        let enc_key = this.computeEncryptionKey();
        for (let i = 0; i < 20; ++i) {
            x = crypto_util_1.CryptoUtil.RC4(x, crypto_util_1.CryptoUtil.xorBytes(enc_key, i));
        }
        this.computed_user_password = crypto_util_1.CryptoUtil.convertWordArrayToByteArray(x);
        return this.computed_user_password;
    }
    /**
     * Derives the owner password (/O) value
     **/
    computeOwnerPassword() {
        if (this.computed_owner_password)
            return this.computed_owner_password;
        let pwd_string = this.cryptoConfiguration.owner_pwd;
        // if no owner password is set, but a user password use this
        if (!this.cryptoConfiguration.owner_pwd || this.cryptoConfiguration.owner_pwd === "")
            pwd_string = this.cryptoConfiguration.user_pwd;
        let ownerpwd = crypto_util_1.CryptoUtil.padPasswortString(pwd_string);
        let h = crypto_util_1.CryptoUtil.MD5(ownerpwd);
        let count = 1;
        if (this.cryptoConfiguration.revision && this.cryptoConfiguration.revision >= 3) {
            count = 20;
            for (let i = 0; i < 50; ++i) {
                h = crypto_util_1.CryptoUtil.MD5(h);
            }
        }
        let length = 128;
        if (this.cryptoConfiguration.length)
            length = this.cryptoConfiguration.length;
        let enc_key = crypto_util_1.CryptoUtil.convertWordArrayToByteArray(h).slice(0, length / 8);
        let userpwd = crypto_util_1.CryptoUtil.padPasswortString(this.cryptoConfiguration.user_pwd);
        let x = crypto_util_1.CryptoUtil.convertToWordArray(userpwd);
        for (let i = 0; i < count; ++i) {
            x = crypto_util_1.CryptoUtil.RC4(x, crypto_util_1.CryptoUtil.xorBytes(enc_key, i));
        }
        this.computed_owner_password = crypto_util_1.CryptoUtil.convertWordArrayToByteArray(x);
        return this.computed_owner_password;
    }
    /**
     * Returns true if the provided password corresponds to the defined /U value
     * */
    isUserPasswordCorrect() {
        let user_pwd = this.computeUserPassword();
        if (!this.cryptoConfiguration.user_pwd_c)
            throw Error("Invalid /U value (user password)");
        if (this.cryptoConfiguration.revision && this.cryptoConfiguration.revision >= 3) {
            return util_1.Util.areArraysEqual(user_pwd, this.cryptoConfiguration.user_pwd_c.slice(0, 16));
        }
        else {
            return util_1.Util.areArraysEqual(user_pwd, this.cryptoConfiguration.user_pwd_c);
        }
    }
    /**
     * Returns true if the provided password corresponds to the defined /O value
     * */
    isOwnerPasswordCorrect() {
        let owner_pwd = this.computeOwnerPassword();
        if (!this.cryptoConfiguration.owner_pwd_c)
            throw Error("Invalid /O value (owner password)");
        return util_1.Util.areArraysEqual(owner_pwd, this.cryptoConfiguration.owner_pwd_c);
    }
}
exports.RC4CryptoEngine = RC4CryptoEngine;
//# sourceMappingURL=crypto.js.map