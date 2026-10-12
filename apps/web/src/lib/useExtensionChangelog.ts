import { useEffect, useState } from "react";
import { getExtensionChangelog } from "./api";
import type { ExtensionChangelog } from "./changelogReleases";

export type ExtensionChangelogLoad =
  | { status: "loading" }
  | { status: "failed" }
  | { status: "ready"; changelog: ExtensionChangelog };

export function useExtensionChangelog(): ExtensionChangelogLoad {
  const [changelogLoad, setChangelogLoad] = useState<ExtensionChangelogLoad>({ status: "loading" });

  useEffect(() => {
    let unmounted = false;
    getExtensionChangelog()
      .then((changelog) => {
        if (!unmounted) setChangelogLoad({ status: "ready", changelog });
      })
      .catch(() => {
        if (!unmounted) setChangelogLoad({ status: "failed" });
      });
    return () => {
      unmounted = true;
    };
  }, []);

  return changelogLoad;
}
