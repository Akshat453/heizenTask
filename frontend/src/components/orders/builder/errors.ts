import { describeError, isApiError } from "@/lib/api-client";
import type { LineDraft } from "./model";

export type BuilderStep = 1 | 2 | 3;
export type MappedErrors = {
  step: BuilderStep;
  /** Messages for the FormErrorAlert of `step`. */
  form: string[];
  /** Messages per line key (shown on the line and in its configurator). */
  lines: Record<string, string[]>;
  fields: Partial<Record<"address" | "time" | "packaging", string>>;
};

const DATE_WORDS = /cut-?off|holiday|day of the week|delivery ?date|employee/i;

/**
 * Attaches server messages to what the user can fix: a line (by path
 * "lines.N…", dish id or quoted dish name), a delivery field, the date/employee
 * step, or else a form-level alert on the review step.
 */
export function mapOrderErrors(error: unknown, lines: LineDraft[]): MappedErrors {
  const messages = isApiError(error) ? error.messages : [describeError(error)];
  const result: MappedErrors = { step: 3, form: [], lines: {}, fields: {} };
  const steps = new Set<BuilderStep>();
  const addLine = (key: string, message: string) => {
    (result.lines[key] ??= []).push(message);
    steps.add(2);
  };

  for (const message of messages) {
    const path = /^lines\.(\d+)/.exec(message);
    const line =
      (path && lines[Number(path[1])]) ||
      lines.find((l) => message.includes(l.dishId) || message.includes(`'${l.dishName}'`));
    if (line) addLine(line.key, message);
    else if (/address/i.test(message)) {
      result.fields.address = message;
      steps.add(3);
    } else if (/delivery ?time|deliveryAt/i.test(message)) {
      result.fields.time = message;
      steps.add(3);
    } else if (/packaging/i.test(message)) {
      result.fields.packaging = message;
      steps.add(3);
    } else if (DATE_WORDS.test(message)) {
      result.form.push(message);
      steps.add(1);
    } else {
      result.form.push(message);
      steps.add(3);
    }
  }
  result.step = (Math.min(...steps) as BuilderStep) || 3;
  return result;
}
