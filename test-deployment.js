#!/usr/bin/env node

/**
 * Test script for Cloudflare Workers deployment
 * Usage: node test-deployment.js <worker-url>
 */

const workerUrl = process.argv[2];

if (!workerUrl) {
  console.error('Usage: node test-deployment.js <worker-url>');
  console.error('Example: node test-deployment.js https://strudel-mcp-server.your-account.workers.dev');
  process.exit(1);
}

async function testHealthCheck() {
  console.log('🔍 Testing health check...');
  try {
    const response = await fetch(`${workerUrl}/health`);
    const data = await response.json();
    console.log('✅ Health check passed:', data);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testMCPConnection() {
  console.log('🔍 Testing MCP connection...');
  try {
    const response = await fetch(`${workerUrl}/sse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {}
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ MCP connection successful');
      console.log(`📊 Available tools: ${data.result?.tools?.length || 0}`);
      return true;
    } else {
      console.error('❌ MCP connection failed:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error('❌ MCP connection failed:', error.message);
    return false;
  }
}

async function testPatternGeneration() {
  console.log('🔍 Testing pattern generation...');
  try {
    const response = await fetch(`${workerUrl}/sse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: {
          name: 'generate_pattern',
          arguments: {
            style: 'techno',
            key: 'C',
            bpm: 128
          }
        }
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Pattern generation successful');
      console.log('🎵 Generated pattern preview:', data.result?.content?.[0]?.text?.substring(0, 100) + '...');
      return true;
    } else {
      console.error('❌ Pattern generation failed:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error('❌ Pattern generation failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log(`🚀 Testing Strudel MCP Server deployment at: ${workerUrl}\n`);

  const results = {
    health: await testHealthCheck(),
    mcp: await testMCPConnection(),
    generation: await testPatternGeneration()
  };

  console.log('\n📋 Test Results:');
  console.log(`Health Check: ${results.health ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`MCP Connection: ${results.mcp ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Pattern Generation: ${results.generation ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = Object.values(results).every(result => result);
  
  if (allPassed) {
    console.log('\n🎉 All tests passed! Your MCP server is ready to use.');
    console.log(`\n📖 Connect to your server using: ${workerUrl}/sse`);
  } else {
    console.log('\n⚠️  Some tests failed. Check the deployment and try again.');
    process.exit(1);
  }
}

runTests().catch(error => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
});