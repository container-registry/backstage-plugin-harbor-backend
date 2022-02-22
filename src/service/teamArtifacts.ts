import fetch from "node-fetch";
import * as redis from "redis";
import { Config } from "@backstage/config";

export async function getTeamArtifacts(
  RepoInformation: RepoInformation[],
  team: string,
  redisConfig: Config
) {
  const redisHost = redisConfig.getString("host");
  const redisPort = redisConfig.getNumber("port");

  const client = redis.createClient({
    url: `redis://${redisHost}:${redisPort}`,
  });
  await client.connect();

  const HarborArtifacts = await client.json.get(`${team}Artifacts`, {
    path: ".",
  });
  if (HarborArtifacts) {
    const Artifacts = await teamArtifacts(RepoInformation);
    setRedisCache(
      redisHost,
      redisPort,
      `${team}Artifacts`,
      60,
      JSON.parse(JSON.stringify(Artifacts))
    );
    return HarborArtifacts;
  }
  const Artifacts = await teamArtifacts(RepoInformation);
  setRedisCache(
    redisHost,
    redisPort,
    `${team}Artifacts`,
    60,
    JSON.parse(JSON.stringify(Artifacts))
  );
  return Artifacts;
}

async function setRedisCache(
  redisHost: string,
  redisPort: number,
  identifier: string,
  ttl: number = 3600,
  jsonData: string
) {
  const client = redis.createClient({
    url: `redis://${redisHost}:${redisPort}`,
  });
  await client.connect();
  await client.json.set(identifier, ".", jsonData);
  client.expire(identifier, ttl);
}

async function teamArtifacts(RepoInformation: RepoInformation[]) {
  const repoArtifacts: Artifact[] = [];
  const errorMsgs: HarborErrors[] = [];

  const promiseAll = RepoInformation.map(async (value) => {
    const response = await fetch(
      `http://localhost:7000/api/harbor/artifacts?project=${value.project}&repository=${value.repository}`
    );
    const json = await response.json();

    if (json.hasOwnProperty("error")) {
      const errorMsg: HarborErrors = {
        project: value.project,
        repository: value.repository,
        errorMsg: json.error.message,
      };
      errorMsgs.push(errorMsg);
      console.log(errorMsg);
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
