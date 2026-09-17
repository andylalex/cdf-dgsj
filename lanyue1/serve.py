#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
蓝月产品原型工作台 · 本地落盘服务 v3
====================================
定位：**唯一落盘通道**。管理模式的一切持久化都必须经过本服务，前端不得自行写文件。

启动：  python3 serve.py [port]       默认端口 8850
        容器/云端部署优先读环境变量 $PORT，并绑定 0.0.0.0（外部可达）
访问：  http://<host>:<port>/index.html     （只读评审版）
        http://<host>:<port>/admin.html     （管理模式）

接口
----
GET  /api/health      -> {"ok":true,"build":"20260917.03"}
GET  /api/version     -> version.json 原文（no-store，前端用它探测服务在线）
GET  /api/scan        -> {"files":[{"name","path","size","type"}]}  扫描 v0.4/
POST /api/save-nav    -> {"nav":{...}}       写回 data/wb-nav.js（index.html / admin.html 均 <script src> 加载）
POST /api/save-proto  -> {"items":{...},"models":{...}}  写回 data/prototypes.js
POST /api/upload      -> {"name":"x.png","b64":"..."}    写图片到 assets/brand/

安全
----
1. 白名单：只允许 index.html / admin.html / data/prototypes.js / assets/brand/*，其余一律 403
2. 路径 os.path.abspath 校验，拒绝 .. 与绝对路径穿越
3. 写前备份到 .workbuddy/backups/<文件名>.<ts>.bak
4. 写 HTML 时用正则只替换 #wb-nav 块，其他内容一字不动
5. 所有响应 Cache-Control: no-store
"""
import base64
import datetime
import http.server
import json
import os
import io
import re
import shutil
import sys
import time

ROOT = os.path.dirname(os.path.abspath(__file__))
# 容器/云端部署：优先读注入的 $PORT，其次命令行参数，最后回退 8850
_PORT_ENV = os.environ.get("PORT")
PORT = int(_PORT_ENV) if _PORT_ENV else (int(sys.argv[1]) if len(sys.argv) > 1 else 8850)

BACKUP_DIR = os.path.join(ROOT, ".workbuddy", "backups")
VERSION_FILE = os.path.join(ROOT, "version.json")
PROTO_FILE = os.path.join(ROOT, "data", "prototypes.js")
BRAND_DIR = os.path.join(ROOT, "assets", "brand")
SCAN_DIR = os.path.join(ROOT, "v0.4")

NAV_FILES = ("index.html", "admin.html")
NAV_RE = re.compile(
    r'(<script[^>]*\bid=["\']wb-nav["\'][^>]*>)(.*?)(</script\s*>)', re.S | re.I)

HTML_EXT = (".html", ".htm")
IMG_EXT = (".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".svg")
MAX_UPLOAD = 12 * 1024 * 1024
SCAN_MAX_BYTES = 40 * 1024 * 1024


# --------------------------------------------------------------------------
# 基础工具
# --------------------------------------------------------------------------
def _now():
    return datetime.datetime.now()


def _today():
    return datetime.date.today().isoformat()


def _safe_rel(rel):
    """把相对路径解析成 ROOT 内的绝对路径；越界返回 None。"""
    if not rel or not isinstance(rel, str):
        return None
    rel = rel.strip().replace("\\", "/")
    if rel.startswith("/") or re.match(r"^[A-Za-z]:", rel):
        return None
    parts = [p for p in rel.split("/") if p not in ("", ".")]
    if not parts or ".." in parts:
        return None
    abs_path = os.path.abspath(os.path.join(ROOT, *parts))
    if abs_path != ROOT and not abs_path.startswith(ROOT + os.sep):
        return None
    return abs_path


def _writable(abs_path):
    """白名单校验：返回 True / False。"""
    if not abs_path:
        return False
    rel = os.path.relpath(abs_path, ROOT).replace("\\", "/")
    if rel in ("index.html", "admin.html", "data/prototypes.js", "data/wb-nav.js"):
        return True
    if rel.startswith("assets/brand/") and "/" not in rel[len("assets/brand/"):]:
        return True
    return False


def _backup(abs_path):
    try:
        os.makedirs(BACKUP_DIR, exist_ok=True)
        ts = _now().strftime("%Y%m%d-%H%M%S")
        dst = os.path.join(BACKUP_DIR, os.path.basename(abs_path) + "." + ts + ".bak")
        shutil.copy2(abs_path, dst)
        return dst
    except Exception:
        return ""


def _write_atomic(abs_path, text):
    """备份 -> 写临时文件 -> 原子替换。"""
    if os.path.exists(abs_path):
        _backup(abs_path)
    tmp = abs_path + ".tmp"
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
    os.replace(tmp, abs_path)


def _read(abs_path):
    with open(abs_path, "r", encoding="utf-8") as f:
        return f.read()


def _read_version():
    try:
        with open(VERSION_FILE, "r", encoding="utf-8") as f:
            v = json.load(f)
        return v if isinstance(v, dict) else {}
    except Exception:
        return {}


META_RE = re.compile(r'(<meta\s+name="wb-build"\s+content=")([^"]*)(")')
V_RE = re.compile(r'(\?v=)([0-9]{8}\.[0-9]{2}|dev|BUILD_PLACEHOLDER)')


def sync_build_to_html(build):
    """把新 build 同步进两个 HTML 的 <meta wb-build> 与 ?v=。
    不做这件事的话：管理模式保存后 version.json 前进了、HTML 内联版本号没动，
    在线页面自检会把「自己」判定成旧版，反复弹更新横幅（契约 §8.11）。
    """
    out = {}
    for fn in ("index.html", "admin.html"):
        p = os.path.join(ROOT, fn)
        if not os.path.isfile(p):
            continue
        try:
            src = io.open(p, encoding="utf-8").read()
            s2 = META_RE.sub(lambda m: m.group(1) + str(build) + m.group(3), src)
            s2 = V_RE.sub(lambda m: m.group(1) + str(build), s2)
            if s2 != src:
                _write_atomic(p, s2)
                out[fn] = True
        except Exception:
            pass
    return out


def bump_build(note=""):
    """自增 version.json 的 build（YYYYMMDD.NN），保留其余字段。"""
    v = _read_version()
    today = datetime.date.today().strftime("%Y%m%d")
    cur = str(v.get("build", "") or "")
    n = 1
    if cur.startswith(today + "."):
        try:
            n = int(cur.split(".", 1)[1]) + 1
        except Exception:
            n = 1
    v["build"] = "%s.%02d" % (today, n)
    # 沿用原有 ts 的类型（老版本是 unix 时间戳整数），避免破坏前端比较逻辑
    old_ts = v.get("ts")
    if isinstance(old_ts, bool) or old_ts is None:
        v["ts"] = int(time.time())
    elif isinstance(old_ts, (int, float)):
        v["ts"] = int(time.time())
    else:
        v["ts"] = _now().isoformat(timespec="seconds")
    if note:
        v["note"] = note
    try:
        os.makedirs(os.path.dirname(VERSION_FILE) or ".", exist_ok=True)
        _write_atomic(VERSION_FILE, json.dumps(v, ensure_ascii=False, indent=2) + "\n")
    except Exception:
        pass
    # 版本号两处同源：HTML 内联 meta / ?v= 必须跟着走（契约 §8.11）
    try:
        sync_build_to_html(v.get("build", ""))
    except Exception:
        pass
    return v.get("build")


def _nav_block_text(html):
    m = NAV_RE.search(html or "")
    return m.group(2) if m else None


# --------------------------------------------------------------------------
# 接口实现
# --------------------------------------------------------------------------
def api_scan():
    files = []
    if os.path.isdir(SCAN_DIR):
        for name in sorted(os.listdir(SCAN_DIR)):
            p = os.path.join(SCAN_DIR, name)
            if not os.path.isfile(p) or name.startswith("."):
                continue
            low = name.lower()
            if low == "index.html":
                continue
            if low.endswith(HTML_EXT):
                ftype = "html"
            elif low.endswith(IMG_EXT):
                ftype = "image"
            else:
                continue
            try:
                size = os.path.getsize(p)
            except Exception:
                size = 0
            files.append({
                "name": name,
                "path": "v0.4/" + name,
                "size": size,
                "type": ftype,
            })
    files.sort(key=lambda x: (0 if x["type"] == "html" else 1, x["name"]))
    return {"ok": True, "files": files, "base": "v0.4/"}


def api_save_nav(nav):
    if not isinstance(nav, dict):
        return 400, {"ok": False, "msg": "nav 必须是对象"}
    if not isinstance(nav.get("items"), list):
        return 400, {"ok": False, "msg": "nav.items 必须是数组"}
    # 结构层单一权威源：data/wb-nav.js（index.html / admin.html 通过 <script src> 加载，
    # 从结构上根除双 HTML 导航漂移）
    text = (
        "/* 结构层唯一权威源 —— 由管理模式经 serve.py 回写 data/wb-nav.js；"
        "左导航数据集中存放，index.html / admin.html 均通过 <script src> 加载，杜绝双文件漂移 */\n"
        "window.WB_NAV = " + json.dumps(nav, ensure_ascii=False, indent=1) + ";\n"
    )
    p = _safe_rel("data/wb-nav.js")
    if not p or not _writable(p):
        return 403, {"ok": False, "msg": "不允许写入 data/wb-nav.js"}
    os.makedirs(os.path.dirname(p), exist_ok=True)
    _write_atomic(p, text)
    build = bump_build("save-nav")
    return 200, {"ok": True, "build": build, "file": "data/wb-nav.js", "items": len(nav.get("items", []))}


