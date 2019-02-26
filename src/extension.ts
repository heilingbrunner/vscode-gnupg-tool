import * as vscode from 'vscode';
import * as fs from 'fs';

import {
  promise_checkVersion,
  promise_bufferToLines,
  promise_listPublicKeys,
  promise_parseKeys,
  promise_keysToQuickPickItems,
  promise_encrypt,
  promise_decrypt,
  promise_killgpgagent,
  promise_listPrivateKeys,
  promise_sign,
  promise_filterKeys,
  // promise_filterKeysForEncrypt,
  // promise_filterKeysForSign
} from './gnupgpromises';
import VirtualDocumentProvider from './virtualdocumentprovider';
import GnuPGProvider from './gnupgprovider';
import { getContent, setContent } from './utils';
import { GnuPGKey } from './gnupgkey';

let statusBarItem: vscode.StatusBarItem;

// extension plumping ...
export function activate(context: vscode.ExtensionContext) {
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);

  let virtualDocumentProvider = vscode.workspace.registerTextDocumentContentProvider(
    'virtual-document',
    new VirtualDocumentProvider()
  );
  let gnuPGProvider = vscode.workspace.registerTextDocumentContentProvider('gnupg', new GnuPGProvider());

  const commandCheckGnuPG = vscode.commands.registerCommand('extension.CheckGnuPG', () => {
    showVersion().then(() => {checkGnuPG();});
  });

  const commandListPublicKeys = vscode.commands.registerCommand('extension.ListPublicKeys', () => {
    listPublicKeys();
  });

  const commandListPrivateKeys = vscode.commands.registerCommand('extension.ListPrivateKeys', () => {
    listPrivateKeys();
  });

  const commandShowSmartcard = vscode.commands.registerCommand('extension.ShowSmartcard', () => {
    showSmartcard();
  });

  const commandEncryptSelection = vscode.commands.registerCommand('extension.EncryptSelection', () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      encryptSelection(editor);
    }
  });

  const commandEncryptFile = vscode.commands.registerCommand('extension.EncryptFile', (fileUri: vscode.Uri) => {
    encryptFile(fileUri);
  });

  const commandPreviewEncryptedFile = vscode.commands.registerCommand(
    'extension.PreviewEncryptedFile',
    (fileUri: vscode.Uri) => {
      previewEncryptedFile(fileUri);
    }
  );

  const commandDecryptSelection = vscode.commands.registerCommand('extension.DecryptSelection', () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      decryptSelection(editor);
    }
  });

  const commandDecryptFile = vscode.commands.registerCommand('extension.DecryptFile', (fileUri: vscode.Uri) => {
    decryptFile(fileUri);
  });

  const commandPreviewDecryptedFile = vscode.commands.registerCommand(
    'extension.PreviewDecryptedFile',
    (fileUri: vscode.Uri) => {
      previewDecryptedFile(fileUri);
    }
  );

  const commandSignFile = vscode.commands.registerCommand('extension.SignFile', (fileUri: vscode.Uri) => {
    signFile(fileUri);
  });

  const commandVerifyFile = vscode.commands.registerCommand('extension.VerifyFile', (fileUri: vscode.Uri) => {
    verifyFile(fileUri);
  });

  const commandEndSession = vscode.commands.registerCommand('extension.EndSession', () => {
    endSession();
  });

  // Update statusBarItem on activate
  checkGnuPG();

  //Disposables
  context.subscriptions.push(virtualDocumentProvider);
  context.subscriptions.push(gnuPGProvider);
  context.subscriptions.push(commandCheckGnuPG);
  context.subscriptions.push(commandListPublicKeys);
  context.subscriptions.push(commandListPrivateKeys);
  context.subscriptions.push(commandShowSmartcard);
  context.subscriptions.push(commandEncryptSelection);
  context.subscriptions.push(commandEncryptFile);
  context.subscriptions.push(commandPreviewEncryptedFile);
  context.subscriptions.push(commandDecryptSelection);
  context.subscriptions.push(commandDecryptFile);
  context.subscriptions.push(commandPreviewDecryptedFile);
  context.subscriptions.push(commandSignFile);
  context.subscriptions.push(commandVerifyFile);
  context.subscriptions.push(commandEndSession);
}

