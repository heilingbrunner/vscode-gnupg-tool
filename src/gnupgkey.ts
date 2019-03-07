import { QuickPickItem } from 'vscode';

export class GnuPGKey {
  keyId = '';
  expiration = '';
  capabilities = '';
  fingerprint = '';
  validity = '';

  private _userId: string[] = [];
  // private _name = '';
  // private _email = '';

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
    return !this.isDisabled && this.canEncrypt && this.isknown;
  }

  get isValidToSign(): boolean {
    return !this.isDisabled && this.canSign && this.isknown;
  }

  // get userId(): string {
  //   return this._userId;
  // }
  // set userId(userId: string) {
  //   this._userId = userId;

  //   const match = this.userId.match(/(.*)\s*<(.*)>/);
  //   if (match && match.length === 3) {
  //     this._name = match[1].trim();
  //     this._email = match[2].trim();
  //   }
  // }

  // get name(): string {
  //   return this._name;
  // }

  // get email(): string {
  //   return this._email;
  // }

  addUserId(userId: string) {
    this._userId.push(userId);
  }

  getUserIds(rn?: Boolean): string{
    let uids = '';
    if(this._userId.length > 0){
      this._userId.forEach(uid => {
        (rn && rn === false) ? uids += uid + ', ': uids += uid + ',\r\n';
      });
      // cut off last ', '
      uids = uids.slice(0,-2);
    }
    return uids;
  }

  static getUserDetails(userId: string): {name: string; email: string}{
    const match = userId.match(/(.*)\s*<(.*)>/);
    if (match && match.length === 3) {
      return { name:match[1].trim(), email: match[2].trim()};
    }

    return { name: '?', email: '?'};
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
    return this.keyId + ': ' + this.getUserIds() + ', [' + (this.isDisabled?'D':(this.canSign?'S':'') + (this.canCertify?'C':'') + (this.canEncrypt?'E':'')) + '], ' + this.validityDescription;
  }
}
