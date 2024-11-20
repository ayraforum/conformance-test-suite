import Link from "next/link";

const Header = () => {
  return (
    <header className="fixed top-0 left-0 w-full bg-white shadow-md z-50">
      <div className="container mx-auto flex items-center justify-between p-4">
        <Link href="/" className="text-2xl font-bold text-indigo-600">
          MyApp
        </Link>
        <nav className="space-x-4">
          <Link href="/" className="text-gray-800 hover:text-indigo-600">
            Home
          </Link>
          <Link href="/about" className="text-gray-800 hover:text-indigo-600">
            About
          </Link>
          <Link href="/contact" className="text-gray-800 hover:text-indigo-600">
            Contact
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;
