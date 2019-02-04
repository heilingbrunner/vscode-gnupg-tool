import * as vscode from 'vscode';
import * as gpg from 'gpg';
import * as child_process from 'child_process';
import { ExecOptions } from 'child_process';
import { GnuPGKey } from './gnupgkey';

export function checkGnuPG() {
  promise_checkVersion()
    .then(stdout => promise_extractVersions(stdout))
    .then(version => vscode.window.showInformationMessage('GnuPG: gpg --version -> ' + version))
    .catch(err => vscode.window.showErrorMessage('GnuPG: gpg not available !'));
}

export function listRecipients() {
  promise_listRecipients()
    .then(stdout => promise_readKeys(stdout))
    .then(keys => promise_KeysToText(keys))
    .then(recipients => showRecipients(recipients))
    .catch(() => {
      vscode.window.showErrorMessage('GnuPG list recipients failed ! ');
    });
}

export function encryptSelection(editor: vscode.TextEditor) {
  if (editor) {
    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);

    if (selectedText && selectedText.length > 0) {
      promise_listRecipients()
        .then(stdout => promise_readKeys(stdout))
        .then(keys => promise_KeysToOptions(keys))
        .then(options => vscode.window.showQuickPick(options, { placeHolder: 'Select recipient', canPickMany: true }))
        .then(recipients => promise_encrypt(selectedText, recipients))
        .then(encrypted => {
          if (encrypted !== undefined) {
            editor.edit(edit => edit.replace(selection, encrypted));
          }
        })
        .catch(err => vscode.window.showErrorMessage('GnuPG encryption failed !'));
    } else {
      vscode.window.showWarningMessage('No text selected for GnuPG encryption.');
    }
  }
}

export function decryptSelection(editor: vscode.TextEditor) {
  if (editor) {
    const selection = editor.selection;
    const selectedText = editor.document.getText(selection);

    if (selectedText && selectedText.length > 0) {
      promise_decrypt(selectedText)
        .then(decrypted => {
          if (decrypted !== undefined) {
            editor.edit(edit => edit.replace(selection, decrypted));
          }
        })
        .catch(err => vscode.window.showErrorMessage('GnuPG decryption failed !'));
    } else {
      vscode.window.showWarningMessage('No text selected for GnuPG decryption.');
    }
  }
}

export function endSession() {
  promise_killgpgagent()
    .then(() => vscode.window.showInformationMessage('GnuPG session ended.'))
    .catch(err => vscode.window.showErrorMessage('GnuPG end session failed !'));
}

function promise_checkVersion(): Promise<string> {
  return new Promise(function(resolve, reject) {
    var args = ['--version'];

    gpg.call('', args, (err: string, result: string) => {
      if (err) {
        reject(err);
      } else {
        resolve(result.toString());
      }
    });
  });
}

function promise_listRecipients(): Promise<string> {
  // List options
  //var args = ['--list-keys', '--fixed-list-mode', '--fingerprint', '--with-colons'];

  // output in utf8
  //return GnuPGTool.execp('gpg -k --with-colons', {}).then(value => {
  //  return GnuPGTool.gnuPG_readKeys(value.stdout);
  //});

  return new Promise(function(resolve, reject) {
    var args = ['-k', '--with-colons'];

    gpg.call('', args, (err: string, result: string) => {
      if (err) {
        reject(err);
      } else {
        resolve(result.toString());
      }
    });
  });
}

