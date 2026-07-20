import './globals.css';

export const metadata = {
  title: 'GENESIS — Darwinian Code Evolution Engine',
  description: 'Watch software evolve through natural selection. GENESIS applies biological evolution to code — using AI as the mutation engine to breed, compete, and evolve optimal algorithms.',
  keywords: 'code evolution, genetic algorithm, AI, OpenAI, GPT, software evolution, algorithm optimization',
  openGraph: {
    title: 'GENESIS — Darwinian Code Evolution Engine',
    description: 'Watch code organisms compete and evolve in real-time. Powered by OpenAI gpt-4o-mini.',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="color-scheme" content="dark" />
        <meta name="theme-color" content="#06080d" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
