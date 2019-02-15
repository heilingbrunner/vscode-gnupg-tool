import * as vscode from 'vscode';
import {
  promise_decrypt,
  promise_listPublicKeys,
  promise_parseKeys,
  promise_KeysToOptions,
  promise_encrypt,
  promise_verify
} from './gnupgpromises';
import { getContent } from './utils';

export default class GnuPGProvider implements vscode.TextDocumentContentProvider {
  public provideTextDocumentContent(uri: vscode.Uri): Thenable<string> {
    let newUri: vscode.Uri;
    switch (uri.authority) {
      case 'decrypt':
        newUri = uri.with({ scheme: 'file', authority: '', path: uri.fsPath.slice(0, -' - decrypted'.length) });
        return new Promise(async resolve => {
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
        newUri = uri.with({ scheme: 'file', authority: '', path: uri.fsPath.slice(0, -' - encrypted'.length) });
        return new Promise(async resolve => {
          getContent(newUri).then(content => {
            promise_listPublicKeys()
              .then(stdout => promise_parseKeys(stdout))
              .then(keys => promise_KeysToOptions(keys))
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

      case 'verify':
        newUri = uri.with({ scheme: 'file', authority: '', path: uri.fsPath.slice(0, -' - verified'.length) });
        return new Promise(async resolve => {
          promise_verify(newUri)
            .then(verification => {
              return resolve('GnuPG verification:\r\n' + verification.toString('utf8'));
            })
            .catch(err => resolve('GnuPG verification failed !\r\n' + err));
        });

      default:
        return new Promise(resolve => {
          resolve('.');
        });
    }
  }
}
