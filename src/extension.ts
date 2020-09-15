import { existsSync } from 'fs';
import {
  commands,
  ConfigurationChangeEvent,
  ExtensionContext,
  OpenDialogOptions,
  SaveDialogOptions,
  StatusBarAlignment,
  StatusBarItem,
  TextEditor,
  Uri,
  window,
  workspace,
} from 'vscode';
import { Configuration } from './configuration';
import { GnuPGGlobal } from './gnupgglobal';
import { GnuPGKey } from './gnupgkey';
import {
  argsClearSign,
  argsDecryptUri,
  argsEditKey,
  argsEncryptSymUri,
  argsGenerateKey,
  argsSign,
  asyncCheckVersion,
  asyncCheckWorkspaceAsHomeDir,
  asyncClearSign,
  asyncDecryptBuffer,
  asyncDecryptUri,
  asyncDeletePublicKey,
  asyncDeleteSecretKey,
  asyncEncryptAsymBuffer,
  asyncEncryptAsymUri,
  asyncEncryptSymBuffer,
  asyncEncryptSymUri,
  asyncExportPublicKeys,
  asyncExportSecretKeys,
  asyncExportSecretSubKeys,
  asyncImportKeys,
  asyncKillGpgAgent,
  asyncListPublicKeys,
  asyncListSecretKeys,
  asyncSign,
  parseKeys,
} from './gnupglib';
import GnuPGProvider from './gnupgprovider';
import { i18n } from './i18n';
import {
  bufferToLines,
  copyToClipboard,
  filterKeys,
  getWorkspaceUri,
  keysToQuickPickItems,
  linesToHome,
  linesToVersion,
  runInTerminal,
} from './utils';
import VirtualDocumentProvider from './virtualdocumentprovider';

let statusBarItem: StatusBarItem;

