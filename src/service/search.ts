import { Base64 } from 'js-base64';
import fetch from 'node-fetch';

export async function repoSearch(
  baseUrl: string,
  username: string,
  password: string,
  body: string,
) {
  const repos: Repositories[] = JSON.parse(JSON.stringify(body));
  const repoNames: RepoInformation[] = [];

  await Promise.all(
    repos.map(async (v: { repository: string }) => {
      const url = `${baseUrl}/api/v2.0/search?q=${v.repository}`;
      console.log('finding repo:', v.repository);
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Base64.encode(`${username}:${password}`)}`,
        },
      });
      const json = await response.json();

      if (json.hasOwnProperty('error')) {
        console.log(json.error.message, v.repository);
        // const error: RepoInformation[] = [
        //   {
        //     errorMsg: json.error.message,
        //     project: '',
        //     repository: v.repository,
        //   },
        // ];
        return;
      }

      if (json.hasOwnProperty('repository')) {
        if (json.repository.length >= 1) {
          json.repository.map(
            (v2: { project_name: string; repository_name: string }) => {
              console.log('found repo', v2.repository_name);
              const repoDetails: RepoInformation = {
                project: v2.project_name,
                repository: v2.repository_name.split('/', 2)[1],
                // errorMsg: '',
              };

              repoNames.push(repoDetails);
            },
          );
        }
      }
    }),
  );

  const uniqueObjArray = [
    ...new Map(repoNames.map(item => [item.repository, item])).values(),
  ];

  return uniqueObjArray;
}

interface Repositories {
  repository: string;
}

interface RepoInformation {
  project: string;
  repository: string;
  // errorMsg: string;
}