def api_save_proto(items, models, generated=None):
    if not isinstance(items, dict) or not items:
        return 400, {"ok": False, "msg": "items 必须是非空对象（内容为空，拒绝写盘以防丢数据）"}
    if models is not None and not isinstance(models, dict):
        return 400, {"ok": False, "msg": "models 必须是对象"}

    # models 缺省时沿用磁盘上的旧值，避免被清空
    if models is None:
        models = {}
        try:
            m = re.search(r'window\.PROTO_DATA\s*=\s*(\{[\s\S]*\})\s*;?\s*$', _read(PROTO_FILE).strip())
            if m:
                models = json.loads(m.group(1)).get("models", {}) or {}
        except Exception:
            models = {}

    payload = {
        "v": 3,
        "generated": generated or _today(),
        "models": models,
        "items": items,
    }
    head = "/* 内容唯一权威源 —— 由管理模式经 serve.py 回写；改内容请用管理模式，勿手工改结构 */\n"
    text = head + "window.PROTO_DATA = " + json.dumps(payload, ensure_ascii=False, indent=1) + ";\n"

    p = _safe_rel("data/prototypes.js")
    if not p or not _writable(p):
        return 403, {"ok": False, "msg": "不允许写入该文件"}
    os.makedirs(os.path.dirname(p), exist_ok=True)
    _write_atomic(p, text)
    build = bump_build("save-proto")
    return 200, {"ok": True, "build": build, "bytes": len(text), "items": len(items)}


