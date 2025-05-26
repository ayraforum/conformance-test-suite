import React from 'react';
import { Link } from 'react-router-dom';
import { UserIcon, ShieldCheckIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

const HomePage: React.FC = () => {
  const flows = [
    {
      title: 'Holder Verification',
      description: 'Verify digital credentials as a credential holder',
      icon: UserIcon,
      path: '/holder',
      color: 'bg-blue-500 hover:bg-blue-600'
    },
    {
      title: 'Verifier Verification', 
      description: 'Verify and validate credentials as a verifier',
      icon: ShieldCheckIcon,
      path: '/verifier',
      color: 'bg-green-500 hover:bg-green-600'
    },
    {
      title: 'TRQP Verification',
      description: 'Trust Registry Query Protocol verification',
      icon: ClipboardDocumentListIcon,
      path: '/trqp',
      color: 'bg-purple-500 hover:bg-purple-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
            Credential Testing Suite
          </h1>
          <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
            Comprehensive testing platform for verifiable credential workflows
          </p>
        </div>

        <div className="mt-16">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {flows.map((flow) => (
              <Link
                key={flow.path}
                to={flow.path}
                className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500 rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
              >
                <div>
                  <span className={`rounded-lg inline-flex p-3 ${flow.color} text-white ring-4 ring-white`}>
                    <flow.icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-8">
                  <h3 className="text-lg font-medium text-gray-900 group-hover:text-indigo-600">
                    {flow.title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {flow.description}
                  </p>
                </div>
                <span
                  className="absolute top-6 right-6 text-gray-300 group-hover:text-gray-400"
                  aria-hidden="true"
                >
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