function promise_readKeys(stdout: string): Promise<Map<string, GnuPGKey>> {
  //see source: gnupg-2.2.12\doc\DETAILS

  return new Promise((resolve, reject) => {
    let lines = stdout
      .toString()
      .trim()
      .split(/(\r\n|\n)/g);

    let keys = new Map<string, GnuPGKey>();
    let key: GnuPGKey | null = null;

    for (var i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const record = line.split(':');

      switch (record[0]) {
        case 'pub':
          //#region Details pub Record:

          //record[0]: Type of record
          //record[1]: Validity
          //record[2]: Key length
          //record[3]: Public key algorithm
          //record[4]: KeyID
          //record[5]: Creation date
          //record[6]: Expiration date
          //record[7]: Certificate S/N, UID hash, trust signature info
          //record[8]: Ownertrust
          //record[9]: User-ID
          //record[10]: Signature class
          //record[11]: Key capabilities
          //record[12]: Issuer certificate fingerprint or other info
          //record[13]: Flag field
          //record[14]: S/N of a token
          //record[15]: Hash algorithm
          //record[16]: Curve name
          //record[17]: Compliance flags
          //record[18]: Last update
          //record[19]: Origin
          //record[20]: Comment

          //#endregion

          // Add previous key, if exists
          if (key !== null && !keys.has(key.keyId)) {
            keys.set(key.keyId, key);
          }

          //create new key
          key = new GnuPGKey();
          (key.keyId = record[4]),
            (key.expiration = record[6]),
            (key.capabilities = record[11]),
            (key.validity = record[1]);

          break;
        case 'fpr':
          //#region Details fpr Record

          //record[9]: fingerprint

          //#endregion

          // Fingerprint contains keyId
          if (key !== null && record[9].endsWith(key.keyId)) {
            key.fingerprint = record[9];
          }
          break;

        case 'uid':
          //#region Details uid Record

          //record[9]: userid

          //#endregion

          // User Id: name email
          if (key !== null) {
            key.userId = record[9];
          }
          break;
      }
    }

    // Add last key
    if (key !== null && !keys.has(key.keyId)) {
      keys.set(key.keyId, key);
    }

    // resolve, reject
    if (keys.size > 0) {
      resolve(keys);
    } else {
      reject();
    }
  });
}

function promise_encrypt(selectedText: string, recipients?: { name: string; email: string }[]): Promise<string> {
  return new Promise((resolve, reject) => {
    let args = ['--armor'];

    if (recipients !== undefined) {
      recipients.forEach(recipient => {
        args = args.concat(['--recipient', recipient.name]); // + ' <' + recipient.email + '>';
      });
    }

    gpg.encrypt(selectedText, args, (err: string, result: string) => {
      if (err) {
        reject(err);
      } else {
        resolve(result.toString());
      }
    });
  });
}

function promise_decrypt(selectedText: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let args = ['--decrypt'];

    gpg.decrypt(selectedText, args, (err: string, result: string) => {
      if (err) {
        reject(err);
      } else {
        resolve(result.toString());
      }
    });
  });
}

function promise_killgpgagent(): Promise<{ stdout: string; stderr: string }> {
  //https://www.gnupg.org/documentation/manuals/gnupg/Invoking-GPG_002dAGENT.html
  //https://www.gnupg.org/documentation/manuals/gnupg/Controlling-gpg_002dconnect_002dagent.html#Controlling-gpg_002dconnect_002dagent
  //gpgconf --kill gpg-agent: works on Windows
  //gpg-connect-agent killagent /bye
  return promise_exec('gpg-connect-agent killagent /bye', {});
}

function promise_extractVersions(stdout: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let versions = '';

    let lines = stdout
      .toString()
      .trim()
      .split(/(\r\n|\n)/g);

    if (lines.length >= 2) {
      versions = lines[0] + ', ' + lines[2];
    }

    resolve(versions);
  });
}

function promise_exec(cmd: string, opts: ExecOptions): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const cp = child_process.exec(cmd, opts, (err, stdout, stderr) =>
      err
        ? reject(err)
        : resolve({
            stdout: stdout,
            stderr: stderr
          })
    );
  });
}

function promise_KeysToOptions(
  keys: Map<string, GnuPGKey>
): Promise<{ label: string; description: string; detail: string; name: string; email: string }[]> {
  return new Promise((resolve, reject) => {
    const arr = Array.from(keys.values()).map(k => ({
      label: k.name,
      description: k.email,
      detail: k.fingerprint + ', ' + k.validityDescription,
      name: k.name,
      email: k.email,
      validity: k.validity
    }));

    arr ? resolve(arr) : reject();
  });
}

function promise_KeysToText(keys: Map<string, GnuPGKey>): Promise<string[]> {
  return new Promise((resolve, reject) => {
    let recipients: string[] = [];

    keys.forEach(key => {
      recipients.push(key.toString());
    });

    recipients.length > 0 ? resolve(recipients) : reject();
  });
}

function showRecipients(recipients: string[]) {
  let content = 'GnuPG Recipients:\r\n';

  recipients.forEach(r => (content += '- ' + r.toString() + '\r\n'));

  vscode.workspace.openTextDocument({ content: content, language: 'txt' }).then((doc: vscode.TextDocument) => {
    return vscode.window.showTextDocument(doc, 1, false);
  });
}
