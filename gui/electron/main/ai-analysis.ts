import { ipcMain } from 'electron'
import { detectProviders, selectBestProvider } from './ai-detector'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { createRequire } from 'node:module'
import { telemetryRecord } from './telemetry'

const require = createRequire(import.meta.url)
const PROJECT_ROOT = path.resolve(process.env.APP_ROOT ?? '.', '..')
const AI_TIMEOUT_MS = Number(process.env.AI_ANALYSIS_TIMEOUT_MS ?? '20000')
const MAX_AI_CONTENT_CHARS = 12_000
const LARGE_ANALYSIS_CONTENT_BYTES = 1_000_000

type LlmConfig = {
    provider?: string
}

type LlmHelper = {
    generateResponse?: (projectRoot: string, prompt: string) => Promise<string>
    loadConfig?: (projectRoot: string) => LlmConfig | null
}

type AnalysisPatch = {
    readability?: Partial<DocumentAnalysis['readability']>
    recommendations?: Array<{
        type: 'structure' | 'content' | 'readability' | 'formatting'
        severity: 'low' | 'medium' | 'high'
        description: string
        suggestion: string
        location?: string
    }>
    language?: string
}

let llmHelper: LlmHelper | null = null

function ensureLlmHelper(): LlmHelper | null {
    if (llmHelper) {
        return llmHelper
    }
    try {
        llmHelper = require(path.join(PROJECT_ROOT, 'scripts', 'lib', 'llm-helper.js')) as LlmHelper
    } catch {
        llmHelper = null
    }
    return llmHelper
}

export interface DocumentAnalysis {
    filePath: string
    fileType: 'docx' | 'md' | 'pptx' | 'txt'
    timestamp: string
    structure: {
        headings: Array<{
            level: number
            text: string
            lineNumber: number
            characterCount: number
        }>
        sections: Array<{
            title: string
            startLine: number
            endLine: number
            wordCount: number
            paragraphCount: number
        }>
        tables: Array<{
            description: string
            rowCount: number
            columnCount: number
            location: string
        }>
        images: Array<{
            description: string
            location: string
            size?: string
        }>
    }
    readability: {
        fleschReadingEase: number
        fleschKincaidGrade: number
        gunningFogIndex: number
        colemanLiauIndex: number
        automatedReadabilityIndex: number
        overallScore: number
    }
    recommendations: Array<{
        type: 'structure' | 'content' | 'readability' | 'formatting'
        severity: 'low' | 'medium' | 'high'
        description: string
        suggestion: string
        location?: string
    }>
    metadata: {
        wordCount: number
        characterCount: number
        paragraphCount: number
        sentenceCount: number
        readingTimeMinutes: number
        language?: string
    }
}

export interface DocumentAnalysisRequest {
    filePath: string
    analysisType?: 'full' | 'quick' | 'structure-only'
}

export interface DocumentAnalysisResponse {
    success: boolean
    analysis?: DocumentAnalysis
    error?: string
    providerUsed?: string
    timestamp: string
}

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value))
}

function round2(value: number) {
    return Math.round(value * 100) / 100
}

function safeDivide(numerator: number, denominator: number) {
    return denominator === 0 ? 0 : numerator / denominator
}

function normalizeProviderId(providerId?: string) {
    const normalized = (providerId ?? '').toLowerCase()
    if (normalized === 'google') {
        return 'gemini'
    }
    return normalized
}

function countSyllables(word: string) {
    const cleaned = word.toLowerCase().replace(/[^a-z]/g, '')
    if (!cleaned) {
        return 1
    }
    const groups = cleaned.match(/[aeiouy]+/g)
    let count = groups?.length ?? 1
    if (cleaned.endsWith('e') && count > 1) {
        count -= 1
    }
    return Math.max(1, count)
}

