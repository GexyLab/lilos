# smb3-client (vendored)

Build (`tsc`) of [smb3-client](https://github.com/euricojardim/smb3-client) 0.2.0 by
Eurico Jardim, MIT license (see LICENSE), with four changes of the lilOS project on top
(branch `lilos-fixes`), proposed upstream:

1. fix(readdir): send the search pattern on every QUERY_DIRECTORY (Samba answered the
   continuation with STATUS_OBJECT_NAME_INVALID)
2. fix(connection): count the initial credit used by NEGOTIATE (Samba dropped the
   connection: "client used more credits than granted")
3. feat(client): `createReadStream(path, { start })`, `createWriteStream(path, { start })`,
   `size` and `mtime` in `readdir(path, { withFileTypes: true })` entries
4. perf(readStream): one 64 KiB READ per chunk, more of them in flight (data flows at once,
   about twice as fast against Samba)

When these are in a published release, this folder goes and the module depends on the
package instead.
