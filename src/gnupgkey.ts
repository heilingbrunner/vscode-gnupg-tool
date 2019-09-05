import { GnuPGGlobal } from "./gnupgglobal";

export class GnuPGKey {
  keyId = '';
  expiration = '';
  capabilities = '';
  fingerprint = '';
  validity = '';

  private _userIds: string[] = [];
  get userIds(): string[] {
    return this._userIds;
  }

  get isDisabled(): boolean {
    return this.capabilities.match(/d/i) !== null;
  }

  get isknown(): boolean {
    return /[mfuws]/.test(this.validity);
  }

  get canSign(): boolean {
    return this.capabilities.match(/s/i) !== null;
  }

  get canCertify(): boolean {
    return this.capabilities.match(/c/i) !== null;
  }

  get canEncrypt(): boolean {
    return this.capabilities.match(/e/i) !== null;
  }

  get isValidToEncrypt(): boolean {
    switch (GnuPGGlobal.majorVersion) {
      case 1:
        return !this.isDisabled && this.canEncrypt;
      case 2:
        return !this.isDisabled && this.canEncrypt && this.isknown;
      default:
        return false;
    }
  }

  get isValidToSign(): boolean {
    switch (GnuPGGlobal.majorVersion) {
      case 1:
        return !this.isDisabled;
      case 2:
        return !this.isDisabled && this.canSign && this.isknown;
      default:
        return false;
    }
  }

  addUserId(userId: string) {
    this._userIds.push(userId);
  }

  static getUserIdDetails(userId: string): { name: string; email: string } {
    const match = userId.match(/(.*)\s*<(.*)>/);
    if (match && match.length === 3) {
      return { name: match[1].trim(), email: match[2].trim() };
    }

    return { name: '?', email: '?' };
  }

  get validityDescription(): string {
    let desc = '';

    switch (this.validity) {
      case 'o':
        desc += 'unknown';
        break;
      case 'i':
        desc += 'invalid';
        break;
      case 'd':
        desc += 'disabled';
        break;
      case 'r':
        desc += 'revoked';
        break;
      case 'e':
        desc += 'expired';
        break;
      case '-':
        desc += 'unknown';
        break;
      case 'q':
        desc += 'undefined';
        break;
      case 'n':
        desc += 'not valid';
        break;
      case 'm':
        desc += 'marginal valid';
        break;
      case 'f':
        desc += 'fully valid';
        break;
      case 'u':
        desc += 'ultimately valid';
        break;
      case 'w':
        desc += 'well known private part';
        break;
      case 's':
        desc += 'special validity';
        break;
    }

    desc += ' (' + this.validity + ')';
    return desc;
  }

  toString() {
    return this.keyId + ': ' + this.userIds.join(',') + ', [' + (this.isDisabled ? 'D' : (this.canSign ? 'S' : '') + (this.canCertify ? 'C' : '') + (this.canEncrypt ? 'E' : '')) + '], ' + this.validityDescription;
  }
}