// extension plumping ...
export async function activate(context: ExtensionContext) {
  statusBarItem = window.createStatusBarItem(StatusBarAlignment.Right, 100);

  try {
    await checkGnuPG(false);
    await asyncKillGpgAgent();
  } catch {}

  context.subscriptions.push(
    workspace.registerTextDocumentContentProvider('virtual-document', new VirtualDocumentProvider())
  );

  context.subscriptions.push(workspace.registerTextDocumentContentProvider('gnupg', new GnuPGProvider()));

  // submenu Environment ...
  context.subscriptions.push(
    commands.registerCommand('extension.Environment', async (_uri: Uri) => {
      if (!GnuPGGlobal.available) {
        window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      let commands: { label: string; description?: string; detail?: string; tag: string }[] = []; //extended QuickPickItem

      commands.push({ label: i18n().CommandCheckGnuPG, tag: 'CommandCheckGnuPG' });
      commands.push({ label: i18n().CommandShowSmartcard, tag: 'CommandShowSmartcard' });
      commands.push({ label: i18n().CommandEndSession, tag: 'CommandEndSession' });

      const selectedCommand = await window.showQuickPick(commands);

      if (!selectedCommand) {
        return;
      }

      const editor = window.activeTextEditor;

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
    commands.registerCommand('extension.Keys', async (uri: Uri) => {
      if (!GnuPGGlobal.available) {
        window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      let commands: { label: string; description?: string; detail?: string; tag: string }[] = []; //extended QuickPickItem

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

      const selectedCommand = await window.showQuickPick(commands);

      if (!selectedCommand) {
        return;
      }

      const editor = window.activeTextEditor;

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
    commands.registerCommand('extension.Encrypt', async (uri: Uri) => {
      if (!GnuPGGlobal.available) {
        window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      let commands: { label: string; description?: string; detail?: string; tag: string }[] = []; //extended QuickPickItem

      // fill array with commands
      commands.push({ label: i18n().CommandEncryptSelectionAsym, tag: 'CommandEncryptSelectionAsym' });
      commands.push({ label: i18n().CommandEncryptSelectionSymm, tag: 'CommandEncryptSelectionSymm' });
      commands.push({ label: i18n().CommandEncryptFileAsym, tag: 'CommandEncryptFileAsym' });
      commands.push({ label: i18n().CommandEncryptFileSymm, tag: 'CommandEncryptFileSymm' });
      commands.push({ label: i18n().CommandEncryptPreviewAsym, tag: 'CommandEncryptPreviewAsym' });
      commands.push({ label: i18n().CommandEncryptPreviewSymm, tag: 'CommandEncryptPreviewSymm' });

      // show array as quickpick
      const selectedCommand = await window.showQuickPick(commands);

      if (!selectedCommand) {
        return;
      }

      const editor = window.activeTextEditor;

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
    commands.registerCommand('extension.Decrypt', async (uri: Uri) => {
      if (!GnuPGGlobal.available) {
        window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      let commands: { label: string; description?: string; detail?: string; tag: string }[] = []; //extended QuickPickItem

      // fill array with commands
      commands.push({ label: i18n().CommandDecryptSelection, tag: 'CommandDecryptSelection' });
      commands.push({ label: i18n().CommandDecryptFile, tag: 'CommandDecryptFile' });
      commands.push({ label: i18n().CommandDecryptPreview, tag: 'CommandDecryptPreview' });

      // show array as quickpick
      const selectedCommand = await window.showQuickPick(commands);

      if (!selectedCommand) {
        return;
      }

      const editor = window.activeTextEditor;

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
    commands.registerCommand('extension.Trust', async (uri: Uri) => {
      if (!GnuPGGlobal.available) {
        window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      let commands: { label: string; description?: string; detail?: string; tag: string }[] = []; //extended QuickPickItem

      // fill array with commands
      commands.push({ label: i18n().CommandSignFile, tag: 'CommandSignFile' });
      commands.push({ label: i18n().CommandClearSignFile, tag: 'CommandClearSignFile' });
      commands.push({ label: i18n().CommandVerifyFile, tag: 'CommandVerifyFile' });

      // show array as quickpick
      const selectedCommand = await window.showQuickPick(commands);

      if (!selectedCommand) {
        return;
      }

      const editor = window.activeTextEditor;

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
    commands.registerCommand('extension.CheckGnuPG', async () => {
      if (!GnuPGGlobal.available) {
        window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      showVersion(); //includes checkGnuPG();
    })
  );

  context.subscriptions.push(
    commands.registerCommand('extension.ListPublicKeys', async () => {
      if (!GnuPGGlobal.available) {
        window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      listPublicKeys();
    })
  );

  context.subscriptions.push(
    commands.registerCommand('extension.ListSecretKeys', async () => {
      if (!GnuPGGlobal.available) {
        window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      listPrivateKeys();
    })
  );

  context.subscriptions.push(
    commands.registerCommand('extension.ShowSmartcard', async () => {
      if (!GnuPGGlobal.available) {
        window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      showSmartcard();
    })
  );

  context.subscriptions.push(
    commands.registerCommand('extension.EncryptSelectionAsym', async () => {
      if (!GnuPGGlobal.available) {
        window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      const editor = window.activeTextEditor;
      if (editor) {
        encryptAsymSelection(editor);
      }
    })
  );

  context.subscriptions.push(
    commands.registerCommand('extension.EncryptSelectionSymm', async () => {
      if (!GnuPGGlobal.available) {
        window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      const editor = window.activeTextEditor;
      if (editor) {
        encryptSymmSelection(editor);
      }
    })
  );

  context.subscriptions.push(
    commands.registerCommand('extension.EncryptFileAsym', async (uri: Uri) => {
      if (!GnuPGGlobal.available) {
        window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      encryptAsymFile(uri);
    })
  );

  context.subscriptions.push(
    commands.registerCommand('extension.EncryptFileSymm', async (uri: Uri) => {
      if (!GnuPGGlobal.available) {
        window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      encryptSymmFile(uri);
    })
  );

  context.subscriptions.push(
    commands.registerCommand('extension.EncryptPreviewAsym', async (uri: Uri) => {
      if (!GnuPGGlobal.available) {
        window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      encryptPreviewAsym(uri);
    })
  );

  context.subscriptions.push(
    commands.registerCommand('extension.EncryptPreviewSymm', async (uri: Uri) => {
      if (!GnuPGGlobal.available) {
        window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      encryptPreviewSymm(uri);
    })
  );

  context.subscriptions.push(
    commands.registerCommand('extension.DecryptSelection', async () => {
      if (!GnuPGGlobal.available) {
        window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      const editor = window.activeTextEditor;
      if (editor) {
        decryptSelection(editor);
      }
    })
  );

  context.subscriptions.push(
    commands.registerCommand('extension.DecryptFile', async (uri: Uri) => {
      if (!GnuPGGlobal.available) {
        window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      decryptFile(uri);
    })
  );

  context.subscriptions.push(
    commands.registerCommand('extension.DecryptPreview', async (uri: Uri) => {
      if (!GnuPGGlobal.available) {
        window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      decryptPreview(uri);
    })
  );

  context.subscriptions.push(
    commands.registerCommand('extension.SignFile', async (uri: Uri) => {
      if (!GnuPGGlobal.available) {
        window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      signFile(uri);
    })
  );

  context.subscriptions.push(
    commands.registerCommand('extension.ClearSignFile', async (uri: Uri) => {
      if (!GnuPGGlobal.available) {
        window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      clearSignFile(uri);
    })
  );

  context.subscriptions.push(
    commands.registerCommand('extension.VerifyFile', async (uri: Uri) => {
      if (!GnuPGGlobal.available) {
        window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      verifyFile(uri);
    })
  );

  context.subscriptions.push(
    commands.registerCommand('extension.EndSession', async () => {
      if (!GnuPGGlobal.available) {
        window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      endSession();
    })
  );

  context.subscriptions.push(
    commands.registerCommand('extension.ImportKeys', async (uri: Uri) => {
      if (!GnuPGGlobal.available) {
        window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      importKeys(uri);
    })
  );

  context.subscriptions.push(
    commands.registerCommand('extension.ExportPublicKeys', async (uri: Uri) => {
      if (!GnuPGGlobal.available) {
        window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      exportPublicKeys(uri);
    })
  );

  context.subscriptions.push(
    commands.registerCommand('extension.ExportSecretKeys', async (uri: Uri) => {
      if (!GnuPGGlobal.available) {
        window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      exportPrivateKeys(uri);
    })
  );

  context.subscriptions.push(
    commands.registerCommand('extension.ExportSecretSubKeys', async (uri: Uri) => {
      if (!GnuPGGlobal.available) {
        window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      exportPrivateSubKeys(uri);
    })
  );

  context.subscriptions.push(
    commands.registerCommand('extension.EditPublicKey', async () => {
      if (!GnuPGGlobal.available) {
        window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      editPublicKey();
    })
  );

  context.subscriptions.push(
    commands.registerCommand('extension.GenerateKey', async () => {
      if (!GnuPGGlobal.available) {
        window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      generateKey();
    })
  );

  context.subscriptions.push(
    commands.registerCommand('extension.DeleteKey', async () => {
      if (!GnuPGGlobal.available) {
        window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      deletePublicKey();
    })
  );

  context.subscriptions.push(
    commands.registerCommand('extension.DeleteSecretKey', async () => {
      if (!GnuPGGlobal.available) {
        window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      deleteSecretKey();
    })
  );

  context.subscriptions.push(
    commands.registerCommand('extension.CopyFingerprintToClipboard', async () => {
      if (!GnuPGGlobal.available) {
        window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      copyFingerprintToClipboard();
    })
  );

  context.subscriptions.push(
    commands.registerCommand('extension.CopyKeyIdToClipboard', async () => {
      if (!GnuPGGlobal.available) {
        window.showInformationMessage(i18n().GnuPGNotAvailable);
        return;
      }

      copyKeyIdToClipboard();
    })
  );

  workspace.onDidChangeConfiguration((e: ConfigurationChangeEvent) => {
    if (e.affectsConfiguration('GnuPG')) {
      checkGnuPG(true);
    }
  });
}

// this method is called when your extension is deactivated
export function deactivate() {
  try {
    asyncKillGpgAgent();
  } catch {}
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
    const workspaceAsHomedir = await asyncCheckWorkspaceAsHomeDir();

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
    const stdout = await asyncCheckVersion();

    if (stdout) {
      const lines = bufferToLines(stdout);
      const version = linesToVersion(lines);
      const home = linesToHome(lines);

      GnuPGGlobal.setVersion(version);
      GnuPGGlobal.available = true;

      // console.log(home + '<--->' + GnuPGGlobal.homedir);

      if (onConfigChanged) {
        if (GnuPGGlobal.homedir) {
          window.showInformationMessage(i18n().GnuPGUsingHomedir + '=' + GnuPGGlobal.homedir);
        } else {
          window.showInformationMessage(i18n().GnuPGUsingHomedir + '=' + home);
        }
      } else {
        if (GnuPGGlobal.homedir) {
          window.showInformationMessage(i18n().GnuPGUsingHomedir + '=' + GnuPGGlobal.homedir);
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
  let newUri = Uri.parse('virtual-document://gnupg/GnuPG-Version');
  commands.executeCommand('vscode.open', newUri);
}

function listPublicKeys() {
  let newUri = Uri.parse('virtual-document://gnupg/GnuPG-Public-Keys');
  commands.executeCommand('vscode.open', newUri);
}

function listPrivateKeys() {
  let newUri = Uri.parse('virtual-document://gnupg/GnuPG-Private-Keys');
  commands.executeCommand('vscode.open', newUri);
}

function showSmartcard() {
  let newUri = Uri.parse('virtual-document://gnupg/GnuPG-Smartcard');
  commands.executeCommand('vscode.open', newUri);
}

async function encryptAsymSelection(editor: TextEditor) {
  if (editor) {
    const selection = editor.selection;
    const content = new Buffer(editor.document.getText(selection));

    if (content.length > 0) {
      try {
        switch (GnuPGGlobal.majorVersion) {
          case 1:
            window.showWarningMessage(i18n().GnuPGFunctionIsNotSupportedWithVersion1x);
            break;
          case 2:
            const stdout = await asyncListPublicKeys();
            const map = parseKeys(stdout);
            const keys = filterKeys(map, (k: GnuPGKey) => k.isValidToEncrypt);
            const quickpickitems = keysToQuickPickItems(keys);
            const recipients = await window.showQuickPick(quickpickitems, {
              placeHolder: i18n().SelectRecipients,
              canPickMany: true,
            });

            if (recipients && recipients.length > 0) {
              const encrypted = await asyncEncryptAsymBuffer(content, recipients);
              if (encrypted !== undefined) {
                editor.edit((edit) => edit.replace(selection, encrypted.toString('utf8')));
              }
            } else {
              window.showErrorMessage(i18n().GnuPGNoRecipientsSelectedForEncryption);
            }
            break;
          default:
        }
      } catch (err) {
        window.showErrorMessage(i18n().GnuPGEncryptionFailed + ' ' + err);
      }
    } else {
      window.showWarningMessage(i18n().GnuPGNoTextSelectedForEncryption);
    }
  }
}

async function encryptSymmSelection(editor: TextEditor) {
  if (editor) {
    const selection = editor.selection;
    const content = new Buffer(editor.document.getText(selection));

    if (content.length > 0) {
      try {
        switch (GnuPGGlobal.majorVersion) {
          case 1:
            window.showWarningMessage(i18n().GnuPGFunctionIsNotSupportedWithVersion1x);
            break;
          case 2:
            const encrypted = await asyncEncryptSymBuffer(content);
            if (encrypted !== undefined) {
              await editor.edit((edit) => edit.replace(selection, encrypted.toString('utf8')));
            }
            break;
          default:
        }
      } catch (err) {
        window.showErrorMessage(i18n().GnuPGEncryptionFailed + ' ' + err);
      }
    } else {
      window.showWarningMessage(i18n().GnuPGNoTextSelectedForEncryption);
    }
  }
}

async function encryptAsymFile(uri: Uri) {
  if (uri.scheme === 'file') {
    if (uri.fsPath.match(/\.(asc)$/i)) {
      window.showInformationMessage(i18n().GnuPGFileAlreadyEncrypted);
    } else {
      encryptAsymUri(uri);
    }
  } else {
    const option: OpenDialogOptions = { canSelectMany: false, defaultUri: getWorkspaceUri() };
    const uriSelected = await window.showOpenDialog(option);

    if (uriSelected && uriSelected[0] && uriSelected[0].scheme === 'file') {
      if (uriSelected[0].fsPath.match(/\.(asc)$/i)) {
        window.showInformationMessage(i18n().GnuPGFileAlreadyEncrypted);
      } else {
        encryptAsymUri(uriSelected[0]);
      }
    }
  }
}

async function encryptSymmFile(uri: Uri) {
  if (uri.scheme === 'file') {
    if (uri.fsPath.match(/\.(asc)$/i)) {
      window.showInformationMessage(i18n().GnuPGFileAlreadyEncrypted);
    } else {
      encryptSymmUri(uri);
    }
  } else {
    const option: OpenDialogOptions = { canSelectMany: false, defaultUri: getWorkspaceUri() };
    const uriSelected = await window.showOpenDialog(option);

    if (uriSelected && uriSelected[0] && uriSelected[0].scheme === 'file') {
      if (uriSelected[0].fsPath.match(/\.(asc)$/i)) {
        window.showInformationMessage(i18n().GnuPGFileAlreadyEncrypted);
      } else {
        encryptSymmUri(uriSelected[0]);
      }
    }
  }
}

async function encryptPreviewAsym(uri: Uri) {
  if (uri.scheme === 'file') {
    if (uri.fsPath.match(/\.(asc)$/i)) {
      window.showInformationMessage(i18n().GnuPGFileAlreadyEncrypted);
    } else {
      launchGnuPGProviderEncryptAsym(uri);
    }
  } else {
    const option: OpenDialogOptions = { canSelectMany: false, defaultUri: getWorkspaceUri() };
    const uriSelected = await window.showOpenDialog(option);

    if (uriSelected && uriSelected[0] && uriSelected[0].scheme === 'file') {
      if (uriSelected[0].fsPath.match(/\.(asc)$/i)) {
        window.showInformationMessage(i18n().GnuPGFileAlreadyEncrypted);
      } else {
        launchGnuPGProviderEncryptAsym(uriSelected[0]);
      }
    }
  }
}

async function encryptPreviewSymm(uri: Uri) {
  if (uri.scheme === 'file') {
    if (uri.fsPath.match(/\.(asc)$/i)) {
      window.showInformationMessage(i18n().GnuPGFileAlreadyEncrypted);
    } else {
      launchGnuPGProviderEncryptSymm(uri);
    }
  } else {
    const option: OpenDialogOptions = { canSelectMany: false, defaultUri: getWorkspaceUri() };
    const uriSelected = await window.showOpenDialog(option);

    if (uriSelected && uriSelected[0] && uriSelected[0].scheme === 'file') {
      if (uriSelected[0].fsPath.match(/\.(asc)$/i)) {
        window.showInformationMessage(i18n().GnuPGFileAlreadyEncrypted);
      } else {
        launchGnuPGProviderEncryptSymm(uriSelected[0]);
      }
    }
  }
}

async function decryptSelection(editor: TextEditor) {
  if (editor) {
    const selection = editor.selection;
    const content = new Buffer(editor.document.getText(selection));

    if (content.length > 0) {
      try {
        switch (GnuPGGlobal.majorVersion) {
          case 1:
            window.showWarningMessage(i18n().GnuPGFunctionIsNotSupportedWithVersion1x);
            break;
          case 2:
            const decrypted = await asyncDecryptBuffer(content);
            if (decrypted !== undefined) {
              const txt = decrypted.toString('utf8');
              if (txt.length > 0) {
                editor.edit((edit) => edit.replace(selection, txt));
              } else {
                window.showErrorMessage(i18n().GnuPGDecryptionFailed);
              }
            }
            break;
          default:
        }
      } catch (err) {
        window.showErrorMessage(i18n().GnuPGDecryptionFailed + ' ' + err);
      }
    } else {
      window.showWarningMessage(i18n().GnuPGNoTextSelectedForDecryption);
    }
  }
}

async function decryptFile(uri: Uri) {
  if (uri.scheme === 'file') {
    if (uri.fsPath.match(/\.(asc|gpg)$/i)) {
      decryptUri(uri);
    } else {
      window.showInformationMessage(i18n().GnuPGFileNotEncrypted);
    }
  } else {
    const option: OpenDialogOptions = { canSelectMany: false, defaultUri: getWorkspaceUri() };
    const uriSelected = await window.showOpenDialog(option);

    if (uriSelected && uriSelected[0] && uriSelected[0].scheme === 'file') {
      if (uriSelected[0].fsPath.match(/\.(asc)$/i)) {
        decryptUri(uriSelected[0]);
      } else {
        window.showInformationMessage(i18n().GnuPGFileNotEncrypted);
      }
    }
  }
}

async function decryptPreview(uri: Uri) {
  switch (GnuPGGlobal.majorVersion) {
    case 1:
      window.showWarningMessage(i18n().GnuPGFunctionIsNotSupportedWithVersion1x);
      break;

    case 2:
      if (uri.scheme === 'file') {
        if (uri.fsPath.match(/\.(asc|gpg)$/i)) {
          launchGnuPGProviderForDecrypt(uri);
        } else {
          window.showInformationMessage(i18n().GnuPGFileNotEncrypted);
        }
      } else {
        const option: OpenDialogOptions = { canSelectMany: false, defaultUri: getWorkspaceUri() };
        const uriSelected = await window.showOpenDialog(option);

        if (uriSelected && uriSelected[0] && uriSelected[0].scheme === 'file') {
          if (uriSelected[0].fsPath.match(/\.(asc)$/i)) {
            launchGnuPGProviderForDecrypt(uriSelected[0]);
          } else {
            window.showInformationMessage(i18n().GnuPGFileNotEncrypted);
          }
        }
      }
      break;

    default:
  }
}

async function signFile(uri: Uri) {
  if (uri.scheme === 'file') {
    if (!uri.fsPath.match(/\.(sig)$/i)) {
      signUri(uri);
    } else {
      window.showInformationMessage(i18n().GnuPGFileIsAlreadyASignature);
    }
  } else {
    const option: OpenDialogOptions = { canSelectMany: false, defaultUri: getWorkspaceUri() };
    const uriSelected = await window.showOpenDialog(option);

    if (uriSelected && uriSelected[0] && uriSelected[0].scheme === 'file') {
      if (!uriSelected[0].fsPath.match(/\.(sig)$/i)) {
        signUri(uriSelected[0]);
      } else {
        window.showInformationMessage(i18n().GnuPGFileIsAlreadyASignature);
      }
    }
  }
}

async function clearSignFile(uri: Uri) {
  if (uri.scheme === 'file') {
    if (!uri.fsPath.match(/\.(sig)$/i)) {
      clearSignUri(uri);
    } else {
      window.showInformationMessage(i18n().GnuPGFileIsAlreadyASignature);
    }
  } else {
    const option: OpenDialogOptions = { canSelectMany: false, defaultUri: getWorkspaceUri() };
    const uriSelected = await window.showOpenDialog(option);

    if (uriSelected && uriSelected[0] && uriSelected[0].scheme === 'file') {
      if (!uriSelected[0].fsPath.match(/\.(sig)$/i)) {
        clearSignUri(uriSelected[0]);
      } else {
        window.showInformationMessage(i18n().GnuPGFileIsAlreadyASignature);
      }
    }
  }
}

async function verifyFile(uri: Uri) {
  if (uri.scheme === 'file') {
    if (uri.fsPath.match(/\.(sig|asc)$/i)) {
      launchGnuPGProviderForVerify(uri);
    } else {
      window.showInformationMessage(i18n().GnuPGFileIsNotASignature);
    }
  } else {
    const option: OpenDialogOptions = { canSelectMany: false, defaultUri: getWorkspaceUri() };
    const uriSelected = await window.showOpenDialog(option);

    if (uriSelected && uriSelected[0] && uriSelected[0].scheme === 'file') {
      if (!uriSelected[0].fsPath.match(/\.(sig)$/i)) {
        launchGnuPGProviderForVerify(uriSelected[0]);
      } else {
        window.showInformationMessage(i18n().GnuPGFileIsNotASignature);
      }
    }
  }
}

async function endSession() {
  try {
    await asyncKillGpgAgent();
    window.showInformationMessage(i18n().GnuPGEndSessionSuccessfully);
  } catch (err) {
    window.showErrorMessage(i18n().GnuPGEndSessionFailed + ' ' + err);
  }
}

async function importKeys(uri: Uri) {
  if (uri.scheme === 'file') {
    try {
      const result = await asyncImportKeys(uri);
      let txt = result.toString();
      window.showInformationMessage(txt);
    } catch (err) {
      window.showErrorMessage(i18n().GnuPGKeyImportFailed + ' ' + err);
    }
  } else {
    const option: OpenDialogOptions = {
      canSelectMany: false,
      defaultUri: getWorkspaceUri(),
      filters: { 'Key File': ['key'], 'All Files': ['*'] },
    };
    const uriSelected = await window.showOpenDialog(option);

    if (uriSelected && uriSelected[0] && uriSelected[0].scheme === 'file') {
      try {
        const result = await asyncImportKeys(uriSelected[0]);
        let txt = result.toString();
        window.showInformationMessage('GnuPG: ' + txt);
      } catch (err) {
        window.showErrorMessage(i18n().GnuPGKeyImportFailed + ' ' + err);
      }
    }
  }
}

async function exportPublicKeys(uri: Uri) {
  const stdout = await asyncListPublicKeys();
  const map = parseKeys(stdout);
  const keys = filterKeys(map, (_k: GnuPGKey) => true);
  const quickpickitems = keysToQuickPickItems(keys);
  const user = await window.showQuickPick(quickpickitems, {
    placeHolder: i18n().SelectKeyToExport,
    canPickMany: false,
  });
  if (uri.scheme === 'file') {
    try {
      const result = asyncExportPublicKeys(uri, user);
      let txt = result.toString();
      window.showInformationMessage(txt);
    } catch (err) {
      window.showErrorMessage(i18n().GnuPGKeyExportFailed + ' ' + err);
    }
  } else {
    const option: SaveDialogOptions = { defaultUri: getWorkspaceUri(), filters: { 'Public Key': ['pub.key'] } };
    const uriSelected = await window.showSaveDialog(option);

    if (uriSelected?.scheme === 'file') {
      try {
        const result = await asyncExportPublicKeys(uriSelected, user);
        let txt = result.toString();
        window.showInformationMessage(txt);
      } catch (err) {
        window.showErrorMessage(i18n().GnuPGKeyExportFailed + ' ' + err);
      }
    }
  }
}

async function exportPrivateKeys(uri: Uri) {
  //v1,2
  const stdout = await asyncListPublicKeys();
  const map = parseKeys(stdout);
  const keys = filterKeys(map, (_k: GnuPGKey) => true); // list all keys
  const quickpickitems = keysToQuickPickItems(keys);
  const user = await window.showQuickPick(quickpickitems, {
    placeHolder: i18n().SelectKeyToExport,
    canPickMany: false,
  });
  if (uri.scheme === 'file') {
    try {
      const result = await asyncExportSecretKeys(uri, user);
      let txt = result.toString();
      window.showInformationMessage(txt);
    } catch (err) {
      window.showErrorMessage(i18n().GnuPGKeyExportFailed + ' ' + err);
    }
  } else {
    const option: SaveDialogOptions = { defaultUri: getWorkspaceUri(), filters: { 'Secret Key': ['sec.key'] } };
    const uriSelected = await window.showSaveDialog(option);

    if (uriSelected?.scheme === 'file') {
      try {
        const result = await asyncExportSecretKeys(uriSelected, user);
        let txt = result.toString();
        window.showInformationMessage(txt);
      } catch (err) {
        window.showErrorMessage(i18n().GnuPGKeyExportFailed + ' ' + err);
      }
    }
  }
}

async function exportPrivateSubKeys(uri: Uri) {
  // v1,2
  const stdout = await asyncListPublicKeys();
  const map = parseKeys(stdout);
  const keys = filterKeys(map, (_k: GnuPGKey) => true);
  const quickpickitems = keysToQuickPickItems(keys);
  const user = await window.showQuickPick(quickpickitems, {
    placeHolder: i18n().SelectKeyToExport,
    canPickMany: false,
  });
  if (uri.scheme === 'file') {
    try {
      const result = await asyncExportSecretSubKeys(uri, user);
      let txt = result.toString();
      window.showInformationMessage(txt);
    } catch (err) {
      window.showErrorMessage(i18n().GnuPGKeyExportFailed + ' ' + err);
    }
  } else {
    const option: SaveDialogOptions = {
      defaultUri: getWorkspaceUri(),
      filters: { 'Secret Sub Key': ['subsec.key'] },
    };
    const uriSelected = await window.showSaveDialog(option);

    if (uriSelected?.scheme === 'file') {
      try {
        const result = await asyncExportSecretSubKeys(uriSelected, user);
        let txt = result.toString();
        window.showInformationMessage(txt);
      } catch (err) {
        window.showErrorMessage(i18n().GnuPGKeyExportFailed + ' ' + err);
      }
    }
  }
}

// Uri Helper .......................................................

async function encryptAsymUri(uri: Uri) {
  try {
    const stdout = await asyncListPublicKeys();
    const map = parseKeys(stdout);
    const keys = filterKeys(map, (k: GnuPGKey) => k.isValidToEncrypt);
    const quickpickitems = keysToQuickPickItems(keys);
    const recipients = await window.showQuickPick(quickpickitems, {
      placeHolder: i18n().SelectRecipients,
      canPickMany: true,
    });

    switch (GnuPGGlobal.majorVersion) {
      default:
        //v1,2
        await (async function () {
          if (recipients && recipients.length > 0) {
            return asyncEncryptAsymUri(uri, recipients);
          } else {
            return new Promise<Buffer>((_resolve, reject) => {
              reject(i18n().GnuPGNoRecipientsSelectedForEncryption);
            });
          }
        })();
        window.showInformationMessage(i18n().GnuPGFileEncryptedSuccessfully);
        break;
    }
  } catch (err) {
    window.showErrorMessage(i18n().GnuPGEncryptionFailed + ' ' + err);
  }
}

async function encryptSymmUri(uri: Uri) {
  try {
    switch (GnuPGGlobal.majorVersion) {
      case 1:
        const command = 'gpg ' + argsEncryptSymUri(uri).join(' ');
        copyToClipboard(command);
        runInTerminal(command);
        window.showInformationMessage(i18n().GnuPGSwitchToTerminalAndHitReturn);
        break;
      case 2:
        await asyncEncryptSymUri(uri);
        window.showInformationMessage(i18n().GnuPGFileEncryptedSuccessfully);
        break;
      default:
    }
  } catch (err) {
    window.showErrorMessage(i18n().GnuPGEncryptionFailed + ' ' + err);
  }
}

async function decryptUri(uri: Uri) {
  try {
    switch (GnuPGGlobal.majorVersion) {
      case 1:
        const command = 'gpg ' + argsDecryptUri(uri).join(' ');
        copyToClipboard(command);
        runInTerminal(command);
        window.showInformationMessage(i18n().GnuPGSwitchToTerminalAndHitReturn);
        break;
      case 2:
        await asyncDecryptUri(uri);
        window.showInformationMessage(i18n().GnuPGFileDecryptedSuccessfully);
        break;
      default:
    }
  } catch (err) {
    window.showErrorMessage(i18n().GnuPGDecryptionFailed + ' ' + err);
  }
}

async function signUri(uri: Uri) {
  try {
    const stdout = await asyncListSecretKeys();
    const map = parseKeys(stdout);
    const keys = filterKeys(map, (k: GnuPGKey) => k.isValidToSign);
    const quickpickitems = keysToQuickPickItems(keys);
    const key = await window.showQuickPick(quickpickitems, { placeHolder: i18n().SelectSigner });

    switch (GnuPGGlobal.majorVersion) {
      case 1:
        const command = 'gpg ' + argsSign(uri, key).join(' ');
        copyToClipboard(command);
        runInTerminal(command);
        window.showInformationMessage(i18n().GnuPGSwitchToTerminalAndHitReturn);
        break;
      case 2:
        await asyncSign(uri, key);
        window.showInformationMessage(i18n().GnuPGFileSignedSuccessfully);
        break;
      default:
    }
  } catch (err) {
    window.showErrorMessage(i18n().GnuPGSignFailed + ' ' + err);
  }
}

async function clearSignUri(uri: Uri) {
  try {
    const stdout = await asyncListSecretKeys();
    const map = parseKeys(stdout);
    const keys = filterKeys(map, (k: GnuPGKey) => k.isValidToSign);
    const quickpickitems = keysToQuickPickItems(keys);
    const key = await window.showQuickPick(quickpickitems, { placeHolder: i18n().SelectSigner });

    switch (GnuPGGlobal.majorVersion) {
      case 1:
        const command = 'gpg ' + argsClearSign(uri, key).join(' ');
        copyToClipboard(command);
        runInTerminal(command);
        window.showInformationMessage(i18n().GnuPGSwitchToTerminalAndHitReturn);
        break;
      case 2:
        await asyncClearSign(uri, key);
        window.showInformationMessage(i18n().GnuPGFileSignedSuccessfully);
        break;
      default:
    }
  } catch (err) {
    window.showErrorMessage(i18n().GnuPGSignFailed + ' ' + err);
  }
}

function launchGnuPGProviderEncryptAsym(uri: Uri) {
  // check filePath ...
  if (typeof uri === 'undefined' || !existsSync(uri.fsPath)) {
    return;
  }

  // change uri for encryptprovider
  let newUri = Uri.file(uri.fsPath.concat(' - ' + i18n().Encrypted)).with({
    scheme: 'gnupg',
    authority: 'asymmetric',
  });

  // go on to content provider ...
  commands.executeCommand('vscode.open', newUri);
}

function launchGnuPGProviderEncryptSymm(uri: Uri) {
  // check filePath ...
  if (typeof uri === 'undefined' || !existsSync(uri.fsPath)) {
    return;
  }

  // change uri for encryptprovider
  let newUri = Uri.file(uri.fsPath.concat(' - ' + i18n().Encrypted)).with({
    scheme: 'gnupg',
    authority: 'symmetric',
  });

  // go on to content provider ...
  commands.executeCommand('vscode.open', newUri);
}

function launchGnuPGProviderForDecrypt(uri: Uri) {
  // check filePath ...
  if (typeof uri === 'undefined' || !existsSync(uri.fsPath)) {
    return;
  }

  // change uri for content provider
  let newUri = Uri.file(uri.fsPath.concat(' - ' + i18n().Decrypted)).with({
    scheme: 'gnupg',
    authority: 'decrypt',
  });

  // go on to content provider ...
  commands.executeCommand('vscode.open', newUri);
}

function launchGnuPGProviderForVerify(uri: Uri) {
  // check filePath ...
  if (typeof uri === 'undefined' || !existsSync(uri.fsPath)) {
    return;
  }

  // change uri for content provider
  let newUri = Uri.file(uri.fsPath.concat(' - ' + i18n().Verified)).with({
    scheme: 'gnupg',
    authority: 'verify',
  });

  // go on to content provider ...
  commands.executeCommand('vscode.open', newUri);
}

async function editPublicKey() {
  try {
    const stdout = await asyncListPublicKeys();
    const map = parseKeys(stdout);
    const keys = filterKeys(map, (k: GnuPGKey) => true); // list all keys !!
    const quickpickitems = keysToQuickPickItems(keys);
    const pubkey = await window.showQuickPick(quickpickitems, {
      placeHolder: i18n().GnuPGSelectPublicKey,
      canPickMany: false,
    });

    if (pubkey) {
      //v1,2
      const args = argsEditKey(pubkey);
      const command = 'gpg ' + args.join(' ');
      copyToClipboard(command);
      runInTerminal(command);
      window.showInformationMessage(i18n().GnuPGSwitchToTerminalAndHitReturn);
    }
  } catch (err) {
    window.showErrorMessage(i18n().GnuPGEditPublicKeyFailed + ' ' + err);
  }
}

function generateKey() {
  const args = argsGenerateKey();
  const command = 'gpg ' + args.join(' ');

  copyToClipboard(command);
  runInTerminal(command);

  window.showInformationMessage(i18n().GnuPGSwitchToTerminalAndHitReturn);
}

async function deletePublicKey() {
  try {
    const stdout = await asyncListPublicKeys();
    const map = parseKeys(stdout);
    const keys = filterKeys(map, (_k: GnuPGKey) => true);
    const quickpickitems = keysToQuickPickItems(keys);
    const key = await window.showQuickPick(quickpickitems, {
      placeHolder: i18n().GnuPGSelectPublicKey,
      canPickMany: false,
    });

    await asyncDeletePublicKey(key);

    window.showInformationMessage(i18n().GnuPGPublicKeyDeletedSuccessfully);
  } catch (err) {
    window.showErrorMessage(i18n().GnuPGDeleteKeyFailed + ' ' + err);
  }
}

async function deleteSecretKey() {
  try {
    const stdout = await asyncListSecretKeys();
    const map = parseKeys(stdout);
    const keys = filterKeys(map, (_k: GnuPGKey) => true);
    const quickpickitems = keysToQuickPickItems(keys);
    const key = await window.showQuickPick(quickpickitems, {
      placeHolder: i18n().GnuPGSelectPublicKey,
      canPickMany: false,
    });

    await asyncDeleteSecretKey(key);

    window.showInformationMessage(i18n().GnuPGSecretKeyDeletedSuccessfully);
  } catch (err) {
    await window.showErrorMessage(i18n().GnuPGDeleteSecretKeyFailed + ' ' + err);
  }
}

async function copyFingerprintToClipboard() {
  try {
    const stdout = await asyncListPublicKeys();
    const map = parseKeys(stdout);
    const keys = filterKeys(map, (k: GnuPGKey) => true);
    const quickpickitems = keysToQuickPickItems(keys);
    const key = await window.showQuickPick(quickpickitems, {
      placeHolder: i18n().GnuPGSelectPublicKey,
      canPickMany: false,
    });

    if (key) {
      copyToClipboard(key.fingerprint);
    }
  } catch (err) {
    window.showErrorMessage(i18n().GnuPGCopyFingerprintToClipboardFailed + ' ' + err);
  }
}

async function copyKeyIdToClipboard() {
  try {
    const stdout = await asyncListPublicKeys();
    const map = parseKeys(stdout);
    const keys = filterKeys(map, (k: GnuPGKey) => true);
    const quickpickitems = keysToQuickPickItems(keys);
    const key = await window.showQuickPick(quickpickitems, {
      placeHolder: i18n().GnuPGSelectPublicKey,
      canPickMany: false,
    });

    if (key) {
      copyToClipboard(key.keyId);
    }
  } catch (err) {
    window.showErrorMessage(i18n().GnuPGCopyFingerprintToClipboardFailed + ' ' + err);
  }
}
