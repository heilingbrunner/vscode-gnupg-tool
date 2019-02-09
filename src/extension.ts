import * as vscode from 'vscode';
import * as gnupgtool from './gnupgtool';
import DecryptedContentProvider from './decryptedcontentprovider';

export function activate(context: vscode.ExtensionContext) {
  console.log('GnuPG Tool activated');

  //TODO:
  //Show Smartcard

  let provider = new DecryptedContentProvider();
  let registration = vscode.workspace.registerTextDocumentContentProvider('decrypted', provider);


  const disposableCommandCheckGnuPG = vscode.commands.registerCommand('extension.CheckGnuPG', () => {
    gnupgtool.checkGnuPG();
  });

  const disposableCommandListRecipients = vscode.commands.registerCommand('extension.ListRecipients', () => {
    gnupgtool.listRecipients();
  });

  const disposableCommandShowSmartcard = vscode.commands.registerCommand('extension.ShowSmartcard', () => {
    gnupgtool.showSmartcard();
  });

  const disposableCommandEncryptSelection = vscode.commands.registerCommand('extension.EncryptSelection', () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      gnupgtool.encryptSelection(editor);
    }
  });

  const disposableCommandDecryptSelection = vscode.commands.registerCommand('extension.DecryptSelection', () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      gnupgtool.decryptSelection(editor);
    } else {
    }
  });

  const disposableCommandEndSession = vscode.commands.registerCommand('extension.EndSession', () => {
    gnupgtool.endSession();
  });

  const disposableCommandDecryptFile = vscode.commands.registerCommand('extension.DecryptFile', (fileUri: vscode.Uri) => {
    gnupgtool.decryptFile(fileUri);
  });


  //Disposables
  context.subscriptions.push(disposableCommandCheckGnuPG);
  context.subscriptions.push(disposableCommandListRecipients);
  context.subscriptions.push(disposableCommandShowSmartcard);
  context.subscriptions.push(disposableCommandEncryptSelection);
  context.subscriptions.push(disposableCommandDecryptSelection);
  context.subscriptions.push(disposableCommandEndSession);
  context.subscriptions.push(disposableCommandDecryptFile);
}

// this method is called when your extension is deactivated
export function deactivate() {}