function extractHeadings(lines: string[], fileType: 'docx' | 'md' | 'pptx' | 'txt') {
    const headings: DocumentAnalysis['structure']['headings'] = []

    if (fileType === 'md') {
        lines.forEach((line, index) => {
            const match = line.match(/^(#{1,6})\s+(.+)$/)
            if (!match) {
                return
            }
            const text = match[2].trim()
            if (!text) {
                return
            }
            headings.push({
                level: match[1].length,
                text,
                lineNumber: index + 1,
                characterCount: text.length,
            })
        })
        return headings
    }

    lines.forEach((line, index) => {
        const trimmed = line.trim()
        if (!trimmed || trimmed.length > 90) {
            return
        }
        const numberedMatch = trimmed.match(/^(\d+(?:\.\d+)*)\s+(.+)$/)
        if (numberedMatch) {
            headings.push({
                level: Math.min(6, numberedMatch[1].split('.').length),
                text: numberedMatch[2].trim(),
                lineNumber: index + 1,
                characterCount: numberedMatch[2].trim().length,
            })
            return
        }

        const allCaps = /^[A-Z0-9][A-Z0-9\s\-:()&/]+$/.test(trimmed)
        const titled = trimmed.endsWith(':') && trimmed.split(/\s+/).length <= 12
        if (!allCaps && !titled) {
            return
        }
        headings.push({
            level: 1,
            text: trimmed.replace(/:$/, ''),
            lineNumber: index + 1,
            characterCount: trimmed.length,
        })
    })

    return headings
}

function buildSections(lines: string[], headings: DocumentAnalysis['structure']['headings']) {
    if (headings.length === 0) {
        const body = lines.join('\n').trim()
        return body
            ? [{
                title: 'Document',
                startLine: 1,
                endLine: lines.length || 1,
                wordCount: body.split(/\s+/).filter(Boolean).length,
                paragraphCount: body.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length,
            }]
            : []
    }

    return headings.map((heading, index) => {
        const startLine = heading.lineNumber
        const endLine = index < headings.length - 1 ? headings[index + 1].lineNumber - 1 : lines.length
        const sectionText = lines.slice(startLine - 1, Math.max(endLine, startLine)).join('\n').trim()
        return {
            title: heading.text,
            startLine,
            endLine: Math.max(endLine, startLine),
            wordCount: sectionText ? sectionText.split(/\s+/).filter(Boolean).length : 0,
            paragraphCount: sectionText ? sectionText.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length : 0,
        }
    })
}

function computeReadability(content: string): DocumentAnalysis['readability'] {
    const words = content.split(/\s+/).filter(Boolean)
    const sentences = content.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean)
    const letters = words.reduce((sum, word) => sum + word.replace(/[^a-zA-Z]/g, '').length, 0)
    const syllables = words.reduce((sum, word) => sum + countSyllables(word), 0)
    const complexWords = words.filter((word) => countSyllables(word) >= 3).length

    const wordCount = Math.max(1, words.length)
    const sentenceCount = Math.max(1, sentences.length)
    const avgSentenceLength = safeDivide(wordCount, sentenceCount)
    const avgSyllablesPerWord = safeDivide(syllables, wordCount)

    const fleschReadingEase = clamp(206.835 - 1.015 * avgSentenceLength - 84.6 * avgSyllablesPerWord, 0, 100)
    const fleschKincaidGrade = clamp(0.39 * avgSentenceLength + 11.8 * avgSyllablesPerWord - 15.59, 0, 18)
    const gunningFogIndex = clamp(0.4 * (avgSentenceLength + 100 * safeDivide(complexWords, wordCount)), 0, 20)
    const colemanLiauIndex = clamp(
        0.0588 * (safeDivide(letters, wordCount) * 100) - 0.296 * (safeDivide(sentenceCount, wordCount) * 100) - 15.8,
        0,
        20
    )
    const automatedReadabilityIndex = clamp(
        4.71 * safeDivide(letters, wordCount) + 0.5 * avgSentenceLength - 21.43,
        0,
        20
    )

    const gradePenalty = clamp(100 - fleschKincaidGrade * 5, 0, 100)
    const overallScore = clamp((fleschReadingEase + gradePenalty) / 2, 0, 100)

    return {
        fleschReadingEase: round2(fleschReadingEase),
        fleschKincaidGrade: round2(fleschKincaidGrade),
        gunningFogIndex: round2(gunningFogIndex),
        colemanLiauIndex: round2(colemanLiauIndex),
        automatedReadabilityIndex: round2(automatedReadabilityIndex),
        overallScore: round2(overallScore),
    }
}

function buildDeterministicRecommendations(
    content: string,
    headings: DocumentAnalysis['structure']['headings'],
    metadata: DocumentAnalysis['metadata'],
    analysisType: 'full' | 'quick' | 'structure-only'
) {
    if (analysisType === 'structure-only') {
        return []
    }

    const recommendations: DocumentAnalysis['recommendations'] = []
    const paragraphs = content.split(/\n\s*\n/).filter((p) => p.trim().length > 0)
    const sentenceCount = Math.max(1, metadata.sentenceCount)
    const avgSentenceWords = safeDivide(metadata.wordCount, sentenceCount)
    const longParagraphs = paragraphs.filter((p) => p.split(/\s+/).filter(Boolean).length > 180).length

    if (headings.length < 2 && metadata.wordCount > 400) {
        recommendations.push({
            type: 'structure',
            severity: metadata.wordCount > 1500 ? 'high' : 'medium',
            description: 'Document has limited heading structure for its length.',
            suggestion: 'Add section headings to improve navigation and skimmability.',
        })
    }

    if (avgSentenceWords > 25) {
        recommendations.push({
            type: 'readability',
            severity: avgSentenceWords > 35 ? 'high' : 'medium',
            description: 'Average sentence length is high.',
            suggestion: 'Split long sentences to improve clarity and reduce cognitive load.',
        })
    }

    if (longParagraphs > 0) {
        recommendations.push({
            type: 'formatting',
            severity: 'medium',
            description: `Found ${longParagraphs} very long paragraph${longParagraphs > 1 ? 's' : ''}.`,
            suggestion: 'Break long paragraphs into shorter blocks to improve readability.',
        })
    }

    if (metadata.wordCount > 2500) {
        recommendations.push({
            type: 'content',
            severity: 'low',
            description: 'Document is long enough to benefit from a summary section.',
            suggestion: 'Add an executive summary or key takeaways near the start of the document.',
        })
    }

    if (recommendations.length === 0) {
        recommendations.push({
            type: 'readability',
            severity: 'low',
            description: 'Document structure and readability look stable.',
            suggestion: 'Run a focused tone/style pass if you need stronger voice consistency.',
        })
    }

    return analysisType === 'quick' ? recommendations.slice(0, 1) : recommendations
}

function buildDeterministicAnalysis(
    content: string,
    fileType: 'docx' | 'md' | 'pptx' | 'txt',
    analysisType: 'full' | 'quick' | 'structure-only'
): DocumentAnalysis {
    const lines = content.split('\n')
    const words = content.split(/\s+/).filter(Boolean)
    const sentences = content.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean)
    const paragraphs = content.split(/\n\s*\n/).filter((p) => p.trim().length > 0)
    const headings = extractHeadings(lines, fileType)
    const sections = buildSections(lines, headings)

    const metadata: DocumentAnalysis['metadata'] = {
        wordCount: words.length,
        characterCount: content.length,
        paragraphCount: paragraphs.length,
        sentenceCount: sentences.length,
        readingTimeMinutes: Math.max(1, Math.round(words.length / 220)),
        language: 'english',
    }

    const readability = analysisType === 'structure-only'
        ? {
            fleschReadingEase: 0,
            fleschKincaidGrade: 0,
            gunningFogIndex: 0,
            colemanLiauIndex: 0,
            automatedReadabilityIndex: 0,
            overallScore: 0,
        }
        : computeReadability(content)

    return {
        filePath: '[local-analysis]',
        fileType,
        timestamp: new Date().toISOString(),
        structure: {
            headings,
            sections,
            tables: [],
            images: [],
        },
        readability,
        recommendations: buildDeterministicRecommendations(content, headings, metadata, analysisType),
        metadata,
    }
}