// this method is called when your extension is deactivated
export function deactivate() {
  statusBarItem.hide();
}

// Commands .......................................................

function checkGnuPG() {
  promise_checkVersion()
    .then(stdout => promise_bufferToLines(stdout))
    .then(lines => {
      if (lines.length >= 2) {
        statusBarItem.text = `$(mirror-private) ` + lines[0];
        statusBarItem.show();
      }
    })
    .catch(err => {
      statusBarItem.hide();
      vscode.window.showErrorMessage('GnuPG: gpg not available ! ' + err);
    });
}

function showVersion(): Thenable<{} | undefined> {
  let newUri = vscode.Uri.parse('virtual-document://gnupg/GnuPG-Version');
  return vscode.commands.executeCommand('vscode.open', newUri);
}

function listPublicKeys() {
  let newUri = vscode.Uri.parse('virtual-document://gnupg/GnuPG-Public-Keys');
  vscode.commands.executeCommand('vscode.open', newUri);
}

function listPrivateKeys() {
  let newUri = vscode.Uri.parse('virtual-document://gnupg/GnuPG-Private-Keys');
  vscode.commands.executeCommand('vscode.open', newUri);
}

function showSmartcard(): Thenable<{} | undefined> {
  let newUri = vscode.Uri.parse('virtual-document://gnupg/GnuPG-Smartcard');
  return vscode.commands.executeCommand('vscode.open', newUri);
}

function encryptSelection(editor: vscode.TextEditor) {
  if (editor) {
    const selection = editor.selection;
    const content = new Buffer(editor.document.getText(selection));

    if (content && content.length > 0) {
      promise_listPublicKeys()
        .then(stdout => promise_parseKeys(stdout))
        .then(map => promise_filterKeys(map, (k: GnuPGKey) => k.isValidToEncrypt))
        .then(keys => promise_keysToQuickPickItems(keys))
        .then(quickpickitems =>
          vscode.window.showQuickPick(quickpickitems, { placeHolder: 'Select recipients ...', canPickMany: true })
        )
        .then(recipients => promise_encrypt(content, recipients))
        .then(encrypted => {
          if (encrypted !== undefined) {
            editor.edit(edit => edit.replace(selection, encrypted.toString('utf8')));
          }
        })
        .catch(err => vscode.window.showErrorMessage('GnuPG encryption failed ! ' + err));
    } else {
      vscode.window.showWarningMessage('No text selected for GnuPG encryption.');
    }
  }
}

function encryptFile(fileUri: vscode.Uri) {
  if (fileUri !== undefined && fileUri.scheme === 'file') {
    if (fileUri.fsPath.match(/\.(asc)$/i)) {
      vscode.window.showInformationMessage('GnuPG: File already encrypted (*.asc).');
    } else {
      encryptFileUri(fileUri);
    }
  } else {
    const option: vscode.OpenDialogOptions = { canSelectMany: false };
    vscode.window.showOpenDialog(option).then(fileUriSelected => {
      if (fileUriSelected && fileUriSelected[0] && fileUriSelected[0].scheme === 'file') {
        if (fileUriSelected[0].fsPath.match(/\.(asc)$/i)) {
          vscode.window.showInformationMessage('GnuPG: File already encrypted (*.asc).');
        } else {
          encryptFileUri(fileUriSelected[0]);
        }
      }
    });
  }
}

function previewEncryptedFile(fileUri: vscode.Uri) {
  if (fileUri !== undefined && fileUri.scheme === 'file') {
    if (fileUri.fsPath.match(/\.(asc)$/i)) {
      vscode.window.showInformationMessage('GnuPG: File already encrypted (*.asc).');
    } else {
      launchGnuPGProviderForEncrypt(fileUri);
    }
  } else {
    const option: vscode.OpenDialogOptions = { canSelectMany: false };
    vscode.window.showOpenDialog(option).then(fileUriSelected => {
      if (fileUriSelected && fileUriSelected[0] && fileUriSelected[0].scheme === 'file') {
        if (fileUriSelected[0].fsPath.match(/\.(asc)$/i)) {
          vscode.window.showInformationMessage('GnuPG: File already encrypted (*.asc).');
        } else {
          launchGnuPGProviderForEncrypt(fileUriSelected[0]);
        }
      }
    });
  }
}

