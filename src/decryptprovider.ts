import * as vscode from 'vscode';
import * as fs from 'fs';
import { decrypt } from 'gpg';

export default class DecryptProvider implements vscode.TextDocumentContentProvider {

  public provideTextDocumentContent(uri: vscode.Uri): Thenable<string> {
    return new Promise(async (resolve, reject) => {
      let somecheck = 'ok';
      if (somecheck === 'ok') {
        let content = this.getContent(uri);
        uri = uri.with({ scheme: 'file' });
        let args = ['--decrypt'];

        decrypt(content, args, (err: string, result: string) => {
          if (err) {
            reject(err);
          } else {
            resolve(result.toString());
          }
        });
      } else {
        return resolve('[decryption cancelled]');
      }
    });
  }

  getContent(uri: vscode.Uri): string {
    let filepath = '';
    let buffer: Buffer | undefined;

    if (uri.scheme === 'gpg-decrypt') {
      // remove the pseudo '.decrypted' extension, create new uri
      filepath = uri.with({ scheme: 'file' }).fsPath.slice(0, -'.decrypted'.length);
      buffer = fs.readFileSync(filepath);
    }

    return buffer !== undefined ? buffer.toString() : '';
  }
}
