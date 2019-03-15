import dict_en from './locale/lang_en';
import dict_de from './locale/lang_de';

export function getDictionary(): string[][] {
  let VSCODE_NLS_CONFIG = process.env.VSCODE_NLS_CONFIG ? process.env.VSCODE_NLS_CONFIG : '{"locale": "en"}';

  const config = JSON.parse(VSCODE_NLS_CONFIG);

  let dictionary: string[][];

  switch(config.locale){
    case 'de':
      dictionary = dict_de;
      break;

    default:
      dictionary = dict_en;
  }

  return dictionary;
}
