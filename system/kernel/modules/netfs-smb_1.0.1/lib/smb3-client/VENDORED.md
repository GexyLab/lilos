# smb3-client (vendored)

Build (`tsc`) of [smb3-client](https://github.com/euricojardim/smb3-client) 0.2.0 by
Eurico Jardim, MIT license (see LICENSE), with seven changes of the lilOS project on top
(branch `lilos-fixes`), proposed upstream:

1. fix(readdir): send the search pattern on every QUERY_DIRECTORY (Samba answered the
   continuation with STATUS_OBJECT_NAME_INVALID)
2. fix(connection): count the initial credit used by NEGOTIATE (Samba dropped the
   connection: "client used more credits than granted")
3. feat(client): `createReadStream(path, { start })`, `createWriteStream(path, { start })`,
   `size` and `mtime` in `readdir(path, { withFileTypes: true })` entries
4. perf(readStream): one 64 KiB READ per chunk, more of them in flight (data flows at once,
   about twice as fast against Samba)
5. fix: backslashes refused in paths (they walked up past the '..' check), a malformed
   response fails the connection instead of throwing out of the socket handler, TCP keep-alive
6. fix(connection): interim STATUS_PENDING responses are not required to be signed (servers do
   not sign them; with signing required a WRITE that went async dropped the connection)
7. feat(connection): SMB 2.0.2 dialect (Vista, Server 2008, older NAS)

When these are in a published release, this folder goes and the module depends on the
package instead.
