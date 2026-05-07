/**
 * Inline structured data. Use one component per JSON-LD object so search engines
 * can pick up Organization, SoftwareApplication, FAQPage, etc. independently.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }): React.JSX.Element {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify is safe here — no user-controlled values; data is a
      // statically-typed object built at module scope.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