function buildProviderPrompt(
    content: string,
    fileType: 'docx' | 'md' | 'pptx' | 'txt',
    analysisType: 'full' | 'quick' | 'structure-only',
    baseline: DocumentAnalysis,
    providerId: string
) {
    const excerpt = content.slice(0, MAX_AI_CONTENT_CHARS)
    const headingSummary = baseline.structure.headings.slice(0, 15).map((h) => `L${h.level}:${h.text}`).join(' | ')
    return [
        'You are a document analysis engine for PandocPro.',
        'Return only valid JSON. No markdown code fences.',
        'JSON schema:',
        '{',
        '  "readability": { "fleschReadingEase": number, "fleschKincaidGrade": number, "gunningFogIndex": number, "colemanLiauIndex": number, "automatedReadabilityIndex": number, "overallScore": number },',
        '  "recommendations": [{ "type": "structure|content|readability|formatting", "severity": "low|medium|high", "description": string, "suggestion": string, "location"?: string }],',
        '  "language": string',
        '}',
        `Preferred provider: ${providerId}`,
        `Analysis type: ${analysisType}`,
        `File type: ${fileType}`,
        `Known metadata: words=${baseline.metadata.wordCount}, paragraphs=${baseline.metadata.paragraphCount}, sentences=${baseline.metadata.sentenceCount}`,
        `Known headings: ${headingSummary || 'none'}`,
        'Content excerpt:',
        excerpt,
    ].join('\n')
}

