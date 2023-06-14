import axios, { HttpStatusCode } from "axios";
import https from "https";
import { Action, ActionPanel, getPreferenceValues, List, showToast, Toast } from "@raycast/api";
import { encode } from "js-base64";
import { useCallback, useState } from "react";

export interface Preferences {
  jenkinsUrl: string;
  jenkinsUser: string;
  jenkinsToken: string;
}

interface SearchResult {
  name: string;
  url: string;
}

const { jenkinsUrl, jenkinsUser, jenkinsToken }: Preferences = getPreferenceValues();
const authToken64 = encode(`${jenkinsUser}:${jenkinsToken}`);

const authConfig = {
  method: "get",
  headers: {
    Authorization: `Basic ${authToken64}`,
    "Content-Type": "application/x-www-form-urlencoded",
  },
};

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

axios.defaults.httpsAgent = httpsAgent;

function setUrl(s: SearchResult): SearchResult {
  s.url = `${jenkinsUrl}/search/?q=${encodeURIComponent(s.name)}`;
  return s;
}

export default function Command() {
  const [searchText, setSearchText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchResult, setSearchResult] = useState<SearchResult[]>([]);

  const onSearch = useCallback(
    async function doSearch(text: string) {
      if (searchText !== text) {
        setSearchText(text);
      }

      if (text.length < 2) {
        return;
      }

      setIsLoading(true);

      try {
        const response = await axios.request({
          ...authConfig,
          url: `${jenkinsUrl}/search/suggest`,
          params: { query: text },
        });

        if (response.status != HttpStatusCode.Ok) {
          showToast({ style: Toast.Style.Failure, title: "Search Failed", message: `${response.statusText}` });
        }

        const { suggestions } = response.data;
        const searchData: SearchResult[] = suggestions ? suggestions.map(setUrl) : [];
        setSearchResult(searchData);
      } catch (err) {
        showToast({ style: Toast.Style.Failure, title: "Search Failed", message: `${err}` });
      } finally {
        setIsLoading(isLoading);
      }
    },
    [setSearchResult]
  );

  return (
    <List isLoading={isLoading} onSearchTextChange={onSearch} searchBarPlaceholder={"Search jenkins..."} throttle>
      <List.Section title="Total" subtitle={`${searchResult.length}`}>
        {searchResult.map(function (result: SearchResult) {
          return (
            <List.Item
              title={result.name}
              key={result.name}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser title={"Open In Browser"} url={`${result.url}`} />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
