import { Base64 } from 'js-base64'
import moment from 'moment'
import fetch from 'node-fetch'

export async function getArtifacts(
  baseUrl: string,
  username: string,
  password: string,
  project: string,
  repository: string
) {
  let repo = repository
  if (repository.includes('/')) {
    repo = repository.replace('/', '%252F')
  }

  const url = `${baseUrl}/api/v2.0/projects/${project}/repositories/${repo}/artifacts?page=1&page_size=10&with_tag=true&with_label=false&with_scan_overview=true&with_signature=false&with_immutable_status=false`

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Base64.encode(`${username}:${password}`)}`,
    },
  }).then((res: { json: () => any }) => res.json())

  return await Promise.all(
    response.map(
      async (element: {
        addition_links: { vulnerabilities: { href: string } }
        size: number
        tags: { name: string }[]
        pull_time: string
        push_time: string
        project_id: number
      }) => {

        
        const generatedTag = element.tags?.length
        ? element.tags[0].name
        : 'undefined'
        
        const scanOverview = element.scan_overview["application/vnd.security.vulnerability.report; version=1.1"]
        const { Critical, High, Medium, Low } = scanOverview.summary.summary

        const art: Artifact = {
          size: Math.round((element.size / 1028 / 1028) * 100) / 100,
          tag: generatedTag,
          pullTime: moment(element.pull_time).format('DD-MM-YYYY HH:MM'),
          pushTime: moment(element.push_time).format('DD-MM-YYYY HH:MM'),
          projectID: projectId,
          repoUrl: `${baseUrl}/harbor/projects/${projectId}/repositories/${repository.replace(
            /\//g,
            '%2F'
          )}`,
          vulnerabilities: {
            count: scanOverview.summary.total,
            severity: scanOverview.severity,
            critical: Critical,
            high: High,
            medium: Medium,
            low: Low,
            none: scanOverview.summary.total - Critical - High - Medium - Low,
          },
          id: projectId + generatedTag + element.push_time,
        }
        return art
      }
    )
  )
}

interface Artifact {
  tag: string
  size: number
  pullTime: string
  pushTime: string
  projectID: number
  repoUrl: string
  vulnerabilities: Vulnerabilities
  id: string
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

export interface Root {
  'application/vnd.scanner.adapter.vuln.report.harbor+json; version=1.0': ApplicationVndScannerAdapterVulnReportHarborJsonVersion10
}

export interface ApplicationVndScannerAdapterVulnReportHarborJsonVersion10 {
  generated_at: string
  scanner: Scanner
  severity: string
  vulnerabilities: Vulnerability[]
}

export interface Scanner {
  name: string
  vendor: string
  version: string
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
