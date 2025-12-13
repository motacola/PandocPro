#!/usr/bin/env node

/**
 * Byterover Knowledge Tool Integration Script
 * Handles knowledge retrieval and storage for MCP workflow
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ByteroverIntegration {
    constructor() {
        this.knowledgeBasePath = path.join(__dirname, '..', 'knowledge');
        this.ensureKnowledgeDirectory();
    }

    ensureKnowledgeDirectory() {
        if (!fs.existsSync(this.knowledgeBasePath)) {
            fs.mkdirSync(this.knowledgeBasePath, { recursive: true });
        }
    }

    /**
     * Retrieve knowledge using Byterover tool
     * @param {string} query - Search query
     * @param {number} limit - Maximum results to return
     * @returns {Promise<Array>} Array of knowledge items
     */
    async retrieveKnowledge(query, limit = 3) {
        try {
            console.log(`[Byterover] Retrieving knowledge for query: "${query}"`);

            // Use the Byterover MCP tool
            const result = execSync(`mcp_byterover-mcp_byterover-retrieve-knowledge "${query}" ${limit}`, {
                encoding: 'utf-8',
                cwd: process.cwd()
            });

            const knowledge = JSON.parse(result);
            console.log(`[Byterover] Retrieved ${knowledge.length} knowledge items`);
            return knowledge;
        } catch (error) {
            console.error(`[Byterover] Error retrieving knowledge: ${error.message}`);
            return [];
        }
    }

    /**
     * Store knowledge using Byterover tool
     * @param {string} content - Content to store
     * @param {string} context - Context description
     * @returns {Promise<boolean>} Success status
     */
    async storeKnowledge(content, context = '') {
        try {
            console.log(`[Byterover] Storing knowledge: "${context}"`);

            // Use the Byterover MCP tool
            execSync(`mcp_byterover-mcp_byterover-store-knowledge "${content}"`, {
                encoding: 'utf-8',
                cwd: process.cwd()
            });

            console.log('[Byterover] Knowledge stored successfully');
            return true;
        } catch (error) {
            console.error(`[Byterover] Error storing knowledge: ${error.message}`);
            return false;
        }
    }

    /**
     * Store knowledge from task completion
     * @param {string} taskDescription - Description of completed task
     * @param {string} implementationDetails - Implementation details
     * @param {string} patternsLearned - Patterns or techniques learned
     */
    async storeTaskKnowledge(taskDescription, implementationDetails, patternsLearned) {
        const knowledgeContent = `
## Task: ${taskDescription}

### Implementation Details
${implementationDetails}

### Patterns Learned
${patternsLearned}

### Context
- Timestamp: ${new Date().toISOString()}
- Working Directory: ${process.cwd()}
`;

        return this.storeKnowledge(knowledgeContent, `Task completion: ${taskDescription}`);
    }

    /**
     * Retrieve knowledge before task execution
     * @param {string} taskType - Type of task being executed
     * @returns {Promise<Array>} Relevant knowledge items
     */
    async retrieveTaskKnowledge(taskType) {
        const query = `task execution patterns for ${taskType}`;
        return this.retrieveKnowledge(query);
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ByteroverIntegration;
}

// CLI interface
if (require.main === module) {
    const byterover = new ByteroverIntegration();

    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
        case 'retrieve':
            const query = args[1] || 'task patterns';
            const limit = parseInt(args[2]) || 3;
            byterover.retrieveKnowledge(query, limit)
                .then(knowledge => console.log(JSON.stringify(knowledge, null, 2)))
                .catch(console.error);
            break;

        case 'store':
            const content = args.slice(1).join(' ') || 'Default knowledge content';
            byterover.storeKnowledge(content, 'CLI storage')
                .then(success => console.log(`Storage ${success ? 'successful' : 'failed'}`))
                .catch(console.error);
            break;

        default:
            console.log('Usage:');
            console.log('  byterover-integration.js retrieve <query> [limit]');
            console.log('  byterover-integration.js store <content>');
    }
}