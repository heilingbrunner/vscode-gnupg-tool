import * as vscode from 'vscode';
import * as fs from 'fs';
import {
  promise_listRecipients,
  promise_readKeys,
  promise_RecipientsToOptions,
  promise_encrypt
} from './gnupgpromises';

export default class PreviewEncryptProvider implements vscode.TextDocumentContentProvider {
  public provideTextDocumentContent(uri: vscode.Uri): Thenable<string> {
    return new Promise(async (resolve, reject) => {
      PreviewEncryptProvider.getContent(uri).then(content => {
        promise_listRecipients()
          .then(stdout => promise_readKeys(stdout))
          .then(keys => promise_RecipientsToOptions(keys))
          .then(options =>
            vscode.window.showQuickPick(options, { placeHolder: 'Select recipients ...', canPickMany: true })
          )
          .then(recipients => promise_encrypt(content, recipients))
          .then(encrypted => {
            resolve(encrypted);
          })
          .catch(err => resolve('GnuPG encryption failed !\r\n' + err));
      });
    });
  }

  static getContent(uri: vscode.Uri): Promise<string> {
    return new Promise((resolve, reject) => {
      if (uri.scheme === 'gpg-preview-encrypt') {
        // remove the pseudo '.asc' extension, create new uri
        const filepath = uri.with({ scheme: 'file' }).fsPath.slice(0, -'.asc'.length);

        fs.readFile(filepath, (err, buffer) => {
          if (err) {
            reject(err);
          } else {
            resolve(buffer.toString());
          }
        });
      } else {
        resolve('.');
      }
    });
  }
}
