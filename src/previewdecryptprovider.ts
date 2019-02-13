import * as vscode from 'vscode';
import * as fs from 'fs';
import { promise_decrypt } from './gnupgpromises';

export default class PreviewDecryptProvider implements vscode.TextDocumentContentProvider {
  public provideTextDocumentContent(uri: vscode.Uri): Thenable<string> {
    return new Promise(async (resolve, reject) => {
      PreviewDecryptProvider.getContent(uri)
        .then(content => {
          return promise_decrypt(content);
        })
        .then(decrypted => {
          return resolve(decrypted.toString('utf8'));
        })
        .catch(err => resolve('GnuPG decryption failed !\r\n' + err));
    });
  }

  static getContent(uri: vscode.Uri): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      if (uri.scheme === 'gpg-preview-decrypt') {
        // remove the pseudo '.decrypted' extension, create new uri
        const filepath = uri.with({ scheme: 'file' }).fsPath.slice(0, -'.decrypted'.length);

        fs.readFile(filepath, (err, buffer) => {
          if (err) {
            reject(err);
          } else {
            resolve(buffer);
          }
        });
      } else {
        resolve(new Buffer('.'));
      }
    });
  }
}
