import * as vscode from 'vscode';
import {
  promiseListPublicKeys,
  promiseParseKeys,
  promiseKeysToText,
  promiseShowSmartcard,
  promiseCheckVersion,
  promiseListSecretKeys,
  promiseVerify
} from './gnupgpromises';
import { i18n } from './i18n';
import { GnuPGParameters } from './gnupgparameters';

export default class VirtualDocumentProvider implements vscode.TextDocumentContentProvider {
  public async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
    const buffer = await this.getContent(uri);
    return buffer.toString('ascii');
  }

  getContent(uri: vscode.Uri): Promise<Buffer> {
    switch (uri.path) {
      case '/GnuPG-Public-Keys':
        return this.listPublicKeys();
      case '/GnuPG-Private-Keys':
        return this.listPrivateKeys();
      case '/GnuPG-Smartcard':
        return this.showSmartcard();
      case '/GnuPG-Version':
        return this.showVersion();
      case '/GnuPG-Verification':
        return this.showVerification(uri);
      default:
        return new Promise((resolve, reject) => resolve(new Buffer('...')));
    }
  }

  listPublicKeys(): Promise<Buffer> {
    return new Promise((resolve) => {
      promiseListPublicKeys()
        .then(stdout => promiseParseKeys(stdout))
        .then(keys => promiseKeysToText(keys))
        .then(recipients => {
          let content = i18n().GnuPGPublicKey + (GnuPGParameters.homedir ? ' [homedir=' + GnuPGParameters.homedir + ']': '') + ':\r\n';
          content += '\r\n';
          recipients.forEach(r => (content += '- ' + r.toString() + '\r\n'));
          resolve(new Buffer(content));
        })
        .catch(err => {
          resolve(new Buffer(i18n().GnuPGListPublicKeysFailed + '\r\n' + err));
        });
    });
  }

  listPrivateKeys(): Promise<Buffer> {
    return new Promise((resolve) => {
      promiseListSecretKeys()
        .then(stdout => promiseParseKeys(stdout))
        .then(keys => promiseKeysToText(keys))
        .then(recipients => {
          let content = i18n().GnuPGSecretKey + (GnuPGParameters.homedir ? ' [homedir=' + GnuPGParameters.homedir + ']': '') + ':\r\n';
          content += '\r\n';
          recipients.forEach(r => (content += '- ' + r.toString() + '\r\n'));
          resolve(new Buffer(content));
        })
        .catch(err => {
          resolve(new Buffer(i18n().GnuPGListSecretKeysFailed + '\r\n' + err));
        });
    });
  }

  showSmartcard(): Promise<Buffer> {
    return new Promise((resolve) => {
      promiseShowSmartcard()
        .then(stdout => resolve(stdout))
        .catch(err => {
          resolve(new Buffer(i18n().GnuPGShowSmartcardFailed + '\r\n' + err));
        });
    });
  }

  showVersion(): Promise<Buffer> {
    return new Promise((resolve) => {
      promiseCheckVersion()
        .then(stdout => resolve(stdout))
        .catch(err => {
          resolve(new Buffer(i18n().GnuPGNotAvailable + '\r\n' + err));
        });
    });
  }

  showVerification(uri: vscode.Uri): Promise<Buffer> {
    return new Promise((resolve) => {
      promiseVerify(uri)
        .then(stdout => resolve(stdout))
        .catch(err => {
          resolve(new Buffer(i18n().GnuPGNotAvailable + '\r\n' + err));
        });
    });
  }
}
