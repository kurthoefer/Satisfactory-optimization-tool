/**
 * A single section in _docs.json.
 * Each section has a NativeClass identifier and an array of entries.
 * Entry shapes vary by section — parsers cast to their own internal schemas.
 */

export interface GameSectionSchema {
  NativeClass: string;
  Classes?: Record<string, any>[];
}
