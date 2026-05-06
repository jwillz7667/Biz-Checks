import { compile, type EvalContext } from '@biz-checks/formula';
import { encodeMICRLine } from '@biz-checks/micr';

import type {
  BankAccount,
  CanvasObject,
  CheckTemplate,
  DataRow,
  ValueExpression,
} from '@biz-checks/domain';

export interface CheckRenderInput {
  readonly template: CheckTemplate;
  readonly account: BankAccount;
  readonly labelNumber: number;
  readonly totalLabels: number;
  /** Auto-allocated serial number for this check. */
  readonly serialNumber: string;
  /** Snapshot of label fields for this check. */
  readonly labelFieldValues: Readonly<Record<string, string>>;
  /** Optional data source row, indexed by column name. */
  readonly dataRow?: DataRow;
  /** Optional column order from the linked data source. */
  readonly dataColumns?: readonly string[];
  /** Time anchor — defaults to now. */
  readonly now?: Date;
}

export interface ResolvedObject {
  readonly object: CanvasObject;
  readonly resolvedText: string;
}

/**
 * Resolve every dynamic value on the template — formulas, label fields,
 * MICR encodings — into concrete strings ready for the renderer. Throws
 * DomainError if any formula fails to compile or evaluate.
 */
export function resolveCheck(input: CheckRenderInput): ResolvedObject[] {
  const evalCtx = buildEvalContext(input);
  return input.template.objects.map((obj) => ({
    object: obj,
    resolvedText: resolveObjectText(obj, evalCtx, input),
  }));
}

function buildEvalContext(input: CheckRenderInput): EvalContext {
  const dataColumns = input.dataColumns ?? [];
  const dataRow = input.dataRow ?? {};

  return {
    labelNumber: input.labelNumber,
    totalLabels: input.totalLabels,
    now: input.now,
    labelField: (name) => {
      if (name === 'SerialNumber') return input.serialNumber;
      return input.labelFieldValues[name];
    },
    dataField: (idx) => {
      const col = dataColumns[idx - 1];
      if (col === undefined) return undefined;
      return dataRow[col] ?? undefined;
    },
    dataFieldByName: (name) => dataRow[name] ?? undefined,
  };
}

function resolveObjectText(
  obj: CanvasObject,
  ctx: EvalContext,
  input: CheckRenderInput,
): string {
  switch (obj.kind) {
    case 'shape':
    case 'image':
    case 'signature':
      return '';
    case 'text':
    case 'amount-box':
      return resolveValueExpression(obj.value, ctx);
    case 'micr': {
      const text = resolveValueExpression(obj.value, ctx);
      if (text.trim().length > 0) return text;
      // Fallback: build the default MICR line from the bank account.
      const encoded = encodeMICRLine({
        routing: input.account.routingNumber,
        account: input.account.accountNumber,
        serial: input.serialNumber,
        auxOnUs: input.account.auxOnUs,
      });
      if (!encoded.ok) throw encoded.error;
      return encoded.value;
    }
  }
}

function resolveValueExpression(value: ValueExpression, ctx: EvalContext): string {
  switch (value.kind) {
    case 'literal':
      return value.text;
    case 'label-field': {
      const v = ctx.labelField(value.field);
      if (v === undefined) throw new Error(`Label field "${value.field}" not found`);
      return v;
    }
    case 'data-source': {
      const v = ctx.dataFieldByName(value.column);
      if (v === undefined) throw new Error(`Data column "${value.column}" not found`);
      return typeof v === 'number' ? v.toString() : v;
    }
    case 'formula': {
      const compiled = compile(value.formula);
      if (!compiled.ok) throw compiled.error;
      return compiled.value(ctx);
    }
  }
}
