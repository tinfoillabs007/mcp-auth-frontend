// Test script for the RAG system
// Run with: USER_ID=your-user-id node scripts/test-rag.js

// Import fetch for Node.js
import fetch from 'node-fetch';

async function testRag() {
  // You need to replace this with your actual user ID
  // Get it from localStorage.getItem('mcp_auth_state') and extract the supabaseUserId
  const userId = process.env.USER_ID;

  if (!userId) {
    console.error("Please set USER_ID environment variable to your Supabase User ID");
    console.log("You can get this from browser localStorage under 'mcp_auth_state'");
    process.exit(1);
  }

  console.log(`Testing RAG with user ID: ${userId}`);

  // Step 1: Create a source
  console.log("Creating test source...");
  const sourceResponse = await fetch('http://localhost:3000/api/rag/sources', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-ID': userId
    },
    body: JSON.stringify({
      sourceType: 'test',
      sourceIdentifier: 'test-document',
      metadata: {
        description: 'Test source for troubleshooting'
      }
    })
  });

  if (!sourceResponse.ok) {
    const errorData = await sourceResponse.json();
    console.error("Failed to create source:", errorData);
    process.exit(1);
  }

  const sourceData = await sourceResponse.json();
  console.log("Source created successfully:", sourceData);
  const sourceId = sourceData.id;

  // Step 2: Ingest a test document
  console.log("Ingesting test document...");
  const ingestResponse = await fetch('http://localhost:3000/api/rag/ingest', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-ID': userId
    },
    body: JSON.stringify({
      sourceId: sourceId,
      documentId: 'test-doc-' + Date.now(),
      content: 'This is a test document for the RAG system. It contains information about artificial intelligence and machine learning.',
      accountType: 'manual',
      metadata: {
        title: 'Test Document',
        author: 'RAG System'
      }
    })
  });

  if (!ingestResponse.ok) {
    const errorData = await ingestResponse.json();
    console.error("Failed to ingest document:", errorData);
    process.exit(1);
  }

  const ingestData = await ingestResponse.json();
  console.log("Document ingested successfully:", ingestData);

  // Step 3: Test query
  console.log("Testing query...");
  const queryResponse = await fetch('http://localhost:3000/api/rag/query', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-ID': userId
    },
    body: JSON.stringify({
      queryText: 'artificial intelligence',
      matchThreshold: 0.3,
      matchCount: 10
    })
  });

  if (!queryResponse.ok) {
    const errorData = await queryResponse.json();
    console.error("Failed to query:", errorData);
    process.exit(1);
  }

  const queryData = await queryResponse.json();
  console.log("Query results:", JSON.stringify(queryData, null, 2));
  
  console.log("\nTest completed successfully!");
}

testRag().catch(err => {
  console.error("Test failed with error:", err);
}); 