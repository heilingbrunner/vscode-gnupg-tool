import { QuickPickItem } from 'vscode';

export class GnuPGKey {
  keyId = '';
  expiration = '';
  capabilities = '';
  fingerprint = '';
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

  get name(): string {
    return this._name;
  }

  get email(): string {
    return this._email;
  }

  toString() {
    return this.keyId + ': ' + this.name + ' <' + this.email + '>';
  }
}
