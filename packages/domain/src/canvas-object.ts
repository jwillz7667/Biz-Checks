import { z } from 'zod';

import { CanvasObjectIdSchema } from './ids.js';
import { PositionSchema, SizeSchema } from './units.js';

export const TextJustification = ['left', 'center', 'right'] as const;
export type TextJustification = (typeof TextJustification)[number];

export const FontWeight = ['regular', 'medium', 'semibold', 'bold'] as const;
export type FontWeight = (typeof FontWeight)[number];

export const MICRFontVariant = ['e13b', 'cmc7'] as const;
export type MICRFontVariant = (typeof MICRFontVariant)[number];

export const SecurityFont = ['none', 'amount-protect', 'condensed-amount'] as const;
export type SecurityFont = (typeof SecurityFont)[number];

export const SignatureFont = ['caveat', 'sacramento', 'great-vibes'] as const;
export type SignatureFont = (typeof SignatureFont)[number];

const Color = z
  .string()
  .regex(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, 'Color must be #RRGGBB or #RRGGBBAA');

export const ValueExpressionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('literal'), text: z.string().max(2048) }),
  z.object({ kind: z.literal('formula'), formula: z.string().max(4096) }),
  z.object({
    kind: z.literal('label-field'),
    field: z.string().min(1).max(128),
  }),
  z.object({
    kind: z.literal('data-source'),
    column: z.string().min(1).max(128),
  }),
]);
export type ValueExpression = z.infer<typeof ValueExpressionSchema>;

const BaseObject = z.object({
  id: CanvasObjectIdSchema,
  name: z.string().min(1).max(120),
  position: PositionSchema,
  size: SizeSchema,
  rotation: z.number().min(-360).max(360).default(0),
  locked: z.boolean().default(false),
  visible: z.boolean().default(true),
  zIndex: z.number().int().min(0).default(0),
});

export const TextObjectSchema = BaseObject.extend({
  kind: z.literal('text'),
  value: ValueExpressionSchema,
  fontFamily: z.string().min(1).max(120),
  fontSize: z.number().positive().max(200),
  fontWeight: z.enum(FontWeight).default('regular'),
  italic: z.boolean().default(false),
  underline: z.boolean().default(false),
  color: Color.default('#000000'),
  justification: z.enum(TextJustification).default('left'),
  lineHeight: z.number().positive().max(4).default(1.2),
  letterSpacing: z.number().min(-10).max(50).default(0),
});
export type TextObject = z.infer<typeof TextObjectSchema>;

export const MICRObjectSchema = BaseObject.extend({
  kind: z.literal('micr'),
  value: ValueExpressionSchema,
  fontVariant: z.enum(MICRFontVariant).default('e13b'),
  fontSize: z.number().positive().max(20).default(12),
  color: Color.default('#000000'),
  justification: z.enum(TextJustification).default('left'),
});
export type MICRObject = z.infer<typeof MICRObjectSchema>;

export const SignatureObjectSchema = BaseObject.extend({
  kind: z.literal('signature'),
  // Either render an uploaded signature image (image id is opaque to the
  // renderer; the image bytes are resolved by the print service from the
  // signature vault) or render the printed `signerName` in a script font.
  // If both are present, the image wins.
  signatureImageId: z.string().min(1).optional(),
  fitMode: z.enum(['contain', 'cover', 'stretch']).default('contain'),
  signerName: z.string().max(120).optional(),
  fontFamily: z.enum(SignatureFont).default('caveat'),
  fontSize: z.number().positive().max(200).default(28),
  color: Color.default('#1a1a2e'),
});
export type SignatureObject = z.infer<typeof SignatureObjectSchema>;

export const ImageObjectSchema = BaseObject.extend({
  kind: z.literal('image'),
  url: z.string().url(),
  fitMode: z.enum(['contain', 'cover', 'stretch']).default('contain'),
});
export type ImageObject = z.infer<typeof ImageObjectSchema>;

export const ShapeKind = ['line', 'rectangle', 'ellipse'] as const;
export const ShapeObjectSchema = BaseObject.extend({
  kind: z.literal('shape'),
  shape: z.enum(ShapeKind),
  strokeColor: Color.default('#000000'),
  strokeWidth: z.number().min(0).max(20).default(1),
  fillColor: Color.optional(),
  cornerRadius: z.number().min(0).max(200).default(0),
});
export type ShapeObject = z.infer<typeof ShapeObjectSchema>;

export const AmountBoxObjectSchema = BaseObject.extend({
  kind: z.literal('amount-box'),
  value: ValueExpressionSchema,
  fontFamily: z.string().min(1).max(120).default('Inter'),
  fontSize: z.number().positive().max(80).default(16),
  fontWeight: z.enum(FontWeight).default('bold'),
  color: Color.default('#000000'),
  justification: z.enum(TextJustification).default('right'),
  securityFont: z.enum(SecurityFont).default('amount-protect'),
  showCurrencySymbol: z.boolean().default(true),
});
export type AmountBoxObject = z.infer<typeof AmountBoxObjectSchema>;

export const CanvasObjectSchema = z.discriminatedUnion('kind', [
  TextObjectSchema,
  MICRObjectSchema,
  SignatureObjectSchema,
  ImageObjectSchema,
  ShapeObjectSchema,
  AmountBoxObjectSchema,
]);
export type CanvasObject = z.infer<typeof CanvasObjectSchema>;

export type CanvasObjectKind = CanvasObject['kind'];
