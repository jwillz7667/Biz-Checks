// Ambient declarations for non-code side-effect imports. Without this,
// `import './globals.css'` fails Vercel's stricter TS pass (which enables
// noUncheckedSideEffectImports during `next build`) even though local
// `tsc --noEmit` is permissive.
declare module '*.css';
