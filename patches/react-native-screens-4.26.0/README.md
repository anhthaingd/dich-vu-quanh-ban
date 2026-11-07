# NATIVE-05 — backport Android startup race fix

Pinned dependency: `react-native-screens@4.26.0`, as required by Expo SDK 57.
Upstream: https://github.com/software-mansion/react-native-screens/pull/4413
Reviewed commit: `204d36b45f2a718c6f86e00cfc70765cbde06565`.

The four C++ files are copied unchanged from that commit. Upstream's two
`cpp/legacy/RNSScreenRemovalListener.*` files map to `cpp/` in 4.26.0.
The MIT license is retained in `LICENSE`.

Concurrent cold-start registration can tear the per-proxy shared pointer and
leave a live control block pointing at a freed listener. The upstream fix uses
thread-safe singleton initialization, locks callback installation/invalidation,
and uses an ownership token so old teardown cannot clear a newer callback.

Root `postinstall` runs `scripts/install/screens-patch.mjs`. It verifies the
pinned package version and all original/replacement hashes before changing any
file; re-running is safe. API-only installs without screens are a no-op. CI,
local native builds and EAS must run install scripts. If using `--ignore-scripts`,
run the patch script explicitly before Gradle/Expo prebuild. Do not edit
node_modules by hand or refresh hashes to accept an unknown version. On the
next Expo/screens upgrade, compare the upstream fix, remove this backport if
included, and rerun native lifecycle/navigation/call tests.

Evidence and limitations: `docs/ke-hoach-trien-khai/bao-cao/B00-25-sua-loi-truoc-deploy.md`.
