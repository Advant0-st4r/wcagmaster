import {
  WCAGAnalyzer as SharedWCAGAnalyzer,
  analyzeHtml as sharedAnalyzeHtml,
  type AnalysisResult,
  type WCAGViolation
} from '../../shared/wcag/analyzer'

export { SharedWCAGAnalyzer as WCAGAnalyzer, type AnalysisResult, type WCAGViolation }

export function analyzeHtml(html: string): AnalysisResult {
  const parser = new DOMParser()
  return sharedAnalyzeHtml(html, content => parser.parseFromString(content, 'text/html'))
}
