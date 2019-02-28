import * as vscode from 'vscode';
import {
  promiseListPublicKeys,
  promiseParseKeys,
  promiseKeysToText,
  promiseShowSmartcard,
  promiseCheckVersion,
  promiseListPrivateKeys,
  promiseVerify
} from './gnupgpromises';

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
    return new Promise((resolve, reject) => {
      promiseListPublicKeys()
        .then(stdout => promiseParseKeys(stdout))
        .then(keys => promiseKeysToText(keys))
        .then(recipients => {
          let content = 'GnuPG Public Keys:\r\n';
          content += '\r\n';
          recipients.forEach(r => (content += '- ' + r.toString() + '\r\n'));
          resolve(new Buffer(content));
        })
        .catch(err => {
          resolve(new Buffer('GnuPG list public keys failed !\r\n' + err)); //vscode.window.showErrorMessage('GnuPG list recipients failed ! ');
        });
    });
  }

  listPrivateKeys(): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      promiseListPrivateKeys()
        .then(stdout => promiseParseKeys(stdout))
        .then(keys => promiseKeysToText(keys))
        .then(recipients => {
          let content = 'GnuPG Private Keys:\r\n';
          content += '\r\n';
          recipients.forEach(r => (content += '- ' + r.toString() + '\r\n'));
          resolve(new Buffer(content));
        })
        .catch(err => {
          resolve(new Buffer('GnuPG list private keys failed !\r\n' + err)); //vscode.window.showErrorMessage('GnuPG list recipients failed ! ');
        });
    });
  }

  showSmartcard(): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      promiseShowSmartcard()
        .then(stdout => resolve(stdout))
        .catch(err => {
          resolve(new Buffer('GnuPG show smartcard failed !\r\n' + err));
        });
    });
  }

  showVersion(): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      promiseCheckVersion()
        .then(stdout => resolve(stdout))
        .catch(err => {
          resolve(new Buffer('GnuPG not available !\r\n' + err));
        });
    });
  }

  showVerification(uri: vscode.Uri): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      promiseVerify(uri)
        .then(stdout => resolve(stdout))
        .catch(err => {
          resolve(new Buffer('GnuPG not available !\r\n' + err));
        });
    });
  }
}
