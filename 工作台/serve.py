#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
蓝月产品原型工作台 · 本地服务
===========================
用途：让工作台「直接读取」源文件夹的 v0.4 原型（而非副本），并支持
      「文件删除后左侧导航自动消失」（通过 /api/prototypes 动态列目录）。

启动：  python3 serve.py [port]     默认端口 8848
访问：  http://127.0.0.1:8848/工作台/蓝月产品原型工作台.html

原理：
- 静态根目录 = 产物/（同时包含 工作台/ 与 门店导购升级/prototype/v0.4/）
- /api/prototypes 扫描源 v0.4 目录，返回实际存在的 .html 文件列表
  前端据此过滤 PROTOTYPES，删除文件即不显示
- 关闭 server 后，双击 HTML 仍可用（file:// 模式直接引用源路径，仅不动态过滤）
"""
import http.server
import json
import os
import sys
import urllib.parse

ROOT = "/storage/Users/currentUser/WorkBuddy/中免项目/产物"
SRC_DIR = os.path.join(ROOT, "门店导购升级", "prototype", "v0.4")
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8848


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/api/prototypes":
            try:
                files = [
                    f for f in os.listdir(SRC_DIR)
                    if f.endswith(".html") and f != "index.html"
                ]
                files.sort()
                body = json.dumps(
                    {"base": "/门店导购升级/prototype/v0.4/", "files": files},
                    ensure_ascii=False,
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

    def end_headers(self):
        # 关闭缓存，保证原型改动后刷新即见最新版
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *args):
        pass  # 静默


if __name__ == "__main__":
    os.chdir(ROOT)
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"蓝月原型工作台 → http://127.0.0.1:{PORT}/工作台/蓝月产品原型工作台.html")
    print(f"源目录监视：{SRC_DIR}")
    print("按 Ctrl+C 停止。")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\n已停止。")
