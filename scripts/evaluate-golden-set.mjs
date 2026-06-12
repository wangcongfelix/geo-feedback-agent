import { performance } from 'node:perf_hooks'
import {
  access,
  mkdir,
  readFile,
  writeFile
} from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const BASE_URL =
  process.env.EVAL_BASE_URL ||
  'http://localhost:3000/api/diagnose'

const GOLDEN_SET_PATH = resolve('eval/golden_set.json')
const RUNS_DIR = resolve('eval/runs')
const REQUEST_DELAY_MS = 1500
const EVAL_LIMIT = parseEvalLimit(process.env.EVAL_LIMIT)
const EVAL_OVERWRITE = process.env.EVAL_OVERWRITE === 'true'
const VALID_PROMPT_VERSIONS = new Set(['v1', 'v2'])

const CSV_COLUMNS = [
  'case_id',
  'prompt_version',
  'provider',
  'model',
  'predicted_module',
  'expected_module',
  'module_correct',
  'predicted_issue_type',
  'expected_issue_type',
  'issue_type_correct',
  'format_valid',
  'hallucination_found',
  'modified_field_count',
  'processing_time_seconds',
  'test_date',
  'notes'
]

async function main() {
  const goldenSet = JSON.parse(
    await readFile(GOLDEN_SET_PATH, 'utf8')
  )

  if (!Array.isArray(goldenSet)) {
    throw new Error('eval/golden_set.json must contain an array')
  }

  const casesToRun =
    EVAL_LIMIT === null ? goldenSet : goldenSet.slice(0, EVAL_LIMIT)
  const rows = []
  const runRecords = []
  const runStartedAt = new Date()
  let resolvedOutput = null

  console.log(
    `Preparing to evaluate ${casesToRun.length} of ${goldenSet.length} cases against ${BASE_URL}`
  )

  for (let index = 0; index < casesToRun.length; index += 1) {
    const testCase = casesToRun[index]

    if (index > 0) {
      await wait(REQUEST_DELAY_MS)
    }

    console.log(
      `[${index + 1}/${casesToRun.length}] ${testCase.id}`
    )

    const result = await evaluateCase(testCase)

    if (result.runRecord.success) {
      assertValidPromptVersion(result.runRecord.promptVersion)

      if (!resolvedOutput) {
        resolvedOutput = await resolveOutputTargets({
          runStartedAt,
          promptVersion: result.runRecord.promptVersion,
          provider: result.runRecord.provider,
          model: result.runRecord.model,
          caseCount: casesToRun.length
        })
      } else if (
        result.runRecord.promptVersion !==
        resolvedOutput.promptVersion
      ) {
        throw new Error(
          `Prompt version changed during evaluation: expected ${resolvedOutput.promptVersion}, got ${result.runRecord.promptVersion}; no result files were written.`
        )
      }
    }

    rows.push(result.row)
    runRecords.push(result.runRecord)
  }

  if (!resolvedOutput) {
    throw new Error(
      'No successful response returned a promptVersion; no result files were written.'
    )
  }

  await writeCsv(resolvedOutput.resultsPath, rows)
  const runPath = await writeRunJson({
    runPath: resolvedOutput.runPath,
    records: runRecords
  })

  console.log(
    `Wrote ${rows.length} result rows to ${resolvedOutput.resultsPath}`
  )
  console.log(`Wrote detailed run output to ${runPath}`)
}