function decryptSelection(editor: vscode.TextEditor) {
  if (editor) {
    const selection = editor.selection;
    const content = new Buffer(editor.document.getText(selection));

    if (content && content.length > 0) {
      promise_decrypt(content)
        .then(decrypted => {
          if (decrypted !== undefined) {
            editor.edit(edit => edit.replace(selection, decrypted.toString('utf8')));
          }
        })
        .catch(err => vscode.window.showErrorMessage('GnuPG decryption failed ! ' + err));
    } else {
      vscode.window.showWarningMessage('No text selected for GnuPG decryption.');
    }
  }
}

function decryptFile(fileUri: vscode.Uri) {
  if (fileUri !== undefined && fileUri.scheme === 'file') {
    if (fileUri.fsPath.match(/\.(asc)$/i)) {
      decryptFileUri(fileUri);
    } else {
      vscode.window.showInformationMessage('GnuPG: File not encrypted (*.asc).');
    }
  } else {
    const option: vscode.OpenDialogOptions = { canSelectMany: false };
    vscode.window.showOpenDialog(option).then(fileUriSelected => {
      if (fileUriSelected && fileUriSelected[0] && fileUriSelected[0].scheme === 'file') {
        if (fileUriSelected[0].fsPath.match(/\.(asc)$/i)) {
          decryptFileUri(fileUriSelected[0]);
        } else {
          vscode.window.showInformationMessage('GnuPG: File not encrypted (*.asc).');
        }
      }
    });
  }
}

function previewDecryptedFile(fileUri: vscode.Uri) {
  if (fileUri !== undefined && fileUri.scheme === 'file') {
    if (fileUri.fsPath.match(/\.(asc)$/i)) {
      launchGnuPGProviderForDecrypt(fileUri);
    } else {
      vscode.window.showInformationMessage('GnuPG: File not encrypted (*.asc).');
    }
  } else {
    const option: vscode.OpenDialogOptions = { canSelectMany: false };
    vscode.window.showOpenDialog(option).then(fileUriSelected => {
      if (fileUriSelected && fileUriSelected[0] && fileUriSelected[0].scheme === 'file') {
        if (fileUriSelected[0].fsPath.match(/\.(asc)$/i)) {
          launchGnuPGProviderForDecrypt(fileUriSelected[0]);
        } else {
          vscode.window.showInformationMessage('GnuPG: File not encrypted (*.asc).');
        }
      }
    });
  }
}

function signFile(fileUri: vscode.Uri) {
  if (fileUri !== undefined && fileUri.scheme === 'file') {
    if (!fileUri.fsPath.match(/\.(sig)$/i)) {
      signFileUri(fileUri);
    } else {
      vscode.window.showInformationMessage('GnuPG: File is already a signature (*.sig).');
    }
  } else {
    const option: vscode.OpenDialogOptions = { canSelectMany: false };
    vscode.window.showOpenDialog(option).then(fileUriSelected => {
      if (fileUriSelected && fileUriSelected[0] && fileUriSelected[0].scheme === 'file') {
        if (!fileUriSelected[0].fsPath.match(/\.(sig)$/i)) {
          signFileUri(fileUriSelected[0]);
        } else {
          vscode.window.showInformationMessage('GnuPG: File is already a signature (*.sig).');
        }
      }
    });
  }
}

function verifyFile(fileUri: vscode.Uri) {
  if (fileUri !== undefined && fileUri.scheme === 'file') {
    if (fileUri.fsPath.match(/\.(sig)$/i)) {
      launchGnuPGProviderForVerify(fileUri);
    } else {
      vscode.window.showInformationMessage('GnuPG: File is not signature (*.sig).');
    }
  } else {
    const option: vscode.OpenDialogOptions = { canSelectMany: false };
    vscode.window.showOpenDialog(option).then(fileUriSelected => {
      if (fileUriSelected && fileUriSelected[0] && fileUriSelected[0].scheme === 'file') {
        if (!fileUriSelected[0].fsPath.match(/\.(sig)$/i)) {
          launchGnuPGProviderForVerify(fileUriSelected[0]);
        } else {
          vscode.window.showInformationMessage('GnuPG: File is not signature (*.sig).');
        }
      }
    });
  }
}

