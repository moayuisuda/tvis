
import { Encode } from './types';

export function getEncodeField(encode: any): string | undefined {
  if (typeof encode === 'string') {
    return encode;
  }

  if (encode && typeof encode === 'object') {
    if (encode.type === 'field' && encode.value) {
      return encode.value;
    }
    if (encode.value && typeof encode.value === 'string') {
      return encode.value;
    }
  }

  return undefined;
}
