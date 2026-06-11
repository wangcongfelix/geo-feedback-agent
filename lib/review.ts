import type { DiagnosisResult } from '@/lib/diagnosis'

/**
 * MVP阶段允许产品经理修改的字段。
 *
 * 数组类字段暂时只展示，不在这一阶段编辑。
 */
export const REVIEWABLE_FIELDS = [
  'summary',
  'userScenario',
  'productModule',
  'issueType',
  'alternativeIssueType',
  'actualResult',
  'expectedResult',
  'severitySuggestion',
  'prioritySuggestion',
  'uncertainty',
  'recommendedNextAction'
] as const

export type ReviewableField =
  (typeof REVIEWABLE_FIELDS)[number]

export type ReviewStatus =
  | 'not_reviewed'
  | 'reviewing'
  | 'confirmed'

/**
 * 创建一份独立的人工审核副本。
 *
 * 不能直接修改AI原始结果，否则后面无法计算人工修改率。
 */
export function createReviewedDiagnosis(
  diagnosis: DiagnosisResult
): DiagnosisResult {
  return {
    ...diagnosis,
    userFacts: [...diagnosis.userFacts],
    aiInferences: [...diagnosis.aiInferences],
    evidenceQuotes: [...diagnosis.evidenceQuotes],
    missingInformation: diagnosis.missingInformation.map(item => ({
      ...item
    }))
  }
}

/**
 * 比较AI原始结果和人工审核结果，
 * 返回发生变化的字段名。
 */
export function getModifiedFields(
  original: DiagnosisResult,
  reviewed: DiagnosisResult
): ReviewableField[] {
  return REVIEWABLE_FIELDS.filter(
    field => original[field] !== reviewed[field]
  )
}