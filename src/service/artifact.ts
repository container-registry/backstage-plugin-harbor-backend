import { Base64 } from 'js-base64';

const fetch = require('node-fetch');
const dateFormat = require('dateformat');

export async function getArtifacts(
  baseUrl: string,
  username: string,
  password: string,
  project: string,
  repository: string,
) {
  let repo = repository;
  if (repository.includes('/')) {
    repo = repository.replace('/', '%252F');
  }

  const url = `${baseUrl}/api/v2.0/projects/${project}/repositories/${repo}/artifacts?page=1&page_size=10&with_tag=true&with_label=false&with_scan_overview=false&with_signature=false&with_immutable_status=false`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Base64.encode(`${username}:${password}`)}`,
    },
  }).then((res: { json: () => any }) => res.json());

  const artifacts: any = [];

  await Promise.all(
    response.map(
      async (element: {
        addition_links: { vulnerabilities: { href: string } };
        size: number;
        tags: { name: string }[];
        pull_time: string;
        push_time: string;
        project_id: number;
      }) => {
        const vulnUrl: string = `${baseUrl}${element.addition_links.vulnerabilities.href}`;

        const vulns: Root = await fetch(vulnUrl, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${Base64.encode(`${username}:${password}`)}`,
          },
        }).then((res: { json: () => any }) => res.json());

        const vulnKey =
          'application/vnd.scanner.adapter.vuln.report.harbor+json; version=1.0';
        let severity = vulns[vulnKey].severity;
        if (severity === 'Unknown') {
          severity = 'None';
        }

        const projectId = element.project_id;

        const art: Artifact = {
          size: Math.round((element.size / 1028 / 1028) * 100) / 100,
          tag: element.tags[0].name,
          pullTime: dateFormat(element.pull_time, 'yyyy-mm-dd HH:MM'),
          pushTime: dateFormat(element.push_time, 'yyyy-mm-dd HH:MM'),
          projectID: projectId,
          repoUrl: `${baseUrl}/harbor/projects/${projectId}/repositories/${repository.replace(
            /\//g,
            '%2F',
          )}`,
          vulnerabilities: {
            count: Object.keys(vulns[vulnKey].vulnerabilities).length,
            severity: severity,
          },
        };

        artifacts.push(art);
      },
    ),
  );

  return artifacts;
}

interface Artifact {
  tag: string;
  size: number;
  pullTime: number;
  pushTime: string;
  projectID: number;
  repoUrl: string;
  vulnerabilities: Vulnerabilities;
}

interface Vulnerabilities {
  count: number;
  severity: string;
}

export interface Root {
  'application/vnd.scanner.adapter.vuln.report.harbor+json; version=1.0': ApplicationVndScannerAdapterVulnReportHarborJsonVersion10;
}

export interface ApplicationVndScannerAdapterVulnReportHarborJsonVersion10 {
  generated_at: string;
  scanner: Scanner;
  severity: string;
  vulnerabilities: Vulnerability[];
}

export interface Scanner {
  name: string;
  vendor: string;
  version: string;
}

export interface Vulnerability {
  id: string;
  package: string;
  version: string;
  fix_version: string;
  severity: string;
  description: string;
  links: string[];
  artifact_digest: string;
}
