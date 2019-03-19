import en from './i18n/en';
import de from './i18n/de';
import es from './i18n/es';
import fr from './i18n/fr';
import ru from './i18n/ru';
import zh_CN from './i18n/zh-CN';

export interface Ii18n {
  Decrypted: string;
  Encrypted: string;
  GnuPGDecryptionFailed: string;
  GnuPGEncryptionFailed: string;
  GnuPGEndSessionFailed: string;
  GnuPGEndSessionSuccessfully: string;
  GnuPGFileAlreadyEncrypted: string;
  GnuPGFileDecryptedSuccessfully: string;
  GnuPGFileEncryptedSuccessfully: string;
  GnuPGFileIsAlreadyASignature: string;
  GnuPGFileIsNotASignature: string;
  GnuPGFileNotEncrypted: string;
  GnuPGFileSignedSuccessfully: string;
  GnuPGGpgNotAvailable: string;
  GnuPGKeyExportFailed: string;
  GnuPGKeyExportSuccessfully: string;
  GnuPGKeyImportFailed: string;
  GnuPGKeyImportSuccessfully: string;
  GnuPGNoRecipientsSelectedForEncryption: string;
  GnuPGNoTextSelectedForDecryption: string;
  GnuPGNoTextSelectedForEncryption: string;
  GnuPGSignFailed: string;
  GnuPGVerfication: string;
  GnuPGVerficationFailed: string;
  SelectKeyToExport: string;
  SelectRecipients: string;
  SelectSigner: string;
  Verified: string;
}

export function i18n(): Ii18n {

  let curr: Ii18n;
  let config: { locale: string } = { locale: 'en' };

  if (process.env.VSCODE_NLS_CONFIG) {
    let VSCODE_NLS_CONFIG = process.env.VSCODE_NLS_CONFIG;
    config = JSON.parse(VSCODE_NLS_CONFIG);
  }

  switch (config.locale) {
    case 'en':
      curr = en;
      break;

    case 'de':
      curr = de;
      break;

    case 'es':
      curr = es;
      break;

    case 'fr':
      curr = fr;
      break;

    case 'ru':
      curr = ru;
      break;

    case 'zh-CN':
      curr = zh_CN;
      break;

    default:
      curr = en;
  }

  return curr;
}
