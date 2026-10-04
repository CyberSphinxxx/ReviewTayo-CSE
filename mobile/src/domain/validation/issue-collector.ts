/**
 * Runtime validation toolkit.
 *
 * Remote payloads and bundled JSON are validated at the boundary: a TypeScript
 * type that compiles proves nothing about data that arrives at runtime. The
 * toolkit is deliberately tiny and dependency-free, and every failure carries a
 * JSON-ish path so problems are actionable rather than mysterious.
 */

export type ValidationSeverity = 'error' | 'warning';

export interface ValidationIssue {
  readonly path: string;
  readonly code: string;
  readonly message: string;
  readonly severity: ValidationSeverity;
}

export class IssueCollector {
  private readonly collected: ValidationIssue[] = [];

  error(path: string, code: string, message: string): void {
    this.collected.push({ path, code, message, severity: 'error' });
  }

  warn(path: string, code: string, message: string): void {
    this.collected.push({ path, code, message, severity: 'warning' });
  }

  get issues(): readonly ValidationIssue[] {
    return this.collected;
  }

  get hasErrors(): boolean {
    return this.collected.some((issue) => issue.severity === 'error');
  }

  merge(issues: readonly ValidationIssue[]): void {
    this.collected.push(...issues);
  }
}

export const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export interface StringOptions {
  readonly required?: boolean;
  readonly minLength?: number;
  readonly enumValues?: readonly string[];
}

export const readString = (
  collector: IssueCollector,
  path: string,
  value: unknown,
  options: StringOptions = {},
): string | undefined => {
  if (value === undefined || value === null) {
    if (options.required === true)
      collector.error(path, 'missing-field', 'Required value is absent.');
    return undefined;
  }
  if (typeof value !== 'string') {
    collector.error(path, 'invalid-type', `Expected a string but received ${typeof value}.`);
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    if (options.required === true) {
      collector.error(path, 'missing-field', 'Required value is empty.');
    }
    return undefined;
  }
  if (options.minLength !== undefined && trimmed.length < options.minLength) {
    collector.error(path, 'too-short', `Expected at least ${options.minLength} characters.`);
    return undefined;
  }
  if (options.enumValues !== undefined && !options.enumValues.includes(trimmed)) {
    collector.error(
      path,
      'invalid-enum',
      `Expected one of ${options.enumValues.join(', ')} but received "${trimmed}".`,
    );
    return undefined;
  }
  return trimmed;
};

export interface NumberOptions {
  readonly required?: boolean;
  readonly min?: number;
  readonly max?: number;
  readonly integer?: boolean;
  /** Used for genuinely optional tuning values that have a sane default. */
  readonly fallback?: number;
}

export const readNumber = (
  collector: IssueCollector,
  path: string,
  value: unknown,
  options: NumberOptions = {},
): number | undefined => {
  if (value === undefined || value === null) {
    if (options.required === true)
      collector.error(path, 'missing-field', 'Required value is absent.');
    return options.fallback;
  }
  if (typeof value !== 'number' || Number.isNaN(value)) {
    collector.error(path, 'invalid-type', `Expected a number but received ${typeof value}.`);
    return undefined;
  }
  if (options.integer === true && !Number.isInteger(value)) {
    collector.error(path, 'invalid-number', 'Expected a whole number.');
    return undefined;
  }
  if (options.min !== undefined && value < options.min) {
    collector.error(path, 'out-of-range', `Expected a value >= ${options.min}.`);
    return undefined;
  }
  if (options.max !== undefined && value > options.max) {
    collector.error(path, 'out-of-range', `Expected a value <= ${options.max}.`);
    return undefined;
  }
  return value;
};

export const readBoolean = (
  collector: IssueCollector,
  path: string,
  value: unknown,
  options: { required?: boolean; fallback?: boolean } = {},
): boolean | undefined => {
  if (value === undefined || value === null) {
    if (options.required === true)
      collector.error(path, 'missing-field', 'Required value is absent.');
    return options.fallback;
  }
  if (typeof value !== 'boolean') {
    collector.error(path, 'invalid-type', `Expected a boolean but received ${typeof value}.`);
    return options.fallback;
  }
  return value;
};

export const readArray = (
  collector: IssueCollector,
  path: string,
  value: unknown,
  options: { required?: boolean; minLength?: number } = {},
): readonly unknown[] => {
  if (value === undefined || value === null) {
    if (options.required === true)
      collector.error(path, 'missing-field', 'Required list is absent.');
    return [];
  }
  if (!Array.isArray(value)) {
    collector.error(path, 'invalid-type', 'Expected a list.');
    return [];
  }
  if (options.minLength !== undefined && value.length < options.minLength) {
    collector.error(
      path,
      'empty-collection',
      `Expected at least ${options.minLength} entries but found ${value.length}.`,
    );
  }
  return value;
};

export const readObject = (
  collector: IssueCollector,
  path: string,
  value: unknown,
  options: { required?: boolean } = {},
): Record<string, unknown> => {
  if (value === undefined || value === null) {
    if (options.required === true)
      collector.error(path, 'missing-field', 'Required object is absent.');
    return {};
  }
  if (!isPlainObject(value)) {
    collector.error(path, 'invalid-type', 'Expected an object.');
    return {};
  }
  return value;
};

/**
 * Reports duplicate ids so content mistakes fail the build rather than silently
 * collapsing two questions into one.
 */
export const findDuplicateIds = (ids: readonly string[]): readonly string[] => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }
  return [...duplicates];
};
