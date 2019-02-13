import * as vscode from 'vscode';
import * as fs from 'fs';

import PreviewEncryptProvider from './previewencryptprovider';
import PreviewDecryptProvider from './previewdecryptprovider';
import {
  promise_checkVersion,
  promise_extractVersions,
  promise_listRecipients,
  promise_readKeys,
  promise_RecipientsToOptions,
  promise_encrypt,
  promise_decrypt,
  promise_killgpgagent
} from './gnupgpromises';
import VirtualDocumentProvider from './virtualdocumentprovider';

let statusBarItem: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);

  let virtualDocumentProvider = vscode.workspace.registerTextDocumentContentProvider(
    'virtual-document',
    new VirtualDocumentProvider()
  );
  let previewEncryptProvider = vscode.workspace.registerTextDocumentContentProvider(
    'gpg-preview-encrypt',
    new PreviewEncryptProvider()
  );
  let previewDecryptProvider = vscode.workspace.registerTextDocumentContentProvider(
    'gpg-preview-decrypt',
    new PreviewDecryptProvider()
  );

  const commandCheckGnuPG = vscode.commands.registerCommand('extension.CheckGnuPG', () => {
    showVersion();
  });

  const commandListRecipients = vscode.commands.registerCommand('extension.ListRecipients', () => {
    listRecipients();
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

  const commandEndSession = vscode.commands.registerCommand('extension.EndSession', () => {
    endSession();
  });

  // Update statusBarItem on activate
  checkGnuPG();

  //Disposables
  context.subscriptions.push(virtualDocumentProvider);
  context.subscriptions.push(previewEncryptProvider);
  context.subscriptions.push(previewDecryptProvider);
  context.subscriptions.push(commandCheckGnuPG);
  context.subscriptions.push(commandListRecipients);
  context.subscriptions.push(commandShowSmartcard);
  context.subscriptions.push(commandEncryptSelection);
  context.subscriptions.push(commandEncryptFile);
  context.subscriptions.push(commandPreviewEncryptedFile);
  context.subscriptions.push(commandDecryptSelection);
  context.subscriptions.push(commandDecryptFile);
  context.subscriptions.push(commandPreviewDecryptedFile);
  context.subscriptions.push(commandEndSession);
}

// this method is called when your extension is deactivated
export function deactivate() {
  statusBarItem.hide();
}

// Commands .......................................................

function checkGnuPG() {
  promise_checkVersion()
    .then(stdout => promise_extractVersions(stdout))
    .then(lines => {
      if (lines.length >= 2) {
        statusBarItem.text = `$(mirror-private) ` + lines[0];
        statusBarItem.show();
      }
    })
    .catch(() => {
      statusBarItem.hide();
      vscode.window.showErrorMessage('GnuPG: gpg not available !');
    });
}

function showVersion() {
  let newUri = vscode.Uri.parse('virtual-document://gnupg/GnuPG-Version');
  vscode.commands.executeCommand('vscode.open', newUri);
}

function listRecipients() {
  let newUri = vscode.Uri.parse('virtual-document://gnupg/GnuPG-Recipients');
  vscode.commands.executeCommand('vscode.open', newUri);
}

function showSmartcard() {
  let newUri = vscode.Uri.parse('virtual-document://gnupg/GnuPG-Smartcard');
  vscode.commands.executeCommand('vscode.open', newUri);
}

function encryptSelection(editor: vscode.TextEditor) {
  if (editor) {
    const selection = editor.selection;
    const content = editor.document.getText(selection);

    if (content && content.length > 0) {
      promise_listRecipients()
        .then(stdout => promise_readKeys(stdout))
        .then(keys => promise_RecipientsToOptions(keys))
        .then(options =>
          vscode.window.showQuickPick(options, { placeHolder: 'Select recipients ...', canPickMany: true })
        )
        .then(recipients => promise_encrypt(content, recipients))
        .then(encrypted => {
          if (encrypted !== undefined) {
            editor.edit(edit => edit.replace(selection, encrypted));
          }
        })
        .catch(() => vscode.window.showErrorMessage('GnuPG encryption failed !'));
    } else {
      vscode.window.showWarningMessage('No text selected for GnuPG encryption.');
    }
  }
}

function encryptFile(fileUri: vscode.Uri) {
  if (fileUri !== undefined && fileUri.scheme === 'file') {
    if (fileUri.fsPath.match(/\.(asc|gpg)$/i)) {
      vscode.window.showInformationMessage('GnuPG: File already encrypted (*.asc).');
    } else {
      encryptFileUri(fileUri);
    }
  } else {
    vscode.window.showErrorMessage('GnuPG: No file selected ! Please use explorer context menu.');
  }
}

function previewEncryptedFile(fileUri: vscode.Uri) {
  if (fileUri !== undefined && fileUri.scheme === 'file') {
    if (fileUri.fsPath.match(/\.(asc|gpg)$/i)) {
      vscode.window.showInformationMessage('GnuPG: File already encrypted (*.asc).');
    } else {
      launchEncryptProvider(fileUri);
    }
  } else {
    vscode.window.showErrorMessage('GnuPG: No file selected ! Please use explorer context menu.');
  }
}

function decryptSelection(editor: vscode.TextEditor) {
  if (editor) {
    const selection = editor.selection;
    const content = editor.document.getText(selection);

    if (content && content.length > 0) {
      promise_decrypt(content)
        .then(decrypted => {
          if (decrypted !== undefined) {
            editor.edit(edit => edit.replace(selection, decrypted));
          }
        })
        .catch(() => vscode.window.showErrorMessage('GnuPG decryption failed !'));
    } else {
      vscode.window.showWarningMessage('No text selected for GnuPG decryption.');
    }
  }
}

function decryptFile(fileUri: vscode.Uri) {
  if (fileUri !== undefined && fileUri.scheme === 'file') {
    if (fileUri.fsPath.match(/\.(asc|gpg)$/i)) {
      decryptFileUri(fileUri);
    } else {
      vscode.window.showInformationMessage('GnuPG: File not encrypted (*.asc).');
    }
  } else {
    vscode.window.showErrorMessage('GnuPG: No file selected ! Please use explorer context menu.');
  }
}

function previewDecryptedFile(fileUri: vscode.Uri) {
  if (fileUri !== undefined && fileUri.scheme === 'file') {
    if (fileUri.fsPath.match(/\.(asc|gpg)$/i)) {
      launchDecryptProvider(fileUri);
    } else {
      vscode.window.showInformationMessage('GnuPG: File not encrypted (*.asc).');
    }
  } else {
    vscode.window.showErrorMessage('GnuPG: No file selected ! Please use explorer context menu.');
  }
}

function endSession() {
  promise_killgpgagent()
    .then(() => vscode.window.showInformationMessage('GnuPG session ended.'))
    .catch(() => vscode.window.showErrorMessage('GnuPG end session failed !'));
}

// Helper .......................................................

function encryptFileUri(fileUri: vscode.Uri) {
  getContent(fileUri).then(content => {
    if (content && content.length > 0) {
      promise_listRecipients()
        .then(stdout => promise_readKeys(stdout))
        .then(keys => promise_RecipientsToOptions(keys))
        .then(options =>
          vscode.window.showQuickPick(options, { placeHolder: 'Select recipients ...', canPickMany: true })
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
        .catch(() => vscode.window.showErrorMessage('GnuPG encryption failed !'));
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
        .catch(() => vscode.window.showErrorMessage('GnuPG decryption failed !'));
    }
  });
}

function launchEncryptProvider(fileUri: vscode.Uri) {
  // check filePath ...
  if (typeof fileUri === 'undefined' || !fs.existsSync(fileUri.fsPath)) {
    return;
  }

  // change uri for encryptprovider
  let newUri = vscode.Uri.file(fileUri.fsPath.concat('.asc')).with({ scheme: 'gpg-preview-encrypt' });

  // go on to content provider ...
  vscode.commands.executeCommand('vscode.open', newUri);
}

function launchDecryptProvider(fileUri: vscode.Uri) {
  // check filePath ...
  if (typeof fileUri === 'undefined' || !fs.existsSync(fileUri.fsPath)) {
    return;
  }

  // change uri for content provider
  let newUri = vscode.Uri.file(fileUri.fsPath.concat('.decrypted')).with({ scheme: 'gpg-preview-decrypt' });

  // go on to content provider ...
  vscode.commands.executeCommand('vscode.open', newUri);
}

function getContent(uri: vscode.Uri): Promise<string> {
  return new Promise((resolve, reject) => {
    if (uri.scheme === 'file') {
      const filepath = uri.fsPath;

      fs.readFile(filepath, (err, buffer) => {
        if (err) {
          reject(err);
        } else {
          resolve(buffer.toString());
        }
      });
    } else {
      resolve('.');
    }
  });
}

function setContent(uri: vscode.Uri, content: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // fs.writeFileSync(newUri.fsPath, encrypted);
    fs.writeFile(uri.fsPath, content, err => {
      if (err) {
        reject(err);
      } else {
        resolve(content);
      }
    });
  });
}
