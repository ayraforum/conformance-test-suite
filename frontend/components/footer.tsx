import Link from "next/link";

const Footer = () => {
  return (
    <footer className="bg-white border-t mt-20">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Documentation</h3>
            <ul className="space-y-2">
              <li>
                <Link href="http://localhost:5001/api-docs" className="text-gray-600 hover:text-gray-900">
                  API Reference
                </Link>
              </li>
              <li>
                <Link href="/docs/guides" className="text-gray-600 hover:text-gray-900">
                  User Guides
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Community</h3>
            <ul className="space-y-2">
              <li>
                <a href="https://github.com/GANfoundation/conformance-test-suite"
                   target="_blank"
                   rel="noopener noreferrer"
                   className="text-gray-600 hover:text-gray-900">
                  GitHub
                </a>
              </li>
              <li>
                <Link href="/contributing" className="text-gray-600 hover:text-gray-900">
                  Contributing
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Support</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/support" className="text-gray-600 hover:text-gray-900">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-600 hover:text-gray-900">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Legal</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/privacy" className="text-gray-600 hover:text-gray-900">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-600 hover:text-gray-900">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t">
          <p className="text-center text-gray-600">
            © {new Date().getFullYear()} GAN Foundation. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