function extractJsonPayload(raw: string): unknown {
    const direct = raw.trim()
    try {
        return JSON.parse(direct)
    } catch {
        // Continue with fallback extraction
    }

    const fenced = direct.match(/```json\s*([\s\S]*?)```/i) ?? direct.match(/```\s*([\s\S]*?)```/i)
    if (fenced?.[1]) {
        return JSON.parse(fenced[1].trim())
    }

    const start = direct.indexOf('{')
    const end = direct.lastIndexOf('}')
    if (start !== -1 && end > start) {
        return JSON.parse(direct.slice(start, end + 1))
    }

    throw new Error('Provider did not return JSON payload.')
}

function normalizePatch(raw: unknown, analysisType: 'full' | 'quick' | 'structure-only'): AnalysisPatch {
    if (!raw || typeof raw !== 'object') {
        throw new Error('Invalid provider payload.')
    }

    const data = raw as Record<string, unknown>
    const patch: AnalysisPatch = {}

    if (analysisType !== 'structure-only' && data.readability && typeof data.readability === 'object') {
        const readability = data.readability as Record<string, unknown>
        patch.readability = {
            fleschReadingEase: typeof readability.fleschReadingEase === 'number' ? clamp(readability.fleschReadingEase, 0, 100) : undefined,
            fleschKincaidGrade: typeof readability.fleschKincaidGrade === 'number' ? clamp(readability.fleschKincaidGrade, 0, 20) : undefined,
            gunningFogIndex: typeof readability.gunningFogIndex === 'number' ? clamp(readability.gunningFogIndex, 0, 20) : undefined,
            colemanLiauIndex: typeof readability.colemanLiauIndex === 'number' ? clamp(readability.colemanLiauIndex, 0, 20) : undefined,
            automatedReadabilityIndex: typeof readability.automatedReadabilityIndex === 'number' ? clamp(readability.automatedReadabilityIndex, 0, 20) : undefined,
            overallScore: typeof readability.overallScore === 'number' ? clamp(readability.overallScore, 0, 100) : undefined,
        }
    }

    if (analysisType !== 'structure-only' && Array.isArray(data.recommendations)) {
        const normalizedRecommendations: AnalysisPatch['recommendations'] = []
        for (const item of data.recommendations) {
            if (!item || typeof item !== 'object') {
                continue
            }
            const candidate = item as Record<string, unknown>
            const type = candidate.type
            const severity = candidate.severity
            const description = candidate.description
            const suggestion = candidate.suggestion
            if (
                (type === 'structure' || type === 'content' || type === 'readability' || type === 'formatting')
                && (severity === 'low' || severity === 'medium' || severity === 'high')
                && typeof description === 'string'
                && typeof suggestion === 'string'
            ) {
                normalizedRecommendations.push({
                    type,
                    severity,
                    description: description.trim().slice(0, 220),
                    suggestion: suggestion.trim().slice(0, 280),
                    location: typeof candidate.location === 'string' ? candidate.location.slice(0, 120) : undefined,
                })
            }
        }
        if (normalizedRecommendations.length > 0) {
            patch.recommendations = analysisType === 'quick'
                ? normalizedRecommendations.slice(0, 1)
                : normalizedRecommendations.slice(0, 6)
        }
    }

    if (typeof data.language === 'string' && data.language.trim()) {
        patch.language = data.language.trim().slice(0, 64).toLowerCase()
    }

    return patch
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error(`Provider timeout after ${timeoutMs}ms`)), timeoutMs)
        promise
            .then((value) => {
                clearTimeout(timeout)
                resolve(value)
            })
            .catch((error) => {
                clearTimeout(timeout)
                reject(error)
            })
    })
}

