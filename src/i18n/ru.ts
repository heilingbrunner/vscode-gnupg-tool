import { Ii18n } from "../i18n";

const translation: Ii18n = {
  Decrypted: 'расшифрованный',
  Encrypted: 'зашифрованная',
  GnuPGDecryptionFailed: 'GnuPG: Расшифровка не удалась!',
  GnuPGEncryptionFailed: 'GnuPG: Сбой шифрования!',
  GnuPGEndSessionFailed: 'GnuPG: Не удалось завершить сеанс!',
  GnuPGEndSessionSuccessfully: 'GnuPG: Сессия завершилась успешно.',
  GnuPGFileAlreadyEncrypted: 'GnuPG: Файл уже зашифрован (*.asc|*.gpg).',
  GnuPGFileDecryptedSuccessfully: 'GnuPG: Файл успешно расшифрован.',
  GnuPGFileEncryptedSuccessfully: 'GnuPG: Файл успешно зашифрован.',
  GnuPGFileIsAlreadyASignature: 'GnuPG: Файл уже подпись (*.sig).',
  GnuPGFileIsNotASignature: 'GnuPG: Файл не является подписью (*.sig).',
  GnuPGFileNotEncrypted: 'GnuPG: Файл не зашифрован (*.asc|*.gpg).',
  GnuPGFileSignedSuccessfully: 'GnuPG: Файл успешно подписан.',
  GnuPGGpgNotAvailable: 'GnuPG: gpg недоступен!',
  GnuPGKeyExportFailed: 'GnuPG: Не удалось экспортировать ключ!',
  GnuPGKeyExportSuccessfully: 'GnuPG: Ключ успешно экспортирован.',
  GnuPGKeyImportFailed: 'GnuPG: Не удалось импортировать ключ!',
  GnuPGKeyImportSuccessfully: 'GnuPG: Ключ успешно импортирован.',
  GnuPGNoRecipientsSelectedForEncryption: 'GnuPG: Не выбран получатель для шифрования.',
  GnuPGNoTextSelectedForDecryption: 'GnuPG: Не выбран текст для расшифровки.',
  GnuPGNoTextSelectedForEncryption: 'GnuPG: Не выбран текст для шифрования.',
  GnuPGSignFailed: 'GnuPG: Не удалось подписать!',
  GnuPGVerfication: 'GnuPG: верификация',
  GnuPGVerficationFailed: 'GnuPG: Проверка не удалась!',
  SelectKeyToExport: 'Выберите ключ для экспорта ...',
  SelectRecipients: 'Выберите получателей ...',
  SelectSigner: 'Выберите подписавшего ...',
  Verified: 'проверенный'
};

export default translation;
