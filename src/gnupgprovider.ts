import * as vscode from 'vscode';
import {
  promiseEncryptAsymBuffer,
  promiseEncryptSymBuffer,
  promiseDecryptBuffer,
  promiseListPublicKeys,
  promiseFilterKeys,
  promiseParseKeys,
  promiseKeysToQuickPickItems,
  promiseVerify
} from './gnupgpromises';
import { getContent } from './utils';
import { GnuPGKey } from './gnupgkey';

export default class GnuPGProvider implements vscode.TextDocumentContentProvider {
  public provideTextDocumentContent(uri: vscode.Uri): Thenable<string> {
    let newUri: vscode.Uri;
    switch (uri.authority) {
      case 'decrypt':
        newUri = uri.with({ scheme: 'file', authority: '', path: uri.fsPath.slice(0, -' - decrypted'.length) });
        return new Promise(async resolve => {
          getContent(newUri)
            .then(content => {
              return promiseDecryptBuffer(content);
            })
            .then(decrypted => {
              return resolve(decrypted.toString('utf8'));
            })
            .catch(err => resolve('GnuPG decryption failed !\r\n' + err));
        });

      case 'asymmetric':
        // uri.fsPath.slice(...) see launchGnuPGProviderEncryptAsym !!!
        newUri = uri.with({ scheme: 'file', authority: '', path: uri.fsPath.slice(0, -' - encrypted'.length) });
        return new Promise(async resolve => {
          getContent(newUri).then(content => {
            promiseListPublicKeys()
              .then(stdout => promiseParseKeys(stdout))
              .then(map => promiseFilterKeys(map, (k: GnuPGKey) => k.isValidToEncrypt))
              .then(keys => promiseKeysToQuickPickItems(keys))
              .then(quickpickitems =>
                vscode.window.showQuickPick(quickpickitems, { placeHolder: 'Select recipients ...', canPickMany: true })
              )
              .then(recipients => promiseEncryptAsymBuffer(content, recipients))
              .then(encrypted => {
                resolve(encrypted.toString('utf8'));
              })
              .catch(err => resolve('GnuPG encryption failed !\r\n' + err));
          });
        });

      case 'symmetric':
        // uri.fsPath.slice(...) see launchGnuPGProviderEncryptSymm !!!
        newUri = uri.with({ scheme: 'file', authority: '', path: uri.fsPath.slice(0, -' - encrypted'.length) });
        return new Promise(async resolve => {
          getContent(newUri).then(content => {
            promiseEncryptSymBuffer(content)
              .then(encrypted => {
                resolve(encrypted.toString('utf8'));
              })
              .catch(err => resolve('GnuPG encryption failed !\r\n' + err));
          });
        });

      case 'verify':
        newUri = uri.with({ scheme: 'file', authority: '', path: uri.fsPath.slice(0, -' - verified'.length) });
        return new Promise(async resolve => {
          promiseVerify(newUri)
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
