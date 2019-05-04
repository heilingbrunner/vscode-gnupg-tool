import * as vscode from 'vscode';
import * as fs from 'fs';
import * as cp from 'child_process';

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
  promiseEncryptAsymUri,
  promiseDeleteKey,
  promiseDeleteSecretKey
} from './gnupgpromises';
import VirtualDocumentProvider from './virtualdocumentprovider';
import GnuPGProvider from './gnupgprovider';
import { GnuPGKey } from './gnupgkey';
import { i18n } from './i18n';
import { getWorkspaceUri } from './utils';

let statusBarItem: vscode.StatusBarItem;

// extension plumping ...
export function activate(context: vscode.ExtensionContext) {
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);

  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider('virtual-document', new VirtualDocumentProvider())
  );

  context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('gnupg', new GnuPGProvider()));

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.Environment', (uri: vscode.Uri) => {
      let commands: { label: string; description?: string; detail?: string; tag: string }[] = []; //extended vscode.QuickPickItem

      commands.push({ label: i18n().CommandCheckGnuPG, tag: 'CommandCheckGnuPG' });
      commands.push({ label: i18n().CommandShowSmartcard, tag: 'CommandShowSmartcard' });
      commands.push({ label: i18n().CommandListPublicKeys, tag: 'CommandListPublicKeys' });
      commands.push({ label: i18n().CommandListSecretKeys, tag: 'CommandListSecretKeys' });
      commands.push({ label: i18n().CommandImportKeys, tag: 'CommandImportKeys' });
      commands.push({ label: i18n().CommandExportPublicKeys, tag: 'CommandExportPublicKeys' });
      commands.push({ label: i18n().CommandExportSecretKeys, tag: 'CommandExportSecretKeys' });
      commands.push({ label: i18n().CommandExportSecretSubKeys, tag: 'CommandExportSecretSubKeys' });
      commands.push({ label: i18n().CommandEndSession, tag: 'CommandEndSession' });

      vscode.window.showQuickPick(commands).then(selectedCommand => {
        if (!selectedCommand) {
          return;
        }

        const editor = vscode.window.activeTextEditor;

        switch (selectedCommand.tag) {
          case 'CommandCheckGnuPG':
            showVersion().then(() => {
              checkGnuPG();
            });
            break;
          case 'CommandListPublicKeys':
            listPublicKeys();
            break;
          case 'CommandListSecretKeys':
            listPrivateKeys();
            break;
          case 'CommandShowSmartcard':
            showSmartcard();
            break;
          case 'CommandImportKeys':
            importKeys(uri);
            break;
          case 'CommandExportPublicKeys':
            exportPublicKeys(uri);
            break;
          case 'CommandExportSecretKeys':
            exportPrivateKeys(uri);
            break;
          case 'CommandExportSecretSubKeys':
            exportPrivateSubKeys(uri);
            break;
          case 'CommandEndSession':
            endSession();
            break;
        }
      });
    })
  );

  // submenu Encrypt ...
  context.subscriptions.push(
    vscode.commands.registerCommand('extension.Encrypt', (uri: vscode.Uri) => {
      let commands: { label: string; description?: string; detail?: string; tag: string }[] = []; //extended vscode.QuickPickItem

      // fill array with commands
      commands.push({ label: i18n().CommandEncryptSelectionAsym, tag: 'CommandEncryptSelectionAsym' });
      commands.push({ label: i18n().CommandEncryptSelectionSymm, tag: 'CommandEncryptSelectionSymm' });
      commands.push({ label: i18n().CommandEncryptFileAsym, tag: 'CommandEncryptFileAsym' });
      commands.push({ label: i18n().CommandEncryptFileSymm, tag: 'CommandEncryptFileSymm' });
      commands.push({ label: i18n().CommandEncryptPreviewAsym, tag: 'CommandEncryptPreviewAsym' });
      commands.push({ label: i18n().CommandEncryptPreviewSymm, tag: 'CommandEncryptPreviewSymm' });

      // show array as quickpick
      vscode.window.showQuickPick(commands).then(selectedCommand => {
        if (!selectedCommand) {
          return;
        }

        const editor = vscode.window.activeTextEditor;

        switch (selectedCommand.tag) {
          case 'CommandEncryptSelectionAsym':
            if (editor) {
              encryptAsymSelection(editor);
            }
            break;
          case 'CommandEncryptSelectionSymm':
            if (editor) {
              encryptSymmSelection(editor);
            }
            break;
          case 'CommandEncryptFileAsym':
            encryptAsymFile(uri);
            break;
          case 'CommandEncryptFileSymm':
            encryptSymmFile(uri);
            break;
          case 'CommandEncryptPreviewAsym':
            encryptPreviewAsym(uri);
            break;
          case 'CommandEncryptPreviewSymm':
            encryptPreviewSymm(uri);
            break;
        }
      });
    })
  );

  // submenu Decrypt ...
  context.subscriptions.push(
    vscode.commands.registerCommand('extension.Decrypt', (uri: vscode.Uri) => {
      let commands: { label: string; description?: string; detail?: string; tag: string }[] = []; //extended vscode.QuickPickItem

      // fill array with commands
      commands.push({ label: i18n().CommandDecryptSelection, tag: 'CommandDecryptSelection' });
      commands.push({ label: i18n().CommandDecryptFile, tag: 'CommandDecryptFile' });
      commands.push({ label: i18n().CommandDecryptPreview, tag: 'CommandDecryptPreview' });

      // show array as quickpick
      vscode.window.showQuickPick(commands).then(selectedCommand => {
        if (!selectedCommand) {
          return;
        }

        const editor = vscode.window.activeTextEditor;

        switch (selectedCommand.tag) {
          case 'CommandDecryptSelection':
            if (editor) {
              decryptSelection(editor);
            }
            break;
          case 'CommandDecryptFile':
            decryptFile(uri);
            break;
          case 'CommandDecryptPreview':
            decryptPreview(uri);
            break;
        }
      });
    })
  );

  // submenu Trust ...
  context.subscriptions.push(
    vscode.commands.registerCommand('extension.Trust', (uri: vscode.Uri) => {
      let commands: { label: string; description?: string; detail?: string; tag: string }[] = []; //extended vscode.QuickPickItem

      // fill array with commands
      commands.push({ label: i18n().CommandSignFile, tag: 'CommandSignFile' });
      commands.push({ label: i18n().CommandVerifyFile, tag: 'CommandVerifyFile' });

      // show array as quickpick
      vscode.window.showQuickPick(commands).then(selectedCommand => {
        if (!selectedCommand) {
          return;
        }

        const editor = vscode.window.activeTextEditor;

        switch (selectedCommand.tag) {
          case 'CommandSignFile':
            signFile(uri);
            break;
          case 'CommandVerifyFile':
            verifyFile(uri);
            break;
        }
      });
    })
  );

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
    vscode.commands.registerCommand('extension.EncryptPreviewAsym', (uri: vscode.Uri) => {
      encryptPreviewAsym(uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.EncryptPreviewSymm', (uri: vscode.Uri) => {
      encryptPreviewSymm(uri);
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
    vscode.commands.registerCommand('extension.DecryptPreview', (uri: vscode.Uri) => {
      decryptPreview(uri);
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

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.EditPublicKey', () => {
      editPublicKey();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.GenerateKey', () => {
      generateKey();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.DeleteKey', () => {
      deleteKey();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.DeleteSecretKey', () => {
      deleteSecretKey();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.CopyFingerprintToClipboard', () => {
      copyFingerprintToClipboard();
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
      vscode.window.showErrorMessage(i18n().GnuPGGpgNotAvailable + ' ' + err);
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
          vscode.window.showQuickPick(quickpickitems, { placeHolder: i18n().SelectRecipients, canPickMany: true })
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
          if (encrypted !== undefined) {
            editor.edit(edit => edit.replace(selection, encrypted.toString('utf8')));
          }
        })
        .catch(err => vscode.window.showErrorMessage(i18n().GnuPGEncryptionFailed + ' ' + err));
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
        .catch(err => vscode.window.showErrorMessage(i18n().GnuPGEncryptionFailed + ' ' + err));
    } else {
      vscode.window.showWarningMessage(i18n().GnuPGNoTextSelectedForEncryption);
    }
  }
}

