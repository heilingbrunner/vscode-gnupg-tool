import * as vscode from 'vscode';
import * as fs from 'fs';
import VirtualDocumentProvider from './virtualdocumentprovider';
import GnuPGProvider from './gnupgprovider';
import { GnuPGKey } from './gnupgkey';
import { i18n } from './i18n';
import { GnuPGGlobal } from './gnupgglobal';
import { Configuration } from './configuration';
import {
  argsClearSign,
  argsDecryptUri,
  argsEncryptSymUri,
  argsSign,

  parseKeys,

  promiseCheckVersion,
  promiseCheckWorkspaceAsHomeDir,
  promiseClearSign,
  promiseDecryptBuffer,
  promiseDecryptUri,
  promiseDeletePublicKey,
  promiseDeleteSecretKey,
  promiseEncryptAsymBuffer,
  promiseEncryptAsymUri,
  promiseEncryptSymBuffer,
  promiseEncryptSymUri,
  promiseExportPublicKeys,
  promiseExportSecretKeys,
  promiseExportSecretSubKeys,
  promiseImportKeys,
  promiseKillGpgAgent,
  promiseListPublicKeys,
  promiseListSecretKeys,
  promiseSign
} from './gnupglib';

import {
  bufferToLines,
  copyToClipboard,
  filterKeys,
  getWorkspaceUri,
  keysToQuickPickItems,
  linesToHome,
  linesToVersion,
  runInTerminal
} from './utils';

let statusBarItem: vscode.StatusBarItem;

