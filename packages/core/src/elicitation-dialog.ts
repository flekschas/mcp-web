import type { ElicitationRequest, ElicitationResult } from '@mcp-web/types';
import { CHOICE_FIELD } from './elicitation.js';

/** The keywords of a requested field that the dialog reads. */
interface Field {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'array';
  title?: string;
  description?: string;
  enum?: string[];
  items?: { enum?: string[] };
  format?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
  default?: unknown;
}

let dialogCount = 0;

const INPUT_TYPES: Record<string, string> = {
  email: 'email',
  uri: 'url',
  date: 'date',
  'date-time': 'datetime-local',
};

/**
 * Asks the user in a native `<dialog>`: Escape or closing the dialog cancels,
 * "No" or "Decline" declines, and submitting the form accepts. Aborting
 * `signal` closes the dialog.
 */
export function askInDialog(
  request: ElicitationRequest,
  signal?: AbortSignal,
): Promise<ElicitationResult> {
  const doc = globalThis.document;
  const fields = request.requestedSchema.properties as Record<string, Field>;
  const required = new Set(request.requestedSchema.required ?? []);
  const names = Object.keys(fields);
  const isConfirmation = names.length === 0;

  const dialog = doc.createElement('dialog');
  dialog.className = 'mcp-web-elicitation';
  const form = doc.createElement('form');
  form.method = 'dialog';
  form.style.cssText = 'display: grid; gap: 0.75rem; min-width: 16rem;';

  const message = doc.createElement('p');
  message.id = `mcp-web-elicitation-${++dialogCount}`;
  message.textContent = request.message;
  message.style.margin = '0';
  form.append(message);
  dialog.setAttribute('aria-labelledby', message.id);

  names.forEach((name, i) => {
    // The message is the label of a single choice.
    const labelId = names.length === 1 && name === CHOICE_FIELD && message.id;
    form.append(
      createField(doc, controlName(i), name, fields[name], required.has(name), {
        labelId: labelId || undefined,
      }),
    );
  });

  // The accept button comes first so that Enter in a field accepts.
  const buttons = doc.createElement('div');
  buttons.style.cssText =
    'display: flex; flex-direction: row-reverse; justify-content: flex-start; gap: 0.5rem;';
  const accept = doc.createElement('button');
  accept.value = 'accept';
  accept.textContent = isConfirmation ? 'Yes' : 'OK';
  const decline = doc.createElement('button');
  decline.value = 'decline';
  decline.formNoValidate = true;
  decline.textContent = isConfirmation ? 'No' : 'Decline';
  buttons.append(accept, decline);
  form.append(buttons);
  dialog.append(form);

  return new Promise((resolve) => {
    let answered = false;
    const finish = (result: ElicitationResult) => {
      if (answered) return;
      answered = true;
      signal?.removeEventListener('abort', cancel);
      dialog.close();
      dialog.remove();
      resolve(result);
    };
    const cancel = () => finish({ action: 'cancel' });
    signal?.addEventListener('abort', cancel);

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const submitter = (event as SubmitEvent)
        .submitter as HTMLButtonElement | null;
      if (submitter?.value === 'decline') {
        finish({ action: 'decline' });
      } else {
        finish({
          action: 'accept',
          content: readContent(form, fields, required),
        });
      }
    });
    dialog.addEventListener('close', cancel);

    doc.body.append(dialog);
    dialog.showModal();
  });
}

/**
 * Form controls get generated names, since a control named like a property of
 * the form, such as `append`, would hide that property.
 */
const controlName = (index: number) => `field-${index}`;

/**
 * @param control - The name of the field's form control
 * @param name - The name of the field in the schema
 * @param labelId - The ID of an element that labels the field, in place of
 * its title or name
 */
