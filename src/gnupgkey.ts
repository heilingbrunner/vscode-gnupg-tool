import { QuickPickItem } from 'vscode';

export class GnuPGKey {
  keyId = '';
  expiration = '';
  capabilities = '';
  fingerprint = '';
  validity = '';

  private _userId = '';
  private _name = '';
  private _email = '';

  get canSign(): boolean {
    return this.capabilities.match(/s/i) !== null;
  }

  get canCertify(): boolean {
    return this.capabilities.match(/c/i) !== null;
  }

  get canEncrypt(): boolean {
    return this.capabilities.match(/e/i) !== null;
  }

  get userId(): string {
    return this._userId;
  }
  set userId(userId: string) {
    this._userId = userId;

    const match = this.userId.match(/(.*)\s*<(.*)>/);
    if (match && match.length === 3) {
      this._name = match[1].trim();
      this._email = match[2].trim();
    }
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

  get name(): string {
    return this._name;
  }

  get email(): string {
    return this._email;
  }

  toString() {
    return this.keyId + ': ' + this.name + ' <' + this.email + '>, ' + this.validityDescription;
  }
}
