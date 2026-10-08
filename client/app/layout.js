import './globals.css';

export const metadata = {
  title: 'StudyFlow AI',
  description: 'An exam study planner whose plan adapts, honestly, when you fall behind.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
