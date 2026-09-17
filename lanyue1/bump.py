#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
版本号统一 bump：把 index.html / admin.html 里的
  <meta name="wb-build" content="xxx">
  window.WB_BUILD = "xxx"
  所有 ?v=xxx （含 BUILD_PLACEHOLDER）
一次性替换为新的构建号，并同步 version.json。

用法: python3 bump.py [说明文字]
发布前必跑；管理模式在线回写时 serve.py 会自动 bump。
"""
import os, re, sys, json, time

BASE = os.path.dirname(os.path.abspath(__file__))
VER = os.path.join(BASE, 'version.json')
HTMLS = ['index.html', 'admin.html']

META_RE = re.compile(r'(<meta\s+name="wb-build"\s+content=")([^"]*)(")')
BUILD_RE = re.compile(r'(window\.WB_BUILD\s*=\s*")([^"]*)(")')
V_RE = re.compile(r'(\?v=)([0-9]{8}\.[0-9]{2}|dev|BUILD_PLACEHOLDER)')


def next_build(old, today):
    if old and old.startswith(today) and '.' in old:
        try:
            return '%s.%02d' % (today, int(old.split('.')[-1]) + 1)
        except ValueError:
            pass
    return '%s.01' % today


def main():
    today = time.strftime('%Y%m%d')
    old = 'dev'
    note = sys.argv[1] if len(sys.argv) > 1 else ''
    try:
        v = json.load(open(VER, 'r', encoding='utf-8'))
        old = v.get('build', 'dev')
    except Exception:
        v = {}

    new = next_build(old, today)
    v['build'] = new
    v['ts'] = int(time.time())
    v['note'] = note
    json.dump(v, open(VER, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    open(VER, 'a', encoding='utf-8').write('\n')

    for f in HTMLS:
        p = os.path.join(BASE, f)
        if not os.path.isfile(p):
            print('  跳过（不存在）: %s' % f)
            continue
        s = open(p, 'r', encoding='utf-8').read()
        s2 = META_RE.sub(lambda m: m.group(1) + new + m.group(3), s)
        s2 = BUILD_RE.sub(lambda m: m.group(1) + new + m.group(3), s2)
        s2 = V_RE.sub(lambda m: m.group(1) + new, s2)
        if s2 != s:
            open(p, 'w', encoding='utf-8').write(s2)
        print('  %s: %s -> %s' % (f, old, new))

    print('build = %s' % new)
    if note:
        print('note  = %s' % note)


if __name__ == '__main__':
    main()
