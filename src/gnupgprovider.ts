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
import { i18n } from './i18n';

export default class GnuPGProvider implements vscode.TextDocumentContentProvider {
  public provideTextDocumentContent(uri: vscode.Uri): Thenable<string> {
    let newUri: vscode.Uri;
    switch (uri.authority) {
      case 'decrypt':
        newUri = uri.with({
          scheme: 'file',
          authority: '',
          path: uri.fsPath.slice(0, -(' - ' + i18n().Decrypted).length)
        });
        return new Promise(async resolve => {
          getContent(newUri)
            .then(content => {
              return promiseDecryptBuffer(content);
            })
            .then(decrypted => {
              return resolve(decrypted.toString('utf8'));
            })
            .catch(err => resolve(i18n().GnuPGDecryptionFailed + '\r\n' + err));
        });

      case 'asymmetric':
        // uri.fsPath.slice(...) see launchGnuPGProviderEncryptAsym !!!
        newUri = uri.with({
          scheme: 'file',
          authority: '',
          path: uri.fsPath.slice(0, -(' - ' + i18n().Encrypted).length)
        });
        return new Promise(async resolve => {
          getContent(newUri).then(content => {
            promiseListPublicKeys()
              .then(stdout => promiseParseKeys(stdout))
              .then(map => promiseFilterKeys(map, (k: GnuPGKey) => k.isValidToEncrypt))
              .then(keys => promiseKeysToQuickPickItems(keys))
              .then(quickpickitems =>
                vscode.window.showQuickPick(quickpickitems, {
                  placeHolder: i18n().SelectRecipients,
                  canPickMany: true
                })
              )
              .then(recipients => {
                if (recipients && recipients.length > 0) {
                  return promiseEncryptAsymBuffer(content, recipients);
                } else {
                  return new Promise<Buffer>((resolve, reject) => {
                    reject(i18n().GnuPGNoRecipientsSelectedForEncryption);
                  });
                }
              })
              .then(encrypted => {
                resolve(encrypted.toString('utf8'));
              })
              .catch(err => resolve(i18n().GnuPGEncryptionFailed + '\r\n' + err));
          });
        });

      case 'symmetric':
        // uri.fsPath.slice(...) see launchGnuPGProviderEncryptSymm !!!
        newUri = uri.with({
          scheme: 'file',
          authority: '',
          path: uri.fsPath.slice(0, -(' - ' + i18n().Encrypted).length)
        });
        return new Promise(async resolve => {
          getContent(newUri).then(content => {
            promiseEncryptSymBuffer(content)
              .then(encrypted => {
                resolve(encrypted.toString('utf8'));
              })
              .catch(err => resolve(i18n().GnuPGEncryptionFailed + '\r\n' + err));
          });
        });

      case 'verify':
        newUri = uri.with({
          scheme: 'file',
          authority: '',
          path: uri.fsPath.slice(0, -(' - ' + i18n().Verified).length)
        });
        return new Promise(async resolve => {
          promiseVerify(newUri)
            .then(verification => {
              return resolve(i18n().GnuPGVerfication + ':\r\n' + verification.toString('utf8'));
            })
            .catch(err => resolve(i18n().GnuPGVerficationFailed + '\r\n' + err));
        });

      default:
        return new Promise(resolve => {
          resolve('.');
        });
    }
  }
}
