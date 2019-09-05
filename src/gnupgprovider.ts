import * as vscode from 'vscode';
import { GnuPGKey } from './gnupgkey';
import { i18n } from './i18n';
import {
  parseKeys,
  asyncDecryptBuffer,
  asyncEncryptAsymBuffer,
  asyncEncryptSymBuffer,
  asyncListPublicKeys,
  asyncVerify
} from './gnupglib';
import {
  filterKeys,
  getContent,
  keysToQuickPickItems
} from './utils';

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
          try {
            const content = await getContent(newUri);
            const decrypted = await asyncDecryptBuffer(content);
            resolve(decrypted.toString('utf8'));
          } catch (err) {
            resolve(i18n().GnuPGDecryptionFailed + '\r\n' + err);
          }
        });

      case 'asymmetric':
        // uri.fsPath.slice(...) see launchGnuPGProviderEncryptAsym !!!
        newUri = uri.with({
          scheme: 'file',
          authority: '',
          path: uri.fsPath.slice(0, -(' - ' + i18n().Encrypted).length)
        });
        return new Promise(async (resolve, reject) => {
          try {
            const content = await getContent(newUri);
            const stdout = await asyncListPublicKeys();
            const map = parseKeys(stdout);
            const keys = filterKeys(map, (k: GnuPGKey) => k.isValidToEncrypt);
            const quickpickitems = keysToQuickPickItems(keys);
            const recipients = await vscode.window.showQuickPick(quickpickitems, {
              placeHolder: i18n().SelectRecipients,
              canPickMany: true
            });

            if (recipients && recipients.length > 0) {
              const encrypted = await asyncEncryptAsymBuffer(content, recipients);
              resolve(encrypted.toString('utf8'));
            } else {
              reject(i18n().GnuPGNoRecipientsSelectedForEncryption);
            }
          } catch (err) {
            resolve(i18n().GnuPGEncryptionFailed + '\r\n' + err);
          }
        });

      case 'symmetric':
        // uri.fsPath.slice(...) see launchGnuPGProviderEncryptSymm !!!
        newUri = uri.with({
          scheme: 'file',
          authority: '',
          path: uri.fsPath.slice(0, -(' - ' + i18n().Encrypted).length)
        });
        return new Promise(async resolve => {
          try {
            const content = await getContent(newUri);
            const encrypted = await asyncEncryptSymBuffer(content);

            resolve(encrypted.toString('utf8'));
          } catch (err) {
            resolve(i18n().GnuPGEncryptionFailed + '\r\n' + err);
          }
        });

      case 'verify':
        newUri = uri.with({
          scheme: 'file',
          authority: '',
          path: uri.fsPath.slice(0, -(' - ' + i18n().Verified).length)
        });
        return new Promise(async resolve => {
          try {
            const verification = await asyncVerify(newUri);

            resolve(i18n().GnuPGVerfication + ':\r\n' + verification);
          } catch (err) {
            resolve(i18n().GnuPGVerficationFailed + '\r\n' + err);
          }
        });

      default:
        return new Promise(resolve => {
          resolve('.');
        });
    }
  }
}
