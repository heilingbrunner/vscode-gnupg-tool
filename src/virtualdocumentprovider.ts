import * as vscode from 'vscode';
import { promise_listRecipients, promise_readKeys, promise_KeysToText, promise_showSmartcard, promise_checkVersion } from './gnupgpromises';

export default class VirtualDocumentProvider implements vscode.TextDocumentContentProvider {

  public provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
    return this.getContent(uri);
  }

  getContent(uri: vscode.Uri): Promise<string> {
    switch (uri.path) {
      case '/GnuPG-Recipients':
        return this.listRecipients();
      case '/GnuPG-Smartcard':
        return this.showSmartcard();
      case '/GnuPG-Version':
        return this.showVersion();
      default:
        return new Promise((resolve, reject) => resolve('...'));
    }
  }

  listRecipients(): Promise<string> {
    return new Promise((resolve, reject) => {
      promise_listRecipients()
        .then(stdout => promise_readKeys(stdout))
        .then(keys => promise_KeysToText(keys))
        .then(recipients => {
          let content = 'GnuPG Recipients:\r\n';
          content += '\r\n';
          recipients.forEach(r => (content += '- ' + r.toString() + '\r\n'));
          resolve(content);
        })
        .catch(err => {
          resolve('GnuPG list recipients failed !\r\n' + err); //vscode.window.showErrorMessage('GnuPG list recipients failed ! ');
        });
    });
  }

  showSmartcard(): Promise<string> {
    return new Promise((resolve, reject) => {
      promise_showSmartcard()
        .then(stdout => resolve(stdout))
        .catch(err => {
          resolve('GnuPG show smartcard failed !\r\n' + err);
        });
    });
  }

  showVersion(): Promise<string> {
    return new Promise((resolve, reject) => {
      promise_checkVersion()
        .then(stdout => resolve(stdout))
        .catch(err => {
          resolve('GnuPG not available !\r\n' + err);
        });
    });
  }
}