// extension plumping ...
export async function activate(context: vscode.ExtensionContext) {
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);

  try {
    await checkGnuPG(false);
    await promiseKillGpgAgent();
  } catch { }

  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider('virtual-document', new VirtualDocumentProvider())
  );

  context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider('gnupg', new GnuPGProvider()));

  // submenu Environment ...
  context.subscriptions.push(
    vscode.commands.registerCommand('extension.Environment', async (_uri: vscode.Uri) => {
      if (!GnuPGGlobal.available) {
        vscode.window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      let commands: { label: string; description?: string; detail?: string; tag: string }[] = []; //extended vscode.QuickPickItem

      commands.push({ label: i18n().CommandCheckGnuPG, tag: 'CommandCheckGnuPG' });
      commands.push({ label: i18n().CommandShowSmartcard, tag: 'CommandShowSmartcard' });
      commands.push({ label: i18n().CommandEndSession, tag: 'CommandEndSession' });

      const selectedCommand = await vscode.window.showQuickPick(commands);

      if (!selectedCommand) {
        return;
      }

      const editor = vscode.window.activeTextEditor;

      switch (selectedCommand.tag) {
        case 'CommandCheckGnuPG':
          showVersion();
          break;
        case 'CommandShowSmartcard':
          showSmartcard();
          break;
        case 'CommandEndSession':
          endSession();
          break;
      }
    })
  );

  // submenu Keys ...
  context.subscriptions.push(
    vscode.commands.registerCommand('extension.Keys', async (uri: vscode.Uri) => {
      if (!GnuPGGlobal.available) {
        vscode.window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

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

      const selectedCommand = await vscode.window.showQuickPick(commands);

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
    })
  );

  // submenu Encrypt ...
  context.subscriptions.push(
    vscode.commands.registerCommand('extension.Encrypt', async (uri: vscode.Uri) => {
      if (!GnuPGGlobal.available) {
        vscode.window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      let commands: { label: string; description?: string; detail?: string; tag: string }[] = []; //extended vscode.QuickPickItem

      // fill array with commands
      commands.push({ label: i18n().CommandEncryptSelectionAsym, tag: 'CommandEncryptSelectionAsym' });
      commands.push({ label: i18n().CommandEncryptSelectionSymm, tag: 'CommandEncryptSelectionSymm' });
      commands.push({ label: i18n().CommandEncryptFileAsym, tag: 'CommandEncryptFileAsym' });
      commands.push({ label: i18n().CommandEncryptFileSymm, tag: 'CommandEncryptFileSymm' });
      commands.push({ label: i18n().CommandEncryptPreviewAsym, tag: 'CommandEncryptPreviewAsym' });
      commands.push({ label: i18n().CommandEncryptPreviewSymm, tag: 'CommandEncryptPreviewSymm' });

      // show array as quickpick
      const selectedCommand = await vscode.window.showQuickPick(commands);

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
    })
  );

  // submenu Decrypt ...
  context.subscriptions.push(
    vscode.commands.registerCommand('extension.Decrypt', async (uri: vscode.Uri) => {
      if (!GnuPGGlobal.available) {
        vscode.window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      let commands: { label: string; description?: string; detail?: string; tag: string }[] = []; //extended vscode.QuickPickItem

      // fill array with commands
      commands.push({ label: i18n().CommandDecryptSelection, tag: 'CommandDecryptSelection' });
      commands.push({ label: i18n().CommandDecryptFile, tag: 'CommandDecryptFile' });
      commands.push({ label: i18n().CommandDecryptPreview, tag: 'CommandDecryptPreview' });

      // show array as quickpick
      const selectedCommand = await vscode.window.showQuickPick(commands);

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
    })
  );

  // submenu Trust ...
  context.subscriptions.push(
    vscode.commands.registerCommand('extension.Trust', async (uri: vscode.Uri) => {
      if (!GnuPGGlobal.available) {
        vscode.window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      let commands: { label: string; description?: string; detail?: string; tag: string }[] = []; //extended vscode.QuickPickItem

      // fill array with commands
      commands.push({ label: i18n().CommandSignFile, tag: 'CommandSignFile' });
      commands.push({ label: i18n().CommandClearSignFile, tag: 'CommandClearSignFile' });
      commands.push({ label: i18n().CommandVerifyFile, tag: 'CommandVerifyFile' });

      // show array as quickpick
      const selectedCommand = await vscode.window.showQuickPick(commands);

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
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.CheckGnuPG', async () => {
      if (!GnuPGGlobal.available) {
        vscode.window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      showVersion(); //includes checkGnuPG();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.ListPublicKeys', async () => {
      if (!GnuPGGlobal.available) {
        vscode.window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      listPublicKeys();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.ListSecretKeys', async () => {
      if (!GnuPGGlobal.available) {
        vscode.window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      listPrivateKeys();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.ShowSmartcard', async () => {
      if (!GnuPGGlobal.available) {
        vscode.window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      showSmartcard();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.EncryptSelectionAsym', async () => {
      if (!GnuPGGlobal.available) {
        vscode.window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      const editor = vscode.window.activeTextEditor;
      if (editor) {
        encryptAsymSelection(editor);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.EncryptSelectionSymm', async () => {
      if (!GnuPGGlobal.available) {
        vscode.window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      const editor = vscode.window.activeTextEditor;
      if (editor) {
        encryptSymmSelection(editor);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.EncryptFileAsym', async (uri: vscode.Uri) => {
      if (!GnuPGGlobal.available) {
        vscode.window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      encryptAsymFile(uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.EncryptFileSymm', async (uri: vscode.Uri) => {
      if (!GnuPGGlobal.available) {
        vscode.window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      encryptSymmFile(uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.EncryptPreviewAsym', async (uri: vscode.Uri) => {
      if (!GnuPGGlobal.available) {
        vscode.window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      encryptPreviewAsym(uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.EncryptPreviewSymm', async (uri: vscode.Uri) => {
      if (!GnuPGGlobal.available) {
        vscode.window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      encryptPreviewSymm(uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.DecryptSelection', async () => {
      if (!GnuPGGlobal.available) {
        vscode.window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      const editor = vscode.window.activeTextEditor;
      if (editor) {
        decryptSelection(editor);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.DecryptFile', async (uri: vscode.Uri) => {
      if (!GnuPGGlobal.available) {
        vscode.window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      decryptFile(uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.DecryptPreview', async (uri: vscode.Uri) => {
      if (!GnuPGGlobal.available) {
        vscode.window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      decryptPreview(uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.SignFile', async (uri: vscode.Uri) => {
      if (!GnuPGGlobal.available) {
        vscode.window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      signFile(uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.ClearSignFile', async (uri: vscode.Uri) => {
      if (!GnuPGGlobal.available) {
        vscode.window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      clearSignFile(uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.VerifyFile', async (uri: vscode.Uri) => {
      if (!GnuPGGlobal.available) {
        vscode.window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      verifyFile(uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.EndSession', async () => {
      if (!GnuPGGlobal.available) {
        vscode.window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      endSession();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.ImportKeys', async (uri: vscode.Uri) => {
      if (!GnuPGGlobal.available) {
        vscode.window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      importKeys(uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.ExportPublicKeys', async (uri: vscode.Uri) => {
      if (!GnuPGGlobal.available) {
        vscode.window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      exportPublicKeys(uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.ExportSecretKeys', async (uri: vscode.Uri) => {
      if (!GnuPGGlobal.available) {
        vscode.window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      exportPrivateKeys(uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.ExportSecretSubKeys', async (uri: vscode.Uri) => {
      if (!GnuPGGlobal.available) {
        vscode.window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      exportPrivateSubKeys(uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.EditPublicKey', async () => {
      if (!GnuPGGlobal.available) {
        vscode.window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      editPublicKey();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.GenerateKey', async () => {
      if (!GnuPGGlobal.available) {
        vscode.window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      generateKey();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.DeleteKey', async () => {
      if (!GnuPGGlobal.available) {
        vscode.window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      deletePublicKey();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.DeleteSecretKey', async () => {
      if (!GnuPGGlobal.available) {
        vscode.window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      deleteSecretKey();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.CopyFingerprintToClipboard', async () => {
      if (!GnuPGGlobal.available) {
        vscode.window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      copyFingerprintToClipboard();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('extension.CopyKeyIdToClipboard', async () => {
      if (!GnuPGGlobal.available) {
        vscode.window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      copyKeyIdToClipboard();
    })
  );

  vscode.workspace.onDidChangeConfiguration((e: vscode.ConfigurationChangeEvent) => {
    if (e.affectsConfiguration('GnuPG')) {
      checkGnuPG(true);
    }
  });
}

// this method is called when your extension is deactivated
export function deactivate() {
  try {
    promiseKillGpgAgent();
  } catch { }
  statusBarItem.hide();
}

// Commands .......................................................

async function checkGnuPG(onConfigChanged: boolean) {
  try {
    //Reset previous homedir
    const previousWasNotDefaultHomedir = GnuPGGlobal.homedir !== undefined;
    GnuPGGlobal.homedir = undefined;

    // 1. Check workspace with local keyring
    // 2. When not 1., then check vscode configuration
    // 3. When not 2., then use default keyring

    // 1.
    const workspaceAsHomedir = await promiseCheckWorkspaceAsHomeDir();

    // 2.
    if (workspaceAsHomedir) {
      GnuPGGlobal.homedir = workspaceAsHomedir;
    } else {
      const config = new Configuration();
      if (config.homedir !== undefined) {
        GnuPGGlobal.homedir = config.homedir;
      }
    }

    // 3. Do nothing more, use default homedir

    // Check Version with homedir
    const stdout = await promiseCheckVersion();

    if (stdout) {
      const lines = bufferToLines(stdout);
      const version = linesToVersion(lines);
      const home = linesToHome(lines);

      GnuPGGlobal.setVersion(version);
      GnuPGGlobal.available = true;

      // console.log(home + '<--->' + GnuPGGlobal.homedir);

      if (onConfigChanged) {
        if (GnuPGGlobal.homedir) {
          vscode.window.showInformationMessage(i18n().GnuPGUsingHomedir + '=' + GnuPGGlobal.homedir);
        } else {
          vscode.window.showInformationMessage(i18n().GnuPGUsingHomedir + '=' + home);
        }
      } else {
        if (GnuPGGlobal.homedir) {
          vscode.window.showInformationMessage(i18n().GnuPGUsingHomedir + '=' + GnuPGGlobal.homedir);
        }
      }

      statusBarItem_show(GnuPGGlobal.majorVersion + '.' + GnuPGGlobal.minorVersion + '.' + GnuPGGlobal.patchVersion);
    }
  } catch (err) {
    statusBarItem_show(i18n().GnuPGNotAvailable);
  }
}

function statusBarItem_show(line: string | undefined) {
  statusBarItem.text = `$(mirror-private) gpg (GnuPG) ` + line;
  statusBarItem.show();
}

function showVersion() {
  let newUri = vscode.Uri.parse('virtual-document://gnupg/GnuPG-Version');
  vscode.commands.executeCommand('vscode.open', newUri);
}

function listPublicKeys() {
  let newUri = vscode.Uri.parse('virtual-document://gnupg/GnuPG-Public-Keys');
  vscode.commands.executeCommand('vscode.open', newUri);
}

function listPrivateKeys() {
  let newUri = vscode.Uri.parse('virtual-document://gnupg/GnuPG-Private-Keys');
  vscode.commands.executeCommand('vscode.open', newUri);
}

function showSmartcard() {
  let newUri = vscode.Uri.parse('virtual-document://gnupg/GnuPG-Smartcard');
  vscode.commands.executeCommand('vscode.open', newUri);
}

async function encryptAsymSelection(editor: vscode.TextEditor) {
  if (editor) {
    const selection = editor.selection;
    const content = new Buffer(editor.document.getText(selection));

    if (content && content.length > 0) {
      try {
        switch (GnuPGGlobal.majorVersion) {
          case 1:
            vscode.window.showWarningMessage(i18n().GnuPGFunctionIsNotSupportedInVersion1x);
            break;
          case 2:
            const stdout = await promiseListPublicKeys();
            const map = parseKeys(stdout);
            const keys = filterKeys(map, (k: GnuPGKey) => k.isValidToEncrypt);
            const quickpickitems = keysToQuickPickItems(keys);
            const recipients = await vscode.window.showQuickPick(quickpickitems, {
              placeHolder: i18n().SelectRecipients,
              canPickMany: true
            });

            if (recipients && recipients.length > 0) {
              const encrypted = await promiseEncryptAsymBuffer(content, recipients);
              if (encrypted !== undefined) {
                editor.edit(edit => edit.replace(selection, encrypted.toString('utf8')));
              }
            } else {
              vscode.window.showErrorMessage(i18n().GnuPGNoRecipientsSelectedForEncryption);
            }
            break;
          default:
        }
      } catch (err) {
        vscode.window.showErrorMessage(i18n().GnuPGEncryptionFailed + ' ' + err);
      }
    } else {
      vscode.window.showWarningMessage(i18n().GnuPGNoTextSelectedForEncryption);
    }
  }
}

async function encryptSymmSelection(editor: vscode.TextEditor) {
  if (editor) {
    const selection = editor.selection;
    const content = new Buffer(editor.document.getText(selection));

    if (content && content.length > 0) {
      try {
        switch (GnuPGGlobal.majorVersion) {
          case 1:
            vscode.window.showWarningMessage(i18n().GnuPGFunctionIsNotSupportedInVersion1x);
            break;
          case 2:
            const encrypted = await promiseEncryptSymBuffer(content);
            if (encrypted !== undefined) {
              await editor.edit(edit => edit.replace(selection, encrypted.toString('utf8')));
            }
            break;
          default:
        }
      } catch (err) {
        vscode.window.showErrorMessage(i18n().GnuPGEncryptionFailed + ' ' + err);
      }
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

async function decryptSelection(editor: vscode.TextEditor) {
  if (editor) {
    const selection = editor.selection;
    const content = new Buffer(editor.document.getText(selection));

    if (content && content.length > 0) {
      try {
        switch (GnuPGGlobal.majorVersion) {
          case 1:
            vscode.window.showWarningMessage(i18n().GnuPGFunctionIsNotSupportedInVersion1x);
            break;
          case 2:
            const decrypted = await promiseDecryptBuffer(content);
            if (decrypted !== undefined) {
              const txt = decrypted.toString('utf8');
              if (txt.length > 0) {
                editor.edit(edit => edit.replace(selection, txt));
              } else {
                vscode.window.showErrorMessage(i18n().GnuPGDecryptionFailed);
              }
            }
            break;
          default:
        }
      } catch (err) {
        vscode.window.showErrorMessage(i18n().GnuPGDecryptionFailed + ' ' + err);
      }
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

function clearSignFile(uri: vscode.Uri) {
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

function verifyFile(uri: vscode.Uri) {
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
  try {
    await promiseKillGpgAgent();
    vscode.window.showInformationMessage(i18n().GnuPGEndSessionSuccessfully);
  } catch (err) {
    vscode.window.showErrorMessage(i18n().GnuPGEndSessionFailed + ' ' + err);
  }
}

async function importKeys(uri: vscode.Uri) {
  if (uri !== undefined && uri.scheme === 'file') {
    try {
      const result = await promiseImportKeys(uri);
      let txt = result.toString();
      vscode.window.showInformationMessage('GnuPG: ' + txt);
    } catch (err) {
      vscode.window.showErrorMessage(i18n().GnuPGKeyImportFailed + ' ' + err);
    }
  } else {
    const option: vscode.OpenDialogOptions = { canSelectMany: false, defaultUri: getWorkspaceUri() };
    const uriSelected = await vscode.window.showOpenDialog(option); //.then(uriSelected => {

    if (uriSelected && uriSelected[0] && uriSelected[0].scheme === 'file') {
      try {
        const result = await promiseImportKeys(uriSelected[0]);
        let txt = result.toString();
        vscode.window.showInformationMessage('GnuPG: ' + txt);
      } catch (err) {
        vscode.window.showErrorMessage(i18n().GnuPGKeyImportFailed + ' ' + err);
      }
    }
  }
}

async function exportPublicKeys(uri: vscode.Uri) {
  //v1,2
  const stdout = await promiseListPublicKeys();
  const map = parseKeys(stdout);
  const keys = filterKeys(map, (_k: GnuPGKey) => true);
  const quickpickitems = keysToQuickPickItems(keys);
  const user = await vscode.window.showQuickPick(quickpickitems, {
    placeHolder: i18n().SelectKeyToExport,
    canPickMany: false
  });
  if (uri !== undefined && uri.scheme === 'file') {
    try {
      const result = promiseExportPublicKeys(uri, user);
      let txt = result.toString();
      vscode.window.showInformationMessage(txt);
    } catch (err) {
      vscode.window.showErrorMessage(i18n().GnuPGKeyExportFailed + ' ' + err);
    }
  } else {
    const option: vscode.OpenDialogOptions = { canSelectMany: false, defaultUri: getWorkspaceUri() };
    vscode.window.showSaveDialog(option).then(async uriSelected => {
      if (uriSelected && uriSelected.scheme === 'file') {
        try {
          const result = await promiseExportPublicKeys(uriSelected, user);
          let txt = result.toString();
          vscode.window.showInformationMessage(txt);
        } catch (err) {
          vscode.window.showErrorMessage(i18n().GnuPGKeyExportFailed + ' ' + err);
        }
      }
    });
  }
}

async function exportPrivateKeys(uri: vscode.Uri) {
  //v1,2
  const stdout = await promiseListPublicKeys();
  const map = parseKeys(stdout);
  const keys = filterKeys(map, (_k: GnuPGKey) => true); // list all keys
  const quickpickitems = keysToQuickPickItems(keys);
  const user = await vscode.window.showQuickPick(quickpickitems, {
    placeHolder: i18n().SelectKeyToExport,
    canPickMany: false
  });
  if (uri !== undefined && uri.scheme === 'file') {
    try {
      const result = await promiseExportSecretKeys(uri, user);
      let txt = result.toString();
      vscode.window.showInformationMessage(txt);
    } catch (err) {
      vscode.window.showErrorMessage(i18n().GnuPGKeyExportFailed + ' ' + err);
    }
  } else {
    const option: vscode.OpenDialogOptions = { canSelectMany: false, defaultUri: getWorkspaceUri() };
    vscode.window.showSaveDialog(option).then(async uriSelected => {
      if (uriSelected && uriSelected.scheme === 'file') {
        try {
          const result = await promiseExportSecretKeys(uriSelected, user);
          let txt = result.toString();
          vscode.window.showInformationMessage(txt);
        } catch (err) {
          vscode.window.showErrorMessage(i18n().GnuPGKeyExportFailed + ' ' + err);
        }
      }
    });
  }
}

async function exportPrivateSubKeys(uri: vscode.Uri) {
  // v1,2
  const stdout = await promiseListPublicKeys();
  const map = parseKeys(stdout);
  const keys = filterKeys(map, (_k: GnuPGKey) => true);
  const quickpickitems = keysToQuickPickItems(keys);
  const user = await vscode.window.showQuickPick(quickpickitems, {
    placeHolder: i18n().SelectKeyToExport,
    canPickMany: false
  });
  if (uri !== undefined && uri.scheme === 'file') {
    try {
      const result = await promiseExportSecretSubKeys(uri, user);
      let txt = result.toString();
      vscode.window.showInformationMessage(txt);
    } catch (err) {
      vscode.window.showErrorMessage(i18n().GnuPGKeyExportFailed + ' ' + err);
    }
  } else {
    const option: vscode.OpenDialogOptions = { canSelectMany: false, defaultUri: getWorkspaceUri() };
    vscode.window.showSaveDialog(option).then(async uriSelected => {
      if (uriSelected && uriSelected.scheme === 'file') {
        try {
          const result = await promiseExportSecretSubKeys(uriSelected, user);
          let txt = result.toString();
          vscode.window.showInformationMessage(txt);
        } catch (err) {
          vscode.window.showErrorMessage(i18n().GnuPGKeyExportFailed + ' ' + err);
        }
      }
    });
  }
}

// Uri Helper .......................................................

async function encryptAsymUri(uri: vscode.Uri) {
  try {
    const stdout = await promiseListPublicKeys();
    const map = parseKeys(stdout);
    const keys = filterKeys(map, (k: GnuPGKey) => k.isValidToEncrypt);
    const quickpickitems = keysToQuickPickItems(keys);
    const recipients = await vscode.window.showQuickPick(quickpickitems, {
      placeHolder: i18n().SelectRecipients,
      canPickMany: true
    });

    switch (GnuPGGlobal.majorVersion) {
      default: //v1,2
        await async function () {
          if (recipients && recipients.length > 0) {
            return promiseEncryptAsymUri(uri, recipients);
          } else {
            return new Promise<Buffer>((_resolve, reject) => {
              reject(i18n().GnuPGNoRecipientsSelectedForEncryption);
            });
          }
        }();
        vscode.window.showInformationMessage(i18n().GnuPGFileEncryptedSuccessfully);
        break;
    }
  } catch (err) {
    vscode.window.showErrorMessage(i18n().GnuPGEncryptionFailed + ' ' + err);
  }
}

async function encryptSymmUri(uri: vscode.Uri) {
  try {
    switch (GnuPGGlobal.majorVersion) {
      case 1:
        const command = 'gpg ' + argsEncryptSymUri(uri).join(' ');
        copyToClipboard(command);
        runInTerminal(command);
        break;
      case 2:
        await promiseEncryptSymUri(uri);
        vscode.window.showInformationMessage(i18n().GnuPGFileEncryptedSuccessfully);
        break;
      default:
    }
  } catch (err) {
    vscode.window.showErrorMessage(i18n().GnuPGEncryptionFailed + ' ' + err);
  }
}

async function decryptUri(uri: vscode.Uri) {
  try {
    switch (GnuPGGlobal.majorVersion) {
      case 1:
        const command = 'gpg ' + argsDecryptUri(uri).join(' ');
        copyToClipboard(command);
        runInTerminal(command);
        break;
      case 2:
        await promiseDecryptUri(uri);
        vscode.window.showInformationMessage(i18n().GnuPGFileDecryptedSuccessfully);
        break;
      default:
    }
  } catch (err) {
    vscode.window.showErrorMessage(i18n().GnuPGDecryptionFailed + ' ' + err);
  }
}

async function signUri(uri: vscode.Uri) {
  try {
    const stdout = await promiseListSecretKeys();
    const map = parseKeys(stdout);
    const keys = filterKeys(map, (k: GnuPGKey) => k.isValidToSign);
    const quickpickitems = keysToQuickPickItems(keys);
    const key = await vscode.window.showQuickPick(quickpickitems, { placeHolder: i18n().SelectSigner });

    switch (GnuPGGlobal.majorVersion) {
      case 1:
        const command = 'gpg ' + argsSign(uri, key).join(' ');
        copyToClipboard(command);
        runInTerminal(command);
        vscode.window.showInformationMessage(i18n().GnuPGSwitchToTerminalAndHitReturn);
        break;
      case 2:
        await promiseSign(uri, key);
        vscode.window.showInformationMessage(i18n().GnuPGFileSignedSuccessfully);
        break;
      default:
    }

  } catch (err) {
    vscode.window.showErrorMessage(i18n().GnuPGSignFailed + ' ' + err);
  }
}

async function clearSignUri(uri: vscode.Uri) {
  try {
    const stdout = await promiseListSecretKeys();
    const map = parseKeys(stdout);
    const keys = filterKeys(map, (k: GnuPGKey) => k.isValidToSign);
    const quickpickitems = keysToQuickPickItems(keys);
    const key = await vscode.window.showQuickPick(quickpickitems, { placeHolder: i18n().SelectSigner });

    switch (GnuPGGlobal.majorVersion) {
      case 1:
        const command = 'gpg ' + argsClearSign(uri, key).join(' ');
        copyToClipboard(command);
        runInTerminal(command);
        vscode.window.showInformationMessage(i18n().GnuPGSwitchToTerminalAndHitReturn);
        break;
      case 2:
        await promiseClearSign(uri, key);
        vscode.window.showInformationMessage(i18n().GnuPGFileSignedSuccessfully);
        break;
      default:
    }

  } catch (err) {
    vscode.window.showErrorMessage(i18n().GnuPGSignFailed + ' ' + err);
  }
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

async function editPublicKey() {
  try {
    const stdout = await promiseListPublicKeys();
    const map = parseKeys(stdout);
    const keys = filterKeys(map, (k: GnuPGKey) => true); // list all keys !!
    const quickpickitems = keysToQuickPickItems(keys);
    const pubkey = await vscode.window.showQuickPick(quickpickitems, {
      placeHolder: i18n().GnuPGSelectPublicKey,
      canPickMany: false
    });

    if (pubkey) {
      //v1,2
      const command = 'gpg --edit-key ' + pubkey.fingerprint;
      copyToClipboard(command);
      runInTerminal(command);
    }

    vscode.window.showInformationMessage(i18n().GnuPGSwitchToTerminalAndHitReturn);
  } catch (err) {
    vscode.window.showErrorMessage(i18n().GnuPGEditPublicKeyFailed + ' ' + err);
  }
}

function generateKey() {

  switch (GnuPGGlobal.majorVersion) {
    case 1:
      copyToClipboard('gpg --gen-key');
      runInTerminal('gpg --gen-key');
      break;
    case 2:
      copyToClipboard('gpg --full-generate-key');
      runInTerminal('gpg --full-generate-key');
      break;
    default:
  }

  vscode.window.showInformationMessage(i18n().GnuPGSwitchToTerminalAndHitReturn);
}

async function deletePublicKey() {
  try {
    const stdout = await promiseListPublicKeys();
    const map = parseKeys(stdout);
    const keys = filterKeys(map, (_k: GnuPGKey) => true);
    const quickpickitems = keysToQuickPickItems(keys);
    const key = await vscode.window.showQuickPick(quickpickitems, {
      placeHolder: i18n().GnuPGSelectPublicKey,
      canPickMany: false
    });

    await promiseDeletePublicKey(key);

    vscode.window.showInformationMessage(i18n().GnuPGPublicKeyDeletedSuccessfully);
  } catch (err) {
    vscode.window.showErrorMessage(i18n().GnuPGDeleteKeyFailed + ' ' + err);
  }
}

async function deleteSecretKey() {
  try {
    const stdout = await promiseListSecretKeys();
    const map = parseKeys(stdout);
    const keys = filterKeys(map, (_k: GnuPGKey) => true); // list all keys !!
    const quickpickitems = keysToQuickPickItems(keys);
    const key = await vscode.window.showQuickPick(quickpickitems, {
      placeHolder: i18n().GnuPGSelectPublicKey,
      canPickMany: false
    });

    await promiseDeleteSecretKey(key);

    vscode.window.showInformationMessage(i18n().GnuPGSecretKeyDeletedSuccessfully);
  } catch (err) {
    await vscode.window.showErrorMessage(i18n().GnuPGDeleteSecretKeyFailed + ' ' + err);
  }
}

async function copyFingerprintToClipboard() {
  try {
    const stdout = await promiseListPublicKeys();
    const map = parseKeys(stdout);
    const keys = filterKeys(map, (k: GnuPGKey) => true);
    const quickpickitems = keysToQuickPickItems(keys);
    const key = await vscode.window.showQuickPick(quickpickitems, {
      placeHolder: i18n().GnuPGSelectPublicKey,
      canPickMany: false
    });

    if (key) {
      copyToClipboard(key.fingerprint);
    }
  } catch (err) {
    vscode.window.showErrorMessage(i18n().GnuPGCopyFingerprintToClipboardFailed + ' ' + err);
  }
}

async function copyKeyIdToClipboard() {
  try {
    const stdout = await promiseListPublicKeys();
    const map = parseKeys(stdout);
    const keys = filterKeys(map, (k: GnuPGKey) => k.isValidToEncrypt);
    const quickpickitems = keysToQuickPickItems(keys);
    const key = await vscode.window.showQuickPick(quickpickitems, {
      placeHolder: i18n().GnuPGSelectPublicKey,
      canPickMany: false
    });

    if (key) {
      copyToClipboard(key.keyId);
    }
  } catch (err) {
    vscode.window.showErrorMessage(i18n().GnuPGCopyFingerprintToClipboardFailed + ' ' + err);
  }
}