function mergeAnalysisPatch(
    baseline: DocumentAnalysis,
    patch: AnalysisPatch,
    analysisType: 'full' | 'quick' | 'structure-only'
) {
    if (analysisType === 'structure-only') {
        return baseline
    }

    return {
        ...baseline,
        readability: {
            ...baseline.readability,
            ...patch.readability,
        },
        recommendations: patch.recommendations && patch.recommendations.length > 0
            ? patch.recommendations
            : baseline.recommendations,
        metadata: {
            ...baseline.metadata,
            language: patch.language ?? baseline.metadata.language,
        },
    }
}

async function callAIProviderForAnalysis(
    content: string,
    fileType: 'docx' | 'md' | 'pptx' | 'txt',
    providerId: string,
    analysisType: 'full' | 'quick' | 'structure-only',
    baseline: DocumentAnalysis
): Promise<DocumentAnalysis> {
    const helper = ensureLlmHelper()
    if (!helper?.generateResponse) {
        throw new Error('LLM helper is unavailable.')
    }

    const prompt = buildProviderPrompt(content, fileType, analysisType, baseline, providerId)
    const raw = await withTimeout(helper.generateResponse(PROJECT_ROOT, prompt), AI_TIMEOUT_MS)
    const payload = extractJsonPayload(raw)
    const patch = normalizePatch(payload, analysisType)
    return mergeAnalysisPatch(baseline, patch, analysisType)
}

async function extractTextFromDocxOrPptx(filePath: string, fileType: 'docx' | 'pptx'): Promise<string> {
    const pandocBin = process.env.PANDOC_PATH || 'pandoc'

    return await new Promise((resolve, reject) => {
        execFile(pandocBin, [filePath, '-t', 'plain'], (error, stdout, stderr) => {
            if (error) {
                const message = stderr?.toString().trim() || error.message
                reject(new Error(`Failed to extract ${fileType.toUpperCase()} content via pandoc: ${message}`))
                return
            }
            resolve(stdout.toString())
        })
    })
}

