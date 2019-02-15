import * as vscode from 'vscode';
import {
  promise_listPublicKeys,
  promise_parseKeys,
  promise_KeysToText,
  promise_showSmartcard,
  promise_checkVersion,
  promise_listPrivateKeys,
  promise_verify
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
      promise_listPublicKeys()
        .then(stdout => promise_parseKeys(stdout))
        .then(keys => promise_KeysToText(keys))
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
      promise_listPrivateKeys()
        .then(stdout => promise_parseKeys(stdout))
        .then(keys => promise_KeysToText(keys))
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
      promise_showSmartcard()
        .then(stdout => resolve(stdout))
        .catch(err => {
          resolve(new Buffer('GnuPG show smartcard failed !\r\n' + err));
        });
    });
  }

  showVersion(): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      promise_checkVersion()
        .then(stdout => resolve(stdout))
        .catch(err => {
          resolve(new Buffer('GnuPG not available !\r\n' + err));
        });
    });
  }

  showVerification(uri: vscode.Uri): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      promise_verify(uri)
        .then(stdout => resolve(stdout))
        .catch(err => {
          resolve(new Buffer('GnuPG not available !\r\n' + err));
        });
    });
  }
}