async function evaluateCase(testCase) {
  const startedAt = performance.now()
  const testDate = new Date().toISOString()

  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(buildRequestBody(testCase))
    })

    const elapsedSeconds = formatElapsedSeconds(
      performance.now() - startedAt
    )
    const responseJson = await safeReadJson(response)

    if (!response.ok || responseJson?.success !== true) {
      const error = buildSafeError(response, responseJson)

      return {
        row: buildFailureRow({
          testCase,
          elapsedSeconds,
          testDate,
          notes: formatSafeError(error)
        }),
        runRecord: buildRunRecord({
          testCase,
          elapsedSeconds,
          success: false,
          payload: responseJson,
          error
        })
      }
    }

    const diagnosis = responseJson.data
    const provider = asString(responseJson.meta?.provider ?? '')
    const model = asString(responseJson.meta?.model ?? '')
    const promptVersion = asString(
      responseJson.meta?.promptVersion ?? ''
    )
    const predictedModule = asString(diagnosis?.productModule)
    const predictedIssueType = asString(diagnosis?.issueType)
    const expectedModule = asString(
      testCase.expectedProductModule
    )
    const expectedIssueType = asString(
      testCase.expectedIssueType
    )

    return {
      row: {
        case_id: asString(testCase.id),
        prompt_version: promptVersion,
        provider,
        model,
        predicted_module: predictedModule,
        expected_module: expectedModule,
        module_correct: String(predictedModule === expectedModule),
        predicted_issue_type: predictedIssueType,
        expected_issue_type: expectedIssueType,
        issue_type_correct: String(
          predictedIssueType === expectedIssueType
        ),
        format_valid: 'true',
        hallucination_found: '',
        modified_field_count: '',
        processing_time_seconds: elapsedSeconds,
        test_date: testDate,
        notes: ''
      },
      runRecord: buildRunRecord({
        testCase,
        elapsedSeconds,
        success: true,
        payload: responseJson,
        error: null
      })
    }
  } catch (error) {
    const elapsedSeconds = formatElapsedSeconds(
      performance.now() - startedAt
    )
    const safeError = sanitizeErrorMessage(error)

    return {
      row: buildFailureRow({
        testCase,
        elapsedSeconds,
        testDate,
        notes: safeError
      }),
      runRecord: buildRunRecord({
        testCase,
        elapsedSeconds,
        success: false,
        payload: null,
        error: {
          message: safeError
        }
      })
    }
  }
}

function buildRequestBody(testCase) {
  const optionalContext = testCase.optionalContext ?? {}

  return {
    feedbackText: asString(testCase.feedbackText),
    productName: asString(optionalContext.productName),
    productType: asString(optionalContext.productType),
    deviceInfo: asString(optionalContext.deviceInfo),
    appVersion: asString(optionalContext.appVersion),
    occurredAt: asString(optionalContext.occurredAt),
    location: asString(optionalContext.location),
    additionalContext: asString(
      optionalContext.additionalContext
    )
  }
}

function buildFailureRow({
  testCase,
  elapsedSeconds,
  testDate,
  notes
}) {
  return {
    case_id: asString(testCase.id),
    prompt_version: '',
    provider: '',
    model: '',
    predicted_module: '',
    expected_module: asString(testCase.expectedProductModule),
    module_correct: 'false',
    predicted_issue_type: '',
    expected_issue_type: asString(testCase.expectedIssueType),
    issue_type_correct: 'false',
    format_valid: 'false',
    hallucination_found: '',
    modified_field_count: '',
    processing_time_seconds: elapsedSeconds,
    test_date: testDate,
    notes
  }
}

