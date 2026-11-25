import { BadRequestException } from '@nestjs/common';

// Static error reasons for the partners/search/catalog/assets/locations inputs.
// `reason` and `field` are fixed strings: never put user input or ids in them.
export function invalid(reason: string, field?: string) {
  return new BadRequestException({ reason, ...(field ? { field } : {}) });
}

/** Run a shared parser and replace its generic reason with a more precise one. */
export function reasoned<T>(parse: () => T, reason: string, field?: string): T {
  try {
    return parse();
  } catch (e) {
    if (e instanceof BadRequestException) throw invalid(reason, field);
    throw e;
  }
}
