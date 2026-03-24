export default function Footer({ dark = false }: { dark?: boolean }) {
  return (
    <footer
      className={`py-4 text-center text-xs ${
        dark ? "text-gray-600" : "text-gray-400"
      }`}
    >
      Created by James Choi &copy; with the help of Claude. Brisbane, Australia.
    </footer>
  );
}
