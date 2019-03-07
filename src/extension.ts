import * as vscode from 'vscode';
import * as fs from 'fs';

import {
  promiseCheckVersion,
  promiseBufferToLines,
  promiseEncryptAsymBuffer,
  promiseEncryptSymBuffer,
  promiseDecryptBuffer,
  promiseEncryptSymUri,
  promiseKillGpgAgent,
  promiseSign,
  promiseListPublicKeys,
  promiseListSecretKeys,
  promiseFilterKeys,
  promiseParseKeys,
  promiseKeysToQuickPickItems,
  promiseImportKeys,
  promiseExportPublicKeys,
  promiseExportSecretKeys,
  promiseExportSecretSubKeys,
  promiseDecryptUri,
  promiseEncryptAsymUri
} from './gnupgpromises';
import VirtualDocumentProvider from './virtualdocumentprovider';
import GnuPGProvider from './gnupgprovider';
import { getContent, setContent } from './utils';
import { GnuPGKey } from './gnupgkey';

let statusBarItem: vscode.StatusBarItem;

// extension plumping ...
export function activate(context: vscode.ExtensionContext) {
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);

  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider('virtual-document', new VirtualDocumentProvider())
  );

  context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('gnupg', new GnuPGProvider()));

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.CheckGnuPG', () => {
      showVersion().then(() => {
        checkGnuPG();
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.ListPublicKeys', () => {
      listPublicKeys();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.ListSecretKeys', () => {
      listPrivateKeys();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.ShowSmartcard', () => {
      showSmartcard();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.EncryptSelectionAsym', () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        encryptAsymSelection(editor);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.EncryptSelectionSymm', () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        encryptSymmSelection(editor);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.EncryptFileAsym', (uri: vscode.Uri) => {
      encryptAsymFile(uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.EncryptFileSymm', (uri: vscode.Uri) => {
      encryptSymmFile(uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.PreviewEncryptAsym', (uri: vscode.Uri) => {
      previewEncryptAsym(uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.PreviewEncryptSymm', (uri: vscode.Uri) => {
      previewEncryptSymm(uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.DecryptSelection', () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        decryptSelection(editor);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.DecryptFile', (uri: vscode.Uri) => {
      decryptFile(uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.PreviewDecrypt', (uri: vscode.Uri) => {
      previewDecrypt(uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.SignFile', (uri: vscode.Uri) => {
      signFile(uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.VerifyFile', (uri: vscode.Uri) => {
      verifyFile(uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.EndSession', () => {
      endSession();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.ImportKeys', (uri: vscode.Uri) => {
      importKeys(uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.ExportPublicKeys', (uri: vscode.Uri) => {
      exportPublicKeys(uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.ExportSecretKeys', (uri: vscode.Uri) => {
      exportPrivateKeys(uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.ExportSecretSubKeys', (uri: vscode.Uri) => {
      exportPrivateSubKeys(uri);
    })
  );

  // Update statusBarItem on activate
  checkGnuPG();
}

// this method is called when your extension is deactivated
export function deactivate() {
  statusBarItem.hide();
}

// Commands .......................................................

function checkGnuPG() {
  promiseCheckVersion()
    .then(stdout => promiseBufferToLines(stdout))
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

function encryptAsymSelection(editor: vscode.TextEditor) {
  if (editor) {
    const selection = editor.selection;
    const content = new Buffer(editor.document.getText(selection));

    if (content && content.length > 0) {
      promiseListPublicKeys()
        .then(stdout => promiseParseKeys(stdout))
        .then(map => promiseFilterKeys(map, (k: GnuPGKey) => k.isValidToEncrypt))
        .then(keys => promiseKeysToQuickPickItems(keys))
        .then(quickpickitems =>
          vscode.window.showQuickPick(quickpickitems, { placeHolder: 'Select recipients ...', canPickMany: true })
        )
        .then(recipients => promiseEncryptAsymBuffer(content, recipients))
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

function encryptSymmSelection(editor: vscode.TextEditor) {
  if (editor) {
    const selection = editor.selection;
    const content = new Buffer(editor.document.getText(selection));

    if (content && content.length > 0) {
      promiseEncryptSymBuffer(content)
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

function encryptAsymFile(uri: vscode.Uri) {
  if (uri !== undefined && uri.scheme === 'file') {
    if (uri.fsPath.match(/\.(asc)$/i)) {
      vscode.window.showInformationMessage('GnuPG: File already encrypted (*.asc).');
    } else {
      encryptAsymUri(uri);
    }
  } else {
    const option: vscode.OpenDialogOptions = { canSelectMany: false };
    vscode.window.showOpenDialog(option).then(uriSelected => {
      if (uriSelected && uriSelected[0] && uriSelected[0].scheme === 'file') {
        if (uriSelected[0].fsPath.match(/\.(asc)$/i)) {
          vscode.window.showInformationMessage('GnuPG: File already encrypted (*.asc).');
        } else {
          encryptAsymUri(uriSelected[0]);
        }
      }
    });
  }
}

function encryptSymmFile(uri: vscode.Uri) {
  if (uri !== undefined && uri.scheme === 'file') {
    if (uri.fsPath.match(/\.(asc)$/i)) {
      vscode.window.showInformationMessage('GnuPG: File already encrypted (*.asc).');
    } else {
      encryptSymmUri(uri);
    }
  } else {
    const option: vscode.OpenDialogOptions = { canSelectMany: false };
    vscode.window.showOpenDialog(option).then(uriSelected => {
      if (uriSelected && uriSelected[0] && uriSelected[0].scheme === 'file') {
        if (uriSelected[0].fsPath.match(/\.(asc)$/i)) {
          vscode.window.showInformationMessage('GnuPG: File already encrypted (*.asc).');
        } else {
          encryptSymmUri(uriSelected[0]);
        }
      }
    });
  }
}

function previewEncryptAsym(uri: vscode.Uri) {
  if (uri !== undefined && uri.scheme === 'file') {
    if (uri.fsPath.match(/\.(asc)$/i)) {
      vscode.window.showInformationMessage('GnuPG: File already encrypted (*.asc).');
    } else {
      launchGnuPGProviderEncryptAsym(uri);
    }
  } else {
    const option: vscode.OpenDialogOptions = { canSelectMany: false };
    vscode.window.showOpenDialog(option).then(uriSelected => {
      if (uriSelected && uriSelected[0] && uriSelected[0].scheme === 'file') {
        if (uriSelected[0].fsPath.match(/\.(asc)$/i)) {
          vscode.window.showInformationMessage('GnuPG: File already encrypted (*.asc).');
        } else {
          launchGnuPGProviderEncryptAsym(uriSelected[0]);
        }
      }
    });
  }
}

function previewEncryptSymm(uri: vscode.Uri) {
  if (uri !== undefined && uri.scheme === 'file') {
    if (uri.fsPath.match(/\.(asc)$/i)) {
      vscode.window.showInformationMessage('GnuPG: File already encrypted (*.asc).');
    } else {
      launchGnuPGProviderEncryptSymm(uri);
    }
  } else {
    const option: vscode.OpenDialogOptions = { canSelectMany: false };
    vscode.window.showOpenDialog(option).then(uriSelected => {
      if (uriSelected && uriSelected[0] && uriSelected[0].scheme === 'file') {
        if (uriSelected[0].fsPath.match(/\.(asc)$/i)) {
          vscode.window.showInformationMessage('GnuPG: File already encrypted (*.asc).');
        } else {
          launchGnuPGProviderEncryptSymm(uriSelected[0]);
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
      promiseDecryptBuffer(content)
        .then(decrypted => {
          if (decrypted !== undefined) {
            const txt = decrypted.toString('utf8');
            if (txt.length > 0) {
              editor.edit(edit => edit.replace(selection, txt));
            } else {
              vscode.window.showErrorMessage('GnuPG decryption failed !');
            }
          }
        })
        .catch(err => vscode.window.showErrorMessage('GnuPG decryption failed ! ' + err));
    } else {
      vscode.window.showWarningMessage('No text selected for GnuPG decryption.');
    }
  }
}

function decryptFile(uri: vscode.Uri) {
  if (uri !== undefined && uri.scheme === 'file') {
    if (uri.fsPath.match(/\.(asc|gpg)$/i)) {
      decryptUri(uri);
    } else {
      vscode.window.showInformationMessage('GnuPG: File not encrypted (*.asc|*.gpg).');
    }
  } else {
    const option: vscode.OpenDialogOptions = { canSelectMany: false };
    vscode.window.showOpenDialog(option).then(uriSelected => {
      if (uriSelected && uriSelected[0] && uriSelected[0].scheme === 'file') {
        if (uriSelected[0].fsPath.match(/\.(asc)$/i)) {
          decryptUri(uriSelected[0]);
        } else {
          vscode.window.showInformationMessage('GnuPG: File not encrypted (*.asc|*.gpg).');
        }
      }
    });
  }
}

function previewDecrypt(uri: vscode.Uri) {
  if (uri !== undefined && uri.scheme === 'file') {
    if (uri.fsPath.match(/\.(asc|gpg)$/i)) {
      launchGnuPGProviderForDecrypt(uri);
    } else {
      vscode.window.showInformationMessage('GnuPG: File not encrypted (*.asc|*.gpg).');
    }
  } else {
    const option: vscode.OpenDialogOptions = { canSelectMany: false };
    vscode.window.showOpenDialog(option).then(uriSelected => {
      if (uriSelected && uriSelected[0] && uriSelected[0].scheme === 'file') {
        if (uriSelected[0].fsPath.match(/\.(asc)$/i)) {
          launchGnuPGProviderForDecrypt(uriSelected[0]);
        } else {
          vscode.window.showInformationMessage('GnuPG: File not encrypted (*.asc|*.gpg).');
        }
      }
    });
  }
}

function signFile(uri: vscode.Uri) {
  if (uri !== undefined && uri.scheme === 'file') {
    if (!uri.fsPath.match(/\.(sig)$/i)) {
      signUri(uri);
    } else {
      vscode.window.showInformationMessage('GnuPG: File is already a signature (*.sig).');
    }
  } else {
    const option: vscode.OpenDialogOptions = { canSelectMany: false };
    vscode.window.showOpenDialog(option).then(uriSelected => {
      if (uriSelected && uriSelected[0] && uriSelected[0].scheme === 'file') {
        if (!uriSelected[0].fsPath.match(/\.(sig)$/i)) {
          signUri(uriSelected[0]);
        } else {
          vscode.window.showInformationMessage('GnuPG: File is already a signature (*.sig).');
        }
      }
    });
  }
}

function verifyFile(uri: vscode.Uri) {
  if (uri !== undefined && uri.scheme === 'file') {
    if (uri.fsPath.match(/\.(sig)$/i)) {
      launchGnuPGProviderForVerify(uri);
    } else {
      vscode.window.showInformationMessage('GnuPG: File is not signature (*.sig).');
    }
  } else {
    const option: vscode.OpenDialogOptions = { canSelectMany: false };
    vscode.window.showOpenDialog(option).then(uriSelected => {
      if (uriSelected && uriSelected[0] && uriSelected[0].scheme === 'file') {
        if (!uriSelected[0].fsPath.match(/\.(sig)$/i)) {
          launchGnuPGProviderForVerify(uriSelected[0]);
        } else {
          vscode.window.showInformationMessage('GnuPG: File is not signature (*.sig).');
        }
      }
    });
  }
}

function endSession() {
  promiseKillGpgAgent()
    .then(() => vscode.window.showInformationMessage('GnuPG: Session ended successfully.'))
    .catch(err => vscode.window.showErrorMessage('GnuPG: End session failed ! ' + err));
}

function importKeys(uri: vscode.Uri) {
  if (uri !== undefined && uri.scheme === 'file') {
    promiseImportKeys(uri)
      .then(result => {
        let txt = result.toString();
        vscode.window.showInformationMessage('GnuPG: ' + txt);
      })
      .catch(err => vscode.window.showErrorMessage('GnuPG: Key import failed ! ' + err));
  } else {
    const option: vscode.OpenDialogOptions = { canSelectMany: false };
    vscode.window.showOpenDialog(option).then(uriSelected => {
      if (uriSelected && uriSelected[0] && uriSelected[0].scheme === 'file') {
        promiseImportKeys(uriSelected[0])
          .then(result => {
            let txt = result.toString();
            vscode.window.showInformationMessage('GnuPG: ' + txt);
          })
          .catch(err => vscode.window.showErrorMessage('GnuPG: Key import failed ! ' + err));
      }
    });
  }
}

function exportPublicKeys(uri: vscode.Uri) {
  promiseListPublicKeys()
    .then(stdout => promiseParseKeys(stdout))
    .then(map => promiseFilterKeys(map, (k: GnuPGKey) => k.isValidToEncrypt))
    .then(keys => promiseKeysToQuickPickItems(keys))
    .then(quickpickitems =>
      vscode.window.showQuickPick(quickpickitems, { placeHolder: 'Select key to export ...', canPickMany: false })
    )
    .then(user => {
      if (uri !== undefined && uri.scheme === 'file') {
        promiseExportPublicKeys(uri, user)
          .then(result => {
            let txt = result.toString();
            vscode.window.showInformationMessage(txt);
          })
          .catch(err => vscode.window.showErrorMessage('GnuPG export keys failed ! ' + err));
      } else {
        const option: vscode.OpenDialogOptions = { canSelectMany: false };
        vscode.window.showSaveDialog(option).then(uriSelected => {
          if (uriSelected && uriSelected.scheme === 'file') {
            promiseExportPublicKeys(uriSelected, user)
              .then(result => {
                let txt = result.toString();
                vscode.window.showInformationMessage(txt);
              })
              .catch(err => vscode.window.showErrorMessage('GnuPG export keys failed ! ' + err));
          } else {
          }
        });
      }
    });
}

function exportPrivateKeys(uri: vscode.Uri) {
  promiseListPublicKeys()
    .then(stdout => promiseParseKeys(stdout))
    .then(map => promiseFilterKeys(map, (k: GnuPGKey) => k.isValidToEncrypt))
    .then(keys => promiseKeysToQuickPickItems(keys))
    .then(quickpickitems =>
      vscode.window.showQuickPick(quickpickitems, { placeHolder: 'Select key to export ...', canPickMany: false })
    )
    .then(user => {
      if (uri !== undefined && uri.scheme === 'file') {
        promiseExportSecretKeys(uri, user)
          .then(result => {
            let txt = result.toString();
            vscode.window.showInformationMessage(txt);
          })
          .catch(err => vscode.window.showErrorMessage('GnuPG export keys failed ! ' + err));
      } else {
        const option: vscode.OpenDialogOptions = { canSelectMany: false };
        vscode.window.showSaveDialog(option).then(uriSelected => {
          if (uriSelected && uriSelected.scheme === 'file') {
            promiseExportSecretKeys(uriSelected, user)
              .then(result => {
                let txt = result.toString();
                vscode.window.showInformationMessage(txt);
              })
              .catch(err => vscode.window.showErrorMessage('GnuPG export keys failed ! ' + err));
          } else {
          }
        });
      }
    });
}

function exportPrivateSubKeys(uri: vscode.Uri) {
  promiseListPublicKeys()
    .then(stdout => promiseParseKeys(stdout))
    .then(map => promiseFilterKeys(map, (k: GnuPGKey) => k.isValidToEncrypt))
    .then(keys => promiseKeysToQuickPickItems(keys))
    .then(quickpickitems =>
      vscode.window.showQuickPick(quickpickitems, { placeHolder: 'Select key to export ...', canPickMany: false })
    )
    .then(user => {
      if (uri !== undefined && uri.scheme === 'file') {
        promiseExportSecretSubKeys(uri, user)
          .then(result => {
            let txt = result.toString();
            vscode.window.showInformationMessage(txt);
          })
          .catch(err => vscode.window.showErrorMessage('GnuPG export keys failed ! ' + err));
      } else {
        const option: vscode.OpenDialogOptions = { canSelectMany: false };
        vscode.window.showSaveDialog(option).then(uriSelected => {
          if (uriSelected && uriSelected.scheme === 'file') {
            promiseExportSecretSubKeys(uriSelected, user)
              .then(result => {
                let txt = result.toString();
                vscode.window.showInformationMessage(txt);
              })
              .catch(err => vscode.window.showErrorMessage('GnuPG export keys failed ! ' + err));
          } else {
          }
        });
      }
    });
}

// Uri Helper .......................................................

function encryptAsymUri(uri: vscode.Uri) {
  promiseListPublicKeys()
    .then(stdout => promiseParseKeys(stdout))
    .then(map => promiseFilterKeys(map, (k: GnuPGKey) => k.isValidToEncrypt))
    .then(keys => promiseKeysToQuickPickItems(keys))
    .then(quickpickitems =>
      vscode.window.showQuickPick(quickpickitems, { placeHolder: 'Select recipients ...', canPickMany: true })
    )
    .then(recipients => promiseEncryptAsymUri(uri, recipients))
    .then(() => vscode.window.showInformationMessage('GnuPG: File encrypted successfully.'))
    .catch(err => vscode.window.showErrorMessage('GnuPG encryption failed ! ' + err));
}

function encryptSymmUri(uri: vscode.Uri) {
  promiseEncryptSymUri(uri)
  .then(() => vscode.window.showInformationMessage('GnuPG: File encrypted successfully.'))
  .catch(err => vscode.window.showErrorMessage('GnuPG encryption failed ! ' + err));
}

function decryptUri(uri: vscode.Uri) {
  promiseDecryptUri(uri)
  .then(() => vscode.window.showInformationMessage('GnuPG: File decrypted successfully.'))
  .catch(err => vscode.window.showErrorMessage('GnuPG decryption failed ! ' + err));
}

function signUri(uri: vscode.Uri) {
  promiseListSecretKeys()
    .then(stdout => promiseParseKeys(stdout))
    .then(map => promiseFilterKeys(map, (k: GnuPGKey) => k.isValidToSign))
    .then(keys => promiseKeysToQuickPickItems(keys))
    .then(quickpickitems => vscode.window.showQuickPick(quickpickitems, { placeHolder: 'Select signer ...' }))
    .then(key => promiseSign(uri, key))
    .then(() => vscode.window.showInformationMessage('GnuPG: File signed successfully.'))
    .catch(err => vscode.window.showErrorMessage('GnuPG sign failed ! ' + err));
}

function launchGnuPGProviderEncryptAsym(uri: vscode.Uri) {
  // check filePath ...
  if (typeof uri === 'undefined' || !fs.existsSync(uri.fsPath)) {
    return;
  }

  // change uri for encryptprovider
  let newUri = vscode.Uri.file(uri.fsPath.concat(' - encrypted')).with({
    scheme: 'gnupg',
    authority: 'asymmetric'
  });

  // go on to content provider ...
  vscode.commands.executeCommand('vscode.open', newUri);
}

function launchGnuPGProviderEncryptSymm(uri: vscode.Uri) {
  // check filePath ...
  if (typeof uri === 'undefined' || !fs.existsSync(uri.fsPath)) {
    return;
  }

  // change uri for encryptprovider
  let newUri = vscode.Uri.file(uri.fsPath.concat(' - encrypted')).with({
    scheme: 'gnupg',
    authority: 'symmetric'
  });

  // go on to content provider ...
  vscode.commands.executeCommand('vscode.open', newUri);
}

function launchGnuPGProviderForDecrypt(uri: vscode.Uri) {
  // check filePath ...
  if (typeof uri === 'undefined' || !fs.existsSync(uri.fsPath)) {
    return;
  }

  // change uri for content provider
  let newUri = vscode.Uri.file(uri.fsPath.concat(' - decrypted')).with({ scheme: 'gnupg', authority: 'decrypt' });

  // go on to content provider ...
  vscode.commands.executeCommand('vscode.open', newUri);
}

function launchGnuPGProviderForVerify(uri: vscode.Uri) {
  // check filePath ...
  if (typeof uri === 'undefined' || !fs.existsSync(uri.fsPath)) {
    return;
  }

  // change uri for content provider
  let newUri = vscode.Uri.file(uri.fsPath.concat(' - verified')).with({ scheme: 'gnupg', authority: 'verify' });

  // go on to content provider ...
  vscode.commands.executeCommand('vscode.open', newUri);
}
