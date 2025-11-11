#!/usr/bin/env node

const path = require('node:path')
const { askFaqAi } = require('./lib/llm-helper.js')

async function main() {
  const [projectRoot, questionB64, answerB64, followUpB64] = process.argv.slice(2)
  if (!projectRoot || !questionB64 || !answerB64) {
    console.error('Usage: faq-ai.js <project-root> <question-b64> <answer-b64> [followup-b64]')
    process.exit(1)
  }
  const question = Buffer.from(questionB64, 'base64').toString('utf8')
  const answer = Buffer.from(answerB64, 'base64').toString('utf8')
  const followUp = followUpB64 ? Buffer.from(followUpB64, 'base64').toString('utf8') : ''
  try {
    const reply = await askFaqAi(path.resolve(projectRoot), { question, answer, followUp })
    process.stdout.write(`${reply.trim()}\n`)
  } catch (err) {
    process.stderr.write(`Error: ${err?.message || err}\n`)
    process.exit(1)
  }
}

main()
