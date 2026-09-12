import re, sys, subprocess, html.parser

PATH = "/storage/Users/currentUser/WorkBuddy/中免项目/工作台/v0.4/U4-结算中心页.html"
src = open(PATH, encoding="utf-8").read()

class V(html.parser.HTMLParser):
    VOID = {"area","base","br","col","embed","hr","img","input","link","meta","param","source","track","wbr"}
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack=[]; self.errors=[]
    def handle_starttag(self, tag, attrs):
        for k,v in attrs:
            if v and '>' in v:
                self.errors.append(f"属性 {k} 值含 '>': {v[:40]}")
        if tag not in self.VOID:
            self.stack.append(tag)
    def handle_endtag(self, tag):
        if tag in self.VOID: return
        if self.stack and self.stack[-1]==tag:
            self.stack.pop()
        elif tag in self.stack:
            while self.stack and self.stack[-1]!=tag:
                self.errors.append(f"未闭合: {self.stack[-1]}"); self.stack.pop()
            if self.stack: self.stack.pop()
        else:
            self.errors.append(f"多余结束标签: {tag}")

p=V(); p.feed(src)
if p.stack:
    p.errors.append("未闭合栈: "+",".join(p.stack))
if p.errors:
    print("HTML结构错误:"); [print(" -",e) for e in p.errors]; sys.exit(1)
print("HTML结构: OK")

ext = re.findall(r'(?:src|href)\s*=\s*["\'](https?://[^"\']+)', src)
if ext:
    print("外网引用:", ext); sys.exit(1)
print("外网CDN: 无")

scripts = re.findall(r'<script>(.*?)</script>', src, re.S)
if not scripts:
    print("无 script"); sys.exit(1)
tmp = "/storage/Users/currentUser/WorkBuddy/中免项目/工作台/v0.4/.workbuddy/u4_check.js"
open(tmp, "w", encoding="utf-8").write("\n".join(scripts))
r = subprocess.run(["/data/storage/el1/bundle/libs/arm64/node/bin/node","--check",tmp],
                   capture_output=True, text=True)
if r.returncode!=0:
    print("JS语法错误:\n", r.stderr); sys.exit(1)
print("JS语法: OK")
print("校验全部通过")
