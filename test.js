const r = /foo/g;
if (r.test("foo foo")) {
  console.log("foo foo".replace(r, "bar"));
}
