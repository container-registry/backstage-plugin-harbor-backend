import { Base64 } from "js-base64";
import fetch from "node-fetch";

export async function repoSearch(
  baseUrl: string,
  username: string,
  password: string,
  repository: string
) {
  const url = `${baseUrl}/api/v2.0/search?q=${repository}`;

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Base64.encode(`${username}:${password}`)}`,
    },
  });
  const json = await response.json();
  return json;
}
