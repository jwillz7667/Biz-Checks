/**
 * Wire types mirroring the API response envelopes. These intentionally do not
 * reuse the server's Zod schemas — bundling Prisma types in the browser is
 * undesirable. Whenever the API contract changes, update both sides.
 */

export type UserRole = 'OWNER' | 'ADMIN' | 'DESIGNER' | 'PRINTER' | 'VIEWER';

export interface AuthSessionDTO {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    organizations: { id: string; name: string; role: UserRole }[];
  };
}

export interface MeDTO {
  id: string;
  email: string;
  memberships: { organizationId: string; role: UserRole }[];
}

export type BankAccountStatus = 'ACTIVE' | 'INACTIVE' | 'CLOSED';

export interface BankAccountDTO {
  id: string;
  nickname: string;
  bankName: string;
  bankAddress: string | null;
  routingNumber: string;
  accountNumberLast4: string;
  payerName: string;
  payerAddress: string | null;
  payerPhone: string | null;
  nextCheckNumber: number;
  status: BankAccountStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBankAccountInput {
  nickname: string;
  bankName: string;
  bankAddress?: string;
  routingNumber: string;
  accountNumber: string;
  auxOnUs?: string;
  payerName: string;
  payerAddress?: string;
  payerPhone?: string;
  nextCheckNumber?: number;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Geometry primitives — units are PostScript points (1/72 in)                */
/* ────────────────────────────────────────────────────────────────────────── */

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Margins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type PaperSize = 'Letter' | 'Legal' | 'A4';

export type CheckStockType =
  | 'top-check'
  | 'middle-check'
  | 'bottom-check'
  | 'three-per-page'
  | 'three-per-page-with-stub'
  | 'wallet'
  | 'voucher'
  | 'custom';

export interface CheckStock {
  type: CheckStockType;
  paperSize: PaperSize;
  rows: number;
  columns: number;
  margins: Margins;
  spacing: { horizontal: number; vertical: number };
  checkSize: Size;
  perforationBottom: number;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Canvas objects                                                             */
/* ────────────────────────────────────────────────────────────────────────── */

export type TextJustification = 'left' | 'center' | 'right';
export type FontWeight = 'regular' | 'medium' | 'semibold' | 'bold';
export type MICRFontVariant = 'e13b' | 'cmc7';
export type SecurityFont = 'none' | 'amount-protect' | 'condensed-amount';
export type SignatureFont = 'caveat' | 'sacramento' | 'great-vibes';
export type ShapeKind = 'line' | 'rectangle' | 'ellipse';

export type ValueExpression =
  | { kind: 'literal'; text: string }
  | { kind: 'formula'; formula: string }
  | { kind: 'label-field'; field: string }
  | { kind: 'data-source'; column: string };

interface BaseCanvasObject {
  id: string;
  name: string;
  position: Position;
  size: Size;
  rotation: number;
  locked: boolean;
  visible: boolean;
  zIndex: number;
}

export interface TextObject extends BaseCanvasObject {
  kind: 'text';
  value: ValueExpression;
  fontFamily: string;
  fontSize: number;
  fontWeight: FontWeight;
  italic: boolean;
  underline: boolean;
  color: string;
  justification: TextJustification;
  lineHeight: number;
  letterSpacing: number;
}

export interface MICRObject extends BaseCanvasObject {
  kind: 'micr';
  value: ValueExpression;
  fontVariant: MICRFontVariant;
  fontSize: number;
  color: string;
  justification: TextJustification;
}

export interface SignatureObject extends BaseCanvasObject {
  kind: 'signature';
  signatureImageId?: string;
  fitMode: 'contain' | 'cover' | 'stretch';
  signerName?: string;
  fontFamily: SignatureFont;
  fontSize: number;
  color: string;
}

export interface ImageObject extends BaseCanvasObject {
  kind: 'image';
  url: string;
  fitMode: 'contain' | 'cover' | 'stretch';
}

export interface ShapeObject extends BaseCanvasObject {
  kind: 'shape';
  shape: ShapeKind;
  strokeColor: string;
  strokeWidth: number;
  fillColor?: string;
  cornerRadius: number;
}

export interface AmountBoxObject extends BaseCanvasObject {
  kind: 'amount-box';
  value: ValueExpression;
  fontFamily: string;
  fontSize: number;
  fontWeight: FontWeight;
  color: string;
  justification: TextJustification;
  securityFont: SecurityFont;
  showCurrencySymbol: boolean;
}

export type CanvasObject =
  | TextObject
  | MICRObject
  | SignatureObject
  | ImageObject
  | ShapeObject
  | AmountBoxObject;

export type CanvasObjectKind = CanvasObject['kind'];

/* ────────────────────────────────────────────────────────────────────────── */
/* Templates                                                                  */
/* ────────────────────────────────────────────────────────────────────────── */

export type LabelField =
  | { name: string; kind: 'constant'; value: string }
  | { name: string; kind: 'incrementing'; next: number; step: number; pad: number };

export type SecurityPattern =
  | { kind: 'none' }
  | {
      kind: 'guilloche';
      color: string;
      lineWidth: number;
      complexity: number;
      density: number;
      curves: number;
      amplitude: number;
      opacity: number;
    };

export interface TemplateDocument {
  stock: CheckStock;
  objects: CanvasObject[];
  labelFields: LabelField[];
  background: string;
  securityPattern: SecurityPattern;
}

export interface TemplateDTO {
  id: string;
  organizationId: string;
  bankAccountId: string | null;
  name: string;
  description: string | null;
  version: number;
  isPublished: boolean;
  archivedAt: string | null;
  document: TemplateDocument;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateInput {
  name: string;
  description?: string;
  bankAccountId?: string;
  document: TemplateDocument;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  bankAccountId?: string | null;
  document?: TemplateDocument;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Checks                                                                     */
/* ────────────────────────────────────────────────────────────────────────── */

export type CheckStatus = 'DRAFT' | 'QUEUED' | 'RENDERED' | 'PRINTED' | 'VOIDED' | 'REISSUED';

export type Currency = 'USD' | 'CAD' | 'GBP' | 'EUR' | 'AUD';

export interface CheckDTO {
  id: string;
  organizationId: string;
  bankAccountId: string;
  templateId: string;
  batchId: string | null;
  serialNumber: number;
  payeeName: string;
  amountMinor: string;
  currency: string;
  memo: string | null;
  issueDate: string;
  status: CheckStatus;
  pdfChecksum: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCheckInput {
  bankAccountId: string;
  templateId: string;
  payeeName: string;
  amountMinor: number;
  currency?: Currency;
  memo?: string;
  issueDate: string;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Batches                                                                    */
/* ────────────────────────────────────────────────────────────────────────── */

export type CheckBatchStatus = 'DRAFT' | 'RENDERING' | 'RENDERED' | 'PRINTED' | 'FAILED';

export interface CheckBatchDTO {
  id: string;
  organizationId: string;
  bankAccountId: string;
  templateId: string;
  name: string;
  count: number;
  status: CheckBatchStatus;
  totalAmountMinor: string;
  currency: string;
  pdfStorageKey: string | null;
  pdfChecksum: string | null;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CheckBatchRowInput {
  payeeName: string;
  amountMinor: number;
  memo?: string;
  issueDate?: string;
  dataRowIndex?: number;
  labelFieldOverrides?: Record<string, string>;
}

export interface CreateCheckBatchInput {
  bankAccountId: string;
  templateId: string;
  name: string;
  currency?: Currency;
  issueDate: string;
  dataSourceId?: string;
  rows: CheckBatchRowInput[];
  voidWatermark?: boolean;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Data sources                                                               */
/* ────────────────────────────────────────────────────────────────────────── */

export type DataSourceKind = 'EMBEDDED' | 'CSV' | 'EXCEL';

export type DataSourceColumnType = 'string' | 'number' | 'date' | 'currency';

export interface DataSourceColumn {
  name: string;
  type: DataSourceColumnType;
}

export type DataSourceRow = Record<string, string | number | null>;

export interface DataSourceDTO {
  id: string;
  name: string;
  kind: DataSourceKind;
  columns: DataSourceColumn[];
  rows?: DataSourceRow[];
  rowCount?: number;
  sourceFilename: string | null;
  rowHash: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDataSourceInput {
  name: string;
  kind: DataSourceKind;
  columns: DataSourceColumn[];
  rows: DataSourceRow[];
  sourceFilename?: string;
}

export interface ImportCSVInput {
  name: string;
  text: string;
  sourceFilename?: string;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Pagination envelope                                                        */
/* ────────────────────────────────────────────────────────────────────────── */

export interface PaginatedDTO<T> {
  items: T[];
  total: number;
}