function encryptAsymFile(uri: vscode.Uri) {
  if (uri !== undefined && uri.scheme === 'file') {
    if (uri.fsPath.match(/\.(asc)$/i)) {
      vscode.window.showInformationMessage(i18n().GnuPGFileAlreadyEncrypted);
    } else {
      encryptAsymUri(uri);
    }
  } else {
    const option: vscode.OpenDialogOptions = { canSelectMany: false, defaultUri: getWorkspaceUri() };
    vscode.window.showOpenDialog(option).then(uriSelected => {
      if (uriSelected && uriSelected[0] && uriSelected[0].scheme === 'file') {
        if (uriSelected[0].fsPath.match(/\.(asc)$/i)) {
          vscode.window.showInformationMessage(i18n().GnuPGFileAlreadyEncrypted);
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
      vscode.window.showInformationMessage(i18n().GnuPGFileAlreadyEncrypted);
    } else {
      encryptSymmUri(uri);
    }
  } else {
    const option: vscode.OpenDialogOptions = { canSelectMany: false, defaultUri: getWorkspaceUri() };
    vscode.window.showOpenDialog(option).then(uriSelected => {
      if (uriSelected && uriSelected[0] && uriSelected[0].scheme === 'file') {
        if (uriSelected[0].fsPath.match(/\.(asc)$/i)) {
          vscode.window.showInformationMessage(i18n().GnuPGFileAlreadyEncrypted);
        } else {
          encryptSymmUri(uriSelected[0]);
        }
      }
    });
  }
}

function encryptPreviewAsym(uri: vscode.Uri) {
  if (uri !== undefined && uri.scheme === 'file') {
    if (uri.fsPath.match(/\.(asc)$/i)) {
      vscode.window.showInformationMessage(i18n().GnuPGFileAlreadyEncrypted);
    } else {
      launchGnuPGProviderEncryptAsym(uri);
    }
  } else {
    const option: vscode.OpenDialogOptions = { canSelectMany: false, defaultUri: getWorkspaceUri() };
    vscode.window.showOpenDialog(option).then(uriSelected => {
      if (uriSelected && uriSelected[0] && uriSelected[0].scheme === 'file') {
        if (uriSelected[0].fsPath.match(/\.(asc)$/i)) {
          vscode.window.showInformationMessage(i18n().GnuPGFileAlreadyEncrypted);
        } else {
          launchGnuPGProviderEncryptAsym(uriSelected[0]);
        }
      }
    });
  }
}

function encryptPreviewSymm(uri: vscode.Uri) {
  if (uri !== undefined && uri.scheme === 'file') {
    if (uri.fsPath.match(/\.(asc)$/i)) {
      vscode.window.showInformationMessage(i18n().GnuPGFileAlreadyEncrypted);
    } else {
      launchGnuPGProviderEncryptSymm(uri);
    }
  } else {
    const option: vscode.OpenDialogOptions = { canSelectMany: false, defaultUri: getWorkspaceUri() };
    vscode.window.showOpenDialog(option).then(uriSelected => {
      if (uriSelected && uriSelected[0] && uriSelected[0].scheme === 'file') {
        if (uriSelected[0].fsPath.match(/\.(asc)$/i)) {
          vscode.window.showInformationMessage(i18n().GnuPGFileAlreadyEncrypted);
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
              vscode.window.showErrorMessage(i18n().GnuPGDecryptionFailed);
            }
          }
        })
        .catch(err => vscode.window.showErrorMessage(i18n().GnuPGDecryptionFailed + ' ' + err));
    } else {
      vscode.window.showWarningMessage(i18n().GnuPGNoTextSelectedForDecryption);
    }
  }
}

function decryptFile(uri: vscode.Uri) {
  if (uri !== undefined && uri.scheme === 'file') {
    if (uri.fsPath.match(/\.(asc|gpg)$/i)) {
      decryptUri(uri);
    } else {
      vscode.window.showInformationMessage(i18n().GnuPGFileNotEncrypted);
    }
  } else {
    const option: vscode.OpenDialogOptions = { canSelectMany: false, defaultUri: getWorkspaceUri() };
    vscode.window.showOpenDialog(option).then(uriSelected => {
      if (uriSelected && uriSelected[0] && uriSelected[0].scheme === 'file') {
        if (uriSelected[0].fsPath.match(/\.(asc)$/i)) {
          decryptUri(uriSelected[0]);
        } else {
          vscode.window.showInformationMessage(i18n().GnuPGFileNotEncrypted);
        }
      }
    });
  }
}

function decryptPreview(uri: vscode.Uri) {
  if (uri !== undefined && uri.scheme === 'file') {
    if (uri.fsPath.match(/\.(asc|gpg)$/i)) {
      launchGnuPGProviderForDecrypt(uri);
    } else {
      vscode.window.showInformationMessage(i18n().GnuPGFileNotEncrypted);
    }
  } else {
    const option: vscode.OpenDialogOptions = { canSelectMany: false, defaultUri: getWorkspaceUri() };
    vscode.window.showOpenDialog(option).then(uriSelected => {
      if (uriSelected && uriSelected[0] && uriSelected[0].scheme === 'file') {
        if (uriSelected[0].fsPath.match(/\.(asc)$/i)) {
          launchGnuPGProviderForDecrypt(uriSelected[0]);
        } else {
          vscode.window.showInformationMessage(i18n().GnuPGFileNotEncrypted);
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
      vscode.window.showInformationMessage(i18n().GnuPGFileIsAlreadyASignature);
    }
  } else {
    const option: vscode.OpenDialogOptions = { canSelectMany: false, defaultUri: getWorkspaceUri() };
    vscode.window.showOpenDialog(option).then(uriSelected => {
      if (uriSelected && uriSelected[0] && uriSelected[0].scheme === 'file') {
        if (!uriSelected[0].fsPath.match(/\.(sig)$/i)) {
          signUri(uriSelected[0]);
        } else {
          vscode.window.showInformationMessage(i18n().GnuPGFileIsAlreadyASignature);
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
      vscode.window.showInformationMessage(i18n().GnuPGFileIsNotASignature);
    }
  } else {
    const option: vscode.OpenDialogOptions = { canSelectMany: false, defaultUri: getWorkspaceUri() };
    vscode.window.showOpenDialog(option).then(uriSelected => {
      if (uriSelected && uriSelected[0] && uriSelected[0].scheme === 'file') {
        if (!uriSelected[0].fsPath.match(/\.(sig)$/i)) {
          launchGnuPGProviderForVerify(uriSelected[0]);
        } else {
          vscode.window.showInformationMessage(i18n().GnuPGFileIsNotASignature);
        }
      }
    });
  }
}

function endSession() {
  promiseKillGpgAgent()
    .then(() => vscode.window.showInformationMessage(i18n().GnuPGEndSessionSuccessfully))
    .catch(err => vscode.window.showErrorMessage(i18n().GnuPGEndSessionFailed + ' ' + err));
}

function importKeys(uri: vscode.Uri) {
  if (uri !== undefined && uri.scheme === 'file') {
    promiseImportKeys(uri)
      .then(result => {
        let txt = result.toString();
        vscode.window.showInformationMessage('GnuPG: ' + txt);
      })
      .catch(err => vscode.window.showErrorMessage(i18n().GnuPGKeyImportFailed + ' ' + err));
  } else {
    const option: vscode.OpenDialogOptions = { canSelectMany: false, defaultUri: getWorkspaceUri() };
    vscode.window.showOpenDialog(option).then(uriSelected => {
      if (uriSelected && uriSelected[0] && uriSelected[0].scheme === 'file') {
        promiseImportKeys(uriSelected[0])
          .then(result => {
            let txt = result.toString();
            vscode.window.showInformationMessage('GnuPG: ' + txt);
          })
          .catch(err => vscode.window.showErrorMessage(i18n().GnuPGKeyImportFailed + ' ' + err));
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
      vscode.window.showQuickPick(quickpickitems, { placeHolder: i18n().SelectKeyToExport, canPickMany: false })
    )
    .then(user => {
      if (uri !== undefined && uri.scheme === 'file') {
        promiseExportPublicKeys(uri, user)
          .then(result => {
            let txt = result.toString();
            vscode.window.showInformationMessage(txt);
          })
          .catch(err => vscode.window.showErrorMessage(i18n().GnuPGKeyExportFailed + ' ' + err));
      } else {
        const option: vscode.OpenDialogOptions = { canSelectMany: false, defaultUri: getWorkspaceUri() };
        vscode.window.showSaveDialog(option).then(uriSelected => {
          if (uriSelected && uriSelected.scheme === 'file') {
            promiseExportPublicKeys(uriSelected, user)
              .then(result => {
                let txt = result.toString();
                vscode.window.showInformationMessage(txt);
              })
              .catch(err => vscode.window.showErrorMessage(i18n().GnuPGKeyExportFailed + ' ' + err));
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
      vscode.window.showQuickPick(quickpickitems, { placeHolder: i18n().SelectKeyToExport, canPickMany: false })
    )
    .then(user => {
      if (uri !== undefined && uri.scheme === 'file') {
        promiseExportSecretKeys(uri, user)
          .then(result => {
            let txt = result.toString();
            vscode.window.showInformationMessage(txt);
          })
          .catch(err => vscode.window.showErrorMessage(i18n().GnuPGKeyExportFailed + ' ' + err));
      } else {
        const option: vscode.OpenDialogOptions = { canSelectMany: false, defaultUri: getWorkspaceUri() };
        vscode.window.showSaveDialog(option).then(uriSelected => {
          if (uriSelected && uriSelected.scheme === 'file') {
            promiseExportSecretKeys(uriSelected, user)
              .then(result => {
                let txt = result.toString();
                vscode.window.showInformationMessage(txt);
              })
              .catch(err => vscode.window.showErrorMessage(i18n().GnuPGKeyExportFailed + ' ' + err));
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
      vscode.window.showQuickPick(quickpickitems, { placeHolder: i18n().SelectKeyToExport, canPickMany: false })
    )
    .then(user => {
      if (uri !== undefined && uri.scheme === 'file') {
        promiseExportSecretSubKeys(uri, user)
          .then(result => {
            let txt = result.toString();
            vscode.window.showInformationMessage(txt);
          })
          .catch(err => vscode.window.showErrorMessage(i18n().GnuPGKeyExportFailed + ' ' + err));
      } else {
        const option: vscode.OpenDialogOptions = { canSelectMany: false, defaultUri: getWorkspaceUri() };
        vscode.window.showSaveDialog(option).then(uriSelected => {
          if (uriSelected && uriSelected.scheme === 'file') {
            promiseExportSecretSubKeys(uriSelected, user)
              .then(result => {
                let txt = result.toString();
                vscode.window.showInformationMessage(txt);
              })
              .catch(err => vscode.window.showErrorMessage(i18n().GnuPGKeyExportFailed + ' ' + err));
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
      vscode.window.showQuickPick(quickpickitems, { placeHolder: i18n().SelectRecipients, canPickMany: true })
    )
    .then(recipients => {
      if (recipients && recipients.length > 0) {
        return promiseEncryptAsymUri(uri, recipients);
      } else {
        return new Promise<Buffer>((resolve, reject) => {
          reject('No recipients selected for encryption.');
        });
      }
    })
    .then(() => vscode.window.showInformationMessage(i18n().GnuPGFileEncryptedSuccessfully))
    .catch(err => vscode.window.showErrorMessage(i18n().GnuPGEncryptionFailed + ' ' + err));
}

function encryptSymmUri(uri: vscode.Uri) {
  promiseEncryptSymUri(uri)
    .then(() => vscode.window.showInformationMessage(i18n().GnuPGFileEncryptedSuccessfully))
    .catch(err => vscode.window.showErrorMessage(i18n().GnuPGEncryptionFailed + ' ' + err));
}

function decryptUri(uri: vscode.Uri) {
  promiseDecryptUri(uri)
    .then(() => vscode.window.showInformationMessage(i18n().GnuPGFileDecryptedSuccessfully))
    .catch(err => vscode.window.showErrorMessage(i18n().GnuPGDecryptionFailed + ' ' + err));
}

function signUri(uri: vscode.Uri) {
  promiseListSecretKeys()
    .then(stdout => promiseParseKeys(stdout))
    .then(map => promiseFilterKeys(map, (k: GnuPGKey) => k.isValidToSign))
    .then(keys => promiseKeysToQuickPickItems(keys))
    .then(quickpickitems => vscode.window.showQuickPick(quickpickitems, { placeHolder: i18n().SelectSigner }))
    .then(key => promiseSign(uri, key))
    .then(() => vscode.window.showInformationMessage(i18n().GnuPGFileSignedSuccessfully))
    .catch(err => vscode.window.showErrorMessage(i18n().GnuPGSignFailed + ' ' + err));
}

function launchGnuPGProviderEncryptAsym(uri: vscode.Uri) {
  // check filePath ...
  if (typeof uri === 'undefined' || !fs.existsSync(uri.fsPath)) {
    return;
  }

  // change uri for encryptprovider
  let newUri = vscode.Uri.file(uri.fsPath.concat(' - ' + i18n().Encrypted)).with({
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
  let newUri = vscode.Uri.file(uri.fsPath.concat(' - ' + i18n().Encrypted)).with({
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
  let newUri = vscode.Uri.file(uri.fsPath.concat(' - ' + i18n().Decrypted)).with({
    scheme: 'gnupg',
    authority: 'decrypt'
  });

  // go on to content provider ...
  vscode.commands.executeCommand('vscode.open', newUri);
}

function launchGnuPGProviderForVerify(uri: vscode.Uri) {
  // check filePath ...
  if (typeof uri === 'undefined' || !fs.existsSync(uri.fsPath)) {
    return;
  }

  // change uri for content provider
  let newUri = vscode.Uri.file(uri.fsPath.concat(' - ' + i18n().Verified)).with({
    scheme: 'gnupg',
    authority: 'verify'
  });

  // go on to content provider ...
  vscode.commands.executeCommand('vscode.open', newUri);
}

function editPublicKey() {
  promiseListPublicKeys()
    .then(stdout => promiseParseKeys(stdout))
    .then(map => promiseFilterKeys(map, (k: GnuPGKey) => k.isValidToEncrypt))
    .then(keys => promiseKeysToQuickPickItems(keys))
    .then(quickpickitems =>
      vscode.window.showQuickPick(quickpickitems, { placeHolder: i18n().GnuPGSelectPublicKey, canPickMany: false })
    )
    .then(pubkey => {
      if (pubkey) {
        const terminal = vscode.window.createTerminal(`GnuPG Terminal`);
        terminal.show();
        terminal.sendText('gpg --edit-key ' + pubkey.fingerprint, false);
      }
    })
    .catch(err => vscode.window.showErrorMessage(i18n().GnuPGEditPublicKeyFailed + ' ' + err));
}

function generateKey() {
  const terminal = vscode.window.createTerminal(`GnuPG Terminal`);
  terminal.show();
  terminal.sendText('gpg --full-generate-key', false);
}

function deleteKey() {
  promiseListPublicKeys()
    .then(stdout => promiseParseKeys(stdout))
    .then(map => promiseFilterKeys(map, (k: GnuPGKey) => k.isValidToEncrypt))
    .then(keys => promiseKeysToQuickPickItems(keys))
    .then(quickpickitems =>
      vscode.window.showQuickPick(quickpickitems, { placeHolder: i18n().GnuPGSelectPublicKey, canPickMany: false })
    )
    .then(key => promiseDeleteKey(key))
    .then(() => vscode.window.showInformationMessage(i18n().GnuPGPublicKeyDeletedSuccessfully))
    .catch(err => vscode.window.showErrorMessage(i18n().GnuPGDeleteKeyFailed + ' ' + err));
}

function deleteSecretKey() {
  promiseListSecretKeys()
    .then(stdout => promiseParseKeys(stdout))
    .then(map => promiseFilterKeys(map, (k: GnuPGKey) => k.isValidToEncrypt))
    .then(keys => promiseKeysToQuickPickItems(keys))
    .then(quickpickitems =>
      vscode.window.showQuickPick(quickpickitems, { placeHolder: i18n().GnuPGSelectPublicKey, canPickMany: false })
    )
    .then(key => promiseDeleteSecretKey(key))
    .then(() => vscode.window.showInformationMessage(i18n().GnuPGSecretKeyDeletedSuccessfully))
    .catch(err => vscode.window.showErrorMessage(i18n().GnuPGDeleteSecretKeyFailed + ' ' + err));
}

function copyFingerprintToClipboard() {
  promiseListPublicKeys()
    .then(stdout => promiseParseKeys(stdout))
    .then(map => promiseFilterKeys(map, (k: GnuPGKey) => k.isValidToEncrypt))
    .then(keys => promiseKeysToQuickPickItems(keys))
    .then(quickpickitems =>
      vscode.window.showQuickPick(quickpickitems, { placeHolder: i18n().GnuPGSelectPublicKey, canPickMany: false })
    )
    .then(async key => {
      try {
        return new Promise(function (reject, resolve) {
          if (key) {
            switch (process.platform) {
              case "darwin":
                cp.exec('echo ' + key.fingerprint + ' | pbcopy');
                break;
              case "win32":
                cp.exec('echo ' + key.fingerprint + ' | clip');
                break;
              case "linux":
                cp.exec('echo ' + key.fingerprint + ' | xclip');
                break;
              default:
                throw new Error(i18n().GnuPGNotSupportedPlatform + "'" + process.platform + "'");
            }
          }
        });
      }
      catch (err) {
        return await vscode.window.showErrorMessage(i18n().GnuPGCopyFingerprintToClipboardFailed + ' ' + err);
      }
    });
}