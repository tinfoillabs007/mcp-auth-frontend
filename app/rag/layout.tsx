/**
 * @description
 * Layout component specifically for the /rag section of the application.
 * Provides consistent structure and padding for RAG-related pages.
 *
 * @notes
 * - Wraps all pages under the /rag route segment.
 * - Can be customized with section-specific headers, footers, or navigation.
 */

import React from 'react';

interface RagLayoutProps {
  children: React.ReactNode;
}

export default function RagLayout({ children }: RagLayoutProps) {
  return (
    // Add padding or other layout styles common to the RAG section
    <main className="flex-1 p-4 md:p-6 lg:p-8">
      {children}
    </main>
  );
}
