#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
蓝月产品原型工作台 · 本地服务
===========================
用途：让工作台「直接读取」源文件夹的 v0.4 原型（而非副本），并支持
      「文件删除后左侧导航自动消失」（通过 /api/prototypes 动态列目录）；
      同时提供 /api/save-data 写接口，供编辑版「导入本地文件」时把导入的
      原型持久化回 prototypes-data.js（单一数据源，刷新 / 其他浏览器可见）。

启动：  python3 serve.py [port]     默认端口 8848
访问：  http://127.0.0.1:8848/蓝月产品原型工作台-编辑版.html

原理：
- 静态根目录 = 本脚本所在目录（工作台/），编辑版与其引用的 prototypes-data.js 同目录
- /api/prototypes 扫描 v0.4 目录，返回实际存在的 .html 文件列表
- /api/save-data 接收 {file, imported}，仅允许写入白名单文件（prototypes-data.js），
  把导入原型以 PROTOTYPES_IMPORTED 段追加 / 替换进数据文件末尾
- 关闭 server 后，双击 HTML 仍可用（file:// 模式，仅写接口不可用，导入改动仅存本地）
"""
import http.server
import json
import os
import sys
import urllib.parse

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8848

# 仅允许写回这两个数据文件，且必须通过白名单（basename），杜绝路径穿越
ALLOWED_SAVE = {"prototypes-data.js", "nav-data.js"}
IMPORTED_MARKER = "/* ===== 导入原型（编辑版"
EDITS_MARKER = "/* ===== 左导航结构（编辑版"


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/api/prototypes":
            try:
                sd = os.path.join(ROOT, "v0.4")
                files = (
                    [f for f in os.listdir(sd) if f.endswith(".html") and f != "index.html"]
                    if os.path.isdir(sd)
                    else []
                )
                files.sort()
                body = json.dumps(
                    {"base": "v0.4/", "files": files}, ensure_ascii=False
                ).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                self.wfile.write(body)
            except Exception as e:  # noqa
                self.send_error(500, str(e))
            return
        return super().do_GET()

    def do_POST(self):
        path = self.path.split("?", 1)[0]
        if path == "/api/save-data":
            try:
                length = int(self.headers.get("Content-Length", 0) or 0)
                raw = self.rfile.read(length) if length else b""
                data = json.loads(raw.decode("utf-8"))
                fn = data.get("file", "")
                if fn not in ALLOWED_SAVE:
                    self._json(400, {"ok": False, "msg": "不允许写入该文件：" + fn})
                    return
                target = os.path.join(ROOT, fn)
                abs_target = os.path.abspath(target)
                abs_root = os.path.abspath(ROOT)
                if abs_target != os.path.join(abs_root, fn):
                    self._json(400, {"ok": False, "msg": "非法路径"})
                    return
                imported = data.get("imported", None)
                edits = data.get("edits", None)
                if imported is None and edits is None:
                    self._json(400, {"ok": False, "msg": "缺少 imported 或 edits"})
                    return
                cur = ""
                try:
                    with open(target, "r", encoding="utf-8") as f:
                        cur = f.read()
                except Exception:
                    cur = ""

                def _strip(marker, s):
                    i = s.find(marker)
                    if i < 0:
                        return s
                    nxt = len(s)
                    for m in (IMPORTED_MARKER, EDITS_MARKER):
                        j = s.find(m, i + len(marker))
                        if j >= 0 and j < nxt:
                            nxt = j
                    return s[:i].rstrip() + "\n"

                if imported is not None:
                    cur = _strip(IMPORTED_MARKER, cur)
                    cur = cur.rstrip() + "\n" + (
                        IMPORTED_MARKER
                        + "「导入本地文件」自动写入，请勿手动编辑此段） ===== */\n"
                        + "const PROTOTYPES_IMPORTED = "
                        + json.dumps(imported, ensure_ascii=False, indent=2)
                        + ";\n"
                    )
                if edits is not None:
                    cur = _strip(EDITS_MARKER, cur)
                    cur = cur.rstrip() + "\n" + (
                        EDITS_MARKER
                        + "「左导航结构（分类/排序/分组/改名/增删）」自动写入，请勿手动编辑此段） ===== */\n"
                        + "const PROTOTYPES_EDITS = "
                        + json.dumps(edits, ensure_ascii=False, indent=2)
                        + ";\n"
                    )
                with open(target, "w", encoding="utf-8") as f:
                    f.write(cur)
                self._json(200, {"ok": True, "imported": len(imported) if imported else 0, "edits": 1 if edits is not None else 0})
            except Exception as e:  # noqa
                self._json(500, {"ok": False, "msg": str(e)})
            return
        if path == "/api/save-nav":
            try:
                length = int(self.headers.get("Content-Length", 0) or 0)
                raw = self.rfile.read(length) if length else b""
                data = json.loads(raw.decode("utf-8"))
                fn = data.get("file", "")
                if fn not in ALLOWED_SAVE:
                    self._json(400, {"ok": False, "msg": "不允许写入该文件：" + fn})
                    return
                target = os.path.join(ROOT, fn)
                abs_target = os.path.abspath(target)
                abs_root = os.path.abspath(ROOT)
                if abs_target != os.path.join(abs_root, fn):
                    self._json(400, {"ok": False, "msg": "非法路径"})
                    return
                text = data.get("text", "")
                if not text.strip().startswith("window.NAV_DATA"):
                    self._json(400, {"ok": False, "msg": "内容校验失败（必须以 window.NAV_DATA 开头）"})
                    return
                with open(target, "w", encoding="utf-8") as f:
                    f.write(text)
                self._json(200, {"ok": True, "bytes": len(text)})
            except Exception as e:
                self._json(500, {"ok": False, "msg": str(e)})
            return
        if path == "/api/save-proto":
            try:
                length = int(self.headers.get("Content-Length", 0) or 0)
                raw = self.rfile.read(length) if length else b""
                data = json.loads(raw.decode("utf-8"))
                fn = data.get("file", "")
                if fn not in ALLOWED_SAVE:
                    self._json(400, {"ok": False, "msg": "不允许写入该文件：" + fn})
                    return
                target = os.path.join(ROOT, fn)
                abs_target = os.path.abspath(target)
                abs_root = os.path.abspath(ROOT)
                if abs_target != os.path.join(abs_root, fn):
                    self._json(400, {"ok": False, "msg": "非法路径"})
                    return
                text = data.get("text", "")
                # 完整性闸门：必须包含完整原型数据结构，杜绝写入残缺文件导致丢失数据
                if not ("const V04" in text and "DATA_MODELS" in text and "PROTOTYPES_V03" in text):
                    self._json(400, {"ok": False, "msg": "内容完整性校验失败（缺少 const V04/DATA_MODELS/PROTOTYPES_V03）"})
                    return
                with open(target, "w", encoding="utf-8") as f:
                    f.write(text)
                self._json(200, {"ok": True, "bytes": len(text)})
            except Exception as e:
                self._json(500, {"ok": False, "msg": str(e)})
            return
        self.send_error(405)

    def _json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def end_headers(self):
        # 关闭缓存，保证原型改动后刷新即见最新版
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *args):
        pass  # 静默


if __name__ == "__main__":
    os.chdir(ROOT)
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print("蓝月原型工作台 → http://127.0.0.1:%d/蓝月产品原型工作台-编辑版.html" % PORT)
    print("工作目录：" + ROOT)
    print("按 Ctrl+C 停止。")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\n已停止。")
