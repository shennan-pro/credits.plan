#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
云端存档捞取器（v2.8.1 配套 · 零依赖）

用途：从 Supabase 把某个家庭的完整存档（family_state.state jsonb）拉到本地，
      存成可导入的 JSON —— 当本机 localStorage 丢失、或换设备时用这条救命。

用法：
  python tools/cloud_fetch.py --url https://xxx.supabase.co --anon <ANON_KEY> \
      --code <家庭码> --secret <访问密钥> --out 存档_YYYYMMDD.json

参数说明：
  --url     Supabase 项目 URL（https://xxx.supabase.co）
  --anon    anon public key（Supabase → Project Settings → API；本来就是公开的）
  --code    家庭码（6 位左右，产品里点 🎲 生成的那串）
  --secret  访问密钥（12 位，产品里点 🔑 生成的那串；明文不上云，只算指纹）

凭证算法与产品一致：cred = md5(family_code + ':' + secret)，只传指纹。
用法细节见 WORKDOC 第九节。
"""
import argparse
import hashlib
import json
import sys
import urllib.request
import urllib.error
from datetime import datetime


def md5hex(s: str) -> str:
    return hashlib.md5(s.encode('utf-8')).hexdigest()


def post(url: str, body: dict, headers: dict, timeout: int = 25):
    data = json.dumps(body).encode('utf-8')
    req = urllib.request.Request(url, data=data, method='POST')
    for k, v in headers.items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read().decode('utf-8', 'replace')
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode('utf-8', 'replace')
    except Exception as e:                                    # 网络层错误
        return 0, str(e)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--url', required=True, help='Supabase 项目 URL')
    ap.add_argument('--anon', required=True, help='anon public key')
    ap.add_argument('--code', required=True, help='家庭码')
    ap.add_argument('--secret', required=True, help='访问密钥（明文）')
    ap.add_argument('--out', default='', help='输出 JSON 路径（默认 存档_时间戳.json）')
    a = ap.parse_args()

    base = a.url.rstrip('/')
    cred = md5hex(f'{a.code}:{a.secret}')
    hdr = {
        'apikey': a.anon,
        'Authorization': f'Bearer {a.anon}',
        'Content-Type': 'application/json',
        'x-family-code': a.code,
        'x-family-auth': cred,
        'x-family-secret': cred,
    }

    print(f'→ 家庭码 {a.code} · 凭证指纹 {cred[:10]}…')
    status, text = post(f'{base}/rest/v1/rpc/family_pull', {'p_code': a.code, 'p_secret': cred}, hdr)

    if status != 200:
        print(f'❌ family_pull 返回 {status}\n{text[:400]}')
        print('\n排查：① URL 是否多了路径（应是 https://xxx.supabase.co）')
        print('      ② anon key 是否填错（不是 service_role）')
        print('      ③ 家庭码/密钥是否与建行时一致')
        print('      ④ 云端是否已建表（跑过 supabase-setup.sql v2.5.1 版）')
        sys.exit(1)

    try:
        j = json.loads(text)
    except Exception:
        print(f'❌ 返回不是 JSON：{text[:300]}')
        sys.exit(1)

    st = j.get('state') if isinstance(j, dict) else None
    if st is None and isinstance(j, dict) and 'records' in j:
        st = j                                    # 兼容直接返回 state 的情形
    if not st:
        print('⚠️ 云端该家庭暂无数据（凭证对但行里没有 state）')
        print('   → 说明这一家从没成功同步过，只能从原设备的导出文件恢复')
        sys.exit(2)

    recs = st.get('records') or []
    print(f'✅ 拉到云端存档：{len(recs)} 条记录，余额 {st.get("balance", "?")}，'
          f'孩子名 {(st.get("cfg") or {}).get("childName", "?")}')

    out = a.out or f'存档_{datetime.now():%Y%m%d_%H%M%S}.json'
    with open(out, 'w', encoding='utf-8') as f:
        json.dump(st, f, ensure_ascii=False, indent=2)
    print(f'💾 已存：{out}')
    print('   导入方法：产品 → 爸妈后台 → 导入数据（选这个 JSON）；或直接改 localStorage')


if __name__ == '__main__':
    main()
