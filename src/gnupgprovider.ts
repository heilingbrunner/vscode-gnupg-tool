import * as vscode from 'vscode';
import * as fs from 'fs';
import { promise_decrypt, promise_listRecipients, promise_readKeys, promise_RecipientsToOptions, promise_encrypt } from './gnupgpromises';
import { getContent } from './utils';

export default class GnuPGProvider implements vscode.TextDocumentContentProvider {
  public provideTextDocumentContent(uri: vscode.Uri): Thenable<string> {
    let newUri: vscode.Uri;
    switch(uri.authority){
      case 'decrypt':
        newUri = uri.with({ scheme: 'file', authority:'', path: uri.fsPath.slice(0, -'.decrypted'.length)});
        return new Promise(async (resolve, reject) => {
          getContent(newUri)
            .then(content => {
              return promise_decrypt(content);
            })
            .then(decrypted => {
              return resolve(decrypted.toString('utf8'));
            })
            .catch(err => resolve('GnuPG decryption failed !\r\n' + err));
        });
        
      case 'encrypt':
        newUri = uri.with({ scheme: 'file', authority:'', path: uri.fsPath.slice(0, -'.asc'.length)});
        return new Promise(async (resolve, reject) => {
          getContent(newUri).then(content => {
            promise_listRecipients()
              .then(stdout => promise_readKeys(stdout))
              .then(keys => promise_RecipientsToOptions(keys))
              .then(options =>
                vscode.window.showQuickPick(options, { placeHolder: 'Select recipients ...', canPickMany: true })
              )
              .then(recipients => promise_encrypt(content, recipients))
              .then(encrypted => {
                resolve(encrypted.toString('utf8'));
              })
              .catch(err => resolve('GnuPG encryption failed !\r\n' + err));
          });
        });

        default:
          return new Promise((resolve, reject) =>{ resolve('.');});
    }
    
  }

  // static getContent(filepath: string): Promise<Buffer> {
  //   return new Promise((resolve, reject) => {
  //     fs.readFile(filepath, (err, buffer) => {
  //       if (err) {
  //         reject(err);
  //       } else {
  //         resolve(buffer);
  //       }
  //     });
  //   });
  // }
}
