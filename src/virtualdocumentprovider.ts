import * as vscode from 'vscode';
import { i18n } from './i18n';
import { GnuPGGlobal } from './gnupgglobal';
import { GnuPGKey } from './gnupgkey';
import {
  parseKeys,
  promiseCheckVersion,
  promiseListPublicKeys,
  promiseListSecretKeys,
  promiseShowSmartcard
} from './gnupglib';

export default class VirtualDocumentProvider implements vscode.TextDocumentContentProvider {
  public async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
    const buffer = await this.getContent(uri);
    return buffer.toString('ascii');
  }

  async getContent(uri: vscode.Uri): Promise<Buffer> {
    switch (uri.path) {
      case '/GnuPG-Public-Keys':
        return this.listPublicKeys();
      case '/GnuPG-Private-Keys':
        return this.listPrivateKeys();
      case '/GnuPG-Smartcard':
        return this.showSmartcard();
      case '/GnuPG-Version':
        return this.showVersion();
      default:
        return new Promise((resolve, reject) => resolve(new Buffer('...')));
    }
  }

  async listPublicKeys(): Promise<Buffer> {
    return new Promise<Buffer>(async resolve => {
      try {
        const stdout = await promiseListPublicKeys();
        const keys = parseKeys(stdout);
        const recipients = keysToText(keys);

        let content =
          i18n().GnuPGPublicKey +
          (GnuPGGlobal.homedir ? ' [homedir=' + GnuPGGlobal.homedir + ']' : '') +
          ':\r\n';
        content += '\r\n';
        recipients.forEach(r => (content += '- ' + r.toString() + '\r\n'));

        resolve(new Buffer(content));
      } catch (err) {
        resolve(new Buffer(i18n().GnuPGListPublicKeysFailed + '\r\n' + err));
      }
    });
  }

  async listPrivateKeys(): Promise<Buffer> {
    return new Promise<Buffer>(async resolve => {
      try {
        const stdout = await promiseListSecretKeys();
        const keys = parseKeys(stdout);
        const recipients = keysToText(keys);
        let content =
          i18n().GnuPGSecretKey +
          (GnuPGGlobal.homedir ? ' [homedir=' + GnuPGGlobal.homedir + ']' : '') +
          ':\r\n';
        content += '\r\n';
        recipients.forEach(r => (content += '- ' + r.toString() + '\r\n'));
        resolve(new Buffer(content));
      } catch (err) {
        resolve(new Buffer(i18n().GnuPGListSecretKeysFailed + '\r\n' + err));
      }
    });
  }

  async showSmartcard(): Promise<Buffer> {
    return new Promise<Buffer>(async resolve => {
      try {
        const stdout = await promiseShowSmartcard();
        resolve(stdout);
      } catch (err) {
        resolve(new Buffer(i18n().GnuPGShowSmartcardFailed + '\r\n' + err));
      }
    });
  }

  async showVersion(): Promise<Buffer> {
    return new Promise<Buffer>(async resolve => {
      try {
        const stdout = await promiseCheckVersion();
        resolve(stdout);
      } catch (err) {
        resolve(new Buffer(i18n().GnuPGNotAvailable + '\r\n' + err));
      }
    });
  }
}

function keysToText(keys: Map<string, GnuPGKey>): string[] {
  let recipients: string[] = [];

  keys.forEach(key => {
    recipients.push(key.toString());
  });

  return recipients;
}
