export const metadata = {
  title: "Appart 4B",
  description: "Gestion de l'appartement",
  manifest: "/manifest.json",
  themeColor: "#182521",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Appart 4B",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#EEF1EF" }}>
        {children}
      </body>
    </html>
  );
}