async function safeReadJson(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

function buildSafeError(response, responseJson) {
  const code = responseJson?.error?.code
  const message = responseJson?.error?.message

  return {
    httpStatus: response.status,
    code: asString(code),
    message: asString(message)
  }
}

function formatSafeError(error) {
  return [
    error.httpStatus ? `HTTP ${error.httpStatus}` : '',
    error.code ? `code=${error.code}` : '',
    error.message ? `message=${error.message}` : ''
  ]
    .filter(Boolean)
    .join('; ')
}

async function writeCsv(filePath, rows) {
  await mkdir(dirname(filePath), { recursive: true })

  const header = CSV_COLUMNS.join(',')
  const body = rows.map(rowToCsvLine).join('\n')
  const csv = `\uFEFF${header}\n${body}\n`

  await writeFile(filePath, csv, 'utf8')
}

async function resolveOutputTargets({
  runStartedAt,
  promptVersion,
  provider,
  model,
  caseCount
}) {
  const resultsPath = resolve(
    'eval',
    `evaluation_results_${promptVersion}.csv`
  )
  const runPath = buildRunJsonPath({
    runStartedAt,
    promptVersion,
    provider
  })

  await assertCanWriteResults(resultsPath)

  console.log('Evaluation output resolved:')
  console.log(`- Request URL: ${BASE_URL}`)
  console.log(`- Prompt version: ${promptVersion}`)
  console.log(`- Provider: ${provider || '(empty)'}`)
  console.log(`- Model: ${model || '(empty)'}`)
  console.log(`- Case count: ${caseCount}`)
  console.log(`- CSV output path: ${resultsPath}`)
  console.log(`- Run JSON output path: ${runPath}`)

  return {
    promptVersion,
    resultsPath,
    runPath
  }
}

function assertValidPromptVersion(promptVersion) {
  if (!VALID_PROMPT_VERSIONS.has(promptVersion)) {
    throw new Error(
      `Invalid promptVersion returned by API: "${promptVersion || '(empty)'}". Expected "v1" or "v2"; no result files were written.`
    )
  }
}

async function assertCanWriteResults(filePath) {
  if (EVAL_OVERWRITE) {
    return
  }

  if (await fileExists(filePath)) {
    throw new Error(
      `Refusing to overwrite existing CSV: ${filePath}. Set EVAL_OVERWRITE=true to overwrite it.`
    )
  }
}

async function fileExists(filePath) {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

function buildRunJsonPath({
  runStartedAt,
  promptVersion,
  provider
}) {
  const safePromptVersion = promptVersion || 'prompt_unknown'
  const safeProvider = provider || 'provider_unknown'
  const timestamp = runStartedAt
    .toISOString()
    .replace(/[:.]/g, '')

  return resolve(
    RUNS_DIR,
    `${safePromptVersion}_${safeProvider}_${timestamp}.json`
  )
}

async function writeRunJson({ runPath, records }) {
  await mkdir(RUNS_DIR, { recursive: true })

  await writeFile(
    runPath,
    `${JSON.stringify(records, null, 2)}\n`,
    'utf8'
  )

  return runPath
}

function buildRunRecord({
  testCase,
  elapsedSeconds,
  success,
  payload,
  error
}) {
  const provider = asString(payload?.meta?.provider ?? '')
  const model = asString(payload?.meta?.model ?? '')
  const promptVersion = asString(
    payload?.meta?.promptVersion ?? ''
  )

  return {
    case_id: asString(testCase.id),
    feedbackText: asString(testCase.feedbackText),
    expectedProductModule: asString(
      testCase.expectedProductModule
    ),
    expectedIssueType: asString(testCase.expectedIssueType),
    provider,
    model,
    promptVersion,
    processingTimeSeconds: elapsedSeconds,
    success,
    diagnosis: success ? payload?.data ?? null : null,
    error: success ? null : error
  }
}

function rowToCsvLine(row) {
  return CSV_COLUMNS.map(column =>
    escapeCsvValue(row[column] ?? '')
  ).join(',')
}

function escapeCsvValue(value) {
  const text = String(value)

  if (/[",\r\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`
  }

  return text
}

function formatElapsedSeconds(milliseconds) {
  return (milliseconds / 1000).toFixed(3)
}

function sanitizeErrorMessage(error) {
  if (error instanceof Error) {
    return error.message.split('\n')[0].slice(0, 200)
  }

  return 'Unknown request error'
}

function asString(value) {
  return typeof value === 'string' ? value : ''
}

function parseEvalLimit(value) {
  if (!value) {
    return null
  }

  const parsed = Number.parseInt(value, 10)

  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error('EVAL_LIMIT must be a positive integer')
  }

  return parsed
}

function wait(milliseconds) {
  return new Promise(resolve => {
    setTimeout(resolve, milliseconds)
  })
}

main().catch(error => {
  console.error(sanitizeErrorMessage(error))
  process.exitCode = 1
})
