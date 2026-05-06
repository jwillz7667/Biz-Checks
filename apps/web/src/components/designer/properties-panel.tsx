'use client';

import type {
  AmountBoxObject,
  CanvasObject,
  ImageObject,
  MICRObject,
  ShapeObject,
  TextObject,
  ValueExpression,
} from '@/lib/api/types';

import { useDesignerStore } from '@/lib/designer/store';


const POINTS_PER_INCH = 72;

export function PropertiesPanel(): React.JSX.Element {
  const document = useDesignerStore((s) => s.document);
  const selectedId = useDesignerStore((s) => s.selectedId);
  const updateObject = useDesignerStore((s) => s.updateObject);
  const setBackground = useDesignerStore((s) => s.setBackground);

  if (!document) return <div className="p-4 text-sm text-gray-500">Loading…</div>;

  const selected = document.objects.find((o) => o.id === selectedId);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-gray-200 px-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          Properties
        </span>
      </div>
      <div className="flex-1 overflow-y-auto thin-scroll p-3">
        {selected ? (
          <ObjectProperties
            object={selected}
            onChange={(patch) =>
              updateObject(selected.id, (prev) => ({ ...prev, ...patch }) as CanvasObject)
            }
          />
        ) : (
          <DocumentProperties background={document.background} setBackground={setBackground} />
        )}
      </div>
    </div>
  );
}

function DocumentProperties({
  background,
  setBackground,
}: {
  background: string;
  setBackground: (color: string) => void;
}): React.JSX.Element {
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        Select a layer to edit its properties. Or adjust the canvas defaults below.
      </p>
      <PropField label="Background color">
        <ColorInput value={background} onChange={setBackground} />
      </PropField>
    </div>
  );
}

