import type { CheckTemplate, LabelField } from '@biz-checks/domain';

/**
 * Apply increment to incrementing label fields, returning the new template
 * and the snapshot of values used for this batch (for audit reproducibility).
 *
 * For example, given a SerialNumber field with `next=1001` and step=1, after
 * a batch of 5 checks the field will have `next=1006` and the snapshot will
 * map check 1..5 to "1001".."1005".
 */
export function advanceLabelFields(
  template: CheckTemplate,
  count: number,
): { template: CheckTemplate; snapshot: readonly Readonly<Record<string, string>>[] } {
  const snapshot: Record<string, string>[] = [];
  for (let i = 0; i < count; i += 1) snapshot.push({});

  const newFields: LabelField[] = [];
  for (const field of template.labelFields) {
    if (field.kind === 'constant') {
      for (let i = 0; i < count; i += 1) {
        const slot = snapshot[i];
        if (slot) slot[field.name] = field.value;
      }
      newFields.push(field);
      continue;
    }

    let n = field.next;
    for (let i = 0; i < count; i += 1) {
      const slot = snapshot[i];
      if (slot) slot[field.name] = field.pad > 0 ? String(n).padStart(field.pad, '0') : String(n);
      n += field.step;
    }
    newFields.push({ ...field, next: n });
  }

  return {
    template: { ...template, labelFields: newFields },
    snapshot,
  };
}

/**
 * Capture a frozen, JSON-serializable snapshot of the template's current
 * state. Used to record exactly what was rendered for an audit log.
 */
export function freezeTemplate(template: CheckTemplate): CheckTemplate {
  return JSON.parse(JSON.stringify(template)) as CheckTemplate;
}
