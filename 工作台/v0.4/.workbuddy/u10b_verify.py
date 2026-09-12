import re, sys, html.parser

PATH = "/storage/Users/currentUser/WorkBuddy/中免项目/工作台/v0.4/U10b-品牌馆页2.html"
src = open(PATH, encoding="utf-8").read()

class V(html.parser.HTMLParser):
    VOID = {"area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"}
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []; self.errors = []
    def handle_starttag(self, tag, attrs):
        for k, v in attrs:
            if v and '>' in v:
                self.errors.append("attr %s contains '>': %s" % (k, v[:40]))
        if tag not in self.VOID:
            self.stack.append(tag)
    def handle_endtag(self, tag):
        if tag in self.VOID: return
        if self.stack and self.stack[-1] == tag:
            self.stack.pop()
        elif tag in self.stack:
            while self.stack and self.stack[-1] != tag:
                self.errors.append("unclosed: " + self.stack[-1]); self.stack.pop()
            if self.stack: self.stack.pop()
        else:
            self.errors.append("stray end tag: " + tag)

p = V(); p.feed(src)
if p.stack: p.errors.append("unclosed stack: " + ",".join(p.stack))
print("HTML:\n" + ("\n".join(" - " + e for e in p.errors) if p.errors else "OK"))
ok = not p.errors

ext = re.findall(r'(?:src|href)\s*=\s*["\'](https?://[^"\']+)', src)
print("external CDN:", ext if ext else "none")
if ext: ok = False

dot = src.count("advisor-fab__dot")
print("advisor-fab__dot count:", dot, "(expect 0)")
if dot: ok = False

# 结构断言
assert_order = src.find('class="advisor-fab__avatar"') < src.find('class="advisor-fab__bubble"')
print("bubble after avatar (vertical order):", assert_order)
if not assert_order: ok = False
has_col = "flex-direction:column" in src
print("flex-direction:column present:", has_col)
if not has_col: ok = False

scripts = re.findall(r'<script>(.*?)</script>', src, re.S)
if scripts:
    tmp = "/storage/Users/currentUser/WorkBuddy/中免项目/工作台/v0.4/.workbuddy/u10b_check.js"
    open(tmp, "w", encoding="utf-8").write("\n".join(scripts))
    import subprocess
    r = subprocess.run(["/data/storage/el1/bundle/libs/arm64/node/bin/node", "--check", tmp],
                       capture_output=True, text=True)
    print("JS syntax:", "OK" if r.returncode == 0 else "FAIL\n" + r.stderr)
    if r.returncode != 0: ok = False

print("\nRESULT:", "ALL PASS" if ok else "HAS ISSUES")
sys.exit(0 if ok else 1)
