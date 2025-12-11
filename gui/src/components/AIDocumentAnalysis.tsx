import React, { useState, useEffect } from 'react'
import { DocumentAnalysis, DocumentAnalysisResponse } from '../type/pandoc-pro.d'

// Import path module for filename extraction
const path = window.require ? window.require('path') : { basename: (p: string) => p.split('/').pop() || p }

interface AIDocumentAnalysisProps {
    filePath: string
    onClose: () => void
    onAnalysisComplete?: (analysis: DocumentAnalysis) => void
}

export const AIDocumentAnalysis: React.FC<AIDocumentAnalysisProps> = ({
    filePath,
    onClose,
    onAnalysisComplete
}) => {
    const [analysis, setAnalysis] = useState<DocumentAnalysis | null>(null)
    const [isLoading, setIsLoading] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'structure' | 'readability' | 'recommendations'>('structure')

    const performAnalysis = async () => {
        if (!filePath) {
            setError('No file path provided')
            return
        }

        setIsLoading(true)
        setError(null)
        setAnalysis(null)

        try {
            console.log(`🔍 Starting AI analysis for: ${filePath}`)
            const response: DocumentAnalysisResponse = await window.pandocPro.analyzeDocument({
                filePath,
                analysisType: 'full'
            })

            if (response.success && response.analysis) {
                console.log('✅ Analysis completed successfully')
                setAnalysis(response.analysis)

                if (onAnalysisComplete) {
                    onAnalysisComplete(response.analysis)
                }
            } else {
                throw new Error(response.error || 'Unknown analysis error')
            }
        } catch (err) {
            console.error('❌ Analysis failed:', err)
            setError(`Analysis failed: ${err instanceof Error ? err.message : String(err)}`)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        // Auto-start analysis when component mounts
        performAnalysis()
    }, [filePath])

    const getReadabilityRating = (score: number): string => {
        if (score >= 80) return 'Very Easy'
        if (score >= 60) return 'Easy'
        if (score >= 50) return 'Fairly Easy'
        if (score >= 30) return 'Standard'
        return 'Difficult'
    }

    const getSeverityColor = (severity: 'low' | 'medium' | 'high'): string => {
        switch (severity) {
            case 'low': return 'text-green-500'
            case 'medium': return 'text-yellow-500'
            case 'high': return 'text-red-500'
            default: return 'text-gray-500'
        }
    }

    const getSeverityText = (severity: 'low' | 'medium' | 'high'): string => {
        switch (severity) {
            case 'low': return 'Low'
            case 'medium': return 'Medium'
            case 'high': return 'High'
            default: return 'Unknown'
        }
    }

    if (isLoading) {
        return (
            <div className="p-4 bg-gray-50 rounded-lg border">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">AI Document Analysis</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 text-sm"
                    >
                        ✕ Close
                    </button>
                </div>

                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
                    <span className="text-gray-600">Analyzing document structure and content...</span>
                </div>

                <div className="mt-4 text-sm text-gray-500">
                    <p>Using AI to analyze document structure, readability, and content quality.</p>
                    <p className="mt-1">This may take a few moments depending on document size.</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-red-800">Analysis Error</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 text-sm"
                    >
                        ✕ Close
                    </button>
                </div>

                <div className="text-red-600 mb-4">
                    {error}
                </div>

                <button
                    onClick={performAnalysis}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                    Retry Analysis
                </button>
            </div>
        )
    }

    if (!analysis) {
        return (
            <div className="p-4 bg-gray-50 rounded-lg border">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">AI Document Analysis</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 text-sm"
                    >
                        ✕ Close
                    </button>
                </div>

                <div className="text-gray-600">
                    No analysis data available. Click the button below to start analysis.
                </div>

                <button
                    onClick={performAnalysis}
                    className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                >
                    Start Analysis
                </button>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800">AI Document Analysis</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 text-sm"
                    >
                        ✕ Close
                    </button>
                </div>

                <div className="mt-2 text-sm text-gray-600">
                    <span className="font-medium">File:</span> {path.basename(analysis.filePath)}
                    <span className="ml-4"><span className="font-medium">Type:</span> {analysis.fileType.toUpperCase()}</span>
                    <span className="ml-4"><span className="font-medium">Analyzed:</span> {new Date(analysis.timestamp).toLocaleString()}</span>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="border-b">
                <nav className="flex space-x-8 px-4">
                    <button
                        onClick={() => setActiveTab('structure')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'structure'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        Structure Analysis
                    </button>
                    <button
                        onClick={() => setActiveTab('readability')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'readability'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        Readability
                    </button>
                    <button
                        onClick={() => setActiveTab('recommendations')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'recommendations'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        Recommendations
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            <div className="p-4">
                {activeTab === 'structure' && (
                    <div className="space-y-6">
                        {/* Document Metadata */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-semibold text-gray-800 mb-3">Document Metadata</h4>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <div className="flex justify-between py-1">
                                        <span className="text-gray-600">Word Count:</span>
                                        <span className="font-medium">{analysis.metadata.wordCount.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between py-1">
                                        <span className="text-gray-600">Character Count:</span>
                                        <span className="font-medium">{analysis.metadata.characterCount.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between py-1">
                                        <span className="text-gray-600">Paragraph Count:</span>
                                        <span className="font-medium">{analysis.metadata.paragraphCount.toLocaleString()}</span>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between py-1">
                                        <span className="text-gray-600">Sentence Count:</span>
                                        <span className="font-medium">{analysis.metadata.sentenceCount.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between py-1">
                                        <span className="text-gray-600">Reading Time:</span>
                                        <span className="font-medium">{analysis.metadata.readingTimeMinutes} minutes</span>
                                    </div>
                                    <div className="flex justify-between py-1">
                                        <span className="text-gray-600">Language:</span>
                                        <span className="font-medium">{analysis.metadata.language || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Headings Structure */}
                        <div className="bg-white p-4 rounded-lg border">
                            <h4 className="font-semibold text-gray-800 mb-3">Document Headings</h4>
                            {analysis.structure.headings.length > 0 ? (
                                <div className="space-y-2">
                                    {analysis.structure.headings.map((heading, index) => (
                                        <div key={index} className="flex items-start">
                                            <div className="w-8 text-right mr-3 text-sm text-gray-500">
                                                {heading.lineNumber}
                                            </div>
                                            <div className="flex-1">
                                                <div
                                                    className={`font-medium ${heading.level === 1 ? 'text-xl text-blue-600' :
                                                        heading.level === 2 ? 'text-lg text-blue-500' :
                                                            heading.level === 3 ? 'text-base text-blue-400' :
                                                                'text-sm text-blue-300'
                                                        }`}
                                                >
                                                    {heading.text}
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1">
                                                    Level {heading.level} • {heading.characterCount} characters
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-sm">No headings detected in this document.</p>
                            )}
                        </div>

                        {/* Sections */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-semibold text-gray-800 mb-3">Document Sections</h4>
                            {analysis.structure.sections.length > 0 ? (
                                <div className="space-y-3">
                                    {analysis.structure.sections.map((section, index) => (
                                        <div key={index} className="bg-white p-3 rounded border">
                                            <div className="font-medium text-gray-800">{section.title}</div>
                                            <div className="text-sm text-gray-500 mt-1">
                                                Lines {section.startLine}-{section.endLine} • {section.wordCount} words • {section.paragraphCount} paragraphs
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-sm">No sections detected in this document.</p>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'readability' && (
                    <div className="space-y-6">
                        {/* Overall Readability Score */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-semibold text-gray-800 mb-3">Overall Readability</h4>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-3xl font-bold text-blue-600">
                                        {analysis.readability.overallScore}
                                    </div>
                                    <div className="text-sm text-gray-600 mt-1">
                                        {getReadabilityRating(analysis.readability.overallScore)}
                                    </div>
                                </div>
                                <div className="w-24 h-24 relative">
                                    <svg className="w-24 h-24 transform -rotate-90">
                                        <circle
                                            cx="48"
                                            cy="48"
                                            r="40"
                                            stroke="currentColor"
                                            strokeWidth="8"
                                            fill="transparent"
                                            className="text-gray-200"
                                        />
                                        <circle
                                            cx="48"
                                            cy="48"
                                            r="40"
                                            stroke="currentColor"
                                            strokeWidth="8"
                                            fill="transparent"
                                            strokeDasharray="251.2"
                                            strokeDashoffset={251.2 * (1 - analysis.readability.overallScore / 100)}
                                            className={`text-blue-500 transition-all duration-500`}
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-xs font-medium">{analysis.readability.overallScore}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Detailed Readability Metrics */}
                        <div className="bg-white p-4 rounded-lg border">
                            <h4 className="font-semibold text-gray-800 mb-3">Readability Metrics</h4>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Flesch Reading Ease:</span>
                                    <span className="font-medium">{analysis.readability.fleschReadingEase.toFixed(1)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Flesch-Kincaid Grade:</span>
                                    <span className="font-medium">{analysis.readability.fleschKincaidGrade.toFixed(1)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Gunning Fog Index:</span>
                                    <span className="font-medium">{analysis.readability.gunningFogIndex.toFixed(1)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Coleman-Liau Index:</span>
                                    <span className="font-medium">{analysis.readability.colemanLiauIndex.toFixed(1)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Automated Readability Index:</span>
                                    <span className="font-medium">{analysis.readability.automatedReadabilityIndex.toFixed(1)}</span>
                                </div>
                            </div>

                            <div className="mt-4 p-3 bg-blue-50 rounded text-sm text-blue-700">
                                <p className="font-medium">Interpretation:</p>
                                <p className="mt-1">Higher scores indicate easier readability. Most documents should aim for scores between 60-80 for optimal comprehension.</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'recommendations' && (
                    <div className="space-y-4">
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h4 className="font-semibold text-gray-800 mb-3">AI Recommendations</h4>
                            <p className="text-sm text-gray-600 mb-3">
                                These suggestions are generated by AI analysis to help improve your document quality.
                            </p>

                            {analysis.recommendations.length > 0 ? (
                                <div className="space-y-3">
                                    {analysis.recommendations.map((recommendation, index) => (
                                        <div key={index} className="bg-white p-4 rounded border">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center">
                                                    <span className={`text-sm font-medium ${getSeverityColor(recommendation.severity)} mr-2`}>
                                                        ● {getSeverityText(recommendation.severity)}
                                                    </span>
                                                    <span className="text-sm font-medium text-gray-700">
                                                        {recommendation.type.charAt(0).toUpperCase() + recommendation.type.slice(1)}
                                                    </span>
                                                </div>
                                                {recommendation.location && (
                                                    <span className="text-xs text-gray-400 ml-2">
                                                        {recommendation.location}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="mt-2">
                                                <p className="text-gray-800 font-medium">{recommendation.description}</p>
                                                <p className="text-gray-600 text-sm mt-1">{recommendation.suggestion}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <div className="w-12 h-12 mx-auto mb-3 bg-green-100 rounded-full flex items-center justify-center">
                                        <span className="text-green-600 text-xl">✓</span>
                                    </div>
                                    <p className="text-gray-600 font-medium">No recommendations</p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Your document looks great! No major improvements suggested.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Action Footer */}
            <div className="p-4 border-t bg-gray-50 flex justify-end">
                <button
                    onClick={performAnalysis}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors mr-2"
                    disabled={isLoading}
                >
                    {isLoading ? 'Analyzing...' : 'Re-analyze'}
                </button>
                <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
                >
                    Close
                </button>
            </div>
        </div>
    )
}