import { ILocale } from "../locale";

const translation: ILocale = {
  Decrypted: 'descifrado',
  Encrypted: 'cifrado',
  GnuPGDecryptionFailed: 'GnuPG: Descifrado fallido !',
  GnuPGEncryptionFailed: 'GnuPG: Cifrado fallido !',
  GnuPGEndSessionFailed: 'GnuPG: La sesión final falló !',
  GnuPGEndSessionSuccessfully: 'GnuPG: La sesión terminó con éxito.',
  GnuPGFileAlreadyEncrypted: 'GnuPG: Archivo ya encriptado (*.asc|*.gpg).',
  GnuPGFileDecryptedSuccessfully: 'GnuPG: Archivo descifrado exitosamente.',
  GnuPGFileEncryptedSuccessfully: 'GnuPG: Archivo cifrado correctamente.',
  GnuPGFileIsAlreadyASignature: 'GnuPG: El archivo ya es una firma (*.sig).',
  GnuPGFileIsNotASignature: 'GnuPG: El archivo no es una firma (*.sig).',
  GnuPGFileNotEncrypted: 'GnuPG: Archivo no cifrado (*.asc|*.gpg).',
  GnuPGFileSignedSuccessfully: 'GnuPG: Archivo firmado correctamente',
  GnuPGGpgNotAvailable: 'GnuPG: gpg no disponible !',
  GnuPGKeyExportFailed: 'GnuPG: La exportación de clave falló !',
  GnuPGKeyExportSuccessfully: 'GnuPG: Exportación clave exitosa !',
  GnuPGKeyImportFailed: 'GnuPG: Error en la importación de clave !',
  GnuPGKeyImportSuccessfully: 'GnuPG: Importación clave exitosamente !',
  GnuPGNoRecipientsSelectedForEncryption: 'GnuPG: Ningún destinatario seleccionado para cifrado.',
  GnuPGNoTextSelectedForDecryption: 'GnuPG: Ningún texto seleccionado para descifrado.',
  GnuPGNoTextSelectedForEncryption: 'GnuPG: Ningún texto seleccionado para el cifrado.',
  GnuPGSignFailed: 'GnuPG: Firma fallida !',
  GnuPGVerfication: 'GnuPG: Verificación',
  GnuPGVerficationFailed: 'GnuPG: Fallo en la verificación !',
  SelectKeyToExport: 'Seleccionar clave para exportar ...',
  SelectRecipients: 'Seleccionar destinatarios ...',
  SelectSigner: 'Seleccionar firmante ...',
  Verified: 'verificado'
};

export default translation;
