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
  promiseDeletePublicKey,
  promiseDeleteSecretKey,
  promiseClearSign,
  promiseCheckHomeDir
} from './gnupgpromises';
import VirtualDocumentProvider from './virtualdocumentprovider';
import GnuPGProvider from './gnupgprovider';
import { GnuPGKey } from './gnupgkey';
import { i18n } from './i18n';
import { getWorkspaceUri } from './utils';
import { GnuPGParameters } from './gnupgparameters';

let statusBarItem: vscode.StatusBarItem;

// extension plumping ...
export async function activate(context: vscode.ExtensionContext) {
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);

  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider('virtual-document', new VirtualDocumentProvider())
  );

  context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('gnupg', new GnuPGProvider()));

  // submenu Environment ...
  context.subscriptions.push(
    vscode.commands.registerCommand('extension.Environment', async (_uri: vscode.Uri) => {
      let commands: { label: string; description?: string; detail?: string; tag: string }[] = []; //extended vscode.QuickPickItem

      commands.push({ label: i18n().CommandCheckGnuPG, tag: 'CommandCheckGnuPG' });
      commands.push({ label: i18n().CommandShowSmartcard, tag: 'CommandShowSmartcard' });
      commands.push({ label: i18n().CommandEndSession, tag: 'CommandEndSession' });

      const selectedCommand = await vscode.window.showQuickPick(commands); //.then(selectedCommand => {

      if (!selectedCommand) {
        return;
      }

      const editor = vscode.window.activeTextEditor;

      switch (selectedCommand.tag) {
        case 'CommandCheckGnuPG':
          await promiseKillGpgAgent();
          showVersion();
          break;
        case 'CommandShowSmartcard':
          showSmartcard();
          break;
        case 'CommandEndSession':
          endSession();
          break;
      }
      //});
    })
  );

  // submenu Keys ...
  context.subscriptions.push(
    vscode.commands.registerCommand('extension.Keys', async (uri: vscode.Uri) => {
      let commands: { label: string; description?: string; detail?: string; tag: string }[] = []; //extended vscode.QuickPickItem

      commands.push({ label: i18n().CommandGenerateKey, tag: 'CommandGenerateKey' });
      commands.push({ label: i18n().CommandEditPublicKey, tag: 'CommandEditPublicKey' });
      commands.push({ label: i18n().CommandCopyFingerprintToClipboard, tag: 'CommandCopyFingerprintToClipboard' });
      commands.push({ label: i18n().CommandCopyKeyIdToClipboard, tag: 'CommandCopyKeyIdToClipboard' });
      commands.push({ label: i18n().CommandListPublicKeys, tag: 'CommandListPublicKeys' });
      commands.push({ label: i18n().CommandListSecretKeys, tag: 'CommandListSecretKeys' });
      commands.push({ label: i18n().CommandImportKeys, tag: 'CommandImportKeys' });
      commands.push({ label: i18n().CommandExportPublicKeys, tag: 'CommandExportPublicKeys' });
      commands.push({ label: i18n().CommandExportSecretKeys, tag: 'CommandExportSecretKeys' });
      commands.push({ label: i18n().CommandExportSecretSubKeys, tag: 'CommandExportSecretSubKeys' });
      commands.push({ label: i18n().CommandDeletePublicKey, tag: 'CommandDeletePublicKey' });
      commands.push({ label: i18n().CommandDeleteSecretKey, tag: 'CommandDeleteSecretKey' });

      const selectedCommand = await vscode.window.showQuickPick(commands); //.then(selectedCommand => {

      if (!selectedCommand) {
        return;
      }

      const editor = vscode.window.activeTextEditor;

      switch (selectedCommand.tag) {
        case 'CommandGenerateKey':
          generateKey();
          break;
        case 'CommandEditPublicKey':
          editPublicKey();
          break;
        case 'CommandCopyFingerprintToClipboard':
          copyFingerprintToClipboard();
          break;
        case 'CommandCopyKeyIdToClipboard':
          copyKeyIdToClipboard();
          break;
        case 'CommandListPublicKeys':
          listPublicKeys();
          break;
        case 'CommandListSecretKeys':
          listPrivateKeys();
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
        case 'CommandDeletePublicKey':
          deletePublicKey();
          break;
        case 'CommandDeleteSecretKey':
          deleteSecretKey();
          break;
      }
      //});
    })
  );

  // submenu Encrypt ...
  context.subscriptions.push(
    vscode.commands.registerCommand('extension.Encrypt', async (uri: vscode.Uri) => {
      let commands: { label: string; description?: string; detail?: string; tag: string }[] = []; //extended vscode.QuickPickItem

      // fill array with commands
      commands.push({ label: i18n().CommandEncryptSelectionAsym, tag: 'CommandEncryptSelectionAsym' });
      commands.push({ label: i18n().CommandEncryptSelectionSymm, tag: 'CommandEncryptSelectionSymm' });
      commands.push({ label: i18n().CommandEncryptFileAsym, tag: 'CommandEncryptFileAsym' });
      commands.push({ label: i18n().CommandEncryptFileSymm, tag: 'CommandEncryptFileSymm' });
      commands.push({ label: i18n().CommandEncryptPreviewAsym, tag: 'CommandEncryptPreviewAsym' });
      commands.push({ label: i18n().CommandEncryptPreviewSymm, tag: 'CommandEncryptPreviewSymm' });

      // show array as quickpick
      const selectedCommand = await vscode.window.showQuickPick(commands); //.then(selectedCommand => {

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
      //});
    })
  );

  // submenu Decrypt ...
  context.subscriptions.push(
    vscode.commands.registerCommand('extension.Decrypt', async (uri: vscode.Uri) => {
      let commands: { label: string; description?: string; detail?: string; tag: string }[] = []; //extended vscode.QuickPickItem

      // fill array with commands
      commands.push({ label: i18n().CommandDecryptSelection, tag: 'CommandDecryptSelection' });
      commands.push({ label: i18n().CommandDecryptFile, tag: 'CommandDecryptFile' });
      commands.push({ label: i18n().CommandDecryptPreview, tag: 'CommandDecryptPreview' });

      // show array as quickpick
      const selectedCommand = await vscode.window.showQuickPick(commands); //.then(selectedCommand => {

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
      //});
    })
  );

  // submenu Trust ...
  context.subscriptions.push(
    vscode.commands.registerCommand('extension.Trust', async (uri: vscode.Uri) => {
      let commands: { label: string; description?: string; detail?: string; tag: string }[] = []; //extended vscode.QuickPickItem

      // fill array with commands
      commands.push({ label: i18n().CommandSignFile, tag: 'CommandSignFile' });
      commands.push({ label: i18n().CommandClearSignFile, tag: 'CommandClearSignFile' });
      commands.push({ label: i18n().CommandVerifyFile, tag: 'CommandVerifyFile' });

      // show array as quickpick
      const selectedCommand = await vscode.window.showQuickPick(commands); //.then(selectedCommand => {

      if (!selectedCommand) {
        return;
      }

      const editor = vscode.window.activeTextEditor;

      switch (selectedCommand.tag) {
        case 'CommandSignFile':
          signFile(uri);
          break;
        case 'CommandClearSignFile':
          clearSignFile(uri);
          break;
        case 'CommandVerifyFile':
          verifyFile(uri);
          break;
      }
      //});
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.CheckGnuPG', async () => {
      //includes checkGnuPG();
      await showVersion();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.ListPublicKeys', async () => {
      await listPublicKeys();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.ListSecretKeys', async () => {
      await listPrivateKeys();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.ShowSmartcard', async () => {
      await showSmartcard();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.EncryptSelectionAsym', async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        await encryptAsymSelection(editor);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.EncryptSelectionSymm', async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        await encryptSymmSelection(editor);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.EncryptFileAsym', async (uri: vscode.Uri) => {
      await encryptAsymFile(uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.EncryptFileSymm', async (uri: vscode.Uri) => {
      await encryptSymmFile(uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.EncryptPreviewAsym', async (uri: vscode.Uri) => {
      await encryptPreviewAsym(uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.EncryptPreviewSymm', async (uri: vscode.Uri) => {
      await encryptPreviewSymm(uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.DecryptSelection', async () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        await decryptSelection(editor);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.DecryptFile', async (uri: vscode.Uri) => {
      await decryptFile(uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.DecryptPreview', async (uri: vscode.Uri) => {
      await decryptPreview(uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.SignFile', async (uri: vscode.Uri) => {
      await signFile(uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.ClearSignFile', async (uri: vscode.Uri) => {
      await clearSignFile(uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.VerifyFile', async (uri: vscode.Uri) => {
      await verifyFile(uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.EndSession', async () => {
      await endSession();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.ImportKeys', async (uri: vscode.Uri) => {
      await importKeys(uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.ExportPublicKeys', async (uri: vscode.Uri) => {
      await exportPublicKeys(uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.ExportSecretKeys', async (uri: vscode.Uri) => {
      await exportPrivateKeys(uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.ExportSecretSubKeys', async (uri: vscode.Uri) => {
      await exportPrivateSubKeys(uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.EditPublicKey', async () => {
      await editPublicKey();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.GenerateKey', async () => {
      await generateKey();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.DeleteKey', async () => {
      await deletePublicKey();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.DeleteSecretKey', async () => {
      await deleteSecretKey();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.CopyFingerprintToClipboard', async () => {
      await copyFingerprintToClipboard();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.CopyKeyIdToClipboard', async () => {
      await copyKeyIdToClipboard();
    })
  );

  await promiseKillGpgAgent();
  await checkGnuPG();
}

// this method is called when your extension is deactivated
export function deactivate() {
  statusBarItem.hide();
}

// Commands .......................................................

async function checkGnuPG() {
  //return new Promise<undefined>(resolve => {

  // async/await ...
  try {
    GnuPGParameters.homedir = await promiseCheckHomeDir();

    const stdout = await promiseCheckVersion();
    const lines = await promiseBufferToLines(stdout);

    if (GnuPGParameters.homedir) {
      vscode.window.showInformationMessage(i18n().GnuPGUsingHomedir + '=' + GnuPGParameters.homedir);
    }

    statusBarItem_show(lines);

  } catch (err) {
    statusBarItem.hide();
    vscode.window.showErrorMessage(i18n().GnuPGGpgNotAvailable + ' ' + err);
  }

  // promiseCheckHomeDir()
  //   .then(changedhomedir => {
  //     GnuPGParameters.homedir = changedhomedir;

  //     if (changedhomedir) {
  //       vscode.window.showInformationMessage(i18n().GnuPGUsingHomedir + '=' + GnuPGParameters.homedir);
  //     }
  //   })
  //   .then(_ => promiseCheckVersion())
  //   .then(stdout => promiseBufferToLines(stdout))
  //   .then(lines => {
  //     if (lines.length >= 2) {
  //       statusBarItem.text = `$(mirror-private) ` + lines[0];
  //       statusBarItem.show();
  //     }
  //   })
  //   .catch(err => {
  //     statusBarItem.hide();
  //     vscode.window.showErrorMessage(i18n().GnuPGGpgNotAvailable + ' ' + err);
  //   });

  //resolve(undefined);
  //}
  //);
}

async function statusBarItem_show(lines: string[]) {
  if (lines.length >= 2) {
    statusBarItem.text = `$(mirror-private) ` + lines[0];
    statusBarItem.show();
  }
}

async function showVersion() {
  let newUri = vscode.Uri.parse('virtual-document://gnupg/GnuPG-Version');
  vscode.commands.executeCommand('vscode.open', newUri);
}

async function listPublicKeys() {
  let newUri = vscode.Uri.parse('virtual-document://gnupg/GnuPG-Public-Keys');
  vscode.commands.executeCommand('vscode.open', newUri);
}

async function listPrivateKeys() {
  let newUri = vscode.Uri.parse('virtual-document://gnupg/GnuPG-Private-Keys');
  vscode.commands.executeCommand('vscode.open', newUri);
}

async function showSmartcard() {
  let newUri = vscode.Uri.parse('virtual-document://gnupg/GnuPG-Smartcard');
  vscode.commands.executeCommand('vscode.open', newUri);
}

async function encryptAsymSelection(editor: vscode.TextEditor) {
  if (editor) {
    const selection = editor.selection;
    const content = new Buffer(editor.document.getText(selection));

    if (content && content.length > 0) {
      // async/await ...
      // TODO ...
      // try {
      //   const stdout = await promiseListPublicKeys();
      //   const map = await promiseParseKeys(stdout);
      //   const keys = await promiseFilterKeys(map, (k: GnuPGKey) => k.isValidToEncrypt);
      //   const quickpickitems = await promiseKeysToQuickPickItems(keys);
      //   const recipients = await vscode.window.showQuickPick(quickpickitems, { placeHolder: i18n().SelectRecipients, canPickMany: true });
      //   const encrypted = await async function (){
      //     if (recipients && recipients.length > 0) {
      //     return promiseEncryptAsymBuffer(content, recipients);
      //   } else {
      //     return new Promise<Buffer>((_resolve, reject) => {
      //       reject(i18n().GnuPGNoRecipientsSelectedForEncryption);
      //     });
      //   }};
      //   await async function () {
      //     if (encrypted !== undefined) {
      //       await editor.edit(edit => edit.replace(selection, encrypted.toString('utf8')));
      //     }
      //   };
      // } catch (err) {
      //   await vscode.window.showErrorMessage(i18n().GnuPGEncryptionFailed + ' ' + err);
      // }

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
            return new Promise<Buffer>((_resolve, reject) => {
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

async function encryptSymmSelection(editor: vscode.TextEditor) {
  if (editor) {
    const selection = editor.selection;
    const content = new Buffer(editor.document.getText(selection));

    if (content && content.length > 0) {
      // async/await ...
      try {
        const encrypted = await promiseEncryptSymBuffer(content);
        if (encrypted !== undefined) {
          await editor.edit(edit => edit.replace(selection, encrypted.toString('utf8')));
        }
      } catch (err) {
        vscode.window.showErrorMessage(i18n().GnuPGEncryptionFailed + ' ' + err);
      }

      // promises chain ...
      // promiseEncryptSymBuffer(content)
      //   .then(encrypted => {
      //     if (encrypted !== undefined) {
      //       editor.edit(edit => edit.replace(selection, encrypted.toString('utf8')));
      //     }
      //   })
      //   .catch(err => vscode.window.showErrorMessage(i18n().GnuPGEncryptionFailed + ' ' + err));
    } else {
      vscode.window.showWarningMessage(i18n().GnuPGNoTextSelectedForEncryption);
    }
  }
}

async function encryptAsymFile(uri: vscode.Uri) {
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

async function encryptSymmFile(uri: vscode.Uri) {
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

async function encryptPreviewAsym(uri: vscode.Uri) {
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

async function encryptPreviewSymm(uri: vscode.Uri) {
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

async function decryptSelection(editor: vscode.TextEditor) {
  if (editor) {
    const selection = editor.selection;
    const content = new Buffer(editor.document.getText(selection));

    if (content && content.length > 0) {
      // async/await ...
      try {
        const decrypted = await promiseDecryptBuffer(content);
        if (decrypted !== undefined) {
          const txt = decrypted.toString('utf8');
          if (txt.length > 0) {
            editor.edit(edit => edit.replace(selection, txt));
          } else {
            vscode.window.showErrorMessage(i18n().GnuPGDecryptionFailed);
          }
        }
      } catch (err) {
        vscode.window.showErrorMessage(i18n().GnuPGDecryptionFailed + ' ' + err);
      }

      // promises chain ...
      // promiseDecryptBuffer(content)
      //   .then(decrypted => {
      //     if (decrypted !== undefined) {
      //       const txt = decrypted.toString('utf8');
      //       if (txt.length > 0) {
      //         editor.edit(edit => edit.replace(selection, txt));
      //       } else {
      //         vscode.window.showErrorMessage(i18n().GnuPGDecryptionFailed);
      //       }
      //     }
      //   })
      //   .catch(err => vscode.window.showErrorMessage(i18n().GnuPGDecryptionFailed + ' ' + err));
    } else {
      vscode.window.showWarningMessage(i18n().GnuPGNoTextSelectedForDecryption);
    }
  }
}

async function decryptFile(uri: vscode.Uri) {
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

async function decryptPreview(uri: vscode.Uri) {
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

async function signFile(uri: vscode.Uri) {
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

async function clearSignFile(uri: vscode.Uri) {
  if (uri !== undefined && uri.scheme === 'file') {
    if (!uri.fsPath.match(/\.(sig)$/i)) {
      clearSignUri(uri);
    } else {
      vscode.window.showInformationMessage(i18n().GnuPGFileIsAlreadyASignature);
    }
  } else {
    const option: vscode.OpenDialogOptions = { canSelectMany: false, defaultUri: getWorkspaceUri() };
    vscode.window.showOpenDialog(option).then(uriSelected => {
      if (uriSelected && uriSelected[0] && uriSelected[0].scheme === 'file') {
        if (!uriSelected[0].fsPath.match(/\.(sig)$/i)) {
          clearSignUri(uriSelected[0]);
        } else {
          vscode.window.showInformationMessage(i18n().GnuPGFileIsAlreadyASignature);
        }
      }
    });
  }
}

async function verifyFile(uri: vscode.Uri) {
  if (uri !== undefined && uri.scheme === 'file') {
    if (uri.fsPath.match(/\.(sig|asc)$/i)) {
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

async function endSession() {
  // async/await ...
  try {
    await promiseKillGpgAgent();
    vscode.window.showInformationMessage(i18n().GnuPGEndSessionSuccessfully);
  } catch (err) {
    vscode.window.showErrorMessage(i18n().GnuPGEndSessionFailed + ' ' + err);
  }

  // promises chain ...
  // promiseKillGpgAgent()
  //   .then(() => vscode.window.showInformationMessage(i18n().GnuPGEndSessionSuccessfully))
  //   .catch(err => vscode.window.showErrorMessage(i18n().GnuPGEndSessionFailed + ' ' + err));
}

async function importKeys(uri: vscode.Uri) {
  if (uri !== undefined && uri.scheme === 'file') {
    // async/await ...
    try {
      const result = await promiseImportKeys(uri);
      let txt = result.toString();
      vscode.window.showInformationMessage('GnuPG: ' + txt);
    } catch (err) {
      vscode.window.showErrorMessage(i18n().GnuPGKeyImportFailed + ' ' + err);
    }

    // promises chain ...
    // promiseImportKeys(uri)
    //   .then(result => {
    //     let txt = result.toString();
    //     vscode.window.showInformationMessage('GnuPG: ' + txt);
    //   })
    //   .catch(err => vscode.window.showErrorMessage(i18n().GnuPGKeyImportFailed + ' ' + err));
  } else {
    const option: vscode.OpenDialogOptions = { canSelectMany: false, defaultUri: getWorkspaceUri() };
    const uriSelected = await vscode.window.showOpenDialog(option); //.then(uriSelected => {

    if (uriSelected && uriSelected[0] && uriSelected[0].scheme === 'file') {
      // async/await ...
      try {
        const result = await promiseImportKeys(uriSelected[0]);
        let txt = result.toString();
        vscode.window.showInformationMessage('GnuPG: ' + txt);
      } catch (err) {
        vscode.window.showErrorMessage(i18n().GnuPGKeyImportFailed + ' ' + err);
      }

      // promises chain ...
      // promiseImportKeys(uriSelected[0])
      //   .then(result => {
      //     let txt = result.toString();
      //     vscode.window.showInformationMessage(txt);
      //   })
      //   .catch(err => vscode.window.showErrorMessage(i18n().GnuPGKeyImportFailed + ' ' + err));
    }
    //});
  }
}

async function exportPublicKeys(uri: vscode.Uri) {
  // async/await ...
  try {
  } catch (err) {}

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

async function exportPrivateKeys(uri: vscode.Uri) {
  // async/await ...
  try {
  } catch (err) {}

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

async function exportPrivateSubKeys(uri: vscode.Uri) {
  // async/await ...
  try {
  } catch (err) {}

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

async function encryptAsymUri(uri: vscode.Uri) {
  // async/await ...
  try {
    const stdout = await promiseListPublicKeys();
    const map = await promiseParseKeys(stdout);
    const keys = await promiseFilterKeys(map, (k: GnuPGKey) => k.isValidToEncrypt);
    const quickpickitems = await promiseKeysToQuickPickItems(keys);
    const recipients = await vscode.window.showQuickPick(quickpickitems, {
      placeHolder: i18n().SelectRecipients,
      canPickMany: true
    });

    await async function() {
      if (recipients && recipients.length > 0) {
        return promiseEncryptAsymUri(uri, recipients);
      } else {
        return new Promise<Buffer>((_resolve, reject) => {
          reject(i18n().GnuPGNoRecipientsSelectedForEncryption);
        });
      }
    };

    vscode.window.showInformationMessage(i18n().GnuPGFileEncryptedSuccessfully);
  } catch (err) {
    vscode.window.showErrorMessage(i18n().GnuPGEncryptionFailed + ' ' + err);
  }

  // promises chain ...
  // promiseListPublicKeys()
  //   .then(stdout => promiseParseKeys(stdout))
  //   .then(map => promiseFilterKeys(map, (k: GnuPGKey) => k.isValidToEncrypt))
  //   .then(keys => promiseKeysToQuickPickItems(keys))
  //   .then(quickpickitems =>
  //     vscode.window.showQuickPick(quickpickitems, { placeHolder: i18n().SelectRecipients, canPickMany: true })
  //   )
  //   .then(recipients => {
  //     if (recipients && recipients.length > 0) {
  //       return promiseEncryptAsymUri(uri, recipients);
  //     } else {
  //       return new Promise<Buffer>((_resolve, reject) => {
  //         reject(i18n().GnuPGNoRecipientsSelectedForEncryption);
  //       });
  //     }
  //   })
  //   .then(() => vscode.window.showInformationMessage(i18n().GnuPGFileEncryptedSuccessfully))
  //   .catch(err => vscode.window.showErrorMessage(i18n().GnuPGEncryptionFailed + ' ' + err));
}

async function encryptSymmUri(uri: vscode.Uri) {
  // async/await ...
  try {
    await promiseEncryptSymUri(uri);
    vscode.window.showInformationMessage(i18n().GnuPGFileEncryptedSuccessfully);
  } catch (err) {
    vscode.window.showErrorMessage(i18n().GnuPGEncryptionFailed + ' ' + err);
  }

  // promises chain ...
  // promiseEncryptSymUri(uri)
  //   .then(() => vscode.window.showInformationMessage(i18n().GnuPGFileEncryptedSuccessfully))
  //   .catch(err => vscode.window.showErrorMessage(i18n().GnuPGEncryptionFailed + ' ' + err));
}

async function decryptUri(uri: vscode.Uri) {
  // async/await ...
  try {
    await promiseDecryptUri(uri);
    vscode.window.showInformationMessage(i18n().GnuPGFileDecryptedSuccessfully);
  } catch (err) {
    vscode.window.showErrorMessage(i18n().GnuPGDecryptionFailed + ' ' + err);
  }

  // promises chain ...
  // promiseDecryptUri(uri)
  //   .then(() => vscode.window.showInformationMessage(i18n().GnuPGFileDecryptedSuccessfully))
  //   .catch(err => vscode.window.showErrorMessage(i18n().GnuPGDecryptionFailed + ' ' + err));
}

async function signUri(uri: vscode.Uri) {
  // async/await ...
  try {
    const stdout = await promiseListSecretKeys();
    const map = await promiseParseKeys(stdout);
    const keys = await promiseFilterKeys(map, (k: GnuPGKey) => k.isValidToSign);
    const quickpickitems = await promiseKeysToQuickPickItems(keys);
    const key = await vscode.window.showQuickPick(quickpickitems, { placeHolder: i18n().SelectSigner });
    await promiseSign(uri, key);
    vscode.window.showInformationMessage(i18n().GnuPGFileSignedSuccessfully);
  } catch (err) {
    vscode.window.showErrorMessage(i18n().GnuPGSignFailed + ' ' + err);
  }

  // promises chain ...
  // promiseListSecretKeys()
  //   .then(stdout => promiseParseKeys(stdout))
  //   .then(map => promiseFilterKeys(map, (k: GnuPGKey) => k.isValidToSign))
  //   .then(keys => promiseKeysToQuickPickItems(keys))
  //   .then(quickpickitems => vscode.window.showQuickPick(quickpickitems, { placeHolder: i18n().SelectSigner }))
  //   .then(key => promiseSign(uri, key))
  //   .then(() => vscode.window.showInformationMessage(i18n().GnuPGFileSignedSuccessfully))
  //   .catch(err => vscode.window.showErrorMessage(i18n().GnuPGSignFailed + ' ' + err));
}

async function clearSignUri(uri: vscode.Uri) {
  // async/await ...
  try {
    const stdout = await promiseListSecretKeys();
    const map = await promiseParseKeys(stdout);
    const keys = await promiseFilterKeys(map, (k: GnuPGKey) => k.isValidToSign);
    const quickpickitems = await promiseKeysToQuickPickItems(keys);
    const key = await vscode.window.showQuickPick(quickpickitems, { placeHolder: i18n().SelectSigner });
    await promiseClearSign(uri, key);
    vscode.window.showInformationMessage(i18n().GnuPGFileSignedSuccessfully);
  } catch (err) {
    vscode.window.showErrorMessage(i18n().GnuPGSignFailed + ' ' + err);
  }

  // promises chain ...
  // promiseListSecretKeys()
  //   .then(stdout => promiseParseKeys(stdout))
  //   .then(map => promiseFilterKeys(map, (k: GnuPGKey) => k.isValidToSign))
  //   .then(keys => promiseKeysToQuickPickItems(keys))
  //   .then(quickpickitems => vscode.window.showQuickPick(quickpickitems, { placeHolder: i18n().SelectSigner }))
  //   .then(key => promiseClearSign(uri, key))
  //   .then(() => vscode.window.showInformationMessage(i18n().GnuPGFileSignedSuccessfully))
  //   .catch(err => vscode.window.showErrorMessage(i18n().GnuPGSignFailed + ' ' + err));
}

async function launchGnuPGProviderEncryptAsym(uri: vscode.Uri) {
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

async function launchGnuPGProviderEncryptSymm(uri: vscode.Uri) {
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

async function launchGnuPGProviderForDecrypt(uri: vscode.Uri) {
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

async function launchGnuPGProviderForVerify(uri: vscode.Uri) {
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

async function editPublicKey() {
  // async/await ...
  try {
    const stdout = await promiseListPublicKeys();
    const map = await promiseParseKeys(stdout);
    const keys = await promiseFilterKeys(map, (k: GnuPGKey) => true); // list all keys !!
    const quickpickitems = await promiseKeysToQuickPickItems(keys);
    const pubkey = await vscode.window.showQuickPick(quickpickitems, {
      placeHolder: i18n().GnuPGSelectPublicKey,
      canPickMany: false
    });

    if (pubkey) {
      const terminal = vscode.window.createTerminal(i18n().GnuPGTerminal);
      terminal.show();
      terminal.sendText('gpg --edit-key ' + pubkey.fingerprint, false);
    }

    vscode.window.showInformationMessage(i18n().GnuPGSwitchToTerminalAndHitReturn);
  } catch (err) {
    vscode.window.showErrorMessage(i18n().GnuPGEditPublicKeyFailed + ' ' + err);
  }

  // promises chain ...
  // promiseListPublicKeys()
  //   .then(stdout => promiseParseKeys(stdout))
  //   .then(map => promiseFilterKeys(map, (k: GnuPGKey) => true)) // list all keys !!
  //   .then(keys => promiseKeysToQuickPickItems(keys))
  //   .then(quickpickitems =>
  //     vscode.window.showQuickPick(quickpickitems, { placeHolder: i18n().GnuPGSelectPublicKey, canPickMany: false })
  //   )
  //   .then(pubkey => {
  //     if (pubkey) {
  //       const terminal = vscode.window.createTerminal(i18n().GnuPGTerminal);
  //       terminal.show();
  //       terminal.sendText('gpg --edit-key ' + pubkey.fingerprint, false);
  //     }
  //   })
  //   .then(() => vscode.window.showInformationMessage(i18n().GnuPGSwitchToTerminalAndHitReturn))
  //   .catch(err => vscode.window.showErrorMessage(i18n().GnuPGEditPublicKeyFailed + ' ' + err));
}

async function generateKey() {
  const terminal = vscode.window.createTerminal(i18n().GnuPGTerminal);
  terminal.show();
  terminal.sendText('gpg --full-generate-key', false);
  vscode.window.showInformationMessage(i18n().GnuPGSwitchToTerminalAndHitReturn);
}

async function deletePublicKey() {
  // async/await ...
  try {
    const stdout = await promiseListPublicKeys();
    const map = await promiseParseKeys(stdout);
    const keys = await promiseFilterKeys(map, (_k: GnuPGKey) => true);
    const quickpickitems = await promiseKeysToQuickPickItems(keys);
    const key = await vscode.window.showQuickPick(quickpickitems, {
      placeHolder: i18n().GnuPGSelectPublicKey,
      canPickMany: false
    });

    await promiseDeletePublicKey(key);

    vscode.window.showInformationMessage(i18n().GnuPGPublicKeyDeletedSuccessfully);
  } catch (err) {
    vscode.window.showErrorMessage(i18n().GnuPGDeleteKeyFailed + ' ' + err);
  }

  // promises chain ...
  // promiseListPublicKeys()
  //   .then(stdout => promiseParseKeys(stdout))
  //   .then(map => promiseFilterKeys(map, (_k: GnuPGKey) => true)) // list all keys !!
  //   .then(keys => promiseKeysToQuickPickItems(keys))
  //   .then(quickpickitems =>
  //     vscode.window.showQuickPick(quickpickitems, { placeHolder: i18n().GnuPGSelectPublicKey, canPickMany: false })
  //   )
  //   .then(key => promiseDeleteKey(key))
  //   .then(() => vscode.window.showInformationMessage(i18n().GnuPGPublicKeyDeletedSuccessfully))
  //   .catch(err => vscode.window.showErrorMessage(i18n().GnuPGDeleteKeyFailed + ' ' + err));
}

async function deleteSecretKey() {
  // async/await ...
  try {
    const stdout = await promiseListSecretKeys();
    const map = await promiseParseKeys(stdout);
    const keys = await promiseFilterKeys(map, (_k: GnuPGKey) => true); // list all keys !!
    const quickpickitems = await promiseKeysToQuickPickItems(keys);
    const key = await vscode.window.showQuickPick(quickpickitems, {
      placeHolder: i18n().GnuPGSelectPublicKey,
      canPickMany: false
    });

    await promiseDeleteSecretKey(key);

    vscode.window.showInformationMessage(i18n().GnuPGSecretKeyDeletedSuccessfully);
  } catch (err) {
    await vscode.window.showErrorMessage(i18n().GnuPGDeleteSecretKeyFailed + ' ' + err);
  }

  // promises chain ...
  // promiseListSecretKeys()
  //   .then(stdout => promiseParseKeys(stdout))
  //   .then(map => promiseFilterKeys(map, (_k: GnuPGKey) => true)) // list all keys !!
  //   .then(keys => promiseKeysToQuickPickItems(keys))
  //   .then(quickpickitems =>
  //     vscode.window.showQuickPick(quickpickitems, { placeHolder: i18n().GnuPGSelectPublicKey, canPickMany: false })
  //   )
  //   .then(key => promiseDeleteSecretKey(key))
  //   .then(() => vscode.window.showInformationMessage(i18n().GnuPGSecretKeyDeletedSuccessfully))
  //   .catch(err => vscode.window.showErrorMessage(i18n().GnuPGDeleteSecretKeyFailed + ' ' + err));
}

async function copyFingerprintToClipboard() {
  // async/await ...
  try {
    const stdout = await promiseListPublicKeys();
    const map = await promiseParseKeys(stdout);
    const keys = await promiseFilterKeys(map, (k: GnuPGKey) => k.isValidToEncrypt);
    const quickpickitems = await promiseKeysToQuickPickItems(keys);
    const key = await vscode.window.showQuickPick(quickpickitems, {
      placeHolder: i18n().GnuPGSelectPublicKey,
      canPickMany: false
    });

    if (key) {
      switch (process.platform) {
        case 'darwin':
          cp.exec('echo ' + key.fingerprint + ' | pbcopy');
          break;
        case 'win32':
          cp.exec('echo ' + key.fingerprint + ' | clip');
          break;
        case 'linux':
          cp.exec('echo ' + key.fingerprint + ' | xclip -selection c');
          break;
        default:
          throw new Error(i18n().GnuPGNotSupportedPlatform + "'" + process.platform + "'");
      }
    }
  } catch (err) {
    vscode.window.showErrorMessage(i18n().GnuPGCopyFingerprintToClipboardFailed + ' ' + err);
  }

  // promises chain ...
  // promiseListPublicKeys()
  //   .then(stdout => promiseParseKeys(stdout))
  //   .then(map => promiseFilterKeys(map, (k: GnuPGKey) => k.isValidToEncrypt))
  //   .then(keys => promiseKeysToQuickPickItems(keys))
  //   .then(quickpickitems =>
  //     vscode.window.showQuickPick(quickpickitems, { placeHolder: i18n().GnuPGSelectPublicKey, canPickMany: false })
  //   )
  //   .then(async key => {
  //     try {
  //       return new Promise(function(_reject, _resolve) {
  //         if (key) {
  //           switch (process.platform) {
  //             case 'darwin':
  //               cp.exec('echo ' + key.fingerprint + ' | pbcopy');
  //               break;
  //             case 'win32':
  //               cp.exec('echo ' + key.fingerprint + ' | clip');
  //               break;
  //             case 'linux':
  //               cp.exec('echo ' + key.fingerprint + ' | xclip -selection c');
  //               break;
  //             default:
  //               throw new Error(i18n().GnuPGNotSupportedPlatform + "'" + process.platform + "'");
  //           }
  //         }
  //       });
  //     } catch (err) {
  //       return await vscode.window.showErrorMessage(i18n().GnuPGCopyFingerprintToClipboardFailed + ' ' + err);
  //     }
  //   });
}

async function copyKeyIdToClipboard() {
  // async/await ...
  try {
    const stdout = await promiseListPublicKeys();
    const map = await promiseParseKeys(stdout);
    const keys = await promiseFilterKeys(map, (k: GnuPGKey) => k.isValidToEncrypt);
    const quickpickitems = await promiseKeysToQuickPickItems(keys);
    const key = await vscode.window.showQuickPick(quickpickitems, {
      placeHolder: i18n().GnuPGSelectPublicKey,
      canPickMany: false
    });

    if (key) {
      switch (process.platform) {
        case 'darwin':
          cp.exec('echo ' + key.keyId + ' | pbcopy');
          break;
        case 'win32':
          cp.exec('echo ' + key.keyId + ' | clip');
          break;
        case 'linux':
          cp.exec('echo ' + key.keyId + ' | xclip -selection c');
          break;
        default:
          throw new Error(i18n().GnuPGNotSupportedPlatform + "'" + process.platform + "'");
      }
    }
  } catch (err) {
    vscode.window.showErrorMessage(i18n().GnuPGCopyFingerprintToClipboardFailed + ' ' + err);
  }

  // promises chain ...
  // promiseListPublicKeys()
  //   .then(stdout => promiseParseKeys(stdout))
  //   .then(map => promiseFilterKeys(map, (k: GnuPGKey) => k.isValidToEncrypt))
  //   .then(keys => promiseKeysToQuickPickItems(keys))
  //   .then(quickpickitems =>
  //     vscode.window.showQuickPick(quickpickitems, { placeHolder: i18n().GnuPGSelectPublicKey, canPickMany: false })
  //   )
  //   .then(async key => {
  //     try {
  //       return new Promise(function(_reject, _resolve) {
  //         if (key) {
  //           switch (process.platform) {
  //             case 'darwin':
  //               cp.exec('echo ' + key.keyId + ' | pbcopy');
  //               break;
  //             case 'win32':
  //               cp.exec('echo ' + key.keyId + ' | clip');
  //               break;
  //             case 'linux':
  //               cp.exec('echo ' + key.keyId + ' | xclip -selection c');
  //               break;
  //             default:
  //               throw new Error(i18n().GnuPGNotSupportedPlatform + "'" + process.platform + "'");
  //           }
  //         }
  //       });
  //     } catch (err) {
  //       return await vscode.window.showErrorMessage(i18n().GnuPGCopyFingerprintToClipboardFailed + ' ' + err);
  //     }
  //   });
}
