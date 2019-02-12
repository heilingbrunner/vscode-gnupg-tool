import * as vscode from 'vscode';
import * as fs from 'fs';

import EncryptProvider from './encryptprovider';
import DecryptProvider from './decryptprovider';
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
  let encryptProvider = vscode.workspace.registerTextDocumentContentProvider('gpg-encrypt', new EncryptProvider());
  let decryptProvider = vscode.workspace.registerTextDocumentContentProvider('gpg-decrypt', new DecryptProvider());

  const commandCheckGnuPG = vscode.commands.registerCommand('extension.CheckGnuPG', () => {
    checkGnuPG(true);
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
  checkGnuPG(false);

  //Disposables
  context.subscriptions.push(virtualDocumentProvider);
  context.subscriptions.push(encryptProvider);
  context.subscriptions.push(decryptProvider);
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

function checkGnuPG(showInfo: boolean) {
  promise_checkVersion()
    .then(stdout => promise_extractVersions(stdout))
    .then(lines => {
      if (lines.length >= 2) {
        statusBarItem.text = `$(mirror-private) ` + lines[0];
        statusBarItem.show();
        if (showInfo) {
          vscode.window.showInformationMessage('GnuPG: gpg --version -> ' + lines[0] + ', ' + lines[1]);
        }
      }
    })
    .catch(() => {
      statusBarItem.hide();
      vscode.window.showErrorMessage('GnuPG: gpg not available !');
    });
}

function listRecipients() {
  let newUri = vscode.Uri.parse('virtual-document://gnupg/Recipients');
  // for (const editor of vscode.window.visibleTextEditors) {
  //   if (editor.document.uri === newUri) {
  //     editor.close();
  //   }
  // }
  vscode.commands.executeCommand('vscode.open', newUri);
}

function showSmartcard() {
  let newUri = vscode.Uri.parse('virtual-document://gnupg/Smartcard');
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
  if (fileUri.scheme === 'file') {
    encryptFileUri(fileUri);
  }
}

function previewEncryptedFile(fileUri: vscode.Uri) {
  // if (typeof fileUri === 'undefined' || !(fileUri instanceof vscode.Uri)) {
  //   return;
  // }

  //already encrpyted, show as normal text file
  if (fileUri.scheme === 'file') {
    //} && fileUri.fsPath.endsWith('.asc')) {
    //   //toggle with actual file
    //   var filePath = fileUri.fsPath; //getPhysicalPath(fileUri);
    //   //already opened
    //   for (const editor of vscode.window.visibleTextEditors) {
    //     if (editor.document.uri.fsPath === filePath) {
    //       vscode.window.showTextDocument(editor.document, editor.viewColumn);
    //       return;
    //     }
    //   }

    //   //open text file in new editor
    //   vscode.commands.executeCommand('vscode.open', vscode.Uri.file(filePath));
    // } else {
    launchEncryptProvider(fileUri);
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
  if (fileUri.scheme === 'file') {
    decryptFileUri(fileUri);
  }
}

function previewDecryptedFile(fileUri: vscode.Uri) {
  // no uri, no active editor
  //if (typeof fileUri === 'undefined' || !(fileUri instanceof vscode.Uri)) {
  //  if (vscode.window.activeTextEditor === undefined) {
  //    vscode.commands.executeCommand('extension.decryptPath');
  //    return;
  //  }
  //  fileUri = vscode.window.activeTextEditor.document.uri;
  //}

  if (fileUri.scheme === 'file') {
    //  //toggle with actual file
    //  var filePath = getPhysicalPath(fileUri);
    //  for (const editor of vscode.window.visibleTextEditors) {
    //    if (editor.document.uri.fsPath === filePath) {
    //      vscode.window.showTextDocument(editor.document, editor.viewColumn);
    //      return;
    //    }
    //  }
    //
    //  vscode.commands.executeCommand('vscode.open', vscode.Uri.file(filePath));
    //} else {
    launchDecryptProvider(fileUri);
  }
}

function endSession() {
  promise_killgpgagent()
    .then(() => vscode.window.showInformationMessage('GnuPG session ended.'))
    .catch(() => vscode.window.showErrorMessage('GnuPG end session failed !'));
}

// Helper .......................................................

function encryptFileUri(fileUri: vscode.Uri) {
  // check filePath ...
  if (typeof fileUri === 'undefined' || !fs.existsSync(fileUri.fsPath)) {
    return;
  }

  let content = 'ABC';

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
          fs.writeFileSync(newUri.fsPath, encrypted);
          //vscode.commands.executeCommand('vscode.open', newUri);
          vscode.workspace.openTextDocument(newUri).then((doc: vscode.TextDocument) => {
            vscode.window.showTextDocument(doc, {preview: false});
          });
        }
      })
      .catch(() => vscode.window.showErrorMessage('GnuPG encryption failed !'));
  } else {
    vscode.window.showWarningMessage('No text selected for GnuPG encryption.');
  }
}

function decryptFileUri(fileUri: vscode.Uri) {
  // check filePath ...
  if (typeof fileUri === 'undefined' || !fs.existsSync(fileUri.fsPath)) {
    return;
  }
}

function launchEncryptProvider(fileUri: vscode.Uri) {
  // check filePath ...
  if (typeof fileUri === 'undefined' || !fs.existsSync(fileUri.fsPath)) {
    return;
  }

  // change uri for encryptprovider
  let newUri = vscode.Uri.file(fileUri.fsPath.concat('.asc')).with({ scheme: 'gpg-encrypt' });

  // go on to content provider ...
  vscode.commands.executeCommand('vscode.open', newUri);
}

function launchDecryptProvider(fileUri: vscode.Uri) {
  // check filePath ...
  if (typeof fileUri === 'undefined' || !fs.existsSync(fileUri.fsPath)) {
    return;
  }

  // change uri for content provider
  let newUri = vscode.Uri.file(fileUri.fsPath.concat('.decrypted')).with({ scheme: 'gpg-decrypt' });

  // go on to content provider ...
  vscode.commands.executeCommand('vscode.open', newUri);
}
