import * as vscode from 'vscode';
import * as fs from 'fs';
import { encrypt } from 'gpg';
import {
  promise_listRecipients,
  promise_readKeys,
  promise_RecipientsToOptions,
  promise_encrypt
} from './gnupgpromises';

export default class EncryptProvider implements vscode.TextDocumentContentProvider {

  public provideTextDocumentContent(uri: vscode.Uri): Thenable<string> {
    return new Promise(async (resolve, reject) => {
      let check = 'ok';
      if (check === 'ok') {
        let content = this.getContent(uri);
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
          .catch(err => resolve('GnuPG encryption failed !' + err));
      } else {
        return resolve('(encryption cancelled.)');
      }
    });
  }

  getContent(uri: vscode.Uri): string {
    let filepath = '';
    let buffer: Buffer | undefined;

    if (uri.scheme === 'gpg-encrypt') {
      // remove the pseudo '.asc' extension, create new uri
      filepath = uri.with({ scheme: 'file' }).fsPath.slice(0, -'.asc'.length);
      buffer = fs.readFileSync(filepath);
    }

    return buffer !== undefined ? buffer.toString() : '';
  }
}