function ObjectProperties({
  object,
  onChange,
}: {
  object: CanvasObject;
  onChange: (patch: Partial<CanvasObject>) => void;
}): React.JSX.Element {
  return (
    <div className="space-y-5">
      <Section title="General">
        <PropField label="Name">
          <input
            type="text"
            value={object.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className={inputCls}
          />
        </PropField>
        <Row>
          <PropField label="X (in)" mini>
            <NumberInput
              value={object.position.x / POINTS_PER_INCH}
              onChange={(v) =>
                onChange({
                  position: { x: v * POINTS_PER_INCH, y: object.position.y },
                })
              }
              step={0.05}
            />
          </PropField>
          <PropField label="Y (in)" mini>
            <NumberInput
              value={object.position.y / POINTS_PER_INCH}
              onChange={(v) =>
                onChange({
                  position: { x: object.position.x, y: v * POINTS_PER_INCH },
                })
              }
              step={0.05}
            />
          </PropField>
        </Row>
        <Row>
          <PropField label="W (in)" mini>
            <NumberInput
              value={object.size.width / POINTS_PER_INCH}
              onChange={(v) =>
                onChange({
                  size: { width: Math.max(0.05, v) * POINTS_PER_INCH, height: object.size.height },
                })
              }
              step={0.05}
            />
          </PropField>
          <PropField label="H (in)" mini>
            <NumberInput
              value={object.size.height / POINTS_PER_INCH}
              onChange={(v) =>
                onChange({
                  size: { width: object.size.width, height: Math.max(0.05, v) * POINTS_PER_INCH },
                })
              }
              step={0.05}
            />
          </PropField>
        </Row>
        <PropField label="Rotation (deg)">
          <NumberInput
            value={object.rotation}
            onChange={(v) => onChange({ rotation: v })}
            step={1}
          />
        </PropField>
        <Row>
          <CheckboxField
            label="Visible"
            checked={object.visible}
            onChange={(v) => onChange({ visible: v })}
          />
          <CheckboxField
            label="Locked"
            checked={object.locked}
            onChange={(v) => onChange({ locked: v })}
          />
        </Row>
      </Section>

      {object.kind === 'text' ? <TextProps object={object} onChange={onChange} /> : null}
      {object.kind === 'micr' ? <MicrProps object={object} onChange={onChange} /> : null}
      {object.kind === 'amount-box' ? <AmountProps object={object} onChange={onChange} /> : null}
      {object.kind === 'shape' ? <ShapeProps object={object} onChange={onChange} /> : null}
      {object.kind === 'image' ? <ImageProps object={object} onChange={onChange} /> : null}
    </div>
  );
}

/* ─────────────────────────  Per-kind property groups  ───────────────────── */

function TextProps({
  object,
  onChange,
}: {
  object: TextObject;
  onChange: (patch: Partial<CanvasObject>) => void;
}): React.JSX.Element {
  return (
    <>
      <Section title="Value">
        <ValueEditor value={object.value} onChange={(v) => onChange({ value: v })} />
      </Section>
      <Section title="Typography">
        <PropField label="Font family">
          <input
            type="text"
            value={object.fontFamily}
            onChange={(e) => onChange({ fontFamily: e.target.value })}
            className={inputCls}
          />
        </PropField>
        <Row>
          <PropField label="Size (pt)" mini>
            <NumberInput
              value={object.fontSize}
              onChange={(v) => onChange({ fontSize: v })}
              step={0.5}
            />
          </PropField>
          <PropField label="Weight" mini>
            <select
              value={object.fontWeight}
              onChange={(e) =>
                onChange({ fontWeight: e.target.value as TextObject['fontWeight'] })
              }
              className={selectCls}
            >
              <option value="regular">Regular</option>
              <option value="medium">Medium</option>
              <option value="semibold">Semibold</option>
              <option value="bold">Bold</option>
            </select>
          </PropField>
        </Row>
        <Row>
          <PropField label="Justify" mini>
            <select
              value={object.justification}
              onChange={(e) =>
                onChange({
                  justification: e.target.value as TextObject['justification'],
                })
              }
              className={selectCls}
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </PropField>
          <PropField label="Color" mini>
            <ColorInput
              value={object.color}
              onChange={(c) => onChange({ color: c })}
            />
          </PropField>
        </Row>
        <Row>
          <PropField label="Line height" mini>
            <NumberInput
              value={object.lineHeight}
              onChange={(v) => onChange({ lineHeight: v })}
              step={0.05}
            />
          </PropField>
          <PropField label="Letter sp." mini>
            <NumberInput
              value={object.letterSpacing}
              onChange={(v) => onChange({ letterSpacing: v })}
              step={0.5}
            />
          </PropField>
        </Row>
        <Row>
          <CheckboxField
            label="Italic"
            checked={object.italic}
            onChange={(v) => onChange({ italic: v })}
          />
          <CheckboxField
            label="Underline"
            checked={object.underline}
            onChange={(v) => onChange({ underline: v })}
          />
        </Row>
      </Section>
    </>
  );
}

function MicrProps({
  object,
  onChange,
}: {
  object: MICRObject;
  onChange: (patch: Partial<CanvasObject>) => void;
}): React.JSX.Element {
  return (
    <>
      <Section title="MICR Value">
        <ValueEditor value={object.value} onChange={(v) => onChange({ value: v })} />
        <p className="text-[11px] text-gray-500">
          MICR is rendered with the embedded E-13B font in the PDF. The on-screen preview uses a
          fallback font and may not match the exact glyphs.
        </p>
      </Section>
      <Section title="Style">
        <Row>
          <PropField label="Variant" mini>
            <select
              value={object.fontVariant}
              onChange={(e) =>
                onChange({
                  fontVariant: e.target.value as MICRObject['fontVariant'],
                })
              }
              className={selectCls}
            >
              <option value="e13b">E-13B (US)</option>
              <option value="cmc7">CMC-7 (EU)</option>
            </select>
          </PropField>
          <PropField label="Size (pt)" mini>
            <NumberInput
              value={object.fontSize}
              onChange={(v) => onChange({ fontSize: v })}
              step={0.5}
            />
          </PropField>
        </Row>
        <Row>
          <PropField label="Justify" mini>
            <select
              value={object.justification}
              onChange={(e) =>
                onChange({
                  justification: e.target.value as MICRObject['justification'],
                })
              }
              className={selectCls}
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </PropField>
          <PropField label="Color" mini>
            <ColorInput
              value={object.color}
              onChange={(c) => onChange({ color: c })}
            />
          </PropField>
        </Row>
      </Section>
    </>
  );
}

function AmountProps({
  object,
  onChange,
}: {
  object: AmountBoxObject;
  onChange: (patch: Partial<CanvasObject>) => void;
}): React.JSX.Element {
  return (
    <>
      <Section title="Amount value">
        <ValueEditor value={object.value} onChange={(v) => onChange({ value: v })} />
      </Section>
      <Section title="Style">
        <PropField label="Font family">
          <input
            type="text"
            value={object.fontFamily}
            onChange={(e) => onChange({ fontFamily: e.target.value })}
            className={inputCls}
          />
        </PropField>
        <Row>
          <PropField label="Size (pt)" mini>
            <NumberInput
              value={object.fontSize}
              onChange={(v) => onChange({ fontSize: v })}
              step={0.5}
            />
          </PropField>
          <PropField label="Weight" mini>
            <select
              value={object.fontWeight}
              onChange={(e) =>
                onChange({
                  fontWeight: e.target.value as AmountBoxObject['fontWeight'],
                })
              }
              className={selectCls}
            >
              <option value="regular">Regular</option>
              <option value="medium">Medium</option>
              <option value="semibold">Semibold</option>
              <option value="bold">Bold</option>
            </select>
          </PropField>
        </Row>
        <Row>
          <PropField label="Justify" mini>
            <select
              value={object.justification}
              onChange={(e) =>
                onChange({
                  justification: e.target.value as AmountBoxObject['justification'],
                })
              }
              className={selectCls}
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </PropField>
          <PropField label="Color" mini>
            <ColorInput
              value={object.color}
              onChange={(c) => onChange({ color: c })}
            />
          </PropField>
        </Row>
        <PropField label="Security font">
          <select
            value={object.securityFont}
            onChange={(e) =>
              onChange({
                securityFont: e.target.value as AmountBoxObject['securityFont'],
              })
            }
            className={selectCls}
          >
            <option value="none">None</option>
            <option value="amount-protect">AmountProtect</option>
            <option value="condensed-amount">Condensed</option>
          </select>
        </PropField>
        <CheckboxField
          label="Show currency symbol"
          checked={object.showCurrencySymbol}
          onChange={(v) => onChange({ showCurrencySymbol: v })}
        />
      </Section>
    </>
  );
}

function ShapeProps({
  object,
  onChange,
}: {
  object: ShapeObject;
  onChange: (patch: Partial<CanvasObject>) => void;
}): React.JSX.Element {
  return (
    <Section title="Shape">
      <PropField label="Shape">
        <select
          value={object.shape}
          onChange={(e) =>
            onChange({ shape: e.target.value as ShapeObject['shape'] })
          }
          className={selectCls}
        >
          <option value="line">Line</option>
          <option value="rectangle">Rectangle</option>
          <option value="ellipse">Ellipse</option>
        </select>
      </PropField>
      <Row>
        <PropField label="Stroke" mini>
          <ColorInput
            value={object.strokeColor}
            onChange={(c) => onChange({ strokeColor: c })}
          />
        </PropField>
        <PropField label="Width" mini>
          <NumberInput
            value={object.strokeWidth}
            onChange={(v) => onChange({ strokeWidth: v })}
            step={0.5}
          />
        </PropField>
      </Row>
      <Row>
        <PropField label="Fill" mini>
          <ColorInput
            value={object.fillColor ?? '#ffffff'}
            onChange={(c) => onChange({ fillColor: c })}
          />
        </PropField>
        <PropField label="Radius" mini>
          <NumberInput
            value={object.cornerRadius}
            onChange={(v) => onChange({ cornerRadius: v })}
            step={1}
          />
        </PropField>
      </Row>
    </Section>
  );
}

function ImageProps({
  object,
  onChange,
}: {
  object: ImageObject;
  onChange: (patch: Partial<CanvasObject>) => void;
}): React.JSX.Element {
  return (
    <Section title="Image">
      <PropField label="URL">
        <input
          type="text"
          value={object.url}
          onChange={(e) => onChange({ url: e.target.value })}
          className={inputCls}
        />
      </PropField>
      <PropField label="Fit">
        <select
          value={object.fitMode}
          onChange={(e) =>
            onChange({ fitMode: e.target.value as ImageObject['fitMode'] })
          }
          className={selectCls}
        >
          <option value="contain">Contain</option>
          <option value="cover">Cover</option>
          <option value="stretch">Stretch</option>
        </select>
      </PropField>
    </Section>
  );
}

/* ───────────────────────────  Value editor  ─────────────────────────────── */

function ValueEditor({
  value,
  onChange,
}: {
  value: ValueExpression;
  onChange: (v: ValueExpression) => void;
}): React.JSX.Element {
  return (
    <div className="space-y-2">
      <select
        value={value.kind}
        onChange={(e) => {
          const next = e.target.value as ValueExpression['kind'];
          if (next === value.kind) return;
          if (next === 'literal') onChange({ kind: 'literal', text: '' });
          else if (next === 'formula') onChange({ kind: 'formula', formula: 'L#("Field")' });
          else if (next === 'label-field') onChange({ kind: 'label-field', field: 'Field' });
          else onChange({ kind: 'data-source', column: 'Column' });
        }}
        className={selectCls}
      >
        <option value="literal">Literal text</option>
        <option value="label-field">Label field (L#)</option>
        <option value="formula">Formula (ƒ)</option>
        <option value="data-source">Data source column</option>
      </select>
      {value.kind === 'literal' ? (
        <textarea
          value={value.text}
          onChange={(e) => onChange({ kind: 'literal', text: e.target.value })}
          className={`${inputCls} min-h-[64px]`}
          placeholder="Static text"
        />
      ) : null}
      {value.kind === 'label-field' ? (
        <input
          type="text"
          value={value.field}
          onChange={(e) => onChange({ kind: 'label-field', field: e.target.value })}
          className={inputCls}
          placeholder="Field name"
        />
      ) : null}
      {value.kind === 'formula' ? (
        <textarea
          value={value.formula}
          onChange={(e) => onChange({ kind: 'formula', formula: e.target.value })}
          className={`${inputCls} font-mono min-h-[64px]`}
          placeholder='e.g. L#("SerialNumber") or Date()'
        />
      ) : null}
      {value.kind === 'data-source' ? (
        <input
          type="text"
          value={value.column}
          onChange={(e) => onChange({ kind: 'data-source', column: e.target.value })}
          className={inputCls}
          placeholder="Column name"
        />
      ) : null}
    </div>
  );
}

/* ────────────────────────────  Primitives  ──────────────────────────────── */

const inputCls =
  'w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30';

const selectCls = `${inputCls} pr-7`;

function Section({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="space-y-2 rounded-md border border-gray-200 bg-gray-50/50 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <div className="grid grid-cols-2 gap-2">{children}</div>;
}

function PropField({
  label,
  mini,
  children,
}: {
  label: string;
  mini?: boolean;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="space-y-1">
      <label className={`block ${mini ? 'text-[10px]' : 'text-xs'} font-medium text-gray-600`}>
        {label}
      </label>
      {children}
    </div>
  );
}

function NumberInput({
  value,
  onChange,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
}): React.JSX.Element {
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      step={step}
      onChange={(e) => {
        const n = Number(e.target.value);
        if (Number.isFinite(n)) onChange(n);
      }}
      className={`${inputCls} font-mono tabular-nums`}
    />
  );
}

function ColorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-1">
      <input
        type="color"
        value={value.length === 7 ? value : '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-9 cursor-pointer rounded border border-gray-300 bg-white p-0"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputCls} font-mono`}
      />
    </div>
  );
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}): React.JSX.Element {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-3.5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
      />
      <span>{label}</span>
    </label>
  );
}
