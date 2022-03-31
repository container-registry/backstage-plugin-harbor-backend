import { getRootLogger } from "@backstage/backend-common";
import { Config } from "@backstage/config";
import fetch from "node-fetch";
import * as redis from "redis";

const logger = getRootLogger();

export async function getTeamArtifacts(
  body: string,
  team: string,
  redisConfig: Config | undefined
) {
  const RepoInformation: RepoInformation[] = JSON.parse(JSON.stringify(body));

  let client = redis.createClient({});
  if (redisConfig !== undefined) {
    const redisHost = redisConfig.getString("host");
    const redisPort = redisConfig.getNumber("port");

    client = redis.createClient({
      url: `redis://${redisHost}:${redisPort}`,
    });
  }

  await client.connect();

  const HarborArtifacts = await client.get(`${team}Artifacts`);

  if (HarborArtifacts && JSON.parse(HarborArtifacts).length >= 1) {
    return HarborArtifacts;
  }

  const Artifacts = await teamArtifacts(RepoInformation);

  await client.set(`${team}Artifacts`, JSON.stringify(Artifacts));
  client.expire(`${team}Artifacts`, 3600);
  return Artifacts;
}

async function teamArtifacts(RepoInformation: RepoInformation[]) {
  const repoArtifacts: Artifact[] = [];
  const errorMsgs: HarborErrors[] = [];

  const promiseAll = RepoInformation.map(async (value) => {
    const response = await fetch(
      `http://localhost:7000/api/harbor/artifacts?project=${value.project}&repository=${value.repository}`
    );
    const json = await response.json();
    if (json.length === 0) {
      const errorMsg: HarborErrors = {
        project: value.project,
        repository: value.repository,
        errorMsg: "Repository not found",
      };
      errorMsgs.push(errorMsg);
      logger.warn(JSON.stringify(errorMsg));
      return;
    }

    if (json.hasOwnProperty("error")) {
      const errorMsg: HarborErrors = {
        project: value.project,
        repository: value.repository,
        errorMsg: json.error.message,
      };
      errorMsgs.push(errorMsg);
      logger.error(JSON.stringify(errorMsg));
      return;
    }

    json.sort((a: { pushTime: number }, b: { pushTime: number }) =>
      a.pushTime > b.pushTime ? -1 : 1
    );
    const repoArtifact: Artifact = json[0];
    repoArtifact.repository = value.repository;
    repoArtifact.project = value.project;

    repoArtifacts.push(repoArtifact);
  });
  await Promise.all(promiseAll);

  return repoArtifacts;
}

export interface Artifact {
  repository: string;
  project: string;
  size: number;
  tag: string;
  pullTime: string;
  pushTime: string;
  projectID: number;
  repoUrl: string;
  vulnerabilities: Vulnerabilities;
}

export interface Vulnerabilities {
  count: number;
  severity: string;
}

export interface VulnerabilitiesLevels {
  none: number;
  low: number;
  medium: number;
  high: number;
  critical: number;
}

interface HarborErrors {
  project: string;
  repository: string;
  errorMsg: string;
}

interface RepoInformation {
  project: string;
  repository: string;
}
