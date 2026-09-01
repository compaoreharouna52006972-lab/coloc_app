export const metadata = {
  title: "Appart 4B",
  description: "Gestion de l'appartement",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#EEF1EF" }}>
        {children}
      </body>
    </html>
  );
}