function endSession() {
  promise_killgpgagent()
    .then(() => vscode.window.showInformationMessage('GnuPG session ended.'))
    .catch(err => vscode.window.showErrorMessage('GnuPG end session failed ! ' + err));
}

// Helper .......................................................

function encryptFileUri(fileUri: vscode.Uri) {
  getContent(fileUri).then(content => {
    if (content && content.length > 0) {
      promise_listPublicKeys()
        .then(stdout => promise_parseKeys(stdout))
        .then(map => promise_filterKeys(map, (k: GnuPGKey) => k.isValidToEncrypt))
        .then(keys => promise_keysToQuickPickItems(keys))
        .then(quickpickitems =>
          vscode.window.showQuickPick(quickpickitems, { placeHolder: 'Select recipients ...', canPickMany: true })
        )
        .then(recipients => promise_encrypt(content, recipients))
        .then(encrypted => {
          if (encrypted !== undefined) {
            //save new document
            let newUri = vscode.Uri.file(fileUri.fsPath.concat('.asc'));
            setContent(newUri, encrypted).then(() => {
              vscode.workspace.openTextDocument(newUri).then((doc: vscode.TextDocument) => {
                vscode.window.showTextDocument(doc, { preview: false });
              });
            });
          }
        })
        .catch(err => vscode.window.showErrorMessage('GnuPG encryption failed ! ' + err));
    }
  });
}

function decryptFileUri(fileUri: vscode.Uri) {
  getContent(fileUri).then(content => {
    if (content && content.length > 0) {
      promise_decrypt(content)
        .then(decrypted => {
          if (decrypted !== undefined) {
            //save new document
            let newUri = vscode.Uri.file(fileUri.fsPath.concat('.decrypted'));
            setContent(newUri, decrypted).then(() => {
              vscode.workspace.openTextDocument(newUri).then((doc: vscode.TextDocument) => {
                vscode.window.showTextDocument(doc, { preview: false });
              });
            });
          }
        })
        .catch(err => vscode.window.showErrorMessage('GnuPG decryption failed ! ' + err));
    }
  });
}

function signFileUri(fileUri: vscode.Uri) {
  promise_listPrivateKeys()
    .then(stdout => promise_parseKeys(stdout))
    .then(map => promise_filterKeys(map, (k: GnuPGKey) => k.isValidToSign))
    .then(keys => promise_keysToQuickPickItems(keys))
    .then(quickpickitems => vscode.window.showQuickPick(quickpickitems, { placeHolder: 'Select signer ...' }))
    .then(key => promise_sign(fileUri, key))
    .catch(err => vscode.window.showErrorMessage('GnuPG sign failed ! ' + err));
}

function launchGnuPGProviderForEncrypt(fileUri: vscode.Uri) {
  // check filePath ...
  if (typeof fileUri === 'undefined' || !fs.existsSync(fileUri.fsPath)) {
    return;
  }

  // change uri for encryptprovider
  let newUri = vscode.Uri.file(fileUri.fsPath.concat(' - encrypted')).with({ scheme: 'gnupg', authority: 'encrypt' });

  // go on to content provider ...
  vscode.commands.executeCommand('vscode.open', newUri);
}

function launchGnuPGProviderForDecrypt(fileUri: vscode.Uri) {
  // check filePath ...
  if (typeof fileUri === 'undefined' || !fs.existsSync(fileUri.fsPath)) {
    return;
  }

  // change uri for content provider
  let newUri = vscode.Uri.file(fileUri.fsPath.concat(' - decrypted')).with({ scheme: 'gnupg', authority: 'decrypt' });

  // go on to content provider ...
  vscode.commands.executeCommand('vscode.open', newUri);
}

function launchGnuPGProviderForVerify(fileUri: vscode.Uri) {
  // check filePath ...
  if (typeof fileUri === 'undefined' || !fs.existsSync(fileUri.fsPath)) {
    return;
  }

  // change uri for content provider
  let newUri = vscode.Uri.file(fileUri.fsPath.concat(' - verified')).with({ scheme: 'gnupg', authority: 'verify' });

  // go on to content provider ...
  vscode.commands.executeCommand('vscode.open', newUri);
}
