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
        scan_overview: {
          [mime: string]: {
            severity: string,
            summary: {
              total: number,
              summary: {
                [vulnSeverity: string]: number
              }
            }
          }
        }
      }) => {

        const projectId = element.project_id

        const generatedTag = element.tags?.length
          ? element.tags[0].name
          : 'undefined'

        if (element.addition_links.vulnerabilities !== undefined) {

          const vulnUrl: string = `${baseUrl}${element.addition_links.vulnerabilities.href}`

          const vulns: Root = await fetch(vulnUrl, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Basic ${Base64.encode(`${username}:${password}`)}`,
            },
          }).then((res: { json: () => any }) => res.json())

          const vulnKey =
            'application/vnd.scanner.adapter.vuln.report.harbor+json; version=1.0'

          if (vulns[vulnKey] === undefined) {
            vulns[vulnKey] = {
              generated_at: '',
              scanner: {
                name: 'undefined',
                vendor: 'undefined',
                version: 'undefined',
              },
              severity: 'Unknown',
              vulnerabilities: [],
            }
          }

          severity = vulns[vulnKey].severity
          if (severity === 'Unknown') {
            severity = 'None'
          }

          vulns[vulnKey].vulnerabilities.map((value) => {
            switch (value.severity) {
              case 'Low': {
                low += 1
                break
              }
              case 'Medium': {
                medium += 1
                break
              }
              case 'High': {
                high += 1
                break
              }
              case 'Critical': {
                critical += 1
                break
              }
              default:
                none += 1
            }
          })

          vulnerabilityCount = Object.keys(vulns[vulnKey].vulnerabilities).length;
        }
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
            count: 0,
            severity: "none",
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
            none: 0,
          },
          id: projectId + generatedTag + element.push_time,
        }

        const reportMimeType = "application/vnd.security.vulnerability.report; version=1.1"

        if (reportMimeType in element.scan_overview) {
          const scanOverview = element.scan_overview[reportMimeType]
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
