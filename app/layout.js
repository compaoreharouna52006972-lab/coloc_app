export const metadata = {
  title: "Appart 4B",
  description: "Gestion de l'appartement",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Appart 4B",
  },
};

// Dans Next 14, themeColor ne va plus dans `metadata` mais dans `viewport`.
export const viewport = {
  themeColor: "#182521",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </head>
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#EEF1EF" }}>
        {children}
      </body>
    </html>
  );
}
