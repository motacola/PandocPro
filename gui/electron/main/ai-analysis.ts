import { ipcMain } from 'electron'
import { detectProviders, selectBestProvider } from './ai-detector'
import { readFile } from 'fs/promises'
import path from 'node:path'

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

async function analyzeDocumentContent(
    content: string,
    fileType: 'docx' | 'md' | 'pptx' | 'txt',
    providerId: string
): Promise<DocumentAnalysis> {
    // In a real implementation, this would call the AI provider
    // For now, we'll create a mock analysis based on the content

    const now = new Date().toISOString()

    // Basic text analysis
    const lines = content.split('\n')
    const words = content.split(/\s+/).filter(word => word.length > 0)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0)

    // Mock structure analysis
    const headings: DocumentAnalysis['structure']['headings'] = []
    const sections: DocumentAnalysis['structure']['sections'] = []

    // Detect headings based on file type
    if (fileType === 'md') {
        // Markdown heading detection
        lines.forEach((line, index) => {
            const headingMatch = line.match(/^(#+)\s+(.+)$/)
            if (headingMatch) {
                const level = headingMatch[1].length
                const text = headingMatch[2]
                headings.push({
                    level,
                    text,
                    lineNumber: index + 1,
                    characterCount: text.length
                })

                // Create section for each heading
                sections.push({
                    title: text,
                    startLine: index + 1,
                    endLine: index + 1, // Would be calculated in real implementation
                    wordCount: text.split(/\s+/).length,
                    paragraphCount: 1
                })
            }
        })
    } else if (fileType === 'docx' || fileType === 'pptx') {
        // For DOCX/PPTX, we'd parse the actual structure
        // This is a simplified mock
        headings.push(
            { level: 1, text: 'Introduction', lineNumber: 1, characterCount: 11 },
            { level: 2, text: 'Background', lineNumber: 5, characterCount: 9 },
            { level: 2, text: 'Methodology', lineNumber: 15, characterCount: 11 },
            { level: 1, text: 'Results', lineNumber: 25, characterCount: 7 }
        )
    }

    // Mock readability scores (would be calculated by AI in real implementation)
    const readability = {
        fleschReadingEase: Math.min(100, Math.max(0, 65 + Math.random() * 20)),
        fleschKincaidGrade: Math.min(20, Math.max(1, 10 + Math.random() * 4)),
        gunningFogIndex: Math.min(20, Math.max(5, 12 + Math.random() * 3)),
        colemanLiauIndex: Math.min(20, Math.max(1, 11 + Math.random() * 3)),
        automatedReadabilityIndex: Math.min(20, Math.max(1, 10 + Math.random() * 4)),
        overallScore: Math.min(100, Math.max(0, 70 + Math.random() * 15))
    }

    // Mock recommendations
    const recommendations: DocumentAnalysis['recommendations'] = [
        {
            type: 'structure',
            severity: 'medium',
            description: 'Document could benefit from more clear section headings',
            suggestion: 'Consider adding subheadings to break up long sections and improve navigation'
        },
        {
            type: 'readability',
            severity: 'low',
            description: 'Some sentences could be simplified',
            suggestion: 'Review complex sentences and consider breaking them into simpler structures'
        }
    ]

    // Add specific recommendations based on content length
    if (words.length > 2000) {
        recommendations.push({
            type: 'structure',
            severity: 'high',
            description: 'Document is quite long',
            suggestion: 'Consider breaking this into multiple documents or adding a table of contents'
        })
    }

    // Mock metadata
    const metadata = {
        wordCount: words.length,
        characterCount: content.length,
        paragraphCount: paragraphs.length,
        sentenceCount: sentences.length,
        readingTimeMinutes: Math.round(words.length / 200), // Average reading speed
        language: 'english' // Would be detected in real implementation
    }

    return {
        filePath: '[mock-path]',
        fileType,
        timestamp: now,
        structure: {
            headings,
            sections,
            tables: [], // Would be detected in real implementation
            images: [] // Would be detected in real implementation
        },
        readability,
        recommendations,
        metadata
    }
}

async function callAIProviderForAnalysis(
    content: string,
    fileType: 'docx' | 'md' | 'pptx' | 'txt',
    providerId: string
): Promise<DocumentAnalysis> {
    // In a real implementation, this would call the actual AI provider
    // For this implementation, we'll use our mock analysis
    console.log(`🤖 Analyzing document with ${providerId} provider`)

    try {
        // Mock analysis - in real implementation this would call the AI API
        return await analyzeDocumentContent(content, fileType, providerId)
    } catch (error) {
        console.error(`❌ Error analyzing document with ${providerId}:`, error)
        throw new Error(`AI analysis failed: ${error instanceof Error ? error.message : String(error)}`)
    }
}

export async function analyzeDocumentStructure(
    filePath: string,
    options: { analysisType?: 'full' | 'quick' | 'structure-only' } = {}
): Promise<DocumentAnalysisResponse> {
    const startTime = Date.now()

    try {
        // Read the file content
        let content: string
        try {
            content = await readFile(filePath, 'utf-8')
        } catch (readError) {
            console.error('❌ Error reading file:', readError)
            return {
                success: false,
                error: `Failed to read file: ${readError instanceof Error ? readError.message : String(readError)}`,
                timestamp: new Date().toISOString()
            }
        }

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

        // Detect available AI providers
        const providers = await detectProviders()
        const bestProvider = selectBestProvider(providers)

        if (!bestProvider) {
            return {
                success: false,
                error: 'No AI providers available for document analysis',
                timestamp: new Date().toISOString()
            }
        }

        console.log(`🔍 Starting document analysis with ${bestProvider.name}`)

        // Perform the analysis
        const analysis = await callAIProviderForAnalysis(content, fileType, bestProvider.id)

        // Update the file path in the analysis
        analysis.filePath = filePath

        const endTime = Date.now()
        console.log(`✅ Document analysis completed in ${endTime - startTime}ms`)

        return {
            success: true,
            analysis,
            providerUsed: bestProvider.id,
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