export async function analyzeDocumentStructure(
    filePath: string,
    options: { analysisType?: 'full' | 'quick' | 'structure-only' } = {}
): Promise<DocumentAnalysisResponse> {
    const startTime = Date.now()
    const analysisType = options.analysisType ?? 'full'

    try {
        // Detect file type from extension
        const ext = path.extname(filePath).toLowerCase()
        let fileType: 'docx' | 'md' | 'pptx' | 'txt'

        if (ext === '.md') {
            fileType = 'md'
        } else if (ext === '.docx') {
            fileType = 'docx'
        } else if (ext === '.pptx') {
            fileType = 'pptx'
        } else if (ext === '.txt') {
            fileType = 'txt'
        } else {
            return {
                success: false,
                error: `Unsupported file type: ${ext}`,
                timestamp: new Date().toISOString()
            }
        }

        let content: string
        try {
            if (fileType === 'docx' || fileType === 'pptx') {
                content = await extractTextFromDocxOrPptx(filePath, fileType)
            } else {
                // Read the file content for supported text formats
                content = await readFile(filePath, 'utf-8')
            }
        } catch (readError) {
            console.error('❌ Error reading file:', readError)
            const message = readError instanceof Error ? readError.message : String(readError)
            let errorMessage = `Failed to read file: ${message}.`
            if (fileType === 'docx' || fileType === 'pptx') {
                errorMessage += ' Please ensure pandoc is installed and the file is accessible.'
            }
            return {
                success: false,
                error: errorMessage,
                timestamp: new Date().toISOString()
            }
        }

        const fallbackAnalysis = buildDeterministicAnalysis(content, fileType, analysisType)
        fallbackAnalysis.filePath = filePath

        // Try provider-backed enrichment when configured and available.
        let analysis = fallbackAnalysis
        let providerUsed = 'deterministic'

        if (analysisType !== 'structure-only') {
            const helper = ensureLlmHelper()
            const configuredProvider = normalizeProviderId(helper?.loadConfig?.(PROJECT_ROOT)?.provider)
            let candidateProviderId: string | null = null

            try {
                const providers = await detectProviders()
                const bestProvider = selectBestProvider(providers)

                const configuredProviderAvailable = configuredProvider
                    ? providers.some((provider) => normalizeProviderId(provider.id) === configuredProvider && provider.available)
                    : false

                if (configuredProvider && configuredProviderAvailable) {
                    candidateProviderId = configuredProvider
                } else if (bestProvider?.available) {
                    candidateProviderId = bestProvider.id
                }
            } catch (providerDetectionError) {
                console.warn('⚠️ Provider detection failed; using deterministic fallback.', providerDetectionError)
            }

            if (candidateProviderId) {
                try {
                    console.log(`🔍 Starting provider-backed analysis with ${candidateProviderId}`)
                    analysis = await callAIProviderForAnalysis(
                        content,
                        fileType,
                        candidateProviderId,
                        analysisType,
                        fallbackAnalysis
                    )
                    analysis.filePath = filePath
                    providerUsed = candidateProviderId
                } catch (providerError) {
                    console.warn('⚠️ Provider analysis failed; using deterministic fallback.', providerError)
                }
            }
        }

        const endTime = Date.now()
        const durationMs = endTime - startTime
        console.log(`✅ Document analysis completed in ${durationMs}ms`)

        const contentBytes = Buffer.byteLength(content, 'utf8')
        telemetryRecord('analysis_duration_ms', {
            filePath,
            fileType,
            analysisType,
            providerUsed,
            durationMs,
            contentBytes,
            wordCount: analysis.metadata.wordCount,
            paragraphCount: analysis.metadata.paragraphCount,
        })

        if (contentBytes >= LARGE_ANALYSIS_CONTENT_BYTES) {
            telemetryRecord('large_document_processed', {
                context: 'analysis',
                filePath,
                fileType,
                analysisType,
                providerUsed,
                durationMs,
                contentBytes,
            })
        }

        return {
            success: true,
            analysis,
            providerUsed,
            timestamp: new Date().toISOString()
        }

    } catch (error) {
        console.error('❌ Document analysis failed:', error)
        return {
            success: false,
            error: `Analysis failed: ${error instanceof Error ? error.message : String(error)}`,
            timestamp: new Date().toISOString()
        }
    }
}

export function registerAiAnalysisHandlers() {
    ipcMain.handle('ai:analyze-document', async (_event, payload: DocumentAnalysisRequest) => {
        const { filePath, analysisType = 'full' } = payload

        if (!filePath) {
            throw new Error('Missing filePath')
        }

        return await analyzeDocumentStructure(filePath, { analysisType })
    })
}