function createField(
  doc: Document,
  control: string,
  name: string,
  field: Field,
  required: boolean,
  { labelId }: { labelId?: string } = {},
): HTMLElement {
  const label = field.title ?? name;
  const options = field.type === 'array' ? field.items?.enum : field.enum;

  // A multi-select is a group of checkboxes.
  if (field.type === 'array') {
    const fieldset = doc.createElement('fieldset');
    const legend = doc.createElement('legend');
    legend.textContent = label;
    fieldset.append(legend);
    const selected = Array.isArray(field.default) ? field.default : [];
    const checkboxes = (options ?? []).map((option) => {
      const checkbox = doc.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.name = control;
      checkbox.value = option;
      checkbox.checked = selected.includes(option);
      fieldset.append(wrapInLabel(doc, option, checkbox));
      return checkbox;
    });
    // Checkboxes have no native count limits, so the first one reports them.
    // An optional group may stay empty.
    const checkCount = () => {
      const count = checkboxes.filter((checkbox) => checkbox.checked).length;
      const { minItems = 0, maxItems = Infinity } = field;
      checkboxes[0]?.setCustomValidity(
        count < minItems && (required || count > 0)
          ? `Select at least ${minItems}.`
          : count > maxItems
            ? `Select at most ${maxItems}.`
            : '',
      );
    };
    fieldset.addEventListener('change', checkCount);
    checkCount();
    appendDescription(doc, fieldset, field);
    return fieldset;
  }

  let input: HTMLInputElement | HTMLSelectElement;
  if (options) {
    const select = doc.createElement('select');
    if (!required || field.default === undefined) {
      select.append(new Option('', ''));
    }
    for (const option of options) {
      select.append(new Option(option, option));
    }
    select.value = typeof field.default === 'string' ? field.default : '';
    input = select;
  } else {
    const element = doc.createElement('input');
    if (field.type === 'boolean') {
      element.type = 'checkbox';
      element.checked = field.default === true;
    } else if (field.type === 'number' || field.type === 'integer') {
      element.type = 'number';
      element.step = field.type === 'integer' ? '1' : 'any';
      if (field.minimum !== undefined) element.min = String(field.minimum);
      if (field.maximum !== undefined) element.max = String(field.maximum);
    } else {
      element.type = INPUT_TYPES[field.format ?? ''] ?? 'text';
      if (field.minLength !== undefined) element.minLength = field.minLength;
      if (field.maxLength !== undefined) element.maxLength = field.maxLength;
    }
    if (field.format === 'date-time' && typeof field.default === 'string') {
      const value = toLocalDateTime(field.default);
      // The input shows minutes unless the default has seconds, since the
      // default step of a minute would reject them.
      if (value.endsWith(':00.000')) {
        element.value = value.slice(0, 16);
      } else {
        element.step = 'any';
        element.value = value;
      }
    } else if (field.type !== 'boolean' && field.default !== undefined) {
      element.value = String(field.default);
    }
    input = element;
  }
  input.name = control;
  // An unchecked checkbox is an answer too, so it is never required.
  input.required = required && field.type !== 'boolean';
  if (labelId) {
    input.setAttribute('aria-labelledby', labelId);
    return input;
  }

  const wrapper = wrapInLabel(doc, label, input);
  appendDescription(doc, wrapper, field);
  return wrapper;
}

/** Turns an ISO date-time into the local time a `datetime-local` input shows. */
function toLocalDateTime(isoDateTime: string): string {
  const date = new Date(isoDateTime);
  if (Number.isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 23);
}

function wrapInLabel(doc: Document, text: string, control: HTMLElement) {
  const label = doc.createElement('label');
  label.style.cssText = 'display: flex; gap: 0.5rem; align-items: center;';
  label.append(text, control);
  return label;
}

function appendDescription(doc: Document, parent: HTMLElement, field: Field) {
  if (!field.description) return;
  const description = doc.createElement('small');
  description.textContent = field.description;
  parent.append(description);
}

function readContent(
  form: HTMLFormElement,
  fields: Record<string, Field>,
  required: Set<string>,
): NonNullable<ElicitationResult['content']> {
  const data = new FormData(form);
  const content: NonNullable<ElicitationResult['content']> = {};
  for (const [i, [name, field]] of Object.entries(fields).entries()) {
    const control = controlName(i);
    if (field.type === 'boolean') {
      content[name] = data.has(control);
      continue;
    }
    // An empty field is left out, so optional fields stay unset.
    if (field.type === 'array') {
      const selected = data.getAll(control).map(String);
      if (selected.length > 0 || required.has(name)) content[name] = selected;
      continue;
    }
    const value = String(data.get(control) ?? '');
    if (value === '') continue;
    if (field.type === 'number' || field.type === 'integer') {
      content[name] = Number(value);
    } else if (field.format === 'date-time') {
      // `datetime-local` has no time zone; the page's is the user's.
      content[name] = new Date(value).toISOString();
    } else {
      content[name] = value;
    }
  }
  return content;
}
