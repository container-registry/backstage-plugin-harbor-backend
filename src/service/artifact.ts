import { Base64 } from 'js-base64'
import fetch from 'node-fetch'
import { getCurrentHarborInstance, HarborInstance } from './config'

export async function getArtifacts(
  harborInstances: HarborInstance[],
  host: string,
  project: string,
  repository: string
) {
  const currentHarborInstance = getCurrentHarborInstance(harborInstances, host)

  const baseUrl = currentHarborInstance.apiBaseUrl
  const { username, password } = currentHarborInstance

  let repo = repository
  if (repository.includes('/')) {
    repo = repository.replace('/', '%252F')
  }

  const url = `${baseUrl}/api/v2.0/projects/${project}/repositories/${repo}/artifacts?page=1&page_size=10&with_tag=true&with_label=false&with_scan_overview=true&with_signature=false&with_immutable_status=false`

  const response: HarborApiArtifact[] = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Base64.encode(`${username}:${password}`)}`,
    },
  }).then((res: { json: () => any }) => res.json())

  return await Promise.all(
    response.map(async (element) => {
      const projectId = element.project_id

      const generatedTag = element.tags?.length
        ? element.tags[0].name
        : 'undefined'

      const art: Artifact = {
        id: projectId + generatedTag + element.push_time,
        projectID: projectId,
        tag: generatedTag,
        artifactDigest: element.digest,
        size: Math.round((element.size / 1028 / 1028) * 100) / 100,
        repoUrl: `${baseUrl}/harbor/projects/${projectId}/repositories/${encodeURIComponent(
          repository
        )}`,

        vulnerabilities: {
          count: -1,
          severity: '',
          critical: -1,
          high: -1,
          medium: -1,
          low: -1,
          none: -1,
        },

        // handle date formatting on client side in browser using native date apis (e.g. using toLocaleDateString)
        pullTime: element.pull_time,
        pushTime: element.push_time,
      }

      if (
        'scan_overview' in element &&
        Object.keys(element.scan_overview).length > 0
      ) {
        const mimeType = Object.keys(element.scan_overview)[0]

        if (
          mimeType ==
          'application/vnd.security.vulnerability.report; version=1.1'
        ) {
          const scanOverview = element.scan_overview[mimeType]
          if (scanOverview.summary) {
            const { Critical, High, Medium, Low } = scanOverview.summary.summary

            art.vulnerabilities = {
              count: scanOverview.summary.total,
              severity: scanOverview.severity,
              critical: Critical,
              high: High,
              medium: Medium,
              low: Low,
              none: scanOverview.summary.total - Critical - High - Medium - Low,
            }
          }
        } else if (
          mimeType ==
          'application/vnd.scanner.adapter.vuln.report.harbor+json; version=1.0'
        ) {
          const scanOverview = element.scan_overview[mimeType]

          const [critical, high, medium, low] = [
            'Critical',
            'High',
            'Medium',
            'Low',
          ].map(
            (sev) =>
              scanOverview.vulnerabilities.filter(
                (vuln) => vuln.severity === sev
              ).length
          )
          art.vulnerabilities = {
            count: scanOverview.vulnerabilities.length,
            severity: scanOverview.severity,
            critical,
            high,
            medium,
            low,
            none:
              scanOverview.vulnerabilities.length -
              critical -
              high -
              medium -
              low,
          }
        }
      }

      return art
    })
  )
}

interface Artifact {
  tag: string
  artifactDigest: string
  size: number
  pullTime: string
  pushTime: string
  projectID: number
  repoUrl: string
  vulnerabilities: Vulnerabilities
  id: string
}

interface HarborApiArtifact {
  addition_links: {
    vulnerabilities: {
      href: string
    }
  }
  size: number
  tags: { name: string }[]
  pull_time: string
  push_time: string
  project_id: number
  scan_overview: ScanOverview
  digest: string
}

export type ScanMimeType = keyof ScanOverviewItemsMap

export type ScanOverviewItemsMap = {
  'application/vnd.scanner.adapter.vuln.report.harbor+json; version=1.0': {
    generated_at: string
    scanner: {
      name: string
      vendor: string
      version: string
    }
    severity: string
    vulnerabilities: Vulnerability[]
  }
  'application/vnd.security.vulnerability.report; version=1.1': {
    severity: string
    summary: {
      total: number
      summary: {
        [vulnSeverity: string]: number
      }
    }
  }
}

export type ScanOverview = {
  [mime in ScanMimeType]: ScanOverviewItemsMap[mime]
}

interface Vulnerabilities {
  count: number
  severity: string
  critical: number
  high: number
  medium: number
  low: number
  none: number
}

export interface Vulnerability {
  id: string
  package: string
  version: string
  fix_version: string
  severity: string
  description: string
  links: string[]
  artifact_digest: string
}