def api_upload(name, b64):
    if not name:
        return 400, {"ok": False, "msg": "缺少 name"}
    base = os.path.basename(str(name).replace("\\", "/"))
    if not base or base in (".", ".."):
        return 400, {"ok": False, "msg": "非法文件名"}
    if not base.lower().endswith(IMG_EXT):
        return 400, {"ok": False, "msg": "只允许图片：" + "/".join(IMG_EXT)}
    try:
        raw = base64.b64decode(b64 or "", validate=True)
    except Exception:
        return 400, {"ok": False, "msg": "base64 解码失败"}
    if not raw:
        return 400, {"ok": False, "msg": "文件内容为空"}
    if len(raw) > MAX_UPLOAD:
        return 413, {"ok": False, "msg": "文件过大（上限 %d MB）" % (MAX_UPLOAD // 1024 // 1024)}

    rel = "assets/brand/" + base
    p = _safe_rel(rel)
    if not p or not _writable(p):
        return 403, {"ok": False, "msg": "只允许写入 assets/brand/"}
    os.makedirs(BRAND_DIR, exist_ok=True)
    if os.path.exists(p):
        _backup(p)
    with open(p, "wb") as f:
        f.write(raw)
    return 200, {"ok": True, "path": rel, "bytes": len(raw)}


# --------------------------------------------------------------------------
# HTTP
# --------------------------------------------------------------------------
class Handler(http.server.SimpleHTTPRequestHandler):
    server_version = "LanyueWB/3.0"

    def __init__(self, *args, **kwargs):
        kwargs["directory"] = ROOT
        super().__init__(*args, **kwargs)

    # ---------- 输出 ----------
    def _json(self, code, obj):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()  # no-store / CORS 由 end_headers 统一附加
        try:
            self.wfile.write(body)
        except Exception:
            pass

    def end_headers(self):
        # 所有响应一律不缓存，保证原型改动刷新即见
        try:
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
            self.send_header("Access-Control-Allow-Origin", "*")
        except Exception:
            pass
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    # ---------- 请求体 ----------
    def _body(self):
        try:
            n = int(self.headers.get("Content-Length", 0) or 0)
        except Exception:
            n = 0
        if n <= 0:
            return {}
        if n > SCAN_MAX_BYTES:
            raise ValueError("请求体过大")
        raw = self.rfile.read(n)
        return json.loads(raw.decode("utf-8"))

    # ---------- GET ----------
    def do_GET(self):
        path = self.path.split("?", 1)[0].rstrip("/") or "/"
        try:
            if path == "/api/health":
                return self._json(200, {"ok": True, "build": _read_version().get("build", ""), "root": ROOT})
            if path == "/api/version":
                v = _read_version()
                if not v.get("build"):
                    v["build"] = bump_build("init")
                return self._json(200, v)
            if path == "/api/scan":
                return self._json(200, api_scan())
        except Exception as e:
            return self._json(500, {"ok": False, "msg": str(e)})
        return super().do_GET()

    # ---------- POST ----------
    def do_POST(self):
        path = self.path.split("?", 1)[0].rstrip("/") or "/"
        try:
            if path == "/api/save-nav":
                d = self._body()
                code, res = api_save_nav(d.get("nav"))
                return self._json(code, res)

            if path == "/api/save-proto":
                d = self._body()
                data = d.get("data") if isinstance(d.get("data"), dict) else d
                items = data.get("items")
                models = data.get("models")
                gen = data.get("generated") if isinstance(data, dict) else None
                code, res = api_save_proto(items, models, gen)
                return self._json(code, res)

            if path == "/api/upload":
                d = self._body()
                code, res = api_upload(d.get("name") or (d.get("path") or "").split("/")[-1],
                                       d.get("b64") or d.get("data") or "")
                return self._json(code, res)

            if path == "/api/bump":
                d = self._body()
                return self._json(200, {"ok": True, "build": bump_build((d or {}).get("note", ""))})
        except ValueError as e:
            return self._json(400, {"ok": False, "msg": "请求解析失败：" + str(e)})
        except Exception as e:
            return self._json(500, {"ok": False, "msg": str(e)})
        return self._json(404, {"ok": False, "msg": "未知接口：" + path})

    # ---------- 日志 ----------
    def log_message(self, fmt, *args):
        try:
            os.makedirs(os.path.join(ROOT, ".workbuddy"), exist_ok=True)
            with open(os.path.join(ROOT, ".workbuddy", "serve_access.log"), "a", encoding="utf-8") as f:
                f.write(self.address_string() + " - " + (fmt % args if args else fmt) + "\n")
        except Exception:
            pass


def main():
    srv = http.server.ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print("蓝月 · 产品原型工作台 v3")
    print("  评审版   http://127.0.0.1:%d/index.html" % PORT)
    print("  管理模式 http://127.0.0.1:%d/admin.html" % PORT)
    print("  工作目录 " + ROOT)
    print("  落盘白名单 index.html / admin.html / data/prototypes.js / assets/brand/*")
    print("按 Ctrl+C 停止。")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\n已停止。")


if __name__ == "__main__":
    main()
