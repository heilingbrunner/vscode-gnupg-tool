import * as vscode from 'vscode';
import {
  promiseListPublicKeys,
  // promiseParseKeys,
  // promiseKeysToText,
  promiseShowSmartcard,
  promiseCheckVersion,
  promiseListSecretKeys,
  // promiseVerify,
  parseKeys,
  keysToText
} from './gnupgpromises';
import { i18n } from './i18n';
import { GnuPGParameters } from './gnupgparameters';

export default class VirtualDocumentProvider implements vscode.TextDocumentContentProvider {
  public async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
    const buffer = await this.getContent(uri);
    return buffer.toString('ascii');
  }

  async getContent(uri: vscode.Uri): Promise<Buffer> {
    switch (uri.path) {
      case '/GnuPG-Public-Keys':
        return this.listPublicKeys();
      case '/GnuPG-Private-Keys':
        return this.listPrivateKeys();
      case '/GnuPG-Smartcard':
        return this.showSmartcard();
      case '/GnuPG-Version':
        return this.showVersion();
      // case '/GnuPG-Verification':
      //   return this.showVerification(uri);
      default:
        return new Promise((resolve, reject) => resolve(new Buffer('...')));
    }
  }

  async listPublicKeys(): Promise<Buffer> {
    return new Promise<Buffer>(async resolve => {
      // async/await ...
      try {
        const stdout = await promiseListPublicKeys();
        const keys = parseKeys(stdout);
        const recipients = keysToText(keys);

        let content =
          i18n().GnuPGPublicKey +
          (GnuPGParameters.homedir ? ' [homedir=' + GnuPGParameters.homedir + ']' : '') +
          ':\r\n';
        content += '\r\n';
        recipients.forEach(r => (content += '- ' + r.toString() + '\r\n'));

        resolve(new Buffer(content));
      } catch (err) {
        resolve(new Buffer(i18n().GnuPGListPublicKeysFailed + '\r\n' + err));
      }

      // promises chain ...
      // promiseListPublicKeys()
      //   .then(stdout => promiseParseKeys(stdout))
      //   .then(keys => promiseKeysToText(keys))
      //   .then(recipients => {
      //     let content =
      //       i18n().GnuPGPublicKey +
      //       (GnuPGParameters.homedir ? ' [homedir=' + GnuPGParameters.homedir + ']' : '') +
      //       ':\r\n';
      //     content += '\r\n';
      //     recipients.forEach(r => (content += '- ' + r.toString() + '\r\n'));
      //     resolve(new Buffer(content));
      //   })
      //   .catch(err => {
      //     resolve(new Buffer(i18n().GnuPGListPublicKeysFailed + '\r\n' + err));
      //   });
    });
  }

  async listPrivateKeys(): Promise<Buffer> {
    return new Promise<Buffer>(async resolve => {
      // async/await ...
      try {
        const stdout = await promiseListSecretKeys();
        const keys = parseKeys(stdout);
        const recipients = keysToText(keys);
        let content =
          i18n().GnuPGSecretKey +
          (GnuPGParameters.homedir ? ' [homedir=' + GnuPGParameters.homedir + ']' : '') +
          ':\r\n';
        content += '\r\n';
        recipients.forEach(r => (content += '- ' + r.toString() + '\r\n'));
        resolve(new Buffer(content));
      } catch (err) {
        resolve(new Buffer(i18n().GnuPGListSecretKeysFailed + '\r\n' + err));
      }

      // promises chain ...
      // promiseListSecretKeys()
      //   .then(stdout => promiseParseKeys(stdout))
      //   .then(keys => promiseKeysToText(keys))
      //   .then(recipients => {
      //     let content =
      //       i18n().GnuPGSecretKey +
      //       (GnuPGParameters.homedir ? ' [homedir=' + GnuPGParameters.homedir + ']' : '') +
      //       ':\r\n';
      //     content += '\r\n';
      //     recipients.forEach(r => (content += '- ' + r.toString() + '\r\n'));
      //     resolve(new Buffer(content));
      //   })
      //   .catch(err => {
      //     resolve(new Buffer(i18n().GnuPGListSecretKeysFailed + '\r\n' + err));
      //   });
    });
  }

  async showSmartcard(): Promise<Buffer> {
    return new Promise<Buffer>(async resolve => {
      // async/await ...
      try {
        const stdout = await promiseShowSmartcard();
        resolve(stdout);
      }catch(err){
        resolve(new Buffer(i18n().GnuPGShowSmartcardFailed + '\r\n' + err));
      }

      // promises chain ...
      // promiseShowSmartcard()
      //   .then(stdout => resolve(stdout))
      //   .catch(err => {
      //     resolve(new Buffer(i18n().GnuPGShowSmartcardFailed + '\r\n' + err));
      //   });
    });
  }

  async showVersion(): Promise<Buffer> {
    return new Promise<Buffer>(async resolve => {
      // async/await ...
      try {
        const stdout = await promiseCheckVersion();
        resolve(stdout);
      }catch(err){
        resolve(new Buffer(i18n().GnuPGNotAvailable + '\r\n' + err));
      }

      // promises chain ...
      // promiseCheckVersion()
      //   .then(stdout => resolve(stdout))
      //   .catch(err => {
      //     resolve(new Buffer(i18n().GnuPGNotAvailable + '\r\n' + err));
      //   });
    });
  }

  // async showVerification(uri: vscode.Uri): Promise<Buffer> {
  //   return new Promise<Buffer>(async resolve => {
  //     // async/await ...
  //     try {
  //       const stdout = await promiseVerify(uri);
  //       resolve(stdout);
  //     }catch(err){
  //       resolve(new Buffer(i18n().GnuPGNotAvailable + '\r\n' + err));
  //     }

  //     // promises chain ...
  //     // promiseVerify(uri)
  //     //   .then(stdout => resolve(stdout))
  //     //   .catch(err => {
  //     //     resolve(new Buffer(i18n().GnuPGNotAvailable + '\r\n' + err));
  //     //   });
  //   });
  // }
}
