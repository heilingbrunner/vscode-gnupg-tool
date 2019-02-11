import * as vscode from 'vscode';
import * as gnupgtool from './gnupgtool';
import EncryptProvider from './encryptprovider';
import DecryptProvider from './decryptprovider';

export function activate(context: vscode.ExtensionContext) {
  console.log('GnuPG Tool activated');

  let encryptProvider = vscode.workspace.registerTextDocumentContentProvider('gpg-encrypt', new EncryptProvider());
  let decryptProvider = vscode.workspace.registerTextDocumentContentProvider('gpg-decrypt', new DecryptProvider());

  const commandCheckGnuPG = vscode.commands.registerCommand('extension.CheckGnuPG', () => {
    gnupgtool.checkGnuPG();
  });

  const commandListRecipients = vscode.commands.registerCommand('extension.ListRecipients', () => {
    gnupgtool.listRecipients();
  });

  const commandShowSmartcard = vscode.commands.registerCommand('extension.ShowSmartcard', () => {
    gnupgtool.showSmartcard();
  });

  const commandEncryptSelection = vscode.commands.registerCommand('extension.EncryptSelection', () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      gnupgtool.encryptSelection(editor);
    }
  });

  const commandEncryptFile = vscode.commands.registerCommand('extension.EncryptFile', (fileUri: vscode.Uri) => {
    gnupgtool.encryptFile(fileUri);
  });

  const commandDecryptSelection = vscode.commands.registerCommand('extension.DecryptSelection', () => {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      gnupgtool.decryptSelection(editor);
    }
  });

  const commandDecryptFile = vscode.commands.registerCommand('extension.DecryptFile', (fileUri: vscode.Uri) => {
    gnupgtool.decryptFile(fileUri);
  });

  const commandEndSession = vscode.commands.registerCommand('extension.EndSession', () => {
    gnupgtool.endSession();
  });

  //Disposables
  context.subscriptions.push(encryptProvider);
  context.subscriptions.push(decryptProvider);
  context.subscriptions.push(commandCheckGnuPG);
  context.subscriptions.push(commandListRecipients);
  context.subscriptions.push(commandShowSmartcard);
  context.subscriptions.push(commandEncryptSelection);
  context.subscriptions.push(commandEncryptFile);
  context.subscriptions.push(commandDecryptSelection);
  context.subscriptions.push(commandDecryptFile);
  context.subscriptions.push(commandEndSession);
}

// this method is called when your extension is deactivated
export function deactivate() {}
