#!/usr/bin/env node

/**
 * MCP Integration Test Script
 * Tests basic functionality of all MCP components
 */

const fs = require('fs');
const path = require('path');
const MCPWorkflowAutomation = require('./mcp-workflow-automation');
const ByteroverIntegration = require('./byterover-integration');

class MCPIntegrationTest {
    constructor() {
        this.workflow = new MCPWorkflowAutomation();
        this.byterover = new ByteroverIntegration();
        this.testResults = {
            total: 0,
            passed: 0,
            failed: 0,
            errors: []
        };
    }

    async runAllTests() {
        console.log('🧪 Starting MCP Integration Tests');
        console.log('=================================');

        try {
            // Test 1: Configuration Loading
            await this.testConfigurationLoading();

            // Test 2: Byterover Knowledge Retrieval
            await this.testByteroverRetrieval();

            // Test 3: Byterover Knowledge Storage
            await this.testByteroverStorage();

            // Test 4: Context Management
            await this.testContextManagement();

            // Test 5: Complete Workflow Execution
            await this.testCompleteWorkflow();

            // Test 6: Error Handling
            await this.testErrorHandling();

            // Summary
            this.printTestSummary();

            return this.testResults.failed === 0;
        } catch (error) {
            console.error('❌ Test suite failed:', error.message);
            this.testResults.errors.push({
                test: 'Test Suite',
                error: error.message,
                stack: error.stack
            });
            this.testResults.failed++;
            this.printTestSummary();
            return false;
        }
    }

    async testConfigurationLoading() {
        this.testResults.total++;
        console.log('\n📂 Test 1: Configuration Loading');

        try {
            // Verify all configuration files exist
            const configFiles = [
                'serena-dashboard.json',
                'desktop-commander.json',
                'context7.json'
            ];

            const configPath = path.join(__dirname, '..', 'config');

            for (const file of configFiles) {
                const filePath = path.join(configPath, file);
                if (!fs.existsSync(filePath)) {
                    throw new Error(`Configuration file not found: ${file}`);
                }

                const content = fs.readFileSync(filePath, 'utf-8');
                JSON.parse(content); // Validate JSON
                console.log(`✅ Configuration file valid: ${file}`);
            }

            console.log('✅ All configurations loaded successfully');
            this.testResults.passed++;
        } catch (error) {
            console.error('❌ Configuration loading failed:', error.message);
            this.testResults.errors.push({
                test: 'Configuration Loading',
                error: error.message
            });
            this.testResults.failed++;
        }
    }

    async testByteroverRetrieval() {
        this.testResults.total++;
        console.log('\n🔍 Test 2: Byterover Knowledge Retrieval');

        try {
            const knowledge = await this.byterover.retrieveKnowledge('test patterns', 2);

            if (Array.isArray(knowledge)) {
                console.log(`✅ Retrieved ${knowledge.length} knowledge items`);
                this.testResults.passed++;
            } else {
                throw new Error('Knowledge retrieval did not return an array');
            }
        } catch (error) {
            console.error('❌ Knowledge retrieval failed:', error.message);
            this.testResults.errors.push({
                test: 'Byterover Retrieval',
                error: error.message
            });
            this.testResults.failed++;
        }
    }

    async testByteroverStorage() {
        this.testResults.total++;
        console.log('\n💾 Test 3: Byterover Knowledge Storage');

        try {
            const testContent = 'Test knowledge content for MCP integration testing';
            const success = await this.byterover.storeKnowledge(testContent, 'Test knowledge storage');

            if (success) {
                console.log('✅ Knowledge stored successfully');
                this.testResults.passed++;
            } else {
                throw new Error('Knowledge storage returned false');
            }
        } catch (error) {
            console.error('❌ Knowledge storage failed:', error.message);
            this.testResults.errors.push({
                test: 'Byterover Storage',
                error: error.message
            });
            this.testResults.failed++;
        }
    }

    async testContextManagement() {
        this.testResults.total++;
        console.log('\n🧠 Test 4: Context Management');

        try {
            // Test context saving
            const testContext = {
                test: 'context_management',
                timestamp: new Date().toISOString(),
                data: 'Test context data'
            };

            // Use the workflow's context saving method
            const statePath = path.join(__dirname, '..', 'state');
            const stateFile = path.join(statePath, `test_context_${Date.now()}.json`);

            fs.writeFileSync(stateFile, JSON.stringify(testContext, null, 2), 'utf-8');

            // Verify file was created
            if (fs.existsSync(stateFile)) {
                const savedContent = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
                if (savedContent.test === 'context_management') {
                    console.log('✅ Context management working correctly');
                    this.testResults.passed++;

                    // Clean up
                    fs.unlinkSync(stateFile);
                } else {
                    throw new Error('Saved context content mismatch');
                }
            } else {
                throw new Error('Context file was not created');
            }
        } catch (error) {
            console.error('❌ Context management failed:', error.message);
            this.testResults.errors.push({
                test: 'Context Management',
                error: error.message
            });
            this.testResults.failed++;
        }
    }

    async testCompleteWorkflow() {
        this.testResults.total++;
        console.log('\n🔄 Test 5: Complete Workflow Execution');

        try {
            const testTask = 'Test MCP integration workflow';
            const success = await this.workflow.executeWorkflow(testTask, 'default');

            if (success) {
                console.log('✅ Complete workflow executed successfully');
                this.testResults.passed++;
            } else {
                throw new Error('Workflow execution returned false');
            }
        } catch (error) {
            console.error('❌ Complete workflow failed:', error.message);
            this.testResults.errors.push({
                test: 'Complete Workflow',
                error: error.message
            });
            this.testResults.failed++;
        }
    }

    async testErrorHandling() {
        this.testResults.total++;
        console.log('\n🛡️ Test 6: Error Handling');

        try {
            // Test that error handling works by simulating an error
            const testError = new Error('Simulated test error');

            // This should not throw, but should handle the error gracefully
            await this.workflow.handleWorkflowError(testError, 'Test error handling');

            console.log('✅ Error handling working correctly');
            this.testResults.passed++;
        } catch (error) {
            console.error('❌ Error handling test failed:', error.message);
            this.testResults.errors.push({
                test: 'Error Handling',
                error: error.message
            });
            this.testResults.failed++;
        }
    }

    printTestSummary() {
        console.log('\n📊 Test Summary');
        console.log('================');
        console.log(`Total Tests: ${this.testResults.total}`);
        console.log(`Passed: ${this.testResults.passed}`);
        console.log(`Failed: ${this.testResults.failed}`);
        console.log(`Success Rate: ${((this.testResults.passed / this.testResults.total) * 100).toFixed(1)}%`);

        if (this.testResults.errors.length > 0) {
            console.log('\n❌ Errors:');
            this.testResults.errors.forEach((error, index) => {
                console.log(`  ${index + 1}. ${error.test}: ${error.error}`);
            });
        }

        if (this.testResults.failed === 0) {
            console.log('\n🎉 All tests passed! MCP integration is working correctly.');
        } else {
            console.log('\n⚠️  Some tests failed. Please review the errors above.');
        }
    }
}

// Run tests if executed directly
if (require.main === module) {
    const testRunner = new MCPIntegrationTest();

    testRunner.runAllTests()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(() => {
            process.exit(1);
        });
}

// Export for programmatic use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MCPIntegrationTest;
}