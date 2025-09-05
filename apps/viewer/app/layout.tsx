import './globals.css';

export const metadata = { title: "Temporal Glyph Operator" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"><body style={{margin:0,fontFamily:"ui-sans-serif"}}>{children}</body></html>
  );
}
